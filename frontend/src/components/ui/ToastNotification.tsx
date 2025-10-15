import React from 'react';
import { toast, ToastContent } from 'react-toastify';

type ToastId = string | number;
type ToastOptions = any;
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface CustomToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

const CustomToast: React.FC<CustomToastProps> = ({
  type,
  title,
  message,
  action,
  onClose
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={cn('p-4 rounded-lg border shadow-sm', getBgColor())}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900">
            {title}
          </p>
          {message && (
            <p className="mt-1 text-sm text-gray-600">
              {message}
            </p>
          )}
          {action && (
            <div className="mt-3">
              <button
                onClick={action.onClick}
                className={cn(
                  'text-sm font-medium underline hover:no-underline focus:outline-none',
                  type === 'success' && 'text-green-700 hover:text-green-800',
                  type === 'error' && 'text-red-700 hover:text-red-800',
                  type === 'warning' && 'text-orange-700 hover:text-orange-800',
                  type === 'info' && 'text-blue-700 hover:text-blue-800'
                )}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced toast utilities for verification flows
export const customToast = {
  success: (title: string, message?: string, options?: ToastOptions): ToastId => {
    return toast.success(
      <CustomToast type="success" title={title} message={message} />,
      {
        className: 'custom-toast-success',
        ...options
      }
    );
  },

  error: (title: string, message?: string, options?: ToastOptions): ToastId => {
    return toast.error(
      <CustomToast type="error" title={title} message={message} />,
      {
        className: 'custom-toast-error',
        ...options
      }
    );
  },

  warning: (title: string, message?: string, options?: ToastOptions): ToastId => {
    return toast.warning(
      <CustomToast type="warning" title={title} message={message} />,
      {
        className: 'custom-toast-warning',
        ...options
      }
    );
  },

  info: (title: string, message?: string, options?: ToastOptions): ToastId => {
    return toast.info(
      <CustomToast type="info" title={title} message={message} />,
      {
        className: 'custom-toast-info',
        ...options
      }
    );
  },

  // Verification-specific toasts with actions
  verificationSent: (email: string, onResend?: () => void): ToastId => {
    return toast.success(
      <CustomToast
        type="success"
        title="Email de vérification envoyé"
        message={`Un lien de vérification a été envoyé à ${email}`}
        action={onResend ? {
          label: 'Renvoyer',
          onClick: onResend
        } : undefined}
      />,
      {
        autoClose: 8000,
        className: 'custom-toast-verification'
      }
    );
  },

  rateLimitExceeded: (resetTime?: string, onRetry?: () => void): ToastId => {
    const message = resetTime 
      ? `Trop de tentatives. Réessayez après ${resetTime}.`
      : 'Trop de tentatives. Veuillez patienter.';

    return toast.error(
      <CustomToast
        type="error"
        title="Limite de tentatives atteinte"
        message={message}
        action={onRetry ? {
          label: 'Réessayer plus tard',
          onClick: onRetry
        } : undefined}
      />,
      {
        autoClose: 10000,
        className: 'custom-toast-rate-limit'
      }
    );
  },

  emailVerified: (onLogin?: () => void): ToastId => {
    return toast.success(
      <CustomToast
        type="success"
        title="Email vérifié avec succès !"
        message="Vous pouvez maintenant vous connecter à votre compte."
        action={onLogin ? {
          label: 'Se connecter',
          onClick: onLogin
        } : undefined}
      />,
      {
        autoClose: 6000,
        className: 'custom-toast-verified'
      }
    );
  },

  tokenExpired: (onResend?: () => void): ToastId => {
    return toast.error(
      <CustomToast
        type="error"
        title="Lien de vérification expiré"
        message="Le lien a expiré pour des raisons de sécurité. Demandez un nouveau lien."
        action={onResend ? {
          label: 'Nouveau lien',
          onClick: onResend
        } : undefined}
      />,
      {
        autoClose: 8000,
        className: 'custom-toast-expired'
      }
    );
  }
};

export default CustomToast;