import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { osint } from '../api/client'
import { Search, AlertCircle, Loader2, Server, Globe } from 'lucide-react'

const COLOR = '#22d3ee'

export default function ToolDNS() {
  const [input,   setInput]   = useState('')
  const [modules, setModules] = useState(['dns','subdomains'])
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const toggleMod = (m) => setModules(prev => prev.includes(m) ? prev.filter(x=>x!==m) : [...prev, m])

  const run = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      const data = await osint.analyze(input.trim(), modules.length ? modules : ['dns'])
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error en consulta DNS')
    } finally { setLoading(false) }
  }

  const modOpts = [
    { id:'dns',        label:'Registros DNS' },
    { id:'subdomains', label:'Subdominios' },
    { id:'ssl',        label:'Certificado SSL' },
    { id:'whois',      label:'WHOIS' },
  ]

  return (
    <ToolShell icon="🗺️" name="DNS Recon" color={COLOR} badge="Reconocimiento DNS · Subdominios · Registros">
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
          {modOpts.map(m=>(
            <button key={m.id} onClick={()=>toggleMod(m.id)} style={{
              padding:'6px 12px', borderRadius:8, fontSize:12, cursor:'pointer', transition:'all .15s',
              background: modules.includes(m.id) ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.05)',
              border: modules.includes(m.id) ? '1px solid rgba(34,211,238,0.45)' : '1px solid rgba(255,255,255,0.08)',
              color: modules.includes(m.id) ? COLOR : 'rgba(255,255,255,0.5)',
            }}>{modules.includes(m.id)?'✓ ':''}{m.label}</button>
          ))}
        </div>

        <form onSubmit={run} style={{ display:'flex', gap:8, marginBottom:28 }}>
          <input
            value={input} onChange={e=>setInput(e.target.value)}
            placeholder="dominio.com"
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
            {loading ? 'Analizando...' : 'Consultar'}
          </button>
        </form>

        {error && (
          <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginBottom:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        {result && <DNSResult data={result} />}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}

function DNSResult({ data }) {
  const [tab, setTab] = useState('dns')
  const dns  = data.dns || {}
  const subs = data.subdomains?.subdomains || data.subdomains || []
  const ssl  = data.ssl || {}
  const whois = data.whois || {}

  const tabs = [
    dns && Object.keys(dns).length   && 'dns',
    subs && subs.length              && 'subdomains',
    ssl  && Object.keys(ssl).length  && 'ssl',
    whois && Object.keys(whois).length && 'whois',
    'raw',
  ].filter(Boolean)

  const REC = ({ type, records }) => (
    records && records.length > 0 ? (
      <div style={{ marginBottom:14 }}>
        <div style={{ color:COLOR, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6 }}>{type}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {records.map((r,i)=>(
            <div key={i} style={{
              padding:'6px 10px', borderRadius:6, fontFamily:'monospace', fontSize:12,
              background:'rgba(34,211,238,0.06)', border:'1px solid rgba(34,211,238,0.12)',
              color:'rgba(255,255,255,0.8)',
            }}>
              {typeof r === 'object' ? JSON.stringify(r) : r}
            </div>
          ))}
        </div>
      </div>
    ) : null
  )

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {tabs.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:'5px 12px', borderRadius:6, fontSize:11, cursor:'pointer',
            background: tab===t ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.04)',
            border: tab===t ? '1px solid rgba(34,211,238,0.4)' : '1px solid rgba(255,255,255,0.07)',
            color: tab===t ? COLOR : 'rgba(255,255,255,0.45)',
            textTransform:'uppercase', letterSpacing:'0.06em',
          }}>{t}</button>
        ))}
      </div>

      {tab==='dns' && (
        <div style={{ background:'rgba(34,211,238,0.04)', border:'1px solid rgba(34,211,238,0.12)', borderRadius:12, padding:20 }}>
          <REC type="A (IPv4)"       records={dns.A}/>
          <REC type="AAAA (IPv6)"    records={dns.AAAA}/>
          <REC type="MX (Email)"     records={dns.MX?.map?.(r=>`${r.priority} ${r.exchange}`)|| dns.MX}/>
          <REC type="NS (Nameservers)" records={dns.NS}/>
          <REC type="TXT"            records={dns.TXT}/>
          <REC type="SOA"            records={dns.SOA ? [JSON.stringify(dns.SOA)] : []}/>
          <REC type="CNAME"          records={dns.CNAME}/>
        </div>
      )}

      {tab==='subdomains' && (
        <div>
          <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginBottom:12 }}>{subs.length} subdominios encontrados</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
            {subs.map((s,i)=>(
              <div key={i} style={{
                padding:'7px 10px', borderRadius:7,
                background:'rgba(34,211,238,0.06)', border:'1px solid rgba(34,211,238,0.12)',
                color:COLOR, fontSize:11, fontFamily:'monospace', wordBreak:'break-all',
              }}>{s}</div>
            ))}
          </div>
        </div>
      )}

      {tab==='ssl' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            ['Subject', ssl.subject?.CN || ssl.subject],
            ['Emisor',  ssl.issuer?.O  || ssl.issuer],
            ['Válido desde', ssl.not_before],
            ['Válido hasta', ssl.not_after],
            ['Versión', ssl.version],
            ['SANs', ssl.san?.join?.(', ')],
          ].filter(([,v])=>v).map(([k,v])=>(
            <div key={k} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px' }}>
              <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{k}</div>
              <div style={{ color:'#fff', fontSize:12, fontFamily:'monospace', wordBreak:'break-all' }}>{typeof v==='object'?JSON.stringify(v):String(v)}</div>
            </div>
          ))}
        </div>
      )}

      {tab==='whois' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            ['Registrante', whois.registrant_name || whois.org],
            ['Registrar',   whois.registrar],
            ['Creado',      whois.creation_date],
            ['Expira',      whois.expiration_date],
            ['Nameservers', Array.isArray(whois.name_servers)?whois.name_servers.join(', '):whois.name_servers],
            ['País',        whois.country],
          ].filter(([,v])=>v).map(([k,v])=>(
            <div key={k} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px' }}>
              <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{k}</div>
              <div style={{ color:'#fff', fontSize:12, fontFamily:'monospace' }}>{String(v)}</div>
            </div>
          ))}
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
