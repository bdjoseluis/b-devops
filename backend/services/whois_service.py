import whois
import asyncio
from datetime import datetime


async def lookup(domain: str) -> dict:
    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(None, _do_whois, domain)
        return result
    except Exception as e:
        return {"error": str(e)}


def _do_whois(domain: str) -> dict:
    try:
        w = whois.whois(domain)
        return {
            "domain_name": _normalize(w.domain_name),
            "registrar": w.registrar,
            "creation_date": _fmt_date(w.creation_date),
            "expiration_date": _fmt_date(w.expiration_date),
            "updated_date": _fmt_date(w.updated_date),
            "name_servers": _normalize(w.name_servers),
            "status": _normalize(w.status),
            "emails": _normalize(w.emails),
            "org": w.org,
            "country": w.country,
            "registrant_name": w.name,
            "dnssec": w.dnssec,
        }
    except Exception as e:
        return {"error": str(e)}


def _normalize(val):
    if val is None:
        return None
    if isinstance(val, list):
        seen = set()
        result = []
        for v in val:
            s = str(v).lower() if isinstance(v, str) else str(v)
            if s not in seen:
                seen.add(s)
                result.append(str(v))
        return result
    return str(val)


def _fmt_date(val):
    if val is None:
        return None
    if isinstance(val, list):
        val = val[0]
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d %H:%M:%S")
    return str(val)
