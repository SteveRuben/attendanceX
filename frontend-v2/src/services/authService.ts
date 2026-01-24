import { apiClient } from './apiClient';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
    emailVerified: boolean;
  };
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export const authService = {
  /**
   * Connexion utilisateur
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Use the correct API URL from environment
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const responseData = await response.json();

      // Debug logging
      console.log('🔍 Login response debug:', {
        status: response.status,
        ok: response.ok,
        responseData: responseData,
        hasSuccess: 'success' in responseData,
        hasData: 'data' in responseData
      });

      if (!response.ok) {
        throw new Error(responseData.error?.message || responseData.message || 'Erreur de connexion');
      }

      // The backend returns: { success: true, message: "...", data: { token, refreshToken, user, ... } }
      // Note: backend uses 'token' instead of 'accessToken'
      const loginData = responseData.data;

      if (responseData.success && loginData && loginData.token) {
        // Stocker les tokens (backend uses 'token' not 'accessToken')
        localStorage.setItem('authToken', loginData.token);
        localStorage.setItem('refreshToken', loginData.refreshToken);
        
        // Stocker les informations utilisateur
        localStorage.setItem('user', JSON.stringify(loginData.user));
        
        console.log('✅ Login successful, tokens stored');

        // Check if user has tenants - call the tenants API
        try {
          const tenantsResponse = await fetch(`${apiUrl}/tenants`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${loginData.token}`,
              'Content-Type': 'application/json',
            },
          });

          const tenantsData = await tenantsResponse.json();
          console.log('🏢 Tenants response:', tenantsData);

          let tenantId = '';
          let needsOnboarding = false;

          if (tenantsResponse.ok && tenantsData.success && tenantsData.data) {
            // Check if user has any tenants
            const tenants = Array.isArray(tenantsData.data) ? tenantsData.data : 
                           tenantsData.data.tenants ? tenantsData.data.tenants : [];
            
            if (tenants.length > 0) {
              // User has tenants, use the first active one
              const activeTenant = tenants.find((t: any) => t.isActive) || tenants[0];
              tenantId = activeTenant.id;
              localStorage.setItem('tenantId', tenantId);
              localStorage.setItem('currentTenantId', tenantId);
              console.log('✅ Tenant found:', tenantId);
            } else {
              // User has no tenants, needs onboarding
              needsOnboarding = true;
              console.log('⚠️ No tenants found, user needs onboarding');
            }
          } else {
            // Error getting tenants or no tenants
            needsOnboarding = true;
            console.log('⚠️ Error getting tenants or no tenants, user needs onboarding');
          }

          // Store onboarding status
          localStorage.setItem('needsOnboarding', needsOnboarding.toString());

        } catch (tenantError) {
          console.error('❌ Error checking tenants:', tenantError);
          // If we can't check tenants, assume onboarding is needed
          localStorage.setItem('needsOnboarding', 'true');
        }
        
        // Return the expected format for the frontend
        return {
          success: true,
          accessToken: loginData.token,  // Map 'token' to 'accessToken'
          refreshToken: loginData.refreshToken,
          user: {
            id: loginData.user.id,
            email: loginData.user.email,
            firstName: loginData.user.firstName,
            lastName: loginData.user.lastName,
            role: loginData.user.role,
            tenantId: localStorage.getItem('tenantId') || '',
            emailVerified: loginData.user.emailVerified
          },
          expiresIn: 3600 // Default to 1 hour, could calculate from expiresAt
        };
      } else {
        console.warn('⚠️ Login response missing expected fields:', {
          hasSuccess: responseData.success,
          hasData: !!loginData,
          hasToken: loginData?.token,
          responseData
        });
        throw new Error('Réponse de connexion invalide');
      }

    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  },

  /**
   * Inscription utilisateur
   */
  async register(userData: RegisterRequest): Promise<{ success: boolean; message: string }> {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erreur d\'inscription');
      }

      return data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  /**
   * Mot de passe oublié
   */
  async forgotPassword(request: ForgotPasswordRequest): Promise<{ success: boolean; message: string }> {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erreur lors de la demande de réinitialisation');
      }

      return data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  /**
   * Réinitialiser le mot de passe
   */
  async resetPassword(request: ResetPasswordRequest): Promise<{ success: boolean; message: string }> {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';
      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erreur lors de la réinitialisation');
      }

      return data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  },

  /**
   * Rafraîchir le token
   */
  async refreshToken(): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';
      const response = await fetch(`${apiUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erreur lors du rafraîchissement du token');
      }

      // Mettre à jour le token
      localStorage.setItem('authToken', data.accessToken);

      return data;
    } catch (error) {
      console.error('Refresh token error:', error);
      // Si le refresh échoue, déconnecter l'utilisateur
      this.logout();
      throw error;
    }
  },

  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    try {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        // Appeler l'API de déconnexion si un token existe
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';
        try {
          await fetch(`${apiUrl}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (apiError) {
          console.warn('Logout API call failed:', apiError);
          // Continue with local cleanup even if API call fails
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with cleanup even if there's an error
    } finally {
      // Always clean up localStorage regardless of API call success
      this.clearAuthData();
    }
  },

  /**
   * Clear all authentication data from localStorage
   */
  clearAuthData(): void {
    const keysToRemove = [
      'authToken',
      'refreshToken', 
      'tenantId',
      'currentTenantId',
      'user',
      'needsOnboarding'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  },

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('authToken');
    return !!token;
  },

  /**
   * Obtenir le token actuel
   */
  getToken(): string | null {
    return localStorage.getItem('authToken');
  },

  /**
   * Obtenir les informations utilisateur
   */
  getCurrentUser(): any | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Obtenir l'ID du tenant
   */
  getTenantId(): string | null {
    return localStorage.getItem('tenantId');
  },

  /**
   * Vérifier l'email
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';
      const response = await fetch(`${apiUrl}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erreur lors de la vérification de l\'email');
      }

      return data;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  },

  /**
   * Vérifier si l'utilisateur a besoin d'onboarding
   */
  needsOnboarding(): boolean {
    return localStorage.getItem('needsOnboarding') === 'true';
  },

  /**
   * Marquer l'onboarding comme terminé
   */
  completeOnboarding(tenantId: string): void {
    localStorage.setItem('needsOnboarding', 'false');
    localStorage.setItem('tenantId', tenantId);
    localStorage.setItem('currentTenantId', tenantId);
  },

  /**
   * Renvoyer l'email de vérification
   */
  async resendVerificationEmail(): Promise<{ success: boolean; message: string }> {
    try {
      const token = this.getToken();
      
      if (!token) {
        throw new Error('Non authentifié');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';
      const response = await fetch(`${apiUrl}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erreur lors de l\'envoi de l\'email');
      }

      return data;
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  }
};

export default authService;