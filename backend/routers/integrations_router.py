"""
B-DEVOPS — Integrations Router
Endpoint público para recibir leads/contactos desde sitios externos:
  - bolsos-clari (claraeugenia.com)
  - carsimport (carsimport.bdev.qzz.io)
  - psicologia (psicologia.bdev.qzz.io)

Todos los leads se almacenan en la tabla clients con campo fuente.
Se sincronizan con Notion via n8n webhook.
"""

import asyncio
import aiohttp
import asyncpg
import json
import os
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

DB_URL   = os.environ.get("DATABASE_URL", "")
N8N_BASE = os.environ.get("N8N_URL", "http://bdev-n8n:5678")

# Clave compartida para autenticar sitios externos
# Los sitios externos deben enviar este header: X-Integration-Key
INTEGRATION_KEY = os.environ.get("INTEGRATION_KEY", "bdev_int_key_2026")

FUENTES_VALIDAS = {
    "bolsos-clari":  {"sector": "Retail",    "estado": "Prospecto", "servicios": ["Otro"]},
    "carsimport":    {"sector": "Industria", "estado": "Prospecto", "servicios": ["Consultoría SEO"]},
    "psicologia":    {"sector": "Salud",     "estado": "Prospecto", "servicios": ["Consultoría SEO"]},
    "bdev-platform": {"sector": "Tecnología","estado": "Prospecto", "servicios": ["Desarrollo Web"]},
    "otro":          {"sector": "Otro",      "estado": "Prospecto", "servicios": []},
}


class LeadIn(BaseModel):
    nombre:   str
    email:    Optional[str] = ""
    telefono: Optional[str] = ""
    mensaje:  Optional[str] = ""
    fuente:   Optional[str] = "otro"
    empresa:  Optional[str] = ""
    web:      Optional[str] = ""
    api_key:  Optional[str] = ""   # alternativa al header


async def _db():
    if not DB_URL:
        raise HTTPException(status_code=503, detail="BD no configurada")
    return await asyncpg.connect(DB_URL)


async def ensure_fuente_column():
    """Añade columna fuente a clients si no existe."""
    if not DB_URL:
        return
    try:
        conn = await asyncpg.connect(DB_URL)
        await conn.execute("""
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS fuente TEXT DEFAULT 'bdev-platform'
        """)
        await conn.close()
        print("[integrations] columna fuente OK")
    except Exception as e:
        print(f"[integrations] fuente column: {e}")


async def _fire_n8n(path: str, payload: dict):
    try:
        async with aiohttp.ClientSession() as s:
            async with s.post(
                f"{N8N_BASE}{path}", json=payload,
                timeout=aiohttp.ClientTimeout(total=5)
            ) as r:
                print(f"[integrations] n8n {path} → {r.status}")
    except Exception as e:
        print(f"[integrations] n8n failed: {e}")


def _check_key(request: Request, body_key: str = ""):
    header_key = request.headers.get("X-Integration-Key", "")
    if header_key != INTEGRATION_KEY and body_key != INTEGRATION_KEY:
        raise HTTPException(status_code=401, detail="API key inválida")


@router.post("/lead")
async def receive_lead(body: LeadIn, request: Request):
    """
    Recibe un lead desde cualquier sitio externo y lo guarda en el CRM.

    Headers:
        X-Integration-Key: bdev_int_key_2026

    O incluye api_key en el body.
    """
    _check_key(request, body.api_key or "")

    nombre = (body.nombre or "").strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="nombre requerido")

    fuente = body.fuente if body.fuente in FUENTES_VALIDAS else "otro"
    meta   = FUENTES_VALIDAS[fuente]

    notas = body.mensaje or ""
    if notas:
        notas = f"[{fuente}] {notas}"

    conn = await _db()
    try:
        row = await conn.fetchrow(
            """INSERT INTO clients
               (nombre, empresa, email, telefono, web, sector, estado,
                servicios, notas, valor_estimado, estrella, fuente)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,false,$10)
               RETURNING *""",
            nombre,
            body.empresa or "",
            body.email   or "",
            body.telefono or "",
            body.web     or "",
            meta["sector"],
            meta["estado"],
            json.dumps(meta["servicios"]),
            notas,
            fuente,
        )
        cliente = dict(row)
        for k in ("fecha_creacion", "ultima_actividad"):
            if cliente.get(k):
                cliente[k] = cliente[k].isoformat()
    finally:
        await conn.close()

    # Sync a Notion via n8n
    asyncio.create_task(_fire_n8n("/webhook/client-created", {
        "event":     "client_created",
        "client":    {k: v for k, v in cliente.items() if k != "servicios"},
        "servicios": meta["servicios"],
        "fuente":    fuente,
    }))

    return {"ok": True, "id": cliente["id"], "fuente": fuente}


@router.get("/health")
async def integration_health():
    """Endpoint de comprobación para sitios externos."""
    return {"status": "ok", "service": "b-devops-integrations"}
