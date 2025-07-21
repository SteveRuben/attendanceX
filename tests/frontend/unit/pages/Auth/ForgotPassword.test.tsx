// tests/frontend/unit/pages/Auth/ForgotPassword.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ForgotPassword from '@/pages/Auth/ForgotPassword';
import { useAuth } from '@/hooks/use-auth';

// Mock dependencies
jest.mock('@/hooks/use-auth');
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

describe('ForgotPassword Component', () => {
  const mockForgotPassword = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      forgotPassword: mockForgotPassword,
      isAuthenticated: false,
      user: null,
      loading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      resetPassword: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render forgot password form with all required elements', () => {
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      expect(screen.getByText('Forgot password?')).toBeInTheDocument();
      expect(screen.getByText('Enter your email to receive a recovery link')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send recovery link/i })).toBeInTheDocument();
    });

    it('should render email input with icon', () => {
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveClass('pl-10'); // Space for left icon
    });

    it('should render back to sign in link', () => {
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for empty email field', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /send recovery link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid email format', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send recovery link/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should clear validation error when user starts typing', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send recovery link/i });

      // Trigger validation error
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(emailInput, 'test@example.com');
      await waitFor(() => {
        expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call forgotPassword function with correct email on valid form submission', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send recovery link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('should show loading state during form submission', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send recovery link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      expect(screen.getByText(/sending/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should handle user not found error', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockRejectedValue(new Error('User not found'));
      
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send recovery link/i });

      await user.type(emailInput, 'nonexistent@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/no account found with this email address/i)).toBeInTheDocument();
      });
    });

    it('should handle too many requests error', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockRejectedValue(new Error('Too many requests'));
      
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send recovery link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/too many reset attempts/i)).toBeInTheDocument();
      });
    });

    it('should handle generic error', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockRejectedValue(new Error('Network error'));
      
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send recovery link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to send recovery email/i)).toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    it('should show success message after email is sent successfully', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send recovery link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
        expect(screen.getByText("We've sent a recovery link to your email")).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('should show helpful tip in success state', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send recovery link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your spam folder/i)).toBeInTheDocument();
      });
    });

    it('should provide try again option in success state', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send recovery link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/didn't receive the email/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should return to form when try again is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send recovery link/i });

      // Submit form to get to success state
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
      });

      // Click try again
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Should return to form
      expect(screen.getByText('Forgot password?')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should redirect to dashboard when already authenticated', () => {
      mockUseAuth.mockReturnValue({
        forgotPassword: mockForgotPassword,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' } as any,
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        resetPassword: jest.fn(),
      });

      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and ARIA attributes', () => {
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(emailInput).toHaveAttribute('required');
    });

    it('should have proper heading structure', () => {
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Forgot password?');
    });

    it('should have proper heading structure in success state', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send recovery link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Check your email');
      });
    });
  });
});