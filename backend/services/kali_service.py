import asyncio
import paramiko
from config_manager import load_config

TOOL_COMMANDS = {
    "nmap_quick": "nmap -T4 -F --open {target}",
    "nmap_full": "nmap -T4 -sV -p- --open {target}",
    "nmap_vuln": "nmap -T4 -sV --script=vuln --open {target}",
    "masscan": "masscan {target} -p0-65535 --rate=1000",
    "nikto": "nikto -h {target} -C all",
    "whatweb": "whatweb {target}",
    "wafw00f": "wafw00f {target}",
    "theharvester": "theHarvester -d {target} -b all",
    "sublist3r": "sublist3r -d {target} -t 5",
    "fierce": "fierce --domain {target}",
    "enum4linux": "enum4linux {target}",
    "smbmap": "smbmap -H {target}",
    "hydra_ssh": "hydra -l root -P /usr/share/wordlists/rockyou.txt {target} ssh",
    "gobuster": "gobuster dir -u http://{target} -w /usr/share/wordlists/dirb/common.txt",
    "sqlmap": "sqlmap -u http://{target} --batch --level=1",
    "testssl": "testssl.sh {target}",
    "metasploit_info": "msfconsole -q -x 'db_nmap -sV {target}; exit'",
}


def is_configured() -> bool:
    cfg = load_config()
    ssh = cfg.get("kali_ssh", {})
    return bool(ssh.get("enabled") and ssh.get("host") and ssh.get("user"))


async def run_command(tool: str, target: str, custom_cmd: str = "") -> dict:
    if not is_configured():
        return {
            "error": "Kali SSH not configured. Go to Settings > Kali Linux VM.",
            "output": "",
            "tool": tool
        }

    cmd_template = TOOL_COMMANDS.get(tool, custom_cmd)
    if not cmd_template and not custom_cmd:
        return {"error": f"Unknown tool: {tool}", "output": ""}

    cmd = (custom_cmd or cmd_template).replace("{target}", target)

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _ssh_exec, cmd)
    result["tool"] = tool
    result["command"] = cmd
    return result


async def run_raw(command: str) -> dict:
    if not is_configured():
        return {"error": "Kali SSH not configured", "output": ""}
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _ssh_exec, command)
    result["command"] = command
    return result


def _ssh_exec(command: str) -> dict:
    cfg = load_config()
    ssh_cfg = cfg.get("kali_ssh", {})

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        connect_kwargs = {
            "hostname": ssh_cfg["host"],
            "port": int(ssh_cfg.get("port", 22)),
            "username": ssh_cfg["user"],
            "timeout": 10,
        }
        if ssh_cfg.get("key_path"):
            connect_kwargs["key_filename"] = ssh_cfg["key_path"]
        elif ssh_cfg.get("password"):
            connect_kwargs["password"] = ssh_cfg["password"]

        client.connect(**connect_kwargs)

        _, stdout, stderr = client.exec_command(command, timeout=120)
        out = stdout.read().decode(errors="replace")
        err = stderr.read().decode(errors="replace")
        exit_code = stdout.channel.recv_exit_status()

        return {
            "output": out,
            "stderr": err[:500] if err else "",
            "exit_code": exit_code,
            "status": "success" if exit_code == 0 else "error",
        }
    except paramiko.AuthenticationException:
        return {"error": "SSH authentication failed", "output": "", "status": "error"}
    except paramiko.NoValidConnectionsError:
        return {"error": "Could not connect to Kali VM. Check host/port in settings.", "output": "", "status": "error"}
    except Exception as e:
        return {"error": str(e), "output": "", "status": "error"}
    finally:
        client.close()


def get_available_tools() -> list[dict]:
    return [
        {"id": "nmap_quick", "name": "Nmap Quick", "desc": "Top 100 ports fast scan", "category": "scanning"},
        {"id": "nmap_full", "name": "Nmap Full", "desc": "All ports + service detection", "category": "scanning"},
        {"id": "nmap_vuln", "name": "Nmap Vuln Scripts", "desc": "NSE vulnerability scripts", "category": "scanning"},
        {"id": "masscan", "name": "Masscan", "desc": "Ultra-fast port scan (all 65535)", "category": "scanning"},
        {"id": "nikto", "name": "Nikto", "desc": "Web server vulnerability scanner", "category": "web"},
        {"id": "whatweb", "name": "WhatWeb", "desc": "Web technology fingerprinting", "category": "web"},
        {"id": "wafw00f", "name": "WAF Detection", "desc": "Detect Web Application Firewalls", "category": "web"},
        {"id": "gobuster", "name": "Gobuster", "desc": "Directory/file brute force", "category": "web"},
        {"id": "sqlmap", "name": "SQLMap", "desc": "SQL injection detection", "category": "web"},
        {"id": "testssl", "name": "TestSSL", "desc": "SSL/TLS configuration analysis", "category": "ssl"},
        {"id": "theharvester", "name": "theHarvester", "desc": "Email/subdomain OSINT harvesting", "category": "osint"},
        {"id": "sublist3r", "name": "Sublist3r", "desc": "Subdomain enumeration", "category": "osint"},
        {"id": "fierce", "name": "Fierce", "desc": "DNS reconnaissance", "category": "osint"},
        {"id": "enum4linux", "name": "Enum4linux", "desc": "Windows/Samba enumeration", "category": "network"},
        {"id": "smbmap", "name": "SMBMap", "desc": "SMB share enumeration", "category": "network"},
        {"id": "metasploit_info", "name": "Metasploit Scan", "desc": "MSF db_nmap service scan", "category": "exploit"},
    ]
