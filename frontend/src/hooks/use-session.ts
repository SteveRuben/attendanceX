import { useSession as useNextAuthSession, signOut, getSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { setApiAccessToken } from '@/services/apiClient'

export interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

export interface ExtendedSession {
  user?: SessionUser
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  shouldRefreshAccessTokenAt?: number
  userId?: string
  userRole?: string
  emailVerified?: boolean
  sessionVersion?: number
  error?: string
  expires: string
}

export interface UseSessionResult {
  session: ExtendedSession | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  isLoading: boolean
  isAuthenticated: boolean
  isError: boolean
  error: string | null
  userId: string | null
  userRole: string | null
  accessToken: string | null
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const SESSION_SYNC_KEY = 'session_sync'
const SESSION_LOGOUT_KEY = 'session_logout'

export function useAppSession(): UseSessionResult {
  const { data: session, status, update } = useNextAuthSession()
  const lastTokenRef = useRef<string | undefined>()

  useEffect(() => {
    const token = (session as any)?.accessToken
    if (token && token !== lastTokenRef.current) {
      lastTokenRef.current = token
      setApiAccessToken(token)
    }
  }, [session])

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SESSION_LOGOUT_KEY && event.newValue) {
        signOut({ redirect: true, callbackUrl: '/auth/login' })
      }
      if (event.key === SESSION_SYNC_KEY && event.newValue) {
        update()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      return () => window.removeEventListener('storage', handleStorageChange)
    }
  }, [update])

  const logout = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_LOGOUT_KEY, Date.now().toString())
        localStorage.removeItem('currentTenantId')
      }
      setApiAccessToken(undefined)
      await signOut({ redirect: true, callbackUrl: '/auth/login' })
    } catch (error) {
      console.error('Logout error:', error)
      window.location.href = '/auth/login'
    }
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const newSession = await getSession()
      if (newSession && typeof window !== 'undefined') {
        localStorage.setItem(SESSION_SYNC_KEY, Date.now().toString())
      }
      await update()
    } catch (error) {
      console.error('Session refresh error:', error)
    }
  }, [update])

  const extendedSession = session as ExtendedSession | null
  const sessionError = extendedSession?.error

  return useMemo(() => ({
    session: extendedSession,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated' && !sessionError,
    isError: !!sessionError,
    error: sessionError || null,
    userId: extendedSession?.userId || null,
    userRole: extendedSession?.userRole || null,
    accessToken: extendedSession?.accessToken || null,
    logout,
    refreshSession,
  }), [extendedSession, status, sessionError, logout, refreshSession])
}

export function useRequireAuth(redirectTo = '/auth/login') {
  const { isAuthenticated, isLoading, isError, logout } = useAppSession()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (typeof window !== 'undefined') {
        window.location.href = redirectTo
      }
    }
  }, [isLoading, isAuthenticated, redirectTo])

  useEffect(() => {
    if (isError) {
      logout()
    }
  }, [isError, logout])

  return { isLoading, isAuthenticated }
}

