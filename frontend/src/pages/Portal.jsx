import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Radio, Shield, Search, Terminal, Zap, Globe, Users,
  Server, Activity, BarChart2, FileText, GitBranch,
  MessageSquare, Calendar, RefreshCw, Star, Bot, Repeat,
  Target, FolderOpen, Map, Clock, Building2, Mail,
  ChevronRight, ExternalLink, TrendingUp, AlertTriangle,
  CheckCircle, Wifi, ScanLine, Wrench, Code2, Sparkles
} from 'lucide-react'
import { devops } from '../api/client'

// ─── Stars Canvas ─────────────────────────────────────────────────────────────
function StarField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animFrame

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const stars = Array.from({ length: 280 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.2,
      alpha: Math.random(),
      speed: Math.random() * 0.008 + 0.002,
      color: ['#ffffff', '#b8d4ff', '#ffd6ff', '#d6ffe8', '#ffe5d6'][Math.floor(Math.random() * 5)],
    }))

    const shootingStars = []
    let shootTimer = 0

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Twinkling stars
      stars.forEach(s => {
        s.alpha += (Math.random() - 0.5) * 0.03
        s.alpha = Math.max(0.05, Math.min(1, s.alpha))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = s.color + Math.floor(s.alpha * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })

      // Shooting stars
      shootTimer++
      if (shootTimer > 180 + Math.random() * 300) {
        shootTimer = 0
        shootingStars.push({
          x: Math.random() * canvas.width * 0.7,
          y: Math.random() * canvas.height * 0.4,
          vx: 4 + Math.random() * 6,
          vy: 1 + Math.random() * 3,
          len: 80 + Math.random() * 120,
          alpha: 1,
        })
      }
      shootingStars.forEach((s, i) => {
        s.x += s.vx
        s.y += s.vy
        s.alpha -= 0.015
        if (s.alpha <= 0) { shootingStars.splice(i, 1); return }
        const grad = ctx.createLinearGradient(s.x - s.vx * 10, s.y - s.vy * 10, s.x, s.y)
        grad.addColorStop(0, `rgba(255,255,255,0)`)
        grad.addColorStop(1, `rgba(220,220,255,${s.alpha})`)
        ctx.beginPath()
        ctx.moveTo(s.x - s.vx * 10, s.y - s.vy * 10)
        ctx.lineTo(s.x, s.y)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.5
        ctx.stroke()
      })

      animFrame = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, background: 'radial-gradient(ellipse at 20% 40%, #12003a 0%, #050010 35%, #000008 70%, #000305 100%)' }}
    />
  )
}

// ─── Nebula blobs ─────────────────────────────────────────────────────────────
function NebulaLayer() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Purple blob */}
      <div className="absolute animate-[nebulaDrift_25s_ease-in-out_infinite_alternate]"
        style={{ width: '600px', height: '600px', borderRadius: '50%', top: '-100px', left: '-100px',
          background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, rgba(139,92,246,0.05) 40%, transparent 70%)' }} />
      {/* Blue blob */}
      <div className="absolute animate-[nebulaDrift_30s_ease-in-out_infinite_alternate-reverse]"
        style={{ width: '700px', height: '500px', borderRadius: '50%', top: '30%', right: '-150px',
          background: 'radial-gradient(circle, rgba(37,99,235,0.10) 0%, rgba(6,182,212,0.06) 50%, transparent 70%)' }} />
      {/* Pink blob */}
      <div className="absolute animate-[nebulaDrift_22s_ease-in-out_infinite_alternate]"
        style={{ width: '500px', height: '500px', borderRadius: '50%', bottom: '-100px', left: '30%',
          background: 'radial-gradient(circle, rgba(219,39,119,0.09) 0%, rgba(244,63,94,0.04) 40%, transparent 70%)' }} />
      {/* Cyan accent */}
      <div className="absolute animate-[nebulaDrift_18s_ease-in-out_infinite_alternate-reverse]"
        style={{ width: '400px', height: '400px', borderRadius: '50%', top: '60%', left: '10%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)' }} />
      {/* Milky way band */}
      <div className="absolute inset-0 opacity-20"
        style={{ background: 'linear-gradient(105deg, transparent 0%, rgba(150,100,255,0.04) 30%, rgba(100,150,255,0.06) 50%, rgba(200,100,255,0.04) 70%, transparent 100%)' }} />
    </div>
  )
}

// ─── Glass card ───────────────────────────────────────────────────────────────
function GlassCard({ children, className = '', glow, onClick, to }) {
  const base = `relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer group
    bg-white/[0.03] backdrop-blur-xl border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05]
    ${glow ? `shadow-[0_0_30px_${glow}] hover:shadow-[0_0_50px_${glow}]` : ''}
    ${className}`

  if (to) return <Link to={to} className={base}>{children}</Link>
  if (onClick) return <div className={base} onClick={onClick}>{children}</div>
  return <div className={base}>{children}</div>
}

// ─── Service data ──────────────────────────────────────────────────────────────
const SERVICES = [
  // Automation services (marioautomatiza)
  { id: 'whatsapp',    icon: MessageSquare, label: 'Bot WhatsApp IA',      desc: 'Responde 24/7 · Reservas · Leads',    color: '#25d366', glow: 'rgba(37,211,102,0.2)',  to: '/n8n',      cat: 'auto',  emoji: '💬' },
  { id: 'reservas',    icon: Calendar,      label: 'Reservas Online',       desc: 'Auto-confirmación · Anti no-show',    color: '#06b6d4', glow: 'rgba(6,182,212,0.2)',   to: '/clientes', cat: 'auto',  emoji: '📅' },
  { id: 'followup',    icon: Repeat,        label: 'Seguimiento Auto',      desc: 'Email + WhatsApp · Sin duplicados',   color: '#8b5cf6', glow: 'rgba(139,92,246,0.2)',  to: '/n8n',      cat: 'auto',  emoji: '🔄' },
  { id: 'reputation',  icon: Star,          label: 'Google Reputation',     desc: 'Reviews automáticas · Maps ranking', color: '#f59e0b', glow: 'rgba(245,158,11,0.2)',  to: '/n8n',      cat: 'auto',  emoji: '⭐' },
  { id: 'crm',         icon: Users,         label: 'CRM Inteligente',       desc: 'Segmentación · Historial · Alertas', color: '#a855f7', glow: 'rgba(168,85,247,0.2)',  to: '/clientes', cat: 'auto',  emoji: '👥' },
  { id: 'fidel',       icon: TrendingUp,    label: 'Fidelización',          desc: 'Win-back · Cumpleaños · Email',       color: '#ec4899', glow: 'rgba(236,72,153,0.2)',  to: '/n8n',      cat: 'auto',  emoji: '💎' },
  { id: 'chatbot',     icon: Bot,           label: 'Chatbot Web IA',        desc: 'Leads 24/7 · Citas · Preguntas',     color: '#06b6d4', glow: 'rgba(6,182,212,0.2)',   to: '/n8n',      cat: 'auto',  emoji: '🤖' },
  { id: 'web',         icon: Globe,         label: 'Web & E-commerce',      desc: 'SEO local · Tienda · Notificaciones',color: '#3b82f6', glow: 'rgba(59,130,246,0.2)',  to: '/prospector',cat: 'auto', emoji: '🌐' },
  // OSINT & Security (existing)
  { id: 'pivot',       icon: Target,        label: 'Intelligence Pivot',    desc: 'IP · Domain · Email · 10 APIs',       color: '#e63946', glow: 'rgba(230,57,70,0.2)',   to: '/pivot',    cat: 'osint', emoji: '🎯' },
  { id: 'audit',       icon: ScanLine,      label: 'Auto Auditoría',        desc: 'Scan · AI Report · Vulnerabilities', color: '#e63946', glow: 'rgba(230,57,70,0.2)',   to: '/audit',    cat: 'osint', emoji: '🔐' },
  { id: 'osint',       icon: Search,        label: 'Ciber Inteligencia',    desc: 'OSINT · Reconnaissance',             color: '#7c3aed', glow: 'rgba(124,58,237,0.2)',  to: '/osint',    cat: 'osint', emoji: '🔍' },
  { id: 'terminal',    icon: Terminal,      label: 'Terminal IA',           desc: 'Kali · Comandos · AI asistida',       color: '#22c55e', glow: 'rgba(34,197,94,0.2)',   to: '/terminal', cat: 'osint', emoji: '💻' },
  { id: 'tools',       icon: Wrench,        label: 'Herramientas+',         desc: 'Censys · Shodan · 10 APIs OSINT',    color: '#f97316', glow: 'rgba(249,115,22,0.2)',  to: '/herramientas',cat:'osint',emoji: '🛠️' },
  { id: 'workspace',   icon: FolderOpen,    label: 'Workspace',             desc: 'Casos · Findings · Investigaciones', color: '#6366f1', glow: 'rgba(99,102,241,0.2)',  to: '/workspace', cat: 'mgmt', emoji: '📁' },
  { id: 'monitor',     icon: Activity,      label: 'Uptime Monitor',        desc: 'SSL · Latencia · Alertas 24/7',      color: '#10b981', glow: 'rgba(16,185,129,0.2)',  to: '/monitor',  cat: 'mgmt', emoji: '📡' },
  { id: 'infra',       icon: Server,        label: 'Infraestructura',       desc: 'Docker · Tunnel · DevOps',           color: '#06b6d4', glow: 'rgba(6,182,212,0.2)',   to: '/infra',    cat: 'mgmt', emoji: '🖥️' },
  { id: 'servicios',   icon: Sparkles,      label: 'Catálogo Servicios',    desc: 'Automatización · CRM · Marketing',   color: '#a78bfa', glow: 'rgba(167,139,250,0.2)', to: '/servicios',cat: 'auto', emoji: '✨' },
]

const QUICK = [
  { icon: Target,      label: 'Pivot',        to: '/pivot',        color: '#e63946' },
  { icon: ScanLine,    label: 'Auditoría',    to: '/audit',        color: '#7c3aed' },
  { icon: MessageSquare,label:'WhatsApp Bot', to: '/n8n',          color: '#25d366' },
  { icon: Users,       label: 'CRM',          to: '/clientes',     color: '#a855f7' },
  { icon: Activity,    label: 'Monitor',      to: '/monitor',      color: '#10b981' },
  { icon: FolderOpen,  label: 'Workspace',    to: '/workspace',    color: '#6366f1' },
  { icon: GitBranch,   label: 'n8n',          to: '/n8n',          color: '#f97316' },
  { icon: Building2,   label: 'Prospector',   to: '/prospector',   color: '#f59e0b' },
]

// ─── Main Portal ──────────────────────────────────────────────────────────────
export default function Portal() {
  const navigate = useNavigate()
  const [stack, setStack]        = useState(null)
  const [loading, setLoading]    = useState(true)
  const [lastUpdate, setLast]    = useState(null)
  const [activeFilter, setFilter]= useState('all')
  const [time, setTime]          = useState(new Date())

  // Live clock
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await devops.stackStatus()
      setStack(data)
      setLast(new Date().toLocaleTimeString('es-ES'))
    } catch { setStack(null) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    refresh()
    const iv = setInterval(refresh, 30000)
    return () => clearInterval(iv)
  }, [refresh])

  const upCount    = stack?.summary?.up    || 0
  const totalCount = stack?.summary?.total || 0

  const filtered = activeFilter === 'all'
    ? SERVICES
    : SERVICES.filter(s => s.cat === activeFilter)

  return (
    <div className="relative min-h-screen" style={{ background: 'transparent' }}>
      <StarField />
      <NebulaLayer />

      {/* Content layer */}
      <div className="relative" style={{ zIndex: 1 }}>

        {/* ── Top status bar ──────────────────────────────────────────────── */}
        <div className="fixed top-0 left-64 right-0 z-30 px-6 py-3 flex items-center justify-between"
          style={{ background: 'rgba(3,0,8,0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-6">
            {/* Status orbs */}
            {[
              { label: `${upCount}/${totalCount} servicios`, color: upCount >= totalCount ? '#10b981' : '#f59e0b' },
              { label: `${SERVICES.filter(s => s.cat==='auto').length} automatizaciones`, color: '#a855f7' },
              { label: `${SERVICES.filter(s => s.cat==='osint').length} herramientas OSINT`, color: '#e63946' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-white/60">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                {s.label}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-white/40 font-mono">
            <span>{time.toLocaleTimeString('es-ES')}</span>
            <button onClick={refresh} className="hover:text-white/80 transition-colors">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="pt-12 px-6 pb-16 max-w-7xl mx-auto">

          {/* ── HERO ──────────────────────────────────────────────────────── */}
          <div className="text-center py-16 relative">
            {/* Central glow orb */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div style={{
                width: '400px', height: '400px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(230,57,70,0.08) 0%, rgba(124,58,237,0.06) 40%, transparent 70%)',
                filter: 'blur(30px)',
              }} />
            </div>

            {/* Orbiting dot */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 pointer-events-none">
              <div className="absolute inset-0 animate-[orbit_8s_linear_infinite]">
                <div className="w-2 h-2 rounded-full bg-crimson" style={{ boxShadow: '0 0 10px #e63946' }} />
              </div>
            </div>

            {/* Logo */}
            <div className="relative inline-flex flex-col items-center mb-8">
              <div className="w-20 h-20 rounded-2xl mb-4 flex items-center justify-center relative"
                style={{ background: 'rgba(230,57,70,0.15)', border: '1px solid rgba(230,57,70,0.3)', boxShadow: '0 0 40px rgba(230,57,70,0.2)' }}>
                <Radio size={36} className="text-crimson animate-[glowPulse_3s_ease-in-out_infinite]" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#030008] animate-pulse" />
              </div>
              <h1 className="text-5xl font-black tracking-widest"
                style={{ background: 'linear-gradient(135deg, #fff 0%, #c4b5fd 30%, #e63946 60%, #f9a8d4 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                AURA OPS
              </h1>
              <p className="text-white/40 text-sm font-mono mt-2 tracking-widest uppercase">
                Centro Operacional · v2.0
              </p>
            </div>

            {/* Tagline */}
            <p className="text-white/60 text-lg max-w-xl mx-auto leading-relaxed mb-8">
              Automatización inteligente · OSINT · Ciberseguridad · CRM · Todo en uno
            </p>

            {/* Stats row */}
            <div className="flex items-center justify-center gap-8 flex-wrap">
              {[
                { val: '24/7', label: 'Disponibilidad', color: '#10b981' },
                { val: '-80%', label: 'Trabajo manual', color: '#a855f7' },
                { val: '<3s',  label: 'Tiempo respuesta', color: '#06b6d4' },
                { val: `${SERVICES.length}`,  label: 'Servicios activos', color: '#e63946' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-black" style={{ color: s.color, textShadow: `0 0 20px ${s.color}` }}>{s.val}</div>
                  <div className="text-white/40 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Quick Actions ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-3 flex-wrap mb-12">
            {QUICK.map(q => (
              <Link key={q.to + q.label} to={q.to}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
                style={{
                  background: `rgba(${hexToRgb(q.color)}, 0.08)`,
                  border: `1px solid rgba(${hexToRgb(q.color)}, 0.25)`,
                  color: q.color,
                  boxShadow: `0 0 15px rgba(${hexToRgb(q.color)}, 0.1)`,
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 25px rgba(${hexToRgb(q.color)}, 0.35)` }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 15px rgba(${hexToRgb(q.color)}, 0.1)` }}
              >
                <q.icon size={14} />
                {q.label}
              </Link>
            ))}
          </div>

          {/* ── Filter tabs ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div className="flex gap-2">
              {[
                { id: 'all',   label: `Todo (${SERVICES.length})` },
                { id: 'auto',  label: `🤖 Automatización` },
                { id: 'osint', label: `🔍 OSINT & Seguridad` },
                { id: 'mgmt',  label: `📊 Gestión` },
              ].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeFilter === f.id
                      ? 'text-white border-white/20 bg-white/10 backdrop-blur-md'
                      : 'text-white/40 border-white/5 hover:text-white/70 hover:bg-white/5'
                  } border`}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="text-white/30 text-xs font-mono">
              {filtered.length} módulos
            </div>
          </div>

          {/* ── Service Grid ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
            {filtered.map(svc => (
              <Link key={svc.id} to={svc.to}
                className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, rgba(${hexToRgb(svc.color)}, 0.06) 0%, rgba(3,0,8,0.6) 100%)`,
                  border: `1px solid rgba(${hexToRgb(svc.color)}, 0.18)`,
                  backdropFilter: 'blur(12px)',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 35px rgba(${hexToRgb(svc.color)}, 0.25), inset 0 0 15px rgba(${hexToRgb(svc.color)}, 0.05)`; e.currentTarget.style.borderColor = `rgba(${hexToRgb(svc.color)}, 0.4)` }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = `rgba(${hexToRgb(svc.color)}, 0.18)` }}
              >
                {/* Background glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                  style={{ background: `radial-gradient(circle at 50% 50%, rgba(${hexToRgb(svc.color)}, 0.08) 0%, transparent 70%)` }} />

                {/* Icon */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 relative"
                  style={{ background: `rgba(${hexToRgb(svc.color)}, 0.15)`, border: `1px solid rgba(${hexToRgb(svc.color)}, 0.25)` }}>
                  <svc.icon size={18} style={{ color: svc.color }} />
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ boxShadow: `inset 0 0 15px rgba(${hexToRgb(svc.color)}, 0.3)` }} />
                </div>

                {/* Emoji badge */}
                <div className="absolute top-3 right-3 text-base opacity-50 group-hover:opacity-100 transition-opacity">
                  {svc.emoji}
                </div>

                {/* Label */}
                <div className="text-white font-semibold text-sm mb-1 leading-tight">{svc.label}</div>
                <div className="text-white/40 text-xs leading-relaxed">{svc.desc}</div>

                {/* Cat badge */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-widest font-bold"
                    style={{ color: svc.color, opacity: 0.7 }}>
                    {svc.cat === 'auto' ? 'automatización' : svc.cat === 'osint' ? 'osint' : 'gestión'}
                  </span>
                  <ChevronRight size={11} className="text-white/20 group-hover:text-white/60 transition-colors group-hover:translate-x-0.5 duration-300" />
                </div>
              </Link>
            ))}
          </div>

          {/* ── Stack Status ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

            {/* Services health */}
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white/80 font-semibold text-sm flex items-center gap-2">
                  <Activity size={15} className="text-green-400" /> Estado del Stack
                </h3>
                <span className="text-xs text-white/30 font-mono">{lastUpdate || '—'}</span>
              </div>
              <div className="space-y-2">
                {(stack?.services || [
                  { name: 'Frontend',   status: 'up',   port: 3000 },
                  { name: 'Backend',    status: 'up',   port: 8000 },
                  { name: 'n8n',        status: 'up',   port: 5678 },
                  { name: 'ClickHouse', status: 'up',   port: 8123 },
                  { name: 'PostgreSQL', status: 'up',   port: 5432 },
                ]).map((svc, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${svc.status === 'up' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
                        style={{ boxShadow: svc.status === 'up' ? '0 0 6px #10b981' : '0 0 6px #ef4444' }} />
                      <span className="text-white/70 text-xs">{svc.name || svc.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {svc.port && <span className="text-white/25 text-[10px] font-mono">:{svc.port}</span>}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        svc.status === 'up' ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
                        {svc.status === 'up' ? '● ON' : '○ OFF'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick launch services */}
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 className="text-white/80 font-semibold text-sm flex items-center gap-2 mb-4">
                <ExternalLink size={15} className="text-blue-400" /> Acceso Rápido
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'n8n Workflows',  url: 'http://localhost:5678',      icon: GitBranch, color: '#f97316' },
                  { label: 'ClickHouse Play',url: 'http://localhost:8123/play', icon: BarChart2, color: '#f59e0b' },
                  { label: 'API Swagger',    url: 'http://localhost:8000/docs', icon: Code2,     color: '#06b6d4' },
                  { label: 'bdev.qzz.io',   url: 'https://bdev.qzz.io',       icon: Globe,     color: '#10b981' },
                ].map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                    style={{ background: `rgba(${hexToRgb(item.color)}, 0.07)`, border: `1px solid rgba(${hexToRgb(item.color)}, 0.2)` }}>
                    <item.icon size={13} style={{ color: item.color }} />
                    <span className="text-xs text-white/70 font-medium truncate">{item.label}</span>
                    <ExternalLink size={9} className="ml-auto text-white/20 shrink-0" />
                  </a>
                ))}
              </div>

              {/* Tunnel status */}
              <div className="mt-4 p-3 rounded-xl"
                style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <div className="flex items-center gap-2">
                  <Wifi size={13} className="text-green-400" />
                  <span className="text-xs text-white/60">Cloudflare Tunnel</span>
                  <span className="ml-auto text-[10px] text-green-400 font-bold bg-green-900/20 px-2 py-0.5 rounded">ACTIVO</span>
                </div>
                <div className="text-[10px] text-green-400/60 mt-1 font-mono">bdev.qzz.io → localhost:3000</div>
              </div>
            </div>
          </div>

          {/* ── Bottom info ───────────────────────────────────────────────── */}
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-3 text-white/20 text-xs font-mono">
              <Radio size={11} className="text-crimson animate-pulse" />
              AURA OPS · Solo para auditorías autorizadas · {new Date().getFullYear()}
              <Radio size={11} className="text-crimson animate-pulse" />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ─── Hex to RGB helper ────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
