import { useEffect, useState, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Bell, Check, CheckCheck, Trash2, Mail, Calendar, AlertCircle, Info, Settings, Loader2 } from 'lucide-react'
import {
  getMyNotifications,
  getNotificationStats,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type Notification,
  type NotificationStats,
} from '@/services/notificationsService'
import { showToast } from '@/hooks/use-toast'
import Link from 'next/link'

function getNotificationIcon(type: string) {
  switch (type) {
    case 'event_reminder':
    case 'event':
      return <Calendar className="h-5 w-5 text-blue-600" />
    case 'attendance_alert':
    case 'attendance':
      return <AlertCircle className="h-5 w-5 text-amber-600" />
    case 'email':
      return <Mail className="h-5 w-5 text-green-600" />
    default:
      return <Info className="h-5 w-5 text-neutral-600" />
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0 })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [notifRes, statsRes] = await Promise.all([
        getMyNotifications({ limit: 50 }),
        getNotificationStats(),
      ])
      setNotifications(notifRes.data)
      setStats(statsRes)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleMarkAsRead = async (id: string) => {
    setActionLoading(id)
    try {
      await markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
      setStats((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }))
      showToast({ title: 'Marked as read', variant: 'success' })
    } catch {
      showToast({ title: 'Failed to mark as read', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkAllAsRead = async () => {
    setActionLoading('all')
    try {
      await markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setStats((prev) => ({ ...prev, unread: 0 }))
      showToast({ title: 'All notifications marked as read', variant: 'success' })
    } catch {
      showToast({ title: 'Failed to mark all as read', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    setActionLoading(id)
    try {
      await deleteNotification(id)
      const deleted = notifications.find((n) => n.id === id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      setStats((prev) => ({
        ...prev,
        total: prev.total - 1,
        unread: deleted && !deleted.isRead ? prev.unread - 1 : prev.unread,
      }))
      showToast({ title: 'Notification deleted', variant: 'success' })
    } catch {
      showToast({ title: 'Failed to delete', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <AppShell title="Notifications">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-3">
              <Bell className="h-6 w-6 text-blue-600" />
              Notifications
              {stats.unread > 0 && (
                <Badge variant="destructive">{stats.unread} unread</Badge>
              )}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              {stats.total} total notification{stats.total !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats.unread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={actionLoading === 'all'}
              >
                {actionLoading === 'all' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-2" />
                )}
                Mark all as read
              </Button>
            )}
            <Link href="/app/settings/notifications">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Preferences
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-12 w-12" />}
            title="No notifications"
            description="You're all caught up! Check back later for new notifications."
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`transition-colors ${
                  !notification.isRead
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                    : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        !notification.isRead
                          ? 'bg-blue-100 dark:bg-blue-900/50'
                          : 'bg-neutral-100 dark:bg-neutral-800'
                      }`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              !notification.isRead ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={actionLoading === notification.id}
                              className="h-8 w-8 p-0"
                              title="Mark as read"
                            >
                              {actionLoading === notification.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(notification.id)}
                            disabled={actionLoading === notification.id}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
