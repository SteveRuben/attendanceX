import { apiClient } from '@/services/apiClient'

export interface EventItem {
  id: string
  name: string
  startTime: string
  attendeesCount?: number
}

export interface EventPayload {
  name: string
  startTime: string
}

export interface EventsList {
  items: EventItem[]
  total: number
}


export async function getEvents(params: { limit?: number; offset?: number; status?: string } = {}): Promise<EventsList> {
  const { limit = 10, offset = 0, status = 'active' } = params
  const data = await apiClient.get<any>(`/events?limit=${limit}&offset=${offset}&status=${encodeURIComponent(status)}`)
  const list = Array.isArray((data as any)?.items) ? (data as any).items : Array.isArray(data) ? (data as any) : []
  const items = list.map((ev: any) => ({
    id: String(ev.id ?? ev._id ?? Math.random()),
    name: ev.name || ev.title || 'Event',
    startTime: ev.startTime || ev.date || new Date().toISOString(),
    attendeesCount: Number(ev.attendeesCount ?? ev.attendanceCount ?? 0),
  }))
  const total = Number((data as any)?.total ?? (data as any)?.count ?? items.length)
  return { items, total }
}

export async function getEventById(id: string): Promise<EventItem> {
  const data = await apiClient.get<any>(`/events/${id}`)
  return {
    id: String(data?.id ?? data?._id ?? id),
    name: data?.name || data?.title || `Event ${id}`,
    startTime: data?.startTime || data?.date || new Date().toISOString(),
    attendeesCount: Number(data?.attendeesCount ?? data?.attendanceCount ?? 0),
  }
}

export function createEvent(payload: EventPayload) {
  return apiClient.post<{ id: string }>(`/events`, payload, {
    withToast: { loading: 'Creating event...', success: 'Event created' },
  })
}

export function updateEvent(id: string, payload: EventPayload) {
  return apiClient.put<{ id: string }>(`/events/${id}`, payload, {
    withToast: { loading: 'Saving changes...', success: 'Event updated' },
  })
}

