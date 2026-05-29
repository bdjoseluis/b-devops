import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { osint } from '../api/client'
import { Search, AlertCircle, Loader2, CheckCircle, XCircle, ShieldAlert } from 'lucide-react'

const COLOR = '#f97316'

export default function ToolVirusTotal() {
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const run = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      const data = await osint.analyze(input.trim(), ['virustotal'])
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error en el análisis')
    } finally { setLoading(false) }
  }

  return (
    <ToolShell icon="🦠" name="VirusTotal" color={COLOR} badge="Análisis de URLs · IPs · Dominios · Hashes">
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{
          display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginBottom:20,
          background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.2)',
          color:'rgba(255,255,255,0.55)', fontSize:12,
        }}>
          <ShieldAlert size={14} style={{ color:COLOR, flexShrink:0, marginTop:1 }}/>
          <div>Soporta: dominios, IPs, URLs y hashes MD5/SHA1/SHA256. El análisis se realiza a través de la API de VirusTotal.</div>
        </div>

        <form onSubmit={run} style={{ display:'flex', gap:8, marginBottom:28 }}>
          <input
            value={input} onChange={e=>setInput(e.target.value)}
            placeholder="dominio.com / 8.8.8.8 / https://... / d41d8cd98f00b204..."
            style={{
              flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(249,115,22,0.2)',
              color:'#fff', padding:'11px 16px', borderRadius:10, fontSize:14, outline:'none',
            }}
            onFocus={e=>e.target.style.borderColor='rgba(249,115,22,0.55)'}
            onBlur={e=>e.target.style.borderColor='rgba(249,115,22,0.2)'}
          />
          <button type="submit" disabled={!input.trim()||loading} style={{
            padding:'11px 22px', borderRadius:10, cursor:'pointer',
            background:'rgba(249,115,22,0.18)', border:'1px solid rgba(249,115,22,0.4)',
            color:COLOR, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:7,
          }}>
            {loading ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Search size={14}/>}
            {loading ? 'Analizando...' : 'Analizar'}
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

        {result && <VTResult data={result} />}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}

function VTResult({ data }) {
  const [tab, setTab] = useState('overview')
  const vt = data.virustotal || data

  if (!vt || vt.error) {
    return (
      <div style={{ padding:'16px', borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>
        {vt?.error || 'Sin datos de VirusTotal. Verifica tu API key en Configuración.'}
      </div>
    )
  }

  const stats    = vt.last_analysis_stats || vt.data?.attributes?.last_analysis_stats || {}
  const malicious = stats.malicious || 0
  const total    = Object.values(stats).reduce((a,b)=>a+(b||0), 0) || 1
  const pct      = Math.round((malicious/total)*100)
  const scanResults = vt.last_analysis_results || vt.data?.attributes?.last_analysis_results || {}
  const engines  = Object.entries(scanResults)

  const statusColor = malicious === 0 ? '#10b981' : malicious < 5 ? '#f59e0b' : '#ef4444'

  return (
    <div>
      {/* Score card */}
      <div style={{
        display:'flex', alignItems:'center', gap:24, padding:'20px 24px', borderRadius:14,
        background:`rgba(${malicious===0?'16,185,129':malicious<5?'245,158,11':'239,68,68'},0.08)`,
        border:`1px solid rgba(${malicious===0?'16,185,129':malicious<5?'245,158,11':'239,68,68'},0.25)`,
        marginBottom:20,
      }}>
        <div style={{ textAlign:'center', minWidth:72 }}>
          <div style={{ fontSize:36, fontWeight:900, color:statusColor, fontFamily:'monospace' }}>{malicious}</div>
          <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>/{total} engines</div>
        </div>
        <div>
          <div style={{ color:statusColor, fontWeight:700, fontSize:16 }}>
            {malicious===0 ? '✓ Limpio' : malicious<5 ? '⚠ Sospechoso' : '✗ Malicioso'}
          </div>
          <div style={{ color:'rgba(255,255,255,0.45)', fontSize:12, marginTop:4 }}>
            {pct}% de los motores detectan amenaza
          </div>
          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            {Object.entries(stats).map(([k,v])=>(
              <span key={k} style={{
                padding:'2px 8px', borderRadius:5, fontSize:11,
                background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                color:'rgba(255,255,255,0.5)',
              }}>
                {k}: {v}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {['detecciones','raw'].map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:'5px 12px', borderRadius:6, fontSize:11, cursor:'pointer',
            background: tab===t ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
            border: tab===t ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(255,255,255,0.07)',
            color: tab===t ? COLOR : 'rgba(255,255,255,0.45)',
            textTransform:'uppercase', letterSpacing:'0.06em',
          }}>{t}</button>
        ))}
      </div>

      {tab==='detecciones' && engines.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
          {engines.filter(([,v])=>v.result).map(([engine,det])=>(
            <div key={engine} style={{
              display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8,
              background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
            }}>
              <XCircle size={13} style={{ color:'#ef4444', flexShrink:0 }}/>
              <div>
                <div style={{ color:'#fff', fontSize:12, fontWeight:600 }}>{engine}</div>
                <div style={{ color:'#fca5a5', fontSize:11, fontFamily:'monospace' }}>{det.result}</div>
              </div>
            </div>
          ))}
          {engines.filter(([,v])=>!v.result && v.category==='undetected').slice(0,8).map(([engine])=>(
            <div key={engine} style={{
              display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8,
              background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.1)',
            }}>
              <CheckCircle size={13} style={{ color:'#10b981', flexShrink:0 }}/>
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12 }}>{engine}</div>
            </div>
          ))}
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
