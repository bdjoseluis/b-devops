import httpx
from config_manager import get_api_key


async def lookup_ip(ip: str) -> dict:
    key = get_api_key("shodan")
    if not key:
        return {"error": "Shodan API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"https://api.shodan.io/shodan/host/{ip}?key={key}")
            if r.status_code == 404:
                return {"error": "Host not found in Shodan"}
            r.raise_for_status()
            data = r.json()
        return _parse_host(data)
    except Exception as e:
        return {"error": str(e)}


async def search(query: str, limit: int = 10) -> dict:
    key = get_api_key("shodan")
    if not key:
        return {"error": "Shodan API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                "https://api.shodan.io/shodan/host/search",
                params={"key": key, "query": query, "minify": True}
            )
            r.raise_for_status()
            data = r.json()
        matches = data.get("matches", [])[:limit]
        return {
            "total": data.get("total", 0),
            "results": [_parse_match(m) for m in matches]
        }
    except Exception as e:
        return {"error": str(e)}


async def lookup_domain(domain: str) -> dict:
    key = get_api_key("shodan")
    if not key:
        return {"error": "Shodan API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"https://api.shodan.io/dns/resolve?hostnames={domain}&key={key}")
            if r.status_code != 200:
                return {"error": "DNS resolve failed"}
            ips = r.json()
        ip = ips.get(domain)
        if not ip:
            return {"error": "Could not resolve domain via Shodan"}
        return await lookup_ip(ip)
    except Exception as e:
        return {"error": str(e)}


def _parse_host(data: dict) -> dict:
    ports = []
    services = []
    vulns = list(data.get("vulns", {}).keys())

    for item in data.get("data", []):
        port = item.get("port")
        transport = item.get("transport", "tcp")
        product = item.get("product", "")
        version = item.get("version", "")
        banner = item.get("data", "")[:200]

        if port and port not in ports:
            ports.append(port)

        services.append({
            "port": port,
            "transport": transport,
            "product": product,
            "version": version,
            "banner": banner.strip(),
            "cpe": item.get("cpe", []),
        })

    return {
        "ip": data.get("ip_str"),
        "org": data.get("org"),
        "isp": data.get("isp"),
        "asn": data.get("asn"),
        "country": data.get("country_name"),
        "city": data.get("city"),
        "hostnames": data.get("hostnames", []),
        "domains": data.get("domains", []),
        "os": data.get("os"),
        "open_ports": sorted(ports),
        "services": services,
        "vulnerabilities": vulns,
        "tags": data.get("tags", []),
        "last_update": data.get("last_update"),
    }


def _parse_match(m: dict) -> dict:
    return {
        "ip": m.get("ip_str"),
        "port": m.get("port"),
        "org": m.get("org"),
        "country": m.get("location", {}).get("country_name"),
        "product": m.get("product", ""),
    }
