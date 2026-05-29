"""
AURA OPS — ClickHouse Service
Writes analytics data to ClickHouse via its HTTP interface.
Falls back silently if ClickHouse is unavailable.
"""

import os
import json
import asyncio
import httpx
import logging

logger = logging.getLogger(__name__)

# ── Connection config (from env or defaults) ──────────────────────────────────
CH_HOST     = os.getenv("CLICKHOUSE_HOST", "localhost")
CH_PORT     = int(os.getenv("CLICKHOUSE_PORT", "8123"))
CH_USER     = os.getenv("CLICKHOUSE_USER", "default")
CH_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD", "")
CH_DB       = "aura_analytics"
CH_BASE_URL = f"http://{CH_HOST}:{CH_PORT}"


def _auth() -> dict:
    """Return basic-auth credentials for httpx."""
    return (CH_USER, CH_PASSWORD)


async def _exec(query: str, data: str | None = None, timeout: float = 5.0) -> bool:
    """Execute a ClickHouse query via HTTP. Returns True on success."""
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            if data:
                r = await client.post(
                    CH_BASE_URL,
                    params={"query": query},
                    content=data.encode(),
                    auth=_auth(),
                )
            else:
                r = await client.get(
                    CH_BASE_URL,
                    params={"query": query},
                    auth=_auth(),
                )
            if r.status_code not in (200, 204):
                logger.warning(f"ClickHouse error {r.status_code}: {r.text[:200]}")
                return False
            return True
    except Exception as e:
        logger.debug(f"ClickHouse unreachable: {e}")
        return False


async def ping() -> bool:
    """Check if ClickHouse is available."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(f"{CH_BASE_URL}/ping", auth=_auth())
            return r.status_code == 200
    except Exception:
        return False


async def write_audit_result(
    target: str,
    target_type: str,
    risk_level: str,
    modules_run: int,
    findings: int,
    data: dict,
) -> bool:
    """Insert a completed audit result into ClickHouse."""
    try:
        data_json = json.dumps(data, ensure_ascii=False, default=str)
        # Escape single quotes for ClickHouse VALUES
        t = target.replace("'", "\\'")
        tt = target_type.replace("'", "\\'")
        rl = risk_level.replace("'", "\\'")
        dj = data_json.replace("'", "\\'")

        query = (
            f"INSERT INTO {CH_DB}.audit_results "
            f"(target, target_type, risk_level, modules_run, findings, data_json) "
            f"VALUES ('{t}', '{tt}', '{rl}', {modules_run}, {findings}, '{dj}')"
        )
        return await _exec(query)
    except Exception as e:
        logger.debug(f"write_audit_result failed: {e}")
        return False


async def write_scan_event(
    tool: str,
    target: str,
    status: str,
    duration_ms: int,
    result: dict,
) -> bool:
    """Insert a scan event (nmap, shodan, etc.) into ClickHouse."""
    try:
        result_json = json.dumps(result, ensure_ascii=False, default=str)
        t = tool.replace("'", "\\'")
        tg = target.replace("'", "\\'")
        st = status.replace("'", "\\'")
        rj = result_json.replace("'", "\\'")

        query = (
            f"INSERT INTO {CH_DB}.scan_events "
            f"(tool, target, status, duration_ms, result_json) "
            f"VALUES ('{t}', '{tg}', '{st}', {duration_ms}, '{rj}')"
        )
        return await _exec(query)
    except Exception as e:
        logger.debug(f"write_scan_event failed: {e}")
        return False


async def write_api_call(
    api: str,
    endpoint: str,
    status_code: int,
    latency_ms: int,
    success: bool,
) -> bool:
    """Insert an API call metric into ClickHouse."""
    try:
        a = api.replace("'", "\\'")
        ep = endpoint.replace("'", "\\'")
        s = 1 if success else 0

        query = (
            f"INSERT INTO {CH_DB}.api_calls "
            f"(api, endpoint, status_code, latency_ms, success) "
            f"VALUES ('{a}', '{ep}', {status_code}, {latency_ms}, {s})"
        )
        return await _exec(query)
    except Exception as e:
        logger.debug(f"write_api_call failed: {e}")
        return False


async def query_audit_stats() -> dict:
    """Return aggregated audit statistics for dashboard use."""
    try:
        q = (
            "SELECT "
            "count() AS total, "
            "countIf(risk_level='CRÍTICO') AS criticos, "
            "countIf(risk_level='ALTO') AS altos, "
            "countIf(risk_level='MEDIO') AS medios, "
            "countIf(risk_level='BAJO') AS bajos, "
            "avg(findings) AS avg_findings "
            f"FROM {CH_DB}.audit_results "
            "FORMAT JSON"
        )
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(CH_BASE_URL, params={"query": q}, auth=_auth())
            if r.status_code == 200:
                data = r.json()
                row = data.get("data", [{}])[0]
                return {
                    "total": int(row.get("total", 0)),
                    "criticos": int(row.get("criticos", 0)),
                    "altos": int(row.get("altos", 0)),
                    "medios": int(row.get("medios", 0)),
                    "bajos": int(row.get("bajos", 0)),
                    "avg_findings": round(float(row.get("avg_findings", 0)), 1),
                }
    except Exception as e:
        logger.debug(f"query_audit_stats failed: {e}")
    return {}


async def query_recent_audits(limit: int = 20) -> list:
    """Return recent audits (without full JSON data for speed)."""
    try:
        q = (
            "SELECT id, target, target_type, risk_level, modules_run, findings, created_at "
            f"FROM {CH_DB}.audit_results "
            "ORDER BY created_at DESC "
            f"LIMIT {limit} "
            "FORMAT JSON"
        )
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(CH_BASE_URL, params={"query": q}, auth=_auth())
            if r.status_code == 200:
                return r.json().get("data", [])
    except Exception as e:
        logger.debug(f"query_recent_audits failed: {e}")
    return []


async def query_daily_summary(days: int = 30) -> list:
    """Return daily audit summary for charting."""
    try:
        q = (
            "SELECT day, target_type, risk_level, total, avg_findings "
            f"FROM {CH_DB}.daily_summary "
            f"WHERE day >= today() - {days} "
            "ORDER BY day DESC "
            "FORMAT JSON"
        )
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(CH_BASE_URL, params={"query": q}, auth=_auth())
            if r.status_code == 200:
                return r.json().get("data", [])
    except Exception as e:
        logger.debug(f"query_daily_summary failed: {e}")
    return []
