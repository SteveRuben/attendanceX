import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/error-components'
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
  ChevronRight,
  Loader2
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
  }, [page, limit, notify])

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

  // Loading state selon standards Evelya
  if (loading && page === 1) {
    return (
      <AppShell title="Événements">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Événements">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
          {/* Sticky Header - Standard Evelya */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Événements
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez vos événements et suivez les présences
            </p>
          </div>

          <EventGuard action="view">
            {/* Page Content */}
            <div className="space-y-6">
              {/* Action Button */}
              <div className="flex justify-end">
                <EventGuard action="create">
                  <Button onClick={handleCreateEvent}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvel Événement
                  </Button>
                </EventGuard>
              </div>

              {/* Events Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Événements à venir
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
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
                          <div key={e.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                      {e.name}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleMarkAttendance(e.id, e.name)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Marquer
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleViewEvent(e.id, e.name)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Voir
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div>
                            {total > 0 ? `Affichage de ${start}–${end} sur ${total} événements` : 'Aucun événement'}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              disabled={!canPrev} 
                              onClick={handlePreviousPage}
                            >
                              <ChevronLeft className="h-4 w-4 mr-2" />
                              Précédent
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              disabled={!canNext} 
                              onClick={handleNextPage}
                            >
                              Suivant
                              <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </EventGuard>
        </div>
      </div>
    </AppShell>
  )
}