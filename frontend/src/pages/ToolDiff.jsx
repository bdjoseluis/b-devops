import { useState, useMemo } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, CheckCircle, Download, ArrowLeftRight } from 'lucide-react'

const COLOR = '#a78bfa'

// ── Simple line-based diff ────────────────────────────────────────────────────
function computeDiff(oldText, newText) {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result   = []

  // LCS-based diff (simple Myers-like)
  const m = oldLines.length, n = newLines.length
  const dp = Array.from({ length: m+1 }, () => new Array(n+1).fill(0))
  for (let i = m-1; i >= 0; i--)
    for (let j = n-1; j >= 0; j--)
      dp[i][j] = oldLines[i] === newLines[j] ? dp[i+1][j+1]+1 : Math.max(dp[i+1][j], dp[i][j+1])

  let i=0, j=0
  while (i < m || j < n) {
    if (i < m && j < n && oldLines[i] === newLines[j]) {
      result.push({ type:'eq', val: oldLines[i] })
      i++; j++
    } else if (j < n && (i >= m || dp[i+1]?.[j] <= dp[i]?.[j+1])) {
      result.push({ type:'add', val: newLines[j] })
      j++
    } else {
      result.push({ type:'del', val: oldLines[i] })
      i++
    }
  }
  return result
}

function highlight(line, type) {
  if (type === 'eq') return <span style={{ color:'rgba(255,255,255,0.55)' }}>{line || ' '}</span>
  if (type === 'add') return <span style={{ color:'#86efac' }}>{line || ' '}</span>
  return <span style={{ color:'#fca5a5', textDecoration:'line-through', opacity:0.7 }}>{line || ' '}</span>
}

const EXAMPLES = {
  JSON: {
    old: `{
  "name": "José",
  "version": "1.0.0",
  "email": "old@example.com",
  "debug": true
}`,
    new: `{
  "name": "José Botella",
  "version": "1.1.0",
  "email": "new@bdev.qzz.io",
  "production": true
}`,
  },
  Nginx: {
    old: `server {
    listen 80;
    server_name example.com;
    root /var/www/html;
}`,
    new: `server {
    listen 443 ssl;
    server_name app.bdev.qzz.io;
    root /var/www/app;
    ssl_certificate /etc/ssl/cert.pem;
    add_header X-Frame-Options DENY;
}`,
  },
}

export default function ToolDiff() {
  const [left,   setLeft]   = useState(EXAMPLES.JSON.old)
  const [right,  setRight]  = useState(EXAMPLES.JSON.new)
  const [copied, setCopied] = useState('')
  const [view,   setView]   = useState('split') // split | unified

  const diff   = useMemo(() => computeDiff(left, right), [left, right])
  const added  = diff.filter(d => d.type === 'add').length
  const removed = diff.filter(d => d.type === 'del').length
  const changed = diff.filter(d => d.type !== 'eq').length

  const swap = () => { const tmp = left; setLeft(right); setRight(tmp) }

  const copy = (v) => {
    navigator.clipboard.writeText(v).catch(() => {})
    setCopied(v.slice(0,20)); setTimeout(() => setCopied(''), 1500)
  }

  const downloadDiff = () => {
    const lines = diff.map(d => (d.type==='add'?'+ ':d.type==='del'?'- ':'  ') + d.val).join('\n')
    const b = new Blob([lines], { type:'text/plain' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'diff.txt'; a.click()
  }

  return (
    <ToolShell icon="🔀" name="Text Diff" color={COLOR} badge="Comparar texto · JSON · Config · Código · Unified/Split">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Controls */}
        <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
          {/* Examples */}
          {Object.keys(EXAMPLES).map(k => (
            <button key={k} onClick={() => { setLeft(EXAMPLES[k].old); setRight(EXAMPLES[k].new) }}
              style={{ padding:'6px 12px', borderRadius:7, cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:11 }}>
              Ejemplo: {k}
            </button>
          ))}

          {/* View toggle */}
          <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
            {[['split','Split'],['unified','Unificado']].map(([v,l]) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding:'6px 12px', borderRadius:7, cursor:'pointer', background: view===v ? 'rgba(167,139,250,0.15)':'rgba(255,255,255,0.04)', border:`1px solid ${view===v ? 'rgba(167,139,250,0.4)':'rgba(255,255,255,0.08)'}`, color: view===v ? '#c4b5fd':'rgba(255,255,255,0.4)', fontSize:11 }}>
                {l}
              </button>
            ))}
            <button onClick={swap} style={{ padding:'6px 10px', borderRadius:7, cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
              <ArrowLeftRight size={11}/> Intercambiar
            </button>
            <button onClick={downloadDiff} style={{ padding:'6px 10px', borderRadius:7, cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
              <Download size={11}/> Descargar
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:12, marginBottom:16 }}>
          <span style={{ padding:'4px 12px', borderRadius:7, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', color:'#34d399', fontSize:12, fontFamily:'monospace' }}>
            +{added} añadidas
          </span>
          <span style={{ padding:'4px 12px', borderRadius:7, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#fca5a5', fontSize:12, fontFamily:'monospace' }}>
            -{removed} eliminadas
          </span>
          <span style={{ padding:'4px 12px', borderRadius:7, background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.2)', color:'#c4b5fd', fontSize:12 }}>
            {changed} cambios
          </span>
          {changed === 0 && (
            <span style={{ padding:'4px 12px', borderRadius:7, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', color:'#34d399', fontSize:12 }}>
              ✓ Los textos son idénticos
            </span>
          )}
        </div>

        {view === 'split' ? (
          /* Split view */
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[['Original', left, setLeft, '#fca5a5'],['Modificado', right, setRight, '#86efac']].map(([label,val,setter,col]) => (
              <div key={label}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</span>
                  <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10 }}>{val.split('\n').length} líneas</span>
                </div>
                <textarea
                  value={val}
                  onChange={e => setter(e.target.value)}
                  style={{ width:'100%', boxSizing:'border-box', minHeight:260, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)', padding:'12px', borderRadius:12, fontSize:12, fontFamily:'monospace', resize:'vertical', outline:'none', lineHeight:1.7 }}
                />
              </div>
            ))}
          </div>
        ) : null}

        {/* Diff output */}
        <div style={{ marginTop:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, alignItems:'center' }}>
            <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Vista diff
            </span>
            <button onClick={() => copy(diff.map(d=>(d.type==='add'?'+ ':d.type==='del'?'- ':'  ')+d.val).join('\n'))}
              style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:6, cursor:'pointer', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', fontSize:10 }}>
              <Copy size={10}/> Copiar diff
            </button>
          </div>
          <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 16px', maxHeight:400, overflowY:'auto', fontFamily:'monospace', fontSize:12, lineHeight:1.8 }}>
            {diff.length === 0 ? (
              <div style={{ color:'rgba(255,255,255,0.2)' }}>No hay diferencias que mostrar</div>
            ) : diff.map((d, i) => {
              const bg  = d.type==='add' ? 'rgba(16,185,129,0.08)' : d.type==='del' ? 'rgba(239,68,68,0.08)' : 'transparent'
              const sym = d.type==='add' ? '+' : d.type==='del' ? '-' : ' '
              const col = d.type==='add' ? '#34d399' : d.type==='del' ? '#fca5a5' : 'rgba(255,255,255,0.2)'
              return (
                <div key={i} style={{ display:'flex', gap:10, padding:'1px 4px', background:bg, borderRadius:3 }}>
                  <span style={{ color:col, minWidth:12, userSelect:'none' }}>{sym}</span>
                  <span style={{ color: d.type==='add' ? '#86efac' : d.type==='del' ? '#fca5a5' : 'rgba(255,255,255,0.55)', whiteSpace:'pre' }}>{d.val || ' '}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Input panels if unified view */}
        {view === 'unified' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:16 }}>
            {[['Original', left, setLeft],['Modificado', right, setRight]].map(([label,val,setter]) => (
              <div key={label}>
                <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>{label}</div>
                <textarea
                  value={val}
                  onChange={e => setter(e.target.value)}
                  style={{ width:'100%', boxSizing:'border-box', minHeight:200, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)', padding:'12px', borderRadius:10, fontSize:12, fontFamily:'monospace', resize:'vertical', outline:'none', lineHeight:1.7 }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolShell>
  )
}
