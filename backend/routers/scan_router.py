from fastapi import APIRouter
from pydantic import BaseModel
from services import nmap_service, kali_service, shodan_service

router = APIRouter(prefix="/api/scan", tags=["scan"])


class ScanRequest(BaseModel):
    target: str
    profile: str = "quick"
    custom_flags: str = ""
    use_kali: bool = False


class KaliRequest(BaseModel):
    tool: str
    target: str
    custom_cmd: str = ""


class RawRequest(BaseModel):
    command: str


@router.post("/nmap")
async def nmap_scan(req: ScanRequest):
    if req.use_kali and kali_service.is_configured():
        profile_map = {
            "quick": "nmap_quick",
            "full": "nmap_full",
            "vuln": "nmap_vuln",
        }
        tool = profile_map.get(req.profile, "nmap_quick")
        return await kali_service.run_command(tool, req.target)
    return await nmap_service.scan(req.target, req.profile, req.custom_flags)


@router.post("/kali")
async def kali_tool(req: KaliRequest):
    return await kali_service.run_command(req.tool, req.target, req.custom_cmd)


@router.post("/kali/raw")
async def kali_raw(req: RawRequest):
    return await kali_service.run_raw(req.command)


@router.get("/kali/tools")
async def get_kali_tools():
    return {
        "connected": kali_service.is_configured(),
        "tools": kali_service.get_available_tools()
    }


@router.post("/shodan")
async def shodan_lookup(body: dict):
    target = body.get("target", "")
    query_type = body.get("type", "ip")
    if query_type == "search":
        return await shodan_service.search(target, limit=body.get("limit", 10))
    elif query_type == "domain":
        return await shodan_service.lookup_domain(target)
    return await shodan_service.lookup_ip(target)


@router.get("/profiles")
async def get_profiles():
    return {
        "profiles": [
            {"id": "quick", "name": "Quick Scan", "desc": "Top 100 ports, fast (-T4 -F)", "time": "~15s"},
            {"id": "full", "name": "Full Scan", "desc": "All 65535 ports + service detection", "time": "~5-30min"},
            {"id": "stealth", "name": "Stealth Scan", "desc": "SYN scan, slow mode (-T2)", "time": "~10-60min"},
            {"id": "vuln", "name": "Vuln Scripts", "desc": "NSE vulnerability scripts", "time": "~2-10min"},
            {"id": "os", "name": "OS Detection", "desc": "OS fingerprinting (-O)", "time": "~1-5min"},
            {"id": "service", "name": "Service + Scripts", "desc": "Version + default scripts (-sC)", "time": "~2-5min"},
            {"id": "udp", "name": "UDP Scan", "desc": "Top 100 UDP ports", "time": "~2-5min"},
        ]
    }
