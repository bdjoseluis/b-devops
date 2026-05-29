import { useState, useEffect } from 'react'
import { reports, osint } from '../api/client'
import Spinner from '../components/Spinner'
import { FileText, Download, Plus, Trash2, RefreshCw, File } from 'lucide-react'

export default function Reportes() {
  const [target, setTarget] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [reportList, setReportList] = useState([])
  const [includeAI, setIncludeAI] = useState(true)
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [error, setError] = useState('')
  const [osintData, setOsintData] = useState(null)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      const res = await reports.list()
      setReportList(res.reports || [])
    } catch {}
  }

  const runOsint = async () => {
    if (!target.trim()) return
    setScanning(true)
    setError('')
    setOsintData(null)
    try {
      const result = await osint.analyze(target.trim())
      setOsintData(result)
    } catch (e) {
      setError('Error al recopilar OSINT: ' + (e.response?.data?.detail || e.message))
    } finally {
      setScanning(false)
    }
  }

  const generateReport = async () => {
    if (!osintData && !target.trim()) {
      return setError('Introduce un objetivo primero')
    }
    setLoading(true)
    setError('')
    setGeneratedUrl('')
    try {
      const data = osintData || {}
      const res = await reports.generate(target.trim() || osintData?.target, data, includeAI)
      setGeneratedUrl(reports.downloadUrl(res.filename))
      await loadReports()
    } catch (e) {
      setError('Error al generar reporte: ' + (e.response?.data?.detail || e.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Generator */}
      <div className="card mb-6 border-yellow-700/30">
        <div className="flex items-center gap-2 mb-5">
          <FileText size={18} className="text-yellow-400" />
          <span className="text-yellow-400 font-bold">Generar Reporte DOCX</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Objetivo del análisis</label>
            <div className="flex gap-3">
              <input
                className="input-dark flex-1"
                placeholder="dominio.com · email@empresa.com · 192.168.1.1"
                value={target}
                onChange={e => setTarget(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runOsint()}
              />
              <button
                className="btn-secondary"
                onClick={runOsint}
                disabled={scanning || !target.trim()}
              >
                {scanning ? <Spinner size={16} /> : <RefreshCw size={16} />}
                {scanning ? 'Recopilando...' : 'Recopilar OSINT'}
              </button>
            </div>
          </div>

          {osintData && (
            <div className="p-3 bg-green-900/20 rounded-lg border border-green-700/30 flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="text-green-300 text-sm">
                OSINT recopilado para <strong>{osintData.target}</strong>
                {osintData.dns?.resolved_ip && ` · IP: ${osintData.dns.resolved_ip}`}
                {osintData.subdomains?.total && ` · ${osintData.subdomains.total} subdominios`}
              </span>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAI}
              onChange={e => setIncludeAI(e.target.checked)}
              className="accent-yellow-400"
            />
            <span className="text-gray-300 text-sm">
              Incluir análisis IA (Gemini Flash) — resumen ejecutivo inteligente
            </span>
          </label>

          {error && (
            <div className="p-3 bg-red-900/20 rounded-lg border border-red-700/30">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            className="btn-primary w-full justify-center py-3"
            onClick={generateReport}
            disabled={loading || scanning}
          >
            {loading ? <Spinner size={18} /> : <FileText size={18} />}
            {loading ? 'Generando reporte...' : 'Generar Reporte DOCX'}
          </button>

          {generatedUrl && (
            <a
              href={generatedUrl}
              download
              className="btn-primary w-full justify-center py-3 bg-green-700 hover:bg-green-800"
            >
              <Download size={18} />
              Descargar Reporte Generado
            </a>
          )}
        </div>
      </div>

      {/* Report list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <File size={16} className="text-gray-400" />
            <span className="text-white font-semibold">Reportes Generados</span>
            <span className="badge badge-gray">{reportList.length}</span>
          </div>
          <button className="btn-ghost text-xs" onClick={loadReports}>
            <RefreshCw size={14} />
            Actualizar
          </button>
        </div>

        {reportList.length === 0 ? (
          <div className="text-center py-10 text-gray-600">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay reportes generados aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reportList.map((r) => (
              <div key={r.filename} className="flex items-center gap-4 p-3 rounded-lg bg-surface-light border border-surface-border hover:border-yellow-700/50 transition-all">
                <FileText size={18} className="text-yellow-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{r.filename}</p>
                  <p className="text-gray-500 text-xs">{r.created} · {r.size_kb} KB</p>
                </div>
                <a
                  href={reports.downloadUrl(r.filename)}
                  download
                  className="btn-secondary text-xs py-1.5"
                >
                  <Download size={14} />
                  Descargar
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report info */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Contenido del reporte', items: ['Datos WHOIS y DNS', 'Certificado SSL/TLS', 'Subdominios activos', 'Puertos y servicios Shodan', 'Reputación VirusTotal', 'Emails corporativos', 'Matriz de riesgos'] },
          { title: 'Análisis IA incluido', items: ['Resumen ejecutivo', 'Hallazgos principales', 'Nivel de riesgo global', 'Vectores de ataque', 'Recomendaciones priorizadas', 'Score de exposición'] },
          { title: 'Formato profesional', items: ['Logo AURA OPS', 'Datos del auditor', 'Fecha y IP del análisis', 'Tablas estructuradas', 'Código de colores por riesgo', 'Espacio para firma digital'] },
        ].map(section => (
          <div key={section.title} className="card border-surface-border/50">
            <p className="text-yellow-400 font-semibold text-sm mb-3">{section.title}</p>
            <ul className="space-y-1">
              {section.items.map(item => (
                <li key={item} className="flex items-center gap-2 text-gray-400 text-xs">
                  <div className="w-1 h-1 bg-yellow-400 rounded-full" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
