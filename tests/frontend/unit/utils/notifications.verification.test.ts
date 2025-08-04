// tests/frontend/unit/utils/notifications.verification.test.ts
import { toast } from 'react-toastify';
import { verificationToasts, toastUtils } from '@/utils/notifications';

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
    update: jest.fn(),
  },
}));

const mockToast = toast as jest.Mocked<typeof toast>;

describe('Verification Notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verificationToasts', () => {
    describe('tokenInvalid', () => {
      it('should show error toast for invalid token', () => {
        verificationToasts.tokenInvalid();

        expect(mockToast.error).toHaveBeenCalledWith(
          'Lien de vérification invalide. Veuillez demander un nouveau lien.',
          expect.objectContaining({
            toastId: 'verification-token-invalid',
            autoClose: false
          })
        );
      });

      it('should show custom message when provided', () => {
        const customMessage = 'Custom invalid token message';
        verificationToasts.tokenInvalid(customMessage);

        expect(mockToast.error).toHaveBeenCalledWith(
          customMessage,
          expect.objectContaining({
            toastId: 'verification-token-invalid'
          })
        );
      });
    });

    describe('verifying', () => {
      it('should show loading toast during verification', () => {
        mockToast.loading.mockReturnValue('loading-toast-id');

        const toastId = verificationToasts.verifying();

        expect(mockToast.loading).toHaveBeenCalledWith(
          'Vérification de votre email en cours...',
          expect.objectContaining({
            toastId: 'verification-in-progress'
          })
        );
        expect(toastId).toBe('loading-toast-id');
      });

      it('should show custom message when provided', () => {
        const customMessage = 'Custom verifying message';
        verificationToasts.verifying(customMessage);

        expect(mockToast.loading).toHaveBeenCalledWith(
          customMessage,
          expect.objectContaining({
            toastId: 'verification-in-progress'
          })
        );
      });
    });

    describe('emailVerified', () => {
      it('should show success toast for verified email', () => {
        verificationToasts.emailVerified();

        expect(mockToast.success).toHaveBeenCalledWith(
          'Email vérifié avec succès ! Vous pouvez maintenant vous connecter.',
          expect.objectContaining({
            toastId: 'email-verified-success',
            autoClose: 5000
          })
        );
      });

      it('should show custom message when provided', () => {
        const customMessage = 'Custom verified message';
        verificationToasts.emailVerified(customMessage);

        expect(mockToast.success).toHaveBeenCalledWith(
          customMessage,
          expect.objectContaining({
            toastId: 'email-verified-success'
          })
        );
      });
    });

    describe('tokenExpired', () => {
      it('should show error toast for expired token', () => {
        verificationToasts.tokenExpired();

        expect(mockToast.error).toHaveBeenCalledWith(
          'Ce lien de vérification a expiré. Veuillez demander un nouveau lien.',
          expect.objectContaining({
            toastId: 'verification-token-expired',
            autoClose: false
          })
        );
      });

      it('should show custom message when provided', () => {
        const customMessage = 'Custom expired message';
        verificationToasts.tokenExpired(customMessage);

        expect(mockToast.error).toHaveBeenCalledWith(
          customMessage,
          expect.objectContaining({
            toastId: 'verification-token-expired'
          })
        );
      });
    });

    describe('tokenUsed', () => {
      it('should show error toast for already used token', () => {
        verificationToasts.tokenUsed();

        expect(mockToast.error).toHaveBeenCalledWith(
          'Ce lien de vérification a déjà été utilisé.',
          expect.objectContaining({
            toastId: 'verification-token-used',
            autoClose: false
          })
        );
      });

      it('should show custom message when provided', () => {
        const customMessage = 'Custom used token message';
        verificationToasts.tokenUsed(customMessage);

        expect(mockToast.error).toHaveBeenCalledWith(
          customMessage,
          expect.objectContaining({
            toastId: 'verification-token-used'
          })
        );
      });
    });

    describe('verificationError', () => {
      it('should show error toast for verification failure', () => {
        const errorMessage = 'Network error occurred';
        verificationToasts.verificationError(errorMessage);

        expect(mockToast.error).toHaveBeenCalledWith(
          `Erreur lors de la vérification: ${errorMessage}`,
          expect.objectContaining({
            toastId: 'verification-error',
            autoClose: 8000
          })
        );
      });

      it('should show generic error when no message provided', () => {
        verificationToasts.verificationError();

        expect(mockToast.error).toHaveBeenCalledWith(
          'Une erreur est survenue lors de la vérification. Veuillez réessayer.',
          expect.objectContaining({
            toastId: 'verification-error'
          })
        );
      });
    });

    describe('sendingVerification', () => {
      it('should show loading toast when sending verification email', () => {
        mockToast.loading.mockReturnValue('sending-toast-id');

        const toastId = verificationToasts.sendingVerification();

        expect(mockToast.loading).toHaveBeenCalledWith(
          'Envoi de l\'email de vérification...',
          expect.objectContaining({
            toastId: 'sending-verification-email'
          })
        );
        expect(toastId).toBe('sending-toast-id');
      });

      it('should show custom message when provided', () => {
        const customMessage = 'Custom sending message';
        verificationToasts.sendingVerification(customMessage);

        expect(mockToast.loading).toHaveBeenCalledWith(
          customMessage,
          expect.objectContaining({
            toastId: 'sending-verification-email'
          })
        );
      });
    });

    describe('verificationResent', () => {
      it('should show success toast when verification email is resent', () => {
        const remainingAttempts = 3;
        verificationToasts.verificationResent(remainingAttempts);

        expect(mockToast.success).toHaveBeenCalledWith(
          'Email de vérification renvoyé avec succès ! Vérifiez votre boîte mail. (3 tentatives restantes)',
          expect.objectContaining({
            toastId: 'verification-resent-success',
            autoClose: 5000
          })
        );
      });

      it('should show message without remaining attempts when not provided', () => {
        verificationToasts.verificationResent();

        expect(mockToast.success).toHaveBeenCalledWith(
          'Email de vérification renvoyé avec succès ! Vérifiez votre boîte mail.',
          expect.objectContaining({
            toastId: 'verification-resent-success'
          })
        );
      });

      it('should handle zero remaining attempts', () => {
        verificationToasts.verificationResent(0);

        expect(mockToast.success).toHaveBeenCalledWith(
          'Email de vérification renvoyé avec succès ! Vérifiez votre boîte mail. (Aucune tentative restante)',
          expect.objectContaining({
            toastId: 'verification-resent-success'
          })
        );
      });
    });

    describe('rateLimitExceeded', () => {
      it('should show error toast for rate limit exceeded', () => {
        const resetTime = '2024-01-01T12:30:00Z';
        verificationToasts.rateLimitExceeded(resetTime);

        expect(mockToast.error).toHaveBeenCalledWith(
          'Trop de tentatives de vérification. Veuillez attendre avant de réessayer. (Limite réinitialisée à 12:30)',
          expect.objectContaining({
            toastId: 'verification-rate-limit',
            autoClose: false
          })
        );
      });

      it('should show message without reset time when not provided', () => {
        verificationToasts.rateLimitExceeded();

        expect(mockToast.error).toHaveBeenCalledWith(
          'Trop de tentatives de vérification. Veuillez attendre avant de réessayer.',
          expect.objectContaining({
            toastId: 'verification-rate-limit'
          })
        );
      });

      it('should handle invalid reset time gracefully', () => {
        verificationToasts.rateLimitExceeded('invalid-date');

        expect(mockToast.error).toHaveBeenCalledWith(
          'Trop de tentatives de vérification. Veuillez attendre avant de réessayer.',
          expect.objectContaining({
            toastId: 'verification-rate-limit'
          })
        );
      });
    });

    describe('invalidEmail', () => {
      it('should show error toast for invalid email', () => {
        verificationToasts.invalidEmail();

        expect(mockToast.error).toHaveBeenCalledWith(
          'Veuillez saisir une adresse email valide.',
          expect.objectContaining({
            toastId: 'invalid-email-format',
            autoClose: 4000
          })
        );
      });

      it('should show custom message when provided', () => {
        const customMessage = 'Custom invalid email message';
        verificationToasts.invalidEmail(customMessage);

        expect(mockToast.error).toHaveBeenCalledWith(
          customMessage,
          expect.objectContaining({
            toastId: 'invalid-email-format'
          })
        );
      });
    });

    describe('emailRequired', () => {
      it('should show error toast for required email', () => {
        verificationToasts.emailRequired();

        expect(mockToast.error).toHaveBeenCalledWith(
          'L\'adresse email est requise.',
          expect.objectContaining({
            toastId: 'email-required',
            autoClose: 4000
          })
        );
      });

      it('should show custom message when provided', () => {
        const customMessage = 'Custom email required message';
        verificationToasts.emailRequired(customMessage);

        expect(mockToast.error).toHaveBeenCalledWith(
          customMessage,
          expect.objectContaining({
            toastId: 'email-required'
          })
        );
      });
    });
  });

  describe('toastUtils', () => {
    describe('dismiss', () => {
      it('should dismiss toast by ID', () => {
        toastUtils.dismiss('test-toast-id');

        expect(mockToast.dismiss).toHaveBeenCalledWith('test-toast-id');
      });

      it('should dismiss all toasts when no ID provided', () => {
        toastUtils.dismiss();

        expect(mockToast.dismiss).toHaveBeenCalledWith();
      });
    });

    describe('update', () => {
      it('should update existing toast', () => {
        const updateOptions = {
          render: 'Updated message',
          type: 'success' as const,
          autoClose: 3000
        };

        toastUtils.update('test-toast-id', updateOptions);

        expect(mockToast.update).toHaveBeenCalledWith('test-toast-id', updateOptions);
      });
    });
  });

  describe('toast configuration', () => {
    it('should use consistent toast IDs for deduplication', () => {
      verificationToasts.tokenInvalid();
      verificationToasts.tokenInvalid();

      // Should use the same toast ID both times
      expect(mockToast.error).toHaveBeenCalledTimes(2);
      expect(mockToast.error).toHaveBeenNthCalledWith(1, expect.any(String), 
        expect.objectContaining({ toastId: 'verification-token-invalid' }));
      expect(mockToast.error).toHaveBeenNthCalledWith(2, expect.any(String), 
        expect.objectContaining({ toastId: 'verification-token-invalid' }));
    });

    it('should use appropriate auto-close times for different toast types', () => {
      verificationToasts.emailVerified();
      expect(mockToast.success).toHaveBeenCalledWith(expect.any(String), 
        expect.objectContaining({ autoClose: 5000 }));

      verificationToasts.tokenExpired();
      expect(mockToast.error).toHaveBeenCalledWith(expect.any(String), 
        expect.objectContaining({ autoClose: false }));

      verificationToasts.invalidEmail();
      expect(mockToast.error).toHaveBeenCalledWith(expect.any(String), 
        expect.objectContaining({ autoClose: 4000 }));
    });

    it('should set persistent toasts for critical errors', () => {
      const criticalErrors = [
        () => verificationToasts.tokenExpired(),
        () => verificationToasts.tokenUsed(),
        () => verificationToasts.rateLimitExceeded()
      ];

      criticalErrors.forEach(errorFn => {
        errorFn();
      });

      // All critical errors should have autoClose: false
      expect(mockToast.error).toHaveBeenCalledTimes(3);
      expect(mockToast.error).toHaveBeenNthCalledWith(1, expect.any(String), 
        expect.objectContaining({ autoClose: false }));
      expect(mockToast.error).toHaveBeenNthCalledWith(2, expect.any(String), 
        expect.objectContaining({ autoClose: false }));
      expect(mockToast.error).toHaveBeenNthCalledWith(3, expect.any(String), 
        expect.objectContaining({ autoClose: false }));
    });
  });

  describe('accessibility and internationalization', () => {
    it('should provide French messages by default', () => {
      verificationToasts.emailVerified();
      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining('vérifié avec succès'),
        expect.any(Object)
      );

      verificationToasts.tokenExpired();
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('lien de vérification a expiré'),
        expect.any(Object)
      );
    });

    it('should format time correctly for rate limit messages', () => {
      const resetTime = '2024-01-01T14:30:00Z';
      verificationToasts.rateLimitExceeded(resetTime);

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('14:30'),
        expect.any(Object)
      );
    });

    it('should handle pluralization correctly', () => {
      verificationToasts.verificationResent(1);
      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining('1 tentative restante'),
        expect.any(Object)
      );

      verificationToasts.verificationResent(3);
      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining('3 tentatives restantes'),
        expect.any(Object)
      );
    });
  });
});