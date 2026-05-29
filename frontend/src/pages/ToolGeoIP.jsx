import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Search, Loader2, Globe, MapPin, Wifi, AlertCircle, ExternalLink, Copy, CheckCircle } from 'lucide-react'

const COLOR = '#3b82f6'

const INFO_SOURCES = [
  { id:'ipapi',   name:'ipapi.co',    fn: ip => `https://ipapi.co/${ip}/json/` },
  { id:'ipwho',   name:'ipwho.is',    fn: ip => `https://ipwho.is/${ip}` },
]

async function geoLookup(ip) {
  // Try ipapi.co first
  try {
    const r1 = await fetch(`https://ipapi.co/${ip}/json/`)
    const d = await r1.json()
    if (d && d.country_code && !d.error) {
      return {
        ip:         d.ip,
        city:       d.city,
        region:     d.region,
        country:    d.country_name,
        country_code: d.country_code,
        continent:  d.continent_code,
        lat:        d.latitude,
        lon:        d.longitude,
        timezone:   d.timezone,
        org:        d.org,
        asn:        d.asn,
        isp:        d.org?.replace(/^AS\d+\s+/,''),
        postal:     d.postal,
        currency:   d.currency,
        calling_code: d.country_calling_code,
        source: 'ipapi.co',
      }
    }
  } catch {}
  // Fallback: ipwho.is
  const r2 = await fetch(`https://ipwho.is/${ip}`)
  const d2 = await r2.json()
  return {
    ip:         d2.ip,
    city:       d2.city,
    region:     d2.region,
    country:    d2.country,
    country_code: d2.country_code,
    continent:  d2.continent_code,
    lat:        d2.latitude,
    lon:        d2.longitude,
    timezone:   d2.timezone?.id,
    org:        d2.connection?.org,
    asn:        d2.connection?.asn,
    isp:        d2.connection?.isp,
    postal:     d2.postal,
    source: 'ipwho.is',
  }
}

// Map flag emoji from country code
const flag = code => code ? String.fromCodePoint(...[...code.toUpperCase()].map(c => 127397 + c.charCodeAt(0))) : ''

// Format ASN
const fmtAsn = (asn) => asn ? (typeof asn === 'number' ? `AS${asn}` : asn) : null

const EXAMPLES = ['8.8.8.8', '1.1.1.1', '52.86.0.0', '185.60.216.35', '104.21.0.0']

const THREAT_CHECKS = [
  { label:'Bogon/Privada', check: ip => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|169\.254\.|::1|fc|fd)/.test(ip), note:'IP reservada/privada' },
  { label:'Loopback',      check: ip => /^127\./.test(ip), note:'Localhost' },
]

export default function ToolGeoIP() {
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')
  const [copied,  setCopied]  = useState('')

  const lookup = async () => {
    const ip = input.trim()
    if (!ip || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      const data = await geoLookup(ip)
      setResult(data)
    } catch (err) {
      setError('No se pudo obtener información para esta IP. Verifica el formato.')
    } finally {
      setLoading(false)
    }
  }

  const copy = (v) => {
    navigator.clipboard.writeText(v).catch(() => {})
    setCopied(v); setTimeout(() => setCopied(''), 1500)
  }

  const Row = ({ label, value, mono, link }) => value ? (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color:'rgba(255,255,255,0.35)', fontSize:12 }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" style={{ color:COLOR, fontSize:12, fontFamily: mono?'monospace':'inherit', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
            {value} <ExternalLink size={9}/>
          </a>
        ) : (
          <span style={{ color:'#fff', fontSize:12, fontFamily: mono?'monospace':'inherit', textAlign:'right', maxWidth:300 }}>{value}</span>
        )}
        <button onClick={() => copy(String(value))} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.2)', padding:0, display:'flex' }}>
          {copied === String(value) ? <CheckCircle size={10} style={{ color:'#10b981' }}/> : <Copy size={10}/>}
        </button>
      </div>
    </div>
  ) : null

  return (
    <ToolShell icon="📍" name="GeoIP Lookup" color={COLOR} badge="Geolocalización IP · Organización · Timezone · Mapa">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Input */}
        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <div style={{ position:'relative', flex:1 }}>
            <Globe size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)' }}/>
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setResult(null); setError('') }}
              onKeyDown={e => e.key === 'Enter' && lookup()}
              placeholder="8.8.8.8 o 2001:4860:4860::8888"
              style={{ width:'100%', boxSizing:'border-box', background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.3)', color:'#fff', padding:'12px 14px 12px 38px', borderRadius:10, fontSize:14, outline:'none', fontFamily:'monospace' }}
            />
          </div>
          <button onClick={lookup} disabled={!input.trim() || loading}
            style={{ padding:'12px 22px', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:7, background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.4)', color:COLOR, fontWeight:700, fontSize:13 }}>
            {loading ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> : <Search size={14}/>}
            Localizar
          </button>
        </div>

        {/* Examples */}
        <div style={{ display:'flex', gap:6, marginBottom:24, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ color:'rgba(255,255,255,0.25)', fontSize:11 }}>Ejemplos:</span>
          {EXAMPLES.map(e => (
            <button key={e} onClick={() => { setInput(e); setResult(null); setError('') }}
              style={{ padding:'3px 10px', borderRadius:6, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:11, cursor:'pointer', fontFamily:'monospace' }}>
              {e}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign:'center', padding:'60px 0' }}>
            <Loader2 size={28} style={{ animation:'spin 1s linear infinite', color:COLOR, display:'block', margin:'0 auto 12px' }}/>
            <div style={{ color:'rgba(255,255,255,0.35)', fontSize:13 }}>Localizando {input}...</div>
          </div>
        )}

        {error && (
          <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>
            <AlertCircle size={14}/>{error}
          </div>
        )}

        {result && !loading && (
          <>
            {/* Banner */}
            <div style={{ display:'flex', alignItems:'center', gap:16, padding:'18px 22px', borderRadius:16, marginBottom:20, background:`rgba(59,130,246,0.08)`, border:`1px solid rgba(59,130,246,0.2)`, flexWrap:'wrap' }}>
              <div style={{ fontSize:48 }}>{flag(result.country_code)}</div>
              <div>
                <div style={{ color:'#fff', fontWeight:800, fontFamily:'monospace', fontSize:20 }}>{result.ip}</div>
                <div style={{ color:'rgba(255,255,255,0.6)', fontSize:14, marginTop:2 }}>
                  {[result.city, result.region, result.country].filter(Boolean).join(', ')}
                </div>
              </div>
              {result.lat && result.lon && (
                <a href={`https://www.google.com/maps?q=${result.lat},${result.lon}&z=10`} target="_blank" rel="noopener noreferrer"
                  style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10, background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.35)', color:COLOR, textDecoration:'none', fontSize:12, fontWeight:600 }}>
                  <MapPin size={13}/> Ver en Google Maps
                </a>
              )}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {/* Location details */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
                <div style={{ color:COLOR, fontWeight:700, fontSize:12, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  <MapPin size={12}/> Ubicación
                </div>
                <Row label="IP"            value={result.ip}           mono />
                <Row label="Ciudad"        value={result.city} />
                <Row label="Región"        value={result.region} />
                <Row label="País"          value={`${flag(result.country_code)} ${result.country}`} />
                <Row label="Coordenadas"   value={result.lat && `${result.lat?.toFixed(4)}, ${result.lon?.toFixed(4)}`} mono />
                <Row label="Código postal" value={result.postal} mono />
                <Row label="Timezone"      value={result.timezone} />
                {result.currency && <Row label="Moneda" value={result.currency} />}
                {result.calling_code && <Row label="Prefijo telf." value={result.calling_code} />}
              </div>

              {/* Network details */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
                <div style={{ color:'rgba(255,255,255,0.5)', fontWeight:700, fontSize:12, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  <Wifi size={12}/> Red
                </div>
                <Row label="ASN"           value={fmtAsn(result.asn)} mono />
                <Row label="ISP"           value={result.isp || result.org} />
                <Row label="Organización"  value={result.org} />
                <Row label="Continente"    value={result.continent} />

                {/* Threat flags */}
                <div style={{ marginTop:16, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Análisis</div>
                  {(() => {
                    const threats = THREAT_CHECKS.filter(t => t.check(result.ip))
                    if (threats.length === 0) {
                      return <div style={{ display:'flex', alignItems:'center', gap:6, color:'#10b981', fontSize:12 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981' }}/>
                        IP pública — no es bogon ni privada
                      </div>
                    }
                    return threats.map(t => (
                      <div key={t.label} style={{ display:'flex', alignItems:'center', gap:6, color:'#f59e0b', fontSize:12, marginBottom:4 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:'#f59e0b' }}/>
                        {t.label}: {t.note}
                      </div>
                    ))
                  })()}
                </div>

                {/* Source */}
                <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10 }}>Fuente: {result.source}</span>
                  <a href={`https://ipapi.co/${result.ip}/`} target="_blank" rel="noopener noreferrer"
                    style={{ color:'rgba(255,255,255,0.3)', fontSize:10, display:'flex', alignItems:'center', gap:4, textDecoration:'none' }}>
                    Ver más <ExternalLink size={9}/>
                  </a>
                </div>
              </div>
            </div>

            {/* Map iframe */}
            {result.lat && result.lon && (
              <div style={{ marginTop:16, borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)' }}>
                <iframe
                  title="map"
                  width="100%"
                  height="280"
                  frameBorder="0"
                  scrolling="no"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${result.lon-2},${result.lat-1.5},${result.lon+2},${result.lat+1.5}&layer=mapnik&marker=${result.lat},${result.lon}`}
                  style={{ display:'block' }}
                />
                <div style={{ padding:'8px 14px', background:'rgba(255,255,255,0.02)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10 }}>OpenStreetMap · © OpenStreetMap contributors</span>
                  <a href={`https://www.openstreetmap.org/?mlat=${result.lat}&mlon=${result.lon}#map=10/${result.lat}/${result.lon}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color:COLOR, fontSize:10, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                    Abrir en OSM <ExternalLink size={9}/>
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}
