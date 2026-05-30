import { useState, useEffect, useCallback, useRef } from 'react'
import { outreach as outreachApi, settings as settingsApi } from '../api/client'
import {
  Search, TrendingUp, Mail, Send, Check, X, RefreshCw,
  Globe, Phone, MapPin, AlertTriangle, Zap, Star,
  ChevronRight, Edit2, Trash2, Plus, Download,
  Clock, CheckCircle, MessageSquare, Users, BarChart2,
  ExternalLink, Copy, Loader2, Filter, Calendar,
  Play, Pause, SkipForward, Target, Bell, BellRing
} from 'lucide-react'

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  discovered:      { label: 'Descubierto',    color: 'text-gray-400',   bg: 'bg-gray-800/40 border-gray-700/30',    dot: 'bg-gray-400' },
  email_generated: { label: 'Email listo',    color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-700/30',    dot: 'bg-blue-400' },
  approved:        { label: 'Aprobado',       color: 'text-cyan-400',   bg: 'bg-cyan-900/20 border-cyan-700/30',    dot: 'bg-cyan-400' },
  sent:            { label: 'Enviado',        color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-700/30', dot: 'bg-yellow-400' },
  replied:         { label: 'Respondió',      color: 'text-green-400',  bg: 'bg-green-900/20 border-green-700/30',  dot: 'bg-green-400' },
  converted:       { label: 'Convertido',     color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-700/30', dot: 'bg-purple-400' },
  discarded:       { label: 'Descartado',     color: 'text-red-400',    bg: 'bg-red-900/20 border-red-700/30',      dot: 'bg-red-400' },
}

const SCORE_COLOR = s => s >= 70 ? 'text-red-400' : s >= 40 ? 'text-orange-400' : s >= 20 ? 'text-yellow-400' : 'text-green-400'
const SCORE_BG    = s => s >= 70 ? 'bg-red-900/20 border-red-700/30' : s >= 40 ? 'bg-orange-900/20 border-orange-700/30' : s >= 20 ? 'bg-yellow-900/20 border-yellow-700/30' : 'bg-green-900/20 border-green-700/30'

const CATEGORIES = [
  'empresa', 'restaurante', 'tienda', 'medico', 'abogado', 'hotel',
  'gym', 'farmacia', 'peluqueria', 'academia', 'taller', 'clinica',
  'inmobiliaria', 'consultoria', 'contable', 'fontanero', 'electricista',
]

// ── Bulk progress bar ─────────────────────────────────────────────────────────
function BulkProgress({ label, done, total, color = 'bg-purple-500' }) {
  if (!total) return null
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>{done}/{total}</span>
      </div>
      <div className="w-full h-1.5 bg-dark-400 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${(done / total) * 100}%` }} />
      </div>
    </div>
  )
}

// ── Pipeline stats bar ────────────────────────────────────────────────────────
function PipelineBar({ stats, onExport }) {
  if (!stats) return null
  const steps = [
    { key: 'discovered',      label: 'Nuevos' },
    { key: 'email_generated', label: 'Email listo' },
    { key: 'sent',            label: 'Enviados' },
    { key: 'replied',         label: 'Respondieron' },
    { key: 'converted',       label: 'Clientes' },
  ]
  const sentPct = Math.min(100, (stats.sent_today / stats.daily_limit) * 100)

  return (
    <div className="bg-dark-300 border border-surface-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <span className="text-white font-semibold text-sm flex items-center gap-2">
          <BarChart2 size={15} className="text-purple-400" /> Pipeline
        </span>
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <span className="text-gray-500">Emails hoy: <span className="text-yellow-400 font-bold">{stats.sent_today}/{stats.daily_limit}</span></span>
          <span className="text-gray-500">Con email: <span className="text-green-400 font-bold">{stats.has_email}</span></span>
          <span className="text-gray-500">Alta oportunidad: <span className="text-orange-400 font-bold">{stats.high_opportunity}</span></span>
          <button onClick={onExport}
            className="flex items-center gap-1 px-2 py-1 bg-dark-400 border border-surface-border text-gray-400 hover:text-white rounded-lg transition-colors">
            <Download size={11} /> CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {steps.map((s, i) => {
          const count = stats.by_status?.[s.key] || 0
          const cfg   = STATUS[s.key]
          return (
            <div key={s.key} className="text-center relative">
              <div className={`rounded-lg py-2 border text-sm font-bold ${cfg.bg} ${cfg.color}`}>{count}</div>
              <div className="text-gray-600 text-[10px] mt-1 truncate">{s.label}</div>
              {i < steps.length - 1 && (
                <ChevronRight size={12} className="text-gray-700 absolute -right-1 top-2.5" />
              )}
            </div>
          )
        })}
      </div>

      <div>
        <div className="flex justify-between text-[11px] text-gray-500 mb-1">
          <span>Límite diario de envíos</span>
          <span className={sentPct >= 90 ? 'text-red-400' : sentPct >= 70 ? 'text-yellow-400' : 'text-green-400'}>
            {stats.sent_today}/{stats.daily_limit}
          </span>
        </div>
        <div className="w-full h-1.5 bg-dark-400 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${sentPct}%`, background: sentPct >= 90 ? '#ef4444' : sentPct >= 70 ? '#f59e0b' : '#a855f7' }} />
        </div>
      </div>
    </div>
  )
}

// ── Search form ───────────────────────────────────────────────────────────────
function SearchForm({ onDone }) {
  const [location,   setLocation]  = useState('')
  const [category,   setCategory]  = useState('empresa')
  const [radius,     setRadius]    = useState(10)
  const [limit,      setLimit]     = useState(20)
  const [minScore,   setMinScore]  = useState(25)
  const [loading,    setLoading]   = useState(false)
  const [error,      setError]     = useState('')
  const [result,     setResult]    = useState(null)

  const run = async () => {
    if (!location.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await outreachApi.search({ location: location.trim(), category, radius_km: radius, limit, min_score: minScore })
      setResult(res)
      onDone()
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Error en la búsqueda')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-dark-300 border border-surface-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Search size={15} className="text-green-400" />
        <span className="text-white font-semibold text-sm">Buscar empresas</span>
        <span className="text-gray-600 text-xs">— Google Places (con key) o OpenStreetMap (sin key)</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="col-span-2">
          <label className="text-gray-500 text-xs mb-1 block">Ciudad / Zona</label>
          <input value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Alicante, Murcia, Madrid..."
            className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500/40" />
        </div>
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Categoría</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Radio (km)</label>
          <input type="number" min={1} max={50} value={radius} onChange={e => setRadius(Number(e.target.value))}
            className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Límite</label>
          <input type="number" min={5} max={50} value={limit} onChange={e => setLimit(Number(e.target.value))}
            className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Score mín.</label>
          <input type="number" min={0} max={100} value={minScore} onChange={e => setMinScore(Number(e.target.value))}
            className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
        </div>
      </div>

      <button onClick={run} disabled={!location.trim() || loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40">
        {loading
          ? <><Loader2 size={14} className="animate-spin" /> Buscando y analizando webs... (puede tardar 30s)</>
          : <><Search size={14} /> Buscar y analizar empresas</>}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/10 border border-red-700/30 rounded-lg px-3 py-2">
          <AlertTriangle size={12} /> {error}
        </div>
      )}
      {result && !loading && (
        <div className="flex items-center gap-3 text-sm text-gray-400 bg-dark-400 rounded-lg px-4 py-2">
          <CheckCircle size={13} className="text-green-400 shrink-0" />
          <span>
            <span className="text-white font-bold">{result.total_found}</span> encontradas ·
            <span className="text-green-400 font-bold ml-1">{result.saved}</span> guardadas (score ≥ {minScore}) ·
            <span className="text-gray-500 ml-1">{result.skipped_low_score} descartadas por score bajo</span>
          </span>
        </div>
      )}
    </div>
  )
}

// ── Bulk actions panel ────────────────────────────────────────────────────────
function BulkPanel({ selected, allLeads, onDone, onClearSelection }) {
  const [busy,         setBusy]         = useState(null)  // 'emails'|'generate'|'send'|null
  const [progress,     setProgress]     = useState({ done: 0, total: 0 })
  const [lastResult,   setLastResult]   = useState(null)
  const [sendDelay,    setSendDelay]    = useState(15)

  const discoveredIds = allLeads.filter(l => l.status === 'discovered').map(l => l.id)
  const generatedIds  = allLeads.filter(l => l.status === 'email_generated' && l.email).map(l => l.id)
  const targetIds     = selected.length > 0 ? selected : null

  const runBulkEmails = async () => {
    setBusy('emails'); setLastResult(null)
    try {
      const res = await outreachApi.bulkFindEmails()
      setLastResult({ type: 'emails', ...res })
      onDone()
    } catch (e) {
      setLastResult({ type: 'emails', error: e?.response?.data?.detail || e.message })
    } finally { setBusy(null) }
  }

  const runBulkGenerate = async () => {
    setBusy('generate'); setLastResult(null)
    const ids = targetIds || discoveredIds
    setProgress({ done: 0, total: ids.length || 20 })
    try {
      const res = await outreachApi.bulkGenerate(targetIds ? { ids: targetIds } : { status_filter: 'discovered' })
      setLastResult({ type: 'generate', ...res })
      onDone()
    } catch (e) {
      setLastResult({ type: 'generate', error: e?.response?.data?.detail || e.message })
    } finally { setBusy(null); setProgress({ done: 0, total: 0 }) }
  }

  const runBulkSend = async () => {
    if (!window.confirm(`¿Enviar emails a ${targetIds ? targetIds.length : generatedIds.length} empresas? Esta acción no se puede deshacer.`)) return
    setBusy('send'); setLastResult(null)
    try {
      const res = await outreachApi.bulkSend(targetIds ? { ids: targetIds, delay_seconds: sendDelay } : { delay_seconds: sendDelay })
      setLastResult({ type: 'send', ...res })
      onDone()
    } catch (e) {
      setLastResult({ type: 'send', error: e?.response?.data?.detail || e.message })
    } finally { setBusy(null) }
  }

  return (
    <div className="bg-dark-300 border border-purple-700/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-white font-semibold text-sm flex items-center gap-2">
          <Zap size={14} className="text-purple-400" /> Acciones masivas
          {selected.length > 0 && (
            <span className="text-xs bg-purple-900/30 border border-purple-700/30 text-purple-400 px-2 py-0.5 rounded-full">
              {selected.length} seleccionados
            </span>
          )}
        </span>
        {selected.length > 0 && (
          <button onClick={onClearSelection} className="text-xs text-gray-500 hover:text-white">Limpiar selección</button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Find emails */}
        <button onClick={runBulkEmails} disabled={!!busy}
          className="flex flex-col items-center gap-1.5 p-3 bg-green-900/20 border border-green-700/30 text-green-400 hover:bg-green-900/30 rounded-xl transition-colors disabled:opacity-40 text-sm font-medium">
          {busy === 'emails' ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
          <span>Buscar emails</span>
          <span className="text-[11px] text-gray-500 font-normal">Scraper + Hunter.io</span>
        </button>

        {/* Bulk generate */}
        <button onClick={runBulkGenerate} disabled={!!busy}
          className="flex flex-col items-center gap-1.5 p-3 bg-blue-900/20 border border-blue-700/30 text-blue-400 hover:bg-blue-900/30 rounded-xl transition-colors disabled:opacity-40 text-sm font-medium">
          {busy === 'generate' ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          <span>Generar emails IA</span>
          <span className="text-[11px] text-gray-500 font-normal">
            {targetIds ? `${targetIds.length} seleccionados` : `${discoveredIds.length} descubiertos`}
          </span>
        </button>

        {/* Bulk send */}
        <div className="flex flex-col gap-1.5">
          <button onClick={runBulkSend} disabled={!!busy || generatedIds.length === 0}
            className="flex items-center justify-center gap-1.5 p-3 bg-yellow-900/20 border border-yellow-700/30 text-yellow-400 hover:bg-yellow-900/30 rounded-xl transition-colors disabled:opacity-40 text-sm font-medium h-full">
            {busy === 'send' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <div className="text-left">
              <div>Enviar todos</div>
              <div className="text-[11px] text-gray-500 font-normal">{generatedIds.length} listos</div>
            </div>
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Espera entre envíos:</span>
            <input type="number" value={sendDelay} onChange={e => setSendDelay(Number(e.target.value))} min={5} max={120}
              className="w-16 bg-dark-400 border border-surface-border rounded px-2 py-0.5 text-white text-xs focus:outline-none" />
            <span>s</span>
          </div>
        </div>
      </div>

      {/* Result feedback */}
      {lastResult && (
        <div className={`text-xs rounded-lg px-3 py-2 border ${lastResult.error ? 'bg-red-900/10 border-red-700/30 text-red-400' : 'bg-dark-400 border-surface-border text-gray-400'}`}>
          {lastResult.error ? (
            <span><AlertTriangle size={11} className="inline mr-1" />{lastResult.error}</span>
          ) : lastResult.type === 'emails' ? (
            <span><CheckCircle size={11} className="inline mr-1 text-green-400" />Emails encontrados: <b className="text-green-400">{lastResult.found}</b> · fallidos: {lastResult.failed}</span>
          ) : lastResult.type === 'generate' ? (
            <span><CheckCircle size={11} className="inline mr-1 text-blue-400" />Generados: <b className="text-blue-400">{lastResult.generated}</b> · fallidos: {lastResult.failed}</span>
          ) : (
            <span><CheckCircle size={11} className="inline mr-1 text-yellow-400" />Enviados: <b className="text-yellow-400">{lastResult.sent}</b> · fallidos: {lastResult.failed} · saltados: {lastResult.skipped}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Email modal ───────────────────────────────────────────────────────────────
function EmailModal({ lead, onClose, onSent, onSaved }) {
  const [subject,    setSubject]    = useState(lead.generated_subject || '')
  const [body,       setBody]       = useState(lead.generated_email || '')
  const [toEmail,    setToEmail]    = useState(lead.email || '')
  const [generating, setGenerating] = useState(false)
  const [finding,    setFinding]    = useState(false)
  const [sending,    setSending]    = useState(false)
  const [error,      setError]      = useState('')
  const [copied,     setCopied]     = useState(false)

  const issues = Array.isArray(lead.web_issues)
    ? lead.web_issues
    : (typeof lead.web_issues === 'string' ? (() => { try { return JSON.parse(lead.web_issues) } catch { return [] } })() : [])

  const generate = async () => {
    setGenerating(true); setError('')
    try {
      const res = await outreachApi.generateEmail(lead.id)
      setSubject(res.generated_subject || res.subject || '')
      setBody(res.generated_email || res.body || '')
      onSaved(res)
    } catch (e) { setError(e?.response?.data?.detail || e.message || 'Error Gemini') }
    finally { setGenerating(false) }
  }

  const findEmail = async () => {
    setFinding(true); setError('')
    try {
      const res = await outreachApi.findEmail(lead.id)
      if (res.found) {
        setToEmail(res.email)
        onSaved({ ...lead, email: res.email, email_source: res.source })
      } else {
        setError('No se encontró email en la web. Introdúcelo manualmente.')
      }
    } catch (e) { setError(e?.response?.data?.detail || e.message) }
    finally { setFinding(false) }
  }

  const saveEdits = async () => {
    try {
      const res = await outreachApi.update(lead.id, { generated_subject: subject, generated_email: body, email: toEmail })
      onSaved(res)
    } catch {}
  }

  const send = async () => {
    if (!toEmail || !toEmail.includes('@')) return setError('Email de destino inválido')
    setSending(true); setError('')
    try {
      await saveEdits()
      await outreachApi.send(lead.id, toEmail)
      onSent()
      onClose()
    } catch (e) { setError(e?.response?.data?.detail || e.message || 'Error enviando') }
    finally { setSending(false) }
  }

  const copyAll = () => {
    navigator.clipboard.writeText(`Asunto: ${subject}\n\n${body}`)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-300 border border-surface-border rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border shrink-0">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2"><Mail size={15} className="text-blue-400" /> {lead.name}</h3>
            <div className="flex items-center gap-3 mt-0.5">
              {lead.website && (
                <a href={lead.website} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  <ExternalLink size={10} /> {lead.website.replace(/^https?:\/\//, '').split('/')[0]}
                </a>
              )}
              <span className={`text-xs font-bold ${SCORE_COLOR(lead.opportunity_score)}`}>Score {lead.opportunity_score}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Issues + opportunity */}
          <div className="flex flex-wrap gap-1.5">
            {!lead.website && <span className="text-[11px] px-2 py-0.5 rounded bg-red-900/20 border border-red-700/30 text-red-400">🔥 SIN WEB — máxima oportunidad</span>}
            {issues.map(i => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-orange-900/20 border border-orange-700/30 text-orange-400">⚠ {i}</span>
            ))}
          </div>

          {/* Generate button */}
          {!body && (
            <button onClick={generate} disabled={generating}
              className="w-full py-3 bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
              {generating ? <><Loader2 size={14} className="animate-spin" /> Generando con Gemini 2.0 Flash...</> : <><Zap size={14} /> Generar email personalizado con IA</>}
            </button>
          )}

          {/* Subject */}
          <div>
            <label className="text-gray-500 text-xs mb-1 block">Asunto</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Asunto del email..."
              className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/40" />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-gray-500 text-xs">Cuerpo (editable)</label>
              <div className="flex gap-2">
                {body && (
                  <>
                    <button onClick={generate} disabled={generating} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                      <RefreshCw size={10} className={generating ? 'animate-spin' : ''} /> Regenerar
                    </button>
                    <button onClick={copyAll} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                      {copied ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                    </button>
                  </>
                )}
              </div>
            </div>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={11}
              placeholder="El email generado aparecerá aquí. Puedes editarlo antes de enviar."
              className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-blue-500/40 font-mono leading-relaxed" />
          </div>

          {/* To email */}
          <div>
            <label className="text-gray-500 text-xs mb-1 block">Enviar a</label>
            <div className="flex gap-2">
              <input type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="email@empresa.com"
                className="flex-1 bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/40" />
              {!toEmail && lead.website && (
                <button onClick={findEmail} disabled={finding}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 rounded-lg text-xs font-medium transition-colors whitespace-nowrap">
                  {finding ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                  Buscar email
                </button>
              )}
            </div>
            {lead.email_source && <p className="text-gray-600 text-[11px] mt-1">Encontrado vía {lead.email_source}</p>}
            {!lead.email && !toEmail && <p className="text-yellow-400 text-xs mt-1">⚠ No se detectó email automáticamente</p>}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/10 border border-red-700/30 rounded-lg px-3 py-2">
              <AlertTriangle size={13} /> {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-surface-border flex gap-2 shrink-0">
          <button onClick={() => { saveEdits(); onClose() }}
            className="flex-1 px-4 py-2 border border-surface-border text-gray-400 hover:text-white rounded-lg text-sm transition-colors">
            Guardar borrador
          </button>
          <button onClick={send} disabled={sending || !body || !toEmail}
            className="flex-1 px-4 py-2 bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
            {sending ? <><Loader2 size={13} className="animate-spin" /> Enviando...</> : <><Send size={13} /> Enviar email</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Lead row ──────────────────────────────────────────────────────────────────
function LeadRow({ lead, selected, onToggleSelect, onRefresh, onOpenEmail }) {
  const [loading, setLoading] = useState(false)
  const [finding, setFinding] = useState(false)
  const cfg = STATUS[lead.status] || STATUS.discovered

  const issues = Array.isArray(lead.web_issues)
    ? lead.web_issues
    : (typeof lead.web_issues === 'string' ? (() => { try { return JSON.parse(lead.web_issues) } catch { return [] } })() : [])

  const changeStatus = async (status) => {
    setLoading(true)
    try { await outreachApi.updateStatus(lead.id, status); onRefresh() }
    finally { setLoading(false) }
  }

  const quickFindEmail = async (e) => {
    e.stopPropagation()
    setFinding(true)
    try {
      const res = await outreachApi.findEmail(lead.id)
      if (res.found) onRefresh()
    } finally { setFinding(false) }
  }

  const remove = async (e) => {
    e.stopPropagation()
    if (!window.confirm(`¿Eliminar ${lead.name}?`)) return
    await outreachApi.remove(lead.id)
    onRefresh()
  }

  const isOverdue = lead.follow_up_at && new Date(lead.follow_up_at) <= new Date()

  return (
    <div
      className={`bg-dark-300 border rounded-xl px-4 py-3.5 transition-all group ${
        selected ? 'border-purple-500/50 bg-purple-900/10' : 'border-surface-border hover:border-green-500/20'
      }`}
    >
      <div className="flex items-center gap-3 flex-wrap">
        {/* Checkbox */}
        <button
          onClick={() => onToggleSelect(lead.id)}
          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
            selected ? 'bg-purple-500 border-purple-500' : 'border-gray-600 hover:border-gray-400'
          }`}
        >
          {selected && <Check size={10} className="text-white" />}
        </button>

        {/* Score */}
        <div className={`text-center rounded-lg px-2.5 py-1 border shrink-0 min-w-[44px] ${SCORE_BG(lead.opportunity_score)}`}>
          <div className={`text-base font-black leading-none ${SCORE_COLOR(lead.opportunity_score)}`}>{lead.opportunity_score}</div>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{lead.name}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color} shrink-0`}>{cfg.label}</span>
            {!lead.website && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/20 border border-red-700/30 text-red-400">SIN WEB</span>}
            {isOverdue && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-900/20 border border-orange-700/30 text-orange-400 flex items-center gap-0.5"><BellRing size={9} />Follow-up</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500">
            {lead.address && <span className="flex items-center gap-1 truncate max-w-[200px]"><MapPin size={9} />{lead.address}</span>}
            {lead.phone   && <span className="flex items-center gap-1"><Phone size={9} />{lead.phone}</span>}
            {lead.email   ? (
              <span className="flex items-center gap-1 text-green-400">
                <Mail size={9} />{lead.email}
                {lead.email_source && <span className="text-gray-600">({lead.email_source})</span>}
              </span>
            ) : lead.website ? (
              <button onClick={quickFindEmail} disabled={finding}
                className="flex items-center gap-1 text-yellow-500 hover:text-yellow-300 transition-colors">
                {finding ? <Loader2 size={9} className="animate-spin" /> : <Search size={9} />}
                buscar email
              </button>
            ) : <span className="text-red-500">sin email · sin web</span>}
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
                <Globe size={9} />{lead.website.replace(/^https?:\/\//, '').split('/')[0]}
              </a>
            )}
          </div>
          {issues.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {issues.slice(0,3).map(i => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-900/20 border border-orange-700/30 text-orange-400">{i}</span>
              ))}
            </div>
          )}
        </div>

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {lead.status !== 'discarded' && (
            <button onClick={e => { e.stopPropagation(); onOpenEmail(lead) }}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                lead.generated_email
                  ? 'bg-blue-900/20 border-blue-700/30 text-blue-400 hover:bg-blue-900/30'
                  : 'bg-dark-400 border-surface-border text-gray-400 hover:text-white'
              }`}>
              <Mail size={11} /> {lead.generated_email ? 'Email listo' : 'Generar'}
            </button>
          )}
          {lead.status === 'sent' && (
            <>
              <button onClick={e => { e.stopPropagation(); changeStatus('replied') }}
                className="flex items-center gap-1 px-2 py-1.5 bg-green-900/20 border border-green-700/30 text-green-400 hover:bg-green-900/30 rounded-lg text-xs transition-colors">
                <MessageSquare size={11} /> Respondió
              </button>
              <button onClick={e => { e.stopPropagation(); changeStatus('converted') }}
                className="flex items-center gap-1 px-2 py-1.5 bg-purple-900/20 border border-purple-700/30 text-purple-400 hover:bg-purple-900/30 rounded-lg text-xs transition-colors">
                <Star size={11} /> Convertir
              </button>
            </>
          )}
          {lead.status === 'replied' && (
            <button onClick={e => { e.stopPropagation(); changeStatus('converted') }}
              className="flex items-center gap-1 px-2 py-1.5 bg-purple-900/20 border border-purple-700/30 text-purple-400 hover:bg-purple-900/30 rounded-lg text-xs font-medium transition-colors">
              <Star size={11} /> Convertir a cliente
            </button>
          )}
          {!['discarded','converted'].includes(lead.status) && (
            <button onClick={e => { e.stopPropagation(); changeStatus('discarded') }}
              className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
              <X size={12} />
            </button>
          )}
          <button onClick={remove} className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Outreach() {
  const [leads,         setLeads]         = useState([])
  const [stats,         setStats]         = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [filterStatus,  setFilterStatus]  = useState('all')
  const [search,        setSearch]        = useState('')
  const [selected,      setSelected]      = useState([])
  const [emailLead,     setEmailLead]     = useState(null)
  const [smtpOk,        setSmtpOk]       = useState(null)
  const [followUpsDue,  setFollowUpsDue]  = useState(0)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [leadsRes, statsRes] = await Promise.all([
        outreachApi.list({ limit: 500 }),
        outreachApi.stats(),
      ])
      setLeads(leadsRes.leads || [])
      setStats(statsRes)
    } catch {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
    settingsApi.get().then(cfg => setSmtpOk(cfg?.smtp?.enabled === true)).catch(() => {})
    outreachApi.pendingFollowUps().then(r => setFollowUpsDue(r.total || 0)).catch(() => {})
  }, [loadAll])

  const filtered = leads.filter(l => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.address?.toLowerCase().includes(q)
    }
    return true
  })

  const statusCounts = leads.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc }, {})

  const FILTER_TABS = [
    { id: 'all',            label: 'Todos',      count: leads.length },
    { id: 'discovered',     label: 'Nuevos',     count: statusCounts.discovered || 0 },
    { id: 'email_generated',label: 'Email listo',count: statusCounts.email_generated || 0 },
    { id: 'sent',           label: 'Enviados',   count: statusCounts.sent || 0 },
    { id: 'replied',        label: 'Respondidos',count: statusCounts.replied || 0 },
    { id: 'converted',      label: 'Convertidos',count: statusCounts.converted || 0 },
    { id: 'discarded',      label: 'Descartados',count: statusCounts.discarded || 0 },
  ]

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const selectAll    = () => setSelected(filtered.map(l => l.id))
  const clearSelect  = () => setSelected([])

  const exportCsv = () => {
    const url = outreachApi.exportCsvUrl(filterStatus !== 'all' ? filterStatus : null)
    window.open('/api' + url.replace('/api', ''), '_blank')
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <Target size={18} className="text-green-400" /> Outreach Engine
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Descubre empresas → analiza webs → extrae emails → genera email IA → envía → convierte
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {followUpsDue > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-orange-400 bg-orange-900/20 border border-orange-700/30 px-3 py-1.5 rounded-lg">
              <BellRing size={12} /> {followUpsDue} follow-up{followUpsDue > 1 ? 's' : ''} pendiente{followUpsDue > 1 ? 's' : ''}
            </div>
          )}
          {smtpOk === false && (
            <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700/30 px-3 py-1.5 rounded-lg">
              <AlertTriangle size={12} /> SMTP no activo
            </div>
          )}
          <button onClick={loadAll} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-surface-border text-gray-400 hover:text-white rounded-lg transition-colors">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {/* Pipeline */}
      <PipelineBar stats={stats} onExport={exportCsv} />

      {/* Search */}
      <SearchForm onDone={loadAll} />

      {/* Bulk actions */}
      <BulkPanel selected={selected} allLeads={leads} onDone={loadAll} onClearSelection={clearSelect} />

      {/* Filter + search bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-1 bg-dark-300 p-1 rounded-xl border border-surface-border overflow-x-auto">
          {FILTER_TABS.map(t => (
            <button key={t.id} onClick={() => setFilterStatus(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filterStatus === t.id ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-400 hover:text-white'
              }`}>
              {t.label}
              {t.count > 0 && <span className="bg-dark-400 text-gray-400 rounded-full px-1.5 py-0.5 text-[10px]">{t.count}</span>}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empresa, email, dirección..."
          className="flex-1 bg-dark-300 border border-surface-border rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/40" />
        {filtered.length > 0 && (
          <button onClick={selected.length === filtered.length ? clearSelect : selectAll}
            className="text-xs text-gray-400 hover:text-white whitespace-nowrap transition-colors">
            {selected.length === filtered.length ? 'Deseleccionar todo' : `Seleccionar ${filtered.length}`}
          </button>
        )}
      </div>

      {/* Leads list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
          <Loader2 size={16} className="animate-spin" /> Cargando leads...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-dark-300 border border-dashed border-surface-border rounded-2xl p-12 text-center">
          <Target size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">{leads.length === 0 ? 'Sin leads todavía' : 'Sin resultados con ese filtro'}</p>
          <p className="text-gray-600 text-sm mt-1">
            {leads.length === 0 ? 'Usa el buscador para descubrir empresas en tu zona' : 'Cambia el filtro de estado'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {selected.length > 0 && (
            <div className="text-xs text-purple-400 px-1">{selected.length} seleccionados</div>
          )}
          {filtered.map(lead => (
            <LeadRow
              key={lead.id}
              lead={lead}
              selected={selected.includes(lead.id)}
              onToggleSelect={toggleSelect}
              onRefresh={loadAll}
              onOpenEmail={setEmailLead}
            />
          ))}
        </div>
      )}

      {/* Email modal */}
      {emailLead && (
        <EmailModal
          lead={emailLead}
          onClose={() => setEmailLead(null)}
          onSent={() => { setEmailLead(null); loadAll() }}
          onSaved={(updated) => {
            setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
            setEmailLead(updated)
          }}
        />
      )}
    </div>
  )
}
