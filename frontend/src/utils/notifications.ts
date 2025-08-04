import { toast, ToastOptions, Id } from 'react-toastify';
import { CheckCircle, AlertCircle, Info, AlertTriangle, Mail, Clock } from 'lucide-react';

// Custom toast configurations for different verification scenarios
const defaultToastOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

const successToastOptions: ToastOptions = {
  ...defaultToastOptions,
  autoClose: 4000,
  className: 'toast-success',
};

const errorToastOptions: ToastOptions = {
  ...defaultToastOptions,
  autoClose: 7000,
  className: 'toast-error',
};

const warningToastOptions: ToastOptions = {
  ...defaultToastOptions,
  autoClose: 6000,
  className: 'toast-warning',
};

const infoToastOptions: ToastOptions = {
  ...defaultToastOptions,
  autoClose: 5000,
  className: 'toast-info',
};

// Verification-specific toast notifications
export const verificationToasts = {
  // Email verification success
  emailVerified: () => {
    return toast.success(
      '✅ Email vérifié avec succès ! Vous pouvez maintenant vous connecter.',
      successToastOptions
    );
  },

  // Email verification sent
  verificationSent: (email: string) => {
    return toast.success(
      `📧 Email de vérification envoyé à ${email}. Vérifiez votre boîte mail.`,
      successToastOptions
    );
  },

  // Email verification resent
  verificationResent: (attemptsRemaining?: number) => {
    const message = attemptsRemaining 
      ? `📧 Nouvel email de vérification envoyé. ${attemptsRemaining} tentative${attemptsRemaining > 1 ? 's' : ''} restante${attemptsRemaining > 1 ? 's' : ''}.`
      : '📧 Nouvel email de vérification envoyé. Vérifiez votre boîte mail.';
    
    return toast.success(message, successToastOptions);
  },

  // Registration success
  registrationSuccess: (email: string) => {
    return toast.success(
      `🎉 Inscription réussie ! Un email de vérification a été envoyé à ${email}.`,
      successToastOptions
    );
  },

  // Token expired
  tokenExpired: () => {
    return toast.error(
      '⏰ Le lien de vérification a expiré. Demandez un nouveau lien.',
      errorToastOptions
    );
  },

  // Token invalid
  tokenInvalid: () => {
    return toast.error(
      '❌ Lien de vérification invalide. Vérifiez le lien dans votre email.',
      errorToastOptions
    );
  },

  // Token already used
  tokenUsed: () => {
    return toast.warning(
      '⚠️ Ce lien de vérification a déjà été utilisé. Votre email est peut-être déjà vérifié.',
      warningToastOptions
    );
  },

  // Rate limit exceeded
  rateLimitExceeded: (resetTime?: string) => {
    const message = resetTime 
      ? `🚫 Trop de tentatives. Réessayez après ${resetTime}.`
      : '🚫 Trop de tentatives. Veuillez patienter avant de réessayer.';
    
    return toast.error(message, errorToastOptions);
  },

  // Email not verified login attempt
  emailNotVerified: () => {
    return toast.error(
      '📧 Votre email n\'est pas encore vérifié. Vérifiez votre boîte mail ou demandez un nouveau lien.',
      errorToastOptions
    );
  },

  // Network error
  networkError: () => {
    return toast.error(
      '🌐 Erreur de connexion. Vérifiez votre connexion internet et réessayez.',
      errorToastOptions
    );
  },

  // Generic verification error
  verificationError: (message?: string) => {
    return toast.error(
      message || '❌ Erreur lors de la vérification. Veuillez réessayer.',
      errorToastOptions
    );
  },

  // Loading states
  verifying: () => {
    return toast.info(
      '🔄 Vérification en cours...',
      { ...infoToastOptions, autoClose: false }
    );
  },

  sendingVerification: () => {
    return toast.info(
      '📤 Envoi de l\'email de vérification...',
      { ...infoToastOptions, autoClose: false }
    );
  },

  // Validation errors
  invalidEmail: () => {
    return toast.error(
      '📧 Veuillez entrer une adresse email valide.',
      errorToastOptions
    );
  },

  emailRequired: () => {
    return toast.error(
      '📧 L\'adresse email est requise.',
      errorToastOptions
    );
  },

  // Success with action
  verificationSuccessWithRedirect: (seconds: number) => {
    return toast.success(
      `✅ Email vérifié ! Redirection vers la connexion dans ${seconds} seconde${seconds > 1 ? 's' : ''}...`,
      { ...successToastOptions, autoClose: seconds * 1000 }
    );
  },

  // Help and guidance
  checkSpamFolder: () => {
    return toast.info(
      '📁 N\'oubliez pas de vérifier votre dossier spam/courrier indésirable.',
      infoToastOptions
    );
  },

  verificationHelp: () => {
    return toast.info(
      '💡 Besoin d\'aide ? Contactez le support à support@attendance-x.com',
      { ...infoToastOptions, autoClose: 8000 }
    );
  }
};

// Utility functions for managing toasts
export const toastUtils = {
  // Dismiss a specific toast
  dismiss: (toastId: Id) => {
    toast.dismiss(toastId);
  },

  // Dismiss all toasts
  dismissAll: () => {
    toast.dismiss();
  },

  // Update an existing toast
  update: (toastId: Id, options: ToastOptions) => {
    toast.update(toastId, options);
  },

  // Promise-based toast for async operations
  promise: <T>(
    promise: Promise<T>,
    messages: {
      pending: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages, {
      pending: infoToastOptions,
      success: successToastOptions,
      error: errorToastOptions,
    });
  },

  // Sequential toasts for multi-step processes
  sequence: async (toasts: Array<() => Promise<void>>, delay = 1000) => {
    for (const toastFn of toasts) {
      await toastFn();
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
};

// Rate limit aware toast
export const rateLimitToast = (
  message: string,
  rateLimitInfo?: {
    remainingAttempts: number;
    resetTime: string;
    waitTime?: number;
  }
) => {
  let fullMessage = message;
  
  if (rateLimitInfo) {
    if (rateLimitInfo.remainingAttempts > 0) {
      fullMessage += ` (${rateLimitInfo.remainingAttempts} tentative${rateLimitInfo.remainingAttempts > 1 ? 's' : ''} restante${rateLimitInfo.remainingAttempts > 1 ? 's' : ''})`;
    } else {
      const resetTime = new Date(rateLimitInfo.resetTime);
      const now = new Date();
      const waitMinutes = Math.ceil((resetTime.getTime() - now.getTime()) / (1000 * 60));
      
      if (waitMinutes > 0) {
        fullMessage += ` Réessayez dans ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''}.`;
      }
    }
  }
  
  return toast.error(fullMessage, errorToastOptions);
};

// Custom toast for form validation errors
export const validationToast = (errors: Record<string, string>) => {
  const errorMessages = Object.values(errors);
  if (errorMessages.length === 1) {
    return toast.error(errorMessages[0], errorToastOptions);
  } else if (errorMessages.length > 1) {
    return toast.error(
      `Veuillez corriger les erreurs suivantes :\n• ${errorMessages.join('\n• ')}`,
      { ...errorToastOptions, autoClose: 8000 }
    );
  }
};

export default verificationToasts;