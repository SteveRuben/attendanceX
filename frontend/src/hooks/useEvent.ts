import { useState, useEffect } from 'react'
import { getEventById, EventItem } from '@/services/eventsService'

interface UseEventResult {
  event: EventItem | null
  loading: boolean
  error: string | null
}

export const useEvent = (eventId: string | null): UseEventResult => {
  const [event, setEvent] = useState<EventItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) {
      setEvent(null)
      setLoading(false)
      setError(null)
      return
    }

    const fetchEvent = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const eventData = await getEventById(eventId)
        setEvent(eventData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement de l\'événement')
        setEvent(null)
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventId])

  return { event, loading, error }
}

// Hook pour récupérer plusieurs événements par leurs IDs
export const useEvents = (eventIds: string[]): Record<string, EventItem> => {
  const [events, setEvents] = useState<Record<string, EventItem>>({})

  useEffect(() => {
    if (eventIds.length === 0) {
      setEvents({})
      return
    }

    const fetchEvents = async () => {
      const eventPromises = eventIds.map(async (id) => {
        try {
          const event = await getEventById(id)
          return { id, event }
        } catch (error) {
          console.warn(`Erreur lors du chargement de l'événement ${id}:`, error)
          return { id, event: null }
        }
      })

      const results = await Promise.all(eventPromises)
      const eventsMap: Record<string, EventItem> = {}
      
      results.forEach(({ id, event }) => {
        if (event) {
          eventsMap[id] = event
        }
      })

      setEvents(eventsMap)
    }

    fetchEvents()
  }, [eventIds.join(',')])

  return events
}