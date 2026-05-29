import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/client'
import Spinner from '../components/Spinner'
import {
  Zap, Mail, Globe, Phone, User, Link, AlertTriangle,
  CheckCircle, Download, Search, ChevronDown, ChevronUp,
  Shield, Eye, ExternalLink, Copy, RefreshCw
} from 'lucide-react'

const TYPE_META = {
  email:    { icon: Mail,          color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-700/40',   label: '📧 Email' },
  ip:       { icon: Globe,         color: 'text-green-400',  bg: 'bg-green-900/20 border-green-700/40', label: '🌐 Dirección IP' },
  domain:   { icon: Globe,         color: 'text-cyan-400',   bg: 'bg-cyan-900/20 border-cyan-700/40',   label: '🔗 Dominio' },
  phone:    { icon: Phone,         color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-700/40', label: '📱 Teléfono' },
  username: { icon: User,          color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-700/40', label: '👤 Usuario / Red Social' },
  url:      { icon: Link,          color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-700/40', label: '🔗 URL' },
}

const RISK_COLORS = {
  CRÍTICO: 'text-red-400 bg-red-900/30 border-red-600/50',
  ALTO:    'text-orange-400 bg-orange-900/30 border-orange-600/50',
  MEDIO:   'text-yellow-400 bg-yellow-900/30 border-yellow-600/50',
  BAJO:    'text-green-400 bg-green-900/30 border-green-600/50',
}

const SEVERITY_COLORS = {
  CRÍTICO: 'text-red-400',
  ALTO:    'text-orange-400',
  MEDIO:   'text-yellow-400',
  INFO:    'text-blue-400',
}

export default function AutoAudit() {
  const [searchParams] = useSearchParams()
  const [target, setTarget] = useState(() => searchParams.get('target') || '')
  const [detectedType, setDetectedType] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  // Live type detection as user types
  useEffect(() => {
    if (!target.trim()) { setDetectedType(null); return }
    const timeout = setTimeout(async () => {
      try {
        const r = await api.post('/audit/detect', { target: target.trim() }).then(r => r.data)
        setDetectedType(r)
      } catch {}
    }, 300)
    return () => clearTimeout(timeout)
  }, [target])

  const run = async () => {
    if (!target.trim() || loading) return
    setLoading(true); setError(''); setResult(null); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    try {
      const data = await api.post('/audit/full', { target: target.trim(), auto_report: true }, { timeout: 180000 }).then(r => r.data)
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
      clearInterval(timerRef.current)
    }
  }

  const typeMeta = detectedType ? TYPE_META[detectedType.type] : null

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap size={18} className="text-crimson" />
          <span className="text-white font-bold text-lg">Auto Auditoría</span>
          <span className="badge badge-gray">IA + OSINT + Report</span>
        </div>
        <p className="text-gray-500 text-sm">Una entrada → todos los módulos en paralelo → informe DOCX automático</p>
      </div>

      {/* Input */}
      <div className="card border-surface-border/60">
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className="input-dark pl-10 text-base py-3"
                placeholder="email@empresa.com · 192.168.1.1 · dominio.com · +34600000000 · @usuario"
                value={target}
                onChange={e => setTarget(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && run()}
                autoFocus
              />
            </div>
            <button
              onClick={run}
              disabled={loading || !target.trim()}
              className="btn-primary px-6 text-base font-bold"
            >
              {loading ? <><Spinner size={16} /> Auditando...</> : <><Zap size={16} /> Auditar</>}
            </button>
          </div>

          {/* Type detection badge */}
          {detectedType && typeMeta && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${typeMeta.bg}`}>
              <typeMeta.icon size={13} className={typeMeta.color} />
              <span className={typeMeta.color}>{typeMeta.label}</span>
            </div>
          )}

          {/* Quick examples */}
          {!target && (
            <div className="flex flex-wrap gap-2">
              <span className="text-gray-600 text-xs self-center">Ejemplos:</span>
              {['admin@empresa.com', '8.8.8.8', 'tesla.com', '+34600123456', '@elonmusk'].map(ex => (
                <button key={ex} onClick={() => setTarget(ex)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-surface-border text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-all font-mono">
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card border-crimson/20">
          <div className="flex items-center gap-4 mb-4">
            <Spinner size={28} />
            <div>
              <p className="text-white font-semibold">Ejecutando auditoría completa...</p>
              <p className="text-gray-500 text-sm">Tiempo: {elapsed}s — ejecutando todos los módulos OSINT en paralelo</p>
            </div>
          </div>
          <ModulesRunning type={detectedType?.type} />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-4 bg-red-900/20 rounded-xl border border-red-700/30 flex gap-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-semibold">Error en la auditoría</p>
            <p className="text-red-400/70 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <AuditResults result={result} />
      )}
    </div>
  )
}

/* ── Modules running indicator ──────────────────────────────── */
function ModulesRunning({ type }) {
  const modulesByType = {
    email:    ['Email Enrichment', 'Gravatar', 'EmailRep.io', 'HIBP Brechas', 'Hunter.io', 'DNS dominio', 'WHOIS', 'SSL', 'Subdominios', 'WhatsMyName', 'Shodan IP', 'VirusTotal'],
    ip:       ['Shodan', 'VirusTotal', 'IPInfo Geolocalización', 'BGP/ASN', 'AbuseIPDB', 'Censys', 'Wayback Machine'],
    domain:   ['DNS (A/MX/NS/TXT)', 'WHOIS', 'SSL Certificado', 'Subdominios (crt.sh)', 'Hunter.io Emails', 'Shodan IP', 'VirusTotal', 'BGP/ASN', 'Wayback Machine', 'SecurityTrails', 'URLScan.io'],
    phone:    ['NumVerify', 'phonenumbers', 'DeHashed Brechas', 'Dorks OSINT'],
    username: ['WhatsMyName (150+ plataformas)', 'Gravatar', 'DeHashed Brechas'],
    url:      ['URLScan.io', 'DNS dominio', 'WHOIS', 'SSL', 'Shodan', 'VirusTotal', 'Wayback Machine'],
  }
  const modules = modulesByType[type] || modulesByType.domain

  return (
    <div className="flex flex-wrap gap-2">
      {modules.map((m, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-surface-light rounded-lg border border-surface-border">
          <div className="w-1.5 h-1.5 bg-crimson rounded-full animate-pulse" />
          <span className="text-gray-400">{m}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Audit Results ──────────────────────────────────────────── */
function AuditResults({ result }) {
  const { target, type, summary, modules, report, email } = result
  const typeMeta = TYPE_META[type] || TYPE_META.domain
  const riskColor = RISK_COLORS[summary?.risk_level] || RISK_COLORS.BAJO

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className={`card border-2 ${riskColor}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={18} className={riskColor.split(' ')[0]} />
              <span className={`font-bold text-xl ${riskColor.split(' ')[0]}`}>
                Riesgo {summary?.risk_level}
              </span>
              <span className="badge badge-gray">{summary?.modules_run} módulos ejecutados</span>
            </div>
            <p className="text-gray-400 text-sm font-mono">{target}</p>
          </div>

          {/* Report download + email badge */}
          <div className="flex flex-col gap-2 shrink-0">
            {report?.download_url && (
              <a
                href={report.download_url}
                download
                className="flex items-center gap-2 px-4 py-2 bg-crimson hover:bg-crimson/80 text-white rounded-xl font-medium text-sm transition-all"
              >
                <Download size={14} />
                Descargar Informe DOCX
              </a>
            )}
            {email && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                email.status === 'sent' ? 'bg-green-900/30 text-green-400 border border-green-700/40'
                : email.status === 'disabled' ? 'bg-gray-800/40 text-gray-500 border border-gray-700/30'
                : 'bg-red-900/30 text-red-400 border border-red-700/40'
              }`}>
                {email.status === 'sent' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                {email.status === 'sent' ? `Email → ${email.to}` : email.message}
              </div>
            )}
          </div>
        </div>

        {/* Findings */}
        {summary?.findings?.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Hallazgos</p>
            {summary.findings.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className={`font-bold text-xs shrink-0 mt-0.5 ${SEVERITY_COLORS[f.severity] || 'text-gray-400'}`}>
                  [{f.severity}]
                </span>
                <span className="text-gray-200">{f.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Module results */}
      <div className="grid grid-cols-1 gap-3">
        {/* Email enrichment */}
        {modules.email_enrichment && <EmailEnrichmentCard data={modules.email_enrichment} />}

        {/* Phone */}
        {modules.phone_lookup && <PhoneCard data={modules.phone_lookup} />}

        {/* Social presence */}
        {modules.social_presence && <SocialCard data={modules.social_presence} />}
        {modules.social_username && <SocialCard data={modules.social_username} label="Presencia social (username del email)" />}

        {/* DNS / WHOIS / SSL */}
        {(modules.dns || modules.whois || modules.ssl) && (
          <CollapsibleCard title="DNS · WHOIS · SSL" icon={Globe} color="text-cyan-400" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {modules.dns && !modules.dns.error && <DnsCard data={modules.dns} />}
              {modules.whois && !modules.whois.error && <WhoisCard data={modules.whois} />}
              {modules.ssl && !modules.ssl.error && <SslCard data={modules.ssl} />}
            </div>
          </CollapsibleCard>
        )}

        {/* Subdomains */}
        {modules.subdomains && !modules.subdomains.error && modules.subdomains.total > 0 && (
          <SubdomainsCard data={modules.subdomains} />
        )}

        {/* Network: Shodan + BGP */}
        {(modules.shodan || modules.bgp || modules.geolocation) && (
          <CollapsibleCard title="Inteligencia de Red" icon={Shield} color="text-green-400" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {modules.geolocation && !modules.geolocation.error && <GeoCard data={modules.geolocation} />}
              {modules.shodan && !modules.shodan.error && <ShodanCard data={modules.shodan} />}
              {modules.bgp && !modules.bgp.error && <BgpCard data={modules.bgp} />}
              {modules.abuseipdb && !modules.abuseipdb.error && <AbuseCard data={modules.abuseipdb} />}
            </div>
          </CollapsibleCard>
        )}

        {/* VirusTotal */}
        {modules.virustotal && !modules.virustotal.error && <VtCard data={modules.virustotal} />}

        {/* Emails found */}
        {(modules.emails || modules.email_finder) && (
          <EmailsFoundCard data={modules.emails || modules.email_finder} />
        )}

        {/* Breach */}
        {modules.breach_check && <BreachCard data={modules.breach_check} />}

        {/* Wayback */}
        {modules.wayback && !modules.wayback.error && modules.wayback.snapshots?.length > 0 && (
          <WaybackCard data={modules.wayback} />
        )}

        {/* SecurityTrails */}
        {modules.securitytrails_domain && !modules.securitytrails_domain.error && (
          <CollapsibleCard title="SecurityTrails — DNS History" icon={Eye} color="text-pink-400">
            <StCard data={modules.securitytrails_domain} subs={modules.securitytrails_subs} />
          </CollapsibleCard>
        )}

        {/* URLScan */}
        {modules.urlscan && !modules.urlscan.error && (
          <URLScanResultCard data={modules.urlscan} />
        )}

        {/* Phone dorks / OSINT dorks */}
        {modules.phone_lookup?.osint_dorks && (
          <DorksCard dorks={modules.phone_lookup.osint_dorks} title="Dorks OSINT para este teléfono" />
        )}
      </div>
    </div>
  )
}

/* ── Module cards ───────────────────────────────────────────── */
function EmailEnrichmentCard({ data }) {
  const rep = data.reputation || {}
  const grav = data.gravatar || {}
  const isRisky = rep.suspicious || rep.malicious_activity || rep.blacklisted

  return (
    <CollapsibleCard title="Email Intelligence" icon={Mail} color="text-blue-400" defaultOpen
      badge={isRisky ? 'SOSPECHOSO' : rep.reputation || ''}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reputation */}
        <div>
          <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">EmailRep.io</p>
          {rep.error
            ? <p className="text-gray-500 text-xs">{rep.error}</p>
            : <div className="space-y-1">
                <KV label="Reputación" value={rep.reputation} />
                <KV label="Sospechoso" value={rep.suspicious ? '⚠️ SÍ' : '✅ No'} />
                <KV label="Referencias" value={rep.references} />
                <KV label="Brechas" value={rep.data_breach ? '🔴 Sí' : '✅ No'} />
                <KV label="Spam" value={rep.spam ? '🔴 Sí' : '✅ No'} />
                <KV label="Proveedor gratuito" value={rep.free_provider ? 'Sí' : 'No'} />
                <KV label="Email desechable" value={data.is_disposable ? '🔴 Sí' : '✅ No'} />
                {rep.profiles?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {rep.profiles.map((p, i) => <span key={i} className="badge badge-blue text-xs">{p}</span>)}
                  </div>
                )}
              </div>
          }
        </div>

        {/* Gravatar */}
        <div>
          <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Gravatar</p>
          {grav.has_account
            ? <div className="flex gap-3">
                {grav.avatar_url && (
                  <img src={grav.avatar_url} alt="avatar" className="w-16 h-16 rounded-lg border border-surface-border" />
                )}
                <div className="space-y-1 flex-1">
                  <KV label="Nombre" value={grav.display_name} />
                  <KV label="Usuario" value={grav.username} />
                  <KV label="Ubicación" value={grav.location} />
                  {grav.linked_accounts?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {grav.linked_accounts.map((a, i) => (
                        <a key={i} href={a.url} target="_blank" rel="noreferrer"
                          className="badge badge-green text-xs hover:underline">{a.platform}</a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            : <p className="text-gray-500 text-sm">Sin perfil Gravatar</p>
          }
        </div>
      </div>
    </CollapsibleCard>
  )
}

function PhoneCard({ data }) {
  return (
    <CollapsibleCard title="Análisis de Teléfono" icon={Phone} color="text-yellow-400" defaultOpen>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <KV label="Formato internacional" value={data.international_format} mono />
          <KV label="Válido" value={data.valid ? '✅ Sí' : '❌ No'} />
          <KV label="Tipo" value={data.number_type} />
          <KV label="País" value={data.country} />
          <KV label="Operadora" value={data.carrier_name} />
          <KV label="Zona horaria" value={data.timezones?.[0]} />
          {data.numverify && <>
            <KV label="Ubicación" value={data.numverify.location} />
            <KV label="Operadora (NV)" value={data.numverify.carrier} />
          </>}
        </div>
        {data.breach_check && (
          <div>
            <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Brechas de datos</p>
            <div className={`p-3 rounded-lg border ${data.breach_check.found ? 'border-red-700/30 bg-red-900/10' : 'border-green-700/30 bg-green-900/10'}`}>
              <p className={`font-bold ${data.breach_check.found ? 'text-red-400' : 'text-green-400'}`}>
                {data.breach_check.found ? `🔴 ${data.breach_check.total} brechas` : '✅ Sin brechas'}
              </p>
            </div>
          </div>
        )}
      </div>
    </CollapsibleCard>
  )
}

function SocialCard({ data, label = "Presencia en Redes Sociales" }) {
  const [filter, setFilter] = useState('')
  const found = data.found || []
  const filtered = found.filter(f => !filter || f.site?.toLowerCase().includes(filter.toLowerCase()))
  if (!data.total_found && !found.length) return null

  return (
    <CollapsibleCard title={label} icon={User} color="text-purple-400"
      badge={`${data.total_found || found.length} perfiles`}>
      <div className="flex items-center gap-3 mb-3">
        <p className="text-gray-400 text-sm">{data.total_checked} plataformas · {data.total_found} encontradas</p>
        <input className="input-dark text-xs py-1.5 ml-auto w-36" placeholder="Filtrar..."
          value={filter} onChange={e => setFilter(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
        {filtered.map((f, i) => (
          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-surface-light hover:bg-surface rounded-lg border border-transparent hover:border-surface-border transition-all group">
            <CheckCircle size={12} className="text-green-400 shrink-0" />
            <span className="text-white text-xs font-medium truncate flex-1">{f.site}</span>
            {f.category && <span className="badge badge-gray text-xs">{f.category}</span>}
            <ExternalLink size={10} className="text-gray-600 group-hover:text-purple-400" />
          </a>
        ))}
      </div>
    </CollapsibleCard>
  )
}

function DnsCard({ data }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">DNS</p>
      <KV label="IP" value={data.resolved_ip} mono />
      <KV label="IPv6" value={data.ipv6} mono />
      {data.mx?.length > 0 && <KV label="MX" value={data.mx[0]?.exchange} mono />}
      {data.ns?.length > 0 && <KV label="NS" value={data.ns[0]?.nameserver || data.ns[0]} mono />}
      {data.txt?.length > 0 && <KV label="TXT" value={data.txt[0]?.slice(0, 60)} mono />}
    </div>
  )
}

function WhoisCard({ data }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">WHOIS</p>
      <KV label="Registrar" value={data.registrar} />
      <KV label="Creado" value={data.creation_date} />
      <KV label="Expira" value={data.expiration_date} />
      <KV label="Organización" value={data.org} />
      <KV label="País" value={data.country} />
    </div>
  )
}

function SslCard({ data }) {
  const expiring = data.days_until_expiry !== undefined && data.days_until_expiry < 30
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">SSL</p>
      <KV label="Válido" value={data.is_valid ? '✅ Sí' : '❌ No'} />
      <KV label="Expira en" value={data.days_until_expiry !== undefined ? `${data.days_until_expiry}d ${expiring ? '⚠️' : ''}` : undefined} />
      <KV label="Emisor" value={data.issuer} />
      <KV label="Algoritmo" value={data.cipher} />
    </div>
  )
}

function SubdomainsCard({ data }) {
  const subs = data.subdomains || []
  return (
    <CollapsibleCard title={`Subdominios (${data.total})`} icon={Globe} color="text-teal-400">
      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
        {subs.slice(0, 100).map((s, i) => (
          <code key={i} className="text-teal-400 text-xs bg-surface-light px-2 py-0.5 rounded">{s}</code>
        ))}
        {subs.length > 100 && <span className="text-gray-500 text-xs">+{subs.length - 100} más...</span>}
      </div>
    </CollapsibleCard>
  )
}

function GeoCard({ data }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Geolocalización</p>
      <KV label="IP" value={data.ip} mono />
      <KV label="Ciudad" value={data.city} />
      <KV label="País" value={data.country} />
      <KV label="ISP" value={data.isp || data.org} />
      <KV label="ASN" value={data.asn} mono />
      <KV label="VPN/Proxy" value={data.is_vpn ? '⚠️ Sí' : data.is_proxy ? '⚠️ Proxy' : undefined} />
    </div>
  )
}

function ShodanCard({ data }) {
  const vulns = data.vulnerabilities || []
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Shodan</p>
      <KV label="Organización" value={data.org} />
      <KV label="OS" value={data.os} />
      {data.open_ports?.length > 0 && (
        <div className="mb-1">
          <span className="text-gray-500 text-xs">Puertos: </span>
          <span className="text-green-400 text-xs font-mono">{data.open_ports.slice(0, 10).join(', ')}</span>
        </div>
      )}
      {vulns.length > 0 && (
        <div>
          <span className="text-xs text-red-400 font-semibold">{vulns.length} CVEs:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {vulns.slice(0, 5).map(v => <span key={v} className="badge badge-gray text-red-300 text-xs">{v}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

function BgpCard({ data }) {
  const prefix = data.prefixes?.[0] || {}
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">BGP / ASN</p>
      <KV label="Prefijo" value={prefix.prefix} mono />
      <KV label="AS" value={`AS${prefix.asn} — ${prefix.asn_name}`} />
      <KV label="País" value={prefix.country} />
      <KV label="PTR (rDNS)" value={data.ptr} mono />
      <KV label="RIR" value={data.rir} />
    </div>
  )
}

function AbuseCard({ data }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">AbuseIPDB</p>
      <KV label="Score abuso" value={data.abuse_score !== undefined ? `${data.abuse_score}%` : undefined} />
      <KV label="Reportes" value={data.total_reports} />
      <KV label="ISP" value={data.isp} />
      <KV label="País" value={data.country_code} />
      <KV label="VPN/Proxy" value={data.is_tor ? 'TOR' : data.usage_type} />
    </div>
  )
}

function VtCard({ data }) {
  const malicious = data.malicious_count || data.stats?.malicious || 0
  const suspicious = data.suspicious_count || data.stats?.suspicious || 0
  return (
    <CollapsibleCard title="VirusTotal" icon={Shield} color={malicious > 0 ? 'text-red-400' : 'text-green-400'}
      badge={malicious > 0 ? `${malicious} DETECCIONES` : 'Limpio'}>
      <div className="flex gap-6">
        <div className="text-center">
          <div className={`text-3xl font-bold ${malicious > 0 ? 'text-red-400' : 'text-green-400'}`}>{malicious}</div>
          <div className="text-xs text-gray-500">Malicioso</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-400">{suspicious}</div>
          <div className="text-xs text-gray-500">Sospechoso</div>
        </div>
        {data.reputation !== undefined && (
          <div className="text-center">
            <div className={`text-3xl font-bold ${data.reputation < 0 ? 'text-red-400' : 'text-green-400'}`}>{data.reputation}</div>
            <div className="text-xs text-gray-500">Reputación</div>
          </div>
        )}
        {data.categories && Object.keys(data.categories).length > 0 && (
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Categorías</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(data.categories).slice(0, 5).map(([k, v]) => (
                <span key={k} className="badge badge-gray text-xs">{v}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </CollapsibleCard>
  )
}

function EmailsFoundCard({ data }) {
  const emails = data.emails || []
  if (!emails.length) return null
  return (
    <CollapsibleCard title={`Emails encontrados (${emails.length})`} icon={Mail} color="text-blue-400">
      <div className="flex flex-wrap gap-2">
        {emails.map((e, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-surface-light rounded-lg text-sm">
            <Mail size={12} className="text-blue-400" />
            <code className="text-blue-300">{e.email || e}</code>
            {e.first_name && <span className="text-gray-500">{e.first_name} {e.last_name}</span>}
            {e.confidence && <span className="badge badge-gray">{e.confidence}%</span>}
          </div>
        ))}
      </div>
    </CollapsibleCard>
  )
}

function BreachCard({ data }) {
  const found = data.pwned || data.found || data.total > 0
  const breaches = data.breaches || data.entries || []
  return (
    <CollapsibleCard title="Brechas de Seguridad" icon={AlertTriangle}
      color={found ? 'text-red-400' : 'text-green-400'}
      badge={found ? `${data.total || breaches.length} filtraciones` : 'SEGURO'}>
      <div className={`p-3 rounded-lg border ${found ? 'border-red-700/30 bg-red-900/10' : 'border-green-700/30 bg-green-900/10'}`}>
        <p className={`font-bold mb-2 ${found ? 'text-red-400' : 'text-green-400'}`}>
          {found ? `🔴 Encontrado en ${data.total || breaches.length} filtraciones` : '✅ No encontrado en brechas conocidas'}
        </p>
        {breaches.slice(0, 10).map((b, i) => (
          <p key={i} className="text-gray-300 text-sm">{b.database_name || b.name || b.title || JSON.stringify(b).slice(0, 60)}</p>
        ))}
      </div>
    </CollapsibleCard>
  )
}

function WaybackCard({ data }) {
  const snaps = data.snapshots || []
  return (
    <CollapsibleCard title="Wayback Machine" icon={RefreshCw} color="text-orange-400"
      badge={`${data.total} snapshots`}>
      <div className="flex items-center gap-4 mb-3 text-sm text-gray-400">
        <span>Primero: <strong className="text-white">{data.first?.date}</strong></span>
        <span>Último: <strong className="text-white">{data.last?.date}</strong></span>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {snaps.slice(0, 10).map((s, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-1.5 hover:bg-surface-light rounded text-xs">
            <span className="text-orange-400 font-mono w-32">{s.date}</span>
            <span className="badge badge-gray">{s.status}</span>
            <a href={s.url} target="_blank" rel="noreferrer" className="ml-auto text-blue-400 hover:underline flex items-center gap-1">
              <ExternalLink size={10} /> Ver
            </a>
          </div>
        ))}
      </div>
    </CollapsibleCard>
  )
}

function StCard({ data, subs }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <KV label="Registrar" value={data.whois?.registrar} />
          <KV label="Creado" value={data.whois?.created} />
          <KV label="IPs actuales" value={data.dns?.a?.join(', ')} mono />
          <KV label="Nameservers" value={data.dns?.ns?.join(', ')} />
        </div>
        {subs && subs.total > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">{subs.total} subdominios históricos</p>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
              {subs.subdomains?.slice(0, 30).map((s, i) => (
                <code key={i} className="text-pink-400 text-xs bg-surface-light px-1.5 py-0.5 rounded">{s}</code>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function URLScanResultCard({ data }) {
  return (
    <CollapsibleCard title="URLScan.io" icon={Eye} color={data.malicious ? 'text-red-400' : 'text-cyan-400'}
      badge={data.malicious ? 'MALICIOSO' : 'Limpio'}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <KV label="Título" value={data.title} />
          <KV label="IP" value={data.ip} mono />
          <KV label="País" value={data.country} />
          <KV label="Servidor" value={data.server} />
          {data.tech?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.tech.map((t, i) => <span key={i} className="badge badge-blue text-xs">{t}</span>)}
            </div>
          )}
        </div>
        {data.screenshot && (
          <img src={data.screenshot} alt="screenshot" className="rounded-lg border border-surface-border max-h-36 object-cover" />
        )}
      </div>
    </CollapsibleCard>
  )
}

function DorksCard({ dorks, title }) {
  const [copied, setCopied] = useState('')
  if (!dorks?.length) return null
  return (
    <CollapsibleCard title={title || 'OSINT Dorks'} icon={Search} color="text-lime-400">
      <div className="space-y-1">
        {dorks.map((d, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-surface-light rounded-lg">
            <code className="text-lime-400 text-xs flex-1">{d}</code>
            <button onClick={() => { navigator.clipboard.writeText(d); setCopied(d); setTimeout(() => setCopied(''), 1500) }}
              className={`p-1 rounded ${copied === d ? 'text-lime-400' : 'text-gray-500 hover:text-white'}`}>
              <Copy size={11} />
            </button>
            <a href={`https://google.com/search?q=${encodeURIComponent(d)}`} target="_blank" rel="noreferrer"
              className="p-1 text-gray-500 hover:text-lime-400">
              <ExternalLink size={11} />
            </a>
          </div>
        ))}
      </div>
    </CollapsibleCard>
  )
}

/* ── Shared Components ──────────────────────────────────────── */
function CollapsibleCard({ title, icon: Icon, color, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card border-surface-border/60">
      <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          {Icon && <Icon size={15} className={color} />}
          <span className="font-semibold text-white text-sm">{title}</span>
          {badge && <span className={`badge text-xs ${badge.includes('CRÍTICO') || badge.includes('MALICIOSO') || badge.includes('DETECCIONES') ? 'badge-gray text-red-300' : badge === 'Limpio' || badge === 'SEGURO' ? 'badge-gray text-green-300' : 'badge-gray'}`}>{badge}</span>}
        </div>
        {open ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </div>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}

function KV({ label, value, mono = false }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex gap-2 py-1 border-b border-surface-border/20 last:border-0">
      <span className="text-gray-500 text-xs w-28 shrink-0">{label}</span>
      <span className={`text-xs flex-1 ${mono ? 'font-mono text-green-400' : 'text-gray-200'}`}>{String(value)}</span>
    </div>
  )
}
