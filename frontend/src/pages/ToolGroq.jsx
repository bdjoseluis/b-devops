import { useState, useRef, useEffect } from 'react'

const API = '/api/ai/groq'

const MODELS = {
  'llama-3.3-70b-versatile': 'Llama 3.3 70B ⚡',
  'llama-3.1-8b-instant':    'Llama 3.1 8B 🚀',
  'llama3-70b-8192':         'Llama3 70B 8K',
  'mixtral-8x7b-32768':      'Mixtral 8x7B 32K',
  'gemma2-9b-it':            'Gemma 2 9B',
}

const PRESETS = [
  { label: '🔍 Analizar OSINT', prompt: 'Analiza los siguientes datos OSINT e identifica riesgos de seguridad, vectores de ataque y recomendaciones:\n\n' },
  { label: '🛡️ Revisar código', prompt: 'Revisa el siguiente código en busca de vulnerabilidades de seguridad (SQL injection, XSS, secrets hardcodeados, etc.):\n\n```\n\n```' },
  { label: '📋 Resumen ejecutivo', prompt: 'Genera un resumen ejecutivo profesional para una auditoría de seguridad del objetivo: [TARGET]\n\nDatos disponibles:\n' },
  { label: '🔧 Hardening tips', prompt: 'Dame las mejores prácticas de hardening para el siguiente servicio/tecnología:\n\n' },
  { label: '⚔️ Pentesting steps', prompt: 'Describe los pasos de pentesting (metodología OWASP/PTES) para el siguiente escenario:\n\n' },
  { label: '🐛 CVE análisis', prompt: 'Analiza la siguiente vulnerabilidad CVE y explica: impacto, CVSS, vectores de explotación y mitigación:\n\n' },
]

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  const isError = msg.error

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
        isUser ? 'bg-purple-600 text-white' : isError ? 'bg-red-900 text-red-300' : 'bg-emerald-900 text-emerald-300'
      }`}>
        {isUser ? 'U' : isError ? '!' : 'AI'}
      </div>

      {/* Content */}
      <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap font-mono ${
        isUser
          ? 'bg-purple-900/50 border border-purple-700/50 text-purple-100'
          : isError
          ? 'bg-red-900/30 border border-red-700/50 text-red-300'
          : 'bg-[#0d1117] border border-emerald-800/40 text-gray-200'
      }`}>
        {isError ? `❌ ${msg.content}` : msg.content}
        {msg.tokens && (
          <div className="mt-2 pt-2 border-t border-white/10 text-xs text-gray-500 font-sans">
            {msg.model} · {msg.tokens.total} tokens
          </div>
        )}
      </div>
    </div>
  )
}

export default function ToolGroq() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState('llama-3.3-70b-versatile')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(2048)
  const [showSettings, setShowSettings] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const userText = (text || input).trim()
    if (!userText || loading) return

    const userMsg = { role: 'user', content: userText }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          model,
          max_tokens: maxTokens,
          temperature,
        }),
      })
      const data = await res.json()

      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error, error: true }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.content,
          model: data.model,
          tokens: data.tokens,
        }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Network error: ${e.message}`, error: true }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const applyPreset = (preset) => {
    setInput(preset.prompt)
    textareaRef.current?.focus()
  }

  const clearChat = () => setMessages([])

  const totalTokens = messages.reduce((sum, m) => sum + (m.tokens?.total || 0), 0)

  return (
    <div style={{ background: '#030008', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'monospace' }}>
      {/* Header */}
      <div style={{ background: '#0a001a', borderBottom: '1px solid #1a0533', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => window.history.back()}
          style={{ background: 'none', border: '1px solid #333', borderRadius: '6px', color: '#888', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}
        >
          ← Back
        </button>
        <div style={{ fontSize: '20px' }}>⚡</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#a78bfa' }}>GROQ AI CHAT</div>
          <div style={{ fontSize: '11px', color: '#666' }}>Ultra-fast LLM inference · B-Dev Security Assistant</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {totalTokens > 0 && (
            <span style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>
              {totalTokens.toLocaleString()} tokens used
            </span>
          )}
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            style={{ background: '#1a0533', border: '1px solid #2d0f52', color: '#a78bfa', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
          >
            {Object.entries(MODELS).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{ background: showSettings ? '#1a0533' : 'none', border: '1px solid #333', borderRadius: '6px', color: '#888', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}
          >
            ⚙️
          </button>
          <button
            onClick={clearChat}
            style={{ background: 'none', border: '1px solid #333', borderRadius: '6px', color: '#888', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}
          >
            🗑️ Limpiar
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div style={{ background: '#0d0020', borderBottom: '1px solid #1a0533', padding: '12px 20px', display: 'flex', gap: '24px', alignItems: 'center', fontSize: '12px' }}>
          <label style={{ color: '#888', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Temperature: <span style={{ color: '#a78bfa', minWidth: '28px' }}>{temperature}</span>
            <input type="range" min="0" max="1" step="0.1" value={temperature}
              onChange={e => setTemperature(parseFloat(e.target.value))}
              style={{ accentColor: '#7c3aed', width: '120px' }} />
          </label>
          <label style={{ color: '#888', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Max tokens: <span style={{ color: '#a78bfa', minWidth: '36px' }}>{maxTokens}</span>
            <input type="range" min="256" max="8192" step="256" value={maxTokens}
              onChange={e => setMaxTokens(parseInt(e.target.value))}
              style={{ accentColor: '#7c3aed', width: '120px' }} />
          </label>
          <div style={{ color: '#555' }}>Shift+Enter = nueva línea · Enter = enviar</div>
        </div>
      )}

      <div style={{ display: 'flex', height: 'calc(100vh - 57px)' }}>
        {/* Presets sidebar */}
        <div style={{ width: '200px', borderRight: '1px solid #1a0533', padding: '16px 12px', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: '10px', color: '#555', marginBottom: '10px', letterSpacing: '1px' }}>PLANTILLAS</div>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(p)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'none', border: '1px solid #1a0533',
                borderRadius: '6px', color: '#888', padding: '8px 10px',
                marginBottom: '6px', cursor: 'pointer', fontSize: '11px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.target.style.borderColor = '#4c1d95'; e.target.style.color = '#a78bfa' }}
              onMouseLeave={e => { e.target.style.borderColor = '#1a0533'; e.target.style.color = '#888' }}
            >
              {p.label}
            </button>
          ))}

          <div style={{ marginTop: '20px', fontSize: '10px', color: '#555', letterSpacing: '1px', marginBottom: '8px' }}>MODELOS</div>
          {Object.entries(MODELS).map(([id, name]) => (
            <button
              key={id}
              onClick={() => setModel(id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: model === id ? '#1a0533' : 'none',
                border: `1px solid ${model === id ? '#4c1d95' : '#1a0533'}`,
                borderRadius: '6px', color: model === id ? '#a78bfa' : '#555',
                padding: '6px 10px', marginBottom: '4px',
                cursor: 'pointer', fontSize: '10px',
              }}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '80px', color: '#333' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
                <div style={{ fontSize: '18px', color: '#4c1d95', marginBottom: '8px' }}>GROQ AI READY</div>
                <div style={{ fontSize: '13px', color: '#3d1a6b' }}>Ultra-fast LLM · Selecciona una plantilla o escribe tu consulta</div>
                <div style={{ marginTop: '24px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '500px', margin: '24px auto 0' }}>
                  {PRESETS.slice(0, 3).map((p, i) => (
                    <button
                      key={i}
                      onClick={() => applyPreset(p)}
                      style={{
                        background: '#0d0020', border: '1px solid #2d0f52',
                        borderRadius: '8px', color: '#7c3aed', padding: '10px 16px',
                        cursor: 'pointer', fontSize: '12px',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <Bubble key={i} msg={msg} />
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#064e3b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#34d399' }}>AI</div>
                <div style={{ background: '#0d1117', border: '1px solid #065f46', borderRadius: '12px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid #1a0533', background: '#050010' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Escribe tu consulta... (Enter para enviar, Shift+Enter para nueva línea)"
                rows={3}
                style={{
                  flex: 1, background: '#0d0020', border: '1px solid #2d0f52',
                  borderRadius: '10px', color: '#e2e8f0', padding: '12px 14px',
                  fontSize: '13px', fontFamily: 'monospace', resize: 'none',
                  outline: 'none', lineHeight: '1.5',
                }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = '#2d0f52'}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{
                  background: loading || !input.trim() ? '#1a0533' : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                  border: 'none', borderRadius: '10px', color: loading || !input.trim() ? '#4c1d95' : 'white',
                  padding: '12px 20px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '16px', fontWeight: 700, height: '80px', minWidth: '60px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {loading ? '⏳' : '➤'}
              </button>
            </div>
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#333', display: 'flex', gap: '12px' }}>
              <span>Modelo: <span style={{ color: '#4c1d95' }}>{MODELS[model]}</span></span>
              <span>Temp: <span style={{ color: '#4c1d95' }}>{temperature}</span></span>
              <span>Max tokens: <span style={{ color: '#4c1d95' }}>{maxTokens}</span></span>
              <span style={{ marginLeft: 'auto' }}>{messages.length} mensajes en contexto</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030008; }
        ::-webkit-scrollbar-thumb { background: #1a0533; border-radius: 3px; }
      `}</style>
    </div>
  )
}
