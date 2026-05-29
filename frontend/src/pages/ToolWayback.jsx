import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { tools } from '../api/client'
import { Search, Clock, AlertCircle, Loader2, ExternalLink } from 'lucide-react'

const COLOR = '#a78bfa'

export default function ToolWayback() {
  const [mode,     setMode]     = useState('snapshots')
  const [input,    setInput]    = useState('')
  const [limit,    setLimit]    = useState(20)
  const [fromYear, setFromYear] = useState('')
  const [toYear,   setToYear]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState('')

  const run = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      let data
      if (mode === 'check')    data = await tools.waybackCheck(input.trim())
      else if (mode === 'timeline') data = await tools.waybackTimeline(input.trim())
      else data = await tools.waybackSnapshots(input.trim(), limit, fromYear||undefined, toYear||undefined)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error')
    } finally { setLoading(false) }
  }

  const modes = [
    { id:'snapshots', label:'Snapshots',  ph:'https://example.com' },
    { id:'check',     label:'Disponibilidad', ph:'https://example.com' },
    { id:'timeline',  label:'Timeline',   ph:'https://example.com' },
  ]

  return (
    <ToolShell icon="⏱️" name="Wayback Machine" color={COLOR} badge="Historial de páginas web archivadas · archive.org">
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:6, marginBottom:16 }}>
          {modes.map(m=>(
            <button key={m.id} onClick={()=>setMode(m.id)} style={{
              padding:'7px 14px', borderRadius:8, fontSize:12, cursor:'pointer', transition:'all .15s',
              background: mode===m.id ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)',
              border: mode===m.id ? '1px solid rgba(167,139,250,0.45)' : '1px solid rgba(255,255,255,0.08)',
              color: mode===m.id ? COLOR : 'rgba(255,255,255,0.5)',
              fontWeight: mode===m.id ? 600 : 400,
            }}>{m.label}</button>
          ))}
        </div>

        <form onSubmit={run}>
          <div style={{ display:'flex', gap:8, marginBottom: mode==='snapshots' ? 12 : 28 }}>
            <input
              value={input} onChange={e=>setInput(e.target.value)}
              placeholder={modes.find(m=>m.id===mode)?.ph}
              style={{
                flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(167,139,250,0.2)',
                color:'#fff', padding:'11px 16px', borderRadius:10, fontSize:14, outline:'none',
              }}
              onFocus={e=>e.target.style.borderColor='rgba(167,139,250,0.55)'}
              onBlur={e=>e.target.style.borderColor='rgba(167,139,250,0.2)'}
            />
            <button type="submit" disabled={!input.trim()||loading} style={{
              padding:'11px 22px', borderRadius:10, cursor:'pointer',
              background:'rgba(167,139,250,0.18)', border:'1px solid rgba(167,139,250,0.4)',
              color:COLOR, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:7,
            }}>
              {loading ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Search size={14}/>}
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {mode==='snapshots' && (
            <div style={{ display:'flex', gap:8, marginBottom:28 }}>
              <input value={fromYear} onChange={e=>setFromYear(e.target.value)} placeholder="Desde año (ej: 2010)"
                style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'8px 12px', borderRadius:8, fontSize:13, outline:'none' }}/>
              <input value={toYear} onChange={e=>setToYear(e.target.value)} placeholder="Hasta año (ej: 2024)"
                style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'8px 12px', borderRadius:8, fontSize:13, outline:'none' }}/>
              <select value={limit} onChange={e=>setLimit(+e.target.value)} style={{
                background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                color:'rgba(255,255,255,0.6)', padding:'0 10px', borderRadius:8, fontSize:12,
              }}>
                {[10,20,50,100].map(n=><option key={n} value={n}>{n} snapshots</option>)}
              </select>
            </div>
          )}
        </form>

        {error && (
          <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginBottom:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        {result && <WaybackResult data={result} mode={mode} />}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}

function WaybackResult({ data, mode }) {
  if (data?.error) return <div style={{ padding:16, borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>{data.error}</div>

  if (mode === 'check') {
    const avail = data.available
    return (
      <div style={{
        padding:'20px 24px', borderRadius:12,
        background:`rgba(${avail?'16,185,129':'239,68,68'},0.08)`,
        border:`1px solid rgba(${avail?'16,185,129':'239,68,68'},0.25)`,
      }}>
        <div style={{ color: avail?'#10b981':'#ef4444', fontWeight:700, fontSize:16 }}>
          {avail ? '✓ URL archivada disponible' : '✗ URL no encontrada en el archivo'}
        </div>
        {data.url && (
          <a href={data.url} target="_blank" rel="noopener noreferrer" style={{
            display:'inline-flex', alignItems:'center', gap:6, marginTop:12,
            color:COLOR, fontSize:12, textDecoration:'none',
          }}>
            <ExternalLink size={12}/> Ver en Wayback Machine
          </a>
        )}
        {data.timestamp && <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginTop:6 }}>Última captura: {data.timestamp}</div>}
      </div>
    )
  }

  if (mode === 'timeline') {
    const years = data.years || {}
    return (
      <div>
        <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginBottom:12 }}>
          Capturas por año — Total: {data.total_snapshots || 0}
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {Object.entries(years).sort().map(([year, count])=>(
            <div key={year} style={{
              padding:'10px 16px', borderRadius:10, textAlign:'center',
              background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)',
            }}>
              <div style={{ color:COLOR, fontWeight:700, fontSize:16, fontFamily:'monospace' }}>{count}</div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>{year}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Snapshots
  const snaps = data.snapshots || data.results || []
  return (
    <div>
      <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginBottom:12 }}>{snaps.length} snapshots</div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {snaps.map((s,i) => {
          const ts  = s.timestamp || s.datetime
          const url = s.url || `https://web.archive.org/web/${ts}/${s.original||''}`
          const date = ts ? new Date(ts.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,'$1-$2-$3T$4:$5:$6Z')) : null
          return (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:8,
              background:'rgba(167,139,250,0.05)', border:'1px solid rgba(167,139,250,0.12)',
              transition:'background .15s',
            }}>
              <Clock size={13} style={{ color:COLOR, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ color:'#fff', fontSize:12, fontFamily:'monospace' }}>
                  {date ? date.toLocaleString('es-ES') : ts}
                </div>
                {s.mimetype && <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10 }}>{s.mimetype} · {s.length ? `${Math.round(s.length/1024)}KB` : ''}</div>}
              </div>
              <a href={url} target="_blank" rel="noopener noreferrer" style={{
                display:'flex', alignItems:'center', gap:4, color:COLOR, fontSize:11, textDecoration:'none',
                padding:'4px 8px', borderRadius:6, background:'rgba(167,139,250,0.1)',
              }}>
                <ExternalLink size={11}/> Ver
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
