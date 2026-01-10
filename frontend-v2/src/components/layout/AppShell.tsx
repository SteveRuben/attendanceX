import { ReactNode, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/navigation/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

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

export function AppShell({ title, children }: { title?: string; children: ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading
    
    if (status === 'unauthenticated') {
      console.log('🔒 AppShell: User not authenticated, redirecting to login')
      router.replace('/auth/login')
      return
    }
  }, [status, router])

  // Show loading while checking authentication
  if (status === 'loading') {
    return <LoadingScreen />
  }

  // Show loading while redirecting unauthenticated users
  if (status === 'unauthenticated') {
    return <LoadingScreen />
  }

  // User is authenticated, show the app
  return (
    <>
      {title ? (
        <Head>
          <title>{title} - AttendanceX</title>
        </Head>
      ) : null}
      <div className="relative h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white flex overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 blur-3xl opacity-60 dark:from-blue-900/30 dark:to-indigo-900/30" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-sky-200 to-cyan-200 blur-3xl opacity-50 dark:from-sky-900/30 dark:to-cyan-900/30" />
        </div>
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar title={title} />
          <main className="flex-1 min-h-0">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}

