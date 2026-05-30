import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import api from '../api/client'
import { Loader2, Copy, Check, FileText, Download, RefreshCw, Zap } from 'lucide-react'

const COLOR = '#8b5cf6'

const SERVICES = [
  { id: 'web',       label: 'Desarrollo Web', desc: 'Web profesional, landing page, ecommerce' },
  { id: 'auto',      label: 'Automatización', desc: 'n8n, Zapier, bots, procesos automáticos' },
  { id: 'crm',       label: 'CRM / Gestión',  desc: 'Sistema de gestión de clientes y ventas' },
  { id: 'seo',       label: 'SEO / Posicionamiento', desc: 'Google top 3, contenido, técnico' },
  { id: 'whatsapp',  label: 'WhatsApp Business', desc: 'Bot de WhatsApp, catálogo, reservas' },
  { id: 'email',     label: 'Email Marketing', desc: 'Campañas, newsletters, drip sequences' },
  { id: 'auditoria', label: 'Auditoría Web',  desc: 'Análisis de seguridad y vulnerabilidades' },
]

const TONES = [
  { id: 'formal',    label: '🏛 Formal' },
  { id: 'cercano',   label: '😊 Cercano' },
  { id: 'directo',   label: '⚡ Directo y breve' },
  { id: 'tecnico',   label: '🔧 Técnico detallado' },
]

function CopyBtn({ text, size = 13 }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1.5 rounded text-gray-500 hover:text-white transition-colors">
      {copied ? <Check size={size} className="text-green-400" /> : <Copy size={size} />}
    </button>
  )
}

export default function ToolProposal() {
  const [company,   setCompany]   = useState('')
  const [contact,   setContact]   = useState('')
  const [problem,   setProblem]   = useState('')
  const [services,  setServices]  = useState(['web'])
  const [tone,      setTone]      = useState('cercano')
  const [budget,    setBudget]    = useState('')
  const [myName,    setMyName]    = useState('')
  const [myCompany, setMyCompany] = useState('')
  const [result,    setResult]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const toggleService = (id) =>
    setServices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const generate = async () => {
    if (!company || services.length === 0) return
    setLoading(true); setError(''); setResult('')
    const selectedServices = SERVICES.filter(s => services.includes(s.id)).map(s => `${s.label}: ${s.desc}`).join('\n- ')
    const prompt = `Eres un experto en ventas B2B. Escribe una propuesta comercial profesional en español.

Cliente:
- Empresa: ${company}
- Contacto: ${contact || 'No especificado'}
- Problema / necesidad: ${problem || 'Mejorar su presencia digital y automatizar procesos'}
${budget ? `- Presupuesto estimado: ${budget}€` : ''}

Servicios propuestos:
- ${selectedServices}

Remitente:
- Nombre: ${myName || 'Tu Nombre'}
- Empresa: ${myCompany || 'B-DEVOPS'}

Tono: ${tone === 'formal' ? 'formal y corporativo' : tone === 'cercano' ? 'cercano y amigable pero profesional' : tone === 'directo' ? 'directo, breve y al grano — sin rodeos' : 'técnico y detallado con métricas'}

Estructura la propuesta con:
1. Saludo personalizado
2. Resumen ejecutivo del problema detectado
3. Solución propuesta (con cada servicio explicado en 2-3 líneas)
4. Beneficios concretos (ahorro de tiempo, más clientes, etc.)
${budget ? '5. Inversión y condiciones\n6.' : '5.'} Próximos pasos y CTA
${budget ? '7.' : '6.'} Firma

Hazla completa pero concisa. Usa formato Markdown para los títulos (##) y las listas.`

    try {
      const res = await api.post('/ai/chat', {
        session_id: `proposal_${Date.now()}`,
        message: prompt,
        context: { type: 'proposal' },
      }).then(r => r.data)
      setResult(res.response || '')
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Error generando propuesta. Verifica que Gemini está configurado.')
    } finally {
      setLoading(false) }
  }

  const downloadTxt = () => {
    if (!result) return
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `propuesta_${company.replace(/\s+/g,'_')}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ToolShell name="Generador de Propuestas" icon="📄" color={COLOR} badge="Powered by Gemini 2.0 Flash">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Left: form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 3 }}>Empresa cliente *</p>
              <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Restaurante La Española S.L."
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.25)', color: '#fff', padding: '10px 12px', borderRadius: 10, fontSize: 13, outline: 'none' }} />
            </div>

            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 3 }}>Nombre contacto</p>
              <input value={contact} onChange={e => setContact(e.target.value)} placeholder="María García"
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 12px', borderRadius: 10, fontSize: 13, outline: 'none' }} />
            </div>

            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 3 }}>Problema / necesidad detectada</p>
              <textarea value={problem} onChange={e => setProblem(e.target.value)}
                placeholder="No tienen web, su web carga lento, no tienen sistema de reservas online..."
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 12px', borderRadius: 10, fontSize: 13, outline: 'none', resize: 'vertical' }} />
            </div>

            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 3 }}>Presupuesto estimado (€, opcional)</p>
              <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="1500"
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 12px', borderRadius: 10, fontSize: 13, outline: 'none' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 3 }}>Tu nombre</p>
                <input value={myName} onChange={e => setMyName(e.target.value)} placeholder="José Luis"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 12px', borderRadius: 10, fontSize: 13, outline: 'none' }} />
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 3 }}>Tu empresa</p>
                <input value={myCompany} onChange={e => setMyCompany(e.target.value)} placeholder="B-DEVOPS"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 12px', borderRadius: 10, fontSize: 13, outline: 'none' }} />
              </div>
            </div>

            {/* Services */}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 8 }}>Servicios a proponer *</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SERVICES.map(s => (
                  <button key={s.id} onClick={() => toggleService(s.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                      background: services.includes(s.id) ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)',
                      border: services.includes(s.id) ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      color: services.includes(s.id) ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                      transition: 'all .15s',
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 8 }}>Tono</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TONES.map(t => (
                  <button key={t.id} onClick={() => setTone(t.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                      background: tone === t.id ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                      border: tone === t.id ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.1)',
                      color: tone === t.id ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={generate} disabled={!company || services.length === 0 || loading}
              style={{
                padding: '12px 20px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(168,85,247,0.2))',
                border: '1px solid rgba(139,92,246,0.5)', color: '#c4b5fd',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: (!company || services.length === 0 || loading) ? 0.5 : 1,
              }}>
              {loading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generando con Gemini...</>
                : result
                  ? <><RefreshCw size={16} /> Regenerar propuesta</>
                  : <><Zap size={16} /> Generar propuesta con IA</>}
            </button>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 12 }}>
                {error}
              </div>
            )}
          </div>

          {/* Right: result */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Propuesta generada</p>
              {result && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <CopyBtn text={result} />
                  <button onClick={downloadTxt}
                    style={{ padding: '4px 10px', borderRadius: 7, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Download size={11} /> .txt
                  </button>
                </div>
              )}
            </div>

            {result ? (
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
                padding: 20, minHeight: 500, maxHeight: 600, overflowY: 'auto',
                color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.7,
                whiteSpace: 'pre-wrap', fontFamily: "'Inter', system-ui, sans-serif",
              }}>
                {result}
              </div>
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 14,
                padding: 40, minHeight: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
              }}>
                <FileText size={40} style={{ color: 'rgba(255,255,255,0.1)' }} />
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>La propuesta aparecerá aquí</p>
                <p style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11, textAlign: 'center' }}>
                  Rellena los datos del cliente, selecciona servicios y pulsa "Generar"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolShell>
  )
}
