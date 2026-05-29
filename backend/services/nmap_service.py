import asyncio
import subprocess
import xml.etree.ElementTree as ET
from config_manager import load_config


SCAN_PROFILES = {
    "quick": ["-T4", "-F", "--open"],
    "full": ["-T4", "-p-", "--open", "-sV"],
    "stealth": ["-sS", "-T2", "-p-", "--open"],
    "vuln": ["-T4", "-sV", "--script=vuln", "--open"],
    "os": ["-T4", "-O", "-sV", "--open"],
    "service": ["-T4", "-sV", "-sC", "--open"],
    "udp": ["-sU", "-T4", "--top-ports", "100", "--open"],
}


async def scan(target: str, profile: str = "quick", custom_flags: str = "") -> dict:
    cfg = load_config()
    nmap_bin = cfg.get("nmap_path", "nmap")
    flags = SCAN_PROFILES.get(profile, SCAN_PROFILES["quick"])

    cmd = [nmap_bin] + flags + ["-oX", "-", target]
    if custom_flags:
        cmd = [nmap_bin] + custom_flags.split() + ["-oX", "-", target]

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _run_nmap, cmd)
    return result


def _run_nmap(cmd: list[str]) -> dict:
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300
        )
        if proc.returncode != 0 and not proc.stdout:
            return {"error": proc.stderr or "nmap failed", "command": " ".join(cmd)}

        return _parse_xml(proc.stdout, " ".join(cmd))
    except FileNotFoundError:
        return {"error": "nmap not found. Install nmap or update path in settings.", "command": " ".join(cmd)}
    except subprocess.TimeoutExpired:
        return {"error": "Scan timed out (300s)", "command": " ".join(cmd)}
    except Exception as e:
        return {"error": str(e), "command": " ".join(cmd)}


def _parse_xml(xml_data: str, command: str) -> dict:
    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as e:
        return {"error": f"XML parse error: {e}", "raw": xml_data[:500]}

    hosts = []
    for host in root.findall("host"):
        status = host.find("status")
        if status is None or status.get("state") != "up":
            continue

        addrs = {}
        for addr in host.findall("address"):
            addrs[addr.get("addrtype")] = addr.get("addr")

        hostnames = [h.get("name") for h in host.findall(".//hostname") if h.get("name")]

        ports = []
        for port in host.findall(".//port"):
            state = port.find("state")
            if state is None or state.get("state") != "open":
                continue
            svc = port.find("service") or {}
            scripts = []
            for script in port.findall("script"):
                scripts.append({"id": script.get("id"), "output": script.get("output", "")[:300]})

            ports.append({
                "port": int(port.get("portid", 0)),
                "protocol": port.get("protocol", "tcp"),
                "service": svc.get("name") if hasattr(svc, "get") else "",
                "product": svc.get("product", "") if hasattr(svc, "get") else "",
                "version": svc.get("version", "") if hasattr(svc, "get") else "",
                "extra_info": svc.get("extrainfo", "") if hasattr(svc, "get") else "",
                "scripts": scripts,
            })

        os_matches = []
        for osm in host.findall(".//osmatch"):
            os_matches.append({
                "name": osm.get("name"),
                "accuracy": osm.get("accuracy"),
            })

        hosts.append({
            "ip": addrs.get("ipv4") or addrs.get("ipv6"),
            "mac": addrs.get("mac"),
            "hostnames": hostnames,
            "open_ports": [p["port"] for p in ports],
            "ports": ports,
            "os_detection": os_matches[:3],
        })

    run_stats = root.find("runstats/finished")
    elapsed = run_stats.get("elapsed") if run_stats is not None else "?"

    return {
        "hosts": hosts,
        "total_hosts": len(hosts),
        "command": command,
        "elapsed": elapsed,
        "raw_summary": f"{len(hosts)} host(s) up",
    }
