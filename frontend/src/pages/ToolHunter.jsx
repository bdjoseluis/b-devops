import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Search, Loader2, AlertCircle, Mail, Key, ExternalLink } from 'lucide-react'

const COLOR = '#38bdf8'

export default function ToolHunter() {
  const [domain,  setDomain]  = useState('')
  const [apiKey,  setApiKey]  = useState(localStorage.getItem('hunter_api_key') || '')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const saveKey = () => {
    localStorage.setItem('hunter_api_key', apiKey)
  }

  const run = async (e) => {
    e.preventDefault()
    if (!domain.trim() || loading) return
    if (!apiKey.trim()) { setError('Introduce tu API key de Hunter.io primero'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      saveKey()
      const resp = await fetch(
        `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain.trim())}&api_key=${apiKey.trim()}&limit=20`
      )
      const data = await resp.json()
      if (data.errors?.length) throw new Error(data.errors[0].details || data.errors[0].id)
      setResult(data.data)
    } catch (err) {
      setError(err.message || 'Error al consultar Hunter.io')
    } finally { setLoading(false) }
  }

  return (
    <ToolShell icon="🎣" name="Hunter.io" color={COLOR} badge="Descubrimiento de emails corporativos">
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>

        {/* API Key config */}
        <div style={{
          padding:'16px 18px', borderRadius:12, marginBottom:24,
          background:'rgba(56,189,248,0.07)', border:'1px solid rgba(56,189,248,0.2)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <Key size={14} style={{ color:COLOR }}/>
            <span style={{ color:COLOR, fontWeight:700, fontSize:13 }}>API Key de Hunter.io</span>
            <a href="https://hunter.io/api-keys" target="_blank" rel="noopener noreferrer"
              style={{ marginLeft:'auto', color:'rgba(255,255,255,0.35)', fontSize:11, display:'flex', alignItems:'center', gap:4, textDecoration:'none' }}>
              <ExternalLink size={11}/> Obtener gratis
            </a>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input
              type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)}
              placeholder="Pega tu API key aquí (se guarda localmente)"
              style={{
                flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(56,189,248,0.15)',
                color:'#fff', padding:'8px 14px', borderRadius:8, fontSize:13, outline:'none',
                fontFamily:'monospace',
              }}
            />
            <button onClick={saveKey} type="button" style={{
              padding:'8px 14px', borderRadius:8, cursor:'pointer',
              background:'rgba(56,189,248,0.15)', border:'1px solid rgba(56,189,248,0.3)',
              color:COLOR, fontSize:12,
            }}>Guardar</button>
          </div>
          <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10, marginTop:6 }}>
            Plan gratuito: 25 búsquedas/mes · 10 emails por búsqueda
          </div>
        </div>

        <form onSubmit={run} style={{ display:'flex', gap:8, marginBottom:28 }}>
          <input
            value={domain} onChange={e=>setDomain(e.target.value)}
            placeholder="empresa.com"
            style={{
              flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(56,189,248,0.2)',
              color:'#fff', padding:'11px 16px', borderRadius:10, fontSize:14, outline:'none',
            }}
            onFocus={e=>e.target.style.borderColor='rgba(56,189,248,0.55)'}
            onBlur={e=>e.target.style.borderColor='rgba(56,189,248,0.2)'}
          />
          <button type="submit" disabled={!domain.trim()||loading} style={{
            padding:'11px 22px', borderRadius:10, cursor:'pointer',
            background:'rgba(56,189,248,0.18)', border:'1px solid rgba(56,189,248,0.4)',
            color:COLOR, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:7,
          }}>
            {loading ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Search size={14}/>}
            {loading ? 'Buscando...' : 'Buscar emails'}
          </button>
        </form>

        {error && <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginBottom:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}><AlertCircle size={14}/> {error}</div>}

        {result && <HunterResult data={result} />}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}

function HunterResult({ data }) {
  const emails  = data.emails || []
  const pattern = data.pattern
  const org     = data.organization

  if (emails.length === 0) {
    return <div style={{ padding:24, textAlign:'center', color:'rgba(255,255,255,0.35)', fontSize:13 }}>Sin emails encontrados para este dominio</div>
  }

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        {org && (
          <div style={{ padding:'8px 14px', borderRadius:8, background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.18)' }}>
            <div style={{ color:'rgba(255,255,255,0.35)', fontSize:9, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>Organización</div>
            <div style={{ color:'#fff', fontSize:12, fontWeight:600 }}>{org}</div>
          </div>
        )}
        {pattern && (
          <div style={{ padding:'8px 14px', borderRadius:8, background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.18)' }}>
            <div style={{ color:'rgba(255,255,255,0.35)', fontSize:9, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>Patrón</div>
            <div style={{ color:COLOR, fontSize:12, fontFamily:'monospace' }}>{pattern}@{data.domain}</div>
          </div>
        )}
        <div style={{ padding:'8px 14px', borderRadius:8, background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.18)' }}>
          <div style={{ color:'rgba(255,255,255,0.35)', fontSize:9, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>Emails encontrados</div>
          <div style={{ color:COLOR, fontSize:12, fontWeight:700 }}>{emails.length}</div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {emails.map((e,i)=>{
          const conf = e.confidence
          const confCol = conf >= 90 ? '#10b981' : conf >= 60 ? '#f59e0b' : '#6b7280'
          return (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:9,
              background:'rgba(56,189,248,0.05)', border:'1px solid rgba(56,189,248,0.13)',
            }}>
              <Mail size={13} style={{ color:COLOR, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ color:'#fff', fontSize:13, fontFamily:'monospace' }}>{e.value}</div>
                {(e.first_name||e.last_name) && (
                  <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginTop:2 }}>
                    {[e.first_name, e.last_name].filter(Boolean).join(' ')} {e.position && `· ${e.position}`}
                  </div>
                )}
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ color:confCol, fontSize:11, fontWeight:700 }}>{conf}%</div>
                <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9 }}>confianza</div>
              </div>
              {e.type && (
                <span style={{
                  padding:'2px 7px', borderRadius:4, fontSize:10, textTransform:'capitalize',
                  background:'rgba(56,189,248,0.1)', color:COLOR, border:'1px solid rgba(56,189,248,0.2)',
                }}>{e.type}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
