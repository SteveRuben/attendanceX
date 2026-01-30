import React from 'react'
import { cn } from '@/lib/utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  animation?: 'pulse' | 'wave' | 'none'
  width?: string | number
  height?: string | number
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  animation = 'pulse',
  width,
  height,
  style,
  ...props
}) => {
  const baseClasses = [
    'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200',
    'dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
    'relative overflow-hidden'
  ].join(' ')

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-md'
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
    none: ''
  }

  const inlineStyles = {
    ...style,
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height })
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={inlineStyles}
      {...props}
    >
      {animation === 'wave' && (
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      )}
    </div>
  )
}

// Predefined skeleton components for common use cases
export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 1, 
  className 
}) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        width={i === lines - 1 ? '75%' : '100%'}
      />
    ))}
  </div>
)

export const AvatarSkeleton: React.FC<{ size?: number; className?: string }> = ({ 
  size = 40, 
  className 
}) => (
  <Skeleton
    variant="circular"
    width={size}
    height={size}
    className={className}
  />
)

export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 space-y-4', className)}>
    <div className="flex items-center space-x-3">
      <AvatarSkeleton size={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
    <TextSkeleton lines={3} />
    <div className="flex space-x-2">
      <Skeleton variant="rounded" width={80} height={32} />
      <Skeleton variant="rounded" width={100} height={32} />
    </div>
  </div>
)

export const TableSkeleton: React.FC<{ 
  rows?: number
  columns?: number
  className?: string 
}> = ({ 
  rows = 5, 
  columns = 4, 
  className 
}) => (
  <div className={cn('space-y-3', className)}>
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={`header-${i}`} variant="text" height={20} />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div 
        key={`row-${rowIndex}`} 
        className="grid gap-4" 
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" height={16} />
        ))}
      </div>
    ))}
  </div>
)

export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-6', className)}>
    {/* Header */}
    <div className="space-y-2">
      <Skeleton variant="text" width="30%" height={32} />
      <Skeleton variant="text" width="50%" height={20} />
    </div>
    
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-6 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="circular" width={24} height={24} />
          </div>
          <Skeleton variant="text" width="40%" height={28} />
          <Skeleton variant="text" width="80%" height={16} />
        </div>
      ))}
    </div>
    
    {/* Chart Area */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="p-6 border rounded-lg space-y-4">
        <Skeleton variant="text" width="40%" height={24} />
        <Skeleton variant="rectangular" height={200} />
      </div>
      <div className="p-6 border rounded-lg space-y-4">
        <Skeleton variant="text" width="40%" height={24} />
        <Skeleton variant="rectangular" height={200} />
      </div>
    </div>
  </div>
)

// Loading overlay component
export const LoadingOverlay: React.FC<{
  loading: boolean
  children: React.ReactNode
  className?: string
}> = ({ loading, children, className }) => {
  if (!loading) return <>{children}</>

  return (
    <div className={cn('relative', className)}>
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <Skeleton variant="circular" width={24} height={24} animation="pulse" />
          <Skeleton variant="text" width={100} height={20} animation="pulse" />
        </div>
      </div>
    </div>
  )
}