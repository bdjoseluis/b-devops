import { useState, useMemo } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, CheckCircle, BookOpen } from 'lucide-react'

const COLOR = '#a78bfa'

const PRESETS = [
  { label: 'Email',        pattern: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}',  flags: 'gi', desc: 'Validar/extraer emails' },
  { label: 'IPv4',         pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',                      flags: 'g',  desc: 'Direcciones IP v4' },
  { label: 'URL',          pattern: 'https?:\\/\\/[^\\s<>"{}|\\\\^`\\[\\]]+',                flags: 'gi', desc: 'URLs http/https' },
  { label: 'Dominio',      pattern: '(?:[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?\\.)+[a-z]{2,}', flags: 'gi', desc: 'Nombres de dominio' },
  { label: 'Hash MD5',     pattern: '\\b[a-fA-F0-9]{32}\\b',                                 flags: 'g',  desc: 'Hashes MD5 (32 hex)' },
  { label: 'Hash SHA256',  pattern: '\\b[a-fA-F0-9]{64}\\b',                                 flags: 'g',  desc: 'Hashes SHA-256' },
  { label: 'CVE',          pattern: 'CVE-\\d{4}-\\d{4,7}',                                   flags: 'gi', desc: 'IDs de vulnerabilidades CVE' },
  { label: 'JWT',          pattern: 'eyJ[A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]*', flags: 'g', desc: 'JSON Web Tokens' },
  { label: 'CIDR',         pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\/\\d{1,2}\\b',          flags: 'g',  desc: 'Bloques CIDR' },
  { label: 'Port',         pattern: '(?:^|[:\\s])([1-9]\\d{0,4})(?:[\\s/]|$)',               flags: 'gm', desc: 'Números de puerto' },
  { label: 'Tel ES',       pattern: '(?:\\+34)?[\\s-]?[6789]\\d{2}[\\s-]?\\d{3}[\\s-]?\\d{3}', flags: 'g', desc: 'Teléfonos españoles' },
  { label: 'Fecha ISO',    pattern: '\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?Z?)?', flags: 'g', desc: 'Fechas ISO 8601' },
]

const SAMPLE_TEXT = `Registro de acceso — 2024-03-15T14:32:00Z
Usuario: admin@empresa.com | IP: 192.168.1.50 | Puerto: 443
Referencia CVE-2024-1234 — Hash: d41d8cd98f00b204e9800998ecf8427e
JWT: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.abc123
URL: https://malware.example.com/payload.exe
Subred: 10.0.0.0/8 — Contacto: +34 666 123 456
Dominio afectado: evil-domain.xyz`

export default function ToolRegex() {
  const [pattern, setPattern] = useState('')
  const [flags,   setFlags]   = useState('gm')
  const [text,    setText]    = useState(SAMPLE_TEXT)
  const [error,   setError]   = useState('')
  const [copied,  setCopied]  = useState('')

  const { matches, highlighted } = useMemo(() => {
    if (!pattern) return { matches: [], highlighted: '' }
    try {
      setError('')
      const re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
      const allMatches = [...text.matchAll(new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'))]

      // Build highlighted HTML
      let last = 0
      let result = ''
      const re2 = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
      let m
      while ((m = re2.exec(text)) !== null) {
        result += escHtml(text.slice(last, m.index))
        result += `<mark style="background:rgba(167,139,250,0.35);color:#e9d5ff;border-radius:2px;padding:1px 0;">${escHtml(m[0])}</mark>`
        last = m.index + m[0].length
        if (m[0].length === 0) re2.lastIndex++
      }
      result += escHtml(text.slice(last))

      return { matches: allMatches, highlighted: result }
    } catch (err) {
      setError(err.message)
      return { matches: [], highlighted: '' }
    }
  }, [pattern, flags, text])

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>').replace(/ /g,'&nbsp;')
  }

  const copy = (v) => {
    navigator.clipboard.writeText(v).catch(() => {})
    setCopied(v)
    setTimeout(() => setCopied(''), 1500)
  }

  const loadPreset = (p) => {
    setPattern(p.pattern)
    setFlags(p.flags)
  }

  const toggleFlag = (f) => {
    setFlags(prev => prev.includes(f) ? prev.replace(f,'') : prev + f)
  }

  return (
    <ToolShell icon="🔍" name="Regex Tester" color={COLOR} badge="Live · Highlighting · Presets · Groups · OSINT patterns">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Presets */}
        <div style={{ marginBottom:20 }}>
          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginBottom:8, display:'flex', alignItems:'center', gap:5 }}>
            <BookOpen size={11}/> Presets de seguridad
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => loadPreset(p)} title={p.desc}
                style={{ padding:'5px 12px', borderRadius:7, cursor:'pointer', background: pattern === p.pattern ? 'rgba(167,139,250,0.2)':'rgba(255,255,255,0.05)', border:`1px solid ${pattern === p.pattern ? 'rgba(167,139,250,0.5)':'rgba(255,255,255,0.08)'}`, color: pattern === p.pattern ? '#d8b4fe':'rgba(255,255,255,0.5)', fontSize:11 }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pattern input */}
        <div style={{ background:'rgba(167,139,250,0.06)', border:`1px solid ${error ? 'rgba(239,68,68,0.4)':'rgba(167,139,250,0.3)'}`, borderRadius:12, display:'flex', alignItems:'center', marginBottom:8, overflow:'hidden' }}>
          <span style={{ color:'rgba(255,255,255,0.3)', padding:'0 10px 0 16px', fontSize:18, userSelect:'none' }}>/</span>
          <input
            value={pattern}
            onChange={e => setPattern(e.target.value)}
            placeholder="Expresión regular..."
            style={{ flex:1, background:'transparent', border:'none', color:'#e9d5ff', padding:'12px 0', fontSize:14, fontFamily:'monospace', outline:'none' }}
          />
          <span style={{ color:'rgba(255,255,255,0.3)', padding:'0 10px', fontSize:18, userSelect:'none' }}>/</span>
          {/* Flags */}
          <div style={{ display:'flex', gap:4, padding:'0 12px', borderLeft:'1px solid rgba(255,255,255,0.1)' }}>
            {['g','m','i','s'].map(f => (
              <button key={f} onClick={() => toggleFlag(f)}
                style={{ width:24, height:24, borderRadius:5, cursor:'pointer', background: flags.includes(f) ? 'rgba(167,139,250,0.25)':'transparent', border:`1px solid ${flags.includes(f) ? 'rgba(167,139,250,0.5)':'rgba(255,255,255,0.1)'}`, color: flags.includes(f) ? '#d8b4fe':'rgba(255,255,255,0.35)', fontSize:11, fontFamily:'monospace', fontWeight:600 }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ padding:'8px 14px', borderRadius:8, marginBottom:12, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:12, fontFamily:'monospace' }}>
            ⚠ {error}
          </div>
        )}

        {/* Stats */}
        {pattern && !error && (
          <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
            <div style={{ padding:'6px 14px', borderRadius:8, background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.25)', color:'#c084fc', fontSize:12, fontWeight:700 }}>
              {matches.length} {matches.length === 1 ? 'coincidencia' : 'coincidencias'}
            </div>
            {matches.length > 0 && matches[0].length > 1 && (
              <div style={{ padding:'6px 14px', borderRadius:8, background:'rgba(6,182,212,0.1)', border:'1px solid rgba(6,182,212,0.2)', color:'#22d3ee', fontSize:12 }}>
                {matches[0].length - 1} grupo(s) de captura
              </div>
            )}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Test text */}
          <div>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Texto de prueba</div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              style={{ width:'100%', boxSizing:'border-box', minHeight:320, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0', padding:'14px', borderRadius:12, fontSize:12, fontFamily:'monospace', resize:'vertical', outline:'none', lineHeight:1.7 }}
            />
          </div>

          {/* Highlighted output */}
          <div>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Resultado con highlighting</div>
            <div
              dangerouslySetInnerHTML={{ __html: highlighted || escHtml(text) }}
              style={{ minHeight:320, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(167,139,250,0.15)', color:'rgba(255,255,255,0.65)', padding:'14px', borderRadius:12, fontSize:12, fontFamily:'monospace', lineHeight:1.7, overflowY:'auto' }}
            />
          </div>
        </div>

        {/* Match list */}
        {matches.length > 0 && (
          <div style={{ marginTop:20 }}>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginBottom:10, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Coincidencias ({matches.length})
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:280, overflowY:'auto' }}>
              {matches.slice(0, 100).map((m, i) => (
                <div key={i} style={{ display:'flex', gap:12, padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', alignItems:'flex-start' }}>
                  <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10, fontFamily:'monospace', minWidth:24, textAlign:'right', paddingTop:1 }}>{i+1}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <span style={{ background:'rgba(167,139,250,0.2)', color:'#e9d5ff', padding:'1px 6px', borderRadius:3, fontFamily:'monospace', fontSize:12 }}>{m[0]}</span>
                    {m.length > 1 && (
                      <span style={{ color:'rgba(255,255,255,0.3)', fontSize:10, marginLeft:8 }}>
                        grupos: {m.slice(1).map((g,j) => g !== undefined ? <span key={j} style={{ color:'#86efac', marginLeft:4 }}>{g}</span> : null)}
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10, fontFamily:'monospace' }}>idx {m.index}</span>
                    <button onClick={() => copy(m[0])} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', padding:0, display:'flex' }}>
                      {copied === m[0] ? <CheckCircle size={11} style={{ color:'#10b981' }}/> : <Copy size={11}/>}
                    </button>
                  </div>
                </div>
              ))}
              {matches.length > 100 && (
                <div style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:11, padding:'8px 0' }}>
                  +{matches.length - 100} coincidencias más...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cheat sheet */}
        <div style={{ marginTop:20, padding:'14px 18px', borderRadius:12, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ color:'rgba(255,255,255,0.2)', fontSize:10, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Quick Reference</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {[['\\d','dígito'],['\\w','word char'],['\\s','espacio'],['.',  'cualquier'],['*','0 o más'],['+','1 o más'],['?','opcional'],['\\b','word boundary'],['^','inicio'],['$','fin'],['[abc]','clase'],['(x)','grupo']].map(([sym,desc]) => (
              <div key={sym} style={{ display:'flex', gap:5, alignItems:'center' }}>
                <code style={{ background:'rgba(167,139,250,0.12)', color:'#d8b4fe', padding:'2px 6px', borderRadius:4, fontSize:11, fontFamily:'monospace' }}>{sym}</code>
                <span style={{ color:'rgba(255,255,255,0.25)', fontSize:10 }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ToolShell>
  )
}
