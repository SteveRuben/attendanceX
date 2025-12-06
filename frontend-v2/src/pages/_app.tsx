import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { useState } from 'react'
import { RefreshTokenHandler } from '@/components/auth/RefreshTokenHandler'
import { Toaster } from '@/components/ui/Toaster'
import { setApiAccessToken } from '@/services/apiClient'


export default function App({ Component, pageProps }: AppProps) {
  const { session, ...rest } = pageProps as any
  const [refreshInterval, setRefreshInterval] = useState<number>(0)
  return (
    <SessionProvider session={session} refetchInterval={refreshInterval}>
      <RefreshTokenHandler setRefreshInterval={setRefreshInterval} onSessionUpdate={(s) => setApiAccessToken((s as any)?.accessToken)} />
      <Component {...rest} />
      {/* Local toaster */}
      <div id="toaster-root">
        <Toaster />
      </div>
    </SessionProvider>
  )
}
