import { useState, useEffect, useCallback } from 'react'
import { settings, auth } from '../api/client'
import Spinner from '../components/Spinner'
import {
  Settings, Key, User, Server, Save, CheckCircle,
  XCircle, Eye, EyeOff, TestTube, AlertTriangle, Terminal, Mail, Webhook, Copy, Lock, Unlock, ShieldCheck,
  UserCheck, UserX, Trash2, RefreshCw, Users
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const API_GROUPS = [
  {
    label: 'IA y Análisis',
    color: 'text-purple-400',
    fields: [
      { key: 'gemini', label: 'Gemini API Key', desc: 'Google AI — Gemini Flash. IA del terminal, análisis OSINT y reportes.', required: true, free: 'Gratis (2M tokens/mes)', link: 'https://aistudio.google.com/app/apikey' },
    ]
  },
  {
    label: 'OSINT & Reputación',
    color: 'text-blue-400',
    fields: [
      { key: 'shodan', label: 'Shodan API Key', desc: 'Puertos, servicios, CVEs de IPs expuestas en Internet.', free: '$49/año o freemium', link: 'https://account.shodan.io/' },
      { key: 'virustotal', label: 'VirusTotal API Key', desc: 'Reputación de dominios, IPs, URLs y archivos.', free: 'Gratis (500 req/día)', link: 'https://www.virustotal.com/gui/my-apikey' },
      { key: 'censys_id', label: 'Censys API ID', desc: 'Motor de búsqueda de dispositivos expuestos.', free: 'Gratis (250 req/mes)', link: 'https://search.censys.io/account/api' },
      { key: 'censys_secret', label: 'Censys API Secret', desc: 'Secreto del API de Censys (junto con el ID).', free: null, link: null },
      { key: 'securitytrails', label: 'SecurityTrails API Key', desc: 'Historial DNS, WHOIS histórico, subdominios.', free: 'Gratis (50 req/mes)', link: 'https://app.securitytrails.com/app/account' },
      { key: 'urlscan', label: 'URLScan.io API Key', desc: 'Análisis de URLs, screenshots, DOM scraping.', free: 'Gratis (5000 scans/mes)', link: 'https://urlscan.io/user/profile/' },
      { key: 'c99', label: 'C99.nl API Key', desc: 'Subdominios, reverse IP, phone lookup, port scanner.', free: 'De pago (~$12/mes)', link: 'https://api.c99.nl/' },
    ]
  },
  {
    label: 'Brechas & Leaks',
    color: 'text-red-400',
    fields: [
      { key: 'hibp', label: 'Have I Been Pwned Key', desc: 'Detecta si emails han aparecido en brechas de datos conocidas.', free: '~$3.50/mes', link: 'https://haveibeenpwned.com/API/Key' },
      { key: 'dehashed_email', label: 'DeHashed Email (login)', desc: 'Tu email de cuenta en DeHashed para autenticación.', free: null, link: 'https://dehashed.com/' },
      { key: 'dehashed', label: 'DeHashed API Key', desc: 'Base de datos de credenciales y datos filtrados. Búsqueda por email, usuario, IP...', free: 'De pago', link: 'https://dehashed.com/profile' },
      { key: 'leakradar', label: 'LeakRadar API Key', desc: 'Monitorización de filtraciones de datos en tiempo real.', free: 'Freemium', link: 'https://leakradar.io/' },
      { key: 'abuseipdb', label: 'AbuseIPDB API Key', desc: 'Reputación e historial de abuso de IPs.', free: 'Gratis (1000 req/día)', link: 'https://www.abuseipdb.com/account/api' },
    ]
  },
  {
    label: 'Email & Contacto',
    color: 'text-green-400',
    fields: [
      { key: 'hunter', label: 'Hunter.io API Key', desc: 'Descubrimiento de emails corporativos de un dominio.', free: 'Gratis (25 req/mes)', link: 'https://hunter.io/api-keys' },
    ]
  },
  {
    label: 'Prospector de Empresas',
    color: 'text-emerald-400',
    fields: [
      { key: 'google_places', label: 'Google Places API Key', desc: 'Busca empresas por ubicación y radio. Sin key usa OpenStreetMap (gratis pero menos datos).', free: '$200 créditos gratis/mes', link: 'https://console.cloud.google.com/apis/library/places-backend.googleapis.com' },
    ]
  },
]

// Backward compat — flatten for save logic
const API_FIELDS = API_GROUPS.flatMap(g => g.fields)

export default function Configuracion() {
  const [cfg, setCfg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const [showKeys, setShowKeys] = useState({})
  const [localApis, setLocalApis] = useState({})
  const [auditor, setAuditor] = useState({})
  const [kali, setKali] = useState({})
  const [nmap_path, setNmapPath] = useState('nmap')
  const [smtp, setSmtp] = useState({ enabled: false, email: '', password: '', host: 'smtp.gmail.com', port: 587, to: '' })
  const [smtpTest, setSmtpTest] = useState(null)
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [copiedWebhook, setCopiedWebhook]   = useState(false)
  const [newPassword,   setNewPassword]     = useState('')
  const [pwSaved,       setPwSaved]         = useState(false)
  // Admin PIN gate for API keys
  const [adminUnlocked, setAdminUnlocked]   = useState(() => sessionStorage.getItem('bdevops_admin') === 'yes')
  const [adminPin,      setAdminPin]        = useState('')
  const [pinError,      setPinError]        = useState('')
  const [pinLoading,    setPinLoading]      = useState(false)
  const { token } = useAuth()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await settings.get()
      setCfg(data)
      setLocalApis(data.apis || {})
      setAuditor(data.auditor || {})
      setKali(data.kali_ssh || {})
      setNmapPath(data.nmap_path || 'nmap')
      if (data.smtp) setSmtp(s => ({ ...s, ...data.smtp }))
    } catch {
      // Backend not running
    } finally {
      setLoading(false)
    }
  }

  const saveAll = async () => {
    setSaving(true)
    setSaved(false)
    setSaveError('')
    try {
      await settings.updateApis(localApis)
      await settings.updateAuditor(auditor)
      await settings.updateKali(kali)
      await settings.update({ nmap_path })
      await settings.updateSmtp(smtp)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      const status = e?.response?.status
      if (status === 403) {
        setSaveError('Se requiere rol admin para guardar la configuración.')
      } else {
        setSaveError(e?.response?.data?.detail || e.message || 'Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  const testSmtp = async () => {
    setTestingSmtp(true)
    setSmtpTest(null)
    try {
      await settings.updateSmtp(smtp)
      const res = await settings.testSmtp()
      setSmtpTest(res)
    } catch (e) {
      setSmtpTest({ status: 'error', message: e.message })
    } finally {
      setTestingSmtp(false)
    }
  }

  const testKali = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await settings.testKali()
      setTestResult(res)
    } catch (e) {
      setTestResult({ status: 'error', message: e.message })
    } finally {
      setTesting(false)
    }
  }

  const verifyAdminPin = async (e) => {
    e.preventDefault()
    if (!adminPin.trim() || pinLoading) return
    setPinLoading(true); setPinError('')
    try {
      await auth.verifyAdmin(adminPin.trim())
      sessionStorage.setItem('bdevops_admin', 'yes')
      setAdminUnlocked(true); setAdminPin('')
    } catch (err) {
      setPinError(err.response?.data?.detail || 'PIN incorrecto')
    } finally { setPinLoading(false) }
  }

  const lockAdmin = () => {
    sessionStorage.removeItem('bdevops_admin')
    setAdminUnlocked(false)
    setAdminPin('')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={32} />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
      {/* Save button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-gray-400" />
          <span className="text-white font-bold text-lg">Configuración Master</span>
        </div>
        <button className="btn-primary" onClick={saveAll} disabled={saving}>
          {saving ? <Spinner size={16} /> : saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar Todo'}
        </button>
      </div>
      {saveError && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertTriangle size={14} className="shrink-0" />
          {saveError}
          <button onClick={() => setSaveError('')} className="ml-auto text-red-500 hover:text-red-300"><XCircle size={13}/></button>
        </div>
      )}

      {/* Auditor info */}
      <div className="card border-blue-700/30">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-blue-400" />
          <span className="text-blue-400 font-semibold">Datos del Auditor</span>
          <span className="text-gray-500 text-xs">— aparecerán en los reportes</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'name', label: 'Nombre completo', placeholder: 'César Matute García' },
            { key: 'company', label: 'Empresa / Organización', placeholder: 'CAAM Security S.L.' },
            { key: 'email', label: 'Email', placeholder: 'auditor@empresa.com' },
            { key: 'jurisdiction', label: 'Jurisdicción', placeholder: 'COBERTURA GLOBAL' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-gray-400 text-xs mb-1.5 block">{f.label}</label>
              <input
                className="input-dark"
                placeholder={f.placeholder}
                value={auditor[f.key] || ''}
                onChange={e => setAuditor(a => ({ ...a, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* API Keys — protected by admin PIN */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-crimson" />
            <span className="text-crimson font-semibold">API Keys</span>
            <span className="text-gray-500 text-xs">— protegidas por PIN de administrador</span>
          </div>
          {adminUnlocked && (
            <button onClick={lockAdmin} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors">
              <Lock size={12} /> Bloquear
            </button>
          )}
        </div>

        {/* PIN gate */}
        {!adminUnlocked ? (
          <div className="card border-yellow-700/30 flex flex-col items-center py-10 gap-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-yellow-900/30 border border-yellow-600/30 flex items-center justify-center">
                <Lock size={22} className="text-yellow-400" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Sección protegida</div>
                <div className="text-gray-500 text-xs mt-0.5">Introduce el PIN de administrador para ver y editar las API keys</div>
              </div>
            </div>
            <form onSubmit={verifyAdminPin} className="flex gap-2 w-full max-w-xs">
              <input
                type="password"
                value={adminPin}
                onChange={e => { setAdminPin(e.target.value); setPinError('') }}
                placeholder="PIN admin..."
                autoFocus
                className="input-dark flex-1 text-center tracking-widest"
                style={{ letterSpacing: '0.3em' }}
              />
              <button type="submit" disabled={!adminPin.trim() || pinLoading} className="btn-primary px-4">
                {pinLoading ? <Spinner size={14} /> : <Unlock size={14} />}
              </button>
            </form>
            {pinError && <p className="text-red-400 text-xs">{pinError}</p>}
            <p className="text-gray-600 text-xs">Introduce el PIN de administrador que configuraste</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-900/20 border border-green-700/30 text-green-400 text-xs">
            <ShieldCheck size={13} /> Admin verificado — API keys desbloqueadas (se bloquean al cerrar la pestaña)
          </div>
        )}

        {adminUnlocked && API_GROUPS.map(group => (
          <div key={group.label} className="card border-surface-border/60">
            <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${group.color}`}>{group.label}</p>
            <div className="space-y-4">
              {group.fields.map(field => (
                <div key={field.key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-300 text-sm font-medium">
                      {field.label}
                      {field.required && <span className="text-crimson ml-1">*</span>}
                      {field.free && <span className="text-gray-500 text-xs ml-2">· {field.free}</span>}
                    </label>
                    {field.link && (
                      <a href={field.link} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 text-xs hover:underline">
                        Obtener →
                      </a>
                    )}
                  </div>
                  <p className="text-gray-600 text-xs mb-2">{field.desc}</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        className="input-dark pr-10"
                        type={showKeys[field.key] ? 'text' : 'password'}
                        placeholder={`API key de ${field.label.split(' ')[0]}...`}
                        value={localApis[field.key] || ''}
                        onChange={e => setLocalApis(a => ({ ...a, [field.key]: e.target.value }))}
                      />
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        onClick={() => setShowKeys(s => ({ ...s, [field.key]: !s[field.key] }))}
                      >
                        {showKeys[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {localApis[field.key] && (
                      <div className="flex items-center">
                        <CheckCircle size={16} className="text-green-400" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Nmap path */}
      <div className="card border-orange-700/30">
        <div className="flex items-center gap-2 mb-4">
          <Terminal size={16} className="text-orange-400" />
          <span className="text-orange-400 font-semibold">Herramientas Locales</span>
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1.5 block">
            Ruta de nmap (Windows — ej: C:\Program Files (x86)\Nmap\nmap.exe)
          </label>
          <input
            className="input-dark font-mono"
            placeholder="nmap"
            value={nmap_path}
            onChange={e => setNmapPath(e.target.value)}
          />
          <p className="text-gray-600 text-xs mt-1">
            Deja "nmap" si está en el PATH del sistema. Descarga: nmap.org/download.html
          </p>
        </div>
      </div>

      {/* Kali SSH */}
      <div className="card border-green-700/30">
        <div className="flex items-center gap-2 mb-4">
          <Server size={16} className="text-green-400" />
          <span className="text-green-400 font-semibold">Kali Linux VM — Conexión SSH</span>
        </div>

        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={kali.enabled || false}
            onChange={e => setKali(k => ({ ...k, enabled: e.target.checked }))}
            className="accent-green-400"
          />
          <span className="text-gray-300 text-sm">Habilitar conexión SSH a Kali Linux</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'host', label: 'IP / Host de la VM', placeholder: '192.168.1.x o 127.0.0.1' },
            { key: 'port', label: 'Puerto SSH', placeholder: '22' },
            { key: 'user', label: 'Usuario', placeholder: 'kali' },
            { key: 'password', label: 'Contraseña', placeholder: 'kali', type: 'password' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-gray-400 text-xs mb-1.5 block">{f.label}</label>
              <input
                className="input-dark"
                type={f.type || 'text'}
                placeholder={f.placeholder}
                value={kali[f.key] || ''}
                onChange={e => setKali(k => ({ ...k, [f.key]: e.target.value }))}
                disabled={!kali.enabled}
              />
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="text-gray-400 text-xs mb-1.5 block">
            Ruta clave SSH privada (opcional — alternativa a contraseña)
          </label>
          <input
            className="input-dark font-mono"
            placeholder="C:\Users\usuario\.ssh\id_rsa"
            value={kali.key_path || ''}
            onChange={e => setKali(k => ({ ...k, key_path: e.target.value }))}
            disabled={!kali.enabled}
          />
        </div>

        <div className="flex gap-3 mt-4">
          <button
            className="btn-secondary"
            onClick={testKali}
            disabled={testing || !kali.enabled}
          >
            {testing ? <Spinner size={14} /> : <TestTube size={14} />}
            {testing ? 'Probando...' : 'Probar Conexión'}
          </button>
          {testResult && (
            <div className={`flex items-center gap-2 text-sm ${testResult.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
              {testResult.status === 'ok'
                ? <><CheckCircle size={14} /> Conectado correctamente</>
                : <><XCircle size={14} /> {testResult.message}</>}
            </div>
          )}
        </div>

        {testResult?.output && (
          <pre className="mt-3 p-3 bg-black/40 rounded-lg text-green-400 font-mono text-xs">
            {testResult.output}
          </pre>
        )}
      </div>

      {/* n8n Webhook */}
      <div className="card border-orange-700/30">
        <div className="flex items-center gap-2 mb-4">
          <Webhook size={16} className="text-orange-400" />
          <span className="text-orange-400 font-semibold">Automatización n8n / Zapier</span>
          <span className="text-gray-500 text-xs">— webhook para disparar auditorías automáticas</span>
        </div>
        <p className="text-gray-400 text-xs mb-3">
          Apunta n8n al siguiente endpoint <strong className="text-white">POST</strong> para lanzar una auditoría completa y recibir el resultado (incluyendo el DOCX si SMTP está habilitado):
        </p>
        {[
          { label: 'Endpoint webhook', value: 'https://api.bdev.qzz.io/api/audit/webhook' },
          { label: 'Body JSON de ejemplo', value: '{ "target": "dominio.com", "auto_report": true, "callback_url": "https://tu-n8n/webhook/resultado" }' },
        ].map(({ label, value }) => (
          <div key={label} className="mb-3">
            <p className="text-gray-500 text-xs mb-1">{label}</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 bg-dark-100 border border-surface-border rounded-lg px-3 py-2 text-green-400 text-xs font-mono break-all">{value}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(value); setCopiedWebhook(true); setTimeout(() => setCopiedWebhook(false), 2000) }}
                className="shrink-0 p-2 rounded-lg border border-surface-border text-gray-400 hover:text-white transition-colors"
              >
                {copiedWebhook ? <CheckCircle size={13} className="text-green-400" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        ))}
        <div className="mt-2 p-3 bg-dark-100 rounded-lg text-xs text-gray-500 border border-surface-border">
          <p className="mb-1"><strong className="text-gray-300">Campos del body:</strong></p>
          <p>· <code className="text-orange-300">target</code> — dominio, email, IP, teléfono o username</p>
          <p>· <code className="text-orange-300">auto_report</code> — genera DOCX automáticamente (default: true)</p>
          <p>· <code className="text-orange-300">callback_url</code> — opcional, n8n recibirá el resultado completo aquí</p>
        </div>
      </div>

      {/* SMTP Email */}
      <div className="card border-blue-700/30">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={16} className="text-blue-400" />
          <span className="text-blue-400 font-semibold">Email Automático — SMTP</span>
          <span className="text-gray-500 text-xs">— envía el informe DOCX al completar cada auditoría</span>
        </div>

        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={smtp.enabled || false}
            onChange={e => setSmtp(s => ({ ...s, enabled: e.target.checked }))}
            className="accent-blue-400"
          />
          <span className="text-gray-300 text-sm">Habilitar envío automático de reportes por email</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'email', label: 'Gmail de envío', placeholder: 'tumail@gmail.com', type: 'text' },
            { key: 'password', label: 'Contraseña de aplicación', placeholder: 'xxxx xxxx xxxx xxxx', type: 'password' },
            { key: 'to', label: 'Destinatario (recibe los informes)', placeholder: 'cliente@empresa.com', type: 'text' },
            { key: 'host', label: 'SMTP Host', placeholder: 'smtp.gmail.com', type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-gray-400 text-xs mb-1.5 block">{f.label}</label>
              <input
                className="input-dark"
                type={f.type}
                placeholder={f.placeholder}
                value={smtp[f.key] || ''}
                onChange={e => setSmtp(s => ({ ...s, [f.key]: e.target.value }))}
                disabled={!smtp.enabled}
              />
            </div>
          ))}
        </div>

        <p className="text-gray-600 text-xs mt-3">
          Gmail requiere una <strong className="text-gray-400">contraseña de aplicación</strong> (no la contraseña normal).
          Actívala en: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">myaccount.google.com/apppasswords</a>
        </p>

        <div className="flex gap-3 mt-4 items-center">
          <button className="btn-secondary" onClick={testSmtp} disabled={testingSmtp || !smtp.enabled}>
            {testingSmtp ? <Spinner size={14} /> : <TestTube size={14} />}
            {testingSmtp ? 'Probando...' : 'Probar conexión'}
          </button>
          {smtpTest && (
            <div className={`flex items-center gap-2 text-sm ${smtpTest.status === 'ok' ? 'text-green-400' : smtpTest.status === 'disabled' ? 'text-yellow-400' : 'text-red-400'}`}>
              {smtpTest.status === 'ok'
                ? <><CheckCircle size={14} /> {smtpTest.message}</>
                : <><XCircle size={14} /> {smtpTest.message}</>}
            </div>
          )}
        </div>
      </div>

      {/* Change password */}
      <div className="card border-gray-700/30">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-gray-400" />
          <span className="text-gray-300 font-semibold">Contraseña de acceso</span>
          <span className="text-gray-500 text-xs">— protege el acceso a DEVOPS</span>
        </div>
        <div className="flex gap-3">
          <input
            type="password"
            className="input-dark flex-1"
            placeholder="Nueva contraseña (mín. 6 caracteres)..."
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <button
            className="btn-secondary"
            disabled={newPassword.length < 6 || pwSaved}
            onClick={async () => {
              try {
                await import('../api/client').then(m => m.default.post('/auth/change-password', { new_password: newPassword }))
                setPwSaved(true); setNewPassword('')
                setTimeout(() => setPwSaved(false), 3000)
              } catch (e) { alert('Error: ' + (e.response?.data?.detail || e.message)) }
            }}
          >
            {pwSaved ? <><CheckCircle size={14} /> Guardada</> : <><Save size={14} /> Cambiar</>}
          </button>
        </div>
        <p className="text-gray-600 text-xs mt-2">Contraseña de acceso (se almacena en config.json / variable de entorno, fuera del repositorio)</p>
      </div>

      {/* Change Admin PIN */}
      {adminUnlocked && <AdminPinChanger auth={auth} />}

      {/* User Management */}
      {adminUnlocked && <UserManager />}

      {/* Legal notice */}
      <div className="p-4 rounded-lg bg-red-900/10 border border-red-700/30 flex gap-3">
        <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
        <p className="text-red-300/80 text-xs leading-relaxed">
          <strong>Aviso legal:</strong> Las API keys y configuraciones se almacenan en un archivo local (config.json)
          en tu máquina. No se transmiten a ningún servidor externo más que a las APIs configuradas.
          El uso de esta herramienta implica la aceptación de las condiciones de uso de cada servicio integrado.
          Solo usa DEVOPS en sistemas sobre los que tienes autorización explícita.
        </p>
      </div>

      {/* Save bottom */}
      <div className="flex justify-end pb-6">
        <button className="btn-primary px-8 py-3" onClick={saveAll} disabled={saving}>
          {saving ? <Spinner size={16} /> : saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saving ? 'Guardando...' : saved ? '¡Configuración guardada!' : 'Guardar Configuración'}
        </button>
      </div>
    </div>
  )
}

function AdminPinChanger({ auth }) {
  const [current, setCurrent] = useState('')
  const [next,    setNext]    = useState('')
  const [msg,     setMsg]     = useState(null)
  const [busy,    setBusy]    = useState(false)

  const change = async (e) => {
    e.preventDefault()
    if (!current || next.length < 4 || busy) return
    setBusy(true); setMsg(null)
    try {
      await auth.changeAdminPin(current, next)
      setMsg({ ok: true, text: 'PIN actualizado correctamente' })
      setCurrent(''); setNext('')
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.detail || 'Error al cambiar PIN' })
    } finally { setBusy(false) }
  }

  return (
    <div className="card border-yellow-700/30">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={16} className="text-yellow-400" />
        <span className="text-yellow-300 font-semibold">PIN de Administrador</span>
        <span className="text-gray-500 text-xs">— protege las API keys</span>
      </div>
      <form onSubmit={change} className="flex gap-3 flex-wrap">
        <input type="password" className="input-dark flex-1" placeholder="PIN actual" value={current} onChange={e => { setCurrent(e.target.value); setMsg(null) }} />
        <input type="password" className="input-dark flex-1" placeholder="Nuevo PIN (mín. 4 chars)" value={next} onChange={e => { setNext(e.target.value); setMsg(null) }} />
        <button type="submit" disabled={!current || next.length < 4 || busy} className="btn-secondary">
          {busy ? <Spinner size={14} /> : <Save size={14} />} Cambiar PIN
        </button>
      </form>
      {msg && <p className={`text-xs mt-2 ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>}
    </div>
  )
}

// ── User Management ─────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  pending:  { label: 'Pendiente', cls: 'text-yellow-300 bg-yellow-900/30 border-yellow-700/30' },
  approved: { label: 'Aprobado',  cls: 'text-green-300 bg-green-900/30 border-green-700/30' },
  rejected: { label: 'Rechazado', cls: 'text-red-300 bg-red-900/30 border-red-700/30' },
}

function UserManager() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(false)
  const [busy,    setBusy]    = useState({})
  const [msg,     setMsg]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await auth.listUsers()
      setUsers(data.users || [])
    } catch (e) {
      setMsg({ ok: false, text: 'No se pudo cargar: ' + (e.response?.data?.detail || e.message) })
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (userId, action) => {
    setBusy(b => ({ ...b, [userId]: true }))
    try {
      if (action === 'approve') await auth.approveUser(userId)
      else if (action === 'reject') await auth.rejectUser(userId)
      else if (action === 'delete') await auth.deleteUser(userId)
      await load()
      setMsg({ ok: true, text: action === 'approve' ? 'Usuario aprobado' : action === 'reject' ? 'Usuario rechazado' : 'Usuario eliminado' })
      setTimeout(() => setMsg(null), 3000)
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.detail || 'Error al realizar acción' })
    } finally { setBusy(b => ({ ...b, [userId]: false })) }
  }

  const pending  = users.filter(u => u.status === 'pending')
  const approved = users.filter(u => u.status === 'approved')
  const rejected = users.filter(u => u.status === 'rejected')

  return (
    <div className="card border-purple-700/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-purple-400" />
          <span className="text-purple-300 font-semibold">Gestión de Usuarios</span>
          <span className="text-gray-500 text-xs">— registro y aprobación de accesos</span>
        </div>
        <button onClick={load} disabled={loading} className="p-1.5 rounded-lg border border-surface-border text-gray-400 hover:text-white transition-colors">
          {loading ? <Spinner size={13} /> : <RefreshCw size={13} />}
        </button>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-xs ${msg.ok ? 'bg-green-900/20 border border-green-700/30 text-green-300' : 'bg-red-900/20 border border-red-700/30 text-red-300'}`}>
          {msg.ok ? <CheckCircle size={13}/> : <AlertTriangle size={13}/>} {msg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Pendientes', count: pending.length,  color: 'text-yellow-400', border: 'border-yellow-700/30', bg: 'bg-yellow-900/10' },
          { label: 'Aprobados',  count: approved.length, color: 'text-green-400',  border: 'border-green-700/30',  bg: 'bg-green-900/10' },
          { label: 'Rechazados', count: rejected.length, color: 'text-red-400',    border: 'border-red-700/30',    bg: 'bg-red-900/10' },
        ].map(s => (
          <div key={s.label} className={`rounded-lg border ${s.border} ${s.bg} px-3 py-2 text-center`}>
            <div className={`font-bold text-lg ${s.color}`}>{s.count}</div>
            <div className="text-gray-500 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {users.length === 0 && !loading && (
        <p className="text-gray-600 text-sm text-center py-6">No hay usuarios registrados aún</p>
      )}

      {users.length > 0 && (
        <div className="space-y-2">
          {users.map(u => {
            const st = STATUS_STYLE[u.status] || STATUS_STYLE.pending
            const isBusy = busy[u.id]
            return (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-dark-100 border border-surface-border/40">
                <div className="w-8 h-8 rounded-full bg-purple-900/40 border border-purple-700/30 flex items-center justify-center shrink-0">
                  <User size={14} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">{u.username}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${st.cls}`}>{st.label}</span>
                    <span className="text-gray-600 text-xs">{u.role}</span>
                  </div>
                  <div className="text-gray-500 text-xs truncate">{u.email}</div>
                  <div className="text-gray-600 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES') : ''}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {u.status === 'pending' && (
                    <>
                      <button
                        onClick={() => act(u.id, 'approve')} disabled={isBusy}
                        title="Aprobar"
                        className="p-1.5 rounded-lg bg-green-900/20 border border-green-700/30 text-green-400 hover:bg-green-900/40 transition-colors disabled:opacity-50"
                      >
                        {isBusy ? <Spinner size={12} /> : <UserCheck size={12} />}
                      </button>
                      <button
                        onClick={() => act(u.id, 'reject')} disabled={isBusy}
                        title="Rechazar"
                        className="p-1.5 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 hover:bg-red-900/40 transition-colors disabled:opacity-50"
                      >
                        {isBusy ? <Spinner size={12} /> : <UserX size={12} />}
                      </button>
                    </>
                  )}
                  {u.status === 'rejected' && (
                    <button
                      onClick={() => act(u.id, 'approve')} disabled={isBusy}
                      title="Aprobar igualmente"
                      className="p-1.5 rounded-lg bg-green-900/20 border border-green-700/30 text-green-400 hover:bg-green-900/40 transition-colors disabled:opacity-50"
                    >
                      {isBusy ? <Spinner size={12} /> : <UserCheck size={12} />}
                    </button>
                  )}
                  <button
                    onClick={() => { if (window.confirm(`Eliminar usuario "${u.username}"?`)) act(u.id, 'delete') }} disabled={isBusy}
                    title="Eliminar"
                    className="p-1.5 rounded-lg bg-gray-900/40 border border-gray-700/30 text-gray-500 hover:text-red-400 hover:border-red-700/30 transition-colors disabled:opacity-50"
                  >
                    {isBusy ? <Spinner size={12} /> : <Trash2 size={12} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-gray-700 text-xs mt-3">
        Los usuarios se registran desde la pantalla de inicio. Los pendientes reciben email al ser aprobados (si SMTP está configurado).
      </p>
    </div>
  )
}
