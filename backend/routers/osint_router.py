import asyncio
import re
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from services import (
    whois_service,
    dns_service,
    subdomain_service,
    shodan_service,
    virustotal_service,
    ipinfo_service,
    email_service,
    ssl_service,
)
from services.rate_limiter import osint_limiter
from config_manager import load_config

router = APIRouter(prefix="/api/osint", tags=["osint"], dependencies=[Depends(osint_limiter)])


class OSINTRequest(BaseModel):
    target: str
    modules: list[str] = ["all"]


def detect_type(target: str) -> str:
    target = target.strip().lower()
    if re.match(r"^[\w.+-]+@[\w.-]+\.\w+$", target):
        return "email"
    ip_pattern = r"^(\d{1,3}\.){3}\d{1,3}$"
    if re.match(ip_pattern, target):
        return "ip"
    if target.startswith(("http://", "https://")):
        return "url"
    return "domain"


def extract_domain(target: str) -> str:
    target = target.strip()
    if target.startswith(("http://", "https://")):
        from urllib.parse import urlparse
        return urlparse(target).netloc.split(":")[0]
    if "@" in target:
        return target.split("@")[1]
    return target.split(":")[0]


@router.post("/analyze")
async def analyze(req: OSINTRequest):
    target = req.target.strip()
    target_type = detect_type(target)
    domain = extract_domain(target)
    run_all = "all" in req.modules

    cfg = load_config()
    results = {
        "target": target,
        "target_type": target_type,
        "domain": domain,
    }

    tasks = {}

    if run_all or "dns" in req.modules:
        tasks["dns"] = dns_service.lookup_all(domain)

    if run_all or "whois" in req.modules:
        tasks["whois"] = whois_service.lookup(domain)

    if run_all or "ssl" in req.modules:
        tasks["ssl"] = ssl_service.get_cert_info(domain)

    if run_all or "subdomains" in req.modules:
        max_subs = cfg.get("scan_defaults", {}).get("max_subdomains", 200)
        tasks["subdomains"] = subdomain_service.enumerate(domain, max_subs)

    if run_all or "emails" in req.modules:
        tasks["emails"] = email_service.find_emails(domain)

    if target_type == "email" and (run_all or "breach" in req.modules):
        tasks["breach"] = email_service.check_breach(target)

    # Run all non-IP tasks in parallel
    done = await asyncio.gather(*tasks.values(), return_exceptions=True)
    for key, result in zip(tasks.keys(), done):
        results[key] = result if not isinstance(result, Exception) else {"error": str(result)}

    # Get IP from DNS to run IP-based lookups
    resolved_ip = None
    if results.get("dns") and not results["dns"].get("error"):
        resolved_ip = results["dns"].get("resolved_ip")

    if target_type == "ip":
        resolved_ip = target

    if resolved_ip:
        ip_tasks = {}
        if run_all or "geolocation" in req.modules:
            ip_tasks["geolocation"] = ipinfo_service.lookup(resolved_ip)
        if run_all or "shodan" in req.modules:
            ip_tasks["shodan"] = shodan_service.lookup_ip(resolved_ip)
        if run_all or "virustotal" in req.modules:
            if target_type == "ip":
                ip_tasks["virustotal"] = virustotal_service.analyze_ip(resolved_ip)
            else:
                ip_tasks["virustotal"] = virustotal_service.analyze_domain(domain)
        abuseipdb_key = cfg.get("apis", {}).get("abuseipdb", "")
        if abuseipdb_key and (run_all or "abuseipdb" in req.modules):
            ip_tasks["abuseipdb"] = ipinfo_service.lookup_abuseipdb(resolved_ip, abuseipdb_key)

        ip_done = await asyncio.gather(*ip_tasks.values(), return_exceptions=True)
        for key, result in zip(ip_tasks.keys(), ip_done):
            results[key] = result if not isinstance(result, Exception) else {"error": str(result)}

    elif not resolved_ip and (run_all or "virustotal" in req.modules):
        results["virustotal"] = await virustotal_service.analyze_domain(domain)

    return results


@router.post("/quick")
async def quick_analyze(body: dict):
    target = body.get("target", "")
    domain = extract_domain(target)
    target_type = detect_type(target)

    tasks = {
        "dns": dns_service.lookup_all(domain),
        "whois": whois_service.lookup(domain),
        "ssl": ssl_service.get_cert_info(domain),
    }

    done = await asyncio.gather(*tasks.values(), return_exceptions=True)
    results = {"target": target, "domain": domain, "target_type": target_type}
    for key, result in zip(tasks.keys(), done):
        results[key] = result if not isinstance(result, Exception) else {"error": str(result)}

    ip = results.get("dns", {}).get("resolved_ip")
    if ip:
        results["geolocation"] = await ipinfo_service.lookup(ip)

    return results


@router.get("/detect/{target:path}")
async def detect_target_type(target: str):
    return {"target": target, "type": detect_type(target), "domain": extract_domain(target)}
