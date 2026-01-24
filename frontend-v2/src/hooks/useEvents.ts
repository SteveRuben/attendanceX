import { useState, useEffect, useCallback } from 'react'
import { EventItem, eventsService } from '@/services/eventsService'
import { useToast } from '@/hooks/useToast'

interface UseEventsFilters {
  page?: number
  limit?: number
  status?: string
  search?: string
  type?: string
  startDate?: string
  endDate?: string
}

interface UseEventsReturn {
  events: EventItem[]
  loading: boolean
  error: string | null
  total: number
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  fetchEvents: (filters?: UseEventsFilters) => Promise<void>
  refreshEvents: () => Promise<void>
  deleteEvent: (eventId: string) => Promise<void>
}

export const useEvents = (initialFilters: UseEventsFilters = {}): UseEventsReturn => {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [currentFilters, setCurrentFilters] = useState<UseEventsFilters>({
    page: 1,
    limit: 20,
    ...initialFilters
  })
  const { toast } = useToast()

  const fetchEvents = useCallback(async (filters: UseEventsFilters = {}) => {
    setLoading(true)
    setError(null)
    
    const mergedFilters = { ...currentFilters, ...filters }
    setCurrentFilters(mergedFilters)
    
    try {
      const response = await eventsService.getEvents({
        page: mergedFilters.page,
        limit: mergedFilters.limit,
        status: mergedFilters.status,
        // Ajouter d'autres filtres si nécessaire
      })
      
      setEvents(response.items)
      setTotal(response.total)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des événements'
      setError(errorMessage)
      toast?.error?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [currentFilters, toast])

  const refreshEvents = useCallback(async () => {
    await fetchEvents(currentFilters)
  }, [fetchEvents, currentFilters])

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      await eventsService.deleteEvent(eventId)
      setEvents(prev => prev.filter(event => event.id !== eventId))
      setTotal(prev => prev - 1)
      toast?.success?.('Événement supprimé avec succès')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression'
      toast?.error?.(errorMessage)
      throw err
    }
  }, [toast])

  // Charger les événements au montage
  useEffect(() => {
    fetchEvents()
  }, []) // Pas de dépendance fetchEvents pour éviter les boucles

  const pagination = {
    page: currentFilters.page || 1,
    limit: currentFilters.limit || 20,
    total,
    totalPages: Math.ceil(total / (currentFilters.limit || 20))
  }

  return {
    events,
    loading,
    error,
    total,
    pagination,
    fetchEvents,
    refreshEvents,
    deleteEvent
  }
}