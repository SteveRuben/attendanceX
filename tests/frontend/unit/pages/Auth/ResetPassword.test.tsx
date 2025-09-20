// tests/frontend/unit/pages/Auth/ResetPassword.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ResetPassword from '../pages/Auth/ResetPassword';
import { useAuth } from '../hooks/use-auth';
import { toast } from 'react-toastify';

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

// Mock useSearchParams to return a token
const mockSearchParams = new URLSearchParams('?token=valid-reset-token');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('ResetPassword Component', () => {
  const mockResetPassword = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.set('token', 'valid-reset-token');
    mockUseAuth.mockReturnValue({
      resetPassword: mockResetPassword,
      isAuthenticated: false,
      user: null,
      loading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render reset password form with all required elements', () => {
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      expect(screen.getByText('Set new password')).toBeInTheDocument();
      expect(screen.getByText('Choose a secure password for your account')).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
    });

    it('should render password inputs with icons', () => {
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      
      expect(newPasswordInput).toHaveClass('pl-10', 'pr-10');
      expect(confirmPasswordInput).toHaveClass('pl-10', 'pr-10');
    });

    it('should render back to sign in link', () => {
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument();
    });

    it('should render security tip', () => {
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      expect(screen.getByText(/security tip/i)).toBeInTheDocument();
      expect(screen.getByText(/use a unique password/i)).toBeInTheDocument();
    });
  });

  describe('Token Validation', () => {
    it('should redirect to forgot password page when token is missing', () => {
      mockSearchParams.delete('token');
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      expect(toast.error).toHaveBeenCalledWith('Invalid or missing recovery token');
      expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /update password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
        expect(screen.getByText(/please confirm your password/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for short password', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(newPasswordInput, '123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for password mismatch', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(newPasswordInput, 'password123');
      await user.type(confirmPasswordInput, 'differentpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should clear validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      // Trigger validation error
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(newPasswordInput, 'password123');
      await waitFor(() => {
        expect(screen.queryByText(/password is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Password Strength Indicator', () => {
    it('should show password strength indicator when password is entered', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      await user.type(newPasswordInput, 'weak');

      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument();
      });
    });

    it('should update password strength as password complexity increases', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      
      // Weak password
      await user.type(newPasswordInput, 'weak');
      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument();
      });

      // Clear and type stronger password
      await user.clear(newPasswordInput);
      await user.type(newPasswordInput, 'StrongPass123!');
      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility for both password fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i) as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i) as HTMLInputElement;
      const toggleButtons = screen.getAllByRole('button', { name: '' }); // Eye buttons have no accessible name

      expect(newPasswordInput.type).toBe('password');
      expect(confirmPasswordInput.type).toBe('password');

      // Toggle first password field
      await user.click(toggleButtons[0]);
      expect(newPasswordInput.type).toBe('text');

      // Toggle second password field
      await user.click(toggleButtons[1]);
      expect(confirmPasswordInput.type).toBe('text');
    });
  });

  describe('Form Submission', () => {
    it('should call resetPassword function with correct data on valid form submission', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(newPasswordInput, 'newpassword123');
      await user.type(confirmPasswordInput, 'newpassword123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('valid-reset-token', 'newpassword123');
      });
    });

    it('should show loading state during form submission', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(newPasswordInput, 'newpassword123');
      await user.type(confirmPasswordInput, 'newpassword123');
      await user.click(submitButton);

      expect(screen.getByText(/updating password/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should handle invalid token error', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockRejectedValue(new Error('Invalid token'));
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(newPasswordInput, 'newpassword123');
      await user.type(confirmPasswordInput, 'newpassword123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/this reset link is invalid or has expired/i)).toBeInTheDocument();
      });
    });

    it('should handle expired token error', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockRejectedValue(new Error('Token expired'));
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(newPasswordInput, 'newpassword123');
      await user.type(confirmPasswordInput, 'newpassword123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/this reset link has expired/i)).toBeInTheDocument();
      });
    });

    it('should handle generic error', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockRejectedValue(new Error('Network error'));
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(newPasswordInput, 'newpassword123');
      await user.type(confirmPasswordInput, 'newpassword123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to reset password/i)).toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    it('should show success message after password is reset successfully', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(newPasswordInput, 'newpassword123');
      await user.type(confirmPasswordInput, 'newpassword123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password updated!')).toBeInTheDocument();
        expect(screen.getByText('Your password has been successfully reset')).toBeInTheDocument();
      });
    });

    it('should show redirect message in success state', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(newPasswordInput, 'newpassword123');
      await user.type(confirmPasswordInput, 'newpassword123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/you will be redirected to the sign in page/i)).toBeInTheDocument();
      });
    });

    it('should redirect to login page after successful reset', async () => {
      const user = userEvent.setup();
      jest.useFakeTimers();
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(newPasswordInput, 'newpassword123');
      await user.type(confirmPasswordInput, 'newpassword123');
      await user.click(submitButton);

      // Fast-forward time to trigger redirect
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          state: { message: 'Password reset successfully! You can now sign in with your new password.' }
        });
      });

      jest.useRealTimers();
    });
  });

  describe('Navigation', () => {
    it('should redirect to dashboard when already authenticated', () => {
      mockUseAuth.mockReturnValue({
        resetPassword: mockResetPassword,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' } as any,
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        forgotPassword: jest.fn(),
      });

      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and ARIA attributes', () => {
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      expect(newPasswordInput).toHaveAttribute('type', 'password');
      expect(newPasswordInput).toHaveAttribute('required');
      expect(newPasswordInput).toHaveAttribute('minLength', '6');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('required');
    });

    it('should have proper heading structure', () => {
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Set new password');
    });

    it('should have proper heading structure in success state', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(newPasswordInput, 'newpassword123');
      await user.type(confirmPasswordInput, 'newpassword123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Password updated!');
      });
    });
  });
});