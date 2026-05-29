import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

const TOKEN_KEY  = 'aura_token'
const ROLE_KEY   = 'aura_role'

export function AuthProvider({ children }) {
  const [token,    setToken]    = useState(() => localStorage.getItem(TOKEN_KEY))
  const [role,     setRole]     = useState(() => localStorage.getItem(ROLE_KEY) || 'user')
  const [checking, setChecking] = useState(true)

  // Set axios header whenever token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      delete api.defaults.headers.common['Authorization']
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(ROLE_KEY)
    }
    setChecking(false)
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
