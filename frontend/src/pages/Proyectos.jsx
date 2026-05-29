import { useState, useRef, useEffect } from 'react'

const STORAGE_KEY = 'bdev_proyectos'
import { Github, Globe, ExternalLink, Plus, Pencil, Trash2, BookOpen, X, Save } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'EN_PROGRESO',  label: 'En Progreso',  cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'COMPLETADO',   label: 'Completado',   cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'PAUSADO',      label: 'Pausado',      cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'IDEA',         label: 'Idea',         cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'ARCHIVADO',    label: 'Archivado',    cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
]

const SEED_PROJECTS = [
  {
    id: 1, title: 'B-DEVOPS', description: 'Suite de ciberseguridad y OSINT full-stack. FastAPI + React. Auto-auditorías, herramientas OSINT, GRC, Attack Surface monitor.',
    githubUrl: 'https://github.com/', liveUrl: '',
    technologies: 'Python, FastAPI, React, Vite, Tailwind, Shodan, VirusTotal',
    status: 'EN_PROGRESO', isVisible: true,
    documentation: '# B-DEVOPS\n\nSuite de ciberseguridad OSINT full-stack.\n\n## Stack\n- Backend: Python + FastAPI\n- Frontend: React + Vite + Tailwind\n\n## Módulos\n- Auto Auditoría\n- Ciber Inteligencia (OSINT)\n- Herramientas+\n- Matriz GRC\n- Attack Surface Monitor\n- BCP'
  },
  {
    id: 2, title: 'Portfolio Personal', description: 'Portfolio web personal con proyectos, habilidades y contacto.',
    githubUrl: 'https://github.com/', liveUrl: '',
    technologies: 'Angular, Tailwind, TypeScript',
    status: 'EN_PROGRESO', isVisible: true,
    documentation: '# Portfolio Personal\n\nSitio web de portfolio con Angular 18.'
  },
]

function renderMarkdown(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-white font-semibold text-sm mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 class="text-white font-semibold mt-5 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 class="text-white font-bold text-lg border-b border-gray-700 pb-2 mt-2 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre class="bg-dark-100 border border-surface-border rounded p-3 overflow-x-auto text-green-400 text-xs my-2 font-mono">$1</pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-dark-100 text-crimson px-1 rounded text-xs font-mono">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="text-gray-400 text-sm ml-4 list-disc">$1</li>')
    .replace(/^(?!<[hpuol])(.+)$/gm, '<p class="text-gray-400 text-sm leading-relaxed my-1">$1</p>')
}

const ACCENT_BORDERS = [
  'border-t-crimson', 'border-t-blue-500', 'border-t-green-500',
  'border-t-purple-500', 'border-t-orange-500', 'border-t-cyan-500',
]

const emptyForm = () => ({
  title: '', description: '', githubUrl: '', liveUrl: '',
  technologies: '', status: 'EN_PROGRESO', isVisible: true, documentation: ''
})

function loadProjects() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : SEED_PROJECTS
  } catch { return SEED_PROJECTS }
}

export default function Proyectos() {
  const [projects, setProjects] = useState(loadProjects)
  const [filterStatus, setFilterStatus] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [docsProject, setDocsProject] = useState(null)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)) } catch {}
  }, [projects])

  const filtered = filterStatus ? projects.filter(p => p.status === filterStatus) : projects

  function openCreate() {
    setForm(emptyForm())
    setEditingId(null)
    setShowModal(true)
  }
  function openEdit(p) {
    setForm({ ...p })
    setEditingId(p.id)
    setShowModal(true)
  }
  function save() {
    if (!form.title.trim()) return
    if (editingId) {
      setProjects(ps => ps.map(p => p.id === editingId ? { ...form, id: editingId } : p))
    } else {
      setProjects(ps => [...ps, { ...form, id: Date.now() }])
    }
    setShowModal(false)
  }
  function del(id) {
    if (!confirm('¿Eliminar este proyecto?')) return
    setProjects(ps => ps.filter(p => p.id !== id))
  }

  const statusCls = (s) => STATUS_OPTIONS.find(x => x.value === s)?.cls ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  const statusLabel = (s) => STATUS_OPTIONS.find(x => x.value === s)?.label ?? s

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <span className="text-crimson">💼</span> Proyectos & Portfolio
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 font-mono">
            {projects.length} proyectos · gestión de portfolio y webs
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-crimson hover:bg-crimson-dark text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> Nuevo proyecto
        </button>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterStatus(null)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
            !filterStatus ? 'bg-crimson/20 text-crimson border-crimson/40' : 'text-gray-400 border-surface-border hover:border-gray-500'
          }`}>
          Todos ({projects.length})
        </button>
        {STATUS_OPTIONS.map(s => (
          <button key={s.value} onClick={() => setFilterStatus(s.value === filterStatus ? null : s.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              filterStatus === s.value ? s.cls : 'text-gray-400 border-surface-border hover:border-gray-500'
            }`}>
            {s.label} ({projects.filter(p => p.status === s.value).length})
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((p, i) => (
          <div key={p.id}
            className="bg-dark-300 border border-surface-border rounded-xl overflow-hidden hover:border-crimson/30 transition-all duration-300 flex flex-col">
            <div className={`h-1 w-full bg-gradient-to-r ${
              ['from-crimson to-red-700','from-blue-500 to-cyan-500','from-green-500 to-emerald-500',
               'from-purple-500 to-violet-500','from-orange-500 to-amber-500','from-cyan-500 to-teal-500'][i % 6]
            }`} />
            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-white font-semibold text-sm leading-tight flex-1">{p.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusCls(p.status)}`}>
                  {statusLabel(p.status)}
                </span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed flex-1 mb-3 line-clamp-2">{p.description || 'Sin descripción.'}</p>
              {p.technologies && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {p.technologies.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-crimson/10 text-crimson border border-crimson/20">{t}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1 pt-3 border-t border-surface-border">
                {p.githubUrl && (
                  <a href={p.githubUrl} target="_blank" rel="noopener"
                    className="flex items-center gap-1 text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-surface transition-colors">
                    <Github size={12} /> GitHub
                  </a>
                )}
                {p.liveUrl && (
                  <a href={p.liveUrl} target="_blank" rel="noopener"
                    className="flex items-center gap-1 text-gray-400 hover:text-green-400 text-xs px-2 py-1 rounded hover:bg-surface transition-colors">
                    <Globe size={12} /> Live <ExternalLink size={10} />
                  </a>
                )}
                <div className="flex-1" />
                <button onClick={() => setDocsProject(p)}
                  className="p-1.5 rounded text-gray-500 hover:text-crimson hover:bg-crimson/10 transition-colors">
                  <BookOpen size={13} />
                </button>
                <button onClick={() => openEdit(p)}
                  className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-surface-light transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => del(p.id)}
                  className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty */}
        {filtered.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center h-48 text-gray-500">
            <span className="text-4xl mb-3">💼</span>
            <p className="text-sm">No hay proyectos en esta categoría</p>
          </div>
        )}
      </div>

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-dark-200 border border-surface-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
              <h3 className="text-white font-semibold">{editingId ? 'Editar proyecto' : 'Nuevo proyecto'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 block">Título *</label>
                <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  placeholder="Mi proyecto" className="input-field w-full" />
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 block">Descripción</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  rows={2} placeholder="¿De qué trata?" className="input-field w-full resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 block">GitHub URL</label>
                  <input value={form.githubUrl} onChange={e => setForm(f => ({...f, githubUrl: e.target.value}))}
                    placeholder="https://github.com/..." className="input-field w-full" />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 block">Live URL</label>
                  <input value={form.liveUrl} onChange={e => setForm(f => ({...f, liveUrl: e.target.value}))}
                    placeholder="https://..." className="input-field w-full" />
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 block">Tecnologías (separadas por coma)</label>
                <input value={form.technologies} onChange={e => setForm(f => ({...f, technologies: e.target.value}))}
                  placeholder="React, FastAPI, Docker" className="input-field w-full" />
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 block">Estado</label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s.value} onClick={() => setForm(f => ({...f, status: s.value}))}
                      className={`text-xs px-2 py-2 rounded-lg border transition-all text-center ${
                        form.status === s.value ? s.cls + ' font-semibold' : 'text-gray-400 border-surface-border hover:border-gray-500'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 block">Documentación (Markdown)</label>
                <textarea value={form.documentation} onChange={e => setForm(f => ({...f, documentation: e.target.value}))}
                  rows={6} placeholder={'# Mi proyecto\n\nEscribe documentación en Markdown...'}
                  className="input-field w-full resize-none font-mono text-xs" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isVisible} onChange={e => setForm(f => ({...f, isVisible: e.target.checked}))}
                  className="w-4 h-4 accent-crimson" />
                <span className="text-gray-300 text-sm">Visible en portfolio</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg border border-surface-border hover:border-gray-500 transition-colors">
                Cancelar
              </button>
              <button onClick={save} disabled={!form.title.trim()}
                className="flex items-center gap-2 bg-crimson hover:bg-crimson-dark disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                <Save size={14} /> {editingId ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Docs */}
      {docsProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDocsProject(null)}>
          <div className="bg-dark-200 border border-surface-border rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl animate-fade-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-semibold">{docsProject.title}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusCls(docsProject.status)}`}>
                    {statusLabel(docsProject.status)}
                  </span>
                </div>
                <div className="flex gap-3 mt-1">
                  {docsProject.githubUrl && (
                    <a href={docsProject.githubUrl} target="_blank" rel="noopener"
                      className="flex items-center gap-1 text-gray-400 hover:text-white text-xs transition-colors">
                      <Github size={11} /> GitHub
                    </a>
                  )}
                  {docsProject.liveUrl && (
                    <a href={docsProject.liveUrl} target="_blank" rel="noopener"
                      className="flex items-center gap-1 text-gray-400 hover:text-green-400 text-xs transition-colors">
                      <Globe size={11} /> Ver en vivo <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
              <button onClick={() => setDocsProject(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              {docsProject.documentation
                ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(docsProject.documentation) }} />
                : <p className="text-gray-500 text-sm text-center mt-12">Sin documentación todavía.</p>
              }
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input-field {
          background: #12122a; border: 1px solid #2a2a4a; border-radius: 8px;
          padding: 8px 12px; color: #e2e8f0; font-size: 13px; outline: none; transition: border-color 0.2s;
        }
        .input-field:focus { border-color: rgba(230,57,70,0.5); }
        .line-clamp-2 { display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }
      `}</style>
    </div>
  )
}
