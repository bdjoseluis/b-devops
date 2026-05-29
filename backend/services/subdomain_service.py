import httpx
import asyncio
import dns.resolver


async def enumerate(domain: str, max_results: int = 200) -> dict:
    results = await asyncio.gather(
        _crtsh(domain),
        _hackertarget(domain),
        _alienvault(domain),
        return_exceptions=True
    )

    all_subs = set()
    sources = {}

    for source_name, res in zip(["crt.sh", "HackerTarget", "AlienVault"], results):
        if isinstance(res, Exception) or isinstance(res, BaseException):
            sources[source_name] = []
        else:
            sources[source_name] = res
            all_subs.update(res)

    unique = sorted(list(all_subs))[:max_results]

    # Resolve IPs for found subdomains (parallel, up to 50)
    resolved = await _resolve_batch(unique[:50])

    return {
        "subdomains": unique,
        "total": len(unique),
        "resolved": resolved,
        "sources": {k: len(v) for k, v in sources.items()},
    }


async def _crtsh(domain: str) -> list[str]:
    url = f"https://crt.sh/?q=%25.{domain}&output=json"
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url, follow_redirects=True)
        r.raise_for_status()
        data = r.json()
    subs = set()
    for entry in data:
        name = entry.get("name_value", "")
        for line in name.split("\n"):
            line = line.strip().lstrip("*.")
            if line.endswith(f".{domain}") or line == domain:
                subs.add(line.lower())
    return list(subs)


async def _hackertarget(domain: str) -> list[str]:
    url = f"https://api.hackertarget.com/hostsearch/?q={domain}"
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url)
        if r.status_code != 200 or "error" in r.text.lower():
            return []
    subs = set()
    for line in r.text.splitlines():
        parts = line.split(",")
        if parts:
            sub = parts[0].strip()
            if sub.endswith(f".{domain}"):
                subs.add(sub.lower())
    return list(subs)


async def _alienvault(domain: str) -> list[str]:
    url = f"https://otx.alienvault.com/api/v1/indicators/domain/{domain}/passive_dns"
    async with httpx.AsyncClient(timeout=12) as client:
        r = await client.get(url)
        if r.status_code != 200:
            return []
        data = r.json()
    subs = set()
    for entry in data.get("passive_dns", []):
        hostname = entry.get("hostname", "")
        if hostname.endswith(f".{domain}") or hostname == domain:
            subs.add(hostname.lower())
    return list(subs)


async def _resolve_batch(subdomains: list[str]) -> list[dict]:
    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(None, _resolve_one, s) for s in subdomains]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    out = []
    for sub, res in zip(subdomains, results):
        if isinstance(res, Exception):
            out.append({"subdomain": sub, "ip": None, "status": "error"})
        else:
            out.append(res)
    return out


def _resolve_one(subdomain: str) -> dict:
    try:
        resolver = dns.resolver.Resolver()
        resolver.timeout = 3
        resolver.lifetime = 4
        answers = resolver.resolve(subdomain, "A")
        ips = [str(r) for r in answers]
        return {"subdomain": subdomain, "ip": ips[0] if ips else None, "all_ips": ips, "status": "active"}
    except Exception:
        return {"subdomain": subdomain, "ip": None, "status": "inactive"}
