import NextAuth, { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL

async function backendLogin(email: string, password: string) {
  if (!API_URL) throw new Error('Missing API_URL')
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, rememberMe: false }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || json?.message || 'AUTH_FAILED')
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
  return { user, accessToken, refreshToken, expiresIn }
}

async function backendRefresh(refreshToken: string) {
  if (!API_URL) throw new Error('Missing API_URL')
  const res = await fetch(`${API_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || json?.message || 'REFRESH_FAILED')
  const data = json?.data ?? json
  const accessToken = data.accessToken || data.token
  const newRefresh = data.refreshToken || refreshToken
  const expiresIn = Number(data.expiresIn || 0)
  if (!accessToken) throw new Error('INVALID_REFRESH_RESPONSE')
  return { accessToken, refreshToken: newRefresh, expiresIn }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string
        const password = credentials?.password as string
        if (!email || !password) return null
        const data = await backendLogin(email, password)
        return {
          id: data.user?.id || data.user?._id || email,
          name: data.user?.displayName || `${data.user?.firstName ?? ''} ${data.user?.lastName ?? ''}`.trim() || email,
          email: data.user?.email || email,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn ?? 3600,
        } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if ((user as any)?.accessToken) {
        const now = Math.round(Date.now() / 1000)
        const expiresIn = Number((user as any).expiresIn || 3600)
        token.accessToken = (user as any).accessToken
        token.refreshToken = (user as any).refreshToken
        token.userId = (user as any).id
        token.expiresAt = now + expiresIn
        token.shouldRefreshAccessTokenAt = now + Math.floor(expiresIn * 0.8)
        return token
      }

      if (token.shouldRefreshAccessTokenAt && Date.now() / 1000 < (token.shouldRefreshAccessTokenAt as number)) {
        return token
      }

      if (!token.refreshToken) return token

      try {
        const refreshed = await backendRefresh(token.refreshToken as string)
        const now = Math.round(Date.now() / 1000)
        const expiresIn = Number(refreshed.expiresIn || 3600)
        token.accessToken = refreshed.accessToken
        token.refreshToken = refreshed.refreshToken || token.refreshToken
        token.expiresAt = now + expiresIn
        token.shouldRefreshAccessTokenAt = now + Math.floor(expiresIn * 0.8)
        return token
      } catch {
        ;(token as any).error = 'RefreshAccessTokenError'
        return token
      }
    },
    async session({ session, token }) {
      ;(session as any).accessToken = token.accessToken
      ;(session as any).expiresAt = token.expiresAt
      ;(session as any).shouldRefreshAccessTokenAt = token.shouldRefreshAccessTokenAt
      ;(session as any).userId = token.userId
      ;(session as any).error = (token as any).error
      return session
    },
  },
  pages: { signIn: '/auth/login' },
}

export default NextAuth(authOptions)

