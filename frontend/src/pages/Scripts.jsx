import { useState, useMemo } from 'react'
import { Copy, Check, Download, ChevronDown, ChevronRight, Search } from 'lucide-react'

const CATEGORIES = [
  { id: 'all',      label: 'Todo',            icon: '📦' },
  { id: 'cyber',    label: 'Ciberseguridad',  icon: '🛡️' },
  { id: 'deploy',   label: 'Deploy',          icon: '🚀' },
  { id: 'devops',   label: 'DevOps / Docker', icon: '🐳' },
  { id: 'web',      label: 'Web / SEO',       icon: '🌐' },
  { id: 'patterns', label: 'SOLID / Patrones',icon: '🏗️' },
  { id: 'payments', label: 'Pagos',           icon: '💳' },
  { id: 'data',     label: 'Data / Cloud',    icon: '❄️' },
]

const TYPES = [
  { id: 'script',     label: 'Script',       color: 'text-green-400',  dot: 'bg-green-400',  badge: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { id: 'automation', label: 'Automación',   color: 'text-crimson',    dot: 'bg-crimson',    badge: 'bg-crimson/20 text-crimson border-crimson/30' },
  { id: 'doc',        label: 'Doc',          color: 'text-blue-400',   dot: 'bg-blue-400',   badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'config',     label: 'Config',       color: 'text-yellow-400', dot: 'bg-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
]

const ITEMS = [
  // ── CIBERSEGURIDAD ──
  {
    id: 'recon-auto', title: 'Reconocimiento OSINT automatizado', category: 'cyber', type: 'script', lang: 'bash',
    tags: ['recon', 'OSINT', 'nmap', 'subfinder'],
    description: 'Recon completo: subdominios, puertos, tecnologías, emails. 1 comando, informe completo.',
    content: `#!/bin/bash
# recon.sh — Reconocimiento automatizado completo
# Uso: ./recon.sh dominio.com
# Requiere: nmap, subfinder, theHarvester, whatweb, curl

TARGET=$1
OUT="recon-$TARGET-$(date +%Y%m%d)"
mkdir -p $OUT

[ -z "$TARGET" ] && echo "Uso: $0 <dominio>" && exit 1

echo "🎯 Objetivo: $TARGET"
echo "📁 Resultados en: $OUT/"

echo "[1/6] Enumerando subdominios..."
subfinder -d $TARGET -silent -o $OUT/subdomains.txt 2>/dev/null
amass enum -passive -d $TARGET >> $OUT/subdomains.txt 2>/dev/null
sort -u $OUT/subdomains.txt -o $OUT/subdomains.txt
echo "  → $(wc -l < $OUT/subdomains.txt) subdominios"

echo "[2/6] Resolviendo IPs..."
while read sub; do
  ip=$(dig +short $sub 2>/dev/null | head -1)
  [ -n "$ip" ] && echo "$sub -> $ip"
done < $OUT/subdomains.txt > $OUT/ips.txt

echo "[3/6] Escaneando puertos..."
nmap -iL $OUT/ips.txt -F -sV --open -oN $OUT/ports.txt -T4 -q 2>/dev/null

echo "[4/6] Detectando tecnologías..."
whatweb http://$TARGET https://$TARGET -q >> $OUT/tech.txt 2>/dev/null

echo "[5/6] Buscando emails..."
theHarvester -d $TARGET -b google,bing,duckduckgo -f $OUT/harvest 2>/dev/null

echo "[6/6] Cabeceras HTTP de seguridad..."
curl -sI https://$TARGET | grep -i "x-frame\\|x-xss\\|content-security\\|strict-transport\\|server:" > $OUT/headers.txt

echo "✅ Reconocimiento completado: $TARGET"
echo "📁 Resultados: ./$OUT/"
ls -la $OUT/`
  },
  {
    id: 'wifi-audit', title: 'Auditoría WiFi (aircrack-ng)', category: 'cyber', type: 'script', lang: 'bash',
    tags: ['WiFi', 'aircrack-ng', 'WPA', 'auditoría'],
    description: 'Automatiza auditoría WiFi: modo monitor → captura handshake → crack. Solo redes propias o con permiso.',
    content: `#!/bin/bash
# wifi-audit.sh — Auditoría WiFi automatizada
# ⚠️ SOLO usar en redes propias o con permiso explícito
# Requiere: aircrack-ng, iwconfig

IFACE=\${1:-wlan0}
WORDLIST="/usr/share/wordlists/rockyou.txt"
CAPTURE_DIR="captures"
mkdir -p $CAPTURE_DIR

[ "$EUID" -ne 0 ] && echo "❌ Ejecutar como root" && exit 1

echo "[1/5] Activando modo monitor..."
airmon-ng check kill > /dev/null 2>&1
airmon-ng start $IFACE > /dev/null 2>&1
MON_IFACE="\${IFACE}mon"

echo "[2/5] Escaneando redes WiFi (10s)..."
timeout 10 airodump-ng $MON_IFACE --output-format csv -w /tmp/scan > /dev/null 2>&1

echo "Redes encontradas:"
cat /tmp/scan-01.csv | grep -v "Station" | head -20

read -p "BSSID objetivo: " BSSID
read -p "Canal (CH): " CHANNEL

CAPTURE="$CAPTURE_DIR/capture_$(date +%Y%m%d_%H%M)"
echo "[4/5] Capturando handshake en canal $CHANNEL..."
airodump-ng -c $CHANNEL --bssid $BSSID -w $CAPTURE $MON_IFACE &
sleep 30
kill %1 2>/dev/null

if [ -f "$WORDLIST" ]; then
  echo "[5/5] Crackeando con wordlist..."
  aircrack-ng \${CAPTURE}-01.cap -w $WORDLIST
else
  echo "⚠️ Captura guardada: \${CAPTURE}-01.cap"
fi
airmon-ng stop $MON_IFACE > /dev/null 2>&1`
  },
  {
    id: 'ssh-hardening', title: 'Hardening SSH — configuración segura', category: 'cyber', type: 'config', lang: 'bash',
    tags: ['SSH', 'hardening', 'seguridad', 'VPS'],
    description: 'Script de hardening SSH: deshabilitar root, cambiar puerto, fail2ban, claves solo.',
    content: `#!/bin/bash
# ssh-hardening.sh — Hardening de SSH en Ubuntu/Debian
# Ejecutar como root en VPS recién instalado

set -e

NEW_PORT=2222
SSH_CONFIG="/etc/ssh/sshd_config"

echo "🔒 Iniciando hardening SSH..."

# Backup configuración original
cp $SSH_CONFIG \${SSH_CONFIG}.bak

# Aplicar configuración segura
cat >> $SSH_CONFIG << 'EOF'

# ── Hardening ──────────────────────────────
Port 2222                    # Cambiar puerto por defecto
PermitRootLogin no           # Deshabilitar login como root
PasswordAuthentication no    # Solo claves SSH
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
MaxAuthTries 3               # Máx intentos de auth
LoginGraceTime 30            # Timeout de conexión
X11Forwarding no             # No reenvío X11
AllowTcpForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

# Instalar y configurar fail2ban
apt-get install -y fail2ban > /dev/null

cat > /etc/fail2ban/jail.local << 'FAIL2BAN'
[sshd]
enabled  = true
port     = 2222
maxretry = 5
bantime  = 3600
findtime = 600
FAIL2BAN

systemctl restart sshd
systemctl enable fail2ban
systemctl restart fail2ban

echo "✅ SSH hardening completado"
echo "⚠️ NUEVO PUERTO SSH: $NEW_PORT"
echo "   Abre el puerto en el firewall: ufw allow $NEW_PORT/tcp"`
  },
  // ── DEPLOY ──
  {
    id: 'github-actions', title: 'GitHub Actions — CI/CD completo', category: 'deploy', type: 'automation', lang: 'yaml',
    tags: ['GitHub', 'CI/CD', 'automático'],
    description: 'Pipeline automático: test → build → deploy en cada push a main.',
    content: `# .github/workflows/deploy.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install backend deps
        run: pip install -r backend/requirements.txt

      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Build Frontend (React + Vite)
        run: |
          cd frontend
          npm ci
          npm run build

      - name: Deploy a VPS via SSH
        uses: appleboy/ssh-action@master
        with:
          host: \${{ secrets.VPS_HOST }}
          username: \${{ secrets.VPS_USER }}
          key: \${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/aura-ops
            git pull origin main
            source venv/bin/activate
            pip install -r backend/requirements.txt
            systemctl restart aura-backend
            cd frontend && npm ci && npm run build
            systemctl restart nginx`
  },
  {
    id: 'deploy-nginx', title: 'Deploy en Nginx — VPS propio', category: 'deploy', type: 'script', lang: 'bash',
    tags: ['Nginx', 'VPS', 'SSL', 'producción'],
    description: 'Script completo para desplegar frontend React + backend FastAPI en Nginx con SSL.',
    content: `#!/bin/bash
# deploy-nginx.sh — Deploy en servidor propio con Nginx
# Uso: sudo ./deploy-nginx.sh

DOMAIN="tudominio.com"
APP_DIR="/var/www/aura-ops"

echo "🚀 Desplegando AURA OPS en Nginx..."

cd $APP_DIR
git pull origin main

# Backend FastAPI
source venv/bin/activate
pip install -r backend/requirements.txt -q
systemctl restart aura-backend
echo "✅ Backend reiniciado"

# Frontend React
cd frontend
npm ci --silent
npm run build
sudo cp -r dist/* /var/www/html/aura-ops/
echo "✅ Frontend copiado"

sudo nginx -t && sudo systemctl reload nginx
echo "✅ Nginx recargado"
echo "🌐 App disponible en https://$DOMAIN"

# Configuración Nginx de referencia:
# server {
#   listen 443 ssl http2;
#   server_name tudominio.com;
#   root /var/www/html/aura-ops;
#   location / { try_files $uri /index.html; }
#   location /api/ { proxy_pass http://127.0.0.1:8000; }
# }`
  },
  {
    id: 'systemd-service', title: 'FastAPI como servicio systemd', category: 'deploy', type: 'config', lang: 'ini',
    tags: ['systemd', 'FastAPI', 'daemon', 'VPS'],
    description: 'Configura el backend FastAPI como daemon del sistema. Arranca automáticamente.',
    content: `# /etc/systemd/system/aura-backend.service
# Instalar:
#   sudo systemctl daemon-reload
#   sudo systemctl enable aura-backend
#   sudo systemctl start aura-backend

[Unit]
Description=AURA OPS — FastAPI Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/aura-ops/backend
ExecStart=/var/www/aura-ops/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 2

EnvironmentFile=/var/www/aura-ops/.env
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=aura-backend

[Install]
WantedBy=multi-user.target`
  },
  // ── DEVOPS ──
  {
    id: 'docker-3layers', title: 'Docker — Arquitectura 3 capas con redes aisladas', category: 'devops', type: 'automation', lang: 'yaml',
    tags: ['Docker', 'redes', 'seguridad', 'bridge'],
    description: 'Frontend+Proxy / Backend / DB en redes bridge separadas. Solo el proxy expone puertos.',
    content: `# docker-compose.prod.yml
# Arquitectura 3 capas con redes aisladas

version: "3.9"

networks:
  frontend-net:
    driver: bridge
  backend-net:
    driver: bridge

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
      - frontend-build:/usr/share/nginx/html:ro
    networks:
      - frontend-net
      - backend-net
    depends_on: [backend]
    restart: unless-stopped

  frontend:
    build: ./frontend
    volumes:
      - frontend-build:/app/dist
    networks:
      - frontend-net
    restart: unless-stopped

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/auraops
    networks:
      - backend-net
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    # ⚠️ SIN "ports:" — solo accesible via nginx

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: auraops
      POSTGRES_USER: user
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - backend-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      retries: 5
    restart: unless-stopped
    # ⚠️ SIN "ports:" — NUNCA expuesto al exterior

volumes:
  db-data:
  frontend-build:

secrets:
  db_password:
    file: ./secrets/db_password.txt`
  },
  {
    id: 'docker-watchtower', title: 'Docker Watchtower — Auto-actualización', category: 'devops', type: 'automation', lang: 'yaml',
    tags: ['Watchtower', 'auto-update', 'Docker'],
    description: 'Watchtower monitoriza contenedores y los actualiza automáticamente al haber nueva imagen.',
    content: `# docker-compose.watchtower.yml
version: "3.9"
services:
  watchtower:
    image: containrrr/watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      WATCHTOWER_POLL_INTERVAL: 86400       # cada 24h
      WATCHTOWER_LABEL_ENABLE: "true"
      WATCHTOWER_CLEANUP: "true"            # elimina imágenes viejas
      WATCHTOWER_NOTIFICATIONS: email
      WATCHTOWER_NOTIFICATION_EMAIL_FROM: tu@email.com
      WATCHTOWER_NOTIFICATION_EMAIL_TO: tu@email.com
      WATCHTOWER_NOTIFICATION_EMAIL_SERVER: smtp.gmail.com
      WATCHTOWER_NOTIFICATION_EMAIL_SERVER_PORT: "587"
    command: --schedule "0 0 4 * * *"      # Cada día a las 4:00 AM

# En cada contenedor a actualizar, añadir:
# labels:
#   - "com.centurylinklabs.watchtower.enable=true"`
  },
  {
    id: 'terraform-ansible', title: 'Terraform + Ansible — Infraestructura como código', category: 'devops', type: 'automation', lang: 'hcl',
    tags: ['Terraform', 'Ansible', 'IaC', 'VPS'],
    description: 'Terraform provisiona el VPS en DigitalOcean, Ansible configura Nginx + Docker + SSL.',
    content: `# main.tf — Crear VPS en DigitalOcean
terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_droplet" "aura_ops" {
  image    = "ubuntu-22-04-x64"
  name     = "aura-ops-server"
  region   = "fra1"
  size     = "s-1vcpu-2gb"
  ssh_keys = [var.ssh_fingerprint]
  tags     = ["aura-ops", "production"]
}

output "server_ip" {
  value = digitalocean_droplet.aura_ops.ipv4_address
}

# --- ansible/playbook.yml ---
# - name: Configurar servidor AURA OPS
#   hosts: all
#   become: true
#   tasks:
#     - apt: update_cache=yes upgrade=dist
#     - apt:
#         name: [docker.io, docker-compose, nginx, certbot, python3-certbot-nginx]
#         state: present
#     - git:
#         repo: https://github.com/tu-usuario/aura-ops.git
#         dest: /var/www/aura-ops
#     - command: docker-compose -f docker-compose.prod.yml up -d
#       args: { chdir: /var/www/aura-ops }
#     - command: certbot --nginx -d {{ domain }} --email {{ email }} --agree-tos -n`
  },
  // ── WEB / SEO ──
  {
    id: 'seo-robots', title: 'robots.txt + SEO — Guía completa', category: 'web', type: 'doc', lang: 'markdown',
    tags: ['SEO', 'robots.txt', 'sitemap', 'meta tags'],
    description: 'Configuración robots.txt, sitemap.xml, meta tags, Open Graph para máximo SEO.',
    content: `# SEO Completo para React + FastAPI

## 1. robots.txt (en /public/)
\`\`\`
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: https://tudominio.com/sitemap.xml
\`\`\`

## 2. Meta tags en index.html
\`\`\`html
<head>
  <title>AURA OPS | Suite de Ciberseguridad</title>
  <meta name="description" content="Suite OSINT y ciberseguridad full-stack.">

  <!-- Open Graph -->
  <meta property="og:title" content="AURA OPS">
  <meta property="og:description" content="Suite OSINT y ciberseguridad">
  <meta property="og:image" content="https://tudominio.com/og-image.png">
  <meta property="og:url" content="https://tudominio.com">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://tudominio.com">
</head>
\`\`\`

## 3. sitemap.xml dinámico (FastAPI)
\`\`\`python
@app.get("/sitemap.xml", response_class=Response)
async def sitemap():
    urls = ["https://tudominio.com/", "https://tudominio.com/proyectos"]
    xml = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    for url in urls:
        xml += f"<url><loc>{url}</loc></url>"
    xml += "</urlset>"
    return Response(xml, media_type="application/xml")
\`\`\`

## Herramientas de análisis
- Google Search Console: search.google.com/search-console
- PageSpeed Insights: pagespeed.web.dev
- Lighthouse (Chrome DevTools → pestaña Lighthouse)`
  },
  // ── PATRONES ──
  {
    id: 'solid-patterns', title: 'SOLID + Patrones de diseño — Referencia', category: 'patterns', type: 'doc', lang: 'markdown',
    tags: ['SOLID', 'Python', 'arquitectura', 'patrones'],
    description: 'Los 5 principios SOLID con ejemplos en Python y JavaScript.',
    content: `# SOLID + Patrones de Diseño

## S — Single Responsibility (Responsabilidad única)
Cada clase/función tiene UNA sola razón para cambiar.
\`\`\`python
# ❌ MAL: una clase que hace autenticación Y envía emails
# ✅ BIEN:
class AuthService:
    def authenticate(self, user, password): ...

class EmailService:
    def send_welcome(self, email): ...
\`\`\`

## O — Open/Closed (Abierto/Cerrado)
Abierto para extensión, cerrado para modificación.
\`\`\`python
from abc import ABC, abstractmethod

class Scanner(ABC):
    @abstractmethod
    def scan(self, target): ...

class NmapScanner(Scanner):
    def scan(self, target): ...

class ShodanScanner(Scanner):
    def scan(self, target): ...
\`\`\`

## L — Liskov Substitution
Los subtipos deben poder sustituir a su tipo base.

## I — Interface Segregation
Mejor muchas interfaces pequeñas que una grande.

## D — Dependency Inversion
Depender de abstracciones, no de implementaciones.
\`\`\`python
# ❌ MAL:
class AuditService:
    def __init__(self):
        self.scanner = NmapScanner()  # acoplado

# ✅ BIEN:
class AuditService:
    def __init__(self, scanner: Scanner):  # inyectado
        self.scanner = scanner
\`\`\`

## Patrón Repository
\`\`\`python
class AuditRepository:
    async def save(self, report: AuditReport) -> str: ...
    async def find_by_id(self, id: str) -> AuditReport: ...
\`\`\`

## Patrón Strategy
\`\`\`python
class OsintStrategy(ABC):
    @abstractmethod
    def enrich(self, target: str) -> dict: ...

class DomainStrategy(OsintStrategy):
    def enrich(self, target): return dns_lookup(target)

class EmailStrategy(OsintStrategy):
    def enrich(self, target): return emailrep_lookup(target)
\`\`\``
  },
  // ── PAGOS ──
  {
    id: 'stripe-fastapi', title: 'Stripe — Pasarela de pago en FastAPI', category: 'payments', type: 'doc', lang: 'python',
    tags: ['Stripe', 'pagos', 'FastAPI', 'webhook'],
    description: 'Integración completa de Stripe con FastAPI: checkout session, webhooks y verificación.',
    content: `# Stripe + FastAPI

## Instalación
\`\`\`bash
pip install stripe
\`\`\`

## Configuración
\`\`\`python
# .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
\`\`\`

## Crear sesión de pago
\`\`\`python
import stripe
from fastapi import APIRouter

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY

@router.post("/create-checkout")
async def create_checkout(product_name: str, price_cents: int):
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "eur",
                "unit_amount": price_cents,
                "product_data": {"name": product_name},
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url="https://tudominio.com/pago/ok?session_id={CHECKOUT_SESSION_ID}",
        cancel_url="https://tudominio.com/pago/cancelado",
    )
    return {"url": session.url}
\`\`\`

## Webhook para confirmar pagos
\`\`\`python
@router.post("/webhook")
async def webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            # ✅ Pago confirmado
            customer_email = session.get("customer_email")
            # activar_servicio(customer_email)
        return {"status": "ok"}
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
\`\`\`

## Precios Stripe
- Sin cuota mensual
- 1.4% + 0.25€ (tarjetas europeas)
- 2.9% + 0.30€ (tarjetas no europeas)`
  },
  // ── DATA ──
  {
    id: 'snowflake-erp', title: 'Snowflake vs ERP vs CRM vs Notion — Comparativa', category: 'data', type: 'doc', lang: 'markdown',
    tags: ['Snowflake', 'ERP', 'CRM', 'Notion', 'data warehouse'],
    description: 'Cuándo usar cada herramienta. Data Warehouse vs ERP vs CRM vs productividad.',
    content: `# Snowflake vs ERP vs CRM vs Notion

| Herramienta | Tipo | Para qué sirve |
|---|---|---|
| Snowflake | Data Warehouse | Análisis de grandes volúmenes de datos |
| Odoo / SAP | ERP | Gestión empresarial (facturación, inventario, RRHH) |
| HubSpot / Salesforce | CRM | Gestión de clientes y ventas |
| Notion | Productividad/Wiki | Documentación y gestión de proyectos |

## Snowflake — Warehouses
| Tier | vCPU | Créditos/h | Uso |
|---|---|---|---|
| X-Small | 1 | 1 | Desarrollo |
| Small | 2 | 2 | Producción ligera |
| Medium | 4 | 4 | Producción normal |
| Large | 8 | 8 | Grandes cargas |

\`\`\`sql
CREATE WAREHOUSE mi_warehouse
  WITH WAREHOUSE_SIZE = 'SMALL'
  AUTO_SUSPEND = 300
  AUTO_RESUME = TRUE;
\`\`\`

## Cuándo usar cada uno
| Situación | Herramienta |
|---|---|
| Analizar 10M+ registros | Snowflake |
| Gestionar facturas y stock | ERP (Odoo) |
| Seguir leads y ventas | CRM (HubSpot) |
| Wiki del equipo | Notion |
| Todo, startup pequeña | Notion + HubSpot gratis + Stripe |`
  },
]

const EXT_MAP = { bash: '.sh', yaml: '.yml', python: '.py', hcl: '.tf', ini: '.conf', markdown: '.md', java: '.java' }

export default function Scripts() {
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [activeType, setActiveType] = useState(null)
  const [openItems, setOpenItems] = useState(new Set())
  const [copied, setCopied] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return ITEMS.filter(item => {
      const matchCat  = activeCat === 'all' || item.category === activeCat
      const matchType = !activeType || item.type === activeType
      const matchQ    = !q || item.title.toLowerCase().includes(q)
        || item.description.toLowerCase().includes(q)
        || item.tags.some(t => t.toLowerCase().includes(q))
        || item.content.toLowerCase().includes(q)
      return matchCat && matchType && matchQ
    })
  }, [query, activeCat, activeType])

  function toggle(id) {
    setOpenItems(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    })
  }

  function download(item) {
    const ext  = EXT_MAP[item.lang] ?? '.txt'
    const blob = new Blob([item.content], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = item.id + ext; a.click()
    URL.revokeObjectURL(url)
  }

  const typeInfo = (id) => TYPES.find(t => t.id === id) ?? TYPES[0]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <span className="text-crimson">⚡</span> Scripts & Automatizaciones
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 font-mono">
            {filtered.length} / {ITEMS.length} items · scripts, docs y configs
          </p>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          {TYPES.map(t => (
            <span key={t.id} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${t.dot}`} /> {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre, tecnología, comando..."
            className="w-full bg-dark-300 border border-surface-border rounded-lg pl-9 pr-4 py-2.5
                       text-gray-300 text-sm focus:outline-none focus:border-crimson/50 transition-colors" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCat(cat.id)}
              className={`flex items-center gap-1 text-xs px-3 py-2 rounded-lg border transition-all whitespace-nowrap ${
                activeCat === cat.id
                  ? 'bg-crimson/20 text-crimson border-crimson/40'
                  : 'text-gray-400 border-surface-border hover:border-gray-600 hover:text-gray-300'
              }`}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type filter pills */}
      <div className="flex gap-2">
        {TYPES.map(t => (
          <button key={t.id} onClick={() => setActiveType(activeType === t.id ? null : t.id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
              activeType === t.id ? t.badge : 'text-gray-400 border-surface-border hover:border-gray-600'
            }`}>
            {t.label} ({ITEMS.filter(i => i.type === t.id).length})
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-3">
        {filtered.map(item => {
          const ti = typeInfo(item.type)
          const isOpen = openItems.has(item.id)
          return (
            <div key={item.id} className="bg-dark-300 border border-surface-border rounded-xl overflow-hidden">
              <button onClick={() => toggle(item.id)}
                className="w-full flex items-start gap-4 p-4 hover:bg-surface/30 transition-colors text-left">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${ti.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm">{item.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ti.badge}`}>{ti.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-surface-border text-gray-400 font-mono">{item.lang}</span>
                    {item.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-crimson/10 text-crimson border border-crimson/20">{tag}</span>
                    ))}
                  </div>
                  <p className="text-gray-400 text-xs mt-1">{item.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={e => { e.stopPropagation(); copy(item.content, item.id) }}
                    className="p-1.5 rounded text-gray-500 hover:text-crimson hover:bg-crimson/10 transition-colors" title="Copiar">
                    {copied === item.id ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); download(item) }}
                    className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-surface-light transition-colors" title="Descargar">
                    <Download size={13} />
                  </button>
                  {isOpen ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-surface-border animate-fade-in">
                  <div className="relative">
                    <button onClick={() => copy(item.content, item.id + '_inner')}
                      className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-dark-200 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-gray-400 hover:text-crimson hover:border-crimson/40 transition-all">
                      {copied === item.id + '_inner' ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                      {copied === item.id + '_inner' ? 'Copiado!' : 'Copiar todo'}
                    </button>
                    <pre className="bg-dark-100 text-gray-300 text-xs leading-relaxed p-5 overflow-x-auto font-mono max-h-[500px] overflow-y-auto">
                      {item.content}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <span className="text-3xl mb-2">📭</span>
            <p className="text-sm">Sin resultados para "{query}"</p>
          </div>
        )}
      </div>
    </div>
  )
}
