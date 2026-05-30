from fastapi import APIRouter, Depends
from routers.auth_router import auth_required
from pydantic import BaseModel
from services import (
    censys_service,
    dehashed_service,
    whatsmyname_service,
    wayback_service,
    c99_service,
    leakradar_service,
    urlscan_service,
    bgp_service,
    securitytrails_service,
)

router = APIRouter(prefix="/api/tools", tags=["tools"], dependencies=[Depends(auth_required)])


# ── Censys ──────────────────────────────────────────────
@router.post("/censys/ip")
async def censys_ip(body: dict):
    return await censys_service.search_ip(body.get("ip", ""))

@router.post("/censys/domain")
async def censys_domain(body: dict):
    return await censys_service.search_domain(body.get("domain", ""))

@router.post("/censys/search")
async def censys_search(body: dict):
    return await censys_service.search_query(body.get("query", ""), body.get("limit", 10))


# ── DeHashed ──────────────────────────────────────────────
@router.post("/dehashed/search")
async def dehashed_search(body: dict):
    return await dehashed_service.search(
        query=body.get("query", ""),
        query_type=body.get("type", "email"),
        size=body.get("size", 10),
        page=body.get("page", 1),
    )


# ── WhatsMyName ──────────────────────────────────────────
@router.post("/whatsmyname")
async def whatsmyname(body: dict):
    return await whatsmyname_service.search_username(
        username=body.get("username", ""),
        categories=body.get("categories"),
        limit=body.get("limit", 150),
    )

@router.get("/whatsmyname/categories")
async def wmn_categories():
    return {"categories": whatsmyname_service.get_categories()}


# ── Wayback Machine ──────────────────────────────────────
@router.post("/wayback/check")
async def wayback_check(body: dict):
    return await wayback_service.check_availability(body.get("url", ""))

@router.post("/wayback/snapshots")
async def wayback_snapshots(body: dict):
    return await wayback_service.get_snapshots(
        url=body.get("url", ""),
        limit=body.get("limit", 20),
        from_year=body.get("from_year"),
        to_year=body.get("to_year"),
    )

@router.post("/wayback/timeline")
async def wayback_timeline(body: dict):
    return await wayback_service.get_changes_timeline(body.get("url", ""))


# ── C99.nl ──────────────────────────────────────────────
@router.post("/c99/subdomains")
async def c99_subdomains(body: dict):
    return await c99_service.subdomain_finder(body.get("domain", ""))

@router.post("/c99/reverseip")
async def c99_reverseip(body: dict):
    return await c99_service.ip_to_domains(body.get("ip", ""))

@router.post("/c99/phone")
async def c99_phone(body: dict):
    return await c99_service.phone_lookup(body.get("phone", ""))

@router.post("/c99/portscan")
async def c99_portscan(body: dict):
    return await c99_service.port_scanner(body.get("host", ""), body.get("ports", "1-1000"))


# ── LeakRadar ──────────────────────────────────────────────
@router.post("/leakradar/email")
async def leakradar_email(body: dict):
    return await leakradar_service.check_email(body.get("email", ""))

@router.post("/leakradar/domain")
async def leakradar_domain(body: dict):
    return await leakradar_service.check_domain(body.get("domain", ""))

@router.post("/leakradar/search")
async def leakradar_search(body: dict):
    return await leakradar_service.search_keyword(body.get("keyword", ""))


# ── URLScan.io ──────────────────────────────────────────────
@router.post("/urlscan/scan")
async def urlscan_scan(body: dict):
    return await urlscan_service.scan_and_wait(
        url=body.get("url", ""),
        visibility=body.get("visibility", "unlisted")
    )

@router.post("/urlscan/submit")
async def urlscan_submit(body: dict):
    return await urlscan_service.submit_scan(
        url=body.get("url", ""),
        visibility=body.get("visibility", "unlisted")
    )

@router.get("/urlscan/result/{uuid}")
async def urlscan_result(uuid: str):
    return await urlscan_service.get_result(uuid)

@router.post("/urlscan/search/domain")
async def urlscan_search_domain(body: dict):
    return await urlscan_service.search_domain(body.get("domain", ""), body.get("size", 10))

@router.post("/urlscan/search/ip")
async def urlscan_search_ip(body: dict):
    return await urlscan_service.search_ip(body.get("ip", ""), body.get("size", 10))


# ── BGP / ASN ──────────────────────────────────────────────
@router.post("/bgp/ip")
async def bgp_ip(body: dict):
    return await bgp_service.lookup_ip(body.get("ip", ""))

@router.post("/bgp/asn")
async def bgp_asn(body: dict):
    return await bgp_service.lookup_asn(body.get("asn", ""))

@router.post("/bgp/prefixes")
async def bgp_prefixes(body: dict):
    return await bgp_service.get_asn_prefixes(body.get("asn", ""))

@router.post("/bgp/peers")
async def bgp_peers(body: dict):
    return await bgp_service.get_asn_peers(body.get("asn", ""))


# ── SecurityTrails ──────────────────────────────────────────
@router.post("/securitytrails/domain")
async def st_domain(body: dict):
    return await securitytrails_service.get_domain_info(body.get("domain", ""))

@router.post("/securitytrails/subdomains")
async def st_subdomains(body: dict):
    return await securitytrails_service.get_subdomains(body.get("domain", ""))

@router.post("/securitytrails/history")
async def st_history(body: dict):
    return await securitytrails_service.get_dns_history(
        domain=body.get("domain", ""),
        record_type=body.get("type", "a")
    )

@router.post("/securitytrails/associated")
async def st_associated(body: dict):
    return await securitytrails_service.get_associated_domains(body.get("domain", ""))

@router.post("/securitytrails/ip")
async def st_ip(body: dict):
    return await securitytrails_service.search_by_ip(body.get("ip", ""))
