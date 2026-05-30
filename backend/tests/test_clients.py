"""
Tests for clients CRM endpoints.
"""
import json
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import MagicMock, patch, AsyncMock


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


# Sample client row as asyncpg would return it
SAMPLE_CLIENT = {
    "id": "test-uuid-123",
    "nombre": "Test S.L.",
    "empresa": "Test",
    "email": "test@test.com",
    "telefono": "",
    "web": "",
    "sector": "Tecnología",
    "estado": "Prospecto",
    "servicios": "[]",
    "notas": "",
    "valor_estimado": 0.0,
    "estrella": False,
    "fuente": "bdev-platform",
    "fecha_creacion": None,
    "ultima_actividad": None,
}


class FakeRecord(dict):
    """Behaves like an asyncpg Record."""
    def __getitem__(self, key): return super().__getitem__(key)


@pytest.fixture
def mock_db(mock_config):
    import db as _db

    class FakeConn:
        async def fetch(self, *a, **kw):
            return [FakeRecord(SAMPLE_CLIENT)]

        async def fetchrow(self, *a, **kw):
            return FakeRecord(SAMPLE_CLIENT)

        async def execute(self, *a, **kw):
            return "DELETE 1"

        async def fetchval(self, *a, **kw):
            return 1

        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass

    mock_pool = MagicMock()
    mock_pool.acquire.return_value = FakeConn()
    _db._pool = mock_pool
    yield mock_pool
    _db._pool = None


@pytest.fixture
async def authed_client(mock_db):
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        login = await c.post("/api/auth/login", json={"password": "testpass123"})
        token = login.json()["token"]
        c.headers.update({"Authorization": f"Bearer {token}"})
        yield c


@pytest.mark.asyncio
async def test_list_clients_requires_auth():
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/clients")
        assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_list_clients_with_auth(authed_client):
    r = await authed_client.get("/api/clients")
    assert r.status_code == 200
    data = r.json()
    assert "clients" in data
    assert isinstance(data["clients"], list)


@pytest.mark.asyncio
async def test_client_stats_with_auth(authed_client):
    r = await authed_client.get("/api/clients/stats")
    assert r.status_code == 200
    data = r.json()
    assert "total" in data
    assert "activos" in data
    assert "leads_externos" in data
    assert "por_fuente" in data


@pytest.mark.asyncio
async def test_delete_client_requires_auth():
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.delete("/api/clients/some-id")
        assert r.status_code in (401, 403)
