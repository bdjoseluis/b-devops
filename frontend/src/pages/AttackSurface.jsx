import { useState, useMemo, useEffect } from 'react'
import { AlertTriangle, Lock, Server, Clock, Search, Plus, RefreshCw, CheckCircle, X, Zap } from 'lucide-react'
import api from '../api/client'

const SK_ASSETS  = 'bdev_surface_assets'
const SK_VULNS   = 'bdev_surface_vulns'
const SK_CREDS   = 'bdev_surface_creds'
const SK_CHANGES = 'bdev_surface_changes'

function load(key, fallback) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback }
  catch { return fallback }
}

// Map an audit result to surface data
function auditToSurface(target, auditResult) {
  const { modules = {}, summary = {} } = auditResult
  const now = new Date().toLocaleString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
  const assetId = 'a' + Date.now()

  // Determine type
  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(target)
  const resolvedIp = modules.dns?.resolved_ip || modules.geolocation?.ip || (isIp ? target : null)

  // Open ports from Shodan
  const openPorts = modules.shodan?.open_ports || []

  // Vulnerabilities
  const vulns = []
  const changes = []
  const creds = []

  // CVEs from Shodan
  for (const cve of (modules.shodan?.vulnerabilities || [])) {
    vulns.push({
      id: `v${Date.now()}_${cve}`, assetId,
      title: cve, severity: 'Alta', cve,
      cvss: null, service: 'Unknown', port: null,
      description: `Vulnerabilidad ${cve} detectada por Shodan en ${target}`,
      firstSeen: now.split(',')[0], status: 'Abierta'
    })
  }

  // VirusTotal malicious
  const malicious = modules.virustotal?.malicious_count || modules.virustotal?.stats?.malicious || 0
  if (malicious > 0) {
    vulns.push({
      id: `v_vt_${Date.now()}`, assetId,
      title: `VirusTotal: ${malicious} motores maliciosos`,
      severity: malicious >= 5 ? 'Crítica' : 'Alta',
      cvss: null, service: 'Reputación', port: null,
      description: `${malicious} motores de VirusTotal marcan ${target} como malicioso`,
      firstSeen: now.split(',')[0], status: 'Abierta'
    })
  }

  // SSL expiry
  const ssl = modules.ssl || {}
  if (ssl.days_until_expiry !== undefined && ssl.days_until_expiry < 30 && ssl.days_until_expiry >= 0) {
    vulns.push({
      id: `v_ssl_${Date.now()}`, assetId,
      title: `SSL expira en ${ssl.days_until_expiry} días`,
      severity: ssl.days_until_expiry < 7 ? 'Alta' : 'Media',
      cvss: null, service: 'HTTPS', port: 443,
      description: `El certificado SSL de ${target} vence en ${ssl.days_until_expiry} días`,
      firstSeen: now.split(',')[0], status: 'Abierta'
    })
  }

  // Breach credentials
  const breach = modules.breach_check || modules.email_enrichment?.breach || {}
  if (breach.pwned || breach.total > 0) {
    const count = breach.total || '?'
    creds.push({
      id: `cr_${Date.now()}`, source: 'HaveIBeenPwned',
      email: target.includes('@') ? target : `—@${target}`,
      domain: isIp ? target : target,
      passwordHash: '(hash oculto)',
      breachDate: now.split(',')[0],
      severity: 'Crítica', notified: false
    })
    changes.push({
      id: `ch_${Date.now()}`, asset: target,
      type: 'Credencial expuesta',
      description: `${count} brechas de datos encontradas para ${target}`,
      timestamp: now, severity: 'Crítica'
    })
  }

  // Subdomains found
  const subs = modules.subdomains?.total || modules.securitytrails_subs?.total || 0
  if (subs > 0) {
    changes.push({
      id: `ch_subs_${Date.now()}`, asset: target,
      type: 'Subdominios detectados',
      description: `${subs} subdominios encontrados mediante enumeración pasiva`,
      timestamp: now, severity: 'Media'
    })
  }

  // Risk score calculation
  const critCount = vulns.filter(v => v.severity === 'Crítica').length
  const highCount = vulns.filter(v => v.severity === 'Alta').length
  const riskScore = Math.min(100, critCount * 25 + highCount * 10 + (malicious > 0 ? 20 : 0) + (openPorts.length > 5 ? 10 : 0))

  const asset = {
    id: assetId, name: target, type: isIp ? 'ip' : 'domain',
    ip: resolvedIp || null,
    openPorts,
    vulnCount: {
      critical: vulns.filter(v => v.severity === 'Crítica').length,
      high:     vulns.filter(v => v.severity === 'Alta').length,
      medium:   vulns.filter(v => v.severity === 'Media').length,
      low:      vulns.filter(v => v.severity === 'Baja').length,
    },
    exposedCreds: creds.length,
    lastScan: now,
    riskScore,
  }

  return { asset, vulns, creds, changes }
}

const SEED_ASSETS = [
  { id:'a1', name:'corp.com',     type:'domain', ip:'172.65.193.189', openPorts:[80,443,22],        vulnCount:{critical:2,high:3,medium:5,low:8}, exposedCreds:67, lastScan:'Hace 2h',  riskScore:82 },
  { id:'a2', name:'api.corp.com', type:'domain', ip:'172.65.200.11',  openPorts:[443,8080,8443],      vulnCount:{critical:1,high:2,medium:3,low:4}, exposedCreds:12, lastScan:'Hace 4h',  riskScore:65 },
  { id:'a3', name:'mail.corp.com',type:'domain', ip:'172.65.201.5',   openPorts:[25,465,587,993,995], vulnCount:{critical:0,high:1,medium:2,low:6}, exposedCreds:34, lastScan:'Hace 8h',  riskScore:44 },
  { id:'a4', name:'vpn.corp.com', type:'domain', ip:'172.65.202.3',   openPorts:[443,1194,4500],      vulnCount:{critical:0,high:0,medium:1,low:2}, exposedCreds:0,  lastScan:'Hace 12h', riskScore:20 },
  { id:'a5', name:'172.65.193.50',type:'ip',                          openPorts:[3389,22,8080],        vulnCount:{critical:1,high:1,medium:0,low:3}, exposedCreds:0,  lastScan:'Ayer',     riskScore:58 },
]

const SEED_VULNS = [
  { id:'v1',assetId:'a1',title:'Apache Log4Shell',            severity:'Crítica',cve:'CVE-2021-44228',cvss:10.0,service:'HTTP',  port:80,  description:'Versión vulnerable de Log4j detectada. Permite RCE remoto.', firstSeen:'2026-04-10',status:'En revisión' },
  { id:'v2',assetId:'a1',title:'Credenciales por defecto CMS',severity:'Crítica',                    cvss:9.1, service:'HTTPS', port:443, description:'Panel CMS accesible con admin:admin. Acceso total al sitio.', firstSeen:'2026-04-12',status:'Abierta' },
  { id:'v3',assetId:'a1',title:'SSL/TLS obsoleto (TLS 1.0)',  severity:'Alta',   cve:'CVE-2014-3566',cvss:7.4, service:'HTTPS', port:443, description:'El servidor acepta TLS 1.0 y 1.1, susceptible a POODLE.', firstSeen:'2026-03-20',status:'Abierta' },
  { id:'v4',assetId:'a2',title:'SQL Injection en /search',    severity:'Crítica',                    cvss:9.8, service:'HTTPS', port:443, description:'Parámetro q no sanitizado. Permite extracción de toda la BBDD.', firstSeen:'2026-04-15',status:'Abierta' },
  { id:'v5',assetId:'a2',title:'Directory listing habilitado',severity:'Media',                      cvss:5.3, service:'HTTP',  port:8080,description:'El servidor expone listado en /backup y /logs.', firstSeen:'2026-04-01',status:'Abierta' },
  { id:'v6',assetId:'a3',title:'SMTP Open Relay',             severity:'Alta',                       cvss:7.5, service:'SMTP',  port:25,  description:'Servidor de correo como open relay. Permite spam/phishing.', firstSeen:'2026-03-15',status:'En revisión' },
  { id:'v7',assetId:'a5',title:'RDP expuesto a Internet',     severity:'Alta',   cve:'CVE-2019-0708',cvss:8.8, service:'RDP',  port:3389,description:'Puerto RDP accesible desde Internet. BlueKeep potencial.', firstSeen:'2026-04-08',status:'Abierta' },
]

const SEED_CREDS = [
  { id:'cr1',source:'DarkWeb Forum',  email:'admin@corp.com',      domain:'corp.com',    passwordHash:'5f4dcc3b5aa...',breachDate:'2025-11-15',severity:'Crítica',notified:true  },
  { id:'cr2',source:'Dehashed',       email:'j.garcia@corp.com',   domain:'corp.com',    passwordHash:'e10adc3949b...',breachDate:'2025-12-01',severity:'Crítica',notified:true  },
  { id:'cr3',source:'HaveIBeenPwned', email:'l.martinez@corp.com', domain:'corp.com',    passwordHash:'25d55ad283a...',breachDate:'2026-01-10',severity:'Alta',   notified:false },
  { id:'cr4',source:'Stealer Logs',   email:'c.lopez@corp.com',    domain:'corp.com',    passwordHash:'5f4dcc3b5aa...',breachDate:'2026-02-20',severity:'Crítica',notified:false },
  { id:'cr5',source:'Pastebin',       email:'p.sanchez@corp.com',  domain:'corp.com',    passwordHash:'827ccb0eea8...',breachDate:'2026-03-05',severity:'Media',  notified:false },
  { id:'cr7',source:'Dehashed',       email:'soporte@api.corp.com',domain:'api.corp.com',passwordHash:'d8578edf844...',breachDate:'2026-04-01',severity:'Alta',   notified:false },
]

const SEED_CHANGES = [
  { id:'ch1',asset:'corp.com',     type:'Nuevo puerto',         description:'Puerto 8080 detectado abierto',                    timestamp:'Hace 2h',   severity:'Alta'   },
  { id:'ch2',asset:'api.corp.com', type:'Certificado expirando',description:'Certificado SSL expira en 7 días',                 timestamp:'Hace 4h',   severity:'Media'  },
  { id:'ch3',asset:'corp.com',     type:'Nueva credencial',     description:'Nuevo email corporativo en breach database',       timestamp:'Hoy 09:15', severity:'Crítica'},
  { id:'ch4',asset:'mail.corp.com',type:'Cambio DNS',           description:'Registro MX modificado — verificar cambio',        timestamp:'Ayer',      severity:'Media'  },
  { id:'ch5',asset:'corp.com',     type:'Nueva subdomain',      description:'staging.corp.com detectado (sin certificado SSL)', timestamp:'Hace 2d',   severity:'Baja'   },
  { id:'ch6',asset:'172.65.193.50',type:'Nueva vulnerabilidad', description:'CVE-2019-0708 (BlueKeep) detectado en RDP 3389',   timestamp:'Hace 3d',   severity:'Alta'   },
]

const PORT_SERVICE = { 80:'HTTP',443:'HTTPS',22:'SSH',21:'FTP',25:'SMTP',3389:'RDP',8080:'HTTP-Alt',8443:'HTTPS-Alt',465:'SMTPS',587:'SMTP',993:'IMAPS',995:'POP3S',1194:'OpenVPN',4500:'IKE' }

const SEV_BADGE = {
  'Crítica': 'bg-red-900/40 text-red-400 border border-red-500/30',
  'Alta':    'bg-orange-900/30 text-orange-400 border border-orange-500/30',
  'Media':   'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30',
  'Baja':    'bg-blue-900/30 text-blue-400 border border-blue-500/30',
  'Info':    'bg-gray-700/30 text-gray-400 border border-gray-600/30',
}
const SEV_DOT = { 'Crítica':'bg-red-500','Alta':'bg-orange-500','Media':'bg-yellow-500','Baja':'bg-blue-400','Info':'bg-gray-500' }
const SEV_ORDER = { 'Crítica':0,'Alta':1,'Media':2,'Baja':3 }

function riskScoreCls(s) {
  if (s >= 80) return 'bg-red-900/30 text-red-400'
  if (s >= 60) return 'bg-orange-900/30 text-orange-400'
  if (s >= 40) return 'bg-yellow-900/30 text-yellow-400'
  return 'bg-green-900/30 text-green-400'
}

const DETAIL_TABS = ['overview','vulnerabilidades','credenciales','cambios']

export default function AttackSurface() {
  const [assets,  setAssets]  = useState(() => load(SK_ASSETS,  SEED_ASSETS))
  const [vulns,   setVulns]   = useState(() => load(SK_VULNS,   SEED_VULNS))
  const [creds,   setCreds]   = useState(() => load(SK_CREDS,   SEED_CREDS))
  const [changes, setChanges] = useState(() => load(SK_CHANGES, SEED_CHANGES))
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [scanning, setScanning]   = useState(false)
  const [scanningId, setScanningId] = useState(null)
  const [assetQuery, setAssetQuery] = useState('')
  const [detailTab, setDetailTab] = useState('overview')
  const [showAdd, setShowAdd] = useState(false)
  const [newTarget, setNewTarget] = useState('')

  // Persist to localStorage on every change
  useEffect(() => { try { localStorage.setItem(SK_ASSETS,  JSON.stringify(assets))  } catch {} }, [assets])
  useEffect(() => { try { localStorage.setItem(SK_VULNS,   JSON.stringify(vulns))   } catch {} }, [vulns])
  useEffect(() => { try { localStorage.setItem(SK_CREDS,   JSON.stringify(creds))   } catch {} }, [creds])
  useEffect(() => { try { localStorage.setItem(SK_CHANGES, JSON.stringify(changes)) } catch {} }, [changes])

  const filteredAssets = useMemo(() =>
    assets.filter(a => !assetQuery || a.name.includes(assetQuery) || (a.ip && a.ip.includes(assetQuery))),
    [assets, assetQuery]
  )

  const totalVulns    = vulns.length
  const totalCritical = vulns.filter(v => v.severity === 'Crítica').length
  const totalCreds    = creds.length
  const totalPorts    = assets.reduce((s, a) => s + a.openPorts.length, 0)

  const assetVulns   = selectedAsset ? [...vulns.filter(v => v.assetId === selectedAsset.id)].sort((a,b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]) : []
  const assetCreds   = selectedAsset ? creds.filter(c => c.domain === selectedAsset.name || c.domain === selectedAsset.ip) : []
  const assetChanges = selectedAsset ? changes.filter(c => c.asset === selectedAsset.name || c.asset === selectedAsset.ip) : []

  async function runScan(asset) {
    setScanningId(asset.id)
    try {
      const result = await api.post('/audit/full', { target: asset.name, auto_report: false }, { timeout: 180000 }).then(r => r.data)
      if (result.error) throw new Error(result.error)
      const { asset: updatedAsset, vulns: newVulns, creds: newCreds, changes: newChanges } = auditToSurface(asset.name, result)
      // Merge: keep id, update fields
      setAssets(prev => prev.map(a => a.id === asset.id ? { ...updatedAsset, id: asset.id } : a))
      setVulns(prev => [...prev.filter(v => v.assetId !== asset.id), ...newVulns.map(v => ({ ...v, assetId: asset.id }))])
      setCreds(prev => [...prev.filter(c => c.domain !== asset.name), ...newCreds])
      setChanges(prev => [...newChanges.map(c => ({ ...c, asset: asset.name })), ...prev].slice(0, 50))
      setSelectedAsset(a => a?.id === asset.id ? { ...updatedAsset, id: asset.id } : a)
    } catch (e) {
      alert('Error en scan: ' + (e.response?.data?.detail || e.message))
    } finally {
      setScanningId(null)
    }
  }

  async function addAndScan() {
    const target = newTarget.trim()
    if (!target) return
    setShowAdd(false); setNewTarget('')
    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(target)
    const tempAsset = {
      id: 'a' + Date.now(), name: target, type: isIp ? 'ip' : 'domain',
      ip: isIp ? target : null, openPorts: [],
      vulnCount: { critical:0, high:0, medium:0, low:0 },
      exposedCreds: 0, lastScan: 'Escaneando...', riskScore: 0,
    }
    setAssets(prev => [...prev, tempAsset])
    setSelectedAsset(tempAsset)
    await runScan(tempAsset)
  }

  function handleRefresh() {
    if (selectedAsset) runScan(selectedAsset)
    else { setScanning(true); setTimeout(() => setScanning(false), 1500) }
  }

  function deleteAsset(id) {
    setAssets(prev => prev.filter(a => a.id !== id))
    setVulns(prev => prev.filter(v => v.assetId !== id))
    if (selectedAsset?.id === id) setSelectedAsset(null)
  }

  function getVulnCount(asset, sev) {
    const m = { 'Crítica': asset.vulnCount.critical, 'Alta': asset.vulnCount.high, 'Media': asset.vulnCount.medium, 'Baja': asset.vulnCount.low }
    return m[sev] ?? 0
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <span className="text-crimson">🗺️</span> Attack Surface Monitor
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 font-mono">
            {assets.length} activos monitorizados ·{' '}
            <span className="text-red-400">{totalCritical} críticas</span> ·{' '}
            <span className="text-yellow-400">{creds.filter(c=>!c.notified).length} creds sin notificar</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} disabled={!!scanningId}
            className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-surface-border text-gray-400 hover:text-white hover:border-gray-500 transition-colors ${scanningId ? 'opacity-50' : ''}`}>
            <RefreshCw size={13} className={scanningId ? 'animate-spin' : ''} />
            {scanningId ? 'Escaneando...' : selectedAsset ? `Rescanear ${selectedAsset.name}` : 'Escanear'}
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-crimson hover:bg-crimson/80 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors">
            <Plus size={13} /> Añadir activo
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Vulnerabilidades', value:totalVulns,  sub:`${totalCritical} críticas`,    icon:AlertTriangle, iconCls:'text-red-400',    bg:'bg-red-900/20'    },
          { label:'Creds expuestas',  value:totalCreds,  sub:`${creds.filter(c=>!c.notified).length} sin notif`, icon:Lock, iconCls:'text-yellow-400', bg:'bg-yellow-900/20' },
          { label:'Puertos expuestos',value:totalPorts,  sub:`en ${assets.length} activos`,  icon:Server,        iconCls:'text-blue-400',   bg:'bg-blue-900/20'   },
          { label:'Cambios 24h',      value:changes.length, sub:`${changes.filter(c=>c.severity==='Crítica').length} críticos`, icon:Clock, iconCls:'text-crimson', bg:'bg-crimson/10' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-dark-300 border border-surface-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider">{kpi.label}</p>
              <p className="text-white text-2xl font-bold mt-1">{kpi.value}</p>
              <p className={`${kpi.iconCls} text-xs mt-1`}>{kpi.sub}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl ${kpi.bg} flex items-center justify-center`}>
              <kpi.icon size={20} className={kpi.iconCls} />
            </div>
          </div>
        ))}
      </div>

      {/* Asset list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Asset browser */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input value={assetQuery} onChange={e => setAssetQuery(e.target.value)}
              placeholder="Buscar activo..."
              className="w-full bg-dark-300 border border-surface-border rounded-lg pl-8 pr-3 py-2 text-gray-300 text-xs focus:outline-none focus:border-crimson/50 transition-colors" />
          </div>

          {filteredAssets.map(asset => (
            <div key={asset.id}
              className={`rounded-xl border p-4 transition-all duration-200 ${
                selectedAsset?.id === asset.id
                  ? 'border-crimson/50 bg-crimson/5'
                  : 'bg-dark-300 border-surface-border hover:border-gray-600'
              }`}>
              <button className="w-full text-left" onClick={() => { setSelectedAsset(asset); setDetailTab('overview') }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{asset.type === 'domain' ? '🌐' : '🖥️'}</span>
                    <div>
                      <p className="text-white text-xs font-semibold">{asset.name}</p>
                      {asset.ip && <p className="text-gray-500 text-[10px] font-mono">{asset.ip}</p>}
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${riskScoreCls(asset.riskScore)}`}>
                    {asset.riskScore}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-red-400">{asset.vulnCount.critical + asset.vulnCount.high} vuln</span>
                  <span className="text-yellow-400">{asset.exposedCreds} creds</span>
                  <span className="text-gray-500 ml-auto">{asset.lastScan}</span>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {asset.openPorts.slice(0,6).map(port => (
                    <span key={port} className="text-[9px] px-1.5 py-0.5 rounded bg-surface border border-surface-border text-gray-400 font-mono">{port}</span>
                  ))}
                </div>
              </button>
              <div className="flex gap-1 mt-2">
                <button onClick={() => runScan(asset)} disabled={!!scanningId}
                  className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] rounded-lg border border-surface-border text-gray-400 hover:text-crimson hover:border-crimson/40 transition-colors disabled:opacity-40">
                  {scanningId === asset.id ? <RefreshCw size={10} className="animate-spin" /> : <Zap size={10} />}
                  {scanningId === asset.id ? 'Escaneando...' : 'Scan'}
                </button>
                <button onClick={() => deleteAsset(asset.id)}
                  className="px-2 py-1 text-[10px] rounded-lg border border-surface-border text-gray-500 hover:text-red-400 hover:border-red-700/40 transition-colors">
                  <X size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selectedAsset ? (
          <div className="lg:col-span-2 animate-fade-in">
            {/* Sub-tabs */}
            <div className="flex gap-1 bg-dark-300 border border-surface-border rounded-xl p-1 mb-4">
              {DETAIL_TABS.map(t => (
                <button key={t} onClick={() => setDetailTab(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                    detailTab === t ? 'bg-crimson text-white' : 'text-gray-400 hover:text-white'
                  }`}>
                  {t}
                </button>
              ))}
            </div>

            {/* Overview */}
            {detailTab === 'overview' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-dark-300 border border-surface-border rounded-xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-white text-lg font-bold">{selectedAsset.name}</p>
                      {selectedAsset.ip && <p className="text-gray-500 text-xs font-mono mt-0.5">{selectedAsset.ip}</p>}
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-sm font-bold ${riskScoreCls(selectedAsset.riskScore)}`}>
                      Riesgo {selectedAsset.riskScore}/100
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {['Crítica','Alta','Media','Baja'].map(sev => (
                      <div key={sev} className={`rounded-xl p-3 border text-center ${
                        sev==='Crítica'?'bg-red-900/20 border-red-500/20':sev==='Alta'?'bg-orange-900/20 border-orange-500/20':sev==='Media'?'bg-yellow-900/20 border-yellow-500/20':'bg-blue-900/20 border-blue-500/20'
                      }`}>
                        <p className={`text-xl font-bold ${
                          sev==='Crítica'?'text-red-400':sev==='Alta'?'text-orange-400':sev==='Media'?'text-yellow-400':'text-blue-400'
                        }`}>{getVulnCount(selectedAsset, sev)}</p>
                        <p className="text-gray-500 text-[10px] mt-0.5">{sev}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-dark-300 border border-surface-border rounded-xl p-4">
                  <p className="text-white text-xs font-semibold mb-3">Puertos abiertos detectados</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAsset.openPorts.map(port => (
                      <div key={port} className="flex items-center gap-1.5 bg-surface border border-surface-border rounded-lg px-3 py-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-white text-xs font-mono">{port}</span>
                        <span className="text-gray-500 text-[10px]">{PORT_SERVICE[port] ?? 'unknown'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Vulnerabilidades */}
            {detailTab === 'vulnerabilidades' && (
              <div className="space-y-3 animate-fade-in">
                {assetVulns.map(v => (
                  <div key={v.id} className={`bg-dark-300 border-l-2 rounded-xl p-4 ${
                    v.severity==='Crítica'?'border-l-red-500':v.severity==='Alta'?'border-l-orange-500':v.severity==='Media'?'border-l-yellow-500':'border-l-blue-400'
                  } border border-surface-border`}>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-xs font-semibold">{v.title}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${SEV_BADGE[v.severity]}`}>{v.severity}</span>
                        {v.cvss && <span className="text-[10px] px-2 py-0.5 rounded-full border border-surface-border text-gray-400">CVSS {v.cvss}</span>}
                        {v.cve && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-500/20">{v.cve}</span>}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                        v.status==='Abierta'?'bg-red-900/30 text-red-400 border border-red-500/20':v.status==='En revisión'?'bg-yellow-900/30 text-yellow-400 border border-yellow-500/20':'bg-green-900/30 text-green-400 border border-green-500/20'
                      }`}>{v.status}</span>
                    </div>
                    <p className="text-gray-400 text-[11px]">{v.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                      <span>Servicio: <span className="text-gray-300">{v.service}</span></span>
                      {v.port && <span>Puerto: <span className="text-gray-300 font-mono">{v.port}</span></span>}
                      <span>Detectado: <span className="text-gray-300">{v.firstSeen}</span></span>
                    </div>
                  </div>
                ))}
                {assetVulns.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <CheckCircle size={32} className="text-green-400 mb-2" />
                    <p className="text-sm">Sin vulnerabilidades conocidas</p>
                  </div>
                )}
              </div>
            )}

            {/* Credenciales */}
            {detailTab === 'credenciales' && (
              <div className="bg-dark-300 border border-surface-border rounded-xl overflow-hidden animate-fade-in">
                {assetCreds.map(c => (
                  <div key={c.id} className="flex items-start gap-4 p-4 border-b border-surface-border hover:bg-surface/20 transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SEV_DOT[c.severity] ?? 'bg-gray-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold">{c.email}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-gray-500">
                        <span>Fuente: <span className="text-gray-300">{c.source}</span></span>
                        <span>Brecha: <span className="text-gray-300 font-mono">{c.breachDate}</span></span>
                        <span className="font-mono">Hash: {c.passwordHash}...</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${SEV_BADGE[c.severity]}`}>{c.severity}</span>
                      {c.notified
                        ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-500/20">Notificado</span>
                        : <button onClick={() => setCreds(cs => cs.map(x => x.id === c.id ? {...x, notified: true} : x))}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-900/50 cursor-pointer">
                            Notificar
                          </button>
                      }
                    </div>
                  </div>
                ))}
                {assetCreds.length === 0 && (
                  <div className="flex items-center justify-center h-24 text-gray-500 text-sm">
                    Sin credenciales expuestas detectadas
                  </div>
                )}
              </div>
            )}

            {/* Cambios */}
            {detailTab === 'cambios' && (
              <div className="space-y-2 animate-fade-in">
                {assetChanges.map(ch => (
                  <div key={ch.id} className="bg-dark-300 border border-surface-border rounded-xl p-4 flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${SEV_DOT[ch.severity] ?? 'bg-gray-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded border border-surface-border text-gray-400">{ch.type}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${SEV_BADGE[ch.severity]}`}>{ch.severity}</span>
                      </div>
                      <p className="text-white text-xs mt-1.5">{ch.description}</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">{ch.timestamp}</p>
                    </div>
                  </div>
                ))}
                {assetChanges.length === 0 && (
                  <div className="flex items-center justify-center h-24 text-gray-500 text-sm">
                    Sin cambios registrados para este activo
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <span className="text-5xl">🗺️</span>
              <p className="text-sm mt-3">Selecciona un activo para ver sus detalles</p>
            </div>
          </div>
        )}
      </div>

      {/* Add asset modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-300 border border-surface-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-sm">Añadir activo a monitorizar</h2>
              <button onClick={() => { setShowAdd(false); setNewTarget('') }}
                className="text-gray-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-gray-400 text-xs mb-4">
              Introduce un dominio (<span className="text-gray-300 font-mono">corp.com</span>) o IP (<span className="text-gray-300 font-mono">1.2.3.4</span>). Se lanzará un escaneo completo automáticamente.
            </p>
            <input
              autoFocus
              value={newTarget}
              onChange={e => setNewTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAndScan()}
              placeholder="dominio.com o 192.168.1.1"
              className="w-full bg-dark-200 border border-surface-border rounded-lg px-4 py-2.5 text-gray-200 text-sm font-mono focus:outline-none focus:border-crimson/50 transition-colors mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowAdd(false); setNewTarget('') }}
                className="flex-1 py-2 text-xs rounded-lg border border-surface-border text-gray-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={addAndScan} disabled={!newTarget.trim()}
                className="flex-1 py-2 text-xs rounded-lg bg-crimson hover:bg-crimson/80 text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-40">
                <Zap size={12} /> Añadir y escanear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
