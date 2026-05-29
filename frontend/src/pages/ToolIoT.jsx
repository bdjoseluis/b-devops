import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, Shield, ChevronDown, ChevronUp } from 'lucide-react'

const COLOR = '#a78bfa'

const COMMANDS = [
  {
    cat: '🔍 Descubrimiento de dispositivos IoT',
    items: [
      { cmd:'nmap -sV -p 23,80,443,1883,8883,5683,5684,8080,8443 192.168.1.0/24', desc:'Escanear puertos comunes IoT: Telnet, HTTP, MQTT, CoAP' },
      { cmd:'nmap --script mqtt-subscribe -p 1883 192.168.1.x', desc:'Verificar broker MQTT sin autenticación — suscribirse a topics' },
      { cmd:'shodan search has_screenshot:true port:23 country:ES', desc:'Buscar Telnet expuesto en Shodan (dispositivos IoT legacy)' },
      { cmd:'shodan search "Server: Router" country:ES', desc:'Buscar routers domésticos en Shodan' },
    ]
  },
  {
    cat: '📡 MQTT — Message Queuing Telemetry Transport',
    items: [
      { cmd:'sudo apt install mosquitto-clients', desc:'Instalar cliente MQTT' },
      { cmd:'mosquitto_sub -h 192.168.1.x -t "#" -v', desc:'Suscribirse a TODOS los topics (# = wildcard) — broker sin auth' },
      { cmd:'mosquitto_pub -h 192.168.1.x -t "home/lights/living" -m "OFF"', desc:'Publicar mensaje en un topic MQTT — controlar dispositivo' },
      { cmd:'mosquitto_sub -h 192.168.1.x -t "#" -u usuario -P password -v', desc:'Con credenciales si el broker requiere autenticación' },
      { cmd:'mqtt-pwn --host 192.168.1.x', desc:'Framework de pentest específico para MQTT' },
    ]
  },
  {
    cat: '🔌 Telnet / Protocolos legacy',
    items: [
      { cmd:'telnet 192.168.1.x', desc:'Conectar via Telnet — muchos IoT lo tienen habilitado por defecto' },
      { cmd:'hydra -l admin -P /usr/share/wordlists/rockyou.txt telnet://192.168.1.x', desc:'Brute force Telnet con Hydra' },
      { cmd:'nmap -sV --script telnet-brute -p 23 192.168.1.x', desc:'Brute force Telnet via script NSE Nmap' },
    ]
  },
  {
    cat: '🔬 Análisis de firmware',
    items: [
      { cmd:'sudo apt install binwalk', desc:'Instalar binwalk — herramienta de análisis de firmware' },
      { cmd:'binwalk -e firmware.bin', desc:'Extraer filesystem del firmware (squashfs, cramfs, etc.)' },
      { cmd:'binwalk -A firmware.bin', desc:'Buscar instrucciones de arquitectura (ARM, MIPS, x86)' },
      { cmd:'strings firmware.bin | grep -i "pass\\|password\\|admin"', desc:'Buscar credenciales hardcodeadas en el firmware' },
      { cmd:'firmware-mod-kit/extract-firmware.sh firmware.bin', desc:'Extraer y modificar firmware con firmware-mod-kit' },
    ]
  },
  {
    cat: '🌐 Web interfaces de routers/IoT',
    items: [
      { cmd:'curl -s http://192.168.1.1/api/system/deviceinfo', desc:'Obtener info del router sin autenticación (endpoints sin proteger)' },
      { cmd:'hydra -l admin -P /usr/share/wordlists/rockyou.txt http-get://192.168.1.1', desc:'Brute force panel web del router con HTTP Basic Auth' },
      { cmd:'routersploit', desc:'Framework RouterSploit — exploits para routers y IoT (similar a MSF)' },
      { cmd:'python3 rsf.py', desc:'Iniciar RouterSploit' },
    ]
  },
  {
    cat: '📋 Recursos adicionales',
    items: [
      { cmd:'shodan search "port:1883" -F json | jq .', desc:'Buscar brokers MQTT públicos en Shodan' },
      { cmd:'git clone https://github.com/OWASP/IoT-Attack-Surface-Areas', desc:'OWASP IoT Attack Surface Areas — referencia completa' },
      { cmd:'# IoT Top 10 (OWASP): Weak passwords, Insecure Network Services, Insecure Ecosystem Interfaces,', desc:'' },
      { cmd:'# Lack of Secure Update Mechanism, Use of Insecure or Outdated Components, Privacy Concerns,', desc:'' },
      { cmd:'# Insecure Data Transfer, Lack of Device Management, Insecure Default Settings, Lack of Physical Hardening', desc:'' },
    ]
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  if (!text || text.startsWith('#')) return null
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500) }) }
  return (
    <button onClick={copy} style={{ padding:'4px 8px', borderRadius:6, cursor:'pointer', border:'none', transition:'all .15s', flexShrink:0,
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(167,139,250,0.12)', color: copied ? '#10b981' : '#a78bfa' }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

export default function ToolIoT() {
  const [open, setOpen] = useState({})
  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))

  return (
    <ToolShell icon="📡" name="IoT Security" color={COLOR} badge="MQTT · Firmware · Telnet · Shodan IoT · RouterSploit">
      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:18,
          background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11 }}>
          <Shield size={13} style={{ color:'#a78bfa', flexShrink:0, marginTop:1 }}/>
          <span>Los dispositivos IoT suelen tener credenciales por defecto, firmware desactualizado y protocolos inseguros. El OWASP IoT Top 10 define los vectores más críticos.</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:10, marginBottom:24 }}>
          {[
            { p:'MQTT :1883', c:'#f59e0b', icon:'📨' },
            { p:'Telnet :23', c:'#ef4444', icon:'🔌' },
            { p:'CoAP :5683', c:'#06b6d4', icon:'📡' },
            { p:'HTTP :8080', c:'#3b82f6', icon:'🌐' },
            { p:'BLE / Zigbee', c:'#a78bfa', icon:'📶' },
          ].map(item => (
            <div key={item.p} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${item.c}20`, borderRadius:10, padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{item.icon}</div>
              <div style={{ color:item.c, fontSize:11, fontFamily:'monospace', fontWeight:600 }}>{item.p}</div>
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
