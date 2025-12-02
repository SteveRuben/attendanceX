import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/services/apiClient'
import { getOnboardingStatus } from '@/services/tenantService'
import { getDashboardStats, getUpcomingEvents, getRecentAttendances, type DashboardStats, type EventItem, type RecentAttendanceItem } from '@/services/dashboardService'
import { EmptyState } from '@/components/ui/empty-state'

export default function AppHome() {
  const router = useRouter()
  const { status } = useSession()

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState('')
  const [gateLoading, setGateLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [upcoming, setUpcoming] = useState<EventItem[]>([])
  const [recent, setRecent] = useState<RecentAttendanceItem[]>([])

  useEffect(() => {
    if (status !== 'authenticated') return

    const id = typeof window !== 'undefined' ? localStorage.getItem('currentTenantId') : null
    if (!id) {
      router.replace('/choose-tenant')
      return
    }
    setTenantId(id)
    ;(async () => {
      try {
        const onboard = await getOnboardingStatus(String(id))
        if (!onboard.completed) {
          router.replace('/onboarding/setup')
          return
        }
        const list = await apiClient.get<any[]>('/tenants', { withAuth: true })
        const tenants = Array.isArray(list) ? list : (list as any)?.items || []
        const found = tenants.find((t: any) => (t.id || t.tenantId) === id)
        if (found?.name) setTenantName(found.name)
      } finally {
        setGateLoading(false)
      }
    })()
  }, [router, status])

  useEffect(() => {
    if (!tenantId || gateLoading) return
    let mounted = true
    setDataLoading(true)
    Promise.all([getDashboardStats(), getUpcomingEvents(), getRecentAttendances()])
      .then(([s, u, r]) => {
        if (!mounted) return
        setStats(s)
        setUpcoming(u || [])
        setRecent(r || [])
      })
      .finally(() => {
        if (mounted) setDataLoading(false)
      })
    return () => { mounted = false }
  }, [tenantId, gateLoading])

  if (!tenantId) return null

  const attendanceRateText = stats ? `${Math.round(stats.attendanceRate)}%` : '—'

  return (
    <AppShell title="Dashboard">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Tenant: {tenantName || tenantId}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/app/events/create')}>Create event</Button>
            <Button variant="outline" onClick={() => router.push('/app/organization/invitations')}>Invite users</Button>
            <Button onClick={() => router.push('/app/events')}>Mark attendance</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats?.usersCount ?? '—'}</div><div className="text-sm text-muted-foreground">Users</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats?.eventsCount ?? '—'}</div><div className="text-sm text-muted-foreground">Events</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{attendanceRateText}</div><div className="text-sm text-muted-foreground">Attendance rate</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats?.presentToday ?? '—'}</div><div className="text-sm text-muted-foreground">Present today</div></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming events</CardTitle>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : upcoming.length === 0 ? (
                <EmptyState title="No upcoming events" description="Create an event to get started" />
              ) : (
                <div className="divide-y rounded-md border">
                  {upcoming.map(e => (
                    <div key={e.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{e.name}</div>
                        <div className="text-xs text-muted-foreground">{new Date(e.startTime).toLocaleString()}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">{e.attendeesCount ?? 0}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : recent.length === 0 ? (
                <EmptyState title="No recent activity" description="Attendance activity will appear here" />
              ) : (
                <div className="divide-y rounded-md border">
                  {recent.map(r => (
                    <div key={r.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{r.userName}</div>
                        <div className="text-xs text-muted-foreground">{r.eventName || '—'}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm capitalize">{r.status.replace('_', ' ')}</span>
                        {r.time ? <span className="text-xs text-muted-foreground">{new Date(r.time).toLocaleString()}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
