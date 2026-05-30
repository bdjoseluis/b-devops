"""
Tests for auth endpoints.
Run: pip install pytest pytest-asyncio httpx && pytest tests/ -v
"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock


# Patch DB and config before importing the app
@pytest.fixture
def mock_config():
    cfg = {
        "auth": {"password": "testpass123", "admin_pin": "1234"},
        "apis": {}, "smtp": {"enabled": False},
        "auditor": {}, "kali_ssh": {"enabled": False},
        "scan_defaults": {"timeout": 30, "max_subdomains": 50},
        "nmap_path": "nmap",
    }
    with patch("config_manager.load_config", return_value=cfg), \
         patch("config_manager.save_config"):
        yield cfg


@pytest.fixture
def mock_db(mock_config):
    """Patch the DB pool so tests don't need a real Postgres."""
    import db as _db
    mock_pool = MagicMock()

    class FakeConn:
        async def fetchrow(self, *a, **kw): return None
        async def fetch(self, *a, **kw): return []
        async def execute(self, *a, **kw): return "UPDATE 0"
        async def fetchval(self, *a, **kw): return 1
        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass

    mock_pool.acquire.return_value = FakeConn()
    _db._pool = mock_pool
    yield mock_pool
    _db._pool = None


@pytest.fixture
async def client(mock_db):
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# ── Health check ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ── Admin login ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_login_success(client, mock_config):
    r = await client.post("/api/auth/login", json={"password": "testpass123"})
    assert r.status_code == 200
    data = r.json()
    assert "token" in data
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_admin_login_wrong_password(client):
    r = await client.post("/api/auth/login", json={"password": "wrongpass"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_admin_login_empty_password(client):
    r = await client.post("/api/auth/login", json={"password": ""})
    assert r.status_code == 401


# ── Rate limiting ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_rate_limit(client):
    """After 10 failed attempts from same IP the 11th should get 429."""
    # Use a "unique" IP via header — in tests client.host is "testclient"
    for _ in range(10):
        await client.post("/api/auth/login", json={"password": "wrong"})
    r = await client.post("/api/auth/login", json={"password": "wrong"})
    assert r.status_code == 429


# ── Protected endpoint without token ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_protected_requires_auth(client):
    """Endpoints that require auth should return 403 (no bearer) or 401."""
    endpoints = [
        ("GET",  "/api/clients"),
        ("GET",  "/api/settings"),
        ("POST", "/api/osint/analyze"),
        ("POST", "/api/audit/full"),
    ]
    for method, path in endpoints:
        r = await client.request(method, path, json={"target": "test"})
        assert r.status_code in (401, 403), f"{method} {path} returned {r.status_code}"


# ── Integration endpoint with bad key ────────────────────────────────────────

@pytest.mark.asyncio
async def test_integration_lead_bad_key(client):
    r = await client.post("/api/integrations/lead",
                          json={"nombre": "Test", "fuente": "carsimport"},
                          headers={"X-Integration-Key": "wrong-key"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_integration_health_open(client):
    """Integration health check is public."""
    r = await client.get("/api/integrations/health")
    assert r.status_code == 200


# ── Report download path traversal ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_report_no_path_traversal(client, mock_config):
    """Admin token first."""
    login = await client.post("/api/auth/login", json={"password": "testpass123"})
    token = login.json().get("token", "")
    headers = {"Authorization": f"Bearer {token}"}
    for bad in ["../config.json", "../../.env", "..%2F..%2Fconfig.json"]:
        r = await client.get(f"/api/reports/download/{bad}", headers=headers)
        assert r.status_code in (400, 404), f"Path traversal not blocked for: {bad}"
