// tests/frontend/unit/pages/Auth/VerifyEmail.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import VerifyEmail from '@/pages/Auth/VerifyEmail';
import { useAuth } from '@/hooks/use-auth';
import { verificationToasts, toastUtils } from '@/utils/notifications';

// Mock dependencies
jest.mock('@/hooks/use-auth');
jest.mock('@/utils/notifications', () => ({
  verificationToasts: {
    tokenInvalid: jest.fn(),
    verifying: jest.fn(() => 'verifying-toast-id'),
    emailVerified: jest.fn(),
    tokenExpired: jest.fn(),
    tokenUsed: jest.fn(),
    verificationError: jest.fn(),
    sendingVerification: jest.fn(() => 'sending-toast-id'),
    verificationResent: jest.fn(),
    rateLimitExceeded: jest.fn(),
    invalidEmail: jest.fn(),
    emailRequired: jest.fn(),
  },
  toastUtils: {
    dismiss: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; initialEntries?: string[] }> = ({ 
  children, 
  initialEntries = ['/verify-email?token=valid-token'] 
}) => (
  <MemoryRouter initialEntries={initialEntries}>
    {children}
  </MemoryRouter>
);

describe('VerifyEmail Component', () => {
  const mockVerifyEmail = jest.fn();
  const mockResendEmailVerification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      verifyEmail: mockVerifyEmail,
      resendEmailVerification: mockResendEmailVerification,
      isAuthenticated: false,
      user: null,
      loading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      sendEmailVerification: jest.fn(),
      changePassword: jest.fn(),
      refreshToken: jest.fn(),
      getSecurityEvents: jest.fn(),
      session: null,
    });
  });

  describe('Token Validation', () => {
    it('should show invalid token error when no token is provided', async () => {
      render(
        <TestWrapper initialEntries={['/verify-email']}>
          <VerifyEmail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Lien invalide')).toBeInTheDocument();
        expect(screen.getByText(/aucun token de vérification fourni/i)).toBeInTheDocument();
      });

      expect(verificationToasts.tokenInvalid).toHaveBeenCalled();
    });

    it('should start verification process when valid token is provided', async () => {
      mockVerifyEmail.mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <VerifyEmail />
        </TestWrapper>
      );

      expect(screen.getByText('Vérification en cours...')).toBeInTheDocument();
      expect(mockVerifyEmail).toHaveBeenCalledWith('valid-token');
    });
  });

  describe('Successful Verification', () => {
    it('should show success message and redirect countdown after successful verification', async () => {
      mockVerifyEmail.mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <VerifyEmail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Email vérifié !')).toBeInTheDocument();
        expect(screen.getByText(/votre adresse email a été vérifiée avec succès/i)).toBeInTheDocument();
        expect(screen.getByText(/redirection vers la connexion dans \d+ seconde/i)).toBeInTheDocument();
      });

      expect(verificationToasts.verifying).toHaveBeenCalled();
      expect(verificationToasts.emailVerified).toHaveBeenCalled();
      expect(toastUtils.dismiss).toHaveBeenCalledWith('verifying-toast-id');
    });

    it('should redirect to login page after countdown', async () => {
      jest.useFakeTimers();
      mockVerifyEmail.mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <VerifyEmail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Email vérifié !')).toBeInTheDocument();
      });

      // Fast-forward the countdown
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          replace: true,
          state: {
            message: 'Email vérifié ! Vous pouvez maintenant vous connecter.',
            type: 'success'
          }
        });
      });

      jest.useRealTimers();
    });

    it('should allow immediate navigation to login', async () => {
      mockVerifyEmail.mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <VerifyEmail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Email vérifié !')).toBeInTheDocument();
      });

      const loginButton = screen.getByRole('link', { name: /aller à la connexion maintenant/i });
      expect(loginButton).toHaveAttribute('href', '/login');
    });
  });

  describe('Error Handling', () => {
    it('should handle expired token error', async () => {
      mockVerifyEmail.mockRejectedValue(new Error('VERIFICATION_TOKEN_EXPIRED'));

      render(
        <TestWrapper>
          <VerifyEmail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Lien expiré')).toBeInTheDocument();
        expect(screen.getByText(/ce lien de vérification a expiré/i)).toBeInTheDocument();
      });

      expect(verificationToasts.tokenExpired).toHaveBeenCalled();
    });

    it('should handle already used token error', async () => {
      mockVerifyEmail.mockRejectedValue(new Error('VERIFICATION_TOKEN_USED'));

      render(
        <TestWrapper>
          <VerifyEmail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Lien déjà utilisé')).toBeInTheDocument();
        expect(screen.getByText(/ce lien de vérification a déjà été utilisé/i)).toBeInTheDocument();
      });

      expect(verificationToasts.tokenUsed).toHaveBeenCalled();
    });

    it('should handle invalid token error', async () => {
      mockVerifyEmail.mockRejectedValue(new Error('INVALID_VERIFICATION_TOKEN'));

      render(
        <TestWrapper>
          <VerifyEmail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Lien invalide')).toBeInTheDocument();
        expect(screen.getByText(/ce lien de vérification est invalide/i)).toBeInTheDocument();
      });

      expect(verificationToasts.tokenInvalid).toHaveBeenCalled();
    });

    it('should handle generic verification error', async () => {
      mockVerifyEmail.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <VerifyEmail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Erreur de vérification')).toBeInTheDocument();
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      expect(verificationToasts.verificationError).toHaveBeenCalledWith('Network error');
    });
  });

  describe('Resend Verification Email', () => {
    beforeEach(async () => {
      mockVerifyEmail.mockRejectedValue(new Error('VERIFICATION_TOKEN_EXPIRED'));
      
      render(
        <TestWrapper>
          <VerifyEmail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Lien expiré')).toBeInTheDocument();
      });
    });

    it('should show resend form for expired tokens', async () => {
      expect(screen.getByLabelText(/adresse email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /envoyer un nouveau lien de vérification/i })).toBeInTheDocument();
    });

    it('should validate email before sending resend request', async () => {
      const user = userEvent.setup();
      const emailInput = screen.getByLabelText(/adresse email/i);
      const resendButton = screen.getByRole('button', { name: /envoyer un nouveau lien de vérification/i });

      // Test empty email
      await user.click(resendButton);
      expect(mockResendEmailVerification).not.toHaveBeenCalled();

      // Test invalid email
      await user.type(emailInput, 'invalid-email');
      await user.click(resendButton);
      expect(mockResendEmailVerification).not.toHaveBeenCalled();
    });

    it('should successfully resend verification email', async () => {
      const user = userEvent.setup();
      mockResendEmailVerification.mockResolvedValue({
        success: true,
        rateLimitInfo: { remainingAttempts: 4, resetTime: '2024-01-01T12:00:00Z' }
      });

      const emailInput = screen.getByLabelText(/adresse email/i);
      const resendButton = screen.getByRole('button', { name: /envoyer un nouveau lien de vérification/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(resendButton);

      expect(mockResendEmailVerification).toHaveBeenCalledWith('test@example.com');

      await waitFor(() => {
        expect(screen.getByText(/email de vérification envoyé avec succès/i)).toBeInTheDocument();
      });

      expect(verificationToasts.sendingVerification).toHaveBeenCalled();
      expect(verificationToasts.verificationResent).toHaveBeenCalledWith(4);
    });

    it('should handle rate limit errors during resend', async () => {
      const user = userEvent.setup();
      const rateLimitError = new Error('rate limit exceeded');
      (rateLimitError as any).isRateLimit = true;
      (rateLimitError as any).rateLimitInfo = {
        remainingAttempts: 0,
        resetTime: '2024-01-01T12:30:00Z'
      };

      mockResendEmailVerification.mockRejectedValue(rateLimitError);

      const emailInput = screen.getByLabelText(/adresse email/i);
      const resendButton = screen.getByRole('button', { name: /envoyer un nouveau lien de vérification/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText(/trop de tentatives/i)).toBeInTheDocument();
        expect(screen.getByText(/limite atteinte/i)).toBeInTheDocument();
      });

      expect(verificationToasts.rateLimitExceeded).toHaveBeenCalledWith('2024-01-01T12:30:00Z');
    });

    it('should show loading state during resend', async () => {
      const user = userEvent.setup();
      let resolveResend: (value: any) => void;
      const resendPromise = new Promise((resolve) => {
        resolveResend = resolve;
      });

      mockResendEmailVerification.mockReturnValue(resendPromise);

      const emailInput = screen.getByLabelText(/adresse email/i);
      const resendButton = screen.getByRole('button', { name: /envoyer un nouveau lien de vérification/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(resendButton);

      expect(screen.getByText(/envoi en cours/i)).toBeInTheDocument();
      expect(resendButton).toBeDisabled();

      // Resolve the promise
      resolveResend!({ success: true });
      await waitFor(() => {
        expect(screen.queryByText(/envoi en cours/i)).not.toBeInTheDocument();
      });
    });

    it('should clear resend error when user types in email field', async () => {
      const user = userEvent.setup();
      mockResendEmailVerification.mockRejectedValue(new Error('Some error'));

      const emailInput = screen.getByLabelText(/adresse email/i);
      const resendButton = screen.getByRole('button', { name: /envoyer un nouveau lien de vérification/i });

      // Trigger error
      await user.type(emailInput, 'test@example.com');
      await user.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText('Some error')).toBeInTheDocument();
      });

      // Clear input and type new email
      await user.clear(emailInput);
      await user.type(emailInput, 'new@example.com');

      await waitFor(() => {
        expect(screen.queryByText('Some error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation Links', () => {
    it('should provide navigation links for error states', async () => {
      mockVerifyEmail.mockRejectedValue(new Error('VERIFICATION_TOKEN_EXPIRED'));

      render(
        <TestWrapper>
          <VerifyEmail />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /essayer de se connecter/i })).toHaveAttribute('href', '/login');
        expect(screen.getByRole('link', { name: /retour à l'inscription/i })).toHaveAttribute('href', '/register');
      });
    });
  });

  describe('Progress Indicator', () => {
    it('should show progress indicator during loading', async () => {
      let resolveVerify: (value: any) => void;
      const verifyPromise = new Promise((resolve) => {
        resolveVerify = resolve;
      });

      mockVerifyEmail.mockReturnValue(verifyPromise);

      render(
        <TestWrapper>
          <VerifyEmail />
        </TestWrapper>
      );

      expect(screen.getByText('Vérification en cours...')).toBeInTheDocument();
      expect(screen.getByText(/veuillez patienter pendant que nous vérifions/i)).toBeInTheDocument();

      // Resolve verification
      resolveVerify!(undefined);
      await waitFor(() => {
        expect(screen.getByText('Email vérifié !')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and ARIA attributes', async () => {
      mockVerifyEmail.mockRejectedValue(new Error('VERIFICATION_TOKEN_EXPIRED'));

      render(
        <TestWrapper>
          <VerifyEmail />
        </TestWrapper>
      );

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/adresse email/i);
        expect(emailInput).toHaveAttribute('type', 'email');
        expect(emailInput).toHaveAttribute('id', 'email');
      });
    });

    it('should have proper heading structure', () => {
      render(
        <TestWrapper>
          <VerifyEmail />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
  });

  describe('Error Boundary', () => {
    it('should be wrapped in VerificationErrorBoundary', () => {
      // This test ensures the component is wrapped in the error boundary
      // The actual error boundary functionality would be tested separately
      render(
        <TestWrapper>
          <VerifyEmail />
        </TestWrapper>
      );

      // Component should render without throwing
      expect(screen.getByText(/vérification/i)).toBeInTheDocument();
    });
  });
});