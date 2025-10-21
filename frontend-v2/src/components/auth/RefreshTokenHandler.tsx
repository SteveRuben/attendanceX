import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

export function RefreshTokenHandler({ setRefreshInterval, onSessionUpdate }: { setRefreshInterval: (n: number) => void; onSessionUpdate?: (s: any) => void }) {
  const { data: session } = useSession()

  useEffect(() => {
    if (session && onSessionUpdate) onSessionUpdate(session as any)
  }, [session, onSessionUpdate])

  useEffect(() => {
    const t = (session as any)?.shouldRefreshAccessTokenAt as number | undefined
    if (!t) return
    const remaining = Math.round(t - Date.now() / 1000)
    setRefreshInterval(remaining > 0 ? remaining : 1)
  }, [session, setRefreshInterval])

  return null
}

