import { useState, useEffect, useRef } from 'react'
import { tempmail } from '../api/client'
import Spinner from '../components/Spinner'
import {
  Mail, RefreshCw, Copy, Trash2, Plus, Clock, Inbox,
  ChevronRight, CheckCircle, AlertTriangle, Eye, Zap
} from 'lucide-react'

export default function TempMail() {
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState('default')
  const [currentEmail, setCurrentEmail] = useState(null)
  const [inbox, setInbox] = useState(null)
  const [selectedMsg, setSelectedMsg] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [domains, setDomains] = useState([])
  const [customAlias, setCustomAlias] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [newSessionId, setNewSessionId] = useState('')
  const [copied, setCopied] = useState(false)
  const autoRefreshRef = useRef(null)

  useEffect(() => {
    tempmail.domains().then(d => setDomains(d.domains || [])).catch(() => {})
    loadSessions()
    return () => clearInterval(autoRefreshRef.current)
  }, [])

  useEffect(() => {
    if (currentEmail) {
      refreshInbox()
      // Auto-refresh every 5 seconds
      clearInterval(autoRefreshRef.current)
      autoRefreshRef.current = setInterval(refreshInbox, 5000)
    }
    return () => clearInterval(autoRefreshRef.current)
  }, [currentEmail, activeSession])

  const loadSessions = async () => {
    const res = await tempmail.sessions().catch(() => ({ sessions: [] }))
    setSessions(res.sessions || [])
    if (res.sessions?.length > 0 && !currentEmail) {
      const s = res.sessions[0]
      setActiveSession(s.session_id)
      setCurrentEmail({ email: s.email, login: s.login, domain: s.domain })
    }
  }

  const createEmail = async () => {
    setLoading(true)
    setSelectedMsg(null)
    try {
      const sessionId = newSessionId.trim() || 'default'
      const result = customAlias
        ? await tempmail.createCustom(customAlias, customDomain || undefined, sessionId)
        : await tempmail.create(sessionId)
      setCurrentEmail(result)
      setActiveSession(result.session_id || sessionId)
      setInbox(null)
      await loadSessions()
    } catch (e) {
      alert('Error creando email: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const refreshInbox = async () => {
    if (!currentEmail) return
    setRefreshing(true)
    try {
      const result = await tempmail.inbox(activeSession)
      setInbox(result)
    } catch {} finally {
      setRefreshing(false)
    }
  }

  const readMessage = async (msgId) => {
    try {
      const msg = await tempmail.readMessage(activeSession, msgId)
      setSelectedMsg(msg)
    } catch (e) {
      alert('Error leyendo mensaje: ' + e.message)
    }
  }

  const waitForEmail = async () => {
    setWaiting(true)
    try {
      const result = await tempmail.waitForEmail(activeSession, 60)
      if (result.received) {
        setSelectedMsg(result.message)
        await refreshInbox()
      } else {
        alert('Timeout: no se recibió ningún email en 60 segundos')
      }
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setWaiting(false)
    }
  }

  const switchSession = (session) => {
    setActiveSession(session.session_id)
    setCurrentEmail({ email: session.email, login: session.login, domain: session.domain })
    setInbox(null)
    setSelectedMsg(null)
  }

  const deleteSession = async (sessionId) => {
    await tempmail.deleteSession(sessionId)
    if (activeSession === sessionId) {
      setCurrentEmail(null)
      setInbox(null)
      setSelectedMsg(null)
    }
    await loadSessions()
  }

  const copyEmail = () => {
    if (!currentEmail) return
    navigator.clipboard.writeText(currentEmail.email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Mail size={18} className="text-blue-400" />
        <span className="text-white font-bold text-lg">Temp Mail — Correos Temporales</span>
        <span className="badge badge-blue">1secmail</span>
        <span className="text-gray-600 text-xs ml-2">100% gratuito · auto-refresh 5s</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left panel */}
        <div className="space-y-4">
          {/* Create email */}
          <div className="card border-blue-700/30">
            <p className="section-title text-blue-400 mb-4">Nueva dirección</p>

            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Alias (opcional)</label>
                <input className="input-dark text-sm" placeholder="nombre-aleatorio"
                  value={customAlias} onChange={e => setCustomAlias(e.target.value)} />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Dominio</label>
                <select className="input-dark text-sm" value={customDomain}
                  onChange={e => setCustomDomain(e.target.value)}>
                  <option value="">Aleatorio</option>
                  {domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">ID de sesión (opcional)</label>
                <input className="input-dark text-sm font-mono" placeholder="default"
                  value={newSessionId} onChange={e => setNewSessionId(e.target.value)} />
              </div>
              <button className="btn-primary w-full justify-center" onClick={createEmail} disabled={loading}>
                {loading ? <Spinner size={15} /> : <Plus size={15} />}
                {loading ? 'Generando...' : 'Generar Email'}
              </button>
            </div>
          </div>

          {/* Active email */}
          {currentEmail && (
            <div className="card border-green-700/30 bg-green-900/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full pulse-dot" />
                <span className="text-green-400 text-xs font-semibold">Email activo</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <code className="text-white font-mono text-sm flex-1 break-all">{currentEmail.email}</code>
                <button onClick={copyEmail} className="btn-ghost p-1.5">
                  {copied ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs flex-1 justify-center" onClick={refreshInbox} disabled={refreshing}>
                  {refreshing ? <Spinner size={12} /> : <RefreshCw size={12} />}
                  Refresh
                </button>
                <button className="btn-secondary text-xs flex-1 justify-center" onClick={waitForEmail} disabled={waiting}>
                  {waiting ? <Spinner size={12} /> : <Zap size={12} />}
                  {waiting ? 'Esperando...' : 'Esperar email'}
                </button>
              </div>
            </div>
          )}

          {/* Sessions */}
          {sessions.length > 0 && (
            <div className="card">
              <p className="text-gray-500 text-xs mb-3 uppercase tracking-wider">Sesiones activas</p>
              <div className="space-y-2">
                {sessions.map(s => (
                  <div key={s.session_id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                      activeSession === s.session_id ? 'bg-blue-900/20 border border-blue-700/30' : 'hover:bg-surface-light'
                    }`}
                    onClick={() => switchSession(s)}>
                    <Mail size={12} className="text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-mono truncate">{s.email}</p>
                      <p className="text-gray-600 text-xs">{s.session_id}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteSession(s.session_id) }}
                      className="text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="card border-yellow-700/20 bg-yellow-900/10">
            <p className="text-yellow-400 text-xs font-semibold mb-2">Automatización</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              Usa la función <strong>"Esperar email"</strong> para recibir automáticamente tokens
              de verificación cuando te registras en servicios con este correo temporal.
              Los emails llegan en segundos y puedes leer el contenido completo.
            </p>
          </div>
        </div>

        {/* Right panel — Inbox + message */}
        <div className="xl:col-span-2 space-y-4">
          {/* Inbox */}
          <div className="card border-surface-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Inbox size={15} className="text-gray-400" />
                <span className="text-white font-semibold">Bandeja de entrada</span>
                {inbox?.count > 0 && (
                  <span className="badge badge-blue">{inbox.count}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {refreshing && <Spinner size={14} />}
                <span className="text-gray-600 text-xs">Auto-refresh 5s</span>
              </div>
            </div>

            {!currentEmail && (
              <div className="text-center py-10 text-gray-600">
                <Mail size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Genera un email temporal para empezar</p>
              </div>
            )}

            {currentEmail && (!inbox || inbox.count === 0) && (
              <div className="text-center py-10">
                <Clock size={28} className="mx-auto mb-3 text-gray-600 opacity-50" />
                <p className="text-gray-500 text-sm">Esperando emails...</p>
                <p className="text-gray-600 text-xs mt-1">La bandeja se actualiza automáticamente cada 5 segundos</p>
              </div>
            )}

            {inbox?.messages?.length > 0 && (
              <div className="space-y-2">
                {inbox.messages.map(msg => (
                  <div key={msg.id}
                    onClick={() => readMessage(msg.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      selectedMsg?.id === msg.id
                        ? 'bg-blue-900/20 border border-blue-700/30'
                        : 'hover:bg-surface-light border border-transparent'
                    }`}>
                    <Mail size={15} className="text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate">{msg.subject || '(Sin asunto)'}</span>
                      </div>
                      <span className="text-gray-500 text-xs truncate">{msg.from}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-gray-500 text-xs">{msg.date}</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-600" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message viewer */}
          {selectedMsg && (
            <div className="card border-blue-700/30">
              <div className="mb-4 pb-4 border-b border-surface-border">
                <h3 className="text-white font-bold text-base mb-2">{selectedMsg.subject || '(Sin asunto)'}</h3>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>De: <code className="text-gray-300">{selectedMsg.from}</code></span>
                  <span>{selectedMsg.date}</span>
                </div>
              </div>

              {/* Try to extract verification codes */}
              {selectedMsg.body && (() => {
                const codeMatch = selectedMsg.body.match(/\b(\d{4,8})\b/)
                const linkMatch = selectedMsg.body.match(/(https?:\/\/[^\s"<>]+(?:verify|confirm|activate|token)[^\s"<>]*)/i)
                return (
                  <>
                    {codeMatch && (
                      <div className="mb-4 p-3 bg-green-900/20 rounded-lg border border-green-700/30 flex items-center gap-3">
                        <CheckCircle size={16} className="text-green-400 shrink-0" />
                        <div>
                          <p className="text-green-400 text-xs font-semibold">Código detectado</p>
                          <code className="text-white text-2xl font-mono font-bold">{codeMatch[1]}</code>
                        </div>
                        <button onClick={() => navigator.clipboard.writeText(codeMatch[1])}
                          className="ml-auto btn-ghost p-1.5">
                          <Copy size={14} />
                        </button>
                      </div>
                    )}
                    {linkMatch && (
                      <div className="mb-4 p-3 bg-blue-900/20 rounded-lg border border-blue-700/30">
                        <p className="text-blue-400 text-xs font-semibold mb-1">Link de verificación</p>
                        <a href={linkMatch[1]} target="_blank" rel="noreferrer"
                          className="text-blue-300 text-xs hover:underline break-all">{linkMatch[1]}</a>
                      </div>
                    )}
                  </>
                )
              })()}

              <div className="max-h-96 overflow-y-auto">
                <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                  {selectedMsg.body || selectedMsg.html_body?.replace(/<[^>]+>/g, '') || 'Sin contenido'}
                </pre>
              </div>

              {selectedMsg.attachments?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-surface-border">
                  <p className="text-gray-500 text-xs mb-2">Adjuntos:</p>
                  {selectedMsg.attachments.map((a, i) => (
                    <span key={i} className="badge badge-gray mr-2">{a.filename}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
