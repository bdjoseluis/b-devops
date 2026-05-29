"""
B-DEVOPS — Uptime Monitor Router
Comprueba URLs y devuelve status, latencia y SSL
"""
import ssl
import socket
import asyncio
import datetime
import httpx
from fastapi import APIRouter

router = APIRouter(prefix="/api/monitor", tags=["monitor"])


async def _check_url(url: str) -> dict:
    """Comprueba una URL: status HTTP, latencia, y expiry SSL si es HTTPS."""
    result = {"url": url, "status": "down", "code": None, "latency_ms": None, "ssl_days": None, "error": None}
    start = asyncio.get_event_loop().time()
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True, verify=False) as client:
            r = await client.get(url)
            result["latency_ms"] = round((asyncio.get_event_loop().time() - start) * 1000)
            result["code"] = r.status_code
            result["status"] = "up" if r.status_code < 400 else "degraded"
    except Exception as e:
        result["error"] = str(e)[:100]
        result["status"] = "down"

    # SSL expiry check
    if url.startswith("https://"):
        try:
            hostname = url.split("//")[1].split("/")[0].split(":")[0]
            ctx = ssl.create_default_context()
            with ctx.wrap_socket(socket.socket(), server_hostname=hostname) as s:
                s.settimeout(5)
                s.connect((hostname, 443))
                cert = s.getpeercert()
                expire = datetime.datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z")
                result["ssl_days"] = (expire - datetime.datetime.utcnow()).days
        except Exception:
            pass

    return result


@router.post("/check")
async def check_single(body: dict):
    """Comprueba una sola URL."""
    url = body.get("url", "")
    if not url.startswith("http"):
        url = "https://" + url
    return await _check_url(url)


@router.post("/batch")
async def check_batch(body: dict):
    """Comprueba múltiples URLs en paralelo."""
    urls = body.get("urls", [])
    results = await asyncio.gather(*[_check_url(u if u.startswith("http") else "https://" + u) for u in urls])
    up = sum(1 for r in results if r["status"] == "up")
    return {
        "results": list(results),
        "summary": {"total": len(results), "up": up, "down": len(results) - up}
    }
