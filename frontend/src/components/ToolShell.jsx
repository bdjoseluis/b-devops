import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Telescope } from 'lucide-react'

function hexRgb(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}

export default function ToolShell({ icon, name, color = '#a855f7', badge, children }) {
  const navigate = useNavigate()
  const [r, g, b] = hexRgb(color)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 30%, rgba(20,0,60,0.7) 0%, #020010 40%, #000810 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Starfield */}
      <div style={{
        position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        backgroundImage: `
          radial-gradient(1px 1px at 15% 20%, rgba(255,255,255,0.35) 0%, transparent 100%),
          radial-gradient(1px 1px at 72% 8%,  rgba(255,255,255,0.25) 0%, transparent 100%),
          radial-gradient(1px 1px at 40% 55%, rgba(255,255,255,0.2)  0%, transparent 100%),
          radial-gradient(1px 1px at 88% 45%, rgba(255,255,255,0.3)  0%, transparent 100%),
          radial-gradient(1px 1px at 5%  80%, rgba(255,255,255,0.2)  0%, transparent 100%),
          radial-gradient(1px 1px at 60% 90%, rgba(255,255,255,0.15) 0%, transparent 100%)
        `,
      }}/>

      {/* Fixed header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 58,
        background: 'rgba(2,0,14,0.94)', backdropFilter: 'blur(14px)',
        borderBottom: `1px solid rgba(${r},${g},${b},0.22)`,
        boxShadow: `0 0 30px rgba(${r},${g},${b},0.06)`,
        display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px',
      }}>
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 14px', borderRadius: 9,
            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)',
            color: '#c4b5fd', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            transition: 'all .18s', boxShadow: '0 0 12px rgba(139,92,246,0.15)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.28)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = '0 0 18px rgba(139,92,246,0.35)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.15)'; e.currentTarget.style.color = '#c4b5fd'; e.currentTarget.style.boxShadow = '0 0 12px rgba(139,92,246,0.15)' }}
        >
          <ArrowLeft size={13} />
          Galaxia
        </button>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />

        {/* Tool identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: `rgba(${r},${g},${b},0.15)`,
            border: `1px solid rgba(${r},${g},${b},0.35)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, boxShadow: `0 0 14px rgba(${r},${g},${b},0.2)`,
          }}>
            {icon}
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '0.02em' }}>{name}</div>
            {badge && (
              <div style={{ color: color, fontSize: 10, fontFamily: 'monospace', opacity: 0.75, marginTop: 1 }}>{badge}</div>
            )}
          </div>
        </div>

        {/* DEVNOVA brand */}
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.22em' }}>
          DEV<span style={{ color: 'rgba(167,139,250,0.5)' }}>NOVA</span>
        </div>
      </div>

      {/* Content area */}
      <div style={{ paddingTop: 58, minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
