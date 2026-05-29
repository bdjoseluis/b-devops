import { useState, useEffect, useRef } from 'react'
import ToolShell from '../components/ToolShell'
import { Download, Copy, CheckCircle, QrCode, RefreshCw } from 'lucide-react'

const COLOR = '#8b5cf6'

// QR size presets
const SIZES = [128, 200, 300, 400, 512]

// Error correction levels
const EC_LEVELS = [
  { value:'L', label:'L — Bajo (7%)',   desc:'Máxima densidad' },
  { value:'M', label:'M — Medio (15%)',  desc:'Equilibrado' },
  { value:'Q', label:'Q — Cuadrado (25%)', desc:'Alta corrección' },
  { value:'H', label:'H — Alto (30%)',  desc:'Mejor para logos' },
]

// Templates for common QR content
const TEMPLATES = [
  { icon:'🌐', label:'URL',       val:'https://', placeholder:'https://example.com' },
  { icon:'📧', label:'Email',     val:'mailto:', placeholder:'mailto:user@example.com' },
  { icon:'📞', label:'Teléfono',  val:'tel:+34', placeholder:'tel:+34666123456' },
  { icon:'💬', label:'SMS',       val:'sms:+34', placeholder:'sms:+34666123456?body=Hola' },
  { icon:'📶', label:'WiFi',      val:'WIFI:T:WPA;S:', placeholder:'WIFI:T:WPA;S:SSID;P:contraseña;;' },
  { icon:'👤', label:'vCard',     val:'BEGIN:VCARD\nVERSION:3.0\nFN:Nombre\nTEL:+34\nEMAIL:user@email.com\nEND:VCARD', placeholder:'vCard contact' },
  { icon:'🔤', label:'Texto libre', val:'', placeholder:'Escribe cualquier texto...' },
  { icon:'₿',  label:'Bitcoin',   val:'bitcoin:', placeholder:'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf' },
]

export default function ToolQRCode() {
  const [text,    setText]    = useState('https://bdev.qzz.io')
  const [size,    setSize]    = useState(300)
  const [ecLevel, setEC]      = useState('M')
  const [fgColor, setFg]      = useState('#ffffff')
  const [bgColor, setBg]      = useState('#030008')
  const [margin,  setMargin]  = useState(4)
  const [qrUrl,   setQrUrl]   = useState('')
  const [copied,  setCopied]  = useState(false)
  const [template, setTemplate] = useState(0)

  // Build QR URL using Google Charts or QR Server API (free, no key)
  useEffect(() => {
    if (!text.trim()) { setQrUrl(''); return }
    const enc = encodeURIComponent(text)
    const fg  = fgColor.replace('#','')
    const bg  = bgColor.replace('#','')
    // Using api.qrserver.com (free, no CORS issues)
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${enc}&color=${fg}&bgcolor=${bg}&margin=${margin}&ecc=${ecLevel}&format=png`
    setQrUrl(url)
  }, [text, size, ecLevel, fgColor, bgColor, margin])

  const download = async () => {
    const res = await fetch(qrUrl)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `qr_${Date.now()}.png`
    a.click()
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(qrUrl).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  const loadTemplate = (i) => {
    setTemplate(i)
    const t = TEMPLATES[i]
    if (t.val && t.val !== text) setText(t.val)
  }

  return (
    <ToolShell icon="📱" name="QR Code Generator" color={COLOR} badge="URL · WiFi · vCard · Colores · Alta resolución">
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, alignItems:'start' }}>
          {/* Left: config */}
          <div>
            {/* Templates */}
            <div style={{ marginBottom:20 }}>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Tipo de contenido</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => loadTemplate(i)}
                    style={{ padding:'5px 10px', borderRadius:7, cursor:'pointer', fontSize:11, background: template === i ? 'rgba(139,92,246,0.2)':'rgba(255,255,255,0.05)', border:`1px solid ${template === i ? 'rgba(139,92,246,0.5)':'rgba(255,255,255,0.08)'}`, color: template === i ? '#c4b5fd':'rgba(255,255,255,0.5)' }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text input */}
            <div style={{ marginBottom:16 }}>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Contenido</div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={TEMPLATES[template]?.placeholder || 'Escribe el contenido del QR...'}
                style={{ width:'100%', boxSizing:'border-box', minHeight:100, background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.3)', color:'#fff', padding:'12px', borderRadius:10, fontSize:13, fontFamily:'monospace', resize:'vertical', outline:'none', lineHeight:1.6 }}
              />
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10 }}>{text.length} chars</span>
                <button onClick={() => setText('')} style={{ color:'rgba(255,255,255,0.25)', fontSize:10, background:'none', border:'none', cursor:'pointer' }}>Limpiar</button>
              </div>
            </div>

            {/* Size */}
            <div style={{ marginBottom:14 }}>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
                Tamaño: <span style={{ color:'#c4b5fd' }}>{size}×{size}px</span>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {SIZES.map(s => (
                  <button key={s} onClick={() => setSize(s)}
                    style={{ padding:'5px 12px', borderRadius:7, cursor:'pointer', fontSize:11, background: size === s ? 'rgba(139,92,246,0.2)':'rgba(255,255,255,0.05)', border:`1px solid ${size === s ? 'rgba(139,92,246,0.5)':'rgba(255,255,255,0.08)'}`, color: size === s ? '#c4b5fd':'rgba(255,255,255,0.4)' }}>
                    {s}px
                  </button>
                ))}
              </div>
            </div>

            {/* Error correction */}
            <div style={{ marginBottom:14 }}>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
                Corrección de errores
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {EC_LEVELS.map(l => (
                  <button key={l.value} onClick={() => setEC(l.value)} title={l.desc}
                    style={{ padding:'5px 12px', borderRadius:7, cursor:'pointer', fontSize:11, background: ecLevel === l.value ? 'rgba(139,92,246,0.2)':'rgba(255,255,255,0.05)', border:`1px solid ${ecLevel === l.value ? 'rgba(139,92,246,0.5)':'rgba(255,255,255,0.08)'}`, color: ecLevel === l.value ? '#c4b5fd':'rgba(255,255,255,0.4)' }}>
                    {l.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              {[
                { label:'Color QR', val:fgColor, set:setFg },
                { label:'Fondo', val:bgColor, set:setBg },
              ].map(c => (
                <div key={c.label}>
                  <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{c.label}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:9, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                    <input type="color" value={c.val} onChange={e => c.set(e.target.value)}
                      style={{ width:28, height:28, border:'none', borderRadius:5, cursor:'pointer', padding:0, background:'none' }}/>
                    <span style={{ color:'rgba(255,255,255,0.5)', fontSize:12, fontFamily:'monospace' }}>{c.val}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Margin */}
            <div>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
                Margen: <span style={{ color:'#c4b5fd' }}>{margin}</span>
              </div>
              <input type="range" min={0} max={10} value={margin} onChange={e => setMargin(+e.target.value)}
                style={{ width:'100%', accentColor:COLOR }}/>
            </div>
          </div>

          {/* Right: preview */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', alignSelf:'flex-start' }}>
              Vista previa
            </div>
            <div style={{ padding:16, borderRadius:16, background: bgColor === '#030008' || bgColor === '#000000' ? 'rgba(255,255,255,0.06)' : 'transparent', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', minHeight:340 }}>
              {qrUrl ? (
                <img src={qrUrl} alt="QR Code" style={{ borderRadius:8, maxWidth:'100%', display:'block' }}
                  onError={e => e.target.src = ''}/>
              ) : (
                <div style={{ textAlign:'center', color:'rgba(255,255,255,0.2)' }}>
                  <QrCode size={48} style={{ margin:'0 auto 10px', display:'block', opacity:0.3 }}/>
                  <div style={{ fontSize:12 }}>Escribe algo para generar el QR</div>
                </div>
              )}
            </div>

            {qrUrl && (
              <div style={{ display:'flex', gap:8, width:'100%' }}>
                <button onClick={download}
                  style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'10px', borderRadius:10, cursor:'pointer', background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.4)', color:COLOR, fontWeight:700, fontSize:13 }}>
                  <Download size={14}/> Descargar PNG
                </button>
                <button onClick={copyUrl}
                  style={{ padding:'10px 14px', borderRadius:10, cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color: copied ? '#10b981':'rgba(255,255,255,0.5)', fontSize:13 }}>
                  {copied ? <CheckCircle size={14}/> : <Copy size={14}/>}
                </button>
              </div>
            )}

            {/* Quick presets */}
            <div style={{ width:'100%', padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color:'rgba(255,255,255,0.25)', fontSize:10, marginBottom:8 }}>Presets de color</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[
                  { fg:'#ffffff', bg:'#000000', label:'Classic' },
                  { fg:'#000000', bg:'#ffffff', label:'Invertido' },
                  { fg:'#a78bfa', bg:'#030008', label:'Galaxy' },
                  { fg:'#10b981', bg:'#022c22', label:'Matrix' },
                  { fg:'#f59e0b', bg:'#1c0a00', label:'Amber' },
                  { fg:'#ef4444', bg:'#1c0000', label:'Alert' },
                ].map(p => (
                  <button key={p.label} onClick={() => { setFg(p.fg); setBg(p.bg) }}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:6, cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:10 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:p.fg, border:`1px solid ${p.bg}` }}/>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolShell>
  )
}
