import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, Shield, ChevronDown, ChevronUp } from 'lucide-react'

const COLOR = '#06b6d4'

const COMMANDS = [
  {
    cat: '🔬 Análisis estático — file / strings / xxd',
    items: [
      { cmd:'file binario', desc:'Identificar tipo real de archivo por magic bytes (no miente aunque cambiemos la extensión)' },
      { cmd:'strings -n 8 binario', desc:'Extraer cadenas legibles de 8+ chars del binario (busca URLs, keys hardcodeadas)' },
      { cmd:'strings binario | grep -i "http\\|pass\\|key\\|token"', desc:'Filtrar strings de interés en análisis de malware' },
      { cmd:'xxd binario | head -40', desc:'Volcado hexadecimal — ver magic bytes y estructura del archivo' },
      { cmd:'xxd -r hex.txt binario', desc:'Convertir hex de vuelta a binario' },
      { cmd:'md5sum / sha256sum archivo', desc:'Calcular hash del archivo para comparar con OSINT/VirusTotal' },
    ]
  },
  {
    cat: '🧠 Volatility3 — Análisis de memoria RAM',
    items: [
      { cmd:'vol -f memoria.raw windows.pslist', desc:'Listar procesos del volcado de memoria (incluyendo procesos ocultos)' },
      { cmd:'vol -f mem.raw windows.netscan', desc:'Conexiones de red activas e históricas en el momento del volcado' },
      { cmd:'vol -f mem.raw windows.malfind', desc:'Detectar código inyectado — regiones RWX sospechosas (shellcode, process hollowing)' },
      { cmd:'vol -f mem.raw windows.cmdline', desc:'Argumentos de línea de comandos de cada proceso' },
      { cmd:'vol -f mem.raw linux.bash', desc:'Historial bash presente en memoria (contraseñas tecleadas, comandos recientes)' },
      { cmd:'vol -f mem.raw windows.dumpfiles --pid PID', desc:'Extraer archivos cargados por un proceso específico' },
      { cmd:'winpmem_mini.exe mem.raw', desc:'Capturar RAM de sistema Windows en archivo para análisis posterior' },
    ]
  },
  {
    cat: '🔍 Análisis dinámico — strace / ltrace / procmon',
    items: [
      { cmd:'strace -p PID', desc:'Interceptar todas las syscalls de un proceso activo en tiempo real' },
      { cmd:'strace -e trace=network ./binario', desc:'Solo llamadas de red: socket, connect, send, recv' },
      { cmd:'strace -e trace=file ./binario', desc:'Solo accesos a archivos: open, read, write, unlink' },
      { cmd:'strace -o traza.txt ./binario', desc:'Guardar toda la traza en archivo para análisis' },
      { cmd:'ltrace ./binario', desc:'Interceptar llamadas a librerías dinámicas (.so/.dll)' },
      { cmd:'# Windows: procmon.exe → Process Monitor de Sysinternals (GUI completa)', desc:'' },
    ]
  },
  {
    cat: '📁 lsof — Archivos abiertos y forense',
    items: [
      { cmd:'lsof -p PID', desc:'Ver todos los archivos, sockets y dispositivos abiertos por un proceso' },
      { cmd:'lsof -i :4444', desc:'Qué proceso está usando el puerto 4444 (backdoor detection)' },
      { cmd:'lsof -u root', desc:'Todos los recursos abiertos por root' },
      { cmd:'lsof +L1', desc:'Archivos borrados pero aún abiertos por un proceso — recuperar contenido de malware' },
      { cmd:'lsof -i -n | grep ESTABLISHED', desc:'Conexiones TCP/UDP activas con PID' },
    ]
  },
  {
    cat: '📄 Metadatos y documentos — exiftool / oletools',
    items: [
      { cmd:'exiftool archivo', desc:'Extraer metadatos: autor, software, GPS, fechas, dispositivo (imagen, doc, audio, video)' },
      { cmd:'exiftool -all= archivo', desc:'Borrar TODOS los metadatos del archivo (privacidad en OSINT)' },
      { cmd:'exiftool -r /directorio/', desc:'Procesar metadatos recursivamente' },
      { cmd:'pdfinfo documento.pdf', desc:'Metadatos del PDF: autor, creador, fechas, versión PDF' },
      { cmd:'oledump.py documento.docm', desc:'Analizar estructura OLE de documento Office — detectar macros' },
      { cmd:'olevba documento.docm', desc:'Extraer y mostrar código VBA de macros en documentos Office' },
      { cmd:'mraptor documento.docm', desc:'Detectar comportamiento malicioso en macros (autorun, shell, network)' },
    ]
  },
  {
    cat: '📦 binwalk — Análisis de firmware',
    items: [
      { cmd:'binwalk firmware.bin', desc:'Analizar estructura del firmware: detectar filesystems, comprimir, imágenes embebidas' },
      { cmd:'binwalk -e firmware.bin', desc:'Extraer automáticamente todos los componentes detectados' },
      { cmd:'binwalk -E archivo', desc:'Calcular entropía — alta entropía indica cifrado o compresión' },
      { cmd:'binwalk -A firmware.bin', desc:'Detectar arquitectura del procesador (ARM, MIPS, x86, PowerPC)' },
      { cmd:'strings firmware.bin | grep -i "pass\\|admin\\|default"', desc:'Buscar credenciales hardcodeadas en firmware' },
      { cmd:'binwalk --dd=".*" archivo', desc:'Extraer absolutamente todo sin filtros' },
    ]
  },
  {
    cat: '🕐 Timestamps y línea temporal',
    items: [
      { cmd:'stat archivo', desc:'Ver los 3 timestamps: atime (acceso), mtime (modificación), ctime (cambio metadatos)' },
      { cmd:'ls -la --time-style=full-iso', desc:'Listar con timestamps de alta precisión' },
      { cmd:'touch -t 202401011200 archivo', desc:'Modificar timestamp de un archivo (timestomping en forense)' },
      { cmd:'find / -newer /tmp/ref -type f 2>/dev/null', desc:'Archivos modificados DESPUÉS de archivo de referencia' },
      { cmd:'find / -name "*.php" -perm /111 -mtime -7 2>/dev/null', desc:'Scripts PHP ejecutables creados en últimos 7 días — detección webshells' },
      { cmd:'find / -mtime -1 -type f 2>/dev/null | head -50', desc:'Archivos modificados en las últimas 24h' },
    ]
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  if (!text || text.startsWith('#')) return null
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500) }) }
  return (
    <button onClick={copy} style={{ padding:'4px 8px', borderRadius:6, cursor:'pointer', border:'none', transition:'all .15s', flexShrink:0,
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(6,182,212,0.12)', color: copied ? '#10b981' : '#06b6d4' }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

export default function ToolForense() {
  const [open, setOpen] = useState({})
  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))

  return (
    <ToolShell icon="🧪" name="Forense Digital" color={COLOR} badge="Volatility3 · strings · strace · exiftool · binwalk · lsof">
      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:18,
          background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11 }}>
          <Shield size={13} style={{ color:'#06b6d4', flexShrink:0, marginTop:1 }}/>
          <span>El forense digital busca evidencias de compromiso sin alterar la escena. Cadena de custodia: primero captura (RAM → disco), luego analiza sobre copia. Nunca analizar sobre el original.</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px,1fr))', gap:10, marginBottom:24 }}>
          {[
            { label:'Análisis estático', icon:'🔬', color:'#06b6d4', desc:'strings, file, xxd, hashes' },
            { label:'Mem. forense', icon:'🧠', color:'#a78bfa', desc:'Volatility3, WinPmem' },
            { label:'Dinámico', icon:'⚡', color:'#f59e0b', desc:'strace, ltrace, procmon' },
            { label:'Metadatos', icon:'📄', color:'#10b981', desc:'exiftool, olevba, pdfinfo' },
            { label:'IoT / Firmware', icon:'📦', color:'#ef4444', desc:'binwalk, firmwalker' },
          ].map(item => (
            <div key={item.label} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${item.color}25`, borderRadius:10, padding:'12px', textAlign:'center' }}>
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
                      <code style={{ flex:1, fontSize:11, color: item.cmd.startsWith('#') ? 'rgba(255,255,255,0.3)' : '#67e8f9', fontFamily:'monospace', lineHeight:1.5 }}>{item.cmd}</code>
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
