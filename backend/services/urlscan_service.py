import httpx
import asyncio
from config_manager import get_api_key

BASE = "https://urlscan.io/api/v1"


def _headers():
    key = get_api_key("urlscan")
    h = {"Content-Type": "application/json"}
    if key:
        h["API-Key"] = key
    return h


async def submit_scan(url: str, visibility: str = "unlisted") -> dict:
    try:
        async with httpx.AsyncClient(timeout=15, headers=_headers()) as client:
            r = await client.post(
                f"{BASE}/scan/",
                json={"url": url, "visibility": visibility}
            )
            if r.status_code == 400:
                return {"error": r.json().get("message", "Bad request")}
            if r.status_code == 429:
                return {"error": "Rate limit exceeded — wait a moment and retry"}
            r.raise_for_status()
            data = r.json()
        return {
            "uuid": data.get("uuid"),
            "result_url": data.get("result"),
            "api_url": data.get("api"),
            "visibility": data.get("visibility"),
            "url": url,
            "status": "submitted",
            "message": "Scan submitted. Call /result with the uuid in ~10 seconds."
        }
    except Exception as e:
        return {"error": str(e)}


async def get_result(uuid: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=20, headers=_headers()) as client:
            r = await client.get(f"{BASE}/result/{uuid}/")
            if r.status_code == 404:
                return {"error": "Scan not found or still processing — retry in a few seconds"}
            r.raise_for_status()
            data = r.json()
        return _parse_result(data)
    except Exception as e:
        return {"error": str(e)}


async def scan_and_wait(url: str, visibility: str = "unlisted") -> dict:
    """Submit + poll until result ready (max 30s)"""
    sub = await submit_scan(url, visibility)
    if sub.get("error"):
        return sub
    uuid = sub["uuid"]
    for _ in range(6):
        await asyncio.sleep(5)
        result = await get_result(uuid)
        if not result.get("error"):
            return result
    return {"error": "Scan timed out — check result later", "uuid": uuid, "result_url": sub.get("result_url")}


async def search_domain(domain: str, size: int = 10) -> dict:
    try:
        async with httpx.AsyncClient(timeout=15, headers=_headers()) as client:
            r = await client.get(
                f"{BASE}/search/",
                params={"q": f"domain:{domain}", "size": size}
            )
            r.raise_for_status()
            data = r.json()
        results = data.get("results", [])
        return {
            "domain": domain,
            "total": data.get("total", 0),
            "has_more": data.get("has_more", False),
            "scans": [_parse_search_hit(r) for r in results]
        }
    except Exception as e:
        return {"error": str(e)}


async def search_ip(ip: str, size: int = 10) -> dict:
    try:
        async with httpx.AsyncClient(timeout=15, headers=_headers()) as client:
            r = await client.get(
                f"{BASE}/search/",
                params={"q": f"page.ip:{ip}", "size": size}
            )
            r.raise_for_status()
            data = r.json()
        results = data.get("results", [])
        return {
            "ip": ip,
            "total": data.get("total", 0),
            "scans": [_parse_search_hit(r) for r in results]
        }
    except Exception as e:
        return {"error": str(e)}


def _parse_result(data: dict) -> dict:
    page = data.get("page", {})
    lists = data.get("lists", {})
    stats = data.get("stats", {})
    meta = data.get("meta", {})
    verdicts = data.get("verdicts", {})
    return {
        "url": page.get("url"),
        "domain": page.get("domain"),
        "ip": page.get("ip"),
        "country": page.get("country"),
        "server": page.get("server"),
        "title": page.get("title"),
        "status": page.get("status"),
        "mime_type": page.get("mimeType"),
        "asn": page.get("asn"),
        "asnname": page.get("asnname"),
        "screenshot": data.get("task", {}).get("screenshotURL"),
        "malicious": verdicts.get("overall", {}).get("malicious", False),
        "score": verdicts.get("overall", {}).get("score", 0),
        "tags": verdicts.get("overall", {}).get("tags", []),
        "brands": verdicts.get("overall", {}).get("brands", []),
        "categories": verdicts.get("overall", {}).get("categories", []),
        "ips": lists.get("ips", [])[:20],
        "domains": lists.get("domains", [])[:20],
        "urls": lists.get("urls", [])[:10],
        "certificates": [
            {"subject": c.get("subjectName"), "issuer": c.get("issuer"), "valid_to": c.get("validTo")}
            for c in lists.get("certificates", [])[:5]
        ],
        "requests": stats.get("requests", {}).get("total", 0),
        "data_length": stats.get("dataLength"),
        "ads_blocked": stats.get("adBlocked", 0),
        "tech": [t.get("name") for t in meta.get("processors", {}).get("wappa", {}).get("data", []) if t.get("name")][:15],
        "result_url": f"https://urlscan.io/result/{data.get('task', {}).get('uuid', '')}/"
    }


def _parse_search_hit(h: dict) -> dict:
    page = h.get("page", {})
    task = h.get("task", {})
    stats = h.get("stats", {})
    return {
        "uuid": task.get("uuid"),
        "url": page.get("url"),
        "domain": page.get("domain"),
        "ip": page.get("ip"),
        "country": page.get("country"),
        "title": page.get("title"),
        "time": task.get("time"),
        "screenshot": task.get("screenshotURL"),
        "malicious": stats.get("malicious", 0) > 0,
        "result_url": f"https://urlscan.io/result/{task.get('uuid', '')}/"
    }
