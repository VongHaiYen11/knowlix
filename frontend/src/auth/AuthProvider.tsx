import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService } from './authService'
import type { AuthUser } from './authTypes'

interface AuthContextValue {
  user: AuthUser | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  login: (input: { email: string; password: string }) => Promise<void>
  signup: (input: { name: string; email: string; password: string }) => Promise<void>
  updateMe: (input: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')

  const refresh = useCallback(async () => {
    try {
      const nextUser = await authService.me()
      setUser(nextUser)
      setStatus('authenticated')
    } catch {
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (input: { email: string; password: string }) => {
    const nextUser = await authService.login(input)
    setUser(nextUser)
    setStatus('authenticated')
  }, [])

  const signup = useCallback(async (input: { name: string; email: string; password: string }) => {
    const nextUser = await authService.signup(input)
    setUser(nextUser)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    await authService.logout().catch(() => undefined)
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const updateMe = useCallback(async (input: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) => {
    const nextUser = await authService.updateMe(input)
    setUser(nextUser)
    setStatus('authenticated')
  }, [])

  const value = useMemo(() => ({ user, status, login, signup, updateMe, logout, refresh }), [user, status, login, signup, updateMe, logout, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
