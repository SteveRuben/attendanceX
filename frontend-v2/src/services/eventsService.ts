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


export async function getEvents(params: { limit?: number; offset?: number; page?: number; status?: string } = {}): Promise<EventsList> {
  const { limit = 10, offset = 0, page: pageIn, status } = params
  const page = pageIn ?? Math.floor(offset / Math.max(1, limit)) + 1
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) qs.set('status', status)
  const data = await apiClient.get<any>(`/events?${qs.toString()}`)
  const list = Array.isArray((data as any)?.data) ? (data as any).data : Array.isArray(data) ? (data as any) : []
  const items = list.map((ev: any) => ({
    id: String(ev.id ?? ev._id ?? Math.random()),
    name: ev.title || ev.name || 'Event',
    startTime: ev.startDateTime || ev.startTime || ev.date || new Date().toISOString(),
    attendeesCount: Number(ev.attendeesCount ?? ev.attendanceCount ?? ev?.stats?.totalPresent ?? 0),
  }))
  const total = Number((data as any)?.pagination?.total ?? (data as any)?.total ?? items.length)
  return { items, total }
}

export async function getEventById(id: string): Promise<EventItem> {
  const data = await apiClient.get<any>(`/events/${id}`)
  const d = (data as any)?.data ?? data
  return {
    id: String(d?.id ?? d?._id ?? id),
    name: d?.title || d?.name || `Event ${id}`,
    startTime: d?.startDateTime || d?.startTime || d?.date || new Date().toISOString(),
    attendeesCount: Number(d?.attendeesCount ?? d?.attendanceCount ?? d?.stats?.totalPresent ?? 0),
  }
}

export function createEvent(payload: EventPayload) {
  const start = new Date(payload.startTime)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const body = {
    title: payload.name,
    type: 'meeting',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    location: { name: 'TBD' },
  }
  return apiClient.post<{ id: string }>(`/events`, body, {
    withToast: { loading: 'Creating event...', success: 'Event created' },
  })
}

export function updateEvent(id: string, payload: EventPayload) {
  const body = { title: payload.name, startDate: payload.startTime }
  return apiClient.put<{ id: string }>(`/events/${id}`, body, {
    withToast: { loading: 'Saving changes...', success: 'Event updated' },
  })
}

