import { useState, useEffect } from 'react'
import ToolShell from '../components/ToolShell'
import { RefreshCw, Loader2, AlertTriangle, Shield, ExternalLink, Clock, Search } from 'lucide-react'

const COLOR = '#ef4444'

// Free public threat intel feeds (no API key required)
const FEEDS = [
  {
    id: 'urlhaus',
    name: 'URLhaus',
    desc: 'Malware URLs activas',
    color: '#ef4444',
    icon: '🦠',
    url: 'https://urlhaus-api.abuse.ch/v1/urls/recent/limit/20/',
    method: 'POST',
    body: {},
    parse: (d) => (d.urls || []).slice(0, 15).map(u => ({
      title: u.url,
      desc: `${u.url_status} · ${u.threat || 'malware'} · ${u.tags?.join(', ') || ''}`,
      date: u.date_added,
      severity: u.url_status === 'online' ? 'CRITICAL' : 'LOW',
      link: u.url,
    })),
  },
  {
    id: 'malware_bazaar',
    name: 'MalwareBazaar',
    desc: 'Muestras de malware recientes',
    color: '#f97316',
    icon: '☣️',
    url: 'https://mb-api.abuse.ch/api/v1/',
    method: 'POST',
    body: { query: 'get_recent', selector: '100' },
    parse: (d) => (d.data || []).slice(0, 15).map(s => ({
      title: s.file_name || s.sha256_hash?.slice(0, 32) + '...',
      desc: `${s.file_type || 'unknown'} · ${s.tags?.join(', ') || ''} · ${(s.file_size / 1024).toFixed(1)} KB`,
      date: s.first_seen,
      severity: 'HIGH',
      link: `https://bazaar.abuse.ch/sample/${s.sha256_hash}/`,
    })),
  },
  {
    id: 'threatfox',
    name: 'ThreatFox IOCs',
    desc: 'Indicadores de compromiso',
    color: '#a855f7',
    icon: '🎯',
    url: 'https://threatfox-api.abuse.ch/api/v1/',
    method: 'POST',
    body: { query: 'get_iocs', days: 1 },
    parse: (d) => (d.data || []).slice(0, 15).map(ioc => ({
      title: ioc.ioc || ioc.ioc_value,
      desc: `${ioc.ioc_type || ''} · ${ioc.malware || ''} · Confidence: ${ioc.confidence_level || '?'}%`,
      date: ioc.first_seen,
      severity: ioc.confidence_level >= 75 ? 'CRITICAL' : ioc.confidence_level >= 50 ? 'HIGH' : 'MEDIUM',
      link: `https://threatfox.abuse.ch/ioc/${ioc.id}/`,
    })),
  },
]

const SEV_COLOR = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#6b7280', INFO: '#3b82f6' }

export default function ToolThreatIntel() {
  const [feeds,    setFeeds]   = useState({})
  const [loading,  setLoading] = useState({})
  const [error,    setError]   = useState({})
  const [filter,   setFilter]  = useState('')
  const [active,   setActive]  = useState('urlhaus')

  useEffect(() => { loadFeed('urlhaus') }, [])

  const loadFeed = async (id) => {
    const feed = FEEDS.find(f => f.id === id)
    if (!feed || loading[id]) return
    setLoading(l => ({ ...l, [id]: true }))
    setError(e => ({ ...e, [id]: null }))
    try {
      const opts = { method: feed.method, headers: { 'Content-Type': 'application/json' } }
      if (feed.method === 'POST') opts.body = JSON.stringify(feed.body)
      const res = await fetch(feed.url, opts)
      const json = await res.json()
      const items = feed.parse(json)
      setFeeds(f => ({ ...f, [id]: items }))
    } catch (err) {
      setError(e => ({ ...e, [id]: 'Error al cargar feed. Verifica CORS / disponibilidad.' }))
    } finally {
      setLoading(l => ({ ...l, [id]: false }))
    }
  }

  const activeFeed = FEEDS.find(f => f.id === active)
  const items = (feeds[active] || []).filter(i =>
    !filter || i.title?.toLowerCase().includes(filter.toLowerCase()) || i.desc?.toLowerCase().includes(filter.toLowerCase())
  )

  const fmtDate = (d) => {
    if (!d) return ''
    try { return new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }
    catch { return d }
  }

  return (
    <ToolShell icon="🛡️" name="Threat Intelligence" color={COLOR} badge="URLhaus · MalwareBazaar · ThreatFox IOCs — Tiempo real">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Feed selector */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {FEEDS.map(f => (
            <button key={f.id} onClick={() => { setActive(f.id); if (!feeds[f.id]) loadFeed(f.id) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                background: active === f.id ? `rgba(${f.color.slice(1).match(/../g).map(h=>parseInt(h,16)).join(',')},0.15)` : 'rgba(255,255,255,0.04)',
                border: active === f.id ? `1px solid ${f.color}50` : '1px solid rgba(255,255,255,0.08)',
                color: active === f.id ? f.color : 'rgba(255,255,255,0.45)',
                fontWeight: active === f.id ? 700 : 400, fontSize: 12,
              }}>
              <span>{f.icon}</span>
              <div style={{ textAlign: 'left' }}>
                <div>{f.name}</div>
                <div style={{ fontSize: 9, opacity: 0.6 }}>{f.desc}</div>
              </div>
              {loading[f.id] && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }}/>}
              {feeds[f.id] && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}>{feeds[f.id].length}</span>}
            </button>
          ))}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }}/>
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar..."
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '7px 12px 7px 28px', borderRadius: 8, fontSize: 12, outline: 'none', width: 180 }}/>
            </div>
            <button onClick={() => loadFeed(active)} disabled={loading[active]}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12 }}>
              <RefreshCw size={12} style={loading[active] ? { animation: 'spin 1s linear infinite' } : {}}/>
            </button>
          </div>
        </div>

        {/* Source info */}
        {activeFeed && (
          <div style={{ display: 'flex', gap: 8, padding: '8px 14px', borderRadius: 8, marginBottom: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
            <Shield size={12}/>
            Fuente: <strong style={{ color: 'rgba(255,255,255,0.5)' }}>{activeFeed.name}</strong> — {activeFeed.desc}
            <span style={{ marginLeft: 'auto' }}>Datos en tiempo real de abuse.ch</span>
          </div>
        )}

        {error[active] && (
          <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13 }}>
            <AlertTriangle size={14}/>{error[active]}
          </div>
        )}

        {loading[active] && !feeds[active] && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: activeFeed?.color || COLOR }}/>
          </div>
        )}

        {/* Threat items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item, i) => {
            const sc = SEV_COLOR[item.severity] || SEV_COLOR.INFO
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', transition: 'all .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc, boxShadow: `0 0 8px ${sc}`, flexShrink: 0, marginTop: 5 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ color: sc, fontSize: 9, padding: '1px 6px', borderRadius: 3, background: `${sc}20`, fontWeight: 700, letterSpacing: '0.05em', flexShrink: 0 }}>{item.severity}</span>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500, fontFamily: 'monospace' }}>{item.title}</span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{item.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {item.date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
                      <Clock size={9}/>{fmtDate(item.date)}
                    </div>
                  )}
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <ExternalLink size={12}/>
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {feeds[active] && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
            No hay datos que coincidan
          </div>
        )}

        <div style={{ marginTop: 20, padding: '10px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
          ⚠ Estas fuentes son de libre acceso (abuse.ch). Los datos son indicativos — siempre verifica antes de actuar sobre cualquier IOC.
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}
