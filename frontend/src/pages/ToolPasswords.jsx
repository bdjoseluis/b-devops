import { useState, useCallback } from 'react'
import ToolShell from '../components/ToolShell'
import { Key, Copy, RefreshCw, Shield, AlertTriangle, CheckCircle, Eye, EyeOff, Zap } from 'lucide-react'

const COLOR = '#f59e0b'

// Character sets
const CHARS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  ambiguous: 'lI1O0',
}

function analyzePassword(pw) {
  if (!pw) return null
  const len = pw.length
  const hasLower = /[a-z]/.test(pw)
  const hasUpper = /[A-Z]/.test(pw)
  const hasDigit = /[0-9]/.test(pw)
  const hasSymbol = /[^a-zA-Z0-9]/.test(pw)
  const unique = new Set(pw).size

  let entropy = 0
  let pool = 0
  if (hasLower) pool += 26
  if (hasUpper) pool += 26
  if (hasDigit) pool += 10
  if (hasSymbol) pool += 32
  if (pool > 0) entropy = Math.log2(Math.pow(pool, len))

  // Check common patterns
  const patterns = []
  if (/(.)\1{2,}/.test(pw)) patterns.push('Caracteres repetidos')
  if (/123|abc|qwerty|password|admin/i.test(pw)) patterns.push('Patrón común')
  if (len < 8) patterns.push('Muy corto')
  if (/^[a-zA-Z]+$/.test(pw)) patterns.push('Solo letras')
  if (/^[0-9]+$/.test(pw)) patterns.push('Solo números')

  let strength = 0
  if (len >= 8) strength++
  if (len >= 12) strength++
  if (len >= 16) strength++
  if (hasLower && hasUpper) strength++
  if (hasDigit) strength++
  if (hasSymbol) strength++
  if (unique > len * 0.7) strength++
  if (patterns.length === 0) strength++

  const level = strength <= 2 ? 'MUY DÉBIL' : strength <= 4 ? 'DÉBIL' : strength <= 5 ? 'MODERADA' : strength <= 6 ? 'FUERTE' : 'MUY FUERTE'
  const levelColor = strength <= 2 ? '#ef4444' : strength <= 4 ? '#f97316' : strength <= 5 ? '#f59e0b' : strength <= 6 ? '#22d3ee' : '#10b981'

  const crackTime = entropy < 30 ? 'Segundos' : entropy < 50 ? 'Minutos' : entropy < 60 ? 'Horas' : entropy < 70 ? 'Días' : entropy < 80 ? 'Años' : entropy < 100 ? 'Siglos' : 'Siglos (prácticamente irrompible)'

  return { len, hasLower, hasUpper, hasDigit, hasSymbol, unique, entropy: entropy.toFixed(1), strength, level, levelColor, patterns, crackTime }
}

function generatePassword(opts) {
  let charset = ''
  if (opts.lower) charset += CHARS.lower
  if (opts.upper) charset += CHARS.upper
  if (opts.digits) charset += CHARS.digits
  if (opts.symbols) charset += CHARS.symbols
  if (opts.noAmbiguous) charset = charset.split('').filter(c => !CHARS.ambiguous.includes(c)).join('')
  if (!charset) return ''

  const arr = new Uint8Array(opts.length)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(v => charset[v % charset.length]).join('')
}

function generatePassphrase(wordCount) {
  const words = ['apple','bridge','cloud','dragon','eagle','forest','galaxy','hammer','island','jungle','kernel','legend','matrix','nebula','ocean','planet','quantum','rocket','shield','tower','ultra','vector','wizard','xenon','yellow','zenith','alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel','india','juliet','kilo','lima','mike','nova','oscar','papa','quebec','romeo','sierra','tango','uniform','victor','whiskey','xray','yankee','zulu','cyber','data','edge','flux','grid','hawk','iron','jade','keep','link','mesh','node','open','path','risk','safe','unit','void','wave']
  const arr = new Uint8Array(wordCount)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(v => words[v % words.length]).join('-')
}

export default function ToolPasswords() {
  const [pw,       setPw]     = useState('')
  const [showPw,   setShowPw] = useState(true)
  const [copied,   setCopied] = useState(false)
  const [tab,      setTab]    = useState('analyze') // analyze | generate | passphrase
  const [genOpts,  setGenOpts] = useState({ length: 20, lower: true, upper: true, digits: true, symbols: true, noAmbiguous: false })
  const [generated, setGenerated] = useState('')
  const [ppCount,  setPpCount] = useState(5)
  const [generated2, setGenerated2] = useState('')
  const [hibpCount, setHibpCount] = useState(null)
  const [hibpLoading, setHibpLoading] = useState(false)

  const analysis = analyzePassword(pw)

  const copy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  const gen = useCallback(() => {
    setGenerated(generatePassword(genOpts))
  }, [genOpts])

  const checkHIBP = async () => {
    if (!pw || hibpLoading) return
    setHibpLoading(true); setHibpCount(null)
    try {
      const sha1 = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(pw))
      const hex = Array.from(new Uint8Array(sha1)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
      const prefix = hex.slice(0, 5)
      const suffix = hex.slice(5)
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`)
      const text = await res.text()
      const match = text.split('\n').find(l => l.startsWith(suffix))
      setHibpCount(match ? parseInt(match.split(':')[1]) : 0)
    } catch { setHibpCount(-1) }
    finally { setHibpLoading(false) }
  }

  return (
    <ToolShell icon="🔑" name="Password Analyzer" color={COLOR} badge="Análisis · Generador seguro · HIBP check">
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {[['analyze','🔍 Analizar'],['generate','⚡ Generar'],['passphrase','📖 Passphrase']].map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 16px', borderRadius: 8, cursor: 'pointer', background: tab===t ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)', border: tab===t ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.08)', color: tab===t ? COLOR : 'rgba(255,255,255,0.45)', fontWeight: tab===t ? 700 : 400, fontSize: 12 }}>
              {l}
            </button>
          ))}
        </div>

        {/* ANALYZE */}
        {tab === 'analyze' && (
          <div>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder="Introduce una contraseña para analizar..."
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#fff', padding: '14px 50px 14px 16px', borderRadius: 12, fontSize: 15, outline: 'none', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                onFocus={e => e.target.style.borderColor = 'rgba(245,158,11,0.7)'}
                onBlur={e => e.target.style.borderColor = 'rgba(245,158,11,0.3)'}
              />
              <button onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>

            {analysis && (
              <div>
                {/* Strength bar */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Fortaleza</span>
                    <span style={{ color: analysis.levelColor, fontWeight: 700, fontSize: 12 }}>{analysis.level}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(analysis.strength / 8) * 100}%`, background: analysis.levelColor, borderRadius: 3, transition: 'all .4s', boxShadow: `0 0 8px ${analysis.levelColor}` }}/>
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Longitud', value: analysis.len + ' chars' },
                    { label: 'Entropía', value: analysis.entropy + ' bits' },
                    { label: 'Tiempo estimado crack', value: analysis.crackTime },
                    { label: 'Chars únicos', value: `${analysis.unique}/${analysis.len}` },
                    { label: 'Mayúsculas', value: analysis.hasUpper ? '✅' : '❌' },
                    { label: 'Símbolos', value: analysis.hasSymbol ? '✅' : '❌' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginBottom: 4 }}>{s.label}</div>
                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Patterns */}
                {analysis.patterns.length > 0 && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#fca5a5', fontSize: 12, marginBottom: 6 }}>
                      <AlertTriangle size={13}/> Problemas detectados
                    </div>
                    {analysis.patterns.map(p => <div key={p} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>• {p}</div>)}
                  </div>
                )}

                {/* HIBP check */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button onClick={checkHIBP} disabled={!pw || hibpLoading} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, cursor: 'pointer', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 12, fontWeight: 600 }}>
                    <Shield size={13}/>{hibpLoading ? 'Verificando...' : 'Verificar en HIBP (Have I Been Pwned)'}
                  </button>
                  {hibpCount !== null && (
                    <span style={{ fontSize: 12, color: hibpCount > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                      {hibpCount < 0 ? '⚠ Error al verificar' : hibpCount === 0 ? '✅ No aparece en brechas conocidas' : `❌ Aparece ${hibpCount.toLocaleString()} veces en brechas`}
                    </span>
                  )}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 6 }}>Solo se envía el prefijo SHA-1 (k-anonymity) — tu contraseña nunca sale del navegador</div>
              </div>
            )}
          </div>
        )}

        {/* GENERATE */}
        {tab === 'generate' && (
          <div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 22px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Longitud: {genOpts.length} caracteres</span>
                <input type="range" min={8} max={64} value={genOpts.length} onChange={e => setGenOpts(o => ({ ...o, length: +e.target.value }))}
                  style={{ width: 200, accentColor: COLOR }}/>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {[['lower','a-z'],['upper','A-Z'],['digits','0-9'],['symbols','!@#'],['noAmbiguous','Sin ambiguos']].map(([k,l]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" checked={genOpts[k]} onChange={e => setGenOpts(o => ({ ...o, [k]: e.target.checked }))} style={{ accentColor: COLOR, width: 13, height: 13 }}/>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{l}</span>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={gen} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, cursor: 'pointer', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: COLOR, fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
              <Zap size={14}/> Generar contraseña
            </button>
            {generated && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '14px 18px' }}>
                <span style={{ flex: 1, color: '#fff', fontFamily: 'monospace', fontSize: 15, letterSpacing: '0.08em', wordBreak: 'break-all' }}>{generated}</span>
                <button onClick={() => copy(generated)} style={{ background: 'none', border: 'none', color: copied ? '#10b981' : 'rgba(255,255,255,0.4)', cursor: 'pointer', flexShrink: 0 }}>
                  {copied ? <CheckCircle size={16}/> : <Copy size={16}/>}
                </button>
                <button onClick={gen} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', flexShrink: 0 }}>
                  <RefreshCw size={14}/>
                </button>
              </div>
            )}
          </div>
        )}

        {/* PASSPHRASE */}
        {tab === 'passphrase' && (
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 20 }}>Las passphrases son más fáciles de recordar y más seguras que contraseñas cortas complejas. Ejemplo: <em style={{ color: 'rgba(255,255,255,0.6)' }}>quantum-bridge-nova-shield</em></p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Palabras:</span>
              {[3,4,5,6,7].map(n => (
                <button key={n} onClick={() => setPpCount(n)} style={{ padding: '5px 12px', borderRadius: 7, cursor: 'pointer', background: ppCount===n ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', border: ppCount===n ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.08)', color: ppCount===n ? COLOR : 'rgba(255,255,255,0.4)', fontSize: 12 }}>{n}</button>
              ))}
              <button onClick={() => setGenerated2(generatePassphrase(ppCount))} style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 7, padding: '7px 18px', borderRadius: 9, cursor: 'pointer', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: COLOR, fontWeight: 700, fontSize: 13 }}>
                <Zap size={13}/> Generar
              </button>
            </div>
            {generated2 && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '14px 18px' }}>
                <span style={{ flex: 1, color: '#fff', fontFamily: 'monospace', fontSize: 18, letterSpacing: '0.04em' }}>{generated2}</span>
                <button onClick={() => copy(generated2)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                  {copied ? <CheckCircle size={16} style={{ color: '#10b981' }}/> : <Copy size={16}/>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}
