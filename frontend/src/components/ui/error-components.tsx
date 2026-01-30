import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ModernButton } from './modern-button'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from './modern-card'
import { 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Home, 
  ArrowLeft,
  Wifi,
  WifiOff,
  Server,
  Bug,
  Shield,
  Clock
} from 'lucide-react'

// Error Types
export type ErrorType = 
  | 'network'
  | 'server' 
  | 'validation'
  | 'permission'
  | 'notFound'
  | 'timeout'
  | 'generic'

export interface ErrorInfo {
  type: ErrorType
  title: string
  message: string
  code?: string
  details?: string
  timestamp?: Date
}

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ModernErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo })
    console.error('Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorDisplay
          error={{
            type: 'generic',
            title: 'Something went wrong',
            message: 'An unexpected error occurred. Please try refreshing the page.',
            details: this.state.error?.message
          }}
          onRetry={() => window.location.reload()}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      )
    }

    return this.props.children
  }
}

// Main Error Display Component
export interface ErrorDisplayProps {
  error: ErrorInfo
  onRetry?: () => void
  onGoHome?: () => void
  onGoBack?: () => void
  showDetails?: boolean
  className?: string
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onGoHome,
  onGoBack,
  showDetails = false,
  className
}) => {
  const getErrorIcon = (type: ErrorType) => {
    switch (type) {
      case 'network':
        return <WifiOff className="h-12 w-12 text-red-500" />
      case 'server':
        return <Server className="h-12 w-12 text-red-500" />
      case 'validation':
        return <AlertTriangle className="h-12 w-12 text-yellow-500" />
      case 'permission':
        return <Shield className="h-12 w-12 text-orange-500" />
      case 'notFound':
        return <XCircle className="h-12 w-12 text-gray-500" />
      case 'timeout':
        return <Clock className="h-12 w-12 text-blue-500" />
      default:
        return <Bug className="h-12 w-12 text-red-500" />
    }
  }

  const getErrorColor = (type: ErrorType) => {
    switch (type) {
      case 'network':
      case 'server':
      case 'generic':
        return 'red'
      case 'validation':
        return 'yellow'
      case 'permission':
        return 'orange'
      case 'notFound':
        return 'gray'
      case 'timeout':
        return 'blue'
      default:
        return 'red'
    }
  }

  const color = getErrorColor(error.type)

  return (
    <div className={cn(
      'flex items-center justify-center min-h-[400px] p-6',
      className
    )}>
      <ModernCard 
        className="max-w-md w-full text-center"
        elevation="lg"
        status={color === 'red' ? 'error' : color === 'yellow' ? 'warning' : 'info'}
      >
        <ModernCardContent className="p-8 space-y-6">
          {/* Error Icon */}
          <div className="flex justify-center animate-fadeIn">
            {getErrorIcon(error.type)}
          </div>

          {/* Error Content */}
          <div className="space-y-3 animate-fadeIn animate-delay-100">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {error.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {error.message}
            </p>
            
            {error.code && (
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Error Code: {error.code}
              </p>
            )}
          </div>

          {/* Error Details (Development) */}
          {showDetails && error.details && (
            <details className="text-left animate-fadeIn animate-delay-200">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Technical Details
              </summary>
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto max-h-32">
                {error.details}
              </pre>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 animate-fadeIn animate-delay-300">
            {onRetry && (
              <ModernButton
                variant="primary"
                size="md"
                icon={<RefreshCw className="h-4 w-4" />}
                onClick={onRetry}
                animation="scale"
                fullWidth
              >
                Try Again
              </ModernButton>
            )}
            
            {onGoBack && (
              <ModernButton
                variant="outline"
                size="md"
                icon={<ArrowLeft className="h-4 w-4" />}
                onClick={onGoBack}
                animation="scale"
                fullWidth
              >
                Go Back
              </ModernButton>
            )}
            
            {onGoHome && (
              <ModernButton
                variant="ghost"
                size="md"
                icon={<Home className="h-4 w-4" />}
                onClick={onGoHome}
                animation="scale"
                fullWidth
              >
                Go Home
              </ModernButton>
            )}
          </div>

          {/* Timestamp */}
          {error.timestamp && (
            <p className="text-xs text-gray-400 dark:text-gray-600 animate-fadeIn animate-delay-500">
              {error.timestamp.toLocaleString()}
            </p>
          )}
        </ModernCardContent>
      </ModernCard>
    </div>
  )
}

// Inline Error Component
export interface InlineErrorProps {
  message: string
  type?: 'error' | 'warning' | 'info'
  onDismiss?: () => void
  className?: string
}

export const InlineError: React.FC<InlineErrorProps> = ({
  message,
  type = 'error',
  onDismiss,
  className
}) => {
  const typeStyles = {
    error: {
      container: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
      icon: 'text-red-500'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
      icon: 'text-yellow-500'
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
      icon: 'text-blue-500'
    }
  }

  const styles = typeStyles[type]
  const Icon = type === 'error' ? XCircle : AlertTriangle

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border text-sm animate-fadeIn',
      styles.container,
      className
    )}>
      <Icon className={cn('h-4 w-4 flex-shrink-0', styles.icon)} />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// Network Status Component
export const NetworkStatus: React.FC<{ 
  isOnline: boolean
  className?: string 
}> = ({ isOnline, className }) => {
  if (isOnline) return null

  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-center py-2 text-sm animate-slideInDown',
      className
    )}>
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>You're offline. Some features may not work.</span>
      </div>
    </div>
  )
}

// Form Field Error Component
export interface FieldErrorProps {
  error?: string
  touched?: boolean
  className?: string
}

export const FieldError: React.FC<FieldErrorProps> = ({
  error,
  touched,
  className
}) => {
  if (!error || !touched) return null

  return (
    <p className={cn(
      'text-sm text-red-600 dark:text-red-400 mt-1 animate-fadeIn',
      className
    )}>
      {error}
    </p>
  )
}

// Empty State Component
export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className
}) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center p-8 min-h-[300px]',
      className
    )}>
      {icon && (
        <div className="mb-4 animate-fadeIn">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 animate-fadeIn animate-delay-100">
        {title}
      </h3>
      
      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm animate-fadeIn animate-delay-200">
          {description}
        </p>
      )}
      
      {action && (
        <ModernButton
          variant="primary"
          size="md"
          icon={action.icon}
          onClick={action.onClick}
          animation="scale"
          className="animate-fadeIn animate-delay-300"
        >
          {action.label}
        </ModernButton>
      )}
    </div>
  )
}

// Error Helper Functions
export const createErrorInfo = (
  type: ErrorType,
  title: string,
  message: string,
  options?: {
    code?: string
    details?: string
  }
): ErrorInfo => ({
  type,
  title,
  message,
  code: options?.code,
  details: options?.details,
  timestamp: new Date()
})

export const getNetworkErrorInfo = (error: any): ErrorInfo => {
  if (!navigator.onLine) {
    return createErrorInfo(
      'network',
      'No Internet Connection',
      'Please check your internet connection and try again.'
    )
  }

  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('fetch')) {
    return createErrorInfo(
      'network',
      'Network Error',
      'Unable to connect to the server. Please try again.',
      { details: error.message }
    )
  }

  if (error?.status >= 500) {
    return createErrorInfo(
      'server',
      'Server Error',
      'The server is experiencing issues. Please try again later.',
      { code: error.status?.toString(), details: error.message }
    )
  }

  if (error?.status === 404) {
    return createErrorInfo(
      'notFound',
      'Not Found',
      'The requested resource could not be found.',
      { code: '404' }
    )
  }

  if (error?.status === 403) {
    return createErrorInfo(
      'permission',
      'Access Denied',
      'You don\'t have permission to access this resource.',
      { code: '403' }
    )
  }

  if (error?.status === 408 || error?.code === 'TIMEOUT') {
    return createErrorInfo(
      'timeout',
      'Request Timeout',
      'The request took too long to complete. Please try again.',
      { code: 'TIMEOUT' }
    )
  }

  return createErrorInfo(
    'generic',
    'Something went wrong',
    'An unexpected error occurred. Please try again.',
    { details: error?.message }
  )
}