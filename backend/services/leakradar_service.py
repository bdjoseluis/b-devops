import httpx
from config_manager import get_api_key

"""
LeakRadar - Breach monitoring service
API: https://leakradar.io/api/
"""


async def check_email(email: str) -> dict:
    key = get_api_key("leakradar")
    if not key:
        return {"error": "LeakRadar API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                "https://leakradar.io/api/v1/check/email",
                headers={"Authorization": f"Bearer {key}"},
                params={"email": email}
            )
            if r.status_code == 404:
                return {"found": False, "breaches": [], "email": email}
            r.raise_for_status()
            data = r.json()
        return {
            "email": email,
            "found": data.get("found", False),
            "breaches": data.get("breaches", []),
            "total": data.get("total", 0),
            "source": "leakradar"
        }
    except Exception as e:
        return {"error": str(e)}


async def check_domain(domain: str) -> dict:
    key = get_api_key("leakradar")
    if not key:
        return {"error": "LeakRadar API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                "https://leakradar.io/api/v1/check/domain",
                headers={"Authorization": f"Bearer {key}"},
                params={"domain": domain}
            )
            r.raise_for_status()
            data = r.json()
        return {
            "domain": domain,
            "found": data.get("found", False),
            "emails_leaked": data.get("emails", []),
            "total": data.get("total", 0),
            "sources": data.get("sources", []),
        }
    except Exception as e:
        return {"error": str(e)}


async def search_keyword(keyword: str) -> dict:
    key = get_api_key("leakradar")
    if not key:
        return {"error": "LeakRadar API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                "https://leakradar.io/api/v1/search",
                headers={"Authorization": f"Bearer {key}"},
                params={"q": keyword}
            )
            r.raise_for_status()
            data = r.json()
        return data
    except Exception as e:
        return {"error": str(e)}
