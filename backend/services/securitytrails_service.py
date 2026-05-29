import httpx
from config_manager import get_api_key

BASE = "https://api.securitytrails.com/v1"


def _headers():
    key = get_api_key("securitytrails")
    if not key:
        return None
    return {"APIKEY": key, "Content-Type": "application/json"}


async def get_domain_info(domain: str) -> dict:
    h = _headers()
    if not h:
        return {"error": "SecurityTrails API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=15, headers=h) as client:
            r = await client.get(f"{BASE}/domain/{domain}")
            if r.status_code == 403:
                return {"error": "Invalid SecurityTrails API key"}
            if r.status_code == 404:
                return {"error": "Domain not found"}
            r.raise_for_status()
            data = r.json()
        current = data.get("current_dns", {})
        return {
            "hostname": data.get("hostname"),
            "apex_domain": data.get("apex_domain"),
            "alexa_rank": data.get("alexa_rank"),
            "whois": {
                "registrar": data.get("whois", {}).get("registrar"),
                "created": data.get("whois", {}).get("createdDate"),
                "expires": data.get("whois", {}).get("expiresDate"),
            },
            "dns": {
                "a": [r.get("ip") for r in current.get("a", {}).get("values", [])],
                "mx": [r.get("hostname") for r in current.get("mx", {}).get("values", [])],
                "ns": [r.get("nameserver") for r in current.get("ns", {}).get("values", [])],
                "txt": [r.get("value") for r in current.get("txt", {}).get("values", [])],
                "soa": current.get("soa", {}).get("values", [{}])[0].get("email") if current.get("soa", {}).get("values") else None,
            },
            "subdomain_count": data.get("subdomain_count", 0),
        }
    except Exception as e:
        return {"error": str(e)}


async def get_subdomains(domain: str) -> dict:
    h = _headers()
    if not h:
        return {"error": "SecurityTrails API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=20, headers=h) as client:
            r = await client.get(f"{BASE}/domain/{domain}/subdomains", params={"children_only": "false"})
            if r.status_code == 403:
                return {"error": "Invalid SecurityTrails API key"}
            r.raise_for_status()
            data = r.json()
        subs = data.get("subdomains", [])
        return {
            "domain": domain,
            "total": len(subs),
            "subdomains": [f"{s}.{domain}" for s in subs[:200]],
        }
    except Exception as e:
        return {"error": str(e)}


async def get_dns_history(domain: str, record_type: str = "a") -> dict:
    h = _headers()
    if not h:
        return {"error": "SecurityTrails API key not configured"}
    valid_types = {"a", "aaaa", "mx", "ns", "txt", "soa"}
    if record_type not in valid_types:
        record_type = "a"
    try:
        async with httpx.AsyncClient(timeout=20, headers=h) as client:
            r = await client.get(f"{BASE}/history/{domain}/dns/{record_type}")
            if r.status_code == 403:
                return {"error": "Invalid SecurityTrails API key"}
            r.raise_for_status()
            data = r.json()
        records = data.get("records", [])
        return {
            "domain": domain,
            "type": record_type.upper(),
            "total": len(records),
            "history": [
                {
                    "first_seen": rec.get("first_seen"),
                    "last_seen": rec.get("last_seen"),
                    "organizations": rec.get("organizations", []),
                    "values": _extract_values(rec.get("values", []), record_type),
                }
                for rec in records[:50]
            ]
        }
    except Exception as e:
        return {"error": str(e)}


async def get_associated_domains(domain: str) -> dict:
    h = _headers()
    if not h:
        return {"error": "SecurityTrails API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=20, headers=h) as client:
            r = await client.post(
                f"{BASE}/domain/{domain}/associated",
                json={"filter": {"whois_email": True}},
                params={"page": 1}
            )
            if r.status_code == 403:
                return {"error": "Invalid SecurityTrails API key"}
            r.raise_for_status()
            data = r.json()
        records = data.get("records", [])
        return {
            "domain": domain,
            "total": data.get("meta", {}).get("total_count", len(records)),
            "domains": [
                {
                    "hostname": rec.get("hostname"),
                    "whois": {
                        "registrar": rec.get("whois", {}).get("registrar"),
                        "created": rec.get("whois", {}).get("createdDate"),
                    }
                }
                for rec in records[:50]
            ]
        }
    except Exception as e:
        return {"error": str(e)}


async def search_by_ip(ip: str) -> dict:
    h = _headers()
    if not h:
        return {"error": "SecurityTrails API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=20, headers=h) as client:
            r = await client.post(
                f"{BASE}/domains/list",
                json={"filter": {"ipv4": ip}},
                params={"page": 1}
            )
            if r.status_code == 403:
                return {"error": "Invalid SecurityTrails API key"}
            r.raise_for_status()
            data = r.json()
        records = data.get("records", [])
        return {
            "ip": ip,
            "total": data.get("meta", {}).get("total_count", len(records)),
            "domains": [rec.get("hostname") for rec in records[:50]]
        }
    except Exception as e:
        return {"error": str(e)}


def _extract_values(values: list, record_type: str) -> list:
    out = []
    for v in values[:10]:
        if record_type == "a":
            out.append(v.get("ip", ""))
        elif record_type == "mx":
            out.append(v.get("hostname", ""))
        elif record_type == "ns":
            out.append(v.get("nameserver", ""))
        elif record_type == "txt":
            out.append(v.get("value", ""))
        else:
            out.append(str(v))
    return [x for x in out if x]
