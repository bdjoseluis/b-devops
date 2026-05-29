import { useState, useEffect } from 'react'
import { prospector } from '../api/client'
import Spinner from '../components/Spinner'
import {
  Building2, Search, MapPin, Globe, Phone, Mail,
  TrendingUp, AlertTriangle, CheckCircle, Star,
  Download, Filter, ChevronDown, ChevronUp, Map
} from 'lucide-react'

const CATEGORIES = [
  { id: 'empresa', label: 'Empresas / Oficinas' },
  { id: 'restaurante', label: 'Restaurantes' },
  { id: 'tienda', label: 'Tiendas' },
  { id: 'medico', label: 'Clínicas / Médicos' },
  { id: 'abogado', label: 'Abogados / Notarios' },
  { id: 'hotel', label: 'Hoteles' },
  { id: 'gym', label: 'Gimnasios' },
  { id: 'farmacia', label: 'Farmacias' },
]

const RADIUS_OPTIONS = [2, 5, 10, 20, 50]

export default function Prospector() {
  const [tab, setTab] = useState('local')

  // Local search state
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('empresa')
  const [radius, setRadius] = useState(10)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('opportunity')
  const [selectedBusiness, setSelectedBusiness] = useState(null)

  // Province scan state
  const [provinces, setProvinces] = useState([])
  const [province, setProvince] = useState('alicante')
  const [provCategory, setProvCategory] = useState('empresa')
  const [provRadius, setProvRadius] = useState(5)
  const [provMaxCities, setProvMaxCities] = useState(8)
  const [provLoading, setProvLoading] = useState(false)
  const [provData, setProvData] = useState(null)
  const [provError, setProvError] = useState('')

  useEffect(() => {
    prospector.provinces().then(r => setProvinces(r.provinces || [])).catch(() => {})
  }, [])

  const scanProvince = async () => {
    setProvLoading(true); setProvError(''); setProvData(null)
    try {
      const res = await prospector.province(province, provCategory, provRadius, 15, provMaxCities)
      if (res.error) throw new Error(res.error)
      setProvData(res)
    } catch (e) {
      setProvError(e.message)
    } finally {
      setProvLoading(false)
    }
  }

  const exportProvCSV = () => {
    if (!provData?.top_opportunities?.length) return
    const headers = ['Nombre', 'Ciudad', 'Dirección', 'Teléfono', 'Website', 'Score']
    const rows = provData.top_opportunities.map(b => [
      b.name || '', b.city || '', b.address || '', b.phone || '', b.website || '', b.opportunity_score || 0
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `provincia_${province}_${provCategory}.csv`; a.click()
  }

  const search = async () => {
    if (!location.trim()) return
    setLoading(true); setError(''); setData(null); setSelectedBusiness(null)
    try {
      const result = await prospector.search(location.trim(), category, radius)
      if (result.error) throw new Error(result.error)
      setData(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const businesses = data?.businesses || []

  const filtered = businesses
    .filter(b => {
      if (filter === 'no-web') return !b.has_website
      if (filter === 'issues') return b.has_website && b.opportunity_score >= 25
      if (filter === 'ok') return b.has_website && b.opportunity_score < 25
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'opportunity') return (b.opportunity_score || 0) - (a.opportunity_score || 0)
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      return 0
    })

  const stats = {
    total: businesses.length,
    noWeb: businesses.filter(b => !b.has_website).length,
    withIssues: businesses.filter(b => b.has_website && b.opportunity_score >= 25).length,
    ok: businesses.filter(b => b.has_website && b.opportunity_score < 25).length,
  }

  const exportCSV = () => {
    if (!filtered.length) return
    const headers = ['Nombre', 'Dirección', 'Teléfono', 'Website', 'Email', 'Oportunidad', 'Issues']
    const rows = filtered.map(b => [
      b.name || '', b.address || '', b.phone || '', b.website || '',
      b.email || '', b.opportunity_label || '',
      b.web_analysis?.issues?.join(' | ') || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `prospectos_${location.replace(/\s+/g, '_')}.csv`; a.click()
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header + tabs */}
      <div className="flex items-center gap-2 mb-4">
        <Building2 size={18} className="text-emerald-400" />
        <span className="text-white font-bold text-lg">Prospector de Empresas Locales</span>
        <span className="text-gray-500 text-sm ml-2">· Encuentra clientes potenciales</span>
      </div>

      <div className="flex gap-1 mb-6 bg-dark-300 border border-surface-border rounded-xl p-1 w-fit">
        {[
          { id: 'local', label: 'Búsqueda Local', icon: <Search size={14} /> },
          { id: 'province', label: 'Escáner de Provincia', icon: <Map size={14} /> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'province' && (
        <div>
          {/* Province scan form */}
          <div className="card mb-6 border-emerald-700/30">
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">Escáner de Provincia</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Provincia</label>
                <select className="input-dark" value={province} onChange={e => setProvince(e.target.value)}>
                  {provinces.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.cities} ciudades)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Categoría</label>
                <select className="input-dark" value={provCategory} onChange={e => setProvCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Radio por ciudad</label>
                <select className="input-dark" value={provRadius} onChange={e => setProvRadius(Number(e.target.value))}>
                  {RADIUS_OPTIONS.map(r => <option key={r} value={r}>{r} km</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Máx. ciudades</label>
                <select className="input-dark" value={provMaxCities} onChange={e => setProvMaxCities(Number(e.target.value))}>
                  {[4, 6, 8, 10, 15, 20].map(n => <option key={n} value={n}>{n} ciudades</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <button className="btn-primary bg-emerald-600 hover:bg-emerald-700" onClick={scanProvince} disabled={provLoading}>
                {provLoading ? <Spinner size={16} /> : <Map size={16} />}
                {provLoading ? 'Escaneando provincia...' : 'Escanear Provincia'}
              </button>
              <p className="text-gray-500 text-xs">Escanea todas las ciudades en paralelo — puede tardar 1-2 min</p>
            </div>
          </div>

          {provError && (
            <div className="card border-red-700/50 bg-red-900/10 mb-4 flex gap-3">
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{provError}</p>
            </div>
          )}

          {provLoading && (
            <div className="card flex flex-col items-center py-16 gap-4">
              <Spinner size={40} />
              <p className="text-gray-400 font-mono text-sm animate-pulse">Escaneando ciudades de {province}...</p>
              <p className="text-gray-600 text-xs">Buscando empresas y analizando su presencia digital en cada ciudad</p>
            </div>
          )}

          {provData && !provLoading && (
            <>
              {/* Province stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Ciudades escaneadas" value={provData.cities_scanned} color="text-white" />
                <StatCard label="Total empresas" value={provData.total_businesses} color="text-emerald-400" />
                <StatCard label="Oportunidades altas" value={provData.high_opportunity_count} color="text-red-400" />
                <StatCard label="Top mostradas" value={provData.top_opportunities?.length || 0} color="text-orange-400" />
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Top Oportunidades — {provData.province}</h3>
                <button className="btn-secondary text-xs" onClick={exportProvCSV}>
                  <Download size={13} />Exportar CSV
                </button>
              </div>

              {/* City breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {provData.cities?.map((c, i) => (
                  <div key={i} className="card py-3">
                    <p className="text-white text-xs font-semibold truncate">{c.city}</p>
                    <p className="text-emerald-400 text-lg font-bold">{c.data?.total || 0}</p>
                    <p className="text-gray-500 text-xs">empresas</p>
                  </div>
                ))}
              </div>

              {/* Top opportunities table */}
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Empresa</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Ciudad</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Contacto</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Web</th>
                      <th className="text-right px-4 py-3 text-gray-500 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {provData.top_opportunities?.map((b, i) => {
                      const score = b.opportunity_score || 0
                      const sc = score >= 50 ? 'text-red-400' : score >= 25 ? 'text-orange-400' : 'text-green-400'
                      return (
                        <tr key={i} className="border-b border-surface-border/40 hover:bg-surface-light/30 transition-colors">
                          <td className="px-4 py-2.5 text-white font-medium truncate max-w-[160px]">{b.name}</td>
                          <td className="px-4 py-2.5 text-gray-400">{b.city}</td>
                          <td className="px-4 py-2.5 text-gray-400">{b.phone || '—'}</td>
                          <td className="px-4 py-2.5">
                            {b.has_website
                              ? <a href={b.website} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate block max-w-[120px]">{b.website?.replace(/^https?:\/\//, '').slice(0, 20)}</a>
                              : <span className="text-red-400">Sin web</span>}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-bold ${sc}`}>{score}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {(!provData.top_opportunities || provData.top_opportunities.length === 0) && (
                  <p className="text-gray-600 text-sm text-center py-8">Sin oportunidades de alto score encontradas</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'local' && (
      <div>

      {/* Search form */}
      <div className="card mb-6 border-emerald-700/30">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="text-gray-400 text-xs mb-1.5 block">Ubicación / Ciudad / Dirección</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input className="input-dark pl-9"
                placeholder="Barcelona · Madrid · Calle Mayor, Zaragoza"
                value={location} onChange={e => setLocation(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()} />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Categoría</label>
            <select className="input-dark" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Radio</label>
            <select className="input-dark" value={radius} onChange={e => setRadius(Number(e.target.value))}>
              {RADIUS_OPTIONS.map(r => <option key={r} value={r}>{r} km</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <button className="btn-primary" onClick={search} disabled={loading || !location.trim()}>
            {loading ? <Spinner size={16} /> : <Search size={16} />}
            {loading ? 'Buscando y analizando...' : 'Buscar Empresas'}
          </button>
          <p className="text-gray-500 text-xs">
            Fuente: {data?.source || 'Google Places / OpenStreetMap'}
            {!loading && data && ` · ${data.total} empresas encontradas en ${data.location}`}
          </p>
        </div>

        {!loading && (
          <p className="text-yellow-400/70 text-xs mt-3 flex items-center gap-1.5">
            <AlertTriangle size={11} />
            Añade Google Places API key en Configuración para mejores resultados. Sin key usa OpenStreetMap (gratuito).
          </p>
        )}
      </div>

      {error && (
        <div className="card border-red-700/50 bg-red-900/10 mb-4 flex gap-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <div className="card flex flex-col items-center py-16 gap-4">
          <Spinner size={40} />
          <p className="text-gray-400 font-mono text-sm animate-pulse">Buscando empresas y analizando su presencia digital...</p>
          <p className="text-gray-600 text-xs">Comprobando websites, SSL, velocidad, tecnología...</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total encontradas" value={stats.total} color="text-white" />
            <StatCard label="🔥 Sin web" value={stats.noWeb} color="text-red-400"
              onClick={() => setFilter(filter === 'no-web' ? 'all' : 'no-web')}
              active={filter === 'no-web'} />
            <StatCard label="⚡ Web con problemas" value={stats.withIssues} color="text-orange-400"
              onClick={() => setFilter(filter === 'issues' ? 'all' : 'issues')}
              active={filter === 'issues'} />
            <StatCard label="✅ Bien establecidas" value={stats.ok} color="text-green-400"
              onClick={() => setFilter(filter === 'ok' ? 'all' : 'ok')}
              active={filter === 'ok'} />
          </div>

          {/* Filters + Export */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Filter size={13} className="text-gray-500" />
              <span className="text-gray-500">Ordenar:</span>
              {[
                { id: 'opportunity', label: 'Mayor oportunidad' },
                { id: 'rating', label: 'Mejor rating' },
                { id: 'name', label: 'Nombre A-Z' },
              ].map(s => (
                <button key={s.id} onClick={() => setSortBy(s.id)}
                  className={`text-xs px-2 py-1 rounded border transition-all ${
                    sortBy === s.id ? 'border-crimson/50 text-crimson bg-crimson/10' : 'border-surface-border text-gray-500'
                  }`}>{s.label}</button>
              ))}
            </div>
            <span className="text-gray-600 text-xs">{filtered.length} resultados</span>
            <button className="btn-secondary text-xs ml-auto" onClick={exportCSV}>
              <Download size={13} />
              Exportar CSV
            </button>
          </div>

          {/* Business list */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filtered.map((business, i) => (
              <BusinessCard
                key={i}
                business={business}
                selected={selectedBusiness === i}
                onSelect={() => setSelectedBusiness(selectedBusiness === i ? null : i)}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-600">
              <Building2 size={32} className="mx-auto mb-3 opacity-30" />
              <p>No hay resultados con este filtro</p>
            </div>
          )}
        </>
      )}
      </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color, onClick, active }) {
  return (
    <div
      className={`card cursor-pointer transition-all ${onClick ? 'hover:border-crimson/50' : ''} ${active ? 'border-crimson/50 bg-crimson/5' : ''}`}
      onClick={onClick}
    >
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-gray-500 text-xs mt-1">{label}</div>
    </div>
  )
}

function BusinessCard({ business, selected, onSelect }) {
  const score = business.opportunity_score || 0
  const scoreColor = score >= 50 ? 'text-red-400' : score >= 25 ? 'text-orange-400' : 'text-green-400'
  const borderColor = score >= 50 ? 'border-red-700/30 bg-red-900/5'
    : score >= 25 ? 'border-orange-700/30 bg-orange-900/5'
    : 'border-green-700/20'

  return (
    <div className={`card border transition-all ${borderColor}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white font-semibold text-sm truncate">{business.name}</span>
            {business.rating && (
              <div className="flex items-center gap-0.5">
                <Star size={11} className="text-yellow-400" />
                <span className="text-yellow-400 text-xs">{business.rating}</span>
                {business.user_ratings_total && (
                  <span className="text-gray-600 text-xs">({business.user_ratings_total})</span>
                )}
              </div>
            )}
          </div>
          {business.address && (
            <p className="text-gray-500 text-xs truncate">{business.address}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className={`font-bold text-sm ${scoreColor}`}>{business.opportunity_label}</div>
          <div className="text-gray-600 text-xs">Score: {score}</div>
        </div>
      </div>

      {/* Contact info */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs">
        {business.website && (
          <a href={business.website} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-blue-400 hover:underline truncate max-w-xs">
            <Globe size={11} />
            {business.website.replace(/^https?:\/\//, '').slice(0, 30)}
          </a>
        )}
        {!business.has_website && (
          <span className="flex items-center gap-1 text-red-400">
            <Globe size={11} />
            Sin website
          </span>
        )}
        {business.phone && (
          <span className="flex items-center gap-1 text-gray-400">
            <Phone size={11} />
            {business.phone}
          </span>
        )}
        {business.email && (
          <span className="flex items-center gap-1 text-gray-400">
            <Mail size={11} />
            {business.email}
          </span>
        )}
      </div>

      {/* Web analysis */}
      {business.web_analysis && !business.web_analysis.error && (
        <div className="flex flex-wrap gap-2 mb-3">
          {!business.web_analysis.has_ssl && (
            <span className="badge badge-red">Sin HTTPS</span>
          )}
          {business.web_analysis.ssl_days !== null && business.web_analysis.ssl_days <= 30 && business.web_analysis.ssl_days >= 0 && (
            <span className="badge badge-orange">SSL expira {business.web_analysis.ssl_days}d</span>
          )}
          {!business.web_analysis.is_mobile_friendly && (
            <span className="badge badge-orange">Sin responsive</span>
          )}
          {business.web_analysis.load_time_s > 3 && (
            <span className="badge badge-yellow">Lenta {business.web_analysis.load_time_s}s</span>
          )}
          {business.web_analysis.tech_stack?.slice(0, 2).map(t => (
            <span key={t} className="badge badge-gray">{t}</span>
          ))}
        </div>
      )}

      {/* Expand button */}
      <button className="btn-ghost text-xs w-full justify-between mt-1 py-1" onClick={onSelect}>
        <span>Ver detalles</span>
        {selected ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {/* Expanded details */}
      {selected && (
        <div className="mt-3 pt-3 border-t border-surface-border space-y-2 animate-slide-up">
          {/* Opportunity pitch */}
          <div className="p-3 rounded-lg bg-surface">
            <p className="text-xs text-gray-400 mb-1 font-semibold">💡 Propuesta de valor</p>
            <p className="text-gray-300 text-xs leading-relaxed">
              {!business.has_website
                ? 'Esta empresa no tiene presencia digital. Oferta: diseño web profesional, dominio, hosting, SEO local.'
                : business.web_analysis?.issues?.length > 0
                  ? `Issues detectados: ${business.web_analysis.issues.join(', ')}. Puedes ofrecer: mejoras de seguridad, rediseño, optimización.`
                  : 'Presencia digital establecida. Oportunidades: auditoría de seguridad, nuevas funcionalidades, apps.'}
            </p>
          </div>

          {business.web_analysis && !business.web_analysis.error && (
            <div className="text-xs space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  {business.web_analysis.has_ssl
                    ? <CheckCircle size={11} className="text-green-400" />
                    : <AlertTriangle size={11} className="text-red-400" />}
                  <span className="text-gray-400">HTTPS {business.web_analysis.has_ssl ? '✓' : '✗'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {business.web_analysis.is_mobile_friendly
                    ? <CheckCircle size={11} className="text-green-400" />
                    : <AlertTriangle size={11} className="text-orange-400" />}
                  <span className="text-gray-400">Mobile {business.web_analysis.is_mobile_friendly ? '✓' : '✗'}</span>
                </div>
              </div>
              {business.web_analysis.tech_stack?.length > 0 && (
                <p className="text-gray-500">Stack: {business.web_analysis.tech_stack.join(', ')}</p>
              )}
              {business.web_analysis.load_time_s && (
                <p className="text-gray-500">Velocidad: {business.web_analysis.load_time_s}s</p>
              )}
            </div>
          )}

          {/* Types */}
          {business.types?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {business.types.slice(0, 4).map(t => (
                <span key={t} className="badge badge-gray">{t.replace(/_/g, ' ')}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
