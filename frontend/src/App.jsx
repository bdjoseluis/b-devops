import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import TopBar from './components/TopBar'
import { useAuth } from './context/AuthContext'
import Galaxy from './pages/Galaxy'
import Dashboard from './pages/Dashboard'
import CiberInteligencia from './pages/CiberInteligencia'
import CommandCenter from './pages/CommandCenter'
import Terminal from './pages/Terminal'
import MatrizGRC from './pages/MatrizGRC'
import Reportes from './pages/Reportes'
import Configuracion from './pages/Configuracion'
import Herramientas from './pages/Herramientas'
import TempMail from './pages/TempMail'
import Prospector from './pages/Prospector'
import AutoAudit from './pages/AutoAudit'
import Proyectos from './pages/Proyectos'
import Scripts from './pages/Scripts'
import AttackSurface from './pages/AttackSurface'
import Explorador from './pages/Explorador'
import BCP from './pages/BCP'
import DevOpsHub from './pages/DevOpsHub'
import Portal from './pages/Portal'
import Monitor from './pages/Monitor'
import Clientes from './pages/Clientes'
import Infra from './pages/Infra'
import Pivot from './pages/Pivot'
import Workspace from './pages/Workspace'
import N8nHub from './pages/N8nHub'
import Servicios from './pages/Servicios'
// Tool pages (fullscreen, no sidebar)
import ToolCensys      from './pages/ToolCensys'
import ToolShodan      from './pages/ToolShodan'
import ToolHunter      from './pages/ToolHunter'
import ToolVirusTotal  from './pages/ToolVirusTotal'
import ToolURLScan     from './pages/ToolURLScan'
import ToolWayback     from './pages/ToolWayback'
import ToolDNS         from './pages/ToolDNS'
import ToolWHOIS       from './pages/ToolWHOIS'
import ToolDeHashed    from './pages/ToolDeHashed'
import ToolHIBP        from './pages/ToolHIBP'
import ToolNmap        from './pages/ToolNmap'
import ToolExploitDB   from './pages/ToolExploitDB'
import ToolCVE         from './pages/ToolCVE'
import ToolHydra       from './pages/ToolHydra'
import ToolSQLMap      from './pages/ToolSQLMap'
import ToolHashcat     from './pages/ToolHashcat'
import ToolNikto       from './pages/ToolNikto'
import ToolVercel      from './pages/ToolVercel'
import ToolWhatsMyName from './pages/ToolWhatsMyName'
import ToolBGP         from './pages/ToolBGP'
import ToolThreatIntel from './pages/ToolThreatIntel'
import ToolPasswords   from './pages/ToolPasswords'
import ToolIPCalc      from './pages/ToolIPCalc'
import ToolEncoder     from './pages/ToolEncoder'
import ToolRegex       from './pages/ToolRegex'
import ToolHashLookup  from './pages/ToolHashLookup'
import ToolPortScan    from './pages/ToolPortScan'
import ToolSSLCheck    from './pages/ToolSSLCheck'
import ToolSubdomains   from './pages/ToolSubdomains'
import ToolGeoIP        from './pages/ToolGeoIP'
import ToolEmailHeaders from './pages/ToolEmailHeaders'
import ToolQRCode       from './pages/ToolQRCode'
import ToolJSONView     from './pages/ToolJSONView'
import ToolHashGen      from './pages/ToolHashGen'
import ToolCronHelper   from './pages/ToolCronHelper'
import ToolDiff         from './pages/ToolDiff'
import ToolMarkdown     from './pages/ToolMarkdown'
import ToolGroq         from './pages/ToolGroq'
import ToolTimestamp    from './pages/ToolTimestamp'
import ToolColorPicker  from './pages/ToolColorPicker'
import ToolFFUF         from './pages/ToolFFUF'
import ToolGobuster     from './pages/ToolGobuster'
import ToolNFS          from './pages/ToolNFS'
import ToolWpscan       from './pages/ToolWpscan'
import ToolAD           from './pages/ToolAD'
import ToolWireless     from './pages/ToolWireless'
import ToolSocialEng    from './pages/ToolSocialEng'
import ToolOpenVAS      from './pages/ToolOpenVAS'
import ToolCloudAudit   from './pages/ToolCloudAudit'
import ToolIoT          from './pages/ToolIoT'
import ToolPrivesc      from './pages/ToolPrivesc'
import ToolForense      from './pages/ToolForense'
import ToolBlueteam     from './pages/ToolBlueteam'
import ToolTunnels      from './pages/ToolTunnels'
import ToolMetasploit   from './pages/ToolMetasploit'
import ToolJWT          from './pages/ToolJWT'
import ToolCVSS         from './pages/ToolCVSS'
import ToolWhatsApp     from './pages/ToolWhatsApp'
import Leads            from './pages/Leads'
import Outreach         from './pages/Outreach'

// Full-screen routes: no sidebar / topbar
const FULLSCREEN_ROUTES = ['/portal']

export default function App() {
  const { token, checking } = useAuth()
  const location = useLocation()
  const isFullscreen = FULLSCREEN_ROUTES.includes(location.pathname) || location.pathname.startsWith('/tool/')

  if (checking) return null

  // Public galaxy — always accessible at /
  if (location.pathname === '/') return <Galaxy />

  // All other routes require auth
  if (!token) return <Navigate to="/" replace />

  return (
    <div className="flex h-screen overflow-hidden scanlines" style={{ background: '#030008' }}>
      <div className="flex flex-col flex-1 overflow-hidden">
        {!isFullscreen && <TopBar />}
        <main className={`flex-1 overflow-y-auto ${isFullscreen ? '' : 'p-6'}`}>
          <Routes>
            <Route path="/portal"     element={<Portal />} />
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/osint"      element={<CiberInteligencia />} />
            <Route path="/command"    element={<CommandCenter />} />
            <Route path="/herramientas" element={<Herramientas />} />
            <Route path="/terminal"   element={<Terminal />} />
            <Route path="/grc"        element={<MatrizGRC />} />
            <Route path="/reportes"   element={<Reportes />} />
            <Route path="/tempmail"   element={<TempMail />} />
            <Route path="/prospector" element={<Prospector />} />
            <Route path="/audit"      element={<AutoAudit />} />
            <Route path="/config"     element={<Configuracion />} />
            <Route path="/proyectos"  element={<Proyectos />} />
            <Route path="/scripts"    element={<Scripts />} />
            <Route path="/surface"    element={<AttackSurface />} />
            <Route path="/explorador" element={<Explorador />} />
            <Route path="/bcp"        element={<BCP />} />
            <Route path="/devops"     element={<DevOpsHub />} />
            <Route path="/monitor"    element={<Monitor />} />
            <Route path="/clientes"   element={<Clientes />} />
            <Route path="/infra"      element={<Infra />} />
            <Route path="/pivot"      element={<Pivot />} />
            <Route path="/workspace"  element={<Workspace />} />
            <Route path="/n8n"        element={<N8nHub />} />
            <Route path="/servicios"  element={<Servicios />} />
            <Route path="/leads"      element={<Leads />} />
            <Route path="/outreach"   element={<Outreach />} />
            {/* Tool pages — fullscreen, no sidebar */}
            <Route path="/tool/censys"    element={<ToolCensys />} />
            <Route path="/tool/shodan"    element={<ToolShodan />} />
            <Route path="/tool/hunter"    element={<ToolHunter />} />
            <Route path="/tool/virustotal" element={<ToolVirusTotal />} />
            <Route path="/tool/urlscan"   element={<ToolURLScan />} />
            <Route path="/tool/wayback"   element={<ToolWayback />} />
            <Route path="/tool/dns"       element={<ToolDNS />} />
            <Route path="/tool/whois"     element={<ToolWHOIS />} />
            <Route path="/tool/dehashed"  element={<ToolDeHashed />} />
            <Route path="/tool/hibp"      element={<ToolHIBP />} />
            <Route path="/tool/nmap"      element={<ToolNmap />} />
            <Route path="/tool/exploitdb" element={<ToolExploitDB />} />
            <Route path="/tool/cve"       element={<ToolCVE />} />
            <Route path="/tool/hydra"     element={<ToolHydra />} />
            <Route path="/tool/sqlmap"    element={<ToolSQLMap />} />
            <Route path="/tool/hashcat"   element={<ToolHashcat />} />
            <Route path="/tool/nikto"      element={<ToolNikto />} />
            <Route path="/tool/vercel"     element={<ToolVercel />} />
            <Route path="/tool/whatsmyname" element={<ToolWhatsMyName />} />
            <Route path="/tool/bgp"        element={<ToolBGP />} />
            <Route path="/tool/threatintel" element={<ToolThreatIntel />} />
            <Route path="/tool/passwords"  element={<ToolPasswords />} />
            <Route path="/tool/ipcalc"     element={<ToolIPCalc />} />
            <Route path="/tool/encoder"    element={<ToolEncoder />} />
            <Route path="/tool/regex"      element={<ToolRegex />} />
            <Route path="/tool/hashlookup" element={<ToolHashLookup />} />
            <Route path="/tool/portscan"   element={<ToolPortScan />} />
            <Route path="/tool/sslcheck"    element={<ToolSSLCheck />} />
            <Route path="/tool/subdomains"    element={<ToolSubdomains />} />
            <Route path="/tool/geoip"         element={<ToolGeoIP />} />
            <Route path="/tool/emailheaders"  element={<ToolEmailHeaders />} />
            <Route path="/tool/qrcode"        element={<ToolQRCode />} />
            <Route path="/tool/jsonview"      element={<ToolJSONView />} />
            <Route path="/tool/hashgen"       element={<ToolHashGen />} />
            <Route path="/tool/cronhelper"    element={<ToolCronHelper />} />
            <Route path="/tool/diff"          element={<ToolDiff />} />
            <Route path="/tool/markdown"      element={<ToolMarkdown />} />
            <Route path="/tool/groq"          element={<ToolGroq />} />
            <Route path="/tool/timestamp"     element={<ToolTimestamp />} />
            <Route path="/tool/colorpicker"   element={<ToolColorPicker />} />
            <Route path="/tool/ffuf"          element={<ToolFFUF />} />
            <Route path="/tool/gobuster"      element={<ToolGobuster />} />
            <Route path="/tool/nfs"           element={<ToolNFS />} />
            <Route path="/tool/wpscan"        element={<ToolWpscan />} />
            <Route path="/tool/ad"            element={<ToolAD />} />
            <Route path="/tool/wireless"      element={<ToolWireless />} />
            <Route path="/tool/socialeng"     element={<ToolSocialEng />} />
            <Route path="/tool/openvas"       element={<ToolOpenVAS />} />
            <Route path="/tool/cloudaudit"    element={<ToolCloudAudit />} />
            <Route path="/tool/iot"           element={<ToolIoT />} />
            <Route path="/tool/privesc"       element={<ToolPrivesc />} />
            <Route path="/tool/forense"       element={<ToolForense />} />
            <Route path="/tool/blueteam"      element={<ToolBlueteam />} />
            <Route path="/tool/tunnels"       element={<ToolTunnels />} />
            <Route path="/tool/metasploit"    element={<ToolMetasploit />} />
            <Route path="/tool/jwt"           element={<ToolJWT />} />
            <Route path="/tool/cvss"          element={<ToolCVSS />} />
            <Route path="/tool/whatsapp"      element={<ToolWhatsApp />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
