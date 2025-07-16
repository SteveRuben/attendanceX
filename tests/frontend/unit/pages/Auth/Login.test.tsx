// tests/frontend/unit/pages/Auth/Login.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import Login from '@/pages/Auth/Login';
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

describe('Login Component', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      user: null,
      loading: false,
      register: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render login form with all required fields', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your AttendanceX account')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render icons in input fields', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      // Check for Mail and Lock icons (they should be present in the DOM)
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(emailInput).toHaveClass('pl-10'); // Space for left icon
      expect(passwordInput).toHaveClass('pl-10', 'pr-10'); // Space for left and right icons
    });

    it('should render remember me checkbox and forgot password link', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
    });

    it('should render create account link', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByRole('link', { name: /create an account/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid email format', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for short password', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(passwordInput, '123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('should clear validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

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

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility when eye button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
      const toggleButton = screen.getByRole('button', { name: '' }); // Eye button has no accessible name

      expect(passwordInput.type).toBe('password');

      await user.click(toggleButton);
      expect(passwordInput.type).toBe('text');

      await user.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    });
  });

  describe('Form Submission', () => {
    it('should call login function with correct credentials on valid form submission', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const rememberMeCheckbox = screen.getByLabelText(/remember me/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(rememberMeCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123', true);
      });
    });

    it('should show loading state during form submission', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should handle login errors correctly', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    });

    it('should handle account locked error', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Account locked'));
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/your account has been temporarily locked/i)).toBeInTheDocument();
      });
    });

    it('should handle email not verified error', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Email not verified'));
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please verify your email address/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should redirect to dashboard when already authenticated', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' } as any,
        loading: false,
        register: jest.fn(),
        logout: jest.fn(),
        forgotPassword: jest.fn(),
        resetPassword: jest.fn(),
      });

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });

    it('should redirect to intended page after successful login', async () => {
      const user = userEvent.setup();
      mockLocation.state = { from: { pathname: '/protected-page' } };
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/protected-page', { replace: true });
      });
    });
  });

  describe('Redirect Message', () => {
    it('should display redirect message when present in location state', () => {
      mockLocation.state = { message: 'Please sign in to continue' };
      
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByText('Please sign in to continue')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and ARIA attributes', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const rememberMeCheckbox = screen.getByLabelText(/remember me/i);

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
      expect(rememberMeCheckbox).toHaveAttribute('type', 'checkbox');
    });

    it('should have proper heading structure', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome back');
    });
  });
});