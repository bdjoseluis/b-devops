import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { scan } from '../api/client'
import { Play, Loader2, AlertCircle, Shield, Terminal, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'

const COLOR = '#7c3aed'

const COMMANDS = [
  {
    cat: '🌐 HTTP POST form — ataques a formularios web',
    items: [
      { cmd:'hydra -l admin -P /usr/share/wordlists/rockyou.txt 192.168.1.122 http-post-form "/dvwa/login.php:username=^USER^&password=^PASS^&Login=Login:Login failed"', desc:'DVWA login · parámetros POST · cadena de fallo "Login failed"' },
      { cmd:'hydra -l admin -P /usr/share/wordlists/rockyou.txt 192.168.1.122 http-post-form "/login.php:user=^USER^&pass=^PASS^:F=incorrect"', desc:'Formulario genérico · F= indica cadena de fallo' },
      { cmd:'hydra -L users.txt -P /usr/share/wordlists/rockyou.txt 192.168.1.122 http-post-form "/wp-login.php:log=^USER^&pwd=^PASS^&wp-submit=Log+In:ERROR"', desc:'WordPress login · -L lista de usuarios' },
      { cmd:'hydra -l admin -P rockyou.txt 192.168.1.122 http-post-form "/login:username=^USER^&password=^PASS^:S=dashboard"', desc:'S= indica cadena de éxito (alternativa al fallo)' },
    ]
  },
  {
    cat: '🔗 HTTP GET form — autenticación básica HTTP',
    items: [
      { cmd:'hydra -l admin -P /usr/share/wordlists/rockyou.txt 192.168.1.122 http-get /dvwa/vulnerabilities/brute/', desc:'HTTP Basic Auth en ruta protegida (DVWA brute force lab)' },
      { cmd:'hydra -l admin -P rockyou.txt 192.168.1.122 http-get-form "/login.php:user=^USER^&pass=^PASS^:F=failed"', desc:'Formulario GET con parámetros en URL' },
      { cmd:'hydra -l admin -P rockyou.txt https://192.168.1.122 https-post-form "/login:user=^USER^&pass=^PASS^:F=error"', desc:'HTTPS · cambiar http-post-form → https-post-form' },
    ]
  },
  {
    cat: '🔒 SSH / FTP / SMB',
    items: [
      { cmd:'hydra -l root -P /usr/share/wordlists/rockyou.txt 192.168.1.122 ssh', desc:'SSH brute force · usuario fijo root' },
      { cmd:'hydra -L users.txt -P rockyou.txt 192.168.1.122 ssh -t 4', desc:'SSH con lista de usuarios · -t 4 threads (SSH es lento)' },
      { cmd:'hydra -l msfadmin -P rockyou.txt 192.168.1.122 ftp', desc:'FTP brute force (Metasploitable2)' },
      { cmd:'hydra -L users.txt -P rockyou.txt 192.168.1.122 smb', desc:'SMB brute force · enumerar shares/autenticación' },
    ]
  },
  {
    cat: '⚙️ Opciones útiles',
    items: [
      { cmd:'hydra -l admin -P rockyou.txt 192.168.1.122 ssh -v -o resultados.txt', desc:'-v verbose · -o guardar resultados en archivo' },
      { cmd:'hydra -l admin -P rockyou.txt 192.168.1.122 ssh -t 16 -f', desc:'-t threads · -f parar al encontrar la primera credencial válida' },
      { cmd:'hydra -l admin -P rockyou.txt 192.168.1.122 -s 2222 ssh', desc:'-s puerto personalizado (aquí SSH en 2222)' },
      { cmd:'hydra -C /usr/share/wordlists/combo.txt 192.168.1.122 ftp', desc:'-C combo list en formato usuario:contraseña' },
    ]
  },
  {
    cat: '🔍 WhatWeb — reconocimiento previo al ataque',
    items: [
      { cmd:'whatweb http://192.168.1.122', desc:'Detectar CMS, frameworks y tecnologías del servidor' },
      { cmd:'whatweb http://192.168.1.122 -v', desc:'-v verbose · más detalle sobre cada plugin detectado' },
      { cmd:'whatweb http://192.168.1.122/dvwa -a 3', desc:'-a 3 modo agresivo · más solicitudes, más info (nivel 1-4)' },
      { cmd:'whatweb -i targets.txt --log-brief=results.txt', desc:'Múltiples targets desde archivo · exportar resultados' },
    ]
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500) })
  }
  return (
    <button onClick={copy} style={{
      padding:'4px 8px', borderRadius:6, cursor:'pointer', border:'none', transition:'all .15s', flexShrink:0,
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(124,58,237,0.15)',
      color: copied ? '#10b981' : COLOR,
    }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

const SERVICES = ['ssh','ftp','http','https','smtp','pop3','imap','rdp','mysql','mssql','postgres','telnet','vnc','smb']
const MODES = [
  { id:'single', label:'Usuario único', desc:'Un usuario, wordlist de contraseñas' },
  { id:'combo',  label:'Combo list',    desc:'Lista usuario:contraseña' },
  { id:'both',   label:'Ambos',         desc:'Wordlists de usuarios y contraseñas' },
]

export default function ToolHydra() {
  const [target,   setTarget]   = useState('')
  const [service,  setService]  = useState('ssh')
  const [port,     setPort]     = useState('')
  const [mode,     setMode]     = useState('single')
  const [user,     setUser]     = useState('')
  const [userlist, setUserlist] = useState('/usr/share/wordlists/users.txt')
  const [passlist, setPasslist] = useState('/usr/share/wordlists/rockyou.txt')
  const [threads,  setThreads]  = useState(16)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState('')
  const [open,     setOpen]     = useState({})

  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))

  const buildCmd = () => {
    let cmd = `hydra`
    if (mode === 'single') cmd += ` -l ${user || 'admin'} -P ${passlist}`
    else if (mode === 'combo') cmd += ` -C ${passlist}`
    else cmd += ` -L ${userlist} -P ${passlist}`
    cmd += ` -t ${threads}`
    if (port) cmd += ` -s ${port}`
    cmd += ` ${target} ${service}`
    return cmd
  }

  const run = async (e) => {
    e.preventDefault()
    if (!target.trim() || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      const data = await scan.kaliRaw(buildCmd())
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error: Requiere conexión Kali SSH (Configuración)')
    } finally { setLoading(false) }
  }

  return (
    <ToolShell icon="🔱" name="Hydra" color={COLOR} badge="Brute force de autenticación · THC-Hydra">
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>
        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:20, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'rgba(255,255,255,0.5)', fontSize:11 }}>
          <Shield size={13} style={{ color:'#f87171', flexShrink:0, marginTop:1 }}/>
          Solo para auditorías autorizadas. Requiere Kali SSH configurado.
        </div>

        <form onSubmit={run}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ color:'rgba(255,255,255,0.4)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6, display:'block' }}>Target</label>
              <input value={target} onChange={e=>setTarget(e.target.value)} placeholder="192.168.1.1 / dominio.com"
                style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(124,58,237,0.25)', color:'#fff', padding:'10px 14px', borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={{ color:'rgba(255,255,255,0.4)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6, display:'block' }}>Servicio</label>
              <select value={service} onChange={e=>setService(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(124,58,237,0.25)', color:'#fff', padding:'10px 14px', borderRadius:9, fontSize:13, outline:'none' }}>
                {SERVICES.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color:'rgba(255,255,255,0.4)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6, display:'block' }}>Puerto (opcional)</label>
              <input value={port} onChange={e=>setPort(e.target.value)} placeholder="Por defecto del servicio"
                style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'10px 14px', borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={{ color:'rgba(255,255,255,0.4)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6, display:'block' }}>Threads</label>
              <input type="number" value={threads} onChange={e=>setThreads(+e.target.value)} min={1} max={64}
                style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'10px 14px', borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box' }}/>
            </div>
          </div>

          <div style={{ display:'flex', gap:6, marginBottom:16 }}>
            {MODES.map(m=>(
              <button key={m.id} type="button" onClick={()=>setMode(m.id)} title={m.desc} style={{
                padding:'7px 14px', borderRadius:8, fontSize:12, cursor:'pointer', transition:'all .15s',
                background: mode===m.id ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                border: mode===m.id ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.08)',
                color: mode===m.id ? COLOR : 'rgba(255,255,255,0.5)',
              }}>{m.label}</button>
            ))}
          </div>

          {mode === 'single' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div>
                <label style={{ color:'rgba(255,255,255,0.4)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6, display:'block' }}>Usuario</label>
                <input value={user} onChange={e=>setUser(e.target.value)} placeholder="admin"
                  style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'10px 14px', borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ color:'rgba(255,255,255,0.4)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6, display:'block' }}>Wordlist contraseñas</label>
                <input value={passlist} onChange={e=>setPasslist(e.target.value)}
                  style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'10px 14px', borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'monospace' }}/>
              </div>
            </div>
          )}

          <div style={{
            background:'rgba(0,0,0,0.4)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:9, padding:'10px 14px',
            fontFamily:'monospace', color:'rgba(124,58,237,0.9)', fontSize:12, marginBottom:16,
          }}>
            <span style={{ color:'rgba(255,255,255,0.3)', marginRight:8 }}>$</span>{buildCmd()}
          </div>

          <button type="submit" disabled={!target.trim()||loading} style={{
            padding:'11px 24px', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:8,
            background:'rgba(124,58,237,0.2)', border:'1px solid rgba(124,58,237,0.45)',
            color:COLOR, fontWeight:700, fontSize:13,
          }}>
            {loading ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Play size={14}/>}
            {loading ? 'Ejecutando...' : 'Lanzar Hydra'}
          </button>
        </form>

        {error && <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginTop:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}><AlertCircle size={14}/>{error}</div>}
        {result && <TerminalOutput data={result} color={COLOR} />}

        {/* Reference */}
        <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginTop:36, marginBottom:14 }}>
          Referencia de comandos
        </div>
        {COMMANDS.map(cat => (
          <div key={cat.cat} style={{ marginBottom:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
            <button onClick={()=>toggle(cat.cat)} style={{
              width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:13, fontWeight:600, textAlign:'left' }}>
              {cat.cat}
              {open[cat.cat] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
            {open[cat.cat] && (
              <div style={{ padding:'0 12px 12px', display:'flex', flexDirection:'column', gap:8 }}>
                {cat.items.map((item,i) => (
                  <div key={i} style={{ background:'rgba(0,0,0,0.3)', borderRadius:9, padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:6 }}>
                      <code style={{ flex:1, fontSize:11, color:'rgba(124,58,237,0.9)', fontFamily:'monospace', lineHeight:1.5 }}>{item.cmd}</code>
                      <CopyBtn text={item.cmd}/>
                    </div>
                    <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}

function TerminalOutput({ data, color }) {
  const output = data.output || data.raw_output || data.result || JSON.stringify(data, null, 2)
  const found  = (output||'').includes('[') && (output||'').toLowerCase().includes('host:')
  return (
    <div style={{ marginTop:20 }}>
      {found && (
        <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:10, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', color:'#34d399', fontSize:13, fontWeight:600 }}>
          ✓ Credenciales encontradas
        </div>
      )}
      <pre style={{
        background:'rgba(0,0,0,0.6)', border:`1px solid rgba(${color.slice(1).match(/../g).map(h=>parseInt(h,16)).join(',')},0.2)`,
        borderRadius:10, padding:16, color:'#86efac', fontSize:11, overflowX:'auto',
        lineHeight:1.8, maxHeight:500, overflowY:'auto', whiteSpace:'pre-wrap', fontFamily:'monospace',
      }}>
        {output}
      </pre>
    </div>
  )
}
