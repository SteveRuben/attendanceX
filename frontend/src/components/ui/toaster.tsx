/**
 * Composant Toaster pour afficher les notifications
 */

import React, { useEffect, useState } from 'react';
import { useToast, type Toast } from '../hooks/use-toast';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export const Toaster: React.FC = () => {
  const { toasts, dismiss } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const getIcon = () => {
    switch (toast.variant) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'destructive':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStyles = () => {
    switch (toast.variant) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'destructive':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-white border-gray-200 text-gray-800';
    }
  };

  return (
    <div
      className={`
        min-w-[300px] max-w-[400px] p-4 rounded-lg border shadow-lg
        animate-in slide-in-from-right-full duration-300
        ${getStyles()}
      `}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-semibold text-sm">{toast.title}</div>
          )}
          {toast.description && (
            <div className="text-sm opacity-90 mt-1">{toast.description}</div>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};