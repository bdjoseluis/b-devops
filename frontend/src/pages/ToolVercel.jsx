import { useState, useEffect } from 'react'
import ToolShell from '../components/ToolShell'
import { settings } from '../api/client'
import { RefreshCw, ExternalLink, Clock, CheckCircle, XCircle, AlertTriangle, Globe, GitBranch, Loader2 } from 'lucide-react'

const COLOR = '#e2e8f0'
const VERCEL_COLOR = '#000'

export default function ToolVercel() {
  const [projects,    setProjects]    = useState(null)
  const [deployments, setDeployments] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [tab,         setTab]         = useState('projects')
  const [apiKey,      setApiKey]      = useState('')
  const [keyInput,    setKeyInput]    = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('vercel_api_key')
    if (stored) { setApiKey(stored); fetchAll(stored) }
    else {
      // Try to get from backend config
      settings.getRaw().then(cfg => {
        const k = cfg?.apis?.vercel
        if (k) { setApiKey(k); localStorage.setItem('vercel_api_key', k); fetchAll(k) }
        else setLoading(false)
      }).catch(() => setLoading(false))
    }
  }, [])

  const fetchAll = async (key) => {
    setLoading(true); setError('')
    try {
      const [projRes, deplRes] = await Promise.all([
        fetch('https://api.vercel.com/v9/projects?limit=20', {
          headers: { Authorization: `Bearer ${key}` }
        }),
        fetch('https://api.vercel.com/v6/deployments?limit=20', {
          headers: { Authorization: `Bearer ${key}` }
        }),
      ])
      if (!projRes.ok) throw new Error(`Token inválido (${projRes.status})`)
      const [pData, dData] = await Promise.all([projRes.json(), deplRes.json()])
      setProjects(pData.projects || [])
      setDeployments(dData.deployments || [])
    } catch (err) {
      setError(err.message || 'Error al conectar con Vercel API')
    } finally { setLoading(false) }
  }

  const saveKey = () => {
    if (!keyInput.trim()) return
    const k = keyInput.trim()
    localStorage.setItem('vercel_api_key', k)
    setApiKey(k); setKeyInput('')
    fetchAll(k)
  }

  if (!apiKey) {
    return (
      <ToolShell icon="▲" name="Vercel" color={COLOR} badge="Deployments · Proyectos · Dominios">
        <div style={{ maxWidth:600, margin:'80px auto', padding:'0 24px', textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>▲</div>
          <div style={{ color:'#fff', fontWeight:700, fontSize:20, marginBottom:8 }}>Conectar Vercel API</div>
          <div style={{ color:'rgba(255,255,255,0.45)', fontSize:13, marginBottom:28, lineHeight:1.6 }}>
            Genera un token en <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" style={{ color:COLOR }}>vercel.com/account/tokens</a> y pégalo aquí. También puedes configurarlo en <strong style={{ color:'rgba(255,255,255,0.7)' }}>Configuración → APIs</strong>.
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={keyInput} onChange={e=>setKeyInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveKey()}
              placeholder="Vercel API Token..."
              type="password"
              style={{ flex:1, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'#fff', padding:'12px 16px', borderRadius:10, fontSize:14, outline:'none', fontFamily:'monospace' }}/>
            <button onClick={saveKey} style={{ padding:'12px 20px', borderRadius:10, cursor:'pointer', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', color:'#fff', fontWeight:600, fontSize:13 }}>
              Conectar
            </button>
          </div>
        </div>
      </ToolShell>
    )
  }

  return (
    <ToolShell icon="▲" name="Vercel" color={COLOR} badge="Deployments · Proyectos · Dominios en tiempo real">
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 24px' }}>
        {/* Tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:24, alignItems:'center' }}>
          {['projects','deployments'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'7px 16px', borderRadius:8, fontSize:12, cursor:'pointer',
              background: tab===t ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              border: tab===t ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.08)',
              color: tab===t ? '#fff' : 'rgba(255,255,255,0.45)',
              fontWeight: tab===t ? 600 : 400, textTransform:'capitalize',
            }}>{t}</button>
          ))}
          <button onClick={()=>fetchAll(apiKey)} disabled={loading} style={{
            marginLeft:'auto', display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8,
            background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
            color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:12,
          }}>
            <RefreshCw size={12} style={loading?{animation:'spin 1s linear infinite'}:{}}/>
            Actualizar
          </button>
        </div>

        {error && <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginBottom:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}><AlertTriangle size={14}/>{error}</div>}

        {loading && (
          <div style={{ display:'flex', justifyContent:'center', padding:'60px 0', color:'rgba(255,255,255,0.3)' }}>
            <Loader2 size={24} style={{animation:'spin 1s linear infinite'}}/>
          </div>
        )}

        {/* Projects */}
        {!loading && tab==='projects' && projects && (
          <div>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginBottom:14 }}>{projects.length} proyectos</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:14 }}>
              {projects.map(p => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </div>
        )}

        {/* Deployments */}
        {!loading && tab==='deployments' && deployments && (
          <div>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginBottom:14 }}>{deployments.length} deployments recientes</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {deployments.map(d => (
                <DeployCard key={d.uid} deployment={d} />
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}

function ProjectCard({ project }) {
  const p       = project
  const latestD = p.latestDeployments?.[0]
  const state   = latestD?.readyState || 'UNKNOWN'
  const isReady = state === 'READY'
  const isFail  = state === 'ERROR' || state === 'CANCELED'
  const isBuilding = state === 'BUILDING' || state === 'INITIALIZING'
  const stateCol = isReady ? '#10b981' : isFail ? '#ef4444' : isBuilding ? '#f59e0b' : '#6b7280'
  const domains  = p.alias?.filter?.(a=>!a.includes('vercel.app'))?.slice(0,2) || []
  const vercelUrl = `https://${p.name}.vercel.app`
  const updatedAt = p.updatedAt ? new Date(p.updatedAt) : null

  return (
    <div style={{
      background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
      borderRadius:14, padding:'18px 20px',
      transition:'all .2s',
    }}
    onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.07)';e.currentTarget.style.borderColor='rgba(255,255,255,0.16)'}}
    onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(255,255,255,0.09)'}}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <div>
          <div style={{ color:'#fff', fontWeight:700, fontSize:15 }}>{p.name}</div>
          {p.framework && <div style={{ color:'rgba(255,255,255,0.35)', fontSize:11, marginTop:2 }}>{p.framework}</div>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:stateCol, boxShadow:`0 0 8px ${stateCol}` }}/>
          <span style={{ color:stateCol, fontSize:11, fontWeight:600 }}>{state}</span>
        </div>
      </div>

      {domains.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
          {domains.map(d=>(
            <a key={d} href={`https://${d}`} target="_blank" rel="noopener noreferrer" style={{
              display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:5,
              background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
              color:'rgba(255,255,255,0.6)', fontSize:10, textDecoration:'none',
            }}>
              <Globe size={9}/> {d}
            </a>
          ))}
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        {updatedAt && <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11 }}>
          <Clock size={10} style={{ display:'inline', marginRight:4 }}/>
          {updatedAt.toLocaleDateString('es-ES')}
        </div>}
        <a href={vercelUrl} target="_blank" rel="noopener noreferrer" style={{
          display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7,
          background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)',
          color:'#fff', fontSize:11, textDecoration:'none', fontWeight:600,
        }}>
          <ExternalLink size={10}/> Visitar
        </a>
      </div>
    </div>
  )
}

function DeployCard({ deployment }) {
  const d = deployment
  const isReady = d.readyState === 'READY'
  const isFail  = d.readyState === 'ERROR'
  const col     = isReady ? '#10b981' : isFail ? '#ef4444' : '#f59e0b'
  const Icon    = isReady ? CheckCircle : isFail ? XCircle : AlertTriangle
  const created = d.created ? new Date(d.created) : null
  const url     = d.url ? `https://${d.url}` : null

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:14, padding:'12px 16px', borderRadius:10,
      background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
    }}>
      <Icon size={16} style={{ color:col, flexShrink:0 }}/>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ color:'#fff', fontWeight:600, fontSize:13 }}>{d.name}</span>
          <span style={{ color:col, fontSize:11, padding:'1px 6px', borderRadius:4, background:`rgba(${col.slice(1).match(/../g).map(h=>parseInt(h,16)).join(',')},0.15)` }}>
            {d.readyState}
          </span>
        </div>
        <div style={{ display:'flex', gap:12, marginTop:3 }}>
          {d.meta?.githubCommitMessage && (
            <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11, maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              <GitBranch size={9} style={{ display:'inline', marginRight:3 }}/>{d.meta.githubCommitMessage}
            </span>
          )}
          {created && <span style={{ color:'rgba(255,255,255,0.25)', fontSize:11 }}>{created.toLocaleString('es-ES')}</span>}
        </div>
      </div>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color:'rgba(255,255,255,0.4)', flexShrink:0 }}>
          <ExternalLink size={13}/>
        </a>
      )}
    </div>
  )
}
