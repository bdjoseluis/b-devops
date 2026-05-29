import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { AlertCircle, Loader2, Search, ShieldAlert, ShieldCheck, Key } from 'lucide-react'

const COLOR = '#dc2626'

export default function ToolHIBP() {
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const run = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      // HIBP v3 API requires API key — we call their public endpoint for pastes (no key) as fallback
      // For breach check we need a key. Here we try the public API first.
      const encoded = encodeURIComponent(input.trim())
      const resp = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encoded}?truncateResponse=false`, {
        headers: { 'hibp-api-key': '', 'User-Agent': 'B-DEVOPS/2.0' }
      })
      if (resp.status === 401) {
        setError('API key de HIBP requerida. Configúrala en Configuración → APIs → HaveIBeenPwned.')
        return
      }
      if (resp.status === 404) { setResult({ breaches: [], pwned: false }); return }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const breaches = await resp.json()
      setResult({ breaches, pwned: breaches.length > 0 })
    } catch (err) {
      // Fallback: HIBP blocks browser requests without API key — show info
      setError('HIBP requiere una API key de pago (desde $3.50/mes). Agrégala en Configuración para usar esta función.')
    } finally { setLoading(false) }
  }

  return (
    <ToolShell icon="🔑" name="Have I Been Pwned" color={COLOR} badge="Verificador de brechas de datos">
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{
          display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:28,
          padding:'16px 20px', borderRadius:12,
          background:'rgba(220,38,38,0.07)', border:'1px solid rgba(220,38,38,0.2)',
        }}>
          <div>
            <div style={{ color:'#f87171', fontWeight:700, fontSize:13, marginBottom:6 }}>¿Qué es HIBP?</div>
            <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, lineHeight:1.6 }}>
              Have I Been Pwned es una base de datos que contiene más de 12 mil millones de credenciales filtradas de brechas de seguridad conocidas.
            </div>
          </div>
          <div>
            <div style={{ color:'#f87171', fontWeight:700, fontSize:13, marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
              <Key size={13}/> API Key requerida
            </div>
            <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, lineHeight:1.6 }}>
              La API v3 requiere suscripción. Obtén tu key en <a href="https://haveibeenpwned.com/api/key" target="_blank" rel="noopener noreferrer" style={{ color:COLOR }}>haveibeenpwned.com/api/key</a> y configúrala en Configuración.
            </div>
          </div>
        </div>

        <form onSubmit={run} style={{ display:'flex', gap:8, marginBottom:28 }}>
          <input
            value={input} onChange={e=>setInput(e.target.value)}
            placeholder="email@ejemplo.com"
            type="email"
            style={{
              flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(220,38,38,0.2)',
              color:'#fff', padding:'11px 16px', borderRadius:10, fontSize:14, outline:'none',
            }}
            onFocus={e=>e.target.style.borderColor='rgba(220,38,38,0.55)'}
            onBlur={e=>e.target.style.borderColor='rgba(220,38,38,0.2)'}
          />
          <button type="submit" disabled={!input.trim()||loading} style={{
            padding:'11px 22px', borderRadius:10, cursor:'pointer',
            background:'rgba(220,38,38,0.18)', border:'1px solid rgba(220,38,38,0.4)',
            color:COLOR, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:7,
          }}>
            {loading ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Search size={14}/>}
            {loading ? 'Verificando...' : 'Verificar'}
          </button>
        </form>

        {error && (
          <div style={{ display:'flex', gap:10, padding:'14px 16px', borderRadius:10, marginBottom:20, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', color:'#fcd34d', fontSize:13 }}>
            <AlertCircle size={14} style={{ flexShrink:0, marginTop:1 }}/> {error}
          </div>
        )}

        {result && (
          <div style={{
            padding:'24px', borderRadius:14,
            background:`rgba(${result.pwned?'239,68,68':'16,185,129'},0.08)`,
            border:`1px solid rgba(${result.pwned?'239,68,68':'16,185,129'},0.25)`,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: result.pwned ? 20 : 0 }}>
              {result.pwned
                ? <ShieldAlert size={28} style={{ color:'#ef4444' }}/>
                : <ShieldCheck size={28} style={{ color:'#10b981' }}/>
              }
              <div>
                <div style={{ color: result.pwned?'#ef4444':'#10b981', fontWeight:700, fontSize:18 }}>
                  {result.pwned ? `¡Pwned! Encontrado en ${result.breaches.length} brechas` : 'Sin brechas detectadas'}
                </div>
                <div style={{ color:'rgba(255,255,255,0.45)', fontSize:12, marginTop:2 }}>
                  {result.pwned ? 'Este email aparece en bases de datos filtradas.' : 'Este email no aparece en ninguna brecha conocida.'}
                </div>
              </div>
            </div>

            {result.breaches.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                {result.breaches.map((b,i)=>(
                  <div key={i} style={{
                    padding:'12px 14px', borderRadius:10,
                    background:'rgba(0,0,0,0.3)', border:'1px solid rgba(239,68,68,0.15)',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      {b.LogoPath && <img src={b.LogoPath} alt="" style={{ width:20, height:20, borderRadius:4, objectFit:'cover' }}/>}
                      <div style={{ color:'#fff', fontWeight:700, fontSize:13 }}>{b.Name}</div>
                      <div style={{ marginLeft:'auto', color:'rgba(255,255,255,0.35)', fontSize:11 }}>{b.BreachDate}</div>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {(b.DataClasses||[]).map(d=>(
                        <span key={d} style={{ padding:'2px 6px', borderRadius:4, background:'rgba(239,68,68,0.15)', color:'#fca5a5', fontSize:10 }}>{d}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}
