// Contexte d'authentification multi-tenant
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { multiTenantAuthService } from '../services/multiTenantAuthService';
import type {
  TenantContext,
  TenantMembership,
  AuthStateChangeEvent,
  Tenant
} from '../types/tenant.types';

interface MultiTenantAuthContextType {
  // État d'authentification
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  
  // État multi-tenant
  currentTenant: Tenant | null;
  tenantContext: TenantContext | null;
  availableTenants: TenantMembership[];
  
  // Actions d'authentification
  login: (email: string, password: string, tenantId?: string, rememberMe?: boolean) => Promise<any>;
  logout: () => Promise<void>;
  
  // Actions multi-tenant
  switchTenant: (tenantId: string) => Promise<void>;
  createTenant: (tenantData: any) => Promise<Tenant>;
  refreshTenants: () => Promise<void>;
  
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

  // Utilitaires
  const hasPermission = (permission: string): boolean => {
    if (!tenantContext?.membership) return false;
    return tenantContext.membership.permissions.includes(permission);
  };

  const hasFeature = (feature: string): boolean => {
    if (!tenantContext?.features) return false;
    return (tenantContext.features as any)[feature] === true;
  };

  const getTenantBranding = () => {
    return currentTenant?.branding || {
      primaryColor: '#3b82f6',
      secondaryColor: '#6b7280'
    };
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
    
    // Actions d'authentification
    login,
    logout,
    
    // Actions multi-tenant
    switchTenant,
    createTenant,
    refreshTenants,
    
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