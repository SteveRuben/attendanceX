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

const mockAttendance: AttendanceRow[] = [
  { id: 'a1', userName: 'John Doe', eventName: 'Daily Standup', time: new Date().toISOString(), status: 'Present' },
  { id: 'a2', userName: 'Jane Smith', eventName: 'Daily Standup', time: new Date().toISOString(), status: 'Late' },
  { id: 'a3', userName: 'Alex Lee', eventName: 'Sprint Review', time: new Date().toISOString(), status: 'Absent' },
]

const mockEvents: EventReportRow[] = [
  { id: 'e1', name: 'Daily Standup', date: new Date().toISOString(), attendeesCount: 18, attendanceRate: 0.92 },
  { id: 'e2', name: 'Sprint Review', date: new Date().toISOString(), attendeesCount: 24, attendanceRate: 0.88 },
]

export async function getAttendanceReports(): Promise<AttendanceRow[]> {
  try {
    const data = await apiClient.get<any>('/attendances?limit=50&sortBy=checkInTime&sortOrder=desc')
    const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
    return list.map((r: any) => ({
      id: String(r.id ?? r._id ?? Math.random()),
      userName: r.user?.name || r.userName || r.employeeName || r.user?.email || 'Unknown',
      eventName: r.event?.name || r.eventName || r.event?.title || '—',
      time: r.checkInTime || r.createdAt || new Date().toISOString(),
      status: (String(r.status || '').toLowerCase() === 'late' ? 'Late' : String(r.status || '').toLowerCase() === 'absent' ? 'Absent' : 'Present'),
    }))
  } catch (e) {
    return mockAttendance
  }
}

export async function getEventReports(): Promise<EventReportRow[]> {
  try {
    const data = await apiClient.get<any>('/events?limit=50&status=active')
    const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
    return list.map((ev: any) => ({
      id: String(ev.id ?? ev._id ?? Math.random()),
      name: ev.name || ev.title || 'Event',
      date: ev.startTime || ev.date || ev.createdAt || new Date().toISOString(),
      attendeesCount: Number(ev.attendeesCount ?? ev.attendanceCount ?? 0),
      attendanceRate: Number(ev.attendanceRate ?? 0),
    }))
  } catch (e) {
    return mockEvents
  }
}



export async function generateReport(payload: { kind: 'attendance' | 'events'; format?: 'csv' | 'xlsx'; filters?: Record<string, any> }): Promise<{ id: string }> {
  const mock = { id: 'rep_' + Math.random().toString(36).slice(2) }
  try {
    const data = await apiClient.post<any>('/reports/generate', payload, { mock })
    const d = (data?.data ?? data) as any
    return { id: String(d?.id ?? d?._id ?? mock.id) }
  } catch {
    return mock
  }
}

export async function getReportStatus(id: string): Promise<{ status: 'pending' | 'completed' | 'failed' }> {
  try {
    const data = await apiClient.get<any>(`/reports/${encodeURIComponent(id)}/status`, { mock: { status: 'completed' } })
    const s = String((data?.status ?? 'completed')).toLowerCase()
    const status: 'pending' | 'completed' | 'failed' = s.includes('complete') ? 'completed' : s.includes('fail') ? 'failed' : 'pending'
    return { status }
  } catch {
    return { status: 'completed' }
  }
}

export async function downloadReport(id: string): Promise<Blob> {
  try {
    const blob = await apiClient.get<Blob>(`/reports/${encodeURIComponent(id)}/download`, { parse: 'blob', mock: new Blob(['id,name\n1,Alice'], { type: 'text/csv' }) })
    return blob
  } catch {
    return new Blob(['id,name\n1,Alice'], { type: 'text/csv' })
  }
}
