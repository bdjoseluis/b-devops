import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, Shield, ChevronDown, ChevronUp } from 'lucide-react'

const COLOR = '#10b981'

const COMMANDS = [
  {
    cat: '⚙️ Instalación y configuración OpenVAS/GVM',
    items: [
      { cmd:'sudo apt install openvas', desc:'Instalar OpenVAS en Kali Linux' },
      { cmd:'sudo gvm-setup', desc:'Setup inicial — descarga bases de datos NVT, CVE (tarda 15-30 min)' },
      { cmd:'sudo gvm-check-setup', desc:'Verificar que la instalación es correcta' },
      { cmd:'sudo gvm-start', desc:'Iniciar servicios GVM (Greenbone Vulnerability Manager)' },
      { cmd:'sudo gvm-stop', desc:'Detener servicios GVM' },
      { cmd:'sudo runuser -u _gvm -- gvmd --user=admin --new-password=tu_password', desc:'Cambiar password del admin de OpenVAS' },
    ]
  },
  {
    cat: '🔍 Uso via CLI (gvm-cli)',
    items: [
      { cmd:'gvm-cli --gmp-username admin --gmp-password pass socket --xml "<get_version/>"', desc:'Verificar conexión a GVM via socket' },
      { cmd:'gvm-cli --gmp-username admin --gmp-password pass socket --xml "<get_targets/>"', desc:'Listar targets configurados' },
      { cmd:'gvm-cli --gmp-username admin --gmp-password pass socket --xml "<get_tasks/>"', desc:'Listar tareas de escaneo' },
    ]
  },
  {
    cat: '🛡️ Nessus — Alternativa comercial',
    items: [
      { cmd:'# Descargar Nessus Essentials (gratis hasta 16 IPs): https://www.tenable.com/products/nessus/nessus-essentials', desc:'' },
      { cmd:'sudo dpkg -i Nessus-versión.deb', desc:'Instalar paquete Nessus en Debian/Ubuntu/Kali' },
      { cmd:'sudo systemctl start nessusd', desc:'Iniciar servicio Nessus' },
      { cmd:'# Acceder: https://localhost:8834 → activar con clave de Essentials (registro gratuito)', desc:'' },
      { cmd:'nessuscli scan new --name "Scan" --targets 192.168.1.0/24', desc:'Crear scan via CLI de Nessus' },
    ]
  },
  {
    cat: '📊 Flujo de Vulnerability Management',
    items: [
      { cmd:'# 1. Discovery: nmap -sn 192.168.1.0/24 → inventario de activos', desc:'' },
      { cmd:'# 2. Scan: OpenVAS/Nessus → detectar vulnerabilidades por CVSS', desc:'' },
      { cmd:'# 3. Priorización: CVSS ≥ 9.0 = Crítico → remediar en 24h', desc:'' },
      { cmd:'# 4. Remediación: patches, configuración, WAF, segmentación', desc:'' },
      { cmd:'# 5. Verificación: re-scan post-remediación', desc:'' },
      { cmd:'# 6. Reporte: ejecutivo (impacto negocio) + técnico (CVE, CVSS, PoC)', desc:'' },
    ]
  },
  {
    cat: '📋 Herramientas alternativas gratuitas',
    items: [
      { cmd:'sudo apt install nikto', desc:'Nikto — escáner web rápido, detecta misconfigs y CVEs en HTTP' },
      { cmd:'nikto -h http://192.168.1.122', desc:'Scan básico con Nikto' },
      { cmd:'sudo apt install nuclei', desc:'Nuclei — templates YAML, muy rápido, community-driven' },
      { cmd:'nuclei -u http://192.168.1.122 -t /opt/nuclei-templates/', desc:'Ejecutar todos los templates de Nuclei' },
      { cmd:'nuclei -u http://192.168.1.122 -severity critical,high', desc:'Solo vulnerabilidades críticas y altas' },
    ]
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  if (!text || text.startsWith('#')) return null
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500) }) }
  return (
    <button onClick={copy} style={{ padding:'4px 8px', borderRadius:6, cursor:'pointer', border:'none', transition:'all .15s', flexShrink:0,
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.12)', color: copied ? '#fff' : '#10b981' }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

export default function ToolOpenVAS() {
  const [open, setOpen] = useState({})
  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))

  return (
    <ToolShell icon="🔬" name="OpenVAS / Nessus" color={COLOR} badge="Vulnerability Management · CVE Scan · CVSS · Remediation">
      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:18,
          background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11 }}>
          <Shield size={13} style={{ color:'#10b981', flexShrink:0, marginTop:1 }}/>
          <span>OpenVAS (GVM) = alternativa open source a Nessus. Qualys = SaaS enterprise. Los tres detectan CVEs, misconfigs y debilidades según CVSS. Se usan en fase de <strong style={{color:'rgba(255,255,255,0.7)'}}>Vulnerability Management</strong> del ciclo de seguridad.</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:24 }}>
          {[
            { tool:'OpenVAS/GVM', tipo:'Open Source · Gratuito', pros:'Sin límite de IPs, personalizable', icon:'🔬', color:'#10b981' },
            { tool:'Nessus Essentials', tipo:'Freemium (hasta 16 IPs)', pros:'Interface excelente, actualizaciones diarias', icon:'🛡️', color:'#3b82f6' },
            { tool:'Qualys', tipo:'SaaS Enterprise', pros:'Cloud, dashboards compliance, VMDR', icon:'☁️', color:'#a855f7' },
          ].map(t => (
            <div key={t.tool} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${t.color}25`, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{t.icon}</div>
              <div style={{ color:t.color, fontWeight:700, fontSize:13, marginBottom:2 }}>{t.tool}</div>
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:11, marginBottom:4 }}>{t.tipo}</div>
              <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10 }}>{t.pros}</div>
            </div>
          ))}
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
                    <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom: item.desc ? 6 : 0 }}>
                      <code style={{ flex:1, fontSize:11, color: item.cmd.startsWith('#') ? 'rgba(255,255,255,0.3)' : '#34d399', fontFamily:'monospace', lineHeight:1.5 }}>{item.cmd}</code>
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
