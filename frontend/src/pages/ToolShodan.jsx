import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { scan } from '../api/client'
import { Search, Server, Globe, Tag, AlertCircle, Loader2, ShieldAlert } from 'lucide-react'

const COLOR = '#06b6d4'

export default function ToolShodan() {
  const [mode,    setMode]    = useState('ip')
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
      const data = await scan.shodan(input.trim(), mode, limit)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error en la búsqueda')
    } finally { setLoading(false) }
  }

  const modes = [
    { id:'ip',     label:'IP',      ph:'8.8.8.8' },
    { id:'domain', label:'Dominio', ph:'google.com' },
    { id:'search', label:'Search',  ph:'port:22 country:ES' },
  ]

  return (
    <ToolShell icon="📡" name="Shodan" color={COLOR} badge="Buscador de dispositivos conectados">
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {modes.map(m => (
            <button key={m.id} onClick={()=>setMode(m.id)} style={{
              padding:'7px 14px', borderRadius:8, fontSize:12, cursor:'pointer', transition:'all .15s',
              background: mode===m.id ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.05)',
              border: mode===m.id ? '1px solid rgba(6,182,212,0.45)' : '1px solid rgba(255,255,255,0.08)',
              color: mode===m.id ? COLOR : 'rgba(255,255,255,0.5)',
              fontWeight: mode===m.id ? 600 : 400,
            }}>{m.label}</button>
          ))}
          {mode==='search' && (
            <select value={limit} onChange={e=>setLimit(+e.target.value)} style={{
              marginLeft:'auto', background:'rgba(255,255,255,0.06)',
              border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)',
              padding:'0 10px', borderRadius:8, fontSize:12,
            }}>
              {[5,10,25,50].map(n=><option key={n} value={n}>{n} resultados</option>)}
            </select>
          )}
        </div>

        <form onSubmit={run} style={{ display:'flex', gap:8, marginBottom:28 }}>
          <input
            value={input} onChange={e=>setInput(e.target.value)}
            placeholder={modes.find(m=>m.id===mode)?.ph}
            style={{
              flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(6,182,212,0.2)',
              color:'#fff', padding:'11px 16px', borderRadius:10, fontSize:14, outline:'none',
            }}
            onFocus={e=>e.target.style.borderColor='rgba(6,182,212,0.55)'}
            onBlur={e=>e.target.style.borderColor='rgba(6,182,212,0.2)'}
          />
          <button type="submit" disabled={!input.trim()||loading} style={{
            padding:'11px 22px', borderRadius:10, cursor:'pointer',
            background: 'rgba(6,182,212,0.18)', border:'1px solid rgba(6,182,212,0.4)',
            color:COLOR, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:7,
          }}>
            {loading ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Search size={14}/>}
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {error && (
          <div style={{
            display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginBottom:20,
            background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13,
          }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        {result && <ShodanResult data={result} mode={mode} />}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}

function ShodanResult({ data, mode }) {
  const [tab, setTab] = useState('overview')

  if (data?.error || data?.detail) {
    return (
      <div style={{ padding:'16px', borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>
        {data.error || data.detail}
      </div>
    )
  }

  const ip_str = data.ip_str || data.ip
  const ports  = data.ports || data.data?.map?.(d=>d.port) || []
  const vulns  = data.vulns || {}
  const hostnames = data.hostnames || []
  const org    = data.org || data.isp
  const country = data.country_name
  const matches = data.matches || data.results || []

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {['overview','ports','raw'].map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:'5px 12px', borderRadius:6, fontSize:11, cursor:'pointer',
            background: tab===t ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)',
            border: tab===t ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.07)',
            color: tab===t ? COLOR : 'rgba(255,255,255,0.45)',
            textTransform:'uppercase', letterSpacing:'0.06em',
          }}>{t}</button>
        ))}
      </div>

      {tab==='overview' && (
        <div>
          {mode==='search' && matches.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ color:'rgba(255,255,255,0.35)', fontSize:11, marginBottom:4 }}>{matches.length} hosts encontrados</div>
              {matches.map((h,i) => (
                <div key={i} style={{
                  background:'rgba(6,182,212,0.05)', border:'1px solid rgba(6,182,212,0.15)',
                  borderRadius:10, padding:'12px 16px',
                }}>
                  <div style={{ color:'#fff', fontWeight:700, fontSize:13, fontFamily:'monospace' }}>{h.ip_str || h.ip}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
                    {(h.ports||[]).map(p=>(
                      <span key={p} style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:'rgba(6,182,212,0.15)', color:COLOR, fontFamily:'monospace' }}>:{p}</span>
                    ))}
                  </div>
                  {h.org && <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginTop:4 }}>{h.org} — {h.country_name}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {ip_str && <InfoCard label="IP" value={ip_str}/>}
              {org     && <InfoCard label="Organización" value={org}/>}
              {country && <InfoCard label="País" value={country}/>}
              {hostnames.length>0 && <InfoCard label="Hostnames" value={hostnames.slice(0,3).join(', ')}/>}
              {Object.keys(vulns).length > 0 && (
                <div style={{
                  gridColumn:'1/-1', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)',
                  borderRadius:10, padding:14,
                }}>
                  <div style={{ color:'#f87171', fontSize:11, fontWeight:600, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.1em' }}>
                    ⚠ Vulnerabilidades ({Object.keys(vulns).length})
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {Object.keys(vulns).map(v=>(
                      <span key={v} style={{ padding:'3px 7px', borderRadius:5, background:'rgba(239,68,68,0.15)', color:'#fca5a5', fontSize:11, fontFamily:'monospace' }}>{v}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab==='ports' && (
        <div style={{ background:'rgba(6,182,212,0.05)', border:'1px solid rgba(6,182,212,0.15)', borderRadius:10, padding:16 }}>
          <div style={{ color:COLOR, fontSize:11, fontWeight:600, marginBottom:10, textTransform:'uppercase', letterSpacing:'0.1em' }}>
            Puertos Abiertos ({ports.length})
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {ports.map(p=>(
              <span key={p} style={{ padding:'6px 12px', borderRadius:7, background:'rgba(6,182,212,0.12)', border:'1px solid rgba(6,182,212,0.25)', color:COLOR, fontSize:13, fontFamily:'monospace', fontWeight:600 }}>
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {tab==='raw' && (
        <pre style={{
          background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:10, padding:16, color:'rgba(255,255,255,0.7)', fontSize:11,
          overflowX:'auto', lineHeight:1.6, maxHeight:600, overflowY:'auto', whiteSpace:'pre-wrap',
        }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}

function InfoCard({ label, value }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px' }}>
      <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{label}</div>
      <div style={{ color:'#fff', fontSize:13, fontFamily:'monospace' }}>{value}</div>
    </div>
  )
}
