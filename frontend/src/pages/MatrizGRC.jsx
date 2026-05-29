import { useState } from 'react'
import { Shield, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import RiskBadge from '../components/RiskBadge'

const FRAMEWORKS = {
  RGPD: {
    name: 'RGPD / GDPR',
    desc: 'Reglamento General de Protección de Datos (UE) 2016/679',
    controls: [
      { id: 'RGPD-1', name: 'Registro de actividades de tratamiento', article: 'Art. 30', risk: 'ALTO' },
      { id: 'RGPD-2', name: 'Base legal para el tratamiento de datos', article: 'Art. 6', risk: 'CRÍTICO' },
      { id: 'RGPD-3', name: 'Política de privacidad visible y completa', article: 'Art. 13-14', risk: 'ALTO' },
      { id: 'RGPD-4', name: 'Mecanismo de consentimiento explícito', article: 'Art. 7', risk: 'ALTO' },
      { id: 'RGPD-5', name: 'Derecho de acceso, rectificación y supresión', article: 'Art. 15-17', risk: 'MEDIO' },
      { id: 'RGPD-6', name: 'Nombrar DPO si aplica', article: 'Art. 37', risk: 'MEDIO' },
      { id: 'RGPD-7', name: 'Transferencias internacionales con garantías', article: 'Art. 44-49', risk: 'ALTO' },
      { id: 'RGPD-8', name: 'Evaluación de impacto (DPIA) cuando proceda', article: 'Art. 35', risk: 'ALTO' },
      { id: 'RGPD-9', name: 'Notificación de brechas en 72h', article: 'Art. 33', risk: 'CRÍTICO' },
      { id: 'RGPD-10', name: 'Contratos con encargados del tratamiento', article: 'Art. 28', risk: 'MEDIO' },
    ]
  },
  ISO27001: {
    name: 'ISO 27001:2022',
    desc: 'Sistema de Gestión de Seguridad de la Información',
    controls: [
      { id: 'ISO-A5.1', name: 'Políticas de seguridad de la información', article: 'A.5.1', risk: 'ALTO' },
      { id: 'ISO-A6.1', name: 'Roles y responsabilidades de seguridad', article: 'A.6.1', risk: 'MEDIO' },
      { id: 'ISO-A8.1', name: 'Inventario y clasificación de activos', article: 'A.8.1', risk: 'ALTO' },
      { id: 'ISO-A9.1', name: 'Control de acceso — política y gestión', article: 'A.9.1', risk: 'CRÍTICO' },
      { id: 'ISO-A10.1', name: 'Cifrado de datos en tránsito y reposo', article: 'A.10.1', risk: 'ALTO' },
      { id: 'ISO-A12.1', name: 'Procedimientos operacionales documentados', article: 'A.12.1', risk: 'MEDIO' },
      { id: 'ISO-A12.6', name: 'Gestión de vulnerabilidades técnicas', article: 'A.12.6', risk: 'CRÍTICO' },
      { id: 'ISO-A16.1', name: 'Gestión de incidentes de seguridad', article: 'A.16.1', risk: 'ALTO' },
      { id: 'ISO-A17.1', name: 'Continuidad del negocio y TI', article: 'A.17.1', risk: 'ALTO' },
      { id: 'ISO-A18.1', name: 'Cumplimiento legal y contractual', article: 'A.18.1', risk: 'MEDIO' },
    ]
  },
  ENS: {
    name: 'ENS (España)',
    desc: 'Esquema Nacional de Seguridad — Real Decreto 311/2022',
    controls: [
      { id: 'ENS-OP.PL.1', name: 'Análisis de riesgos documentado', article: 'op.pl.1', risk: 'CRÍTICO' },
      { id: 'ENS-OP.ACC.1', name: 'Identificación y autenticación de usuarios', article: 'op.acc.1', risk: 'CRÍTICO' },
      { id: 'ENS-OP.ACC.5', name: 'Privilegios mínimos', article: 'op.acc.5', risk: 'ALTO' },
      { id: 'ENS-OP.EXP.1', name: 'Inventario de activos actualizado', article: 'op.exp.1', risk: 'MEDIO' },
      { id: 'ENS-OP.EXP.4', name: 'Mantenimiento y actualización de sistemas', article: 'op.exp.4', risk: 'ALTO' },
      { id: 'ENS-MP.COM.1', name: 'Perímetro seguro — separación de redes', article: 'mp.com.1', risk: 'ALTO' },
      { id: 'ENS-MP.INFO.3', name: 'Cifrado de la información', article: 'mp.info.3', risk: 'ALTO' },
      { id: 'ENS-MP.SI.2', name: 'Copias de seguridad', article: 'mp.si.2', risk: 'ALTO' },
      { id: 'ENS-ORG.4', name: 'Proceso de autorización', article: 'org.4', risk: 'MEDIO' },
      { id: 'ENS-OP.MON.1', name: 'Detección de intrusiones', article: 'op.mon.1', risk: 'ALTO' },
    ]
  },
  NIS2: {
    name: 'NIS2 Directive',
    desc: 'Directiva NIS2 (UE) 2022/2555 — Seguridad de redes y sistemas',
    controls: [
      { id: 'NIS2-1', name: 'Gestión de riesgos de ciberseguridad', article: 'Art. 21(2a)', risk: 'CRÍTICO' },
      { id: 'NIS2-2', name: 'Tratamiento de incidentes', article: 'Art. 21(2b)', risk: 'CRÍTICO' },
      { id: 'NIS2-3', name: 'Continuidad de negocio y gestión de crisis', article: 'Art. 21(2c)', risk: 'ALTO' },
      { id: 'NIS2-4', name: 'Seguridad de la cadena de suministro', article: 'Art. 21(2d)', risk: 'ALTO' },
      { id: 'NIS2-5', name: 'Seguridad en adquisición y desarrollo', article: 'Art. 21(2e)', risk: 'ALTO' },
      { id: 'NIS2-6', name: 'Políticas de evaluación de efectividad', article: 'Art. 21(2f)', risk: 'MEDIO' },
      { id: 'NIS2-7', name: 'Higiene básica de ciberseguridad y formación', article: 'Art. 21(2g)', risk: 'MEDIO' },
      { id: 'NIS2-8', name: 'Criptografía y cifrado', article: 'Art. 21(2h)', risk: 'ALTO' },
      { id: 'NIS2-9', name: 'Seguridad de RRHH y control de acceso', article: 'Art. 21(2i)', risk: 'ALTO' },
      { id: 'NIS2-10', name: 'Autenticación multifactor (MFA)', article: 'Art. 21(2j)', risk: 'CRÍTICO' },
    ]
  }
}

export default function MatrizGRC() {
  const [selected, setSelected] = useState('RGPD')
  const [statuses, setStatuses] = useState({})
  const [notes, setNotes] = useState({})
  const [editingNote, setEditingNote] = useState(null)

  const framework = FRAMEWORKS[selected]

  const setStatus = (id, status) => {
    setStatuses(s => ({ ...s, [id]: status }))
  }

  const getStats = () => {
    const controls = framework.controls
    const compliant = controls.filter(c => statuses[c.id] === 'compliant').length
    const partial = controls.filter(c => statuses[c.id] === 'partial').length
    const nonCompliant = controls.filter(c => statuses[c.id] === 'non-compliant').length
    const pending = controls.length - compliant - partial - nonCompliant
    const score = Math.round(((compliant + partial * 0.5) / controls.length) * 100)
    return { compliant, partial, nonCompliant, pending, total: controls.length, score }
  }

  const stats = getStats()

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="card mb-6 border-purple-700/30">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-purple-400" />
          <span className="text-purple-400 font-bold">Matriz GRC — Compliance y Auditoría</span>
        </div>

        {/* Framework selector */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(FRAMEWORKS).map(([key, fw]) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                selected === key
                  ? 'bg-purple-900/30 border-purple-500/50 text-purple-300'
                  : 'bg-surface-light border-surface-border text-gray-400 hover:border-gray-500'
              }`}
            >
              {fw.name}
            </button>
          ))}
        </div>
      </div>

      {/* Score summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card col-span-2 md:col-span-1 flex flex-col items-center justify-center py-6">
          <div className={`text-4xl font-bold mb-1 ${
            stats.score >= 70 ? 'text-green-400' : stats.score >= 40 ? 'text-yellow-400' : 'text-red-400'
          }`}>{stats.score}%</div>
          <div className="text-gray-500 text-xs">Score Compliance</div>
        </div>
        {[
          { label: 'Conforme', count: stats.compliant, color: 'text-green-400' },
          { label: 'Parcial', count: stats.partial, color: 'text-yellow-400' },
          { label: 'No conforme', count: stats.nonCompliant, color: 'text-red-400' },
          { label: 'Pendiente', count: stats.pending, color: 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="card flex flex-col items-center justify-center py-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
            <div className="text-gray-500 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Framework info */}
      <div className="card mb-4 border-purple-700/20">
        <div className="font-semibold text-white">{framework.name}</div>
        <div className="text-gray-400 text-sm">{framework.desc}</div>
      </div>

      {/* Controls table */}
      <div className="space-y-2">
        {framework.controls.map(control => {
          const status = statuses[control.id]
          const note = notes[control.id]
          return (
            <ControlRow
              key={control.id}
              control={control}
              status={status}
              note={note}
              editingNote={editingNote === control.id}
              onSetStatus={(s) => setStatus(control.id, s)}
              onEditNote={() => setEditingNote(control.id)}
              onSaveNote={(n) => {
                setNotes(prev => ({ ...prev, [control.id]: n }))
                setEditingNote(null)
              }}
            />
          )
        })}
      </div>

      {/* Export note */}
      <div className="mt-6 text-center text-gray-600 text-xs">
        Los resultados se incluirán en el reporte DOCX al generarlo desde el módulo de Reportes
      </div>
    </div>
  )
}

function ControlRow({ control, status, note, editingNote, onSetStatus, onEditNote, onSaveNote }) {
  const [noteVal, setNoteVal] = useState(note || '')

  const statusConfig = {
    'compliant': { label: 'Conforme', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/20 border-green-700/30' },
    'partial': { label: 'Parcial', icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-700/30' },
    'non-compliant': { label: 'No Conforme', icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/20 border-red-700/30' },
  }

  const current = status ? statusConfig[status] : null

  return (
    <div className={`card border transition-all ${current ? current.bg : 'border-surface-border'}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <code className="text-gray-500 text-xs font-mono">{control.id}</code>
            <code className="text-blue-400 text-xs">{control.article}</code>
            <RiskBadge level={control.risk} />
          </div>
          <p className="text-gray-200 text-sm">{control.name}</p>
          {note && !editingNote && (
            <p className="text-gray-500 text-xs mt-1 italic">{note}</p>
          )}
          {editingNote && (
            <div className="flex gap-2 mt-2">
              <input
                className="input-dark text-xs py-1 flex-1"
                placeholder="Añadir nota de evidencia..."
                value={noteVal}
                onChange={e => setNoteVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onSaveNote(noteVal)}
                autoFocus
              />
              <button className="btn-primary text-xs py-1" onClick={() => onSaveNote(noteVal)}>
                Guardar
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!editingNote && (
            <button
              className="text-gray-600 hover:text-gray-400 text-xs"
              onClick={onEditNote}
            >
              + nota
            </button>
          )}
          {['compliant', 'partial', 'non-compliant'].map(s => {
            const cfg = statusConfig[s]
            const Icon = cfg.icon
            return (
              <button
                key={s}
                onClick={() => onSetStatus(status === s ? null : s)}
                title={cfg.label}
                className={`p-1.5 rounded-lg border transition-all ${
                  status === s
                    ? `${cfg.bg} ${cfg.color} border-current`
                    : 'border-surface-border text-gray-600 hover:text-gray-400'
                }`}
              >
                <Icon size={16} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
