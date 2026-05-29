import httpx
from config_manager import get_api_key

VT_BASE = "https://www.virustotal.com/api/v3"


async def analyze_domain(domain: str) -> dict:
    key = get_api_key("virustotal")
    if not key:
        return {"error": "VirusTotal API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=15, headers={"x-apikey": key}) as client:
            r = await client.get(f"{VT_BASE}/domains/{domain}")
            if r.status_code == 404:
                return {"error": "Domain not found"}
            r.raise_for_status()
            data = r.json()
        return _parse_domain(data)
    except Exception as e:
        return {"error": str(e)}


async def analyze_ip(ip: str) -> dict:
    key = get_api_key("virustotal")
    if not key:
        return {"error": "VirusTotal API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=15, headers={"x-apikey": key}) as client:
            r = await client.get(f"{VT_BASE}/ip_addresses/{ip}")
            r.raise_for_status()
            data = r.json()
        return _parse_ip(data)
    except Exception as e:
        return {"error": str(e)}


async def analyze_url(url: str) -> dict:
    key = get_api_key("virustotal")
    if not key:
        return {"error": "VirusTotal API key not configured"}
    import base64
    url_id = base64.urlsafe_b64encode(url.encode()).decode().rstrip("=")
    try:
        async with httpx.AsyncClient(timeout=15, headers={"x-apikey": key}) as client:
            r = await client.get(f"{VT_BASE}/urls/{url_id}")
            r.raise_for_status()
            data = r.json()
        return _parse_url(data)
    except Exception as e:
        return {"error": str(e)}


def _parse_domain(data: dict) -> dict:
    attrs = data.get("data", {}).get("attributes", {})
    stats = attrs.get("last_analysis_stats", {})
    return {
        "malicious": stats.get("malicious", 0),
        "suspicious": stats.get("suspicious", 0),
        "harmless": stats.get("harmless", 0),
        "undetected": stats.get("undetected", 0),
        "reputation": attrs.get("reputation", 0),
        "categories": attrs.get("categories", {}),
        "creation_date": attrs.get("creation_date"),
        "registrar": attrs.get("registrar"),
        "whois": attrs.get("whois", "")[:500],
        "tags": attrs.get("tags", []),
        "popularity_ranks": attrs.get("popularity_ranks", {}),
    }


def _parse_ip(data: dict) -> dict:
    attrs = data.get("data", {}).get("attributes", {})
    stats = attrs.get("last_analysis_stats", {})
    return {
        "malicious": stats.get("malicious", 0),
        "suspicious": stats.get("suspicious", 0),
        "harmless": stats.get("harmless", 0),
        "undetected": stats.get("undetected", 0),
        "reputation": attrs.get("reputation", 0),
        "country": attrs.get("country"),
        "asn": attrs.get("asn"),
        "as_owner": attrs.get("as_owner"),
        "network": attrs.get("network"),
        "tags": attrs.get("tags", []),
    }


def _parse_url(data: dict) -> dict:
    attrs = data.get("data", {}).get("attributes", {})
    stats = attrs.get("last_analysis_stats", {})
    return {
        "malicious": stats.get("malicious", 0),
        "suspicious": stats.get("suspicious", 0),
        "harmless": stats.get("harmless", 0),
        "url": attrs.get("url"),
        "title": attrs.get("title"),
        "final_url": attrs.get("last_final_url"),
        "tags": attrs.get("tags", []),
    }
