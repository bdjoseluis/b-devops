import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

const TOKEN_KEY = 'aura_token'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [checking, setChecking] = useState(true)

  // Set axios header whenever token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      delete api.defaults.headers.common['Authorization']
      localStorage.removeItem(TOKEN_KEY)
    }
    setChecking(false)
  }, [token])

  const login = async (password) => {
    const res = await api.post('/auth/login', { password }).then(r => r.data)
    setToken(res.token)
    return res
  }

  const logout = () => setToken(null)

  return (
    <AuthContext.Provider value={{ token, login, logout, checking }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
