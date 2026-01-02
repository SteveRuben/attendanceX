import { ReactNode, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
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
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('🔒 WithAuth: User not authenticated, redirecting to login')
      router.replace('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return <>{fallback ?? <LoadingScreen />}</>
  }

  if (!isAuthenticated) {
    return <>{fallback ?? <LoadingScreen />}</>
  }

  return <>{children}</>
}

