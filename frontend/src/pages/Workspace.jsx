import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderOpen, Plus, Trash2, Edit2, X, Check, Search,
  Target, Clock, FileText, Shield, Tag, ChevronRight,
  Download, Bookmark, AlertTriangle, Globe, User, Server,
  Zap, Brain, StickyNote, Activity, Archive, CheckCircle,
  Circle, Play, ExternalLink
} from 'lucide-react'

// ─── Storage helpers ──────────────────────────────────────────────────────────
const SK = 'bdev_workspace_v2'
function load() { try { return JSON.parse(localStorage.getItem(SK)) || [] } catch { return [] } }
function save(cases) { try { localStorage.setItem(SK, JSON.stringify(cases)) } catch {} }

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  active:   { label: 'Activa',    cls: 'bg-green-900/30 text-green-400 border-green-700/30' },
  paused:   { label: 'Pausada',   cls: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/30' },
  closed:   { label: 'Cerrada',   cls: 'bg-gray-800/30 text-gray-500 border-gray-700/30' },
  critical: { label: 'Crítica',   cls: 'bg-red-900/30 text-red-400 border-red-700/30' },
}

const TYPE_ICONS = {
  ip:       Server,
  domain:   Globe,
  email:    FileText,
  username: User,
  org:      Shield,
  url:      ExternalLink,
  other:    Target,
}

const FINDING_TYPES = [
  { id: 'vuln',      label: 'Vulnerabilidad', color: 'text-red-400',    bg: 'bg-red-900/20',    border: 'border-red-700/30' },
  { id: 'exposure',  label: 'Exposición',     color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-700/30' },
  { id: 'intel',     label: 'Inteligencia',   color: 'text-blue-400',   bg: 'bg-blue-900/20',   border: 'border-blue-700/30' },
  { id: 'breach',    label: 'Brecha',         color: 'text-crimson',    bg: 'bg-red-900/20',    border: 'border-red-700/30' },
  { id: 'asset',     label: 'Activo',         color: 'text-green-400',  bg: 'bg-green-900/20',  border: 'border-green-700/30' },
  { id: 'note',      label: 'Nota',           color: 'text-gray-400',   bg: 'bg-dark-300',      border: 'border-surface-border' },
]

function ft(id) { return FINDING_TYPES.find(f => f.id === id) || FINDING_TYPES[5] }

// ─── New case form ─────────────────────────────────────────────────────────────
function NewCaseModal({ onClose, onCreate }) {
  const [name, setName]     = useState('')
  const [target, setTarget] = useState('')
  const [type, setType]     = useState('domain')
  const [desc, setDesc]     = useState('')
  const [tags, setTags]     = useState('')

  const submit = () => {
    if (!name.trim()) return
    const now = Date.now()
    onCreate({
      id:       `case-${now}`,
      name:     name.trim(),
      target:   target.trim(),
      type,
      desc:     desc.trim(),
      tags:     tags.split(',').map(t => t.trim()).filter(Boolean),
      status:   'active',
      createdAt: now,
      updatedAt: now,
      notes:    '',
      findings: [],
      timeline: [{ ts: now, text: 'Investigación creada' }],
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-dark-200 border border-surface-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h2 className="text-white font-bold text-lg">Nueva Investigación</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Nombre *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Auditoría Empresa X, Op. Red Team..."
              className="w-full bg-dark-300 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-crimson/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Objetivo principal</label>
              <input
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder="192.168.1.0, example.com..."
                className="w-full bg-dark-300 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-crimson/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Tipo</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full bg-dark-300 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-crimson/50"
              >
                {Object.keys(TYPE_ICONS).map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Descripción</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Alcance, objetivos, cliente..."
              rows={2}
              className="w-full bg-dark-300 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-crimson/50 resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Tags (separados por coma)</label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="red-team, cliente, urgente..."
              className="w-full bg-dark-300 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-crimson/50"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-surface-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="px-5 py-2 bg-crimson hover:bg-crimson/80 disabled:opacity-40 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
          >
            <Plus size={14} /> Crear
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add finding form ──────────────────────────────────────────────────────────
function AddFindingModal({ onClose, onAdd }) {
  const [type, setType]    = useState('intel')
  const [title, setTitle]  = useState('')
  const [content, setContent] = useState('')
  const [severity, setSev] = useState('medium')

  const submit = () => {
    if (!title.trim()) return
    onAdd({ id: Date.now(), type, title: title.trim(), content: content.trim(), severity, ts: Date.now() })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-dark-200 border border-surface-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h2 className="text-white font-bold text-base">Agregar Finding</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full bg-dark-300 border border-surface-border rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                {FINDING_TYPES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Severidad</label>
              <select value={severity} onChange={e => setSev(e.target.value)}
                className="w-full bg-dark-300 border border-surface-border rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                <option value="critical">Crítica</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Título *</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Describe el hallazgo..."
              className="w-full bg-dark-300 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-crimson/50" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Detalles</label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="Evidencias, URLs, IPs, datos relevantes..."
              rows={4}
              className="w-full bg-dark-300 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-crimson/50 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-surface-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancelar</button>
          <button onClick={submit} disabled={!title.trim()}
            className="px-5 py-2 bg-crimson hover:bg-crimson/80 disabled:opacity-40 text-white rounded-xl text-sm font-semibold flex items-center gap-2">
            <Plus size={14} /> Agregar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Severity badge ────────────────────────────────────────────────────────────
const SEV_CLS = {
  critical: 'bg-red-900/40 text-red-400 border-red-700/40',
  high:     'bg-orange-900/40 text-orange-400 border-orange-700/40',
  medium:   'bg-yellow-900/40 text-yellow-400 border-yellow-700/40',
  low:      'bg-blue-900/40 text-blue-400 border-blue-700/40',
  info:     'bg-gray-800 text-gray-400 border-gray-700/40',
}

// ─── Case detail panel ─────────────────────────────────────────────────────────
function CaseDetail({ caseObj, onUpdate, onClose }) {
  const navigate = useNavigate()
  const [tab, setTab]           = useState('overview')
  const [notes, setNotes]       = useState(caseObj.notes || '')
  const [showFinding, setShowFinding] = useState(false)
  const [editName, setEditName]  = useState(false)
  const [nameInput, setNameInput] = useState(caseObj.name)

  const update = useCallback((patch) => {
    onUpdate({ ...caseObj, ...patch, updatedAt: Date.now() })
  }, [caseObj, onUpdate])

  const saveName = () => {
    if (nameInput.trim()) update({ name: nameInput.trim() })
    setEditName(false)
  }

  const saveNotes = () => {
    update({ notes, timeline: [...(caseObj.timeline || []), { ts: Date.now(), text: 'Notas actualizadas' }] })
  }

  const addFinding = (f) => {
    const findings = [...(caseObj.findings || []), f]
    update({ findings, timeline: [...(caseObj.timeline || []), { ts: Date.now(), text: `Finding agregado: ${f.title}` }] })
  }

  const removeFinding = (id) => {
    update({ findings: (caseObj.findings || []).filter(f => f.id !== id) })
  }

  const TypeIcon = TYPE_ICONS[caseObj.type] || Target

  const TABS = [
    { id: 'overview',  label: 'Overview',  icon: Activity },
    { id: 'findings',  label: `Findings (${(caseObj.findings || []).length})`, icon: AlertTriangle },
    { id: 'notes',     label: 'Notas',     icon: StickyNote },
    { id: 'timeline',  label: 'Timeline',  icon: Clock },
  ]

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl bg-dark-200 border-l border-surface-border h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Case header */}
        <div className="p-5 border-b border-surface-border flex items-start gap-4 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-crimson/20 border border-crimson/30 flex items-center justify-center shrink-0">
            <TypeIcon size={18} className="text-crimson" />
          </div>
          <div className="flex-1 min-w-0">
            {editName ? (
              <div className="flex items-center gap-2">
                <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditName(false) }}
                  className="bg-dark-300 border border-crimson/40 rounded-lg px-3 py-1 text-white text-sm flex-1 focus:outline-none" autoFocus />
                <button onClick={saveName} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
                <button onClick={() => setEditName(false)} className="text-gray-500 hover:text-white"><X size={14} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-lg truncate">{caseObj.name}</h2>
                <button onClick={() => setEditName(true)} className="text-gray-600 hover:text-gray-400 shrink-0"><Edit2 size={13} /></button>
              </div>
            )}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {caseObj.target && (
                <span className="text-xs font-mono text-gray-400 bg-dark-300 px-2 py-0.5 rounded">{caseObj.target}</span>
              )}
              <select
                value={caseObj.status}
                onChange={e => update({ status: e.target.value })}
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS[caseObj.status]?.cls || ''} bg-transparent focus:outline-none`}
              >
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {(caseObj.tags || []).map(tag => (
                <span key={tag} className="text-[10px] bg-dark-300 text-gray-500 px-2 py-0.5 rounded font-mono">{tag}</span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white shrink-0"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-border shrink-0 px-3">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-all ${
                tab === t.id ? 'border-crimson text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 p-5 overflow-y-auto">

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-4">
              {caseObj.desc && (
                <div className="bg-dark-300 rounded-xl p-4 text-sm text-gray-400 leading-relaxed">{caseObj.desc}</div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Findings', value: (caseObj.findings || []).length, icon: AlertTriangle, color: 'text-yellow-400' },
                  { label: 'Críticos', value: (caseObj.findings || []).filter(f => f.severity === 'critical').length, icon: Shield, color: 'text-red-400' },
                  { label: 'Días activa', value: Math.floor((Date.now() - caseObj.createdAt) / 86400000), icon: Clock, color: 'text-blue-400' },
                ].map(stat => (
                  <div key={stat.label} className="bg-dark-300 rounded-xl p-4 text-center border border-surface-border">
                    <stat.icon size={18} className={`${stat.color} mx-auto mb-2`} />
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
              {/* Quick actions */}
              <div className="space-y-2">
                <h3 className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Acciones rápidas</h3>
                <div className="grid grid-cols-2 gap-2">
                  {caseObj.target && (
                    <button
                      onClick={() => { onClose(); navigate(`/pivot?target=${encodeURIComponent(caseObj.target)}`) }}
                      className="flex items-center gap-2 px-3 py-2.5 bg-crimson/10 border border-crimson/30 rounded-xl text-sm text-crimson hover:bg-crimson/20 transition-all"
                    >
                      <Target size={14} /> Intelligence Pivot
                    </button>
                  )}
                  {caseObj.target && (
                    <button
                      onClick={() => { onClose(); navigate(`/audit?target=${encodeURIComponent(caseObj.target)}`) }}
                      className="flex items-center gap-2 px-3 py-2.5 bg-blue-900/20 border border-blue-700/30 rounded-xl text-sm text-blue-400 hover:bg-blue-900/30 transition-all"
                    >
                      <Shield size={14} /> Auto Auditoría
                    </button>
                  )}
                  <button
                    onClick={() => { setTab('findings'); setShowFinding(true) }}
                    className="flex items-center gap-2 px-3 py-2.5 bg-dark-300 border border-surface-border rounded-xl text-sm text-gray-300 hover:bg-surface-light transition-all"
                  >
                    <Plus size={14} /> Agregar Finding
                  </button>
                  <button
                    onClick={() => setTab('notes')}
                    className="flex items-center gap-2 px-3 py-2.5 bg-dark-300 border border-surface-border rounded-xl text-sm text-gray-300 hover:bg-surface-light transition-all"
                  >
                    <StickyNote size={14} /> Editar Notas
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FINDINGS */}
          {tab === 'findings' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{(caseObj.findings || []).length} hallazgos registrados</span>
                <button
                  onClick={() => setShowFinding(true)}
                  className="px-3 py-1.5 bg-crimson/10 border border-crimson/30 text-crimson rounded-lg text-xs font-medium hover:bg-crimson/20 flex items-center gap-1.5"
                >
                  <Plus size={12} /> Nuevo
                </button>
              </div>
              {(caseObj.findings || []).length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  <AlertTriangle size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No hay findings registrados</p>
                  <button onClick={() => setShowFinding(true)} className="mt-3 text-crimson text-sm hover:underline">+ Agregar el primero</button>
                </div>
              ) : (
                [...(caseObj.findings || [])].reverse().map(f => (
                  <div key={f.id} className={`rounded-xl border p-4 ${ft(f.type).bg} ${ft(f.type).border}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${ft(f.type).cls || `${ft(f.type).bg} ${ft(f.type).color} ${ft(f.type).border}`}`}>
                            {ft(f.type).label}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${SEV_CLS[f.severity] || SEV_CLS.info}`}>
                            {f.severity}
                          </span>
                          <span className="text-[10px] text-gray-600 font-mono">{new Date(f.ts).toLocaleDateString('es-ES')}</span>
                        </div>
                        <div className={`text-sm font-semibold mt-1 ${ft(f.type).color}`}>{f.title}</div>
                        {f.content && (
                          <pre className="text-xs text-gray-400 mt-2 whitespace-pre-wrap break-all font-mono bg-black/20 rounded p-2">
                            {f.content.slice(0, 400)}{f.content.length > 400 ? '...' : ''}
                          </pre>
                        )}
                      </div>
                      <button onClick={() => removeFinding(f.id)} className="text-gray-600 hover:text-red-400 shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* NOTES */}
          {tab === 'notes' && (
            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notas de la investigación... IPs encontradas, usuarios, contraseñas, vectores de ataque, observaciones..."
                rows={20}
                className="w-full bg-dark-300 border border-surface-border rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-crimson/50 resize-none leading-relaxed"
              />
              <button
                onClick={saveNotes}
                className="px-5 py-2 bg-crimson hover:bg-crimson/80 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                <Check size={14} /> Guardar notas
              </button>
            </div>
          )}

          {/* TIMELINE */}
          {tab === 'timeline' && (
            <div className="space-y-2">
              {[...(caseObj.timeline || [])].reverse().map((ev, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-crimson/60 rounded-full mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">{ev.text}</p>
                    <p className="text-[10px] text-gray-600 font-mono mt-0.5">
                      {new Date(ev.ts).toLocaleString('es-ES')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add finding modal */}
      {showFinding && <AddFindingModal onClose={() => setShowFinding(false)} onAdd={addFinding} />}
    </div>
  )
}

// ─── Case card ─────────────────────────────────────────────────────────────────
function CaseCard({ caseObj, onSelect, onDelete }) {
  const TypeIcon = TYPE_ICONS[caseObj.type] || Target
  const criticalCount = (caseObj.findings || []).filter(f => f.severity === 'critical').length
  const highCount = (caseObj.findings || []).filter(f => f.severity === 'high').length

  return (
    <div
      onClick={() => onSelect(caseObj)}
      className="bg-dark-200 border border-surface-border rounded-xl p-4 hover:border-crimson/30 transition-all cursor-pointer group relative"
    >
      <button
        onClick={e => { e.stopPropagation(); onDelete(caseObj.id) }}
        className="absolute top-3 right-3 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 size={13} />
      </button>

      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-crimson/15 border border-crimson/20 flex items-center justify-center shrink-0">
          <TypeIcon size={14} className="text-crimson" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm truncate pr-6">{caseObj.name}</div>
          {caseObj.target && (
            <div className="text-gray-500 text-xs font-mono truncate">{caseObj.target}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS[caseObj.status]?.cls || STATUS.active.cls}`}>
          {STATUS[caseObj.status]?.label || 'Activa'}
        </span>
        {(caseObj.tags || []).slice(0, 2).map(tag => (
          <span key={tag} className="text-[10px] bg-dark-300 text-gray-500 px-2 py-0.5 rounded">{tag}</span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-3">
          <span>{(caseObj.findings || []).length} findings</span>
          {criticalCount > 0 && <span className="text-red-400 font-bold">{criticalCount} críticos</span>}
          {highCount > 0 && <span className="text-orange-400">{highCount} altos</span>}
        </div>
        <div className="flex items-center gap-1">
          <Clock size={10} />
          <span>{new Date(caseObj.updatedAt || caseObj.createdAt).toLocaleDateString('es-ES')}</span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-crimson/0 via-crimson/40 to-crimson/0 opacity-0 group-hover:opacity-100 rounded-b-xl transition-all" />
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Workspace() {
  const [cases, setCases]         = useState(load)
  const [showNew, setShowNew]     = useState(false)
  const [selected, setSelected]   = useState(null)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all')

  // Persist on change
  useEffect(() => { save(cases) }, [cases])

  const createCase = (c) => setCases(prev => [c, ...prev])
  const deleteCase = (id) => setCases(prev => prev.filter(c => c.id !== id))
  const updateCase = (updated) => {
    setCases(prev => prev.map(c => c.id === updated.id ? updated : c))
    setSelected(updated)
  }

  const filtered = cases.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.target || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || c.status === filter
    return matchSearch && matchFilter
  })

  const stats = {
    total:    cases.length,
    active:   cases.filter(c => c.status === 'active' || c.status === 'critical').length,
    findings: cases.reduce((sum, c) => sum + (c.findings || []).length, 0),
    critical: cases.reduce((sum, c) => sum + (c.findings || []).filter(f => f.severity === 'critical').length, 0),
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-900/30 border border-indigo-700/30 rounded-xl flex items-center justify-center">
            <FolderOpen size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Workspace</h1>
            <p className="text-gray-500 text-sm">Gestión de investigaciones OSINT y engagements</p>
          </div>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-5 py-2.5 bg-crimson hover:bg-crimson/80 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg"
        >
          <Plus size={16} /> Nueva Investigación
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total',        value: stats.total,    icon: FolderOpen,     color: 'text-blue-400',   bg: 'bg-blue-900/20' },
          { label: 'Activas',      value: stats.active,   icon: Activity,       color: 'text-green-400',  bg: 'bg-green-900/20' },
          { label: 'Findings',     value: stats.findings, icon: AlertTriangle,  color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
          { label: 'Críticos',     value: stats.critical, icon: Shield,         color: 'text-red-400',    bg: 'bg-red-900/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-surface-border rounded-xl p-4 flex items-center gap-4`}>
            <s.icon size={22} className={s.color} />
            <div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar investigaciones..."
            className="w-full bg-dark-200 border border-surface-border rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-crimson/50"
          />
        </div>
        <div className="flex gap-1 bg-dark-300 p-1 rounded-xl border border-surface-border">
          {[['all', 'Todas'], ['active', 'Activas'], ['paused', 'Pausadas'], ['critical', 'Críticas'], ['closed', 'Cerradas']].map(([val, lab]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === val ? 'bg-surface text-white shadow' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {lab}
            </button>
          ))}
        </div>
      </div>

      {/* Case grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-600">
          <FolderOpen size={56} className="mx-auto mb-4 opacity-15" />
          {cases.length === 0 ? (
            <>
              <p className="text-lg font-medium text-gray-500">Sin investigaciones todavía</p>
              <p className="text-sm mt-1">Crea una nueva investigación para empezar a rastrear findings</p>
              <button
                onClick={() => setShowNew(true)}
                className="mt-6 px-5 py-2.5 bg-crimson hover:bg-crimson/80 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2"
              >
                <Plus size={16} /> Crear primera investigación
              </button>
            </>
          ) : (
            <p className="text-sm">No hay investigaciones que coincidan con los filtros</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <CaseCard key={c.id} caseObj={c} onSelect={setSelected} onDelete={deleteCase} />
          ))}
        </div>
      )}

      {/* Modals */}
      {showNew && <NewCaseModal onClose={() => setShowNew(false)} onCreate={createCase} />}
      {selected && <CaseDetail caseObj={selected} onUpdate={updateCase} onClose={() => setSelected(null)} />}
    </div>
  )
}
