import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { scan } from '../api/client'
import { Play, Loader2, AlertCircle, Shield } from 'lucide-react'

const COLOR = '#10b981'

const TUNING = [
  { id:'1', label:'Interesting File', color:'#06b6d4' },
  { id:'2', label:'Misconfiguration', color:'#f59e0b' },
  { id:'3', label:'Info Disclosure',  color:'#a78bfa' },
  { id:'4', label:'Injection',        color:'#ef4444' },
  { id:'5', label:'Remote Shell',     color:'#dc2626' },
  { id:'6', label:'Denial of Service',color:'#f97316' },
  { id:'7', label:'XSS',              color:'#ec4899' },
  { id:'8', label:'App Logic',        color:'#10b981' },
  { id:'9', label:'SQL Injection',    color:'#f59e0b' },
  { id:'a', label:'Authentication',   color:'#8b5cf6' },
  { id:'b', label:'Identification',   color:'#22d3ee' },
  { id:'c', label:'Remote Source',    color:'#ef4444' },
]

export default function ToolNikto() {
  const [target,  setTarget]  = useState('')
  const [port,    setPort]    = useState('')
  const [ssl,     setSsl]     = useState(false)
  const [tuning,  setTuning]  = useState([])
  const [timeout, setTimeout] = useState(10)
  const [useragent, setUA]    = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const toggleTune = (t) => setTuning(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev, t])

  const buildCmd = () => {
    let cmd = `nikto -h ${target.trim()}`
    if (port)    cmd += ` -p ${port}`
    if (ssl)     cmd += ' -ssl'
    if (tuning.length) cmd += ` -Tuning ${tuning.join('')}`
    if (timeout !== 10) cmd += ` -timeout ${timeout}`
    if (useragent) cmd += ` -useragent "${useragent}"`
    cmd += ' -nointeractive'
    return cmd
  }

  const run = async (e) => {
    e.preventDefault()
    if (!target.trim() || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await scan.kaliRaw(buildCmd())
      setResult(res)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error: Requiere Kali SSH configurado')
    } finally { setLoading(false) }
  }

  return (
    <ToolShell icon="🌊" name="Nikto" color={COLOR} badge="Escáner de vulnerabilidades web · CGI · Misconfiguraciones">
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>
        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:20, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'rgba(255,255,255,0.5)', fontSize:11 }}>
          <Shield size={13} style={{ color:'#f87171', flexShrink:0, marginTop:1 }}/>
          Solo en sistemas con autorización. Nikto genera mucho ruido — no es estealth.
        </div>

        <form onSubmit={run}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
            {[
              { l:'Target / Host', v:target, s:setTarget, p:'https://example.com', b:'rgba(16,185,129,0.25)' },
              { l:'Puerto',        v:port,   s:setPort,   p:'80 / 443', b:'rgba(255,255,255,0.1)' },
              { l:'Timeout (s)',   v:timeout, s:e=>setTimeout(+e.target.value), p:'10', b:'rgba(255,255,255,0.1)', type:'number' },
            ].map(f=>(
              <div key={f.l}>
                <label style={{ color:'rgba(255,255,255,0.4)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6, display:'block' }}>{f.l}</label>
                <input value={f.v} onChange={typeof f.s==='function'?e=>f.s(e.target.value):f.s} placeholder={f.p} type={f.type||'text'}
                  style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:`1px solid ${f.b}`, color:'#fff', padding:'10px 14px', borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box' }}/>
              </div>
            ))}
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ color:'rgba(255,255,255,0.4)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8, display:'block' }}>Tuning (categorías a escanear)</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {TUNING.map(t=>(
                <button key={t.id} type="button" onClick={()=>toggleTune(t.id)} style={{
                  padding:'5px 10px', borderRadius:6, fontSize:10, cursor:'pointer',
                  background: tuning.includes(t.id) ? `rgba(${t.color.slice(1).match(/../g).map(h=>parseInt(h,16)).join(',')},0.15)` : 'rgba(255,255,255,0.05)',
                  border: tuning.includes(t.id) ? `1px solid ${t.color}50` : '1px solid rgba(255,255,255,0.08)',
                  color: tuning.includes(t.id) ? t.color : 'rgba(255,255,255,0.4)',
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', userSelect:'none' }}>
              <input type="checkbox" checked={ssl} onChange={e=>setSsl(e.target.checked)} style={{ accentColor:COLOR, width:13, height:13 }}/>
              <span style={{ color:'rgba(255,255,255,0.6)', fontSize:12 }}>Forzar SSL</span>
            </label>
          </div>

          <div style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:9, padding:'10px 14px', fontFamily:'monospace', color:'rgba(16,185,129,0.85)', fontSize:11, marginBottom:16 }}>
            <span style={{ color:'rgba(255,255,255,0.3)', marginRight:8 }}>$</span>{buildCmd()}
          </div>

          <button type="submit" disabled={!target.trim()||loading} style={{
            padding:'11px 24px', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:8,
            background:'rgba(16,185,129,0.18)', border:'1px solid rgba(16,185,129,0.45)',
            color:COLOR, fontWeight:700, fontSize:13,
          }}>
            {loading ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Play size={14}/>}
            {loading ? 'Escaneando...' : 'Ejecutar Nikto'}
          </button>
        </form>

        {error && <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginTop:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}><AlertCircle size={14}/>{error}</div>}
        {result && (
          <div style={{ marginTop:20 }}>
            <NiktoOutput output={result.output || result.raw_output || JSON.stringify(result, null, 2)} />
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}

function NiktoOutput({ output }) {
  const lines = (output||'').split('\n')
  const vulns = lines.filter(l => l.includes('OSVDB') || l.includes('+') && !l.includes('---'))
  const hasVulns = vulns.length > 3

  return (
    <div>
      {hasVulns && (
        <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13, fontWeight:600 }}>
          ⚠ {vulns.length} hallazgos potenciales
        </div>
      )}
      <pre style={{
        background:'rgba(0,0,0,0.6)', border:'1px solid rgba(16,185,129,0.15)',
        borderRadius:10, padding:16, color:'#6ee7b7', fontSize:11,
        lineHeight:1.8, maxHeight:500, overflowY:'auto', whiteSpace:'pre-wrap', fontFamily:'monospace',
      }}>
        {output}
      </pre>
    </div>
  )
}
