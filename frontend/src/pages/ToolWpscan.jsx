import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, Shield, ChevronDown, ChevronUp } from 'lucide-react'

const COLOR = '#3b82f6'

const COMMANDS = [
  {
    cat: '🔍 Enumeración básica',
    items: [
      { cmd:'wpscan --url http://192.168.1.122/wordpress', desc:'Scan básico — versión WP, temas, plugins activos' },
      { cmd:'wpscan --url http://192.168.1.122/wordpress --enumerate p', desc:'Enumerar plugins (p=popular, ap=all plugins, vp=vulnerable)' },
      { cmd:'wpscan --url http://192.168.1.122/wordpress --enumerate u', desc:'Enumerar usuarios registrados en el WordPress' },
      { cmd:'wpscan --url http://192.168.1.122/wordpress --enumerate ap,at,u', desc:'Enumerar all plugins + all themes + usuarios — scan completo' },
    ]
  },
  {
    cat: '🔑 Brute force de contraseñas',
    items: [
      { cmd:'wpscan --url http://192.168.1.122/wordpress -U admin -P /usr/share/wordlists/rockyou.txt', desc:'Ataque de diccionario al usuario admin con rockyou' },
      { cmd:'wpscan --url http://192.168.1.122/wordpress -U admin,editor -P /usr/share/wordlists/rockyou.txt --password-attack xmlrpc', desc:'Usar xmlrpc (más rápido) en lugar de wp-login para brute force' },
      { cmd:'wpscan --url http://192.168.1.122/wordpress --enumerate u --passwords /opt/SecLists/Passwords/Common-Credentials/10k-most-common.txt', desc:'Enumerar users y atacar con SecLists' },
    ]
  },
  {
    cat: '🛡️ Detección de vulnerabilidades',
    items: [
      { cmd:'wpscan --url http://192.168.1.122/wordpress --api-token TU_TOKEN_AQUI', desc:'Con WPScan API token — detecta CVEs en plugins/temas (gratis, registro en wpscan.io)' },
      { cmd:'wpscan --url http://192.168.1.122/wordpress --enumerate vp --api-token TOKEN', desc:'Listar solo plugins VULNERABLES con su CVE' },
      { cmd:'wpscan --url http://192.168.1.122/wordpress -e at --api-token TOKEN', desc:'Detectar temas vulnerables' },
    ]
  },
  {
    cat: '⚙️ Opciones avanzadas',
    items: [
      { cmd:'wpscan --url http://192.168.1.122/wordpress --detection-mode aggressive', desc:'Modo agresivo — más detección, más ruido' },
      { cmd:'wpscan --url http://192.168.1.122/wordpress -o resultado.json --format json', desc:'Exportar resultados a JSON' },
      { cmd:'wpscan --url http://192.168.1.122/wordpress --random-user-agent', desc:'Randomizar User-Agent para evadir detección WAF' },
      { cmd:'wpscan --url http://192.168.1.122/wordpress --proxy http://127.0.0.1:8080', desc:'Rutar por Burp Suite proxy para análisis manual simultáneo' },
    ]
  },
  {
    cat: '📦 Instalación y actualización',
    items: [
      { cmd:'sudo apt install wpscan', desc:'Instalar WPScan en Kali' },
      { cmd:'wpscan --update', desc:'Actualizar base de datos de vulnerabilidades' },
      { cmd:'gem install wpscan', desc:'Instalar/actualizar via Ruby gem si la de Kali está desactualizada' },
    ]
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500) }) }
  return (
    <button onClick={copy} style={{ padding:'4px 8px', borderRadius:6, cursor:'pointer', border:'none', transition:'all .15s', flexShrink:0,
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.12)', color: copied ? '#10b981' : '#3b82f6' }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

export default function ToolWpscan() {
  const [open, setOpen] = useState({})
  const [url, setUrl] = useState('')
  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))
  const builtCmd = `wpscan --url http://${url||'192.168.1.x'}/wordpress --enumerate u,p,vp --random-user-agent`

  return (
    <ToolShell icon="🔍" name="WPScan" color={COLOR} badge="WordPress · CVEs · Plugins · Usuarios · Brute Force">
      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:24,
          background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11, alignItems:'center' }}>
          <Shield size={13} style={{ color:'#3b82f6', flexShrink:0 }}/>
          WPScan detecta automáticamente CMS WordPress. Para CVEs necesitas API token gratuito de wpscan.io
        </div>

        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:14, padding:'20px', marginBottom:24 }}>
          <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>
            Comando rápido
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, marginBottom:5 }}>URL / IP TARGET</div>
            <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="192.168.1.122 o dominio.com"
              style={{ width:'100%', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:7, padding:'7px 10px', color:'#fff', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <code style={{ flex:1, background:'rgba(0,0,0,0.5)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#60a5fa', fontFamily:'monospace', overflowX:'auto', whiteSpace:'nowrap' }}>
              {builtCmd}
            </code>
            <CopyBtn text={builtCmd}/>
          </div>
        </div>

        {COMMANDS.map(cat => (
          <div key={cat.cat} style={{ marginBottom:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
            <button onClick={()=>toggle(cat.cat)} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:13, fontWeight:600, textAlign:'left' }}>
              {cat.cat}{open[cat.cat] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
            {open[cat.cat] && (
              <div style={{ padding:'0 12px 12px', display:'flex', flexDirection:'column', gap:8 }}>
                {cat.items.map((item,i) => (
                  <div key={i} style={{ background:'rgba(0,0,0,0.3)', borderRadius:9, padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:6 }}>
                      <code style={{ flex:1, fontSize:11, color:'#60a5fa', fontFamily:'monospace', lineHeight:1.5 }}>{item.cmd}</code>
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
