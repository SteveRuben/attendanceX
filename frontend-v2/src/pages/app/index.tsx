import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { ModernButton } from '@/components/ui/modern-button'
import { useTenant } from '@/contexts/TenantContext'
import { getOnboardingStatus } from '@/services/tenantService'
import { getDashboardStats, getUpcomingEvents, getRecentAttendances, type DashboardStats, type EventItem, type RecentAttendanceItem } from '@/services/dashboardService'
import { EmptyState } from '@/components/ui/error-components'
import { PersonalTasksEmailWidget } from '@/components/dashboard/PersonalTasksEmailWidget'
import { PersonalTasksStats } from '@/components/dashboard/PersonalTasksStats'
import { TimesheetStatsWidget } from '@/components/dashboard/TimesheetStatsWidget'
import { DashboardSkeleton, LoadingOverlay } from '@/components/ui/loading-skeleton'
import { useNotify } from '@/components/ui/notification-system'

import { 
  Plus, 
  Users, 
  Calendar, 
  TrendingUp, 
  UserPlus,
  CheckCircle2,
  Clock,
  BarChart3
} from 'lucide-react'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-blue-200 dark:border-blue-900" />
          <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
        </div>
        <p className="mt-6 text-lg font-medium text-gray-700 dark:text-gray-300">Chargement de l'espace de travail...</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Préparation de votre tableau de bord</p>
      </div>
    </div>
  )
}

export default function AppHome() {
  const router = useRouter()
  const { currentTenant, isLoading: tenantLoading, isInitialized, availableTenants } = useTenant()
  const notify = useNotify()

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
      .catch((error) => {
        if (mounted) {
          console.error('Dashboard data loading error:', error)
          // Don't show error notification to avoid infinite loops
        }
      })
      .finally(() => {
        if (mounted) setDataLoading(false)
      })
    return () => { mounted = false }
  }, [currentTenant?.id, gateLoading]) // Use currentTenant.id instead of currentTenant object

  if (tenantLoading || !isInitialized || gateLoading) {
    return <LoadingScreen />
  }

  if (!currentTenant) {
    return null
  }

  const attendanceRateText = stats ? `${Math.round(stats.attendanceRate)}%` : '—'

  const handleCreateEvent = () => {
    router.push('/app/events/create')
    notify.info('Navigation', 'Redirection vers la création d\'événement')
  }

  const handleInviteUsers = () => {
    router.push('/app/organization/invitations')
    notify.info('Navigation', 'Redirection vers les invitations')
  }

  const handleMarkAttendance = () => {
    router.push('/app/events')
    notify.info('Navigation', 'Redirection vers les événements')
  }

  return (
    <AppShell title="Dashboard">
      <LoadingOverlay loading={dataLoading}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-indigo-100/50 dark:from-gray-900 dark:to-gray-800">
          <div className="p-6 space-y-8 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Tableau de Bord
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  Espace de travail: <span className="font-semibold text-gray-900 dark:text-gray-100">{currentTenant.name}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ModernButton 
                  variant="outline" 
                  icon={<Plus className="h-4 w-4" />}
                  onClick={handleCreateEvent}
                  animation="scale"
                >
                  Créer un événement
                </ModernButton>
                <ModernButton 
                  variant="outline" 
                  icon={<UserPlus className="h-4 w-4" />}
                  onClick={handleInviteUsers}
                  animation="pulse"
                >
                  Inviter des utilisateurs
                </ModernButton>
                <ModernButton 
                  variant="primary" 
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={handleMarkAttendance}
                  animation="bounce"
                >
                  Marquer les présences
                </ModernButton>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <ModernCard hover elevation="md" animation="scale" gradient>
                <ModernCardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {stats?.usersCount ?? '—'}
                  </div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Utilisateurs
                  </div>
                </ModernCardContent>
              </ModernCard>

              <ModernCard hover elevation="md" animation="scale" gradient>
                <ModernCardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Calendar className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {stats?.eventsCount ?? '—'}
                  </div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Événements
                  </div>
                </ModernCardContent>
              </ModernCard>

              <ModernCard hover elevation="md" animation="scale" gradient>
                <ModernCardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {attendanceRateText}
                  </div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Taux de présence
                  </div>
                </ModernCardContent>
              </ModernCard>

              <ModernCard hover elevation="md" animation="scale" gradient>
                <ModernCardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {stats?.presentToday ?? '—'}
                  </div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Présents aujourd'hui
                  </div>
                </ModernCardContent>
              </ModernCard>

              <PersonalTasksStats />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ModernCard hover elevation="lg" className="lg:col-span-1">
                <ModernCardHeader>
                  <ModernCardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Événements à venir
                  </ModernCardTitle>
                </ModernCardHeader>
                <ModernCardContent>
                  {upcoming.length === 0 ? (
                    <EmptyState 
                      title="Aucun événement à venir" 
                      description="Créez un événement pour commencer"
                      action={{
                        label: 'Créer un événement',
                        onClick: handleCreateEvent,
                        icon: <Plus className="h-4 w-4" />
                      }}
                    />
                  ) : (
                    <div className="space-y-3">
                      {upcoming.map(e => (
                        <div key={e.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 dark:text-gray-100">{e.name}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {new Date(e.startTime).toLocaleString('fr-FR')}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {e.attendeesCount ?? 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ModernCardContent>
              </ModernCard>

              <ModernCard hover elevation="lg" className="lg:col-span-1">
                <ModernCardHeader>
                  <ModernCardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    Présences récentes
                  </ModernCardTitle>
                </ModernCardHeader>
                <ModernCardContent>
                  {recent.length === 0 ? (
                    <EmptyState 
                      title="Aucune activité récente" 
                      description="L'activité de présence apparaîtra ici" 
                    />
                  ) : (
                    <div className="space-y-3">
                      {recent.map(r => (
                        <div key={r.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 dark:text-gray-100">{r.userName}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">{r.eventName || '—'}</div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                                r.status === 'present' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                  : r.status === 'absent'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                              }`}>
                                {r.status.replace('_', ' ')}
                              </span>
                              {r.time && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(r.time).toLocaleString('fr-FR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ModernCardContent>
              </ModernCard>

              <PersonalTasksEmailWidget />
              
              <TimesheetStatsWidget />
            </div>
          </div>
        </div>
      </LoadingOverlay>
    </AppShell>
  )
}
