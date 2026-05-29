import httpx
from config_manager import get_api_key


async def find_emails(domain: str) -> dict:
    key = get_api_key("hunter")
    if not key:
        return await _find_emails_free(domain)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                "https://api.hunter.io/v2/domain-search",
                params={"domain": domain, "api_key": key, "limit": 20}
            )
            r.raise_for_status()
            data = r.json().get("data", {})
        emails = data.get("emails", [])
        return {
            "organization": data.get("organization"),
            "domain": data.get("domain"),
            "emails": [
                {
                    "email": e.get("value"),
                    "confidence": e.get("confidence"),
                    "first_name": e.get("first_name"),
                    "last_name": e.get("last_name"),
                    "position": e.get("position"),
                    "sources": len(e.get("sources", [])),
                }
                for e in emails
            ],
            "total": data.get("total", 0),
            "source": "hunter.io"
        }
    except Exception as e:
        return {"error": str(e)}


async def verify_email(email: str) -> dict:
    key = get_api_key("hunter")
    if not key:
        return {"error": "Hunter.io key not configured"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.hunter.io/v2/email-verifier",
                params={"email": email, "api_key": key}
            )
            r.raise_for_status()
            data = r.json().get("data", {})
        return {
            "email": data.get("email"),
            "result": data.get("result"),
            "score": data.get("score"),
            "smtp_server": data.get("smtp_server"),
            "smtp_check": data.get("smtp_check"),
            "accept_all": data.get("accept_all"),
            "disposable": data.get("disposable"),
            "webmail": data.get("webmail"),
            "mx_records": data.get("mx_records"),
        }
    except Exception as e:
        return {"error": str(e)}


async def _find_emails_free(domain: str) -> dict:
    # Fallback: use free sources via scraping patterns
    return {
        "emails": [],
        "total": 0,
        "source": "no-key",
        "note": "Add Hunter.io API key in settings for email discovery"
    }


async def check_breach(email: str) -> dict:
    key = get_api_key("hibp")
    if not key:
        return {"error": "HIBP API key not configured", "note": "Add Have I Been Pwned key in settings"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}",
                headers={"hibp-api-key": key, "user-agent": "B-DEVOPS"},
                params={"truncateResponse": False}
            )
            if r.status_code == 404:
                return {"breaches": [], "total": 0, "status": "clean"}
            r.raise_for_status()
            data = r.json()
        return {
            "breaches": [
                {
                    "name": b.get("Name"),
                    "domain": b.get("Domain"),
                    "breach_date": b.get("BreachDate"),
                    "pwn_count": b.get("PwnCount"),
                    "data_classes": b.get("DataClasses", []),
                }
                for b in data
            ],
            "total": len(data),
            "status": "breached"
        }
    except Exception as e:
        return {"error": str(e)}
