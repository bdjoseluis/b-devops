import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { tools } from '../api/client'
import { Search, Server, Globe, Shield, AlertCircle, Loader2 } from 'lucide-react'

const COLOR = '#22d3ee'

export default function ToolCensys() {
  const [mode,    setMode]    = useState('domain') // domain | ip | query
  const [input,   setInput]   = useState('')
  const [limit,   setLimit]   = useState(10)
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const run = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      let data
      if (mode === 'ip')     data = await tools.censysIp(input.trim())
      else if (mode === 'query') data = await tools.censysSearch(input.trim(), limit)
      else                   data = await tools.censysDomain(input.trim())
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error en la búsqueda')
    } finally { setLoading(false) }
  }

  const modes = [
    { id: 'domain', label: 'Dominio', icon: <Globe size={13} />, ph: 'ejemplo.com' },
    { id: 'ip',     label: 'IP',      icon: <Server size={13} />, ph: '8.8.8.8' },
    { id: 'query',  label: 'Query',   icon: <Search size={13} />, ph: 'services.port:443 AND ip:8.8.8.0/24' },
  ]

  return (
    <ToolShell icon="🔭" name="Censys" color={COLOR} badge="Escaneo masivo · Certificados SSL">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Mode selector */}
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {modes.map(m => (
            <button key={m.id} onClick={()=>setMode(m.id)} style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'7px 14px', borderRadius:8, fontSize:12, cursor:'pointer',
              transition:'all .15s',
              background: mode===m.id ? `rgba(34,211,238,0.15)` : 'rgba(255,255,255,0.05)',
              border: mode===m.id ? `1px solid rgba(34,211,238,0.45)` : '1px solid rgba(255,255,255,0.08)',
              color: mode===m.id ? COLOR : 'rgba(255,255,255,0.5)',
              fontWeight: mode===m.id ? 600 : 400,
            }}>
              {m.icon} {m.label}
            </button>
          ))}
          {mode==='query' && (
            <select value={limit} onChange={e=>setLimit(+e.target.value)} style={{
              marginLeft:'auto', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
              color:'rgba(255,255,255,0.6)', padding:'0 10px', borderRadius:8, fontSize:12,
            }}>
              {[5,10,25,50].map(n=><option key={n} value={n}>{n} resultados</option>)}
            </select>
          )}
        </div>

        {/* Search form */}
        <form onSubmit={run} style={{ display:'flex', gap:8, marginBottom:28 }}>
          <input
            value={input} onChange={e=>setInput(e.target.value)}
            placeholder={modes.find(m=>m.id===mode)?.ph}
            style={{
              flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(34,211,238,0.2)',
              color:'#fff', padding:'11px 16px', borderRadius:10, fontSize:14,
              outline:'none', transition:'border .15s',
            }}
            onFocus={e=>e.target.style.borderColor='rgba(34,211,238,0.55)'}
            onBlur={e=>e.target.style.borderColor='rgba(34,211,238,0.2)'}
          />
          <button type="submit" disabled={!input.trim()||loading} style={{
            padding:'11px 22px', borderRadius:10, cursor:'pointer',
            background: loading ? 'rgba(34,211,238,0.1)' : 'rgba(34,211,238,0.18)',
            border:`1px solid rgba(34,211,238,${loading?0.2:0.4})`,
            color: COLOR, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:7,
            transition:'all .15s',
          }}>
            {loading ? <Loader2 size={14} className="animate-spin" style={{animation:'spin 1s linear infinite'}}/> : <Search size={14}/>}
            {loading ? 'Escaneando...' : 'Buscar'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div style={{
            display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:10,
            background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
            color:'#fca5a5', fontSize:13, marginBottom:20,
          }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        {/* Results */}
        {result && <CensysResult data={result} mode={mode} color={COLOR} />}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}

function CensysResult({ data, mode, color }) {
  const [tab, setTab] = useState('overview')

  if (!data || data.error) {
    return (
      <div style={{
        padding:'16px 20px', borderRadius:12, background:'rgba(239,68,68,0.08)',
        border:'1px solid rgba(239,68,68,0.25)', color:'#fca5a5', fontSize:13,
      }}>
        {data?.error || 'Sin resultados'}
      </div>
    )
  }

  const tabs = ['overview', 'raw']

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {tabs.map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:'5px 12px', borderRadius:6, fontSize:11, cursor:'pointer',
            background: tab===t ? `rgba(34,211,238,0.15)` : 'rgba(255,255,255,0.04)',
            border: tab===t ? `1px solid rgba(34,211,238,0.4)` : '1px solid rgba(255,255,255,0.07)',
            color: tab===t ? color : 'rgba(255,255,255,0.45)',
            textTransform:'uppercase', letterSpacing:'0.06em',
          }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && <CensysOverview data={data} mode={mode} color={color} />}
      {tab === 'raw' && (
        <pre style={{
          background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:10, padding:16, color:'rgba(255,255,255,0.7)', fontSize:11,
          overflowX:'auto', lineHeight:1.6, maxHeight:600, overflowY:'auto',
          whiteSpace:'pre-wrap',
        }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}

function CensysOverview({ data, mode, color }) {
  const ip   = data.ip || data.result?.ip
  const locs = data.location || data.result?.location
  const svcs = data.services || data.result?.services || []
  const hits = data.hits || data.results || []

  if (mode === 'query' && hits.length > 0) {
    return (
      <div>
        <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginBottom:12 }}>
          {hits.length} resultado(s)
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {hits.map((h, i) => (
            <div key={i} style={{
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:10, padding:'12px 16px',
            }}>
              <div style={{ color:'#fff', fontWeight:600, fontSize:13, fontFamily:'monospace' }}>
                {h.ip || h.domain || h.name || JSON.stringify(h).slice(0,80)}
              </div>
              {h.location && (
                <div style={{ color:'rgba(255,255,255,0.45)', fontSize:11, marginTop:4 }}>
                  {[h.location.country, h.location.city].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
      {ip && <InfoCard label="IP" value={ip} color={color}/>}
      {locs?.country && <InfoCard label="País" value={`${locs.country} — ${locs.city||''}`} color={color}/>}
      {locs?.asn && <InfoCard label="ASN" value={locs.asn} color={color}/>}
      {locs?.organization && <InfoCard label="Organización" value={locs.organization} color={color}/>}
      {svcs.length > 0 && (
        <div style={{ gridColumn:'1/-1',
          background:'rgba(34,211,238,0.05)', border:'1px solid rgba(34,211,238,0.15)',
          borderRadius:10, padding:14,
        }}>
          <div style={{ color:color, fontSize:11, fontWeight:600, marginBottom:10, textTransform:'uppercase', letterSpacing:'0.1em' }}>
            Servicios ({svcs.length})
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {svcs.map((s,i) => (
              <span key={i} style={{
                padding:'3px 8px', borderRadius:5,
                background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.2)',
                color:color, fontSize:11, fontFamily:'monospace',
              }}>
                :{s.port} {s.service_name || s.transport_protocol}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoCard({ label, value, color }) {
  return (
    <div style={{
      background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
      borderRadius:10, padding:'12px 16px',
    }}>
      <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{label}</div>
      <div style={{ color:'#fff', fontSize:13, fontFamily:'monospace' }}>{value}</div>
    </div>
  )
}
