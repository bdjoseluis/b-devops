import google.generativeai as genai
from config_manager import get_api_key

_model = None
_chat_sessions: dict = {}


def _get_model():
    global _model
    key = get_api_key("gemini")
    if not key:
        return None
    if _model is None:
        genai.configure(api_key=key)
        _model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=(
                "Eres AURA, un asistente experto en ciberseguridad, OSINT y auditoría. "
                "Respondes siempre en español. Eres directo, técnico y conciso. "
                "Cuando el usuario te da datos de un escaneo o OSINT, los analizas e identifies riesgos, "
                "recomiendas pasos siguientes y explicas hallazgos críticos. "
                "Nunca generas contenido ilegal. Solo apoyas auditorías autorizadas."
            )
        )
    return _model


def _refresh_model():
    global _model
    _model = None
    return _get_model()


async def analyze_osint(target: str, osint_data: dict) -> str:
    model = _get_model()
    if not model:
        return "Error: Gemini API key not configured. Add it in Settings."

    summary = _build_osint_summary(target, osint_data)
    prompt = (
        f"Analiza este resultado OSINT para el objetivo: {target}\n\n"
        f"{summary}\n\n"
        "Proporciona:\n"
        "1. Nivel de riesgo (CRÍTICO/ALTO/MEDIO/BAJO)\n"
        "2. Hallazgos principales (máximo 5)\n"
        "3. Vectores de ataque potenciales\n"
        "4. Próximos pasos recomendados\n"
        "5. Score de exposición del 0 al 10"
    )

    try:
        response = await model.generate_content_async(prompt)
        return response.text
    except Exception as e:
        # Retry with fresh model in case key changed
        try:
            model = _refresh_model()
            if not model:
                return f"Error: {e}"
            response = await model.generate_content_async(prompt)
            return response.text
        except Exception as e2:
            return f"Error Gemini: {e2}"


async def chat(session_id: str, message: str, context: dict = None) -> str:
    model = _get_model()
    if not model:
        return "Error: Gemini API key not configured. Add it in Settings."

    if session_id not in _chat_sessions:
        _chat_sessions[session_id] = model.start_chat(history=[])

    chat_session = _chat_sessions[session_id]

    if context:
        context_str = _build_context_str(context)
        full_message = f"Contexto actual:\n{context_str}\n\nUsuario: {message}"
    else:
        full_message = message

    try:
        response = await chat_session.send_message_async(full_message)
        return response.text
    except Exception as e:
        return f"Error Gemini: {e}"


async def analyze_scan(target: str, scan_data: dict) -> str:
    model = _get_model()
    if not model:
        return "Error: Gemini API key not configured."

    ports_summary = []
    for host in scan_data.get("hosts", []):
        for p in host.get("ports", []):
            ports_summary.append(f"  - {p['port']}/{p['protocol']} {p.get('service','')} {p.get('product','')} {p.get('version','')}")

    prompt = (
        f"Análisis de escaneo nmap para: {target}\n"
        f"Puertos abiertos encontrados:\n" + "\n".join(ports_summary[:30]) + "\n\n"
        "Analiza:\n"
        "1. Servicios expuestos y su riesgo\n"
        "2. Vulnerabilidades comunes asociadas a estos servicios\n"
        "3. Recomendaciones de hardening\n"
        "4. Prioridad de acción (qué revisar primero)"
    )

    try:
        response = await model.generate_content_async(prompt)
        return response.text
    except Exception as e:
        return f"Error Gemini: {e}"


async def generate_report_summary(target: str, all_data: dict) -> str:
    model = _get_model()
    if not model:
        return "Gemini API key no configurada."

    summary = _build_full_summary(target, all_data)
    prompt = (
        f"Genera un resumen ejecutivo profesional para el reporte de auditoría OSINT de: {target}\n\n"
        f"Datos recopilados:\n{summary}\n\n"
        "El resumen debe incluir:\n"
        "- Descripción del objetivo\n"
        "- Principales hallazgos de seguridad\n"
        "- Nivel de riesgo global\n"
        "- Recomendaciones prioritarias\n"
        "Máximo 300 palabras. Tono profesional y técnico."
    )

    try:
        response = await model.generate_content_async(prompt)
        return response.text
    except Exception as e:
        return f"Error generando resumen: {e}"


def clear_session(session_id: str):
    _chat_sessions.pop(session_id, None)


def _build_osint_summary(target: str, data: dict) -> str:
    parts = []
    if data.get("dns"):
        dns = data["dns"]
        parts.append(f"DNS: IP={dns.get('resolved_ip')}, MX={dns.get('MX')}, SPF={dns.get('SPF')}")
    if data.get("whois"):
        w = data["whois"]
        parts.append(f"WHOIS: Registrar={w.get('registrar')}, Creado={w.get('creation_date')}, Exp={w.get('expiration_date')}")
    if data.get("shodan"):
        s = data["shodan"]
        if not s.get("error"):
            parts.append(f"Shodan: Puertos={s.get('open_ports')}, Org={s.get('org')}, Vulns={s.get('vulnerabilities')}")
    if data.get("virustotal"):
        vt = data["virustotal"]
        if not vt.get("error"):
            parts.append(f"VirusTotal: Malicioso={vt.get('malicious')}, Sospechoso={vt.get('suspicious')}")
    if data.get("subdomains"):
        sub = data["subdomains"]
        parts.append(f"Subdominios: {sub.get('total')} encontrados")
    if data.get("ssl"):
        ssl_info = data["ssl"]
        if not ssl_info.get("error"):
            parts.append(f"SSL: Expira={ssl_info.get('not_after')}, Días restantes={ssl_info.get('days_until_expiry')}")
    return "\n".join(parts) if parts else "Sin datos disponibles"


def _build_context_str(context: dict) -> str:
    lines = []
    if context.get("target"):
        lines.append(f"Objetivo: {context['target']}")
    if context.get("last_scan"):
        lines.append(f"Último escaneo: {context['last_scan']}")
    if context.get("open_ports"):
        lines.append(f"Puertos abiertos: {context['open_ports']}")
    return "\n".join(lines) if lines else ""


def _build_full_summary(target: str, data: dict) -> str:
    parts = [f"Objetivo: {target}"]
    for key, val in data.items():
        if isinstance(val, dict) and not val.get("error"):
            parts.append(f"\n[{key.upper()}]")
            for k, v in val.items():
                if v and not isinstance(v, (dict, list)):
                    parts.append(f"  {k}: {v}")
                elif isinstance(v, list) and v:
                    parts.append(f"  {k}: {str(v)[:150]}")
    return "\n".join(parts)
