import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { tools, scan, osint, ai, reports } from '../api/client'
import {
  Search, Zap, Globe, Mail, User, Phone, Server,
  Shield, Database, Clock, Link, Hash, ChevronDown,
  ChevronUp, AlertTriangle, CheckCircle, XCircle,
  Loader2, Download, Brain, Copy, RefreshCw, Target,
  FolderOpen, Plus, X
} from 'lucide-react'
import { useWorkspace } from '../hooks/useWorkspace'

// ─── Target type detection ────────────────────────────────────────────────────
function detectType(target) {
  const t = target.trim()
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(t)) return 'ip'
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(t)) return 'email'
  if (/^(\+?[\d\s\-().]{7,20})$/.test(t) && t.replace(/\D/g, '').length >= 7) return 'phone'
  if (/^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(t)) return 'domain'
  return 'username'
}

const TYPE_META = {
  ip:       { icon: Server,  label: 'IP Address', color: 'text-blue-400',   bg: 'bg-blue-900/20',   border: 'border-blue-500/30' },
  domain:   { icon: Globe,   label: 'Domain',     color: 'text-green-400',  bg: 'bg-green-900/20',  border: 'border-green-500/30' },
  email:    { icon: Mail,    label: 'Email',       color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/30' },
  username: { icon: User,    label: 'Username',    color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
  phone:    { icon: Phone,   label: 'Phone',       color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-500/30' },
}

// ─── Module definitions per target type ──────────────────────────────────────
const MODULES = {
  ip: [
    { id: 'bgp',      label: 'BGP / ASN',      icon: Hash,     fn: t => tools.bgpIp(t) },
    { id: 'shodan',   label: 'Shodan',          icon: Database, fn: t => scan.shodan(t, 'ip', 10) },
    { id: 'censys',   label: 'Censys',          icon: Shield,   fn: t => tools.censysIp(t) },
    { id: 'sectrails',label: 'SecurityTrails',  icon: Globe,    fn: t => tools.stIp(t) },
    { id: 'urlscan',  label: 'URLScan',         icon: Link,     fn: t => tools.urlscanSearchIp(t, 5) },
  ],
  domain: [
    { id: 'st_domain', label: 'SecurityTrails', icon: Globe,    fn: t => tools.stDomain(t) },
    { id: 'st_subs',   label: 'Subdomains',     icon: Server,   fn: t => tools.stSubdomains(t) },
    { id: 'st_history',label: 'DNS History',    icon: Clock,    fn: t => tools.stHistory(t) },
    { id: 'c99_subs',  label: 'C99 Subdomain',  icon: Hash,     fn: t => tools.c99Subdomains(t) },
    { id: 'wayback',   label: 'Wayback',        icon: Clock,    fn: t => tools.waybackCheck(t) },
    { id: 'urlscan',   label: 'URLScan',        icon: Link,     fn: t => tools.urlscanSearchDomain(t, 5) },
    { id: 'censys',    label: 'Censys',         icon: Shield,   fn: t => tools.censysDomain(t) },
    { id: 'shodan',    label: 'Shodan',         icon: Database, fn: t => scan.shodan(t, 'domain', 10) },
  ],
  email: [
    { id: 'dehashed',    label: 'DeHashed',     icon: Database, fn: t => tools.dehashed(t, 'email', 10) },
    { id: 'leakradar',   label: 'LeakRadar',    icon: AlertTriangle, fn: t => tools.leakradarEmail(t) },
    { id: 'whatsmyname', label: 'WhatsmyName',  icon: User,     fn: t => tools.whatsmyname(t.split('@')[0], null, 50) },
  ],
  username: [
    { id: 'whatsmyname', label: 'WhatsmyName',  icon: User,     fn: t => tools.whatsmyname(t, null, 100) },
    { id: 'dehashed',    label: 'DeHashed',     icon: Database, fn: t => tools.dehashed(t, 'username', 10) },
  ],
  phone: [
    { id: 'c99_phone',   label: 'C99 Phone',    icon: Phone,    fn: t => tools.c99Phone(t) },
    { id: 'dehashed',    label: 'DeHashed',     icon: Database, fn: t => tools.dehashed(t, 'phone', 10) },
  ],
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'pending')  return <span className="text-gray-600 text-xs">pendiente</span>
  if (status === 'running')  return <Loader2 size={13} className="text-yellow-400 animate-spin" />
  if (status === 'done')     return <CheckCircle size={13} className="text-green-400" />
  if (status === 'error')    return <XCircle size={13} className="text-red-400" />
  return null
}

// ─── Generic result display ────────────────────────────────────────────────────
function ResultCard({ moduleId, label, icon: Icon, status, data, error }) {
  const [open, setOpen] = useState(true)

  const summary = () => {
    if (!data) return null
    // Per-module summaries
    if (moduleId === 'bgp') {
      const d = data.data || data
      return (
        <div className="space-y-1 text-xs font-mono">
          {d.asn && <div><span className="text-gray-500">ASN:</span> <span className="text-white">{d.asn}</span></div>}
          {d.name && <div><span className="text-gray-500">Org:</span> <span className="text-white">{d.name}</span></div>}
          {d.country && <div><span className="text-gray-500">País:</span> <span className="text-white">{d.country}</span></div>}
          {d.abuse_contact_email && <div><span className="text-gray-500">Abuse:</span> <span className="text-crimson">{d.abuse_contact_email}</span></div>}
        </div>
      )
    }
    if (moduleId === 'shodan') {
      const items = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : [])
      if (!items.length) return <span className="text-gray-500 text-xs">Sin resultados</span>
      return (
        <div className="space-y-2">
          {items.slice(0, 3).map((item, i) => (
            <div key={i} className="bg-dark-300 rounded p-2 text-xs font-mono">
              <div className="text-white">{item.ip_str || item.ip} <span className="text-gray-500">:{item.port}</span></div>
              {item.org && <div className="text-gray-400">{item.org}</div>}
              {item.data && <div className="text-gray-600 truncate">{String(item.data).slice(0, 120)}</div>}
            </div>
          ))}
          {items.length > 3 && <div className="text-gray-500 text-xs">+{items.length - 3} más</div>}
        </div>
      )
    }
    if (moduleId === 'st_subs' || moduleId === 'c99_subs') {
      const subs = data.subdomains || data.data || []
      return (
        <div className="flex flex-wrap gap-1">
          {subs.slice(0, 20).map((s, i) => (
            <span key={i} className="text-xs bg-dark-300 text-green-300 px-2 py-0.5 rounded font-mono">{s}</span>
          ))}
          {subs.length > 20 && <span className="text-gray-500 text-xs">+{subs.length - 20} más</span>}
        </div>
      )
    }
    if (moduleId === 'dehashed') {
      const entries = data.entries || data.results || []
      if (!entries.length) return <span className="text-gray-500 text-xs">Sin breaches encontrados</span>
      return (
        <div className="space-y-1">
          {entries.slice(0, 5).map((e, i) => (
            <div key={i} className="text-xs font-mono bg-dark-300 rounded p-2">
              {e.email && <div><span className="text-gray-500">email:</span> <span className="text-yellow-300">{e.email}</span></div>}
              {e.username && <div><span className="text-gray-500">user:</span> <span className="text-white">{e.username}</span></div>}
              {e.password && <div><span className="text-gray-500">pass:</span> <span className="text-crimson">{'•'.repeat(e.password.length > 20 ? 20 : e.password.length)}</span></div>}
              {e.database_name && <div><span className="text-gray-500">db:</span> <span className="text-orange-300">{e.database_name}</span></div>}
            </div>
          ))}
          {entries.length > 5 && <div className="text-gray-500 text-xs">+{entries.length - 5} entradas</div>}
        </div>
      )
    }
    if (moduleId === 'whatsmyname') {
      const found = data.found || data.results?.filter(r => r.status === 'found') || []
      return (
        <div className="flex flex-wrap gap-1">
          {found.slice(0, 15).map((f, i) => (
            <a
              key={i}
              href={f.url || f.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-purple-900/30 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded hover:bg-purple-900/50 transition-colors"
            >
              {f.name || f.site}
            </a>
          ))}
          {found.length > 15 && <span className="text-gray-500 text-xs">+{found.length - 15} más</span>}
          {!found.length && <span className="text-gray-500 text-xs">No se encontraron perfiles</span>}
        </div>
      )
    }
    if (moduleId === 'wayback') {
      const d = data.data || data
      return (
        <div className="text-xs font-mono space-y-1">
          {d.available !== undefined && (
            <div><span className="text-gray-500">Disponible:</span> <span className={d.available ? 'text-green-400' : 'text-red-400'}>{d.available ? 'Sí' : 'No'}</span></div>
          )}
          {d.snapshots_count !== undefined && <div><span className="text-gray-500">Snapshots:</span> <span className="text-white">{d.snapshots_count}</span></div>}
          {d.oldest_snapshot && <div><span className="text-gray-500">Más antiguo:</span> <span className="text-white">{d.oldest_snapshot}</span></div>}
          {d.newest_snapshot && <div><span className="text-gray-500">Más reciente:</span> <span className="text-white">{d.newest_snapshot}</span></div>}
        </div>
      )
    }
    if (moduleId === 'leakradar') {
      const leaks = data.leaks || data.results || []
      if (!leaks.length) return <span className="text-green-400 text-xs">✓ Sin filtraciones detectadas</span>
      return (
        <div className="space-y-1">
          {leaks.slice(0, 5).map((l, i) => (
            <div key={i} className="text-xs bg-red-900/20 border border-red-500/20 rounded p-2 font-mono">
              {l.source && <div className="text-red-300">{l.source}</div>}
              {l.date && <div className="text-gray-500">{l.date}</div>}
            </div>
          ))}
        </div>
      )
    }
    if (moduleId === 'urlscan') {
      const results = data.results || []
      if (!results.length) return <span className="text-gray-500 text-xs">Sin escaneos previos</span>
      return (
        <div className="space-y-1">
          {results.slice(0, 4).map((r, i) => (
            <div key={i} className="text-xs font-mono bg-dark-300 rounded p-2">
              <div className="text-white truncate">{r.page?.url || r.url || ''}</div>
              <div className="text-gray-500">{r.task?.time?.slice(0,10) || r.time || ''}</div>
            </div>
          ))}
        </div>
      )
    }
    // Default: JSON dump
    return (
      <pre className="text-xs font-mono text-gray-400 overflow-auto max-h-48 whitespace-pre-wrap break-all">
        {JSON.stringify(data, null, 2).slice(0, 1500)}
      </pre>
    )
  }

  return (
    <div className="bg-dark-200 border border-surface-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-light transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-7 h-7 bg-dark-300 rounded-lg flex items-center justify-center shrink-0">
          <Icon size={14} className="text-gray-400" />
        </div>
        <span className="text-sm font-medium text-white flex-1 text-left">{label}</span>
        <StatusBadge status={status} />
        {error && <span className="text-xs text-red-400 font-mono truncate max-w-40">{String(error).slice(0, 60)}</span>}
        {open ? <ChevronUp size={13} className="text-gray-600" /> : <ChevronDown size={13} className="text-gray-600" />}
      </button>
      {open && (status === 'done' || status === 'error') && (
        <div className="px-4 pb-4 border-t border-surface-border pt-3">
          {status === 'error'
            ? <span className="text-xs text-red-400">{String(error)}</span>
            : summary()
          }
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Pivot() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [target, setTarget]       = useState(() => searchParams.get('target') || '')
  const [detectedType, setDetected] = useState(() => {
    const t = searchParams.get('target')
    return t ? detectType(t) : null
  })
  const [running, setRunning]     = useState(false)
  const [modules, setModules]     = useState([])
  const [aiResult, setAiResult]   = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [sessionId]               = useState(() => `pivot-${Date.now()}`)
  const abortRef                  = useRef(false)

  // Workspace integration
  const { cases, addFindingToCase, createCaseWithFindings } = useWorkspace()
  const [showSave, setShowSave]   = useState(false)
  const [saveTarget, setSaveTarget] = useState('new') // 'new' or case id
  const [saveName, setSaveName]   = useState('')
  const [saveMsg, setSaveMsg]     = useState('')

  const handleSave = () => {
    const successModules = modules.filter(m => m.status === 'done')
    if (!successModules.length) return
    const findings = successModules.map(m => ({
      id: Date.now() + Math.random(),
      type: 'intel',
      title: `${m.label} — ${target.trim()}`,
      content: JSON.stringify(m.data, null, 2).slice(0, 2000),
      severity: 'info',
      ts: Date.now(),
    }))
    if (saveTarget === 'new') {
      const id = createCaseWithFindings(saveName || `Pivot: ${target.trim()}`, target.trim(), detectedType, findings)
      setSaveMsg(`Caso creado con ${findings.length} findings`)
      setTimeout(() => { setShowSave(false); setSaveMsg(''); navigate('/workspace') }, 1500)
    } else {
      findings.forEach(f => addFindingToCase(saveTarget, f))
      setSaveMsg(`${findings.length} findings guardados`)
      setTimeout(() => { setShowSave(false); setSaveMsg('') }, 1500)
    }
  }

  const onInput = (v) => {
    setTarget(v)
    if (v.trim().length > 2) setDetected(detectType(v.trim()))
    else setDetected(null)
  }

  const runPivot = useCallback(async () => {
    const t = target.trim()
    if (!t) return
    const type = detectType(t)
    setDetected(type)
    abortRef.current = false
    setAiResult(null)

    const defs = MODULES[type] || MODULES.username
    const initial = defs.map(m => ({ ...m, status: 'pending', data: null, error: null }))
    setModules(initial)
    setRunning(true)

    await Promise.all(defs.map(async (mod, idx) => {
      setModules(prev => prev.map((m, i) => i === idx ? { ...m, status: 'running' } : m))
      try {
        const data = await mod.fn(t)
        setModules(prev => prev.map((m, i) => i === idx ? { ...m, status: 'done', data } : m))
      } catch (e) {
        setModules(prev => prev.map((m, i) => i === idx ? { ...m, status: 'error', error: e.message || String(e) } : m))
      }
    }))

    setRunning(false)
  }, [target])

  const runAI = async () => {
    const collectedData = {}
    modules.forEach(m => { if (m.data) collectedData[m.id] = m.data })
    setAiLoading(true)
    try {
      const res = await ai.analyze(target.trim(), collectedData, 'osint')
      setAiResult(res.analysis || res.result || JSON.stringify(res))
    } catch (e) {
      setAiResult(`Error: ${e.message}`)
    }
    setAiLoading(false)
  }

  const doneCount  = modules.filter(m => m.status === 'done').length
  const errorCount = modules.filter(m => m.status === 'error').length
  const totalCount = modules.length
  const type       = detectedType
  const TypeMeta   = type ? TYPE_META[type] : null
  const TypeIcon   = TypeMeta?.icon || Target

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-crimson/20 border border-crimson/30 rounded-xl flex items-center justify-center">
          <Target size={20} className="text-crimson" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Intelligence Pivot</h1>
          <p className="text-gray-500 text-sm">Pivoteo automático sobre cualquier objetivo — IP · dominio · email · usuario · teléfono</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-dark-200 border border-surface-border rounded-2xl p-5">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              {TypeMeta ? <TypeIcon size={16} className={TypeMeta.color} /> : <Search size={16} className="text-gray-600" />}
            </div>
            <input
              type="text"
              value={target}
              onChange={e => onInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !running && runPivot()}
              placeholder="192.168.1.1 · example.com · user@email.com · @usuario · +34600..."
              className="w-full bg-dark-300 border border-surface-border rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 font-mono text-sm focus:outline-none focus:border-crimson/50 focus:ring-1 focus:ring-crimson/20"
            />
            {TypeMeta && (
              <div className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold ${TypeMeta.bg} ${TypeMeta.color} border ${TypeMeta.border}`}>
                {TypeMeta.label}
              </div>
            )}
          </div>
          <button
            onClick={runPivot}
            disabled={!target.trim() || running}
            className="px-6 py-3 bg-crimson hover:bg-crimson/80 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {running ? 'Analizando...' : 'Pivotar'}
          </button>
        </div>

        {/* Module tags */}
        {type && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-gray-600 mr-1 self-center">Módulos:</span>
            {(MODULES[type] || []).map(m => (
              <span key={m.id} className="text-[10px] bg-dark-300 text-gray-400 border border-surface-border px-2 py-0.5 rounded font-mono">
                {m.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {modules.length > 0 && (
        <div className="bg-dark-200 border border-surface-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">
              {running ? `Ejecutando módulos... ${doneCount + errorCount}/${totalCount}` : `Completado — ${doneCount} ok · ${errorCount} errores`}
            </span>
            <div className="flex gap-3">
              <span className="text-green-400 font-mono">{doneCount} ✓</span>
              {errorCount > 0 && <span className="text-red-400 font-mono">{errorCount} ✗</span>}
            </div>
          </div>
          <div className="h-1.5 bg-dark-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-crimson to-orange-500 rounded-full transition-all duration-300"
              style={{ width: totalCount ? `${((doneCount + errorCount) / totalCount) * 100}%` : '0%' }}
            />
          </div>
          {/* Module status pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {modules.map(m => (
              <div
                key={m.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                  m.status === 'done'    ? 'bg-green-900/20 border-green-500/30 text-green-300' :
                  m.status === 'error'   ? 'bg-red-900/20 border-red-500/30 text-red-300' :
                  m.status === 'running' ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300' :
                  'bg-dark-300 border-surface-border text-gray-600'
                }`}
              >
                {m.status === 'running' && <Loader2 size={9} className="animate-spin" />}
                {m.status === 'done'    && <CheckCircle size={9} />}
                {m.status === 'error'   && <XCircle size={9} />}
                {m.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis + Save */}
      {!running && doneCount > 0 && (
        <div className="bg-dark-200 border border-surface-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Brain size={16} className="text-purple-400" />
              <span className="text-sm font-semibold text-white">Síntesis IA</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSave(true)}
                className="px-4 py-1.5 bg-indigo-900/30 border border-indigo-500/30 hover:bg-indigo-900/50 text-indigo-300 rounded-lg text-xs font-medium flex items-center gap-2 transition-all"
              >
                <FolderOpen size={12} /> Guardar en Workspace
              </button>
              <button
                onClick={runAI}
                disabled={aiLoading}
                className="px-4 py-1.5 bg-purple-900/30 border border-purple-500/30 hover:bg-purple-900/50 text-purple-300 rounded-lg text-xs font-medium flex items-center gap-2 transition-all disabled:opacity-40"
              >
                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                {aiLoading ? 'Analizando...' : 'Analizar con IA'}
              </button>
            </div>
          </div>
          {aiResult ? (
            <div className="bg-dark-300 rounded-lg p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-mono text-xs">
              {aiResult}
            </div>
          ) : (
            <p className="text-gray-600 text-xs">Haz clic en "Analizar con IA" para obtener una síntesis inteligente de todos los resultados.</p>
          )}
        </div>
      )}

      {/* Module results */}
      {modules.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Resultados por módulo</h2>
          <div className="grid grid-cols-1 gap-3">
            {modules.map((m, i) => (
              <ResultCard key={i} {...m} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {modules.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          <Target size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-gray-500">Ingresa un objetivo para pivotar</p>
          <p className="text-sm mt-1">IP · dominio · email · usuario · número de teléfono</p>
          <div className="mt-8 grid grid-cols-5 gap-3 max-w-2xl mx-auto">
            {Object.entries(TYPE_META).map(([type, meta]) => (
              <div
                key={type}
                className={`p-3 rounded-xl border ${meta.border} ${meta.bg} text-center cursor-pointer hover:opacity-80 transition-all`}
                onClick={() => { setTarget(type === 'ip' ? '8.8.8.8' : type === 'domain' ? 'example.com' : type === 'email' ? 'user@example.com' : type === 'username' ? 'johndoe' : '+34600000000'); setDetected(type) }}
              >
                <meta.icon size={18} className={`${meta.color} mx-auto mb-1`} />
                <div className={`text-[10px] font-bold ${meta.color}`}>{meta.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save to Workspace modal */}
      {showSave && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-dark-200 border border-surface-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <FolderOpen size={16} className="text-indigo-400" />
                <h2 className="text-white font-bold">Guardar en Workspace</h2>
              </div>
              <button onClick={() => setShowSave(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {saveMsg ? (
                <div className="text-center py-4">
                  <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
                  <p className="text-white font-semibold">{saveMsg}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-400">
                    Se guardarán <span className="text-white font-bold">{modules.filter(m => m.status === 'done').length} módulos</span> como findings en una investigación.
                  </p>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Destino</label>
                    <select
                      value={saveTarget}
                      onChange={e => setSaveTarget(e.target.value)}
                      className="w-full bg-dark-300 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                    >
                      <option value="new">✨ Crear nueva investigación</option>
                      {cases.filter(c => c.status !== 'closed').map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.target || 'sin objetivo'})</option>
                      ))}
                    </select>
                  </div>
                  {saveTarget === 'new' && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                      <input
                        value={saveName}
                        onChange={e => setSaveName(e.target.value)}
                        placeholder={`Pivot: ${target.trim()}`}
                        className="w-full bg-dark-300 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-crimson/50"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            {!saveMsg && (
              <div className="flex justify-end gap-3 p-5 border-t border-surface-border">
                <button onClick={() => setShowSave(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancelar</button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
                >
                  <FolderOpen size={14} /> Guardar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
