import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { designTokens } from '@/styles/design-tokens'

// Notification Types
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  action?: NotificationAction
  realTime?: boolean
  timestamp: Date
}

export interface NotificationAction {
  label: string
  onClick: () => void
}

// Notification Context
interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Notification Provider
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const duration = notification.duration ?? 5000
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      duration
    }

    setNotifications(prev => [newNotification, ...prev])

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  )
}

// Individual Notification Component
interface NotificationItemProps {
  notification: Notification
  onRemove: (id: string) => void
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleRemove = () => {
    setIsRemoving(true)
    setTimeout(() => onRemove(notification.id), 300)
  }

  const iconMap = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }

  const Icon = iconMap[notification.type]

  const typeClasses = {
    success: {
      container: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      title: 'text-green-900 dark:text-green-100',
      message: 'text-green-700 dark:text-green-300'
    },
    error: {
      container: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      title: 'text-red-900 dark:text-red-100',
      message: 'text-red-700 dark:text-red-300'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      title: 'text-yellow-900 dark:text-yellow-100',
      message: 'text-yellow-700 dark:text-yellow-300'
    },
    info: {
      container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-900 dark:text-blue-100',
      message: 'text-blue-700 dark:text-blue-300'
    }
  }

  const classes = typeClasses[notification.type]

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm',
        'transition-all duration-300 ease-out transform',
        classes.container,
        isVisible && !isRemoving ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95',
        isRemoving && 'translate-x-full opacity-0 scale-95',
        notification.realTime && 'animate-pulse'
      )}
    >
      {/* Icon */}
      <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', classes.icon)} />
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className={cn('text-sm font-medium', classes.title)}>
          {notification.title}
        </h4>
        <p className={cn('text-sm mt-1', classes.message)}>
          {notification.message}
        </p>
        
        {/* Action Button */}
        {notification.action && (
          <button
            onClick={notification.action.onClick}
            className={cn(
              'mt-2 text-sm font-medium underline hover:no-underline',
              classes.title
            )}
          >
            {notification.action.label}
          </button>
        )}
      </div>
      
      {/* Close Button */}
      <button
        onClick={handleRemove}
        className={cn(
          'flex-shrink-0 p-1 rounded-md transition-colors',
          'hover:bg-black/5 dark:hover:bg-white/5',
          classes.icon
        )}
      >
        <X className="h-4 w-4" />
      </button>
      
      {/* Real-time indicator */}
      {notification.realTime && (
        <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-ping" />
      )}
    </div>
  )
}

// Notification Container
const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications()

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  )
}

// Notification Badge Component
export interface NotificationBadgeProps {
  count: number
  max?: number
  className?: string
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count, 
  max = 99, 
  className 
}) => {
  if (count <= 0) return null

  const displayCount = count > max ? `${max}+` : count.toString()

  return (
    <span
      className={cn(
        'absolute -top-1 -right-1 h-5 w-5 rounded-full',
        'bg-red-500 text-white text-xs font-medium',
        'flex items-center justify-center',
        'animate-pulse',
        className
      )}
    >
      {displayCount}
    </span>
  )
}

// Hook for easy notification usage
export const useNotify = () => {
  const { addNotification } = useNotifications()

  return React.useMemo(() => ({
    success: (title: string, message: string, options?: Partial<Notification>) =>
      addNotification({ type: 'success', title, message, ...options }),
    
    error: (title: string, message: string, options?: Partial<Notification>) =>
      addNotification({ type: 'error', title, message, duration: 0, ...options }),
    
    warning: (title: string, message: string, options?: Partial<Notification>) =>
      addNotification({ type: 'warning', title, message, ...options }),
    
    info: (title: string, message: string, options?: Partial<Notification>) =>
      addNotification({ type: 'info', title, message, ...options }),
    
    realTime: (title: string, message: string, type: Notification['type'] = 'info') =>
      addNotification({ type, title, message, realTime: true, duration: 3000 })
  }), [addNotification])
}