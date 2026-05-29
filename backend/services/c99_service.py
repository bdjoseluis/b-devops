import httpx
from config_manager import get_api_key

C99_BASE = "https://api.c99.nl"


async def subdomain_finder(domain: str) -> dict:
    key = get_api_key("c99")
    if not key:
        return {"error": "C99.nl API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                f"{C99_BASE}/subdomainfinder",
                params={"key": key, "domain": domain, "json": "true"}
            )
            r.raise_for_status()
            data = r.json()
        if not data.get("success"):
            return {"error": data.get("message", "C99 error")}
        subs = data.get("subdomains", [])
        return {
            "domain": domain,
            "subdomains": [
                {"subdomain": s.get("subdomain"), "ip": s.get("ip")}
                for s in subs
            ],
            "total": len(subs),
            "source": "c99.nl"
        }
    except Exception as e:
        return {"error": str(e)}


async def ip_to_domains(ip: str) -> dict:
    key = get_api_key("c99")
    if not key:
        return {"error": "C99.nl API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{C99_BASE}/reverseip",
                params={"key": key, "host": ip, "json": "true"}
            )
            r.raise_for_status()
            data = r.json()
        domains = data.get("domains", [])
        return {
            "ip": ip,
            "domains": domains,
            "total": len(domains),
        }
    except Exception as e:
        return {"error": str(e)}


async def phone_lookup(phone: str) -> dict:
    key = get_api_key("c99")
    if not key:
        return {"error": "C99.nl API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{C99_BASE}/phonelookup",
                params={"key": key, "number": phone, "json": "true"}
            )
            r.raise_for_status()
            data = r.json()
        info = data.get("details", {})
        return {
            "phone": phone,
            "country_code": info.get("countrycode"),
            "country": info.get("country"),
            "carrier": info.get("carrier"),
            "type": info.get("numbertype"),
            "valid": data.get("success", False),
        }
    except Exception as e:
        return {"error": str(e)}


async def whois_lookup(domain: str) -> dict:
    key = get_api_key("c99")
    if not key:
        return {"error": "C99.nl API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{C99_BASE}/whois",
                params={"key": key, "domain": domain, "json": "true"}
            )
            r.raise_for_status()
            data = r.json()
        return data.get("whois_result", {"raw": str(data)})
    except Exception as e:
        return {"error": str(e)}


async def port_scanner(host: str, ports: str = "1-1000") -> dict:
    key = get_api_key("c99")
    if not key:
        return {"error": "C99.nl API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.get(
                f"{C99_BASE}/portscanner",
                params={"key": key, "host": host, "port": ports, "json": "true"}
            )
            r.raise_for_status()
            data = r.json()
        ports_data = data.get("ports", [])
        open_ports = [p for p in ports_data if p.get("status") == "open"]
        return {
            "host": host,
            "open_ports": [p.get("port") for p in open_ports],
            "details": open_ports,
            "total_open": len(open_ports),
        }
    except Exception as e:
        return {"error": str(e)}
