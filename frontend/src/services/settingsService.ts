import { apiClient } from '@/services/apiClient'

export interface UserProfile {
  id: string
  email: string
  firstName?: string
  lastName?: string
  displayName?: string
  phone?: string
  role?: string
  department?: string
  avatarUrl?: string
  createdAt?: string
  updatedAt?: string
  preferences?: UserPreferences
}

export interface UserPreferences {
  language: string
  timezone: string
  dateFormat: string
  timeFormat: '12h' | '24h'
  theme: 'light' | 'dark' | 'system'
  notifications: NotificationPreferences
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

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  data?: Record<string, any>
}

export async function getMyProfile(): Promise<UserProfile> {
  const res = await apiClient.get<any>('/users/me', { withAuth: true })
  const d = res?.data ?? res
  return mapProfile(d)
}

export async function updateMyProfile(updates: Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'phone' | 'preferences'>>): Promise<UserProfile> {
  const res = await apiClient.put<any>('/users/me', updates, {
    withAuth: true,
    withToast: { loading: 'Saving...', success: 'Profile updated' },
  })
  const d = res?.data ?? res
  return mapProfile(d)
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await apiClient.get<any>('/notifications/preferences', { withAuth: true })
  return res?.data ?? res ?? defaultNotificationPrefs()
}

export async function updateNotificationPreferences(prefs: NotificationPreferences): Promise<NotificationPreferences> {
  const res = await apiClient.put<any>('/notifications/preferences', prefs, {
    withAuth: true,
    withToast: { loading: 'Saving...', success: 'Notification preferences updated' },
  })
  return res?.data ?? res ?? prefs
}

export async function getMyNotifications(params: { page?: number; limit?: number; unreadOnly?: boolean } = {}): Promise<{ items: Notification[]; pagination?: { total: number } }> {
  const { page = 1, limit = 20, unreadOnly = false } = params
  const qs = new URLSearchParams({ page: String(page), limit: String(limit), unreadOnly: String(unreadOnly) })
  const res = await apiClient.get<any>(`/notifications/my-notifications?${qs.toString()}`, { withAuth: true })
  const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
  const items = list.map(mapNotification)
  return { items, pagination: res?.pagination }
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/notifications/mark-read/${encodeURIComponent(id)}`, undefined, { withAuth: true })
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/notifications/mark-all-read', undefined, {
    withAuth: true,
    withToast: { loading: 'Marking all as read...', success: 'All notifications marked as read' },
  })
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/change-password', { currentPassword, newPassword }, {
    withAuth: true,
    withToast: { loading: 'Changing password...', success: 'Password changed successfully' },
  })
}

function mapProfile(d: any): UserProfile {
  return {
    id: String(d?.id ?? d?._id ?? ''),
    email: d?.email ?? '',
    firstName: d?.firstName,
    lastName: d?.lastName,
    displayName: d?.displayName || [d?.firstName, d?.lastName].filter(Boolean).join(' ') || d?.email,
    phone: d?.phone,
    role: d?.role,
    department: d?.department,
    avatarUrl: d?.avatarUrl || d?.photoURL,
    createdAt: d?.createdAt,
    updatedAt: d?.updatedAt,
    preferences: d?.preferences,
  }
}

function mapNotification(d: any): Notification {
  return {
    id: String(d?.id ?? d?._id ?? Math.random()),
    type: d?.type ?? 'general',
    title: d?.title ?? '',
    message: d?.message ?? d?.body ?? '',
    read: Boolean(d?.read ?? d?.isRead),
    createdAt: d?.createdAt ?? new Date().toISOString(),
    data: d?.data,
  }
}

function defaultNotificationPrefs(): NotificationPreferences {
  const channel = { enabled: true, eventReminders: true, attendanceAlerts: true, systemUpdates: false }
  return { email: { ...channel }, push: { ...channel }, sms: { enabled: false, eventReminders: false, attendanceAlerts: false, systemUpdates: false } }
}

