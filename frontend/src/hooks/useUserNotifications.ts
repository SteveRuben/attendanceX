import { useState, useEffect, useCallback } from 'react'
import { 
  userNotificationsService, 
  NotificationSettings, 
  NotificationSettingsUpdate, 
  UserNotification,
  NotificationStats
} from '@/services/userNotificationsService'

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await userNotificationsService.getMyNotificationSettings()
      setSettings(data)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des paramètres de notifications')
      console.error('Error fetching notification settings:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSettings = useCallback(async (updates: NotificationSettingsUpdate) => {
    if (!settings) return

    try {
      setUpdating(true)
      setError(null)
      const updatedSettings = await userNotificationsService.updateMyNotificationSettings(updates)
      setSettings(updatedSettings)
      return updatedSettings
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour des paramètres')
      throw err
    } finally {
      setUpdating(false)
    }
  }, [settings])

  const updateSetting = useCallback(async (category: keyof NotificationSettings, setting: string, value: any) => {
    if (!settings) return
    
    const updates = {
      [category]: {
        ...settings[category],
        [setting]: value
      }
    }
    return updateSettings(updates)
  }, [settings, updateSettings])

  const resetSettings = useCallback(async () => {
    try {
      setUpdating(true)
      setError(null)
      const resetSettings = await userNotificationsService.resetNotificationSettings()
      setSettings(resetSettings)
      return resetSettings
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la réinitialisation des paramètres')
      throw err
    } finally {
      setUpdating(false)
    }
  }, [])

  const testNotification = useCallback(async (type: 'email' | 'push' | 'sms') => {
    try {
      setError(null)
      await userNotificationsService.testNotificationSettings(type)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi de la notification de test')
      throw err
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    loading,
    error,
    updating,
    updateSettings,
    updateSetting,
    resetSettings,
    testNotification,
    refetch: fetchSettings,
  }
}

export function useUserNotifications(params: { 
  page?: number
  limit?: number
  unreadOnly?: boolean
  type?: string
  autoRefresh?: boolean
} = {}) {
  const { page = 1, limit = 20, unreadOnly = false, type, autoRefresh = false } = params
  
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [pagination, setPagination] = useState<{
    total: number
    page: number
    limit: number
    totalPages: number
  }>({ total: 0, page: 1, limit: 20, totalPages: 0 })
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, byType: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [notificationsData, statsData] = await Promise.all([
        userNotificationsService.getMyNotifications({ page, limit, unreadOnly, type }),
        userNotificationsService.getNotificationStats()
      ])
      setNotifications(notificationsData.items)
      setPagination(notificationsData.pagination)
      setStats(statsData)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des notifications')
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [page, limit, unreadOnly, type])

  const markAsRead = useCallback(async (id: string) => {
    try {
      setActionLoading(true)
      await userNotificationsService.markNotificationRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }))
    } catch (err: any) {
      setError(err.message || 'Erreur lors du marquage de la notification')
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [])

  const markMultipleAsRead = useCallback(async (ids: string[]) => {
    try {
      setActionLoading(true)
      await userNotificationsService.markNotificationsRead(ids)
      setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n))
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - ids.length) }))
    } catch (err: any) {
      setError(err.message || 'Erreur lors du marquage des notifications')
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      setActionLoading(true)
      await userNotificationsService.markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setStats(prev => ({ ...prev, unread: 0 }))
    } catch (err: any) {
      setError(err.message || 'Erreur lors du marquage de toutes les notifications')
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [])

  const deleteNotification = useCallback(async (id: string) => {
    try {
      setActionLoading(true)
      await userNotificationsService.deleteNotification(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      setStats(prev => ({ 
        ...prev, 
        total: Math.max(0, prev.total - 1),
        unread: Math.max(0, prev.unread - (notifications.find(n => n.id === id && !n.read) ? 1 : 0))
      }))
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression de la notification')
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [notifications])

  const deleteMultiple = useCallback(async (ids: string[]) => {
    try {
      setActionLoading(true)
      await userNotificationsService.deleteNotifications(ids)
      const deletedUnreadCount = notifications.filter(n => ids.includes(n.id) && !n.read).length
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)))
      setStats(prev => ({ 
        ...prev, 
        total: Math.max(0, prev.total - ids.length),
        unread: Math.max(0, prev.unread - deletedUnreadCount)
      }))
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression des notifications')
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [notifications])

  const clearAll = useCallback(async () => {
    try {
      setActionLoading(true)
      await userNotificationsService.clearAllNotifications()
      setNotifications([])
      setStats({ total: 0, unread: 0, byType: {} })
      setPagination(prev => ({ ...prev, total: 0, totalPages: 0 }))
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression de toutes les notifications')
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Auto-refresh notifications
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, fetchNotifications])

  return {
    notifications,
    pagination,
    stats,
    loading,
    error,
    actionLoading,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    deleteNotification,
    deleteMultiple,
    clearAll,
    refetch: fetchNotifications,
  }
}

// Hook for notification stats only
export function useNotificationStats() {
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, byType: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await userNotificationsService.getNotificationStats()
      setStats(data)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des statistiques')
      console.error('Error fetching notification stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    
    // Auto-refresh stats every minute
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  }
}