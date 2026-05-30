import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, MessageSquare, Phone, Link, QrCode, Zap } from 'lucide-react'

const COLOR = '#25d366'

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1.5 rounded text-gray-500 hover:text-white transition-colors"
    >
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  )
}

function CodeBlock({ code, lang = '' }) {
  return (
    <div className="relative bg-dark-400 border border-surface-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-surface-border">
        <span className="text-gray-500 text-xs font-mono">{lang}</span>
        <CopyBtn text={code} />
      </div>
      <pre className="p-4 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">{code}</pre>
    </div>
  )
}

// ── Link generator ────────────────────────────────────────────────────────────
function LinkGenerator() {
  const [phone,   setPhone]   = useState('')
  const [message, setMessage] = useState('Hola, me gustaría obtener más información sobre sus servicios.')
  const [copied,  setCopied]  = useState(false)

  const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '')
  const encodedMsg = encodeURIComponent(message)
  const link = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedMsg}` : ''

  const copy = () => {
    if (!link) return
    navigator.clipboard.writeText(link)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Número con código de país</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+34 600 000 000"
            className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40" />
        </div>
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Mensaje pre-escrito (opcional)</label>
          <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Hola, me gustaría..."
            className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/40" />
        </div>
      </div>

      {link && (
        <div>
          <label className="text-gray-500 text-xs mb-1 block">Link generado</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-green-400 text-xs font-mono break-all">{link}</div>
            <button onClick={copy} className="p-2 bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <a href={link} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-xs text-green-400 hover:text-green-300 transition-colors">
            <MessageSquare size={12} /> Probar link →
          </a>
        </div>
      )}
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'link',    label: 'Generador de links',  icon: Link },
  { id: 'snippet', label: 'Snippet de contacto', icon: MessageSquare },
  { id: 'webhook', label: 'Webhook n8n',          icon: Zap },
]

const CONTACT_SNIPPET = (phone, msg) => `<!-- Botón WhatsApp flotante — pega antes de </body> -->
<style>
.wa-float{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;align-items:center;gap:10px;background:#25d366;color:#fff;padding:12px 18px;border-radius:50px;box-shadow:0 4px 20px rgba(37,211,102,0.4);text-decoration:none;font-family:sans-serif;font-size:14px;font-weight:600;transition:all .2s}
.wa-float:hover{background:#128c7e;transform:translateY(-2px);box-shadow:0 6px 25px rgba(37,211,102,0.5)}
.wa-icon{width:22px;height:22px;fill:white}
</style>
<a href="https://wa.me/${phone.replace(/[\s\-\(\)\+]/g,'')}?text=${encodeURIComponent(msg)}"
   class="wa-float" target="_blank" rel="noopener">
  <svg class="wa-icon" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.122 1.528 5.866L0 24l6.306-1.507A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.82 9.82 0 0 1-5.012-1.369l-.359-.214-3.724.89.923-3.619-.234-.372A9.791 9.791 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
  💬 WhatsApp
</a>`

const WEBHOOK_SNIPPET = `// n8n Webhook — envía notificación WhatsApp cuando llega un lead
// Configura en n8n: Webhook → HTTP Request (WhatsApp API o Twilio)

// Ejemplo con Twilio WhatsApp Sandbox:
const payload = {
  To: "whatsapp:+34600000000",
  From: "whatsapp:+14155238886",  // Twilio sandbox
  Body: "🔔 Nuevo lead: {{$json.nombre}} ({{$json.fuente}}) — {{$json.email}}"
}

// Ejemplo con WhatsApp Business API (Meta):
const metaPayload = {
  messaging_product: "whatsapp",
  to: "34600000000",
  type: "text",
  text: { body: "Nuevo lead desde B-DEVOPS: {{$json.nombre}}" }
}
// POST https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages
// Authorization: Bearer {TOKEN}`

export default function ToolWhatsApp() {
  const [tab,    setTab]    = useState('link')
  const [phone2, setPhone2] = useState('+34600000000')
  const [msg2,   setMsg2]   = useState('Hola, ¿en qué puedo ayudarte?')

  return (
    <ToolShell title="WhatsApp Business" icon="💬" color={COLOR} description="Genera links, botones flotantes y webhooks para integrar WhatsApp en tu negocio">

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-400 p-1 rounded-xl border border-surface-border w-fit mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'text-white border'
                : 'text-gray-400 hover:text-white'
            }`}
            style={tab === t.id ? { background: `${COLOR}20`, borderColor: `${COLOR}40`, color: COLOR } : {}}>
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'link' && (
        <div className="space-y-4">
          <p className="text-gray-500 text-sm">Genera un link directo a WhatsApp con mensaje pre-rellenado. Ideal para botones en webs, emails y redes sociales.</p>
          <LinkGenerator />
        </div>
      )}

      {tab === 'snippet' && (
        <div className="space-y-4">
          <p className="text-gray-500 text-sm">Botón flotante de WhatsApp listo para pegar en cualquier web. Copia, personaliza el número y listo.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Tu número WhatsApp Business</label>
              <input value={phone2} onChange={e => setPhone2(e.target.value)} placeholder="+34 600 000 000"
                className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Mensaje de bienvenida</label>
              <input value={msg2} onChange={e => setMsg2(e.target.value)} placeholder="Hola, ¿en qué puedo ayudarte?"
                className="w-full bg-dark-400 border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
            </div>
          </div>
          <CodeBlock code={CONTACT_SNIPPET(phone2, msg2)} lang="HTML" />
          <div className="p-3 bg-dark-400 border border-surface-border rounded-lg text-xs text-gray-500">
            💡 Incluye este snippet en <code className="text-green-400">header.php</code> o en el gestor de etiquetas (GTM) de tu cliente. El botón aparecerá en todas las páginas.
          </div>
        </div>
      )}

      {tab === 'webhook' && (
        <div className="space-y-4">
          <p className="text-gray-500 text-sm">Integra con n8n para enviar notificaciones automáticas por WhatsApp cuando lleguen leads o eventos.</p>
          <CodeBlock code={WEBHOOK_SNIPPET} lang="JavaScript (n8n)" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-dark-400 border border-surface-border rounded-xl">
              <p className="text-white text-xs font-semibold mb-2">✅ Opción gratuita: Baileys/WPPConnect</p>
              <p className="text-gray-500 text-xs">API no oficial de WhatsApp Web. Gratis pero puede banearse. Ideal para proyectos propios o clientes pequeños.</p>
            </div>
            <div className="p-4 bg-dark-400 border border-surface-border rounded-xl">
              <p className="text-white text-xs font-semibold mb-2">💰 Opción oficial: Meta Business API</p>
              <p className="text-gray-500 text-xs">API oficial de Meta. Requiere aprobación. 1000 conversaciones gratuitas/mes. Mejor para producción.</p>
            </div>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
