// tests/frontend/unit/components/auth/RegistrationSuccess.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import RegistrationSuccess from '../components/auth/RegistrationSuccess';
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

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('RegistrationSuccess Component', () => {
  const mockResendEmailVerification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
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
      verifyEmail: jest.fn(),
      changePassword: jest.fn(),
      refreshToken: jest.fn(),
      getSecurityEvents: jest.fn(),
      session: null,
    });
  });

  describe('Successful Registration Display', () => {
    const mockSuccessData = {
      success: true,
      message: 'Registration successful! Please check your email.',
      data: {
        email: 'test@example.com',
        verificationSent: true,
        expiresIn: '24 hours',
        canResend: true,
        actionRequired: true,
        nextStep: 'verify-email'
      }
    };

    it('should display success message and email verification instructions', () => {
      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockSuccessData} />
        </TestWrapper>
      );

      expect(screen.getByText('Registration Complete')).toBeInTheDocument();
      expect(screen.getByText('Check your email')).toBeInTheDocument();
      expect(screen.getByText('Registration successful! Please check your email.')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should show next steps for email verification', () => {
      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockSuccessData} />
        </TestWrapper>
      );

      expect(screen.getByText('Next steps:')).toBeInTheDocument();
      expect(screen.getByText(/check your email inbox/i)).toBeInTheDocument();
      expect(screen.getByText(/click the verification link/i)).toBeInTheDocument();
      expect(screen.getByText(/return here to sign in/i)).toBeInTheDocument();
    });

    it('should display expiration time', () => {
      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockSuccessData} />
        </TestWrapper>
      );

      expect(screen.getByText(/expires in 24 hours/i)).toBeInTheDocument();
    });

    it('should provide link to continue to sign in', () => {
      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockSuccessData} />
        </TestWrapper>
      );

      const signInLink = screen.getByRole('link', { name: /continue to sign in/i });
      expect(signInLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Email Sending Failure Handling', () => {
    const mockFailureData = {
      success: true,
      message: 'Registration successful.',
      data: {
        email: 'test@example.com',
        verificationSent: false,
        canResend: true,
        actionRequired: true,
        nextStep: 'verify-email'
      },
      warning: 'Failed to send verification email. You can request a new link.'
    };

    it('should display different header when email sending fails', () => {
      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockFailureData} />
        </TestWrapper>
      );

      expect(screen.getByText('Account created')).toBeInTheDocument();
      expect(screen.getByText('Email sending failed')).toBeInTheDocument();
    });

    it('should show warning message about email sending failure', () => {
      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockFailureData} />
        </TestWrapper>
      );

      expect(screen.getByText('Failed to send verification email. You can request a new link.')).toBeInTheDocument();
    });

    it('should show resend button when email sending fails', () => {
      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockFailureData} />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
    });
  });

  describe('Resend Verification Email Functionality', () => {
    const mockDataWithResend = {
      success: true,
      message: 'Registration successful! Please check your email.',
      data: {
        email: 'test@example.com',
        verificationSent: true,
        expiresIn: '24 hours',
        canResend: true,
        actionRequired: true,
        nextStep: 'verify-email'
      }
    };

    it('should show resend button when canResend is true', () => {
      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockDataWithResend} />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
    });

    it('should not show resend button when canResend is false', () => {
      const dataWithoutResend = {
        ...mockDataWithResend,
        data: { ...mockDataWithResend.data, canResend: false }
      };

      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={dataWithoutResend} />
        </TestWrapper>
      );

      expect(screen.queryByRole('button', { name: /resend verification email/i })).not.toBeInTheDocument();
    });

    it('should successfully resend verification email', async () => {
      const user = userEvent.setup();
      mockResendEmailVerification.mockResolvedValue({
        success: true,
        message: 'Verification email sent successfully',
        rateLimitInfo: { remainingAttempts: 4, resetTime: '2024-01-01T12:00:00Z' }
      });

      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockDataWithResend} />
        </TestWrapper>
      );

      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);

      expect(mockResendEmailVerification).toHaveBeenCalledWith('test@example.com');

      await waitFor(() => {
        expect(screen.getByText(/verification email sent successfully/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during resend', async () => {
      const user = userEvent.setup();
      let resolveResend: (value: any) => void;
      const resendPromise = new Promise((resolve) => {
        resolveResend = resolve;
      });

      mockResendEmailVerification.mockReturnValue(resendPromise);

      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockDataWithResend} />
        </TestWrapper>
      );

      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);

      expect(screen.getByText('Sending...')).toBeInTheDocument();
      expect(resendButton).toBeDisabled();

      // Resolve the promise
      resolveResend!({ success: true });
      await waitFor(() => {
        expect(screen.queryByText('Sending...')).not.toBeInTheDocument();
      });
    });

    it('should handle rate limit errors', async () => {
      const user = userEvent.setup();
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).isRateLimit = true;
      (rateLimitError as any).rateLimitInfo = {
        remainingAttempts: 0,
        resetTime: '2024-01-01T12:30:00Z'
      };

      mockResendEmailVerification.mockRejectedValue(rateLimitError);

      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockDataWithResend} />
        </TestWrapper>
      );

      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
        expect(resendButton).toBeDisabled();
      });
    });

    it('should show rate limit information after successful resend', async () => {
      const user = userEvent.setup();
      mockResendEmailVerification.mockResolvedValue({
        success: true,
        message: 'Verification email sent successfully',
        rateLimitInfo: { remainingAttempts: 2, resetTime: '2024-01-01T12:00:00Z' }
      });

      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockDataWithResend} />
        </TestWrapper>
      );

      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText(/2 resend attempts remaining/i)).toBeInTheDocument();
      });
    });

    it('should handle generic resend errors', async () => {
      const user = userEvent.setup();
      mockResendEmailVerification.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockDataWithResend} />
        </TestWrapper>
      );

      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      await user.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    const mockData = {
      success: true,
      message: 'Registration successful! Please check your email.',
      data: {
        email: 'test@example.com',
        verificationSent: true,
        expiresIn: '24 hours',
        canResend: true,
        actionRequired: true,
        nextStep: 'verify-email'
      }
    };

    it('should have proper heading structure', () => {
      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockData} />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should have proper button attributes', () => {
      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockData} />
        </TestWrapper>
      );

      const resendButton = screen.getByRole('button', { name: /resend verification email/i });
      expect(resendButton).toHaveAttribute('type', 'button');
    });

    it('should have proper link attributes', () => {
      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={mockData} />
        </TestWrapper>
      );

      const signInLink = screen.getByRole('link', { name: /continue to sign in/i });
      expect(signInLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing registration data gracefully', () => {
      const minimalData = {
        success: true,
        message: 'Registration successful',
        data: {
          email: 'test@example.com'
        }
      };

      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={minimalData} />
        </TestWrapper>
      );

      expect(screen.getByText('Registration successful')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should handle undefined warning message', () => {
      const dataWithoutWarning = {
        success: true,
        message: 'Registration successful! Please check your email.',
        data: {
          email: 'test@example.com',
          verificationSent: true,
          expiresIn: '24 hours',
          canResend: true,
          actionRequired: true,
          nextStep: 'verify-email'
        }
      };

      render(
        <TestWrapper>
          <RegistrationSuccess registrationData={dataWithoutWarning} />
        </TestWrapper>
      );

      expect(screen.getByText('Registration Complete')).toBeInTheDocument();
      expect(screen.queryByText(/warning/i)).not.toBeInTheDocument();
    });
  });
});