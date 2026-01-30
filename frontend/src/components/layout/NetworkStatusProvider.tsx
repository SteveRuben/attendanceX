import React, { ReactNode } from 'react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { NetworkStatus } from '@/components/ui/error-components'
import { useNotify } from '@/components/ui/notification-system'
import { useEffect, useRef } from 'react'

interface NetworkStatusProviderProps {
  children: ReactNode
}

export const NetworkStatusProvider: React.FC<NetworkStatusProviderProps> = ({ children }) => {
  const networkStatus = useNetworkStatus()
  const notify = useNotify()
  const wasOfflineRef = useRef(false)

  useEffect(() => {
    // Show notification when going offline
    if (!networkStatus.isOnline && !wasOfflineRef.current) {
      notify.warning(
        'Connection Lost',
        'You\'re currently offline. Some features may not work properly.',
        { duration: 0 } // Persistent notification
      )
      wasOfflineRef.current = true
    }

    // Show notification when coming back online
    if (networkStatus.isOnline && wasOfflineRef.current) {
      notify.success(
        'Connection Restored',
        'You\'re back online! All features are now available.',
        { duration: 3000 }
      )
      wasOfflineRef.current = false
    }

    // Show notification for slow connection
    if (networkStatus.isOnline && networkStatus.isSlowConnection) {
      notify.info(
        'Slow Connection',
        'You\'re on a slow connection. Some features may take longer to load.',
        { duration: 5000 }
      )
    }
  }, [networkStatus.isOnline, networkStatus.isSlowConnection, notify])

  return (
    <>
      <NetworkStatus isOnline={networkStatus.isOnline} />
      {children}
    </>
  )
}