"""
B-DEVOPS — Auto Audit Router
Unified endpoint: one input → all applicable OSINT modules in parallel → auto report
Supports: email, IP, domain, phone number, social username, URL
"""

import asyncio
import re
from pathlib import Path
from fastapi import APIRouter
from services import (
    whois_service, dns_service, subdomain_service, ssl_service,
    shodan_service, virustotal_service, ipinfo_service, email_service,
    whatsmyname_service, wayback_service, bgp_service,
    phone_service, email_enrichment_service, report_service,
)
from config_manager import load_config, get_api_key
from services import clickhouse_service

router = APIRouter(prefix="/api/audit", tags=["audit"])


# ── Type detection ────────────────────────────────────────────
def detect_input_type(target: str) -> str:
    t = target.strip()

    # @ prefix → definitely a social username
    if t.startswith('@'):
        return 'username'

    # Email
    if re.match(r'^[\w.+\-]+@[\w.\-]+\.\w{2,}$', t):
        return 'email'

    # IP address
    if re.match(r'^(\d{1,3}\.){3}\d{1,3}$', t):
        return 'ip'

    # Phone: mostly digits + separators, 7-15 digits
    cleaned_phone = re.sub(r'[\s\-\.\(\)\+]', '', t)
    if cleaned_phone.isdigit() and 7 <= len(cleaned_phone) <= 15:
        return 'phone'

    # URL
    if t.lower().startswith(('http://', 'https://')):
        return 'url'

    # Domain: contains a dot and looks like a hostname
    if re.match(r'^([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}$', t):
        return 'domain'

    # Default: treat as social media username
    return 'username'


def extract_domain(target: str, target_type: str) -> str:
    if target_type == 'email':
        return target.split('@')[1].lower()
    if target_type == 'url':
        from urllib.parse import urlparse
        return urlparse(target).netloc.split(':')[0].lower()
    if target_type == 'domain':
        return target.lower().strip()
    return ''


# ── Main audit endpoint ───────────────────────────────────────
@router.post("/full")
async def full_audit(body: dict):
    target = body.get("target", "").strip()
    auto_report = body.get("auto_report", True)

    if not target:
        return {"error": "Target requerido"}

    # Remove @ prefix for username type
    clean_target = target.lstrip('@')
    target_type = detect_input_type(target)
    cfg = load_config()

    result = {
        "target": target,
        "clean_target": clean_target,
        "type": target_type,
        "modules": {},
        "summary": {},
    }

    # ── Run modules based on type ────────────────────────────
    if target_type == "email":
        result["modules"] = await _audit_email(clean_target, cfg)

    elif target_type == "ip":
        result["modules"] = await _audit_ip(clean_target, cfg)

    elif target_type == "domain":
        result["modules"] = await _audit_domain(clean_target, cfg)

    elif target_type == "phone":
        result["modules"] = await _audit_phone(clean_target, cfg)

    elif target_type == "username":
        result["modules"] = await _audit_username(clean_target, cfg)

    elif target_type == "url":
        domain = extract_domain(clean_target, "url")
        result["modules"] = await _audit_domain(domain, cfg)
        # Also scan with URLScan.io if key available
        urlscan_key = get_api_key("urlscan")
        if urlscan_key:
            try:
                from services import urlscan_service
                result["modules"]["urlscan"] = await urlscan_service.scan_and_wait(clean_target)
            except Exception as e:
                result["modules"]["urlscan"] = {"error": str(e)}

    # ── Build summary ────────────────────────────────────────
    result["summary"] = _build_summary(result["modules"], target_type)

    # ── Write to ClickHouse (fire-and-forget, non-blocking) ──
    asyncio.create_task(clickhouse_service.write_audit_result(
        target=target,
        target_type=target_type,
        risk_level=result["summary"].get("risk_level", "BAJO"),
        modules_run=result["summary"].get("modules_run", 0),
        findings=result["summary"].get("total_findings", 0),
        data={"summary": result["summary"], "target": target},
    ))

    # ── Auto-generate report ─────────────────────────────────
    if auto_report:
        try:
            auditor = cfg.get("auditor", {})
            ai_summary = ""
            gemini_key = get_api_key("gemini")
            if gemini_key:
                try:
                    from services import gemini_service
                    ai_summary = await gemini_service.analyze_osint(
                        target=target,
                        data=result["modules"],
                        analysis_type="full_audit"
                    )
                except Exception:
                    pass

            filepath = report_service.generate_osint_report(
                target=target,
                data=result["modules"],
                auditor=auditor,
                ai_summary=ai_summary
            )
            filename = Path(filepath).name
            result["report"] = {"filename": filename, "download_url": f"/api/reports/download/{filename}"}

            # Auto-send email if SMTP enabled
            smtp_cfg = cfg.get("smtp", {})
            if smtp_cfg.get("enabled") and smtp_cfg.get("to"):
                try:
                    from services import smtp_service
                    risk = result["summary"].get("risk_level", "N/A")
                    email_body = (
                        f"Auditoría completada para: {target}\n"
                        f"Tipo detectado: {target_type}\n"
                        f"Nivel de riesgo: {risk}\n"
                        f"Módulos ejecutados: {result['summary'].get('modules_run', 0)}\n"
                        f"Hallazgos: {result['summary'].get('total_findings', 0)}\n\n"
                        f"Informe DOCX completo adjunto."
                    )
                    email_result = await smtp_service.send_report_email(
                        to_email=smtp_cfg["to"],
                        subject=f"B-DEVOPS — Auditoría {target} [{risk}]",
                        docx_path=filepath,
                        body_text=email_body,
                    )
                    result["email"] = email_result
                except Exception as e:
                    result["email"] = {"status": "error", "message": str(e)}

        except Exception as e:
            result["report"] = {"error": str(e)}

    return result


# ── Webhook for n8n / automation ─────────────────────────────
@router.post("/webhook")
async def webhook_audit(body: dict):
    """
    n8n / Zapier webhook — POST { target, auto_report, callback_url }
    Returns full audit result synchronously.
    If callback_url is provided, result is POSTed there too.
    """
    target = body.get("target", "").strip()
    callback_url = body.get("callback_url")

    result = await full_audit({"target": target, "auto_report": body.get("auto_report", True)})

    if callback_url:
        try:
            import httpx as _httpx
            async with _httpx.AsyncClient(timeout=15) as client:
                await client.post(callback_url, json=result)
        except Exception:
            pass

    return result


# ── Detect type only ──────────────────────────────────────────
@router.post("/detect")
async def detect(body: dict):
    target = body.get("target", "").strip()
    t = detect_input_type(target)
    labels = {
        "email": "📧 Email", "ip": "🌐 IP", "domain": "🔗 Dominio",
        "phone": "📱 Teléfono", "username": "👤 Usuario / Red Social", "url": "🔗 URL"
    }
    return {"target": target, "type": t, "label": labels.get(t, t)}


# ── Email audit ───────────────────────────────────────────────
async def _audit_email(email: str, cfg: dict) -> dict:
    domain = email.split('@')[1] if '@' in email else ''
    username = email.split('@')[0] if '@' in email else email

    tasks = {
        "email_enrichment": email_enrichment_service.enrich_email(email),
        "breach_check": email_service.check_breach(email),
        "email_finder": email_service.find_emails(domain) if domain else _noop({}),
    }

    if domain:
        tasks.update({
            "dns": dns_service.lookup_all(domain),
            "whois": whois_service.lookup(domain),
            "ssl": ssl_service.get_cert_info(domain),
            "subdomains": subdomain_service.enumerate(domain, 50),
        })

    # WhatsMyName on the email username
    tasks["social_username"] = whatsmyname_service.search_username(username, limit=100)

    done = await asyncio.gather(*tasks.values(), return_exceptions=True)
    results = {}
    for key, val in zip(tasks.keys(), done):
        results[key] = val if not isinstance(val, Exception) else {"error": str(val)}

    # If domain resolved to IP, run IP lookups
    resolved_ip = results.get("dns", {}).get("resolved_ip")
    if resolved_ip:
        ip_tasks = {
            "geolocation": ipinfo_service.lookup(resolved_ip),
            "shodan": shodan_service.lookup_ip(resolved_ip),
        }
        ip_done = await asyncio.gather(*ip_tasks.values(), return_exceptions=True)
        for key, val in zip(ip_tasks.keys(), ip_done):
            results[key] = val if not isinstance(val, Exception) else {"error": str(val)}

    return results


# ── IP audit ─────────────────────────────────────────────────
async def _audit_ip(ip: str, cfg: dict) -> dict:
    tasks = {
        "geolocation": ipinfo_service.lookup(ip),
        "shodan": shodan_service.lookup_ip(ip),
        "virustotal": virustotal_service.analyze_ip(ip),
        "bgp": bgp_service.lookup_ip(ip),
        "wayback": wayback_service.check_availability(ip),
    }

    abuseipdb_key = cfg.get("apis", {}).get("abuseipdb", "")
    if abuseipdb_key:
        tasks["abuseipdb"] = ipinfo_service.lookup_abuseipdb(ip, abuseipdb_key)

    censys_id = cfg.get("apis", {}).get("censys_id", "")
    censys_secret = cfg.get("apis", {}).get("censys_secret", "")
    if censys_id and censys_secret:
        from services import censys_service
        tasks["censys"] = censys_service.search_ip(ip)

    st_key = cfg.get("apis", {}).get("securitytrails", "")
    if st_key:
        from services import securitytrails_service
        tasks["securitytrails"] = securitytrails_service.get_domain_info(ip)

    done = await asyncio.gather(*tasks.values(), return_exceptions=True)
    results = {}
    for key, val in zip(tasks.keys(), done):
        results[key] = val if not isinstance(val, Exception) else {"error": str(val)}

    return results


# ── Domain audit ─────────────────────────────────────────────
async def _audit_domain(domain: str, cfg: dict) -> dict:
    tasks = {
        "dns": dns_service.lookup_all(domain),
        "whois": whois_service.lookup(domain),
        "ssl": ssl_service.get_cert_info(domain),
        "subdomains": subdomain_service.enumerate(domain, 100),
        "emails": email_service.find_emails(domain),
        "wayback": wayback_service.get_snapshots(domain, limit=10),
        "virustotal": virustotal_service.analyze_domain(domain),
    }

    st_key = cfg.get("apis", {}).get("securitytrails", "")
    if st_key:
        from services import securitytrails_service
        tasks["securitytrails_domain"] = securitytrails_service.get_domain_info(domain)
        tasks["securitytrails_subs"] = securitytrails_service.get_subdomains(domain)

    urlscan_key = cfg.get("apis", {}).get("urlscan", "")
    if urlscan_key:
        from services import urlscan_service
        tasks["urlscan_history"] = urlscan_service.search_domain(domain, size=5)

    done = await asyncio.gather(*tasks.values(), return_exceptions=True)
    results = {}
    for key, val in zip(tasks.keys(), done):
        results[key] = val if not isinstance(val, Exception) else {"error": str(val)}

    # IP-based lookups using resolved IP from DNS
    resolved_ip = results.get("dns", {}).get("resolved_ip")
    if resolved_ip:
        ip_tasks = {
            "geolocation": ipinfo_service.lookup(resolved_ip),
            "shodan": shodan_service.lookup_ip(resolved_ip),
            "bgp": bgp_service.lookup_ip(resolved_ip),
        }
        abuseipdb_key = cfg.get("apis", {}).get("abuseipdb", "")
        if abuseipdb_key:
            ip_tasks["abuseipdb"] = ipinfo_service.lookup_abuseipdb(resolved_ip, abuseipdb_key)

        ip_done = await asyncio.gather(*ip_tasks.values(), return_exceptions=True)
        for key, val in zip(ip_tasks.keys(), ip_done):
            results[key] = val if not isinstance(val, Exception) else {"error": str(val)}

    return results


# ── Phone audit ───────────────────────────────────────────────
async def _audit_phone(phone: str, cfg: dict) -> dict:
    tasks = {
        "phone_lookup": phone_service.lookup_phone(phone),
    }

    dehashed_key = cfg.get("apis", {}).get("dehashed", "")
    if dehashed_key:
        from services import dehashed_service
        tasks["breach_check"] = dehashed_service.search(query=phone, query_type="phone", size=10)

    done = await asyncio.gather(*tasks.values(), return_exceptions=True)
    results = {}
    for key, val in zip(tasks.keys(), done):
        results[key] = val if not isinstance(val, Exception) else {"error": str(val)}

    return results


# ── Username / Social audit ───────────────────────────────────
async def _audit_username(username: str, cfg: dict) -> dict:
    tasks = {
        "social_presence": whatsmyname_service.search_username(username, limit=150),
    }

    # Check if it could also be an email username — enrich with gravatar
    fake_email = f"{username}@gmail.com"
    tasks["gravatar_gmail"] = email_enrichment_service._check_gravatar(fake_email)

    dehashed_key = cfg.get("apis", {}).get("dehashed", "")
    if dehashed_key:
        from services import dehashed_service
        tasks["breach_username"] = dehashed_service.search(query=username, query_type="username", size=10)

    done = await asyncio.gather(*tasks.values(), return_exceptions=True)
    results = {}
    for key, val in zip(tasks.keys(), done):
        results[key] = val if not isinstance(val, Exception) else {"error": str(val)}

    return results


# ── Summary builder ───────────────────────────────────────────
def _build_summary(modules: dict, target_type: str) -> dict:
    summary = {"risk_level": "BAJO", "findings": [], "stats": {}}
    findings = []

    # Check for breaches
    breach = modules.get("breach_check", {})
    if breach.get("pwned") or breach.get("found") or (breach.get("total", 0) > 0):
        findings.append({"severity": "CRÍTICO", "text": f"Credenciales filtradas en {breach.get('total', '?')} brechas de seguridad"})

    # Check virustotal
    vt = modules.get("virustotal", {})
    malicious = vt.get("malicious_count", 0) or vt.get("stats", {}).get("malicious", 0)
    if malicious and malicious > 0:
        findings.append({"severity": "ALTO", "text": f"VirusTotal: {malicious} motores lo marcan como malicioso"})

    # Check shodan
    shodan = modules.get("shodan", {})
    vulns = shodan.get("vulnerabilities", [])
    if vulns:
        findings.append({"severity": "ALTO", "text": f"Shodan: {len(vulns)} vulnerabilidades detectadas ({', '.join(vulns[:3])})"})
    open_ports = shodan.get("open_ports", [])
    if open_ports:
        findings.append({"severity": "MEDIO", "text": f"Puertos expuestos en Internet: {', '.join(str(p) for p in open_ports[:8])}"})

    # Check SSL
    ssl_data = modules.get("ssl", {})
    if ssl_data.get("days_until_expiry") is not None and ssl_data.get("days_until_expiry", 999) < 30:
        findings.append({"severity": "MEDIO", "text": f"Certificado SSL expira en {ssl_data['days_until_expiry']} días"})

    # Check social presence
    social = modules.get("social_presence", {})
    if social.get("total_found", 0) > 0:
        findings.append({"severity": "INFO", "text": f"Presencia en redes sociales: {social['total_found']} perfiles encontrados"})

    # Check subdomains
    subs = modules.get("subdomains", {})
    if subs.get("total", 0) > 0:
        findings.append({"severity": "INFO", "text": f"Subdominios encontrados: {subs['total']}"})

    # Check email enrichment
    enrichment = modules.get("email_enrichment", {})
    rep = enrichment.get("reputation", {})
    if rep.get("suspicious"):
        findings.append({"severity": "ALTO", "text": "Email marcado como sospechoso por EmailRep.io"})
    if rep.get("malicious_activity"):
        findings.append({"severity": "CRÍTICO", "text": "Email asociado a actividad maliciosa"})
    if enrichment.get("gravatar", {}).get("has_account"):
        findings.append({"severity": "INFO", "text": "Perfil Gravatar encontrado (foto de perfil + datos personales)"})

    # Phone
    phone = modules.get("phone_lookup", {})
    if phone.get("valid") is False:
        findings.append({"severity": "INFO", "text": "Número de teléfono no válido o formato incorrecto"})
    elif phone.get("number_type"):
        findings.append({"severity": "INFO", "text": f"Teléfono {phone.get('number_type')} — {phone.get('country', '')} {phone.get('carrier_name', '')}"})

    # BGP/ASN
    bgp = modules.get("bgp", {})
    if bgp.get("prefixes"):
        p = bgp["prefixes"][0]
        findings.append({"severity": "INFO", "text": f"Red: AS{p.get('asn')} {p.get('asn_name', '')} ({p.get('country', '')})"})

    # Determine risk level
    severities = [f["severity"] for f in findings]
    if "CRÍTICO" in severities:
        summary["risk_level"] = "CRÍTICO"
    elif "ALTO" in severities:
        summary["risk_level"] = "ALTO"
    elif "MEDIO" in severities:
        summary["risk_level"] = "MEDIO"
    else:
        summary["risk_level"] = "BAJO"

    summary["findings"] = findings
    summary["total_findings"] = len(findings)
    summary["modules_run"] = len(modules)

    return summary


async def _noop(val):
    return val
