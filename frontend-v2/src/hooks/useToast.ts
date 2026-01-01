import { useCallback } from 'react'

interface ToastOptions {
  duration?: number
  position?: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

interface UseToastReturn {
  toast: {
    success: (message: string, options?: ToastOptions) => void
    error: (message: string, options?: ToastOptions) => void
    info: (message: string, options?: ToastOptions) => void
    warning: (message: string, options?: ToastOptions) => void
  }
}

// Simple toast implementation - can be replaced with a proper toast library
const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning', options?: ToastOptions) => {
  // For now, use console and alert as fallback
  // In a real implementation, this would integrate with a toast library like react-hot-toast
  console.log(`[${type.toUpperCase()}] ${message}`)
  
  if (type === 'error') {
    // Show errors as alerts for now
    alert(`Erreur: ${message}`)
  } else if (type === 'success') {
    // Show success messages briefly
    console.log(`✅ ${message}`)
  }
}

export const useToast = (): UseToastReturn => {
  const success = useCallback((message: string, options?: ToastOptions) => {
    showToast(message, 'success', options)
  }, [])

  const error = useCallback((message: string, options?: ToastOptions) => {
    showToast(message, 'error', options)
  }, [])

  const info = useCallback((message: string, options?: ToastOptions) => {
    showToast(message, 'info', options)
  }, [])

  const warning = useCallback((message: string, options?: ToastOptions) => {
    showToast(message, 'warning', options)
  }, [])

  return {
    toast: {
      success,
      error,
      info,
      warning
    }
  }
}

export default useToast