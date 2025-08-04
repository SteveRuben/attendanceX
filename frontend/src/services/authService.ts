// src/services/authService.ts - Service avec types partagés
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  AuthSession,
  SecurityEvent,
  CreateUserRequest, ApiResponse
} from '@attendance-x/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api';

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  password: string;
  acceptTerms: boolean;
}

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private sessionId: string | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    this.sessionId = localStorage.getItem('sessionId');
  }

  // 🔐 Connexion
  async login(email: string, password: string, rememberMe = false): Promise<LoginResponse> {
    try {
      const loginRequest: LoginRequest = {
        email,
        password,
        rememberMe,
        deviceInfo: {
          type: 'web',
          name: navigator.userAgent,
          browser: this.getBrowserInfo(),
          os: this.getOSInfo()
        }
      };

      const response = await this.apiCall<LoginResponse>('/auth/login', {
        method: 'POST',
        body: loginRequest
      });

      if (response.success && response.data) {
        this.setTokens(response.data.accessToken, response.data.refreshToken, response.data.sessionId);
        return response.data;
      }

      throw new Error(response.error || 'Login failed');
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // 📝 Inscription
  async register(data: RegisterData): Promise<{
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
  }> {
    try {
      // Envoyer les données selon le registerSchema
      const registerRequest = {
        email: data.email,
        password: data.password,
        confirmPassword: data.password, // Ajouter confirmPassword
        firstName: data.firstName,
        lastName: data.lastName,
        organization: data.organization,
        acceptTerms: data.acceptTerms
      };

      const response = await this.apiCall('/auth/register', {
        method: 'POST',
        body: registerRequest
      });

      if (response.success) {
        // No longer auto-login, return verification response
        return response;
      }

      throw new Error(response.error || 'Registration failed');
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // ✉️ Envoyer vérification email
  async sendEmailVerification(): Promise<void> {
    try {
      const response = await this.apiCall('/auth/send-verification', {
        method: 'POST',
        requireAuth: true
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to send verification email');
      }
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // ✅ Vérifier email
  async verifyEmail(token: string): Promise<void> {
    try {
      const response = await this.apiCall('/auth/verify-email', {
        method: 'POST',
        body: { token }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to verify email');
      }
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // 🔄 Renvoyer email de vérification
  async resendEmailVerification(email: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      email: string;
      rateLimitInfo?: {
        remainingAttempts: number;
        resetTime: string;
        waitTime?: number;
      };
    };
  }> {
    try {
      // Validate email format before sending request
      if (!email || !email.trim()) {
        throw new Error('Email address is required');
      }
      
      if (!/\S+@\S+\.\S+/.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      const response = await this.apiCall('/auth/send-email-verification', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() }
      });

      if (!response.success) {
        // Handle specific rate limiting errors
        if (response.error?.includes('rate limit') || response.error?.includes('too many')) {
          const rateLimitError = new Error(response.error);
          (rateLimitError as any).isRateLimit = true;
          (rateLimitError as any).rateLimitInfo = response.data?.rateLimitInfo;
          throw rateLimitError;
        }
        
        throw new Error(response.error || 'Failed to resend verification email');
      }

      return {
        success: true,
        message: response.message || 'Verification email sent successfully',
        data: response.data
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // 🔑 Mot de passe oublié
  async forgotPassword(email: string): Promise<void> {
    try {
      const request: ForgotPasswordRequest = { email };

      const response = await this.apiCall('/auth/forgot-password', {
        method: 'POST',
        body: request
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to send reset email');
      }
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // 🔄 Réinitialiser mot de passe
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const request: ResetPasswordRequest = {
        token,
        newPassword,
        confirmPassword: newPassword
      };

      const response = await this.apiCall('/auth/reset-password', {
        method: 'POST',
        body: request
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to reset password');
      }
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // 🔐 Changer mot de passe
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const request: ChangePasswordRequest = {
        currentPassword,
        newPassword,
        confirmPassword: newPassword
      };

      const response = await this.apiCall('/auth/change-password', {
        method: 'POST',
        body: request,
        requireAuth: true
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to change password');
      }
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // 🚪 Déconnexion
  async logout(): Promise<void> {
    try {
      if (this.refreshToken) {
        await this.apiCall('/auth/logout', {
          method: 'POST',
          requireAuth: true
        });
      }
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  // 🔄 Rafraîchir le token
  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const request: RefreshTokenRequest = { refreshToken: this.refreshToken };

      const response = await this.apiCall<{ accessToken: string; expiresIn: number }>('/auth/refresh-token', {
        method: 'POST',
        body: request
      });

      if (response.success && response.data) {
        this.setTokens(response.data.accessToken, this.refreshToken, this.sessionId);
        return response.data.accessToken;
      }

      throw new Error(response.error || 'Failed to refresh token');
    } catch (error: any) {
      this.clearTokens();
      throw this.handleError(error);
    }
  }

  // 👤 Obtenir session actuelle
  async getCurrentSession(): Promise<AuthSession> {
    try {
      const response = await this.apiCall<AuthSession>('/auth/session', {
        method: 'GET',
        requireAuth: true
      });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || 'Failed to get current session');
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // 📊 Obtenir événements de sécurité
  async getSecurityEvents(): Promise<SecurityEvent[]> {
    try {
      const response = await this.apiCall<SecurityEvent[]>('/auth/security-events', {
        method: 'GET',
        requireAuth: true
      });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || 'Failed to get security events');
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // 🔍 Vérifier si connecté
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // 🎫 Obtenir token
  getAccessToken(): string | null {
    return this.accessToken;
  }

  // 🔧 Utilitaires privés
  private setTokens(accessToken: string, refreshToken: string, sessionId?: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.sessionId = sessionId || null;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    if (sessionId) localStorage.setItem('sessionId', sessionId);
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.sessionId = null;

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('sessionId');
  }

  private getBrowserInfo(): string {
    const agent = navigator.userAgent;
    if (agent.includes('Chrome')) return 'Chrome';
    if (agent.includes('Firefox')) return 'Firefox';
    if (agent.includes('Safari')) return 'Safari';
    if (agent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getOSInfo(): string {
    const platform = navigator.platform;
    if (platform.includes('Win')) return 'Windows';
    if (platform.includes('Mac')) return 'macOS';
    if (platform.includes('Linux')) return 'Linux';
    return 'Unknown';
  }

  // 🌐 Appel API générique
  private async apiCall<T = any>(
    endpoint: string,
    options: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
      requireAuth?: boolean;
      headers?: Record<string, string>;
    }
  ): Promise<ApiResponse<T>> {
    const { method, body, requireAuth = false, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };

    if (requireAuth && this.accessToken) {
      requestHeaders.Authorization = `Bearer ${this.accessToken}`;
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
      credentials: 'include'
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (response.status === 401 && requireAuth && this.refreshToken) {
        try {
          await this.refreshAccessToken();
          requestHeaders.Authorization = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...config,
            headers: requestHeaders
          });
          return await retryResponse.json();
        } catch (refreshError) {
          this.clearTokens();
          throw new Error('Session expired. Please login again.');
        }
      }

      return data;
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  }

  private handleError(error: any): Error {
    if (error.message) {
      // Preserve rate limit information
      if ((error as any).isRateLimit) {
        const rateLimitError = new Error(error.message);
        (rateLimitError as any).isRateLimit = true;
        (rateLimitError as any).rateLimitInfo = (error as any).rateLimitInfo;
        return rateLimitError;
      }
      return error;
    }
    if (error.errors) {
      const firstError = Object.values(error.errors)[0] as string[];
      return new Error(firstError[0] || 'Validation error');
    }
    return new Error('An unexpected error occurred');
  }
}

export const authService = new AuthService();