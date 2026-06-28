"""
DEVOPS — Lab Hunter · Cerebro IA autónomo.

Cuando el pipeline se atasca (un servicio sin playbook, o ningún playbook conocido
suelta flag), entra el cerebro: lee el vault (RAG simple) + el estado actual y
PROPONE comandos shell que se ejecutan en la Kali dentro de una JAULA de seguridad
(allowlist de binarios + scope-guard a la IP del lab + sin destructivos ni rutas
sensibles). Loop hasta encontrar flag o agotar intentos.

Reusa groq_service (LLM gratis ya integrado en DEVOPS). NO reentrena nada:
el "aprendizaje" es el vault de runbooks que crece máquina a máquina.

SOLO para laboratorios autorizados (HTB). Uso educativo en máquinas propias.
"""
import asyncio
import re

from services import groq_service

MODEL = "llama-3.3-70b-versatile"
MAX_STEPS = 6                       # tope de comandos que puede lanzar el cerebro
FLAG_RE = re.compile(r"\b([a-f0-9]{32})\b")

# Binarios de pentest permitidos (enum / explotación de lab). Nada de edición de
# sistema, gestión de usuarios, ni descargas-a-shell. Defensa por listas.
ALLOWED = {
    "nmap", "smbclient", "smbmap", "rpcclient", "enum4linux", "enum4linux-ng",
    "crackmapexec", "nxc", "curl", "wget", "redis-cli", "mysql", "mariadb",
    "psql", "mongosh", "mongo", "rsync", "snmpwalk", "snmp-check", "nbtscan",
    "nikto", "gobuster", "feroxbuster", "ffuf", "whatweb", "wpscan", "ftp",
    "telnet", "ssh", "sshpass", "nc", "ncat", "showmount", "ldapsearch",
    "dig", "host", "nslookup", "onesixtyone", "hydra", "medusa", "expect",
    # utilidades de proceso de texto (para encadenar y cazar flags en una línea)
    "echo", "cat", "grep", "egrep", "strings", "head", "tail", "find", "ls",
    "base64", "tar", "unzip", "gunzip", "zcat", "file", "awk", "sed", "cut",
    "tr", "sort", "uniq", "xxd", "wc", "true",
}

# Patrones prohibidos (destructivo / persistencia / exfil hacia la Kali).
_FORBIDDEN = re.compile(
    r"(rm\s+-rf?\s+/|\bmkfs|\bdd\s+if=|:\s*\(\s*\)\s*\{|shutdown|reboot|halt|"
    r"poweroff|init\s+0|>\s*/dev/sd|chmod\s+-R\s+0?777\s+/|chown\s+-R|"
    r"\|\s*(ba|z|d)?sh\b|userdel|useradd|usermod|passwd\b|\bsudo\b|"
    r"iptables\s+-F|crontab|systemctl|service\s+\w+\s+(stop|start)|kill(all)?\s)",
    re.I,
)
# Rutas sensibles de la PROPIA Kali que el cerebro no debe tocar.
_SENSITIVE = re.compile(
    r"(/etc/(passwd|shadow|sudoers)|/root/|/var/|~/?\.ssh|/home/kali|"
    r"id_rsa|id_dsa|id_ecdsa|\.bash_history|authorized_keys)",
    re.I,
)


def _mask_quotes(cmd: str) -> str:
    """Sustituye el contenido entre comillas por espacio: así un ';' o '|' DENTRO
    de una cadena (p.ej. mysql -e 'show databases;') no parte el comando ni cuela
    un binario falso. La validación de binarios opera sobre esta versión."""
    return re.sub(r"'[^']*'|\"[^\"]*\"", " ", cmd)


def _segments(cmd: str) -> list:
    """Trocea el comando por operadores de shell para validar CADA binario."""
    parts = re.split(r"\|\||&&|[|;&`]|\$\(", cmd)
    return [p.strip() for p in parts if p.strip()]


def _first_bin(seg: str) -> str:
    """Primer binario de un segmento, saltando asignaciones VAR=valor y subshells."""
    seg = seg.lstrip("(").strip()
    for tok in seg.split():
        if "=" in tok and not tok.startswith("-") and "/" not in tok.split("=")[0]:
            continue  # VAR=valor
        return tok.rsplit("/", 1)[-1]   # quita ruta: /usr/bin/nmap -> nmap
    return ""


def is_safe(cmd: str, target: str) -> tuple:
    """(ok, motivo). Jaula: scope-guard + allowlist + sin destructivos/sensibles."""
    if not cmd or len(cmd) > 600:
        return False, "comando vacío o demasiado largo"
    if _FORBIDDEN.search(cmd):
        return False, "patrón destructivo/persistencia prohibido"
    if _SENSITIVE.search(cmd):
        return False, "toca rutas sensibles de la Kali"
    if target not in cmd:
        return False, "el comando debe apuntar a la IP objetivo (scope-guard)"
    for seg in _segments(_mask_quotes(cmd)):
        b = _first_bin(seg)
        if b and b not in ALLOWED:
            return False, f"binario no permitido: {b}"
    return True, "ok"


_SYSTEM = (
    "Eres Lab Hunter, un pentester autónomo experto en máquinas de laboratorio HackTheBox. "
    "Trabajas desde una Kali Linux con acceso por SSH y VPN ya levantada. "
    "Tu objetivo: conseguir la flag (cadena de 32 caracteres hex) de la máquina objetivo, "
    "que está AUTORIZADA y es un laboratorio. Procede en pasos: enumeras un servicio y, "
    "según la salida, decides el siguiente comando. Respondes SIEMPRE con UNA sola acción."
)


def _build_prompt(target, services, nmap_out, vault_hint) -> str:
    svc = ", ".join(f"{s['port']}/{s['service']}" for s in services) or "desconocidos"
    hint = (f"\n\nCONOCIMIENTO PREVIO (máquinas parecidas que ya resolviste):\n{vault_hint}"
            if vault_hint else "")
    return (
        f"OBJETIVO: {target}\n"
        f"SERVICIOS ABIERTOS (nmap): {svc}\n\n"
        f"SALIDA NMAP:\n{nmap_out[-1500:]}{hint}\n\n"
        "REGLAS DE RESPUESTA (obligatorias):\n"
        f"- Propón UN comando shell de UNA línea que SIEMPRE incluya la IP {target}.\n"
        "- Encadena con pipes el procesamiento para cazar la flag en la misma línea "
        "(p.ej. terminar en `| grep -aoE '[a-f0-9]{32}'`).\n"
        "- Solo herramientas de pentest estándar (smbclient, curl, redis-cli, mysql, "
        "rsync, snmpwalk, ldapsearch, showmount, nc, ssh, hydra, gobuster, etc.).\n"
        "- Prohibido: sudo, editar el sistema, tocar /etc /root ~/.ssh, descargas a shell.\n"
        "- Si en una salida anterior ya ves una flag de 32 hex, responde solo: DONE\n\n"
        "FORMATO: responde con UNA línea que empiece por 'CMD: ' seguida del comando, "
        "o con 'DONE' si ya tienes la flag o no hay más que intentar. Nada más."
    )


def _parse(content: str) -> dict:
    for line in content.splitlines():
        line = line.strip()
        if line.upper().startswith("CMD:"):
            return {"cmd": line[4:].strip().strip("`")}
    if "DONE" in content.upper():
        return {"done": True}
    return {}


def assist(target, run, step, services, nmap_out, vault_hint="") -> list:
    """
    Loop autónomo. Parámetros inyectados para no acoplar con el motor:
      run(cmd, timeout) -> str            ejecuta en la Kali (SSH)
      step(fase, accion, resultado, salida="", hallazgos=None)  añade a la timeline
    Devuelve lista de flags encontradas.
    """
    flags = []
    convo = [
        {"role": "system", "content": _SYSTEM},
        {"role": "user", "content": _build_prompt(target, services, nmap_out, vault_hint)},
    ]
    if vault_hint:
        step("IA", "cerebro: consultar vault (RAG)", "conocimiento recuperado",
             vault_hint, ["máquinas parecidas encontradas"])

    for i in range(MAX_STEPS):
        resp = asyncio.run(groq_service.chat(
            convo, model=MODEL, max_tokens=350, temperature=0.2))
        if resp.get("error"):
            step("IA", "cerebro Groq", f"error: {resp['error']}")
            break
        content = resp.get("content", "")
        convo.append({"role": "assistant", "content": content})
        action = _parse(content)

        if action.get("done") or not action.get("cmd"):
            step("IA", f"cerebro decide (intento {i+1})", "sin más acciones", content)
            break

        cmd = action["cmd"]
        ok, why = is_safe(cmd, target)
        if not ok:
            step("IA", "comando RECHAZADO por la jaula", why, cmd)
            convo.append({"role": "user", "content":
                          f"RECHAZADO ({why}). Da otro comando que cumpla las reglas."})
            continue

        out = run(cmd, 120)
        found = FLAG_RE.findall(out)
        flags += found
        step("IA", f"ejecutar (intento {i+1}): {cmd[:90]}",
             "flag!" if found else "ejecutado", out,
             [f"flag={found[0]}"] if found else [])
        if found:
            break
        convo.append({"role": "user", "content":
                      f"SALIDA:\n{out[-2500:]}\n\nSi ves una flag de 32 hex responde DONE; "
                      "si no, da el siguiente comando (formato 'CMD: ...')."})

    return list(dict.fromkeys(flags))
