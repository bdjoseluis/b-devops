import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

const TOKEN_KEY  = 'aura_token'
const ROLE_KEY   = 'aura_role'

export function AuthProvider({ children }) {
  const [token,    setToken]    = useState(() => localStorage.getItem(TOKEN_KEY))
  const [role,     setRole]     = useState(() => localStorage.getItem(ROLE_KEY) || 'user')
  const [checking, setChecking] = useState(true)

  // Set axios header + validate stored token on first load
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (storedToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
      // Verify token is still valid against the backend
      api.get('/auth/me')
        .then(res => {
          // Token valid — sync role from server response
          const serverRole = res.data?.role || 'user'
          setRole(serverRole)
          localStorage.setItem(ROLE_KEY, serverRole)
        })
        .catch(() => {
          // Token expired or invalid — clear auth state
          setToken(null)
          setRole('user')
          delete api.defaults.headers.common['Authorization']
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(ROLE_KEY)
        })
        .finally(() => setChecking(false))
    } else {
      delete api.defaults.headers.common['Authorization']
      setChecking(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep axios header in sync when token changes after initial load
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      delete api.defaults.headers.common['Authorization']
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(ROLE_KEY)
    }
  }, [token])

  /** Admin login: just password.  User login: username + password. */
  const login = async (password, username = null) => {
    const body = username ? { username, password } : { password }
    const res  = await api.post('/auth/login', body).then(r => r.data)
    setToken(res.token)
    const r = res.role || 'user'
    setRole(r)
    localStorage.setItem(ROLE_KEY, r)
    return res
  }

  const logout = () => {
    setToken(null)
    setRole('user')
  }

  const isAdmin = role === 'admin' || role === 'superadmin'

  return (
    <AuthContext.Provider value={{ token, role, isAdmin, login, logout, checking }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
