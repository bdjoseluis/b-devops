import httpx
import asyncio
import random
import string
from datetime import datetime

# 1secmail API - completely free, no registration
SECMAIL_BASE = "https://www.1secmail.com/api/v1/"
SECMAIL_DOMAINS = ["1secmail.com", "1secmail.org", "1secmail.net", "kzccv.com", "qiott.com", "wuuvo.com"]

# Guerrilla Mail API - also free
GUERRILLA_BASE = "https://www.guerrillamail.com/ajax.php"

_active_sessions: dict = {}  # session_id -> {email, domain, login}


def _random_alias(length: int = 12) -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


async def create_email(session_id: str = "default", alias: str = None) -> dict:
    """Generate a random temp email using 1secmail"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(SECMAIL_BASE, params={"action": "genRandomMailbox", "count": 1})
            r.raise_for_status()
            emails = r.json()

        if not emails:
            raise Exception("No email returned")

        email = emails[0]
        login, domain = email.split("@")

        _active_sessions[session_id] = {
            "email": email,
            "login": login,
            "domain": domain,
            "created": datetime.now().isoformat(),
            "provider": "1secmail",
        }

        return {
            "email": email,
            "login": login,
            "domain": domain,
            "session_id": session_id,
            "provider": "1secmail",
            "expires_in": "1 hora (aprox)",
        }
    except Exception as e:
        # Fallback: generate manually
        login = alias or _random_alias()
        domain = random.choice(SECMAIL_DOMAINS)
        email = f"{login}@{domain}"
        _active_sessions[session_id] = {
            "email": email, "login": login, "domain": domain,
            "created": datetime.now().isoformat(), "provider": "1secmail-manual"
        }
        return {
            "email": email, "login": login, "domain": domain,
            "session_id": session_id, "provider": "1secmail-manual"
        }


async def create_custom_email(login: str, domain: str = None, session_id: str = "default") -> dict:
    """Create temp email with custom login"""
    domain = domain or random.choice(SECMAIL_DOMAINS)
    email = f"{login}@{domain}"
    _active_sessions[session_id] = {
        "email": email, "login": login, "domain": domain,
        "created": datetime.now().isoformat(), "provider": "1secmail"
    }
    return {"email": email, "login": login, "domain": domain, "session_id": session_id}


async def get_inbox(session_id: str = "default") -> dict:
    """Get inbox messages"""
    session = _active_sessions.get(session_id)
    if not session:
        return {"error": "No active session. Create an email first."}

    login = session["login"]
    domain = session["domain"]

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                SECMAIL_BASE,
                params={"action": "getMessages", "login": login, "domain": domain}
            )
            r.raise_for_status()
            messages = r.json()

        return {
            "email": session["email"],
            "messages": [
                {
                    "id": m.get("id"),
                    "from": m.get("from"),
                    "subject": m.get("subject"),
                    "date": m.get("date"),
                    "size": m.get("size"),
                }
                for m in messages
            ],
            "count": len(messages),
            "session_id": session_id,
        }
    except Exception as e:
        return {"error": str(e)}


async def read_message(session_id: str, message_id: int) -> dict:
    """Read a specific message"""
    session = _active_sessions.get(session_id)
    if not session:
        return {"error": "No active session"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                SECMAIL_BASE,
                params={
                    "action": "readMessage",
                    "login": session["login"],
                    "domain": session["domain"],
                    "id": message_id
                }
            )
            r.raise_for_status()
            msg = r.json()

        return {
            "id": msg.get("id"),
            "from": msg.get("from"),
            "subject": msg.get("subject"),
            "date": msg.get("date"),
            "body": msg.get("body", msg.get("textBody", ""))[:5000],
            "html_body": msg.get("htmlBody", "")[:5000],
            "attachments": msg.get("attachments", []),
        }
    except Exception as e:
        return {"error": str(e)}


async def wait_for_email(session_id: str, timeout_s: int = 60, poll_interval: int = 3) -> dict:
    """Poll inbox until a new message arrives (for automations)"""
    session = _active_sessions.get(session_id)
    if not session:
        return {"error": "No active session"}

    elapsed = 0
    initial_count = 0

    while elapsed < timeout_s:
        inbox = await get_inbox(session_id)
        count = inbox.get("count", 0)
        if count > initial_count:
            messages = inbox.get("messages", [])
            if messages:
                # Read the newest message
                newest = messages[0]
                full = await read_message(session_id, newest["id"])
                return {"received": True, "message": full, "waited_seconds": elapsed}
        await asyncio.sleep(poll_interval)
        elapsed += poll_interval

    return {"received": False, "waited_seconds": elapsed, "message": None}


def get_session(session_id: str = "default") -> dict:
    return _active_sessions.get(session_id, {})


def get_all_sessions() -> list:
    return [
        {"session_id": k, **v}
        for k, v in _active_sessions.items()
    ]


def delete_session(session_id: str):
    _active_sessions.pop(session_id, None)


def get_available_domains() -> list[str]:
    return SECMAIL_DOMAINS
