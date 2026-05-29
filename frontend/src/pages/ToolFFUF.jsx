import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, Play, ChevronDown, ChevronUp, Shield } from 'lucide-react'

const COLOR = '#f59e0b'

const MODES = [
  { id:'dir',    label:'Directorios',  icon:'📁', desc:'Fuerza bruta de rutas/archivos web', example:'ffuf -u http://TARGET/FUZZ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -c' },
  { id:'vhost',  label:'VHosts',       icon:'🌐', desc:'Descubrir subdominios/virtual hosts', example:'ffuf -u http://TARGET -H "Host: FUZZ.TARGET" -w /opt/SecLists/Discovery/DNS/subdomains-top1million-5000.txt -c' },
  { id:'param',  label:'Parámetros',   icon:'🔧', desc:'Fuzzing de parámetros GET/POST',      example:'ffuf -u "http://TARGET/page.php?FUZZ=value" -w /opt/SecLists/Discovery/Web-Content/burp-parameter-names.txt -c' },
  { id:'lfi',    label:'LFI / Path',   icon:'📂', desc:'Local File Inclusion traversal',      example:'ffuf -u "http://TARGET/page.php?file=FUZZ" -w /opt/SecLists/Fuzzing/LFI/LFI-Jhaddix.txt -c' },
  { id:'ext',    label:'Extensiones',  icon:'📝', desc:'Probar extensiones de archivo',       example:'ffuf -u http://TARGET/indexFUZZ -w /opt/SecLists/Discovery/Web-Content/web-extensions.txt -c' },
]

const WORDLISTS = [
  { label:'directory-list-2.3-medium', path:'/usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt', note:'Estándar Kali — buena cobertura' },
  { label:'raft-medium-directories',   path:'/opt/SecLists/Discovery/Web-Content/raft-medium-directories.txt', note:'SecLists — mejor que dirbuster' },
  { label:'common.txt',               path:'/opt/SecLists/Discovery/Web-Content/common.txt', note:'Rápida — top dirs comunes' },
  { label:'burp-parameter-names',     path:'/opt/SecLists/Discovery/Web-Content/burp-parameter-names.txt', note:'Para fuzzing de parámetros' },
  { label:'subdomains-top1million',   path:'/opt/SecLists/Discovery/DNS/subdomains-top1million-5000.txt', note:'VHost/subdominio discovery' },
  { label:'LFI-Jhaddix',             path:'/opt/SecLists/Fuzzing/LFI/LFI-Jhaddix.txt', note:'Local File Inclusion payloads' },
]

const COMMANDS = [
  {
    cat: '🔍 Reconocimiento básico',
    items: [
      { cmd:'ffuf -u http://192.168.1.122/FUZZ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -c', desc:'Fuzzing directorios con salida en color' },
      { cmd:'ffuf -u http://192.168.1.122/FUZZ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -c -fc 404', desc:'Filtrar respuestas 404 (solo muestra hits)' },
      { cmd:'ffuf -u http://192.168.1.122/FUZZ -w /opt/SecLists/Discovery/Web-Content/raft-medium-directories.txt -c -t 50', desc:'50 threads — más rápido con SecLists' },
    ]
  },
  {
    cat: '🗺️ Extensiones de archivo',
    items: [
      { cmd:'ffuf -u http://192.168.1.122/FUZZ -w /opt/SecLists/Discovery/Web-Content/raft-medium-files-lowercase.txt -e .php,.html,.txt,.bak,.old -c', desc:'Buscar archivos con extensiones comunes' },
      { cmd:'ffuf -u http://192.168.1.122/indexFUZZ -w /opt/SecLists/Discovery/Web-Content/web-extensions.txt -c', desc:'Probar extensiones sobre un archivo base' },
      { cmd:'ffuf -u http://192.168.1.122/FUZZ -w lista.txt -e .php,.bak -c -fc 404,403', desc:'Filtrar 404 y 403 — solo 200/301/302' },
    ]
  },
  {
    cat: '🌐 Virtual Hosts / Subdominios',
    items: [
      { cmd:'ffuf -u http://192.168.1.122 -H "Host: FUZZ.dominio.com" -w /opt/SecLists/Discovery/DNS/subdomains-top1million-5000.txt -c -fs 185', desc:'VHost fuzzing — filtrar por tamaño de respuesta base' },
      { cmd:'ffuf -u http://FUZZ.dominio.com -w /opt/SecLists/Discovery/DNS/subdomains-top1million-5000.txt -c', desc:'Subdomain discovery directo' },
    ]
  },
  {
    cat: '🔧 Parámetros y LFI',
    items: [
      { cmd:'ffuf -u "http://192.168.1.122/page.php?FUZZ=test" -w /opt/SecLists/Discovery/Web-Content/burp-parameter-names.txt -c -fs 0', desc:'Descubrir parámetros GET válidos' },
      { cmd:'ffuf -u "http://192.168.1.122/page.php?file=FUZZ" -w /opt/SecLists/Fuzzing/LFI/LFI-Jhaddix.txt -c', desc:'Local File Inclusion fuzzing' },
      { cmd:'ffuf -u http://192.168.1.122/login -X POST -d "username=admin&password=FUZZ" -w /usr/share/wordlists/rockyou.txt -c -fs 1234', desc:'Brute force de formulario POST (filtrar tamaño de error)' },
    ]
  },
  {
    cat: '⚙️ Opciones avanzadas',
    items: [
      { cmd:'ffuf -u http://192.168.1.122/FUZZ -w lista.txt -c -t 100 -r', desc:'-r: follow redirects · -t 100: 100 threads' },
      { cmd:'ffuf -u http://192.168.1.122/FUZZ -w lista.txt -c -o resultado.json -of json', desc:'Exportar resultados a JSON' },
      { cmd:'ffuf -u http://192.168.1.122/FUZZ -w lista.txt -c -mc 200,301,302,403', desc:'-mc: match solo códigos específicos' },
      { cmd:'ffuf -u http://192.168.1.122/FUZZ -w lista.txt -c -ac', desc:'-ac: auto-calibrate (filtra respuestas genéricas automáticamente)' },
    ]
  },
  {
    cat: '🔗 Instalación / Wordlists',
    items: [
      { cmd:'git clone https://github.com/danielmiessler/SecLists.git /opt/SecLists', desc:'Clonar SecLists en /opt (recomendado)' },
      { cmd:'sudo apt install seclists', desc:'Instalar SecLists desde repositorio Kali' },
      { cmd:'sudo apt install ffuf', desc:'Instalar FFUF en Kali Linux' },
      { cmd:'locate rockyou.txt', desc:'Encontrar rockyou en Kali' },
    ]
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false), 1500) })
  }
  return (
    <button onClick={copy} title="Copiar" style={{
      padding:'4px 8px', borderRadius:6, cursor:'pointer', border:'none', transition:'all .15s',
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.12)',
      color: copied ? '#10b981' : '#f59e0b', flexShrink:0,
    }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

export default function ToolFFUF() {
  const [open, setOpen] = useState({})
  const [target, setTarget] = useState('')
  const [wl, setWl] = useState(WORDLISTS[0].path)
  const [mode, setMode] = useState('dir')
  const [threads, setThreads] = useState(50)

  const curMode = MODES.find(m => m.id === mode)
  const builtCmd = curMode?.example
    .replace(/TARGET/g, target || '192.168.1.x')
    .replace('@WL@', wl) || ''

  const toggleCat = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))

  return (
    <ToolShell icon="🎯" name="FFUF" color={COLOR} badge="Web Fuzzer · Directorios · VHosts · Parámetros · LFI">
      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:24,
          background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11, alignItems:'center' }}>
          <Shield size={13} style={{ color:'#fbbf24', flexShrink:0 }}/>
          Solo para sistemas que tienes autorización de auditar. FFUF envía cientos de peticiones por segundo.
        </div>

        {/* ── Command builder ────────────────────────────────────────── */}
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:14, padding:'20px', marginBottom:24 }}>
          <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:14 }}>
            Constructor de comandos
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, marginBottom:5, letterSpacing:'0.05em' }}>TARGET</div>
              <input value={target} onChange={e=>setTarget(e.target.value)} placeholder="192.168.1.122 ó dominio.com"
                style={{ width:'100%', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:8, padding:'8px 12px', color:'#fff', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, marginBottom:5, letterSpacing:'0.05em' }}>MODO</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {MODES.map(m => (
                  <button key={m.id} onClick={()=>setMode(m.id)} style={{
                    padding:'5px 10px', borderRadius:7, fontSize:11, cursor:'pointer', transition:'all .15s',
                    background: mode===m.id ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                    border: mode===m.id ? '1px solid rgba(245,158,11,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    color: mode===m.id ? '#fbbf24' : 'rgba(255,255,255,0.5)',
                  }}>{m.icon} {m.label}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, marginBottom:5, letterSpacing:'0.05em' }}>WORDLIST</div>
            <select value={wl} onChange={e=>setWl(e.target.value)} style={{
              width:'100%', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(245,158,11,0.2)',
              borderRadius:8, padding:'8px 12px', color:'#e5e7eb', fontSize:11, outline:'none' }}>
              {WORDLISTS.map(w => <option key={w.path} value={w.path}>{w.label} — {w.note}</option>)}
            </select>
          </div>

          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <code style={{ flex:1, background:'rgba(0,0,0,0.5)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:8,
              padding:'10px 14px', fontSize:12, color:'#fbbf24', fontFamily:'monospace', overflowX:'auto', whiteSpace:'nowrap' }}>
              {builtCmd}
            </code>
            <CopyBtn text={builtCmd}/>
          </div>
        </div>

        {/* ── Command reference ──────────────────────────────────────── */}
        <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:14 }}>
          Referencia completa de comandos
        </div>

        {COMMANDS.map(cat => (
          <div key={cat.cat} style={{ marginBottom:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
            <button onClick={()=>toggleCat(cat.cat)} style={{
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
                      <code style={{ flex:1, fontSize:11, color:'#fbbf24', fontFamily:'monospace', lineHeight:1.5 }}>{item.cmd}</code>
                      <CopyBtn text={item.cmd}/>
                    </div>
                    <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* ── Tips section ───────────────────────────────────────────── */}
        <div style={{ marginTop:24, background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:12, padding:'16px 20px' }}>
          <div style={{ color:'#fbbf24', fontWeight:700, fontSize:12, marginBottom:10 }}>💡 Tips de uso eficiente</div>
          <ul style={{ color:'rgba(255,255,255,0.5)', fontSize:12, paddingLeft:18, display:'flex', flexDirection:'column', gap:5 }}>
            <li>Empieza con <code style={{color:'#fbbf24'}}>-ac</code> (auto-calibrate) para filtrar respuestas genéricas automáticamente</li>
            <li>Usa <code style={{color:'#fbbf24'}}>-fc 404</code> para ignorar 404, <code style={{color:'#fbbf24'}}>-fs [tamaño]</code> para ignorar un tamaño de respuesta específico</li>
            <li>Para VHosts: primero anota el tamaño de la respuesta base, luego usa <code style={{color:'#fbbf24'}}>-fs [tamaño]</code></li>
            <li>SecLists &gt; dirbuster en cobertura. Instala con: <code style={{color:'#fbbf24'}}>git clone https://github.com/danielmiessler/SecLists.git /opt/SecLists</code></li>
            <li>Combina con Burp Suite: usa FFUF para descubrir rutas, Burp para analizar cada una</li>
          </ul>
        </div>

      </div>
    </ToolShell>
  )
}
