import { useState, useEffect, useCallback } from 'react'
import { devops } from '../api/client'
import {
  Server, Globe, Database, GitBranch, Zap, RefreshCw,
  ExternalLink, CheckCircle, XCircle, Clock, Cpu, HardDrive,
  Activity, Network, Shield, AlertTriangle, Play, Square,
  ChevronDown, ChevronRight, Link2, Layers, Settings2, Radio,
  Terminal, Loader2
} from 'lucide-react'

// ── Container log viewer (added) ──────────────────────────────────────────────
const CONTAINERS = [
  'bdev-backend', 'bdev-frontend', 'bdev-n8n', 'bdev-postgres',
  'bdev-clickhouse', 'bdev-grafana', 'bdev-prometheus', 'bdev-traefik',
  'bdev-loki', 'bdev-promtail', 'bdev-watchtower',
]

function LogViewer() {
  const [container, setContainer] = useState('bdev-backend')
  const [lines,     setLines]     = useState(50)
  const [logs,      setLogs]      = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const fetch = useCallback(async () => {
    setLoading(true); setError(''); setLogs([])
    try {
      const res = await devops.containerLogs(container, lines)
      if (res.error) { setError(res.error); return }
      setLogs(res.logs || [])
    } catch (e) {
      setError(e?.response?.data?.detail || e.message)
    } finally { setLoading(false) }
  }, [container, lines])

  const logColor = (line) => {
    if (/error|exception|critical|fatal/i.test(line)) return 'text-red-400'
    if (/warn/i.test(line)) return 'text-yellow-400'
    if (/info|200|201/i.test(line)) return 'text-green-400'
    if (/debug/i.test(line)) return 'text-gray-500'
    return 'text-gray-300'
  }

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Terminal size={16} className="text-purple-400" />
        <h2 className="text-white font-bold text-sm">Logs de Contenedores</h2>
        <span className="text-gray-500 text-xs">— acceso directo desde la UI</span>
      </div>
      <div className="bg-dark-300 border border-surface-border rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border flex-wrap">
          <select value={container} onChange={e => setContainer(e.target.value)}
            className="bg-dark-400 border border-surface-border text-white text-xs px-3 py-1.5 rounded-lg focus:outline-none">
            {CONTAINERS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={lines} onChange={e => setLines(Number(e.target.value))}
            className="bg-dark-400 border border-surface-border text-white text-xs px-3 py-1.5 rounded-lg focus:outline-none">
            {[25,50,100,200,500].map(n => <option key={n} value={n}>{n} líneas</option>)}
          </select>
          <button onClick={fetch} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {loading ? 'Cargando...' : 'Ver logs'}
          </button>
          {logs.length > 0 && (
            <span className="text-gray-500 text-xs ml-auto">{logs.length} líneas</span>
          )}
        </div>
        {/* Log output */}
        <div className="bg-black/40 p-4 font-mono text-xs leading-relaxed overflow-auto max-h-96">
          {error ? (
            <span className="text-red-400">{error}</span>
          ) : logs.length === 0 ? (
            <span className="text-gray-600">Selecciona un contenedor y pulsa "Ver logs"</span>
          ) : (
            logs.map((line, i) => (
              <div key={i} className={logColor(line)}>{line}</div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

// ── Constants ──────────────────────────────────────────────────────────────
const TUNNEL_ID  = 'f2060fc8-5ad9-4afd-b9ce-0db3a2b5123f'
const PUBLIC_URL = 'https://bdev.qzz.io'

const EXTERNAL_SERVICES = [
  {
    id: 'n8n',
    name: 'n8n Workflows',
    url: 'https://crm.bdev.qzz.io',
    desc: 'Automatizacion de flujos de trabajo — CRM',
    icon: GitBranch,
    color: 'text-orange-400',
    bg: 'bg-orange-900/20 border-orange-700/30',
    category: 'automation',
  },
  {
    id: 'clickhouse',
    name: 'ClickHouse Play',
    url: 'http://localhost:8123/play',
    desc: 'SQL analítico — interfaz web integrada',
    icon: Database,
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/20 border-yellow-700/30',
    category: 'database',
  },
  {
    id: 'grafana',
    name: 'Grafana',
    url: 'https://monitor.bdev.qzz.io/grafana',
    desc: 'Dashboards y métricas — acceso solo con VPN',
    icon: Activity,
    color: 'text-orange-400',
    bg: 'bg-orange-900/20 border-orange-700/30',
    category: 'monitoring',
  },
  {
    id: 'bdev',
    name: 'B-DEVOPS (local)',
    url: 'http://localhost:3000',
    desc: 'Aplicación principal — acceso local Docker',
    icon: Zap,
    color: 'text-crimson',
    bg: 'bg-red-900/20 border-red-700/30',
    category: 'app',
  },
  {
    id: 'backend',
    name: 'API Docs (Swagger)',
    url: 'http://localhost:8000/docs',
    desc: 'Documentación interactiva FastAPI',
    icon: Server,
    color: 'text-green-400',
    bg: 'bg-green-900/20 border-green-700/30',
    category: 'app',
  },
  {
    id: 'public',
    name: 'bdev.qzz.io (público)',
    url: PUBLIC_URL,
    desc: 'Acceso público vía Cloudflare Tunnel',
    icon: Globe,
    color: 'text-blue-400',
    bg: 'bg-blue-900/20 border-blue-700/30',
    category: 'tunnel',
  },
]

const STATUS_MAP = {
  up:      { icon: CheckCircle, color: 'text-green-400',  dot: 'bg-green-400',  label: 'Online'   },
  down:    { icon: XCircle,     color: 'text-red-400',    dot: 'bg-red-500',    label: 'Caído'    },
  degraded:{ icon: AlertTriangle, color: 'text-yellow-400', dot: 'bg-yellow-400', label: 'Degradado' },
  unknown: { icon: Clock,       color: 'text-gray-500',   dot: 'bg-gray-600',   label: 'Desconocido' },
}

const DOCKER_ICONS = {
  backend:    { Icon: Zap,      color: 'text-green-400'  },
  frontend:   { Icon: Globe,    color: 'text-cyan-400'   },
  clickhouse: { Icon: Database, color: 'text-yellow-400' },
  n8n:        { Icon: GitBranch,color: 'text-orange-400' },
  postgres:   { Icon: HardDrive,color: 'text-blue-400'   },
  grafana:    { Icon: Activity, color: 'text-orange-300' },
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Infra() {
  const [services, setServices] = useState([])
  const [summary, setSummary]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [expandedService, setExpandedService] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await devops.stackStatus()
      setServices(data.services || [])
      setSummary(data.summary || null)
      setLastRefresh(new Date())
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [autoRefresh, load])

  const allUp   = summary?.up === summary?.total
  const anyDown = summary?.down > 0

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-crimson rounded-full" />
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide">Infraestructura</h2>
            <p className="text-gray-500 text-xs">Stack Docker · Cloudflare Tunnel · Servicios externos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-gray-600 text-xs font-mono">
              Actualizado {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => setAutoRefresh(p => !p)}
            className={`text-xs px-2 py-1 rounded border font-mono transition-colors ${
              autoRefresh
                ? 'border-green-600 text-green-400 bg-green-900/20'
                : 'border-gray-700 text-gray-500'
            }`}
          >
            {autoRefresh ? '⟳ auto 30s' : 'auto off'}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="btn-ghost p-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-gray-500' : 'text-gray-400'} />
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className={`card flex items-center gap-6 py-3 border ${
          allUp ? 'border-green-700/30 bg-green-900/10' :
          anyDown ? 'border-red-700/30 bg-red-900/10' :
          'border-yellow-700/30 bg-yellow-900/10'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${allUp ? 'bg-green-400' : anyDown ? 'bg-red-500' : 'bg-yellow-400'} animate-pulse`} />
            <span className={`text-sm font-semibold ${allUp ? 'text-green-400' : anyDown ? 'text-red-400' : 'text-yellow-400'}`}>
              {allUp ? 'Todos los servicios online' : anyDown ? `${summary.down} servicio(s) caído(s)` : 'Stack degradado'}
            </span>
          </div>
          <div className="flex gap-4 ml-auto text-xs font-mono">
            <span className="text-green-400">{summary.up} online</span>
            {summary.down > 0 && <span className="text-red-400">{summary.down} caídos</span>}
            <span className="text-gray-500">{summary.total} total</span>
          </div>
        </div>
      )}

      {/* Docker services grid */}
      <section>
        <p className="section-title mb-3 flex items-center gap-2">
          <Layers size={13} className="text-cyan-400" /> Docker Stack
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {services.map(svc => {
            const status = STATUS_MAP[svc.status] || STATUS_MAP.unknown
            const StatusIcon = status.icon
            const { Icon: DockerIcon, color: iconColor } = DOCKER_ICONS[svc.id] || { Icon: Server, color: 'text-gray-400' }
            const expanded = expandedService === svc.id

            return (
              <div
                key={svc.id}
                className="card cursor-pointer hover:border-gray-600 transition-colors"
                onClick={() => setExpandedService(expanded ? null : svc.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-current/10`}>
                      <DockerIcon size={18} className={iconColor} />
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold">{svc.name}</div>
                      <div className="text-gray-500 text-xs font-mono">:{svc.port}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 text-xs ${status.color}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </div>
                    {expanded ? <ChevronDown size={12} className="text-gray-600" /> : <ChevronRight size={12} className="text-gray-600" />}
                  </div>
                </div>

                {expanded && (
                  <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                    {svc.latency_ms != null && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Latencia</span>
                        <span className={`font-mono ${svc.latency_ms < 50 ? 'text-green-400' : svc.latency_ms < 200 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {svc.latency_ms}ms
                        </span>
                      </div>
                    )}
                    {svc.localUrl && (
                      <a
                        href={svc.localUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink size={11} />
                        Abrir interfaz web
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Cloudflare Tunnel section */}
      <section>
        <p className="section-title mb-3 flex items-center gap-2">
          <Shield size={13} className="text-orange-400" /> Cloudflare Tunnel
        </p>
        <div className="card border-orange-700/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tunnel status */}
            <div className="space-y-3">
              <p className="text-gray-500 text-xs uppercase tracking-wider">Estado del Tunnel</p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-sm font-semibold">Conectado</span>
                <span className="text-gray-600 text-xs">(Madrid)</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Nombre</span>
                  <span className="text-gray-300 font-mono">b-devops</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">ID</span>
                  <span className="text-gray-500 font-mono text-[10px]">{TUNNEL_ID.slice(0, 18)}…</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Protocolo</span>
                  <span className="text-gray-300 font-mono">QUIC</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Conexiones</span>
                  <span className="text-green-400 font-mono">4 activas</span>
                </div>
              </div>
            </div>

            {/* Routing */}
            <div className="space-y-3">
              <p className="text-gray-500 text-xs uppercase tracking-wider">Enrutamiento</p>
              <div className="bg-gray-900/50 rounded-lg p-3 font-mono text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <Globe size={12} className="text-blue-400 shrink-0" />
                  <span className="text-blue-400">bdev.qzz.io</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <div className="w-3 h-px bg-gray-700" />
                  <span className="text-gray-600">→ tunnel →</span>
                </div>
                <div className="flex items-center gap-2">
                  <Server size={12} className="text-green-400 shrink-0" />
                  <span className="text-green-400">localhost:3000</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircle size={11} className="text-green-400 shrink-0" />
                <span className="text-green-300/80">DNS configurado — app.bdev.qzz.io y api.bdev.qzz.io activos</span>
              </div>
            </div>

            {/* Quick access */}
            <div className="space-y-3">
              <p className="text-gray-500 text-xs uppercase tracking-wider">Acceso</p>
              <div className="space-y-2">
                <a
                  href={PUBLIC_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded bg-blue-900/20 border border-blue-700/30 text-blue-400 hover:bg-blue-900/30 transition-colors"
                >
                  <Globe size={12} />
                  {PUBLIC_URL}
                  <ExternalLink size={10} className="ml-auto" />
                </a>
                <a
                  href="https://dash.cloudflare.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded bg-orange-900/20 border border-orange-700/30 text-orange-400 hover:bg-orange-900/30 transition-colors"
                >
                  <Shield size={12} />
                  Cloudflare Dashboard
                  <ExternalLink size={10} className="ml-auto" />
                </a>
                <a
                  href={`https://dash.cloudflare.com/3112943a05b68b989df4612b11b75a0f/bdev.qzz.io/dns/records`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <Settings2 size={12} />
                  Gestionar DNS
                  <ExternalLink size={10} className="ml-auto" />
                </a>
              </div>
            </div>
          </div>

          {/* DNS routing table */}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Subdominios activos</p>
            <div className="bg-gray-900/60 rounded-lg p-3 font-mono text-xs space-y-1.5">
              {[
                { sub: 'app.bdev.qzz.io',   local: 'localhost:3000', note: 'Frontend' },
                { sub: 'api.bdev.qzz.io',   local: 'localhost:8000', note: 'Backend FastAPI' },
                { sub: 'crm.bdev.qzz.io',   local: 'localhost:5678', note: 'n8n CRM' },
                { sub: 'bdev.qzz.io',       local: 'localhost:3000', note: 'Root (redirect)' },
              ].map(r => (
                <div key={r.sub} className="grid grid-cols-3 gap-2 text-gray-300">
                  <span className="text-blue-400">{r.sub}</span>
                  <span className="text-green-400">→ {r.local}</span>
                  <span className="text-gray-600">{r.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick access panel */}
      <section>
        <p className="section-title mb-3 flex items-center gap-2">
          <Link2 size={13} className="text-purple-400" /> Acceso Rápido — Servicios
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {EXTERNAL_SERVICES.map(svc => {
            const Icon = svc.icon
            return (
              <a
                key={svc.id}
                href={svc.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`card-hover border ${svc.bg} flex items-start gap-3`}
              >
                <div className="p-2.5 rounded-lg bg-current/10 shrink-0">
                  <Icon size={18} className={svc.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white text-sm font-semibold">{svc.name}</span>
                    {svc.optional && <span className="badge badge-gray text-[10px]">OPCIONAL</span>}
                  </div>
                  <p className="text-gray-400 text-xs">{svc.desc}</p>
                  <p className="text-gray-600 text-[10px] font-mono mt-1">{svc.url}</p>
                </div>
                <ExternalLink size={12} className="text-gray-600 shrink-0 mt-1" />
              </a>
            )
          })}
        </div>
      </section>

      {/* Startup persistence info */}
      <section>
        <p className="section-title mb-3 flex items-center gap-2">
          <Radio size={13} className="text-green-400" /> Persistencia y Arranque
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card border-green-700/20">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-white text-sm font-semibold">cloudflared — Task Scheduler</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Tarea</span>
                <span className="text-gray-300 font-mono">B-DEVOPS-CloudflaredTunnel</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Disparador</span>
                <span className="text-gray-300">Al iniciar sesión</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reintentos</span>
                <span className="text-gray-300">3 × 1 minuto</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estado</span>
                <span className="text-green-400">Activo</span>
              </div>
            </div>
          </div>

          <div className="card border-blue-700/20">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={14} className="text-blue-400" />
              <span className="text-white text-sm font-semibold">Docker — restart: unless-stopped</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Backend</span>
                <span className="text-green-400">auto-restart</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Frontend</span>
                <span className="text-green-400">auto-restart</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ClickHouse</span>
                <span className="text-green-400">auto-restart</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">n8n</span>
                <span className="text-green-400">auto-restart</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LogViewer />
    </div>
  )
}
