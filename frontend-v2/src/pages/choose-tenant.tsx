import { useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/contexts/TenantContext'
import { getOnboardingStatus } from '@/services/tenantService'
import { Button } from '@/components/ui/button'
import Head from 'next/head'
import { WithAuth } from '@/components/auth/WithAuth'

function ChooseTenantContent() {
  const router = useRouter()
  const { availableTenants, isLoading, selectTenant } = useTenant()
  const [selecting, setSelecting] = useState<string | null>(null)

  const handleSelectTenant = async (id: string) => {
    setSelecting(id)
    try {
      await selectTenant(id)
      const st = await getOnboardingStatus(id)
      router.replace(st.completed ? '/app' : '/onboarding/setup')
    } catch (error) {
      console.error('Failed to select tenant:', error)
      setSelecting(null)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white relative">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 blur-3xl opacity-60 dark:from-blue-900/40 dark:to-indigo-900/40" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-sky-200 to-cyan-200 blur-3xl opacity-60 dark:from-sky-900/40 dark:to-cyan-900/40" />
      </div>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Head>
          <title>Choose workspace - AttendanceX</title>
        </Head>
        <h1 className="text-2xl font-semibold mb-6">Choose a workspace</h1>
        {isLoading ? (
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-sm text-neutral-500">Loading workspaces...</p>
          </div>
        ) : availableTenants.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">You don&apos;t belong to any workspace yet.</p>
            <Button onClick={() => router.replace('/onboarding/create-workspace')}>Create a workspace</Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {availableTenants.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelectTenant(t.id)}
                disabled={!!selecting}
                className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 disabled:opacity-50 transition-colors"
              >
                <div className="text-left">
                  <p className="font-medium">{t.name || 'Workspace'}</p>
                  <p className="text-xs text-neutral-500">{t.slug}</p>
                </div>
                {selecting === t.id ? (
                  <div className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                ) : (
                  <span className="text-xs text-neutral-500">Select →</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChooseTenant() {
  const { status } = useSession()

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <WithAuth>
      <ChooseTenantContent />
    </WithAuth>
  )
}

