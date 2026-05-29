import { useState, useCallback } from 'react'

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return { r, g, b }
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  let h, s, l = (max+min)/2
  if (max === min) { h = s = 0 }
  else {
    const d = max - min
    s = l > 0.5 ? d/(2-max-min) : d/(max+min)
    switch(max) {
      case r: h = ((g-b)/d + (g<b?6:0))/6; break
      case g: h = ((b-r)/d + 2)/6; break
      case b: h = ((r-g)/d + 4)/6; break
      default: h = 0
    }
  }
  return { h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100) }
}

function rgbToHex(r,g,b) {
  return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('')
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHsl(r,g,b)
}

function hslToHex(h,s,l) {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1-l)
  const f = n => { const k=(n+h/30)%12; const color=l-a*Math.max(Math.min(k-3,9-k,1),-1); return Math.round(255*color).toString(16).padStart(2,'0') }
  return '#'+f(0)+f(8)+f(4)
}

function getContrastColor(hex) {
  const { r, g, b } = hexToRgb(hex)
  return (r*299 + g*587 + b*114) / 1000 > 128 ? '#000000' : '#ffffff'
}

function genPalette(hex) {
  const { h, s } = hexToHsl(hex)
  return [10,20,30,40,50,60,70,80,90].map(l => hslToHex(h,s,l))
}

function genShades(hex) {
  const { h, s } = hexToHsl(hex)
  return [
    { name:'50',  hex: hslToHex(h, Math.max(s-20,0), 95) },
    { name:'100', hex: hslToHex(h, Math.max(s-10,0), 90) },
    { name:'200', hex: hslToHex(h, s, 80) },
    { name:'300', hex: hslToHex(h, s, 70) },
    { name:'400', hex: hslToHex(h, s, 60) },
    { name:'500', hex: hslToHex(h, s, 50) },
    { name:'600', hex: hslToHex(h, s, 40) },
    { name:'700', hex: hslToHex(h, s, 30) },
    { name:'800', hex: hslToHex(h, s, 20) },
    { name:'900', hex: hslToHex(h, s, 10) },
  ]
}

const HISTORY_KEY = 'bdev_color_history'

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}

export default function ToolColorPicker() {
  const [color, setColor] = useState('#7c3aed')
  const [copied, setCopied] = useState('')
  const [history, setHistory] = useState(loadHistory)
  const [hexInput, setHexInput] = useState('#7c3aed')

  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(''), 1500)
    })
  }

  const applyColor = useCallback((hex) => {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return
    setColor(hex)
    setHexInput(hex)
    const h = loadHistory()
    const next = [hex, ...h.filter(x => x !== hex)].slice(0, 20)
    setHistory(next)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  }, [])

  const { r, g, b } = hexToRgb(color)
  const { h, s, l } = hexToHsl(color)
  const contrast = getContrastColor(color)
  const shades = genShades(color)
  const palette = genPalette(color)

  const formats = [
    { label: 'HEX',        val: color.toUpperCase() },
    { label: 'RGB',        val: `rgb(${r}, ${g}, ${b})` },
    { label: 'RGBA',       val: `rgba(${r}, ${g}, ${b}, 1)` },
    { label: 'HSL',        val: `hsl(${h}, ${s}%, ${l}%)` },
    { label: 'HSLA',       val: `hsla(${h}, ${s}%, ${l}%, 1)` },
    { label: 'CSS var',    val: `--color-primary: ${color};` },
    { label: 'Tailwind',   val: `bg-[${color}]` },
    { label: 'Android XML',val: `<color name="primary">${color.toUpperCase()}</color>` },
  ]

  const S = {
    page: { background: '#030008', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'monospace' },
    header: { background: '#0a001a', borderBottom: '1px solid #1a0533', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' },
    backBtn: { background: 'none', border: '1px solid #333', borderRadius: '6px', color: '#888', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' },
    card: { background: '#0d0020', border: '1px solid #1a0533', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
    label: { fontSize: '11px', color: '#555', letterSpacing: '1px', marginBottom: '10px' },
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => window.history.back()}>← Back</button>
        <span style={{ fontSize: '20px' }}>🎨</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#ec4899' }}>COLOR PICKER</div>
          <div style={{ fontSize: '11px', color: '#666' }}>HEX · RGB · HSL · Shades · Palettes</div>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
        {/* Left: picker */}
        <div>
          <div style={S.card}>
            {/* Big color preview */}
            <div style={{ background: color, borderRadius: '12px', height: '120px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ color: contrast, fontSize: '22px', fontWeight: 700 }}>{color.toUpperCase()}</span>
            </div>

            {/* Native color picker */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <input type="color" value={color}
                onChange={e => { setColor(e.target.value); setHexInput(e.target.value) }}
                onBlur={() => applyColor(color)}
                style={{ width: '80px', height: '48px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'none' }} />
            </div>

            {/* HEX input */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={hexInput} onChange={e => setHexInput(e.target.value)}
                onBlur={() => applyColor(hexInput)}
                onKeyDown={e => e.key === 'Enter' && applyColor(hexInput)}
                style={{ flex: 1, background: '#030008', border: '1px solid #2d0f52', borderRadius: '8px', color: '#e2e8f0', padding: '8px 12px', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }}
                placeholder="#7c3aed" />
              <button onClick={() => applyColor(hexInput)}
                style={{ background: '#7c3aed', border: 'none', borderRadius: '8px', color: 'white', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' }}>→</button>
            </div>

            {/* Values */}
            <div style={{ marginTop: '16px', fontSize: '12px' }}>
              {[`H: ${h}°  S: ${s}%  L: ${l}%`, `R: ${r}  G: ${g}  B: ${b}`].map(line => (
                <div key={line} style={{ color: '#555', padding: '4px 0', fontFamily: 'monospace' }}>{line}</div>
              ))}
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div style={S.card}>
              <div style={S.label}>HISTORIAL</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {history.map(hex => (
                  <button key={hex} onClick={() => applyColor(hex)}
                    style={{ width: '32px', height: '32px', background: hex, border: color === hex ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', cursor: 'pointer', title: hex }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: formats + shades */}
        <div>
          {/* Formats */}
          <div style={S.card}>
            <div style={S.label}>FORMATOS DE COLOR</div>
            {formats.map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: '1px solid #1a0533' }}>
                <span style={{ color: '#555', fontSize: '11px', minWidth: '90px' }}>{label}</span>
                <code style={{ flex: 1, color: '#a78bfa', fontSize: '12px', background: '#030008', padding: '4px 8px', borderRadius: '4px' }}>{val}</code>
                <button onClick={() => copy(val, label)}
                  style={{ background: 'none', border: 'none', color: copied === label ? '#34d399' : '#555', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>
                  {copied === label ? '✓' : '📋'}
                </button>
              </div>
            ))}
          </div>

          {/* Shades */}
          <div style={S.card}>
            <div style={S.label}>SHADES (TAILWIND STYLE)</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {shades.map(({ name, hex }) => (
                <div key={name} style={{ flex: 1, cursor: 'pointer' }} onClick={() => { copy(hex, name); applyColor(hex) }}>
                  <div style={{ background: hex, height: '48px', borderRadius: '6px', border: copied === name ? '2px solid white' : 'none' }} />
                  <div style={{ textAlign: 'center', fontSize: '9px', color: '#555', marginTop: '4px' }}>{name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Luminosity palette */}
          <div style={S.card}>
            <div style={S.label}>PALETA DE LUMINOSIDAD</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {palette.map((hex, i) => (
                <div key={i} style={{ flex: 1, cursor: 'pointer' }} onClick={() => applyColor(hex)}>
                  <div style={{ background: hex, height: '40px', borderRadius: '4px', border: color === hex ? '2px solid white' : 'none' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Accessibility */}
          <div style={S.card}>
            <div style={S.label}>ACCESIBILIDAD (WCAG)</div>
            {[
              { bg: color, fg: '#ffffff', label: 'Blanco sobre color' },
              { bg: color, fg: '#000000', label: 'Negro sobre color' },
              { bg: '#ffffff', fg: color, label: 'Color sobre blanco' },
              { bg: '#000000', fg: color, label: 'Color sobre negro' },
            ].map(({ bg, fg, label }) => {
              const lum = (hex) => { const { r, g, b } = hexToRgb(hex); return 0.2126*(r/255)**2.2 + 0.7152*(g/255)**2.2 + 0.0722*(b/255)**2.2 }
              const l1 = lum(bg), l2 = lum(fg)
              const ratio = (Math.max(l1,l2)+0.05) / (Math.min(l1,l2)+0.05)
              const aa = ratio >= 4.5, aaa = ratio >= 7
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid #1a0533', fontSize: '12px' }}>
                  <div style={{ background: bg, color: fg, borderRadius: '4px', padding: '4px 10px', border: '1px solid rgba(255,255,255,0.1)', minWidth: '80px', textAlign: 'center', fontSize: '11px' }}>Aa Bb 123</div>
                  <span style={{ color: '#555', flex: 1 }}>{label}</span>
                  <span style={{ color: '#a78bfa', minWidth: '60px' }}>{ratio.toFixed(2)}:1</span>
                  <span style={{ color: aaa ? '#34d399' : aa ? '#f59e0b' : '#ef4444' }}>{aaa ? 'AAA ✓' : aa ? 'AA ✓' : 'FAIL ✗'}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
