import { cn } from '@/utils/cn';
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hover = false,
  padding = 'md',
  shadow = 'md',
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-soft',
    lg: 'shadow-medium',
  };
  
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-primary-100',
        paddingClasses[padding],
        shadowClasses[shadow],
        hover && 'hover:shadow-medium hover:-translate-y-1 transition-all duration-300 cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};