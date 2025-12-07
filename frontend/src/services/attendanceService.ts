import { apiClient } from '@/services/apiClient'

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'left_early'

export interface AttendanceRecord {
  id: string
  userId?: string
  userName?: string
  eventId?: string
  eventName?: string
  status: AttendanceStatus
  method?: 'manual' | 'qr_code' | 'geolocation'
  notes?: string
  checkInTime?: string
}

export interface ListAttendancesParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ListAttendancesResponse {
  items: AttendanceRecord[]
  total: number
  page: number
  limit: number
}


export async function listAttendances(params: ListAttendancesParams = {}): Promise<ListAttendancesResponse> {
  const { page = 1, limit = 10, sortBy = 'checkInTime', sortOrder = 'desc' } = params
  const data = await apiClient.get<any>(`/attendances?page=${page}&limit=${limit}&sortBy=${encodeURIComponent(sortBy)}&sortOrder=${sortOrder}`)
  const list = Array.isArray((data as any)?.data) ? (data as any).data : Array.isArray(data) ? (data as any) : []
  const items: AttendanceRecord[] = list.map((r: any) => ({
    id: String(r.id ?? r._id ?? Math.random()),
    userId: String(r.userId ?? r.user?.id ?? r.user?._id ?? ''),
    userName: r.user?.name || r.userName || r.employeeName || r.user?.email || 'Unknown',
    eventId: String(r.eventId ?? r.event?.id ?? r.event?._id ?? ''),
    eventName: r.event?.name || r.eventName || r.event?.title,
    status: (String(r.status || 'present').toLowerCase() as AttendanceStatus),
    method: (r.method || 'manual'),
    notes: r.notes,
    checkInTime: r.checkInTime || r.createdAt,
  }))
  const total = Number((data as any)?.pagination?.total ?? (data as any)?.total ?? items.length)
  return { items, total, page, limit }
}

export interface CheckInPayload {
  eventId: string
  userId?: string
  method?: 'manual' | 'qr_code' | 'geolocation'
  notes?: string
  status?: AttendanceStatus
  location?: { latitude: number; longitude: number; accuracy?: number }
}

export async function checkIn(payload: CheckInPayload): Promise<{ id?: string; ok: boolean }> {
  const data = await apiClient.post<any>(`/attendances/check-in`, payload)
  const d = (data?.data ?? data) as any
  const id = d?.id ?? d?._id
  return { id: id ? String(id) : undefined, ok: true }
}

