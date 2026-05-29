import { useState, useCallback } from 'react'
import ToolShell from '../components/ToolShell'
import { Search, Loader2, AlertCircle, Globe, Copy, CheckCircle, Download, RefreshCw, ExternalLink } from 'lucide-react'

const COLOR = '#22d3ee'

// Sources we can query from the browser
const SOURCES = {
  crtsh: {
    name: 'crt.sh',
    desc: 'Certificate Transparency logs',
    fn: async (domain) => {
      const r = await fetch(`https://crt.sh/?q=%.${domain}&output=json`)
      const data = await r.json()
      const subs = new Set()
      data.forEach(cert => {
        const names = (cert.name_value || '').split('\n')
        names.forEach(n => {
          n = n.trim().toLowerCase()
          if (n.endsWith(`.${domain}`) || n === domain) subs.add(n.replace('*.',''))
        })
      })
      return [...subs]
    },
  },
  hackertarget: {
    name: 'HackerTarget',
    desc: 'DNS enumeration API',
    fn: async (domain) => {
      const r = await fetch(`https://api.hackertarget.com/hostsearch/?q=${domain}`)
      const text = await r.text()
      if (text.includes('error') || text.includes('API count exceeded')) return []
      return text.split('\n')
        .filter(l => l.includes(','))
        .map(l => l.split(',')[0].trim().toLowerCase())
        .filter(s => s.endsWith(`.${domain}`) || s === domain)
    },
  },
  urlscan: {
    name: 'urlscan.io',
    desc: 'Web scanner database',
    fn: async (domain) => {
      const r = await fetch(`https://urlscan.io/api/v1/search/?q=domain:${domain}&size=100`)
      const data = await r.json()
      const subs = new Set()
      ;(data.results || []).forEach(res => {
        const h = res.page?.domain || res.task?.domain
        if (h && (h.endsWith(`.${domain}`) || h === domain)) subs.add(h.toLowerCase())
      })
      return [...subs]
    },
  },
}

function parseDomain(input) {
  let d = input.trim().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].toLowerCase()
  // Strip www.
  return d.replace(/^www\./,'')
}

export default function ToolSubdomains() {
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState({})
  const [results,  setResults]  = useState({})
  const [error,    setError]    = useState({})
  const [filter,   setFilter]   = useState('')
  const [copied,   setCopied]   = useState('')

  const query = async (srcId) => {
    const domain = parseDomain(input)
    if (!domain) return
    setLoading(l => ({ ...l, [srcId]: true }))
    setError(e => ({ ...e, [srcId]: null }))
    try {
      const src = SOURCES[srcId]
      const subs = await src.fn(domain)
      setResults(r => ({ ...r, [srcId]: subs }))
    } catch (err) {
      setError(e => ({ ...e, [srcId]: err.message || 'Error al consultar' }))
    } finally {
      setLoading(l => ({ ...l, [srcId]: false }))
    }
  }

  const queryAll = async () => {
    for (const id of Object.keys(SOURCES)) await query(id)
  }

  // Merge deduplicated
  const domain = parseDomain(input)
  const allSubs = [...new Set(
    Object.values(results).flat().filter(s => s && (s.endsWith(`.${domain}`) || s === domain))
  )].sort()

  const filtered = allSubs.filter(s => !filter || s.includes(filter.toLowerCase()))

  const copy = (v) => {
    navigator.clipboard.writeText(v).catch(() => {})
    setCopied(v)
    setTimeout(() => setCopied(''), 1500)
  }

  const exportTxt = () => {
    const blob = new Blob([filtered.join('\n')], { type:'text/plain' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `subdomains_${domain}.txt`; a.click()
  }

  const EXAMPLES = ['google.com', 'tesla.com', 'cloudflare.com']

  return (
    <ToolShell icon="🌐" name="Subdomain Finder" color={COLOR} badge="crt.sh · HackerTarget · urlscan.io — OSINT pasivo">
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>

        {/* Input */}
        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <div style={{ position:'relative', flex:1 }}>
            <Globe size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)' }}/>
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setResults({}); setError({}) }}
              onKeyDown={e => e.key === 'Enter' && queryAll()}
              placeholder="example.com"
              style={{ width:'100%', boxSizing:'border-box', background:'rgba(34,211,238,0.06)', border:'1px solid rgba(34,211,238,0.3)', color:'#fff', padding:'11px 14px 11px 38px', borderRadius:10, fontSize:14, outline:'none', fontFamily:'monospace' }}
            />
          </div>
          <button onClick={queryAll} disabled={!input.trim() || Object.values(loading).some(Boolean)}
            style={{ padding:'11px 22px', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:7, background:'rgba(34,211,238,0.15)', border:'1px solid rgba(34,211,238,0.4)', color:COLOR, fontWeight:700, fontSize:13 }}>
            {Object.values(loading).some(Boolean) ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> : <Search size={14}/>}
            Buscar todo
          </button>
        </div>

        {/* Examples */}
        <div style={{ display:'flex', gap:6, marginBottom:24, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ color:'rgba(255,255,255,0.25)', fontSize:11 }}>Ejemplos:</span>
          {EXAMPLES.map(e => (
            <button key={e} onClick={() => { setInput(e); setResults({}); setError({}) }}
              style={{ padding:'3px 10px', borderRadius:6, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:11, cursor:'pointer', fontFamily:'monospace' }}>
              {e}
            </button>
          ))}
        </div>

        {/* Per-source status */}
        <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
          {Object.entries(SOURCES).map(([id, src]) => (
            <div key={id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', flex:1, minWidth:180 }}>
              <div>
                <div style={{ color:'rgba(255,255,255,0.6)', fontSize:12, fontWeight:600 }}>{src.name}</div>
                <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10 }}>{src.desc}</div>
              </div>
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
                {loading[id] && <Loader2 size={12} style={{ animation:'spin 1s linear infinite', color:COLOR }}/>}
                {results[id] && !loading[id] && (
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:5, background:'rgba(34,211,238,0.12)', color:COLOR, fontFamily:'monospace' }}>
                    {results[id].length}
                  </span>
                )}
                {error[id] && <AlertCircle size={12} style={{ color:'#fca5a5' }}/>}
                <button onClick={() => query(id)} disabled={!input.trim() || loading[id]}
                  style={{ padding:'4px 8px', borderRadius:6, cursor:'pointer', background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', color:COLOR, fontSize:10 }}>
                  {loading[id] ? '...' : <RefreshCw size={10}/>}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Results */}
        {allSubs.length > 0 && (
          <>
            {/* Header + filter */}
            <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
              <div style={{ padding:'6px 14px', borderRadius:9, background:'rgba(34,211,238,0.12)', border:'1px solid rgba(34,211,238,0.3)', color:COLOR, fontWeight:700, fontSize:13 }}>
                {allSubs.length} subdominios únicos
              </div>
              <div style={{ position:'relative', flex:1, minWidth:160 }}>
                <Search size={11} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)' }}/>
                <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar..."
                  style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'6px 10px 6px 28px', borderRadius:8, fontSize:11, outline:'none' }}/>
              </div>
              <button onClick={exportTxt}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:11 }}>
                <Download size={11}/> Exportar
              </button>
            </div>

            {/* Grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:6 }}>
              {filtered.map((sub, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:10, background:'rgba(34,211,238,0.04)', border:'1px solid rgba(34,211,238,0.12)', transition:'all .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(34,211,238,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(34,211,238,0.04)'}>
                  <Globe size={11} style={{ color:COLOR, flexShrink:0 }}/>
                  <span style={{ flex:1, color:'rgba(255,255,255,0.75)', fontFamily:'monospace', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sub}</span>
                  <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                    <a href={`https://${sub}`} target="_blank" rel="noopener noreferrer" style={{ color:'rgba(255,255,255,0.2)', display:'flex' }}>
                      <ExternalLink size={10}/>
                    </a>
                    <button onClick={() => copy(sub)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.2)', padding:0, display:'flex' }}>
                      {copied === sub ? <CheckCircle size={10} style={{ color:'#10b981' }}/> : <Copy size={10}/>}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && filter && (
              <div style={{ textAlign:'center', padding:'30px 0', color:'rgba(255,255,255,0.2)', fontSize:12 }}>
                No hay subdominios que contengan "{filter}"
              </div>
            )}
          </>
        )}

        {/* Info */}
        <div style={{ marginTop:24, padding:'10px 14px', borderRadius:8, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.2)', fontSize:10 }}>
          🔍 Técnica de reconocimiento pasivo — no se contacta directamente con el objetivo. Fuentes: Certificate Transparency (crt.sh), HackerTarget DNS, urlscan.io
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}
