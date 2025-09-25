// Service d'authentification multi-tenant
import type {
  MultiTenantLoginRequest,
  MultiTenantLoginResponse,
  TenantSwitchRequest,
  TenantSwitchResponse,
  TenantContext,
  TenantMembership,
  AuthStateChangeEvent,
  Tenant
} from '../types/tenant.types';
import type { ApiResponse } from '../shared';

const API_BASE_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:5001/api/v1';

class MultiTenantAuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private currentUser: any = null;
  private currentTenantContext: TenantContext | null = null;
  private availableTenants: TenantMembership[] = [];
  private authStateListeners: ((event: AuthStateChangeEvent) => void)[] = [];

  constructor() {
    this.loadStoredAuth();
  }

  // 📝 Inscription
  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
  }): Promise<{
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
      const response = await this.apiCall<{
        email: string;
        verificationSent: boolean;
        expiresIn?: string;
        canResend: boolean;
        actionRequired: boolean;
        nextStep: string;
      }>('/auth/register', {
        method: 'POST',
        body: data
      });

      if (response.success && response.data) {
        return {
          success: true,
          message: response.message || 'Registration successful',
          data: response.data,
          warning: response.warning
        };
      }

      throw new Error(response.error || 'Registration failed');
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // 🔐 Connexion multi-tenant
  async login(email: string, password: string, tenantId?: string, rememberMe = false): Promise<MultiTenantLoginResponse> {
    try {
      const loginRequest: MultiTenantLoginRequest = {
        email,
        password,
        tenantId,
        rememberMe,
        deviceInfo: {
          type: 'web',
          name: navigator.userAgent,
          browser: this.getBrowserInfo(),
          os: this.getOSInfo()
        }
      };

      const response = await this.apiCall<MultiTenantLoginResponse['data']>('/auth/login', {
        method: 'POST',
        body: loginRequest
      });

      if (response.success && response.data) {
        // Stocker les tokens
        this.setTokens(response.data.token, response.data.refreshToken, rememberMe);
        
        // Stocker les données utilisateur
        this.currentUser = response.data.user;
        this.availableTenants = response.data.availableTenants || [];

        // Si un contexte tenant est fourni, l'utiliser
        if (response.data.tenantContext) {
          this.currentTenantContext = response.data.tenantContext;
          this.storeCurrentTenant(response.data.tenantContext.tenant.id);
        }

        // Notifier les listeners
        this.notifyAuthStateChange();

        return {
          success: true,
          data: response.data
        };
      }

      throw new Error(response.error || 'Login failed');
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // 🔄 Changer de tenant
  async switchTenant(tenantId: string): Promise<TenantContext> {
    try {
      const switchRequest: TenantSwitchRequest = { tenantId };

      const response = await this.apiCall<TenantSwitchResponse['data']>('/tenants/switch-context', {
        method: 'POST',
        body: switchRequest,
        requireAuth: true
      });

      if (response.success && response.data) {
        // Mettre à jour le token avec le nouveau contexte
        this.accessToken = response.data.token;
        this.currentTenantContext = response.data.tenantContext;
        
        // Stocker le nouveau token et tenant
        this.storeTokens();
        this.storeCurrentTenant(tenantId);

        // Notifier les listeners
        this.notifyAuthStateChange();

        return response.data.tenantContext;
      }

      throw new Error(response.error || 'Failed to switch tenant');
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // 👥 Obtenir les tenants disponibles pour l'utilisateur
  async getUserTenants(): Promise<TenantMembership[]> {
    try {
      const response = await this.apiCall<TenantMembership[]>('/auth/tenants', {
        method: 'GET',
        requireAuth: true
      });

      if (response.success && response.data) {
        this.availableTenants = response.data;
        return response.data;
      }

      throw new Error(response.error || 'Failed to get user tenants');
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // 🏢 Créer un nouveau tenant (onboarding)
  async createTenant(tenantData: {
    name: string;
    slug: string;
    planId: string;
    settings?: any;
    size?: any;
    industry:any;
  }): Promise<Tenant> {
    try {
      tenantData = {...tenantData, size:"15", industry:'education'};
      console.log(tenantData);
      const response = await this.apiCall<Tenant>('/tenants/register', {
        method: 'POST',
        body: tenantData,
        requireAuth: true
      });

      if (response.success && response.data) {
        // Rafraîchir la liste des tenants
        await this.getUserTenants();
        
        return response.data;
      }

      throw new Error(response.error || 'Failed to create tenant');
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // 🔑 Mot de passe oublié
  async forgotPassword(email: string): Promise<void> {
    try {
      const response = await this.apiCall('/auth/forgot-password', {
        method: 'POST',
        body: { email }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to send recovery email');
      }
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async verifyEmail(token:string) : Promise<void>{
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
  // 📧 Renvoyer la vérification d'email
  async resendEmailVerification(email: string): Promise<{
    success: boolean;
    message: string;
    rateLimitInfo?: {
      remainingAttempts: number;
      resetTime: string;
      waitTime?: number;
    };
  }> {
    try {
      const response = await this.apiCall<{
        rateLimitInfo?: {
          remainingAttempts: number;
          resetTime: string;
          waitTime?: number;
        };
      }>('/auth/send-email-verification', {
        method: 'POST',
        body: { email }
      });

      if (response.success) {
        return {
          success: true,
          message: response.message || 'Verification email sent successfully',
          rateLimitInfo: response.data?.rateLimitInfo
        };
      }

      throw new Error(response.error || 'Failed to send verification email');
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
      this.clearAuth();
      this.notifyAuthStateChange();
    }
  }

  // 🔄 Rafraîchir le token
  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.apiCall<{ token: string; expiresIn: number }>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: this.refreshToken }
      });

      if (response.success && response.data) {
        this.accessToken = response.data.token;
        this.storeTokens();
        return response.data.token;
      }

      throw new Error(response.error || 'Failed to refresh token');
    } catch (error: any) {
      this.clearAuth();
      throw this.handleError(error);
    }
  }

  // 📊 Obtenir l'état actuel
  getCurrentState(): AuthStateChangeEvent {
    return {
      user: this.currentUser,
      tenantContext: this.currentTenantContext,
      isAuthenticated: this.isAuthenticated()
    };
  }

  // 🔍 Vérifier si connecté
  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.currentUser;
  }

  // 🏢 Obtenir le tenant actuel
  getCurrentTenant(): Tenant | null {
    return this.currentTenantContext?.tenant || null;
  }

  // 👤 Obtenir l'utilisateur actuel
  getCurrentUser(): any {
    return this.currentUser;
  }

  // 🎫 Obtenir le token d'accès
  getAccessToken(): string | null {
    return this.accessToken;
  }

  // 👥 Obtenir les tenants disponibles
  getAvailableTenants(): TenantMembership[] {
    return this.availableTenants;
  }

  // 🔐 Obtenir le contexte tenant actuel
  getTenantContext(): TenantContext | null {
    return this.currentTenantContext;
  }

  // 👂 Écouter les changements d'état
  onAuthStateChanged(callback: (event: AuthStateChangeEvent) => void): () => void {
    this.authStateListeners.push(callback);

    // Appeler immédiatement avec l'état actuel
    callback(this.getCurrentState());

    // Retourner une fonction de désabonnement
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // 🔄 Initialiser la session depuis le stockage
  async initializeFromStorage(): Promise<void> {
    if (!this.isAuthenticated()) {
      return;
    }

    try {
      // Vérifier la validité du token
      const response = await this.apiCall('/auth/session', {
        method: 'GET',
        requireAuth: true
      });

      if (response.success) {
        // Récupérer les données utilisateur et tenant
        await this.loadUserData();
        this.notifyAuthStateChange();
      } else {
        this.clearAuth();
      }
    } catch (error) {
      console.warn('Failed to initialize from storage:', error);
      this.clearAuth();
    }
  }

  // 📥 Charger les données utilisateur
  private async loadUserData(): Promise<void> {
    try {
      // Charger le profil utilisateur
      const userResponse = await this.apiCall('/users/me', {
        method: 'GET',
        requireAuth: true
      });

      if (userResponse.success) {
        this.currentUser = userResponse.data;
      }

      // Charger les tenants disponibles
      await this.getUserTenants();

      // Charger le contexte tenant actuel si un tenant est stocké
      const storedTenantId = localStorage.getItem('currentTenantId') || sessionStorage.getItem('currentTenantId');
      if (storedTenantId && !this.currentTenantContext) {
        try {
          await this.switchTenant(storedTenantId);
        } catch (error) {
          console.warn('Failed to load stored tenant context:', error);
        }
      }
    } catch (error) {
      console.warn('Failed to load user data:', error);
    }
  }

  // 🔔 Notifier les listeners des changements d'état
  private notifyAuthStateChange(): void {
    const event = this.getCurrentState();
    this.authStateListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  // 💾 Gérer le stockage des tokens
  private setTokens(accessToken: string, refreshToken: string, rememberMe: boolean): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;

    // Nettoyer l'autre stockage
    otherStorage.removeItem('accessToken');
    otherStorage.removeItem('refreshToken');
    otherStorage.removeItem('rememberMe');

    // Stocker dans le bon endroit
    storage.setItem('accessToken', accessToken);
    storage.setItem('refreshToken', refreshToken);
    storage.setItem('rememberMe', rememberMe.toString());
  }

  private storeTokens(): void {
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    const storage = rememberMe ? localStorage : sessionStorage;
    
    if (this.accessToken) storage.setItem('accessToken', this.accessToken);
    if (this.refreshToken) storage.setItem('refreshToken', this.refreshToken);
  }

  private storeCurrentTenant(tenantId: string): void {
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('currentTenantId', tenantId);
  }

  private loadStoredAuth(): void {
    // Vérifier localStorage d'abord (remember me)
    this.accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
  }

  private clearAuth(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.currentUser = null;
    this.currentTenantContext = null;
    this.availableTenants = [];

    // Nettoyer les deux stockages
    ['localStorage', 'sessionStorage'].forEach(storageType => {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
      storage.removeItem('accessToken');
      storage.removeItem('refreshToken');
      storage.removeItem('rememberMe');
      storage.removeItem('currentTenantId');
    });
  }

  // 🛠️ Utilitaires
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

  // 🌐 Appel API avec gestion multi-tenant
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

    // Ajouter le contexte tenant si disponible
    if (this.currentTenantContext && requireAuth) {
      requestHeaders['X-Tenant-ID'] = this.currentTenantContext.tenant.id;
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();

      // Gestion du token expiré avec refresh automatique
      if (response.status === 401 && requireAuth && this.refreshToken) {
        try {
          const newAccessToken = await this.refreshAccessToken();
          requestHeaders.Authorization = `Bearer ${newAccessToken}`;
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...config,
            headers: requestHeaders
          });
          return await retryResponse.json();
        } catch (refreshError) {
          this.clearAuth();
          this.notifyAuthStateChange();
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
      return error;
    }
    if (error.errors) {
      const firstError = Object.values(error.errors)[0] as string[];
      return new Error(firstError[0] || 'Validation error');
    }
    return new Error('An unexpected error occurred');
  }
}

export const multiTenantAuthService = new MultiTenantAuthService();