import { useState, useEffect, useCallback } from 'react'
import {
  Globe, Database, Zap, CheckCircle, XCircle, Clock,
  ExternalLink, RefreshCw, AlertTriangle, Server, Box,
  GitBranch, Activity, Cloud, Terminal, Settings, BarChart2
} from 'lucide-react'
import api, { devops } from '../api/client'

const TAB_ITEMS = [
  { id: 'webs',       label: 'Mis Webs',      icon: Globe },
  { id: 'servicios',  label: 'Servicios',     icon: Server },
  { id: 'analytics',  label: 'Analytics',     icon: BarChart2 },
  { id: 'deploy',     label: 'Deploy Guide',  icon: Box },
]

const STATE_BADGE = {
  READY:    'text-green-400 bg-green-900/30 border-green-700/30',
  BUILDING: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/30',
  ERROR:    'text-red-400 bg-red-900/30 border-red-700/30',
  QUEUED:   'text-blue-400 bg-blue-900/30 border-blue-700/30',
  UNKNOWN:  'text-gray-400 bg-gray-900/30 border-gray-700/30',
  ACTIVE:   'text-green-400 bg-green-900/30 border-green-700/30',
  INACTIVE: 'text-gray-400 bg-gray-800/30 border-gray-700/30',
  up:       'text-green-400 bg-green-900/30 border-green-700/30',
  down:     'text-red-400 bg-red-900/30 border-red-700/30',
}

export default function DevOpsHub() {
  const [tab, setTab] = useState('webs')

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Cloud size={18} className="text-cyan-400" />
          <span className="text-white font-bold text-lg">DevOps Hub</span>
          <span className="badge badge-gray">Vercel · Supabase · K8s · n8n · ClickHouse</span>
        </div>
        <p className="text-gray-500 text-sm">Gestión centralizada de infraestructura y despliegues</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-300 p-1 rounded-xl w-fit border border-surface-border">
        {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-surface-light'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'webs'       && <WebsTab />}
      {tab === 'servicios'  && <ServiciosTab />}
      {tab === 'analytics'  && <AnalyticsTab />}
      {tab === 'deploy'     && <DeployGuide />}
    </div>
  )
}

/* ── Webs Tab ─────────────────────────────────────────────────── */
function WebsTab() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await api.get('/devops/summary').then(r => r.data)
      setSummary(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingState label="Cargando datos de Vercel y Supabase..." />
  if (error)   return <ErrorState msg={error} />

  const noTokens = !summary?.has_vercel_token && !summary?.has_supabase_token
  if (noTokens) {
    return (
      <div className="card border-yellow-700/30 bg-yellow-900/10">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-semibold mb-1">Tokens no configurados</p>
            <p className="text-yellow-300/70 text-sm">
              Ve a <strong>Configuración</strong> y añade tu <strong>Vercel Token</strong> y/o <strong>Supabase Token</strong>
              para ver el estado de tus proyectos aquí.
            </p>
            <div className="mt-3 flex gap-3">
              <a href="https://vercel.com/account/tokens" target="_blank" rel="noreferrer"
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                <ExternalLink size={11} /> Vercel Tokens
              </a>
              <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noreferrer"
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                <ExternalLink size={11} /> Supabase Tokens
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={load} className="btn-ghost flex items-center gap-2 text-xs">
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Vercel */}
      {summary?.has_vercel_token && (
        <VercelSection data={summary.vercel} />
      )}

      {/* Supabase */}
      {summary?.has_supabase_token && (
        <SupabaseSection data={summary.supabase} />
      )}
    </div>
  )
}

function VercelSection({ data }) {
  if (data?.error) return <ErrorCard title="Vercel" msg={data.error} />
  const projects = data?.projects || []

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
          <span className="text-black font-bold text-xs">▲</span>
        </div>
        <span className="text-white font-semibold">Vercel</span>
        <span className="badge badge-gray">{projects.length} proyectos</span>
      </div>
      {projects.length === 0
        ? <p className="text-gray-500 text-sm">Sin proyectos en esta cuenta</p>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} platform="vercel" />
            ))}
          </div>
        )
      }
    </div>
  )
}

function SupabaseSection({ data }) {
  if (data?.error) return <ErrorCard title="Supabase" msg={data.error} />
  const projects = data?.projects || []

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center">
          <Database size={11} className="text-white" />
        </div>
        <span className="text-white font-semibold">Supabase</span>
        <span className="badge badge-gray">{projects.length} proyectos</span>
      </div>
      {projects.length === 0
        ? <p className="text-gray-500 text-sm">Sin proyectos en esta cuenta</p>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} platform="supabase" />
            ))}
          </div>
        )
      }
    </div>
  )
}

function ProjectCard({ project, platform }) {
  const state = project.last_deploy_state || project.status || 'UNKNOWN'
  const badgeCls = STATE_BADGE[state] || STATE_BADGE.UNKNOWN

  return (
    <div className="card border-surface-border/50 hover:border-cyan-500/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-semibold text-sm truncate">{project.name}</p>
          {project.framework && (
            <span className="text-gray-500 text-xs">{project.framework}</span>
          )}
          {project.region && (
            <span className="text-gray-500 text-xs">{project.region}</span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${badgeCls}`}>
          {state}
        </span>
      </div>

      {/* Git repo */}
      {project.git_repo && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-500">
          <GitBranch size={11} />
          <span className="truncate">{project.git_org}/{project.git_repo}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        {project.url && (
          <a href={project.url} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-xs text-cyan-400 hover:underline">
            <Globe size={11} /> Ver web
          </a>
        )}
        {project.dashboard && (
          <a href={project.dashboard} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-xs text-emerald-400 hover:underline">
            <ExternalLink size={11} /> Dashboard
          </a>
        )}
      </div>
    </div>
  )
}

/* ── Servicios Tab ────────────────────────────────────────────── */
function ServiciosTab() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/devops/services/health')
      .then(r => setHealth(r.data))
      .catch(() => setHealth(null))
      .finally(() => setLoading(false))
  }, [])

  const SERVICES = [
    {
      id: 'clickhouse',
      name: 'ClickHouse',
      icon: Database,
      color: 'text-yellow-400',
      desc: 'Analíticas OSINT — almacena resultados de auditorías',
      localUrl: 'http://localhost:8123/play',
      docs: 'https://clickhouse.com/docs',
      port: '8123',
    },
    {
      id: 'n8n',
      name: 'n8n',
      icon: Zap,
      color: 'text-orange-400',
      desc: 'Automatización de flujos — webhooks, alertas, pipelines',
      localUrl: 'https://crm.bdev.qzz.io',
      docs: 'https://docs.n8n.io',
      port: '5678',
    },
    {
      id: 'airbyte',
      name: 'Airbyte',
      icon: Activity,
      color: 'text-blue-400',
      desc: 'Pipelines de datos — sincroniza fuentes externas con ClickHouse',
      localUrl: 'http://localhost:8080',
      docs: 'https://docs.airbyte.com',
      port: '8080',
      manual: true,
    },
  ]

  return (
    <div className="space-y-4">
      <p className="text-gray-500 text-sm">
        Servicios disponibles al levantar con <code className="text-cyan-400 bg-dark-300 px-1.5 py-0.5 rounded text-xs">docker compose up -d</code>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SERVICES.map(svc => {
          const statusData = health?.services?.[svc.id]
          const isUp = statusData?.status === 'up'
          const isLoading = loading && !svc.manual
          const Icon = svc.icon

          return (
            <div key={svc.id} className="card border-surface-border/50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon size={18} className={svc.color} />
                  <span className="text-white font-semibold text-sm">{svc.name}</span>
                </div>
                {svc.manual ? (
                  <span className="text-xs px-2 py-0.5 rounded border text-gray-400 bg-gray-900/30 border-gray-700/30">
                    Manual
                  </span>
                ) : isLoading ? (
                  <span className="text-xs text-gray-500">...</span>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATE_BADGE[isUp ? 'up' : 'down']}`}>
                    {isUp ? '● Online' : '○ Offline'}
                  </span>
                )}
              </div>

              <p className="text-gray-400 text-xs leading-relaxed mb-4">{svc.desc}</p>

              <div className="flex items-center gap-1.5 mb-3">
                <Terminal size={11} className="text-gray-600" />
                <code className="text-xs text-gray-500">:{svc.port}</code>
              </div>

              <div className="flex gap-2">
                <a href={svc.localUrl} target="_blank" rel="noreferrer"
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                    svc.color.replace('text-', 'border-').replace('400', '500/30')
                  } ${svc.color} hover:bg-white/5`}>
                  <ExternalLink size={11} /> Abrir UI
                </a>
                <a href={svc.docs} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-surface-border text-gray-400 hover:text-white hover:bg-surface-light transition-all">
                  Docs
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {/* Stack visual */}
      <div className="card border-surface-border/30 mt-4">
        <p className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-4">Stack completo local</p>
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {[
            { label: 'React :3000', color: 'text-cyan-400' },
            { label: '→' },
            { label: 'FastAPI :8000', color: 'text-green-400' },
            { label: '→' },
            { label: 'PostgreSQL :5432', color: 'text-blue-400' },
            { label: '&' },
            { label: 'ClickHouse :8123', color: 'text-yellow-400' },
          ].map((item, i) => (
            <span key={i} className={item.color || 'text-gray-600'}>{item.label}</span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono mt-2">
          {[
            { label: 'n8n :5678', color: 'text-orange-400' },
            { label: '↔ webhooks ↔' },
            { label: 'AURA backend', color: 'text-green-400' },
            { label: '↔ Airbyte :8080', color: 'text-blue-400' },
            { label: '→ ClickHouse', color: 'text-yellow-400' },
          ].map((item, i) => (
            <span key={i} className={item.color || 'text-gray-600'}>{item.label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Analytics Tab ────────────────────────────────────────────── */
const RISK_COLOR = { 'CRÍTICO': 'text-red-400', 'ALTO': 'text-orange-400', 'MEDIO': 'text-yellow-400', 'BAJO': 'text-green-400' }
const RISK_BG    = { 'CRÍTICO': 'bg-red-500', 'ALTO': 'bg-orange-500', 'MEDIO': 'bg-yellow-400', 'BAJO': 'bg-green-400' }

function AnalyticsTab() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [daily, setDaily] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAvailable, setIsAvailable] = useState(true)

  useEffect(() => {
    Promise.all([
      devops.analyticsStats(),
      devops.analyticsRecent(15),
      devops.analyticsDaily(14),
    ]).then(([s, r, d]) => {
      setStats(s)
      setRecent(r?.audits || [])
      setDaily(d?.summary || [])
      setIsAvailable(true)
    }).catch(() => {
      setIsAvailable(false)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState label="Conectando con ClickHouse..." />

  if (!isAvailable || (!stats?.total && recent.length === 0)) {
    return (
      <div className="space-y-4">
        <div className="card border-yellow-700/30 bg-yellow-900/10">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-semibold mb-1">ClickHouse no disponible o sin datos</p>
              <p className="text-yellow-300/70 text-sm mb-3">
                Asegúrate de que el stack está levantado con <code className="text-cyan-400 bg-dark-300 px-1.5 py-0.5 rounded text-xs">docker compose up -d</code> y que ClickHouse está en <code className="text-yellow-300 bg-dark-300 px-1 rounded text-xs">:8123</code>.
              </p>
              <p className="text-yellow-300/70 text-sm">
                Los datos aparecerán aquí automáticamente después de ejecutar auditorías desde la sección <strong>Auto Auditoría</strong>.
              </p>
            </div>
          </div>
        </div>
        <div className="card border-surface-border/30">
          <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-3">Acceso directo a ClickHouse</p>
          <a href="http://localhost:8123/play" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300 transition-colors">
            <ExternalLink size={13} /> Abrir SQL Playground en :8123/play
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total auditorías', value: stats.total, color: 'text-white' },
            { label: 'Crítico / Alto', value: (stats.criticos||0) + (stats.altos||0), color: 'text-red-400' },
            { label: 'Medio / Bajo', value: (stats.medios||0) + (stats.bajos||0), color: 'text-green-400' },
            { label: 'Media hallazgos', value: stats.avg_findings, color: 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-dark-300 border border-surface-border rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Risk distribution */}
      {stats && stats.total > 0 && (
        <div className="card border-surface-border/50">
          <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-3">Distribución por riesgo</p>
          <div className="space-y-2">
            {[['CRÍTICO', stats.criticos], ['ALTO', stats.altos], ['MEDIO', stats.medios], ['BAJO', stats.bajos]].map(([lvl, cnt]) => (
              <div key={lvl} className="flex items-center gap-3">
                <span className={`text-xs font-mono w-16 shrink-0 ${RISK_COLOR[lvl]}`}>{lvl}</span>
                <div className="flex-1 bg-dark-400 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${RISK_BG[lvl]}`}
                    style={{ width: `${stats.total > 0 ? Math.round((cnt / stats.total) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-gray-400 text-xs w-8 text-right font-mono">{cnt}</span>
                <span className="text-gray-600 text-xs w-10 text-right">{stats.total > 0 ? Math.round((cnt/stats.total)*100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent audits table */}
      {recent.length > 0 && (
        <div className="card border-surface-border/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 text-xs font-mono uppercase tracking-wider">Auditorías recientes</p>
            <a href="http://localhost:8123/play" target="_blank" rel="noreferrer"
              className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors">
              SQL Playground <ExternalLink size={10} />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-600 border-b border-surface-border">
                  <th className="text-left pb-2 font-medium">Target</th>
                  <th className="text-left pb-2 font-medium">Tipo</th>
                  <th className="text-center pb-2 font-medium">Riesgo</th>
                  <th className="text-center pb-2 font-medium">Módulos</th>
                  <th className="text-center pb-2 font-medium">Hallazgos</th>
                  <th className="text-right pb-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a, i) => (
                  <tr key={i} className="border-b border-surface-border/50 hover:bg-white/5 transition-colors">
                    <td className="py-2 text-gray-300 font-mono truncate max-w-32">{a.target}</td>
                    <td className="py-2 text-gray-500">{a.target_type}</td>
                    <td className="py-2 text-center">
                      <span className={`font-semibold ${RISK_COLOR[a.risk_level] || 'text-gray-400'}`}>{a.risk_level}</span>
                    </td>
                    <td className="py-2 text-center text-gray-400 font-mono">{a.modules_run}</td>
                    <td className="py-2 text-center text-gray-400 font-mono">{a.findings}</td>
                    <td className="py-2 text-right text-gray-600 font-mono">{a.created_at?.slice(0,10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grafana link */}
      <div className="card border-orange-700/30 bg-orange-900/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <p className="text-white font-semibold text-sm">Grafana Dashboards</p>
              <p className="text-gray-400 text-xs">Visualiza tus métricas de ClickHouse con dashboards avanzados</p>
            </div>
          </div>
          <a href="http://localhost:9091" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 hover:bg-orange-500/30 transition-colors text-xs font-medium">
            <ExternalLink size={12} /> Abrir Grafana
          </a>
        </div>
      </div>
    </div>
  )
}

/* ── Deploy Guide Tab ─────────────────────────────────────────── */
function DeployGuide() {
  const [step, setStep] = useState(0)

  const STEPS = [
    {
      title: 'Oracle Cloud — Crear VM gratuita',
      icon: Cloud,
      color: 'text-red-400',
      content: [
        { type: 'text', value: 'Oracle Cloud siempre-gratis: 4 ARM cores + 24 GB RAM. Perfecto para todo el stack.' },
        { type: 'code', lang: 'txt', value: '1. Regístrate en cloud.oracle.com (necesitas tarjeta pero NO cobran)\n2. Compute → Instances → Create Instance\n3. Image: Ubuntu 22.04 Minimal\n4. Shape: VM.Standard.A1.Flex → 4 OCPUs + 24 GB RAM\n5. Network: VCN con subnet pública\n6. SSH key: sube tu clave pública\n7. Boot volume: 50 GB (gratuito)' },
        { type: 'text', value: 'Después de crear, abre los puertos 80, 443, 6443 (K8s) en Security Lists.' },
      ]
    },
    {
      title: 'Instalar k3s (Kubernetes ligero)',
      icon: Box,
      color: 'text-purple-400',
      content: [
        { type: 'text', value: 'k3s es Kubernetes en un solo binario, perfecto para Oracle Cloud ARM.' },
        { type: 'code', lang: 'bash', value: '# Conectar al servidor\nssh ubuntu@TU_IP_ORACLE\n\n# Instalar k3s\ncurl -sfL https://get.k3s.io | sh -\n\n# Verificar que funciona\nsudo kubectl get nodes\n# → STATUS: Ready\n\n# Copiar kubeconfig a tu máquina local\nscp ubuntu@TU_IP:~/.kube/config ~/.kube/config-oracle\nexport KUBECONFIG=~/.kube/config-oracle' },
      ]
    },
    {
      title: 'Construir y subir imágenes Docker',
      icon: Server,
      color: 'text-cyan-400',
      content: [
        { type: 'text', value: 'Sube las imágenes a GitHub Container Registry (ghcr.io) — 100% gratuito.' },
        { type: 'code', lang: 'bash', value: '# Login en ghcr.io (usa tu GitHub token)\necho $GITHUB_TOKEN | docker login ghcr.io -u TU_USUARIO --password-stdin\n\n# Build y push backend\ndocker build -t ghcr.io/TU_USUARIO/aura-backend:latest ./backend\ndocker push ghcr.io/TU_USUARIO/aura-backend:latest\n\n# Build y push frontend\ndocker build -t ghcr.io/TU_USUARIO/aura-frontend:latest ./frontend\ndocker push ghcr.io/TU_USUARIO/aura-frontend:latest' },
        { type: 'text', value: 'Luego cambia YOUR_REGISTRY por ghcr.io/TU_USUARIO en los manifests de kubernetes/' },
      ]
    },
    {
      title: 'Desplegar en Kubernetes',
      icon: Activity,
      color: 'text-green-400',
      content: [
        { type: 'text', value: 'Instala cert-manager para SSL gratuito, luego aplica todos los manifests.' },
        { type: 'code', lang: 'bash', value: '# 1. cert-manager (SSL gratuito con Let\'s Encrypt)\nkubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml\nkubectl wait --for=condition=ready pod -l app=cert-manager -n cert-manager --timeout=120s\n\n# 2. Edita kubernetes/07-cert-manager.yaml → pon tu email\n# 3. Edita kubernetes/06-ingress.yaml → pon tu dominio\n# 4. Edita kubernetes/04-aura-backend.yaml → pon la imagen correcta\n\n# 5. Desplegar todo\nkubectl apply -k ./kubernetes/\n\n# 6. Ver estado\nkubectl get pods -n aura-ops\nkubectl get ingress -n aura-ops' },
      ]
    },
    {
      title: 'Instalar Airbyte (opcional)',
      icon: Zap,
      color: 'text-orange-400',
      content: [
        { type: 'text', value: 'Airbyte necesita mucha RAM (4GB+). En Oracle ARM con 24GB es factible.' },
        { type: 'code', lang: 'bash', value: '# En tu Oracle Cloud VM\ngit clone https://github.com/airbytehq/airbyte.git\ncd airbyte\n./run-ab-platform.sh\n\n# Accede en http://TU_IP:8000\n# Usuario: airbyte / Contraseña: password\n\n# Configura connectors:\n#  Source: B-DEVOPS API (HTTP connector)\n#  Destination: ClickHouse\n#  → Los datos de auditorías fluyen automáticamente a ClickHouse' },
      ]
    },
  ]

  const currentStep = STEPS[step]
  const Icon = currentStep.icon

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => {
          const SI = s.icon
          return (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`flex-1 flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-all ${
                i === step
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                  : i < step
                  ? 'border-green-700/30 bg-green-900/10 text-green-400'
                  : 'border-surface-border text-gray-500 hover:text-gray-300'
              }`}
            >
              {i < step
                ? <CheckCircle size={14} className="text-green-400" />
                : <SI size={14} />
              }
              <span className="hidden md:block text-center leading-tight">{s.title.split(' ')[0]}</span>
            </button>
          )
        })}
      </div>

      {/* Step content */}
      <div className="card border-surface-border/60">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg bg-current/10`}>
            <Icon size={18} className={currentStep.color} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-mono">Paso {step + 1} de {STEPS.length}</p>
            <p className="text-white font-semibold">{currentStep.title}</p>
          </div>
        </div>

        <div className="space-y-3">
          {currentStep.content.map((block, i) => (
            block.type === 'text'
              ? <p key={i} className="text-gray-300 text-sm leading-relaxed">{block.value}</p>
              : <CodeBlock key={i} code={block.value} lang={block.lang} />
          ))}
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-ghost text-sm disabled:opacity-30"
          >
            ← Anterior
          </button>
          <button
            onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
            disabled={step === STEPS.length - 1}
            className="btn-primary text-sm"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Shared ───────────────────────────────────────────────────── */
function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative group">
      <div className="flex items-center justify-between px-3 py-1.5 bg-dark-200 rounded-t-lg border border-b-0 border-surface-border">
        <span className="text-xs text-gray-500 font-mono">{lang}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
          className="text-xs text-gray-500 hover:text-white transition-colors"
        >
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="text-xs text-green-400 font-mono bg-dark-300 p-4 rounded-b-lg border border-surface-border overflow-x-auto leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  )
}

function LoadingState({ label }) {
  return (
    <div className="card border-surface-border/30 flex items-center gap-3 py-8 justify-center">
      <RefreshCw size={16} className="text-cyan-400 animate-spin" />
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
  )
}

function ErrorState({ msg }) {
  return (
    <div className="card border-red-700/30 bg-red-900/10">
      <div className="flex gap-2">
        <XCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
        <p className="text-red-300 text-sm">{msg}</p>
      </div>
    </div>
  )
}

function ErrorCard({ title, msg }) {
  return (
    <div className="p-3 rounded-lg border border-red-700/30 bg-red-900/10 text-sm text-red-300">
      <strong>{title}:</strong> {msg}
    </div>
  )
}
