import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { scan } from '../api/client'
import { Play, Loader2, AlertCircle, Shield, Database, ChevronDown } from 'lucide-react'

const COLOR = '#f59e0b'

const LEVELS = [
  { id:'1', label:'Level 1', desc:'Básico (por defecto)' },
  { id:'2', label:'Level 2', desc:'Moderado' },
  { id:'3', label:'Level 3', desc:'Alto' },
  { id:'5', label:'Level 5', desc:'Máximo' },
]
const RISKS = [
  { id:'1', label:'Risk 1', desc:'Seguro' },
  { id:'2', label:'Risk 2', desc:'Moderado' },
  { id:'3', label:'Risk 3', desc:'Agresivo' },
]
const DBMS = ['auto','mysql','mssql','postgresql','oracle','sqlite','access','sybase','db2']
const TECHNIQUES = [
  { id:'B', label:'Boolean-based blind' },
  { id:'E', label:'Error-based' },
  { id:'U', label:'Union-based' },
  { id:'S', label:'Stacked queries' },
  { id:'T', label:'Time-based blind' },
  { id:'Q', label:'Inline queries' },
]

export default function ToolSQLMap() {
  const [url,       setUrl]       = useState('')
  const [method,    setMethod]    = useState('GET')
  const [data,      setData]      = useState('')
  const [level,     setLevel]     = useState('1')
  const [risk,      setRisk]      = useState('1')
  const [dbms,      setDbms]      = useState('auto')
  const [techs,     setTechs]     = useState(['B','E','U','T'])
  const [dbs,       setDbs]       = useState(false)
  const [tables,    setTables]    = useState(false)
  const [dump,      setDump]      = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState('')

  const toggleTech = (t) => setTechs(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev,t])

  const buildCmd = () => {
    let cmd = `sqlmap -u "${url}"`
    if (method === 'POST' && data) cmd += ` --data="${data}"`
    if (level !== '1') cmd += ` --level=${level}`
    if (risk  !== '1') cmd += ` --risk=${risk}`
    if (dbms  !== 'auto') cmd += ` --dbms=${dbms}`
    if (techs.length && techs.length < 6) cmd += ` --technique=${techs.join('')}`
    if (dbs)   cmd += ' --dbs'
    if (tables) cmd += ' --tables'
    if (dump)  cmd += ' --dump'
    cmd += ' --batch --no-cast'
    return cmd
  }

  const run = async (e) => {
    e.preventDefault()
    if (!url.trim() || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await scan.kaliRaw(buildCmd())
      setResult(res)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error: Requiere Kali SSH configurado')
    } finally { setLoading(false) }
  }

  const Row = ({ label, children }) => (
    <div>
      <label style={{ color:'rgba(255,255,255,0.4)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6, display:'block' }}>{label}</label>
      {children}
    </div>
  )

  return (
    <ToolShell icon="💉" name="SQLMap" color={COLOR} badge="Detección y explotación automática de SQL Injection">
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>
        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:20, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'rgba(255,255,255,0.5)', fontSize:11 }}>
          <Shield size={13} style={{ color:'#f87171', flexShrink:0, marginTop:1 }}/>
          Solo para pruebas de penetración autorizadas. Requiere Kali SSH.
        </div>

        <form onSubmit={run}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, marginBottom:12 }}>
            <Row label="URL objetivo">
              <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://target.com/page?id=1"
                style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(245,158,11,0.25)', color:'#fff', padding:'10px 14px', borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box' }}/>
            </Row>
            <Row label="Método">
              <select value={method} onChange={e=>setMethod(e.target.value)} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'10px 14px', borderRadius:9, fontSize:13, outline:'none', height:42 }}>
                <option>GET</option><option>POST</option>
              </select>
            </Row>
          </div>

          {method==='POST' && (
            <Row label="POST Data">
              <input value={data} onChange={e=>setData(e.target.value)} placeholder="user=admin&pass=test"
                style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'10px 14px', borderRadius:9, fontSize:13, outline:'none', marginBottom:12, boxSizing:'border-box' }}/>
            </Row>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
            <Row label="Level">
              <select value={level} onChange={e=>setLevel(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'10px 14px', borderRadius:9, fontSize:13, outline:'none' }}>
                {LEVELS.map(l=><option key={l.id} value={l.id}>{l.label} — {l.desc}</option>)}
              </select>
            </Row>
            <Row label="Risk">
              <select value={risk} onChange={e=>setRisk(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'10px 14px', borderRadius:9, fontSize:13, outline:'none' }}>
                {RISKS.map(r=><option key={r.id} value={r.id}>{r.label} — {r.desc}</option>)}
              </select>
            </Row>
            <Row label="DBMS">
              <select value={dbms} onChange={e=>setDbms(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'10px 14px', borderRadius:9, fontSize:13, outline:'none', textTransform:'capitalize' }}>
                {DBMS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </Row>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ color:'rgba(255,255,255,0.4)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8, display:'block' }}>Técnicas de inyección</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {TECHNIQUES.map(t=>(
                <button key={t.id} type="button" onClick={()=>toggleTech(t.id)} style={{
                  padding:'5px 10px', borderRadius:6, fontSize:11, cursor:'pointer',
                  background: techs.includes(t.id) ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                  border: techs.includes(t.id) ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: techs.includes(t.id) ? COLOR : 'rgba(255,255,255,0.45)',
                }}>{t.label.split('-')[0]}</button>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap:12, marginBottom:16 }}>
            {[['--dbs','Listar DBs',dbs,setDbs],['--tables','Listar tablas',tables,setTables],['--dump','Dump datos',dump,setDump]].map(([k,l,v,s])=>(
              <label key={k} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', userSelect:'none' }}>
                <input type="checkbox" checked={v} onChange={e=>s(e.target.checked)} style={{ accentColor:COLOR, width:13, height:13 }}/>
                <span style={{ color:'rgba(255,255,255,0.6)', fontSize:12 }}>{l}</span>
              </label>
            ))}
          </div>

          <div style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:9, padding:'10px 14px', fontFamily:'monospace', color:'rgba(245,158,11,0.85)', fontSize:11, marginBottom:16, wordBreak:'break-all' }}>
            <span style={{ color:'rgba(255,255,255,0.3)', marginRight:8 }}>$</span>{buildCmd()}
          </div>

          <button type="submit" disabled={!url.trim()||loading} style={{
            padding:'11px 24px', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:8,
            background:'rgba(245,158,11,0.18)', border:'1px solid rgba(245,158,11,0.45)',
            color:COLOR, fontWeight:700, fontSize:13,
          }}>
            {loading ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Database size={14}/>}
            {loading ? 'Ejecutando SQLMap...' : 'Ejecutar'}
          </button>
        </form>

        {error && <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginTop:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}><AlertCircle size={14}/>{error}</div>}
        {result && (
          <pre style={{ marginTop:20, background:'rgba(0,0,0,0.6)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:10, padding:16, color:'#fde68a', fontSize:11, lineHeight:1.8, maxHeight:500, overflowY:'auto', whiteSpace:'pre-wrap', fontFamily:'monospace' }}>
            {result.output || result.raw_output || JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}
