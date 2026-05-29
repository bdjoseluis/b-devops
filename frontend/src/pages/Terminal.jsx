import { useState, useRef, useEffect } from 'react'
import { ai, scan } from '../api/client'
import Spinner from '../components/Spinner'
import { Send, Trash2, Terminal as TerminalIcon, Zap, Copy } from 'lucide-react'

const SESSION_ID = 'aura-terminal'

const QUICK_CMDS = [
  { label: 'Analizar dominio', prompt: 'Analiza la seguridad de este dominio y dame los pasos a seguir: ' },
  { label: 'Interpretar puertos', prompt: 'Tengo estos puertos abiertos en el objetivo, analiza los riesgos: ' },
  { label: 'Vector de ataque', prompt: 'Dado este OSINT, ¿cuáles son los vectores de ataque más probables? ' },
  { label: 'Reporte ejecutivo', prompt: 'Genera un resumen ejecutivo para un cliente no técnico de estos hallazgos: ' },
  { label: 'Hardening checklist', prompt: 'Dame un checklist de hardening para este servidor: ' },
  { label: 'CVE explanation', prompt: 'Explica este CVE y cómo mitigarlo: ' },
]

export default function Terminal() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '```\nAURA OPS — Terminal de Inteligencia Artificial\nPotenciado por Gemini Flash · Solo auditorías autorizadas\n```\n\n¡Bienvenido! Soy AURA, tu asistente de ciberseguridad. Puedo ayudarte a:\n\n- **Analizar resultados** de OSINT y scans\n- **Guiar el pentest** paso a paso\n- **Interpretar vulnerabilidades** y CVEs\n- **Generar contenido** para reportes\n- **Responder dudas** sobre seguridad ofensiva/defensiva\n\nEscribe tu consulta o usa los comandos rápidos de arriba.',
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [context, setContext] = useState({})
  const [rawMode, setRawMode] = useState(false)
  const [rawCmd, setRawCmd] = useState('')
  const [rawRunning, setRawRunning] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text = input) => {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text, timestamp: new Date() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await ai.chat(SESSION_ID, text, context)
      setMessages(m => [...m, {
        role: 'assistant',
        content: res.response,
        timestamp: new Date(),
      }])
    } catch (e) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: `Error: ${e.response?.data?.detail || e.message}\n\n¿Tienes configurada la API key de Gemini en Configuración?`,
        timestamp: new Date(),
        error: true,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const clearSession = async () => {
    await ai.clearSession(SESSION_ID)
    setMessages([{
      role: 'assistant',
      content: 'Sesión reiniciada. ¿En qué puedo ayudarte?',
      timestamp: new Date(),
    }])
  }

  const runRaw = async () => {
    if (!rawCmd.trim()) return
    setRawRunning(true)
    const cmd = rawCmd
    setRawCmd('')
    setMessages(m => [...m, {
      role: 'user',
      content: `$ ${cmd}`,
      timestamp: new Date(),
      isCmd: true,
    }])
    try {
      const res = await scan.kaliRaw(cmd)
      const output = res.output || res.error || 'Sin output'
      setMessages(m => [...m, {
        role: 'assistant',
        content: output,
        timestamp: new Date(),
        isOutput: true,
      }])
      // Send to AI for analysis
      await sendMessage(`Analiza este output del comando "${cmd}":\n\`\`\`\n${output.slice(0, 2000)}\n\`\`\``)
    } catch (e) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: `Error ejecutando comando: ${e.message}`,
        timestamp: new Date(),
        error: true,
      }])
    } finally {
      setRawRunning(false)
    }
  }

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto animate-fade-in" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="card mb-4 border-green-700/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full pulse-dot" />
          <TerminalIcon size={16} className="text-green-400" />
          <span className="text-green-400 font-semibold">AURA — Terminal IA</span>
          <span className="text-gray-600 text-xs font-mono">Gemini Flash</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setRawMode(!rawMode)}
            className={`btn-ghost text-xs ${rawMode ? 'text-yellow-400' : ''}`}
          >
            <Zap size={14} />
            {rawMode ? 'Modo Kali ON' : 'Modo Kali'}
          </button>
          <button onClick={clearSession} className="btn-ghost text-xs">
            <Trash2 size={14} />
            Limpiar
          </button>
        </div>
      </div>

      {/* Quick commands */}
      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_CMDS.map(cmd => (
          <button
            key={cmd.label}
            className="text-xs px-3 py-1 rounded-full border border-surface-border bg-surface-light text-gray-400 hover:text-green-400 hover:border-green-700/50 transition-all"
            onClick={() => setInput(cmd.prompt)}
          >
            {cmd.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-1">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {loading && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-surface">
            <Spinner size={16} />
            <span className="text-gray-400 text-sm font-mono">AURA está analizando</span>
            <span className="cursor-blink" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Kali raw command mode */}
      {rawMode && (
        <div className="card mb-3 border-yellow-700/30 bg-yellow-900/10">
          <p className="text-yellow-400 text-xs mb-2 font-mono">$ Terminal Kali (SSH)</p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2 border border-yellow-700/30">
              <span className="text-yellow-400 font-mono text-sm">$</span>
              <input
                className="flex-1 bg-transparent text-green-400 font-mono text-sm outline-none"
                placeholder="nmap -sV target.com"
                value={rawCmd}
                onChange={e => setRawCmd(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runRaw()}
              />
            </div>
            <button className="btn-secondary text-xs" onClick={runRaw} disabled={rawRunning}>
              {rawRunning ? <Spinner size={14} /> : <Play size={14} />}
              Run
            </button>
          </div>
        </div>
      )}

      {/* Chat input */}
      <div className="flex gap-3">
        <div className="flex-1 flex items-center bg-surface border border-surface-border rounded-xl px-4 py-2.5 focus-within:border-green-600/50 transition-colors">
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
            placeholder="Pregunta a AURA... (Enter para enviar)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          />
        </div>
        <button
          className="btn-primary"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          {loading ? <Spinner size={16} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  )
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (msg.isOutput) {
    return (
      <div className="p-4 bg-black/50 rounded-lg border border-surface-border">
        <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-80 overflow-y-auto">
          {msg.content}
        </pre>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        isUser ? 'bg-crimson text-white' : 'bg-green-900 text-green-400 border border-green-700/50'
      }`}>
        {isUser ? 'U' : 'A'}
      </div>

      {/* Content */}
      <div className={`max-w-2xl ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed group relative ${
          isUser
            ? 'bg-crimson/20 border border-crimson/30 text-gray-100 rounded-tr-none'
            : msg.error
              ? 'bg-red-900/20 border border-red-700/30 text-red-300 rounded-tl-none'
              : 'bg-surface border border-surface-border text-gray-100 rounded-tl-none'
        }`}>
          {msg.isCmd ? (
            <code className="text-yellow-400 font-mono">{msg.content}</code>
          ) : (
            <FormattedText text={msg.content} />
          )}
          <button
            onClick={copy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Copy size={12} className="text-gray-500 hover:text-white" />
          </button>
        </div>
        <span className="text-gray-600 text-xs">
          {msg.timestamp?.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

function FormattedText({ text }) {
  // Simple markdown-like formatting
  const lines = text.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('```')) return null
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-white">{line.slice(2, -2)}</p>
        }
        if (line.startsWith('# ')) {
          return <p key={i} className="font-bold text-crimson text-base">{line.slice(2)}</p>
        }
        if (line.startsWith('## ')) {
          return <p key={i} className="font-semibold text-white">{line.slice(3)}</p>
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <p key={i} className="pl-2">· {line.slice(2)}</p>
        }
        if (line.match(/^\d+\. /)) {
          return <p key={i} className="pl-2">{line}</p>
        }
        if (line.startsWith('`') && line.endsWith('`')) {
          return <code key={i} className="bg-black/40 px-1 rounded text-green-400 font-mono text-xs">{line.slice(1, -1)}</code>
        }
        return <p key={i}>{line || ' '}</p>
      })}
    </div>
  )
}

import { Play } from 'lucide-react'
