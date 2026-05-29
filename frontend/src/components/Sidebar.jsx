import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Search, Terminal, Shield, FileText,
  Settings, Zap, ChevronRight, Radio, Wrench, Mail,
  Building2, ScanLine, Briefcase, Map, Clock,
  FolderOpen, Code2, Cloud, LogOut, Globe, Users, Server, Target, Folder, GitBranch, Sparkles
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { to: '/portal',     icon: Radio,           label: 'Centro de Control', highlight: true },
      { to: '/servicios',  icon: Sparkles,        label: 'Servicios & Automatización', highlight: true },
      { to: '/audit',      icon: ScanLine,        label: 'Auto Auditoría' },
      { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
    ]
  },
  {
    label: 'OSINT & Operaciones',
    items: [
      { to: '/pivot',        icon: Target,    label: 'Intelligence Pivot', highlight: true },
      { to: '/osint',        icon: Search,    label: 'Ciber Inteligencia' },
      { to: '/command',      icon: Zap,       label: 'Command Center' },
      { to: '/herramientas', icon: Wrench,    label: 'Herramientas+' },
      { to: '/terminal',     icon: Terminal,  label: 'Terminal IA' },
    ]
  },
  {
    label: 'Riesgo & Análisis',
    items: [
      { to: '/grc',     icon: Shield,    label: 'Matriz GRC' },
      { to: '/surface', icon: Map,       label: 'Attack Surface' },
      { to: '/bcp',     icon: Clock,     label: 'Continuidad BCP' },
    ]
  },
  {
    label: 'Gestión & Portfolio',
    items: [
      { to: '/workspace',  icon: Folder,    label: 'Workspace' },
      { to: '/clientes',   icon: Users,     label: 'Clientes CRM' },
      { to: '/proyectos',  icon: Briefcase, label: 'Proyectos' },
      { to: '/monitor',    icon: Globe,     label: 'Uptime Monitor' },
      { to: '/infra',      icon: Server,    label: 'Infraestructura' },
      { to: '/explorador', icon: FolderOpen,label: 'Explorador Docs' },
      { to: '/devops',     icon: Cloud,     label: 'DevOps Hub' },
      { to: '/prospector', icon: Building2, label: 'Prospector' },
      { to: '/reportes',   icon: FileText,  label: 'Reportes' },
    ]
  },
  {
    label: 'Herramientas',
    items: [
      { to: '/n8n',      icon: GitBranch, label: 'n8n Hub' },
      { to: '/scripts',  icon: Code2,  label: 'Scripts & Automations' },
      { to: '/tempmail', icon: Mail,   label: 'Temp Mail' },
    ]
  },
]

export default function Sidebar() {
  const location = useLocation()
  const { logout } = useAuth()

  return (
    <aside className="w-64 bg-dark-200 border-r border-surface-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 bg-crimson rounded-lg flex items-center justify-center">
              <Radio size={18} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full pulse-dot border-2 border-dark-200" />
          </div>
          <div>
            <div className="text-white font-bold text-lg tracking-wider">AURA OPS</div>
            <div className="text-gray-500 text-xs font-mono">v2.0 · OSINT Suite</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-3">
            <p className="text-gray-600 text-[9px] font-semibold uppercase tracking-widest px-3 mb-1 mt-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label, highlight }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                      isActive
                        ? 'bg-crimson/15 text-crimson border border-crimson/30 glow-border'
                        : highlight
                        ? 'text-crimson border border-crimson/20 bg-crimson/5 hover:bg-crimson/10'
                        : 'text-gray-400 hover:text-white hover:bg-surface-light'
                    }`
                  }
                >
                  <Icon size={15} />
                  <span className="flex-1 text-xs">{label}</span>
                  {highlight && location.pathname !== to && (
                    <span className="text-[10px] bg-crimson text-white px-1.5 py-0.5 rounded font-bold">NEW</span>
                  )}
                  {location.pathname === to && (
                    <ChevronRight size={12} className="text-crimson" />
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-3 border-t border-surface-border mt-2">
          <NavLink
            to="/config"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-crimson/15 text-crimson border border-crimson/30'
                  : 'text-gray-400 hover:text-white hover:bg-surface-light'
              }`
            }
          >
            <Settings size={15} />
            <span className="text-xs">Configuración</span>
          </NavLink>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-surface-border space-y-2">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-900/10 transition-all"
        >
          <LogOut size={13} />
          Cerrar sesión
        </button>
        <div className="text-[10px] text-gray-700 font-mono text-center">
          Solo para auditorías autorizadas
        </div>
      </div>
    </aside>
  )
}
