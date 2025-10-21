import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { useState } from 'react'
import { RefreshTokenHandler } from '@/components/auth/RefreshTokenHandler'

export default function App({ Component, pageProps }: AppProps) {
  const { session, ...rest } = pageProps as any
  const [refreshInterval, setRefreshInterval] = useState<number>(0)
  return (
    <SessionProvider session={session} refetchInterval={refreshInterval}>
      <RefreshTokenHandler setRefreshInterval={setRefreshInterval} />
      <Component {...rest} />
    </SessionProvider>
  )
}
