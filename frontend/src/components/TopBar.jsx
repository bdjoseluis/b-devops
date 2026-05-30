import { useLocation, useNavigate } from 'react-router-dom'
import { Clock, ArrowLeft, LogOut, Bell } from 'lucide-react'
import { useState, useEffect } from 'react'
import { health, auth as authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

const PAGE_TITLES = {
  '/dashboard':    { title: 'Dashboard',                    icon: '📊' },
  '/audit':        { title: 'Auto Auditoría',               icon: '🔐' },
  '/osint':        { title: 'Ciber Inteligencia',           icon: '🔍' },
  '/command':      { title: 'Command Center',               icon: '⚡' },
  '/herramientas': { title: 'Herramientas Avanzadas',       icon: '🛠️' },
  '/terminal':     { title: 'Terminal IA',                  icon: '💻' },
  '/grc':          { title: 'Matriz GRC',                   icon: '🛡️' },
  '/reportes':     { title: 'Reportes',                     icon: '📋' },
  '/tempmail':     { title: 'Temp Mail',                    icon: '📧' },
  '/prospector':   { title: 'Prospector',                   icon: '🏢' },
  '/config':       { title: 'Configuración',                icon: '⚙️' },
  '/proyectos':    { title: 'Proyectos',                    icon: '📁' },
  '/scripts':      { title: 'Scripts & Automations',        icon: '📝' },
  '/surface':      { title: 'Attack Surface',               icon: '🗺️' },
  '/explorador':   { title: 'Explorador de Documentos',     icon: '📂' },
  '/bcp':          { title: 'Continuidad BCP',              icon: '🔄' },
  '/devops':       { title: 'DevOps Hub',                   icon: '☁️' },
  '/monitor':      { title: 'Uptime Monitor',               icon: '📡' },
  '/clientes':     { title: 'Clientes CRM',                 icon: '👥' },
  '/infra':        { title: 'Infraestructura',              icon: '🖥️' },
  '/pivot':        { title: 'Intelligence Pivot',           icon: '🎯' },
  '/workspace':    { title: 'Workspace',                    icon: '🗂️' },
  '/n8n':          { title: 'n8n Workflows',                icon: '🔗' },
  '/servicios':    { title: 'Servicios & Automatización',   icon: '✨' },
  '/leads':        { title: 'Leads Externos',               icon: '📥' },
  '/outreach':     { title: 'Outreach Engine',              icon: '🎯' },
}

export default function TopBar() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { logout, role, isAdmin } = useAuth()
  const [time,         setTime]        = useState(new Date())
  const [connected,    setConnected]   = useState(false)
  const [pulse,        setPulse]       = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date())
      setPulse(p => !p)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const check = async () => {
      try { await health.check(); setConnected(true) }
      catch { setConnected(false) }
    }
    check()
    const interval = setInterval(check, 10000)
    return () => clearInterval(interval)
  }, [])

  // Check for pending users — only for admins, every 60s
  useEffect(() => {
    if (!isAdmin) return
    const checkPending = async () => {
      try {
        const data = await authApi.listUsers()
        const n = (data.users || []).filter(u => u.status === 'pending').length
        setPendingCount(n)
      } catch { /* ignore */ }
    }
    checkPending()
    const interval = setInterval(checkPending, 60000)
    return () => clearInterval(interval)
  }, [isAdmin])

  const page = PAGE_TITLES[location.pathname] || { title: 'B-DEVOPS', icon: '🌌' }

  return (
    <header style={{
      height: 52, background: 'rgba(3,0,8,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', flexShrink: 0, backdropFilter: 'blur(12px)',
      boxShadow: '0 1px 20px rgba(0,0,0,0.4)',
    }}>
      {/* Left: back to galaxy + page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 14px', borderRadius: 9,
            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)',
            color: '#c4b5fd', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            transition: 'all .18s', fontFamily: 'Inter, sans-serif',
            boxShadow: '0 0 12px rgba(139,92,246,0.15)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.28)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(139,92,246,0.35)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.15)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(139,92,246,0.15)'; e.currentTarget.style.color = '#c4b5fd' }}
        >
          <ArrowLeft size={13} />
          Galaxia
        </button>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }}/>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>{page.icon}</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '0.01em', fontFamily: 'Inter, sans-serif' }}>
            {page.title}
          </span>
        </div>
      </div>

      {/* Right: status indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {/* API status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color: connected ? '#34d399' : '#f87171', fontSize: 11,
          fontFamily: 'monospace',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: connected ? '#34d399' : '#f87171',
            boxShadow: connected
              ? `0 0 ${pulse ? 8 : 4}px #34d399`
              : `0 0 6px #f87171`,
            transition: 'box-shadow .5s',
          }}/>
          {connected ? 'API Online' : 'API Offline'}
        </div>

        {/* Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', fontSize: 11 }}>
          <Clock size={12}/>
          {time.toLocaleTimeString('es-ES')}
        </div>

        {/* Date */}
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'monospace' }}>
          {time.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>

        {/* Pending users notification (admin only) */}
        {isAdmin && pendingCount > 0 && (
          <button
            onClick={() => navigate('/config')}
            title={`${pendingCount} usuario${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''} de aprobación`}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif', transition: 'all .18s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.22)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
          >
            <Bell size={11} />
            <span style={{ fontWeight: 700 }}>{pendingCount}</span>
            <span style={{ fontSize: 10 }}>pendiente{pendingCount > 1 ? 's' : ''}</span>
          </button>
        )}

        {/* Role badge */}
        <div style={{ padding: '3px 8px', borderRadius: 6, background: role === 'admin' || role === 'superadmin' ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)', border: `1px solid ${role === 'admin' || role === 'superadmin' ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}`, color: role === 'admin' || role === 'superadmin' ? '#f87171' : '#818cf8', fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {role === 'admin' || role === 'superadmin' ? 'ADMIN' : 'USER'}
        </div>

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/') }}
          title="Cerrar sesión"
          style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:11, fontFamily:'Inter, sans-serif', transition:'all .18s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
        >
          <LogOut size={12} /> Salir
        </button>
      </div>
    </header>
  )
}
