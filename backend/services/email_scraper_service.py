"""
Email scraper — extract contact emails from business websites.

Strategy (in order):
  1. Scrape homepage for mailto: links and visible email patterns
  2. Try /contacto, /contact, /sobre-nosotros, /about, /quienes-somos pages
  3. Hunter.io API (if key configured)
  4. Return best candidate
"""

import re
import asyncio
import httpx
from urllib.parse import urljoin, urlparse
from config_manager import get_api_key

# Regex: matches foo@bar.tld, avoids image/font/script extensions
_EMAIL_RE = re.compile(
    r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b'
)
_FAKE_DOMAINS = {
    "example.com", "example.org", "sentry.io", "wixpress.com",
    "wordpress.com", "shopify.com", "squarespace.com", "cloudflare.com",
    "jquery.com", "google.com", "facebook.com", "twitter.com",
    "instagram.com", "youtube.com", "linkedin.com",
}
_CONTACT_PATHS = [
    "/contacto", "/contact", "/contactar", "/contactenos",
    "/sobre-nosotros", "/about", "/quienes-somos", "/quien-somos",
    "/nosotros", "/info", "/informacion",
]

_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; B-DEVOPS-Outreach/1.0)"}


def _clean_emails(raw: list[str], domain: str) -> list[str]:
    """Remove fake/library emails and sort by relevance."""
    seen = set()
    result = []
    for e in raw:
        e = e.lower().strip()
        if e in seen:
            continue
        seen.add(e)
        em_domain = e.split("@")[1] if "@" in e else ""
        if em_domain in _FAKE_DOMAINS:
            continue
        # Prefer emails that share the business domain
        result.append((0 if em_domain == domain else 1, e))
    result.sort()
    return [e for _, e in result]


async def _extract_from_html(html: str) -> list[str]:
    """Find all email-like strings in HTML."""
    # mailto: links first (highest confidence)
    mailto = re.findall(r'mailto:([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})', html)
    # Then general pattern (may include obfuscated ones)
    plain = _EMAIL_RE.findall(html)
    return list(dict.fromkeys(mailto + plain))   # deduplicated, mailto first


async def _fetch_page(client: httpx.AsyncClient, url: str) -> str:
    """Fetch a page, return text or ''."""
    try:
        r = await client.get(url, timeout=8, follow_redirects=True)
        if r.status_code == 200 and "text/html" in r.headers.get("content-type", ""):
            return r.text[:20000]
    except Exception:
        pass
    return ""


async def scrape_emails(website: str) -> dict:
    """
    Main entry point.
    Returns {emails: [...], source: "scraper"|"hunter"|"none", best: "..."|None}
    """
    if not website:
        return {"emails": [], "source": "none", "best": None}

    if not website.startswith(("http://", "https://")):
        website = "https://" + website

    parsed = urlparse(website)
    domain = parsed.netloc.replace("www.", "")
    base   = f"{parsed.scheme}://{parsed.netloc}"

    all_emails: list[str] = []

    try:
        async with httpx.AsyncClient(
            headers=_HEADERS, follow_redirects=True, timeout=8
        ) as client:
            # 1. Homepage
            html = await _fetch_page(client, website)
            all_emails.extend(await _extract_from_html(html))

            # 2. Contact pages (stop early if we already have something)
            if not all_emails:
                tasks = [_fetch_page(client, urljoin(base, p)) for p in _CONTACT_PATHS]
                pages = await asyncio.gather(*tasks, return_exceptions=True)
                for page in pages:
                    if isinstance(page, str) and page:
                        found = await _extract_from_html(page)
                        all_emails.extend(found)
                        if all_emails:
                            break
    except Exception:
        pass

    cleaned = _clean_emails(all_emails, domain)

    if cleaned:
        return {"emails": cleaned[:5], "source": "scraper", "best": cleaned[0]}

    # 3. Hunter.io fallback
    hunter_result = await _hunter_find(domain)
    if hunter_result:
        return {"emails": [hunter_result], "source": "hunter", "best": hunter_result}

    return {"emails": [], "source": "none", "best": None}


async def _hunter_find(domain: str) -> str | None:
    """Use Hunter.io domain search to find the most common email pattern."""
    key = get_api_key("hunter")
    if not key:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.hunter.io/v2/domain-search",
                params={"domain": domain, "api_key": key, "limit": 5},
            )
            if r.status_code != 200:
                return None
            data = r.json().get("data", {})
            emails = data.get("emails", [])
            if emails:
                # sort by confidence
                emails.sort(key=lambda e: e.get("confidence", 0), reverse=True)
                return emails[0].get("value")
            # fallback: use pattern
            pattern = data.get("pattern")
            first_name = data.get("first_name", "info")
            if pattern and first_name:
                return f"{first_name}@{domain}"
    except Exception:
        pass
    return None
