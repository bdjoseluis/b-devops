# B-DEVOPS — Sistema de Ciberinteligencia OSINT

## Instalación

1. Instala Python 3.10+ → https://python.org
2. Instala Node.js 18+ → https://nodejs.org
3. Ejecuta `install.bat`
4. Ejecuta `start.bat`

## API Keys (Configuración → Apartado de API Keys)

| API | Gratis | Para qué |
|-----|--------|----------|
| Gemini | Sí (2M tokens/mes) | IA del terminal y reportes |
| Shodan | $49/año o freemium | Puertos y CVEs de IPs |
| VirusTotal | Sí (500 req/día) | Reputación de dominios/IPs |
| Hunter.io | Sí (25 req/mes) | Emails corporativos |
| HaveIBeenPwned | $3.50/mes | Brechas de email |
| AbuseIPDB | Sí (1000 req/día) | Reputación de IPs |

## Módulos

- **Ciber Inteligencia** — OSINT completo: WHOIS, DNS, SSL, subdominios, Shodan, VirusTotal, emails, breaches
- **Command Center** — Nmap local + herramientas Kali via SSH
- **Terminal IA** — Chat con Gemini Flash para guía de auditoría
- **Matriz GRC** — Compliance RGPD, ISO 27001, ENS, NIS2
- **Reportes** — Documentos DOCX profesionales con firma y análisis IA
- **Configuración** — API keys, datos auditor, SSH Kali Linux

## Kali Linux VM

En Configuración → Kali Linux VM, añade IP/usuario/contraseña de tu VM.
AURA se conectará por SSH y ejecutará las herramientas remotamente.

## Aviso Legal

Solo para auditorías autorizadas. El uso no autorizado es ilegal.
