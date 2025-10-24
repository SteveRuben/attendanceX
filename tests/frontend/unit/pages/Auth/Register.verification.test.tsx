// tests/frontend/unit/pages/Auth/Register.verification.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Register from '../pages/Auth/Register';
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

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Register Component - Email Verification Flow', () => {
  const mockRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      register: mockRegister,
      isAuthenticated: false,
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      resendEmailVerification: jest.fn(),
      sendEmailVerification: jest.fn(),
      verifyEmail: jest.fn(),
      changePassword: jest.fn(),
      refreshToken: jest.fn(),
      getSecurityEvents: jest.fn(),
      session: null,
    });
  });

  describe('Updated Registration Behavior', () => {
    it('should show verification message instead of auto-login after successful registration', async () => {
      const user = userEvent.setup();
      
      // Mock registration response with verification required
      const mockRegistrationResponse = {
        success: true,
        message: 'Inscription réussie. Vérifiez votre email pour activer votre compte.',
        data: {
          email: 'john.doe@example.com',
          verificationSent: true,
          expiresIn: '24 heures',
          canResend: true,
          actionRequired: true,
          nextStep: 'verify-email'
        }
      };

      mockRegister.mockResolvedValue(mockRegistrationResponse);

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill out the form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john.doe@example.com');
      await user.type(screen.getByLabelText(/organization/i), 'Test Company');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the/i));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          organization: 'Test Company',
          password: 'password123',
          acceptTerms: true,
        });
      });

      // Should NOT redirect to dashboard (no auto-login)
      expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard', { replace: true });

      // Should show verification message
      await waitFor(() => {
        expect(screen.getByText(/vérifiez votre email pour activer votre compte/i)).toBeInTheDocument();
      });
    });

    it('should display RegistrationSuccess component when verification is required', async () => {
      const user = userEvent.setup();
      
      const mockRegistrationResponse = {
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

      mockRegister.mockResolvedValue(mockRegistrationResponse);

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/organization/i), 'Test Company');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the/i));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should show RegistrationSuccess component
      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
        expect(screen.getByText('Registration Complete')).toBeInTheDocument();
        expect(screen.getByText('Registration successful! Please check your email.')).toBeInTheDocument();
      });
    });

    it('should handle email sending failure gracefully', async () => {
      const user = userEvent.setup();
      
      const mockRegistrationResponse = {
        success: true,
        message: 'Inscription réussie.',
        data: {
          email: 'test@example.com',
          verificationSent: false,
          canResend: true,
          actionRequired: true,
          nextStep: 'verify-email'
        },
        warning: 'Erreur lors de l\'envoi de l\'email de vérification. Vous pouvez demander un nouveau lien.'
      };

      mockRegister.mockResolvedValue(mockRegistrationResponse);

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/organization/i), 'Test Company');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the/i));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should show warning about email sending failure
      await waitFor(() => {
        expect(screen.getByText(/erreur lors de l'envoi de l'email de vérification/i)).toBeInTheDocument();
        expect(screen.getByText('Account created')).toBeInTheDocument(); // Different header for failed email
      });
    });

    it('should show resend verification email option when email sending fails', async () => {
      const user = userEvent.setup();
      
      const mockRegistrationResponse = {
        success: true,
        message: 'Registration successful.',
        data: {
          email: 'test@example.com',
          verificationSent: false,
          canResend: true,
          actionRequired: true,
          nextStep: 'verify-email'
        },
        warning: 'Failed to send verification email.'
      };

      mockRegister.mockResolvedValue(mockRegistrationResponse);

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/organization/i), 'Test Company');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the/i));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should show resend button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
      });
    });

    it('should not auto-login user after successful registration', async () => {
      const user = userEvent.setup();
      
      const mockRegistrationResponse = {
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

      mockRegister.mockResolvedValue(mockRegistrationResponse);

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/organization/i), 'Test Company');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the/i));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should NOT redirect to dashboard
      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard', { replace: true });
    });

    it('should show next steps for email verification', async () => {
      const user = userEvent.setup();
      
      const mockRegistrationResponse = {
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

      mockRegister.mockResolvedValue(mockRegistrationResponse);

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/organization/i), 'Test Company');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the/i));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should show next steps
      await waitFor(() => {
        expect(screen.getByText('Next steps:')).toBeInTheDocument();
        expect(screen.getByText(/check your email inbox/i)).toBeInTheDocument();
        expect(screen.getByText(/click the verification link/i)).toBeInTheDocument();
        expect(screen.getByText(/return here to sign in/i)).toBeInTheDocument();
      });
    });

    it('should provide link to continue to sign in', async () => {
      const user = userEvent.setup();
      
      const mockRegistrationResponse = {
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

      mockRegister.mockResolvedValue(mockRegistrationResponse);

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/organization/i), 'Test Company');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the/i));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should show link to sign in
      await waitFor(() => {
        const signInLink = screen.getByRole('link', { name: /continue to sign in/i });
        expect(signInLink).toHaveAttribute('href', '/login');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle registration errors that require verification', async () => {
      const user = userEvent.setup();
      
      // Mock registration error but still show verification flow
      mockRegister.mockRejectedValue(new Error('Registration completed but email verification required'));

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/organization/i), 'Test Company');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the/i));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/registration completed but email verification required/i)).toBeInTheDocument();
      });
    });

    it('should handle traditional registration errors', async () => {
      const user = userEvent.setup();
      
      mockRegister.mockRejectedValue(new Error('Email already exists'));

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/organization/i), 'Test Company');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the/i));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/an account with this email already exists/i)).toBeInTheDocument();
      });

      // Should not show verification success component
      expect(screen.queryByText('Check your email')).not.toBeInTheDocument();
    });
  });

  describe('Integration with RegistrationSuccess Component', () => {
    it('should pass correct props to RegistrationSuccess component', async () => {
      const user = userEvent.setup();
      
      const mockRegistrationResponse = {
        success: true,
        message: 'Registration successful! Please check your email.',
        data: {
          email: 'test@example.com',
          verificationSent: true,
          expiresIn: '24 hours',
          canResend: true,
          actionRequired: true,
          nextStep: 'verify-email'
        },
        warning: 'Some warning message'
      };

      mockRegister.mockResolvedValue(mockRegistrationResponse);

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/organization/i), 'Test Company');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the/i));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Verify RegistrationSuccess component receives correct data
      await waitFor(() => {
        expect(screen.getByText('Registration successful! Please check your email.')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('24 hours')).toBeInTheDocument();
        expect(screen.getByText('Some warning message')).toBeInTheDocument();
      });
    });
  });
});