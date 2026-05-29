import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { scan } from '../api/client'
import { Search, AlertCircle, Loader2, Network, Shield, Clock } from 'lucide-react'

const COLOR = '#ef4444'

const PROFILES = [
  { id:'quick',   label:'Quick',   desc:'Top 100 puertos, rápido', time:'~15s' },
  { id:'full',    label:'Full',    desc:'65535 puertos + servicios', time:'~5-30min' },
  { id:'stealth', label:'Stealth', desc:'SYN scan, modo lento', time:'~10-60min' },
  { id:'vuln',    label:'Vulns',   desc:'Scripts NSE de vulnerabilidades', time:'~2-10min' },
  { id:'os',      label:'OS',      desc:'Detección de sistema operativo', time:'~1-5min' },
  { id:'service', label:'Service', desc:'Versión + scripts', time:'~2-5min' },
  { id:'udp',     label:'UDP',     desc:'Top 100 puertos UDP', time:'~2-5min' },
]

export default function ToolNmap() {
  const [input,    setInput]    = useState('')
  const [profile,  setProfile]  = useState('quick')
  const [custom,   setCustom]   = useState('')
  const [useKali,  setUseKali]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState('')

  const run = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      const data = await scan.nmap(input.trim(), profile, custom, useKali)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error en el escaneo')
    } finally { setLoading(false) }
  }

  const cur = PROFILES.find(p=>p.id===profile)

  return (
    <ToolShell icon="🌐" name="Nmap Scanner" color={COLOR} badge="Escáner de puertos · Detección de servicios · OS">
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{
          display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:20,
          background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11,
        }}>
          <Shield size={13} style={{ color:'#f87171', flexShrink:0, marginTop:1 }}/>
          Solo para escaneos autorizados. Escanear sistemas sin permiso es ilegal.
        </div>

        {/* Profile selector */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
          {PROFILES.map(p=>(
            <button key={p.id} onClick={()=>setProfile(p.id)} title={`${p.desc} — ${p.time}`} style={{
              padding:'6px 12px', borderRadius:8, fontSize:12, cursor:'pointer', transition:'all .15s',
              background: profile===p.id ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
              border: profile===p.id ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(255,255,255,0.08)',
              color: profile===p.id ? COLOR : 'rgba(255,255,255,0.5)',
              fontWeight: profile===p.id ? 600 : 400,
            }}>{p.label}</button>
          ))}
        </div>

        {cur && (
          <div style={{
            display:'flex', gap:8, padding:'9px 14px', borderRadius:8, marginBottom:16,
            background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)',
            color:'rgba(255,255,255,0.45)', fontSize:11,
          }}>
            <Clock size={12} style={{ color:COLOR, flexShrink:0, marginTop:1 }}/>
            {cur.desc} — Tiempo estimado: <span style={{ color:COLOR }}>{cur.time}</span>
          </div>
        )}

        <form onSubmit={run}>
          <div style={{ display:'flex', gap:8, marginBottom:10 }}>
            <input
              value={input} onChange={e=>setInput(e.target.value)}
              placeholder="IP, rango (192.168.1.0/24) o dominio"
              style={{
                flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(239,68,68,0.2)',
                color:'#fff', padding:'11px 16px', borderRadius:10, fontSize:14, outline:'none',
              }}
              onFocus={e=>e.target.style.borderColor='rgba(239,68,68,0.55)'}
              onBlur={e=>e.target.style.borderColor='rgba(239,68,68,0.2)'}
            />
            <button type="submit" disabled={!input.trim()||loading} style={{
              padding:'11px 22px', borderRadius:10, cursor:'pointer',
              background:'rgba(239,68,68,0.18)', border:'1px solid rgba(239,68,68,0.4)',
              color:COLOR, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:7,
            }}>
              {loading ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Network size={14}/>}
              {loading ? 'Escaneando...' : 'Escanear'}
            </button>
          </div>

          <div style={{ display:'flex', gap:8, marginBottom:28, alignItems:'center' }}>
            <input
              value={custom} onChange={e=>setCustom(e.target.value)}
              placeholder="Flags adicionales (ej: -p 80,443 --script http-title)"
              style={{
                flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                color:'#fff', padding:'8px 14px', borderRadius:8, fontSize:12, outline:'none',
                fontFamily:'monospace',
              }}
            />
            <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', userSelect:'none', whiteSpace:'nowrap' }}>
              <input type="checkbox" checked={useKali} onChange={e=>setUseKali(e.target.checked)}
                style={{ accentColor:COLOR, width:14, height:14 }}/>
              <span style={{ color:'rgba(255,255,255,0.5)', fontSize:12 }}>Usar Kali SSH</span>
            </label>
          </div>
        </form>

        {error && (
          <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginBottom:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        {result && <NmapResult data={result} />}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}

function NmapResult({ data }) {
  const [tab, setTab] = useState('ports')
  const ports = data.ports || data.open_ports || []
  const raw   = data.raw_output || data.output || ''
  const os    = data.os_detection || data.os
  const hosts = data.hosts || []

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {['ports','raw'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:'5px 12px', borderRadius:6, fontSize:11, cursor:'pointer',
            background: tab===t ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
            border: tab===t ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.07)',
            color: tab===t ? COLOR : 'rgba(255,255,255,0.45)',
            textTransform:'uppercase', letterSpacing:'0.06em',
          }}>{t}</button>
        ))}
      </div>

      {tab==='ports' && (
        <div>
          {os && (
            <div style={{ padding:'12px 16px', borderRadius:10, marginBottom:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>OS detectado</div>
              <div style={{ color:COLOR, fontSize:13, fontFamily:'monospace' }}>{typeof os==='object'?JSON.stringify(os):os}</div>
            </div>
          )}

          {ports.length > 0 ? (
            <div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginBottom:10 }}>
                {ports.length} puerto(s) abierto(s)
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {ports.map((p,i)=>{
                  const port    = p.port || p.number || p
                  const service = p.service || p.name || ''
                  const version = p.version || ''
                  const state   = p.state || 'open'
                  return (
                    <div key={i} style={{
                      display:'grid', gridTemplateColumns:'80px 1fr 1fr', gap:12, alignItems:'center',
                      padding:'10px 14px', borderRadius:9,
                      background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)',
                    }}>
                      <span style={{ color:COLOR, fontWeight:700, fontSize:15, fontFamily:'monospace' }}>{port}</span>
                      <span style={{ color:'#fff', fontSize:12 }}>{service || '—'}</span>
                      <span style={{ color:'rgba(255,255,255,0.45)', fontSize:11, fontFamily:'monospace' }}>{version}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding:24, textAlign:'center', color:'rgba(255,255,255,0.3)', fontSize:13 }}>
              Sin puertos abiertos detectados o esperando resultados del escaneo
            </div>
          )}
        </div>
      )}

      {tab==='raw' && (
        <pre style={{
          background:'rgba(0,0,0,0.5)', border:'1px solid rgba(239,68,68,0.15)',
          borderRadius:10, padding:16, color:'#86efac', fontSize:11,
          overflowX:'auto', lineHeight:1.8, maxHeight:600, overflowY:'auto', whiteSpace:'pre-wrap',
          fontFamily:'monospace',
        }}>
          {raw || JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}
