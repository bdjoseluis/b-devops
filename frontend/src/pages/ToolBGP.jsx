import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { tools } from '../api/client'
import { Search, Loader2, AlertCircle, Globe, Network, Server, ChevronRight, Map } from 'lucide-react'

const COLOR = '#22d3ee'

export default function ToolBGP() {
  const [input,    setInput]   = useState('')
  const [mode,     setMode]    = useState('ip') // ip | asn
  const [loading,  setLoading] = useState(false)
  const [result,   setResult]  = useState(null)
  const [error,    setError]   = useState('')
  const [tab,      setTab]     = useState('summary')

  const run = async (e) => {
    e?.preventDefault()
    const q = input.trim()
    if (!q || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      if (mode === 'ip') {
        const [ipData, prefixData] = await Promise.all([
          tools.bgpIp(q).catch(() => null),
          fetch(`https://ipapi.co/${q}/json/`).then(r => r.json()).catch(() => null),
        ])
        setResult({ type: 'ip', bgp: ipData, geo: prefixData })
      } else {
        const asn = q.toUpperCase().startsWith('AS') ? q : `AS${q}`
        const [asnData, prefixes, peers] = await Promise.all([
          tools.bgpAsn(asn).catch(() => null),
          tools.bgpPrefixes(asn).catch(() => null),
          tools.bgpPeers(asn).catch(() => null),
        ])
        setResult({ type: 'asn', asn: asnData, prefixes, peers })
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al consultar BGP')
    } finally { setLoading(false) }
  }

  const Row = ({ label, value, mono }) => value ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{label}</span>
      <span style={{ color: '#fff', fontSize: 12, fontFamily: mono ? 'monospace' : 'inherit', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  ) : null

  return (
    <ToolShell icon="🌐" name="BGP / ASN Lookup" color={COLOR} badge="Routing · Prefijos · Peers · Geolocalización IP">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        <form onSubmit={run} style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
            {['ip', 'asn'].map(m => (
              <button key={m} type="button" onClick={() => setMode(m)} style={{ padding: '10px 16px', cursor: 'pointer', background: mode === m ? 'rgba(34,211,238,0.15)' : 'transparent', border: 'none', color: mode === m ? COLOR : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: mode === m ? 700 : 400, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {m === 'ip' ? 'IP / CIDR' : 'ASN'}
              </button>
            ))}
          </div>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={mode === 'ip' ? '8.8.8.8 o 1.1.1.1/24...' : 'AS15169 o 15169...'}
            style={{ flex: 1, background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.25)', color: '#fff', padding: '10px 14px', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'monospace' }}
            onFocus={e => e.target.style.borderColor = 'rgba(34,211,238,0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(34,211,238,0.25)'}
          />
          <button type="submit" disabled={!input.trim() || loading} style={{ padding: '10px 22px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.4)', color: COLOR, fontWeight: 700, fontSize: 13 }}>
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }}/> : <Search size={14}/>}
            Consultar
          </button>
        </form>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: COLOR }}/>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13 }}>
            <AlertCircle size={14}/>{error}
          </div>
        )}

        {result && !loading && result.type === 'ip' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* BGP info */}
            <div style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Network size={14} style={{ color: COLOR }}/>
                <span style={{ color: COLOR, fontWeight: 700, fontSize: 13 }}>BGP Routing</span>
              </div>
              {result.bgp ? <>
                <Row label="ASN" value={result.bgp.asn} mono/>
                <Row label="Organización" value={result.bgp.org || result.bgp.name}/>
                <Row label="Prefijo anunciado" value={result.bgp.prefix} mono/>
                <Row label="País" value={result.bgp.country_code}/>
                <Row label="RIR" value={result.bgp.rir_allocation?.rir}/>
                <Row label="Tipo" value={result.bgp.is_bogon ? '⚠ Bogon/Private' : result.bgp.type || 'Public'}/>
              </> : <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>No hay datos BGP disponibles</div>}
            </div>
            {/* Geo info */}
            <div style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Map size={14} style={{ color: COLOR }}/>
                <span style={{ color: COLOR, fontWeight: 700, fontSize: 13 }}>Geolocalización</span>
              </div>
              {result.geo && !result.geo.error ? <>
                <Row label="Ciudad" value={result.geo.city}/>
                <Row label="Región" value={result.geo.region}/>
                <Row label="País" value={`${result.geo.country_name} (${result.geo.country_code})`}/>
                <Row label="Coordenadas" value={result.geo.latitude && `${result.geo.latitude}, ${result.geo.longitude}`} mono/>
                <Row label="ISP / Org" value={result.geo.org}/>
                <Row label="Timezone" value={result.geo.timezone}/>
                {result.geo.latitude && (
                  <a href={`https://www.google.com/maps?q=${result.geo.latitude},${result.geo.longitude}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12, padding: '6px 12px', borderRadius: 7, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)', color: COLOR, fontSize: 11, textDecoration: 'none', fontWeight: 600 }}>
                    <Globe size={10}/> Ver en Google Maps
                  </a>
                )}
              </> : <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>No hay datos de geolocalización</div>}
            </div>
          </div>
        )}

        {result && !loading && result.type === 'asn' && (
          <div>
            {/* ASN summary */}
            {result.asn && (
              <div style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Server size={14} style={{ color: COLOR }}/>
                  <span style={{ color: COLOR, fontWeight: 700, fontSize: 13 }}>Información ASN</span>
                </div>
                <Row label="ASN" value={result.asn.asn} mono/>
                <Row label="Nombre" value={result.asn.name}/>
                <Row label="Descripción" value={result.asn.description_short}/>
                <Row label="País" value={result.asn.country_code}/>
                <Row label="Tipo" value={result.asn.type}/>
                <Row label="Prefijos IPv4" value={result.asn.ipv4_prefixes?.toString()}/>
                <Row label="Prefijos IPv6" value={result.asn.ipv6_prefixes?.toString()}/>
                <Row label="Peers" value={result.asn.peers?.toString()}/>
              </div>
            )}
            {/* Prefixes */}
            {result.prefixes?.ipv4_prefixes?.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 10 }}>Prefijos IPv4 anunciados ({result.prefixes.ipv4_prefixes.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.prefixes.ipv4_prefixes.slice(0, 30).map((p, i) => (
                    <span key={i} style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'monospace' }}>{p.prefix}</span>
                  ))}
                  {result.prefixes.ipv4_prefixes.length > 30 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, alignSelf: 'center' }}>+{result.prefixes.ipv4_prefixes.length - 30} más</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}
