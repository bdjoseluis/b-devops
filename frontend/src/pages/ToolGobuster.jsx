import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, Shield, ChevronDown, ChevronUp } from 'lucide-react'

const COLOR = '#38bdf8'

const COMMANDS = [
  {
    cat: '📁 Modo dir — Directorios/archivos',
    items: [
      { cmd:'gobuster dir -u http://192.168.1.122 -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt', desc:'Bruteforce básico de directorios' },
      { cmd:'gobuster dir -u http://192.168.1.122 -w /opt/SecLists/Discovery/Web-Content/raft-medium-directories.txt -t 50 -x php,html,txt', desc:'-x extensiones · -t threads — SecLists + extensiones' },
      { cmd:'gobuster dir -u http://192.168.1.122 -w /opt/SecLists/Discovery/Web-Content/common.txt -t 40 --no-error -q', desc:'Modo silencioso (-q), sin errores — más limpio' },
      { cmd:'gobuster dir -u http://192.168.1.122/dvwa -w lista.txt -U admin -P password -c "PHPSESSID=xyz"', desc:'Con autenticación HTTP Basic y cookie de sesión' },
    ]
  },
  {
    cat: '🌐 Modo dns — Subdominios',
    items: [
      { cmd:'gobuster dns -d dominio.com -w /opt/SecLists/Discovery/DNS/subdomains-top1million-5000.txt', desc:'Enumeración de subdominios por DNS' },
      { cmd:'gobuster dns -d dominio.com -w /opt/SecLists/Discovery/DNS/subdomains-top1million-20000.txt -t 30 -r 8.8.8.8', desc:'Con resolver DNS externo (-r) y más palabras' },
    ]
  },
  {
    cat: '🏠 Modo vhost — Virtual Hosts',
    items: [
      { cmd:'gobuster vhost -u http://192.168.1.122 -w /opt/SecLists/Discovery/DNS/subdomains-top1million-5000.txt', desc:'Descubrir virtual hosts en un servidor' },
      { cmd:'gobuster vhost -u http://dominio.com -w /opt/SecLists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain', desc:'--append-domain: añade el dominio base automáticamente' },
    ]
  },
  {
    cat: '☁️ Modo s3 / fuzz',
    items: [
      { cmd:'gobuster s3 -w /opt/SecLists/Discovery/S3/bucket-names.txt', desc:'Descubrir buckets S3 expuestos' },
      { cmd:'gobuster fuzz -u http://192.168.1.122/FUZZ -w lista.txt', desc:'Modo fuzz genérico (similar a FFUF)' },
    ]
  },
  {
    cat: '⚙️ Opciones útiles',
    items: [
      { cmd:'gobuster dir -u http://TARGET -w lista.txt -o resultados.txt', desc:'-o: guardar salida en archivo' },
      { cmd:'gobuster dir -u http://TARGET -w lista.txt --status-codes-blacklist "404,403"', desc:'Ignorar códigos de respuesta específicos' },
      { cmd:'gobuster dir -u http://TARGET -w lista.txt --follow-redirect', desc:'Seguir redirects (301/302)' },
      { cmd:'gobuster dir -u https://TARGET -w lista.txt -k', desc:'-k: ignorar errores SSL/TLS (certificados inválidos)' },
    ]
  },
  {
    cat: '📦 Instalación',
    items: [
      { cmd:'sudo apt install gobuster', desc:'Instalar en Kali Linux' },
      { cmd:'git clone https://github.com/danielmiessler/SecLists.git /opt/SecLists', desc:'Wordlists SecLists — mucho mejor que las de Kali por defecto' },
      { cmd:'locate directory-list-2.3-medium.txt', desc:'Encontrar lista dirbuster en Kali' },
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
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.12)',
      color: copied ? '#10b981' : '#38bdf8',
    }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

export default function ToolGobuster() {
  const [open, setOpen] = useState({})
  const [target, setTarget] = useState('')
  const [mode, setMode] = useState('dir')
  const [wl, setWl] = useState('/usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt')
  const [ext, setExt] = useState('php,html,txt')
  const [threads, setThreads] = useState(40)

  const modes = [
    { id:'dir',   icon:'📁', label:'dir' },
    { id:'dns',   icon:'🌐', label:'dns' },
    { id:'vhost', icon:'🏠', label:'vhost' },
    { id:'fuzz',  icon:'🎯', label:'fuzz' },
  ]

  const buildCmd = () => {
    const t = target || '192.168.1.x'
    if (mode === 'dir')   return `gobuster dir -u http://${t} -w ${wl} -t ${threads} -x ${ext} --no-error`
    if (mode === 'dns')   return `gobuster dns -d ${t} -w ${wl} -t ${threads}`
    if (mode === 'vhost') return `gobuster vhost -u http://${t} -w ${wl} --append-domain`
    if (mode === 'fuzz')  return `gobuster fuzz -u http://${t}/FUZZ -w ${wl}`
    return ''
  }

  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))

  return (
    <ToolShell icon="🚀" name="Gobuster" color={COLOR} badge="Dir · DNS · VHost · Fuzz bruteforcing">
      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:24,
          background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11, alignItems:'center' }}>
          <Shield size={13} style={{ color:'#38bdf8', flexShrink:0 }}/>
          Gobuster y FFUF son herramientas equivalentes. Gobuster en Go, más ligero. Usa SecLists para mejores resultados.
        </div>

        {/* Builder */}
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:14, padding:'20px', marginBottom:24 }}>
          <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:14 }}>
            Constructor de comandos
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
            <div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, marginBottom:4 }}>TARGET</div>
              <input value={target} onChange={e=>setTarget(e.target.value)} placeholder="192.168.1.122 o dominio"
                style={{ width:'100%', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:7, padding:'7px 10px', color:'#fff', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, marginBottom:4 }}>MODO</div>
              <div style={{ display:'flex', gap:5 }}>
                {modes.map(m => (
                  <button key={m.id} onClick={()=>setMode(m.id)} style={{
                    flex:1, padding:'6px 4px', borderRadius:7, fontSize:11, cursor:'pointer', transition:'all .15s',
                    background: mode===m.id ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.05)',
                    border: mode===m.id ? '1px solid rgba(56,189,248,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    color: mode===m.id ? '#38bdf8' : 'rgba(255,255,255,0.5)',
                  }}>{m.icon}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, marginBottom:4 }}>THREADS</div>
              <input type="number" value={threads} onChange={e=>setThreads(e.target.value)} min={1} max={200}
                style={{ width:'100%', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:7, padding:'7px 10px', color:'#fff', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
            </div>
          </div>

          {mode === 'dir' && (
            <div style={{ marginBottom:12 }}>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, marginBottom:4 }}>EXTENSIONES (separadas por coma)</div>
              <input value={ext} onChange={e=>setExt(e.target.value)} placeholder="php,html,txt,bak"
                style={{ width:'100%', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:7, padding:'7px 10px', color:'#fff', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
            </div>
          )}

          <div style={{ marginBottom:14 }}>
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, marginBottom:4 }}>WORDLIST</div>
            <select value={wl} onChange={e=>setWl(e.target.value)} style={{
              width:'100%', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(56,189,248,0.2)',
              borderRadius:7, padding:'7px 10px', color:'#e5e7eb', fontSize:11, outline:'none' }}>
              <option value="/usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt">dirbuster medium (Kali)</option>
              <option value="/opt/SecLists/Discovery/Web-Content/raft-medium-directories.txt">raft-medium-directories (SecLists)</option>
              <option value="/opt/SecLists/Discovery/Web-Content/common.txt">common.txt (SecLists rápida)</option>
              <option value="/opt/SecLists/Discovery/DNS/subdomains-top1million-5000.txt">subdomains-top1M-5k (DNS/VHost)</option>
            </select>
          </div>

          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <code style={{ flex:1, background:'rgba(0,0,0,0.5)', border:'1px solid rgba(56,189,248,0.15)', borderRadius:8,
              padding:'10px 14px', fontSize:12, color:'#38bdf8', fontFamily:'monospace', overflowX:'auto', whiteSpace:'nowrap' }}>
              {buildCmd()}
            </code>
            <CopyBtn text={buildCmd()}/>
          </div>
        </div>

        {/* Reference */}
        <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:14 }}>
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
                      <code style={{ flex:1, fontSize:11, color:'#38bdf8', fontFamily:'monospace', lineHeight:1.5 }}>{item.cmd}</code>
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
    </ToolShell>
  )
}
