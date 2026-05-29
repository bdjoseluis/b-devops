"""
B-DEV — Auth router
- Admin: single-password JWT (stored in config.json)
- Users: register → admin email approval → login with username+password
- JWT tokens (HS256, 7 days)
"""

import os
import time
import hmac
import hashlib
import base64
import json
import uuid
import smtplib
import asyncpg
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config_manager import load_config, save_config

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)

SECRET_KEY = os.environ.get("SECRET_KEY", "changeme_backend_secret")
TOKEN_TTL  = 60 * 60 * 24 * 7   # 7 días
DB_URL     = os.environ.get("DATABASE_URL", "")


# ── JWT helpers ───────────────────────────────────────────────────────────────
def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _sign(payload: dict) -> str:
    header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body   = _b64(json.dumps(payload).encode())
    sig    = _b64(hmac.new(SECRET_KEY.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest())
    return f"{header}.{body}.{sig}"

def _verify(token: str) -> dict | None:
    try:
        header, body, sig = token.split(".")
        expected = _b64(hmac.new(SECRET_KEY.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(body + "=="))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def _hash_pw(password: str) -> str:
    """Simple SHA-256 hash for user passwords."""
    return hashlib.sha256(password.encode()).hexdigest()


# ── Auth dependencies ─────────────────────────────────────────────────────────
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="No autenticado")
    payload = _verify(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return payload

def auth_required(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    return get_current_user(credentials)

def admin_required(user=Depends(auth_required)):
    if user.get("role") not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Se requiere rol admin")
    return user


# ── DB helpers ────────────────────────────────────────────────────────────────
async def get_db():
    return await asyncpg.connect(DB_URL)

async def ensure_users_table():
    """Create users table if it doesn't exist."""
    if not DB_URL:
        return
    try:
        conn = await get_db()
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                username    TEXT UNIQUE NOT NULL,
                email       TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role        TEXT NOT NULL DEFAULT 'user',
                status      TEXT NOT NULL DEFAULT 'pending',
                created_at  TIMESTAMPTZ DEFAULT NOW(),
                approved_at TIMESTAMPTZ,
                approved_by TEXT
            )
        """)
        await conn.close()
    except Exception as e:
        print(f"[auth] DB table init error: {e}")


# ── Email helper ──────────────────────────────────────────────────────────────
def _send_email(to: str, subject: str, html: str):
    cfg = load_config()
    smtp_cfg = cfg.get("smtp", {})
    if not smtp_cfg.get("enabled"):
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = smtp_cfg["email"]
        msg["To"]      = to
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(smtp_cfg["host"], smtp_cfg["port"]) as s:
            s.starttls()
            s.login(smtp_cfg["email"], smtp_cfg["password"])
            s.sendmail(smtp_cfg["email"], to, msg.as_string())
    except Exception as e:
        print(f"[auth] Email send error: {e}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login")
async def login(body: dict):
    """Login: admin (single password) o usuario registrado (username + password)."""
    password = body.get("password", "").strip()
    username = body.get("username", "").strip()
    cfg      = load_config()

    # ── Admin login (no username, just password) ──────────────────────────────
    if not username:
        stored = cfg.get("auth", {}).get("password", "REDACTED")
        if not password or password != stored:
            raise HTTPException(status_code=401, detail="Contraseña incorrecta")
        token = _sign({"sub": "admin", "role": "admin", "exp": int(time.time()) + TOKEN_TTL})
        return {"token": token, "expires_in": TOKEN_TTL, "role": "admin"}

    # ── User login (username + password) ─────────────────────────────────────
    if not DB_URL:
        raise HTTPException(status_code=503, detail="BD no configurada")
    try:
        conn = await get_db()
        user = await conn.fetchrow(
            "SELECT * FROM users WHERE username=$1 OR email=$1", username
        )
        await conn.close()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error DB: {e}")

    if not user:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    if user["status"] == "pending":
        raise HTTPException(status_code=403, detail="Tu cuenta está pendiente de aprobación")
    if user["status"] == "rejected":
        raise HTTPException(status_code=403, detail="Tu solicitud fue rechazada")
    if user["password_hash"] != _hash_pw(password):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    token = _sign({
        "sub":  user["username"],
        "role": user["role"],
        "uid":  user["id"],
        "exp":  int(time.time()) + TOKEN_TTL
    })
    return {"token": token, "expires_in": TOKEN_TTL, "role": user["role"]}


@router.post("/register")
async def register(body: dict):
    """Registro de nuevo usuario — queda pendiente hasta aprobación del admin."""
    username = body.get("username", "").strip()
    email    = body.get("email", "").strip()
    password = body.get("password", "").strip()
    reason   = body.get("reason", "").strip()  # Por qué quiere acceso

    if not username or not email or not password:
        raise HTTPException(status_code=400, detail="username, email y password son obligatorios")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    if not DB_URL:
        raise HTTPException(status_code=503, detail="BD no configurada")

    try:
        conn = await get_db()
        existing = await conn.fetchrow(
            "SELECT id FROM users WHERE username=$1 OR email=$2", username, email
        )
        if existing:
            await conn.close()
            raise HTTPException(status_code=409, detail="Usuario o email ya registrado")

        uid = str(uuid.uuid4())
        await conn.execute(
            "INSERT INTO users (id, username, email, password_hash, status) VALUES ($1,$2,$3,$4,'pending')",
            uid, username, email, _hash_pw(password)
        )
        await conn.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error DB: {e}")

    # Email al admin
    cfg       = load_config()
    admin_to  = cfg.get("smtp", {}).get("to", "")
    base_url  = "https://app.bdev.qzz.io"
    approve_url = f"{base_url}/api/auth/approve/{uid}"
    reject_url  = f"{base_url}/api/auth/reject/{uid}"

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#0a0a1a;color:#e2e8f0;border-radius:12px">
      <h2 style="color:#818cf8">🔐 Nueva solicitud de acceso — B-DEV</h2>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;color:#94a3b8">Usuario:</td><td style="padding:8px;font-weight:bold">{username}</td></tr>
        <tr><td style="padding:8px;color:#94a3b8">Email:</td><td style="padding:8px">{email}</td></tr>
        <tr><td style="padding:8px;color:#94a3b8">Motivo:</td><td style="padding:8px">{reason or 'No especificado'}</td></tr>
        <tr><td style="padding:8px;color:#94a3b8">ID:</td><td style="padding:8px;font-size:12px;color:#64748b">{uid}</td></tr>
      </table>
      <div style="display:flex;gap:12px;margin-top:20px">
        <a href="{approve_url}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">✅ Aprobar</a>
        <a href="{reject_url}" style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">❌ Rechazar</a>
      </div>
      <p style="color:#64748b;font-size:12px;margin-top:20px">También puedes gestionar usuarios en <a href="{base_url}/config" style="color:#818cf8">{base_url}/config</a></p>
    </div>
    """
    _send_email(admin_to, f"[B-DEV] Nueva solicitud de acceso: {username}", html)

    return {"status": "pending", "message": "Solicitud enviada. Recibirás un email cuando el admin la revise."}


@router.get("/approve/{user_id}")
async def approve_user(user_id: str):
    """Aprobar usuario — llamado desde el link del email."""
    if not DB_URL:
        raise HTTPException(status_code=503, detail="BD no configurada")
    try:
        conn = await get_db()
        user = await conn.fetchrow("SELECT * FROM users WHERE id=$1", user_id)
        if not user:
            await conn.close()
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        await conn.execute(
            "UPDATE users SET status='approved', approved_at=NOW(), approved_by='admin-email' WHERE id=$1",
            user_id
        )
        await conn.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error DB: {e}")

    # Email al usuario
    _send_email(
        user["email"],
        "✅ Tu acceso a B-DEV ha sido aprobado",
        f"""
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#0a0a1a;color:#e2e8f0;border-radius:12px">
          <h2 style="color:#10b981">✅ Acceso aprobado</h2>
          <p>Hola <strong>{user["username"]}</strong>, tu cuenta en B-DEV ha sido aprobada.</p>
          <a href="https://app.bdev.qzz.io" style="background:#818cf8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:12px">🚀 Entrar a B-DEV</a>
        </div>
        """
    )
    return {"status": "approved", "user": user["username"], "message": "Usuario aprobado. Se le ha notificado por email."}


@router.get("/reject/{user_id}")
async def reject_user(user_id: str):
    """Rechazar usuario — llamado desde el link del email."""
    if not DB_URL:
        raise HTTPException(status_code=503, detail="BD no configurada")
    try:
        conn = await get_db()
        user = await conn.fetchrow("SELECT * FROM users WHERE id=$1", user_id)
        if not user:
            await conn.close()
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        await conn.execute("UPDATE users SET status='rejected' WHERE id=$1", user_id)
        await conn.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error DB: {e}")

    _send_email(
        user["email"],
        "❌ Tu solicitud de acceso a B-DEV",
        f"""
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#0a0a1a;color:#e2e8f0;border-radius:12px">
          <h2 style="color:#ef4444">Solicitud no aprobada</h2>
          <p>Hola <strong>{user["username"]}</strong>, tu solicitud de acceso no ha sido aprobada en este momento.</p>
        </div>
        """
    )
    return {"status": "rejected", "user": user["username"]}


@router.get("/users")
async def list_users(user=Depends(admin_required)):
    """Listar todos los usuarios (solo admin)."""
    if not DB_URL:
        return {"users": []}
    try:
        conn = await get_db()
        rows = await conn.fetch("SELECT id, username, email, role, status, created_at, approved_at FROM users ORDER BY created_at DESC")
        await conn.close()
        return {"users": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error DB: {e}")


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user=Depends(admin_required)):
    """Eliminar usuario (solo admin)."""
    if not DB_URL:
        raise HTTPException(status_code=503, detail="BD no configurada")
    conn = await get_db()
    await conn.execute("DELETE FROM users WHERE id=$1", user_id)
    await conn.close()
    return {"status": "deleted"}


@router.post("/verify-admin")
async def verify_admin(body: dict, user=Depends(auth_required)):
    pin = body.get("pin", "").strip()
    if not pin:
        raise HTTPException(status_code=400, detail="PIN requerido")
    cfg    = load_config()
    stored = cfg.get("auth", {}).get("admin_pin", "REDACTED")
    if pin != stored:
        raise HTTPException(status_code=401, detail="PIN incorrecto")
    admin_tok = _sign({"sub": "admin", "role": "superadmin", "exp": int(time.time()) + 3600})
    return {"ok": True, "token": admin_tok}


@router.post("/change-admin-pin")
async def change_admin_pin(body: dict, user=Depends(auth_required)):
    current = body.get("current", "").strip()
    new_pin = body.get("new_pin", "").strip()
    if len(new_pin) < 4:
        raise HTTPException(status_code=400, detail="El PIN debe tener al menos 4 caracteres")
    cfg    = load_config()
    stored = cfg.get("auth", {}).get("admin_pin", "REDACTED")
    if current != stored:
        raise HTTPException(status_code=401, detail="PIN actual incorrecto")
    cfg.setdefault("auth", {})["admin_pin"] = new_pin
    save_config(cfg)
    return {"status": "changed"}


@router.post("/change-password")
async def change_password(body: dict, user=Depends(auth_required)):
    new_password = body.get("new_password", "").strip()
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    cfg = load_config()
    cfg.setdefault("auth", {})["password"] = new_password
    save_config(cfg)
    return {"status": "changed"}


@router.get("/me")
async def me(user=Depends(auth_required)):
    return {"authenticated": True, "sub": user.get("sub"), "role": user.get("role", "user")}
