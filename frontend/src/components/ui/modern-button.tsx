import React, { forwardRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { designTokens } from '@/styles/design-tokens'

export interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  animation?: 'pulse' | 'bounce' | 'slide' | 'scale'
  fullWidth?: boolean
}

const ModernButton = forwardRef<HTMLButtonElement, ModernButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    animation = 'scale',
    fullWidth = false,
    disabled,
    children,
    ...props
  }, ref) => {
    const baseClasses = [
      // Base styles
      'inline-flex items-center justify-center font-medium rounded-lg',
      'transition-all duration-200 ease-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'relative overflow-hidden',
      
      // Animation classes
      animation === 'scale' && 'hover:scale-105 active:scale-95',
      animation === 'pulse' && 'hover:animate-pulse',
      animation === 'bounce' && 'hover:animate-bounce',
      animation === 'slide' && 'hover:translate-y-[-1px]',
      
      // Full width
      fullWidth && 'w-full'
    ].filter(Boolean).join(' ')

    const variantClasses = {
      primary: [
        'bg-gradient-to-r from-blue-600 to-blue-700',
        'hover:from-blue-700 hover:to-blue-800',
        'text-white shadow-lg hover:shadow-xl',
        'focus:ring-blue-500',
        'before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent',
        'before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700'
      ].join(' '),
      
      secondary: [
        'bg-gradient-to-r from-gray-100 to-gray-200',
        'hover:from-gray-200 hover:to-gray-300',
        'text-gray-900 shadow-md hover:shadow-lg',
        'focus:ring-gray-500',
        'dark:from-gray-800 dark:to-gray-700',
        'dark:hover:from-gray-700 dark:hover:to-gray-600',
        'dark:text-gray-100'
      ].join(' '),
      
      ghost: [
        'bg-transparent hover:bg-gray-100',
        'text-gray-700 hover:text-gray-900',
        'focus:ring-gray-500',
        'dark:hover:bg-gray-800',
        'dark:text-gray-300 dark:hover:text-gray-100'
      ].join(' '),
      
      destructive: [
        'bg-gradient-to-r from-red-600 to-red-700',
        'hover:from-red-700 hover:to-red-800',
        'text-white shadow-lg hover:shadow-xl',
        'focus:ring-red-500'
      ].join(' '),
      
      outline: [
        'border-2 border-gray-300 bg-transparent',
        'hover:border-gray-400 hover:bg-gray-50',
        'text-gray-700 hover:text-gray-900',
        'focus:ring-gray-500',
        'dark:border-gray-600 dark:hover:border-gray-500',
        'dark:hover:bg-gray-800 dark:text-gray-300'
      ].join(' ')
    }

    const sizeClasses = {
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5'
    }

    const iconSizeClasses = {
      sm: 'h-3.5 w-3.5',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    }

    const renderIcon = () => {
      if (loading) {
        return <Loader2 className={cn(iconSizeClasses[size], 'animate-spin')} />
      }
      if (icon) {
        return React.cloneElement(icon as React.ReactElement, {
          className: cn(iconSizeClasses[size], (icon as React.ReactElement).props?.className)
        })
      }
      return null
    }

    const renderContent = () => {
      if (loading && !children) {
        return 'Loading...'
      }

      if (!icon && !loading) {
        return children
      }

      if (iconPosition === 'right') {
        return (
          <>
            {children}
            {renderIcon()}
          </>
        )
      }

      return (
        <>
          {renderIcon()}
          {children}
        </>
      )
    }

    return (
      <button
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {renderContent()}
      </button>
    )
  }
)

ModernButton.displayName = 'ModernButton'

export { ModernButton }