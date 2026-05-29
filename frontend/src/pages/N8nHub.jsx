import { useState, useEffect, useCallback } from 'react'
import {
  GitBranch, Play, Pause, RefreshCw, ExternalLink, Zap,
  CheckCircle, XCircle, AlertTriangle, Loader2, Clock,
  Settings, Activity, Globe, Database, Mail, Shield, Link
} from 'lucide-react'

const N8N_BASE = 'https://crm.bdev.qzz.io'

// ─── Preset workflow trigger templates ────────────────────────────────────────
const PRESET_WORKFLOWS = [
  {
    id: 'osint-domain',
    name: 'OSINT Domain Scan',
    desc: 'Escaneado automático de dominio con múltiples herramientas',
    icon: Globe,
    color: 'text-blue-400',
    bg: 'bg-blue-900/20',
    border: 'border-blue-700/30',
    webhook: '/webhook/osint-domain',
    params: [{ key: 'domain', label: 'Dominio', placeholder: 'example.com' }],
  },
  {
    id: 'breach-alert',
    name: 'Breach Monitor',
    desc: 'Monitorización de brechas para email o dominio',
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-900/20',
    border: 'border-red-700/30',
    webhook: '/webhook/breach-monitor',
    params: [{ key: 'target', label: 'Email / Dominio', placeholder: 'user@example.com' }],
  },
  {
    id: 'uptime-check',
    name: 'Uptime Check',
    desc: 'Verificación de disponibilidad y SSL',
    icon: Activity,
    color: 'text-green-400',
    bg: 'bg-green-900/20',
    border: 'border-green-700/30',
    webhook: '/webhook/uptime-check',
    params: [{ key: 'url', label: 'URL', placeholder: 'https://example.com' }],
  },
  {
    id: 'report-generate',
    name: 'Report Generator',
    desc: 'Genera y envía un informe automático por email',
    icon: Mail,
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-700/30',
    webhook: '/webhook/generate-report',
    params: [
      { key: 'target', label: 'Objetivo', placeholder: 'example.com' },
      { key: 'email', label: 'Email destino', placeholder: 'client@email.com' },
    ],
  },
]

// ─── Status helpers ────────────────────────────────────────────────────────────
const EXEC_STATUS_CLS = {
  success: 'text-green-400 bg-green-900/20 border-green-700/30',
  error:   'text-red-400 bg-red-900/20 border-red-700/30',
  running: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30',
  waiting: 'text-blue-400 bg-blue-900/20 border-blue-700/30',
  unknown: 'text-gray-400 bg-dark-300 border-surface-border',
}

// ─── Workflow trigger card ─────────────────────────────────────────────────────
function TriggerCard({ workflow }) {
  const [params, setParams]   = useState({})
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)

  const trigger = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`${N8N_BASE}${workflow.webhook}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = await res.json().catch(() => ({ status: res.status }))
      setResult({ ok: res.ok, data, status: res.status })
    } catch (e) {
      setResult({ ok: false, error: e.message })
    }
    setLoading(false)
  }

  const Icon = workflow.icon

  return (
    <div className={`rounded-xl border p-4 ${workflow.bg} ${workflow.border}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-dark-300/50 flex items-center justify-center shrink-0">
          <Icon size={16} className={workflow.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${workflow.color}`}>{workflow.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">{workflow.desc}</div>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        {workflow.params.map(p => (
          <input
            key={p.key}
            value={params[p.key] || ''}
            onChange={e => setParams(prev => ({ ...prev, [p.key]: e.target.value }))}
            placeholder={p.placeholder}
            className="w-full bg-dark-300/60 border border-surface-border/60 rounded-lg px-3 py-2 text-white text-xs font-mono placeholder-gray-600 focus:outline-none focus:border-crimson/40"
          />
        ))}
      </div>
      <button
        onClick={trigger}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${workflow.bg} border ${workflow.border} ${workflow.color} hover:opacity-80`}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
        {loading ? 'Ejecutando...' : 'Trigger'}
      </button>
      {result && (
        <div className={`mt-3 p-2 rounded-lg text-xs font-mono border ${result.ok ? 'bg-green-900/20 border-green-700/20 text-green-300' : 'bg-red-900/20 border-red-700/20 text-red-300'}`}>
          {result.ok ? '✓ Webhook enviado' : `✗ Error: ${result.error || result.status}`}
          {result.data && <div className="text-gray-500 mt-1 truncate">{JSON.stringify(result.data).slice(0, 100)}</div>}
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function N8nHub() {
  const [tab, setTab]       = useState('workflows')
  const [n8nOk, setN8nOk]   = useState(null)
  const [checking, setChecking] = useState(true)

  const checkN8n = useCallback(async () => {
    setChecking(true)
    try {
      const r = await fetch(`${N8N_BASE}/healthz`, { signal: AbortSignal.timeout(5000) })
      setN8nOk(r.ok)
    } catch {
      setN8nOk(false)
    }
    setChecking(false)
  }, [])

  useEffect(() => { checkN8n() }, [checkN8n])

  const TABS = [
    { id: 'workflows', label: 'Webhooks', icon: Zap },
    { id: 'info',      label: 'Integración', icon: Link },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-900/30 border border-orange-700/30 rounded-xl flex items-center justify-center">
            <GitBranch size={20} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              n8n Hub
              {checking ? (
                <Loader2 size={14} className="text-gray-500 animate-spin" />
              ) : n8nOk ? (
                <span className="flex items-center gap-1 text-xs text-green-400 font-normal">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-red-400 font-normal">
                  <span className="w-2 h-2 bg-red-400 rounded-full" /> Offline
                </span>
              )}
            </h1>
            <p className="text-gray-500 text-sm">Automatización · Webhooks · Workflows</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={checkN8n}
            className="p-2 bg-dark-300 border border-surface-border rounded-lg text-gray-400 hover:text-white transition-all"
          >
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
          </button>
          <a
            href={N8N_BASE}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-orange-900/30 border border-orange-700/30 text-orange-300 rounded-lg text-sm font-medium hover:bg-orange-900/50 flex items-center gap-2 transition-all"
          >
            <ExternalLink size={14} /> Abrir n8n
          </a>
        </div>
      </div>

      {/* Status banner if offline */}
      {!checking && !n8nOk && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4 flex items-center gap-3">
          <XCircle size={18} className="text-red-400 shrink-0" />
          <div>
            <div className="text-red-300 font-semibold text-sm">n8n no disponible</div>
            <div className="text-red-400/70 text-xs mt-0.5">Comprueba que el contenedor aura-n8n esté corriendo en el puerto 5678. Los triggers de webhook no funcionarán.</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-300 p-1 rounded-xl w-fit border border-surface-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-surface text-white shadow' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* WEBHOOKS TAB */}
      {tab === 'workflows' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400">Webhook Triggers predefinidos</h2>
            <span className="text-xs text-gray-600">Estos webhooks deben estar configurados en tu instancia n8n</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRESET_WORKFLOWS.map(w => <TriggerCard key={w.id} workflow={w} />)}
          </div>

          {/* Custom webhook */}
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">Webhook personalizado</h2>
            <CustomWebhook />
          </div>
        </div>
      )}

      {/* INFO TAB */}
      {tab === 'info' && (
        <div className="space-y-4">
          <div className="bg-dark-200 border border-surface-border rounded-xl p-5 space-y-4">
            <h2 className="text-white font-semibold">Integración B-DEVOPS ↔ n8n</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              n8n esta disponible en <code className="bg-dark-300 text-orange-300 px-1.5 py-0.5 rounded text-xs">crm.bdev.qzz.io</code> via Cloudflare Tunnel.
              Crea workflows en n8n que se activen via HTTP Request y usaLos para automatizar reportes, alertas, y analisis.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Acceso publico', value: 'crm.bdev.qzz.io', icon: Shield, note: 'Via Cloudflare Tunnel' },
                { title: 'API URL',    value: `${N8N_BASE}/api/v1`, icon: Link, note: 'REST API endpoint' },
                { title: 'Webhooks',  value: `${N8N_BASE}/webhook/`, icon: Zap, note: 'Base webhook URL' },
                { title: 'Container', value: 'bdev-n8n:5678', icon: Database, note: 'Docker container name' },
              ].map(item => (
                <div key={item.title} className="bg-dark-300 rounded-xl p-4 flex items-center gap-3">
                  <item.icon size={16} className="text-orange-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">{item.title}</div>
                    <div className="text-white text-sm font-mono truncate">{item.value}</div>
                    <div className="text-gray-600 text-[10px]">{item.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow templates */}
          <div className="bg-dark-200 border border-surface-border rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Plantillas de workflows recomendadas</h2>
            <div className="space-y-3">
              {[
                { name: 'OSINT Auto-Report', desc: 'Trigger via webhook → run AURA OSINT → generate PDF → send email', icon: '🔍' },
                { name: 'Breach Alert Bot', desc: 'Schedule daily → check DeHashed/LeakRadar → Telegram/Slack notification', icon: '🚨' },
                { name: 'Uptime Monitor Alert', desc: 'Schedule every 5min → ping services → alert on down', icon: '📡' },
                { name: 'Client Report Pipeline', desc: 'Webhook → run audit → format report → save to Drive', icon: '📋' },
                { name: 'Phishing Hunter', desc: 'New domain webhook → URLScan check → AI classify → alert', icon: '🎣' },
              ].map((wf, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-dark-300 rounded-xl">
                  <span className="text-xl shrink-0">{wf.icon}</span>
                  <div>
                    <div className="text-white text-sm font-semibold">{wf.name}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{wf.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Custom webhook panel ──────────────────────────────────────────────────────
function CustomWebhook() {
  const [url, setUrl]       = useState('')
  const [body, setBody]     = useState('{\n  "target": "example.com"\n}')
  const [method, setMethod] = useState('POST')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const fire = async () => {
    if (!url.trim()) return
    setLoading(true)
    setResult(null)
    try {
      let parsedBody
      try { parsedBody = JSON.parse(body) } catch { parsedBody = body }
      const res = await fetch(url.startsWith('http') ? url : `${N8N_BASE}${url}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'GET' ? JSON.stringify(parsedBody) : undefined,
        signal: AbortSignal.timeout(15000),
      })
      const data = await res.json().catch(() => res.statusText)
      setResult({ ok: res.ok, status: res.status, data })
    } catch (e) {
      setResult({ ok: false, error: e.message })
    }
    setLoading(false)
  }

  return (
    <div className="bg-dark-200 border border-surface-border rounded-xl p-4 space-y-3">
      <div className="flex gap-2">
        <select
          value={method}
          onChange={e => setMethod(e.target.value)}
          className="bg-dark-300 border border-surface-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none w-24"
        >
          <option>POST</option>
          <option>GET</option>
        </select>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="/webhook/mi-workflow  ó  https://..."
          className="flex-1 bg-dark-300 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-orange-500/40"
        />
        <button
          onClick={fire}
          disabled={!url.trim() || loading}
          className="px-5 py-2.5 bg-orange-900/40 border border-orange-700/30 text-orange-300 rounded-xl text-sm font-semibold hover:bg-orange-900/60 disabled:opacity-40 flex items-center gap-2 transition-all"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          Fire
        </button>
      </div>
      {method === 'POST' && (
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={4}
          placeholder='{"key": "value"}'
          className="w-full bg-dark-300 border border-surface-border rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-gray-600 focus:outline-none resize-none"
        />
      )}
      {result && (
        <div className={`p-3 rounded-xl text-xs font-mono border ${result.ok ? 'bg-green-900/20 border-green-700/30 text-green-300' : 'bg-red-900/20 border-red-700/30 text-red-400'}`}>
          <div>HTTP {result.status} {result.ok ? '✓' : '✗'} {result.error || ''}</div>
          {result.data && <pre className="mt-2 text-gray-400 overflow-auto max-h-32">{JSON.stringify(result.data, null, 2).slice(0, 500)}</pre>}
        </div>
      )}
    </div>
  )
}
