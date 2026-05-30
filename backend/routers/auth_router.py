"""
B-DEVOPS — Auth router
- Admin: single-password JWT (stored in config.json)
- Users: register → admin email approval → login with username+password
- JWT tokens (HS256, 7 days)
"""

import os
import time
import hmac
import hashlib
import secrets
import base64
import json
import uuid
import smtplib
import asyncio
import asyncpg
import aiohttp
from collections import defaultdict
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config_manager import load_config, save_config
from db import get_conn

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)

SECRET_KEY        = os.environ.get("SECRET_KEY", "")
TOKEN_TTL         = 60 * 60               # 1 hora — access token
REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30    # 30 días — refresh token
DB_URL            = os.environ.get("DATABASE_URL", "")

# ── Rate limiting en memoria ───────────────────────────────────────────────────
_attempts: dict[str, list[float]] = defaultdict(list)
_last_gc: float = 0.0

def _check_rate_limit(ip: str, max_calls: int = 10, window: int = 600):
    """Generic sliding-window rate limiter. Raises 429 if exceeded."""
    global _last_gc
    now = time.time()
    cutoff = now - window
    _attempts[ip] = [t for t in _attempts[ip] if t > cutoff]
    if len(_attempts[ip]) >= max_calls:
        raise HTTPException(status_code=429, detail=f"Demasiados intentos. Espera {window // 60} minutos.")
    _attempts[ip].append(now)
    # Purge stale keys every 5 minutes to prevent unbounded growth
    if now - _last_gc > 300:
        _last_gc = now
        stale = [k for k, v in _attempts.items() if not v]
        for k in stale:
            del _attempts[k]


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
    """PBKDF2-SHA256 with random 16-byte salt.
    Format stored: pbkdf2:sha256:260000:<salt_hex>:<hash_hex>
    """
    salt = secrets.token_hex(16)
    dk   = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 260_000)
    return f"pbkdf2:sha256:260000:{salt}:{dk.hex()}"

def _verify_pw(password: str, stored: str) -> bool:
    """Constant-time verify password against stored hash.
    Supports both new PBKDF2 format and legacy raw SHA-256 (auto-upgrades on next login).
    """
    if stored.startswith('pbkdf2:sha256:'):
        parts = stored.split(':')
        if len(parts) == 5:
            _, _, iters, salt, expected = parts
            dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), int(iters))
            return hmac.compare_digest(dk.hex(), expected)
        return False
    # Legacy fallback: raw SHA-256 (no salt — old registrations)
    legacy = hashlib.sha256(password.encode()).hexdigest()
    return hmac.compare_digest(legacy, stored)


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
async def ensure_users_table():
    """Create users and refresh_tokens tables if they don't exist (startup — direct connect)."""
    if not DB_URL:
        return
    try:
        conn = await asyncpg.connect(DB_URL)
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
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                user_id     TEXT NOT NULL,
                token_hash  TEXT NOT NULL UNIQUE,
                expires_at  TIMESTAMPTZ NOT NULL,
                created_at  TIMESTAMPTZ DEFAULT NOW(),
                revoked     BOOLEAN DEFAULT FALSE
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


# ── Refresh token helpers ─────────────────────────────────────────────────────
async def _create_refresh_token(user_id: str) -> str:
    """Genera un refresh token opaco, lo guarda hasheado en BD y devuelve el raw."""
    raw    = secrets.token_urlsafe(48)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    expires = time.time() + REFRESH_TOKEN_TTL
    async with get_conn() as conn:
        await conn.execute(
            "DELETE FROM refresh_tokens WHERE user_id=$1 AND (expires_at < NOW() OR revoked=TRUE)",
            user_id
        )
        await conn.execute(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, to_timestamp($3))",
            user_id, hashed, expires
        )
    return raw

async def _verify_refresh_token(raw: str) -> dict | None:
    """Verifica el refresh token y devuelve el row si es válido."""
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    async with get_conn() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM refresh_tokens WHERE token_hash=$1 AND revoked=FALSE AND expires_at > NOW()",
            hashed
        )
        return dict(row) if row else None

async def _revoke_refresh_token(raw: str):
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    async with get_conn() as conn:
        await conn.execute("UPDATE refresh_tokens SET revoked=TRUE WHERE token_hash=$1", hashed)


# ── n8n webhook helper ────────────────────────────────────────────────────────
N8N_BASE = os.environ.get("N8N_URL", "http://bdev-n8n:5678")

async def _fire_n8n(path: str, payload: dict):
    """Fire-and-forget async webhook to n8n. Never raises — logs error silently."""
    try:
        url = f"{N8N_BASE}{path}"
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=5)) as r:
                print(f"[auth] n8n webhook {path} -> {r.status}")
    except Exception as e:
        print(f"[auth] n8n webhook failed ({path}): {e}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login")
async def login(body: dict, request: Request):
    """Login: admin (single password) o usuario registrado (username + password)."""
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    password = body.get("password", "").strip()
    username = body.get("username", "").strip()
    cfg      = load_config()

    # ── Admin login (no username, just password) ──────────────────────────────
    if not username:
        stored = cfg.get("auth", {}).get("password", "")
        # Fallback to ADMIN_PASSWORD env var for fresh installs (config password not set yet)
        if not stored:
            stored = os.environ.get("ADMIN_PASSWORD", "")
        if not password or not stored or not hmac.compare_digest(password.encode(), stored.encode()):
            raise HTTPException(status_code=401, detail="Contraseña incorrecta")
        token         = _sign({"sub": "admin", "role": "admin", "exp": int(time.time()) + TOKEN_TTL})
        refresh_token = await _create_refresh_token("admin")
        return {"token": token, "refresh_token": refresh_token, "expires_in": TOKEN_TTL, "role": "admin"}

    # ── User login (username + password) ─────────────────────────────────────
    try:
        async with get_conn() as conn:
            user = await conn.fetchrow(
                "SELECT * FROM users WHERE username=$1 OR email=$1", username
            )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error DB: {e}")

    if not user:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    if user["status"] == "pending":
        raise HTTPException(status_code=403, detail="Tu cuenta está pendiente de aprobación")
    if user["status"] == "rejected":
        raise HTTPException(status_code=403, detail="Tu solicitud fue rechazada")
    if not _verify_pw(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    # Auto-upgrade legacy SHA-256 hash → PBKDF2 on successful login
    if not user["password_hash"].startswith('pbkdf2:'):
        try:
            async with get_conn() as conn2:
                await conn2.execute(
                    "UPDATE users SET password_hash=$1 WHERE id=$2",
                    _hash_pw(password), user["id"]
                )
        except Exception:
            pass  # Non-fatal — will retry on next login

    token         = _sign({
        "sub":  user["username"],
        "role": user["role"],
        "uid":  user["id"],
        "exp":  int(time.time()) + TOKEN_TTL
    })
    refresh_token = await _create_refresh_token(user["id"])
    return {"token": token, "refresh_token": refresh_token, "expires_in": TOKEN_TTL, "role": user["role"]}


@router.post("/register")
async def register(body: dict, request: Request):
    """Registro de nuevo usuario — queda pendiente hasta aprobación del admin."""
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(f"reg:{client_ip}", max_calls=5, window=600)  # 5 registros / 10 min por IP

    username = body.get("username", "").strip()
    email    = body.get("email", "").strip()
    password = body.get("password", "").strip()
    reason   = body.get("reason", "").strip()

    if not username or not email or not password:
        raise HTTPException(status_code=400, detail="username, email y password son obligatorios")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    try:
        async with get_conn() as conn:
            existing = await conn.fetchrow(
                "SELECT id FROM users WHERE username=$1 OR email=$2", username, email
            )
            if existing:
                raise HTTPException(status_code=409, detail="Usuario o email ya registrado")

            uid = str(uuid.uuid4())
            await conn.execute(
                "INSERT INTO users (id, username, email, password_hash, status) VALUES ($1,$2,$3,$4,'pending')",
                uid, username, email, _hash_pw(password)
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error DB: {e}")

    # n8n webhook — notifica al CRM (fire and forget)
    asyncio.create_task(_fire_n8n("/webhook/user-register", {
        "event": "user_register",
        "user_id": uid,
        "username": username,
        "email": email,
        "reason": reason or "",
        "status": "pending",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }))

    # Email al admin
    cfg       = load_config()
    admin_to  = cfg.get("smtp", {}).get("to", "")
    base_url  = "https://app.bdev.qzz.io"
    approve_url = f"{base_url}/api/auth/approve/{uid}"
    reject_url  = f"{base_url}/api/auth/reject/{uid}"

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#0a0a1a;color:#e2e8f0;border-radius:12px">
      <h2 style="color:#818cf8">🔐 Nueva solicitud de acceso — B-DEVOPS</h2>
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
    _send_email(admin_to, f"[B-DEVOPS] Nueva solicitud de acceso: {username}", html)

    return {"status": "pending", "message": "Solicitud enviada. Recibirás un email cuando el admin la revise."}


@router.get("/approve/{user_id}")
async def approve_user(user_id: str):
    """Aprobar usuario — llamado desde el link del email."""
    try:
        async with get_conn() as conn:
            user = await conn.fetchrow("SELECT * FROM users WHERE id=$1", user_id)
            if not user:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            await conn.execute(
                "UPDATE users SET status='approved', approved_at=NOW(), approved_by='admin-email' WHERE id=$1",
                user_id
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error DB: {e}")

    # n8n webhook — notifica aprobación al CRM
    asyncio.create_task(_fire_n8n("/webhook/user-approved", {
        "event": "user_approved",
        "user_id": user_id,
        "username": user["username"],
        "email": user["email"],
        "approved_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }))

    # Email al usuario
    _send_email(
        user["email"],
        "✅ Tu acceso a B-DEVOPS ha sido aprobado",
        f"""
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#0a0a1a;color:#e2e8f0;border-radius:12px">
          <h2 style="color:#10b981">✅ Acceso aprobado</h2>
          <p>Hola <strong>{user["username"]}</strong>, tu cuenta en B-DEVOPS ha sido aprobada.</p>
          <a href="https://app.bdev.qzz.io" style="background:#818cf8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:12px">🚀 Entrar a B-DEVOPS</a>
        </div>
        """
    )
    return {"status": "approved", "user": user["username"], "message": "Usuario aprobado. Se le ha notificado por email."}


@router.get("/reject/{user_id}")
async def reject_user(user_id: str):
    """Rechazar usuario — llamado desde el link del email."""
    try:
        async with get_conn() as conn:
            user = await conn.fetchrow("SELECT * FROM users WHERE id=$1", user_id)
            if not user:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            await conn.execute("UPDATE users SET status='rejected' WHERE id=$1", user_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error DB: {e}")

    _send_email(
        user["email"],
        "❌ Tu solicitud de acceso a B-DEVOPS",
        f"""
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#0a0a1a;color:#e2e8f0;border-radius:12px">
          <h2 style="color:#ef4444">Solicitud no aprobada</h2>
          <p>Hola <strong>{user["username"]}</strong>, tu solicitud de acceso no ha sido aprobada en este momento.</p>
        </div>
        """
    )
    return {"status": "rejected", "user": user["username"]}


@router.post("/approve/{user_id}")
async def approve_user_api(user_id: str, user=Depends(admin_required)):
    """Aprobar usuario desde la UI (requiere token admin)."""
    return await approve_user(user_id)

@router.post("/reject/{user_id}")
async def reject_user_api(user_id: str, user=Depends(admin_required)):
    """Rechazar usuario desde la UI (requiere token admin)."""
    return await reject_user(user_id)


@router.get("/users")
async def list_users(user=Depends(admin_required)):
    """Listar todos los usuarios (solo admin)."""
    try:
        async with get_conn() as conn:
            rows = await conn.fetch(
                "SELECT id, username, email, role, status, created_at, approved_at FROM users ORDER BY created_at DESC"
            )
            return {"users": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error DB: {e}")


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user=Depends(admin_required)):
    """Eliminar usuario (solo admin)."""
    async with get_conn() as conn:
        await conn.execute("DELETE FROM users WHERE id=$1", user_id)
    return {"status": "deleted"}


@router.post("/verify-admin")
async def verify_admin(body: dict, user=Depends(auth_required)):
    pin = body.get("pin", "").strip()
    if not pin:
        raise HTTPException(status_code=400, detail="PIN requerido")
    cfg    = load_config()
    stored = cfg.get("auth", {}).get("admin_pin", "")
    if not hmac.compare_digest(pin.encode(), stored.encode()):
        raise HTTPException(status_code=401, detail="PIN incorrecto")
    admin_tok = _sign({"sub": "admin", "role": "superadmin", "exp": int(time.time()) + 3600})
    return {"ok": True, "token": admin_tok}


@router.post("/change-admin-pin")
async def change_admin_pin(body: dict, user=Depends(admin_required)):
    current = body.get("current", "").strip()
    new_pin = body.get("new_pin", "").strip()
    if len(new_pin) < 4:
        raise HTTPException(status_code=400, detail="El PIN debe tener al menos 4 caracteres")
    cfg    = load_config()
    stored = cfg.get("auth", {}).get("admin_pin", "")
    if not hmac.compare_digest(current.encode(), stored.encode()):
        raise HTTPException(status_code=401, detail="PIN actual incorrecto")
    cfg.setdefault("auth", {})["admin_pin"] = new_pin
    save_config(cfg)
    return {"status": "changed"}


@router.post("/change-password")
async def change_password(body: dict, user=Depends(admin_required)):
    new_password = body.get("new_password", "").strip()
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    cfg = load_config()
    cfg.setdefault("auth", {})["password"] = new_password
    save_config(cfg)
    return {"status": "changed"}


@router.post("/refresh")
async def refresh_token(body: dict):
    """Renueva el access token usando un refresh token válido."""
    raw = body.get("refresh_token", "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="refresh_token requerido")

    row = await _verify_refresh_token(raw)
    if not row:
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")

    user_id = row["user_id"]

    # Admin no está en la tabla users
    if user_id == "admin":
        new_token = _sign({"sub": "admin", "role": "admin", "exp": int(time.time()) + TOKEN_TTL})
        return {"token": new_token, "expires_in": TOKEN_TTL, "role": "admin"}

    # Usuario normal — verificar que sigue activo
    async with get_conn() as conn:
        user = await conn.fetchrow("SELECT username, role, status FROM users WHERE id=$1", user_id)

    if not user or user["status"] != "approved":
        await _revoke_refresh_token(raw)
        raise HTTPException(status_code=401, detail="Cuenta no válida")

    new_token = _sign({
        "sub":  user["username"],
        "role": user["role"],
        "uid":  user_id,
        "exp":  int(time.time()) + TOKEN_TTL
    })
    return {"token": new_token, "expires_in": TOKEN_TTL, "role": user["role"]}


@router.post("/logout")
async def logout(body: dict):
    """Revoca el refresh token (cierre de sesión real)."""
    raw = body.get("refresh_token", "").strip()
    if raw:
        await _revoke_refresh_token(raw)
    return {"status": "logged_out"}


@router.get("/me")
async def me(user=Depends(auth_required)):
    return {"authenticated": True, "sub": user.get("sub"), "role": user.get("role", "user")}
