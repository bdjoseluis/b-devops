import { useState, useEffect, useCallback } from 'react'
import { outreach as outreachApi, settings as settingsApi } from '../api/client'
import {
  Search, TrendingUp, Mail, Send, Check, X, RefreshCw,
  Globe, Phone, MapPin, AlertTriangle, Zap, Star,
  ChevronRight, ChevronDown, Edit2, Trash2, Plus,
  Clock, CheckCircle, MessageSquare, Users, BarChart2,
  ExternalLink, Copy, Loader2, Filter, ArrowRight
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

const SCORE_COLOR = (s) => {
  if (s >= 70) return 'text-red-400'
  if (s >= 40) return 'text-orange-400'
  if (s >= 20) return 'text-yellow-400'
  return 'text-green-400'
}

const SCORE_BG = (s) => {
  if (s >= 70) return 'bg-red-900/20 border-red-700/30'
  if (s >= 40) return 'bg-orange-900/20 border-orange-700/30'
  if (s >= 20) return 'bg-yellow-900/20 border-yellow-700/30'
  return 'bg-green-900/20 border-green-700/30'
}

const CATEGORIES = [
  'empresa', 'restaurante', 'tienda', 'medico', 'abogado',
  'hotel', 'gym', 'farmacia', 'peluqueria', 'academia', 'taller',
]

// ── Pipeline stats bar ────────────────────────────────────────────────────────
function PipelineBar({ stats }) {
  if (!stats) return null
  const total = stats.total || 1
  const steps = [
    { key: 'discovered',      label: 'Descubiertos' },
    { key: 'email_generated', label: 'Email listo' },
    { key: 'sent',            label: 'Enviados' },
    { key: 'replied',         label: 'Respondidos' },
    { key: 'converted',       label: 'Convertidos' },
  ]
  return (
    <div className="bg-dark-300 border border-surface-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-white font-semibold text-sm flex items-center gap-2">
          <BarChart2 size={15} className="text-purple-400" /> Pipeline de Outreach
        </span>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Emails hoy: <span className="text-yellow-400 font-bold">{stats.sent_today}</span>/{stats.daily_limit}</span>
          <span>Con email: <span className="text-green-400 font-bold">{stats.has_email}</span></span>
          <span>Alta oportunidad: <span className="text-orange-400 font-bold">{stats.high_opportunity}</span></span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {steps.map((s, i) => {
          const count = stats.by_status?.[s.key] || 0
          const pct   = Math.round((count / total) * 100)
          const cfg   = STATUS[s.key]
          return (
            <div key={s.key} className="flex-1 text-center">
              <div className={`rounded-lg py-2 px-1 border text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                {count}
              </div>
              <div className="text-gray-600 text-[10px] mt-1 truncate">{s.label}</div>
              {i < steps.length - 1 && (
                <div className="absolute" style={{ display: 'none' }} />
              )}
            </div>
          )
        })}
      </div>
      {/* Daily limit progress */}
      <div className="mt-4">
        <div className="flex justify-between text-[11px] text-gray-500 mb-1">
          <span>Límite diario de emails</span>
          <span>{stats.sent_today}/{stats.daily_limit}</span>
        </div>
        <div className="w-full h-1.5 bg-dark-400 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, (stats.sent_today / stats.daily_limit) * 100)}%`,
              background: stats.sent_today >= stats.daily_limit ? '#ef4444' : '#a855f7',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Search form ───────────────────────────────────────────────────────────────
function SearchForm({ onResults, onSaving }) {
  const [location,   setLocation]   = useState('')
  const [category,   setCategory]   = useState('empresa')
  const [radius,     setRadius]     = useState(10)
  const [limit,      setLimit]      = useState(20)
  const [minScore,   setMinScore]   = useState(25)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [lastResult, setLastResult] = useState(null)

  const run = async () => {
    if (!location.trim()) return
    setLoading(true)
    setError('')
    setLastResult(null)
    onSaving(true)
    try {
      const res = await outreachApi.search({
        location: location.trim(),
        category,
        radius_km: radius,
        limit,
        min_score: minScore,
      })
      setLastResult(res)
      onResults(res)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Error en la búsqueda')
    } finally {
      setLoading(false)
      onSaving(false)
    }
  }

  return (
    <div className="bg-dark-300 border border-surface-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Search size={15} className="text-green-400" />
        <span className="text-white font-semibold text-sm">Buscar empresas por zona</span>
        <span className="text-gray-600 text-xs ml-1">— usa Google Places (si tienes key) o OpenStreetMap</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-2">
          <label className="text-gray-500 text-xs mb-1 block">Zona / Ciudad</label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Alicante, Murcia, Madrid..."
            className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500/40"
          />
        </div>
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Categoría</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Radio (km)</label>
          <input
            type="number" min={1} max={50}
            value={radius}
            onChange={e => setRadius(Number(e.target.value))}
            className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Máx. resultados</label>
          <input
            type="number" min={5} max={50}
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Score mínimo para guardar</label>
          <input
            type="number" min={0} max={100}
            value={minScore}
            onChange={e => setMinScore(Number(e.target.value))}
            className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
          />
        </div>
        <div className="lg:col-span-2 flex items-end">
          <button
            onClick={run}
            disabled={!location.trim() || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Buscando y analizando...</>
              : <><Search size={14} /> Buscar empresas</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/10 border border-red-700/30 rounded-lg px-3 py-2">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {lastResult && !loading && (
        <div className="flex items-center gap-3 text-sm text-gray-400 bg-dark-400 rounded-lg px-4 py-2">
          <CheckCircle size={13} className="text-green-400" />
          <span>
            <span className="text-white font-semibold">{lastResult.total_found}</span> empresas encontradas ·
            <span className="text-green-400 font-semibold ml-1">{lastResult.saved}</span> guardadas con score ≥ {minScore} ·
            <span className="text-gray-500 ml-1">{lastResult.skipped_low_score} descartadas</span>
          </span>
        </div>
      )}
    </div>
  )
}

// ── Email preview/editor modal ────────────────────────────────────────────────
function EmailModal({ lead, onClose, onSent, onSaved }) {
  const [subject,  setSubject]  = useState(lead.generated_subject || '')
  const [body,     setBody]     = useState(lead.generated_email || '')
  const [toEmail,  setToEmail]  = useState(lead.email || '')
  const [generating, setGenerating] = useState(false)
  const [sending,    setSending]    = useState(false)
  const [error,      setError]      = useState('')
  const [copied,     setCopied]     = useState(false)

  const needsGeneration = !body

  const generate = async () => {
    setGenerating(true)
    setError('')
    try {
      const res = await outreachApi.generateEmail(lead.id)
      setSubject(res.generated_subject || res.subject || '')
      setBody(res.generated_email || res.body || '')
      onSaved(res)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Error generando email')
    } finally {
      setGenerating(false)
    }
  }

  const saveEdits = async () => {
    try {
      const res = await outreachApi.update(lead.id, {
        generated_subject: subject,
        generated_email: body,
        email: toEmail,
      })
      onSaved(res)
    } catch {}
  }

  const send = async () => {
    if (!toEmail || !toEmail.includes('@')) {
      return setError('Email de destino inválido')
    }
    setSending(true)
    setError('')
    try {
      await saveEdits()
      const res = await outreachApi.send(lead.id, toEmail)
      onSent(res)
      onClose()
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Error enviando')
    } finally {
      setSending(false)
    }
  }

  const copyBody = () => {
    navigator.clipboard.writeText(`Asunto: ${subject}\n\n${body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-300 border border-surface-border rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border shrink-0">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2">
              <Mail size={15} className="text-blue-400" /> Email para {lead.name}
            </h3>
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-0.5">
                <ExternalLink size={10} /> {lead.website}
              </a>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Web issues summary */}
          {lead.web_issues?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {lead.web_issues.map(issue => (
                <span key={issue} className="text-[11px] px-2 py-0.5 rounded bg-orange-900/20 border border-orange-700/30 text-orange-400">
                  ⚠ {issue}
                </span>
              ))}
            </div>
          )}
          {!lead.website && (
            <div className="text-[11px] px-2 py-1.5 rounded bg-red-900/20 border border-red-700/30 text-red-400 w-fit">
              🔥 Sin web propia — máxima oportunidad
            </div>
          )}

          {/* Generate button if no email yet */}
          {needsGeneration && (
            <button
              onClick={generate}
              disabled={generating}
              className="w-full py-3 bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {generating
                ? <><Loader2 size={14} className="animate-spin" /> Generando con Gemini...</>
                : <><Zap size={14} /> Generar email personalizado con IA</>}
            </button>
          )}

          {/* Subject */}
          <div>
            <label className="text-gray-500 text-xs mb-1 block">Asunto</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Asunto del email..."
              className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/40"
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-gray-500 text-xs">Cuerpo del email</label>
              {body && (
                <div className="flex items-center gap-2">
                  <button onClick={generate} disabled={generating}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                    <RefreshCw size={10} className={generating ? 'animate-spin' : ''} />
                    Regenerar
                  </button>
                  <button onClick={copyBody}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                    {copied ? <Check size={10} /> : <Copy size={10} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              )}
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={12}
              placeholder="El email generado aparecerá aquí. Puedes editarlo antes de enviar."
              className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-blue-500/40 font-mono leading-relaxed"
            />
          </div>

          {/* To email */}
          <div>
            <label className="text-gray-500 text-xs mb-1 block">Enviar a</label>
            <input
              type="email"
              value={toEmail}
              onChange={e => setToEmail(e.target.value)}
              placeholder="email@empresa.com"
              className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/40"
            />
            {!lead.email && (
              <p className="text-yellow-400 text-xs mt-1">⚠ No se detectó email automáticamente. Introdúcelo manualmente.</p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/10 border border-red-700/30 rounded-lg px-3 py-2">
              <AlertTriangle size={13} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-border flex gap-2 shrink-0">
          <button onClick={() => { saveEdits(); onClose() }}
            className="flex-1 px-4 py-2 border border-surface-border text-gray-400 hover:text-white rounded-lg text-sm transition-colors">
            Guardar borrador
          </button>
          <button
            onClick={send}
            disabled={sending || !body || !toEmail}
            className="flex-1 px-4 py-2 bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {sending ? <><Loader2 size={13} className="animate-spin" /> Enviando...</> : <><Send size={13} /> Enviar email</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Lead row ──────────────────────────────────────────────────────────────────
function LeadRow({ lead, onRefresh, onOpenEmail }) {
  const [loading, setLoading] = useState(false)
  const cfg = STATUS[lead.status] || STATUS.discovered

  const issues = Array.isArray(lead.web_issues)
    ? lead.web_issues
    : (typeof lead.web_issues === 'string' ? JSON.parse(lead.web_issues || '[]') : [])

  const changeStatus = async (status) => {
    setLoading(true)
    try {
      await outreachApi.updateStatus(lead.id, status)
      onRefresh()
    } finally { setLoading(false) }
  }

  const remove = async () => {
    if (!window.confirm(`¿Eliminar ${lead.name} del outreach?`)) return
    await outreachApi.remove(lead.id)
    onRefresh()
  }

  return (
    <div className="bg-dark-300 border border-surface-border rounded-xl px-5 py-4 hover:border-green-500/20 transition-all group">
      <div className="flex items-start gap-4 flex-wrap">

        {/* Score badge */}
        <div className={`text-center rounded-lg px-3 py-1.5 border shrink-0 min-w-[52px] ${SCORE_BG(lead.opportunity_score)}`}>
          <div className={`text-lg font-black leading-none ${SCORE_COLOR(lead.opportunity_score)}`}>{lead.opportunity_score}</div>
          <div className="text-[9px] text-gray-500 mt-0.5">score</div>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{lead.name}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color} shrink-0`}>{cfg.label}</span>
            {!lead.website && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/20 border border-red-700/30 text-red-400">SIN WEB</span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-gray-500">
            {lead.address && <span className="flex items-center gap-1"><MapPin size={10} />{lead.address}</span>}
            {lead.phone   && <span className="flex items-center gap-1"><Phone size={10} />{lead.phone}</span>}
            {lead.email   && <span className="flex items-center gap-1 text-blue-400"><Mail size={10} />{lead.email}</span>}
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
                <Globe size={10} /> {lead.website.replace(/^https?:\/\//, '').split('/')[0]}
                <ExternalLink size={9} />
              </a>
            )}
          </div>

          {issues.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {issues.map(i => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-900/20 border border-orange-700/30 text-orange-400">{i}</span>
              ))}
            </div>
          )}

          {lead.notes && (
            <p className="text-gray-500 text-xs mt-1.5 italic line-clamp-1">{lead.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {lead.status !== 'sent' && lead.status !== 'discarded' && (
            <button
              onClick={() => onOpenEmail(lead)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-medium transition-colors"
            >
              <Mail size={11} />
              {lead.generated_email ? 'Ver email' : 'Generar'}
            </button>
          )}

          {lead.status === 'sent' && (
            <>
              <button onClick={() => changeStatus('replied')}
                className="flex items-center gap-1 px-2 py-1.5 bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 rounded-lg text-xs transition-colors">
                <MessageSquare size={11} /> Respondió
              </button>
              <button onClick={() => changeStatus('converted')}
                className="flex items-center gap-1 px-2 py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 rounded-lg text-xs transition-colors">
                <Star size={11} /> Convertir
              </button>
            </>
          )}

          {(lead.status === 'replied') && (
            <button onClick={() => changeStatus('converted')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 rounded-lg text-xs font-medium transition-colors">
              <Star size={11} /> Convertir a cliente
            </button>
          )}

          {lead.status !== 'discarded' && lead.status !== 'converted' && (
            <button onClick={() => changeStatus('discarded')}
              className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
              <X size={13} />
            </button>
          )}

          <button onClick={remove}
            className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Outreach() {
  const [leads,      setLeads]      = useState([])
  const [stats,      setStats]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [searching,  setSearching]  = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search,     setSearch]     = useState('')
  const [emailLead,  setEmailLead]  = useState(null)
  const [smtpOk,     setSmtpOk]    = useState(null)

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      const [leadsRes, statsRes] = await Promise.all([
        outreachApi.list({ limit: 200 }),
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
    loadLeads()
    // Check SMTP status
    settingsApi.get().then(cfg => {
      setSmtpOk(cfg?.smtp?.enabled === true)
    }).catch(() => {})
  }, [loadLeads])

  const filtered = leads.filter(l => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return l.name?.toLowerCase().includes(q) ||
             l.email?.toLowerCase().includes(q) ||
             l.address?.toLowerCase().includes(q)
    }
    return true
  })

  const statusCounts = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})

  const FILTER_TABS = [
    { id: 'all',            label: 'Todos',      count: leads.length },
    { id: 'discovered',     label: 'Nuevos',     count: statusCounts.discovered || 0 },
    { id: 'email_generated',label: 'Email listo',count: statusCounts.email_generated || 0 },
    { id: 'sent',           label: 'Enviados',   count: statusCounts.sent || 0 },
    { id: 'replied',        label: 'Respondidos',count: statusCounts.replied || 0 },
    { id: 'converted',      label: 'Convertidos',count: statusCounts.converted || 0 },
    { id: 'discarded',      label: 'Descartados',count: statusCounts.discarded || 0 },
  ]

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <TrendingUp size={18} className="text-green-400" /> Outreach Engine
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Descubre empresas → analiza su presencia digital → genera emails personalizados con IA → convierte clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {smtpOk === false && (
            <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700/30 px-3 py-1.5 rounded-lg">
              <AlertTriangle size={12} /> SMTP no activo — configura en Ajustes para enviar emails
            </div>
          )}
          <button onClick={loadLeads} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-surface-border text-gray-400 hover:text-white rounded-lg transition-colors">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {/* Pipeline stats */}
      <PipelineBar stats={stats} />

      {/* Search form */}
      <SearchForm onResults={() => loadLeads()} onSaving={setSearching} />

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-1 bg-dark-300 p-1 rounded-xl border border-surface-border overflow-x-auto">
          {FILTER_TABS.map(t => (
            <button key={t.id} onClick={() => setFilterStatus(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filterStatus === t.id
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className="bg-dark-400 text-gray-400 rounded-full px-1.5 py-0.5 text-[10px]">{t.count}</span>
              )}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar empresa, email..."
          className="flex-1 bg-dark-300 border border-surface-border rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/40"
        />
      </div>

      {/* Leads list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
          <Loader2 size={16} className="animate-spin" /> Cargando leads...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-dark-300 border border-dashed border-surface-border rounded-2xl p-12 text-center">
          <TrendingUp size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">
            {leads.length === 0 ? 'Sin leads todavía' : 'No hay leads con ese filtro'}
          </p>
          <p className="text-gray-600 text-sm mt-1">
            {leads.length === 0
              ? 'Usa el formulario de búsqueda para descubrir empresas en tu zona'
              : 'Prueba a cambiar el filtro de estado'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => (
            <LeadRow
              key={lead.id}
              lead={lead}
              onRefresh={loadLeads}
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
          onSent={() => { setEmailLead(null); loadLeads() }}
          onSaved={(updated) => {
            setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
            setEmailLead(updated)
          }}
        />
      )}
    </div>
  )
}
