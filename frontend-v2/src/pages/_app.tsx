import '@/styles/globals.css'
import '@/styles/animations.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/Toaster'
import { setApiAccessToken } from '@/services/apiClient'
import { TenantProvider } from '@/contexts/TenantContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ClientOnlyProvider } from '@/components/providers/ClientOnlyProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import { NotificationProvider } from '@/components/ui/notification-system'
import { authService } from '@/services/authService'

// Import auth debug utility in development
if (process.env.NODE_ENV === 'development') {
  import('@/utils/authDebug')
}

function TokenSync() {
  useEffect(() => {
    const token = authService.getToken()
    if (token) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 Setting API access token from localStorage')
      }
      setApiAccessToken(token)
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ No access token found, clearing API token')
      }
      setApiAccessToken(undefined)
    }
  }, [])
  return null
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <ClientOnlyProvider>
        <AuthProvider>
          <TokenSync />
          <NotificationProvider>
            <TenantProvider>
              <Component {...pageProps} />
              <div id="toaster-root">
                <Toaster />
              </div>
            </TenantProvider>
          </NotificationProvider>
        </AuthProvider>
      </ClientOnlyProvider>
    </ErrorBoundary>
  )
}
