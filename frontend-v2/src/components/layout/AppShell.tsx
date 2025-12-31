import { ReactNode } from 'react'
import Head from 'next/head'
import { Sidebar } from '@/components/navigation/Sidebar'
import { WithAuth } from '@/components/auth/WithAuth'
import { Topbar } from '@/components/layout/Topbar'

export function AppShell({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <WithAuth>
      {title ? (
        <Head>
          <title>{title} - AttendanceX</title>
        </Head>
      ) : null}
      <div className="relative h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white flex">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 blur-3xl opacity-60 dark:from-blue-900/30 dark:to-indigo-900/30" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-sky-200 to-cyan-200 blur-3xl opacity-50 dark:from-sky-900/30 dark:to-cyan-900/30" />
        </div>
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar title={title} />
          <main className="flex-1 min-h-0 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </WithAuth>
  )
}

