import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Radio, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import Spinner from '../components/Spinner'

export default function Login() {
  const { login } = useAuth()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!password.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      await login(password)
    } catch (err) {
      setError(err.response?.data?.detail || 'Contraseña incorrecta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-crimson rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-crimson/30">
            <Radio size={32} className="text-white" />
          </div>
          <h1 className="text-white font-bold text-2xl tracking-wider">B-DEVOPS</h1>
          <p className="text-gray-500 text-sm mt-1">Sistema de Ciberinteligencia OSINT</p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="card border-surface-border space-y-4">
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block font-medium">Contraseña de acceso</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Introduce tu contraseña..."
                className="input-dark pl-9 pr-10 w-full"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 rounded-lg border border-red-700/30 text-sm">
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <span className="text-red-300">{error}</span>
            </div>
          )}

          <button type="submit" className="btn-primary w-full py-3" disabled={loading || !password.trim()}>
            {loading ? <><Spinner size={16} /> Verificando...</> : <><Lock size={16} /> Acceder</>}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-4">
          Contraseña por defecto: <code className="text-gray-400">REDACTED</code> · Cámbiala en Configuración
        </p>
      </div>
    </div>
  )
}
