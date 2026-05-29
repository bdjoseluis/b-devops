import { useState, useEffect } from 'react'
import {
  Search, Globe, Mail, Shield, AlertTriangle, ChevronDown,
  ChevronUp, Download, Zap, CheckCircle, XCircle, Eye,
  Server, Network, Lock, Users, ExternalLink, Copy, RefreshCw
} from 'lucide-react'
import { osint, ai, reports } from '../api/client'
import Spinner from '../components/Spinner'
import RiskBadge from '../components/RiskBadge'

export default function CiberInteligencia() {
  const [target, setTarget] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [modules, setModules] = useState(['all'])
  const [reportLoading, setReportLoading] = useState(false)
  const [reportUrl, setReportUrl] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('osint_target')
    if (stored) {
      setTarget(stored)
      sessionStorage.removeItem('osint_target')
      handleAnalyze(stored)
    }
  }, [])

  const handleAnalyze = async (t = target) => {
    if (!t.trim()) return
    setLoading(true)
    setError('')
    setData(null)
    setAiAnalysis('')
    setReportUrl('')
    try {
      const result = await osint.analyze(t.trim(), modules)
      setData(result)
      // Auto-trigger AI analysis
      triggerAiAnalysis(t.trim(), result)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al analizar. ¿Está el backend corriendo?')
    } finally {
      setLoading(false)
    }
  }

  const triggerAiAnalysis = async (t, d) => {
    setAiLoading(true)
    try {
      const res = await ai.analyze(t, d, 'osint')
      setAiAnalysis(res.analysis)
    } catch {
      setAiAnalysis('Error al obtener análisis de IA.')
    } finally {
      setAiLoading(false)
    }
  }

  const generateReport = async () => {
    if (!data) return
    setReportLoading(true)
    try {
      const res = await reports.generate(target, data, true)
      setReportUrl(reports.downloadUrl(res.filename))
    } catch (e) {
      alert('Error al generar reporte: ' + (e.response?.data?.detail || e.message))
    } finally {
      setReportLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Search bar */}
      <div className="card mb-6 border-crimson/20">
        <p className="section-title">Ciber Inteligencia — OSINT Automatizado</p>
        <div className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="input-dark pl-10"
              placeholder="dominio.com · email@empresa.com · 192.168.1.1 · empresa S.A."
              value={target}
              onChange={e => setTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            />
          </div>
          <button
            className="btn-primary"
            onClick={() => handleAnalyze()}
            disabled={loading || !target.trim()}
          >
            {loading ? <Spinner size={16} /> : <Zap size={16} />}
            {loading ? 'Analizando...' : 'Analizar'}
          </button>
        </div>

        {/* Module toggles */}
        <div className="flex flex-wrap gap-2">
          {['all', 'dns', 'whois', 'ssl', 'subdomains', 'emails', 'shodan', 'virustotal', 'geolocation'].map(m => (
            <button
              key={m}
              onClick={() => {
                if (m === 'all') {
                  setModules(['all'])
                } else {
                  const without = modules.filter(x => x !== 'all')
                  if (without.includes(m)) {
                    const next = without.filter(x => x !== m)
                    setModules(next.length ? next : ['all'])
                  } else {
                    setModules([...without, m])
                  }
                }
              }}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                modules.includes(m) || (m === 'all' && modules.includes('all'))
                  ? 'bg-crimson/20 border-crimson/50 text-crimson'
                  : 'bg-surface-light border-surface-border text-gray-400 hover:border-gray-500'
              }`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="card border-red-700/50 bg-red-900/10 mb-4 flex gap-3">
          <XCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <div className="card flex flex-col items-center py-16 gap-4">
          <Spinner size={40} />
          <p className="text-gray-400 font-mono text-sm animate-pulse">
            Recopilando inteligencia sobre {target}...
          </p>
          <p className="text-gray-600 text-xs">DNS · WHOIS · SSL · Subdominios · Shodan · VirusTotal</p>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-4">
          {/* Header summary */}
          <div className="card border-crimson/30 glow-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Globe size={20} className="text-crimson" />
                  <span className="text-white font-bold text-xl">{data.target}</span>
                  <span className="badge badge-blue">{data.target_type?.toUpperCase()}</span>
                </div>
                {data.dns?.resolved_ip && (
                  <div className="flex items-center gap-2 ml-8">
                    <span className="text-gray-500 text-sm">IP:</span>
                    <code className="text-green-400 font-mono text-sm">{data.dns.resolved_ip}</code>
                    {data.geolocation && !data.geolocation.error && (
                      <span className="text-gray-500 text-sm">
                        · {data.geolocation.city}, {data.geolocation.country} · {data.geolocation.org}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {reportUrl ? (
                  <a href={reportUrl} download className="btn-primary">
                    <Download size={16} />
                    Descargar Reporte
                  </a>
                ) : (
                  <button
                    className="btn-secondary"
                    onClick={generateReport}
                    disabled={reportLoading}
                  >
                    {reportLoading ? <Spinner size={14} /> : <Download size={16} />}
                    {reportLoading ? 'Generando...' : 'Generar Reporte'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="card border-green-700/30 bg-green-900/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-green-400 rounded-full pulse-dot" />
              <p className="section-title mb-0 text-green-400">Análisis IA — B-DEVOPS</p>
            </div>
            {aiLoading ? (
              <div className="flex items-center gap-3">
                <Spinner size={16} />
                <span className="text-gray-400 text-sm">Analizando con Gemini Flash...</span>
              </div>
            ) : aiAnalysis ? (
              <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{aiAnalysis}</pre>
            ) : (
              <p className="text-gray-500 text-sm">Sin análisis disponible (configura API key de Gemini)</p>
            )}
          </div>

          {/* Results grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {data.dns && !data.dns.error && <DNSCard dns={data.dns} />}
            {data.whois && !data.whois.error && <WhoisCard whois={data.whois} />}
            {data.ssl && !data.ssl.error && <SSLCard ssl={data.ssl} />}
            {data.virustotal && !data.virustotal.error && <VirusTotalCard vt={data.virustotal} />}
            {data.shodan && !data.shodan.error && <ShodanCard shodan={data.shodan} />}
            {data.emails && !data.emails.error && data.emails.emails?.length > 0 && <EmailsCard emails={data.emails} />}
          </div>

          {data.subdomains && <SubdomainsCard subs={data.subdomains} />}
          {data.breach && <BreachCard breach={data.breach} />}
        </div>
      )}
    </div>
  )
}

function Section({ title, icon: Icon, children, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card">
      <button
        className="flex items-center justify-between w-full mb-0"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-crimson" />}
          <span className="text-white font-semibold text-sm">{title}</span>
          {badge && <span className="badge badge-gray">{badge}</span>}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}

function KV({ label, value, mono = false, copy = false }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex gap-2 py-1.5 border-b border-surface-border/50 last:border-0">
      <span className="text-gray-500 text-xs w-36 shrink-0">{label}</span>
      <span className={`text-gray-200 text-xs flex-1 ${mono ? 'font-mono text-green-400' : ''}`}>
        {Array.isArray(value)
          ? value.join(', ')
          : String(value)}
      </span>
    </div>
  )
}

function DNSCard({ dns }) {
  return (
    <Section title="DNS Records" icon={Network}>
      <div className="space-y-0">
        <KV label="A Records" value={dns.A} mono />
        <KV label="AAAA Records" value={dns.AAAA} mono />
        <KV label="NS Servers" value={dns.NS} />
        <KV label="MX Records" value={dns.MX?.map(m => `${m.exchange} (${m.priority})`)} />
        <KV label="SPF" value={dns.SPF} mono />
        <KV label="DMARC" value={dns.DMARC} />
        <KV label="PTR (Reverse)" value={dns.PTR} />
        <KV label="SOA" value={dns.SOA?.mname} />
        {!dns.SPF && (
          <div className="mt-2 flex items-center gap-2 text-yellow-400 text-xs">
            <AlertTriangle size={12} />
            Sin SPF configurado — riesgo de email spoofing
          </div>
        )}
        {(!dns.DMARC || dns.DMARC.length === 0) && (
          <div className="mt-1 flex items-center gap-2 text-yellow-400 text-xs">
            <AlertTriangle size={12} />
            Sin DMARC configurado
          </div>
        )}
      </div>
    </Section>
  )
}

function WhoisCard({ whois }) {
  return (
    <Section title="WHOIS" icon={Eye}>
      <div className="space-y-0">
        <KV label="Registrar" value={whois.registrar} />
        <KV label="Registrante" value={whois.registrant_name} />
        <KV label="Organización" value={whois.org} />
        <KV label="País" value={whois.country} />
        <KV label="Creado" value={whois.creation_date} />
        <KV label="Expira" value={whois.expiration_date} />
        <KV label="Actualizado" value={whois.updated_date} />
        <KV label="Name Servers" value={whois.name_servers} />
        <KV label="DNSSEC" value={whois.dnssec} />
        {whois.emails && <KV label="Emails WHOIS" value={whois.emails} />}
      </div>
    </Section>
  )
}

function SSLCard({ ssl }) {
  const daysLeft = ssl.days_until_expiry
  const statusColor = ssl.expired ? 'text-red-400' : ssl.expiring_soon ? 'text-yellow-400' : 'text-green-400'

  return (
    <Section title="Certificado SSL/TLS" icon={Lock}>
      <div className="space-y-0">
        <KV label="Subject (CN)" value={ssl.subject} mono />
        <KV label="Emisor" value={ssl.issuer_org} />
        <KV label="Válido hasta" value={ssl.not_after} />
        <div className="flex gap-2 py-1.5">
          <span className="text-gray-500 text-xs w-36">Estado</span>
          <span className={`text-xs font-bold ${statusColor}`}>
            {ssl.expired ? '⚠ EXPIRADO' : ssl.expiring_soon ? `⚡ PRÓXIMO A EXPIRAR (${daysLeft}d)` : `✓ VÁLIDO (${daysLeft} días)`}
          </span>
        </div>
        {ssl.san?.length > 0 && <KV label="SANs" value={ssl.san.slice(0, 6)} />}
      </div>
    </Section>
  )
}

function VirusTotalCard({ vt }) {
  const malicious = vt.malicious || 0
  const suspicious = vt.suspicious || 0
  const harmless = vt.harmless || 0
  const total = malicious + suspicious + harmless
  const riskLevel = malicious > 0 ? 'CRÍTICO' : suspicious > 0 ? 'ALTO' : 'BAJO'

  return (
    <Section title="Reputación VirusTotal" icon={Shield}>
      <div className="flex gap-6 mb-4">
        <div className="text-center">
          <div className="text-red-400 font-bold text-2xl">{malicious}</div>
          <div className="text-gray-500 text-xs">Malicioso</div>
        </div>
        <div className="text-center">
          <div className="text-orange-400 font-bold text-2xl">{suspicious}</div>
          <div className="text-gray-500 text-xs">Sospechoso</div>
        </div>
        <div className="text-center">
          <div className="text-green-400 font-bold text-2xl">{harmless}</div>
          <div className="text-gray-500 text-xs">Limpio</div>
        </div>
        <div className="ml-auto flex items-start">
          <RiskBadge level={riskLevel} />
        </div>
      </div>
      {/* Progress bar */}
      {total > 0 && (
        <div className="w-full h-2 bg-surface-border rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-red-500 rounded-full"
            style={{ width: `${(malicious / total) * 100}%` }}
          />
        </div>
      )}
      <div className="space-y-0">
        <KV label="Score Reputación" value={vt.reputation} />
        <KV label="Registrar" value={vt.registrar} />
        {vt.categories && Object.keys(vt.categories).length > 0 && (
          <KV label="Categorías" value={Object.values(vt.categories).slice(0, 3).join(', ')} />
        )}
      </div>
    </Section>
  )
}

function ShodanCard({ shodan }) {
  return (
    <Section title="Exposición Shodan" icon={Server}>
      <div className="mb-4 space-y-0">
        <KV label="IP" value={shodan.ip} mono />
        <KV label="Organización" value={shodan.org} />
        <KV label="ISP" value={shodan.isp} />
        <KV label="País" value={shodan.country} />
        <KV label="ASN" value={shodan.asn} />
        <KV label="Sistema Operativo" value={shodan.os} />
        {shodan.vulnerabilities?.length > 0 && (
          <div className="mt-2 p-2 rounded bg-red-900/20 border border-red-700/30">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={12} className="text-red-400" />
              <span className="text-red-400 text-xs font-bold">CVEs Detectados</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {shodan.vulnerabilities.map(cve => (
                <span key={cve} className="badge badge-red">{cve}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {shodan.open_ports?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Puertos abiertos ({shodan.open_ports.length})</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {shodan.open_ports.map(p => (
              <span key={p} className="badge badge-blue font-mono">{p}</span>
            ))}
          </div>
        </div>
      )}

      {shodan.services?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Servicios expuestos</p>
          <div className="space-y-1">
            {shodan.services.slice(0, 10).map((svc, i) => (
              <div key={i} className="flex gap-3 text-xs py-1 border-b border-surface-border/40">
                <code className="text-blue-400 w-16 shrink-0">{svc.port}/{svc.transport}</code>
                <span className="text-gray-300">{svc.product} {svc.version}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  )
}

function EmailsCard({ emails }) {
  return (
    <Section title={`Emails Corporativos (${emails.emails?.length})`} icon={Mail}>
      <div className="space-y-2">
        {emails.emails?.map((e, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-surface-border/40 last:border-0">
            <code className="text-green-400 text-xs flex-1">{e.email}</code>
            {e.first_name && (
              <span className="text-gray-400 text-xs">{e.first_name} {e.last_name}</span>
            )}
            {e.position && <span className="badge badge-gray">{e.position}</span>}
            <span className="text-gray-600 text-xs">{e.confidence}%</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function SubdomainsCard({ subs }) {
  const [showAll, setShowAll] = useState(false)
  const active = subs.resolved?.filter(r => r.status === 'active') || []
  const displayed = showAll ? active : active.slice(0, 20)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-crimson" />
          <span className="text-white font-semibold text-sm">
            Subdominios ({subs.total} encontrados · {active.length} activos)
          </span>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          {Object.entries(subs.sources || {}).map(([src, count]) => (
            <span key={src}>{src}: {count}</span>
          ))}
        </div>
      </div>

      {active.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {displayed.map((r, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 px-3 bg-surface rounded-lg">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full shrink-0" />
                <code className="text-blue-300 text-xs flex-1 truncate">{r.subdomain}</code>
                {r.ip && <code className="text-gray-500 text-xs">{r.ip}</code>}
              </div>
            ))}
          </div>
          {active.length > 20 && (
            <button
              className="mt-3 text-crimson text-xs hover:underline"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Ver menos' : `Ver todos (${active.length})`}
            </button>
          )}
        </>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
          {subs.subdomains?.slice(0, 40).map((s, i) => (
            <code key={i} className="text-gray-500 text-xs truncate">{s}</code>
          ))}
        </div>
      )}
    </div>
  )
}

function BreachCard({ breach }) {
  if (!breach || breach.error) return null
  return (
    <div className={`card border-2 ${breach.status === 'breached' ? 'border-red-600/50 bg-red-900/10' : 'border-green-600/30 bg-green-900/10'}`}>
      <div className="flex items-center gap-3 mb-3">
        {breach.status === 'breached'
          ? <AlertTriangle size={18} className="text-red-400" />
          : <CheckCircle size={18} className="text-green-400" />}
        <span className={`font-bold ${breach.status === 'breached' ? 'text-red-400' : 'text-green-400'}`}>
          {breach.status === 'breached'
            ? `Email encontrado en ${breach.total} brecha(s)`
            : 'Email limpio — no encontrado en brechas conocidas'}
        </span>
      </div>
      {breach.breaches?.map((b, i) => (
        <div key={i} className="mb-2 p-3 bg-red-900/20 rounded-lg">
          <div className="flex gap-3 flex-wrap">
            <span className="text-red-300 font-semibold text-sm">{b.name}</span>
            <span className="text-gray-400 text-xs">{b.breach_date}</span>
            <span className="text-gray-400 text-xs">{b.pwn_count?.toLocaleString()} cuentas</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {b.data_classes?.map(d => <span key={d} className="badge badge-orange">{d}</span>)}
          </div>
        </div>
      ))}
    </div>
  )
}
