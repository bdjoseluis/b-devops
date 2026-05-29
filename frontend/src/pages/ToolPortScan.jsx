import { useState, useRef } from 'react'
import ToolShell from '../components/ToolShell'
import { Search, Loader2, AlertCircle, Wifi, WifiOff, Clock, Info } from 'lucide-react'

const COLOR = '#f97316'

// Well-known ports database
const PORTS_DB = {
  21:   { name:'FTP',           proto:'TCP', desc:'File Transfer Protocol',         risk:'HIGH',    note:'Sin cifrado — usar SFTP/FTPS' },
  22:   { name:'SSH',           proto:'TCP', desc:'Secure Shell',                   risk:'LOW',     note:'Acceso remoto seguro' },
  23:   { name:'Telnet',        proto:'TCP', desc:'Telnet',                         risk:'CRITICAL', note:'Sin cifrado — evitar siempre' },
  25:   { name:'SMTP',          proto:'TCP', desc:'Simple Mail Transfer Protocol',  risk:'MEDIUM',  note:'Puede ser relay abierto' },
  53:   { name:'DNS',           proto:'TCP/UDP', desc:'Domain Name System',         risk:'MEDIUM',  note:'Verificar no sea resolver abierto' },
  80:   { name:'HTTP',          proto:'TCP', desc:'HyperText Transfer Protocol',    risk:'MEDIUM',  note:'Sin cifrado — redirigir a HTTPS' },
  110:  { name:'POP3',          proto:'TCP', desc:'Post Office Protocol v3',        risk:'HIGH',    note:'Email sin cifrado' },
  111:  { name:'RPC',           proto:'TCP', desc:'Remote Procedure Call',          risk:'HIGH',    note:'Frecuentemente explotado' },
  135:  { name:'MSRPC',         proto:'TCP', desc:'Microsoft RPC',                  risk:'HIGH',    note:'Vector de ataque Windows común' },
  139:  { name:'NetBIOS',       proto:'TCP', desc:'NetBIOS Session Service',        risk:'HIGH',    note:'SMB legacy — deshabilitar' },
  143:  { name:'IMAP',          proto:'TCP', desc:'Internet Message Access Protocol', risk:'HIGH',  note:'Email sin cifrado' },
  161:  { name:'SNMP',          proto:'UDP', desc:'Simple Network Mgmt Protocol',   risk:'HIGH',    note:'Community strings por defecto' },
  389:  { name:'LDAP',          proto:'TCP', desc:'Lightweight Directory Protocol', risk:'HIGH',    note:'Directorio sin cifrado' },
  443:  { name:'HTTPS',         proto:'TCP', desc:'HTTP Secure (TLS)',              risk:'LOW',     note:'Verificar configuración TLS' },
  445:  { name:'SMB',           proto:'TCP', desc:'Server Message Block',           risk:'CRITICAL', note:'EternalBlue, WannaCry — parchear' },
  465:  { name:'SMTPS',         proto:'TCP', desc:'SMTP over SSL',                  risk:'LOW',     note:'Email cifrado' },
  587:  { name:'SMTP (sub)',     proto:'TCP', desc:'SMTP Submission',                risk:'LOW',     note:'Envío de email autenticado' },
  636:  { name:'LDAPS',         proto:'TCP', desc:'LDAP over TLS',                  risk:'LOW',     note:'LDAP seguro' },
  993:  { name:'IMAPS',         proto:'TCP', desc:'IMAP over TLS',                  risk:'LOW',     note:'Email cifrado' },
  995:  { name:'POP3S',         proto:'TCP', desc:'POP3 over TLS',                  risk:'LOW',     note:'Email cifrado' },
  1433: { name:'MSSQL',         proto:'TCP', desc:'Microsoft SQL Server',           risk:'HIGH',    note:'DB expuesta — requiere firewall' },
  1521: { name:'Oracle DB',     proto:'TCP', desc:'Oracle Database',                risk:'HIGH',    note:'DB expuesta — requiere firewall' },
  2222: { name:'SSH-alt',       proto:'TCP', desc:'SSH alternativo',                risk:'LOW',     note:'SSH en puerto no estándar' },
  2375: { name:'Docker',        proto:'TCP', desc:'Docker daemon (inseguro)',        risk:'CRITICAL', note:'Docker sin TLS — RCE inmediata' },
  2376: { name:'Docker TLS',    proto:'TCP', desc:'Docker daemon (TLS)',             risk:'MEDIUM',  note:'Verificar certificados' },
  3000: { name:'Dev server',    proto:'TCP', desc:'Node.js / desarrollo',            risk:'MEDIUM',  note:'Servidor de desarrollo expuesto' },
  3306: { name:'MySQL',         proto:'TCP', desc:'MySQL Database',                 risk:'HIGH',    note:'DB expuesta — requiere firewall' },
  3389: { name:'RDP',           proto:'TCP', desc:'Remote Desktop Protocol',        risk:'HIGH',    note:'BlueKeep — mantener actualizado' },
  4443: { name:'HTTPS-alt',     proto:'TCP', desc:'HTTPS alternativo',              risk:'LOW',     note:'HTTPS en puerto no estándar' },
  5432: { name:'PostgreSQL',    proto:'TCP', desc:'PostgreSQL Database',            risk:'HIGH',    note:'DB expuesta — requiere firewall' },
  5900: { name:'VNC',           proto:'TCP', desc:'Virtual Network Computing',      risk:'HIGH',    note:'GUI remota — usar con VPN' },
  6379: { name:'Redis',         proto:'TCP', desc:'Redis In-Memory DB',             risk:'CRITICAL', note:'Sin auth por defecto — RCE posible' },
  8000: { name:'HTTP-alt',      proto:'TCP', desc:'HTTP alternativo / API',         risk:'MEDIUM',  note:'Servidor web alternativo' },
  8080: { name:'HTTP-proxy',    proto:'TCP', desc:'HTTP alternativo / proxy',       risk:'MEDIUM',  note:'Proxy / servidor web alt.' },
  8443: { name:'HTTPS-alt',     proto:'TCP', desc:'HTTPS alternativo',              risk:'LOW',     note:'HTTPS en puerto alternativo' },
  8888: { name:'HTTP-alt',      proto:'TCP', desc:'Jupyter / HTTP alt.',            risk:'MEDIUM',  note:'Jupyter sin auth expuesto' },
  9200: { name:'Elasticsearch', proto:'TCP', desc:'Elasticsearch REST API',         risk:'CRITICAL', note:'Sin auth por defecto — data leak' },
  9300: { name:'ES-transport',  proto:'TCP', desc:'Elasticsearch Transport',        risk:'CRITICAL', note:'Cluster Elasticsearch expuesto' },
  27017:{ name:'MongoDB',       proto:'TCP', desc:'MongoDB Database',               risk:'CRITICAL', note:'Sin auth por defecto — data leak' },
  27018:{ name:'MongoDB-shard', proto:'TCP', desc:'MongoDB Shard',                  risk:'CRITICAL', note:'Sin auth — configurar inmediatamente' },
}

const RISK_COLOR = { CRITICAL:'#ef4444', HIGH:'#f97316', MEDIUM:'#f59e0b', LOW:'#10b981' }

const PORT_SETS = {
  'Top 20': [21,22,23,25,53,80,110,135,139,143,443,445,3306,3389,5432,6379,8080,8443,9200,27017],
  'Web': [80,443,8000,8080,8443,4443,3000],
  'Bases de datos': [1433,1521,3306,5432,6379,9200,9300,27017,27018],
  'Email': [25,110,143,465,587,636,993,995],
  'Infraestructura': [22,23,53,111,135,139,161,389,445,636,2375,2376,3389,5900],
}

export default function ToolPortScan() {
  const [host,     setHost]    = useState('')
  const [portSet,  setPortSet] = useState('Top 20')
  const [custom,   setCustom]  = useState('')
  const [results,  setResults] = useState([])
  const [scanning, setScanning]= useState(false)
  const [progress, setProgress]= useState(0)
  const [done,     setDone]    = useState(false)
  const [error,    setError]   = useState('')
  const abortRef = useRef(false)

  const getPorts = () => {
    if (portSet === 'Custom') {
      return custom.split(',').map(s => parseInt(s.trim())).filter(n => n > 0 && n < 65536)
    }
    return PORT_SETS[portSet] || PORT_SETS['Top 20']
  }

  // We use a browser-side fetch trick to detect open ports
  // This works for HTTP/HTTPS ports; for others we show "Unknown" status
  const checkPort = async (host, port) => {
    // For HTTP ports, try a fetch with a very short timeout
    const httpPorts = [80,8080,8000,3000,8888]
    const httpsPorts = [443,8443,4443,2376]

    if (httpPorts.includes(port)) {
      try {
        const ctrl = new AbortController()
        setTimeout(() => ctrl.abort(), 2000)
        await fetch(`http://${host}:${port}/`, { signal: ctrl.signal, mode: 'no-cors' })
        return 'open'
      } catch (e) {
        return e.name === 'AbortError' ? 'filtered' : 'closed'
      }
    }
    if (httpsPorts.includes(port)) {
      try {
        const ctrl = new AbortController()
        setTimeout(() => ctrl.abort(), 2000)
        await fetch(`https://${host}:${port}/`, { signal: ctrl.signal, mode: 'no-cors' })
        return 'open'
      } catch (e) {
        return e.name === 'AbortError' ? 'filtered' : 'closed'
      }
    }
    // For non-HTTP ports we can't directly check from browser
    return 'unknown'
  }

  const scan = async () => {
    const h = host.trim()
    if (!h) return
    setResults([])
    setScanning(true)
    setDone(false)
    setError('')
    setProgress(0)
    abortRef.current = false

    const ports = getPorts()
    const res = []

    for (let i = 0; i < ports.length; i++) {
      if (abortRef.current) break
      const port = ports[i]
      const info = PORTS_DB[port]

      setProgress(Math.round(((i + 1) / ports.length) * 100))

      // Only attempt fetch for HTTP/HTTPS ports, rest are shown as "info only"
      let status = 'info'
      const httpPorts = [80,8080,8000,3000,8888,443,8443,4443]
      if (httpPorts.includes(port)) {
        status = await checkPort(h, port)
      }

      res.push({ port, status, info })
      setResults([...res])
    }

    setScanning(false)
    setDone(true)
  }

  const stop = () => { abortRef.current = true }

  const openCount = results.filter(r => r.status === 'open').length
  const infoCount  = results.filter(r => r.status === 'info').length

  return (
    <ToolShell icon="🔌" name="Port Scanner" color={COLOR} badge="TCP · Servicios conocidos · Base de datos de puertos · Risk assessment">
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>

        {/* Notice */}
        <div style={{ display:'flex', gap:8, padding:'10px 14px', borderRadius:8, marginBottom:20, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', color:'rgba(255,255,255,0.45)', fontSize:11 }}>
          <Info size={13} style={{ color:COLOR, flexShrink:0, marginTop:1 }}/>
          El escáner comprueba puertos HTTP/HTTPS vía fetch del navegador. Para el resto muestra información de riesgo del servicio. Para escaneo completo usa <strong style={{ color:COLOR, marginLeft:4 }}>Nmap en Terminal IA</strong>.
        </div>

        {/* Input */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:2, minWidth:200 }}>
            <Wifi size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)' }}/>
            <input
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="IP o dominio: 192.168.1.1 / example.com"
              style={{ width:'100%', boxSizing:'border-box', background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.3)', color:'#fff', padding:'11px 14px 11px 36px', borderRadius:10, fontSize:13, outline:'none', fontFamily:'monospace' }}
            />
          </div>
          {/* Port set selector */}
          <select value={portSet} onChange={e => setPortSet(e.target.value)}
            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.7)', padding:'0 14px', borderRadius:10, fontSize:12, cursor:'pointer' }}>
            {Object.keys(PORT_SETS).concat(['Custom']).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {portSet === 'Custom' && (
            <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="80,443,8080,3306..."
              style={{ flex:1, minWidth:140, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'11px 14px', borderRadius:10, fontSize:12, outline:'none', fontFamily:'monospace' }}/>
          )}
          <button onClick={scanning ? stop : scan} disabled={!host.trim() && !scanning}
            style={{ padding:'11px 22px', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:7, background: scanning ? 'rgba(239,68,68,0.15)':'rgba(249,115,22,0.15)', border:`1px solid ${scanning ? 'rgba(239,68,68,0.4)':'rgba(249,115,22,0.4)'}`, color: scanning ? '#fca5a5':COLOR, fontWeight:700, fontSize:13 }}>
            {scanning ? <><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> Detener</> : <><Search size={14}/> Escanear</>}
          </button>
        </div>

        {/* Progress */}
        {scanning && (
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', color:'rgba(255,255,255,0.4)', fontSize:11, marginBottom:6 }}>
              <span>Escaneando {host}...</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.08)' }}>
              <div style={{ height:'100%', borderRadius:2, background:`linear-gradient(90deg,${COLOR},#fbbf24)`, width:`${progress}%`, transition:'width .3s' }}/>
            </div>
          </div>
        )}

        {/* Summary */}
        {results.length > 0 && (
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
            {[
              { label:'Puertos analizados', v:results.length, color:'rgba(255,255,255,0.5)', bg:'rgba(255,255,255,0.05)' },
              { label:'HTTP abiertos',      v:openCount,       color:'#10b981',               bg:'rgba(16,185,129,0.1)' },
              { label:'Info de servicio',   v:infoCount,       color:COLOR,                   bg:'rgba(249,115,22,0.08)' },
              { label:'CRÍTICOS',           v:results.filter(r=>r.info?.risk==='CRITICAL').length, color:'#ef4444', bg:'rgba(239,68,68,0.08)' },
            ].map(s => (
              <div key={s.label} style={{ padding:'8px 16px', borderRadius:10, background:s.bg, border:`1px solid ${s.color}30`, color:s.color, fontSize:12 }}>
                <strong style={{ fontFamily:'monospace', fontSize:16 }}>{s.v}</strong>
                <span style={{ display:'block', fontSize:10, opacity:0.7, marginTop:1 }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {results.map(({ port, status, info }) => {
            const riskColor = RISK_COLOR[info?.risk] || '#6b7280'
            const isOpen    = status === 'open'
            const isInfo    = status === 'info'
            return (
              <div key={port} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderRadius:10, background: isOpen ? 'rgba(16,185,129,0.06)':'rgba(255,255,255,0.03)', border:`1px solid ${isOpen ? 'rgba(16,185,129,0.2)':'rgba(255,255,255,0.06)'}`, transition:'all .1s' }}>
                {/* Status icon */}
                {isOpen    ? <Wifi    size={13} style={{ color:'#10b981', flexShrink:0 }}/> :
                 isInfo    ? <Clock   size={13} style={{ color:'rgba(255,255,255,0.3)', flexShrink:0 }}/> :
                             <WifiOff size={13} style={{ color:'rgba(255,255,255,0.15)', flexShrink:0 }}/>}
                {/* Port */}
                <span style={{ fontFamily:'monospace', color: isOpen ? '#fff':'rgba(255,255,255,0.5)', fontWeight:700, fontSize:13, minWidth:50 }}>{port}</span>
                {/* Service name */}
                {info && (
                  <span style={{ fontFamily:'monospace', color: isOpen ? '#22d3ee':'rgba(255,255,255,0.4)', fontSize:12, minWidth:100 }}>
                    {info.name}
                  </span>
                )}
                {/* Description */}
                {info && (
                  <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11, flex:1 }}>{info.desc}</span>
                )}
                {/* Risk */}
                {info && (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, flexShrink:0 }}>
                    <span style={{ fontSize:9, padding:'2px 7px', borderRadius:4, background:`${riskColor}20`, color:riskColor, fontWeight:700, letterSpacing:'0.05em' }}>
                      {info.risk}
                    </span>
                    {isOpen && <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>{info.proto}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Risk advisory for critical ports */}
        {done && results.some(r => r.info?.risk === 'CRITICAL') && (
          <div style={{ marginTop:16, padding:'14px 18px', borderRadius:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', color:'#fca5a5', fontSize:12 }}>
            ⚠ <strong>Puertos CRÍTICOS detectados en la lista.</strong> Los servicios marcados como CRÍTICO (Redis, MongoDB, Docker sin TLS, SMB, etc.)
            suelen estar mal configurados y pueden llevar a RCE o exposición masiva de datos. Revísalos inmediatamente.
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}
