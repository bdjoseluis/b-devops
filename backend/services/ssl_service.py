import ssl
import socket
import asyncio
from datetime import datetime


async def get_cert_info(domain: str, port: int = 443) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _fetch_cert, domain, port)


def _fetch_cert(domain: str, port: int) -> dict:
    try:
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
            s.settimeout(8)
            s.connect((domain, port))
            cert = s.getpeercert()

        subject = dict(x[0] for x in cert.get("subject", []))
        issuer = dict(x[0] for x in cert.get("issuer", []))
        san = [v for t, v in cert.get("subjectAltName", []) if t == "DNS"]

        not_before = datetime.strptime(cert["notBefore"], "%b %d %H:%M:%S %Y %Z")
        not_after = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z")
        days_left = (not_after - datetime.utcnow()).days

        return {
            "subject": subject.get("commonName"),
            "issuer_org": issuer.get("organizationName"),
            "issuer_cn": issuer.get("commonName"),
            "san": san,
            "not_before": not_before.strftime("%Y-%m-%d"),
            "not_after": not_after.strftime("%Y-%m-%d"),
            "days_until_expiry": days_left,
            "expired": days_left < 0,
            "expiring_soon": 0 <= days_left <= 30,
        }
    except Exception as e:
        return {"error": str(e)}
