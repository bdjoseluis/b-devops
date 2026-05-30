import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from prometheus_fastapi_instrumentator import Instrumentator

import db as _db
from routers import (
    osint_router, scan_router, ai_router, report_router,
    settings_router, tools_router, tempmail_router, prospector_router
)
from routers import audit_router
from routers import devops_router
from routers import auth_router
from routers import monitor_router
from routers import clients_router
from routers import integrations_router
from routers import outreach_router

DB_URL = os.environ.get("DATABASE_URL", "")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if DB_URL:
        await _db.init_pool(DB_URL)

    await auth_router.ensure_users_table()
    await clients_router.ensure_clients_table()
    await integrations_router.ensure_fuente_column()
    await outreach_router.ensure_outreach_table()
    yield

    await _db.close_pool()


app = FastAPI(
    title="B-DEVOPS API",
    description="Sistema de Ciberinteligencia y OSINT Automatizado",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4200",
        "http://127.0.0.1:5173",
        "https://app.bdev.qzz.io",
        "https://bdev.qzz.io",
        "https://api.bdev.qzz.io",
        "https://carsimport.bdev.qzz.io",
        "https://carsimport.vercel.app",
        "https://psicologia.bdev.qzz.io",
        "https://devesan.vercel.app",
        "https://www.claraeugenia.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(osint_router.router)
app.include_router(scan_router.router)
app.include_router(ai_router.router)
app.include_router(report_router.router)
app.include_router(settings_router.router)
app.include_router(tools_router.router)
app.include_router(tempmail_router.router)
app.include_router(prospector_router.router)
app.include_router(audit_router.router)
app.include_router(devops_router.router)
app.include_router(auth_router.router)
app.include_router(monitor_router.router)
app.include_router(clients_router.router)
app.include_router(integrations_router.router)
app.include_router(outreach_router.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "B-DEVOPS", "version": "2.0.0"}


# Exponer métricas de Prometheus en /metrics
Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
