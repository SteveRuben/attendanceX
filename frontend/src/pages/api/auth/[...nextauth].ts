import NextAuth, { NextAuthOptions, Session } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import Credentials from 'next-auth/providers/credentials'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL
const SESSION_MAX_AGE = 7 * 24 * 60 * 60

interface BackendUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  displayName?: string
  role?: string
  emailVerified?: boolean
}

interface LoginResult {
  user: BackendUser | null
  accessToken: string
  refreshToken: string
  expiresIn: number
}

interface RefreshResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

async function backendLogin(email: string, password: string): Promise<LoginResult> {
  if (!API_URL) throw new Error('Missing API_URL')
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, rememberMe: true }),
  })
  const json = await res.json()
  if (!res.ok) {
    const errorMessage = json?.error?.message || json?.message || json?.error || 'AUTH_FAILED'
    throw new Error(errorMessage)
  }
  const data = json?.data ?? json
  const user = data.user || data.profile || null
  const accessToken = data.token || data.accessToken
  const refreshToken = data.refreshToken
  const expiresAt = data.expiresAt
  let expiresIn = data.expiresIn as number | undefined
  if (!expiresIn && expiresAt) {
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
    if (diff > 0) expiresIn = diff
  }
  if (!accessToken || !refreshToken) throw new Error('INVALID_LOGIN_RESPONSE')
  return { user, accessToken, refreshToken, expiresIn: expiresIn ?? 3600 }
}

async function backendRefresh(refreshToken: string): Promise<RefreshResult> {
  if (!API_URL) throw new Error('Missing API_URL')
  
  try {
    const res = await fetch(`${API_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    
    let json
    try {
      json = await res.json()
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError)
      throw new Error(`Invalid JSON response: ${res.status} ${res.statusText}`)
    }
    
    if (!res.ok) {
      console.error('Refresh token failed:', {
        status: res.status,
        statusText: res.statusText,
        response: json
      })
      const errorMessage = json?.error?.message || json?.message || json?.error || `HTTP ${res.status}: ${res.statusText}`
      throw new Error(errorMessage)
    }
    
    const data = json?.data ?? json
    const accessToken = data.accessToken || data.token
    const newRefresh = data.refreshToken || refreshToken
    const expiresIn = Number(data.expiresIn || 3600)
    
    if (!accessToken) {
      console.error('Invalid refresh response - missing accessToken:', data)
      throw new Error('INVALID_REFRESH_RESPONSE')
    }
    
    return { accessToken, refreshToken: newRefresh, expiresIn }
  } catch (error) {
    console.error('Backend refresh error:', error)
    throw error
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE,
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const email = credentials?.email as string
          const password = credentials?.password as string
          if (!email || !password) return null

          const data = await backendLogin(email, password)
          const user = data.user

          return {
            id: user?.id || email,
            name: user?.displayName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || email,
            email: user?.email || email,
            role: user?.role,
            emailVerified: user?.emailVerified ?? false,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresIn: data.expiresIn,
          } as any
        } catch (error: any) {
          console.error('Authorization error:', error.message)
          throw new Error(error.message || 'Authentication failed')
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }): Promise<JWT> {
      if (user) {
        const now = Math.floor(Date.now() / 1000)
        const expiresIn = Number((user as any).expiresIn || 3600)
        return {
          ...token,
          accessToken: (user as any).accessToken,
          refreshToken: (user as any).refreshToken,
          userId: (user as any).id,
          userRole: (user as any).role,
          emailVerified: (user as any).emailVerified,
          expiresAt: now + expiresIn,
          shouldRefreshAccessTokenAt: now + Math.floor(expiresIn * 0.75),
          sessionVersion: Date.now(),
        }
      }

      if (trigger === 'update') {
        return { ...token, sessionVersion: Date.now() }
      }

      const now = Math.floor(Date.now() / 1000)
      const shouldRefreshAt = token.shouldRefreshAccessTokenAt as number | undefined
      if (shouldRefreshAt && now < shouldRefreshAt) {
        return token
      }

      if (!token.refreshToken) {
        return { ...token, error: 'NoRefreshToken' }
      }

      try {
        const refreshed = await backendRefresh(token.refreshToken as string)
        const expiresIn = Number(refreshed.expiresIn || 3600)
        return {
          ...token,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: now + expiresIn,
          shouldRefreshAccessTokenAt: now + Math.floor(expiresIn * 0.75),
          error: undefined,
        }
      } catch (error) {
        console.error('Token refresh failed:', {
          error: error instanceof Error ? error.message : error,
          refreshToken: token.refreshToken ? 'present' : 'missing',
          apiUrl: API_URL
        })
        return { ...token, error: 'RefreshAccessTokenError' }
      }
    },
    async session({ session, token }): Promise<Session> {
      return {
        ...session,
        accessToken: token.accessToken as string,
        refreshToken: token.refreshToken as string,
        expiresAt: token.expiresAt as number,
        shouldRefreshAccessTokenAt: token.shouldRefreshAccessTokenAt as number,
        userId: token.userId as string,
        userRole: token.userRole as string,
        emailVerified: token.emailVerified as boolean,
        sessionVersion: token.sessionVersion as number,
        error: token.error as string | undefined,
      } as any
    },
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/login',
    error: '/auth/login',
  },
  events: {
    async signOut() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentTenantId')
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
}

export default NextAuth(authOptions)

