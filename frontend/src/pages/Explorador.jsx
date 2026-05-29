import { useState, useRef, useMemo } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Plus, Trash2, X, Save, Edit3, Search } from 'lucide-react'

const INITIAL_TREE = [
  {
    id: 'f1', name: 'Empresa & Portfolio', type: 'folder', children: [
      {
        id: 'f1-1', name: 'Mi Empresa', type: 'folder', children: [
          { id: 'd1', name: 'Perfil de empresa', type: 'document', content: '# Mi Empresa\n\n## Descripción\nEmpresa de ciberseguridad y desarrollo de software.\n\n## Servicios\n- Auditorías de seguridad\n- Desarrollo de software a medida\n- Consultoría IT\n- Formación en ciberseguridad\n\n## Contacto\n- Email: contacto@miempresa.com\n- Web: https://miempresa.com\n- LinkedIn: linkedin.com/company/miempresa' },
          { id: 'd2', name: 'Mis Webs y Portfolio', type: 'document', content: '# Mis Sitios Web y Portfolio\n\n## Portfolio Personal\n- URL: https://miportfolio.com\n- GitHub: https://github.com/tu-usuario\n- Stack: Angular / React\n\n## B-DEVOPS\n- URL: (pendiente de deploy)\n- Repo: https://github.com/tu-usuario/b-devops\n- Stack: FastAPI + React + Vite\n\n## Proyectos Destacados\n- **B-DEVOPS**: Suite OSINT y ciberseguridad\n- **Personal OS**: Dashboard personal fullstack\n\n## Redes\n- LinkedIn: linkedin.com/in/tu-usuario\n- Twitter/X: @tu-usuario\n- GitHub: github.com/tu-usuario' },
        ]
      },
      {
        id: 'f1-2', name: 'Clientes', type: 'folder', children: [
          { id: 'd3', name: 'Plantilla propuesta comercial', type: 'document', content: '# Propuesta Comercial\n\n## Datos del cliente\n- Empresa:\n- Contacto:\n- Email:\n\n## Servicios propuestos\n1. ...\n2. ...\n\n## Presupuesto\n| Servicio | Precio |\n|---|---|\n| Auditoría básica | XXX€ |\n\n## Condiciones\n- Validez: 30 días\n- Pago: 50% inicio, 50% entrega\n' },
        ]
      },
    ]
  },
  {
    id: 'f2', name: 'Ciberseguridad', type: 'folder', children: [
      {
        id: 'f2-1', name: 'Metodologías', type: 'folder', children: [
          { id: 'd4', name: 'OWASP Top 10 — Referencia rápida', type: 'document', content: '# OWASP Top 10 (2021)\n\n## A01 — Broken Access Control\nControl de acceso deficiente. El más común.\n**Mitigación**: RBAC, verificar permisos server-side, deny-by-default.\n\n## A02 — Cryptographic Failures\nDatos sensibles expuestos por mala criptografía.\n**Mitigación**: TLS 1.3, AES-256, bcrypt para passwords.\n\n## A03 — Injection (SQL, XSS, etc)\n**Mitigación**: Prepared statements, validar/escapar inputs.\n\n## A04 — Insecure Design\nFallos en el diseño del sistema.\n\n## A05 — Security Misconfiguration\nConfiguración insegura por defecto.\n\n## A06 — Vulnerable Components\nUso de librerías/frameworks con CVEs conocidos.\n**Mitigación**: `pip audit`, `npm audit`, Dependabot.\n\n## A07 — Auth & Session Failures\nAuth débil, sesiones mal gestionadas.\n\n## A08 — Software and Data Integrity Failures\nCI/CD inseguro, deserialización insegura.\n\n## A09 — Logging & Monitoring Failures\nSin logs, sin alertas.\n\n## A10 — SSRF\nServer-Side Request Forgery.' },
          { id: 'd5', name: 'Metodología pentest — Fases', type: 'document', content: '# Metodología Pentest\n\n## Fase 1: Reconocimiento (OSINT)\n- Subdominios: subfinder, amass\n- IPs y puertos: nmap, masscan\n- Tecnologías: whatweb, wappalyzer\n- Emails: theHarvester\n- Filtraciones: HIBP, dehashed\n\n## Fase 2: Escaneo y Enumeración\n- nmap -sV -sC -A target\n- nikto -h target\n- gobuster dir -u target -w wordlist\n\n## Fase 3: Explotación\n- SQLMap para SQLi\n- Metasploit para exploits conocidos\n- Burp Suite para web apps\n\n## Fase 4: Post-Explotación\n- Escalada de privilegios\n- Movimiento lateral\n- Persistencia\n\n## Fase 5: Informe\n- Resumen ejecutivo\n- Hallazgos por severidad\n- Evidencias y PoC\n- Recomendaciones\n- Plan de remediación' },
        ]
      },
      {
        id: 'f2-2', name: 'Frameworks y Normas', type: 'folder', children: [
          { id: 'd6', name: 'ISO 27001 — Resumen de controles', type: 'document', content: '# ISO 27001:2022 — Resumen\n\nEstándar internacional para Sistemas de Gestión de Seguridad de la Información (SGSI).\n\n## Dominios principales\n- **A.5**: Políticas de seguridad\n- **A.6**: Organización de la seguridad\n- **A.7**: Seguridad RRHH\n- **A.8**: Gestión de activos\n- **A.9**: Control de acceso\n- **A.10**: Criptografía\n- **A.11**: Seguridad física\n- **A.12**: Seguridad operacional\n- **A.13**: Seguridad de comunicaciones\n- **A.14**: Adquisición y desarrollo\n- **A.15**: Relaciones con proveedores\n- **A.16**: Gestión de incidentes\n- **A.17**: Continuidad de negocio\n- **A.18**: Cumplimiento\n\n## Proceso de certificación\n1. Análisis GAP\n2. Implementación de controles\n3. Auditoría interna\n4. Auditoría de certificación (Stage 1 + Stage 2)\n5. Mantenimiento anual' },
          { id: 'd7', name: 'GDPR / RGPD — Checklist', type: 'document', content: '# GDPR / RGPD — Checklist de cumplimiento\n\n## Bases legales\n- [ ] Identificar base legal para cada tratamiento (Art. 6)\n- [ ] Consentimiento explícito para marketing\n- [ ] Interés legítimo documentado\n\n## Derechos del interesado\n- [ ] Derecho de acceso (Art. 15)\n- [ ] Derecho de rectificación (Art. 16)\n- [ ] Derecho de supresión (Art. 17)\n- [ ] Derecho de portabilidad (Art. 20)\n\n## Medidas técnicas\n- [ ] Cifrado de datos en reposo y tránsito\n- [ ] Seudonimización donde aplique\n- [ ] Control de acceso y RBAC\n- [ ] Logs de auditoría\n\n## Obligaciones\n- [ ] Registro de actividades de tratamiento (Art. 30)\n- [ ] DPO nombrado si aplica (Art. 37)\n- [ ] Política de privacidad actualizada\n- [ ] Procedimiento de notificación de brechas en 72h (Art. 33)' },
        ]
      },
    ]
  },
  {
    id: 'f3', name: 'Desarrollo', type: 'folder', children: [
      { id: 'd8', name: 'Stack tecnológico actual', type: 'document', content: '# Stack Tecnológico\n\n## Backend\n- **Python 3.14** + FastAPI\n- Uvicorn (ASGI server)\n- Pydantic v2 (validación)\n- httpx / aiohttp (requests async)\n- python-dotenv\n\n## Frontend\n- **React 18** + Vite\n- Tailwind CSS\n- React Router v6\n- Lucide React (iconos)\n- Axios / fetch API\n\n## Herramientas OSINT\n- Shodan API\n- VirusTotal API\n- Censys API\n- Hunter.io\n- HIBP API\n- URLScan.io\n- SecurityTrails\n\n## DevOps\n- Docker + Docker Compose\n- GitHub Actions (CI/CD)\n- Nginx (reverse proxy)\n- Certbot (SSL)\n\n## IDE / Tools\n- VS Code + Claude Code\n- Postman / Insomnia\n- DBeaver (base de datos)' },
      { id: 'd9', name: 'Comandos útiles', type: 'document', content: '# Comandos útiles del proyecto\n\n## B-DEVOPS — Arrancar\n```bash\n# Windows\nstart.bat\n\n# Manual\ncd backend && python -m venv venv && venv\\Scripts\\activate\npip install -r requirements.txt\nuvicorn main:app --reload --port 8000\n\n# Frontend (otra terminal)\ncd frontend && npm install && npm run dev\n```\n\n## Git\n```bash\ngit add . && git commit -m "feat: nueva funcionalidad"\ngit push origin main\ngit log --oneline -10\n```\n\n## Docker\n```bash\ndocker-compose up -d\ndocker-compose logs -f backend\ndocker ps\ndocker system prune -f\n```\n\n## Python\n```bash\npip freeze > requirements.txt\npip install -r requirements.txt\npytest tests/ -v\n```' },
    ]
  },
  {
    id: 'f4', name: 'Notas personales', type: 'folder', children: [
      { id: 'd10', name: 'Ideas y roadmap', type: 'document', content: '# Ideas y Roadmap\n\n## B-DEVOPS v2.0 — Completado ✅\n- [x] n8n + Notion CRM — webhook registro/aprobación usuarios\n- [x] Email automation — SMTP Gmail\n- [x] Login con JWT — multi-usuario + admin\n- [x] Base de datos PostgreSQL — users + analytics\n- [x] Deploy Docker + Cloudflare Tunnel\n- [x] ClickHouse analytics\n- [x] Grafana dashboards\n- [x] WireGuard VPN\n- [x] Groq AI Chat (Llama 3.3 70B)\n\n## Próximas features\n- [ ] WhatsApp via Twilio / n8n\n- [ ] Bot de Telegram para alertas OSINT\n- [ ] Mobile PWA\n- [ ] Kubernetes deploy en Hetzner\n- [ ] Chrome extension para reconocimiento pasivo\n\n## Objetivos 2026\n- [ ] Certificación OSCP\n- [ ] Publicar 3 artículos técnicos\n- [ ] 3 clientes de auditoría activos\n- [ ] API pública B-DEVOPS' },
    ]
  },
]

function flattenTree(nodes, parentId = null) {
  const result = []
  for (const node of nodes) {
    result.push({ ...node, parentId, children: undefined })
    if (node.children) result.push(...flattenTree(node.children, node.id))
  }
  return result
}

function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const found = findNode(n.children, id)
      if (found) return found
    }
  }
  return null
}

function renderMarkdown(md) {
  if (!md) return ''
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-white font-semibold text-sm mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 class="text-white font-semibold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 class="text-white font-bold text-lg border-b border-gray-700 pb-2 mt-2 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre class="bg-dark-100 border border-surface-border rounded p-3 overflow-x-auto text-green-400 text-xs my-2 font-mono">$1</pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-dark-100 text-crimson px-1 rounded text-xs font-mono">$1</code>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="text-green-400 text-sm ml-4 list-none flex items-center gap-1.5 my-0.5">✅ $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="text-gray-400 text-sm ml-4 list-none flex items-center gap-1.5 my-0.5">☐ $1</li>')
    .replace(/^- (.+)$/gm, '<li class="text-gray-400 text-sm ml-4 list-disc my-0.5">$1</li>')
    .replace(/^(?!<[hpuolp])(.+)$/gm, '<p class="text-gray-400 text-sm leading-relaxed my-1">$1</p>')
}

function TreeNode({ node, expanded, onToggle, selectedId, onSelect, depth = 0 }) {
  const isExpanded = expanded.has(node.id)
  const isSelected = selectedId === node.id
  const isFolder = node.type === 'folder'

  return (
    <div>
      <button
        onClick={() => isFolder ? onToggle(node.id) : onSelect(node)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors rounded-lg text-left ${
          isSelected ? 'bg-crimson/15 text-crimson' : 'text-gray-400 hover:text-white hover:bg-surface-light'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}>
        {isFolder
          ? (isExpanded ? <ChevronDown size={13} className="shrink-0" /> : <ChevronRight size={13} className="shrink-0" />)
          : <span className="w-3 shrink-0" />
        }
        {isFolder
          ? (isExpanded ? <FolderOpen size={14} className="text-yellow-400 shrink-0" /> : <Folder size={14} className="text-yellow-400 shrink-0" />)
          : <FileText size={14} className="text-blue-400 shrink-0" />
        }
        <span className="truncate text-xs">{node.name}</span>
      </button>
      {isFolder && isExpanded && node.children?.map(child => (
        <TreeNode key={child.id} node={child} expanded={expanded} onToggle={onToggle}
          selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  )
}

const STORAGE_KEY = 'bdev_explorador_tree'

function loadTree() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : INITIAL_TREE
  } catch { return INITIAL_TREE }
}

export default function Explorador() {
  const [tree, setTree] = useState(loadTree)
  const [expanded, setExpanded] = useState(new Set(['f1', 'f2', 'f3', 'f4']))
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('document')

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tree)) } catch {}
  }, [tree])

  function toggleFolder(id) {
    setExpanded(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function selectDoc(node) {
    setSelectedDoc(node)
    setEditMode(false)
    setEditContent(node.content || '')
  }

  function saveEdit() {
    function updateInTree(nodes) {
      return nodes.map(n => {
        if (n.id === selectedDoc.id) return { ...n, content: editContent }
        if (n.children) return { ...n, children: updateInTree(n.children) }
        return n
      })
    }
    setTree(updateInTree(tree))
    setSelectedDoc(d => ({ ...d, content: editContent }))
    setEditMode(false)
  }

  // Search
  const allDocs = useMemo(() => {
    const flat = flattenTree(tree)
    return flat.filter(n => n.type === 'document')
  }, [tree])
  const searchResults = searchQuery
    ? allDocs.filter(n =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : []

  return (
    <div className="flex gap-4 h-[calc(100vh-10rem)] animate-fade-in">
      {/* Sidebar tree */}
      <div className="w-64 shrink-0 bg-dark-300 border border-surface-border rounded-xl flex flex-col overflow-hidden">
        <div className="px-3 py-3 border-b border-surface-border">
          <h2 className="text-white text-xs font-bold uppercase tracking-widest mb-2">📁 Explorador</h2>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar documentos..."
              className="w-full bg-dark-100 border border-surface-border rounded pl-7 pr-2 py-1.5 text-gray-300 text-xs focus:outline-none focus:border-crimson/50 transition-colors" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-1">
          {searchQuery ? (
            <div>
              <p className="text-gray-600 text-[10px] uppercase tracking-wider px-3 mb-2">
                {searchResults.length} resultados
              </p>
              {searchResults.map(n => (
                <button key={n.id} onClick={() => { selectDoc(n); setSearchQuery('') }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-surface-light rounded-lg text-left transition-colors">
                  <FileText size={13} className="text-blue-400 shrink-0" />
                  <span className="truncate">{n.name}</span>
                </button>
              ))}
              {searchResults.length === 0 && <p className="text-gray-600 text-xs px-3">Sin resultados</p>}
            </div>
          ) : (
            tree.map(node => (
              <TreeNode key={node.id} node={node} expanded={expanded} onToggle={toggleFolder}
                selectedId={selectedDoc?.id} onSelect={selectDoc} />
            ))
          )}
        </nav>

        <div className="px-3 py-2 border-t border-surface-border">
          <p className="text-gray-600 text-[10px] font-mono text-center">
            {allDocs.length} documentos
          </p>
        </div>
      </div>

      {/* Document viewer */}
      <div className="flex-1 bg-dark-300 border border-surface-border rounded-xl flex flex-col overflow-hidden">
        {selectedDoc ? (
          <>
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-blue-400" />
                <h3 className="text-white font-semibold text-sm">{selectedDoc.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {editMode ? (
                  <>
                    <button onClick={saveEdit}
                      className="flex items-center gap-1 bg-crimson hover:bg-crimson-dark text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
                      <Save size={12} /> Guardar
                    </button>
                    <button onClick={() => setEditMode(false)}
                      className="text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-surface-border hover:border-gray-500 transition-colors">
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setEditMode(true); setEditContent(selectedDoc.content || '') }}
                    className="flex items-center gap-1 text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-surface-border hover:border-gray-500 transition-colors">
                    <Edit3 size={12} /> Editar
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {editMode ? (
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full h-full bg-dark-100 border border-surface-border rounded-lg p-4 text-gray-300 text-sm font-mono resize-none focus:outline-none focus:border-crimson/50"
                  placeholder="Escribe en Markdown..."
                />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedDoc.content || '') }} />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <span className="text-6xl mb-4">📂</span>
            <p className="text-sm font-medium">Selecciona un documento para leerlo</p>
            <p className="text-xs text-gray-600 mt-1">O usa el buscador para encontrar algo</p>
          </div>
        )}
      </div>
    </div>
  )
}
