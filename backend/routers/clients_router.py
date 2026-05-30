"""
B-DEVOPS — Clients CRM Router
CRUD de clientes respaldado por PostgreSQL.
Webhooks a n8n para sincronización con Notion.
"""

import asyncio
import aiohttp
import asyncpg
import json
import os
from fastapi import APIRouter, HTTPException, Depends
from routers.auth_router import auth_required
from db import get_conn

router = APIRouter(prefix="/api/clients", tags=["clients"])

DB_URL   = os.environ.get("DATABASE_URL", "")
N8N_BASE = os.environ.get("N8N_URL", "http://bdev-n8n:5678")


async def ensure_clients_table():
    """Create clients table if it doesn't exist (called at startup)."""
    if not DB_URL:
        return
    try:
        conn = await asyncpg.connect(DB_URL)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS clients (
                id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                nombre           TEXT NOT NULL,
                empresa          TEXT DEFAULT '',
                email            TEXT DEFAULT '',
                telefono         TEXT DEFAULT '',
                web              TEXT DEFAULT '',
                sector           TEXT DEFAULT 'Tecnología',
                estado           TEXT DEFAULT 'Prospecto',
                servicios        JSONB DEFAULT '[]',
                notas            TEXT DEFAULT '',
                valor_estimado   FLOAT DEFAULT 0,
                estrella         BOOLEAN DEFAULT FALSE,
                fecha_creacion   TIMESTAMPTZ DEFAULT NOW(),
                ultima_actividad TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        await conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_clients_estado  ON clients (estado)"
        )
        await conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_clients_fuente  ON clients (fuente)"
        )
        await conn.close()
        print("[clients] DB table ready")
    except Exception as e:
        print(f"[clients] DB init error: {e}")




def _row_to_dict(r) -> dict:
    d = dict(r)
    # Serialize datetime fields to ISO strings for JSON
    for k in ('fecha_creacion', 'ultima_actividad'):
        if d.get(k) is not None:
            d[k] = d[k].isoformat()
    return d


# ── n8n webhook ───────────────────────────────────────────────────────────────
async def _fire_n8n(path: str, payload: dict):
    """Fire-and-forget webhook to n8n (never raises)."""
    try:
        async with aiohttp.ClientSession() as s:
            async with s.post(
                f"{N8N_BASE}{path}", json=payload,
                timeout=aiohttp.ClientTimeout(total=5)
            ) as r:
                print(f"[clients] n8n {path} → {r.status}")
    except Exception as e:
        print(f"[clients] n8n webhook failed ({path}): {e}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("")
async def list_clients(user=Depends(auth_required)):
    """Devuelve todos los clientes ordenados por estrella + actividad reciente."""
    async with get_conn() as conn:
        rows = await conn.fetch(
            "SELECT * FROM clients ORDER BY estrella DESC, ultima_actividad DESC"
        )
        return {"clients": [_row_to_dict(r) for r in rows]}


@router.post("")
async def create_client(body: dict, user=Depends(auth_required)):
    """Crea un nuevo cliente."""
    nombre = (body.get("nombre") or "").strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")

    async with get_conn() as conn:
        row = await conn.fetchrow(
            """INSERT INTO clients
               (nombre, empresa, email, telefono, web, sector, estado,
                servicios, notas, valor_estimado, estrella)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
               RETURNING *""",
            nombre,
            body.get("empresa", ""),
            body.get("email", ""),
            body.get("telefono", ""),
            body.get("web", ""),
            body.get("sector", "Tecnología"),
            body.get("estado", "Prospecto"),
            json.dumps(body.get("servicios", [])),
            body.get("notas", ""),
            float(body.get("valor_estimado") or 0),
            bool(body.get("estrella", False)),
        )
        cliente = _row_to_dict(row)

    # Notify n8n (fire and forget — never blocks the response)
    asyncio.create_task(_fire_n8n("/webhook/client-created", {
        "event":  "client_created",
        "client": {k: v for k, v in cliente.items() if k not in ('servicios',)},
        "servicios": body.get("servicios", []),
    }))

    return cliente


@router.put("/{client_id}")
async def update_client(client_id: str, body: dict, user=Depends(auth_required)):
    """Actualiza un cliente existente."""
    async with get_conn() as conn:
        existing = await conn.fetchrow("SELECT id FROM clients WHERE id=$1", client_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

        row = await conn.fetchrow(
            """UPDATE clients SET
               nombre=$1, empresa=$2, email=$3, telefono=$4, web=$5,
               sector=$6, estado=$7, servicios=$8, notas=$9,
               valor_estimado=$10, estrella=$11, ultima_actividad=NOW()
               WHERE id=$12 RETURNING *""",
            (body.get("nombre") or "").strip() or "Sin nombre",
            body.get("empresa", ""),
            body.get("email", ""),
            body.get("telefono", ""),
            body.get("web", ""),
            body.get("sector", "Tecnología"),
            body.get("estado", "Prospecto"),
            json.dumps(body.get("servicios", [])),
            body.get("notas", ""),
            float(body.get("valor_estimado") or 0),
            bool(body.get("estrella", False)),
            client_id,
        )
        cliente = _row_to_dict(row)

    # Notion sync via n8n
    asyncio.create_task(_fire_n8n("/webhook/client-updated", {
        "event":  "client_updated",
        "client": {k: v for k, v in cliente.items() if k not in ('servicios',)},
        "servicios": body.get("servicios", []),
    }))

    return cliente


@router.delete("/{client_id}")
async def delete_client(client_id: str, user=Depends(auth_required)):
    """Elimina un cliente."""
    async with get_conn() as conn:
        result = await conn.execute("DELETE FROM clients WHERE id=$1", client_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return {"status": "deleted"}


@router.get("/stats")
async def client_stats(user=Depends(auth_required)):
    """Estadísticas del CRM para el Dashboard, incluyendo breakdown por fuente."""
    async with get_conn() as conn:
        row = await conn.fetchrow("""
            SELECT
                COUNT(*)                                             AS total,
                COUNT(*) FILTER (WHERE estado='Activo')             AS activos,
                COUNT(*) FILTER (WHERE estado IN
                    ('Prospecto','Contactado','Propuesta'))          AS pipeline_count,
                COALESCE(SUM(valor_estimado)
                    FILTER (WHERE estado='Activo'), 0)               AS mrr,
                COALESCE(SUM(valor_estimado)
                    FILTER (WHERE estado IN
                    ('Prospecto','Contactado','Propuesta')), 0)       AS pipeline_value,
                COUNT(*) FILTER (WHERE fuente IN
                    ('carsimport','psicologia','bolsos-clari','otro'))  AS leads_externos
            FROM clients
        """)
        # Breakdown por fuente (solo fuentes con registros)
        fuente_rows = await conn.fetch("""
            SELECT fuente, COUNT(*) AS cnt
            FROM clients
            WHERE fuente IS NOT NULL
            GROUP BY fuente
            ORDER BY cnt DESC
        """)
        stats = dict(row)
        stats["por_fuente"] = {r["fuente"]: r["cnt"] for r in fuente_rows}
        return stats


@router.get("/search")
async def search_clients(q: str, user=Depends(auth_required)):
    """Quick search clients by name, email or company."""
    if not q or len(q) < 2:
        return {"clients": []}
    term = f"%{q.lower()}%"
    async with get_conn() as conn:
        rows = await conn.fetch(
            """SELECT id, nombre, empresa, email, telefono, estado, fuente
               FROM clients
               WHERE LOWER(nombre) LIKE $1 OR LOWER(empresa) LIKE $1 OR LOWER(email) LIKE $1
               ORDER BY ultima_actividad DESC LIMIT 10""",
            term,
        )
    return {"clients": [dict(r) for r in rows]}
