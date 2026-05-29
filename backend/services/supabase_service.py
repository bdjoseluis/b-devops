import httpx

BASE = "https://api.supabase.com"


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


async def get_projects(token: str) -> dict:
    if not token:
        return {"error": "Supabase token no configurado"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{BASE}/v1/projects", headers=_headers(token))
        if r.status_code != 200:
            return {"error": f"Supabase API {r.status_code}: {r.text[:200]}"}
        raw = r.json()
    projects = []
    for p in raw if isinstance(raw, list) else []:
        projects.append({
            "id": p.get("id"),
            "ref": p.get("ref"),
            "name": p.get("name"),
            "status": p.get("status"),
            "region": p.get("region"),
            "db_host": p.get("db_host"),
            "db_port": p.get("db_port", 5432),
            "created_at": p.get("created_at"),
            "url": f"https://{p.get('ref')}.supabase.co" if p.get("ref") else None,
            "dashboard": f"https://supabase.com/dashboard/project/{p.get('ref')}" if p.get("ref") else None,
        })
    return {"projects": projects, "total": len(projects)}


async def get_project_health(token: str, ref: str) -> dict:
    if not token:
        return {"error": "Supabase token no configurado"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{BASE}/v1/projects/{ref}", headers=_headers(token))
        if r.status_code != 200:
            return {"error": f"Supabase API {r.status_code}"}
        p = r.json()
    return {
        "ref": p.get("ref"),
        "name": p.get("name"),
        "status": p.get("status"),
        "region": p.get("region"),
        "db_host": p.get("db_host"),
    }


async def get_organizations(token: str) -> dict:
    if not token:
        return {"error": "Supabase token no configurado"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{BASE}/v1/organizations", headers=_headers(token))
        if r.status_code != 200:
            return {"error": f"Supabase API {r.status_code}"}
        raw = r.json()
    orgs = [{"id": o.get("id"), "name": o.get("name")} for o in (raw if isinstance(raw, list) else [])]
    return {"organizations": orgs, "total": len(orgs)}
