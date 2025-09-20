// tests/frontend/unit/hooks/use-auth.test.tsx
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../hooks/use-auth';
import { AuthProvider } from '../contexts/AuthContext';
import { userService } from '../services';

// Mock services
jest.mock('../services', () => ({
  userService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
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

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Test wrapper with providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();
  });

  describe('Initial State', () => {
    it('should return initial unauthenticated state', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should attempt to restore auth state on mount', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'participant',
        status: 'active',
      };

      localStorageMock.getItem.mockReturnValue('mock-token');
      mockUserService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should handle auth restoration failure gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');
      mockUserService.getCurrentUser.mockRejectedValue(new Error('Invalid token'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('Login', () => {
    it('should login successfully and update state', async () => {
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

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password123', false);
      });

      expect(mockUserService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'mock-jwt-token');
    });

    it('should store token in localStorage when rememberMe is true', async () => {
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

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password123', true);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'mock-jwt-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refresh_token', 'mock-refresh-token');
    });

    it('should handle login failure', async () => {
      mockUserService.login.mockRejectedValue(new Error('Invalid credentials'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login('wrong@example.com', 'wrongpassword', false);
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('Register', () => {
    it('should register successfully and update state', async () => {
      const mockUser = {
        id: '1',
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'participant',
        status: 'active',
      };

      const registrationData = {
        firstName: 'New',
        lastName: 'User',
        email: 'newuser@example.com',
        organization: 'Test Company',
        password: 'password123',
        acceptTerms: true,
      };

      mockUserService.register.mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
        },
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register(registrationData);
      });

      expect(mockUserService.register).toHaveBeenCalledWith(registrationData);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should handle registration failure', async () => {
      const registrationData = {
        firstName: 'New',
        lastName: 'User',
        email: 'existing@example.com',
        organization: 'Test Company',
        password: 'password123',
        acceptTerms: true,
      };

      mockUserService.register.mockRejectedValue(new Error('Email already exists'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.register(registrationData);
        })
      ).rejects.toThrow('Email already exists');

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('Logout', () => {
    it('should logout successfully and clear state', async () => {
      // First login
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

      mockUserService.logout.mockResolvedValue({
        success: true,
        message: 'Logged out successfully',
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Login first
      await act(async () => {
        await result.current.login('test@example.com', 'password123', true);
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      await act(async () => {
        await result.current.logout();
      });

      expect(mockUserService.logout).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should handle logout failure gracefully', async () => {
      mockUserService.logout.mockRejectedValue(new Error('Logout failed'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Should still clear local state even if server logout fails
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('Forgot Password', () => {
    it('should send forgot password request successfully', async () => {
      mockUserService.forgotPassword.mockResolvedValue({
        success: true,
        message: 'Recovery email sent',
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.forgotPassword('test@example.com');
      });

      expect(mockUserService.forgotPassword).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle forgot password failure', async () => {
      mockUserService.forgotPassword.mockRejectedValue(new Error('User not found'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.forgotPassword('nonexistent@example.com');
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('Reset Password', () => {
    it('should reset password successfully', async () => {
      mockUserService.resetPassword.mockResolvedValue({
        success: true,
        message: 'Password reset successfully',
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.resetPassword('valid-token', 'newpassword123');
      });

      expect(mockUserService.resetPassword).toHaveBeenCalledWith({
        token: 'valid-token',
        password: 'newpassword123',
      });
    });

    it('should handle reset password failure', async () => {
      mockUserService.resetPassword.mockRejectedValue(new Error('Invalid token'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.resetPassword('invalid-token', 'newpassword123');
        })
      ).rejects.toThrow('Invalid token');
    });
  });

  describe('Token Management', () => {
    it('should refresh token automatically when expired', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'participant',
        status: 'active',
      };

      // Mock initial auth state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_token') return 'expired-token';
        if (key === 'refresh_token') return 'valid-refresh-token';
        return null;
      });

      // Mock getCurrentUser to fail with expired token
      mockUserService.getCurrentUser.mockRejectedValueOnce(new Error('Token expired'));

      // Mock successful token refresh
      mockUserService.refreshToken.mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: 'new-jwt-token',
          refreshToken: 'new-refresh-token',
        },
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockUserService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should logout when token refresh fails', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_token') return 'expired-token';
        if (key === 'refresh_token') return 'expired-refresh-token';
        return null;
      });

      mockUserService.getCurrentUser.mockRejectedValue(new Error('Token expired'));
      mockUserService.refreshToken.mockRejectedValue(new Error('Refresh token expired'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      mockUserService.login.mockReturnValue(loginPromise);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Start login
      act(() => {
        result.current.login('test@example.com', 'password123', false);
      });

      // Should be loading
      expect(result.current.loading).toBe(true);

      // Resolve login
      await act(async () => {
        resolveLogin({
          success: true,
          data: {
            user: { id: '1', email: 'test@example.com' },
            token: 'token',
            refreshToken: 'refresh',
          },
        });
        await loginPromise;
      });

      // Should not be loading anymore
      expect(result.current.loading).toBe(false);
    });
  });
});