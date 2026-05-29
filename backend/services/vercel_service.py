import httpx

BASE = "https://api.vercel.com"


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


async def get_projects(token: str) -> dict:
    if not token:
        return {"error": "Vercel token no configurado"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{BASE}/v9/projects?limit=50", headers=_headers(token))
        if r.status_code != 200:
            return {"error": f"Vercel API {r.status_code}: {r.text[:200]}"}
        data = r.json()
    projects = []
    for p in data.get("projects", []):
        latest = p.get("latestDeployments", [{}])[0] if p.get("latestDeployments") else {}
        projects.append({
            "id": p.get("id"),
            "name": p.get("name"),
            "framework": p.get("framework"),
            "url": f"https://{p['name']}.vercel.app",
            "git_repo": p.get("link", {}).get("repo"),
            "git_org": p.get("link", {}).get("org"),
            "created_at": p.get("createdAt"),
            "updated_at": p.get("updatedAt"),
            "last_deploy_state": latest.get("readyState", "UNKNOWN"),
            "last_deploy_url": latest.get("url"),
            "last_deploy_created": latest.get("createdAt"),
        })
    return {"projects": projects, "total": len(projects)}


async def get_deployments(token: str, limit: int = 20) -> dict:
    if not token:
        return {"error": "Vercel token no configurado"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{BASE}/v6/deployments?limit={limit}&state=READY,ERROR,BUILDING,QUEUED",
            headers=_headers(token)
        )
        if r.status_code != 200:
            return {"error": f"Vercel API {r.status_code}: {r.text[:200]}"}
        data = r.json()
    deployments = []
    for d in data.get("deployments", []):
        deployments.append({
            "id": d.get("uid"),
            "name": d.get("name"),
            "url": f"https://{d.get('url')}" if d.get("url") else None,
            "state": d.get("state"),
            "created": d.get("created"),
            "meta": d.get("meta", {}),
        })
    return {"deployments": deployments, "total": len(deployments)}


async def get_domains(token: str) -> dict:
    if not token:
        return {"error": "Vercel token no configurado"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{BASE}/v5/domains", headers=_headers(token))
        if r.status_code != 200:
            return {"error": f"Vercel API {r.status_code}: {r.text[:200]}"}
        data = r.json()
    domains = []
    for d in data.get("domains", []):
        domains.append({
            "name": d.get("name"),
            "verified": d.get("verified"),
            "expiry_at": d.get("expiryAt"),
            "ns": d.get("nameservers", []),
        })
    return {"domains": domains, "total": len(domains)}
