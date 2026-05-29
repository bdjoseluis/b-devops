import httpx
import base64
from config_manager import get_api_key

CENSYS_BASE = "https://search.censys.io/api"


def _get_auth():
    api_id = get_api_key("censys_id")
    api_secret = get_api_key("censys_secret")
    if not api_id or not api_secret:
        return None
    token = base64.b64encode(f"{api_id}:{api_secret}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


async def search_ip(ip: str) -> dict:
    auth = _get_auth()
    if not auth:
        return {"error": "Censys API credentials not configured (censys_id + censys_secret)"}
    try:
        async with httpx.AsyncClient(timeout=15, headers=auth) as client:
            r = await client.get(f"{CENSYS_BASE}/v2/hosts/{ip}")
            if r.status_code == 404:
                return {"error": "Host not found in Censys"}
            r.raise_for_status()
            data = r.json().get("result", {})
        return _parse_host(data)
    except Exception as e:
        return {"error": str(e)}


async def search_domain(domain: str) -> dict:
    auth = _get_auth()
    if not auth:
        return {"error": "Censys API credentials not configured"}
    try:
        async with httpx.AsyncClient(timeout=15, headers=auth) as client:
            r = await client.get(
                f"{CENSYS_BASE}/v2/hosts/search",
                params={"q": f"dns.names: {domain}", "per_page": 10}
            )
            r.raise_for_status()
            data = r.json()
        hits = data.get("result", {}).get("hits", [])
        return {
            "total": data.get("result", {}).get("total", 0),
            "hosts": [_parse_hit(h) for h in hits]
        }
    except Exception as e:
        return {"error": str(e)}


async def search_query(query: str, limit: int = 10) -> dict:
    auth = _get_auth()
    if not auth:
        return {"error": "Censys API credentials not configured"}
    try:
        async with httpx.AsyncClient(timeout=15, headers=auth) as client:
            r = await client.get(
                f"{CENSYS_BASE}/v2/hosts/search",
                params={"q": query, "per_page": limit}
            )
            r.raise_for_status()
            data = r.json()
        hits = data.get("result", {}).get("hits", [])
        return {
            "total": data.get("result", {}).get("total", 0),
            "query": query,
            "hosts": [_parse_hit(h) for h in hits]
        }
    except Exception as e:
        return {"error": str(e)}


def _parse_host(data: dict) -> dict:
    services = []
    for svc in data.get("services", []):
        services.append({
            "port": svc.get("port"),
            "transport_protocol": svc.get("transport_protocol"),
            "service_name": svc.get("service_name"),
            "product": svc.get("software", [{}])[0].get("product", "") if svc.get("software") else "",
            "banner": svc.get("banner", "")[:200],
        })
    return {
        "ip": data.get("ip"),
        "asn": data.get("autonomous_system", {}).get("asn"),
        "as_name": data.get("autonomous_system", {}).get("name"),
        "country": data.get("location", {}).get("country"),
        "city": data.get("location", {}).get("city"),
        "labels": data.get("labels", []),
        "dns_names": data.get("dns", {}).get("reverse_dns", {}).get("names", []),
        "services": services,
        "open_ports": [s["port"] for s in services if s["port"]],
        "last_updated": data.get("last_updated_at"),
    }


def _parse_hit(h: dict) -> dict:
    return {
        "ip": h.get("ip"),
        "asn": h.get("autonomous_system", {}).get("asn"),
        "country": h.get("location", {}).get("country"),
        "services": [f"{s.get('port')}/{s.get('transport_protocol','tcp')}" for s in h.get("matched_services", [])],
        "labels": h.get("labels", []),
    }
