import { useState, useEffect } from 'react'
import {
  Users, Plus, Search, Trash2, Edit2, X, Save, Phone, Mail,
  Globe, Building2, Tag, Calendar, ChevronRight, Star, StarOff,
  FileText, ExternalLink, MessageSquare, CheckCircle, Clock,
  TrendingUp, AlertTriangle
} from 'lucide-react'
import { Link } from 'react-router-dom'

const SK = 'aura_clientes'

const ESTADOS = ['Prospecto', 'Contactado', 'Propuesta', 'Activo', 'Pausado', 'Cerrado']
const SECTORES = ['Tecnología', 'Salud', 'Retail', 'Finanzas', 'Educación', 'Legal', 'Consultoría', 'Media', 'Industria', 'Otro']
const SERVICIOS = ['Auditoría Web', 'OSINT', 'Pentest', 'Consultoría SEO', 'Desarrollo Web', 'Ciberseguridad', 'Soporte', 'Formación', 'Otro']

const ESTADO_STYLE = {
  'Prospecto':  'bg-gray-500/20 text-gray-400 border border-gray-600/30',
  'Contactado': 'bg-blue-500/20 text-blue-400 border border-blue-600/30',
  'Propuesta':  'bg-yellow-500/20 text-yellow-400 border border-yellow-600/30',
  'Activo':     'bg-green-500/20 text-green-400 border border-green-600/30',
  'Pausado':    'bg-orange-500/20 text-orange-400 border border-orange-600/30',
  'Cerrado':    'bg-red-500/20 text-red-400 border border-red-600/30',
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

const EMPTY_CLIENTE = {
  nombre: '', empresa: '', email: '', telefono: '', web: '',
  sector: 'Tecnología', estado: 'Prospecto', servicios: [],
  notas: '', valor_estimado: '', estrella: false,
  fecha_creacion: null, ultima_actividad: null,
}

function ClienteModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_CLIENTE, ...initial })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleServicio = (s) => set('servicios', form.servicios.includes(s) ? form.servicios.filter(x => x !== s) : [...form.servicios, s])

  const handleSave = () => {
    if (!form.nombre.trim()) return
    onSave({
      ...form,
      fecha_creacion: form.fecha_creacion || new Date().toISOString(),
      ultima_actividad: new Date().toISOString(),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-300 border border-surface-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Users size={16} className="text-purple-400" />
            {initial?.id ? 'Editar cliente' : 'Nuevo cliente'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Nombre + Empresa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Nombre / Contacto *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                placeholder="Juan García"
                className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Empresa</label>
              <input value={form.empresa} onChange={e => set('empresa', e.target.value)}
                placeholder="Empresa S.L."
                className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
            </div>
          </div>

          {/* Contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block flex items-center gap-1"><Mail size={10} /> Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="contacto@empresa.com"
                className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block flex items-center gap-1"><Phone size={10} /> Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block flex items-center gap-1"><Globe size={10} /> Web</label>
              <input value={form.web} onChange={e => set('web', e.target.value)}
                placeholder="https://empresa.com"
                className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
            </div>
          </div>

          {/* Estado + Sector + Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Estado</label>
              <select value={form.estado} onChange={e => set('estado', e.target.value)}
                className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                {ESTADOS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Sector</label>
              <select value={form.sector} onChange={e => set('sector', e.target.value)}
                className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                {SECTORES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Valor estimado (€)</label>
              <input type="number" value={form.valor_estimado} onChange={e => set('valor_estimado', e.target.value)}
                placeholder="0"
                className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
            </div>
          </div>

          {/* Servicios */}
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Servicios contratados / de interés</label>
            <div className="flex flex-wrap gap-2">
              {SERVICIOS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleServicio(s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    form.servicios.includes(s)
                      ? 'bg-purple-500/30 border-purple-500/60 text-purple-300'
                      : 'bg-dark-400 border-surface-border text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block"><MessageSquare size={10} className="inline mr-1" />Notas</label>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
              rows={3}
              placeholder="Contexto, reuniones, próximos pasos..."
              className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none" />
          </div>

          {/* Estrella */}
          <div className="flex items-center gap-2">
            <button onClick={() => set('estrella', !form.estrella)}
              className={`flex items-center gap-2 text-sm transition-colors ${form.estrella ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}>
              {form.estrella ? <Star size={15} className="fill-yellow-400" /> : <StarOff size={15} />}
              {form.estrella ? 'Cliente prioritario' : 'Marcar como prioritario'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-border flex gap-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-surface-border text-gray-400 hover:text-white text-sm transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!form.nombre.trim()}
            className="flex-1 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 text-sm font-semibold transition-colors disabled:opacity-40">
            <Save size={13} className="inline mr-1" />
            {initial?.id ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Clientes() {
  const [clientes, setClientes] = useState(() => load(SK, []))
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => { save(SK, clientes) }, [clientes])

  const handleSave = (data) => {
    if (data.id) {
      setClientes(prev => prev.map(c => c.id === data.id ? data : c))
      if (selected?.id === data.id) setSelected(data)
    } else {
      const newCliente = { ...data, id: Date.now().toString() }
      setClientes(prev => [newCliente, ...prev])
    }
    setShowModal(false)
    setEditing(null)
  }

  const deleteCliente = (id) => {
    setClientes(prev => prev.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const filtered = clientes
    .filter(c => filterEstado === 'Todos' || c.estado === filterEstado)
    .filter(c => {
      const q = search.toLowerCase()
      return !q || c.nombre?.toLowerCase().includes(q) || c.empresa?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    })
    .sort((a, b) => (b.estrella ? 1 : 0) - (a.estrella ? 1 : 0))

  // Stats
  const activos = clientes.filter(c => c.estado === 'Activo').length
  const prospectos = clientes.filter(c => c.estado === 'Prospecto' || c.estado === 'Contactado').length
  const valorTotal = clientes.filter(c => c.estado === 'Activo').reduce((s, c) => s + (Number(c.valor_estimado) || 0), 0)
  const pipeline = clientes.filter(c => ['Prospecto','Contactado','Propuesta'].includes(c.estado)).reduce((s, c) => s + (Number(c.valor_estimado) || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <Users size={18} className="text-purple-400" /> Clientes CRM
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 font-mono">
            Gestiona clientes, pipeline y relaciones comerciales
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 transition-colors font-semibold text-sm"
        >
          <Plus size={14} /> Nuevo cliente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-dark-300 border border-surface-border rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider">Total</p>
          <p className="text-white text-2xl font-bold mt-1">{clientes.length}</p>
          <p className="text-gray-500 text-xs mt-1">clientes registrados</p>
        </div>
        <div className="bg-dark-300 border border-surface-border rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider">Activos</p>
          <p className="text-green-400 text-2xl font-bold mt-1">{activos}</p>
          <p className="text-gray-500 text-xs mt-1">con contrato activo</p>
        </div>
        <div className="bg-dark-300 border border-surface-border rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider">MRR activo</p>
          <p className="text-purple-400 text-2xl font-bold mt-1">
            {valorTotal > 0 ? `${valorTotal.toLocaleString('es-ES')}€` : '—'}
          </p>
          <p className="text-gray-500 text-xs mt-1">valor total activos</p>
        </div>
        <div className="bg-dark-300 border border-surface-border rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider">Pipeline</p>
          <p className="text-yellow-400 text-2xl font-bold mt-1">
            {pipeline > 0 ? `${pipeline.toLocaleString('es-ES')}€` : `${prospectos}`}
          </p>
          <p className="text-gray-500 text-xs mt-1">{pipeline > 0 ? 'en prospección' : 'prospectos'}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente, empresa..."
            className="w-full bg-dark-300 border border-surface-border rounded-lg pl-8 pr-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/40"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['Todos', ...ESTADOS].map(e => (
            <button
              key={e}
              onClick={() => setFilterEstado(e)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                filterEstado === e
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'border-surface-border text-gray-500 hover:text-gray-300'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div className={`${selected ? 'grid grid-cols-1 lg:grid-cols-5 gap-4' : ''}`}>

        {/* Table */}
        <div className={selected ? 'lg:col-span-3' : ''}>
          {filtered.length === 0 ? (
            <div className="bg-dark-300 border border-dashed border-surface-border rounded-2xl p-12 text-center">
              <Users size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">
                {clientes.length === 0 ? 'No hay clientes aún' : 'Sin resultados'}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                {clientes.length === 0
                  ? 'Empieza añadiendo tu primer cliente o prospecto'
                  : 'Prueba con otros filtros de búsqueda'}
              </p>
              {clientes.length === 0 && (
                <button
                  onClick={() => { setEditing(null); setShowModal(true) }}
                  className="mt-4 px-4 py-2 bg-purple-500/20 border border-purple-500/40 rounded-lg text-purple-300 text-sm hover:bg-purple-500/30 transition-colors"
                >
                  <Plus size={14} className="inline mr-1" /> Añadir primer cliente
                </button>
              )}
            </div>
          ) : (
            <div className="bg-dark-300 border border-surface-border rounded-xl overflow-hidden">
              {filtered.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => setSelected(selected?.id === c.id ? null : c)}
                  className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${
                    i < filtered.length - 1 ? 'border-b border-surface-border' : ''
                  } ${selected?.id === c.id ? 'bg-purple-500/10' : 'hover:bg-surface/20'}`}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <span className="text-purple-300 font-bold text-sm">{(c.nombre || '?')[0].toUpperCase()}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {c.estrella && <Star size={11} className="text-yellow-400 fill-yellow-400 shrink-0" />}
                      <p className="text-white font-medium text-sm truncate">{c.nombre}</p>
                    </div>
                    <p className="text-gray-500 text-xs truncate">{c.empresa || c.email || '—'}</p>
                  </div>

                  {/* Estado + valor */}
                  <div className="flex items-center gap-3 shrink-0">
                    {c.valor_estimado && Number(c.valor_estimado) > 0 && (
                      <span className="text-xs font-mono text-gray-400 hidden sm:block">
                        {Number(c.valor_estimado).toLocaleString('es-ES')}€
                      </span>
                    )}
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ESTADO_STYLE[c.estado] || ''}`}>
                      {c.estado}
                    </span>
                    <ChevronRight size={13} className={`text-gray-600 transition-transform ${selected?.id === c.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="lg:col-span-2">
            <div className="bg-dark-300 border border-surface-border rounded-xl overflow-hidden sticky top-0">
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <span className="text-purple-300 font-bold">{(selected.nombre || '?')[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      {selected.estrella && <Star size={11} className="text-yellow-400 fill-yellow-400" />}
                      <p className="text-white font-semibold text-sm">{selected.nombre}</p>
                    </div>
                    {selected.empresa && <p className="text-gray-500 text-xs">{selected.empresa}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditing(selected); setShowModal(true) }}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteCliente(selected.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Estado badge */}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ESTADO_STYLE[selected.estado] || ''}`}>
                  {selected.estado}
                </span>

                {/* Contacto */}
                <div className="space-y-2">
                  {selected.email && (
                    <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                      <Mail size={13} className="text-gray-500" /> {selected.email}
                    </a>
                  )}
                  {selected.telefono && (
                    <a href={`tel:${selected.telefono}`} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                      <Phone size={13} className="text-gray-500" /> {selected.telefono}
                    </a>
                  )}
                  {selected.web && (
                    <a href={selected.web} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                      <Globe size={13} className="text-gray-500" />
                      <span className="truncate">{selected.web}</span>
                      <ExternalLink size={11} className="shrink-0" />
                    </a>
                  )}
                </div>

                {/* Sector + Valor */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-dark-400 rounded-lg p-3">
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Sector</p>
                    <p className="text-white text-xs font-medium">{selected.sector || '—'}</p>
                  </div>
                  <div className="bg-dark-400 rounded-lg p-3">
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Valor</p>
                    <p className="text-purple-300 text-xs font-semibold">
                      {selected.valor_estimado ? `${Number(selected.valor_estimado).toLocaleString('es-ES')}€` : '—'}
                    </p>
                  </div>
                </div>

                {/* Servicios */}
                {selected.servicios?.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Servicios</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.servicios.map(s => (
                        <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notas */}
                {selected.notas && (
                  <div>
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Notas</p>
                    <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">{selected.notas}</p>
                  </div>
                )}

                {/* Fechas */}
                <div className="pt-2 border-t border-surface-border space-y-1">
                  {selected.fecha_creacion && (
                    <p className="text-gray-600 text-[10px] flex items-center gap-1.5">
                      <Calendar size={10} /> Creado {new Date(selected.fecha_creacion).toLocaleDateString('es-ES')}
                    </p>
                  )}
                  {selected.ultima_actividad && (
                    <p className="text-gray-600 text-[10px] flex items-center gap-1.5">
                      <Clock size={10} /> Actualizado {new Date(selected.ultima_actividad).toLocaleDateString('es-ES')}
                    </p>
                  )}
                </div>

                {/* Quick actions */}
                <div className="pt-2 border-t border-surface-border">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Acciones rápidas</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.web && (
                      <Link
                        to={`/audit`}
                        state={{ target: selected.web }}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-crimson bg-dark-400 hover:bg-crimson/10 border border-surface-border rounded-lg px-3 py-2 transition-colors"
                      >
                        <FileText size={11} /> Auditar web
                      </Link>
                    )}
                    {selected.web && (
                      <Link
                        to="/monitor"
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-400 bg-dark-400 hover:bg-green-500/10 border border-surface-border rounded-lg px-3 py-2 transition-colors"
                      >
                        <Globe size={11} /> Monitorizar
                      </Link>
                    )}
                    {selected.email && (
                      <Link
                        to="/osint"
                        state={{ target: selected.email }}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-400 bg-dark-400 hover:bg-blue-500/10 border border-surface-border rounded-lg px-3 py-2 transition-colors"
                      >
                        <Search size={11} /> OSINT email
                      </Link>
                    )}
                    <button
                      onClick={() => { setEditing(selected); setShowModal(true) }}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-purple-400 bg-dark-400 hover:bg-purple-500/10 border border-surface-border rounded-lg px-3 py-2 transition-colors"
                    >
                      <Edit2 size={11} /> Editar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ClienteModal
          initial={editing || {}}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
