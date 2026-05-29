import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { tools } from '../api/client'
import { Search, AlertCircle, Loader2, Key, User, Mail, Phone, Shield } from 'lucide-react'

const COLOR = '#60a5fa'

const TYPES = [
  { id:'email',          label:'Email',        icon:'📧', ph:'usuario@ejemplo.com' },
  { id:'username',       label:'Usuario',      icon:'👤', ph:'nombre_usuario' },
  { id:'ip_address',     label:'IP',           icon:'🌐', ph:'192.168.1.1' },
  { id:'phone',          label:'Teléfono',     icon:'📱', ph:'+34 600000000' },
  { id:'name',           label:'Nombre',       icon:'🪪', ph:'Juan García' },
  { id:'password',       label:'Contraseña',   icon:'🔑', ph:'contraseña123' },
  { id:'hashed_password',label:'Hash',         icon:'#',  ph:'5f4dcc3b5aa765d61d8327deb882cf99' },
  { id:'domain',         label:'Dominio',      icon:'🌍', ph:'ejemplo.com' },
]

export default function ToolDeHashed() {
  const [qtype,   setQtype]   = useState('email')
  const [input,   setInput]   = useState('')
  const [size,    setSize]    = useState(10)
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const run = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      const data = await tools.dehashed(input.trim(), qtype, size)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error en búsqueda')
    } finally { setLoading(false) }
  }

  const cur = TYPES.find(t=>t.id===qtype)

  return (
    <ToolShell icon="💧" name="DeHashed" color={COLOR} badge="Base de datos de credenciales filtradas">
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{
          display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:20,
          background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11,
        }}>
          <Shield size={13} style={{ color:'#f87171', flexShrink:0, marginTop:1 }}/>
          Herramienta solo para auditorías autorizadas. No usar para acceder a cuentas ajenas.
        </div>

        {/* Type selector */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
          {TYPES.map(t=>(
            <button key={t.id} onClick={()=>setQtype(t.id)} style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'6px 12px', borderRadius:8, fontSize:12, cursor:'pointer', transition:'all .15s',
              background: qtype===t.id ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
              border: qtype===t.id ? '1px solid rgba(96,165,250,0.45)' : '1px solid rgba(255,255,255,0.08)',
              color: qtype===t.id ? COLOR : 'rgba(255,255,255,0.5)',
              fontWeight: qtype===t.id ? 600 : 400,
            }}>
              {t.icon} {t.label}
            </button>
          ))}
          <select value={size} onChange={e=>setSize(+e.target.value)} style={{
            marginLeft:'auto', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
            color:'rgba(255,255,255,0.6)', padding:'0 10px', borderRadius:8, fontSize:12,
          }}>
            {[5,10,25,50,100].map(n=><option key={n} value={n}>{n} resultados</option>)}
          </select>
        </div>

        <form onSubmit={run} style={{ display:'flex', gap:8, marginBottom:28 }}>
          <input
            value={input} onChange={e=>setInput(e.target.value)}
            placeholder={`Buscar por ${cur?.label} — ej: ${cur?.ph}`}
            style={{
              flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(96,165,250,0.2)',
              color:'#fff', padding:'11px 16px', borderRadius:10, fontSize:14, outline:'none',
            }}
            onFocus={e=>e.target.style.borderColor='rgba(96,165,250,0.55)'}
            onBlur={e=>e.target.style.borderColor='rgba(96,165,250,0.2)'}
          />
          <button type="submit" disabled={!input.trim()||loading} style={{
            padding:'11px 22px', borderRadius:10, cursor:'pointer',
            background:'rgba(96,165,250,0.18)', border:'1px solid rgba(96,165,250,0.4)',
            color:COLOR, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:7,
          }}>
            {loading ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Search size={14}/>}
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {error && (
          <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginBottom:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        {result && <DeHashedResult data={result} />}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}

function DeHashedResult({ data }) {
  const [tab, setTab] = useState('entries')
  if (data?.error) return <div style={{ padding:16, borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>{data.error}</div>

  const entries = data.entries || data.results || []
  const total   = data.total || entries.length

  return (
    <div>
      <div style={{
        display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderRadius:10, marginBottom:16,
        background: total>0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
        border:`1px solid rgba(${total>0?'239,68,68':'16,185,129'},0.25)`,
      }}>
        <div style={{ fontSize:28, fontWeight:900, color:total>0?'#f87171':'#10b981', fontFamily:'monospace' }}>{total}</div>
        <div>
          <div style={{ color: total>0?'#f87171':'#10b981', fontWeight:700, fontSize:14 }}>
            {total > 0 ? `${total} brechas encontradas` : 'Sin resultados en la base de datos'}
          </div>
          {data.balance !== undefined && <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginTop:2 }}>Créditos restantes: {data.balance}</div>}
        </div>
      </div>

      {entries.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {entries.map((e,i)=>(
            <div key={i} style={{
              background:'rgba(96,165,250,0.05)', border:'1px solid rgba(96,165,250,0.15)',
              borderRadius:12, padding:'14px 16px',
            }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  ['Email',      e.email],
                  ['Usuario',    e.username],
                  ['Contraseña', e.password],
                  ['Hash',       e.hashed_password],
                  ['Nombre',     e.name],
                  ['IP',         e.ip_address],
                  ['Teléfono',   e.phone],
                  ['DB origen',  e.database_name],
                ].filter(([,v])=>v).map(([k,v])=>(
                  <div key={k} style={{ background:'rgba(0,0,0,0.25)', borderRadius:7, padding:'7px 10px' }}>
                    <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>{k}</div>
                    <div style={{ color: k==='Contraseña'?'#fbbf24':k==='Hash'?'#a78bfa':'#fff', fontSize:11, fontFamily:'monospace', wordBreak:'break-all' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
