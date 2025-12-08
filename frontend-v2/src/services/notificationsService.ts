import { apiClient } from './apiClient'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  data?: Record<string, any>
  priority?: 'low' | 'normal' | 'high'
  channels?: string[]
}

export interface NotificationStats {
  total: number
  unread: number
  byType?: Record<string, number>
  byChannel?: Record<string, number>
}

export interface NotificationPreferences {
  email: {
    enabled: boolean
    eventReminders: boolean
    attendanceAlerts: boolean
    systemUpdates: boolean
  }
  push: {
    enabled: boolean
    eventReminders: boolean
    attendanceAlerts: boolean
    systemUpdates: boolean
  }
  sms: {
    enabled: boolean
    eventReminders: boolean
    attendanceAlerts: boolean
    systemUpdates: boolean
  }
}

export interface PaginatedNotifications {
  data: Notification[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function getMyNotifications(params?: {
  page?: number
  limit?: number
  unreadOnly?: boolean
}): Promise<PaginatedNotifications> {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.unreadOnly) query.set('unreadOnly', 'true')

  const url = `/notifications/my-notifications${query.toString() ? `?${query}` : ''}`
  const res = await apiClient.get<any>(url, { withAuth: true })
  const data = res?.data ?? res
  return {
    data: Array.isArray(data) ? data : data?.data || [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    limit: data?.limit ?? 20,
    totalPages: data?.totalPages ?? 1,
  }
}

export async function getNotificationStats(): Promise<NotificationStats> {
  const res = await apiClient.get<any>('/notifications/stats', { withAuth: true })
  const data = res?.data ?? res
  return {
    total: data?.total ?? 0,
    unread: data?.unread ?? 0,
    byType: data?.byType,
    byChannel: data?.byChannel,
  }
}

export async function markAsRead(notificationId: string): Promise<void> {
  await apiClient.post(`/notifications/mark-read/${notificationId}`, {}, { withAuth: true })
}

export async function markAllAsRead(): Promise<void> {
  await apiClient.post('/notifications/mark-all-read', {}, { withAuth: true })
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await apiClient.delete(`/notifications/${notificationId}`, { withAuth: true })
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await apiClient.get<any>('/notifications/preferences', { withAuth: true })
  return res?.data ?? res
}

export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const res = await apiClient.put<any>('/notifications/preferences', preferences, { withAuth: true })
  return res?.data ?? res
}

