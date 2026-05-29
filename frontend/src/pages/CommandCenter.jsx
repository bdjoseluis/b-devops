import { useState, useEffect } from 'react'
import { scan } from '../api/client'
import Spinner from '../components/Spinner'
import {
  Zap, Terminal, Server, Globe, Lock, Shield, Network,
  Play, CheckCircle, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react'

const CATEGORY_ICONS = {
  scanning: Network,
  web: Globe,
  ssl: Lock,
  osint: Shield,
  network: Server,
  exploit: Zap,
}

const CATEGORY_COLORS = {
  scanning: 'text-blue-400 bg-blue-900/20 border-blue-700/30',
  web: 'text-green-400 bg-green-900/20 border-green-700/30',
  ssl: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30',
  osint: 'text-purple-400 bg-purple-900/20 border-purple-700/30',
  network: 'text-orange-400 bg-orange-900/20 border-orange-700/30',
  exploit: 'text-red-400 bg-red-900/20 border-red-700/30',
}

export default function CommandCenter() {
  const [target, setTarget] = useState('')
  const [tools, setTools] = useState([])
  const [profiles, setProfiles] = useState([])
  const [kaliConnected, setKaliConnected] = useState(false)
  const [running, setRunning] = useState(null)
  const [results, setResults] = useState({})
  const [nmap, setNmap] = useState({ profile: 'quick', useKali: false, custom: '' })

  useEffect(() => {
    scan.kaliTools().then(d => {
      setTools(d.tools || [])
      setKaliConnected(d.connected || false)
    }).catch(() => {})
    scan.profiles().then(d => setProfiles(d.profiles || [])).catch(() => {})
  }, [])

  const runNmap = async () => {
    if (!target.trim()) return alert('Introduce un objetivo')
    setRunning('nmap')
    try {
      const result = await scan.nmap(target.trim(), nmap.profile, nmap.custom, nmap.useKali && kaliConnected)
      setResults(r => ({ ...r, nmap: result }))
    } catch (e) {
      setResults(r => ({ ...r, nmap: { error: e.message } }))
    } finally {
      setRunning(null)
    }
  }

  const runKaliTool = async (tool) => {
    if (!target.trim()) return alert('Introduce un objetivo')
    setRunning(tool)
    try {
      const result = await scan.kali(tool, target.trim())
      setResults(r => ({ ...r, [tool]: result }))
    } catch (e) {
      setResults(r => ({ ...r, [tool]: { error: e.message } }))
    } finally {
      setRunning(null)
    }
  }

  const byCategory = tools.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {})

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Target input */}
      <div className="card mb-6 border-orange-700/30">
        <p className="section-title text-orange-400">Command Center</p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Server size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="input-dark pl-10"
              placeholder="192.168.1.1 · dominio.com · 10.0.0.0/24"
              value={target}
              onChange={e => setTarget(e.target.value)}
            />
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
            kaliConnected
              ? 'bg-green-900/20 border-green-700/30 text-green-400'
              : 'bg-gray-800 border-gray-700 text-gray-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${kaliConnected ? 'bg-green-400 pulse-dot' : 'bg-gray-600'}`} />
            Kali {kaliConnected ? 'Conectado' : 'Desconectado'}
          </div>
        </div>
      </div>

      {/* Nmap panel */}
      <div className="card mb-6 border-blue-700/30">
        <div className="flex items-center gap-2 mb-4">
          <Network size={16} className="text-blue-400" />
          <span className="text-white font-semibold">Nmap Scanner</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {profiles.map(p => (
            <button
              key={p.id}
              onClick={() => setNmap(n => ({ ...n, profile: p.id }))}
              className={`p-3 rounded-lg border text-left transition-all ${
                nmap.profile === p.id
                  ? 'border-blue-500/60 bg-blue-900/20 text-blue-300'
                  : 'border-surface-border bg-surface-light text-gray-400 hover:border-gray-500'
              }`}
            >
              <div className="font-semibold text-xs mb-0.5">{p.name}</div>
              <div className="text-xs text-gray-500">{p.desc}</div>
              <div className="text-xs mt-1 opacity-70">{p.time}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-3 items-center">
          <input
            className="input-dark text-sm flex-1"
            placeholder="Flags personalizados (ej: -p 80,443 -sV)"
            value={nmap.custom}
            onChange={e => setNmap(n => ({ ...n, custom: e.target.value }))}
          />
          {kaliConnected && (
            <label className="flex items-center gap-2 text-sm text-gray-400 whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={nmap.useKali}
                onChange={e => setNmap(n => ({ ...n, useKali: e.target.checked }))}
                className="accent-crimson"
              />
              Via Kali
            </label>
          )}
          <button
            className="btn-primary"
            onClick={runNmap}
            disabled={running === 'nmap'}
          >
            {running === 'nmap' ? <Spinner size={16} /> : <Play size={16} />}
            {running === 'nmap' ? 'Escaneando...' : 'Iniciar Scan'}
          </button>
        </div>

        {results.nmap && (
          <NmapResult data={results.nmap} />
        )}
      </div>

      {/* Kali tools grid */}
      {kaliConnected && (
        <div>
          <p className="section-title mb-4">Herramientas Kali Linux</p>
          {Object.entries(byCategory).map(([cat, catTools]) => {
            const Icon = CATEGORY_ICONS[cat] || Zap
            const colors = CATEGORY_COLORS[cat] || 'text-gray-400 bg-gray-800/40 border-gray-700/30'
            return (
              <div key={cat} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={14} className={colors.split(' ')[0]} />
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">{cat}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {catTools.map(tool => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      colors={colors}
                      isRunning={running === tool.id}
                      result={results[tool.id]}
                      onRun={() => runKaliTool(tool.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!kaliConnected && (
        <div className="card border-yellow-700/30 bg-yellow-900/10 text-center py-10">
          <AlertTriangle size={32} className="text-yellow-400 mx-auto mb-3" />
          <p className="text-yellow-300 font-semibold mb-2">Kali Linux VM no conectada</p>
          <p className="text-gray-400 text-sm">
            Configura la conexión SSH a tu VM Kali en Configuración {'>'} Kali Linux VM
          </p>
        </div>
      )}
    </div>
  )
}

function ToolCard({ tool, colors, isRunning, result, onRun }) {
  const [showOutput, setShowOutput] = useState(false)

  return (
    <div className={`card border ${colors.split(' ').slice(1).join(' ')}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-white font-semibold text-sm">{tool.name}</div>
          <div className="text-gray-500 text-xs mt-0.5">{tool.desc}</div>
        </div>
        {result && (
          <CheckCircle size={16} className="text-green-400 shrink-0" />
        )}
      </div>
      <div className="flex gap-2">
        <button
          className="btn-primary text-xs py-1.5"
          onClick={onRun}
          disabled={isRunning}
        >
          {isRunning ? <Spinner size={12} /> : <Play size={12} />}
          {isRunning ? 'Ejecutando...' : 'Ejecutar'}
        </button>
        {result && (
          <button
            className="btn-ghost text-xs py-1.5"
            onClick={() => setShowOutput(!showOutput)}
          >
            {showOutput ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Output
          </button>
        )}
      </div>
      {result && showOutput && (
        <div className="mt-3 p-3 bg-black/40 rounded-lg max-h-64 overflow-y-auto">
          {result.error ? (
            <p className="text-red-400 text-xs font-mono">{result.error}</p>
          ) : (
            <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
              {result.output || 'Sin output'}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

function NmapResult({ data }) {
  const [open, setOpen] = useState(true)
  if (data.error) {
    return (
      <div className="mt-4 p-3 bg-red-900/20 rounded-lg border border-red-700/30">
        <p className="text-red-400 text-sm font-mono">{data.error}</p>
      </div>
    )
  }
  return (
    <div className="mt-4 p-4 bg-black/30 rounded-lg border border-surface-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle size={14} className="text-green-400" />
          <span className="text-green-400 text-sm font-semibold">
            Scan completado — {data.total_hosts} host(s) · {data.elapsed}s
          </span>
        </div>
        <button className="text-gray-500 hover:text-white" onClick={() => setOpen(!open)}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {open && data.hosts?.map((host, i) => (
        <div key={i} className="mb-4 last:mb-0">
          <div className="flex items-center gap-2 mb-2">
            <code className="text-blue-400 font-mono text-sm">{host.ip}</code>
            {host.os_detection?.[0] && (
              <span className="badge badge-blue">{host.os_detection[0].name}</span>
            )}
          </div>
          <div className="space-y-1">
            {host.ports?.map((p, j) => (
              <div key={j} className="flex gap-3 text-xs items-center">
                <code className="text-green-400 w-16 font-mono">{p.port}/{p.protocol}</code>
                <code className="text-yellow-400 w-16">{p.service}</code>
                <span className="text-gray-400">{p.product} {p.version}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
