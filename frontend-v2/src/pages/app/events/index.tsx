import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { ModernButton } from '@/components/ui/modern-button'
import { EmptyState } from '@/components/ui/error-components'
import { LoadingOverlay, CardSkeleton } from '@/components/ui/loading-skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { EventGuard } from '@/components/auth/PermissionGuard'
import { getEvents, type EventItem } from '@/services/eventsService'
import { useNotify } from '@/components/ui/notification-system'
import { 
  Plus, 
  Calendar, 
  Users, 
  Clock,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

export default function EventsPage() {
  const router = useRouter()
  const { canCreateEvents } = usePermissions()
  const notify = useNotify()
  const [items, setItems] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const { items, total } = await getEvents({ limit, offset: (page - 1) * limit })
        if (!mounted) return
        setItems(items)
        setTotal(total)
      } catch (error) {
        if (mounted) {
          notify.error('Erreur de chargement', 'Impossible de charger les événements')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [page, limit, notify]) // Now notify is properly memoized

  const start = items.length ? (page - 1) * limit + 1 : 0
  const end = items.length ? (page - 1) * limit + items.length : 0
  const canPrev = page > 1
  const canNext = page * limit < total

  const handleCreateEvent = useCallback(() => {
    router.push('/app/events/create')
    notify.info('Navigation', 'Redirection vers la création d\'événement')
  }, [router, notify])

  const handleMarkAttendance = useCallback((eventId: string, eventName: string) => {
    router.push(`/app/attendance/mark/${eventId}`)
    notify.info('Marquage', `Marquage des présences pour "${eventName}"`)
  }, [router, notify])

  const handleViewEvent = useCallback((eventId: string, eventName: string) => {
    router.push(`/app/events/${eventId}`)
    notify.info('Consultation', `Consultation de l'événement "${eventName}"`)
  }, [router, notify])

  const handlePreviousPage = useCallback(() => {
    setPage(p => Math.max(1, p - 1))
  }, [])

  const handleNextPage = useCallback(() => {
    setPage(p => p + 1)
  }, [])

  return (
    <AppShell title="Events">
      <EventGuard action="view">
        <LoadingOverlay loading={loading}>
          <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-indigo-100/50 dark:from-gray-900 dark:to-gray-800">
            <div className="p-6 space-y-8 max-w-7xl mx-auto">
              {/* Header Section */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-blue-600" />
                    Événements
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-300">
                    Gérez vos événements et suivez les présences
                  </p>
                </div>
                <div className="flex gap-3">
                  <EventGuard action="create">
                    <ModernButton 
                      variant="primary" 
                      icon={<Plus className="h-4 w-4" />}
                      onClick={handleCreateEvent}
                      animation="scale"
                    >
                      Créer un événement
                    </ModernButton>
                  </EventGuard>
                </div>
              </div>

              {/* Events Card */}
              <ModernCard hover elevation="lg" className="overflow-hidden">
                <ModernCardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <ModernCardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Événements à venir
                  </ModernCardTitle>
                </ModernCardHeader>
                <ModernCardContent className="p-0">
                  {items.length === 0 ? (
                    <div className="p-8">
                      <EmptyState 
                        icon={<Calendar className="h-12 w-12 text-gray-400" />}
                        title="Aucun événement" 
                        description="Créez votre premier événement pour commencer à gérer les présences" 
                        action={canCreateEvents() ? { 
                          label: 'Créer un événement', 
                          onClick: handleCreateEvent,
                          icon: <Plus className="h-4 w-4" />
                        } : undefined} 
                      />
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {items.map(e => (
                          <div key={e.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                      {e.name}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        {new Date(e.startTime).toLocaleString('fr-FR')}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        {e.attendeesCount ?? 0} participants
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <ModernButton 
                                  variant="outline" 
                                  size="sm" 
                                  icon={<CheckCircle2 className="h-4 w-4" />}
                                  onClick={() => handleMarkAttendance(e.id, e.name)}
                                  animation="pulse"
                                >
                                  Marquer
                                </ModernButton>
                                <ModernButton 
                                  variant="ghost" 
                                  size="sm" 
                                  icon={<Eye className="h-4 w-4" />}
                                  onClick={() => handleViewEvent(e.id, e.name)}
                                  animation="scale"
                                >
                                  Voir
                                </ModernButton>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {total > 0 ? `Affichage de ${start}–${end} sur ${total} événements` : 'Aucun événement'}
                          </div>
                          <div className="flex gap-2">
                            <ModernButton 
                              variant="ghost" 
                              size="sm" 
                              disabled={!canPrev} 
                              onClick={handlePreviousPage}
                              icon={<ChevronLeft className="h-4 w-4" />}
                            >
                              Précédent
                            </ModernButton>
                            <ModernButton 
                              variant="ghost" 
                              size="sm" 
                              disabled={!canNext} 
                              onClick={handleNextPage}
                              iconPosition="right"
                              icon={<ChevronRight className="h-4 w-4" />}
                            >
                              Suivant
                            </ModernButton>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </ModernCardContent>
              </ModernCard>
            </div>
          </div>
        </LoadingOverlay>
      </EventGuard>
    </AppShell>
  )
}