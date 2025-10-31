import { useEffect, useState } from 'react'
import Head from 'next/head'

import { useRouter } from 'next/router'
import { apiClient } from '@/services/apiClient'

export default function AppHome() {
  const router = useRouter()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = typeof window !== 'undefined' ? localStorage.getItem('currentTenantId') : null
    if (!id) {
      router.replace('/choose-tenant')
      return
    }
    setTenantId(id)
    ;(async () => {
      try {
        const list = await apiClient.get<any[]>('/tenants', { withAuth: true, mock: [] })
        const tenants = Array.isArray(list) ? list : (list as any)?.items || []
        const found = tenants.find((t: any) => (t.id || t.tenantId) === id)
        if (found?.name) setTenantName(found.name)
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  if (!tenantId) return null


  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white relative">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Head>
          <title>Dashboard - AttendanceX</title>
        </Head>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-neutral-500">Tenant: {tenantName || tenantId}</p>
        {loading ? (
          <p className="mt-6 text-sm text-neutral-500">Loading...</p>
        ) : (
          <div className="mt-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <p className="text-sm">Welcome to your workspace.</p>
          </div>
        )}
      </div>
    </div>
  )
}

