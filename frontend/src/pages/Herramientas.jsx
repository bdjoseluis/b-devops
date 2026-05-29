import { useState } from 'react'
import { tools } from '../api/client'
import Spinner from '../components/Spinner'
import {
  Wrench, Search, Database, User, Clock, Globe, Phone,
  Network, AlertTriangle, CheckCircle, ExternalLink, ChevronDown, ChevronUp,
  Shield, Radio, Map, FileSearch, Copy
} from 'lucide-react'

const TABS = [
  { id: 'censys',         label: 'Censys',          icon: Network,     color: 'text-blue-400',   desc: 'Internet Scanner' },
  { id: 'dehashed',       label: 'DeHashed',         icon: Database,    color: 'text-red-400',    desc: 'Breach DB' },
  { id: 'whatsmyname',    label: 'WhatsMyName',      icon: User,        color: 'text-purple-400', desc: 'Username OSINT' },
  { id: 'wayback',        label: 'Wayback',          icon: Clock,       color: 'text-orange-400', desc: 'Historial Web' },
  { id: 'c99',            label: 'C99.nl',           icon: Globe,       color: 'text-green-400',  desc: 'Multi-Tool' },
  { id: 'leakradar',      label: 'LeakRadar',        icon: AlertTriangle, color: 'text-yellow-400', desc: 'Leak Monitor' },
  { id: 'urlscan',        label: 'URLScan.io',       icon: Shield,      color: 'text-cyan-400',   desc: 'URL Scanner' },
  { id: 'bgp',            label: 'BGP / ASN',        icon: Radio,       color: 'text-indigo-400', desc: 'Network Intel' },
  { id: 'securitytrails', label: 'SecurityTrails',   icon: Map,         color: 'text-pink-400',   desc: 'DNS History' },
  { id: 'dorks',          label: 'Google Dorks',     icon: FileSearch,  color: 'text-lime-400',   desc: 'Dork Generator' },
]

export default function Herramientas() {
  const [tab, setTab] = useState('censys')

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Wrench size={18} className="text-gray-400" />
          <span className="text-white font-bold text-lg">Herramientas Avanzadas</span>
        </div>
        <p className="text-gray-500 text-sm">10 herramientas OSINT · Censys · DeHashed · WhatsMyName · Wayback · C99 · LeakRadar · URLScan · BGP/ASN · SecurityTrails · Dorks</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-surface border-surface-border text-white shadow-lg'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-surface-light'
            }`}
          >
            <t.icon size={14} className={tab === t.id ? t.color : ''} />
            <span>{t.label}</span>
            <span className="text-xs text-gray-600 hidden lg:inline">{t.desc}</span>
          </button>
        ))}
      </div>

      {tab === 'censys'         && <CensysPanel />}
      {tab === 'dehashed'       && <DeHashedPanel />}
      {tab === 'whatsmyname'    && <WhatsMyNamePanel />}
      {tab === 'wayback'        && <WaybackPanel />}
      {tab === 'c99'            && <C99Panel />}
      {tab === 'leakradar'      && <LeakRadarPanel />}
      {tab === 'urlscan'        && <URLScanPanel />}
      {tab === 'bgp'            && <BGPPanel />}
      {tab === 'securitytrails' && <SecurityTrailsPanel />}
      {tab === 'dorks'          && <DorksPanel />}
    </div>
  )
}

/* ── Censys ──────────────────────────────────────── */
function CensysPanel() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('ip')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      let result
      if (type === 'ip') result = await tools.censysIp(query.trim())
      else if (type === 'domain') result = await tools.censysDomain(query.trim())
      else result = await tools.censysSearch(query.trim())
      if (result.error) throw new Error(result.error)
      setData(result)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <ToolPanel title="Censys Internet Scanner" color="text-blue-400" icon={Network}
      desc="Busca dispositivos, servicios y vulnerabilidades expuestas en Internet">
      <SearchBar query={query} setQuery={setQuery} loading={loading} onRun={run}
        placeholder="IP · dominio.com · services.port:8080"
        types={[
          { id: 'ip', label: 'IP' }, { id: 'domain', label: 'Dominio' }, { id: 'query', label: 'Query avanzado' }
        ]} type={type} setType={setType} />

      {error && <ErrorBox msg={error} />}
      {loading && <LoadingBox text="Consultando Censys..." />}
      {data && !loading && (
        <div className="space-y-3">
          {data.ip && <HostCard host={data} />}
          {data.hosts && (
            <div>
              <p className="text-gray-400 text-sm mb-3">Total: {data.total?.toLocaleString()} resultados · mostrando {data.hosts.length}</p>
              <div className="space-y-2">
                {data.hosts.map((h, i) => <HostCard key={i} host={h} compact />)}
              </div>
            </div>
          )}
        </div>
      )}
    </ToolPanel>
  )
}

function HostCard({ host, compact = false }) {
  const [open, setOpen] = useState(!compact)
  return (
    <div className="card border-blue-700/30">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <code className="text-blue-400 font-mono font-bold">{host.ip}</code>
          {host.country && <span className="badge badge-blue">{host.country}</span>}
          {host.as_name && <span className="text-gray-500 text-xs">{host.as_name}</span>}
          {host.labels?.map(l => <span key={l} className="badge badge-gray">{l}</span>)}
        </div>
        <div className="flex items-center gap-2">
          {host.open_ports?.length > 0 && (
            <span className="text-xs text-gray-500">{host.open_ports.length} puertos</span>
          )}
          {open ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </div>
      {open && !compact && (
        <div className="mt-4 space-y-3">
          {host.open_ports?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Puertos abiertos</p>
              <div className="flex flex-wrap gap-1.5">
                {host.open_ports.map(p => <span key={p} className="badge badge-blue font-mono">{p}</span>)}
              </div>
            </div>
          )}
          {host.services?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Servicios</p>
              <div className="space-y-1">
                {host.services.map((s, i) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <code className="text-blue-400 w-16">{s.port}/{s.transport_protocol}</code>
                    <span className="text-yellow-400">{s.service_name}</span>
                    <span className="text-gray-400">{s.product}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {host.dns_names?.length > 0 && <KV label="DNS Names" value={host.dns_names.join(', ')} />}
          <KV label="ASN" value={`AS${host.asn} — ${host.as_name}`} />
          <KV label="Ciudad" value={host.city} />
          <KV label="Última actualización" value={host.last_updated} />
        </div>
      )}
    </div>
  )
}

/* ── DeHashed ──────────────────────────────────────── */
function DeHashedPanel() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('email')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      const result = await tools.dehashed(query.trim(), type)
      if (result.error) throw new Error(result.error)
      setData(result)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <ToolPanel title="DeHashed — Base de Datos de Brechas" color="text-red-400" icon={Database}
      desc="Busca credenciales y datos filtrados en brechas de seguridad. Requiere cuenta DeHashed.">
      <SearchBar query={query} setQuery={setQuery} loading={loading} onRun={run}
        placeholder="email@empresa.com · @empresa.com · usuario · IP"
        types={[
          { id: 'email', label: 'Email' }, { id: 'domain', label: 'Dominio' },
          { id: 'username', label: 'Usuario' }, { id: 'ip', label: 'IP' },
          { id: 'name', label: 'Nombre' }, { id: 'password', label: 'Password' },
          { id: 'phone', label: 'Teléfono' },
        ]} type={type} setType={setType} />

      {error && <ErrorBox msg={error} />}
      {loading && <LoadingBox text="Consultando DeHashed..." />}

      {data && !loading && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className={`text-2xl font-bold ${data.total > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {data.total?.toLocaleString()}
            </div>
            <span className="text-gray-400">resultados encontrados</span>
            {data.balance !== undefined && (
              <span className="badge badge-gray ml-auto">Balance: {data.balance}</span>
            )}
          </div>
          {data.entries?.length > 0 && (
            <div className="space-y-2">
              {data.entries.map((e, i) => (
                <div key={i} className="card border-red-700/20 bg-red-900/5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    {e.email && <KV label="Email" value={e.email} mono />}
                    {e.username && <KV label="Usuario" value={e.username} mono />}
                    {e.password && <KV label="Password" value={e.password} mono />}
                    {e.hashed_password && <KV label="Hash" value={`${e.hash_type}: ${e.hashed_password.slice(0, 30)}...`} mono />}
                    {e.name && <KV label="Nombre" value={e.name} />}
                    {e.ip_address && <KV label="IP" value={e.ip_address} mono />}
                    {e.phone && <KV label="Teléfono" value={e.phone} />}
                    {e.address && <KV label="Dirección" value={e.address} />}
                    <KV label="Fuente" value={e.database_name} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </ToolPanel>
  )
}

/* ── WhatsMyName ──────────────────────────────────────── */
function WhatsMyNamePanel() {
  const [username, setUsername] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  const run = async () => {
    if (!username.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      const result = await tools.whatsmyname(username.trim())
      if (result.error) throw new Error(result.error)
      setData(result)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const filtered = data?.found?.filter(f =>
    !filter || f.site.toLowerCase().includes(filter.toLowerCase()) || f.category?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <ToolPanel title="WhatsMyName — Username OSINT" color="text-purple-400" icon={User}
      desc="Encuentra perfiles de un usuario en cientos de plataformas (redes sociales, foros, gaming...)">
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input-dark pl-9" placeholder="nombre_de_usuario"
            value={username} onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()} />
        </div>
        <button className="btn-primary" onClick={run} disabled={loading || !username.trim()}>
          {loading ? <Spinner size={15} /> : <Search size={15} />}
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {error && <ErrorBox msg={error} />}

      {loading && (
        <div className="card flex flex-col items-center py-12 gap-3">
          <Spinner size={36} />
          <p className="text-gray-400 text-sm">Comprobando {username} en más de 150 plataformas...</p>
          <p className="text-gray-600 text-xs">Esto puede tardar 30-60 segundos</p>
        </div>
      )}

      {data && !loading && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-2xl font-bold text-purple-400">{data.total_found}</div>
            <div>
              <p className="text-white font-semibold">perfiles encontrados</p>
              <p className="text-gray-500 text-xs">{data.total_checked} sitios comprobados · {data.errors} errores</p>
            </div>
            <input className="input-dark ml-auto w-48 text-sm"
              placeholder="Filtrar..." value={filter} onChange={e => setFilter(e.target.value)} />
          </div>

          {/* Category groups */}
          {filtered && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                  className="card border-purple-700/20 hover:border-purple-500/50 transition-all flex items-center gap-3 group">
                  <CheckCircle size={14} className="text-green-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{f.site}</p>
                    <p className="text-gray-500 text-xs truncate">{f.url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.category && <span className="badge badge-gray">{f.category}</span>}
                    <ExternalLink size={12} className="text-gray-600 group-hover:text-purple-400" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </ToolPanel>
  )
}

/* ── Wayback Machine ──────────────────────────────────────── */
function WaybackPanel() {
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState('snapshots')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!url.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      let result
      if (mode === 'check') result = await tools.waybackCheck(url.trim())
      else if (mode === 'snapshots') result = await tools.waybackSnapshots(url.trim(), 30)
      else result = await tools.waybackTimeline(url.trim())
      if (result.error) throw new Error(result.error)
      setData(result)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <ToolPanel title="Wayback Machine — Historial Web" color="text-orange-400" icon={Clock}
      desc="Comprueba el historial de una web en archive.org. Gratuito, sin API key.">
      <SearchBar query={url} setQuery={setUrl} loading={loading} onRun={run}
        placeholder="https://dominio.com"
        types={[
          { id: 'snapshots', label: 'Snapshots' },
          { id: 'check', label: 'Disponibilidad' },
          { id: 'timeline', label: 'Timeline anual' },
        ]} type={mode} setType={setMode} />

      {error && <ErrorBox msg={error} />}
      {loading && <LoadingBox text="Consultando Wayback Machine..." />}

      {data && !loading && (
        <div className="space-y-3">
          {/* Check result */}
          {data.available !== undefined && (
            <div className={`card border-2 ${data.available ? 'border-green-600/50' : 'border-red-600/50'}`}>
              <div className={`font-bold mb-2 ${data.available ? 'text-green-400' : 'text-red-400'}`}>
                {data.available ? '✓ Disponible en Wayback Machine' : '✗ No archivado'}
              </div>
              {data.snapshot_url && (
                <a href={data.snapshot_url} target="_blank" rel="noreferrer"
                  className="text-blue-400 text-sm hover:underline flex items-center gap-1">
                  <ExternalLink size={12} /> Ver snapshot más reciente
                </a>
              )}
              <KV label="Timestamp" value={data.timestamp} />
              <KV label="Estado HTTP" value={data.status} />
            </div>
          )}

          {/* Snapshots list */}
          {data.snapshots && (
            <div>
              <div className="flex justify-between mb-3">
                <p className="text-gray-400 text-sm">
                  {data.total} snapshots · Primero: {data.first?.date} · Último: {data.last?.date}
                </p>
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {data.snapshots.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 px-3 hover:bg-surface-light rounded-lg">
                    <span className="text-orange-400 font-mono text-xs w-36">{s.date}</span>
                    <span className="badge badge-gray">{s.status}</span>
                    <span className="text-gray-500 text-xs">{s.length}b</span>
                    <a href={s.url} target="_blank" rel="noreferrer"
                      className="ml-auto text-blue-400 hover:underline text-xs flex items-center gap-1">
                      <ExternalLink size={11} /> Ver
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {data.timeline && (
            <div>
              <p className="text-gray-400 text-sm mb-3">
                {data.total_years} años de actividad · {data.years_active[0]} → {data.years_active[data.years_active.length - 1]}
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.timeline).sort().map(([year, count]) => (
                  <div key={year} className="flex flex-col items-center gap-1">
                    <div className="text-orange-400 font-bold text-sm">{count}</div>
                    <div className="text-gray-500 text-xs">{year}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ToolPanel>
  )
}

/* ── C99.nl ──────────────────────────────────────── */
function C99Panel() {
  const [query, setQuery] = useState('')
  const [tool, setTool] = useState('subdomains')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      let result
      if (tool === 'subdomains') result = await tools.c99Subdomains(query.trim())
      else if (tool === 'reverseip') result = await tools.c99ReverseIp(query.trim())
      else if (tool === 'phone') result = await tools.c99Phone(query.trim())
      else result = await tools.c99PortScan(query.trim(), '1-1000')
      if (result.error) throw new Error(result.error)
      setData(result)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const placeholders = {
    subdomains: 'dominio.com',
    reverseip: '192.168.1.1',
    phone: '+34 600000000',
    portscan: 'dominio.com o IP',
  }

  return (
    <ToolPanel title="C99.nl — Multi-Tool OSINT" color="text-green-400" icon={Globe}
      desc="Subdominios, reverse IP, lookup de teléfonos, port scanner. Requiere API key de C99.nl">
      <SearchBar query={query} setQuery={setQuery} loading={loading} onRun={run}
        placeholder={placeholders[tool]}
        types={[
          { id: 'subdomains', label: 'Subdominios' }, { id: 'reverseip', label: 'Reverse IP' },
          { id: 'phone', label: 'Teléfono' }, { id: 'portscan', label: 'Port Scan' },
        ]} type={tool} setType={setTool} />

      {error && <ErrorBox msg={error} />}
      {loading && <LoadingBox text="Consultando C99.nl..." />}

      {data && !loading && (
        <div className="space-y-2">
          {/* Subdomains */}
          {data.subdomains && (
            <div>
              <p className="text-gray-400 text-sm mb-3">{data.total} subdominios encontrados</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.subdomains.map((s, i) => (
                  <div key={i} className="flex gap-3 p-2 bg-surface-light rounded-lg text-sm">
                    <code className="text-green-400 flex-1">{s.subdomain}</code>
                    {s.ip && <code className="text-gray-500">{s.ip}</code>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Domains from reverse IP */}
          {data.domains && (
            <div>
              <p className="text-gray-400 text-sm mb-3">{data.total} dominios en {data.ip}</p>
              <div className="flex flex-wrap gap-2">
                {data.domains.map((d, i) => (
                  <span key={i} className="badge badge-green font-mono">{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* Phone */}
          {data.phone && (
            <div className="card">
              <KV label="Número" value={data.phone} mono />
              <KV label="País" value={data.country} />
              <KV label="Código país" value={data.country_code} />
              <KV label="Operadora" value={data.carrier} />
              <KV label="Tipo" value={data.type} />
              <KV label="Válido" value={data.valid ? 'Sí' : 'No'} />
            </div>
          )}

          {/* Port scan */}
          {data.open_ports && (
            <div>
              <p className="text-gray-400 text-sm mb-2">{data.total_open} puertos abiertos</p>
              <div className="flex flex-wrap gap-1.5">
                {data.open_ports.map(p => <span key={p} className="badge badge-green font-mono">{p}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </ToolPanel>
  )
}

/* ── LeakRadar ──────────────────────────────────────── */
function LeakRadarPanel() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('email')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      let result
      if (type === 'email') result = await tools.leakradarEmail(query.trim())
      else result = await tools.leakradarDomain(query.trim())
      if (result.error) throw new Error(result.error)
      setData(result)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <ToolPanel title="LeakRadar — Monitor de Filtraciones" color="text-yellow-400" icon={AlertTriangle}
      desc="Monitoriza si emails o dominios aparecen en nuevas filtraciones de datos.">
      <SearchBar query={query} setQuery={setQuery} loading={loading} onRun={run}
        placeholder="email@empresa.com o dominio.com"
        types={[{ id: 'email', label: 'Email' }, { id: 'domain', label: 'Dominio' }]}
        type={type} setType={setType} />

      {error && <ErrorBox msg={error} />}
      {loading && <LoadingBox text="Consultando LeakRadar..." />}
      {data && !loading && (
        <div className={`card border-2 ${data.found ? 'border-red-600/50 bg-red-900/10' : 'border-green-600/30 bg-green-900/10'}`}>
          <div className={`font-bold mb-3 flex items-center gap-2 ${data.found ? 'text-red-400' : 'text-green-400'}`}>
            {data.found
              ? <><AlertTriangle size={16} /> Encontrado en {data.total} filtracion(es)</>
              : <><CheckCircle size={16} /> No encontrado en filtraciones conocidas</>}
          </div>
          {data.breaches?.map((b, i) => (
            <div key={i} className="mb-2 p-2 bg-surface rounded-lg text-sm">
              <p className="text-white font-semibold">{b.name || b}</p>
            </div>
          ))}
          {data.emails_leaked?.length > 0 && (
            <div className="mt-2">
              <p className="text-gray-500 text-xs mb-2">Emails filtrados:</p>
              {data.emails_leaked.slice(0, 20).map((e, i) => (
                <code key={i} className="block text-red-300 text-xs">{e}</code>
              ))}
            </div>
          )}
        </div>
      )}
    </ToolPanel>
  )
}

/* ── URLScan.io ──────────────────────────────────────── */
function URLScanPanel() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('scan')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      let result
      if (mode === 'scan') result = await tools.urlscanScan(query.trim())
      else if (mode === 'domain') result = await tools.urlscanSearchDomain(query.trim())
      else result = await tools.urlscanSearchIp(query.trim())
      if (result.error) throw new Error(result.error)
      setData(result)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const placeholders = { scan: 'https://ejemplo.com', domain: 'ejemplo.com', ip: '1.2.3.4' }

  return (
    <ToolPanel title="URLScan.io — Escáner de URLs" color="text-cyan-400" icon={Shield}
      desc="Analiza URLs en busca de malware, phishing y tecnologías. Requiere API key de urlscan.io (plan gratuito disponible).">
      <SearchBar query={query} setQuery={setQuery} loading={loading} onRun={run}
        placeholder={placeholders[mode]}
        types={[
          { id: 'scan', label: 'Escanear URL' },
          { id: 'domain', label: 'Buscar dominio' },
          { id: 'ip', label: 'Buscar IP' },
        ]} type={mode} setType={setMode} />

      {mode === 'scan' && !loading && !data && (
        <div className="p-3 bg-cyan-900/10 border border-cyan-700/20 rounded-lg text-xs text-gray-400">
          El escaneo tarda ~30s — URLScan captura una screenshot del sitio y analiza todas las peticiones de red
        </div>
      )}
      {error && <ErrorBox msg={error} />}
      {loading && <LoadingBox text={mode === 'scan' ? 'Escaneando URL (~30s)...' : 'Buscando en URLScan...'} />}

      {data && !loading && (
        <div className="space-y-3">
          {/* Scan result */}
          {data.url && data.malicious !== undefined && (
            <div>
              <div className={`card border-2 mb-3 ${data.malicious ? 'border-red-600/50 bg-red-900/10' : 'border-green-600/30'}`}>
                <div className={`font-bold mb-2 flex items-center gap-2 text-lg ${data.malicious ? 'text-red-400' : 'text-green-400'}`}>
                  {data.malicious ? <><AlertTriangle size={18} /> MALICIOSO — Score: {data.score}</> : <><CheckCircle size={18} /> Limpio</>}
                </div>
                {data.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {data.tags.map(t => <span key={t} className="badge badge-gray text-red-300">{t}</span>)}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  <KV label="URL" value={data.url} mono />
                  <KV label="Dominio" value={data.domain} mono />
                  <KV label="IP" value={data.ip} mono />
                  <KV label="País" value={data.country} />
                  <KV label="Servidor" value={data.server} />
                  <KV label="ASN" value={data.asnname} />
                  <KV label="Título" value={data.title} />
                  <KV label="Tipo MIME" value={data.mime_type} />
                  <KV label="Estado HTTP" value={data.status} />
                  <KV label="Peticiones red" value={data.requests} />
                </div>
              </div>

              {data.screenshot && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2">Screenshot</p>
                  <img src={data.screenshot} alt="screenshot" className="rounded-lg border border-surface-border max-w-md w-full" />
                </div>
              )}

              {data.tech?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2">Tecnologías detectadas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.tech.map((t, i) => <span key={i} className="badge badge-blue">{t}</span>)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.ips?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">IPs contactadas ({data.ips.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {data.ips.map((ip, i) => <code key={i} className="text-xs text-cyan-400 bg-surface-light px-2 py-0.5 rounded">{ip}</code>)}
                    </div>
                  </div>
                )}
                {data.domains?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Dominios contactados ({data.domains.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {data.domains.map((d, i) => <code key={i} className="text-xs text-green-400 bg-surface-light px-2 py-0.5 rounded">{d}</code>)}
                    </div>
                  </div>
                )}
              </div>

              {data.result_url && (
                <a href={data.result_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-cyan-400 text-sm hover:underline mt-2">
                  <ExternalLink size={13} /> Ver resultado completo en URLScan.io
                </a>
              )}
            </div>
          )}

          {/* Search results */}
          {data.scans && (
            <div>
              <p className="text-gray-400 text-sm mb-3">{data.total?.toLocaleString()} escaneos encontrados</p>
              <div className="space-y-2">
                {data.scans.map((s, i) => (
                  <div key={i} className={`card border ${s.malicious ? 'border-red-700/30' : 'border-surface-border/40'} flex items-center gap-3`}>
                    {s.malicious
                      ? <AlertTriangle size={14} className="text-red-400 shrink-0" />
                      : <CheckCircle size={14} className="text-green-400 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-mono truncate">{s.url}</p>
                      <p className="text-gray-500 text-xs">{s.time} · IP: {s.ip} · {s.country}</p>
                    </div>
                    <a href={s.result_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300">
                      <ExternalLink size={13} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ToolPanel>
  )
}

/* ── BGP / ASN ──────────────────────────────────────── */
function BGPPanel() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('ip')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subTab, setSubTab] = useState('info')

  const run = async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setData(null); setSubTab('info')
    try {
      let result
      if (mode === 'ip') result = await tools.bgpIp(query.trim())
      else result = await tools.bgpAsn(query.trim())
      if (result.error) throw new Error(result.error)
      setData(result)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const loadPrefixes = async () => {
    if (!data) return
    setLoading(true); setError('')
    try {
      const asn = mode === 'ip' ? data.prefixes?.[0]?.asn : query.trim()
      if (!asn) throw new Error('No ASN found')
      const result = await tools.bgpPrefixes(String(asn))
      if (result.error) throw new Error(result.error)
      setData(prev => ({ ...prev, prefixesData: result }))
      setSubTab('prefixes')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const loadPeers = async () => {
    if (!data) return
    setLoading(true); setError('')
    try {
      const asn = mode === 'ip' ? data.prefixes?.[0]?.asn : query.trim()
      if (!asn) throw new Error('No ASN found')
      const result = await tools.bgpPeers(String(asn))
      if (result.error) throw new Error(result.error)
      setData(prev => ({ ...prev, peersData: result }))
      setSubTab('peers')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <ToolPanel title="BGP / ASN — Inteligencia de Red" color="text-indigo-400" icon={Radio}
      desc="Descubre a qué AS pertenece una IP, sus prefijos de red, peers y más. Gratis, sin API key.">
      <SearchBar query={query} setQuery={setQuery} loading={loading} onRun={run}
        placeholder={mode === 'ip' ? '8.8.8.8' : 'AS15169 o 15169'}
        types={[{ id: 'ip', label: 'IP' }, { id: 'asn', label: 'ASN' }]}
        type={mode} setType={setMode} />

      {error && <ErrorBox msg={error} />}
      {loading && <LoadingBox text="Consultando BGPView..." />}

      {data && !loading && (
        <div className="space-y-3">
          {/* Sub-tabs */}
          <div className="flex gap-2">
            <button onClick={() => setSubTab('info')}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${subTab === 'info' ? 'bg-indigo-900/30 border-indigo-700/50 text-indigo-300' : 'border-surface-border text-gray-500'}`}>
              Info
            </button>
            <button onClick={loadPrefixes}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${subTab === 'prefixes' ? 'bg-indigo-900/30 border-indigo-700/50 text-indigo-300' : 'border-surface-border text-gray-500'}`}>
              Prefijos IP
            </button>
            <button onClick={loadPeers}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${subTab === 'peers' ? 'bg-indigo-900/30 border-indigo-700/50 text-indigo-300' : 'border-surface-border text-gray-500'}`}>
              Peers BGP
            </button>
          </div>

          {subTab === 'info' && (
            <div className="space-y-3">
              {/* IP result */}
              {data.ptr !== undefined && (
                <div className="card">
                  <KV label="PTR (rDNS)" value={data.ptr} mono />
                  <KV label="RIR" value={data.rir} />
                  <KV label="Prefijo asignado" value={data.allocation_prefix} mono />
                  <KV label="Fecha asignación" value={data.allocation_date} />
                </div>
              )}
              {/* ASN result */}
              {data.asn !== undefined && data.ptr === undefined && (
                <div className="card">
                  <KV label="ASN" value={`AS${data.asn}`} mono />
                  <KV label="Nombre" value={data.name} />
                  <KV label="Descripción" value={data.description} />
                  <KV label="País" value={data.country} />
                  <KV label="RIR" value={data.rir} />
                  <KV label="Web" value={data.website} />
                  <KV label="Tráfico" value={data.traffic_estimation} />
                  {data.abuse_contacts?.length > 0 && <KV label="Abuso" value={data.abuse_contacts.join(', ')} />}
                </div>
              )}

              {/* Prefixes from IP lookup */}
              {data.prefixes?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Prefijos BGP que incluyen esta IP</p>
                  <div className="space-y-2">
                    {data.prefixes.map((p, i) => (
                      <div key={i} className="card border-indigo-700/20">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-indigo-400 font-bold text-sm">{p.prefix}</code>
                          {p.country && <span className="badge badge-gray">{p.country}</span>}
                          {p.asn && <span className="text-gray-500 text-xs">AS{p.asn}</span>}
                        </div>
                        <p className="text-gray-300 text-xs">{p.name || p.description}</p>
                        {p.asn_description && <p className="text-gray-500 text-xs">{p.asn_description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {subTab === 'prefixes' && data.prefixesData && (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm text-gray-400">
                <span>IPv4: <strong className="text-white">{data.prefixesData.ipv4_count}</strong></span>
                <span>IPv6: <strong className="text-white">{data.prefixesData.ipv6_count}</strong></span>
              </div>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {data.prefixesData.ipv4_prefixes?.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-1.5 hover:bg-surface-light rounded-lg text-sm">
                    <code className="text-indigo-400 w-36 shrink-0">{p.prefix}</code>
                    {p.country && <span className="badge badge-gray">{p.country}</span>}
                    <span className="text-gray-400 truncate">{p.name || p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {subTab === 'peers' && data.peersData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-2">Upstreams ({data.peersData.upstream_count})</p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {data.peersData.upstreams?.map((p, i) => (
                    <div key={i} className="flex gap-3 text-xs px-2 py-1.5 hover:bg-surface-light rounded">
                      <code className="text-indigo-400 w-16">AS{p.asn}</code>
                      <span className="text-gray-400">{p.name}</span>
                      <span className="text-gray-600 ml-auto">{p.country}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Downstreams ({data.peersData.downstream_count})</p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {data.peersData.downstreams?.map((p, i) => (
                    <div key={i} className="flex gap-3 text-xs px-2 py-1.5 hover:bg-surface-light rounded">
                      <code className="text-indigo-400 w-16">AS{p.asn}</code>
                      <span className="text-gray-400">{p.name}</span>
                      <span className="text-gray-600 ml-auto">{p.country}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </ToolPanel>
  )
}

/* ── SecurityTrails ──────────────────────────────────────── */
function SecurityTrailsPanel() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('domain')
  const [histType, setHistType] = useState('a')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setData(null)
    try {
      let result
      if (mode === 'domain') result = await tools.stDomain(query.trim())
      else if (mode === 'subdomains') result = await tools.stSubdomains(query.trim())
      else if (mode === 'history') result = await tools.stHistory(query.trim(), histType)
      else if (mode === 'associated') result = await tools.stAssociated(query.trim())
      else result = await tools.stIp(query.trim())
      if (result.error) throw new Error(result.error)
      setData(result)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const placeholders = {
    domain: 'ejemplo.com', subdomains: 'ejemplo.com',
    history: 'ejemplo.com', associated: 'ejemplo.com', ip: '1.2.3.4'
  }

  return (
    <ToolPanel title="SecurityTrails — DNS Intelligence" color="text-pink-400" icon={Map}
      desc="Historial DNS completo, subdominios con fechas, dominios asociados por mismo registrante. Requiere API key de SecurityTrails.">
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'domain', label: 'Info dominio' }, { id: 'subdomains', label: 'Subdominios' },
            { id: 'history', label: 'Historial DNS' }, { id: 'associated', label: 'Dominios asociados' },
            { id: 'ip', label: 'IP → dominios' },
          ].map(t => (
            <button key={t.id} onClick={() => setMode(t.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                mode === t.id ? 'bg-crimson/20 border-crimson/50 text-crimson' : 'border-surface-border text-gray-500 hover:text-gray-300'
              }`}>{t.label}</button>
          ))}
        </div>

        {mode === 'history' && (
          <div className="flex gap-2">
            {['a', 'mx', 'ns', 'txt'].map(t => (
              <button key={t} onClick={() => setHistType(t)}
                className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                  histType === t ? 'bg-pink-900/30 border-pink-700/50 text-pink-300' : 'border-surface-border text-gray-600'
                }`}>{t.toUpperCase()}</button>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input className="input-dark pl-9" placeholder={placeholders[mode]}
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && run()} />
          </div>
          <button className="btn-primary" onClick={run} disabled={loading || !query.trim()}>
            {loading ? <Spinner size={14} /> : <Search size={14} />}
            {loading ? 'Consultando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {error && <ErrorBox msg={error} />}
      {loading && <LoadingBox text="Consultando SecurityTrails..." />}

      {data && !loading && (
        <div className="space-y-3 mt-4">
          {/* Domain info */}
          {data.hostname && (
            <div className="space-y-3">
              <div className="card">
                <KV label="Dominio" value={data.hostname} mono />
                <KV label="Apex" value={data.apex_domain} mono />
                <KV label="Alexa Rank" value={data.alexa_rank} />
                <KV label="Registrar" value={data.whois?.registrar} />
                <KV label="Creado" value={data.whois?.created} />
                <KV label="Expira" value={data.whois?.expires} />
                <KV label="Subdominios" value={data.subdomain_count} />
              </div>
              {data.dns && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.dns.a?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">A Records</p>
                      {data.dns.a.map((ip, i) => <code key={i} className="block text-pink-400 text-xs">{ip}</code>)}
                    </div>
                  )}
                  {data.dns.ns?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Nameservers</p>
                      {data.dns.ns.map((ns, i) => <code key={i} className="block text-blue-400 text-xs">{ns}</code>)}
                    </div>
                  )}
                  {data.dns.mx?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">MX Records</p>
                      {data.dns.mx.map((mx, i) => <code key={i} className="block text-green-400 text-xs">{mx}</code>)}
                    </div>
                  )}
                  {data.dns.txt?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">TXT Records</p>
                      {data.dns.txt.slice(0, 5).map((t, i) => <code key={i} className="block text-gray-300 text-xs truncate">{t}</code>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Subdomains */}
          {data.subdomains && (
            <div>
              <p className="text-gray-400 text-sm mb-3">{data.total} subdominios encontrados</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5 max-h-96 overflow-y-auto">
                {data.subdomains.map((s, i) => (
                  <code key={i} className="text-pink-400 text-xs bg-surface-light px-2 py-1 rounded truncate">{s}</code>
                ))}
              </div>
            </div>
          )}

          {/* DNS History */}
          {data.history && (
            <div>
              <p className="text-gray-400 text-sm mb-3">{data.total} registros históricos de tipo {data.type}</p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {data.history.map((rec, i) => (
                  <div key={i} className="card border-pink-700/20 text-sm">
                    <div className="flex gap-4 mb-1 text-xs text-gray-500">
                      <span>Desde: <span className="text-gray-300">{rec.first_seen}</span></span>
                      <span>Hasta: <span className="text-gray-300">{rec.last_seen}</span></span>
                      {rec.organizations?.[0] && <span>Org: <span className="text-gray-300">{rec.organizations[0]}</span></span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {rec.values?.map((v, j) => <code key={j} className="text-pink-400 text-xs bg-surface-light px-2 py-0.5 rounded">{v}</code>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Associated domains */}
          {data.domains && mode === 'associated' && (
            <div>
              <p className="text-gray-400 text-sm mb-3">{data.total} dominios asociados al mismo registrante</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.domains.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-surface-light rounded-lg text-sm">
                    <code className="text-pink-400 flex-1 truncate">{d.hostname}</code>
                    {d.whois?.registrar && <span className="text-gray-600 text-xs">{d.whois.registrar}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IP to domains */}
          {data.domains && mode !== 'associated' && data.ip && (
            <div>
              <p className="text-gray-400 text-sm mb-3">{data.total} dominios apuntan a {data.ip}</p>
              <div className="flex flex-wrap gap-1.5">
                {data.domains.map((d, i) => <code key={i} className="text-pink-400 text-xs badge badge-gray">{d}</code>)}
              </div>
            </div>
          )}
        </div>
      )}
    </ToolPanel>
  )
}

/* ── Google Dorks ──────────────────────────────────────── */
const DORK_TEMPLATES = [
  {
    category: 'Archivos sensibles',
    color: 'text-red-400',
    dorks: [
      { label: 'Contraseñas en texto plano', query: 'site:{target} ext:txt OR ext:log "password" OR "contraseña"' },
      { label: 'Archivos de config', query: 'site:{target} ext:env OR ext:ini OR ext:cfg OR ext:conf "password"' },
      { label: 'Backups expuestos', query: 'site:{target} ext:bak OR ext:backup OR ext:old OR ext:sql' },
      { label: 'Hojas de cálculo con datos', query: 'site:{target} ext:xlsx OR ext:xls OR ext:csv "email" OR "usuario"' },
      { label: 'Documentos internos', query: 'site:{target} ext:pdf OR ext:doc OR ext:docx "confidencial" OR "interno"' },
    ]
  },
  {
    category: 'Paneles de administración',
    color: 'text-orange-400',
    dorks: [
      { label: 'Panel admin genérico', query: 'site:{target} inurl:admin OR inurl:administrator OR inurl:wp-admin' },
      { label: 'Login pages', query: 'site:{target} inurl:login OR inurl:signin OR inurl:auth' },
      { label: 'phpMyAdmin', query: 'site:{target} inurl:phpmyadmin' },
      { label: 'Paneles de control', query: 'site:{target} inurl:dashboard OR inurl:panel OR inurl:cpanel' },
      { label: 'APIs expuestas', query: 'site:{target} inurl:api OR inurl:swagger OR inurl:graphql' },
    ]
  },
  {
    category: 'Información expuesta',
    color: 'text-yellow-400',
    dorks: [
      { label: 'Directorios abiertos', query: 'site:{target} intitle:"index of" OR intitle:"directory listing"' },
      { label: 'Errores de base de datos', query: 'site:{target} "SQL syntax" OR "mysql_fetch" OR "ORA-01" OR "Warning: pg_"' },
      { label: 'Stack traces', query: 'site:{target} "Exception" AND "stack trace" OR "Traceback (most recent)"' },
      { label: 'Emails corporativos', query: 'site:{target} "@{target}" -www' },
      { label: 'Subdominios activos', query: 'site:*.{target} -www' },
    ]
  },
  {
    category: 'Cámaras y dispositivos IoT',
    color: 'text-purple-400',
    dorks: [
      { label: 'Webcams Axis', query: 'site:{target} inurl:view/index.shtml OR inurl:view/viewer_index.shtml' },
      { label: 'Paneles router', query: 'site:{target} inurl:login.asp OR inurl:home.htm intitle:"router"' },
      { label: 'NAS expuesto', query: 'site:{target} intitle:"NAS" inurl:login' },
      { label: 'Impresoras red', query: 'site:{target} intitle:"printer" OR intitle:"HP LaserJet"' },
    ]
  },
  {
    category: 'GitHub / código fuente',
    color: 'text-green-400',
    dorks: [
      { label: 'Credenciales en GitHub', query: 'site:github.com "{target}" password OR secret OR api_key' },
      { label: 'Config files en GitHub', query: 'site:github.com "{target}" filename:.env OR filename:config.json' },
      { label: 'Tokens AWS', query: 'site:github.com "{target}" AKIA OR aws_access_key_id' },
      { label: 'Código fuente', query: 'site:github.com "{target}"' },
    ]
  },
  {
    category: 'Redes sociales y personas',
    color: 'text-blue-400',
    dorks: [
      { label: 'Perfil LinkedIn empleados', query: 'site:linkedin.com "{target}" empleado OR employee OR "trabaja en"' },
      { label: 'Menciones en Twitter/X', query: 'site:x.com OR site:twitter.com "{target}"' },
      { label: 'Perfiles en Pastebin', query: 'site:pastebin.com "{target}"' },
      { label: 'Menciones generales', query: '"{target}" -site:{target}' },
    ]
  },
]

function DorksPanel() {
  const [target, setTarget] = useState('')
  const [copied, setCopied] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)

  const buildQuery = (template) => template.replace(/\{target\}/g, target || 'TARGET')

  const copyDork = (dork) => {
    const q = buildQuery(dork.query)
    navigator.clipboard.writeText(q)
    setCopied(dork.label)
    setTimeout(() => setCopied(''), 2000)
  }

  const openGoogle = (dork) => {
    const q = encodeURIComponent(buildQuery(dork.query))
    window.open(`https://www.google.com/search?q=${q}`, '_blank', 'noopener')
  }

  return (
    <ToolPanel title="Google Dorks — Generador OSINT" color="text-lime-400" icon={FileSearch}
      desc="Genera consultas avanzadas de Google Dorking para encontrar información expuesta. 100% gratis, sin API key.">
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input className="input-dark pl-9" placeholder="dominio.com o nombre empresa"
              value={target} onChange={e => setTarget(e.target.value)} />
          </div>
          {target && (
            <span className="flex items-center px-3 text-lime-400 text-sm bg-lime-900/20 border border-lime-700/30 rounded-xl">
              Target: {target}
            </span>
          )}
        </div>

        <div className="p-3 bg-lime-900/10 border border-lime-700/20 rounded-lg text-xs text-gray-400">
          Escribe el dominio/empresa objetivo arriba y haz clic en <strong className="text-lime-400">Abrir</strong> para buscar directamente en Google, o en <strong className="text-lime-400">Copiar</strong> para usar en otro buscador.
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setActiveCategory(null)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${!activeCategory ? 'bg-surface border-surface-border text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            Todas
          </button>
          {DORK_TEMPLATES.map(cat => (
            <button key={cat.category} onClick={() => setActiveCategory(cat.category)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${activeCategory === cat.category ? 'bg-surface border-surface-border text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              {cat.category}
            </button>
          ))}
        </div>

        {/* Dorks by category */}
        <div className="space-y-4">
          {DORK_TEMPLATES.filter(c => !activeCategory || c.category === activeCategory).map(cat => (
            <div key={cat.category}>
              <p className={`text-xs font-bold mb-2 ${cat.color}`}>{cat.category}</p>
              <div className="space-y-1.5">
                {cat.dorks.map((dork, i) => (
                  <div key={i} className="group flex items-center gap-2 p-2.5 bg-surface-light hover:bg-surface rounded-xl border border-transparent hover:border-surface-border transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium mb-0.5">{dork.label}</p>
                      <code className="text-gray-500 text-xs truncate block">{buildQuery(dork.query)}</code>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => copyDork(dork)}
                        className={`p-1.5 rounded-lg border transition-all text-xs ${copied === dork.label ? 'border-lime-600 text-lime-400 bg-lime-900/20' : 'border-surface-border text-gray-500 hover:text-white hover:border-gray-500'}`}
                        title="Copiar dork">
                        <Copy size={12} />
                      </button>
                      <button onClick={() => openGoogle(dork)}
                        className="p-1.5 rounded-lg border border-surface-border text-gray-500 hover:text-lime-400 hover:border-lime-700/50 transition-all"
                        title="Abrir en Google">
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToolPanel>
  )
}

/* ── Shared components ──────────────────────────────────────── */
function ToolPanel({ title, color, icon: Icon, desc, children }) {
  return (
    <div className="space-y-4">
      <div className="card border-surface-border/60">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={16} className={color} />
          <span className={`font-bold ${color}`}>{title}</span>
        </div>
        <p className="text-gray-500 text-xs mb-4">{desc}</p>
        {children}
      </div>
    </div>
  )
}

function SearchBar({ query, setQuery, loading, onRun, placeholder, types, type, setType }) {
  return (
    <div className="space-y-3">
      {types && types.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {types.map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                type === t.id
                  ? 'bg-crimson/20 border-crimson/50 text-crimson'
                  : 'border-surface-border text-gray-500 hover:text-gray-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input-dark pl-9" placeholder={placeholder}
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onRun()} />
        </div>
        <button className="btn-primary" onClick={onRun} disabled={loading || !query.trim()}>
          {loading ? <Spinner size={14} /> : <Search size={14} />}
          {loading ? 'Consultando...' : 'Buscar'}
        </button>
      </div>
    </div>
  )
}

function ErrorBox({ msg }) {
  return (
    <div className="p-3 bg-red-900/20 rounded-lg border border-red-700/30 flex gap-2">
      <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
      <p className="text-red-300 text-sm">{msg}</p>
    </div>
  )
}

function LoadingBox({ text }) {
  return (
    <div className="card flex items-center gap-3 py-8 justify-center">
      <Spinner size={20} />
      <span className="text-gray-400 text-sm">{text}</span>
    </div>
  )
}

function KV({ label, value, mono = false }) {
  if (!value) return null
  return (
    <div className="flex gap-2 py-1 border-b border-surface-border/30 last:border-0">
      <span className="text-gray-500 text-xs w-28 shrink-0">{label}</span>
      <span className={`text-xs flex-1 ${mono ? 'font-mono text-green-400' : 'text-gray-200'}`}>{String(value)}</span>
    </div>
  )
}
