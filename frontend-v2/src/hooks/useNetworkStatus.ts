import { useState, useEffect } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  isSlowConnection: boolean
  connectionType: string | null
}

export const useNetworkStatus = (): NetworkStatus => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: null
  })

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return

    const updateNetworkStatus = () => {
      const isOnline = navigator.onLine
      let isSlowConnection = false
      let connectionType: string | null = null

      // Check connection type if available (experimental API)
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        connectionType = connection?.effectiveType || null
        
        // Consider 2g and slow-2g as slow connections
        isSlowConnection = ['slow-2g', '2g'].includes(connection?.effectiveType)
      }

      setNetworkStatus({
        isOnline,
        isSlowConnection,
        connectionType
      })
    }

    // Initial check
    updateNetworkStatus()

    // Event listeners for online/offline events
    const handleOnline = () => updateNetworkStatus()
    const handleOffline = () => updateNetworkStatus()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for connection changes if supported
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        connection.addEventListener('change', updateNetworkStatus)
      }
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection) {
          connection.removeEventListener('change', updateNetworkStatus)
        }
      }
    }
  }, [])

  return networkStatus
}

// Hook for simple online/offline status
export const useOnlineStatus = (): boolean => {
  const { isOnline } = useNetworkStatus()
  return isOnline
}