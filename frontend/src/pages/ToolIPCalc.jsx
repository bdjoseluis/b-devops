import { useState, useCallback } from 'react'
import ToolShell from '../components/ToolShell'
import { Network, Copy, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'

const COLOR = '#22d3ee'

// ── CIDR parsing ─────────────────────────────────────────────────────────────
function ipToInt(ip) {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0
}
function intToIp(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}
function calcSubnet(cidr) {
  const [ip, bits] = cidr.trim().split('/')
  const prefix = parseInt(bits, 10)
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return null
  const parts = ip.split('.')
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null

  const ipInt   = ipToInt(ip)
  const mask    = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0
  const netInt  = (ipInt & mask) >>> 0
  const bcast   = (netInt | (~mask >>> 0)) >>> 0
  const hosts   = prefix >= 31 ? (prefix === 32 ? 1 : 2) : bcast - netInt - 1
  const first   = prefix >= 31 ? netInt : netInt + 1
  const last    = prefix >= 31 ? bcast  : bcast - 1

  return {
    ip:        ip,
    prefix:    prefix,
    mask:      intToIp(mask),
    wildcard:  intToIp(~mask >>> 0),
    network:   intToIp(netInt),
    broadcast: intToIp(bcast),
    first:     intToIp(first),
    last:      intToIp(last),
    hosts:     hosts.toLocaleString('es-ES'),
    binary_mask: mask.toString(2).padStart(32,'0').match(/.{8}/g).join('.'),
    binary_ip:   ipInt.toString(2).padStart(32,'0').match(/.{8}/g).join('.'),
    ipClass:   ipInt >>> 24 < 128 ? 'A' : ipInt >>> 24 < 192 ? 'B' : ipInt >>> 24 < 224 ? 'C' : ipInt >>> 24 < 240 ? 'D (multicast)' : 'E (reservada)',
    isPrivate: (
      (ipInt >>> 24 === 10) ||
      ((ipInt >>> 16 & 0xFFF0) === 0xAC10) || // 172.16-31
      (ipInt >>> 16 === 0xC0A8) || // 192.168
      (ipInt >>> 24 === 127)
    ),
    isLoopback: ipInt >>> 24 === 127,
  }
}

// Split CIDR into N equal subnets
function splitSubnet(cidr, newBits) {
  const res = calcSubnet(cidr)
  if (!res) return []
  const subPrefix = res.prefix + newBits
  if (subPrefix > 30) return []
  const count = Math.pow(2, newBits)
  const size  = Math.pow(2, 32 - subPrefix)
  const base  = ipToInt(res.network)
  return Array.from({ length: count }, (_, i) => {
    const net = (base + i * size) >>> 0
    return `${intToIp(net)}/${subPrefix}`
  })
}

const EXAMPLES = ['192.168.1.0/24','10.0.0.0/8','172.16.0.0/12','192.168.100.128/26','10.10.0.0/16']

export default function ToolIPCalc() {
  const [input,   setInput]   = useState('192.168.1.0/24')
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')
  const [subnets, setSubnets] = useState([])
  const [splitBits, setSplitBits] = useState(2)
  const [copied,  setCopied]  = useState('')

  const calc = useCallback(() => {
    const r = calcSubnet(input.trim())
    if (!r) { setError('CIDR inválido. Ejemplo: 192.168.1.0/24'); setResult(null); return }
    setError('')
    setResult(r)
    setSubnets([])
  }, [input])

  const doSplit = () => {
    const subs = splitSubnet(input.trim(), parseInt(splitBits))
    setSubnets(subs)
  }

  const copy = (v) => {
    navigator.clipboard.writeText(v).catch(() => {})
    setCopied(v)
    setTimeout(() => setCopied(''), 1500)
  }

  const Row = ({ label, value, mono, badge, badgeColor }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {badge && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:4, background:`${badgeColor}20`, color:badgeColor, fontWeight:700 }}>{badge}</span>}
        <span style={{ color:'#fff', fontSize:12, fontFamily: mono ? 'monospace':'inherit' }}>{value}</span>
        <button onClick={() => copy(value)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.2)', padding:0, display:'flex' }}>
          {copied === value ? <CheckCircle size={11} style={{ color:'#10b981' }}/> : <Copy size={11}/>}
        </button>
      </div>
    </div>
  )

  return (
    <ToolShell icon="🔢" name="IP / Subnet Calculator" color={COLOR} badge="CIDR · Subredes · Split · IPv4">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Input */}
        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <div style={{ position:'relative', flex:1 }}>
            <Network size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)' }}/>
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setResult(null); setError('') }}
              onKeyDown={e => e.key === 'Enter' && calc()}
              placeholder="192.168.1.0/24"
              style={{ width:'100%', boxSizing:'border-box', background:'rgba(34,211,238,0.06)', border:'1px solid rgba(34,211,238,0.3)', color:'#fff', padding:'11px 14px 11px 36px', borderRadius:10, fontSize:15, outline:'none', fontFamily:'monospace' }}
            />
          </div>
          <button onClick={calc} style={{ padding:'11px 24px', borderRadius:10, cursor:'pointer', background:'rgba(34,211,238,0.15)', border:'1px solid rgba(34,211,238,0.4)', color:COLOR, fontWeight:700, fontSize:13 }}>
            Calcular
          </button>
        </div>

        {/* Quick examples */}
        <div style={{ display:'flex', gap:6, marginBottom:24, flexWrap:'wrap' }}>
          <span style={{ color:'rgba(255,255,255,0.25)', fontSize:11, alignSelf:'center' }}>Ejemplos:</span>
          {EXAMPLES.map(e => (
            <button key={e} onClick={() => { setInput(e); setResult(null); setError('') }}
              style={{ padding:'3px 10px', borderRadius:6, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:11, cursor:'pointer', fontFamily:'monospace' }}>
              {e}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginBottom:16, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>
            <AlertCircle size={14}/>{error}
          </div>
        )}

        {result && (
          <>
            {/* Header badges */}
            <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
              <span style={{ padding:'4px 12px', borderRadius:8, background:'rgba(34,211,238,0.12)', border:'1px solid rgba(34,211,238,0.3)', color:COLOR, fontSize:12, fontFamily:'monospace', fontWeight:700 }}>
                {result.network}/{result.prefix}
              </span>
              <span style={{ padding:'4px 12px', borderRadius:8, background: result.isPrivate ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', border:`1px solid ${result.isPrivate ? 'rgba(16,185,129,0.3)':'rgba(245,158,11,0.3)'}`, color: result.isPrivate ? '#10b981':'#f59e0b', fontSize:12 }}>
                {result.isLoopback ? '🔄 Loopback' : result.isPrivate ? '🔒 Red privada' : '🌐 Red pública'}
              </span>
              <span style={{ padding:'4px 12px', borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', fontSize:12 }}>
                Clase {result.ipClass}
              </span>
              <span style={{ padding:'4px 12px', borderRadius:8, background:'rgba(168,85,247,0.1)', border:'1px solid rgba(168,85,247,0.3)', color:'#c084fc', fontSize:12, fontFamily:'monospace' }}>
                {result.hosts} hosts
              </span>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
              {/* Network info */}
              <div style={{ background:'rgba(34,211,238,0.04)', border:'1px solid rgba(34,211,238,0.15)', borderRadius:14, padding:'16px 20px' }}>
                <div style={{ color:COLOR, fontWeight:700, fontSize:12, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  <Network size={13}/> Información de Red
                </div>
                <Row label="Dirección IP"     value={result.ip}        mono />
                <Row label="Red"              value={`${result.network}/${result.prefix}`} mono />
                <Row label="Máscara"          value={result.mask}      mono />
                <Row label="Wildcard"         value={result.wildcard}  mono />
                <Row label="Broadcast"        value={result.broadcast} mono />
                <Row label="Primera IP"       value={result.first}     mono />
                <Row label="Última IP"        value={result.last}      mono />
                <Row label="Hosts disponibles" value={result.hosts} />
              </div>
              {/* Binary info */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
                <div style={{ color:'rgba(255,255,255,0.5)', fontWeight:700, fontSize:12, marginBottom:12 }}>Representación binaria</div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10, marginBottom:4 }}>IP Address</div>
                  <div style={{ fontFamily:'monospace', fontSize:11, color:'rgba(255,255,255,0.7)', letterSpacing:1 }}>
                    {result.binary_ip.split('.').map((octet, i) => (
                      <span key={i}>
                        {octet.split('').map((bit, j) => (
                          <span key={j} style={{ color: (i * 8 + j) < result.prefix ? '#22d3ee' : 'rgba(255,255,255,0.3)' }}>{bit}</span>
                        ))}
                        {i < 3 && <span style={{ color:'rgba(255,255,255,0.2)' }}>.</span>}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10, marginBottom:4 }}>Subnet Mask</div>
                  <div style={{ fontFamily:'monospace', fontSize:11, color:'rgba(255,255,255,0.7)', letterSpacing:1 }}>
                    {result.binary_mask.split('.').map((octet, i) => (
                      <span key={i}>
                        {octet.split('').map((bit, j) => (
                          <span key={j} style={{ color: bit === '1' ? '#10b981' : 'rgba(255,255,255,0.2)' }}>{bit}</span>
                        ))}
                        {i < 3 && <span style={{ color:'rgba(255,255,255,0.2)' }}>.</span>}
                      </span>
                    ))}
                  </div>
                </div>

                {/* /prefix bar */}
                <div style={{ marginTop:20 }}>
                  <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10, marginBottom:6 }}>Prefijo /{result.prefix}</div>
                  <div style={{ height:8, borderRadius:4, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:4, background:`linear-gradient(90deg,${COLOR},#a78bfa)`, width:`${(result.prefix/32)*100}%`, transition:'width .4s' }}/>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'rgba(255,255,255,0.2)', marginTop:4 }}>
                    <span>/0</span><span>/8</span><span>/16</span><span>/24</span><span>/32</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subnet splitter */}
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
              <div style={{ color:'rgba(255,255,255,0.5)', fontWeight:700, fontSize:12, marginBottom:14 }}>⚡ Dividir en subredes</div>
              <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom: subnets.length > 0 ? 14 : 0 }}>
                <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>Bits adicionales:</span>
                {[1,2,3,4].map(b => (
                  <button key={b} onClick={() => setSplitBits(b)}
                    style={{ padding:'5px 12px', borderRadius:7, cursor:'pointer', background: splitBits === b ? 'rgba(34,211,238,0.15)':'rgba(255,255,255,0.05)', border:`1px solid ${splitBits === b ? 'rgba(34,211,238,0.4)':'rgba(255,255,255,0.1)'}`, color: splitBits === b ? COLOR:'rgba(255,255,255,0.4)', fontSize:12 }}>
                    /{result.prefix + b} ({Math.pow(2,b)} redes)
                  </button>
                ))}
                <button onClick={doSplit}
                  style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:8, cursor:'pointer', background:'rgba(34,211,238,0.12)', border:'1px solid rgba(34,211,238,0.3)', color:COLOR, fontSize:12, fontWeight:600 }}>
                  <ChevronRight size={12}/> Dividir
                </button>
              </div>
              {subnets.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {subnets.map((s, i) => {
                    const r = calcSubnet(s)
                    return (
                      <div key={i} onClick={() => copy(s)}
                        style={{ padding:'6px 12px', borderRadius:8, background:'rgba(34,211,238,0.06)', border:'1px solid rgba(34,211,238,0.15)', cursor:'pointer', transition:'all .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(34,211,238,0.12)'}
                        onMouseLeave={e => e.currentTarget.style.background='rgba(34,211,238,0.06)'}>
                        <div style={{ fontFamily:'monospace', color:'rgba(255,255,255,0.8)', fontSize:12 }}>{s}</div>
                        {r && <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10, marginTop:2 }}>{r.first} – {r.last}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Auto-calc on load */}
        {!result && !error && (
          <div style={{ textAlign:'center', padding:'60px 0', color:'rgba(255,255,255,0.2)', fontSize:13 }}>
            Introduce un CIDR y pulsa <strong>Calcular</strong>
          </div>
        )}
      </div>
    </ToolShell>
  )
}
