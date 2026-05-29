import httpx
import asyncio

WMN_DATA_URL = "https://raw.githubusercontent.com/WebBreacher/WhatsMyName/main/wmn-data.json"
_cached_sites = None


async def _load_sites() -> list:
    global _cached_sites
    if _cached_sites is not None:
        return _cached_sites
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(WMN_DATA_URL)
            r.raise_for_status()
            data = r.json()
        _cached_sites = data.get("sites", [])
        return _cached_sites
    except Exception:
        return []


async def search_username(username: str, categories: list[str] = None, limit: int = 100) -> dict:
    sites = await _load_sites()
    if not sites:
        return {"error": "No se pudo cargar la base de datos de WhatsMyName"}

    # Filter by category if provided
    if categories:
        sites = [s for s in sites if s.get("cat", "").lower() in [c.lower() for c in categories]]

    sites = sites[:limit]

    # Check in batches of 20 concurrent
    found = []
    not_found = []
    errors = []

    semaphore = asyncio.Semaphore(15)

    async def check_site(site: dict):
        uri = site.get("uri_check", "").replace("{account}", username)
        if not uri:
            return
        async with semaphore:
            try:
                async with httpx.AsyncClient(
                    timeout=8,
                    follow_redirects=True,
                    headers={"User-Agent": "Mozilla/5.0 (compatible; OSINT-Bot/1.0)"}
                ) as client:
                    r = await client.get(uri)

                e_code = site.get("e_code", 200)
                e_string = site.get("e_string", "")
                m_string = site.get("m_string", "")

                found_by_code = r.status_code == e_code
                found_by_string = e_string and e_string in r.text
                not_by_m = m_string and m_string not in r.text if m_string else True

                if (found_by_code or found_by_string) and not_by_m:
                    found.append({
                        "site": site.get("name"),
                        "url": uri,
                        "category": site.get("cat"),
                        "status": r.status_code,
                    })
                else:
                    not_found.append(site.get("name"))
            except Exception:
                errors.append(site.get("name"))

    tasks = [check_site(s) for s in sites]
    await asyncio.gather(*tasks)

    return {
        "username": username,
        "found": found,
        "total_found": len(found),
        "total_checked": len(sites),
        "errors": len(errors),
    }


def get_categories() -> list[str]:
    return [
        "social", "gaming", "music", "video", "programming",
        "shopping", "news", "forums", "dating", "finance",
        "crypto", "adult", "other"
    ]
