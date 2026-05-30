import { useState, useEffect, useCallback } from 'react'
import {
  Users, RefreshCw, TrendingUp, Globe, Car, Brain,
  ShoppingBag, Filter, ExternalLink, Calendar, Mail,
  Phone, Building2, ChevronRight, BarChart2
} from 'lucide-react'
import api from '../api/client'

const FUENTE_CONFIG = {
  'carsimport':   { label: 'Carsimport',   icon: Car,       color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-700/30',   dot: 'bg-blue-400' },
  'psicologia':   { label: 'Psicología',   icon: Brain,     color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-700/30', dot: 'bg-purple-400' },
  'bolsos-clari': { label: 'Bolsos Clari', icon: ShoppingBag, color: 'text-pink-400', bg: 'bg-pink-900/20 border-pink-700/30',   dot: 'bg-pink-400' },
  'bdev-platform':{ label: 'Plataforma',   icon: Globe,     color: 'text-cyan-400',   bg: 'bg-cyan-900/20 border-cyan-700/30',   dot: 'bg-cyan-400' },
  'otro':         { label: 'Otro',         icon: Globe,     color: 'text-gray-400',   bg: 'bg-gray-900/20 border-gray-700/30',   dot: 'bg-gray-400' },
}

const ESTADO_COLOR = {
  'Prospecto':  'text-yellow-400 bg-yellow-900/20 border-yellow-700/30',
  'Contactado': 'text-blue-400 bg-blue-900/20 border-blue-700/30',
  'Propuesta':  'text-purple-400 bg-purple-900/20 border-purple-700/30',
  'Activo':     'text-green-400 bg-green-900/20 border-green-700/30',
  'Cerrado':    'text-red-400 bg-red-900/20 border-red-700/30',
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function Leads() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [search, setSearch]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/clients').then(r => r.data)
      setClients(data.clients || [])
    } catch {
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Solo leads de sitios externos
  const external = ['carsimport', 'psicologia', 'bolsos-clari', 'otro']
  const leads    = clients.filter(c => external.includes(c.fuente))
  const filtered = leads.filter(c => {
    if (filter !== 'all' && c.fuente !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return c.nombre?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.empresa?.toLowerCase().includes(q)
    }
    return true
  })

  // Stats por fuente
  const stats = external.reduce((acc, f) => {
    acc[f] = leads.filter(c => c.fuente === f).length
    return acc
  }, {})

  const sources = [
    { id: 'all', label: 'Todos', count: leads.length },
    ...Object.entries(FUENTE_CONFIG)
      .filter(([id]) => external.includes(id) && id !== 'otro')
      .map(([id, cfg]) => ({ id, label: cfg.label, count: stats[id] || 0 })),
    { id: 'otro', label: 'Otro', count: stats['otro'] || 0 },
  ]

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <TrendingUp size={18} className="text-green-400" /> Leads Externos
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Contactos recibidos desde los 3 sitios satélite</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-surface-border text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total leads',     value: leads.length,                        color: 'text-white' },
          { label: 'Carsimport',      value: stats['carsimport'] || 0,            color: 'text-blue-400' },
          { label: 'Psicología',      value: stats['psicologia'] || 0,            color: 'text-purple-400' },
          { label: 'Bolsos Clari',    value: stats['bolsos-clari'] || 0,          color: 'text-pink-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-dark-300 border border-surface-border rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-dark-300 p-1 rounded-xl border border-surface-border w-fit">
          {sources.map(s => (
            <button
              key={s.id}
              onClick={() => setFilter(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === s.id
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {s.label}
              {s.count > 0 && (
                <span className="bg-dark-400 text-gray-400 rounded-full px-1.5 py-0.5 text-[10px]">{s.count}</span>
              )}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email..."
          className="flex-1 bg-dark-300 border border-surface-border rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/40"
        />
      </div>

      {/* Leads list */}
      {loading ? (
        <div className="card flex items-center gap-3 py-8 justify-center">
          <RefreshCw size={16} className="text-green-400 animate-spin" />
          <span className="text-gray-400 text-sm">Cargando leads...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-dark-300 border border-dashed border-surface-border rounded-2xl p-12 text-center">
          <Users size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">
            {leads.length === 0 ? 'Sin leads todavía' : 'No hay leads con ese filtro'}
          </p>
          <p className="text-gray-600 text-sm mt-1">
            {leads.length === 0
              ? 'Cuando alguien envíe un formulario desde carsimport, psicología o bolsos-clari aparecerá aquí'
              : 'Prueba a cambiar el filtro de fuente o el texto de búsqueda'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => {
            const cfg = FUENTE_CONFIG[lead.fuente] || FUENTE_CONFIG['otro']
            const Icon = cfg.icon
            const estadoCls = ESTADO_COLOR[lead.estado] || 'text-gray-400 bg-gray-900/20 border-gray-700/30'

            return (
              <div key={lead.id} className="bg-dark-300 border border-surface-border rounded-xl px-5 py-4 hover:border-green-500/20 transition-all group">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Fuente badge */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium shrink-0 ${cfg.bg} ${cfg.color}`}>
                    <Icon size={11} />
                    {cfg.label}
                  </div>

                  {/* Nombre */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{lead.nombre}</p>
                    {lead.empresa && <p className="text-gray-500 text-xs truncate">{lead.empresa}</p>}
                  </div>

                  {/* Contacto */}
                  <div className="hidden md:flex items-center gap-4 text-xs text-gray-500">
                    {lead.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={11} /> {lead.email}
                      </span>
                    )}
                    {lead.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone size={11} /> {lead.telefono}
                      </span>
                    )}
                  </div>

                  {/* Estado */}
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium shrink-0 ${estadoCls}`}>
                    {lead.estado}
                  </span>

                  {/* Fecha */}
                  <div className="hidden sm:flex items-center gap-1 text-xs text-gray-600 shrink-0">
                    <Calendar size={11} />
                    {fmt(lead.fecha_creacion)}
                  </div>

                  {/* Ir al CRM */}
                  <a
                    href="/clientes"
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-all shrink-0"
                  >
                    CRM <ChevronRight size={12} />
                  </a>
                </div>

                {/* Notas si las hay */}
                {lead.notas && (
                  <p className="mt-2 text-gray-500 text-xs pl-0.5 line-clamp-1">{lead.notas}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Integration info */}
      {leads.length === 0 && (
        <div className="bg-dark-200 border border-surface-border rounded-xl p-5">
          <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <BarChart2 size={14} className="text-green-400" /> Cómo conectar un formulario
          </p>
          <p className="text-gray-400 text-xs mb-3">Los snippets para cada sitio están en <code className="text-cyan-400 bg-dark-300 px-1.5 py-0.5 rounded">infra/integrations/</code>. El endpoint ya está activo:</p>
          <div className="bg-dark-300 rounded-lg p-3 font-mono text-xs">
            <span className="text-green-400">POST </span>
            <span className="text-white">https://api.bdev.qzz.io/api/integrations/lead</span>
            <br />
            <span className="text-gray-500">X-Integration-Key: </span>
            <span className="text-yellow-400">{'<INTEGRATION_KEY>'}</span>
            <span className="text-gray-600"> {/* ver infra/integrations/ */}</span>
          </div>
          <div className="flex gap-3 mt-3 flex-wrap">
            {['carsimport', 'psicologia', 'bolsos-clari'].map(s => (
              <span key={s} className="text-xs text-gray-400 bg-dark-300 px-2.5 py-1 rounded-lg border border-surface-border">
                fuente: "{s}"
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
