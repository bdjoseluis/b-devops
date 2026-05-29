from fpdf import FPDF, XPos, YPos
from datetime import datetime
from pathlib import Path
import socket
import unicodedata


def _clean(text: str, max_len: int = 200) -> str:
    """Eliminar caracteres fuera de Latin-1 y truncar."""
    if not text:
        return ""
    # Normalizar: reemplazar em-dash, en-dash, comillas especiales, etc.
    replacements = {
        '—': '-', '–': '-', '‒': '-',
        '“': '"', '”': '"', '‘': "'", '’': "'",
        '…': '...', '·': '·', '•': '-',
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
        'ñ': 'n', 'Ñ': 'N', 'ü': 'u', 'Ü': 'U',
    }
    for orig, repl in replacements.items():
        text = text.replace(orig, repl)
    # Quitar cualquier char restante fuera de Latin-1
    text = text.encode('latin-1', errors='replace').decode('latin-1')
    return text[:max_len]

REPORTS_DIR = Path(__file__).parent.parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

# ─── Colores AURA OPS ──────────────────────────────────────────────────────────
CRIMSON    = (230, 57,  70)
DARK_TEXT  = (20,  20,  40)
MID_GRAY   = (100, 100, 120)
LIGHT_BG   = (245, 245, 250)
WHITE      = (255, 255, 255)
BLACK      = (0,   0,   0)
RISK_CRIT  = (220, 38,  38)
RISK_HIGH  = (234, 88,  12)
RISK_MED   = (161, 98,  7)
RISK_LOW   = (22,  163, 74)


class AuraPDF(FPDF):
    """PDF personalizado con header/footer de AURA OPS."""

    def __init__(self, target: str, auditor: dict):
        super().__init__()
        self.target   = target
        self.auditor  = auditor
        self.set_margins(20, 25, 20)
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        # Línea roja superior
        self.set_draw_color(*CRIMSON)
        self.set_line_width(0.8)
        self.line(10, 10, 200, 10)
        # Logo / nombre
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*CRIMSON)
        self.set_xy(10, 12)
        self.cell(0, 6, "AURA OPS - Ciberinteligencia Automatizada", align="L")
        # Target a la derecha
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*MID_GRAY)
        self.set_xy(10, 12)
        self.cell(0, 6, f"Objetivo: {self.target}", align="R")
        self.ln(8)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(*MID_GRAY)
        self.set_draw_color(*CRIMSON)
        self.set_line_width(0.4)
        self.line(10, self.get_y() - 2, 200, self.get_y() - 2)
        self.cell(0, 8, f"AURA OPS  |  Pagina {self.page_no()}  |  Generado el {datetime.now().strftime('%Y-%m-%d %H:%M')}  |  Confidencial", align="C")

    # ── Auto-sanitize all text output ─────────────────────────────────────────

    def cell(self, w, h=0, text="", *args, **kwargs):
        return super().cell(w, h, _clean(str(text)), *args, **kwargs)

    def multi_cell(self, w, h=0, text="", *args, **kwargs):
        return super().multi_cell(w, h, _clean(str(text), 2000), *args, **kwargs)

    # ── Helpers de estilo ──────────────────────────────────────────────────────

    def section_title(self, text: str):
        """Título de sección con barra roja a la izquierda."""
        self.ln(4)
        x, y = self.get_x(), self.get_y()
        self.set_fill_color(*CRIMSON)
        self.rect(x, y, 3, 7, "F")
        self.set_xy(x + 6, y)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*DARK_TEXT)
        self.cell(0, 7, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2)

    def kv_table(self, rows: list[tuple[str, str]]):
        """Tabla de dos columnas: clave -> valor."""
        col_w = [55, 115]
        for label, value in rows:
            if not value or value == "N/A":
                continue
            # Fondo alternado
            self.set_fill_color(*LIGHT_BG)
            self.set_draw_color(220, 220, 225)
            self.set_line_width(0.2)
            # Clave
            self.set_font("Helvetica", "B", 8)
            self.set_text_color(*DARK_TEXT)
            self.cell(col_w[0], 6, _clean(str(label), 40), border=1, fill=True)
            # Valor
            self.set_font("Helvetica", "", 8)
            self.set_text_color(40, 40, 60)
            self.cell(col_w[1], 6, _clean(str(value), 160), border=1, fill=False,
                      new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2)

    def wide_table(self, headers: list[str], rows: list[list[str]], col_widths: list[int] | None = None):
        """Tabla con cabecera roja y filas alternadas."""
        if not rows:
            return
        n = len(headers)
        if col_widths is None:
            total = 170
            col_widths = [total // n] * n

        # Cabecera
        self.set_fill_color(*CRIMSON)
        self.set_text_color(*WHITE)
        self.set_font("Helvetica", "B", 8)
        self.set_draw_color(*CRIMSON)
        self.set_line_width(0.2)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 6, h, border=1, fill=True)
        self.ln()

        # Filas
        self.set_font("Helvetica", "", 8)
        self.set_draw_color(210, 210, 215)
        for idx, row in enumerate(rows):
            if self.get_y() > 265:
                self.add_page()
            fill = idx % 2 == 0
            self.set_fill_color(*LIGHT_BG if fill else WHITE)
            self.set_text_color(30, 30, 50)
            for i, cell in enumerate(row):
                self.cell(col_widths[i], 5.5, str(cell)[:60], border=1, fill=fill)
            self.ln()
        self.ln(3)

    def info_box(self, text: str):
        """Caja de texto informativa con fondo gris claro."""
        self.set_fill_color(*LIGHT_BG)
        self.set_draw_color(210, 210, 220)
        self.set_line_width(0.3)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(50, 50, 70)
        self.multi_cell(0, 5, text, border=1, fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(3)

    def risk_badge(self, level: str) -> tuple:
        colors = {
            "CRÍTICO": RISK_CRIT,
            "ALTO":    RISK_HIGH,
            "MEDIO":   RISK_MED,
            "BAJO":    RISK_LOW,
        }
        return colors.get(level.upper(), MID_GRAY)


# ─── Función pública ───────────────────────────────────────────────────────────

def generate_osint_report(target: str, data: dict, auditor: dict, ai_summary: str = "") -> str:
    pdf = AuraPDF(target=target, auditor=auditor)
    pdf.add_page()

    _cover_page(pdf, target, auditor)
    pdf.add_page()
    _executive_summary(pdf, ai_summary, target, data)
    _target_info(pdf, target, data)

    if data.get("dns") and not data["dns"].get("error"):
        _dns_section(pdf, data["dns"])
    if data.get("whois") and not data["whois"].get("error"):
        _whois_section(pdf, data["whois"])
    if data.get("ssl") and not data["ssl"].get("error"):
        _ssl_section(pdf, data["ssl"])
    if data.get("subdomains"):
        _subdomain_section(pdf, data["subdomains"])
    if data.get("shodan") and not data["shodan"].get("error"):
        _shodan_section(pdf, data["shodan"])
    if data.get("virustotal") and not data["virustotal"].get("error"):
        _virustotal_section(pdf, data["virustotal"])
    if data.get("emails") and not data.get("emails", {}).get("error"):
        _email_section(pdf, data["emails"])

    _risk_matrix(pdf, data)
    _recommendations(pdf, data)
    _footer_signature(pdf, auditor)

    timestamp  = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_tgt   = target.replace(".", "_").replace("/", "_").replace(":", "_")
    filename   = f"AURA_OSINT_{safe_tgt}_{timestamp}.pdf"
    filepath   = REPORTS_DIR / filename
    pdf.output(str(filepath))
    return str(filepath)


# ─── Secciones internas ────────────────────────────────────────────────────────

def _cover_page(pdf: AuraPDF, target: str, auditor: dict):
    """Portada completa en primera página."""
    # Rectángulo decorativo superior
    pdf.set_fill_color(*CRIMSON)
    pdf.rect(0, 0, 210, 55, "F")

    pdf.set_font("Helvetica", "B", 32)
    pdf.set_text_color(*WHITE)
    pdf.set_xy(0, 12)
    pdf.cell(210, 14, "AURA OPS", align="C")

    pdf.set_font("Helvetica", "", 13)
    pdf.set_xy(0, 28)
    pdf.cell(210, 8, "Sistema de Ciberinteligencia Automatizada", align="C")

    pdf.ln(36)

    # Subtítulo del reporte
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*DARK_TEXT)
    pdf.cell(0, 10, "REPORTE DE INTELIGENCIA OSINT", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*MID_GRAY)
    pdf.cell(0, 7, f"Objetivo: {target}", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(8)

    # Tabla de metadatos
    try:
        local_ip = socket.gethostbyname(socket.gethostname())
    except Exception:
        local_ip = "N/A"

    pdf.kv_table([
        ("Fecha de Generación",   datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        ("IP del Auditor",        local_ip),
        ("Auditor a Cargo",       auditor.get("name", "N/A")),
        ("Empresa",               auditor.get("company", "N/A")),
        ("Jurisdicción Aplicada", auditor.get("jurisdiction", "COBERTURA GLOBAL")),
        ("Clasificación",         "CONFIDENCIAL — USO EXCLUSIVO CLIENTE"),
    ])

    # Aviso legal
    pdf.ln(6)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(*MID_GRAY)
    pdf.multi_cell(0, 4,
        "AVISO LEGAL: Este informe ha sido generado con fines de auditoría de seguridad autorizada. "
        "La información contenida es confidencial y solo debe ser utilizada por el destinatario. "
        "Queda prohibida su reproducción o distribución sin consentimiento expreso.", align="J")


def _executive_summary(pdf: AuraPDF, ai_text: str, target: str, data: dict):
    pdf.section_title("Resumen Ejecutivo")
    text = ai_text if ai_text else (
        f"Reporte OSINT generado automáticamente por AURA OPS para el objetivo: {target}. "
        "Se han recopilado y correlacionado datos de múltiples fuentes de inteligencia open-source "
        "incluyendo DNS, WHOIS, SSL/TLS, Shodan, VirusTotal y subdominios."
    )
    pdf.info_box(text)


def _target_info(pdf: AuraPDF, target: str, data: dict):
    pdf.section_title("Información del Objetivo")
    dns = data.get("dns", {})
    geo = data.get("geolocation", {}) or {}
    rows = [
        ("Objetivo",        target),
        ("IP Resuelta",     dns.get("resolved_ip", "N/A")),
        ("Hostname (PTR)",  dns.get("PTR", "N/A")),
    ]
    if geo and not geo.get("error"):
        rows += [
            ("País",   geo.get("country", "N/A")),
            ("Ciudad", geo.get("city",    "N/A")),
            ("ISP/Org",geo.get("org",     "N/A")),
        ]
    pdf.kv_table(rows)


def _dns_section(pdf: AuraPDF, dns: dict):
    pdf.section_title("Registros DNS")
    rows = []
    for rtype in ["A", "AAAA", "MX", "NS", "TXT", "SPF", "DMARC"]:
        val = dns.get(rtype)
        if val:
            if isinstance(val, list):
                txt = ", ".join(
                    f"{r['exchange']}({r['priority']})" if rtype == "MX" else str(v)
                    for r, v in [(x, x) for x in val[:5]]
                )
                # Simplify
                if rtype == "MX":
                    txt = ", ".join(f"{r['exchange']}({r['priority']})" for r in val[:5])
                else:
                    txt = ", ".join(str(v) for v in val[:5])
            else:
                txt = str(val)[:200]
            rows.append((rtype, txt))
    pdf.kv_table(rows)


def _whois_section(pdf: AuraPDF, whois: dict):
    pdf.section_title("Información WHOIS")
    rows = [
        ("Registrar",    whois.get("registrar")),
        ("Creación",     str(whois.get("creation_date", ""))[:40]),
        ("Expiración",   str(whois.get("expiration_date", ""))[:40]),
        ("Organización", whois.get("org")),
        ("País",         whois.get("country")),
        ("DNSSEC",       str(whois.get("dnssec", ""))),
    ]
    pdf.kv_table([(l, v) for l, v in rows if v])


def _ssl_section(pdf: AuraPDF, ssl_info: dict):
    pdf.section_title("Certificado SSL/TLS")
    days = ssl_info.get("days_until_expiry")
    if days is not None:
        status = "EXPIRADO" if days < 0 else ("PRÓXIMO A EXPIRAR" if days <= 30 else "VÁLIDO")
        status_str = f"{status} ({days} días restantes)"
    else:
        status_str = "N/A"
    san = ssl_info.get("san", [])
    rows = [
        ("Sujeto (CN)",   ssl_info.get("subject")),
        ("Emisor",        ssl_info.get("issuer_org")),
        ("Válido hasta",  ssl_info.get("not_after")),
        ("Estado",        status_str),
        ("SANs",          ", ".join(san[:10]) if san else None),
    ]
    pdf.kv_table([(l, v) for l, v in rows if v])


def _subdomain_section(pdf: AuraPDF, subs: dict):
    total = subs.get("total", 0)
    pdf.section_title(f"Subdominios ({total} encontrados)")
    resolved = subs.get("resolved", [])
    active   = [r for r in resolved if r.get("status") == "active"]
    if active:
        pdf.wide_table(
            ["Subdominio", "IP"],
            [[r.get("subdomain", ""), r.get("ip", "N/A") or "N/A"] for r in active[:60]],
            col_widths=[110, 60],
        )
    else:
        all_subs = subs.get("subdomains", [])[:50]
        pdf.info_box(", ".join(all_subs))


def _shodan_section(pdf: AuraPDF, shodan: dict):
    pdf.section_title("Exposición Shodan")
    ports = shodan.get("open_ports", [])
    vulns = shodan.get("vulnerabilities", [])
    pdf.kv_table([
        ("Organización",     shodan.get("org")),
        ("ISP",              shodan.get("isp")),
        ("País",             shodan.get("country")),
        ("ASN",              shodan.get("asn")),
        ("Sistema Operativo",shodan.get("os")),
        ("Puertos Abiertos", str(ports)[:200] if ports else None),
        ("CVEs Detectados",  ", ".join(vulns[:20]) if vulns else None),
    ])

    services = shodan.get("services", [])
    if services:
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*DARK_TEXT)
        pdf.cell(0, 5, "Servicios Expuestos:", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.wide_table(
            ["Puerto/Proto", "Servicio", "Versión"],
            [
                [f"{s.get('port')}/{s.get('transport','tcp')}",
                 s.get("product", s.get("service", "")),
                 s.get("version", "")]
                for s in services[:25]
            ],
            col_widths=[40, 80, 50],
        )


def _virustotal_section(pdf: AuraPDF, vt: dict):
    pdf.section_title("Reputación VirusTotal")
    cats = vt.get("categories", {})
    rows = [
        ("Detecciones Maliciosas", str(vt.get("malicious", 0))),
        ("Sospechosas",            str(vt.get("suspicious", 0))),
        ("Limpias",                str(vt.get("harmless", 0))),
        ("Reputación Score",       str(vt.get("reputation", 0))),
    ]
    if cats:
        rows.append(("Categorías", ", ".join(f"{k}: {v}" for k, v in list(cats.items())[:5])))
    pdf.kv_table(rows)


def _email_section(pdf: AuraPDF, emails: dict):
    found = emails.get("emails", [])
    if not found:
        return
    pdf.section_title(f"Emails Corporativos ({len(found)} encontrados)")
    pdf.wide_table(
        ["Email", "Nombre", "Cargo"],
        [
            [e.get("email", ""),
             f"{e.get('first_name','')} {e.get('last_name','')}".strip(),
             e.get("position", "")]
            for e in found[:35]
        ],
        col_widths=[75, 55, 40],
    )


def _risk_matrix(pdf: AuraPDF, data: dict):
    pdf.section_title("Matriz de Riesgo")
    risks = _calculate_risks(data)

    # Header
    pdf.set_fill_color(*CRIMSON)
    pdf.set_text_color(*WHITE)
    pdf.set_font("Helvetica", "B", 8)
    for h, w in [("Categoría", 55), ("Nivel", 30), ("Hallazgo", 85)]:
        pdf.cell(w, 6, h, border=1, fill=True)
    pdf.ln()

    pdf.set_font("Helvetica", "", 8)
    for idx, r in enumerate(risks):
        fill = idx % 2 == 0
        pdf.set_fill_color(*(LIGHT_BG if fill else WHITE))
        pdf.set_text_color(*DARK_TEXT)
        pdf.cell(55, 5.5, r["category"], border=1, fill=fill)
        # Nivel con color
        level_color = pdf.risk_badge(r["level"])
        pdf.set_text_color(*level_color)
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(30, 5.5, r["level"], border=1, fill=fill)
        pdf.set_text_color(*DARK_TEXT)
        pdf.set_font("Helvetica", "", 8)
        pdf.cell(85, 5.5, r["finding"][:80], border=1, fill=fill, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(3)


def _recommendations(pdf: AuraPDF, data: dict):
    pdf.section_title("Recomendaciones")
    recs = _build_recommendations(data)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*DARK_TEXT)
    for i, rec in enumerate(recs, 1):
        pdf.set_x(pdf.l_margin + 4)
        pdf.cell(6, 5.5, f"{i}.", border=0)
        pdf.multi_cell(0, 5.5, rec, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)


def _footer_signature(pdf: AuraPDF, auditor: dict):
    pdf.add_page()
    # Rectángulo inferior
    pdf.set_fill_color(*CRIMSON)
    pdf.rect(0, 240, 210, 60, "F")

    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*DARK_TEXT)
    pdf.set_xy(20, 50)
    pdf.cell(0, 9, "Firma y Conformidad", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_x(20)
    pdf.multi_cell(0, 5.5,
        f"Auditor:  {auditor.get('name', 'N/A')}\n"
        f"Empresa:  {auditor.get('company', 'N/A')}\n"
        f"Email:    {auditor.get('email', 'N/A')}\n"
        f"Fecha:    {datetime.now().strftime('%Y-%m-%d')}")

    pdf.ln(10)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_x(20)
    pdf.cell(80, 6, "Firma del Auditor:", border=0)
    pdf.cell(80, 6, "Firma del Cliente:", border=0, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)
    pdf.set_x(20)
    pdf.set_draw_color(*DARK_TEXT)
    pdf.cell(80, 10, "", border="B")
    pdf.cell(10)
    pdf.cell(80, 10, "", border="B", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_xy(20, 250)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*WHITE)
    pdf.cell(0, 10, "AURA OPS — Sistema de Ciberinteligencia Automatizada", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_xy(20, 264)
    pdf.cell(0, 5, "Este informe es CONFIDENCIAL. Uso exclusivo del destinatario autorizado.")


# ─── Cálculos de riesgo ────────────────────────────────────────────────────────

def _calculate_risks(data: dict) -> list[dict]:
    risks = []
    vt = data.get("virustotal", {})
    if vt.get("malicious", 0) > 0:
        risks.append({"category": "Reputación", "level": "CRÍTICO", "finding": f"{vt['malicious']} motores detectan amenaza activa"})
    elif vt.get("suspicious", 0) > 0:
        risks.append({"category": "Reputación", "level": "ALTO", "finding": "Comportamiento sospechoso detectado en VirusTotal"})

    shodan = data.get("shodan", {})
    if shodan.get("vulnerabilities"):
        risks.append({"category": "Vulnerabilidades", "level": "CRÍTICO", "finding": f"CVEs: {', '.join(shodan['vulnerabilities'][:5])}"})
    if shodan.get("open_ports") and len(shodan.get("open_ports", [])) > 10:
        risks.append({"category": "Superficie de Ataque", "level": "ALTO", "finding": f"{len(shodan['open_ports'])} puertos públicamente expuestos"})

    ssl = data.get("ssl", {})
    if ssl.get("expired"):
        risks.append({"category": "SSL/TLS", "level": "CRÍTICO", "finding": "Certificado SSL expirado — tráfico no cifrado"})
    elif ssl.get("expiring_soon"):
        risks.append({"category": "SSL/TLS", "level": "MEDIO", "finding": f"Certificado expira en {ssl.get('days_until_expiry')} días"})

    dns = data.get("dns", {})
    if not dns.get("SPF"):
        risks.append({"category": "Email Security", "level": "MEDIO", "finding": "Sin registro SPF — riesgo de spoofing"})
    if not dns.get("DMARC"):
        risks.append({"category": "Email Security", "level": "MEDIO", "finding": "Sin política DMARC — phishing sin protección"})

    subs = data.get("subdomains", {})
    if subs.get("total", 0) > 50:
        risks.append({"category": "Exposición", "level": "MEDIO", "finding": f"{subs['total']} subdominios expuestos — superficie amplia"})

    if not risks:
        risks.append({"category": "General", "level": "BAJO", "finding": "Sin hallazgos críticos detectados en esta auditoría"})

    return risks


def _build_recommendations(data: dict) -> list[str]:
    recs = []
    dns = data.get("dns", {})
    if not dns.get("SPF"):
        recs.append("Configurar registro SPF en el DNS para prevenir email spoofing")
    if not dns.get("DMARC"):
        recs.append("Implementar política DMARC (p=quarantine o p=reject) para proteger el dominio de phishing")
    shodan = data.get("shodan", {})
    if shodan.get("vulnerabilities"):
        recs.append(f"Parchear urgentemente las vulnerabilidades detectadas: {', '.join(shodan['vulnerabilities'][:3])}")
    if shodan.get("open_ports") and len(shodan.get("open_ports", [])) > 5:
        recs.append("Revisar y minimizar puertos expuestos a Internet — implementar firewall de periferia estricto")
    ssl = data.get("ssl", {})
    if ssl.get("expired") or ssl.get("expiring_soon"):
        recs.append("Renovar el certificado SSL/TLS de forma inmediata para mantener el cifrado en tránsito")
    vt = data.get("virustotal", {})
    if vt.get("malicious", 0) > 0:
        recs.append("Investigar y remediar las detecciones maliciosas en VirusTotal — posible compromiso activo")
    if not recs:
        recs.append("Mantener monitoreo continuo de la superficie de ataque con revisiones mensuales")
        recs.append("Realizar auditorías de seguridad periódicas (mínimo trimestral)")
        recs.append("Establecer un programa de gestión de vulnerabilidades con SLAs de remediación")
    return recs


# ─── Listado de informes ───────────────────────────────────────────────────────

def list_reports() -> list[dict]:
    reports = []
    for f in sorted(REPORTS_DIR.glob("*.pdf"), key=lambda x: x.stat().st_mtime, reverse=True):
        reports.append({
            "filename": f.name,
            "path":     str(f),
            "size_kb":  round(f.stat().st_size / 1024, 1),
            "created":  datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
        })
    return reports
