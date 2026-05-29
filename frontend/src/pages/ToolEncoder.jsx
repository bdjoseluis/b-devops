import { useState, useCallback } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, CheckCircle, ArrowRight, RotateCcw } from 'lucide-react'

const COLOR = '#06b6d4'

// ── Codec definitions ────────────────────────────────────────────────────────
const CODECS = {
  base64: {
    label: 'Base64',
    color: '#06b6d4',
    encode: (s) => btoa(unescape(encodeURIComponent(s))),
    decode: (s) => { try { return decodeURIComponent(escape(atob(s.trim()))) } catch { return '⚠ Error: input no es Base64 válido' } },
  },
  hex: {
    label: 'HEX',
    color: '#22d3ee',
    encode: (s) => Array.from(new TextEncoder().encode(s)).map(b => b.toString(16).padStart(2,'0')).join(' '),
    decode: (s) => { try { return new TextDecoder().decode(new Uint8Array(s.trim().replace(/\s+/g,' ').split(/\s+/).map(h => parseInt(h,16)))) } catch { return '⚠ Error: HEX inválido' } },
  },
  url: {
    label: 'URL',
    color: '#38bdf8',
    encode: (s) => encodeURIComponent(s),
    decode: (s) => { try { return decodeURIComponent(s) } catch { return '⚠ Error: URL encoding inválida' } },
  },
  html: {
    label: 'HTML',
    color: '#f97316',
    encode: (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'),
    decode: (s) => s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(n)),
  },
  unicode: {
    label: 'Unicode',
    color: '#a855f7',
    encode: (s) => Array.from(s).map(c => c.codePointAt(0) > 127 ? `\\u${c.codePointAt(0).toString(16).padStart(4,'0')}` : c).join(''),
    decode: (s) => { try { return s.replace(/\\u([0-9a-fA-F]{4})/g, (_,h) => String.fromCodePoint(parseInt(h,16))) } catch { return '⚠ Error' } },
  },
  binary: {
    label: 'Binario',
    color: '#10b981',
    encode: (s) => Array.from(new TextEncoder().encode(s)).map(b => b.toString(2).padStart(8,'0')).join(' '),
    decode: (s) => { try { return new TextDecoder().decode(new Uint8Array(s.trim().replace(/\s+/g,' ').split(/\s+/).map(b => parseInt(b,2)))) } catch { return '⚠ Error' } },
  },
  rot13: {
    label: 'ROT13',
    color: '#f59e0b',
    encode: (s) => s.replace(/[A-Za-z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13))),
    decode: (s) => s.replace(/[A-Za-z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13))),
  },
  jwt: {
    label: 'JWT',
    color: '#ec4899',
    encode: (s) => { try { const p = JSON.parse(s); return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(p))}.SIGNATURE` } catch { return '⚠ Introduce un JSON válido para codificar como JWT' } },
    decode: (s) => {
      try {
        const parts = s.trim().split('.')
        if (parts.length !== 3) return '⚠ Formato JWT inválido (debe tener 3 partes separadas por .)'
        const header  = JSON.parse(atob(parts[0].replace(/-/g,'+').replace(/_/g,'/')))
        const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')))
        return `// HEADER\n${JSON.stringify(header, null, 2)}\n\n// PAYLOAD\n${JSON.stringify(payload, null, 2)}\n\n// SIGNATURE (no verificada)\n${parts[2]}`
      } catch { return '⚠ Error al decodificar JWT' }
    },
  },
  morse: {
    label: 'Morse',
    color: '#6366f1',
    encode: (s) => {
      const MAP = {A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.',' ':'/'};
      return s.toUpperCase().split('').map(c => MAP[c] || '?').join(' ')
    },
    decode: (s) => {
      const MAP = {'.-':'A','-...':'B','-.-.':'C','-..':'D','.':'E','..-.':'F','--.':'G','....':'H','..':'I','.---':'J','-.-':'K','.-..':'L','--':'M','-.':'N','---':'O','.--.':'P','--.-':'Q','.-.':'R','...':'S','-':'T','..-':'U','...-':'V','.--':'W','-..-':'X','-.--':'Y','--..':'Z','-----':'0','.----':'1','..---':'2','...--':'3','....-':'4','.....':'5','-....':'6','--...':'7','---..':'8','----.':'9','/':' '};
      return s.split(' ').map(c => MAP[c] || '?').join('')
    },
  },
}

const EXAMPLES = {
  base64: 'Hola mundo!',
  hex: 'AURA OPS',
  url: 'https://example.com/path?q=hola mundo&lang=es',
  html: '<script>alert("XSS")</script>',
  unicode: 'José Ángel 🚀',
  binary: 'HACK',
  rot13: 'Gur dhvpx oebja sbk',
  jwt: '{"sub":"user123","role":"admin","exp":9999999999}',
  morse: 'SOS',
}

export default function ToolEncoder() {
  const [codec,   setCodec]  = useState('base64')
  const [input,   setInput]  = useState('')
  const [output,  setOutput] = useState('')
  const [mode,    setMode]   = useState('encode') // encode | decode
  const [copied,  setCopied] = useState(false)

  const run = useCallback((text = input, c = codec, m = mode) => {
    if (!text) { setOutput(''); return }
    const fn = CODECS[c]?.[m]
    if (fn) setOutput(fn(text))
  }, [input, codec, mode])

  const handleChange = (text) => {
    setInput(text)
    const fn = CODECS[codec]?.[mode]
    if (fn) setOutput(text ? fn(text) : '')
  }

  const switchMode = () => {
    const newMode = mode === 'encode' ? 'decode' : 'encode'
    // Swap input/output
    const newInput = output
    setMode(newMode)
    setInput(newInput)
    const fn = CODECS[codec]?.[newMode]
    setOutput(newInput && fn ? fn(newInput) : '')
  }

  const copyOutput = () => {
    navigator.clipboard.writeText(output).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const loadExample = () => {
    const ex = EXAMPLES[codec] || 'Hello World'
    setInput(ex)
    const fn = CODECS[codec]?.[mode]
    setOutput(fn ? fn(ex) : '')
  }

  const changeCodec = (c) => {
    setCodec(c)
    setOutput('')
    if (input) {
      const fn = CODECS[c]?.[mode]
      if (fn) setOutput(fn(input))
    }
  }

  const cd = CODECS[codec]

  return (
    <ToolShell icon="🔤" name="Encoder / Decoder" color={COLOR} badge="Base64 · HEX · URL · HTML · JWT · Morse · ROT13 · Unicode">
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>

        {/* Codec selector */}
        <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
          {Object.entries(CODECS).map(([key, def]) => (
            <button key={key} onClick={() => changeCodec(key)}
              style={{ padding:'7px 14px', borderRadius:9, cursor:'pointer', fontSize:12, fontWeight: codec === key ? 700:400,
                background: codec === key ? `${def.color}20` : 'rgba(255,255,255,0.04)',
                border: codec === key ? `1px solid ${def.color}50` : '1px solid rgba(255,255,255,0.08)',
                color: codec === key ? def.color : 'rgba(255,255,255,0.4)' }}>
              {def.label}
            </button>
          ))}
        </div>

        {/* Mode toggle + example */}
        <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center' }}>
          <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, overflow:'hidden' }}>
            {['encode','decode'].map(m => (
              <button key={m} onClick={() => { setMode(m); setOutput(''); if (input) { const fn = CODECS[codec]?.[m]; if (fn) setOutput(fn(input)) } }}
                style={{ padding:'8px 16px', cursor:'pointer', background: mode === m ? `${cd.color}20`:'transparent', border:'none', color: mode === m ? cd.color:'rgba(255,255,255,0.35)', fontSize:12, fontWeight: mode === m ? 700:400, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                {m === 'encode' ? 'Codificar' : 'Decodificar'}
              </button>
            ))}
          </div>
          <button onClick={switchMode} title="Intercambiar entrada y salida"
            style={{ padding:'7px 12px', borderRadius:9, cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', display:'flex', alignItems:'center', gap:5, fontSize:11 }}>
            <RotateCcw size={12}/> Invertir
          </button>
          <button onClick={loadExample}
            style={{ padding:'7px 12px', borderRadius:9, cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', fontSize:11 }}>
            Ejemplo
          </button>
        </div>

        {/* Two-panel editor */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:0, alignItems:'stretch' }}>
          {/* Input */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${cd.color}25`, borderRadius:'14px 0 0 14px', overflow:'hidden' }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.03)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:'rgba(255,255,255,0.4)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                {mode === 'encode' ? 'Texto plano' : `${cd.label} encodeado`}
              </span>
              <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10 }}>{input.length} chars</span>
            </div>
            <textarea
              value={input}
              onChange={e => handleChange(e.target.value)}
              placeholder={`Escribe o pega aquí...`}
              style={{ width:'100%', boxSizing:'border-box', minHeight:280, background:'transparent', border:'none', color:'#e2e8f0', padding:'14px 16px', fontSize:13, fontFamily:'monospace', resize:'none', outline:'none', lineHeight:1.6 }}
            />
          </div>

          {/* Arrow */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'0 12px', background:'rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <div style={{ padding:'8px 10px', borderRadius:8, background:`${cd.color}15`, border:`1px solid ${cd.color}30` }}>
                <ArrowRight size={16} style={{ color: cd.color }}/>
              </div>
              <span style={{ color: cd.color, fontSize:9, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', writingMode:'vertical-rl', textOrientation:'mixed', transform:'rotate(180deg)' }}>{cd.label}</span>
            </div>
          </div>

          {/* Output */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${cd.color}25`, borderRadius:'0 14px 14px 0', borderLeft:'none', overflow:'hidden' }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.03)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:'rgba(255,255,255,0.4)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                {mode === 'encode' ? `${cd.label} encodeado` : 'Texto decodificado'}
              </span>
              <button onClick={copyOutput} style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 8px', borderRadius:6, cursor:'pointer', background: copied ? 'rgba(16,185,129,0.15)':'rgba(255,255,255,0.06)', border:`1px solid ${copied ? 'rgba(16,185,129,0.4)':'rgba(255,255,255,0.1)'}`, color: copied ? '#10b981':'rgba(255,255,255,0.4)', fontSize:10 }}>
                {copied ? <CheckCircle size={11}/> : <Copy size={11}/>} {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <textarea
              readOnly
              value={output}
              placeholder="El resultado aparecerá aquí..."
              style={{ width:'100%', boxSizing:'border-box', minHeight:280, background:'transparent', border:'none', color: output.startsWith('⚠') ? '#fca5a5' : '#86efac', padding:'14px 16px', fontSize:13, fontFamily:'monospace', resize:'none', outline:'none', lineHeight:1.6 }}
            />
          </div>
        </div>

        {/* Info bar */}
        {output && !output.startsWith('⚠') && (
          <div style={{ marginTop:12, padding:'8px 14px', borderRadius:8, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', display:'flex', gap:16, color:'rgba(255,255,255,0.25)', fontSize:11 }}>
            <span>📥 Entrada: <strong style={{ color:'rgba(255,255,255,0.45)' }}>{input.length}</strong> chars</span>
            <span>📤 Salida: <strong style={{ color:'rgba(255,255,255,0.45)' }}>{output.length}</strong> chars</span>
            {mode === 'encode' && <span>📊 Ratio: <strong style={{ color:'rgba(255,255,255,0.45)' }}>{(output.length/Math.max(input.length,1)).toFixed(2)}x</strong></span>}
          </div>
        )}
      </div>
    </ToolShell>
  )
}
