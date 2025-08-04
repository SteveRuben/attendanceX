import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationMessageProps {
  type?: 'error' | 'success' | 'warning' | 'info';
  message: string;
  className?: string;
  showIcon?: boolean;
}

const ValidationMessage: React.FC<ValidationMessageProps> = ({
  type = 'error',
  message,
  className,
  showIcon = true
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'info':
        return <Info className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-orange-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-red-600';
    }
  };

  if (!message) return null;

  return (
    <div className={cn('flex items-start space-x-2 mt-1', className)}>
      {showIcon && (
        <div className={cn('flex-shrink-0 mt-0.5', getColorClasses())}>
          {getIcon()}
        </div>
      )}
      <p className={cn('text-sm', getColorClasses())}>
        {message}
      </p>
    </div>
  );
};

export default ValidationMessage;