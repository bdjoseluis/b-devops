import { useState, useMemo, useEffect } from 'react'
import { Phone, Mail, Server, Clock, CheckCircle, AlertTriangle, XCircle, Plus, ChevronDown, ChevronRight } from 'lucide-react'

const SEED_SYSTEMS = [
  { id:'s1', name:'Servidor Web Principal',   description:'Nginx + React frontend expuesto a producción',                  rto:4,  rpo:1,  status:'Activo',       priority:'Crítico', owner:'DevOps',   backupSite:'cloud-backup.corp.com', dependencies:['BD Principal','DNS'] },
  { id:'s2', name:'API Backend FastAPI',       description:'Backend FastAPI con todas las rutas OSINT y auditoría',        rto:2,  rpo:0.5,status:'Activo',       priority:'Crítico', owner:'Backend',  backupSite:'api-dr.corp.com',       dependencies:['BD Principal','Redis'] },
  { id:'s3', name:'Base de Datos Principal',  description:'PostgreSQL con todos los datos de clientes e informes',        rto:1,  rpo:0.25,status:'Activo',      priority:'Crítico', owner:'DBA',      backupSite:'db-replica.corp.com',   dependencies:[] },
  { id:'s4', name:'Sistema de Email',          description:'SMTP para envío de informes y alertas automatizadas',         rto:8,  rpo:4,  status:'Activo',       priority:'Alto',    owner:'Ops',      backupSite:'smtp-backup.corp.com',  dependencies:['DNS'] },
  { id:'s5', name:'Herramientas OSINT APIs',   description:'Integraciones con Shodan, VirusTotal, URLScan, etc.',         rto:24, rpo:24, status:'Activo',       priority:'Medio',   owner:'SecOps',   backupSite:'N/A (servicios externos)',dependencies:['Internet'] },
  { id:'s6', name:'n8n / Automatizaciones',    description:'Flujos de n8n para webhooks y notificaciones automáticas',    rto:48, rpo:24, status:'Mantenimiento',priority:'Bajo',    owner:'Ops',      backupSite:'n8n-backup.corp.com',   dependencies:['API Backend'] },
]

const SEED_TEAM = [
  { id:'t1', name:'Responsable Técnico',   role:'CTO / DevOps Lead', phone:'+34 600 000 001', email:'cto@miempresa.com',     responsibility:'Coordinación técnica general y decisiones de arquitectura', available24h:true  },
  { id:'t2', name:'Responsable Seguridad', role:'CISO',              phone:'+34 600 000 002', email:'ciso@miempresa.com',    responsibility:'Gestión de incidentes de seguridad y comunicación con clientes', available24h:true  },
  { id:'t3', name:'DBA',                   role:'Database Admin',    phone:'+34 600 000 003', email:'dba@miempresa.com',     responsibility:'Restauración de bases de datos y backups', available24h:false },
  { id:'t4', name:'Operaciones',           role:'Ops Engineer',      phone:'+34 600 000 004', email:'ops@miempresa.com',     responsibility:'Infraestructura, Docker, Nginx, monitorización', available24h:false },
]

const SEED_PROCEDURES = [
  {
    id:'p1', scenario:'Caída del servidor web (frontend)', priority:'Crítico', expanded: false,
    steps:[
      { order:1, action:'Verificar estado del servicio Nginx',    responsible:'Ops',     duration:'5 min',  done:false },
      { order:2, action:'Revisar logs en /var/log/nginx/',        responsible:'Ops',     duration:'10 min', done:false },
      { order:3, action:'Reiniciar servicio: systemctl restart nginx', responsible:'Ops', duration:'2 min', done:false },
      { order:4, action:'Si persiste, activar sitio de backup',   responsible:'Ops',     duration:'15 min', done:false },
      { order:5, action:'Notificar a clientes si impacto >30min', responsible:'CISO',    duration:'5 min',  done:false },
      { order:6, action:'Registrar incidente en sistema de tickets', responsible:'Ops',  duration:'5 min',  done:false },
    ]
  },
  {
    id:'p2', scenario:'Breach de seguridad / acceso no autorizado', priority:'Crítico', expanded: false,
    steps:[
      { order:1, action:'Aislar el sistema afectado de la red',           responsible:'CISO',  duration:'10 min', done:false },
      { order:2, action:'Preservar evidencias (logs, memoria RAM si posible)', responsible:'CISO', duration:'30 min', done:false },
      { order:3, action:'Identificar alcance: qué datos se vieron comprometidos', responsible:'CISO', duration:'2h', done:false },
      { order:4, action:'Notificar AEPD en <72h si hay datos personales', responsible:'DPO',   duration:'72h',   done:false },
      { order:5, action:'Comunicación a clientes afectados',              responsible:'CISO',  duration:'24h',   done:false },
      { order:6, action:'Restaurar desde backup limpio',                  responsible:'DBA',   duration:'4h',    done:false },
      { order:7, action:'Análisis post-incidente y lecciones aprendidas', responsible:'CTO',   duration:'1 sem', done:false },
    ]
  },
  {
    id:'p3', scenario:'Fallo de base de datos', priority:'Crítico', expanded: false,
    steps:[
      { order:1, action:'Verificar estado de PostgreSQL',                 responsible:'DBA',   duration:'5 min',  done:false },
      { order:2, action:'Revisar logs en /var/log/postgresql/',           responsible:'DBA',   duration:'10 min', done:false },
      { order:3, action:'Intentar reinicio controlado',                   responsible:'DBA',   duration:'10 min', done:false },
      { order:4, action:'Si falla, activar réplica de lectura como primaria', responsible:'DBA', duration:'20 min', done:false },
      { order:5, action:'Verificar integridad de datos',                  responsible:'DBA',   duration:'30 min', done:false },
      { order:6, action:'Restaurar último backup verificado si necesario',responsible:'DBA',   duration:'2-4h',   done:false },
    ]
  },
]

const SEED_TESTS = [
  { id:'b1', date:'2026-03-15', type:'Simulacro DR completo',      scope:'Todos los sistemas críticos',       result:'Parcial',  findings:'API tardó 3h en restaurarse (objetivo: 2h). BD OK.', nextTest:'2026-09-15' },
  { id:'b2', date:'2026-02-01', type:'Test de backup BD',          scope:'Restauración PostgreSQL',           result:'Exitoso',  findings:'Restauración en 45 min. RTO cumplido.',              nextTest:'2026-08-01' },
  { id:'b3', date:'2026-01-10', type:'Test de respuesta incidente',scope:'Simulacro de breach',               result:'Exitoso',  findings:'Equipo notificado en <30min. Protocolo OK.',          nextTest:'2026-07-10' },
  { id:'b4', date:'2025-11-20', type:'Test failover DNS',          scope:'Cambio DNS a IP secundaria',        result:'Exitoso',  findings:'Propagación DNS en 2min. Sin incidencias.',          nextTest:'2026-05-20' },
]

const PRIORITY_CLS = { 'Crítico':'bg-red-900/30 text-red-400 border-red-500/30', 'Alto':'bg-orange-900/30 text-orange-400 border-orange-500/30', 'Medio':'bg-yellow-900/30 text-yellow-400 border-yellow-500/30', 'Bajo':'bg-blue-900/30 text-blue-400 border-blue-500/30' }
const STATUS_ICON = { 'Activo': <CheckCircle size={14} className="text-green-400" />, 'Degradado': <AlertTriangle size={14} className="text-yellow-400" />, 'Inactivo': <XCircle size={14} className="text-red-400" />, 'Mantenimiento': <Clock size={14} className="text-blue-400" /> }
const TEST_RESULT_CLS = { 'Exitoso':'bg-green-900/30 text-green-400 border-green-500/30', 'Parcial':'bg-yellow-900/30 text-yellow-400 border-yellow-500/30', 'Fallido':'bg-red-900/30 text-red-400 border-red-500/30' }

const SK_BCP = 'bdev_bcp_procedures'
function loadProcedures() {
  try { const s = localStorage.getItem(SK_BCP); return s ? JSON.parse(s) : SEED_PROCEDURES }
  catch { return SEED_PROCEDURES }
}

const TABS = ['sistemas','equipo','procedimientos','pruebas']

export default function BCP() {
  const [activeTab, setActiveTab] = useState('sistemas')
  const [procedures, setProcedures] = useState(loadProcedures)

  useEffect(() => {
    try { localStorage.setItem(SK_BCP, JSON.stringify(procedures)) } catch {}
  }, [procedures])

  function toggleProcedure(id) {
    setProcedures(ps => ps.map(p => p.id === id ? {...p, expanded: !p.expanded} : p))
  }

  function toggleStep(procId, stepOrder) {
    setProcedures(ps => ps.map(p => p.id !== procId ? p : {
      ...p,
      steps: p.steps.map(s => s.order === stepOrder ? {...s, done: !s.done} : s)
    }))
  }

  const activeSystems   = SEED_SYSTEMS.filter(s => s.status === 'Activo').length
  const criticalSystems = SEED_SYSTEMS.filter(s => s.priority === 'Crítico').length
  const avgRTO          = (SEED_SYSTEMS.reduce((s, x) => s + x.rto, 0) / SEED_SYSTEMS.length).toFixed(1)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <span className="text-crimson">⏱️</span> Plan de Continuidad de Negocio
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 font-mono">
            {SEED_SYSTEMS.length} sistemas · {activeSystems} activos · RTO promedio: {avgRTO}h
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-dark-300 border border-surface-border rounded-xl px-4 py-2">
            <p className="text-white font-bold">{activeSystems}</p>
            <p className="text-gray-500 text-[10px]">Activos</p>
          </div>
          <div className="bg-dark-300 border border-surface-border rounded-xl px-4 py-2">
            <p className="text-red-400 font-bold">{criticalSystems}</p>
            <p className="text-gray-500 text-[10px]">Críticos</p>
          </div>
          <div className="bg-dark-300 border border-surface-border rounded-xl px-4 py-2">
            <p className="text-crimson font-bold">{avgRTO}h</p>
            <p className="text-gray-500 text-[10px]">RTO prom.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-300 border border-surface-border rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
              activeTab === t ? 'bg-crimson text-white' : 'text-gray-400 hover:text-white'
            }`}>
            {{ sistemas:'⚙️ Sistemas', equipo:'👥 Equipo BCP', procedimientos:'📋 Procedimientos', pruebas:'🧪 Pruebas' }[t]}
          </button>
        ))}
      </div>

      {/* SISTEMAS */}
      {activeTab === 'sistemas' && (
        <div className="bg-dark-300 border border-surface-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-dark-100/30">
                  {['Sistema','Estado','Prioridad','RTO','RPO','Owner','Backup Site'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 text-[10px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SEED_SYSTEMS.map(sys => (
                  <tr key={sys.id} className="border-b border-surface-border/50 hover:bg-surface/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white text-xs font-semibold">{sys.name}</p>
                      <p className="text-gray-500 text-[10px] mt-0.5 truncate max-w-xs">{sys.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {STATUS_ICON[sys.status]}
                        <span className="text-gray-300 text-xs">{sys.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${PRIORITY_CLS[sys.priority]}`}>{sys.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-crimson font-mono text-xs font-bold">{sys.rto}h</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-yellow-400 font-mono text-xs font-bold">{sys.rpo}h</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{sys.owner}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{sys.backupSite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EQUIPO */}
      {activeTab === 'equipo' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SEED_TEAM.map(member => (
            <div key={member.id} className="bg-dark-300 border border-surface-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-crimson/20 flex items-center justify-center">
                    <span className="text-crimson font-bold text-sm">{member.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{member.name}</p>
                    <p className="text-gray-500 text-xs">{member.role}</p>
                  </div>
                </div>
                {member.available24h && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-500/20">24/7</span>
                )}
              </div>
              <p className="text-gray-400 text-xs mb-3">{member.responsibility}</p>
              <div className="space-y-1.5">
                <a href={`tel:${member.phone}`} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
                  <Phone size={12} className="text-crimson" /> {member.phone}
                </a>
                <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
                  <Mail size={12} className="text-crimson" /> {member.email}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PROCEDIMIENTOS */}
      {activeTab === 'procedimientos' && (
        <div className="space-y-3">
          {procedures.map(proc => {
            const doneCount = proc.steps.filter(s => s.done).length
            const pct = Math.round((doneCount / proc.steps.length) * 100)
            return (
              <div key={proc.id} className="bg-dark-300 border border-surface-border rounded-xl overflow-hidden">
                <button onClick={() => toggleProcedure(proc.id)}
                  className="w-full flex items-start gap-4 p-4 hover:bg-surface/20 transition-colors text-left">
                  {proc.expanded ? <ChevronDown size={15} className="text-gray-500 mt-0.5 shrink-0" /> : <ChevronRight size={15} className="text-gray-500 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">{proc.scenario}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${PRIORITY_CLS[proc.priority]}`}>{proc.priority}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full bg-crimson rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-gray-500 text-[10px]">{doneCount}/{proc.steps.length} pasos</span>
                    </div>
                  </div>
                </button>

                {proc.expanded && (
                  <div className="border-t border-surface-border px-4 pb-4 animate-fade-in">
                    <div className="space-y-2 mt-3">
                      {proc.steps.map(step => (
                        <div key={step.order}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                            step.done ? 'bg-green-900/10 border-green-500/20' : 'bg-surface border-surface-border hover:border-gray-600'
                          }`}
                          onClick={() => toggleStep(proc.id, step.order)}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            step.done ? 'bg-green-500 border-green-500' : 'border-gray-600'
                          }`}>
                            {step.done && <span className="text-white text-[10px] font-bold">✓</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${step.done ? 'text-gray-500 line-through' : 'text-white'}`}>
                              <span className="text-gray-600 mr-1">{step.order}.</span>{step.action}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                              <span>{step.responsible}</span>
                              <span>~{step.duration}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* PRUEBAS */}
      {activeTab === 'pruebas' && (
        <div className="bg-dark-300 border border-surface-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-dark-100/30">
                  {['Fecha','Tipo de prueba','Alcance','Resultado','Hallazgos','Próxima'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 text-[10px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SEED_TESTS.map(test => (
                  <tr key={test.id} className="border-b border-surface-border/50 hover:bg-surface/20 transition-colors">
                    <td className="px-4 py-3 text-gray-300 text-xs font-mono">{test.date}</td>
                    <td className="px-4 py-3 text-white text-xs font-medium">{test.type}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs">{test.scope}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TEST_RESULT_CLS[test.result]}`}>{test.result}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs">{test.findings}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{test.nextTest}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
