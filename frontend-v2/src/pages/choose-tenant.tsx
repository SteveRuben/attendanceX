import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { apiClient } from '@/services/apiClient'
import { Button } from '@/components/ui/button'
import Head from 'next/head'


export default function ChooseTenant() {
  const router = useRouter()
  const { status } = useSession()
  const [loading, setLoading] = useState(true)
  const [tenants, setTenants] = useState<any[]>([])

  useEffect(() => {
    if (status !== 'authenticated') return
    ;(async () => {
      try {
        const list = await apiClient.get<any[]>('/tenants', { withAuth: true, withToast: { loading: 'Loading your workspaces...' } })
        setTenants(Array.isArray(list) ? list : (list as any)?.items || [])
      } catch {
        setTenants([])
      } finally {
        setLoading(false)
      }
    })()
  }, [status])

  const selectTenant = (id: string) => {
    if (typeof window !== 'undefined') localStorage.setItem('currentTenantId', String(id))
    router.replace('/app')
  }

  if (status !== 'authenticated') return null


  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white relative">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Head>
          <title>Choose workspace - AttendanceX</title>
        </Head>
        <h1 className="text-2xl font-semibold mb-6">Choose a workspace</h1>
        {loading ? (

          <p className="text-sm text-neutral-500">Loading...</p>
        ) : tenants.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">You don&apos;t belong to any workspace yet.</p>
            <Button onClick={() => router.replace('/onboarding/create-workspace')}>Create a workspace</Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {tenants.map(t => (
              <button key={t.id || t.tenantId} onClick={() => selectTenant(t.id || t.tenantId)} className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <div>
                  <p className="font-medium">{t.name || 'Workspace'}</p>
                  <p className="text-xs text-neutral-500">{t.slug}</p>
                </div>
                <span className="text-xs text-neutral-500">Select</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

