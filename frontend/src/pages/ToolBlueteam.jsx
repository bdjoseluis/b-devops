import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, Shield, ChevronDown, ChevronUp } from 'lucide-react'

const COLOR = '#3b82f6'

const COMMANDS = [
  {
    cat: '🔍 Detección de persistencia (Linux)',
    items: [
      { cmd:'crontab -l ; cat /etc/crontab ; ls -la /etc/cron.*', desc:'Revisar todas las tareas cron — vector de persistencia muy común' },
      { cmd:'ls -la /etc/init.d/ /etc/systemd/system/', desc:'Servicios de inicio personalizados — buscar nombres sospechosos' },
      { cmd:'cat /etc/rc.local', desc:'Script ejecutado al arranque — revisar si hay comandos añadidos' },
      { cmd:'find / -name ".bashrc" -o -name ".profile" 2>/dev/null | xargs grep -l "curl\\|wget\\|nc"', desc:'Profiles de shell modificados para descargar backdoors al login' },
      { cmd:'cat ~/.ssh/authorized_keys', desc:'Claves SSH autorizadas — un atacante puede añadir la suya para acceso permanente' },
      { cmd:'find /var/www -name "*.php" -perm /111 -mtime -14 2>/dev/null', desc:'Webshells: PHP ejecutables recientes en directorio web' },
    ]
  },
  {
    cat: '🪟 Detección de persistencia (Windows)',
    items: [
      { cmd:'autoruns.exe', desc:'Sysinternals: muestra TODOS los puntos de autoarranque (registro, servicios, drivers, DLLs)' },
      { cmd:'autorunsc.exe -a * -csv > autoruns.csv', desc:'Salida CSV de todos los autoarranques para correlación en SIEM' },
      { cmd:'reg query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run', desc:'Clave Run del registro — aplicaciones que arrancan con Windows' },
      { cmd:'reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', desc:'Clave Run del usuario actual — más fácil de escribir sin permisos admin' },
      { cmd:'schtasks /query /fo LIST /v | findstr "Task Name\\|Run As"', desc:'Listar tareas programadas con usuario de ejecución' },
      { cmd:'Get-WinEvent -FilterHashtable @{Id=4698;LogName="Security"}', desc:'Event ID 4698: nueva tarea programada creada — alerta en SIEM' },
    ]
  },
  {
    cat: '📡 Análisis de red — detección de C2 y exfiltración',
    items: [
      { cmd:'ss -tnp | grep ESTABLISHED', desc:'Conexiones TCP establecidas con PID responsable' },
      { cmd:'ss -tnlp | grep -v "127\\|::1"', desc:'Servicios escuchando expuestos externamente (no localhost)' },
      { cmd:'ss -tnp | grep -vE ":22|:80|:443"', desc:'Conexiones en puertos inesperados — posible C2 o backdoor' },
      { cmd:'tcpdump -i any -w /tmp/cap.pcap &', desc:'Captura de tráfico en background para análisis posterior con Wireshark' },
      { cmd:'tcpdump -i eth0 -n not port 22 and not port 80', desc:'Capturar tráfico excluyendo SSH y HTTP normal' },
      { cmd:'nethogs', desc:'Tráfico de red por proceso en tiempo real — detectar proceso exfiltrando datos' },
      { cmd:'# Windows: netstat -anob | findstr ESTABLISHED (requiere admin)', desc:'' },
    ]
  },
  {
    cat: '🛡️ Hardening — Lynis y checks manuales',
    items: [
      { cmd:'lynis audit system', desc:'Auditoría de hardening completa — puntuación Hardening Index 0-100' },
      { cmd:'lynis audit system --quick', desc:'Modo rápido sin esperas interactivas' },
      { cmd:'lynis show details TEST-ID', desc:'Detalle y recomendación de un check específico' },
      { cmd:'grep -i "SSHD_OPTS\\|PermitRoot\\|Password" /etc/ssh/sshd_config', desc:'Verificar configuración SSH: PermitRootLogin, PasswordAuthentication' },
      { cmd:'cat /etc/passwd | awk -F: "$7 != \"/sbin/nologin\" && $7 != \"/bin/false\" {print}"', desc:'Usuarios con shell válida — reducir superficie de ataque' },
      { cmd:'awk -F: "($2 == \"\")" /etc/shadow', desc:'Usuarios sin contraseña en /etc/shadow' },
    ]
  },
  {
    cat: '🦠 Detección de IOC y rootkits',
    items: [
      { cmd:'rkhunter --check --sk', desc:'Escaneo completo de rootkits, backdoors y binarios comprometidos' },
      { cmd:'rkhunter --update', desc:'Actualizar base de datos de firmas de rootkits' },
      { cmd:'chkrootkit', desc:'Herramienta alternativa de detección de rootkits conocidos' },
      { cmd:'grep -r "eval(base64_decode" /var/www/', desc:'Detectar webshells PHP ofuscadas con base64' },
      { cmd:'grep -r "system($_" /var/www/ 2>/dev/null', desc:'Detectar webshells que ejecutan comandos del sistema' },
      { cmd:'find / -name "*.php" -exec grep -l "exec\\|shell_exec\\|system\\|passthru" {} \\; 2>/dev/null', desc:'Buscar funciones peligrosas en PHP en todo el sistema' },
    ]
  },
  {
    cat: '📊 Correlación de logs y SIEM',
    items: [
      { cmd:'grep "Failed password" /var/log/auth.log | awk \'{print $11}\' | sort | uniq -c | sort -rn | head -20', desc:'Top IPs con más intentos de fuerza bruta SSH' },
      { cmd:'grep "Accepted password\\|Accepted publickey" /var/log/auth.log | tail -20', desc:'Últimos logins exitosos — detectar acceso no autorizado' },
      { cmd:'awk \'$9==403\' /var/log/nginx/access.log | awk \'{print $1}\' | sort | uniq -c | sort -rn', desc:'IPs con más errores 403 — posible escaneo web' },
      { cmd:'journalctl -u ssh --since "2 hours ago"', desc:'Logs del servicio SSH de las últimas 2 horas' },
      { cmd:'last -n 20', desc:'Últimos 20 logins del sistema con IP y duración' },
      { cmd:'# Windows: Get-WinEvent -FilterHashtable @{Id=4625} → fallos de login (Event ID 4625)', desc:'' },
      { cmd:'# Windows: Get-WinEvent -FilterHashtable @{Id=4624;LogName="Security"} → logins exitosos', desc:'' },
    ]
  },
  {
    cat: '🚨 Respuesta a incidentes — Triage inicial',
    items: [
      { cmd:'ps auxf | grep -vE "^root|sshd|cron|systemd"', desc:'Procesos anómalos — comparar con baseline del sistema' },
      { cmd:'find / -newer /tmp/ref -type f 2>/dev/null | grep -v proc', desc:'Archivos modificados después de un punto de referencia temporal' },
      { cmd:'who ; w ; last -n 10', desc:'Usuarios activos y historial de logins recientes' },
      { cmd:'history', desc:'Historial de comandos del usuario actual — ver qué se ejecutó' },
      { cmd:'cat /proc/PID/maps | grep rwx', desc:'Buscar regiones de memoria con permisos de escritura Y ejecución (shellcode)' },
      { cmd:'ls -la /proc/*/exe 2>/dev/null | grep deleted', desc:'Procesos ejecutando desde archivos ya borrados del disco (fileless malware)' },
      { cmd:'# Contención: ip link set eth0 down → desconectar de red sin apagar el sistema', desc:'' },
    ]
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  if (!text || text.startsWith('#')) return null
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500) }) }
  return (
    <button onClick={copy} style={{ padding:'4px 8px', borderRadius:6, cursor:'pointer', border:'none', transition:'all .15s', flexShrink:0,
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.12)', color: copied ? '#10b981' : '#3b82f6' }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

export default function ToolBlueteam() {
  const [open, setOpen] = useState({})
  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))

  return (
    <ToolShell icon="🛡️" name="Blue Team" color={COLOR} badge="Lynis · rkhunter · Autoruns · IOC Detection · SIEM · Incident Response">
      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:18,
          background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11 }}>
          <Shield size={13} style={{ color:'#3b82f6', flexShrink:0, marginTop:1 }}/>
          <span>Blue Team: detectar, contener y responder incidentes. Ciclo: <strong style={{color:'rgba(255,255,255,0.7)'}}>Preparación → Detección → Contención → Erradicación → Recuperación → Lecciones aprendidas</strong> (NIST SP 800-61).</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:10, marginBottom:24 }}>
          {[
            { label:'Persistencia', icon:'⚓', color:'#ef4444', desc:'Cron, autoruns, registry, SSH keys' },
            { label:'Red / C2', icon:'📡', color:'#f59e0b', desc:'ss, tcpdump, nethogs, netstat' },
            { label:'Hardening', icon:'🛡️', color:'#3b82f6', desc:'Lynis, SSH config, shadow' },
            { label:'IOC / Rootkits', icon:'🦠', color:'#a78bfa', desc:'rkhunter, chkrootkit, webshells' },
            { label:'Logs / SIEM', icon:'📊', color:'#10b981', desc:'auth.log, Event ID, journalctl' },
            { label:'IR Triage', icon:'🚨', color:'#06b6d4', desc:'Triage inicial, contención, evidencia' },
          ].map(item => (
            <div key={item.label} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${item.color}20`, borderRadius:10, padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{item.icon}</div>
              <div style={{ color:item.color, fontSize:11, fontWeight:700, marginBottom:4 }}>{item.label}</div>
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
                      <code style={{ flex:1, fontSize:11, color: item.cmd.startsWith('#') ? 'rgba(255,255,255,0.3)' : '#93c5fd', fontFamily:'monospace', lineHeight:1.5 }}>{item.cmd}</code>
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
