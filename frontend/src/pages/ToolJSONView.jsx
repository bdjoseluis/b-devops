import { useState, useMemo, useCallback } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, CheckCircle, Minimize2, Maximize2, Search, Download, ArrowRight } from 'lucide-react'

const COLOR = '#f59e0b'

// ── JSON tree renderer ────────────────────────────────────────────────────────
function JsonNode({ data, depth = 0, path = '' }) {
  const [collapsed, setCollapsed] = useState(depth > 2)

  const toggle = (e) => { e.stopPropagation(); setCollapsed(c => !c) }

  const indent = { paddingLeft: depth > 0 ? 18 : 0 }

  if (data === null) return <span style={{ color:'#6b7280' }}>null</span>
  if (typeof data === 'boolean') return <span style={{ color:'#a78bfa' }}>{String(data)}</span>
  if (typeof data === 'number')  return <span style={{ color:'#60a5fa' }}>{data}</span>
  if (typeof data === 'string') {
    const isUrl = /^https?:\/\//.test(data)
    return isUrl
      ? <a href={data} target="_blank" rel="noopener noreferrer" style={{ color:'#34d399', textDecoration:'underline', wordBreak:'break-all' }}>{JSON.stringify(data)}</a>
      : <span style={{ color:'#86efac', wordBreak:'break-all' }}>{JSON.stringify(data)}</span>
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span style={{ color:'rgba(255,255,255,0.3)' }}>[]</span>
    return (
      <span>
        <span onClick={toggle} style={{ cursor:'pointer', color:'rgba(255,255,255,0.5)', userSelect:'none' }}>
          {collapsed ? `▶ [${data.length}]` : '▼ ['}
        </span>
        {!collapsed && (
          <div style={indent}>
            {data.map((item, i) => (
              <div key={i} style={{ fontFamily:'monospace', fontSize:12, lineHeight:1.8 }}>
                <span style={{ color:'rgba(255,255,255,0.3)', fontSize:10, marginRight:6 }}>{i}</span>
                <JsonNode data={item} depth={depth+1} path={`${path}[${i}]`}/>
                {i < data.length - 1 && <span style={{ color:'rgba(255,255,255,0.2)' }}>,</span>}
              </div>
            ))}
          </div>
        )}
        {!collapsed && <span style={{ color:'rgba(255,255,255,0.5)' }}>]</span>}
      </span>
    )
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data)
    if (keys.length === 0) return <span style={{ color:'rgba(255,255,255,0.3)' }}>{'{}'}</span>
    return (
      <span>
        <span onClick={toggle} style={{ cursor:'pointer', color:'rgba(255,255,255,0.5)', userSelect:'none' }}>
          {collapsed ? `▶ {${keys.length}}` : '▼ {'}
        </span>
        {!collapsed && (
          <div style={indent}>
            {keys.map((key, i) => (
              <div key={key} style={{ fontFamily:'monospace', fontSize:12, lineHeight:1.8 }}>
                <span style={{ color:'#fbbf24' }}>"{key}"</span>
                <span style={{ color:'rgba(255,255,255,0.3)', margin:'0 4px' }}>:</span>
                <JsonNode data={data[key]} depth={depth+1} path={`${path}.${key}`}/>
                {i < keys.length - 1 && <span style={{ color:'rgba(255,255,255,0.2)' }}>,</span>}
              </div>
            ))}
          </div>
        )}
        {!collapsed && <span style={{ color:'rgba(255,255,255,0.5)' }}>{'}'}</span>}
      </span>
    )
  }
  return <span style={{ color:'#fff' }}>{String(data)}</span>
}

// ── Stats ──────────────────────────────────────────────────────────────────────
function countNodes(data, depth = 0) {
  if (data === null || typeof data !== 'object') return { total: 1, maxDepth: depth }
  let total = 1, maxDepth = depth
  for (const v of Object.values(data)) {
    const { total: t, maxDepth: d } = countNodes(v, depth + 1)
    total += t
    maxDepth = Math.max(maxDepth, d)
  }
  return { total, maxDepth }
}

const SAMPLES = {
  API: JSON.stringify({
    "status": "success",
    "user": { "id": 1, "name": "José", "email": "jose@example.com", "roles": ["admin", "user"] },
    "data": [{ "ip": "8.8.8.8", "country": "US", "org": "AS15169 Google LLC" }],
    "meta": { "page": 1, "total": 42, "timestamp": "2024-03-15T14:32:00Z" }
  }, null, 2),
  CVE: JSON.stringify({
    "cve_id": "CVE-2024-1234",
    "severity": "CRITICAL",
    "score": 9.8,
    "description": "Remote code execution in affected component",
    "affected": ["Product A 1.0", "Product A 1.1"],
    "references": ["https://nvd.nist.gov/vuln/detail/CVE-2024-1234"]
  }, null, 2),
}

export default function ToolJSONView() {
  const [input,   setInput]   = useState(SAMPLES.API)
  const [error,   setError]   = useState('')
  const [filter,  setFilter]  = useState('')
  const [copied,  setCopied]  = useState('')
  const [view,    setView]    = useState('tree') // tree | raw | compact

  const parsed = useMemo(() => {
    try {
      const r = JSON.parse(input)
      setError('')
      return r
    } catch (e) {
      setError(e.message)
      return null
    }
  }, [input])

  const pretty = useMemo(() => parsed ? JSON.stringify(parsed, null, 2) : '', [parsed])
  const compact = useMemo(() => parsed ? JSON.stringify(parsed) : '', [parsed])
  const stats = useMemo(() => parsed ? countNodes(parsed) : null, [parsed])

  const copy = (v) => {
    navigator.clipboard.writeText(v).catch(() => {})
    setCopied(v.slice(0,20))
    setTimeout(() => setCopied(''), 1500)
  }

  const download = (content, name) => {
    const b = new Blob([content], { type:'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click()
  }

  // Filter keys in tree mode
  const filterJson = useCallback((data, query) => {
    if (!query) return data
    const q = query.toLowerCase()
    if (typeof data !== 'object' || data === null) return data
    if (Array.isArray(data)) return data.map(i => filterJson(i, q)).filter(i => i !== undefined)
    const res = {}
    for (const [k, v] of Object.entries(data)) {
      if (k.toLowerCase().includes(q)) res[k] = v
      else {
        const filtered = filterJson(v, q)
        if (filtered !== undefined && (typeof filtered !== 'object' || filtered !== null)) res[k] = filtered
      }
    }
    return Object.keys(res).length ? res : undefined
  }, [])

  const displayData = filter && parsed ? (filterJson(parsed, filter) ?? {}) : parsed

  return (
    <ToolShell icon="🔧" name="JSON Viewer" color={COLOR} badge="Tree · Formato · Filtro · Compactar · Validar">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Toolbar */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          {/* View toggle */}
          <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, overflow:'hidden' }}>
            {[['tree','🌳 Árbol'],['raw','📝 Bonito'],['compact','💾 Compacto']].map(([v,l]) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding:'7px 12px', cursor:'pointer', background: view === v ? `rgba(245,158,11,0.2)`:'transparent', border:'none', color: view === v ? COLOR:'rgba(255,255,255,0.35)', fontSize:11, fontWeight: view === v ? 700:400 }}>
                {l}
              </button>
            ))}
          </div>

          {/* Sample data */}
          {Object.entries(SAMPLES).map(([name, val]) => (
            <button key={name} onClick={() => setInput(val)}
              style={{ padding:'6px 12px', borderRadius:7, cursor:'pointer', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', fontSize:11 }}>
              Ejemplo {name}
            </button>
          ))}

          <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center' }}>
            <button onClick={() => copy(pretty)} style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:7, cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', fontSize:11 }}>
              {copied ? <CheckCircle size={11} style={{ color:'#10b981' }}/> : <Copy size={11}/>} Copiar
            </button>
            <button onClick={() => download(pretty, 'output.json')} style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:7, cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', fontSize:11 }}>
              <Download size={11}/> JSON
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {stats && !error && (
          <div style={{ display:'flex', gap:16, marginBottom:12, flexWrap:'wrap' }}>
            {[
              { label:'Nodos',     v: stats.total },
              { label:'Profundidad', v: stats.maxDepth },
              { label:'Size',      v: `${(compact.length / 1024).toFixed(1)} KB` },
              { label:'Líneas',    v: pretty.split('\n').length },
            ].map(s => (
              <span key={s.label} style={{ color:'rgba(255,255,255,0.3)', fontSize:11 }}>
                <strong style={{ color:'rgba(255,255,255,0.6)', fontFamily:'monospace' }}>{s.v}</strong> {s.label}
              </span>
            ))}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Input */}
          <div>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>
              Entrada — JSON raw
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder='{"key": "value"}'
              style={{ width:'100%', boxSizing:'border-box', minHeight:420, background:'rgba(255,255,255,0.03)', border:`1px solid ${error ? 'rgba(239,68,68,0.4)':'rgba(255,255,255,0.08)'}`, color:'rgba(255,255,255,0.7)', padding:'14px', borderRadius:12, fontSize:12, fontFamily:'monospace', resize:'vertical', outline:'none', lineHeight:1.7 }}
            />
            {error && (
              <div style={{ marginTop:6, color:'#fca5a5', fontSize:11, fontFamily:'monospace', display:'flex', gap:6 }}>
                ⚠ {error}
              </div>
            )}
          </div>

          {/* Output */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', flex:1 }}>
                {view === 'tree' ? 'Vista árbol' : view === 'raw' ? 'JSON formateado' : 'JSON compacto'}
              </div>
              {view === 'tree' && (
                <div style={{ position:'relative' }}>
                  <Search size={10} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)' }}/>
                  <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar claves..."
                    style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'4px 8px 4px 24px', borderRadius:6, fontSize:11, outline:'none', width:140 }}/>
                </div>
              )}
            </div>
            <div style={{ minHeight:420, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'14px', overflowY:'auto', overflowX:'auto' }}>
              {!parsed && !error && <div style={{ color:'rgba(255,255,255,0.2)', fontSize:12 }}>El resultado aparecerá aquí...</div>}
              {error && <div style={{ color:'#fca5a5', fontSize:12 }}>JSON inválido — corrige la entrada</div>}
              {parsed && !error && (
                <>
                  {view === 'tree' && displayData !== undefined && (
                    <div style={{ fontFamily:'monospace', fontSize:12, lineHeight:1.8 }}>
                      <JsonNode data={displayData} depth={0} />
                    </div>
                  )}
                  {view === 'raw' && (
                    <pre style={{ color:'rgba(255,255,255,0.7)', fontSize:12, fontFamily:'monospace', lineHeight:1.7, margin:0, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                      {pretty.split('\n').map((line, i) => {
                        const colored = line
                          .replace(/"([^"]+)"(?=\s*:)/g, '<span style="color:#fbbf24">"$1"</span>')
                          .replace(/:\s*"([^"]+)"/g, ': <span style="color:#86efac">"$1"</span>')
                          .replace(/:\s*(\d+\.?\d*)/g, ': <span style="color:#60a5fa">$1</span>')
                          .replace(/:\s*(true|false)/g, ': <span style="color:#a78bfa">$1</span>')
                          .replace(/:\s*(null)/g, ': <span style="color:#6b7280">$1</span>')
                        return <span key={i} dangerouslySetInnerHTML={{ __html: colored + '\n' }}/>
                      })}
                    </pre>
                  )}
                  {view === 'compact' && (
                    <pre style={{ color:'rgba(255,255,255,0.6)', fontSize:12, fontFamily:'monospace', lineHeight:1.7, margin:0, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                      {compact}
                    </pre>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolShell>
  )
}
