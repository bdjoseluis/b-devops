import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Hash, Search, Loader2, ExternalLink, Copy, CheckCircle, AlertCircle } from 'lucide-react'

const COLOR = '#f59e0b'

// Detect hash type by length and charset
function detectHash(h) {
  const s = h.trim().toLowerCase()
  if (/^[a-f0-9]+$/.test(s)) {
    if (s.length === 32)  return [{ type: 'MD5',          bits: 128 }, { type: 'NTLM', bits: 128 }]
    if (s.length === 40)  return [{ type: 'SHA-1',         bits: 160 }]
    if (s.length === 56)  return [{ type: 'SHA-224',       bits: 224 }]
    if (s.length === 64)  return [{ type: 'SHA-256',       bits: 256 }]
    if (s.length === 96)  return [{ type: 'SHA-384',       bits: 384 }]
    if (s.length === 128) return [{ type: 'SHA-512',       bits: 512 }]
    if (s.length === 16)  return [{ type: 'MySQL 3.x',    bits: 64  }]
  }
  if (/^\$2[aby]\$/.test(s))    return [{ type: 'bcrypt',    bits: 184 }]
  if (/^\$argon2/.test(s))      return [{ type: 'Argon2',   bits: 256 }]
  if (/^\$6\$/.test(s))         return [{ type: 'SHA-512crypt', bits: 512 }]
  if (/^\$5\$/.test(s))         return [{ type: 'SHA-256crypt', bits: 256 }]
  if (/^\$1\$/.test(s))         return [{ type: 'MD5crypt',  bits: 128 }]
  if (/^[a-f0-9]{32}:[a-f0-9]{32}$/.test(s)) return [{ type: 'MD5 + Salt', bits: 128 }]
  return []
}

// Security level for each hash type
const SECURITY = {
  'MD5': { level: 'CRÍTICO', color: '#ef4444', note: 'Obsoleto — crackeable en segundos con GPU' },
  'NTLM': { level: 'CRÍTICO', color: '#ef4444', note: 'Obsoleto — usado en Windows auth, muy vulnerable' },
  'SHA-1': { level: 'ALTO RIESGO', color: '#f97316', note: 'Depreciado — colisiones conocidas (SHAttered)' },
  'SHA-224': { level: 'MEDIO', color: '#f59e0b', note: 'Variante SHA-2, no recomendado para nuevas apps' },
  'SHA-256': { level: 'SEGURO', color: '#10b981', note: 'Ampliamente usado, sigue siendo seguro' },
  'SHA-384': { level: 'SEGURO', color: '#10b981', note: 'Variante SHA-2 de alta seguridad' },
  'SHA-512': { level: 'SEGURO', color: '#10b981', note: 'Excelente seguridad para hashing de datos' },
  'SHA-512crypt': { level: 'SEGURO', color: '#10b981', note: 'Usado en Unix/Linux para contraseñas' },
  'SHA-256crypt': { level: 'SEGURO', color: '#10b981', note: 'Alternativa SHA-2 para contraseñas Unix' },
  'bcrypt': { level: 'MUY SEGURO', color: '#3b82f6', note: 'Diseñado para contraseñas — resistente a GPU' },
  'Argon2': { level: 'MUY SEGURO', color: '#3b82f6', note: 'Ganador de PHC — estado del arte para passwords' },
  'MD5crypt': { level: 'ALTO RIESGO', color: '#f97316', note: 'Obsoleto — evitar para nuevas implementaciones' },
  'MD5 + Salt': { level: 'MEDIO', color: '#f59e0b', note: 'MD5 con salt — mejor que MD5 puro pero limitado' },
  'MySQL 3.x': { level: 'CRÍTICO', color: '#ef4444', note: 'Algoritmo antiguo de MySQL — extremadamente débil' },
}

// Online hash lookup services
const LOOKUP_SERVICES = [
  { name: 'CrackStation',  url: h => `https://crackstation.net/`,                 note: 'DB de 15B+ hashes' },
  { name: 'MD5Hashing',    url: h => `https://md5hashing.net/hash/md5/${h}`,      note: 'Multi-format lookup' },
  { name: 'Hashes.com',    url: h => `https://hashes.com/en/decrypt/hash#${h}`,  note: 'Comunidad colaborativa' },
  { name: 'HashKiller',    url: h => `https://hashkiller.io/listmanager`,          note: 'Herramienta UK' },
]

// Hash in common formats
function hashInfo(h) {
  const s = h.trim()
  return {
    original: s,
    lower: s.toLowerCase(),
    upper: s.toUpperCase(),
    length: s.length,
    entropy: [...s].reduce((acc, c) => {
      const charset = /[0-9]/.test(c) ? 10 : /[a-f]/i.test(c) ? 6 : 26
      return acc + Math.log2(charset)
    }, 0).toFixed(1),
  }
}

export default function ToolHashLookup() {
  const [input,   setInput]   = useState('')
  const [copied,  setCopied]  = useState('')
  const [calcd,   setCalcd]   = useState(null)

  const analyze = () => {
    const h = input.trim()
    if (!h) return
    setCalcd({ hash: h, types: detectHash(h), info: hashInfo(h) })
  }

  const copy = (v) => {
    navigator.clipboard.writeText(v).catch(() => {})
    setCopied(v)
    setTimeout(() => setCopied(''), 1500)
  }

  const EXAMPLES = [
    { label: 'MD5', v: '5f4dcc3b5aa765d61d8327deb882cf99' },
    { label: 'SHA-1', v: 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d' },
    { label: 'SHA-256', v: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8' },
    { label: 'bcrypt', v: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' },
  ]

  return (
    <ToolShell icon="#️⃣" name="Hash Lookup" color={COLOR} badge="Identificar · Buscar · Analizar · MD5 · SHA · bcrypt">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Input */}
        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <div style={{ position:'relative', flex:1 }}>
            <Hash size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)' }}/>
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setCalcd(null) }}
              onKeyDown={e => e.key === 'Enter' && analyze()}
              placeholder="Pega un hash aquí... MD5, SHA-1, SHA-256, bcrypt, NTLM..."
              style={{ width:'100%', boxSizing:'border-box', background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.3)', color:'#fff', padding:'12px 14px 12px 38px', borderRadius:10, fontSize:13, outline:'none', fontFamily:'monospace' }}
            />
          </div>
          <button onClick={analyze} disabled={!input.trim()}
            style={{ padding:'12px 22px', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:7, background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.4)', color:COLOR, fontWeight:700, fontSize:13 }}>
            <Search size={14}/> Analizar
          </button>
        </div>

        {/* Examples */}
        <div style={{ display:'flex', gap:6, marginBottom:24, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ color:'rgba(255,255,255,0.25)', fontSize:11 }}>Ejemplos:</span>
          {EXAMPLES.map(e => (
            <button key={e.label} onClick={() => { setInput(e.v); setCalcd(null) }}
              style={{ padding:'3px 10px', borderRadius:6, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:11, cursor:'pointer' }}>
              {e.label}
            </button>
          ))}
        </div>

        {calcd && (
          <>
            {/* Hash detection */}
            <div style={{ marginBottom:16 }}>
              {calcd.types.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {calcd.types.map((t, i) => {
                    const sec = SECURITY[t.type] || { level:'DESCONOCIDO', color:'#6b7280', note:'Tipo no catalogado' }
                    return (
                      <div key={i} style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${sec.color}30`, borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
                          <div style={{ width:10, height:10, borderRadius:'50%', background:sec.color, boxShadow:`0 0 12px ${sec.color}`, flexShrink:0 }}/>
                          <div>
                            <div style={{ color:'#fff', fontWeight:700, fontSize:16, fontFamily:'monospace' }}>{t.type}</div>
                            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginTop:2 }}>{t.bits} bits · {sec.note}</div>
                          </div>
                        </div>
                        <div style={{ padding:'4px 12px', borderRadius:7, background:`${sec.color}20`, border:`1px solid ${sec.color}40`, color:sec.color, fontSize:11, fontWeight:700, letterSpacing:'0.05em' }}>
                          {sec.level}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ display:'flex', gap:10, padding:'14px 18px', borderRadius:12, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', color:'#fde68a', fontSize:13 }}>
                  <AlertCircle size={16}/> Formato no reconocido o hash incompleto. Verifica la longitud y el charset.
                </div>
              )}
            </div>

            {/* Hash info */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
                <div style={{ color:'rgba(255,255,255,0.5)', fontSize:11, fontWeight:700, marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>Información del hash</div>
                {[
                  ['Longitud (chars)', calcd.info.length],
                  ['Longitud (bits aprox.)', calcd.info.length * 4 + ' bits (hex)'],
                  ['Charset', /^[a-f0-9]+$/i.test(calcd.hash) ? 'Hexadecimal (0-9, a-f)' : 'Alfanumérico / especial'],
                ].map(([l,v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color:'rgba(255,255,255,0.35)', fontSize:12 }}>{l}</span>
                    <span style={{ color:'#fff', fontSize:12, fontFamily:'monospace' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
                <div style={{ color:'rgba(255,255,255,0.5)', fontSize:11, fontWeight:700, marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>Formatos</div>
                {[
                  ['Original', calcd.info.original],
                  ['Minúsculas', calcd.info.lower],
                  ['Mayúsculas', calcd.info.upper],
                ].map(([l,v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>{l}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ color:'#fff', fontSize:11, fontFamily:'monospace', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</span>
                      <button onClick={() => copy(v)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', padding:0, display:'flex' }}>
                        {copied === v ? <CheckCircle size={10} style={{ color:'#10b981' }}/> : <Copy size={10}/>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Online lookup services */}
            {calcd.types.some(t => ['MD5','NTLM','SHA-1'].includes(t.type)) && (
              <div style={{ background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:14, padding:'16px 20px', marginBottom:16 }}>
                <div style={{ color:COLOR, fontWeight:700, fontSize:12, marginBottom:12 }}>
                  🔓 Servicios de crackeo online (hashes débiles)
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:8 }}>
                  {LOOKUP_SERVICES.map(s => (
                    <a key={s.name} href={s.url(calcd.hash)} target="_blank" rel="noopener noreferrer"
                      style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)', textDecoration:'none', transition:'all .15s' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(245,158,11,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}>
                      <ExternalLink size={11} style={{ color:COLOR, flexShrink:0 }}/>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600 }}>{s.name}</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:1 }}>{s.note}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Hash in context */}
            <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.25)', fontSize:11 }}>
              💡 Para crackear hashes resistentes como bcrypt/Argon2 usa la herramienta Hashcat en Terminal IA.
              Los hashes MD5/SHA-1 pueden romperse en segundos en CrackStation si la contraseña está en su DB.
            </div>
          </>
        )}
      </div>
    </ToolShell>
  )
}
