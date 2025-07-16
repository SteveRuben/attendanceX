// tests/helpers/mocks/auth-mocks.ts
import type { User, UserRole, UserStatus } from '@attendance-x/shared';

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'mock-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  displayName: 'Test User',
  role: 'participant' as UserRole,
  status: 'active' as UserStatus,
  emailVerified: true,
  mustChangePassword: false,
  twoFactorEnabled: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
  ...overrides,
});

export const createMockAuthResponse = (user: User = createMockUser()) => ({
  success: true,
  data: {
    user,
    token: 'mock-jwt-token',
    refreshToken: 'mock-refresh-token',
  },
});

export const createMockLoginRequest = () => ({
  email: 'test@example.com',
  password: 'password123',
  rememberMe: false,
});

export const createMockRegisterRequest = () => ({
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  organization: 'Test Company',
  password: 'password123',
  acceptTerms: true,
});

export const createMockResetPasswordRequest = () => ({
  token: 'valid-reset-token',
  password: 'newpassword123',
});

// Mock implementations for services
export const mockAuthService = {
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  getCurrentUser: jest.fn(),
  refreshToken: jest.fn(),
};

// Mock implementations for hooks
export const mockUseAuth = {
  isAuthenticated: false,
  user: null,
  loading: false,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
};

// Mock implementations for permissions
export const mockUsePermissions = {
  canManageUsers: false,
  canManageEvents: false,
  canViewReports: false,
  isAdmin: false,
  isSuperAdmin: false,
  isOrganizer: false,
  isModerator: false,
  isAnalyst: false,
  isParticipant: true,
};

// Helper to create authenticated mock state
export const createAuthenticatedMockState = (user: User = createMockUser()) => ({
  ...mockUseAuth,
  isAuthenticated: true,
  user,
});

// Helper to create admin mock state
export const createAdminMockState = (user: User = createMockUser({ role: 'admin' })) => ({
  ...createAuthenticatedMockState(user),
  ...mockUsePermissions,
  canManageUsers: true,
  canManageEvents: true,
  canViewReports: true,
  isAdmin: true,
});

// Helper to create super admin mock state
export const createSuperAdminMockState = (user: User = createMockUser({ role: 'super_admin' })) => ({
  ...createAdminMockState(user),
  isSuperAdmin: true,
});

// Mock error responses
export const mockAuthErrors = {
  invalidCredentials: new Error('Invalid credentials'),
  emailAlreadyExists: new Error('Email already exists'),
  userNotFound: new Error('User not found'),
  invalidToken: new Error('Invalid token'),
  tokenExpired: new Error('Token expired'),
  tooManyRequests: new Error('Too many requests'),
  networkError: new Error('Network error'),
};

// Helper to mock localStorage/sessionStorage
export const mockStorage = () => {
  const storage: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => storage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
  };
};

// Helper to mock URL search params
export const mockSearchParams = (params: Record<string, string> = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, value);
  });
  return searchParams;
};

// Helper to mock navigation
export const mockNavigation = {
  navigate: jest.fn(),
  location: {
    pathname: '/',
    search: '',
    hash: '',
    state: null,
  },
};