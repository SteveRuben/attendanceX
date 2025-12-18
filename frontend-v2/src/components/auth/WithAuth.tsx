import { ReactNode, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-blue-200 dark:border-blue-900" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
        </div>
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">Loading...</p>
      </div>
    </div>
  )
}

export function WithAuth({ children, fallback }: { children?: ReactNode; fallback?: ReactNode }) {
  const { status, data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && (session as any)?.error === 'RefreshAccessTokenError') {
      router.replace('/auth/login')
    }
  }, [status, session, router])

  if (status === 'loading') {
    return <>{fallback ?? <LoadingScreen />}</>
  }

  if (status === 'unauthenticated') {
    return <>{fallback ?? <LoadingScreen />}</>
  }

  if ((session as any)?.error === 'RefreshAccessTokenError') {
    return <>{fallback ?? <LoadingScreen />}</>
  }

  return <>{children}</>
}

