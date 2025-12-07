import { apiClient } from '@/services/apiClient'

export type AttendanceStatus = 'Present' | 'Absent' | 'Late'

export interface AttendanceRow {
  id: string
  userName: string
  eventName: string
  time: string
  status: AttendanceStatus
}

export interface EventReportRow {
  id: string
  name: string
  date: string
  attendeesCount: number
  attendanceRate: number
}



export async function getAttendanceReports(): Promise<AttendanceRow[]> {
  try {
    const data = await apiClient.get<any>('/attendances?page=1&limit=50&sortBy=checkInTime&sortOrder=desc')
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
    return list.map((r: any) => ({
      id: String(r.id ?? r._id ?? Math.random()),
      userName: r.user?.name || r.userName || r.employeeName || r.user?.email || 'Unknown',
      eventName: r.event?.name || r.eventName || r.event?.title || '—',
      time: r.checkInTime || r.createdAt || new Date().toISOString(),
      status: (String(r.status || '').toLowerCase() === 'late' ? 'Late' : String(r.status || '').toLowerCase() === 'absent' ? 'Absent' : 'Present'),
    }))
  } catch (e) {
    throw e
  }
}

export async function getEventReports(): Promise<EventReportRow[]> {
  try {
    const data = await apiClient.get<any>('/events?page=1&limit=50')
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
    return list.map((ev: any) => ({
      id: String(ev.id ?? ev._id ?? Math.random()),
      name: ev.title || ev.name || 'Event',
      date: ev.startDateTime || ev.startTime || ev.date || ev.createdAt || new Date().toISOString(),
      attendeesCount: Number(ev.attendeesCount ?? ev.attendanceCount ?? ev?.stats?.totalPresent ?? 0),
      attendanceRate: Number(ev.attendanceRate ?? 0),
    }))
  } catch (e) {
    throw e
  }
}



export async function generateReport(payload: { kind: 'attendance' | 'events'; format?: 'csv' | 'xlsx'; filters?: Record<string, any> }): Promise<{ id: string }> {
  try {
    const data = await apiClient.post<any>('/reports/generate', payload)
    const d = (data?.data ?? data) as any
    const id = d?.id ?? d?._id
    if (!id) throw new Error('Invalid generate report response')
    return { id: String(id) }
  } catch (e) {
    throw e
  }
}

export async function getReportStatus(id: string): Promise<{ status: 'pending' | 'completed' | 'failed' }> {
  try {
    const data = await apiClient.get<any>(`/reports/${encodeURIComponent(id)}/status`)
    const s = String((data?.status ?? 'completed')).toLowerCase()
    const status: 'pending' | 'completed' | 'failed' = s.includes('complete') ? 'completed' : s.includes('fail') ? 'failed' : 'pending'
    return { status }
  } catch (e) {
    throw e
  }
}

export async function downloadReport(id: string): Promise<Blob> {
  try {
    const blob = await apiClient.get<Blob>(`/reports/${encodeURIComponent(id)}/download`, { parse: 'blob' })
    return blob
  } catch (e) {
    throw e
  }
}
