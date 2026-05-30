import { useState, useMemo } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, AlertTriangle, Shield, RefreshCw } from 'lucide-react'

const COLOR = '#ef4444'

// CVSS 3.1 metric definitions
const METRICS = {
  AV: {
    label: 'Attack Vector', abbr: 'AV',
    options: [
      { v: 'N', label: 'Network',          score: 0.85, desc: 'Explotable remotamente a través de la red' },
      { v: 'A', label: 'Adjacent',         score: 0.62, desc: 'Requiere acceso a red adyacente (WiFi, Bluetooth)' },
      { v: 'L', label: 'Local',            score: 0.55, desc: 'Requiere acceso local al sistema' },
      { v: 'P', label: 'Physical',         score: 0.20, desc: 'Requiere acceso físico al hardware' },
    ]
  },
  AC: {
    label: 'Attack Complexity', abbr: 'AC',
    options: [
      { v: 'L', label: 'Low',    score: 0.77, desc: 'No existen condiciones especiales de acceso' },
      { v: 'H', label: 'High',   score: 0.44, desc: 'Existen condiciones específicas difíciles de reproducir' },
    ]
  },
  PR: {
    label: 'Privileges Required', abbr: 'PR',
    options: [
      { v: 'N', label: 'None',   score: 0.85, desc: 'No se requieren privilegios' },
      { v: 'L', label: 'Low',    score: 0.62, desc: 'Se requieren privilegios básicos de usuario' },
      { v: 'H', label: 'High',   score: 0.27, desc: 'Se requieren privilegios de administrador' },
    ]
  },
  UI: {
    label: 'User Interaction', abbr: 'UI',
    options: [
      { v: 'N', label: 'None',     score: 0.85, desc: 'No se requiere interacción del usuario' },
      { v: 'R', label: 'Required', score: 0.62, desc: 'El ataque requiere acción de un usuario' },
    ]
  },
  S: {
    label: 'Scope', abbr: 'S',
    options: [
      { v: 'U', label: 'Unchanged', desc: 'El impacto se limita al componente vulnerable' },
      { v: 'C', label: 'Changed',   desc: 'El impacto puede afectar otros componentes' },
    ]
  },
  C: {
    label: 'Confidentiality', abbr: 'C',
    options: [
      { v: 'N', label: 'None',   score: 0.00, desc: 'Sin pérdida de confidencialidad' },
      { v: 'L', label: 'Low',    score: 0.22, desc: 'Pérdida parcial de información' },
      { v: 'H', label: 'High',   score: 0.56, desc: 'Pérdida total de confidencialidad' },
    ]
  },
  I: {
    label: 'Integrity', abbr: 'I',
    options: [
      { v: 'N', label: 'None',   score: 0.00, desc: 'Sin pérdida de integridad' },
      { v: 'L', label: 'Low',    score: 0.22, desc: 'Modificación parcial de datos' },
      { v: 'H', label: 'High',   score: 0.56, desc: 'Modificación total de datos' },
    ]
  },
  A: {
    label: 'Availability', abbr: 'A',
    options: [
      { v: 'N', label: 'None',   score: 0.00, desc: 'Sin impacto en disponibilidad' },
      { v: 'L', label: 'Low',    score: 0.22, desc: 'Degradación del rendimiento' },
      { v: 'H', label: 'High',   score: 0.56, desc: 'Pérdida total de disponibilidad' },
    ]
  },
}

const DEFAULT = { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'L', I: 'L', A: 'L' }

function calcCVSS(sel) {
  const av  = METRICS.AV.options.find(o => o.v === sel.AV)?.score ?? 0
  const ac  = METRICS.AC.options.find(o => o.v === sel.AC)?.score ?? 0
  const pr  = METRICS.PR.options.find(o => o.v === sel.PR)?.score ?? 0
  const ui  = METRICS.UI.options.find(o => o.v === sel.UI)?.score ?? 0
  const cia = ['C','I','A'].map(m => METRICS[m].options.find(o => o.v === sel[m])?.score ?? 0)

  const scope  = sel.S === 'C'
  // Modified PR when scope changed
  const prMod  = scope ? { N: 0.85, L: 0.68, H: 0.50 }[sel.PR] ?? pr : pr

  const iss = 1 - (1 - cia[0]) * (1 - cia[1]) * (1 - cia[2])
  const impact = scope
    ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15)
    : 6.42 * iss

  const exploit = 8.22 * av * ac * prMod * ui

  if (impact <= 0) return 0.0

  const base = scope
    ? Math.min(1.08 * (impact + exploit), 10)
    : Math.min(impact + exploit, 10)

  return Math.ceil(base * 10) / 10
}

function severity(score) {
  if (score === 0)       return { label: 'None',     color: '#6b7280', bg: 'rgba(107,114,128,0.15)' }
  if (score < 4)        return { label: 'Low',       color: '#22c55e', bg: 'rgba(34,197,94,0.15)' }
  if (score < 7)        return { label: 'Medium',    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' }
  if (score < 9)        return { label: 'High',      color: '#f97316', bg: 'rgba(249,115,22,0.15)' }
  return                       { label: 'Critical',  color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
}

function vectorString(sel) {
  return `CVSS:3.1/AV:${sel.AV}/AC:${sel.AC}/PR:${sel.PR}/UI:${sel.UI}/S:${sel.S}/C:${sel.C}/I:${sel.I}/A:${sel.A}`
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#ef4444' : '#6b7280', transition: 'color .2s', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

export default function ToolCVSS() {
  const [sel, setSel] = useState(DEFAULT)
  const score   = useMemo(() => calcCVSS(sel), [sel])
  const sev     = severity(score)
  const vector  = vectorString(sel)

  const set = (m, v) => setSel(prev => ({ ...prev, [m]: v }))
  const reset = () => setSel(DEFAULT)

  const groups = [
    { title: 'Exploitability', color: '#f97316', metrics: ['AV','AC','PR','UI'] },
    { title: 'Scope',          color: '#a855f7', metrics: ['S'] },
    { title: 'Impact',         color: '#ef4444', metrics: ['C','I','A'] },
  ]

  return (
    <ToolShell icon="🛡️" name="CVSS 3.1 Calculator" color={COLOR} badge="Common Vulnerability Scoring System">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>

          {/* Metrics panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {groups.map(group => (
              <div key={group.title}>
                <p style={{ color: group.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, opacity: 0.9 }}>{group.title}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {group.metrics.map(m => {
                    const metric = METRICS[m]
                    return (
                      <div key={m} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
                        <p style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {metric.abbr} — {metric.label}
                        </p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {metric.options.map(opt => {
                            const active = sel[m] === opt.v
                            return (
                              <button
                                key={opt.v}
                                onClick={() => set(m, opt.v)}
                                title={opt.desc}
                                style={{
                                  padding: '5px 14px', borderRadius: 7, cursor: 'pointer',
                                  border: `1px solid ${active ? group.color : 'rgba(255,255,255,0.1)'}`,
                                  background: active ? `${group.color}22` : 'rgba(255,255,255,0.04)',
                                  color: active ? group.color : '#6b7280',
                                  fontWeight: active ? 700 : 400,
                                  fontSize: 12, transition: 'all .15s',
                                }}
                              >
                                {opt.v} — {opt.label}
                              </button>
                            )
                          })}
                        </div>
                        {/* Description of selected */}
                        <p style={{ color: '#4b5563', fontSize: 11, marginTop: 8 }}>
                          {metric.options.find(o => o.v === sel[m])?.desc}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <button
              onClick={reset}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#6b7280', cursor: 'pointer', fontSize: 12, width: 'fit-content' }}
            >
              <RefreshCw size={12} /> Reset
            </button>
          </div>

          {/* Score panel */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: sev.bg, border: `1px solid ${sev.color}44`, borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 16 }}>
              <p style={{ color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>CVSS Score</p>
              <div style={{ fontSize: 64, fontWeight: 900, color: sev.color, lineHeight: 1 }}>{score.toFixed(1)}</div>
              <div style={{ marginTop: 10, display: 'inline-block', padding: '4px 16px', borderRadius: 20, border: `1px solid ${sev.color}66`, background: `${sev.color}18` }}>
                <span style={{ color: sev.color, fontWeight: 700, fontSize: 14 }}>{sev.label}</span>
              </div>
            </div>

            {/* Score bar */}
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, height: 8, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ height: '100%', width: `${score * 10}%`, background: sev.color, borderRadius: 8, transition: 'all .3s' }} />
            </div>

            {/* Sub-scores */}
            {[
              { label: 'Exploitability', value: (() => { const av = METRICS.AV.options.find(o=>o.v===sel.AV)?.score??0; const ac = METRICS.AC.options.find(o=>o.v===sel.AC)?.score??0; const pr = METRICS.PR.options.find(o=>o.v===sel.PR)?.score??0; const ui = METRICS.UI.options.find(o=>o.v===sel.UI)?.score??0; return (8.22*av*ac*pr*ui).toFixed(2) })(), color: '#f97316' },
              { label: 'Confidentiality', value: sel.C, color: '#a855f7' },
              { label: 'Integrity',       value: sel.I, color: '#a855f7' },
              { label: 'Availability',    value: sel.A, color: '#a855f7' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#6b7280', fontSize: 12 }}>{label}</span>
                <span style={{ color, fontSize: 12, fontWeight: 600 }}>{value}</span>
              </div>
            ))}

            {/* Vector string */}
            <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ color: '#6b7280', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vector String</span>
                <CopyBtn text={vector} />
              </div>
              <p style={{ color: '#e2e8f0', fontSize: 10, fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.8 }}>{vector}</p>
            </div>

            {/* Severity reference */}
            <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ color: '#4b5563', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Referencia</p>
              {[
                { r: '0.0',       label: 'None',     color: '#6b7280' },
                { r: '0.1 – 3.9', label: 'Low',      color: '#22c55e' },
                { r: '4.0 – 6.9', label: 'Medium',   color: '#f59e0b' },
                { r: '7.0 – 8.9', label: 'High',     color: '#f97316' },
                { r: '9.0 – 10.0',label: 'Critical', color: '#ef4444' },
              ].map(({ r, label, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#4b5563', fontSize: 11 }}>{r}</span>
                  <span style={{ color, fontSize: 11, fontWeight: 600 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolShell>
  )
}
