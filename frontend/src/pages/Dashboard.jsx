import { useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { settings, devops } from '../api/client'
import {
  Search, Zap, Terminal, Shield, FileText, Settings, TrendingUp,
  Globe, Network, AlertTriangle, Clock, ScanLine, CheckCircle,
  Database, BarChart2, Cpu, Activity, Radio, ArrowRight, Lock,
  Users, Star, GitBranch, Package
} from 'lucide-react'

// ── Quick launch tiles ────────────────────────────────────────────────────────
const QUICK = [
  { icon:'🎯', label:'Intelligence Pivot', to:'/pivot',     color:'#e63946' },
  { icon:'🔐', label:'Auto Auditoría',     to:'/audit',     color:'#8b5cf6' },
  { icon:'💻', label:'Terminal IA',        to:'/terminal',  color:'#10b981' },
  { icon:'📡', label:'Shodan',             to:'/tool/shodan', color:'#06b6d4' },
  { icon:'🦠', label:'VirusTotal',         to:'/tool/virustotal', color:'#f97316' },
  { icon:'🛡️', label:'Threat Intel',      to:'/tool/threatintel', color:'#ef4444' },
  { icon:'🔑', label:'Passwords',         to:'/tool/passwords',   color:'#a855f7' },
  { icon:'🌐', label:'BGP Lookup',        to:'/tool/bgp',         color:'#22d3ee' },
  { icon:'👤', label:'WhatsMyName',       to:'/tool/whatsmyname', color:'#c084fc' },
  { icon:'🔤', label:'Encoder',           to:'/tool/encoder',     color:'#06b6d4' },
  { icon:'🔢', label:'IP Calc',           to:'/tool/ipcalc',      color:'#22d3ee' },
  { icon:'🔒', label:'SSL Check',         to:'/tool/sslcheck',    color:'#10b981' },
]

// ── Tool zones summary ────────────────────────────────────────────────────────
const ZONES = [
  { label:'OSINT & Reconocimiento',  count:18, color:'#06b6d4', icon:'🔍', to:'/osint' },
  { label:'Seguridad & Ataques',     count:16, color:'#e63946', icon:'🔐', to:'/audit' },
  { label:'Exploitation & PenTest',  count:9,  color:'#7c3aed', icon:'💥', to:'/tool/hydra' },
  { label:'Infraestructura & DevOps',count:12, color:'#10b981', icon:'☁️', to:'/infra' },
  { label:'Gestión & Portfolio',     count:9,  color:'#a855f7', icon:'📊', to:'/dashboard' },
  { label:'Webs & Servicios',        count:12, color:'#3b82f6', icon:'🌐', to:'/servicios' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [liveStats, setLiveStats] = useState(null)
  const [chStats,   setChStats]   = useState(null)
  const [recentAudits, setRecentAudits] = useState([])
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    settings.dashboardStats().then(setLiveStats).catch(() => {})
    devops.analyticsStats().then(setChStats).catch(() => {})
    devops.analyticsRecent(5).then(d => setRecentAudits(d?.audits || [])).catch(() => {})
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const totalTools = 94
  const apisConf   = liveStats ? liveStats.apis_configured : '—'
  const apisTotal  = liveStats ? liveStats.apis_total : '12+'

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
            <div style={{ width:3, height:32, background:'linear-gradient(180deg,#a855f7,#e63946)', borderRadius:2 }}/>
            <div>
              <h1 style={{ color:'#fff', fontSize:28, fontWeight:900, letterSpacing:'-0.02em', margin:0, lineHeight:1.1 }}>
                DEV<span style={{ color:'#a78bfa' }}>NOVA</span>
              </h1>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginTop:2, letterSpacing:'0.08em' }}>
                GALAXY OPS PLATFORM · {totalTools}+ HERRAMIENTAS ACTIVAS
              </div>
            </div>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ color:'#fff', fontFamily:'monospace', fontSize:22, fontWeight:700 }}>
            {time.toLocaleTimeString('es-ES', { hour12: false })}
          </div>
          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11 }}>
            {time.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })}
          </div>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:12, marginBottom:28 }}>
        {[
          { icon:<Activity size={18}/>,  label:'Herramientas',    value:totalTools + '+', color:'#a855f7', glow:'rgba(168,85,247,0.2)' },
          { icon:<Shield size={18}/>,    label:'APIs conf.',       value:`${apisConf}/${apisTotal}`, color:'#10b981', glow:'rgba(16,185,129,0.15)' },
          { icon:<FileText size={18}/>,  label:'Informes',         value: liveStats?.reports_total ?? '—', color:'#06b6d4', glow:'rgba(6,182,212,0.15)' },
          { icon:<Database size={18}/>,  label:'Auditorías',       value: chStats?.total ?? '—', color:'#f59e0b', glow:'rgba(245,158,11,0.15)' },
          { icon:<Radio size={18}/>,     label:'Sistema',          value:'Online', color:'#10b981', glow:'rgba(16,185,129,0.2)' },
          { icon:<Globe size={18}/>,     label:'Zonas mapa',       value:'7', color:'#3b82f6', glow:'rgba(59,130,246,0.15)' },
        ].map(s => (
          <div key={s.label} style={{ background:`${s.glow}`, border:`1px solid ${s.color}25`, borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ color:s.color }}>{s.icon}</div>
            <div>
              <div style={{ color:s.color, fontSize:20, fontWeight:800, fontFamily:'monospace', lineHeight:1 }}>{s.value}</div>
              <div style={{ color:'rgba(255,255,255,0.35)', fontSize:11, marginTop:2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick search ──────────────────────────────────────────────────────── */}
      <QuickSearch />

      {/* ── Quick launch ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>
          Acceso rápido
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:8 }}>
          {QUICK.map(q => (
            <button key={q.to} onClick={() => navigate(q.to)}
              style={{ background:`${q.color}10`, border:`1px solid ${q.color}25`, borderRadius:12, padding:'12px 10px', cursor:'pointer', textAlign:'center', transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background=`${q.color}20`; e.currentTarget.style.borderColor=`${q.color}50` }}
              onMouseLeave={e => { e.currentTarget.style.background=`${q.color}10`; e.currentTarget.style.borderColor=`${q.color}25` }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{q.icon}</div>
              <div style={{ color:'rgba(255,255,255,0.6)', fontSize:10, fontWeight:600, lineHeight:1.3 }}>{q.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20, marginBottom:28 }}>
        {/* ── Galaxy zones ──────────────────────────────────────────────────── */}
        <div>
          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>
            Zonas del mapa
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {ZONES.map(z => (
              <Link key={z.label} to={z.to} style={{ textDecoration:'none' }}>
                <div style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${z.color}20`, borderRadius:12, padding:'14px 16px', transition:'all .15s', display:'flex', alignItems:'center', gap:12 }}
                  onMouseEnter={e => { e.currentTarget.style.background=`${z.color}10`; e.currentTarget.style.borderColor=`${z.color}40` }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor=`${z.color}20` }}>
                  <span style={{ fontSize:20 }}>{z.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{z.label}</div>
                    <div style={{ color:z.color, fontSize:11, marginTop:2 }}>{z.count} herramientas</div>
                  </div>
                  <div style={{ width:28, height:28, borderRadius:8, background:`${z.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <ArrowRight size={12} style={{ color:z.color }}/>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── System status ──────────────────────────────────────────────────── */}
        <div>
          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>
            Estado del sistema
          </div>
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px', display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { label:'Frontend (DEVNOVA)',  status:'online',  color:'#10b981', extra:'localhost:3000' },
              { label:'Backend API',         status:'online',  color:'#10b981', extra:'localhost:8000' },
              { label:'PostgreSQL',          status:'online',  color:'#10b981', extra:'localhost:5432' },
              { label:'Portfolio (B-DEVOPS)',   status: 'online', color:'#10b981', extra:'localhost:3001' },
              { label:'Cloudflare Tunnel',   status:'active',  color:'#f59e0b', extra:'bdev.qzz.io' },
            ].map(s => (
              <div key={s.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:s.color, boxShadow:`0 0 8px ${s.color}`, flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:'rgba(255,255,255,0.6)', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.label}</div>
                </div>
                <span style={{ color:'rgba(255,255,255,0.25)', fontSize:9, fontFamily:'monospace' }}>{s.extra}</span>
              </div>
            ))}
            <div style={{ marginTop:6, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10 }}>Todos los servicios operativos</span>
              <Link to="/infra" style={{ color:'rgba(255,255,255,0.4)', fontSize:10, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                Ver infra <ArrowRight size={10}/>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Analytics + Recent audits ──────────────────────────────────────────── */}
      {(chStats || recentAudits.length > 0) && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:28 }}>
          {chStats && chStats.total > 0 && (
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
                <Database size={12}/> Analytics
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
                {[
                  { label:'Total', v:chStats.total, color:'#fff' },
                  { label:'Críticos', v:chStats.criticos, color:'#ef4444' },
                  { label:'Media findings', v:chStats.avg_findings, color:'#f59e0b' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign:'center' }}>
                    <div style={{ color:s.color, fontSize:22, fontWeight:800, fontFamily:'monospace' }}>{s.v}</div>
                    <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10, marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {[['CRÍTICO','#ef4444',chStats.criticos],['ALTO','#f97316',chStats.altos],['MEDIO','#f59e0b',chStats.medios],['BAJO','#10b981',chStats.bajos]].map(([l,c,n]) => (
                  <span key={l} style={{ fontSize:10, padding:'2px 8px', borderRadius:4, background:`${c}15`, color:c, fontFamily:'monospace', fontWeight:700 }}>{l}: {n}</span>
                ))}
              </div>
            </div>
          )}
          {recentAudits.length > 0 && (
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
                <Clock size={12}/> Auditorías recientes
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {recentAudits.map((a, i) => {
                  const rc = {CRÍTICO:'#ef4444',ALTO:'#f97316',MEDIO:'#f59e0b',BAJO:'#10b981'}[a.risk_level] || '#6b7280'
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:rc, flexShrink:0 }}/>
                      <span style={{ color:'rgba(255,255,255,0.6)', fontFamily:'monospace', fontSize:11, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.target}</span>
                      <span style={{ color:rc, fontSize:10, flexShrink:0 }}>{a.risk_level}</span>
                      <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10, flexShrink:0 }}>{a.created_at?.slice(0,10)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Shortcuts grid ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>
          Módulos del sistema
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:8 }}>
          {[
            { to:'/audit',      icon:'🔐', label:'Auto Auditoría',     sub:'Auditoría con IA',         color:'#e63946' },
            { to:'/osint',      icon:'🔍', label:'Ciber Inteligencia', sub:'OSINT automatizado',       color:'#06b6d4' },
            { to:'/pivot',      icon:'🎯', label:'Intelligence Pivot', sub:'OSINT multi-fuente',       color:'#e63946' },
            { to:'/command',    icon:'⚡', label:'Command Center',     sub:'Kali Linux + herramientas', color:'#f59e0b' },
            { to:'/terminal',   icon:'💻', label:'Terminal IA',        sub:'Asistente IA Gemini',      color:'#10b981' },
            { to:'/grc',        icon:'🛡️', label:'Matriz GRC',        sub:'ISO 27001, RGPD, ENS',     color:'#8b5cf6' },
            { to:'/surface',    icon:'🗺️', label:'Attack Surface',    sub:'Mapeo de activos',         color:'#f97316' },
            { to:'/clientes',   icon:'👥', label:'CRM',                sub:'Gestión de clientes',      color:'#a855f7' },
            { to:'/proyectos',  icon:'📁', label:'Proyectos',          sub:'Portfolio y tracking',     color:'#06b6d4' },
            { to:'/reportes',   icon:'📋', label:'Reportes',           sub:'Informes DOCX',            color:'#6366f1' },
            { to:'/infra',      icon:'🖥️', label:'Infraestructura',   sub:'Docker, Cloudflare',       color:'#10b981' },
            { to:'/servicios',  icon:'💼', label:'Servicios',          sub:'Planes y precios',         color:'#ec4899' },
          ].map(m => (
            <Link key={m.to} to={m.to} style={{ textDecoration:'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', transition:'all .15s', cursor:'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background=`${m.color}10`; e.currentTarget.style.borderColor=`${m.color}30` }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize:18 }}>{m.icon}</span>
                <div style={{ minWidth:0 }}>
                  <div style={{ color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.label}</div>
                  <div style={{ color:'rgba(255,255,255,0.25)', fontSize:10, marginTop:1 }}>{m.sub}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Legal notice ─────────────────────────────────────────────────────── */}
      <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.15)', display:'flex', gap:10, color:'rgba(255,200,100,0.6)', fontSize:11 }}>
        <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/>
        <span><strong>Aviso legal:</strong> Herramienta exclusiva para auditorías de seguridad autorizadas. El uso no autorizado puede ser constitutivo de delito informático.</span>
      </div>
    </div>
  )
}

function QuickSearch() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!value.trim()) return
    sessionStorage.setItem('osint_target', value.trim())
    navigate('/osint')
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom:28 }}>
      <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>
        Análisis rápido
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <div style={{ position:'relative', flex:1 }}>
          <Search size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)' }}/>
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="dominio.com · user@email.com · 192.168.1.1 · empresa S.A."
            style={{ width:'100%', boxSizing:'border-box', background:'rgba(168,85,247,0.06)', border:'1px solid rgba(168,85,247,0.25)', color:'#fff', padding:'12px 14px 12px 38px', borderRadius:12, fontSize:13, outline:'none' }}
            onFocus={e => e.target.style.borderColor='rgba(168,85,247,0.6)'}
            onBlur={e => e.target.style.borderColor='rgba(168,85,247,0.25)'}
          />
        </div>
        <button type="submit" disabled={!value.trim()}
          style={{ padding:'12px 24px', borderRadius:12, cursor:'pointer', display:'flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,rgba(168,85,247,0.2),rgba(230,57,70,0.15))', border:'1px solid rgba(168,85,247,0.4)', color:'#c4b5fd', fontWeight:700, fontSize:13 }}>
          <TrendingUp size={15}/> Analizar
        </button>
      </div>
    </form>
  )
}
