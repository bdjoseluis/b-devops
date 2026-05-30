"""
Shared asyncpg connection pool.
Initialized once in main.py lifespan; imported by all routers.
"""
import asyncpg
from fastapi import HTTPException
from contextlib import asynccontextmanager

_pool: asyncpg.Pool | None = None


async def init_pool(url: str):
    global _pool
    _pool = await asyncpg.create_pool(url, min_size=2, max_size=10, command_timeout=30)


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def get_conn():
    """Async context manager that yields a connection from the pool."""
    if _pool is None:
        raise HTTPException(status_code=503, detail="BD no configurada")
    async with _pool.acquire() as conn:
        yield conn
