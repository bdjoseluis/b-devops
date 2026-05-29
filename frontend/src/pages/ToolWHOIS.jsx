import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { osint } from '../api/client'
import { Search, AlertCircle, Loader2, Calendar, Globe, Building2 } from 'lucide-react'

const COLOR = '#22d3ee'

export default function ToolWHOIS() {
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const run = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      const data = await osint.analyze(input.trim(), ['whois'])
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error')
    } finally { setLoading(false) }
  }

  return (
    <ToolShell icon="📋" name="WHOIS Lookup" color={COLOR} badge="Información de registro de dominios e IPs">
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>
        <form onSubmit={run} style={{ display:'flex', gap:8, marginBottom:28 }}>
          <input
            value={input} onChange={e=>setInput(e.target.value)}
            placeholder="dominio.com / 8.8.8.8"
            style={{
              flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(34,211,238,0.2)',
              color:'#fff', padding:'11px 16px', borderRadius:10, fontSize:14, outline:'none',
            }}
            onFocus={e=>e.target.style.borderColor='rgba(34,211,238,0.55)'}
            onBlur={e=>e.target.style.borderColor='rgba(34,211,238,0.2)'}
          />
          <button type="submit" disabled={!input.trim()||loading} style={{
            padding:'11px 22px', borderRadius:10, cursor:'pointer',
            background:'rgba(34,211,238,0.18)', border:'1px solid rgba(34,211,238,0.4)',
            color:COLOR, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:7,
          }}>
            {loading ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Search size={14}/>}
            {loading ? 'Consultando...' : 'Lookup'}
          </button>
        </form>

        {error && (
          <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginBottom:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        {result && <WHOISResult data={result.whois || result} />}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}

function WHOISResult({ data }) {
  const [showRaw, setShowRaw] = useState(false)
  if (!data || data.error) return (
    <div style={{ padding:16, borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>
      {data?.error || 'Sin datos WHOIS disponibles'}
    </div>
  )

  const fields = [
    ['Dominio',       data.domain_name || data.domain],
    ['Registrar',     data.registrar],
    ['Registrante',   data.registrant_name || data.org || data.registrant_organization],
    ['País',          data.country || data.registrant_country],
    ['Email',         data.registrant_email || data.emails?.[0]],
    ['Teléfono',      data.registrant_phone],
    ['Creado',        data.creation_date],
    ['Actualizado',   data.updated_date],
    ['Expira',        data.expiration_date],
    ['Status',        Array.isArray(data.status)?data.status.join(', '):data.status],
    ['Nameservers',   Array.isArray(data.name_servers)?data.name_servers.join(', '):data.name_servers],
    ['DNSSEC',        data.dnssec],
  ].filter(([,v]) => v)

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
        {fields.map(([k,v])=>(
          <div key={k} style={{ background:'rgba(34,211,238,0.05)', border:'1px solid rgba(34,211,238,0.12)', borderRadius:10, padding:'12px 16px' }}>
            <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{k}</div>
            <div style={{ color:'#fff', fontSize:12, fontFamily:'monospace', wordBreak:'break-all' }}>{String(v)}</div>
          </div>
        ))}
      </div>

      {data.raw && (
        <div>
          <button onClick={()=>setShowRaw(s=>!s)} style={{
            padding:'6px 12px', borderRadius:7, fontSize:11, cursor:'pointer',
            background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
            color:'rgba(255,255,255,0.5)', marginBottom:10,
          }}>
            {showRaw ? 'Ocultar' : 'Ver'} WHOIS raw
          </button>
          {showRaw && (
            <pre style={{
              background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:10, padding:16, color:'rgba(255,255,255,0.65)', fontSize:11,
              overflowX:'auto', lineHeight:1.6, maxHeight:400, overflowY:'auto', whiteSpace:'pre-wrap',
            }}>
              {data.raw}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
