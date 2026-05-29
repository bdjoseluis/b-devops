from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from services import gemini_service, groq_service

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatRequest(BaseModel):
    session_id: str = "default"
    message: str
    context: dict = {}


class AnalyzeRequest(BaseModel):
    target: str
    data: dict
    analysis_type: str = "osint"


@router.post("/chat")
async def chat(req: ChatRequest):
    response = await gemini_service.chat(req.session_id, req.message, req.context)
    return {"response": response, "session_id": req.session_id}


@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    if req.analysis_type == "scan":
        text = await gemini_service.analyze_scan(req.target, req.data)
    elif req.analysis_type == "report":
        text = await gemini_service.generate_report_summary(req.target, req.data)
    else:
        text = await gemini_service.analyze_osint(req.target, req.data)
    return {"analysis": text, "type": req.analysis_type}


@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    gemini_service.clear_session(session_id)
    return {"status": "cleared"}


# ─── Groq endpoints ────────────────────────────────────────────────────────────

class GroqMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class GroqChatRequest(BaseModel):
    messages: List[GroqMessage]
    model: str = "llama-3.3-70b-versatile"
    max_tokens: int = 2048
    temperature: float = 0.7


class GroqAnalyzeRequest(BaseModel):
    target: str = ""
    data: dict = {}
    analysis_type: str = "osint"
    model: str = "llama-3.3-70b-versatile"


@router.post("/groq/chat")
async def groq_chat(req: GroqChatRequest):
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    result = await groq_service.chat(
        messages,
        model=req.model,
        max_tokens=req.max_tokens,
        temperature=req.temperature,
    )
    return result


@router.post("/groq/analyze")
async def groq_analyze(req: GroqAnalyzeRequest):
    result = await groq_service.analyze(
        target=req.target,
        data=req.data,
        analysis_type=req.analysis_type,
        model=req.model,
    )
    return result


@router.get("/groq/models")
async def groq_models():
    return {"models": groq_service.get_models()}
