from fastapi import APIRouter
from services import tempmail_service

router = APIRouter(prefix="/api/tempmail", tags=["tempmail"])


@router.post("/create")
async def create(body: dict):
    session_id = body.get("session_id", "default")
    alias = body.get("alias")
    return await tempmail_service.create_email(session_id, alias)


@router.post("/create-custom")
async def create_custom(body: dict):
    return await tempmail_service.create_custom_email(
        login=body.get("login", ""),
        domain=body.get("domain"),
        session_id=body.get("session_id", "default"),
    )


@router.get("/inbox/{session_id}")
async def get_inbox(session_id: str):
    return await tempmail_service.get_inbox(session_id)


@router.get("/inbox")
async def get_inbox_default():
    return await tempmail_service.get_inbox("default")


@router.get("/message/{session_id}/{message_id}")
async def read_message(session_id: str, message_id: int):
    return await tempmail_service.read_message(session_id, message_id)


@router.post("/wait")
async def wait_for_email(body: dict):
    return await tempmail_service.wait_for_email(
        session_id=body.get("session_id", "default"),
        timeout_s=body.get("timeout", 60),
        poll_interval=body.get("interval", 3),
    )


@router.get("/sessions")
async def list_sessions():
    return {"sessions": tempmail_service.get_all_sessions()}


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    tempmail_service.delete_session(session_id)
    return {"status": "deleted"}


@router.get("/domains")
async def get_domains():
    return {"domains": tempmail_service.get_available_domains()}
