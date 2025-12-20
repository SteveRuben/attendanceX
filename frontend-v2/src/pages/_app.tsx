import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { RefreshTokenHandler } from '@/components/auth/RefreshTokenHandler'
import { Toaster } from '@/components/ui/Toaster'
import { setApiAccessToken } from '@/services/apiClient'
import { TenantProvider } from '@/contexts/TenantContext'
import { ClientOnlyProvider } from '@/components/providers/ClientOnlyProvider'
import ErrorBoundary from '@/components/ErrorBoundary'

function SessionTokenSync({ session }: { session: any }) {
  useEffect(() => {
    if (session?.accessToken) {
      setApiAccessToken(session.accessToken)
    }
  }, [session?.accessToken])
  return null
}

export default function App({ Component, pageProps }: AppProps) {
  const { session, ...rest } = pageProps as any
  const [refreshInterval, setRefreshInterval] = useState<number>(0)
  const [currentSession, setCurrentSession] = useState<any>(session)

  return (
    <ErrorBoundary>
      <ClientOnlyProvider>
        <SessionProvider session={session} refetchInterval={refreshInterval}>
          <RefreshTokenHandler
            setRefreshInterval={setRefreshInterval}
            onSessionUpdate={(s) => {
              setCurrentSession(s)
              setApiAccessToken((s as any)?.accessToken)
            }}
          />
          <SessionTokenSync session={currentSession} />
          <TenantProvider>
            <Component {...rest} />
            <div id="toaster-root">
              <Toaster />
            </div>
          </TenantProvider>
        </SessionProvider>
      </ClientOnlyProvider>
    </ErrorBoundary>
  )
}
