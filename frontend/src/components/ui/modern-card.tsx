import React, { forwardRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { designTokens } from '@/styles/design-tokens'

export interface ModernCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  clickable?: boolean
  elevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  animation?: 'none' | 'fade' | 'slide' | 'scale' | 'lift'
  status?: 'default' | 'success' | 'warning' | 'error' | 'info'
  gradient?: boolean
  glass?: boolean
}

const ModernCard = forwardRef<HTMLDivElement, ModernCardProps>(
  ({
    className,
    hover = false,
    clickable = false,
    elevation = 'md',
    animation = 'scale',
    status = 'default',
    gradient = false,
    glass = false,
    children,
    ...props
  }, ref) => {
    const baseClasses = [
      // Base styles
      'rounded-xl border transition-all duration-300 ease-out',
      'relative overflow-hidden',
      
      // Clickable styles
      clickable && 'cursor-pointer select-none',
      
      // Hover effects
      hover && animation === 'scale' && 'hover:scale-[1.02]',
      hover && animation === 'lift' && 'hover:-translate-y-1',
      hover && animation === 'fade' && 'hover:opacity-90',
      
      // Glass morphism effect
      glass && [
        'backdrop-blur-lg bg-white/10 border-white/20',
        'dark:bg-gray-900/10 dark:border-gray-700/20'
      ].join(' '),
      
      // Gradient background
      gradient && !glass && [
        'bg-gradient-to-br from-white to-gray-50',
        'dark:from-gray-900 dark:to-gray-800'
      ].join(' '),
      
      // Default background
      !gradient && !glass && [
        'bg-white border-gray-200',
        'dark:bg-gray-900 dark:border-gray-700'
      ].join(' ')
    ].filter(Boolean).join(' ')

    const elevationClasses = {
      none: 'shadow-none',
      sm: 'shadow-sm hover:shadow-md',
      md: 'shadow-md hover:shadow-lg',
      lg: 'shadow-lg hover:shadow-xl',
      xl: 'shadow-xl hover:shadow-2xl'
    }

    const statusClasses = {
      default: '',
      success: [
        'border-green-200 bg-green-50/50',
        'dark:border-green-800 dark:bg-green-900/20',
        'before:absolute before:inset-0 before:bg-gradient-to-r',
        'before:from-green-500/5 before:to-transparent'
      ].join(' '),
      warning: [
        'border-yellow-200 bg-yellow-50/50',
        'dark:border-yellow-800 dark:bg-yellow-900/20',
        'before:absolute before:inset-0 before:bg-gradient-to-r',
        'before:from-yellow-500/5 before:to-transparent'
      ].join(' '),
      error: [
        'border-red-200 bg-red-50/50',
        'dark:border-red-800 dark:bg-red-900/20',
        'before:absolute before:inset-0 before:bg-gradient-to-r',
        'before:from-red-500/5 before:to-transparent'
      ].join(' '),
      info: [
        'border-blue-200 bg-blue-50/50',
        'dark:border-blue-800 dark:bg-blue-900/20',
        'before:absolute before:inset-0 before:bg-gradient-to-r',
        'before:from-blue-500/5 before:to-transparent'
      ].join(' ')
    }

    const hoverClasses = hover ? [
      'hover:border-gray-300 dark:hover:border-gray-600',
      status === 'success' && 'hover:border-green-300 dark:hover:border-green-700',
      status === 'warning' && 'hover:border-yellow-300 dark:hover:border-yellow-700',
      status === 'error' && 'hover:border-red-300 dark:hover:border-red-700',
      status === 'info' && 'hover:border-blue-300 dark:hover:border-blue-700'
    ].filter(Boolean).join(' ') : ''

    return (
      <div
        className={cn(
          baseClasses,
          elevationClasses[elevation],
          statusClasses[status],
          hoverClasses,
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

ModernCard.displayName = 'ModernCard'

// Card Header Component
export interface ModernCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  gradient?: boolean
}

const ModernCardHeader = forwardRef<HTMLDivElement, ModernCardHeaderProps>(
  ({ className, gradient = false, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          'flex flex-col space-y-1.5 p-6 pb-4',
          gradient && [
            'bg-gradient-to-r from-gray-50 to-white',
            'dark:from-gray-800 dark:to-gray-900',
            'border-b border-gray-100 dark:border-gray-700'
          ].join(' '),
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

ModernCardHeader.displayName = 'ModernCardHeader'

// Card Title Component
export interface ModernCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

const ModernCardTitle = forwardRef<HTMLHeadingElement, ModernCardTitleProps>(
  ({ className, as: Component = 'h3', children, ...props }, ref) => {
    return (
      <Component
        className={cn(
          'text-lg font-semibold leading-none tracking-tight',
          'text-gray-900 dark:text-gray-100',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

ModernCardTitle.displayName = 'ModernCardTitle'

// Card Description Component
const ModernCardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        className={cn(
          'text-sm text-gray-600 dark:text-gray-400 leading-relaxed',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </p>
    )
  }
)

ModernCardDescription.displayName = 'ModernCardDescription'

// Card Content Component
const ModernCardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn('p-6 pt-0 relative z-10', className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

ModernCardContent.displayName = 'ModernCardContent'

// Card Footer Component
const ModernCardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          'flex items-center p-6 pt-0 relative z-10',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

ModernCardFooter.displayName = 'ModernCardFooter'

export {
  ModernCard,
  ModernCardHeader,
  ModernCardTitle,
  ModernCardDescription,
  ModernCardContent,
  ModernCardFooter
}