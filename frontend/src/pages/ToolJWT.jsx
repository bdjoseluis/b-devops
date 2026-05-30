import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, AlertTriangle, CheckCircle, Clock, Lock, Unlock } from 'lucide-react'

const COLOR = '#a855f7'

function b64url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64decode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4
  const s = pad ? padded + '='.repeat(4 - pad) : padded
  return atob(s)
}

function parseJWT(token) {
  try {
    const parts = token.trim().split('.')
    if (parts.length !== 3) return { error: 'JWT inválido — debe tener 3 partes separadas por puntos' }
    const header  = JSON.parse(b64decode(parts[0]))
    const payload = JSON.parse(b64decode(parts[1]))
    return { header, payload, signature: parts[2], raw: parts }
  } catch {
    return { error: 'No se pudo decodificar el JWT — comprueba que es un token válido' }
  }
}

function signHS256(header, payload, secret) {
  // Browser-based HMAC-SHA256 via SubtleCrypto
  const data   = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const keyData = new TextEncoder().encode(secret)
  const msgData = new TextEncoder().encode(data)

  return window.crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  ).then(key =>
    window.crypto.subtle.sign('HMAC', key, msgData)
  ).then(sig => {
    const bytes = new Uint8Array(sig)
    const b64   = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return `${data}.${b64}`
  })
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#a855f7' : '#6b7280', transition: 'color .2s' }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

function JsonBlock({ data }) {
  const text = JSON.stringify(data, null, 2)
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 8, right: 8 }}><CopyBtn text={text} /></div>
      <pre style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.15)',
        borderRadius: 10, padding: '14px 40px 14px 16px', fontFamily: 'monospace',
        fontSize: 12, color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        margin: 0, lineHeight: 1.7
      }}>{text}</pre>
    </div>
  )
}

export default function ToolJWT() {
  const [tab, setTab]       = useState('decode')
  const [input, setInput]   = useState('')
  const [secret, setSecret] = useState('')
  const [parsed, setParsed] = useState(null)

  // Encode
  const [encHeader, setEncHeader]   = useState('{\n  "alg": "HS256",\n  "typ": "JWT"\n}')
  const [encPayload, setEncPayload] = useState(`{\n  "sub": "usuario123",\n  "role": "admin",\n  "exp": ${Math.floor(Date.now()/1000) + 3600}\n}`)
  const [encSecret, setEncSecret]   = useState('')
  const [encResult, setEncResult]   = useState('')
  const [encError,  setEncError]    = useState('')

  const decode = () => {
    if (!input.trim()) return
    setParsed(parseJWT(input.trim()))
  }

  const encode = async () => {
    setEncResult(''); setEncError('')
    try {
      const h = JSON.parse(encHeader)
      const p = JSON.parse(encPayload)
      if (!encSecret.trim()) { setEncError('Introduce un secret'); return }
      const token = await signHS256(h, p, encSecret.trim())
      setEncResult(token)
    } catch (e) {
      setEncError('JSON inválido en header o payload: ' + e.message)
    }
  }

  const expInfo = parsed?.payload?.exp ? (() => {
    const now  = Date.now() / 1000
    const exp  = parsed.payload.exp
    const diff = exp - now
    const abs  = Math.abs(diff)
    const h    = Math.floor(abs / 3600)
    const m    = Math.floor((abs % 3600) / 60)
    return { expired: diff < 0, label: diff < 0 ? `Expirado hace ${h}h ${m}m` : `Expira en ${h}h ${m}m`, date: new Date(exp * 1000).toLocaleString('es-ES') }
  })() : null

  const btnStyle = (active) => ({
    padding: '8px 20px', borderRadius: 8, border: `1px solid ${active ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.08)'}`,
    background: active ? 'rgba(168,85,247,0.15)' : 'transparent',
    color: active ? '#c084fc' : '#6b7280', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    transition: 'all .2s'
  })

  return (
    <ToolShell icon="🔑" name="JWT Debugger" color={COLOR} badge="decode · encode · verify">
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          <button style={btnStyle(tab==='decode')} onClick={() => setTab('decode')}>Decode</button>
          <button style={btnStyle(tab==='encode')} onClick={() => setTab('encode')}>Encode</button>
        </div>

        {/* DECODE TAB */}
        {tab === 'decode' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>Token JWT</label>
              <div style={{ position: 'relative' }}>
                <textarea
                  value={input}
                  onChange={e => { setInput(e.target.value); setParsed(null) }}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) decode() }}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
                  rows={4}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.2)',
                    borderRadius: 12, padding: '14px 16px', color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace',
                    resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  onClick={decode}
                  disabled={!input.trim()}
                  style={{
                    padding: '8px 24px', borderRadius: 9, border: '1px solid rgba(168,85,247,0.4)',
                    background: 'rgba(168,85,247,0.2)', color: '#c084fc', cursor: 'pointer', fontWeight: 700, fontSize: 13
                  }}
                >Decodificar</button>
              </div>
            </div>

            {parsed?.error && (
              <div style={{ display: 'flex', gap: 10, padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10 }}>
                <AlertTriangle size={15} color="#f87171" />
                <span style={{ color: '#fca5a5', fontSize: 13 }}>{parsed.error}</span>
              </div>
            )}

            {parsed && !parsed.error && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Expiry banner */}
                {expInfo && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                    background: expInfo.expired ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    border: `1px solid ${expInfo.expired ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: 10
                  }}>
                    {expInfo.expired
                      ? <><Unlock size={15} color="#f87171" /><span style={{ color: '#fca5a5', fontSize: 13, fontWeight: 600 }}>{expInfo.label}</span></>
                      : <><Lock size={15} color="#34d399" /><span style={{ color: '#6ee7b7', fontSize: 13, fontWeight: 600 }}>{expInfo.label}</span></>
                    }
                    <span style={{ color: '#6b7280', fontSize: 12, marginLeft: 4 }}>{expInfo.date}</span>
                  </div>
                )}

                {/* Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                    <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Header</span>
                  </div>
                  <JsonBlock data={parsed.header} />
                </div>

                {/* Payload */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#a855f7' }} />
                    <span style={{ color: '#c084fc', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Payload</span>
                  </div>
                  <JsonBlock data={parsed.payload} />
                </div>

                {/* Signature */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#06b6d4' }} />
                    <span style={{ color: '#22d3ee', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Signature</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{
                      flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(6,182,212,0.15)',
                      borderRadius: 10, padding: '12px 14px', fontFamily: 'monospace', fontSize: 11,
                      color: '#67e8f9', wordBreak: 'break-all'
                    }}>{parsed.signature}</div>
                    <CopyBtn text={parsed.signature} />
                  </div>
                </div>

                {/* Verify with secret */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
                  <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 10 }}>Verificar firma (HS256)</p>
                  <VerifySection token={input.trim()} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ENCODE TAB */}
        {tab === 'encode' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>Header</label>
                <textarea
                  value={encHeader}
                  onChange={e => setEncHeader(e.target.value)}
                  rows={5}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 14px', color: '#fde68a', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ color: '#c084fc', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>Payload</label>
                <textarea
                  value={encPayload}
                  onChange={e => setEncPayload(e.target.value)}
                  rows={5}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 10, padding: '12px 14px', color: '#e9d5ff', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div>
              <label style={{ color: '#22d3ee', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>Secret (HS256)</label>
              <input
                type="password"
                value={encSecret}
                onChange={e => setEncSecret(e.target.value)}
                placeholder="tu-secret-key"
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 10, padding: '10px 14px', color: '#67e8f9', fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={encode}
              style={{ padding: '10px 28px', borderRadius: 10, border: '1px solid rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.2)', color: '#c084fc', cursor: 'pointer', fontWeight: 700, fontSize: 14, alignSelf: 'flex-start' }}
            >Generar JWT</button>

            {encError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#fca5a5', fontSize: 13 }}>{encError}</div>
            )}
            {encResult && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <CheckCircle size={14} color="#34d399" />
                  <span style={{ color: '#6ee7b7', fontSize: 12, fontWeight: 600 }}>Token generado</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 10, right: 10 }}><CopyBtn text={encResult} /></div>
                  <div style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 12,
                    padding: '14px 40px 14px 16px', fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0',
                    wordBreak: 'break-all', lineHeight: 1.8
                  }}>
                    <span style={{ color: '#fbbf24' }}>{encResult.split('.')[0]}</span>
                    <span style={{ color: '#6b7280' }}>.</span>
                    <span style={{ color: '#c084fc' }}>{encResult.split('.')[1]}</span>
                    <span style={{ color: '#6b7280' }}>.</span>
                    <span style={{ color: '#67e8f9' }}>{encResult.split('.')[2]}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolShell>
  )
}

function VerifySection({ token }) {
  const [secret, setSecret] = useState('')
  const [result, setResult] = useState(null)

  const verify = async () => {
    if (!secret.trim() || !token) return
    try {
      const parts   = token.split('.')
      const data    = `${parts[0]}.${parts[1]}`
      const keyData = new TextEncoder().encode(secret)
      const msgData = new TextEncoder().encode(data)
      const key     = await window.crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
      const sigBytes = Uint8Array.from(atob(parts[2].replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0))
      const valid   = await window.crypto.subtle.verify('HMAC', key, sigBytes, msgData)
      setResult(valid)
    } catch {
      setResult(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        type="password"
        value={secret}
        onChange={e => { setSecret(e.target.value); setResult(null) }}
        placeholder="Introduce el secret para verificar"
        style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', outline: 'none' }}
      />
      <button
        onClick={verify}
        disabled={!secret.trim()}
        style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.15)', color: '#c084fc', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
      >Verificar</button>
      {result !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {result
            ? <><CheckCircle size={16} color="#34d399" /><span style={{ color: '#6ee7b7', fontSize: 12, fontWeight: 700 }}>Firma válida</span></>
            : <><AlertTriangle size={16} color="#f87171" /><span style={{ color: '#fca5a5', fontSize: 12, fontWeight: 700 }}>Firma inválida</span></>
          }
        </div>
      )}
    </div>
  )
}
