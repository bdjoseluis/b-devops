import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Globe, Plus, Trash2, RefreshCw, CheckCircle, XCircle,
  AlertTriangle, Clock, Shield, Zap, TrendingUp, Eye,
  Activity, Lock, Unlock, X, ChevronDown, ChevronUp
} from 'lucide-react'
import { monitor } from '../api/client'

const SK = 'aura_monitor_sites'
const SK_HISTORY = 'aura_monitor_history'
const REFRESH_INTERVALS = [0, 30, 60, 120, 300]

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

const STATUS_CONFIG = {
  up:       { color: 'text-green-400',  bg: 'bg-green-400/10 border-green-500/30', dot: 'bg-green-400', label: 'Online' },
  down:     { color: 'text-red-400',    bg: 'bg-red-400/10 border-red-500/30',     dot: 'bg-red-500',   label: 'Caído' },
  degraded: { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-500/30',dot: 'bg-yellow-400',label: 'Degradado' },
  checking: { color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-500/30',   dot: 'bg-blue-400',  label: 'Comprobando...' },
  unknown:  { color: 'text-gray-500',   bg: 'bg-gray-500/10 border-gray-600/30',   dot: 'bg-gray-600',  label: 'Sin verificar' },
}

function sslColor(days) {
  if (days == null) return 'text-gray-500'
  if (days < 14) return 'text-red-400'
  if (days < 30) return 'text-yellow-400'
  return 'text-green-400'
}

function latencyColor(ms) {
  if (ms == null) return 'text-gray-500'
  if (ms < 300) return 'text-green-400'
  if (ms < 800) return 'text-yellow-400'
  return 'text-red-400'
}

export default function Monitor() {
  const [sites, setSites] = useState(() => load(SK, []))
  const [results, setResults] = useState({})
  const [checking, setChecking] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [interval, setIntervalSec] = useState(60)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => { save(SK, sites) }, [sites])

  const runChecks = useCallback(async (sitesToCheck) => {
    if (!sitesToCheck.length) return
    setChecking(true)
    // Mark all as checking
    setResults(prev => {
      const next = { ...prev }
      sitesToCheck.forEach(s => { next[s.id] = { ...next[s.id], status: 'checking' } })
      return next
    })
    try {
      const urls = sitesToCheck.map(s => s.url)
      const data = await monitor.batch(urls)
      const now = Date.now()
      const next = {}
      data.results.forEach((r, i) => {
        const site = sitesToCheck[i]
        next[site.id] = { ...r, checkedAt: now }
        // Update history
        const histKey = `${SK_HISTORY}_${site.id}`
        const hist = load(histKey, [])
        hist.unshift({ ts: now, status: r.status, latency_ms: r.latency_ms, code: r.code })
        save(histKey, hist.slice(0, 50))
      })
      setResults(prev => ({ ...prev, ...next }))
      setLastUpdate(new Date().toLocaleTimeString('es-ES'))
    } catch {
      setResults(prev => {
        const next = { ...prev }
        sitesToCheck.forEach(s => { next[s.id] = { ...next[s.id], status: 'down', error: 'Error de red' } })
        return next
      })
    } finally {
      setChecking(false)
    }
  }, [])

  // Auto-refresh
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (interval > 0 && sites.length) {
      timerRef.current = setInterval(() => runChecks(sites), interval * 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [interval, sites, runChecks])

  // Initial check
  useEffect(() => {
    if (sites.length) runChecks(sites)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addSite = () => {
    let url = newUrl.trim()
    if (!url) return
    if (!url.startsWith('http')) url = 'https://' + url
    const id = Date.now().toString()
    const label = newLabel.trim() || new URL(url).hostname
    const newSites = [...sites, { id, url, label }]
    setSites(newSites)
    setNewUrl('')
    setNewLabel('')
    setShowAdd(false)
    runChecks([{ id, url, label }])
  }

  const removeSite = (id) => {
    setSites(prev => prev.filter(s => s.id !== id))
    setResults(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const up = Object.values(results).filter(r => r?.status === 'up').length
  const down = Object.values(results).filter(r => r?.status === 'down').length
  const avgLatency = (() => {
    const vals = Object.values(results).map(r => r?.latency_ms).filter(v => v != null)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
  })()

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <Globe size={18} className="text-green-400" /> Uptime Monitor
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 font-mono">
            Monitoriza tus webs, APIs y servicios en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lastUpdate && <span className="text-gray-600 text-xs font-mono">Actualizado {lastUpdate}</span>}
          <select
            value={interval}
            onChange={e => setIntervalSec(Number(e.target.value))}
            className="bg-dark-300 border border-surface-border text-gray-400 text-xs rounded-lg px-2 py-1.5"
          >
            <option value={0}>Sin auto-refresh</option>
            <option value={30}>Cada 30s</option>
            <option value={60}>Cada 1min</option>
            <option value={120}>Cada 2min</option>
            <option value={300}>Cada 5min</option>
          </select>
          <button
            onClick={() => runChecks(sites)}
            disabled={checking || !sites.length}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-surface-border text-gray-400 hover:text-white transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={checking ? 'animate-spin' : ''} /> Comprobar
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 transition-colors font-semibold"
          >
            <Plus size={12} /> Añadir URL
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {sites.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-dark-300 border border-surface-border rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Online</p>
            <p className="text-green-400 text-2xl font-bold mt-1">{up}<span className="text-gray-600 text-sm">/{sites.length}</span></p>
            <p className="text-gray-500 text-xs mt-1">{sites.length > 0 ? Math.round((up/sites.length)*100) : 0}% uptime</p>
          </div>
          <div className="bg-dark-300 border border-surface-border rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Caídos</p>
            <p className={`text-2xl font-bold mt-1 ${down > 0 ? 'text-red-400' : 'text-gray-400'}`}>{down}</p>
            <p className="text-gray-500 text-xs mt-1">{down > 0 ? '⚠️ Requiere atención' : 'Todo operativo'}</p>
          </div>
          <div className="bg-dark-300 border border-surface-border rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Latencia media</p>
            <p className={`text-2xl font-bold mt-1 ${latencyColor(avgLatency)}`}>
              {avgLatency != null ? `${avgLatency}ms` : '—'}
            </p>
            <p className="text-gray-500 text-xs mt-1">{avgLatency != null ? (avgLatency < 300 ? 'Excelente' : avgLatency < 800 ? 'Normal' : 'Lenta') : 'Sin datos'}</p>
          </div>
          <div className="bg-dark-300 border border-surface-border rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Sitios monitorados</p>
            <p className="text-white text-2xl font-bold mt-1">{sites.length}</p>
            <p className="text-gray-500 text-xs mt-1">
              {interval > 0 ? `Auto-check cada ${interval < 60 ? interval + 's' : (interval/60) + 'min'}` : 'Manual'}
            </p>
          </div>
        </div>
      )}

      {/* Sites list */}
      {sites.length === 0 ? (
        <div className="bg-dark-300 border border-dashed border-surface-border rounded-2xl p-12 text-center">
          <Globe size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No hay sitios monitorizados</p>
          <p className="text-gray-600 text-sm mt-1">Añade URLs para empezar a monitorizar su uptime, latencia y SSL</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 px-4 py-2 bg-green-500/20 border border-green-500/40 rounded-lg text-green-400 text-sm hover:bg-green-500/30 transition-colors"
          >
            <Plus size={14} className="inline mr-1" /> Añadir primer sitio
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sites.map(site => {
            const r = results[site.id] || {}
            const st = r.status || 'unknown'
            const cfg = STATUS_CONFIG[st] || STATUS_CONFIG.unknown
            const hist = load(`${SK_HISTORY}_${site.id}`, [])
            const isExpanded = expandedId === site.id

            return (
              <div key={site.id} className={`rounded-xl border ${cfg.bg} transition-all`}>
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Status dot */}
                  <div className={`w-3 h-3 rounded-full shrink-0 ${cfg.dot} ${st === 'checking' ? 'animate-pulse' : ''}`} />

                  {/* Site info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">{site.label}</p>
                      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-gray-500 text-[11px] font-mono truncate mt-0.5">{site.url}</p>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-5 text-xs text-gray-400 shrink-0">
                    {r.code && (
                      <div className="text-center hidden sm:block">
                        <p className="text-gray-600 text-[10px]">HTTP</p>
                        <p className={`font-mono font-semibold ${r.code < 400 ? 'text-green-400' : 'text-red-400'}`}>{r.code}</p>
                      </div>
                    )}
                    {r.latency_ms != null && (
                      <div className="text-center hidden sm:block">
                        <p className="text-gray-600 text-[10px]">Latencia</p>
                        <p className={`font-mono font-semibold ${latencyColor(r.latency_ms)}`}>{r.latency_ms}ms</p>
                      </div>
                    )}
                    {r.ssl_days != null && (
                      <div className="text-center hidden md:block">
                        <p className="text-gray-600 text-[10px]">SSL</p>
                        <div className="flex items-center gap-1">
                          {r.ssl_days > 0 ? <Lock size={10} className="text-green-400" /> : <Unlock size={10} className="text-red-400" />}
                          <p className={`font-mono font-semibold ${sslColor(r.ssl_days)}`}>{r.ssl_days}d</p>
                        </div>
                      </div>
                    )}
                    {/* Mini history bar */}
                    {hist.length > 0 && (
                      <div className="hidden lg:flex items-end gap-0.5 h-6">
                        {hist.slice(0, 20).reverse().map((h, i) => (
                          <div
                            key={i}
                            title={`${new Date(h.ts).toLocaleTimeString('es-ES')}: ${h.status}`}
                            className={`w-1.5 rounded-sm ${
                              h.status === 'up' ? 'bg-green-400' :
                              h.status === 'down' ? 'bg-red-500' :
                              h.status === 'degraded' ? 'bg-yellow-400' : 'bg-gray-600'
                            }`}
                            style={{ height: `${Math.max(30, Math.min(100, (h.latency_ms || 200) / 10))}%` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : site.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                      title="Ver historial"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      onClick={() => runChecks([site])}
                      disabled={st === 'checking'}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-40"
                      title="Comprobar ahora"
                    >
                      <RefreshCw size={14} className={st === 'checking' ? 'animate-spin' : ''} />
                    </button>
                    <button
                      onClick={() => removeSite(site.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded history */}
                {isExpanded && (
                  <div className="px-5 pb-4 border-t border-white/5">
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider mt-3 mb-2">Historial reciente</p>
                    {hist.length === 0 ? (
                      <p className="text-gray-600 text-xs">Sin historial aún</p>
                    ) : (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {hist.slice(0, 20).map((h, i) => (
                          <div key={i} className="flex items-center gap-3 text-xs text-gray-400">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${
                              h.status === 'up' ? 'bg-green-400' : h.status === 'down' ? 'bg-red-500' : 'bg-yellow-400'
                            }`} />
                            <span className="font-mono text-gray-600">{new Date(h.ts).toLocaleTimeString('es-ES')}</span>
                            <span className={STATUS_CONFIG[h.status]?.color || 'text-gray-500'}>
                              {STATUS_CONFIG[h.status]?.label || h.status}
                            </span>
                            {h.code && <span className="font-mono text-gray-600">HTTP {h.code}</span>}
                            {h.latency_ms != null && <span className={`font-mono ${latencyColor(h.latency_ms)}`}>{h.latency_ms}ms</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {r.error && (
                      <p className="text-red-400 text-xs mt-2 font-mono">Error: {r.error}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-300 border border-surface-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Globe size={16} className="text-green-400" /> Añadir sitio
              </h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white p-1 rounded transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">URL *</label>
                <input
                  autoFocus
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSite() }}
                  placeholder="https://ejemplo.com o ejemplo.com"
                  className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500/50"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Nombre (opcional)</label>
                <input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSite() }}
                  placeholder="Mi Web, API Producción, ..."
                  className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500/50"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-surface-border text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={addSite}
                disabled={!newUrl.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 text-sm font-semibold transition-colors disabled:opacity-40"
              >
                <Globe size={13} className="inline mr-1" /> Añadir y comprobar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
