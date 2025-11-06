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

const mockStats: DashboardStats = {
  usersCount: 42,
  eventsCount: 8,
  attendanceRate: 87,
  presentToday: 31,
  lateToday: 4,
  absentToday: 7,
}

const mockUpcoming: EventItem[] = [
  { id: 'e1', name: 'Daily Standup', startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), attendeesCount: 18 },
  { id: 'e2', name: 'Sprint Review', startTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), attendeesCount: 24 },
]

const mockRecent: RecentAttendanceItem[] = [
  { id: 'r1', userName: 'Alice Johnson', status: 'present', time: new Date().toISOString(), eventName: 'Daily Standup' },
  { id: 'r2', userName: 'Bob Smith', status: 'late', time: new Date().toISOString(), eventName: 'Daily Standup' },
  { id: 'r3', userName: 'Claire Lee', status: 'absent', eventName: 'Daily Standup' },
]

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const [usersRes, eventsRes, attRes] = await Promise.all([
      apiClient.get<any>('/users?limit=1&offset=0', { mock: { items: Array.from({ length: mockStats.usersCount }) } }),
      apiClient.get<any>('/events?limit=50&status=active', { mock: mockUpcoming }),
      apiClient.get<any>('/attendances?limit=200&sortBy=checkInTime&sortOrder=desc', { mock: mockRecent }),
    ])

    const usersTotal = Number(usersRes?.total ?? usersRes?.count ?? (Array.isArray(usersRes?.items) ? usersRes.items.length : Array.isArray(usersRes) ? usersRes.length : 0))
    const eventsList = Array.isArray(eventsRes?.items) ? eventsRes.items : Array.isArray(eventsRes) ? eventsRes : []
    const eventsCount = eventsRes?.total ?? eventsRes?.count ?? eventsList.length

    const attList = Array.isArray(attRes?.items) ? attRes.items : Array.isArray(attRes) ? attRes : []
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

    return { usersCount: usersTotal, eventsCount, attendanceRate, presentToday, lateToday, absentToday }
  } catch (e) {
    return mockStats
  }
}

export async function getUpcomingEvents(): Promise<EventItem[]> {
  try {
    const data = await apiClient.get<any>('/events?limit=5&status=active', { mock: mockUpcoming })
    const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
    return list.map((ev: any) => ({
      id: String(ev.id ?? ev._id ?? Math.random()),
      name: ev.name || ev.title || 'Event',
      startTime: ev.startTime || ev.date || new Date().toISOString(),
      attendeesCount: Number(ev.attendeesCount ?? ev.attendanceCount ?? 0),
    }))
  } catch (e) {
    return mockUpcoming
  }
}

export async function getRecentAttendances(): Promise<RecentAttendanceItem[]> {
  try {
    const data = await apiClient.get<any>('/attendances?limit=10&sortBy=checkInTime&sortOrder=desc', { mock: mockRecent })
    const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
    return list.map((r: any) => ({
      id: String(r.id ?? r._id ?? Math.random()),
      userName: r.user?.name || r.userName || r.employeeName || r.user?.email || 'Unknown',
      status: (String(r.status || 'present').toLowerCase() as any),
      time: r.checkInTime || r.createdAt,
      eventName: r.event?.name || r.eventName,
    }))
  } catch (e) {
    return mockRecent
  }
}
