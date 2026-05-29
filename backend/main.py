import sys
from pathlib import Path

# Add backend dir to path so imports work
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from routers import (
    osint_router, scan_router, ai_router, report_router,
    settings_router, tools_router, tempmail_router, prospector_router
)
from routers import audit_router
from routers import devops_router
from routers import auth_router
from routers import monitor_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas en BD al arrancar
    await auth_router.ensure_users_table()
    yield


app = FastAPI(
    title="B-DEV API",
    description="Sistema de Ciberinteligencia y OSINT Automatizado",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://app.bdev.qzz.io",
        "https://bdev.qzz.io",
        "https://api.bdev.qzz.io",
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


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "AURA OPS", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
