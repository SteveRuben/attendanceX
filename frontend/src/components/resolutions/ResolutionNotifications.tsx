import React, { useEffect, useState } from 'react'
import { Bell, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { 
  Resolution, 
  ResolutionStatus,
  isResolutionOverdue,
  isDueSoon,
  calculateTimeRemaining
} from '@/types/resolution.types'
import { useMyTasks } from '@/hooks/useResolutions'

interface ResolutionNotificationsProps {
  onNotificationClick?: (resolutionId: string) => void
}

interface NotificationItem {
  id: string
  type: 'overdue' | 'due_soon' | 'assigned' | 'completed'
  title: string
  message: string
  resolution: Resolution
  timestamp: Date
  read: boolean
}

export const ResolutionNotifications: React.FC<ResolutionNotificationsProps> = ({
  onNotificationClick
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const { resolutions: tasks } = useMyTasks()

  // Générer les notifications basées sur les tâches
  useEffect(() => {
    const newNotifications: NotificationItem[] = []

    tasks.forEach(task => {
      // Tâches en retard
      if (isResolutionOverdue(task)) {
        const timeRemaining = calculateTimeRemaining(task.dueDate!)
        newNotifications.push({
          id: `overdue-${task.id}`,
          type: 'overdue',
          title: 'Tâche en retard',
          message: `"${task.title}" est en retard de ${timeRemaining?.days || 0}j ${timeRemaining?.hours || 0}h`,
          resolution: task,
          timestamp: new Date(task.dueDate!),
          read: false
        })
      }
      // Tâches bientôt dues
      else if (task.dueDate && isDueSoon(task.dueDate, 24)) {
        const timeRemaining = calculateTimeRemaining(task.dueDate)
        newNotifications.push({
          id: `due-soon-${task.id}`,
          type: 'due_soon',
          title: 'Échéance proche',
          message: `"${task.title}" est due dans ${timeRemaining?.days || 0}j ${timeRemaining?.hours || 0}h`,
          resolution: task,
          timestamp: new Date(task.dueDate),
          read: false
        })
      }

      // Tâches récemment terminées
      if (task.status === ResolutionStatus.COMPLETED && 
          new Date(task.updatedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000) {
        newNotifications.push({
          id: `completed-${task.id}`,
          type: 'completed',
          title: 'Tâche terminée',
          message: `"${task.title}" a été marquée comme terminée`,
          resolution: task,
          timestamp: new Date(task.updatedAt),
          read: false
        })
      }
    })

    // Trier par timestamp décroissant
    newNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    setNotifications(newNotifications.slice(0, 10)) // Limiter à 10 notifications
  }, [tasks])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleNotificationClick = (notification: NotificationItem) => {
    // Marquer comme lu
    setNotifications(prev => 
      prev.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      )
    )
    
    onNotificationClick?.(notification.resolution.id)
    setShowDropdown(false)
  }

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'due_soon':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <Bell className="w-4 h-4 text-blue-500" />
    }
  }

  const getNotificationColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'overdue':
        return 'border-l-red-500 bg-red-50'
      case 'due_soon':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'completed':
        return 'border-l-green-500 bg-green-50'
      default:
        return 'border-l-blue-500 bg-blue-50'
    }
  }

  return (
    <div className="relative">
      {/* Bouton de notification */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown des notifications */}
      {showDropdown && (
        <>
          {/* Overlay pour fermer */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Contenu du dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Notifications ({unreadCount} non lues)
              </h3>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors border-l-4 ${
                        getNotificationColor(notification.type)
                      } ${!notification.read ? 'font-medium' : ''}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {notification.timestamp.toLocaleString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Marquer tout comme lu
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ResolutionNotifications