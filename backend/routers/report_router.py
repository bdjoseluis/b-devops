from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel
from services import report_service, gemini_service
from config_manager import load_config
from pathlib import Path

router = APIRouter(prefix="/api/reports", tags=["reports"])


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
    filepath = report_service.REPORTS_DIR / filename
    if not filepath.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(
        str(filepath),
        media_type="application/pdf",
        filename=filename
    )
