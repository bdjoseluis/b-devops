import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Search, Loader2, AlertCircle, ExternalLink, AlertTriangle, Shield } from 'lucide-react'

const COLOR = '#f97316'

const SEVERITY_COLORS = {
  CRITICAL: '#dc2626',
  HIGH:     '#f97316',
  MEDIUM:   '#f59e0b',
  LOW:      '#10b981',
  NONE:     '#6b7280',
}

export default function ToolCVE() {
  const [query,    setQuery]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [results,  setResults]  = useState(null)
  const [error,    setError]    = useState('')
  const [page,     setPage]     = useState(0)

  const run = async (e, pg=0) => {
    if (e?.preventDefault) e.preventDefault()
    if (!query.trim() || loading) return
    setLoading(true); setError('')
    if (pg === 0) setResults(null)

    try {
      // NVD API v2 - free, no key required (rate limited to 5 req/30s without key)
      const isId = /^CVE-\d{4}-\d+$/i.test(query.trim())
      const params = new URLSearchParams({ resultsPerPage: 15, startIndex: pg * 15 })
      if (isId) params.set('cveId', query.trim().toUpperCase())
      else       params.set('keywordSearch', query.trim())

      const resp = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?${params.toString()}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      const cves = (data.vulnerabilities || []).map(v => v.cve)
      setResults({ cves, total: data.totalResults, page: pg })
      setPage(pg)
    } catch (err) {
      setError(err.message || 'Error al consultar NVD')
    } finally { setLoading(false) }
  }

  return (
    <ToolShell icon="⚠️" name="CVE Lookup" color={COLOR} badge="National Vulnerability Database · NVD NIST">
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>

        <form onSubmit={run} style={{ display:'flex', gap:8, marginBottom:28 }}>
          <input
            value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="CVE-2021-44228 / log4j / apache remote code execution"
            style={{
              flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(249,115,22,0.2)',
              color:'#fff', padding:'11px 16px', borderRadius:10, fontSize:14, outline:'none',
            }}
            onFocus={e=>e.target.style.borderColor='rgba(249,115,22,0.55)'}
            onBlur={e=>e.target.style.borderColor='rgba(249,115,22,0.2)'}
          />
          <button type="submit" disabled={!query.trim()||loading} style={{
            padding:'11px 22px', borderRadius:10, cursor:'pointer',
            background:'rgba(249,115,22,0.18)', border:'1px solid rgba(249,115,22,0.4)',
            color:COLOR, fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:7,
          }}>
            {loading ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Search size={14}/>}
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {error && <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginBottom:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}><AlertCircle size={14}/> {error}</div>}

        {results && (
          <div>
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginBottom:12 }}>
              {results.total} CVEs — mostrando {results.cves.length}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {results.cves.map(cve => {
                const id      = cve.id
                const desc    = cve.descriptions?.find?.(d=>d.lang==='en')?.value || ''
                const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV2?.[0]
                const score   = metrics?.cvssData?.baseScore
                const sev     = metrics?.cvssData?.baseSeverity || (score>=9?'CRITICAL':score>=7?'HIGH':score>=4?'MEDIUM':score>0?'LOW':'NONE')
                const sevCol  = SEVERITY_COLORS[sev] || '#6b7280'
                const published = cve.published?.slice(0,10)
                const refs    = cve.references?.slice(0,3) || []

                return (
                  <div key={id} style={{
                    background:'rgba(249,115,22,0.05)', border:'1px solid rgba(249,115,22,0.15)',
                    borderRadius:12, padding:'16px 18px',
                  }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                          <span style={{ color:COLOR, fontWeight:700, fontSize:13, fontFamily:'monospace' }}>{id}</span>
                          {score && (
                            <span style={{
                              padding:'2px 8px', borderRadius:5, fontSize:11, fontWeight:700,
                              background:`rgba(${sevCol.slice(1).match(/../g).map(h=>parseInt(h,16)).join(',')},0.18)`,
                              border:`1px solid rgba(${sevCol.slice(1).match(/../g).map(h=>parseInt(h,16)).join(',')},0.4)`,
                              color: sevCol,
                            }}>
                              {sev} {score}
                            </span>
                          )}
                          <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11 }}>{published}</span>
                        </div>
                        <div style={{ color:'rgba(255,255,255,0.7)', fontSize:12, lineHeight:1.6 }}>
                          {desc.slice(0, 240)}{desc.length > 240 ? '...' : ''}
                        </div>
                      </div>
                      <a href={`https://nvd.nist.gov/vuln/detail/${id}`} target="_blank" rel="noopener noreferrer"
                        style={{ color:COLOR, flexShrink:0, opacity:0.7, marginTop:2 }}>
                        <ExternalLink size={14}/>
                      </a>
                    </div>
                    {refs.length > 0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
                        {refs.map((r,i)=>(
                          <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{
                            color:'rgba(255,255,255,0.35)', fontSize:10, textDecoration:'none',
                            padding:'2px 7px', borderRadius:4, background:'rgba(255,255,255,0.06)',
                            border:'1px solid rgba(255,255,255,0.08)', maxWidth:200, overflow:'hidden',
                            textOverflow:'ellipsis', whiteSpace:'nowrap',
                          }}>
                            ↗ {new URL(r.url).hostname}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {results.cves.length < results.total && (
              <div style={{ display:'flex', justifyContent:'center', marginTop:20 }}>
                <button onClick={()=>run(null, page+1)} disabled={loading} style={{
                  padding:'9px 20px', borderRadius:9, cursor:'pointer',
                  background:'rgba(249,115,22,0.12)', border:'1px solid rgba(249,115,22,0.3)',
                  color:COLOR, fontSize:12, display:'flex', alignItems:'center', gap:6,
                }}>
                  {loading ? <Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/> : null}
                  Cargar más ({results.total - ((page+1)*15)} restantes)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}
