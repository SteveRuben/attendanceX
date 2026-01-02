import { apiClient } from '@/services/apiClient'

export interface NotificationSettings {
  email: {
    eventReminders: boolean
    attendanceAlerts: boolean
    teamUpdates: boolean
    systemNotifications: boolean
    weeklyReports: boolean
    marketingEmails: boolean
  }
  push: {
    eventReminders: boolean
    attendanceAlerts: boolean
    teamUpdates: boolean
    systemNotifications: boolean
    urgentAlerts: boolean
  }
  sound: {
    enabled: boolean
    volume: number
    urgentOnly: boolean
  }
  schedule: {
    quietHours: boolean
    startTime: string
    endTime: string
    weekendsOnly: boolean
  }
}

export interface NotificationSettingsUpdate {
  email?: Partial<NotificationSettings['email']>
  push?: Partial<NotificationSettings['push']>
  sound?: Partial<NotificationSettings['sound']>
  schedule?: Partial<NotificationSettings['schedule']>
}

export interface UserNotification {
  id: string
  type: 'event' | 'attendance' | 'team' | 'system' | 'general'
  title: string
  message: string
  read: boolean
  createdAt: string
  updatedAt?: string
  data?: Record<string, any>
  actionUrl?: string
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<string, number>
}

export class UserNotificationsService {
  /**
   * Get current user's notification settings
   */
  async getMyNotificationSettings(): Promise<NotificationSettings> {
    const res = await apiClient.get<any>('/users/me/notification-settings', { withAuth: true })
    return this.mapNotificationSettings(res?.data ?? res)
  }

  /**
   * Update current user's notification settings
   */
  async updateMyNotificationSettings(updates: NotificationSettingsUpdate): Promise<NotificationSettings> {
    const res = await apiClient.put<any>('/users/me/notification-settings', updates, {
      withAuth: true,
      withToast: { 
        loading: 'Sauvegarde des paramètres...', 
        success: 'Paramètres de notifications mis à jour' 
      },
    })
    return this.mapNotificationSettings(res?.data ?? res)
  }

  /**
   * Reset notification settings to default values
   */
  async resetNotificationSettings(): Promise<NotificationSettings> {
    const res = await apiClient.post<any>('/users/me/notification-settings/reset', {}, {
      withAuth: true,
      withToast: { 
        loading: 'Réinitialisation des paramètres...', 
        success: 'Paramètres de notifications réinitialisés' 
      },
    })
    return this.mapNotificationSettings(res?.data ?? res)
  }

  /**
   * Get current user's notifications
   */
  async getMyNotifications(params: { 
    page?: number
    limit?: number
    unreadOnly?: boolean
    type?: string
  } = {}): Promise<{
    items: UserNotification[]
    pagination: { total: number; page: number; limit: number; totalPages: number }
  }> {
    const { page = 1, limit = 20, unreadOnly = false, type } = params
    const qs = new URLSearchParams({ 
      page: String(page), 
      limit: String(limit), 
      unreadOnly: String(unreadOnly) 
    })
    if (type) qs.set('type', type)

    const res = await apiClient.get<any>(`/users/me/notifications?${qs.toString()}`, { withAuth: true })
    const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
    const items = list.map(this.mapNotification)
    
    return { 
      items, 
      pagination: res?.pagination ?? {
        total: items.length,
        page,
        limit,
        totalPages: Math.ceil(items.length / limit)
      }
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<NotificationStats> {
    const res = await apiClient.get<any>('/users/me/notifications/stats', { withAuth: true })
    return res?.data ?? res ?? { total: 0, unread: 0, byType: {} }
  }

  /**
   * Mark a notification as read
   */
  async markNotificationRead(id: string): Promise<void> {
    await apiClient.post(`/users/me/notifications/${encodeURIComponent(id)}/read`, {}, { 
      withAuth: true 
    })
  }

  /**
   * Mark multiple notifications as read
   */
  async markNotificationsRead(ids: string[]): Promise<void> {
    await apiClient.post('/users/me/notifications/mark-read', { ids }, { 
      withAuth: true,
      withToast: { 
        loading: 'Marquage des notifications...', 
        success: 'Notifications marquées comme lues' 
      }
    })
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(): Promise<void> {
    await apiClient.post('/users/me/notifications/mark-all-read', {}, {
      withAuth: true,
      withToast: { 
        loading: 'Marquage de toutes les notifications...', 
        success: 'Toutes les notifications marquées comme lues' 
      },
    })
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string): Promise<void> {
    await apiClient.delete(`/users/me/notifications/${encodeURIComponent(id)}`, { 
      withAuth: true,
      withToast: { 
        loading: 'Suppression de la notification...', 
        success: 'Notification supprimée' 
      }
    })
  }

  /**
   * Delete multiple notifications
   */
  async deleteNotifications(ids: string[]): Promise<void> {
    await apiClient.post('/users/me/notifications/delete', { ids }, { 
      withAuth: true,
      withToast: { 
        loading: 'Suppression des notifications...', 
        success: 'Notifications supprimées' 
      }
    })
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await apiClient.delete('/users/me/notifications/clear-all', {
      withAuth: true,
      withToast: { 
        loading: 'Suppression de toutes les notifications...', 
        success: 'Toutes les notifications supprimées' 
      },
    })
  }

  /**
   * Test notification settings by sending a test notification
   */
  async testNotificationSettings(type: 'email' | 'push' | 'sms'): Promise<void> {
    await apiClient.post(`/users/me/notifications/test/${type}`, {}, {
      withAuth: true,
      withToast: { 
        loading: 'Envoi de la notification de test...', 
        success: 'Notification de test envoyée' 
      },
    })
  }

  private mapNotificationSettings(data: any): NotificationSettings {
    return {
      email: {
        eventReminders: data?.email?.eventReminders ?? false,
        attendanceAlerts: data?.email?.attendanceAlerts ?? false,
        teamUpdates: data?.email?.teamUpdates ?? false,
        systemNotifications: data?.email?.systemNotifications ?? false,
        weeklyReports: data?.email?.weeklyReports ?? false,
        marketingEmails: data?.email?.marketingEmails ?? false,
      },
      push: {
        eventReminders: data?.push?.eventReminders ?? false,
        attendanceAlerts: data?.push?.attendanceAlerts ?? false,
        teamUpdates: data?.push?.teamUpdates ?? false,
        systemNotifications: data?.push?.systemNotifications ?? false,
        urgentAlerts: data?.push?.urgentAlerts ?? false,
      },
      sound: {
        enabled: data?.sound?.enabled ?? false,
        volume: data?.sound?.volume ?? 50,
        urgentOnly: data?.sound?.urgentOnly ?? true,
      },
      schedule: {
        quietHours: data?.schedule?.quietHours ?? false,
        startTime: data?.schedule?.startTime ?? '22:00',
        endTime: data?.schedule?.endTime ?? '08:00',
        weekendsOnly: data?.schedule?.weekendsOnly ?? false,
      },
    }
  }

  private mapNotification(data: any): UserNotification {
    return {
      id: String(data?.id ?? data?._id ?? Math.random()),
      type: data?.type ?? 'general',
      title: data?.title ?? '',
      message: data?.message ?? data?.body ?? '',
      read: Boolean(data?.read ?? data?.isRead),
      createdAt: data?.createdAt ?? new Date().toISOString(),
      updatedAt: data?.updatedAt,
      data: data?.data,
      actionUrl: data?.actionUrl,
    }
  }
}

export const userNotificationsService = new UserNotificationsService()