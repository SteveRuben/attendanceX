import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTenant } from '@/contexts/TenantContext'
import { getOnboardingStatus } from '@/services/tenantService'
import { getDashboardStats, getUpcomingEvents, getRecentAttendances, type DashboardStats, type EventItem, type RecentAttendanceItem } from '@/services/dashboardService'
import { EmptyState } from '@/components/ui/empty-state'
import { PersonalTasksEmailWidget } from '@/components/dashboard/PersonalTasksEmailWidget'
import { PersonalTasksStats } from '@/components/dashboard/PersonalTasksStats'
import { TimesheetStatsWidget } from '@/components/dashboard/TimesheetStatsWidget'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-blue-200 dark:border-blue-900" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
        </div>
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">Chargement de l'espace de travail...</p>
      </div>
    </div>
  )
}

export default function AppHome() {
  const router = useRouter()
  const { currentTenant, isLoading: tenantLoading, isInitialized, availableTenants } = useTenant()

  const [gateLoading, setGateLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [upcoming, setUpcoming] = useState<EventItem[]>([])
  const [recent, setRecent] = useState<RecentAttendanceItem[]>([])

  useEffect(() => {
    if (!isInitialized || tenantLoading) return

    if (!currentTenant) {
      const storedTenantId = typeof window !== 'undefined' ? localStorage.getItem('currentTenantId') : null

      if (storedTenantId && availableTenants.length > 0) {
        const found = availableTenants.find(t => t.id === storedTenantId)
        if (!found) {
          localStorage.removeItem('currentTenantId')
          router.replace('/choose-tenant')
        }
        return
      }

      if (availableTenants.length === 0 && !storedTenantId) {
        router.replace('/onboarding/create-workspace')
      } else if (availableTenants.length > 0) {
        router.replace('/choose-tenant')
      }
      return
    }

    ;(async () => {
      try {
        const onboard = await getOnboardingStatus(currentTenant.id)
        if (!onboard.completed) {
          router.replace('/onboarding/setup')
          return
        }
      } finally {
        setGateLoading(false)
      }
    })()
  }, [router, currentTenant, isInitialized, tenantLoading, availableTenants])

  useEffect(() => {
    if (!currentTenant || gateLoading) return
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
  }, [currentTenant, gateLoading])

  if (tenantLoading || !isInitialized || gateLoading) {
    return <LoadingScreen />
  }

  if (!currentTenant) {
    return null
  }

  const attendanceRateText = stats ? `${Math.round(stats.attendanceRate)}%` : '—'

  return (
    <AppShell title="Dashboard">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Espace de travail: {currentTenant.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/app/events/create')}>Créer un événement</Button>
            <Button variant="outline" onClick={() => router.push('/app/organization/invitations')}>Inviter des utilisateurs</Button>
            <Button onClick={() => router.push('/app/events')}>Marquer les présences</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats?.usersCount ?? '—'}</div><div className="text-sm text-muted-foreground">Utilisateurs</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats?.eventsCount ?? '—'}</div><div className="text-sm text-muted-foreground">Événements</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{attendanceRateText}</div><div className="text-sm text-muted-foreground">Taux de présence</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats?.presentToday ?? '—'}</div><div className="text-sm text-muted-foreground">Présents aujourd'hui</div></CardContent></Card>
          <PersonalTasksStats />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Événements à venir</CardTitle>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="text-sm text-muted-foreground">Chargement...</div>
              ) : upcoming.length === 0 ? (
                <EmptyState title="Aucun événement à venir" description="Créez un événement pour commencer" />
              ) : (
                <div className="divide-y rounded-md border">
                  {upcoming.map(e => (
                    <div key={e.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{e.name}</div>
                        <div className="text-xs text-muted-foreground">{new Date(e.startTime).toLocaleString('fr-FR')}</div>
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
              <CardTitle>Présences récentes</CardTitle>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="text-sm text-muted-foreground">Chargement...</div>
              ) : recent.length === 0 ? (
                <EmptyState title="Aucune activité récente" description="L'activité de présence apparaîtra ici" />
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
                        {r.time ? <span className="text-xs text-muted-foreground">{new Date(r.time).toLocaleString('fr-FR')}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <PersonalTasksEmailWidget />
          
          <TimesheetStatsWidget />
        </div>
      </div>
    </AppShell>
  )
}
