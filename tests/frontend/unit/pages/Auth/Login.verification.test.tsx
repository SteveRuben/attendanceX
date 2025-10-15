// tests/frontend/unit/pages/Auth/Login.verification.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Auth/Login';
import { useAuth } from '../hooks/use-auth';

// Mock dependencies
jest.mock('../hooks/use-auth');
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockNavigate = jest.fn();
const mockLocation = { state: null };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Login Component - Email Verification Flow', () => {
  const mockLogin = jest.fn();
  const mockResendEmailVerification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      resendEmailVerification: mockResendEmailVerification,
      isAuthenticated: false,
      user: null,
      loading: false,
      register: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      sendEmailVerification: jest.fn(),
      verifyEmail: jest.fn(),
      changePassword: jest.fn(),
      refreshToken: jest.fn(),
      getSecurityEvents: jest.fn(),
      session: null,
    });
  });

  describe('Email Verification Error Handling', () => {
    it('should handle EMAIL_NOT_VERIFIED error and show resend button', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('EMAIL_NOT_VERIFIED'));
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/votre email n'est pas encore vérifié/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /renvoyer l'email de vérification/i })).toBeInTheDocument();
        expect(screen.getByText(/vérification d'email requise/i)).toBeInTheDocument();
      });
    });

    it('should show helpful error message for unverified email', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('EMAIL_NOT_VERIFIED'));
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'unverified@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/votre email n'est pas encore vérifié/i)).toBeInTheDocument();
        expect(screen.getByText(/vérifiez votre boîte mail/i)).toBeInTheDocument();
      });
    });

    it('should display verification instructions when email is not verified', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('EMAIL_NOT_VERIFIED'));
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vérification d'email requise/i)).toBeInTheDocument();
        expect(screen.getByText(/pour des raisons de sécurité/i)).toBeInTheDocument();
      });
    });
  });

  describe('Resend Verification Email Functionality', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('EMAIL_NOT_VERIFIED'));
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /renvoyer l'email de vérification/i })).toBeInTheDocument();
      });
    });

    it('should successfully resend verification email', async () => {
      const user = userEvent.setup();
      mockResendEmailVerification.mockResolvedValue({
        success: true,
        message: 'Verification email sent successfully',
        rateLimitInfo: { remainingAttempts: 4, resetTime: '2024-01-01T12:00:00Z' }
      });

      const resendButton = screen.getByRole('button', { name: /renvoyer l'email de vérification/i });
      await user.click(resendButton);

      await waitFor(() => {
        expect(mockResendEmailVerification).toHaveBeenCalledWith('test@example.com');
        expect(screen.getByText(/un nouveau lien de vérification a été envoyé/i)).toBeInTheDocument();
      });
    });

    it('should show loading state while resending verification email', async () => {
      const user = userEvent.setup();
      let resolveResend: (value: any) => void;
      const resendPromise = new Promise((resolve) => {
        resolveResend = resolve;
      });

      mockResendEmailVerification.mockReturnValue(resendPromise);

      const resendButton = screen.getByRole('button', { name: /renvoyer l'email de vérification/i });
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.click(resendButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/envoi en cours/i)).toBeInTheDocument();

      // Resolve the promise
      resolveResend!({ success: true });
      await waitFor(() => {
        expect(screen.queryByText(/envoi en cours/i)).not.toBeInTheDocument();
      });
    });

    it('should handle rate limit error during resend', async () => {
      const user = userEvent.setup();
      const rateLimitError = new Error('rate limit exceeded');
      (rateLimitError as any).isRateLimit = true;
      (rateLimitError as any).rateLimitInfo = {
        remainingAttempts: 0,
        resetTime: '2024-01-01T12:30:00Z'
      };

      mockResendEmailVerification.mockRejectedValue(rateLimitError);

      const resendButton = screen.getByRole('button', { name: /renvoyer l'email de vérification/i });
      await user.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText(/trop de demandes de vérification/i)).toBeInTheDocument();
      });
    });

    it('should handle generic resend errors', async () => {
      const user = userEvent.setup();
      mockResendEmailVerification.mockRejectedValue(new Error('Network error'));

      const resendButton = screen.getByRole('button', { name: /renvoyer l'email de vérification/i });
      await user.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should show success message with rate limit info after successful resend', async () => {
      const user = userEvent.setup();
      mockResendEmailVerification.mockResolvedValue({
        success: true,
        message: 'Verification email sent successfully',
        rateLimitInfo: { remainingAttempts: 2, resetTime: '2024-01-01T12:00:00Z' }
      });

      const resendButton = screen.getByRole('button', { name: /renvoyer l'email de vérification/i });
      await user.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText(/un nouveau lien de vérification a été envoyé/i)).toBeInTheDocument();
      });
    });

    it('should disable resend button when rate limit is exceeded', async () => {
      const user = userEvent.setup();
      const rateLimitError = new Error('rate limit exceeded');
      (rateLimitError as any).isRateLimit = true;
      (rateLimitError as any).rateLimitInfo = {
        remainingAttempts: 0,
        resetTime: '2024-01-01T12:30:00Z'
      };

      mockResendEmailVerification.mockRejectedValue(rateLimitError);

      const resendButton = screen.getByRole('button', { name: /renvoyer l'email de vérification/i });
      await user.click(resendButton);

      await waitFor(() => {
        expect(resendButton).toBeDisabled();
        expect(screen.getByText(/trop de demandes de vérification/i)).toBeInTheDocument();
      });
    });
  });

  describe('Email Verification Error State Management', () => {
    it('should clear email verification error when user changes email', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('EMAIL_NOT_VERIFIED'));
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /renvoyer l'email de vérification/i })).toBeInTheDocument();
      });

      // Clear email and type new one
      await user.clear(emailInput);
      await user.type(emailInput, 'newemail@example.com');

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /renvoyer l'email de vérification/i })).not.toBeInTheDocument();
      });
    });

    it('should maintain verification error state when user changes password', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('EMAIL_NOT_VERIFIED'));
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /renvoyer l'email de vérification/i })).toBeInTheDocument();
      });

      // Change password but keep email the same
      await user.clear(passwordInput);
      await user.type(passwordInput, 'newpassword');

      // Verification error should still be visible
      expect(screen.getByRole('button', { name: /renvoyer l'email de vérification/i })).toBeInTheDocument();
    });

    it('should clear verification error when user submits form again', async () => {
      const user = userEvent.setup();
      mockLogin
        .mockRejectedValueOnce(new Error('EMAIL_NOT_VERIFIED'))
        .mockResolvedValueOnce(undefined);
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      // First login attempt - email not verified
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /renvoyer l'email de vérification/i })).toBeInTheDocument();
      });

      // Second login attempt - successful
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /renvoyer l'email de vérification/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Verified User Login', () => {
    it('should allow login for verified users', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(undefined);
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'verified@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('verified@example.com', 'password123', false);
      });

      // Should not show verification error
      expect(screen.queryByText(/votre email n'est pas encore vérifié/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /renvoyer l'email de vérification/i })).not.toBeInTheDocument();
    });

    it('should maintain existing login flow for verified users', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(undefined);
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const rememberMeCheckbox = screen.getByLabelText(/se souvenir de moi/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'verified@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(rememberMeCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('verified@example.com', 'password123', true);
      });
    });
  });

  describe('Error Message Display', () => {
    it('should show appropriate error message for EMAIL_NOT_VERIFIED', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('EMAIL_NOT_VERIFIED'));
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/votre email n'est pas encore vérifié/i)).toBeInTheDocument();
        expect(screen.getByText(/vérifiez votre boîte mail/i)).toBeInTheDocument();
      });
    });

    it('should distinguish between verification error and other login errors', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email ou mot de passe invalide/i)).toBeInTheDocument();
      });

      // Should not show verification error UI
      expect(screen.queryByText(/votre email n'est pas encore vérifié/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /renvoyer l'email de vérification/i })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for verification error elements', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('EMAIL_NOT_VERIFIED'));
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        const resendButton = screen.getByRole('button', { name: /renvoyer l'email de vérification/i });
        expect(resendButton).toBeInTheDocument();
        expect(resendButton).toHaveAttribute('type', 'button');
      });
    });

    it('should maintain focus management during verification error flow', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('EMAIL_NOT_VERIFIED'));
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        const resendButton = screen.getByRole('button', { name: /renvoyer l'email de vérification/i });
        expect(resendButton).toBeInTheDocument();
      });

      // Focus should be manageable
      const resendButton = screen.getByRole('button', { name: /renvoyer l'email de vérification/i });
      resendButton.focus();
      expect(document.activeElement).toBe(resendButton);
    });
  });
});