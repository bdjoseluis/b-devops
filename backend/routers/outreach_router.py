"""
B-DEVOPS — Outreach Router
Lead generation → email personalizado con IA → envío controlado por SMTP.

Pipeline:
  search → discovered → email_generated → approved → sent → replied | converted | discarded
"""

import asyncio
import json
import re
import time
import os
from datetime import datetime, date
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from fastapi.responses import StreamingResponse
import csv
import io
from routers.auth_router import auth_required, admin_required
from db import get_conn
import asyncpg
from services import prospector_service, smtp_service, email_scraper_service
from config_manager import load_config, get_api_key

router = APIRouter(prefix="/api/outreach", tags=["outreach"], dependencies=[Depends(auth_required)])

DB_URL = os.environ.get("DATABASE_URL", "")

# ── Daily send limit guard (in-memory, resets at midnight) ────────────────────
_sent_today: dict[str, int] = {}   # date_str → count
DAILY_LIMIT = int(os.environ.get("OUTREACH_DAILY_LIMIT", "50"))


def _check_daily_limit():
    today = str(date.today())
    sent = _sent_today.get(today, 0)
    if sent >= DAILY_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Límite diario de {DAILY_LIMIT} emails alcanzado. Vuelve mañana."
        )


def _increment_daily():
    today = str(date.today())
    _sent_today[today] = _sent_today.get(today, 0) + 1


# ── DB init ───────────────────────────────────────────────────────────────────
async def ensure_outreach_table():
    if not DB_URL:
        return
    try:
        conn = await asyncpg.connect(DB_URL)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS outreach (
                id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                name              TEXT NOT NULL,
                email             TEXT DEFAULT '',
                email_source      TEXT DEFAULT '',
                phone             TEXT DEFAULT '',
                website           TEXT DEFAULT '',
                address           TEXT DEFAULT '',
                sector            TEXT DEFAULT '',
                opportunity_score INT  DEFAULT 0,
                opportunity_label TEXT DEFAULT '',
                web_issues        JSONB DEFAULT '[]',
                tech_stack        JSONB DEFAULT '[]',
                source            TEXT DEFAULT 'prospector',
                status            TEXT DEFAULT 'discovered',
                generated_subject TEXT DEFAULT '',
                generated_email   TEXT DEFAULT '',
                sent_at           TIMESTAMPTZ,
                follow_up_at      TIMESTAMPTZ,
                notes             TEXT DEFAULT '',
                created_at        TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        # Add new columns if they don't exist (for existing installs)
        for col_sql in [
            "ALTER TABLE outreach ADD COLUMN IF NOT EXISTS email_source TEXT DEFAULT ''",
            "ALTER TABLE outreach ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ",
        ]:
            await conn.execute(col_sql)
        await conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach (status)"
        )
        await conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_outreach_score  ON outreach (opportunity_score DESC)"
        )
        await conn.close()
        print("[outreach] DB table ready")
    except Exception as e:
        print(f"[outreach] DB init error: {e}")


# ── Helpers ───────────────────────────────────────────────────────────────────
def _row(r) -> dict:
    d = dict(r)
    for k in ("created_at", "sent_at"):
        if d.get(k) is not None:
            d[k] = d[k].isoformat()
    return d


# ── Pydantic models ───────────────────────────────────────────────────────────
class SearchBody(BaseModel):
    location: str
    category: str = "empresa"
    radius_km: int = 10
    limit: int = 20
    min_score: int = 20           # only save leads with score >= this

class ManualLeadBody(BaseModel):
    name: str
    email: str = ""
    phone: str = ""
    website: str = ""
    address: str = ""
    sector: str = ""
    notes: str = ""

class UpdateStatusBody(BaseModel):
    status: str
    notes: Optional[str] = None

class SendBody(BaseModel):
    to_email: str

class BulkGenerateBody(BaseModel):
    ids: list[str] = []           # empty = all discovered leads
    status_filter: str = "discovered"

class BulkSendBody(BaseModel):
    ids: list[str] = []           # empty = all email_generated leads
    delay_seconds: float = 10.0   # wait between sends

class FollowUpBody(BaseModel):
    follow_up_at: str             # ISO date string


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/search")
async def search_and_save(body: SearchBody):
    """
    Run Prospector in the given location, analyze digital presence,
    and save qualifying leads (score >= min_score) to the outreach table.
    Returns both the full results and a count of newly saved leads.
    """
    result = await prospector_service.search_businesses(
        location=body.location,
        category=body.category,
        radius_km=body.radius_km,
        limit=body.limit,
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    businesses = result.get("businesses", [])
    saved = 0
    skipped = 0

    async with get_conn() as conn:
        for b in businesses:
            score = b.get("opportunity_score", 0)
            if score < body.min_score:
                skipped += 1
                continue

            name = (b.get("name") or "").strip()
            if not name:
                continue

            # Skip if same website already in DB
            website = b.get("website") or ""
            if website:
                existing = await conn.fetchval(
                    "SELECT id FROM outreach WHERE website=$1", website
                )
                if existing:
                    skipped += 1
                    continue

            web = b.get("web_analysis") or {}
            issues = json.dumps(web.get("issues", []))
            tech   = json.dumps(b.get("tech_stack", web.get("tech_stack", [])))

            await conn.execute(
                """INSERT INTO outreach
                   (name, email, phone, website, address, sector,
                    opportunity_score, opportunity_label,
                    web_issues, tech_stack, source)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                """,
                name,
                b.get("email", ""),
                b.get("phone", "") or "",
                website,
                b.get("address", "") or "",
                body.category,
                score,
                b.get("opportunity_label", ""),
                issues,
                tech,
                "prospector",
            )
            saved += 1

    return {
        "location": result.get("location"),
        "total_found": len(businesses),
        "saved": saved,
        "skipped_low_score": skipped,
        "businesses": businesses,
    }


@router.post("/manual")
async def add_manual_lead(body: ManualLeadBody):
    """Add a lead manually (not via Prospector)."""
    async with get_conn() as conn:
        row = await conn.fetchrow(
            """INSERT INTO outreach (name, email, phone, website, address, sector, source, notes)
               VALUES ($1,$2,$3,$4,$5,$6,'manual',$7) RETURNING *""",
            body.name, body.email, body.phone, body.website,
            body.address, body.sector, body.notes,
        )
    return _row(row)


@router.get("")
async def list_leads(
    status: Optional[str] = None,
    min_score: int = 0,
    limit: int = 100,
    offset: int = 0,
):
    """List outreach leads, optionally filtered by status."""
    async with get_conn() as conn:
        if status:
            rows = await conn.fetch(
                """SELECT * FROM outreach WHERE status=$1 AND opportunity_score>=$2
                   ORDER BY opportunity_score DESC, created_at DESC
                   LIMIT $3 OFFSET $4""",
                status, min_score, limit, offset,
            )
        else:
            rows = await conn.fetch(
                """SELECT * FROM outreach WHERE opportunity_score>=$1
                   ORDER BY opportunity_score DESC, created_at DESC
                   LIMIT $2 OFFSET $3""",
                min_score, limit, offset,
            )
        return {"leads": [_row(r) for r in rows], "total": len(rows)}


@router.get("/stats")
async def pipeline_stats():
    """Pipeline counts by status + daily email count."""
    async with get_conn() as conn:
        rows = await conn.fetch(
            "SELECT status, COUNT(*) AS cnt FROM outreach GROUP BY status"
        )
        by_status = {r["status"]: r["cnt"] for r in rows}

        total = await conn.fetchval("SELECT COUNT(*) FROM outreach")
        high_opp = await conn.fetchval(
            "SELECT COUNT(*) FROM outreach WHERE opportunity_score >= 50"
        )
        has_email = await conn.fetchval(
            "SELECT COUNT(*) FROM outreach WHERE email != '' AND email IS NOT NULL"
        )

    today = str(date.today())
    return {
        "total": total,
        "high_opportunity": high_opp,
        "has_email": has_email,
        "by_status": by_status,
        "sent_today": _sent_today.get(today, 0),
        "daily_limit": DAILY_LIMIT,
    }


@router.get("/{lead_id}")
async def get_lead(lead_id: str):
    async with get_conn() as conn:
        row = await conn.fetchrow("SELECT * FROM outreach WHERE id=$1", lead_id)
        if not row:
            raise HTTPException(status_code=404, detail="Lead no encontrado")
        return _row(row)


@router.post("/{lead_id}/generate-email")
async def generate_email(lead_id: str):
    """Use Gemini to generate a personalized cold email for this lead."""
    async with get_conn() as conn:
        row = await conn.fetchrow("SELECT * FROM outreach WHERE id=$1", lead_id)
        if not row:
            raise HTTPException(status_code=404, detail="Lead no encontrado")
        lead = _row(row)

    gemini_key = get_api_key("gemini")
    if not gemini_key:
        raise HTTPException(status_code=503, detail="Gemini API key no configurada")

    cfg = load_config()
    auditor = cfg.get("auditor", {})
    sender_name    = auditor.get("name", "B-DEVOPS")
    sender_company = auditor.get("company", "B-DEVOPS")
    sender_email   = cfg.get("smtp", {}).get("email", "")

    issues     = lead.get("web_issues") or []
    tech_stack = lead.get("tech_stack") or []
    score      = lead.get("opportunity_score", 0)
    has_web    = bool(lead.get("website"))

    if isinstance(issues, str):
        try: issues = json.loads(issues)
        except: issues = []
    if isinstance(tech_stack, str):
        try: tech_stack = json.loads(tech_stack)
        except: tech_stack = []

    # Build context for Gemini
    web_context = ""
    if not has_web:
        web_context = "No tienen web propia."
    elif issues:
        web_context = f"Su web tiene los siguientes problemas: {', '.join(issues)}."
        if tech_stack:
            web_context += f" Tecnología detectada: {', '.join(tech_stack)}."
    else:
        web_context = f"Tienen web pero puede mejorarse. Tecnología: {', '.join(tech_stack) if tech_stack else 'no detectada'}."

    prompt = f"""Escribe un email de ventas B2B en español para contactar a "{lead['name']}" ({lead.get('sector','empresa')}).

Contexto:
- Nombre empresa: {lead['name']}
- Dirección: {lead.get('address', 'zona local')}
- Web: {lead.get('website') or 'no tienen web'}
- Diagnóstico web: {web_context}
- Score de oportunidad: {score}/100

Mi perfil (quien envía):
- Nombre: {sender_name}
- Empresa: {sender_company}
- Servicios: automatización de procesos, webs profesionales, CRM, chatbots y WhatsApp business, posicionamiento SEO
- Email: {sender_email}

Requisitos del email:
1. Asunto: corto, específico para esta empresa, NO genérico
2. Cuerpo: máximo 5 párrafos cortos
3. Menciona SU problema concreto (web lenta, sin web, sin SSL, etc.) de forma natural, sin ser agresivo
4. Propón UNA solución específica y el valor que aporta (tiempo ahorrado, más clientes, etc.)
5. CTA claro: "¿Tiene 15 minutos esta semana para una llamada rápida?"
6. Firma con mi nombre y empresa
7. Tono: profesional pero cercano, como si ya hubieras mirado su web brevemente

Formato de respuesta:
ASUNTO: <asunto del email>
---
<cuerpo del email>"""

    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = await model.generate_content_async(prompt)
        text = response.text.strip()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error Gemini: {e}")

    # Parse subject and body
    subject = ""
    body = text
    if text.startswith("ASUNTO:"):
        lines = text.split("\n", 1)
        subject = lines[0].replace("ASUNTO:", "").strip()
        body = lines[1].lstrip("-\n ") if len(lines) > 1 else ""

    # Save to DB
    async with get_conn() as conn:
        await conn.execute(
            """UPDATE outreach SET
               generated_subject=$1, generated_email=$2, status='email_generated'
               WHERE id=$3""",
            subject, body, lead_id,
        )
        row = await conn.fetchrow("SELECT * FROM outreach WHERE id=$1", lead_id)

    return {**_row(row), "subject": subject, "body": body}


@router.post("/{lead_id}/send")
async def send_email(lead_id: str, body: SendBody):
    """Send the generated email via SMTP. Enforces daily limit."""
    _check_daily_limit()

    async with get_conn() as conn:
        row = await conn.fetchrow("SELECT * FROM outreach WHERE id=$1", lead_id)
        if not row:
            raise HTTPException(status_code=404, detail="Lead no encontrado")
        lead = _row(row)

    if not lead.get("generated_email"):
        raise HTTPException(status_code=400, detail="Genera el email primero con /generate-email")

    to_email = body.to_email or lead.get("email", "")
    if not to_email or "@" not in to_email:
        raise HTTPException(status_code=400, detail="Email de destino inválido o no disponible")

    result = await smtp_service.send_report_email(
        to_email=to_email,
        subject=lead.get("generated_subject", "Propuesta de colaboración"),
        body_text=lead.get("generated_email", ""),
    )

    if result.get("status") == "error":
        raise HTTPException(status_code=503, detail=result.get("message"))

    _increment_daily()

    async with get_conn() as conn:
        await conn.execute(
            "UPDATE outreach SET status='sent', sent_at=NOW() WHERE id=$1", lead_id
        )
        row = await conn.fetchrow("SELECT * FROM outreach WHERE id=$1", lead_id)

    return {**_row(row), "send_result": result}


@router.put("/{lead_id}/status")
async def update_status(lead_id: str, body: UpdateStatusBody):
    """Update lead status and optionally add a note."""
    valid = {"discovered", "email_generated", "approved", "sent", "replied", "converted", "discarded"}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Válidos: {', '.join(valid)}")

    async with get_conn() as conn:
        if body.notes is not None:
            await conn.execute(
                "UPDATE outreach SET status=$1, notes=$2 WHERE id=$3",
                body.status, body.notes, lead_id,
            )
        else:
            await conn.execute("UPDATE outreach SET status=$1 WHERE id=$2", body.status, lead_id)
        row = await conn.fetchrow("SELECT * FROM outreach WHERE id=$1", lead_id)
        if not row:
            raise HTTPException(status_code=404, detail="Lead no encontrado")

    # If converted → also add to clients CRM
    if body.status == "converted":
        try:
            async with get_conn() as conn2:
                lead = _row(row)
                await conn2.execute(
                    """INSERT INTO clients
                       (nombre, email, telefono, web, sector, estado, fuente, notas)
                       VALUES ($1,$2,$3,$4,$5,'Contactado','outreach',$6)
                       ON CONFLICT DO NOTHING""",
                    lead["name"], lead.get("email",""), lead.get("phone",""),
                    lead.get("website",""), lead.get("sector",""),
                    f"Lead de outreach convertido. {lead.get('notes','')}",
                )
        except Exception as e:
            print(f"[outreach] CRM sync error: {e}")

    return _row(row)


@router.put("/{lead_id}")
async def update_lead(lead_id: str, body: dict):
    """Update lead fields (email, phone, notes, generated_subject, generated_email)."""
    allowed = {"email", "phone", "website", "notes", "generated_subject", "generated_email"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="Ningún campo válido para actualizar")

    set_clause = ", ".join(f"{k}=${i+2}" for i, k in enumerate(updates))
    values = list(updates.values())

    async with get_conn() as conn:
        await conn.execute(
            f"UPDATE outreach SET {set_clause} WHERE id=$1",
            lead_id, *values,
        )
        row = await conn.fetchrow("SELECT * FROM outreach WHERE id=$1", lead_id)
        if not row:
            raise HTTPException(status_code=404, detail="Lead no encontrado")

    return _row(row)


@router.delete("/{lead_id}")
async def delete_lead(lead_id: str):
    async with get_conn() as conn:
        result = await conn.execute("DELETE FROM outreach WHERE id=$1", lead_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Lead no encontrado")
    return {"status": "deleted"}


# ── Email enrichment ──────────────────────────────────────────────────────────

@router.post("/{lead_id}/find-email")
async def find_email(lead_id: str):
    """Scrape website + Hunter.io to find a contact email for this lead."""
    async with get_conn() as conn:
        row = await conn.fetchrow("SELECT * FROM outreach WHERE id=$1", lead_id)
        if not row:
            raise HTTPException(status_code=404, detail="Lead no encontrado")
        lead = _row(row)

    website = lead.get("website", "")
    if not website:
        raise HTTPException(status_code=400, detail="Sin web — añádela primero")

    result = await email_scraper_service.scrape_emails(website)
    best   = result.get("best")

    if best:
        async with get_conn() as conn:
            await conn.execute(
                "UPDATE outreach SET email=$1, email_source=$2 WHERE id=$3",
                best, result.get("source", "scraper"), lead_id,
            )

    return {
        "found": bool(best),
        "email": best,
        "all_emails": result.get("emails", []),
        "source": result.get("source", "none"),
    }


@router.post("/bulk/find-emails")
async def bulk_find_emails():
    """Find emails for all leads with website but no email (max 30 at once)."""
    async with get_conn() as conn:
        rows = await conn.fetch(
            """SELECT id, website FROM outreach
               WHERE (email='' OR email IS NULL) AND website != ''
               ORDER BY opportunity_score DESC LIMIT 30"""
        )

    results = {"found": 0, "failed": 0, "details": []}
    for row in rows:
        try:
            scraped = await email_scraper_service.scrape_emails(row["website"])
            best = scraped.get("best")
            if best:
                async with get_conn() as conn:
                    await conn.execute(
                        "UPDATE outreach SET email=$1, email_source=$2 WHERE id=$3",
                        best, scraped.get("source", "scraper"), row["id"],
                    )
                results["found"] += 1
                results["details"].append({"id": row["id"], "email": best, "source": scraped["source"]})
            else:
                results["failed"] += 1
        except Exception:
            results["failed"] += 1
        await asyncio.sleep(0.5)

    return results


# ── Bulk generate emails ──────────────────────────────────────────────────────

@router.post("/bulk/generate")
async def bulk_generate_emails(body: BulkGenerateBody):
    """Generate personalized emails for multiple leads via Gemini."""
    async with get_conn() as conn:
        if body.ids:
            placeholders = ",".join(f"${i+1}" for i in range(len(body.ids)))
            rows = await conn.fetch(
                f"SELECT * FROM outreach WHERE id IN ({placeholders})",
                *body.ids,
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM outreach WHERE status=$1 ORDER BY opportunity_score DESC LIMIT 20",
                body.status_filter,
            )

    if not rows:
        return {"generated": 0, "failed": 0, "leads": []}

    gemini_key = get_api_key("gemini")
    if not gemini_key:
        raise HTTPException(status_code=503, detail="Gemini API key no configurada")

    cfg            = load_config()
    auditor        = cfg.get("auditor", {})
    sender_name    = auditor.get("name", "B-DEVOPS")
    sender_company = auditor.get("company", "B-DEVOPS")
    sender_email   = cfg.get("smtp", {}).get("email", "")

    import google.generativeai as genai
    genai.configure(api_key=gemini_key)
    model = genai.GenerativeModel("gemini-2.0-flash")

    results = {"generated": 0, "failed": 0, "leads": []}

    for row in rows:
        lead = _row(row)
        try:
            issues     = lead.get("web_issues") or []
            tech_stack = lead.get("tech_stack") or []
            if isinstance(issues, str):
                try: issues = json.loads(issues)
                except: issues = []
            if isinstance(tech_stack, str):
                try: tech_stack = json.loads(tech_stack)
                except: tech_stack = []

            has_web = bool(lead.get("website"))
            if not has_web:
                web_context = "No tienen web propia."
            elif issues:
                web_context = f"Problemas detectados: {', '.join(issues)}."
                if tech_stack:
                    web_context += f" Tech: {', '.join(tech_stack)}."
            else:
                web_context = f"Tienen web. Tech: {', '.join(tech_stack) if tech_stack else 'no detectada'}."

            prompt = (
                f'Escribe un email de ventas B2B en espanol para "{lead["name"]}" ({lead.get("sector","empresa")}).\n'
                f"Contexto: Web: {lead.get('website') or 'no tienen'} | {web_context} | Score: {lead.get('opportunity_score',0)}/100\n"
                f"Remitente: {sender_name} de {sender_company} | Servicios: automatizacion, webs, CRM, chatbots, SEO | Email: {sender_email}\n"
                "Requisitos: asunto corto y especifico, cuerpo 4-5 parrafos, menciona SU problema concreto, CTA rapido, tono cercano.\n"
                "Formato:\nASUNTO: <asunto>\n---\n<cuerpo>"
            )

            response = await model.generate_content_async(prompt)
            text = response.text.strip()
            subject = ""
            body_text = text
            if text.startswith("ASUNTO:"):
                lines = text.split("\n", 1)
                subject = lines[0].replace("ASUNTO:", "").strip()
                body_text = lines[1].lstrip("-\n ") if len(lines) > 1 else ""

            async with get_conn() as conn:
                await conn.execute(
                    "UPDATE outreach SET generated_subject=$1, generated_email=$2, status='email_generated' WHERE id=$3",
                    subject, body_text, lead["id"],
                )

            results["generated"] += 1
            results["leads"].append({"id": lead["id"], "name": lead["name"], "subject": subject})
            await asyncio.sleep(0.8)
        except Exception as e:
            results["failed"] += 1
            results["leads"].append({"id": lead["id"], "name": lead["name"], "error": str(e)})

    return results


# ── Bulk send ─────────────────────────────────────────────────────────────────

@router.post("/bulk/send")
async def bulk_send(body: BulkSendBody):
    """Send all email_generated leads with a valid email. Respects daily limit."""
    async with get_conn() as conn:
        if body.ids:
            placeholders = ",".join(f"${i+1}" for i in range(len(body.ids)))
            rows = await conn.fetch(
                f"SELECT * FROM outreach WHERE id IN ({placeholders}) AND status='email_generated' AND email != ''",
                *body.ids,
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM outreach WHERE status='email_generated' AND email != '' ORDER BY opportunity_score DESC"
            )

    results = {"sent": 0, "failed": 0, "skipped": 0, "details": []}

    for row in rows:
        today = str(date.today())
        if _sent_today.get(today, 0) >= DAILY_LIMIT:
            results["skipped"] += 1
            continue

        lead = _row(row)
        try:
            send_result = await smtp_service.send_report_email(
                to_email=lead["email"],
                subject=lead.get("generated_subject", "Propuesta de colaboracion"),
                body_text=lead.get("generated_email", ""),
            )
            if send_result.get("status") == "error":
                results["failed"] += 1
                results["details"].append({"id": lead["id"], "name": lead["name"], "error": send_result.get("message")})
            else:
                _increment_daily()
                async with get_conn() as conn:
                    await conn.execute(
                        "UPDATE outreach SET status='sent', sent_at=NOW() WHERE id=$1", lead["id"]
                    )
                results["sent"] += 1
                results["details"].append({"id": lead["id"], "name": lead["name"], "to": lead["email"]})

            delay = min(max(body.delay_seconds, 5.0), 120.0)
            await asyncio.sleep(delay)
        except Exception as e:
            results["failed"] += 1
            results["details"].append({"id": lead["id"], "name": lead["name"], "error": str(e)})

    results["sent_today"] = _sent_today.get(str(date.today()), 0)
    results["daily_limit"] = DAILY_LIMIT
    return results


# ── Follow-up ─────────────────────────────────────────────────────────────────

@router.post("/{lead_id}/follow-up")
async def set_follow_up(lead_id: str, body: FollowUpBody):
    """Set a follow-up reminder date."""
    try:
        from datetime import datetime as dt
        follow_up = dt.fromisoformat(body.follow_up_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="Fecha invalida. Usa formato ISO: 2026-06-15")

    async with get_conn() as conn:
        await conn.execute("UPDATE outreach SET follow_up_at=$1 WHERE id=$2", follow_up, lead_id)
        row = await conn.fetchrow("SELECT * FROM outreach WHERE id=$1", lead_id)
        if not row:
            raise HTTPException(status_code=404, detail="Lead no encontrado")
    return _row(row)


@router.get("/follow-ups/pending")
async def pending_follow_ups():
    """Leads with follow-up dates that are due today or overdue."""
    async with get_conn() as conn:
        rows = await conn.fetch(
            """SELECT * FROM outreach
               WHERE follow_up_at IS NOT NULL AND follow_up_at <= NOW()
               AND status NOT IN ('converted','discarded')
               ORDER BY follow_up_at ASC"""
        )
    return {"leads": [_row(r) for r in rows], "total": len(rows)}


# ── CSV Export ────────────────────────────────────────────────────────────────

@router.get("/export/csv")
async def export_csv(status: Optional[str] = None):
    """Export outreach leads to CSV file."""
    async with get_conn() as conn:
        if status:
            rows = await conn.fetch(
                "SELECT * FROM outreach WHERE status=$1 ORDER BY opportunity_score DESC", status
            )
        else:
            rows = await conn.fetch("SELECT * FROM outreach ORDER BY opportunity_score DESC")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "nombre", "email", "fuente_email", "telefono", "web", "direccion",
        "sector", "score", "oportunidad", "problemas_web", "estado",
        "asunto_email", "email_enviado", "fecha_envio", "follow_up", "notas", "creado",
    ])

    for r in rows:
        issues_raw = r["web_issues"]
        if isinstance(issues_raw, list):
            issues_str = "; ".join(issues_raw)
        elif isinstance(issues_raw, str):
            try: issues_str = "; ".join(json.loads(issues_raw))
            except: issues_str = issues_raw
        else:
            issues_str = ""

        writer.writerow([
            r["name"],
            r["email"],
            r.get("email_source", ""),
            r["phone"],
            r["website"],
            r["address"],
            r["sector"],
            r["opportunity_score"],
            r["opportunity_label"],
            issues_str,
            r["status"],
            r["generated_subject"],
            "Si" if r["status"] in ("sent", "replied", "converted") else "No",
            r["sent_at"].isoformat() if r.get("sent_at") else "",
            r["follow_up_at"].isoformat() if r.get("follow_up_at") else "",
            r["notes"],
            r["created_at"].isoformat() if r.get("created_at") else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=outreach_leads.csv"},
    )
