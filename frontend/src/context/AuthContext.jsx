import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

const TOKEN_KEY   = 'bdev_token'
const REFRESH_KEY = 'bdev_refresh_token'
const ROLE_KEY    = 'bdev_role'

// Renueva el token 2 minutos antes de que caduque
const REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000

function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.exp * 1000  // ms
  } catch {
    return 0
  }
}

function clearStorage() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(ROLE_KEY)
}

export function AuthProvider({ children }) {
  const [token,    setToken]    = useState(() => localStorage.getItem(TOKEN_KEY))
  const [role,     setRole]     = useState(() => localStorage.getItem(ROLE_KEY) || 'user')
  const [checking, setChecking] = useState(true)
  const refreshTimer = useRef(null)

  const scheduleRefresh = useCallback((accessToken) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    const expiry = getTokenExpiry(accessToken)
    if (!expiry) return
    const delay = expiry - Date.now() - REFRESH_BEFORE_EXPIRY_MS
    if (delay <= 0) {
      doRefresh()
      return
    }
    refreshTimer.current = setTimeout(doRefresh, delay)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const doRefresh = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (!refreshToken) { doLogout(); return }
    try {
      const res = await api.post('/auth/refresh', { refresh_token: refreshToken }).then(r => r.data)
      localStorage.setItem(TOKEN_KEY, res.token)
      localStorage.setItem(ROLE_KEY, res.role || 'user')
      api.defaults.headers.common['Authorization'] = `Bearer ${res.token}`
      setToken(res.token)
      setRole(res.role || 'user')
      scheduleRefresh(res.token)
    } catch {
      doLogout()
    }
  }, [scheduleRefresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const doLogout = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (refreshToken) {
      api.post('/auth/logout', { refresh_token: refreshToken }).catch(() => {})
    }
    clearStorage()
    delete api.defaults.headers.common['Authorization']
    setToken(null)
    setRole('user')
  }, [])

  // Validar token almacenado al arrancar
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) { setChecking(false); return }

    api.defaults.headers.common['Authorization'] = `Bearer ${stored}`
    api.get('/auth/me')
      .then(res => {
        const serverRole = res.data?.role || 'user'
        setRole(serverRole)
        localStorage.setItem(ROLE_KEY, serverRole)
        scheduleRefresh(stored)
      })
      .catch(() => doLogout())
      .finally(() => setChecking(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sincronizar header axios cuando cambia el token
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      localStorage.setItem(TOKEN_KEY, token)
    }
  }, [token])

  // Interceptor: si la API devuelve 401 intenta refresh antes de logout
  useEffect(() => {
    const id = api.interceptors.response.use(
      res => res,
      async err => {
        const status = err.response?.status
        const url    = err.config?.url || ''
        if (status === 401 && !url.includes('/auth/refresh') && !url.includes('/auth/login')) {
          await doRefresh()
          // reintentar la petición original con el nuevo token
          err.config.headers['Authorization'] = api.defaults.headers.common['Authorization']
          return api.request(err.config)
        }
        return Promise.reject(err)
      }
    )
    return () => api.interceptors.response.eject(id)
  }, [doRefresh])

  const login = async (password, username = null) => {
    const body = username ? { username, password } : { password }
    const res  = await api.post('/auth/login', body).then(r => r.data)
    localStorage.setItem(TOKEN_KEY, res.token)
    localStorage.setItem(REFRESH_KEY, res.refresh_token)
    localStorage.setItem(ROLE_KEY, res.role || 'user')
    api.defaults.headers.common['Authorization'] = `Bearer ${res.token}`
    setToken(res.token)
    setRole(res.role || 'user')
    scheduleRefresh(res.token)
    return res
  }

  const isAdmin = role === 'admin' || role === 'superadmin'

  return (
    <AuthContext.Provider value={{ token, role, isAdmin, login, logout: doLogout, checking }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
