from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from routers.auth_router import auth_required
from pydantic import BaseModel
from services import report_service, gemini_service
from config_manager import load_config
from pathlib import Path

router = APIRouter(prefix="/api/reports", tags=["reports"], dependencies=[Depends(auth_required)])


class ReportRequest(BaseModel):
    target: str
    data: dict
    include_ai: bool = True


@router.post("/generate")
async def generate_report(req: ReportRequest):
    cfg = load_config()
    auditor = cfg.get("auditor", {})

    ai_summary = ""
    if req.include_ai:
        ai_summary = await gemini_service.generate_report_summary(req.target, req.data)

    filepath = report_service.generate_osint_report(
        target=req.target,
        data=req.data,
        auditor=auditor,
        ai_summary=ai_summary,
    )

    filename = Path(filepath).name
    return {
        "status": "generated",
        "filename": filename,
        "path": filepath,
        "download_url": f"/api/reports/download/{filename}"
    }


@router.get("/list")
async def list_reports():
    return {"reports": report_service.list_reports()}


@router.get("/download/{filename}")
async def download_report(filename: str):
    from fastapi import HTTPException
    # Sanitise filename — reject any path traversal attempt
    safe_name = Path(filename).name
    if safe_name != filename or '/' in filename or '\\' in filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido")
    filepath = (report_service.REPORTS_DIR / safe_name).resolve()
    reports_root = report_service.REPORTS_DIR.resolve()
    # Ensure resolved path is still inside the reports directory
    if not str(filepath).startswith(str(reports_root)):
        raise HTTPException(status_code=400, detail="Acceso denegado")
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Informe no encontrado")
    # Detect media type by extension
    suffix = filepath.suffix.lower()
    media_map = {
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pdf":  "application/pdf",
        ".html": "text/html",
    }
    media_type = media_map.get(suffix, "application/octet-stream")
    return FileResponse(str(filepath), media_type=media_type, filename=safe_name)
