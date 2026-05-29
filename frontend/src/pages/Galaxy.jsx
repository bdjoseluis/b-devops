import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { auth as authApi } from '../api/client'
import { Lock, Eye, EyeOff, X, ZoomIn, ZoomOut, Crosshair } from 'lucide-react'

// ─── World dimensions ─────────────────────────────────────────────────────────
const W = 3200
const H = 2200

// ─── Zones (nebula regions) ───────────────────────────────────────────────────
const ZONES = [
  { id:'osint',    label:'OSINT & Reconocimiento',    cx:700,  cy:820,  r:440, color:'#06b6d4' },
  { id:'security', label:'Seguridad & Ataques',        cx:2520, cy:820,  r:400, color:'#e63946' },
  { id:'infra',    label:'Infraestructura & DevOps',   cx:1580, cy:1950, r:420, color:'#10b981' },
  { id:'mgmt',     label:'Gestión & Portfolio',        cx:1580, cy:380,  r:360, color:'#a855f7' },
  { id:'core',     label:'Centro Operacional',         cx:1580, cy:1160, r:300, color:'#f59e0b' },
  { id:'web',      label:'Webs & Servicios',           cx:2800, cy:1750, r:320, color:'#3b82f6' },
  { id:'exploit',  label:'Exploitation & PenTest',    cx:320,  cy:1520, r:380, color:'#7c3aed' },
]

// ─── Tool stars ───────────────────────────────────────────────────────────────
const STARS = [
  // ══ OSINT zone ══════════════════════════════════════════════════════════════
  { id:'pivot',      zone:'osint',    label:'Intelligence Pivot', icon:'🎯', color:'#e63946', x:700,  y:820,  r:15, route:'/pivot',                         info:'OSINT universal — IP/Domain/Email/Usuario · 10 APIs' },
  { id:'shodan',     zone:'osint',    label:'Shodan',             icon:'📡', color:'#06b6d4', x:540,  y:720,  r:12, route:'/tool/shodan',                    info:'Buscador de dispositivos conectados a internet' },
  { id:'censys',     zone:'osint',    label:'Censys',             icon:'🔭', color:'#22d3ee', x:640,  y:630,  r:10, route:'/tool/censys',                    info:'Escaneo masivo de internet y certificados SSL' },
  { id:'hunter',     zone:'osint',    label:'Hunter.io',          icon:'🎣', color:'#38bdf8', x:840,  y:660,  r:10, route:'/tool/hunter',                    info:'Descubre emails de cualquier dominio' },
  { id:'virustotal', zone:'osint',    label:'VirusTotal',         icon:'🦠', color:'#f97316', x:920,  y:790,  r:11, route:'/tool/virustotal',                info:'Análisis de archivos y URLs maliciosos' },
  { id:'urlscan',    zone:'osint',    label:'URLScan',            icon:'🌐', color:'#06b6d4', x:590,  y:920,  r:9,  route:'/tool/urlscan',                   info:'Escáner de páginas web con captura de pantalla' },
  { id:'wayback',    zone:'osint',    label:'Wayback Machine',    icon:'⏱️', color:'#a78bfa', x:680,  y:1010, r:9,  route:'/tool/wayback',                   info:'Historial de páginas web archivadas' },
  { id:'dnsdump',    zone:'osint',    label:'DNS Recon',          icon:'🗺️', color:'#22d3ee', x:500,  y:880,  r:9,  route:'/tool/dns',                       info:'Reconocimiento DNS y subdominios' },
  { id:'osintpage',  zone:'osint',    label:'Ciber Inteligencia', icon:'🔍', color:'#7c3aed', x:820,  y:930,  r:12, route:'/osint',                           info:'Panel OSINT integrado con múltiples fuentes' },
  { id:'whois',      zone:'osint',    label:'WHOIS Lookup',       icon:'📋', color:'#22d3ee', x:770,  y:1060, r:8,  route:'/tool/whois',                    info:'Información de registro de dominios' },
  { id:'spiderfoot', zone:'osint',    label:'SpiderFoot',         icon:'🕷️', color:'#a855f7', x:600,  y:1050, r:8,  url:'https://www.spiderfoot.net',         info:'Framework de automatización OSINT' },
  { id:'tempmail',   zone:'osint',    label:'Temp Mail',          icon:'📧', color:'#06b6d4', x:470,  y:980,  r:9,  route:'/tempmail',                        info:'Emails temporales para anonimato' },
  { id:'dehashed',   zone:'osint',    label:'DeHashed',           icon:'💧', color:'#60a5fa', x:760,  y:680,  r:8,  route:'/tool/dehashed',                 info:'Base de datos de credenciales filtradas' },
  { id:'whatsmyname',zone:'osint',    label:'WhatsMyName',        icon:'👤', color:'#a855f7', x:480,  y:790,  r:10, route:'/tool/whatsmyname',               info:'Presencia en redes sociales — 500+ sitios' },
  { id:'bgp',        zone:'osint',    label:'BGP / ASN Lookup',   icon:'🌐', color:'#22d3ee', x:900,  y:870,  r:10, route:'/tool/bgp',                        info:'Routing BGP, geolocalización IP y prefijos ASN' },
  { id:'subdomains', zone:'osint',    label:'Subdomain Finder',   icon:'🔎', color:'#06b6d4', x:960,  y:760,  r:10, route:'/tool/subdomains',                 info:'Enumeración pasiva de subdominios — crt.sh + HackerTarget' },
  { id:'geoip',      zone:'osint',    label:'GeoIP Lookup',       icon:'📍', color:'#3b82f6', x:870,  y:750,  r:9,  route:'/tool/geoip',                       info:'Geolocalización IP con mapa — ciudad, ISP, timezone' },
  { id:'emailhdr',   zone:'osint',    label:'Email Headers',      icon:'✉️', color:'#f59e0b', x:990,  y:870,  r:9,  route:'/tool/emailheaders',                info:'Análisis de cabeceras email — SPF, DKIM, DMARC, phishing' },
  { id:'qrcode',     zone:'web',      label:'QR Generator',       icon:'📱', color:'#8b5cf6', x:2970, y:1730, r:9,  route:'/tool/qrcode',                      info:'Generador de QR personalizable — URL, WiFi, vCard, colores' },

  // ══ Security zone ════════════════════════════════════════════════════════════
  { id:'audit',      zone:'security', label:'Auto Auditoría',     icon:'🔐', color:'#e63946', x:2520, y:820,  r:15, route:'/audit',                           info:'Auditoría de seguridad automática con IA' },
  { id:'surface',    zone:'security', label:'Attack Surface',     icon:'🗺️', color:'#f97316', x:2370, y:730,  r:12, route:'/surface',                         info:'Mapeo de superficie de ataque' },
  { id:'grc',        zone:'security', label:'Matriz GRC',         icon:'🛡️', color:'#e63946', x:2660, y:720,  r:11, route:'/grc',                             info:'Gobernanza, Riesgo y Compliance' },
  { id:'bcp',        zone:'security', label:'BCP',                icon:'🔄', color:'#f59e0b', x:2700, y:920,  r:9,  route:'/bcp',                             info:'Plan de Continuidad de Negocio' },
  { id:'nmap',       zone:'security', label:'Nmap Scanner',       icon:'🌐', color:'#ef4444', x:2350, y:870,  r:10, route:'/tool/nmap',                      info:'Escáner de puertos y descubrimiento de red' },
  { id:'burp',       zone:'security', label:'Burp Suite',         icon:'🧰', color:'#f97316', x:2450, y:960,  r:10, url:'https://portswigger.net/burp',        info:'Proxy y escáner de vulnerabilidades web' },
  { id:'exploitdb',  zone:'security', label:'Exploit-DB',         icon:'💣', color:'#dc2626', x:2650, y:1000, r:9,  route:'/tool/exploitdb',                 info:'Base de datos de exploits y PoCs' },
  { id:'cve',        zone:'security', label:'CVE Lookup',         icon:'⚠️', color:'#f97316', x:2560, y:1060, r:8,  route:'/tool/cve',                       info:'Base de datos de vulnerabilidades NVD/NIST' },
  { id:'hibp',       zone:'security', label:'HaveIBeenPwned',     icon:'🔑', color:'#dc2626', x:2360, y:1000, r:9,  route:'/tool/hibp',                      info:'Comprobador de brechas de datos' },
  { id:'shodan2',    zone:'security', label:'Shodan Monitor',     icon:'📡', color:'#ef4444', x:2750, y:820,  r:8,  route:'/tool/shodan',                    info:'Monitoreo continuo de exposición' },
  { id:'threatintel',zone:'security', label:'Threat Intel',      icon:'🛡️', color:'#ef4444', x:2450, y:670,  r:11, route:'/tool/threatintel',               info:'Feeds en tiempo real: URLhaus, MalwareBazaar, ThreatFox' },
  { id:'passwords',  zone:'security', label:'Passwords Suite',   icon:'🔑', color:'#8b5cf6', x:2620, y:650,  r:10, route:'/tool/passwords',                 info:'Analizador de contraseñas + generador + HIBP check' },
  { id:'hashlookup', zone:'security', label:'Hash Lookup',       icon:'#️⃣', color:'#f59e0b', x:2780, y:680,  r:9,  route:'/tool/hashlookup',                info:'Identifica y busca hashes en bases de datos online' },
  { id:'sslcheck',   zone:'security', label:'SSL Checker',       icon:'🔒', color:'#10b981', x:2870, y:780,  r:9,  route:'/tool/sslcheck',                  info:'Analiza certificados SSL/TLS de cualquier dominio' },

  // ══ Infra zone ═══════════════════════════════════════════════════════════════
  { id:'terminal',   zone:'infra',    label:'Terminal IA',        icon:'💻', color:'#10b981', x:1580, y:1950, r:15, route:'/terminal',                        info:'Terminal con asistencia de IA integrada' },
  { id:'infra',      zone:'infra',    label:'Infraestructura',    icon:'🖥️', color:'#10b981', x:1430, y:1870, r:12, route:'/infra',                            info:'Docker, Cloudflare Tunnel, stack status' },
  { id:'devops',     zone:'infra',    label:'DevOps Hub',         icon:'☁️', color:'#06b6d4', x:1720, y:1870, r:11, route:'/devops',                           info:'CI/CD y herramientas DevOps' },
  { id:'command',    zone:'infra',    label:'Command Center',     icon:'⚡', color:'#22d3ee', x:1520, y:2060, r:11, route:'/command',                          info:'Centro de comandos operacional' },
  { id:'scripts',    zone:'infra',    label:'Scripts',            icon:'📝', color:'#10b981', x:1660, y:2080, r:9,  route:'/scripts',                          info:'Scripts y automatizaciones personalizadas' },
  { id:'n8n',        zone:'infra',    label:'n8n Workflows',      icon:'🔗', color:'#f97316', x:1750, y:1980, r:10, url:'https://crm.bdev.qzz.io',             info:'Automatizacion de workflows — n8n' },
  { id:'clickhouse', zone:'infra',    label:'ClickHouse',         icon:'📊', color:'#f59e0b', x:1400, y:2000, r:8,  url:'https://app.bdev.qzz.io:8123/play',   info:'Analitica con ClickHouse' },
  { id:'swagger',    zone:'infra',    label:'API Swagger',        icon:'📚', color:'#10b981', x:1720, y:2080, r:8,  url:'https://api.bdev.qzz.io/docs',        info:'Documentacion de la API REST' },
  { id:'ipcalc',     zone:'infra',    label:'IP Calculator',      icon:'🔢', color:'#22d3ee', x:1830, y:1950, r:9,  route:'/tool/ipcalc',                      info:'Calculadora de subredes CIDR — IPv4/IPv6' },
  { id:'portscan',   zone:'infra',    label:'Port Scanner',       icon:'🔌', color:'#f97316', x:1860, y:2060, r:9,  route:'/tool/portscan',                    info:'Escáner de puertos TCP — detección de servicios' },
  { id:'cronhelper', zone:'infra',    label:'Cron Helper',        icon:'⏰', color:'#10b981', x:1950, y:1980, r:9,  route:'/tool/cronhelper',                  info:'Generador de expresiones cron con preview de ejecuciones' },

  // ══ Management zone ═══════════════════════════════════════════════════════════
  { id:'dashboard',  zone:'mgmt',     label:'Dashboard',          icon:'📊', color:'#a855f7', x:1580, y:380,  r:13, route:'/dashboard',                       info:'Panel de control y métricas' },
  { id:'clientes',   zone:'mgmt',     label:'Clientes CRM',       icon:'👥', color:'#c084fc', x:1430, y:300,  r:13, route:'/clientes',                         info:'CRM: gestión de clientes y pipeline' },
  { id:'proyectos',  zone:'mgmt',     label:'Proyectos',          icon:'📁', color:'#8b5cf6', x:1730, y:300,  r:11, route:'/proyectos',                        info:'Gestión y seguimiento de proyectos' },
  { id:'workspace',  zone:'mgmt',     label:'Workspace',          icon:'🗂️', color:'#7c3aed', x:1490, y:450,  r:11, route:'/workspace',                        info:'Casos de investigación y findings' },
  { id:'monitor',    zone:'mgmt',     label:'Uptime Monitor',     icon:'📡', color:'#10b981', x:1680, y:450,  r:10, route:'/monitor',                          info:'Monitoreo de uptime y SSL' },
  { id:'reportes',   zone:'mgmt',     label:'Reportes',           icon:'📋', color:'#6366f1', x:1580, y:480,  r:10, route:'/reportes',                         info:'Generación de reportes ejecutivos' },
  { id:'explorador', zone:'mgmt',     label:'Explorador Docs',    icon:'📂', color:'#8b5cf6', x:1380, y:380,  r:9,  route:'/explorador',                       info:'Explorador de documentos y archivos' },
  { id:'prospector', zone:'mgmt',     label:'Prospector',         icon:'🏢', color:'#a78bfa', x:1770, y:400,  r:9,  route:'/prospector',                       info:'Prospección de negocios y contactos' },

  // ══ Core / Center zone ════════════════════════════════════════════════════════
  { id:'portal',     zone:'core',     label:'Portal Admin',       icon:'🌌', color:'#e63946', x:1580, y:1060, r:20, route:'/portal',                           info:'Centro de control principal — Admin Panel' },
  { id:'herram',     zone:'core',     label:'Herramientas+',      icon:'🛠️', color:'#f59e0b', x:1420, y:1160, r:13, route:'/herramientas',                     info:'Suite de herramientas OSINT avanzadas' },
  { id:'pivot2',     zone:'core',     label:'Intelligence Pivot', icon:'🎯', color:'#e63946', x:1740, y:1160, r:11, route:'/pivot',                            info:'Análisis OSINT multi-fuente' },
  { id:'config',     zone:'core',     label:'Configuración',      icon:'⚙️', color:'#6b7280', x:1580, y:1260, r:9,  route:'/config',                           info:'Ajustes del sistema B-DEVOPS' },
  { id:'grc2',       zone:'core',     label:'GRC',                icon:'🛡️', color:'#e63946', x:1460, y:1080, r:9,  route:'/grc',                             info:'Gobernanza, Riesgo y Compliance' },
  { id:'surface2',   zone:'core',     label:'Attack Surface',     icon:'🗺️', color:'#f97316', x:1700, y:1080, r:9,  route:'/surface',                         info:'Análisis de superficie de ataque' },

  { id:'encoder',    zone:'core',     label:'Encoder / Decoder',  icon:'🔤', color:'#06b6d4', x:1460, y:1200, r:9,  route:'/tool/encoder',                    info:'Base64, HEX, URL, JWT decode/encode en tiempo real' },
  { id:'regex',      zone:'core',     label:'Regex Tester',       icon:'🔍', color:'#a78bfa', x:1700, y:1200, r:9,  route:'/tool/regex',                      info:'Probador de expresiones regulares con highlighting' },
  { id:'jsonview',   zone:'core',     label:'JSON Viewer',        icon:'🔧', color:'#f59e0b', x:1580, y:1320, r:9,  route:'/tool/jsonview',                   info:'Formateador y explorador de JSON — árbol interactivo' },
  { id:'diff',       zone:'core',     label:'Text Diff',          icon:'🔀', color:'#a78bfa', x:1460, y:1320, r:9,  route:'/tool/diff',                       info:'Comparador de texto y código — split/unified view' },
  { id:'markdown',   zone:'core',     label:'Markdown Editor',    icon:'📝', color:'#10b981', x:1340, y:1200, r:9,  route:'/tool/markdown',                   info:'Editor Markdown live con preview HTML y exportación' },
  { id:'hashgen',    zone:'security', label:'Hash Generator',     icon:'🧮', color:'#ec4899', x:2870, y:680,  r:9,  route:'/tool/hashgen',                    info:'Genera hashes MD5, SHA-1, SHA-256, SHA-512 en browser' },
  { id:'groq',       zone:'core',     label:'Groq AI Chat',       icon:'⚡', color:'#7c3aed', x:1700, y:1320, r:11, route:'/tool/groq',                        info:'Ultra-fast LLM · Llama 3.3 70B, Mixtral, Gemma — análisis de seguridad con IA' },
  { id:'timestamp',  zone:'core',     label:'Timestamp Tool',     icon:'⏱️', color:'#f59e0b', x:1460, y:1400, r:9,  route:'/tool/timestamp',                   info:'Conversor Unix ↔ Fecha · Formatos ISO/UTC/RFC · Live clock' },
  { id:'colorpick',  zone:'core',     label:'Color Picker',       icon:'🎨', color:'#ec4899', x:1580, y:1400, r:9,  route:'/tool/colorpicker',                 info:'HEX/RGB/HSL converter · Shades · Tailwind palette · WCAG accessibility' },

  // ══ Webs / Services zone ══════════════════════════════════════════════════════
  { id:'bdev',       zone:'web',      label:'bdev.qzz.io',        icon:'🌐', color:'#3b82f6', x:2820, y:1750, r:13, url:'https://bdev.qzz.io',                 info:'Tu sitio principal — acceso remoto' },
  { id:'cloudflare', zone:'web',      label:'Cloudflare',         icon:'☁️', color:'#f97316', x:2660, y:1700, r:11, url:'https://dash.cloudflare.com',          info:'Panel de Cloudflare — DNS, túnel, WAF' },
  { id:'github',     zone:'web',      label:'GitHub',             icon:'🐙', color:'#c084fc', x:2960, y:1700, r:10, url:'https://github.com',                   info:'Repositorios de código fuente' },
  { id:'vercel',     zone:'web',      label:'Vercel Dashboard',   icon:'▲',  color:'#e2e8f0', x:2820, y:1640, r:11, route:'/tool/vercel',                      info:'Todos tus deploys y proyectos en tiempo real' },
  { id:'digitaloc',  zone:'web',      label:'DigitalOcean',       icon:'🌊', color:'#2563eb', x:2700, y:1820, r:9,  url:'https://cloud.digitalocean.com',        info:'Cloud infrastructure VPS' },
  { id:'domains',    zone:'web',      label:'Dominios',           icon:'🏷️', color:'#f87171', x:2940, y:1820, r:8,  url:'https://dash.domain.digitalplat.org',  info:'Gestión de dominios y DNS' },
  { id:'supabase',   zone:'web',      label:'Supabase',           icon:'⚡', color:'#3ecf8e', x:3000, y:1680, r:10, url:'https://supabase.com/dashboard',       info:'Base de datos PostgreSQL + Auth + API' },
  { id:'notion',     zone:'web',      label:'Notion',             icon:'📓', color:'#e2e8f0', x:2980, y:1820, r:8,  url:'https://notion.so',                    info:'Docs y wikis del proyecto' },
  { id:'portfolio',  zone:'web',      label:'Mi Portfolio',       icon:'🧑‍💻', color:'#a78bfa', x:2900, y:1900, r:11, url:'https://jose-luis-portfolio.vercel.app', info:'Portfolio personal — proyectos, skills y contacto' },
  { id:'servicios',  zone:'web',      label:'Servicios & Precios',icon:'💼', color:'#ec4899', x:2700, y:1960, r:11, route:'/servicios',                          info:'Automatización para negocios — Planes y precios' },

  // ══ Proyectos Personales ══════════════════════════════════════════════════════
  { id:'tripbubble', zone:'web',      label:'TripBubble',         icon:'✈️', color:'#06b6d4', x:2520, y:1760, r:11,                                                        info:'App de planificación de viajes — Full Stack · En desarrollo' },
  { id:'bolsos',     zone:'web',      label:'Bolsos Clari',       icon:'👜', color:'#ec4899', x:2500, y:1870, r:10,                                                        info:'E-commerce de bolsos artesanales — Angular + Spring Boot · En desarrollo' },
  { id:'bodycraft',  zone:'web',      label:'BodyCraft',          icon:'💪', color:'#f59e0b', x:2570, y:1940, r:10,                                                        info:'App de fitness y seguimiento de entrenamiento — En desarrollo' },
  { id:'inclassweb', zone:'web',      label:'InClass',            icon:'🎓', color:'#10b981', x:2610, y:1820, r:11,                                                        info:'Plataforma educativa — gestión de clases y alumnos · Angular + Spring Boot' },

  // ══ Exploitation / PenTest zone ═══════════════════════════════════════════════
  { id:'hydra',      zone:'exploit',  label:'Hydra',              icon:'🔱', color:'#7c3aed', x:190,  y:1390, r:13, route:'/tool/hydra',                       info:'Brute force de autenticación — SSH, FTP, HTTP...' },
  { id:'sqlmap',     zone:'exploit',  label:'SQLMap',             icon:'💉', color:'#f59e0b', x:390,  y:1370, r:12, route:'/tool/sqlmap',                      info:'Detección y explotación automática de SQL Injection' },
  { id:'hashcat',    zone:'exploit',  label:'Hashcat',            icon:'💎', color:'#ec4899', x:170,  y:1530, r:12, route:'/tool/hashcat',                     info:'Cracking de hashes por GPU — MD5, SHA, bcrypt, NTLM' },
  { id:'nikto',      zone:'exploit',  label:'Nikto',              icon:'🌊', color:'#10b981', x:400,  y:1540, r:11, route:'/tool/nikto',                       info:'Escáner de vulnerabilidades web — CGI, misconfiguraciones' },
  { id:'john',       zone:'exploit',  label:'John the Ripper',    icon:'🗝️', color:'#a78bfa', x:280,  y:1660, r:11, route:'/terminal',                        info:'Cracking de passwords — ejecuta en Terminal IA' },
  { id:'msf_term',    zone:'exploit',  label:'Metasploit (Term)',   icon:'☠️', color:'#ef4444', x:160,  y:1650, r:10, route:'/terminal',                        info:'Framework de explotación — ejecuta en Terminal IA' },
  { id:'gobuster',   zone:'exploit',  label:'Gobuster',           icon:'🚀', color:'#38bdf8', x:440,  y:1450, r:9,  route:'/tool/gobuster',                   info:'Dir/DNS/VHost bruteforce — SecLists, múltiples modos' },
  { id:'searchspl',  zone:'exploit',  label:'SearchSploit',       icon:'🔎', color:'#fb923c', x:300,  y:1750, r:9,  route:'/tool/exploitdb',                   info:'Búsqueda offline de exploits (Exploit-DB)' },
  { id:'aircrack',   zone:'exploit',  label:'Aircrack-ng',        icon:'📡', color:'#22d3ee', x:190,  y:1770, r:8,  route:'/terminal',                        info:'Suite de auditoría WiFi — ejecuta en Terminal IA' },

  // ══ Nuevas herramientas PenTest / Auditoría (curriculum Evolve) ═══════════
  { id:'ffuf',      zone:'exploit',  label:'FFUF',              icon:'🎯', color:'#f59e0b', x:500,  y:1600, r:11, route:'/tool/ffuf',          info:'Web fuzzer ultrarrápido — directorios, parámetros, VHosts, LFI · SecLists' },
  { id:'gobusterp', zone:'exploit',  label:'Gobuster Pro',      icon:'🚀', color:'#38bdf8', x:500,  y:1480, r:10, route:'/tool/gobuster',      info:'Dir/DNS/VHost bruteforce — listas SecLists, modos dir/dns/fuzz' },
  { id:'nfstool',   zone:'exploit',  label:'NFS / RPC',         icon:'🗄️', color:'#22d3ee', x:250,  y:1590, r:9,  route:'/tool/nfs',           info:'NFS recon — showmount, rpcinfo, mount root, rlogin, cat shadow' },
  { id:'wpscan',    zone:'security', label:'WPScan',            icon:'🔍', color:'#3b82f6', x:2860, y:960,  r:9,  route:'/tool/wpscan',        info:'Escáner WordPress — CVEs, plugins, usuarios, contraseñas, xmlrpc' },
  { id:'adit',      zone:'security', label:'Active Directory',  icon:'🏢', color:'#f59e0b', x:2650, y:1140, r:11, route:'/tool/ad',            info:'AD Recon — enum4linux, BloodHound, Kerbrute, Pass-the-Hash, Kerberoasting' },
  { id:'wireless',  zone:'security', label:'WiFi Audit',        icon:'📶', color:'#06b6d4', x:2200, y:910,  r:10, route:'/tool/wireless',      info:'Auditoría inalámbrica — handshake WPA2, PSK/Enterprise, PMKID, Evil Twin' },
  { id:'socialeng', zone:'security', label:'Ing. Social',       icon:'🎭', color:'#ec4899', x:2410, y:1110, r:10, route:'/tool/socialeng',     info:'Phishing · Vishing · Baiting — GoPhish, SET Framework, pretexting' },
  { id:'openvas',   zone:'security', label:'OpenVAS / Nessus',  icon:'🔬', color:'#10b981', x:2720, y:1100, r:9,  route:'/tool/openvas',       info:'Vulnerability Management — OpenVAS GVM, Nessus, Qualys — scans CVSS' },
  { id:'cloudit',   zone:'infra',    label:'Cloud Audit',       icon:'☁️', color:'#60a5fa', x:1960, y:2060, r:10, route:'/tool/cloudaudit',   info:'AWS/Azure/GCP audit — ScoutSuite, Prowler, Pacu, CloudFox, IAM recon' },
  { id:'iot',       zone:'security', label:'IoT Security',      icon:'📡', color:'#a78bfa', x:2940, y:850,  r:9,  route:'/tool/iot',           info:'Auditoría IoT — firmware, MQTT, Zigbee, BLE, SCADA, Shodan IoT queries' },
  { id:'privesc',  zone:'exploit',  label:'Privesc',           icon:'⬆️', color:'#f59e0b', x:380,  y:1720, r:11, route:'/tool/privesc',       info:'Escalada de privilegios — SUID, sudo -l, LinPEAS, WinPEAS, GTFOBins, capabilities' },
  { id:'forense',  zone:'security', label:'Forense Digital',   icon:'🧪', color:'#06b6d4', x:2820, y:1260, r:10, route:'/tool/forense',       info:'Forense digital — Volatility3, strings, strace, exiftool, binwalk, lsof, timestamps' },
  { id:'blueteam', zone:'security', label:'Blue Team',         icon:'🛡️', color:'#3b82f6', x:3060, y:1000, r:10, route:'/tool/blueteam',      info:'Blue Team — Lynis, rkhunter, IOC detection, SIEM, Autoruns, incident response' },
  { id:'tunnels',  zone:'exploit',  label:'Túneles & Pivot',   icon:'🔗', color:'#8b5cf6', x:620,  y:1760, r:10, route:'/tool/tunnels',       info:'Pivoting y túneles — SSH -L/-R/-D, netcat, reverse shells, chisel, proxychains, socat' },
  { id:'msf',      zone:'exploit',  label:'Metasploit',        icon:'💀', color:'#ef4444', x:180,  y:1800, r:12, route:'/tool/metasploit',    info:'Metasploit Framework — msfconsole, Meterpreter, msfvenom, EternalBlue, post-explotación' },
]

// ─── Connections ──────────────────────────────────────────────────────────────
const LINKS = [
  // OSINT
  ['pivot','shodan'],['pivot','censys'],['pivot','hunter'],['pivot','osintpage'],
  ['pivot','virustotal'],['urlscan','virustotal'],['shodan','censys'],['shodan','dnsdump'],
  ['hunter','dehashed'],['whois','dnsdump'],['urlscan','wayback'],['dehashed','hibp'],
  ['whatsmyname','pivot'],['whatsmyname','dehashed'],['bgp','shodan'],['bgp','dnsdump'],
  ['subdomains','dnsdump'],['subdomains','censys'],['subdomains','urlscan'],
  ['geoip','bgp'],['geoip','pivot'],['emailhdr','virustotal'],['emailhdr','pivot'],
  ['qrcode','bdev'],
  // Security
  ['audit','surface'],['audit','grc'],['surface','nmap'],['burp','exploitdb'],
  ['nmap','shodan2'],['grc','bcp'],['cve','exploitdb'],['hibp','dehashed'],
  ['threatintel','virustotal'],['threatintel','cve'],['passwords','hibp'],['passwords','hashcat'],
  ['hashlookup','hashcat'],['hashlookup','virustotal'],['sslcheck','urlscan'],['sslcheck','bdev'],
  // Infra
  ['terminal','command'],['terminal','scripts'],['infra','n8n'],['infra','devops'],
  ['devops','clickhouse'],['swagger','infra'],['n8n','command'],['ipcalc','infra'],['ipcalc','bgp'],['portscan','nmap'],['portscan','ipcalc'],['cronhelper','n8n'],['cronhelper','scripts'],
  // Mgmt
  ['dashboard','clientes'],['dashboard','proyectos'],['workspace','clientes'],
  ['monitor','dashboard'],['reportes','dashboard'],['prospector','clientes'],
  // Core connections
  ['portal','dashboard'],['portal','herram'],['portal','clientes'],
  ['herram','pivot2'],['herram','shodan'],['grc2','surface2'],
  ['encoder','regex'],['encoder','herram'],['regex','pivot2'],['jsonview','encoder'],['diff','jsonview'],['diff','encoder'],['markdown','encoder'],['markdown','diff'],
  ['groq','herram'],['groq','jsonview'],['groq','markdown'],
  ['timestamp','cronhelper'],['timestamp','groq'],['colorpick','encoder'],['colorpick','markdown'],
  ['hashgen','hashlookup'],['hashgen','passwords'],
  // Web
  ['bdev','cloudflare'],['bdev','vercel'],['github','vercel'],['cloudflare','domains'],
  ['vercel','supabase'],['github','supabase'],['servicios','bdev'],['servicios','clientes'],
  // Proyectos personales
  ['tripbubble','bdev'],['tripbubble','inclassweb'],['tripbubble','bolsos'],
  ['bolsos','bodycraft'],['bolsos','vercel'],['bodycraft','bdev'],
  ['inclassweb','bdev'],['inclassweb','vercel'],
  // Exploitation
  ['hydra','sqlmap'],['hydra','nmap'],['sqlmap','nikto'],['hashcat','john'],
  ['msf','nikto'],['msf','searchspl'],['nikto','burp'],['gobuster','nikto'],
  ['searchspl','exploitdb'],['aircrack','hydra'],
  // Cross-zone
  ['nmap','hydra'],['shodan','nmap'],['censys','nmap'],
  // New tools
  ['ffuf','gobuster'],['ffuf','nikto'],['ffuf','hydra'],['ffuf','nfstool'],['ffuf','gobusterp'],
  ['gobusterp','ffuf'],['gobusterp','nikto'],
  ['nfstool','nmap'],['nfstool','sqlmap'],['nfstool','john'],
  ['wpscan','burp'],['wpscan','cve'],['wpscan','exploitdb'],['wpscan','hydra'],
  ['adit','nmap'],['adit','openvas'],['adit','hydra'],['adit','hashcat'],
  ['wireless','aircrack'],['wireless','nmap'],['wireless','hydra'],
  ['socialeng','pivot'],['socialeng','hibp'],['socialeng','audit'],
  ['openvas','nmap'],['openvas','cve'],['openvas','adit'],
  ['cloudit','infra'],['cloudit','devops'],['cloudit','surface'],
  ['iot','shodan'],['iot','nmap'],['iot','wireless'],
]

// ─── Mobile detection (module-level, stable) ─────────────────────────────────
const IS_MOBILE = window.innerWidth < 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

// ─── rgb helper ───────────────────────────────────────────────────────────────
const toRgb = h => h.slice(1).match(/../g).map(x=>parseInt(x,16))

// ─── Pre-render background to offscreen canvas ────────────────────────────────
function buildBg() {
  const oc = document.createElement('canvas')
  oc.width = W; oc.height = H
  const ctx = oc.getContext('2d')

  // Dark space background gradient
  const bgGrad = ctx.createRadialGradient(W*0.35, H*0.42, 0, W*0.5, H*0.5, W*0.7)
  bgGrad.addColorStop(0,   'rgba(26,8,80,0.9)')
  bgGrad.addColorStop(0.3, 'rgba(10,2,40,0.95)')
  bgGrad.addColorStop(0.7, 'rgba(2,0,18,1)')
  bgGrad.addColorStop(1,   'rgba(0,5,15,1)')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // Tiny background stars — bright + dim layers
  const COLS = ['#ffffff','#c8d8ff','#ffd8ff','#d8ffe8','#ffe8d8','#f8f0ff','#aad4ff','#ffeedd']
  for (let i = 0; i < 12000; i++) {
    const a = 0.04 + Math.random() * 0.65
    const r = Math.random() * 1.5
    ctx.beginPath()
    ctx.arc(Math.random()*W, Math.random()*H, r, 0, Math.PI*2)
    ctx.fillStyle = COLS[Math.floor(Math.random()*COLS.length)] + Math.floor(a*255).toString(16).padStart(2,'0')
    ctx.fill()
  }
  // Bright giant stars (fewer)
  for (let i = 0; i < 120; i++) {
    const x = Math.random()*W, y = Math.random()*H
    const r = 1.2 + Math.random()*1.2
    const a = 0.3 + Math.random()*0.5
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI*2)
    ctx.fillStyle = `rgba(255,245,230,${a})`
    ctx.fill()
    // tiny glow
    const g = ctx.createRadialGradient(x, y, 0, x, y, r*4)
    g.addColorStop(0, `rgba(255,245,230,${a*0.4})`)
    g.addColorStop(1, 'rgba(255,245,230,0)')
    ctx.beginPath()
    ctx.arc(x, y, r*4, 0, Math.PI*2)
    ctx.fillStyle = g
    ctx.fill()
  }

  // Zone nebula blobs
  ZONES.forEach(z => {
    const [r,g,b] = toRgb(z.color)
    // Inner glow
    const g1 = ctx.createRadialGradient(z.cx, z.cy, 0, z.cx, z.cy, z.r)
    g1.addColorStop(0,   `rgba(${r},${g},${b},0.12)`)
    g1.addColorStop(0.4, `rgba(${r},${g},${b},0.06)`)
    g1.addColorStop(0.8, `rgba(${r},${g},${b},0.02)`)
    g1.addColorStop(1,   `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = g1
    ctx.beginPath(); ctx.arc(z.cx, z.cy, z.r, 0, Math.PI*2); ctx.fill()

    // Outer wisp
    const g2 = ctx.createRadialGradient(z.cx, z.cy, z.r*0.5, z.cx, z.cy, z.r*1.6)
    g2.addColorStop(0, `rgba(${r},${g},${b},0.03)`)
    g2.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = g2
    ctx.beginPath(); ctx.arc(z.cx, z.cy, z.r*1.6, 0, Math.PI*2); ctx.fill()
  })

  // Galactic center glow
  const gc = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, 600)
  gc.addColorStop(0, 'rgba(200,180,255,0.08)')
  gc.addColorStop(0.5,'rgba(150,100,255,0.04)')
  gc.addColorStop(1, 'rgba(150,100,255,0)')
  ctx.fillStyle = gc
  ctx.beginPath(); ctx.arc(W/2, H/2, 600, 0, Math.PI*2); ctx.fill()

  // ── Edge vignette — seamless blend into infinite space ──────────────────
  // Uses destination-out to erase the world canvas edges so they fade
  // transparently into the screen-space background (no visible rectangle)
  const FADE = 520
  ctx.globalCompositeOperation = 'destination-out'
  let eg
  // Top
  eg = ctx.createLinearGradient(0, 0, 0, FADE)
  eg.addColorStop(0, 'rgba(0,0,0,1)'); eg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = eg; ctx.fillRect(0, 0, W, FADE)
  // Bottom
  eg = ctx.createLinearGradient(0, H - FADE, 0, H)
  eg.addColorStop(0, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.fillStyle = eg; ctx.fillRect(0, H - FADE, W, FADE)
  // Left
  eg = ctx.createLinearGradient(0, 0, FADE, 0)
  eg.addColorStop(0, 'rgba(0,0,0,1)'); eg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = eg; ctx.fillRect(0, 0, FADE, H)
  // Right
  eg = ctx.createLinearGradient(W - FADE, 0, W, 0)
  eg.addColorStop(0, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.fillStyle = eg; ctx.fillRect(W - FADE, 0, FADE, H)
  ctx.globalCompositeOperation = 'source-over'
  // ─────────────────────────────────────────────────────────────────────────

  return oc
}

// ─── Main Galaxy Component ────────────────────────────────────────────────────
export default function Galaxy() {
  const canvasRef   = useRef(null)
  const bgRef       = useRef(null)   // offscreen bg canvas
  const camRef      = useRef({ x: W/2, y: H/2 - 100, zoom: IS_MOBILE ? 0.36 : 0.42 })
  const targetRef   = useRef({ x: W/2, y: H/2 - 100, zoom: IS_MOBILE ? 0.36 : 0.42 })
  const dragRef     = useRef(null)
  const touchRef    = useRef(null)   // pinch state { lastDist, lastMidX, lastMidY }
  const hovRef      = useRef(null)   // currently hovered star id
  const flyRef      = useRef(null)   // { star, onDone, startTime }
  const frameRef    = useRef(null)
  const tickRef     = useRef(0)
  // Shooting stars
  const shootRef    = useRef([])     // [{ wx, wy, vx, vy, life, maxLife, color }]

  const [tooltip,     setTooltip]   = useState(null)
  const [flashStar,   setFlashStar] = useState(null)
  const [showLogin,   setShowLogin] = useState(false)
  const [pendingRoute,setPending]   = useState(null)
  const [pw,          setPw]        = useState('')
  const [showPw,      setShowPw]    = useState(false)
  const [loginErr,    setLoginErr]  = useState('')
  const [loginBusy,   setLoginBusy] = useState(false)
  // Tab: 'admin' | 'user' | 'register'
  const [loginTab,    setLoginTab]  = useState('admin')
  const [regUser,     setRegUser]   = useState('')
  const [regEmail,    setRegEmail]  = useState('')
  const [regPw,       setRegPw]     = useState('')
  const [regReason,   setRegReason] = useState('')
  const [regDone,     setRegDone]   = useState(false)
  const [regBusy,     setRegBusy]   = useState(false)
  const [regErr,      setRegErr]    = useState('')
  const [userLogin,   setUserLogin] = useState('')

  const { token, login } = useAuth()
  const navigate = useNavigate()

  // Token ref for use inside callbacks
  const tokenRef = useRef(token)
  useEffect(() => { tokenRef.current = token }, [token])

  // Build background
  useEffect(() => { bgRef.current = buildBg() }, [])

  // ── Drawing ────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const bg = bgRef.current
    if (!canvas || !bg) return

    const ctx  = canvas.getContext('2d')
    const SW   = canvas.width
    const SH   = canvas.height
    const cam  = camRef.current
    const t    = tickRef.current
    const hov  = hovRef.current

    ctx.clearRect(0, 0, SW, SH)

    // ── Full-screen background (screen space, always covers entire canvas) ──
    const screenBg = ctx.createRadialGradient(SW*0.28, SH*0.42, 0, SW/2, SH/2, Math.max(SW, SH)*0.9)
    screenBg.addColorStop(0,   '#1e0060')
    screenBg.addColorStop(0.25,'#0a0128')
    screenBg.addColorStop(0.55,'#020012')
    screenBg.addColorStop(1,   '#00050f')
    ctx.fillStyle = screenBg
    ctx.fillRect(0, 0, SW, SH)
    // Scatter dense screen-space stars — fills the infinite void beyond world canvas
    const rng = (n) => (Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1
    const STAR_COLS = ['200,220,255','255,240,220','220,255,240','255,220,240','200,200,255']
    for (let i = 0; i < 2800; i++) {
      const sx = Math.abs(rng(i * 2))     * SW
      const sy = Math.abs(rng(i * 2 + 1)) * SH
      const sa = 0.05 + Math.abs(rng(i * 3)) * 0.3
      const col = STAR_COLS[Math.floor(Math.abs(rng(i * 11)) * STAR_COLS.length)]
      ctx.beginPath()
      ctx.arc(sx, sy, 0.3 + Math.abs(rng(i * 7)) * 1.1, 0, Math.PI*2)
      ctx.fillStyle = `rgba(${col},${sa})`
      ctx.fill()
    }
    // Occasional brighter screen-space star
    for (let i = 0; i < 60; i++) {
      const sx = Math.abs(rng(i * 13 + 5)) * SW
      const sy = Math.abs(rng(i * 13 + 6)) * SH
      ctx.beginPath()
      ctx.arc(sx, sy, 1.0 + Math.abs(rng(i * 9)) * 0.8, 0, Math.PI*2)
      ctx.fillStyle = `rgba(255,248,235,${0.2 + Math.abs(rng(i * 17)) * 0.35})`
      ctx.fill()
    }

    ctx.save()

    // Camera transform: center on cam.x,cam.y with cam.zoom
    ctx.translate(SW/2, SH/2)
    ctx.scale(cam.zoom, cam.zoom)
    ctx.translate(-cam.x, -cam.y)

    // World background (3200×2200 — blends into screen-space bg)
    ctx.drawImage(bg, 0, 0)

    // Zone labels (only when zoomed out)
    if (cam.zoom < 0.65) {
      ZONES.forEach(z => {
        const [r,g,b] = toRgb(z.color)
        const alpha = Math.min(0.55, (0.65 - cam.zoom) * 3)
        ctx.save()
        ctx.font = `bold ${Math.round(18/cam.zoom)}px 'Inter', sans-serif`
        ctx.textAlign = 'center'
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.shadowBlur = 20/cam.zoom
        ctx.shadowColor = z.color
        ctx.fillText(z.label, z.cx, z.cy - z.r - 10)
        ctx.restore()
      })
    }

    // Connection lines
    ctx.save()
    LINKS.forEach(([a, b]) => {
      const sa = STARS.find(s=>s.id===a)
      const sb = STARS.find(s=>s.id===b)
      if (!sa||!sb) return
      const active = hov===a||hov===b
      const [r,g,bb] = toRgb(active ? (STARS.find(s=>s.id===hov)?.color||'#ffffff') : '#ffffff')
      ctx.beginPath()
      ctx.moveTo(sa.x, sa.y)
      ctx.lineTo(sb.x, sb.y)
      ctx.strokeStyle = active ? `rgba(${r},${g},${bb},0.4)` : 'rgba(255,255,255,0.045)'
      ctx.lineWidth = active ? 1.2/cam.zoom : 0.7/cam.zoom
      ctx.setLineDash([4/cam.zoom, 9/cam.zoom])
      ctx.stroke()
    })
    ctx.setLineDash([])
    ctx.restore()

    // Stars
    STARS.forEach(star => {
      const isHov = hov === star.id
      const pulse = 0.82 + 0.18 * Math.sin(t * 0.04 + (star.id.charCodeAt(0)*1.37 % (Math.PI*2)))
      const [sr,sg,sb2] = toRgb(star.color)
      const baseR = star.r

      // Outer glow
      const glowR = baseR * (isHov ? 5.5 : 3.5) * pulse
      const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowR)
      glow.addColorStop(0, `rgba(${sr},${sg},${sb2},${isHov ? 0.55 : 0.22})`)
      glow.addColorStop(0.5,`rgba(${sr},${sg},${sb2},${isHov ? 0.15 : 0.06})`)
      glow.addColorStop(1,   `rgba(${sr},${sg},${sb2},0)`)
      ctx.beginPath()
      ctx.arc(star.x, star.y, glowR, 0, Math.PI*2)
      ctx.fillStyle = glow
      ctx.fill()

      // Star spikes (cross) for larger stars
      if (baseR >= 10) {
        ctx.save()
        ctx.strokeStyle = `rgba(${sr},${sg},${sb2},${isHov ? 0.7 : 0.35})`
        ctx.lineWidth = (isHov ? 1.2 : 0.7) / cam.zoom
        const spikeLen = baseR * (isHov ? 4.5 : 3)
        for (let i = 0; i < 4; i++) {
          const ang = (i/4) * Math.PI*2 + Math.PI/8
          ctx.beginPath()
          ctx.moveTo(star.x + Math.cos(ang)*baseR*0.6, star.y + Math.sin(ang)*baseR*0.6)
          ctx.lineTo(star.x + Math.cos(ang)*spikeLen, star.y + Math.sin(ang)*spikeLen)
          ctx.stroke()
        }
        ctx.restore()
      }

      // Star body
      const bodyR = baseR * (isHov ? 1.25 : 1) * pulse
      const body = ctx.createRadialGradient(
        star.x - bodyR*0.28, star.y - bodyR*0.28, 0,
        star.x, star.y, bodyR
      )
      body.addColorStop(0,   '#ffffff')
      body.addColorStop(0.25,`rgba(${sr},${sg},${sb2},1)`)
      body.addColorStop(0.7, `rgba(${sr},${sg},${sb2},0.85)`)
      body.addColorStop(1,   `rgba(${sr},${sg},${sb2},0.2)`)
      ctx.beginPath()
      ctx.arc(star.x, star.y, bodyR, 0, Math.PI*2)
      ctx.fillStyle = body
      ctx.fill()

      // Label
      if (cam.zoom > 0.28) {
        const labelAlpha = Math.min(1, (cam.zoom - 0.28) * 4)
        const fs = Math.max(9, Math.min(14, 11/cam.zoom * 0.55))
        ctx.save()
        ctx.font = `${isHov ? 'bold ' : ''}${fs}px 'Inter', sans-serif`
        ctx.textAlign = 'center'
        ctx.fillStyle = isHov
          ? `rgba(${sr},${sg},${sb2},${labelAlpha})`
          : `rgba(255,255,255,${labelAlpha * 0.62})`
        if (isHov) { ctx.shadowBlur = 8; ctx.shadowColor = star.color }
        ctx.fillText(`${star.icon} ${star.label}`, star.x, star.y + baseR + 15/cam.zoom)
        ctx.restore()
      }
    })

    // Shooting stars (draw in world space)
    const shoots = shootRef.current
    for (let i = shoots.length - 1; i >= 0; i--) {
      const s = shoots[i]
      const prog = s.life / s.maxLife
      const alpha = prog < 0.3 ? prog/0.3 : prog > 0.8 ? (1-prog)/0.2 : 1
      const len = 120 * (0.4 + prog * 0.6)
      const tail = ctx.createLinearGradient(
        s.wx, s.wy,
        s.wx - s.vx * len, s.wy - s.vy * len
      )
      tail.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`)
      tail.addColorStop(0.3, `rgba(200,220,255,${alpha * 0.5})`)
      tail.addColorStop(1, `rgba(180,200,255,0)`)
      ctx.beginPath()
      ctx.moveTo(s.wx, s.wy)
      ctx.lineTo(s.wx - s.vx * len, s.wy - s.vy * len)
      ctx.strokeStyle = tail
      ctx.lineWidth = (2 - prog) / cam.zoom
      ctx.stroke()
      // Bright head
      ctx.beginPath()
      ctx.arc(s.wx, s.wy, 2/cam.zoom, 0, Math.PI*2)
      ctx.fillStyle = `rgba(255,255,255,${alpha})`
      ctx.fill()
      // Advance
      s.wx += s.vx * 8
      s.wy += s.vy * 8
      s.life++
      if (s.life >= s.maxLife) shoots.splice(i, 1)
    }

    ctx.restore()
    tickRef.current++
  }, [])

  // ── Animation loop ─────────────────────────────────────────────────────────
  const loop = useCallback(() => {
    const cam = camRef.current
    const tgt = targetRef.current
    const LERP = 0.1

    cam.x    += (tgt.x    - cam.x)    * LERP
    cam.y    += (tgt.y    - cam.y)    * LERP
    cam.zoom += (tgt.zoom - cam.zoom) * LERP

    // Check fly-to done
    if (flyRef.current) {
      const { star, onDone, startTime } = flyRef.current
      if (Date.now() - startTime > 900) {
        flyRef.current = null
        onDone()
      }
    }

    // Spawn shooting stars randomly (~every 4s on average)
    if (Math.random() < 0.004) {
      const edge = Math.random()
      let wx, wy, vx, vy
      if (edge < 0.5) { wx = Math.random()*W; wy = 0; vx = (Math.random()-0.5)*0.4; vy = 0.6+Math.random()*0.4 }
      else             { wx = 0; wy = Math.random()*H*0.6; vx = 0.6+Math.random()*0.4; vy = (Math.random()-0.3)*0.3 }
      shootRef.current.push({ wx, wy, vx, vy, life:0, maxLife:40+Math.random()*30 })
      if (shootRef.current.length > 6) shootRef.current.shift()
    }

    draw()
    frameRef.current = requestAnimationFrame(loop)
  }, [draw])

  // Setup canvas + loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    frameRef.current = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(frameRef.current)
    }
  }, [loop])

  // ── Coordinate helpers ─────────────────────────────────────────────────────
  const toWorld = useCallback((ex, ey) => {
    const { x, y, zoom } = camRef.current
    const canvas = canvasRef.current
    const wx = (ex - canvas.width/2)  / zoom + x
    const wy = (ey - canvas.height/2) / zoom + y
    return [wx, wy]
  }, [])

  const findStar = useCallback((wx, wy, zoom) => {
    const minHit = Math.max(IS_MOBILE ? 28 : 16, 16/zoom)
    return STARS.find(s => {
      const hit = Math.max(minHit, s.r * (IS_MOBILE ? 2.4 : 1.8))
      return Math.hypot(wx - s.x, wy - s.y) < hit
    }) ?? null
  }, [])

  // ── Mouse events ──────────────────────────────────────────────────────────
  const onMouseMove = useCallback((e) => {
    if (dragRef.current) {
      const { sx, sy, cx, cy } = dragRef.current
      const zoom = camRef.current.zoom
      const nx = cx - (e.clientX - sx) / zoom
      const ny = cy - (e.clientY - sy) / zoom
      camRef.current.x = nx
      camRef.current.y = ny
      targetRef.current.x = nx
      targetRef.current.y = ny
      return
    }
    const [wx, wy] = toWorld(e.clientX, e.clientY)
    const star = findStar(wx, wy, camRef.current.zoom)
    const id = star?.id ?? null
    if (id !== hovRef.current) {
      hovRef.current = id
      canvasRef.current.style.cursor = id ? 'pointer' : 'grab'
      setTooltip(star ? { star, x: e.clientX, y: e.clientY } : null)
    } else if (star) {
      setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)
    }
  }, [toWorld, findStar])

  const onMouseDown = useCallback((e) => {
    dragRef.current = { sx: e.clientX, sy: e.clientY, cx: camRef.current.x, cy: camRef.current.y }
    canvasRef.current.style.cursor = 'grabbing'
  }, [])

  const onMouseUp = useCallback((e) => {
    const d = dragRef.current
    if (!d) return
    const moved = Math.hypot(e.clientX - d.sx, e.clientY - d.sy)
    dragRef.current = null
    canvasRef.current.style.cursor = hovRef.current ? 'pointer' : 'grab'
    if (moved < 6) {
      const [wx, wy] = toWorld(e.clientX, e.clientY)
      const star = findStar(wx, wy, camRef.current.zoom)
      if (star) clickStar(star)
    }
  }, [toWorld, findStar]) // clickStar added below via ref

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const [wx, wy] = toWorld(e.clientX, e.clientY)
    const cam = camRef.current
    const factor = e.deltaY < 0 ? 1.14 : 1/1.14
    const nz = Math.max(0.18, Math.min(5, cam.zoom * factor))
    // Zoom toward mouse
    const nx = wx - (wx - cam.x) * (nz / cam.zoom)
    const ny = wy - (wy - cam.y) * (nz / cam.zoom)
    targetRef.current = { x: nx, y: ny, zoom: nz }
  }, [toWorld])

  // ── Touch events (mobile) ────────────────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    const touches = Array.from(e.touches)
    touchRef.current = null
    if (touches.length === 1) {
      const t = touches[0]
      dragRef.current = {
        sx: t.clientX, sy: t.clientY,
        cx: camRef.current.x, cy: camRef.current.y,
        isTap: true,
      }
    } else if (touches.length === 2) {
      dragRef.current = null
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      touchRef.current = {
        lastDist: Math.hypot(dx, dy),
        lastMidX: (touches[0].clientX + touches[1].clientX) / 2,
        lastMidY: (touches[0].clientY + touches[1].clientY) / 2,
      }
    }
  }, [])

  const onTouchMove = useCallback((e) => {
    const touches = Array.from(e.touches)
    if (touches.length === 2 && touchRef.current) {
      // Pinch zoom + two-finger pan
      const dx     = touches[0].clientX - touches[1].clientX
      const dy     = touches[0].clientY - touches[1].clientY
      const dist   = Math.hypot(dx, dy)
      const midX   = (touches[0].clientX + touches[1].clientX) / 2
      const midY   = (touches[0].clientY + touches[1].clientY) / 2
      const cam    = camRef.current
      const factor = dist / touchRef.current.lastDist
      const [wx, wy] = toWorld(midX, midY)
      const nz = Math.max(0.18, Math.min(5, cam.zoom * factor))
      // Zoom toward midpoint + pan with midpoint movement
      const nx = wx - (wx - cam.x) * (nz / cam.zoom) - (midX - touchRef.current.lastMidX) / nz
      const ny = wy - (wy - cam.y) * (nz / cam.zoom) - (midY - touchRef.current.lastMidY) / nz
      camRef.current    = { x: nx, y: ny, zoom: nz }
      targetRef.current = { x: nx, y: ny, zoom: nz }
      touchRef.current.lastDist = dist
      touchRef.current.lastMidX = midX
      touchRef.current.lastMidY = midY
    } else if (touches.length === 1 && dragRef.current) {
      // Single-finger pan
      const t     = touches[0]
      const moved = Math.hypot(t.clientX - dragRef.current.sx, t.clientY - dragRef.current.sy)
      if (moved > 8) dragRef.current.isTap = false
      const zoom = camRef.current.zoom
      const nx   = dragRef.current.cx - (t.clientX - dragRef.current.sx) / zoom
      const ny   = dragRef.current.cy - (t.clientY - dragRef.current.sy) / zoom
      camRef.current.x = nx; camRef.current.y = ny
      targetRef.current.x = nx; targetRef.current.y = ny
    }
  }, [toWorld])

  const onTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) touchRef.current = null
    if (e.touches.length === 0 && dragRef.current?.isTap) {
      const t = e.changedTouches[0]
      if (t) {
        const [wx, wy] = toWorld(t.clientX, t.clientY)
        const star     = findStar(wx, wy, camRef.current.zoom)
        if (star) {
          hovRef.current = star.id
          // Show tooltip on tap — position it so it stays on-screen
          const tipX = Math.min(t.clientX + 12, window.innerWidth  - 240)
          const tipY = Math.max(t.clientY - 70, 10)
          setTooltip({ star, x: tipX, y: tipY })
          setTimeout(() => { hovRef.current = null; setTooltip(null) }, 2500)
          clickRef.current(star)
        }
      }
    }
    if (e.touches.length === 0) dragRef.current = null
  }, [toWorld, findStar])

  // ── Touch listener registration (separate effect — defined after handlers) ──
  // Must use passive:false so preventDefault() prevents browser scroll/zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const opts = { passive: false }
    canvas.addEventListener('touchstart', onTouchStart, opts)
    canvas.addEventListener('touchmove',  onTouchMove,  opts)
    canvas.addEventListener('touchend',   onTouchEnd,   opts)
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onTouchStart, onTouchMove, onTouchEnd])

  // ── Star click ────────────────────────────────────────────────────────────
  const clickStar = useCallback((star) => {
    if (!tokenRef.current) {
      // Not logged in — show login, remember destination
      setPending(star.route || star.url || null)
      setShowLogin(true)
      return
    }
    setTooltip(null)
    hovRef.current = null
    setFlashStar(star.id)

    // Fly to star
    targetRef.current = { x: star.x, y: star.y, zoom: 3.2 }
    flyRef.current = {
      star,
      startTime: Date.now(),
      onDone: () => {
        setFlashStar(null)
        if (star.route) {
          navigate(star.route)
        } else if (star.url) {
          window.open(star.url, '_blank', 'noopener,noreferrer')
          // Zoom back out after opening external
          setTimeout(() => {
            targetRef.current = { x: star.x, y: star.y, zoom: 1.0 }
            setTimeout(() => {
              targetRef.current = { x: W/2, y: H/2-100, zoom: 0.42 }
            }, 2000)
          }, 400)
        }
      },
    }
  }, [navigate])

  // Keep clickStar accessible from onMouseUp (avoid stale closure)
  const clickRef = useRef(clickStar)
  useEffect(() => { clickRef.current = clickStar }, [clickStar])

  // Patch onMouseUp to use ref
  const onMouseUpFinal = useCallback((e) => {
    const d = dragRef.current
    if (!d) return
    const moved = Math.hypot(e.clientX - d.sx, e.clientY - d.sy)
    dragRef.current = null
    canvasRef.current.style.cursor = hovRef.current ? 'pointer' : 'grab'
    if (moved < 6) {
      const [wx, wy] = toWorld(e.clientX, e.clientY)
      const star = findStar(wx, wy, camRef.current.zoom)
      if (star) clickRef.current(star)
    }
  }, [toWorld, findStar])

  // ── Auth login ────────────────────────────────────────────────────────────
  const doLogin = async (e) => {
    e.preventDefault()
    if (loginBusy) return
    if (loginTab === 'admin' && !pw) return
    if (loginTab === 'user' && (!userLogin || !pw)) return
    setLoginBusy(true); setLoginErr('')
    try {
      await login(pw, loginTab === 'user' ? userLogin : null)
      setShowLogin(false); setPw(''); setUserLogin(''); setLoginErr('')
      if (pendingRoute) {
        if (pendingRoute.startsWith('/')) navigate(pendingRoute)
        else window.open(pendingRoute, '_blank', 'noopener,noreferrer')
        setPending(null)
      }
    } catch(err) {
      setLoginErr(err.response?.data?.detail || 'Credenciales incorrectos')
      setPw('')
    } finally { setLoginBusy(false) }
  }

  const doRegister = async (e) => {
    e.preventDefault()
    if (!regUser || !regEmail || !regPw || regBusy) return
    setRegBusy(true); setRegErr('')
    try {
      await authApi.register(regUser, regEmail, regPw, regReason)
      setRegDone(true)
    } catch(err) {
      setRegErr(err.response?.data?.detail || 'Error al registrarse')
    } finally { setRegBusy(false) }
  }

  // ── Zoom controls ─────────────────────────────────────────────────────────
  const zoomBy = (f) => {
    const cam = camRef.current
    const nz = Math.max(0.18, Math.min(5, cam.zoom * f))
    targetRef.current = { ...targetRef.current, zoom: nz }
  }
  const resetView = () => {
    targetRef.current = { x: W/2, y: H/2 - 100, zoom: IS_MOBILE ? 0.36 : 0.42 }
  }

  return (
    <>
      <style>{`
        @keyframes warpIn   { 0%{opacity:0;transform:scale(0.8)}30%{opacity:1;transform:scale(1.05)}100%{opacity:0;transform:scale(2.5)} }
        @keyframes warpPulse{ 0%{opacity:0}20%{opacity:0.9}60%{opacity:0.4}100%{opacity:0} }
        @keyframes loginIn  { from{opacity:0;transform:translateY(-14px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes hudIn    { from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)} }
        @keyframes tipIn    { from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)} }
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{overflow:hidden}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(139,92,246,.35);border-radius:2px}
        input::placeholder{color:rgba(255,255,255,.28)!important}
      `}</style>

      {/* ── Main Galaxy Canvas ────────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        style={{
          position:'fixed', inset:0, display:'block',
          cursor:'grab', userSelect:'none', touchAction:'none',
          background:'radial-gradient(ellipse at 28% 42%, #1e0060 0%, #08001e 28%, #020012 58%, #000810 100%)',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUpFinal}
        onMouseLeave={()=>{ dragRef.current=null; hovRef.current=null; setTooltip(null); if(canvasRef.current) canvasRef.current.style.cursor='grab' }}
        onWheel={onWheel}
        onContextMenu={e=>e.preventDefault()}
      />

      {/* ── Warp flash effect — colored by clicked star ──────────────────── */}
      {flashStar && (() => {
        const s = STARS.find(st => st.id === flashStar)
        const col = s?.color || '#ffffff'
        const [fr, fg, fb] = toRgb(col)
        return (
          <>
            <div style={{ position:'fixed', inset:0, zIndex:60, pointerEvents:'none',
              background:`radial-gradient(circle at 50% 50%, rgba(${fr},${fg},${fb},0.18) 0%, rgba(${fr},${fg},${fb},0.06) 35%, transparent 70%)`,
              animation:'warpIn 0.9s ease-out forwards' }}/>
            <div style={{ position:'fixed', inset:0, zIndex:59, pointerEvents:'none',
              background:`radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 50%)`,
              animation:'warpPulse 0.7s ease-out forwards' }}/>
          </>
        )
      })()}

      {/* ── HUD: Controls ────────────────────────────────────────────────── */}
      <div style={{
        position:'fixed', top:20, right:20, zIndex:20, display:'flex', flexDirection:'column', gap:6,
        animation:'hudIn 0.5s ease-out',
      }}>
        {[
          { icon:<ZoomIn size={14}/>, action:()=>zoomBy(1.3), tip:'Acercar' },
          { icon:<ZoomOut size={14}/>, action:()=>zoomBy(1/1.3), tip:'Alejar' },
          { icon:<Crosshair size={14}/>, action:resetView, tip:'Vista general' },
        ].map((b,i) => (
          <button key={i} onClick={b.action} title={b.tip} style={{
            width: IS_MOBILE ? 46 : 32, height: IS_MOBILE ? 46 : 32, borderRadius: IS_MOBILE ? 13 : 9,
            background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
            color:'rgba(255,255,255,0.55)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            backdropFilter:'blur(10px)', transition:'all .2s',
          }}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.14)';e.currentTarget.style.color='#fff'}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.color='rgba(255,255,255,0.55)'}}>
            {b.icon}
          </button>
        ))}
      </div>

      {/* ── HUD: Hint (hidden on mobile — the nav bar explains controls) ── */}
      {!IS_MOBILE && (
        <div style={{
          position:'fixed', bottom:20, left:20, zIndex:20,
          color:'rgba(255,255,255,0.18)', fontSize:10, fontFamily:'monospace',
          letterSpacing:'0.12em', pointerEvents:'none',
        }}>
          SCROLL · DRAG · CLICK
        </div>
      )}

      {/* ── B-DEVOPS brand top-left ──────────────────────────────────────── */}
      <div style={{
        position:'fixed', top:20, left:20, zIndex:20, pointerEvents:'none',
        fontFamily:'Inter, sans-serif',
      }}>
        <div style={{ color:'rgba(255,255,255,0.85)', fontWeight:900, fontSize:18, letterSpacing:'0.2em', textTransform:'uppercase', textShadow:'0 0 24px rgba(139,92,246,0.7)' }}>B-<span style={{ color:'#a78bfa' }}>DEVOPS</span></div>
        <div style={{ color:'rgba(255,255,255,0.25)', fontSize:9, letterSpacing:'0.2em', fontFamily:'monospace', marginTop:1 }}>GALAXY MAP · {STARS.length} HERRAMIENTAS</div>
      </div>

      {/* ── Mobile zone nav bar ─────────────────────────────────────────── */}
      {IS_MOBILE && (
        <div style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:25,
          display:'flex', justifyContent:'space-around', alignItems:'center',
          padding:'10px 8px 14px',
          background:'rgba(2,0,18,0.88)', backdropFilter:'blur(20px)',
          borderTop:'1px solid rgba(255,255,255,0.06)',
        }}>
          {[
            { label:'OSINT',    emoji:'🔍', zone: ZONES.find(z=>z.id==='osint') },
            { label:'Security', emoji:'🛡️', zone: ZONES.find(z=>z.id==='security') },
            { label:'Exploit',  emoji:'💀', zone: ZONES.find(z=>z.id==='exploit') },
            { label:'Infra',    emoji:'⚡', zone: ZONES.find(z=>z.id==='infra') },
            { label:'Gestión',  emoji:'📊', zone: ZONES.find(z=>z.id==='mgmt') },
          ].map(({ label, emoji, zone }) => (
            <button key={label} onClick={() => zone && (targetRef.current = { x: zone.cx, y: zone.cy, zoom: 0.9 })}
              style={{
                background:'none', border:'none', color:'rgba(255,255,255,0.55)',
                display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                cursor:'pointer', padding:'4px 6px', borderRadius:10,
                minWidth:52,
              }}>
              <span style={{ fontSize:18 }}>{emoji}</span>
              <span style={{ fontSize:9, letterSpacing:'0.08em', fontFamily:'Inter, sans-serif' }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Tooltip ──────────────────────────────────────────────────────── */}
      {tooltip && (() => {
        const { star, x, y } = tooltip
        const [r,g,b] = toRgb(star.color)
        const left = Math.min(x+18, window.innerWidth-230)
        const top  = Math.min(y-8, window.innerHeight-80)
        return (
          <div key={star.id} style={{
            position:'fixed', left, top, zIndex:30, pointerEvents:'none',
            animation:'tipIn .18s ease-out',
            background:'rgba(4,0,18,0.94)', backdropFilter:'blur(14px)',
            border:`1px solid rgba(${r},${g},${b},0.4)`,
            borderRadius:11, padding:'9px 13px',
            boxShadow:`0 0 24px rgba(${r},${g},${b},0.15)`,
            fontFamily:'Inter, sans-serif', maxWidth:220,
          }}>
            <div style={{ color:'#fff', fontWeight:700, fontSize:13, marginBottom:3 }}>
              {star.icon} {star.label}
            </div>
            <div style={{ color:'rgba(255,255,255,0.5)', fontSize:11, lineHeight:1.5 }}>{star.info}</div>
            <div style={{ color:star.color, fontSize:10, marginTop:4, fontFamily:'monospace', opacity:0.8 }}>
              {star.route ? `→ ${star.route}` : star.url ? `↗ ${star.url.replace('https://','').split('/')[0]}` : '🚧 En desarrollo'}
            </div>
          </div>
        )
      })()}

      {/* ── Login overlay (when not authenticated) ───────────────────────── */}
      {!token && (
        <div style={{
          position:'fixed', inset:0, zIndex:50,
          background:'rgba(0,0,12,0.82)', backdropFilter:'blur(18px)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          fontFamily:'Inter, sans-serif',
        }}>
          <div style={{
            width: Math.min(340, window.innerWidth - 28), borderRadius:22, padding:'28px 24px',
            animation:'loginIn .3s ease-out',
            background:'linear-gradient(150deg, rgba(79,70,229,0.18) 0%, rgba(4,0,22,0.97) 100%)',
            border:'1px solid rgba(79,70,229,0.4)', backdropFilter:'blur(32px)',
            boxShadow:'0 0 100px rgba(79,70,229,0.22), 0 0 200px rgba(124,58,237,0.1)',
            position:'relative',
          }}>
            {/* Glow orb */}
            <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)', filter:'blur(20px)', pointerEvents:'none' }}/>

            {/* Header */}
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ width:52, height:52, borderRadius:15, background:'rgba(79,70,229,0.25)', border:'1px solid rgba(79,70,229,0.5)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                <Lock size={20} style={{ color:'#818cf8' }}/>
              </div>
              <div style={{ color:'#fff', fontWeight:800, fontSize:19, letterSpacing:'0.04em' }}>B-<span style={{ color:'#818cf8' }}>DEVOPS</span></div>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginTop:3 }}>Sistema de Ciberinteligencia OSINT</div>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', padding:3, marginBottom:18, gap:2 }}>
              {[['admin','Admin'],['user','Usuario'],['register','Registrarse']].map(([tab,label]) => (
                <button key={tab} onClick={()=>{ setLoginTab(tab); setLoginErr(''); setRegErr(''); setPw(''); setUserLogin('') }}
                  style={{ flex:1, padding:'7px 4px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:'inherit', transition:'all .2s',
                    background: loginTab===tab ? 'rgba(79,70,229,0.7)' : 'transparent',
                    color: loginTab===tab ? '#fff' : 'rgba(255,255,255,0.4)',
                    boxShadow: loginTab===tab ? '0 0 12px rgba(79,70,229,0.4)' : 'none',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Admin tab */}
            {loginTab === 'admin' && (
              <form onSubmit={doLogin} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ position:'relative' }}>
                  <input type={showPw?'text':'password'} value={pw} onChange={e=>{setPw(e.target.value);setLoginErr('')}}
                    placeholder="Contraseña de administrador" autoFocus
                    style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:11, padding:'12px 42px 12px 14px', color:'#fff', fontSize:IS_MOBILE?16:13, outline:'none', fontFamily:'inherit' }}
                    onFocus={e=>e.target.style.borderColor='rgba(99,102,241,.75)'}
                    onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.14)'}
                  />
                  <button type="button" onClick={()=>setShowPw(v=>!v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(255,255,255,.35)', cursor:'pointer' }}>
                    {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
                {loginErr && <div style={{ color:'#f87171', fontSize:12, padding:'7px 11px', background:'rgba(239,68,68,.12)', borderRadius:9, border:'1px solid rgba(239,68,68,.25)' }}>{loginErr}</div>}
                <button type="submit" disabled={!pw||loginBusy} style={{ padding:'12px', borderRadius:11, border:'none', background:(!pw||loginBusy)?'rgba(79,70,229,0.28)':'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', fontWeight:700, fontSize:13, cursor:(!pw||loginBusy)?'not-allowed':'pointer', fontFamily:'inherit', boxShadow:(!pw||loginBusy)?'none':'0 0 18px rgba(124,58,237,0.4)' }}>
                  {loginBusy ? 'Verificando...' : 'Entrar como Admin'}
                </button>
              </form>
            )}

            {/* User tab */}
            {loginTab === 'user' && (
              <form onSubmit={doLogin} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <input type="text" value={userLogin} onChange={e=>{setUserLogin(e.target.value);setLoginErr('')}}
                  placeholder="Usuario o email" autoFocus
                  style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:11, padding:'12px 14px', color:'#fff', fontSize:IS_MOBILE?16:13, outline:'none', fontFamily:'inherit' }}
                  onFocus={e=>e.target.style.borderColor='rgba(99,102,241,.75)'}
                  onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.14)'}
                />
                <div style={{ position:'relative' }}>
                  <input type={showPw?'text':'password'} value={pw} onChange={e=>{setPw(e.target.value);setLoginErr('')}}
                    placeholder="Contraseña"
                    style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:11, padding:'12px 42px 12px 14px', color:'#fff', fontSize:IS_MOBILE?16:13, outline:'none', fontFamily:'inherit' }}
                    onFocus={e=>e.target.style.borderColor='rgba(99,102,241,.75)'}
                    onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.14)'}
                  />
                  <button type="button" onClick={()=>setShowPw(v=>!v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(255,255,255,.35)', cursor:'pointer' }}>
                    {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
                {loginErr && <div style={{ color:'#f87171', fontSize:12, padding:'7px 11px', background:'rgba(239,68,68,.12)', borderRadius:9, border:'1px solid rgba(239,68,68,.25)' }}>{loginErr}</div>}
                <button type="submit" disabled={!userLogin||!pw||loginBusy} style={{ padding:'12px', borderRadius:11, border:'none', background:(!userLogin||!pw||loginBusy)?'rgba(79,70,229,0.28)':'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', fontWeight:700, fontSize:13, cursor:(!userLogin||!pw||loginBusy)?'not-allowed':'pointer', fontFamily:'inherit' }}>
                  {loginBusy ? 'Verificando...' : 'Iniciar Sesion'}
                </button>
                <p style={{ color:'rgba(255,255,255,0.25)', fontSize:10, textAlign:'center' }}>Las cuentas de usuario requieren aprobacion del administrador</p>
              </form>
            )}

            {/* Register tab */}
            {loginTab === 'register' && (
              regDone ? (
                <div style={{ textAlign:'center', padding:'16px 0' }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>✅</div>
                  <div style={{ color:'#4ade80', fontWeight:700, fontSize:14, marginBottom:6 }}>Solicitud enviada</div>
                  <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12, lineHeight:1.5 }}>El administrador revisara tu solicitud y recibiras un email cuando sea aprobada.</p>
                  <button onClick={()=>{ setLoginTab('user'); setRegDone(false) }} style={{ marginTop:16, padding:'10px 20px', borderRadius:10, border:'1px solid rgba(79,70,229,0.5)', background:'rgba(79,70,229,0.2)', color:'#818cf8', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>
                    Ir a Iniciar Sesion
                  </button>
                </div>
              ) : (
                <form onSubmit={doRegister} style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  <input type="text" value={regUser} onChange={e=>{setRegUser(e.target.value);setRegErr('')}}
                    placeholder="Nombre de usuario" autoFocus
                    style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'11px 13px', color:'#fff', fontSize:IS_MOBILE?16:13, outline:'none', fontFamily:'inherit' }}
                    onFocus={e=>e.target.style.borderColor='rgba(99,102,241,.7)'}
                    onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.12)'}
                  />
                  <input type="email" value={regEmail} onChange={e=>{setRegEmail(e.target.value);setRegErr('')}}
                    placeholder="Email"
                    style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'11px 13px', color:'#fff', fontSize:IS_MOBILE?16:13, outline:'none', fontFamily:'inherit' }}
                    onFocus={e=>e.target.style.borderColor='rgba(99,102,241,.7)'}
                    onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.12)'}
                  />
                  <input type="password" value={regPw} onChange={e=>{setRegPw(e.target.value);setRegErr('')}}
                    placeholder="Contrasena (min. 6 caracteres)"
                    style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'11px 13px', color:'#fff', fontSize:IS_MOBILE?16:13, outline:'none', fontFamily:'inherit' }}
                    onFocus={e=>e.target.style.borderColor='rgba(99,102,241,.7)'}
                    onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.12)'}
                  />
                  <input type="text" value={regReason} onChange={e=>setRegReason(e.target.value)}
                    placeholder="Por que quieres acceso? (opcional)"
                    style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'11px 13px', color:'#fff', fontSize:IS_MOBILE?16:13, outline:'none', fontFamily:'inherit' }}
                    onFocus={e=>e.target.style.borderColor='rgba(99,102,241,.7)'}
                    onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.12)'}
                  />
                  {regErr && <div style={{ color:'#f87171', fontSize:12, padding:'7px 11px', background:'rgba(239,68,68,.12)', borderRadius:9 }}>{regErr}</div>}
                  <button type="submit" disabled={!regUser||!regEmail||regPw.length<6||regBusy} style={{ padding:'12px', borderRadius:11, border:'none', background:(!regUser||!regEmail||regPw.length<6||regBusy)?'rgba(79,70,229,0.28)':'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                    {regBusy ? 'Enviando...' : 'Solicitar Acceso'}
                  </button>
                  <p style={{ color:'rgba(255,255,255,0.22)', fontSize:10, textAlign:'center' }}>Tu cuenta sera activada tras revision del administrador</p>
                </form>
              )
            )}
          </div>
        </div>
      )}

      {/* ── Auth required for specific tool (when logged in) ─────────────── */}
      {token && showLogin && (
        <div onClick={e=>e.target===e.currentTarget&&(setShowLogin(false),setPw(''),setLoginErr(''))}
          style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,12,0.75)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter, sans-serif' }}>
          <div style={{ width: Math.min(300, window.innerWidth - 28), borderRadius:18, padding:'24px 22px', animation:'loginIn .25s ease-out', position:'relative',
            background:'linear-gradient(145deg,rgba(79,70,229,.15) 0%,rgba(4,0,20,.97) 100%)',
            border:'1px solid rgba(79,70,229,.38)', backdropFilter:'blur(28px)',
            boxShadow:'0 0 80px rgba(79,70,229,.2)' }}>
            <button onClick={()=>{setShowLogin(false);setPw('');setLoginErr('')}} style={{ position:'absolute',top:12,right:12,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:7,color:'rgba(255,255,255,.4)',cursor:'pointer',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center' }}><X size={12}/></button>
            <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:18 }}>
              <Lock size={18} style={{ color:'#818cf8' }}/>
              <div>
                <div style={{ color:'#fff',fontWeight:700,fontSize:14 }}>Acceso requerido</div>
                <div style={{ color:'rgba(255,255,255,.35)',fontSize:11 }}>{pendingRoute}</div>
              </div>
            </div>
            <form onSubmit={doLogin} style={{ display:'flex',flexDirection:'column',gap:10 }}>
              <input type={showPw?'text':'password'} value={pw} onChange={e=>{setPw(e.target.value);setLoginErr('')}} placeholder="Contraseña" autoFocus
                style={{ width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',borderRadius:11,padding:'11px 14px',color:'#fff',fontSize:13,outline:'none',fontFamily:'inherit' }}/>
              {loginErr&&<div style={{ color:'#f87171',fontSize:12,padding:'7px 11px',background:'rgba(239,68,68,.1)',borderRadius:7 }}>{loginErr}</div>}
              <button type="submit" disabled={!pw||loginBusy} style={{ padding:'11px',borderRadius:11,border:'none',background:(!pw||loginBusy)?'rgba(79,70,229,.3)':'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',fontWeight:600,fontSize:13,cursor:(!pw||loginBusy)?'not-allowed':'pointer',fontFamily:'inherit' }}>
                {loginBusy?'Verificando...':'Acceder →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
