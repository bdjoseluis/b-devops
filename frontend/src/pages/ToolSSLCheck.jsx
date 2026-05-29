import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Lock, Search, Loader2, AlertTriangle, CheckCircle, ExternalLink, Shield, Calendar, Globe } from 'lucide-react'

const COLOR = '#10b981'

// Uses crt.sh and SSL Labs external services
const GRADING_COLORS = { A: '#10b981', 'A+': '#22d3ee', B: '#f59e0b', C: '#f97316', D: '#ef4444', F: '#dc2626', T: '#6b7280', M: '#a855f7' }

const CHECKERS = [
  { name: 'SSL Labs',      icon: '🔬', url: d => `https://www.ssllabs.com/ssltest/analyze.html?d=${d}&hideResults=on`, desc: 'Análisis completo A-F' },
  { name: 'SecurityHeaders', icon: '🛡️', url: d => `https://securityheaders.com/?q=${d}&followRedirects=on`, desc: 'Headers de seguridad HTTP' },
  { name: 'crt.sh',        icon: '📜', url: d => `https://crt.sh/?q=${d}`, desc: 'Historial de certificados' },
  { name: 'ImmuniWeb',     icon: '🧬', url: d => `https://www.immuniweb.com/ssl/?id=${d}`, desc: 'Test SSL + PCI/HIPAA' },
  { name: 'Observatory',   icon: '🔭', url: d => `https://observatory.mozilla.org/analyze/${d}`, desc: 'Mozilla Observatory' },
  { name: 'Hardenize',     icon: '⚙️', url: d => `https://www.hardenize.com/report/${d}`, desc: 'Análisis completo de configuración' },
]

const TLS_BEST = {
  good:    ['TLS 1.3', 'TLS 1.2'],
  weak:    ['TLS 1.1', 'TLS 1.0', 'SSL 3.0', 'SSL 2.0'],
  ciphers_good: ['AES-256-GCM', 'AES-128-GCM', 'CHACHA20-POLY1305'],
  ciphers_weak: ['RC4', 'DES', '3DES', 'MD5', 'SHA-1', 'NULL', 'EXPORT', 'anon'],
}

const HEADERS_CHECK = [
  { name: 'Strict-Transport-Security', alias: 'HSTS',           level: 'critical', desc: 'Fuerza HTTPS en el navegador' },
  { name: 'X-Frame-Options',           alias: 'X-Frame',        level: 'high',     desc: 'Previene clickjacking' },
  { name: 'X-Content-Type-Options',    alias: 'X-Content-Type', level: 'medium',   desc: 'Previene MIME sniffing' },
  { name: 'Content-Security-Policy',   alias: 'CSP',            level: 'critical', desc: 'Previene XSS/injection' },
  { name: 'Referrer-Policy',           alias: 'Referrer',       level: 'low',      desc: 'Controla info de referrer' },
  { name: 'Permissions-Policy',        alias: 'Permissions',    level: 'medium',   desc: 'Control de APIs del navegador' },
]

export default function ToolSSLCheck() {
  const [domain,  setDomain]  = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const check = async () => {
    const d = domain.trim().replace(/^https?:\/\//i, '').split('/')[0]
    if (!d) return
    setLoading(true); setError(''); setResult(null)

    try {
      // Fetch certificate info via crt.sh API
      const [crtRes, headersRes] = await Promise.all([
        fetch(`https://crt.sh/?q=${d}&output=json`).then(r => r.json()).catch(() => null),
        fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://${d}/`)}`)
          .then(r => r.json()).catch(() => null),
      ])

      // Parse crt.sh data
      let certs = []
      if (crtRes && Array.isArray(crtRes)) {
        // Group by common name and get latest
        const grouped = {}
        crtRes.forEach(c => {
          const cn = c.common_name
          if (!grouped[cn] || new Date(c.not_after) > new Date(grouped[cn].not_after)) {
            grouped[cn] = c
          }
        })
        certs = Object.values(grouped)
          .filter(c => c.common_name === d || c.common_name === `*.${d.split('.').slice(1).join('.')}`)
          .sort((a, b) => new Date(b.not_after) - new Date(a.not_after))
          .slice(0, 5)
      }

      // Parse response headers
      const headers = {}
      if (headersRes?.headers) {
        Object.assign(headers, headersRes.headers)
      }

      // Build result
      const latest = certs[0]
      const now = new Date()
      let daysLeft = null
      let expired  = false
      if (latest?.not_after) {
        const exp = new Date(latest.not_after)
        daysLeft = Math.floor((exp - now) / (1000 * 60 * 60 * 24))
        expired  = daysLeft < 0
      }

      setResult({
        domain: d,
        certs,
        latest,
        daysLeft,
        expired,
        issuer: latest?.issuer_name || null,
        total: crtRes?.length || 0,
        headers,
      })
    } catch (err) {
      setError('Error al consultar. Verifica que el dominio sea válido.')
    } finally {
      setLoading(false)
    }
  }

  const statusColor = result
    ? result.expired ? '#ef4444'
    : result.daysLeft < 14 ? '#f97316'
    : result.daysLeft < 30 ? '#f59e0b'
    : '#10b981'
    : '#6b7280'

  const EXAMPLES = ['google.com', 'github.com', 'cloudflare.com', 'bdev.qzz.io']

  return (
    <ToolShell icon="🔒" name="SSL / TLS Checker" color={COLOR} badge="Certificados · Expiración · Headers · crt.sh · Historial">
      <div style={{ maxWidth: 950, margin: '0 auto', padding: '32px 24px' }}>

        {/* Input */}
        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <div style={{ position:'relative', flex:1 }}>
            <Globe size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)' }}/>
            <input
              value={domain}
              onChange={e => setDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && check()}
              placeholder="example.com o sub.example.com"
              style={{ width:'100%', boxSizing:'border-box', background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.3)', color:'#fff', padding:'11px 14px 11px 38px', borderRadius:10, fontSize:14, outline:'none', fontFamily:'monospace' }}
            />
          </div>
          <button onClick={check} disabled={!domain.trim() || loading}
            style={{ padding:'11px 22px', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:7, background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.4)', color:COLOR, fontWeight:700, fontSize:13 }}>
            {loading ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> : <Search size={14}/>}
            Verificar
          </button>
        </div>

        <div style={{ display:'flex', gap:6, marginBottom:24, flexWrap:'wrap' }}>
          <span style={{ color:'rgba(255,255,255,0.25)', fontSize:11, alignSelf:'center' }}>Ejemplos:</span>
          {EXAMPLES.map(e => (
            <button key={e} onClick={() => { setDomain(e); setResult(null) }}
              style={{ padding:'3px 10px', borderRadius:6, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:11, cursor:'pointer', fontFamily:'monospace' }}>
              {e}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign:'center', padding:'60px 0' }}>
            <Loader2 size={28} style={{ animation:'spin 1s linear infinite', color:COLOR, display:'block', margin:'0 auto 12px' }}/>
            <div style={{ color:'rgba(255,255,255,0.35)', fontSize:13 }}>Consultando certificados para {domain}...</div>
          </div>
        )}

        {error && (
          <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>
            <AlertTriangle size={14}/>{error}
          </div>
        )}

        {result && !loading && (
          <>
            {/* Status banner */}
            <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', borderRadius:14, marginBottom:20, background:`${statusColor}12`, border:`1px solid ${statusColor}30` }}>
              <Lock size={22} style={{ color:statusColor }}/>
              <div>
                <div style={{ color:'#fff', fontWeight:700, fontSize:16, fontFamily:'monospace' }}>{result.domain}</div>
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:12, marginTop:2 }}>
                  {result.total} certificados en historial crt.sh
                </div>
              </div>
              {result.daysLeft !== null && (
                <div style={{ marginLeft:'auto', textAlign:'right' }}>
                  <div style={{ color:statusColor, fontWeight:800, fontSize:22, fontFamily:'monospace' }}>
                    {result.expired ? 'EXPIRADO' : `${result.daysLeft}d`}
                  </div>
                  <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>
                    {result.expired ? 'certificado expirado' : 'hasta expiración'}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
              {/* Latest cert */}
              {result.latest && (
                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
                  <div style={{ color:COLOR, fontWeight:700, fontSize:12, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                    <Shield size={13}/> Certificado activo
                  </div>
                  {[
                    ['Common Name', result.latest.common_name],
                    ['Emisor', result.latest.issuer_name?.match(/O=([^,]+)/)?.[1] || result.latest.issuer_name?.slice(0,50)],
                    ['Válido desde', result.latest.not_before?.slice(0,10)],
                    ['Válido hasta', result.latest.not_after?.slice(0,10)],
                    ['ID',          '#' + result.latest.id],
                  ].map(([l,v]) => v ? (
                    <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>{l}</span>
                      <span style={{ color:'#fff', fontSize:11, fontFamily:'monospace', textAlign:'right', maxWidth:'60%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</span>
                    </div>
                  ) : null)}
                  <a href={`https://crt.sh/?id=${result.latest.id}`} target="_blank" rel="noopener noreferrer"
                    style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:12, padding:'5px 12px', borderRadius:7, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', color:COLOR, fontSize:11, textDecoration:'none' }}>
                    <ExternalLink size={10}/> Ver en crt.sh
                  </a>
                </div>
              )}

              {/* Cert history */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
                <div style={{ color:'rgba(255,255,255,0.5)', fontWeight:700, fontSize:12, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  <Calendar size={13}/> Historial reciente
                </div>
                {result.certs.length > 0 ? result.certs.map((c, i) => {
                  const exp = new Date(c.not_after)
                  const dl  = Math.floor((exp - new Date()) / (1000 * 60 * 60 * 24))
                  const col = dl < 0 ? '#6b7280' : dl < 30 ? '#f59e0b' : '#10b981'
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:col, flexShrink:0 }}/>
                      <div style={{ flex:1, overflow:'hidden' }}>
                        <div style={{ color:'rgba(255,255,255,0.7)', fontSize:11, fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.common_name}</div>
                        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10 }}>{c.not_after?.slice(0,10)}</div>
                      </div>
                      <span style={{ fontSize:10, color:col, flexShrink:0 }}>{dl < 0 ? 'expirado' : `${dl}d`}</span>
                    </div>
                  )
                }) : (
                  <div style={{ color:'rgba(255,255,255,0.3)', fontSize:12 }}>No se encontraron certificados en crt.sh</div>
                )}
              </div>
            </div>

            {/* Security headers checklist */}
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
              <div style={{ color:'rgba(255,255,255,0.5)', fontWeight:700, fontSize:12, marginBottom:12 }}>
                🛡️ Headers de seguridad recomendados
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:8 }}>
                {HEADERS_CHECK.map(h => {
                  const present = Object.keys(result.headers).some(k => k.toLowerCase() === h.name.toLowerCase())
                  const levelColors = { critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#6b7280' }
                  const lc = levelColors[h.level]
                  return (
                    <div key={h.name} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', borderRadius:9, background: present ? 'rgba(16,185,129,0.06)':'rgba(255,255,255,0.025)', border:`1px solid ${present ? 'rgba(16,185,129,0.2)':'rgba(255,255,255,0.06)'}` }}>
                      {present ? <CheckCircle size={13} style={{ color:'#10b981', flexShrink:0, marginTop:1 }}/> : <AlertTriangle size={13} style={{ color:lc, flexShrink:0, marginTop:1 }}/>}
                      <div>
                        <div style={{ color: present ? '#fff':'rgba(255,255,255,0.5)', fontSize:12, fontFamily:'monospace', fontWeight:600 }}>{h.alias}</div>
                        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10, marginTop:2 }}>{h.desc}</div>
                      </div>
                      {!present && <span style={{ marginLeft:'auto', fontSize:9, padding:'2px 6px', borderRadius:3, background:`${lc}15`, color:lc, fontWeight:700, flexShrink:0 }}>{h.level.toUpperCase()}</span>}
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop:8, fontSize:10, color:'rgba(255,255,255,0.2)' }}>
                * La detección de headers es aproximada — usa SSL Labs para análisis completo
              </div>
            </div>

            {/* External tools */}
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
              <div style={{ color:'rgba(255,255,255,0.5)', fontWeight:700, fontSize:12, marginBottom:12 }}>🔗 Análisis profundo con herramientas externas</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:8 }}>
                {CHECKERS.map(c => (
                  <a key={c.name} href={c.url(result.domain)} target="_blank" rel="noopener noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.6)', textDecoration:'none', transition:'all .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(16,185,129,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}>
                    <span style={{ fontSize:16 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{c.name}</div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:1 }}>{c.desc}</div>
                    </div>
                    <ExternalLink size={10} style={{ marginLeft:'auto', flexShrink:0, color:'rgba(255,255,255,0.25)' }}/>
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}
