// Contexte d'authentification multi-tenant
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { multiTenantAuthService } from '../services/multiTenantAuthService';
import { postOnboardingRedirectService } from '../services/onboarding/post-onboarding-redirect.service';
import type {
  TenantContext,
  TenantMembership,
  AuthStateChangeEvent,
  Tenant,
  AuthTokens
} from '../types/tenant.types';
import { logger } from '../utils/logger';

interface MultiTenantAuthContextType {
  // État d'authentification
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;

  // État multi-tenant
  currentTenant: Tenant | null;
  tenantContext: TenantContext | null;
  availableTenants: TenantMembership[];

  // Nouveaux états pour la transition post-onboarding
  isTransitioning: boolean;
  transitionError: string | null;

  // Actions d'authentification
  login: (email: string, password: string, tenantId?: string, rememberMe?: boolean) => Promise<any>;
  verifyEmail: (token: string) => Promise<void>;
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
  }) => Promise<{
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
  forgotPassword: (email: string) => Promise<void>;
  resendEmailVerification: (email: string) => Promise<{
    success: boolean;
    message: string;
    rateLimitInfo?: {
      remainingAttempts: number;
      resetTime: string;
      waitTime?: number;
    };
  }>;
  logout: () => Promise<void>;

  // Actions multi-tenant
  switchTenant: (tenantId: string) => Promise<void>;
  createTenant: (tenantData: any) => Promise<Tenant>;
  refreshTenants: () => Promise<void>;

  // Nouvelles méthodes pour la gestion post-onboarding
  syncAfterTenantCreation: (tenantId: string, tokens: AuthTokens) => Promise<void>;
  validateCurrentTenantAccess: () => Promise<boolean>;
  clearTransitionError: () => void;

  // Utilitaires
  hasPermission: (permission: string) => boolean;
  hasFeature: (feature: string) => boolean;
  getTenantBranding: () => any;
}

const MultiTenantAuthContext = createContext<MultiTenantAuthContextType | undefined>(undefined);

interface MultiTenantAuthProviderProps {
  children: ReactNode;
}

export const MultiTenantAuthProvider: React.FC<MultiTenantAuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [availableTenants, setAvailableTenants] = useState<TenantMembership[]>([]);

  // Nouveaux états pour la transition post-onboarding
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Initialisation au montage du composant
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        // Initialiser depuis le stockage local
        await multiTenantAuthService.initializeFromStorage();
      } catch (error) {
        console.warn('Failed to initialize auth from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Écouter les changements d'état d'authentification
    const unsubscribe = multiTenantAuthService.onAuthStateChanged(handleAuthStateChange);

    return () => {
      unsubscribe();
    };
  }, []);

  // Gestionnaire des changements d'état d'authentification
  const handleAuthStateChange = (event: AuthStateChangeEvent) => {
    setIsAuthenticated(event.isAuthenticated);
    setUser(event.user);
    setTenantContext(event.tenantContext);
    setCurrentTenant(event.tenantContext?.tenant || null);
    setAvailableTenants(multiTenantAuthService.getAvailableTenants());

    // Appliquer le branding du tenant si disponible
    if (event.tenantContext?.tenant?.branding) {
      applyTenantBranding(event.tenantContext.tenant.branding);
    }
  };

  // Appliquer le branding du tenant
  const applyTenantBranding = (branding: any) => {
    const root = document.documentElement;

    if (branding.primaryColor) {
      root.style.setProperty('--primary-color', branding.primaryColor);
    }

    if (branding.secondaryColor) {
      root.style.setProperty('--secondary-color', branding.secondaryColor);
    }

    // Mettre à jour le favicon si un logo est disponible
    if (branding.logoUrl) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = branding.logoUrl;
      }
    }
  };

  // Actions d'authentification
  const login = async (email: string, password: string, tenantId?: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      const result = await multiTenantAuthService.login(email, password, tenantId, rememberMe);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
  }) => {
    setIsLoading(true);
    try {
      const result = await multiTenantAuthService.register(data);
      return result;
    } finally {
      setIsLoading(false);
    }
  };
  const verifyEmail = async (token: string) => {
    setIsLoading(true);
    try {
      await multiTenantAuthService.verifyEmail(token);
    } finally {
      setIsLoading(false);
    }
  }
  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      await multiTenantAuthService.forgotPassword(email);
    } finally {
      setIsLoading(false);
    }
  };

  const resendEmailVerification = async (email: string) => {
    setIsLoading(true);
    try {
      const result = await multiTenantAuthService.resendEmailVerification(email);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await multiTenantAuthService.logout();

      // Réinitialiser le branding
      const root = document.documentElement;
      root.style.removeProperty('--primary-color');
      root.style.removeProperty('--secondary-color');
    } finally {
      setIsLoading(false);
    }
  };

  // Actions multi-tenant
  const switchTenant = async (tenantId: string) => {
    setIsLoading(true);
    try {
      await multiTenantAuthService.switchTenant(tenantId);
    } finally {
      setIsLoading(false);
    }
  };

  const createTenant = async (tenantData: any): Promise<Tenant> => {
    setIsLoading(true);
    try {
      const tenant = await multiTenantAuthService.createTenant(tenantData);
      await refreshTenants();
      return tenant;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTenants = async () => {
    try {
      await multiTenantAuthService.getUserTenants();
      setAvailableTenants(multiTenantAuthService.getAvailableTenants());
    } catch (error) {
      console.warn('Failed to refresh tenants:', error);
    }
  };


	  // Dev helper: grant all permissions/features in dev when enabled
	  const isDevSuperuser = (): boolean => {
	    try {
	      const env: any = (import.meta as any).env || {};
	      const notProd = env.MODE !== 'production';
	      const envFlag = env.VITE_DEV_SUPERUSER === 'true';
	      const lsFlag = typeof window !== 'undefined' && localStorage.getItem('dev:superuser') === 'true';
	      const qsFlag = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('devSuperuser') === '1';
	      return Boolean(notProd && (envFlag || lsFlag || qsFlag));
	    } catch {
	      return false;
	    }
	  };

  // Utilitaires
  const hasPermission = (permission: string): boolean => {
    if (isDevSuperuser()) return true;
    if (!tenantContext?.membership) return false;
    return tenantContext.membership.permissions.includes(permission);
  };

  const hasFeature = (feature: string): boolean => {
    if (isDevSuperuser()) return true;
    if (!tenantContext?.features) return false;
    return (tenantContext.features as any)[feature] === true;
  };

  const getTenantBranding = () => {
    return currentTenant?.branding || {
      primaryColor: '#3b82f6',
      secondaryColor: '#6b7280'
    };
  };

  // Nouvelles méthodes pour la gestion post-onboarding
  const syncAfterTenantCreation = async (tenantId: string, tokens: AuthTokens): Promise<void> => {
    setIsTransitioning(true);
    setTransitionError(null);

    try {
      logger.info('🔄 Synchronizing context after tenant creation', { tenantId });

      // Étape 1: Synchroniser les tokens avec le service de redirection
      await postOnboardingRedirectService.syncTenantContext(tenantId, tokens);

      // Étape 2: Récupérer le contexte tenant mis à jour depuis le service d'authentification
      // Attendre un court délai pour permettre la synchronisation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Forcer la mise à jour du contexte depuis le service d'authentification
      // Si le service a une méthode pour rafraîchir le contexte, l'utiliser
      // Sinon, déclencher manuellement la mise à jour via l'événement personnalisé
      window.dispatchEvent(new CustomEvent('tenantContextUpdated', {
        detail: { tenantId, tokens }
      }));

      // Étape 3: Rafraîchir la liste des tenants disponibles
      await refreshTenants();

      // Étape 4: Écouter les changements d'état pour mettre à jour le contexte local
      // Le contexte sera mis à jour via handleAuthStateChange quand le service émettra l'événement

      logger.info('✅ Context synchronized successfully after tenant creation', { tenantId });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during context synchronization';
      logger.error('❌ Failed to sync context after tenant creation', { tenantId, error: errorMessage });
      setTransitionError(errorMessage);
      throw error;
    } finally {
      setIsTransitioning(false);
    }
  };

  const validateCurrentTenantAccess = async (): Promise<boolean> => {
    try {
      if (!currentTenant?.id) {
        logger.warn('⚠️ No current tenant to validate access');
        return false;
      }

      logger.info('🔍 Validating current tenant access', { tenantId: currentTenant.id });

      const hasAccess = await postOnboardingRedirectService.validateTenantAccess(currentTenant.id);

      if (!hasAccess) {
        logger.warn('⚠️ Current tenant access validation failed', { tenantId: currentTenant.id });
        setTransitionError('Access to current tenant is no longer valid');
      } else {
        logger.info('✅ Current tenant access validated', { tenantId: currentTenant.id });
      }

      return hasAccess;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during access validation';
      logger.error('❌ Error validating current tenant access', {
        tenantId: currentTenant?.id,
        error: errorMessage
      });
      setTransitionError(errorMessage);
      return false;
    }
  };

  const clearTransitionError = (): void => {
    setTransitionError(null);
  };

  const contextValue: MultiTenantAuthContextType = {
    // État d'authentification
    isAuthenticated,
    isLoading,
    user,

    // État multi-tenant
    currentTenant,
    tenantContext,
    availableTenants,

    // Nouveaux états pour la transition post-onboarding
    isTransitioning,
    transitionError,

    // Actions d'authentification
    login,
    register,
    forgotPassword,
    verifyEmail,
    resendEmailVerification,
    logout,

    // Actions multi-tenant
    switchTenant,
    createTenant,
    refreshTenants,

    // Nouvelles méthodes pour la gestion post-onboarding
    syncAfterTenantCreation,
    validateCurrentTenantAccess,
    clearTransitionError,

    // Utilitaires
    hasPermission,
    hasFeature,
    getTenantBranding
  };

  return (
    <MultiTenantAuthContext.Provider value={contextValue}>
      {children}
    </MultiTenantAuthContext.Provider>
  );
};

// Hook pour utiliser le contexte
export const useMultiTenantAuth = (): MultiTenantAuthContextType => {
  const context = useContext(MultiTenantAuthContext);
  if (context === undefined) {
    throw new Error('useMultiTenantAuth must be used within a MultiTenantAuthProvider');
  }
  return context;
};

// Hook pour obtenir seulement les informations du tenant
export const useTenant = () => {
  const { currentTenant, tenantContext, hasFeature, hasPermission, getTenantBranding } = useMultiTenantAuth();

  return {
    tenant: currentTenant,
    context: tenantContext,
    hasFeature,
    hasPermission,
    branding: getTenantBranding()
  };
};

// Hook pour les actions d'authentification
export const useAuth = () => {
  const {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    availableTenants,
    switchTenant
  } = useMultiTenantAuth();

  return {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    availableTenants,
    switchTenant
  };
};