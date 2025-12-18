import { apiClient } from '@/services/apiClient'

export interface DashboardStats {
  usersCount: number
  eventsCount: number
  attendanceRate: number
  presentToday: number
  lateToday: number
  absentToday: number
}

export interface EventItem {
  id: string
  name: string
  startTime: string
  attendeesCount?: number
}

export interface RecentAttendanceItem {
  id: string
  userName: string
  status: 'present' | 'absent' | 'late' | 'excused' | 'left_early'
  time?: string
  eventName?: string
}




export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const [usersRes, eventsRes, attRes] = await Promise.all([
      apiClient.get<any>('/users?page=1&limit=1'),
      apiClient.get<any>('/events?page=1&limit=1'),
      apiClient.get<any>('/attendances?page=1&limit=99&sortBy=checkInTime&sortOrder=desc'),
    ])

    const usersTotal = Number(usersRes?.pagination?.total ?? usersRes?.total ?? 0)
    const eventsTotal = Number(eventsRes?.pagination?.total ?? eventsRes?.total ?? 0)

    const attList = Array.isArray(attRes?.data) ? attRes.data : Array.isArray(attRes) ? attRes : []
    const today = new Date()
    const isSameDay = (d?: string) => {
      if (!d) return false
      const dt = new Date(d)
      return dt.getFullYear() === today.getFullYear() && dt.getMonth() === today.getMonth() && dt.getDate() === today.getDate()
    }
    const todayItems = attList.filter((a: any) => isSameDay(a.checkInTime || a.createdAt))
    const presentToday = todayItems.filter((a: any) => String(a.status).toLowerCase() === 'present').length
    const lateToday = todayItems.filter((a: any) => String(a.status).toLowerCase() === 'late').length
    const absentToday = todayItems.filter((a: any) => String(a.status).toLowerCase() === 'absent').length

    const denom = presentToday + lateToday + absentToday
    const attendanceRate = denom > 0 ? Math.round((presentToday / denom) * 100) : 0

    return { usersCount: usersTotal, eventsCount: eventsTotal, attendanceRate, presentToday, lateToday, absentToday }
  } catch (e) {
    throw e
  }
}

export async function getUpcomingEvents(): Promise<EventItem[]> {
  try {
    const nowIso = new Date().toISOString()
    const qs = new URLSearchParams({ page: '1', limit: '15', sortBy: 'startDate', sortOrder: 'asc', startDate: nowIso })
    const data = await apiClient.get<any>(`/events?${qs.toString()}`)
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
    return list.map((ev: any) => ({
      id: String(ev.id ?? ev._id ?? Math.random()),
      name: ev.title || ev.name || 'Event',
      startTime: ev.startDateTime || ev.startTime || ev.date || new Date().toISOString(),
      attendeesCount: Number(ev.attendeesCount ?? ev.attendanceCount ?? ev?.stats?.totalPresent ?? 0),
    }))
  } catch (e) {
    throw e
  }
}

export async function getRecentAttendances(): Promise<RecentAttendanceItem[]> {
  try {
    const data = await apiClient.get<any>('/attendances?page=1&limit=15&sortBy=checkInTime&sortOrder=desc')
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
    return list.map((r: any) => ({
      id: String(r.id ?? r._id ?? Math.random()),
      userName: r.user?.name || r.userName || r.employeeName || r.user?.email || 'Unknown',
      status: (String(r.status || 'present').toLowerCase() as any),
      time: r.checkInTime || r.createdAt,
      eventName: r.event?.name || r.eventName || r.event?.title,
    }))
  } catch (e) {
    throw e
  }
}
