from fastapi import APIRouter
from pydantic import BaseModel
from config_manager import load_config, save_config
from pathlib import Path
from datetime import datetime

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
async def get_settings():
    cfg = load_config()
    # Mask API keys for display (show last 6 chars)
    masked = dict(cfg)
    masked["apis"] = {}
    for k, v in cfg.get("apis", {}).items():
        masked["apis"][k] = _mask_key(v)
    return masked


@router.get("/raw")
async def get_settings_raw():
    return load_config()


@router.post("")
async def update_settings(body: dict):
    cfg = load_config()
    # Deep merge incoming changes
    for section, val in body.items():
        if isinstance(val, dict) and isinstance(cfg.get(section), dict):
            cfg[section].update(val)
        else:
            cfg[section] = val
    save_config(cfg)
    return {"status": "saved"}


@router.post("/apis")
async def update_api_keys(body: dict):
    cfg = load_config()
    for k, v in body.items():
        if k in cfg["apis"]:
            if v and not _is_masked(v):
                cfg["apis"][k] = v
    save_config(cfg)
    return {"status": "saved"}


@router.post("/auditor")
async def update_auditor(body: dict):
    cfg = load_config()
    cfg["auditor"].update(body)
    save_config(cfg)
    return {"status": "saved"}


@router.post("/kali")
async def update_kali(body: dict):
    cfg = load_config()
    cfg["kali_ssh"].update(body)
    save_config(cfg)
    return {"status": "saved"}


@router.get("/kali/test")
async def test_kali():
    from services.kali_service import run_raw, is_configured
    if not is_configured():
        return {"status": "error", "message": "Kali SSH not configured"}
    result = await run_raw("echo 'AURA OPS Connection OK' && uname -a")
    return {"status": "ok" if result.get("exit_code") == 0 else "error", "output": result.get("output", "")}


@router.post("/smtp")
async def update_smtp(body: dict):
    cfg = load_config()
    if "smtp" not in cfg:
        cfg["smtp"] = {}
    cfg["smtp"].update(body)
    save_config(cfg)
    return {"status": "saved"}


@router.get("/smtp/test")
async def test_smtp():
    from services.smtp_service import test_connection
    return await test_connection()


@router.get("/dashboard/stats")
async def dashboard_stats():
    cfg = load_config()
    apis = cfg.get("apis", {})

    # Count configured API keys (non-empty)
    configured_apis = sum(1 for v in apis.values() if v and str(v).strip())
    total_apis = len(apis)

    # Count reports
    reports_dir = Path(__file__).parent.parent / "reports"
    reports = sorted(reports_dir.glob("*.docx"), key=lambda f: f.stat().st_mtime, reverse=True) if reports_dir.exists() else []
    last_report = None
    if reports:
        mtime = reports[0].stat().st_mtime
        last_report = datetime.fromtimestamp(mtime).strftime("%d/%m/%Y %H:%M")

    # SMTP status
    smtp_cfg = cfg.get("smtp", {})

    return {
        "reports_total": len(reports),
        "last_report": last_report,
        "apis_configured": configured_apis,
        "apis_total": total_apis,
        "smtp_enabled": smtp_cfg.get("enabled", False),
        "auditor_name": cfg.get("auditor", {}).get("name", ""),
        "kali_enabled": cfg.get("kali_ssh", {}).get("enabled", False),
    }


def _mask_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 6:
        return "***"
    return "***" + key[-6:]


def _is_masked(val: str) -> bool:
    return val.startswith("***")
