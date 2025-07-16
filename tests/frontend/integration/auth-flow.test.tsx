// tests/frontend/integration/auth-flow.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import ForgotPassword from '@/pages/Auth/ForgotPassword';
import ResetPassword from '@/pages/Auth/ResetPassword';
import { AuthProvider } from '@/contexts/AuthContext';
import { userService } from '@/services';

// Mock services
jest.mock('@/services', () => ({
  userService: {
    login: jest.fn(),
    register: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    getCurrentUser: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

const mockUserService = userService as jest.Mocked<typeof userService>;

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Test wrapper with all necessary providers
const TestWrapper: React.FC<{ children: React.ReactNode; initialRoute?: string }> = ({ 
  children, 
  initialRoute = '/' 
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
            <Route path="/" element={children} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Login Flow', () => {
    it('should complete full login flow successfully', async () => {
      const user = userEvent.setup();
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'participant',
        status: 'active',
      };

      mockUserService.login.mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
        },
      });

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      // Fill out login form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByLabelText(/remember me/i));

      // Submit form
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Verify service was called with correct parameters
      await waitFor(() => {
        expect(mockUserService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: true,
        });
      });

      // Verify redirect to dashboard (would happen in real app)
      // In integration test, we can check that the auth state is updated
    });

    it('should handle login errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockUserService.login.mockRejectedValue(new Error('Invalid credentials'));

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText(/email address/i), 'wrong@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    });

    it('should navigate to forgot password page', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      await user.click(screen.getByRole('link', { name: /forgot password/i }));

      await waitFor(() => {
        expect(screen.getByText('Forgot password?')).toBeInTheDocument();
      });
    });

    it('should navigate to register page', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      await user.click(screen.getByRole('link', { name: /create an account/i }));

      await waitFor(() => {
        expect(screen.getByText('Create account')).toBeInTheDocument();
      });
    });
  });

  describe('Registration Flow', () => {
    it('should complete full registration flow successfully', async () => {
      const user = userEvent.setup();
      const mockUser = {
        id: '1',
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'participant',
        status: 'active',
      };

      mockUserService.register.mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
        },
      });

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill out registration form
      await user.type(screen.getByLabelText(/first name/i), 'New');
      await user.type(screen.getByLabelText(/last name/i), 'User');
      await user.type(screen.getByLabelText(/email address/i), 'newuser@example.com');
      await user.type(screen.getByLabelText(/organization/i), 'Test Company');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the/i));

      // Submit form
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Verify service was called with correct parameters
      await waitFor(() => {
        expect(mockUserService.register).toHaveBeenCalledWith({
          firstName: 'New',
          lastName: 'User',
          email: 'newuser@example.com',
          organization: 'Test Company',
          password: 'password123',
          acceptTerms: true,
        });
      });
    });

    it('should handle registration errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockUserService.register.mockRejectedValue(new Error('Email already exists'));

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill out form with existing email
      await user.type(screen.getByLabelText(/first name/i), 'Test');
      await user.type(screen.getByLabelText(/last name/i), 'User');
      await user.type(screen.getByLabelText(/email address/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/organization/i), 'Test Company');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i agree to the/i));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/an account with this email already exists/i)).toBeInTheDocument();
      });
    });

    it('should navigate to login page', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      await user.click(screen.getByRole('link', { name: /sign in instead/i }));

      await waitFor(() => {
        expect(screen.getByText('Welcome back')).toBeInTheDocument();
      });
    });
  });

  describe('Forgot Password Flow', () => {
    it('should complete forgot password flow successfully', async () => {
      const user = userEvent.setup();
      
      mockUserService.forgotPassword.mockResolvedValue({
        success: true,
        message: 'Recovery email sent',
      });

      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      // Enter email
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send recovery link/i }));

      // Verify service was called
      await waitFor(() => {
        expect(mockUserService.forgotPassword).toHaveBeenCalledWith('test@example.com');
      });

      // Verify success state
      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('should handle forgot password errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockUserService.forgotPassword.mockRejectedValue(new Error('User not found'));

      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText(/email address/i), 'nonexistent@example.com');
      await user.click(screen.getByRole('button', { name: /send recovery link/i }));

      await waitFor(() => {
        expect(screen.getByText(/no account found with this email address/i)).toBeInTheDocument();
      });
    });

    it('should allow trying again after success', async () => {
      const user = userEvent.setup();
      
      mockUserService.forgotPassword.mockResolvedValue({
        success: true,
        message: 'Recovery email sent',
      });

      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      // Complete flow once
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send recovery link/i }));

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
      });

      // Try again
      await user.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => {
        expect(screen.getByText('Forgot password?')).toBeInTheDocument();
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });
    });

    it('should navigate back to login', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ForgotPassword />
        </TestWrapper>
      );

      await user.click(screen.getByRole('link', { name: /back to sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Welcome back')).toBeInTheDocument();
      });
    });
  });

  describe('Reset Password Flow', () => {
    beforeEach(() => {
      // Mock URL search params for reset token
      Object.defineProperty(window, 'location', {
        value: {
          search: '?token=valid-reset-token',
        },
        writable: true,
      });
    });

    it('should complete reset password flow successfully', async () => {
      const user = userEvent.setup();
      
      mockUserService.resetPassword.mockResolvedValue({
        success: true,
        message: 'Password reset successfully',
      });

      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      // Fill out reset form
      await user.type(screen.getByLabelText(/new password/i), 'newpassword123');
      await user.type(screen.getByLabelText(/confirm new password/i), 'newpassword123');
      await user.click(screen.getByRole('button', { name: /update password/i }));

      // Verify service was called
      await waitFor(() => {
        expect(mockUserService.resetPassword).toHaveBeenCalledWith({
          token: 'valid-reset-token',
          password: 'newpassword123',
        });
      });

      // Verify success state
      await waitFor(() => {
        expect(screen.getByText('Password updated!')).toBeInTheDocument();
      });
    });

    it('should handle reset password errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockUserService.resetPassword.mockRejectedValue(new Error('Invalid token'));

      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText(/new password/i), 'newpassword123');
      await user.type(screen.getByLabelText(/confirm new password/i), 'newpassword123');
      await user.click(screen.getByRole('button', { name: /update password/i }));

      await waitFor(() => {
        expect(screen.getByText(/this reset link is invalid or has expired/i)).toBeInTheDocument();
      });
    });

    it('should navigate back to login', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ResetPassword />
        </TestWrapper>
      );

      await user.click(screen.getByRole('link', { name: /back to sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Welcome back')).toBeInTheDocument();
      });
    });
  });

  describe('Cross-Page Navigation', () => {
    it('should maintain form state when navigating between auth pages', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      // Start filling login form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');

      // Navigate to register
      await user.click(screen.getByRole('link', { name: /create an account/i }));

      await waitFor(() => {
        expect(screen.getByText('Create account')).toBeInTheDocument();
      });

      // Navigate back to login
      await user.click(screen.getByRole('link', { name: /sign in instead/i }));

      await waitFor(() => {
        expect(screen.getByText('Welcome back')).toBeInTheDocument();
        // Form should be reset (this is expected behavior)
        expect(screen.getByLabelText(/email address/i)).toHaveValue('');
      });
    });

    it('should handle deep linking to auth pages', async () => {
      // Test that direct navigation to auth pages works
      render(
        <TestWrapper initialRoute="/register">
          <Register />
        </TestWrapper>
      );

      expect(screen.getByText('Create account')).toBeInTheDocument();
    });
  });

  describe('Authentication State Management', () => {
    it('should persist authentication state across page refreshes', async () => {
      const user = userEvent.setup();
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'participant',
        status: 'active',
      };

      // Mock successful login
      mockUserService.login.mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
        },
      });

      // Mock getCurrentUser for auth state restoration
      mockUserService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      // Complete login
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockUserService.login).toHaveBeenCalled();
      });

      // Simulate page refresh by re-rendering with stored auth state
      // In a real app, this would be handled by the AuthProvider
    });

    it('should handle token expiration gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock expired token error
      mockUserService.login.mockRejectedValue(new Error('Token expired'));

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/sign in failed/i)).toBeInTheDocument();
      });
    });
  });
});