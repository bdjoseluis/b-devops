import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageSquare, Calendar, Repeat, Star, Users, Globe,
  TrendingUp, Bot, ChevronRight, CheckCircle, Zap,
  Phone, Mail, Clock, BarChart2, Shield, ExternalLink,
  ArrowRight, Sparkles, CreditCard, Package, Rocket
} from 'lucide-react'

// ─── Pricing tiers ────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'starter',
    icon: Package,
    emoji: '🌱',
    name: 'Starter',
    price: '97',
    period: 'mes',
    color: '#06b6d4',
    desc: 'Perfecto para negocios que quieren dar el primer paso en la automatización',
    features: [
      'Bot WhatsApp (500 conversaciones/mes)',
      'Sistema de reservas online',
      'Confirmaciones automáticas por email',
      '1 workflow n8n activo',
      'Soporte por email (48h)',
    ],
    notIncluded: ['CRM avanzado', 'Campañas de marketing', 'Múltiples canales'],
    cta: 'Empezar ahora',
    popular: false,
  },
  {
    id: 'pro',
    icon: Rocket,
    emoji: '🚀',
    name: 'Pro',
    price: '197',
    period: 'mes',
    color: '#8b5cf6',
    desc: 'Para negocios que quieren automatizar todo y crecer en piloto automático',
    features: [
      'Bot WhatsApp (ilimitado)',
      'Reservas + recordatorios anti no-show',
      'Seguimiento automático de leads',
      'CRM con pipeline de ventas',
      'Gestión de reputación Google',
      '5 workflows n8n activos',
      'Web profesional con SEO local',
      'Soporte WhatsApp (24h)',
    ],
    notIncluded: [],
    cta: 'Quiero el Pro',
    popular: true,
  },
  {
    id: 'enterprise',
    icon: Shield,
    emoji: '💎',
    name: 'Enterprise',
    price: '397',
    period: 'mes',
    color: '#f59e0b',
    desc: 'Solución completa para negocios con múltiples sucursales o alto volumen',
    features: [
      'Todo del plan Pro',
      'Workflows n8n ilimitados',
      'Integración ERP/POS a medida',
      'Múltiples sucursales/locales',
      'Chatbot IA en web + WhatsApp',
      'Campañas email marketing',
      'Analítica avanzada y reportes',
      'Soporte dedicado (2h respuesta)',
      'Formación del equipo incluida',
    ],
    notIncluded: [],
    cta: 'Contactar',
    popular: false,
  },
]

// ─── Service definitions ──────────────────────────────────────────────────────
const SERVICES = [
  {
    id: 'whatsapp',
    icon: MessageSquare,
    emoji: '💬',
    title: 'Bot de WhatsApp IA',
    subtitle: 'Tu negocio nunca duerme',
    desc: 'Asistente IA que responde preguntas frecuentes, gestiona reservas y califica leads — 24/7 sin intervención manual.',
    color: '#25d366',
    features: ['Respuestas automáticas 24/7', 'Gestión de reservas', 'Calificación de leads', 'Integración multi-canal'],
    metrics: { val: '<3s', label: 'Tiempo respuesta' },
    cat: 'Automatización',
    to: '/n8n',
  },
  {
    id: 'reservas',
    icon: Calendar,
    emoji: '📅',
    title: 'Reservas Online',
    subtitle: 'Tus clientes reservan a cualquier hora',
    desc: 'Sistema de reservas online con confirmaciones automáticas y recordatorios 24h para eliminar no-shows.',
    color: '#06b6d4',
    features: ['Reservas desde web o WhatsApp', 'Confirmaciones automáticas', 'Recordatorios anti no-show', 'Sincronización calendario'],
    metrics: { val: '-70%', label: 'Reducción no-shows' },
    cat: 'Automatización',
    to: '/clientes',
  },
  {
    id: 'followup',
    icon: Repeat,
    emoji: '🔄',
    title: 'Seguimiento Automático',
    subtitle: 'Ningún lead se pierde',
    desc: 'Secuencias de seguimiento por email y WhatsApp activadas automáticamente para leads inactivos en el momento óptimo.',
    color: '#8b5cf6',
    features: ['Secuencias multicanal', 'Timing optimizado por IA', 'Sin mensajes duplicados', 'Segmentación automática'],
    metrics: { val: '+40%', label: 'Conversión leads' },
    cat: 'Automatización',
    to: '/n8n',
  },
  {
    id: 'reputation',
    icon: Star,
    emoji: '⭐',
    title: 'Reputación en Google',
    subtitle: 'Más reseñas, más visibilidad',
    desc: 'Solicitudes automáticas de reseña a clientes satisfechos para mejorar la visibilidad en Google Maps y SEO local.',
    color: '#f59e0b',
    features: ['Solicitudes post-servicio', 'Mejora ranking Google Maps', 'Monitoreo de reseñas', 'Alertas reseñas negativas'],
    metrics: { val: '×3', label: 'Más reseñas/mes' },
    cat: 'Marketing',
    to: '/n8n',
  },
  {
    id: 'crm',
    icon: Users,
    emoji: '👥',
    title: 'CRM Inteligente',
    subtitle: 'Conoce a cada cliente',
    desc: 'Base de datos centralizada con historial completo, segmentación avanzada y alertas para clientes inactivos u oportunidades de venta.',
    color: '#a855f7',
    features: ['Historial completo del cliente', 'Segmentación avanzada', 'Alertas clientes inactivos', 'Pipeline de ventas'],
    metrics: { val: '+35%', label: 'Retención clientes' },
    cat: 'CRM',
    to: '/clientes',
  },
  {
    id: 'web',
    icon: Globe,
    emoji: '🌐',
    title: 'Web & E-commerce',
    subtitle: 'Tu escaparate digital profesional',
    desc: 'Webs profesionales con SEO local optimizado, reservas integradas y tienda online con notificaciones automáticas de pedidos.',
    color: '#3b82f6',
    features: ['SEO local optimizado', 'Reservas integradas', 'Tienda online', 'Notificaciones pedidos'],
    metrics: { val: '+200%', label: 'Visibilidad online' },
    cat: 'Digital',
    to: '/prospector',
  },
  {
    id: 'fidel',
    icon: TrendingUp,
    emoji: '💎',
    title: 'Fidelización & Email',
    subtitle: 'Clientes que vuelven solos',
    desc: 'Campañas de win-back, ofertas de cumpleaños y newsletters automatizadas para aumentar la recurrencia sin esfuerzo.',
    color: '#ec4899',
    features: ['Campañas win-back', 'Ofertas cumpleaños', 'Newsletters automáticas', 'Métricas de retención'],
    metrics: { val: '+60%', label: 'Clientes recurrentes' },
    cat: 'Marketing',
    to: '/n8n',
  },
  {
    id: 'chatbot',
    icon: Bot,
    emoji: '🤖',
    title: 'Chatbot Web con IA',
    subtitle: 'Captura leads mientras duermes',
    desc: 'Asistente IA en tu web que captura leads, responde preguntas y programa citas las 24 horas, sin intervención humana.',
    color: '#06b6d4',
    features: ['Captura de leads 24/7', 'Programación de citas', 'FAQ automatizadas', 'Integración CRM'],
    metrics: { val: '+80%', label: 'Leads capturados' },
    cat: 'Automatización',
    to: '/n8n',
  },
]

// ─── Industries ───────────────────────────────────────────────────────────────
const INDUSTRIES = [
  { emoji: '✂️', name: 'Barbería', result: '+12 citas/semana' },
  { emoji: '🦷', name: 'Dental', result: '-60% no-shows' },
  { emoji: '🏋️', name: 'Gimnasio', result: '+25% retención' },
  { emoji: '🍽️', name: 'Restaurante', result: '+40% reservas' },
  { emoji: '🧘', name: 'Fisioterapia', result: '+30% agenda' },
  { emoji: '🐾', name: 'Veterinaria', result: '24/7 atención' },
  { emoji: '🏠', name: 'Inmobiliaria', result: '+50% leads' },
  { emoji: '💆', name: 'Spa & Belleza', result: '-80% trabajo manual' },
  { emoji: '📚', name: 'Academia', result: '+35% matrículas' },
  { emoji: '👓', name: 'Óptica', result: '+3★ Google rating' },
  { emoji: '🥗', name: 'Nutricionista', result: '+20 clientes/mes' },
  { emoji: '🔧', name: 'Técnico', result: 'Presupuestos auto' },
]

// ─── Process steps ────────────────────────────────────────────────────────────
const PROCESS = [
  { n: '01', title: 'Auditoría gratuita', desc: 'Analizamos tu negocio y detectamos los procesos que se pueden automatizar', icon: Shield, color: '#e63946' },
  { n: '02', title: 'Configuración 48h', desc: 'Implementamos las automatizaciones y las adaptamos a tu flujo de trabajo', icon: Zap, color: '#8b5cf6' },
  { n: '03', title: 'Funciona solo', desc: 'El sistema trabaja 24/7 de forma autónoma mientras tú te centras en lo importante', icon: CheckCircle, color: '#10b981' },
]

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Servicios() {
  const [activeService, setActive] = useState(null)
  const [activeCat, setActiveCat]  = useState('all')

  const cats = ['all', 'Automatización', 'CRM', 'Marketing', 'Digital']
  const filtered = activeCat === 'all' ? SERVICES : SERVICES.filter(s => s.cat === activeCat)

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-16">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="text-center pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6"
          style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>
          <Sparkles size={12} /> Automatización & Servicios Digitales
        </div>
        <h1 className="text-4xl font-black text-white mb-4">
          Más clientes.{' '}
          <span style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Menos trabajo.
          </span>
        </h1>
        <p className="text-white/50 text-lg max-w-2xl mx-auto mb-8">
          Automatiza los procesos repetitivos de tu negocio. Reservas, WhatsApp, follow-up, reseñas, CRM — todo en piloto automático.
        </p>
        {/* Metrics */}
        <div className="flex items-center justify-center gap-10 flex-wrap">
          {[
            { val: '-80%', label: 'Trabajo manual', color: '#a855f7' },
            { val: '24/7', label: 'Disponibilidad', color: '#10b981' },
            { val: '48h',  label: 'Implementación', color: '#06b6d4' },
            { val: '0',    label: 'Conocimientos técnicos', color: '#f59e0b' },
          ].map(m => (
            <div key={m.label} className="text-center">
              <div className="text-3xl font-black mb-1" style={{ color: m.color, textShadow: `0 0 20px ${m.color}40` }}>{m.val}</div>
              <div className="text-white/40 text-xs">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Category filter ────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {cats.map(c => (
          <button key={c} onClick={() => setActiveCat(c)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              activeCat === c
                ? 'border-white/20 bg-white/10 text-white backdrop-blur-md'
                : 'border-white/5 text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}>
            {c === 'all' ? `Todo (${SERVICES.length})` : c}
          </button>
        ))}
      </div>

      {/* ── Services grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map(svc => {
          const isActive = activeService === svc.id
          const Icon = svc.icon
          return (
            <div key={svc.id}
              className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01]"
              style={{
                background: `linear-gradient(135deg, rgba(${hexToRgb(svc.color)}, 0.08) 0%, rgba(3,0,8,0.7) 100%)`,
                border: `1px solid rgba(${hexToRgb(svc.color)}, ${isActive ? 0.5 : 0.2})`,
                boxShadow: isActive ? `0 0 40px rgba(${hexToRgb(svc.color)}, 0.2)` : 'none',
              }}
              onClick={() => setActive(isActive ? null : svc.id)}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `rgba(${hexToRgb(svc.color)}, 0.15)`, border: `1px solid rgba(${hexToRgb(svc.color)}, 0.3)` }}>
                    <span className="text-2xl">{svc.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                        style={{ background: `rgba(${hexToRgb(svc.color)}, 0.15)`, color: svc.color }}>
                        {svc.cat}
                      </span>
                    </div>
                    <h3 className="text-white font-bold text-lg">{svc.title}</h3>
                    <p className="text-sm font-medium" style={{ color: svc.color, opacity: 0.8 }}>{svc.subtitle}</p>
                  </div>
                  {/* Metric */}
                  <div className="text-right shrink-0">
                    <div className="text-xl font-black" style={{ color: svc.color }}>{svc.metrics.val}</div>
                    <div className="text-[10px] text-white/30">{svc.metrics.label}</div>
                  </div>
                </div>

                <p className="text-white/60 text-sm mt-4 leading-relaxed">{svc.desc}</p>

                {/* Expandable features */}
                {isActive && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2" style={{ borderColor: `rgba(${hexToRgb(svc.color)}, 0.2)` }}>
                    {svc.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                        <CheckCircle size={11} style={{ color: svc.color, flexShrink: 0 }} />
                        {f}
                      </div>
                    ))}
                    <div className="col-span-2 mt-3">
                      <Link to={svc.to}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                        style={{ background: `rgba(${hexToRgb(svc.color)}, 0.2)`, border: `1px solid rgba(${hexToRgb(svc.color)}, 0.4)`, color: svc.color }}>
                        Configurar <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-1">
                    {svc.features.slice(0,3).map((f, i) => (
                      <span key={i} className="text-[9px] px-2 py-0.5 rounded-full text-white/30 border border-white/8">{f.split(' ')[0]}</span>
                    ))}
                  </div>
                  <ChevronRight size={14} className="text-white/20 transition-transform"
                    style={{ transform: isActive ? 'rotate(90deg)' : 'none', color: isActive ? svc.color : undefined }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Industries ─────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
          <span className="text-2xl">🏢</span> ¿Para quién?
          <span className="text-white/30 text-sm font-normal ml-2">Cualquier negocio con clientes</span>
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {INDUSTRIES.map(ind => (
            <div key={ind.name}
              className="rounded-xl p-4 text-center transition-all hover:scale-[1.03] cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}
            >
              <div className="text-3xl mb-2">{ind.emoji}</div>
              <div className="text-white text-xs font-semibold">{ind.name}</div>
              <div className="text-white/40 text-[10px] mt-1">{ind.result}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Process ────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-white font-bold text-xl mb-8 text-center">El proceso — Funciona en 3 pasos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PROCESS.map((step, i) => (
            <div key={i} className="relative">
              {i < PROCESS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px z-10"
                  style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.1), transparent)' }} />
              )}
              <div className="rounded-2xl p-6 text-center"
                style={{ background: `rgba(${hexToRgb(step.color)}, 0.05)`, border: `1px solid rgba(${hexToRgb(step.color)}, 0.15)` }}>
                <div className="text-5xl font-black mb-4" style={{ color: `rgba(${hexToRgb(step.color)}, 0.15)`, lineHeight: 1 }}>{step.n}</div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `rgba(${hexToRgb(step.color)}, 0.15)`, border: `1px solid rgba(${hexToRgb(step.color)}, 0.3)` }}>
                  <step.icon size={20} style={{ color: step.color }} />
                </div>
                <h3 className="text-white font-bold text-base mb-2">{step.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Problem demo ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-white font-bold text-2xl mb-4">Responde mientras duermes</h3>
            <p className="text-white/50 leading-relaxed mb-6">
              Tu negocio recibe clientes potenciales a las 3 AM. Sin automatización, los pierdes. Con AURA OPS, son atendidos, calificados y agendados automáticamente.
            </p>
            <div className="space-y-3">
              {[
                { time: '03:14', msg: 'Hola! Quiero reservar para mañana', from: 'client' },
                { time: '03:14', msg: '¡Hola! 👋 Claro, tenemos disponibilidad mañana. ¿A qué hora prefieres?', from: 'bot' },
                { time: '03:15', msg: 'A las 11:00 perfectamente', from: 'client' },
                { time: '03:15', msg: '✅ Reserva confirmada para mañana 11:00h. Recibirás recordatorio 1h antes. ¡Hasta mañana!', from: 'bot' },
              ].map((m, i) => (
                <div key={i} className={`flex ${m.from === 'client' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                    m.from === 'client'
                      ? 'bg-white/10 text-white/80 rounded-tl-sm'
                      : 'text-white rounded-tr-sm'
                    }`}
                    style={m.from === 'bot' ? { background: 'rgba(37,211,102,0.2)', border: '1px solid rgba(37,211,102,0.3)' } : {}}>
                    <span className="text-[10px] text-white/30 block mb-0.5">{m.time}</span>
                    {m.msg}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-white/70 font-semibold">Sin automatización vs. Con AURA OPS</h4>
            {[
              { without: 'Mensaje perdido a las 3 AM', with: 'Respuesta inmediata 24/7' },
              { without: 'Cliente potencial se va', with: 'Lead calificado y agendado' },
              { without: 'No-show sin recordatorio', with: '-70% no-shows con recordatorios' },
              { without: '2h/día respondiendo mensajes', with: '0 minutos — todo automático' },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl text-xs text-red-300/70 flex items-start gap-2"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <span className="text-red-400 shrink-0">✗</span> {row.without}
                </div>
                <div className="p-3 rounded-xl text-xs text-green-300/70 flex items-start gap-2"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <span className="text-green-400 shrink-0">✓</span> {row.with}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <div>
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-4"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}>
            <CreditCard size={12} /> Planes y precios
          </div>
          <h2 className="text-white font-black text-3xl mb-3">Invierte una vez, crece siempre</h2>
          <p className="text-white/40 text-base max-w-xl mx-auto">Sin permanencia. Sin sorpresas. Cancela cuando quieras. Todos los planes incluyen configuración inicial gratuita.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map(plan => {
            const Icon = plan.icon
            return (
              <div key={plan.id} className="relative rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
                style={{
                  background: plan.popular
                    ? `linear-gradient(135deg, rgba(${hexToRgb(plan.color)},0.12), rgba(3,0,8,0.8))`
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid rgba(${hexToRgb(plan.color)}, ${plan.popular ? 0.5 : 0.15})`,
                  boxShadow: plan.popular ? `0 0 60px rgba(${hexToRgb(plan.color)}, 0.15)` : 'none',
                }}>
                {plan.popular && (
                  <div className="absolute top-0 right-0 left-0 h-0.5"
                    style={{ background: `linear-gradient(90deg, transparent, ${plan.color}, transparent)` }}/>
                )}
                {plan.popular && (
                  <div className="absolute top-3 right-4 text-[10px] font-black px-3 py-1 rounded-full"
                    style={{ background: `rgba(${hexToRgb(plan.color)},0.2)`, border: `1px solid rgba(${hexToRgb(plan.color)},0.4)`, color: plan.color }}>
                    MÁS POPULAR
                  </div>
                )}
                <div className="p-7">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: `rgba(${hexToRgb(plan.color)},0.15)`, border: `1px solid rgba(${hexToRgb(plan.color)},0.3)` }}>
                      {plan.emoji}
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg">{plan.name}</div>
                      <div className="text-[10px] uppercase tracking-widest" style={{ color: plan.color }}>Plan</div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-black text-white">{plan.price}€</span>
                    <span className="text-white/40 text-sm">/{plan.period}</span>
                  </div>
                  <p className="text-white/50 text-xs mb-6 leading-relaxed">{plan.desc}</p>
                  <div className="space-y-2.5 mb-6">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-white/70">
                        <CheckCircle size={12} style={{ color: plan.color, flexShrink: 0, marginTop: 1 }}/> {f}
                      </div>
                    ))}
                    {plan.notIncluded.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-white/25 line-through">
                        <span className="w-3 h-3 shrink-0 mt-0.5">✕</span> {f}
                      </div>
                    ))}
                  </div>
                  <a href="mailto:comando1.yt@gmail.com?subject=Solicitud plan b-dev"
                    className="w-full block text-center py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                    style={{
                      background: plan.popular ? `linear-gradient(135deg, ${plan.color}, #e63946)` : `rgba(${hexToRgb(plan.color)},0.15)`,
                      border: plan.popular ? 'none' : `1px solid rgba(${hexToRgb(plan.color)},0.3)`,
                      color: plan.popular ? '#fff' : plan.color,
                    }}>
                    {plan.cta}
                  </a>
                </div>
              </div>
            )
          })}
        </div>
        {/* Fine print */}
        <div className="text-center mt-6 text-white/25 text-xs">
          ✓ Sin permanencia &nbsp;·&nbsp; ✓ Configuración inicial gratuita &nbsp;·&nbsp; ✓ Soporte en español &nbsp;·&nbsp; ✓ Zona Crevillente / Vega Baja
        </div>
      </div>

      {/* ── Contact ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h3 className="text-white font-black text-2xl mb-2">¿Tienes dudas?</h3>
          <p className="text-white/50 text-sm mb-6 leading-relaxed">
            Cuéntame tu negocio y te digo exactamente qué automatizaciones tienen más impacto. Primera consulta gratuita — sin compromiso.
          </p>
          <div className="space-y-3">
            <a href="mailto:comando1.yt@gmail.com" className="flex items-center gap-3 text-white/60 hover:text-white transition-colors text-sm">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
                <Mail size={14} style={{ color: '#a78bfa' }}/>
              </div>
              comando1.yt@gmail.com
            </a>
            <a href="https://github.com/bdjoseluis" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/60 hover:text-white transition-colors text-sm">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <Globe size={14} style={{ color: 'rgba(255,255,255,0.6)' }}/>
              </div>
              github.com/bdjoseluis
            </a>
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.15)' }}>
                <Clock size={14} style={{ color: '#06b6d4' }}/>
              </div>
              Respuesta en menos de 24h
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { q: '¿Necesito conocimientos técnicos?', a: 'No. Me encargo de toda la configuración. Tú solo defines cómo funciona tu negocio.' },
            { q: '¿Cuánto tarda en estar listo?', a: 'Los primeros workflows están activos en menos de 48h. Las integraciones más complejas en 1 semana.' },
            { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, sin permanencia ni penalizaciones. Todos los planes son mensuales.' },
          ].map((faq, i) => (
            <div key={i} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-white text-xs font-semibold mb-1">{faq.q}</div>
              <div className="text-white/40 text-xs leading-relaxed">{faq.a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <div className="text-center py-8">
        <div className="inline-flex flex-col items-center gap-4 p-8 rounded-3xl"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(230,57,70,0.08) 100%)', border: '1px solid rgba(124,58,237,0.25)' }}>
          <h3 className="text-white font-black text-2xl">¿Listo para automatizar?</h3>
          <p className="text-white/50">Configura tu primer workflow en menos de 5 minutos</p>
          <div className="flex gap-3">
            <a href="mailto:comando1.yt@gmail.com?subject=Quiero el plan Pro b-dev"
              className="px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #e63946)', color: '#fff' }}>
              <Zap size={15} /> Contratar ahora
            </a>
            <Link to="/clientes"
              className="px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 border border-white/10 text-white/70 hover:bg-white/5 transition-all">
              <Users size={15} /> Ver CRM
            </Link>
          </div>
          <div className="text-white/25 text-xs">b-dev · Crevillente · Alicante 🇪🇸</div>
        </div>
      </div>
    </div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  return `${r},${g},${b}`
}
