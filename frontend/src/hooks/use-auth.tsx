// src/hooks/use-auth.ts - Hook avec types partagés
import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { 
 type  User, 
  UserRole,
  UserStatus,
  type AuthSession, 
  type SecurityEvent 
} from '@attendance-x/shared';
import { authService, type RegisterData } from '@/services/authService';
import { toast } from 'react-toastify';

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<{
    success: boolean;
    message: string;
    data: {
      email: string;
      verificationSent: boolean;
      expiresIn?: string;
      canResend: boolean;
      actionRequired: boolean;
      nextStep: string;
    };
    warning?: string;
  }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendEmailVerification: (email: string) => Promise<{
    success: boolean;
    message: string;
    rateLimitInfo?: {
      remainingAttempts: number;
      resetTime: string;
      waitTime?: number;
    };
  }>;
  refreshToken: () => Promise<string>;
  getSecurityEvents: () => Promise<SecurityEvent[]>;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  requiresEmailVerification: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentSession = await authService.getCurrentSession();
          setSession(currentSession);
          setUser(currentSession.user || null);
          setIsAuthenticated(currentSession.isAuthenticated);
          setIsEmailVerified(currentSession.user?.emailVerified || false);
          setRequiresEmailVerification(
            currentSession.isAuthenticated && 
            currentSession.user && 
            !currentSession.user.emailVerified
          );
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        await authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe = false): Promise<void> => {
    try {
      setLoading(true);
      
      const loginResponse = await authService.login(email, password, rememberMe);
      
      setUser(loginResponse.user);
      setSession({
        isAuthenticated: true,
        user: loginResponse.user,
        permissions: loginResponse.permissions,
        sessionId: loginResponse.sessionId
      });
      setIsAuthenticated(true);
      setIsEmailVerified(loginResponse.user.emailVerified);
      setRequiresEmailVerification(!loginResponse.user.emailVerified);
      
      toast.success('Welcome back!');
    } catch (error: any) {
      // Handle EMAIL_NOT_VERIFIED error specifically
      if (error.code === 'EMAIL_NOT_VERIFIED') {
        setRequiresEmailVerification(true);
        setIsEmailVerified(false);
        setIsAuthenticated(false);
      }
      toast.error(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setLoading(true);
      
      const registerResponse = await authService.register(data);
      
      // No longer auto-login, just return the verification response
      return registerResponse;
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      setIsEmailVerified(false);
      setRequiresEmailVerification(false);
      toast.success('Signed out successfully');
    } catch (error: any) {
      console.error('Logout error:', error);
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      setIsEmailVerified(false);
      setRequiresEmailVerification(false);
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      await authService.forgotPassword(email);
      toast.success('Password reset email sent');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
      throw error;
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    try {
      await authService.resetPassword(token, newPassword);
      toast.success('Password reset successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Password updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
      throw error;
    }
  };

  const sendEmailVerification = async (): Promise<void> => {
    try {
      await authService.sendEmailVerification();
      toast.success('Verification email sent');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification email');
      throw error;
    }
  };

  const verifyEmail = async (token: string): Promise<void> => {
    try {
      await authService.verifyEmail(token);
      const updatedSession = await authService.getCurrentSession();
      setSession(updatedSession);
      setUser(updatedSession.user || null);
      setIsEmailVerified(true);
      setRequiresEmailVerification(false);
      toast.success('Email verified successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify email');
      throw error;
    }
  };

  const resendEmailVerification = async (email: string): Promise<{
    success: boolean;
    message: string;
    rateLimitInfo?: {
      remainingAttempts: number;
      resetTime: string;
      waitTime?: number;
    };
  }> => {
    try {
      const response = await authService.resendEmailVerification(email);
      toast.success(response.message || 'Verification email sent successfully');
      return {
        success: true,
        message: response.message || 'Verification email sent successfully',
        rateLimitInfo: response.data?.rateLimitInfo
      };
    } catch (error: any) {
      // Handle rate limiting errors with specific feedback
      if ((error as any).isRateLimit) {
        const rateLimitInfo = (error as any).rateLimitInfo;
        let errorMessage = error.message;
        
        if (rateLimitInfo?.waitTime) {
          const waitMinutes = Math.ceil(rateLimitInfo.waitTime / 60);
          errorMessage += ` Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''} before trying again.`;
        } else if (rateLimitInfo?.resetTime) {
          const resetTime = new Date(rateLimitInfo.resetTime);
          const now = new Date();
          const waitMinutes = Math.ceil((resetTime.getTime() - now.getTime()) / (1000 * 60));
          if (waitMinutes > 0) {
            errorMessage += ` Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''} before trying again.`;
          }
        }
        
        toast.error(errorMessage);
        return {
          success: false,
          message: errorMessage,
          rateLimitInfo
        };
      }
      
      // Handle validation errors
      if (error.message.includes('valid email')) {
        toast.error('Please enter a valid email address');
      } else if (error.message.includes('required')) {
        toast.error('Email address is required');
      } else {
        toast.error(error.message || 'Failed to send verification email');
      }
      
      throw error;
    }
  };

  const refreshToken = async (): Promise<string> => {
    try {
      return await authService.refreshAccessToken();
    } catch (error: any) {
      toast.error('Session expired. Please sign in again.');
      await logout();
      throw error;
    }
  };

  const getSecurityEvents = async (): Promise<SecurityEvent[]> => {
    try {
      return await authService.getSecurityEvents();
    } catch (error: any) {
      toast.error('Failed to load security events');
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    sendEmailVerification,
    verifyEmail,
    resendEmailVerification,
    refreshToken,
    getSecurityEvents,
    isAuthenticated,
    isEmailVerified,
    requiresEmailVerification
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook permissions avec types partagés
export function usePermissions() {
  const { user, session, isAuthenticated } = useAuth();
  const permissions = session?.permissions;

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return user?.role ? roles.includes(user.role) : false;
  };

  const isAdmin = (): boolean => {
    return hasAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  };

  const isSuperAdmin = (): boolean => {
    return hasRole(UserRole.SUPER_ADMIN);
  };

  const isOrganizer = (): boolean => {
    return hasAnyRole([UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  };

  const isModerator = (): boolean => {
    return hasAnyRole([UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  };

  const isAnalyst = (): boolean => {
    return hasAnyRole([UserRole.ANALYST, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  };

  const isParticipant = (): boolean => {
    return hasRole(UserRole.PARTICIPANT);
  };

  // Permissions basées sur UserPermissions du backend
  const canCreateEvents = (): boolean => {
    return permissions?.canCreateEvents || false;
  };

  const canManageUsers = (): boolean => {
    return permissions?.canManageUsers || false;
  };

  const canViewReports = (): boolean => {
    return permissions?.canViewReports || false;
  };

  const canManageSettings = (): boolean => {
    return permissions?.canManageSettings || false;
  };

  const canSendNotifications = (): boolean => {
    return permissions?.canSendNotifications || false;
  };

  const canExportData = (): boolean => {
    return permissions?.canExportData || false;
  };

  const canManageRoles = (): boolean => {
    return permissions?.canManageRoles || false;
  };

  const canAccessAnalytics = (): boolean => {
    return permissions?.canAccessAnalytics || false;
  };

  const canModerateContent = (): boolean => {
    return permissions?.canModerateContent || false;
  };

  const canManageIntegrations = (): boolean => {
    return permissions?.canManageIntegrations || false;
  };

  // Vérifications de statut
  const isActive = (): boolean => {
    return user?.status === UserStatus.ACTIVE;
  };

  const isEmailVerified = (): boolean => {
    return user?.emailVerified || false;
  };

  const needsEmailVerification = (): boolean => {
    return isAuthenticated && !isEmailVerified();
  };

  const requiresPasswordChange = (): boolean => {
    return user?.mustChangePassword || user?.status === UserStatus.PENDING || false;
  };

  const isAccountLocked = (): boolean => {
    return user?.accountLockedUntil ? new Date(user.accountLockedUntil) > new Date() : false;
  };

  const isTwoFactorEnabled = (): boolean => {
    return user?.twoFactorEnabled || false;
  };

  return {
    // Vérifications de rôles
    hasRole,
    hasAnyRole,
    isAdmin,
    isSuperAdmin,
    isOrganizer,
    isModerator,
    isAnalyst,
    isParticipant,
    
    // Permissions fonctionnelles
    canCreateEvents,
    canManageUsers,
    canViewReports,
    canManageSettings,
    canSendNotifications,
    canExportData,
    canManageRoles,
    canAccessAnalytics,
    canModerateContent,
    canManageIntegrations,
    
    // Vérifications de statut
    isActive,
    isEmailVerified,
    needsEmailVerification,
    requiresPasswordChange,
    isAccountLocked,
    isTwoFactorEnabled,
    
    // Permissions object direct
    permissions
  };
}

// Hook pour gérer les tokens et intercepter les requêtes
export function useApiToken() {
  const { refreshToken, logout } = useAuth();

  const getAuthHeaders = (): Record<string, string> => {
    const token = authService.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const apiCall = async <T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      });

      // Gestion des erreurs 401 (token expiré)
      if (response.status === 401) {
        try {
          await refreshToken();
          // Retry avec le nouveau token
          const newHeaders = {
            ...headers,
            ...getAuthHeaders()
          };
          
          const retryResponse = await fetch(url, {
            ...options,
            headers: newHeaders,
            credentials: 'include'
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          return await retryResponse.json();
        } catch (refreshError) {
          // Token refresh failed, logout user
          await logout();
          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  };

  return {
    getAuthHeaders,
    apiCall
  };
}
