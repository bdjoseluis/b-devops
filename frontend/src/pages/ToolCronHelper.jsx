import { useState, useMemo } from 'react'
import ToolShell from '../components/ToolShell'
import { Clock, Copy, CheckCircle, RefreshCw } from 'lucide-react'

const COLOR = '#10b981'

// ── Cron parser ────────────────────────────────────────────────────────────────
function parseCron(expr) {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const [min, hour, dom, mon, dow] = parts

  const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const dowNames   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

  function explain(val, type) {
    if (val === '*') return 'cada ' + type
    if (val.startsWith('*/')) return `cada ${val.slice(2)} ${type}s`
    if (val.includes('-')) {
      const [a,b] = val.split('-')
      return `${type}s ${a} al ${b}`
    }
    if (val.includes(',')) return `${type}s ${val}`
    return `${type} ${val}`
  }

  function humanDow(v) {
    if (v === '*') return 'todos los días'
    if (v.includes('-')) return `${dowNames[v.split('-')[0]]} a ${dowNames[v.split('-')[1]]}`
    if (v.includes(',')) return v.split(',').map(d => dowNames[parseInt(d)] || d).join(', ')
    return `los ${dowNames[parseInt(v)] || v}`
  }

  const hourStr = hour === '*' ? 'cada hora' : `a las ${hour}:${min === '0' ? '00' : min}`
  const domStr  = dom === '*' ? 'cada día' : `el día ${dom}`
  const monStr  = mon === '*' ? 'todos los meses' : `en ${monthNames[parseInt(mon)-1] || mon}`
  const dowStr  = humanDow(dow)

  // Next 5 run times (approximate)
  const now = new Date()
  const runs = []
  let check = new Date(now.getTime() + 60000)
  let attempts = 0
  while (runs.length < 5 && attempts < 50000) {
    attempts++
    check = new Date(check.getTime() + 60000)
    const M = check.getMinutes(), H = check.getHours(), D = check.getDate()
    const Mo = check.getMonth() + 1, W = check.getDay()
    if (
      (min === '*' || parseInt(min) === M || (min.startsWith('*/') && M % parseInt(min.slice(2)) === 0)) &&
      (hour === '*' || parseInt(hour) === H || (hour.startsWith('*/') && H % parseInt(hour.slice(2)) === 0)) &&
      (dom === '*' || parseInt(dom) === D) &&
      (mon === '*' || parseInt(mon) === Mo) &&
      (dow === '*' || parseInt(dow) === W)
    ) {
      runs.push(new Date(check))
    }
  }

  return {
    parts: { min, hour, dom, mon, dow },
    human: `${hourStr}, ${domStr}, ${monStr}, ${dowStr}`,
    runs,
  }
}

const PRESETS = [
  { label:'Cada minuto',        cron:'* * * * *',      desc:'Se ejecuta cada minuto' },
  { label:'Cada hora',          cron:'0 * * * *',       desc:'Al minuto 0 de cada hora' },
  { label:'Cada día a medianoche', cron:'0 0 * * *',   desc:'A las 00:00 cada día' },
  { label:'Cada día a las 8am', cron:'0 8 * * *',       desc:'A las 08:00 cada día' },
  { label:'Cada lunes 9am',     cron:'0 9 * * 1',       desc:'Los lunes a las 9:00' },
  { label:'Cada viernes 6pm',   cron:'0 18 * * 5',      desc:'Los viernes a las 18:00' },
  { label:'Lunes a viernes 9am',cron:'0 9 * * 1-5',     desc:'Días laborables a las 9:00' },
  { label:'Cada 15 minutos',    cron:'*/15 * * * *',     desc:'Cada 15 minutos' },
  { label:'Cada 6 horas',       cron:'0 */6 * * *',      desc:'A las 0h, 6h, 12h, 18h' },
  { label:'Primer día del mes', cron:'0 0 1 * *',        desc:'El día 1 de cada mes a medianoche' },
  { label:'Backup diario 2am',  cron:'0 2 * * *',        desc:'Backup automático a las 2:00' },
  { label:'Cron de producción', cron:'0 4 * * 0',        desc:'Domingos a las 4:00 (bajo tráfico)' },
]

// Builder fields
const FIELDS = [
  { id:'min',  label:'Minuto',  placeholder:'0-59, *, */n', examples:['*','0','*/15','30'] },
  { id:'hour', label:'Hora',    placeholder:'0-23, *, */n', examples:['*','0','8','*/6'] },
  { id:'dom',  label:'Día del mes', placeholder:'1-31, *',  examples:['*','1','15'] },
  { id:'mon',  label:'Mes',     placeholder:'1-12, *',      examples:['*','1','6','12'] },
  { id:'dow',  label:'Día semana', placeholder:'0-7, *',    examples:['*','1','1-5','0'] },
]

export default function ToolCronHelper() {
  const [cron,    setCron]    = useState('0 9 * * 1-5')
  const [parts,   setParts]   = useState({ min:'0', hour:'9', dom:'*', mon:'*', dow:'1-5' })
  const [copied,  setCopied]  = useState('')
  const [mode,    setMode]    = useState('manual') // manual | builder

  const parsed = useMemo(() => parseCron(cron), [cron])

  const updatePart = (id, val) => {
    const np = { ...parts, [id]: val }
    setParts(np)
    setCron(`${np.min} ${np.hour} ${np.dom} ${np.mon} ${np.dow}`)
  }

  const loadPreset = (p) => {
    setCron(p.cron)
    const [min,hour,dom,mon,dow] = p.cron.split(' ')
    setParts({ min,hour,dom,mon,dow })
  }

  const copy = (v) => {
    navigator.clipboard.writeText(v).catch(() => {})
    setCopied(v); setTimeout(() => setCopied(''), 1500)
  }

  return (
    <ToolShell icon="⏰" name="Cron Helper" color={COLOR} badge="Expresiones cron · Builder · Próximas ejecuciones · Presets">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Presets */}
        <div style={{ marginBottom:24 }}>
          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
            Presets comunes
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {PRESETS.map(p => (
              <button key={p.cron} onClick={() => loadPreset(p)} title={p.desc}
                style={{ padding:'5px 12px', borderRadius:7, cursor:'pointer', fontSize:11, fontFamily:'monospace', background: cron === p.cron ? 'rgba(16,185,129,0.15)':'rgba(255,255,255,0.04)', border:`1px solid ${cron === p.cron ? 'rgba(16,185,129,0.4)':'rgba(255,255,255,0.08)'}`, color: cron === p.cron ? '#34d399':'rgba(255,255,255,0.5)' }}>
                {p.cron}
              </button>
            ))}
          </div>
        </div>

        {/* Mode selector */}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {[['manual','✏️ Manual'],['builder','🔧 Builder']].map(([v,l]) => (
            <button key={v} onClick={() => setMode(v)}
              style={{ padding:'8px 16px', borderRadius:9, cursor:'pointer', background: mode === v ? 'rgba(16,185,129,0.15)':'rgba(255,255,255,0.04)', border:`1px solid ${mode === v ? 'rgba(16,185,129,0.4)':'rgba(255,255,255,0.1)'}`, color: mode === v ? COLOR:'rgba(255,255,255,0.4)', fontWeight: mode === v ? 700:400, fontSize:12 }}>
              {l}
            </button>
          ))}
        </div>

        {mode === 'manual' ? (
          /* Manual input */
          <div style={{ display:'flex', gap:10, marginBottom:20 }}>
            <div style={{ position:'relative', flex:1 }}>
              <Clock size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)' }}/>
              <input
                value={cron}
                onChange={e => { setCron(e.target.value); const p=e.target.value.split(/\s+/); if(p.length===5) setParts({min:p[0],hour:p[1],dom:p[2],mon:p[3],dow:p[4]}) }}
                style={{ width:'100%', boxSizing:'border-box', background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.3)', color:'#fff', padding:'12px 14px 12px 38px', borderRadius:10, fontSize:16, fontFamily:'monospace', letterSpacing:'0.1em', outline:'none' }}
              />
            </div>
            <button onClick={() => copy(cron)}
              style={{ padding:'12px 16px', borderRadius:10, cursor:'pointer', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color: copied===cron ? '#10b981':'rgba(255,255,255,0.5)' }}>
              {copied===cron ? <CheckCircle size={16}/> : <Copy size={16}/>}
            </button>
          </div>
        ) : (
          /* Builder */
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:8, marginBottom:20 }}>
            {FIELDS.map(f => (
              <div key={f.id}>
                <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{f.label}</div>
                <input
                  value={parts[f.id]}
                  onChange={e => updatePart(f.id, e.target.value)}
                  placeholder={f.placeholder}
                  style={{ width:'100%', boxSizing:'border-box', background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', color:'#fff', padding:'8px', borderRadius:8, fontSize:13, fontFamily:'monospace', outline:'none', textAlign:'center' }}
                />
                <div style={{ display:'flex', gap:3, marginTop:4, flexWrap:'wrap' }}>
                  {f.examples.map(ex => (
                    <button key={ex} onClick={() => updatePart(f.id, ex)}
                      style={{ padding:'2px 6px', borderRadius:4, cursor:'pointer', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'monospace' }}>
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Result */}
        {parsed ? (
          <>
            {/* Human readable */}
            <div style={{ padding:'16px 20px', borderRadius:14, marginBottom:20, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)' }}>
              <div style={{ color:'rgba(255,255,255,0.35)', fontSize:11, marginBottom:6 }}>Descripción en español</div>
              <div style={{ color:'#fff', fontSize:15, fontWeight:600 }}>{parsed.human}</div>
              <div style={{ display:'flex', gap:16, marginTop:12 }}>
                {Object.entries(parsed.parts).map(([k,v]) => (
                  <div key={k} style={{ textAlign:'center' }}>
                    <div style={{ color:COLOR, fontFamily:'monospace', fontWeight:700, fontSize:14 }}>{v}</div>
                    <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9 }}>{FIELDS.find(f=>f.id===k)?.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next runs */}
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>
                ⏳ Próximas 5 ejecuciones (aproximadas)
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {parsed.runs.length > 0 ? parsed.runs.map((r, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color:COLOR, fontWeight:700, fontFamily:'monospace', fontSize:12, minWidth:20 }}>{i+1}</span>
                    <span style={{ color:'#fff', fontFamily:'monospace', fontSize:13 }}>
                      {r.toLocaleString('es-ES', { weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </span>
                    <span style={{ color:'rgba(255,255,255,0.25)', fontSize:11, marginLeft:'auto' }}>
                      en {Math.round((r - new Date()) / 60000)} min
                    </span>
                  </div>
                )) : (
                  <div style={{ color:'rgba(255,255,255,0.25)', fontSize:12 }}>No se pudieron calcular las próximas ejecuciones</div>
                )}
              </div>
            </div>

            {/* Usage examples */}
            <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
                💻 Uso en producción
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { label:'Linux crontab', code:`${cron} /path/to/script.sh` },
                  { label:'n8n / workflow', code:cron },
                  { label:'Docker + cron', code:`${cron} docker exec container /script.sh` },
                  { label:'GitHub Actions', code:`cron: '${cron}'` },
                ].map(ex => (
                  <div key={ex.label} style={{ display:'flex', gap:10, alignItems:'center', padding:'8px 10px', borderRadius:8, background:'rgba(255,255,255,0.03)' }}>
                    <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11, minWidth:110, flexShrink:0 }}>{ex.label}</span>
                    <code style={{ color:'#86efac', fontFamily:'monospace', fontSize:11, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ex.code}</code>
                    <button onClick={() => copy(ex.code)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', padding:0, flexShrink:0 }}>
                      {copied===ex.code ? <CheckCircle size={11} style={{ color:'#10b981' }}/> : <Copy size={11}/>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#fca5a5', fontSize:12 }}>
            ⚠ Expresión cron inválida — debe tener 5 campos: minuto hora día_mes mes día_semana
          </div>
        )}
      </div>
    </ToolShell>
  )
}
