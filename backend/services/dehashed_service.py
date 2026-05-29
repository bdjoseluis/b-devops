import httpx
import base64
from config_manager import load_config

DEHASHED_BASE = "https://api.dehashed.com"


def _get_auth():
    cfg = load_config()
    email = cfg.get("apis", {}).get("dehashed_email", "")
    key = cfg.get("apis", {}).get("dehashed", "")
    if not email or not key:
        return None
    token = base64.b64encode(f"{email}:{key}".encode()).decode()
    return {"Authorization": f"Basic {token}", "Accept": "application/json"}


async def search(query: str, query_type: str = "email", size: int = 10, page: int = 1) -> dict:
    auth = _get_auth()
    if not auth:
        return {"error": "DeHashed credentials not configured (email + API key in Settings)"}

    # Build query based on type
    type_map = {
        "email": f"email:{query}",
        "domain": f"email:@{query}",
        "username": f"username:{query}",
        "ip": f"ip_address:{query}",
        "name": f"name:{query}",
        "password": f"password:{query}",
        "hashed": f"hashed_password:{query}",
        "phone": f"phone:{query}",
        "address": f"address:{query}",
        "raw": query
    }
    q = type_map.get(query_type, f"email:{query}")

    try:
        async with httpx.AsyncClient(timeout=20, headers=auth) as client:
            r = await client.get(
                f"{DEHASHED_BASE}/search",
                params={"query": q, "size": size, "page": page}
            )
            if r.status_code == 401:
                return {"error": "DeHashed: credenciales inválidas"}
            if r.status_code == 402:
                return {"error": "DeHashed: plan sin créditos"}
            r.raise_for_status()
            data = r.json()

        entries = data.get("entries", []) or []
        return {
            "total": data.get("total", 0),
            "took": data.get("took"),
            "query": q,
            "entries": [_parse_entry(e) for e in entries[:size]],
            "balance": data.get("balance"),
        }
    except Exception as e:
        return {"error": str(e)}


def _parse_entry(e: dict) -> dict:
    return {
        "id": e.get("id"),
        "email": e.get("email"),
        "ip_address": e.get("ip_address"),
        "username": e.get("username"),
        "password": e.get("password"),
        "hashed_password": e.get("hashed_password"),
        "hash_type": e.get("hash_type"),
        "name": e.get("name"),
        "vin": e.get("vin"),
        "address": e.get("address"),
        "phone": e.get("phone"),
        "database_name": e.get("database_name"),
    }
