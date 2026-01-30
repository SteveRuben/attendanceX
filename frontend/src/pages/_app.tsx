import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { appWithTranslation } from 'next-i18next'
import nextI18NextConfig from '../../next-i18next.config'
import { RefreshTokenHandler } from '@/components/auth/RefreshTokenHandler'
import { Toaster } from '@/components/ui/Toaster'
import { setApiAccessToken } from '@/services/apiClient'
import { TenantProvider } from '@/contexts/TenantContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { AutoLogoutProvider } from '@/components/providers/AutoLogoutProvider'
import { NotificationProvider } from '@/components/ui/notification-system'
import ErrorBoundary from '@/components/ErrorBoundary'

// Import auth debug utility in development
if (process.env.NODE_ENV === 'development') {
  import('@/utils/authDebug')
}

function SessionTokenSync({ session }: { session: any }) {
  useEffect(() => {
    if (session?.accessToken) {
      setApiAccessToken(session.accessToken)
    }
  }, [session?.accessToken])
  return null
}

function App({ Component, pageProps }: AppProps) {
  const { session, ...rest } = pageProps as any
  const [refreshInterval, setRefreshInterval] = useState<number>(0)
  const [currentSession, setCurrentSession] = useState<any>(session)

  return (
    <ErrorBoundary>
      <SessionProvider session={session} refetchInterval={refreshInterval}>
        <AuthProvider>
          <NotificationProvider>
            <RefreshTokenHandler
              setRefreshInterval={setRefreshInterval}
              onSessionUpdate={(s) => {
                setCurrentSession(s)
                setApiAccessToken((s as any)?.accessToken)
              }}
            />
            <SessionTokenSync session={currentSession} />
            <TenantProvider>
              <AutoLogoutProvider>
                <Component {...rest} />
                <div id="toaster-root">
                  <Toaster />
                </div>
              </AutoLogoutProvider>
            </TenantProvider>
          </NotificationProvider>
        </AuthProvider>
      </SessionProvider>
    </ErrorBoundary>
  )
}

export default appWithTranslation(App, nextI18NextConfig)
