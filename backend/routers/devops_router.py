"""
B-DEVOPS — DevOps Hub Router
Proxy para Vercel, Supabase y health checks de servicios locales (ClickHouse, n8n)
"""

import asyncio
import httpx
from fastapi import APIRouter
from config_manager import get_api_key, load_config
from services import vercel_service, supabase_service, clickhouse_service

router = APIRouter(prefix="/api/devops", tags=["devops"])


# ── Vercel ────────────────────────────────────────────────────────────────
@router.get("/vercel/projects")
async def vercel_projects():
    token = get_api_key("vercel")
    return await vercel_service.get_projects(token)


@router.get("/vercel/deployments")
async def vercel_deployments():
    token = get_api_key("vercel")
    return await vercel_service.get_deployments(token, limit=30)


@router.get("/vercel/domains")
async def vercel_domains():
    token = get_api_key("vercel")
    return await vercel_service.get_domains(token)


# ── Supabase ──────────────────────────────────────────────────────────────
@router.get("/supabase/projects")
async def supabase_projects():
    token = get_api_key("supabase")
    return await supabase_service.get_projects(token)


@router.get("/supabase/orgs")
async def supabase_orgs():
    token = get_api_key("supabase")
    return await supabase_service.get_organizations(token)


# ── Health checks de servicios locales ───────────────────────────────────
@router.get("/services/health")
async def services_health():
    """Comprueba si los servicios del docker-compose están accesibles."""
    checks = {
        "clickhouse": "http://clickhouse:8123/ping",
        "n8n": "http://n8n:5678/healthz",
    }
    results = {}
    async with httpx.AsyncClient(timeout=3) as client:
        for name, url in checks.items():
            try:
                r = await client.get(url)
                results[name] = {"status": "up", "code": r.status_code}
            except Exception as e:
                results[name] = {"status": "down", "error": str(e)[:80]}
    return {"services": results}


# ── Resumen completo ──────────────────────────────────────────────────────
@router.get("/summary")
async def devops_summary():
    vercel_token = get_api_key("vercel")
    supabase_token = get_api_key("supabase")

    vercel_task = vercel_service.get_projects(vercel_token) if vercel_token else _noop({"projects": [], "total": 0})
    supabase_task = supabase_service.get_projects(supabase_token) if supabase_token else _noop({"projects": [], "total": 0})

    vercel_data, supabase_data = await asyncio.gather(vercel_task, supabase_task, return_exceptions=True)

    return {
        "vercel": vercel_data if not isinstance(vercel_data, Exception) else {"error": str(vercel_data)},
        "supabase": supabase_data if not isinstance(supabase_data, Exception) else {"error": str(supabase_data)},
        "has_vercel_token": bool(vercel_token),
        "has_supabase_token": bool(supabase_token),
    }


async def _noop(val):
    return val


# ── ClickHouse Analytics ───────────────────────────────────────────────────
@router.get("/analytics/stats")
async def analytics_stats():
    """Estadísticas de auditorías almacenadas en ClickHouse."""
    return await clickhouse_service.query_audit_stats()


@router.get("/analytics/recent")
async def analytics_recent(limit: int = 20):
    """Auditorías recientes desde ClickHouse."""
    return {"audits": await clickhouse_service.query_recent_audits(limit)}


@router.get("/analytics/daily")
async def analytics_daily(days: int = 30):
    """Resumen diario de auditorías para gráficas."""
    return {"summary": await clickhouse_service.query_daily_summary(days)}


# ── Stack status completo (Docker + servicios) ────────────────────────────
@router.get("/stack-status")
async def stack_status():
    """Estado de todos los servicios del stack para el Portal."""
    services = [
        {"id": "backend",    "name": "AURA Backend",   "url": "http://localhost:8000/api/health",  "port": 8000, "icon": "⚡", "color": "green",  "localUrl": "http://localhost:8000/docs"},
        {"id": "frontend",   "name": "AURA Frontend",  "url": "http://localhost:3000",             "port": 3000, "icon": "🖥️", "color": "cyan",   "localUrl": "http://localhost:3000"},
        {"id": "n8n",        "name": "n8n Workflows",  "url": "http://localhost:5678/healthz",     "port": 5678, "icon": "🔄", "color": "orange", "localUrl": "http://localhost:5678"},
        {"id": "clickhouse", "name": "ClickHouse",     "url": "http://localhost:8123/ping",        "port": 8123, "icon": "📊", "color": "yellow", "localUrl": "http://localhost:8123/play"},
        {"id": "grafana",    "name": "Grafana",        "url": "http://localhost:9091/api/health",  "port": 9091, "icon": "📈", "color": "orange", "localUrl": "http://localhost:9091"},
        {"id": "postgres",   "name": "PostgreSQL",     "url": None,                               "port": 5432, "icon": "🐘", "color": "blue",   "localUrl": None},
    ]
    results = []
    async with httpx.AsyncClient(timeout=2) as client:
        for svc in services:
            item = {**svc, "status": "unknown", "latency_ms": None}
            if svc["url"]:
                try:
                    import time
                    t0 = time.monotonic()
                    r = await client.get(svc["url"])
                    item["latency_ms"] = round((time.monotonic() - t0) * 1000)
                    item["status"] = "up" if r.status_code < 400 else "degraded"
                except Exception:
                    item["status"] = "down"
            else:
                # PostgreSQL — check TCP
                try:
                    import asyncio as aio
                    await aio.wait_for(aio.open_connection("localhost", 5432), timeout=1)
                    item["status"] = "up"
                except Exception:
                    item["status"] = "down"
            results.append(item)
    up = sum(1 for r in results if r["status"] == "up")
    return {"services": results, "summary": {"total": len(results), "up": up, "down": len(results) - up}}
