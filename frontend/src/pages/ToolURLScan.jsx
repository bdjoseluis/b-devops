import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { tools } from '../api/client'
import { Search, Globe, AlertCircle, Loader2, Eye, Clock, Shield } from 'lucide-react'

const COLOR = '#06b6d4'

export default function ToolURLScan() {
  const [mode,       setMode]       = useState('scan')
  const [input,      setInput]      = useState('')
  const [visibility, setVisibility] = useState('unlisted')
  const [loading,    setLoading]    = useState(false)
  const [result,     setResult]     = useState(null)
  const [error,      setError]      = useState('')

  const run = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      let data
      if (mode === 'scan')   data = await tools.urlscanScan(input.trim(), visibility)
      else if (mode === 'domain') data = await tools.urlscanSearchDomain(input.trim())
      else                   data = await tools.urlscanSearchIp(input.trim())
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error en el escaneo')
    } finally { setLoading(false) }
  }

  const modes = [
    { id:'scan',   label:'Escanear URL',   ph:'https://example.com' },
    { id:'domain', label:'Historial dominio', ph:'example.com' },
    { id:'ip',     label:'Historial IP',   ph:'8.8.8.8' },
  ]

  return (
    <ToolShell icon="🌐" name="URLScan.io" color={COLOR} badge="Escáner de páginas web · Capturas · Análisis DOM">
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:6, marginBottom:16 }}>
          {modes.map(m=>(
            <button key={m.id} onClick={()=>setMode(m.id)} style={{
              padding:'7px 14px', borderRadius:8, fontSize:12, cursor:'pointer', transition:'all .15s',
              background: mode===m.id ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.05)',
              border: mode===m.id ? '1px solid rgba(6,182,212,0.45)' : '1px solid rgba(255,255,255,0.08)',
              color: mode===m.id ? COLOR : 'rgba(255,255,255,0.5)',
              fontWeight: mode===m.id ? 600 : 400,
            }}>{m.label}</button>
          ))}
          {mode==='scan' && (
            <select value={visibility} onChange={e=>setVisibility(e.target.value)} style={{
              marginLeft:'auto', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
              color:'rgba(255,255,255,0.6)', padding:'0 10px', borderRadius:8, fontSize:12,
            }}>
              <option value="unlisted">🔒 Unlisted</option>
              <option value="public">🌍 Public</option>
              <option value="private">🔐 Private</option>
            </select>
          )}
        </div>

        {mode==='scan' && (
          <div style={{
            display:'flex', gap:8, padding:'10px 14px', borderRadius:8, marginBottom:16,
            background:'rgba(6,182,212,0.06)', border:'1px solid rgba(6,182,212,0.15)',
            color:'rgba(255,255,255,0.45)', fontSize:11,
          }}>
            <Clock size={13} style={{ color:COLOR, flexShrink:0, marginTop:1 }}/>
            El escaneo puede tardar 15–30 segundos. Toma screenshot, analiza el DOM, requests de red y más.
          </div>
        )}

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
            background:'rgba(6,182,212,0.18)', border:'1px solid rgba(6,182,212,0.4)',
            color:COLOR, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:7,
          }}>
            {loading ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Search size={14}/>}
            {loading ? 'Escaneando...' : 'Escanear'}
          </button>
        </form>

        {error && (
          <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginBottom:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        {result && <URLScanResult data={result} mode={mode} />}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}

function URLScanResult({ data, mode }) {
  const [tab, setTab] = useState('overview')

  if (data?.error) return <div style={{ padding:16, borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>{data.error}</div>

  // Scan result
  const screenshot = data.screenshot || data.task?.screenshotURL
  const url       = data.page?.url || data.task?.url
  const ip        = data.page?.ip
  const domain    = data.page?.domain
  const country   = data.page?.country
  const verdict   = data.verdicts?.overall
  const malicious = verdict?.malicious
  const lists     = data.lists || {}
  const results   = data.results || []  // for search mode

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {['overview','screenshot','raw'].map(t=>(
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
        mode !== 'scan' && results.length > 0 ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ color:'rgba(255,255,255,0.35)', fontSize:11, marginBottom:4 }}>{results.length} resultados</div>
            {results.map((r,i)=>(
              <div key={i} style={{ background:'rgba(6,182,212,0.05)', border:'1px solid rgba(6,182,212,0.15)', borderRadius:10, padding:'12px 16px' }}>
                <div style={{ color:COLOR, fontSize:12, fontFamily:'monospace', marginBottom:4 }}>{r.task?.url || r.page?.url}</div>
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>
                  {r.page?.country} — {r.page?.ip} — {new Date(r.task?.time).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {url     && <InfoCard label="URL escaneada" value={url.slice(0,60)+'...'}/>}
            {domain  && <InfoCard label="Dominio" value={domain}/>}
            {ip      && <InfoCard label="IP" value={ip}/>}
            {country && <InfoCard label="País" value={country}/>}
            {verdict && (
              <div style={{
                gridColumn:'1/-1', padding:'12px 16px', borderRadius:10,
                background:`rgba(${malicious?'239,68,68':'16,185,129'},0.08)`,
                border:`1px solid rgba(${malicious?'239,68,68':'16,185,129'},0.25)`,
              }}>
                <div style={{ color: malicious?'#ef4444':'#10b981', fontWeight:700, fontSize:14 }}>
                  {malicious ? '⚠ Sitio marcado como malicioso' : '✓ Sitio limpio'}
                </div>
                {verdict.categories?.length>0 && (
                  <div style={{ color:'rgba(255,255,255,0.45)', fontSize:11, marginTop:4 }}>
                    Categorías: {verdict.categories.join(', ')}
                  </div>
                )}
              </div>
            )}
            {lists.domains?.length>0 && (
              <div style={{ gridColumn:'1/-1', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:14 }}>
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginBottom:8 }}>Dominios contactados ({lists.domains.length})</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {lists.domains.slice(0,15).map(d=>(
                    <span key={d} style={{ padding:'2px 7px', borderRadius:4, background:'rgba(6,182,212,0.1)', color:COLOR, fontSize:10, fontFamily:'monospace' }}>{d}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {tab==='screenshot' && screenshot && (
        <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid rgba(6,182,212,0.2)' }}>
          <img src={screenshot} alt="Screenshot" style={{ width:'100%', display:'block' }}/>
        </div>
      )}
      {tab==='screenshot' && !screenshot && (
        <div style={{ padding:32, textAlign:'center', color:'rgba(255,255,255,0.3)', fontSize:13 }}>
          Sin screenshot disponible
        </div>
      )}

      {tab==='raw' && (
        <pre style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:16, color:'rgba(255,255,255,0.7)', fontSize:11, overflowX:'auto', lineHeight:1.6, maxHeight:600, overflowY:'auto', whiteSpace:'pre-wrap' }}>
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
      <div style={{ color:'#fff', fontSize:13, fontFamily:'monospace', wordBreak:'break-all' }}>{value}</div>
    </div>
  )
}
