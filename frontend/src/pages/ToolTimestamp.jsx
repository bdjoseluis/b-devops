import { useState, useEffect } from 'react'

const FORMATS = [
  { label: 'Unix (s)',  fn: d => Math.floor(d.getTime() / 1000).toString() },
  { label: 'Unix (ms)', fn: d => d.getTime().toString() },
  { label: 'ISO 8601',  fn: d => d.toISOString() },
  { label: 'UTC',       fn: d => d.toUTCString() },
  { label: 'Local',     fn: d => d.toString() },
  { label: 'RFC 2822',  fn: d => d.toUTCString() },
  { label: 'Date only', fn: d => d.toISOString().split('T')[0] },
  { label: 'Time only', fn: d => d.toISOString().split('T')[1].split('.')[0] },
]

function pad(n) { return String(n).padStart(2, '0') }

function toLocalInputValue(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function ToolTimestamp() {
  const [now, setNow] = useState(new Date())
  const [live, setLive] = useState(true)
  const [inputTs, setInputTs] = useState('')
  const [inputDt, setInputDt] = useState('')
  const [tsResult, setTsResult] = useState(null)
  const [dtResult, setDtResult] = useState(null)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (!live) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [live])

  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(''), 1500)
    })
  }

  const convertTs = () => {
    const ts = inputTs.trim()
    if (!ts) return
    const num = Number(ts)
    const d = new Date(ts.length <= 10 ? num * 1000 : num)
    if (isNaN(d.getTime())) { setTsResult({ error: 'Timestamp inválido' }); return }
    setTsResult(FORMATS.map(f => ({ label: f.label, value: f.fn(d) })))
  }

  const convertDt = () => {
    const dt = inputDt.trim()
    if (!dt) return
    const d = new Date(dt)
    if (isNaN(d.getTime())) { setDtResult({ error: 'Fecha inválida' }); return }
    setDtResult(FORMATS.map(f => ({ label: f.label, value: f.fn(d) })))
  }

  const setNowInput = () => {
    const d = new Date()
    setInputDt(toLocalInputValue(d))
    setInputTs(Math.floor(d.getTime() / 1000).toString())
  }

  const S = {
    page: { background: '#030008', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'monospace' },
    header: { background: '#0a001a', borderBottom: '1px solid #1a0533', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' },
    backBtn: { background: 'none', border: '1px solid #333', borderRadius: '6px', color: '#888', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' },
    card: { background: '#0d0020', border: '1px solid #1a0533', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
    label: { fontSize: '11px', color: '#555', letterSpacing: '1px', marginBottom: '8px' },
    input: { background: '#030008', border: '1px solid #2d0f52', borderRadius: '8px', color: '#e2e8f0', padding: '10px 14px', fontSize: '13px', fontFamily: 'monospace', width: '100%', outline: 'none', boxSizing: 'border-box' },
    btn: { background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none', borderRadius: '8px', color: 'white', padding: '10px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1a0533' },
    liveNum: { fontFamily: 'monospace', fontWeight: 700 },
  }

  const unixNow = Math.floor(now.getTime() / 1000)

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => window.history.back()}>← Back</button>
        <span style={{ fontSize: '20px' }}>⏱️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#f59e0b' }}>TIMESTAMP CONVERTER</div>
          <div style={{ fontSize: '11px', color: '#666' }}>Unix timestamps · Conversión de fechas · Formatos múltiples</div>
        </div>
        <button
          onClick={() => setLive(!live)}
          style={{ marginLeft: 'auto', background: live ? '#064e3b' : 'none', border: `1px solid ${live ? '#065f46' : '#333'}`, borderRadius: '6px', color: live ? '#34d399' : '#888', padding: '4px 12px', cursor: 'pointer', fontSize: '12px' }}
        >
          {live ? '🟢 Live' : '⏸️ Paused'}
        </button>
      </div>

      <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
        {/* Live clock */}
        <div style={{ ...S.card, borderColor: '#065f46', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '2px', marginBottom: '8px' }}>HORA ACTUAL</div>
          <div style={{ fontSize: '32px', ...S.liveNum, color: '#34d399', marginBottom: '4px' }}>{unixNow.toLocaleString()}</div>
          <div style={{ fontSize: '16px', color: '#a78bfa', marginBottom: '4px' }}>{now.toISOString()}</div>
          <div style={{ fontSize: '14px', color: '#555' }}>{now.toLocaleString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'Unix (s)', val: unixNow.toString() },
              { label: 'Unix (ms)', val: now.getTime().toString() },
              { label: 'ISO', val: now.toISOString() },
            ].map(({ label, val }) => (
              <button key={label} onClick={() => copy(val, label)}
                style={{ background: copied === label ? '#064e3b' : '#0d0020', border: `1px solid ${copied === label ? '#065f46' : '#2d0f52'}`, borderRadius: '6px', color: copied === label ? '#34d399' : '#888', padding: '4px 12px', cursor: 'pointer', fontSize: '11px' }}>
                {copied === label ? '✓ Copiado' : `📋 ${label}`}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Unix → Date */}
          <div style={S.card}>
            <div style={S.label}>UNIX TIMESTAMP → FECHA</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input style={S.input} placeholder="e.g. 1716900000" value={inputTs}
                onChange={e => setInputTs(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && convertTs()} />
              <button style={{ ...S.btn, padding: '10px 14px', flexShrink: 0 }} onClick={() => { setNowInput(); setTimeout(convertTs, 50) }}>Now</button>
              <button style={{ ...S.btn, padding: '10px 14px', flexShrink: 0 }} onClick={convertTs}>→</button>
            </div>
            {tsResult && (
              tsResult.error
                ? <div style={{ color: '#ef4444', fontSize: '12px' }}>{tsResult.error}</div>
                : tsResult.map(({ label, value }) => (
                  <div key={label} style={S.row}>
                    <span style={{ color: '#555', fontSize: '12px', minWidth: '80px' }}>{label}</span>
                    <span style={{ color: '#a78bfa', fontSize: '12px', fontFamily: 'monospace', flex: 1, textAlign: 'center' }}>{value}</span>
                    <button onClick={() => copy(value, label)} style={{ background: 'none', border: 'none', color: copied === label ? '#34d399' : '#555', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>
                      {copied === label ? '✓' : '📋'}
                    </button>
                  </div>
                ))
            )}
          </div>

          {/* Date → Unix */}
          <div style={S.card}>
            <div style={S.label}>FECHA → UNIX TIMESTAMP</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input type="datetime-local" style={{ ...S.input, colorScheme: 'dark' }} value={inputDt}
                onChange={e => setInputDt(e.target.value)} />
              <button style={{ ...S.btn, padding: '10px 14px', flexShrink: 0 }} onClick={() => { setNowInput(); setTimeout(convertDt, 50) }}>Now</button>
              <button style={{ ...S.btn, padding: '10px 14px', flexShrink: 0 }} onClick={convertDt}>→</button>
            </div>
            {dtResult && (
              dtResult.error
                ? <div style={{ color: '#ef4444', fontSize: '12px' }}>{dtResult.error}</div>
                : dtResult.map(({ label, value }) => (
                  <div key={label} style={S.row}>
                    <span style={{ color: '#555', fontSize: '12px', minWidth: '80px' }}>{label}</span>
                    <span style={{ color: '#a78bfa', fontSize: '12px', fontFamily: 'monospace', flex: 1, textAlign: 'center' }}>{value}</span>
                    <button onClick={() => copy(value, label)} style={{ background: 'none', border: 'none', color: copied === label ? '#34d399' : '#555', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>
                      {copied === label ? '✓' : '📋'}
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Reference */}
        <div style={S.card}>
          <div style={S.label}>REFERENCIA RÁPIDA</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
            {[
              { label: 'Hoy 00:00 UTC', val: new Date(new Date().setUTCHours(0,0,0,0)).getTime()/1000 | 0 },
              { label: 'Hace 1 hora', val: (Date.now()/1000|0) - 3600 },
              { label: 'Hace 24h', val: (Date.now()/1000|0) - 86400 },
              { label: 'Hace 7 días', val: (Date.now()/1000|0) - 604800 },
              { label: 'Hace 30 días', val: (Date.now()/1000|0) - 2592000 },
              { label: 'Hace 1 año', val: (Date.now()/1000|0) - 31536000 },
            ].map(({ label, val }) => (
              <button key={label} onClick={() => { setInputTs(String(val)); setTimeout(convertTs, 50) }}
                style={{ background: '#030008', border: '1px solid #1a0533', borderRadius: '6px', padding: '8px', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ color: '#555', fontSize: '10px' }}>{label}</div>
                <div style={{ color: '#a78bfa', fontFamily: 'monospace', fontSize: '12px' }}>{val}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }`}</style>
    </div>
  )
}
