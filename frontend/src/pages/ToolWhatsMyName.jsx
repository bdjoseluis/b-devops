import { useState, useRef } from 'react'
import ToolShell from '../components/ToolShell'
import { tools } from '../api/client'
import { Search, Loader2, AlertCircle, CheckCircle, XCircle, Globe, User, Filter, Download } from 'lucide-react'

const COLOR = '#a855f7'

const CATEGORY_COLORS = {
  social: '#3b82f6', gaming: '#10b981', music: '#f59e0b',
  coding: '#06b6d4', shopping: '#ec4899', porn: '#6b7280',
  finance: '#22d3ee', images: '#8b5cf6', sport: '#f97316',
  dating: '#ef4444', forums: '#a78bfa', other: '#94a3b8',
}

export default function ToolWhatsMyName() {
  const [username, setUsername]   = useState('')
  const [loading,  setLoading]    = useState(false)
  const [result,   setResult]     = useState(null)
  const [error,    setError]      = useState('')
  const [filter,   setFilter]     = useState('found') // found | all | notfound
  const [catFilter,setCatFilter]  = useState('all')
  const [limit,    setLimit]      = useState(150)
  const inputRef = useRef(null)

  const run = async (e) => {
    e?.preventDefault()
    const u = username.trim()
    if (!u || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      const data = await tools.whatsmyname(u, null, limit)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al buscar. Puede tardar — intenta de nuevo.')
    } finally { setLoading(false) }
  }

  const found = result?.found || []
  const notFound = result?.not_found || []
  const categories = [...new Set(found.map(s => s.category || 'other'))]

  const filtered = (filter === 'found' ? found : filter === 'notfound' ? notFound : [...found, ...notFound])
    .filter(s => catFilter === 'all' || (s.category || 'other') === catFilter)

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ username, found, total: found.length }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `wmn_${username}.json`; a.click()
  }

  return (
    <ToolShell icon="👤" name="WhatsMyName" color={COLOR} badge="Presencia en redes sociales · 500+ sitios">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        <form onSubmit={run} style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <User size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }}/>
            <input
              ref={inputRef}
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Nombre de usuario a buscar..."
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', color: '#fff', padding: '12px 14px 12px 40px', borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'monospace' }}
              onFocus={e => e.target.style.borderColor = 'rgba(168,85,247,0.7)'}
              onBlur={e => e.target.style.borderColor = 'rgba(168,85,247,0.3)'}
            />
          </div>
          <select value={limit} onChange={e => setLimit(+e.target.value)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', padding: '0 12px', borderRadius: 10, fontSize: 12, cursor: 'pointer' }}>
            <option value={50}>50 sitios</option>
            <option value={150}>150 sitios</option>
            <option value={300}>300 sitios</option>
            <option value={500}>500 sitios</option>
          </select>
          <button type="submit" disabled={!username.trim() || loading} style={{ padding: '12px 24px', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(168,85,247,0.18)', border: '1px solid rgba(168,85,247,0.45)', color: COLOR, fontWeight: 700, fontSize: 13 }}>
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }}/> : <Search size={14}/>}
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: COLOR, margin: '0 auto 16px', display: 'block' }}/>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Escaneando {limit} plataformas... esto puede tomar 1-2 minutos</div>
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 8, fontFamily: 'monospace' }}>Twitter · Instagram · Reddit · TikTok · LinkedIn · GitHub · Twitch · Steam · ...</div>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13 }}>
            <AlertCircle size={14}/>{error}
          </div>
        )}

        {result && !loading && (
          <>
            {/* Summary bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Encontradas', value: found.length, color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
                { label: 'No encontradas', value: notFound.length, color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
                { label: 'Total escaneado', value: found.length + notFound.length, color: COLOR, bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
                { label: 'Categorías', value: categories.length, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '14px 18px' }}>
                  <div style={{ color: s.color, fontSize: 26, fontWeight: 800, fontFamily: 'monospace' }}>{s.value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
              {['found','all','notfound'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: filter === f ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)', border: filter === f ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.08)', color: filter === f ? '#d8b4fe' : 'rgba(255,255,255,0.4)' }}>
                  {f === 'found' ? `✅ Encontradas (${found.length})` : f === 'notfound' ? `❌ No encontradas` : `🔍 Todas`}
                </button>
              ))}
              <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }}/>
              <Filter size={11} style={{ color: 'rgba(255,255,255,0.3)' }}/>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '4px 10px', borderRadius: 7, fontSize: 11, cursor: 'pointer' }}>
                <option value="all">Todas las categorías</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={exportJSON} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 11 }}>
                <Download size={11}/> Exportar JSON
              </button>
            </div>

            {/* Results grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
              {filtered.map((site, i) => {
                const isFound = found.includes(site)
                const catColor = CATEGORY_COLORS[site.category] || '#94a3b8'
                return (
                  <div key={i} style={{ background: isFound ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.025)', border: `1px solid ${isFound ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}
                    onMouseEnter={e => e.currentTarget.style.background = isFound ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = isFound ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.025)'}
                  >
                    {isFound ? <CheckCircle size={14} style={{ color: '#10b981', flexShrink: 0 }}/> : <XCircle size={14} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}/>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: isFound ? '#fff' : 'rgba(255,255,255,0.35)', fontWeight: isFound ? 600 : 400, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {site.site_name || site.name}
                      </div>
                      <div style={{ color: catColor, fontSize: 10, marginTop: 1, opacity: 0.8 }}>{site.category || 'other'}</div>
                    </div>
                    {isFound && site.url && (
                      <a href={site.url} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0, display: 'flex' }}>
                        <Globe size={12}/>
                      </a>
                    )}
                  </div>
                )
              })}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                No hay resultados para el filtro seleccionado
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}
