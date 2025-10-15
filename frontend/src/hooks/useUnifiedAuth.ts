/**
 * Hook d'authentification unifié
 * Remplace progressivement useAuth et centralise l'authentification multi-tenant
 */

import { useMultiTenantAuth, useTenant } from '../contexts/MultiTenantAuthContext';

/**
 * Hook unifié pour l'authentification
 * Compatible avec l'ancien useAuth mais utilise le système multi-tenant
 */
export const useUnifiedAuth = () => {
  const multiTenantAuth = useMultiTenantAuth();
  const tenant = useTenant();

  // Interface compatible avec l'ancien useAuth
  return {
    // Données utilisateur
    user: multiTenantAuth.user,
    isAuthenticated: multiTenantAuth.isAuthenticated,
    isLoading: multiTenantAuth.isLoading,

    // Actions d'authentification
    login: multiTenantAuth.login,
    logout: multiTenantAuth.logout,
    register: multiTenantAuth.register,
    forgotPassword: multiTenantAuth.forgotPassword,
    resendEmailVerification: multiTenantAuth.resendEmailVerification,

    // Contexte multi-tenant
    currentTenant: tenant.tenant,
    tenantContext: tenant.context,
    availableTenants: multiTenantAuth.availableTenants,
    switchTenant: multiTenantAuth.switchTenant,
    createTenant: multiTenantAuth.createTenant,

    // Utilitaires tenant
    hasPermission: tenant.hasPermission,
    hasFeature: tenant.hasFeature,
    branding: tenant.branding,

    // Méthodes de compatibilité (mappées vers les nouvelles)
    session: {
      isAuthenticated: multiTenantAuth.isAuthenticated,
      user: multiTenantAuth.user,
      permissions: tenant.context?.membership?.permissions || {},
    },
    
    // États dérivés pour compatibilité
    loading: multiTenantAuth.isLoading,
    needsOrganization: !tenant.tenant && multiTenantAuth.isAuthenticated,
    organizationSetupRequired: !tenant.tenant && multiTenantAuth.isAuthenticated,
    organizationInvitations: [], // TODO: Implémenter les invitations
    
    // Vérifications d'email (pour compatibilité)
    isEmailVerified: multiTenantAuth.user?.isEmailVerified || false,
    requiresEmailVerification: multiTenantAuth.isAuthenticated && !multiTenantAuth.user?.isEmailVerified,
  };
};

/**
 * Hook de permissions unifié
 * Compatible avec l'ancien usePermissions mais utilise le système multi-tenant
 */
export const useUnifiedPermissions = () => {
  const { hasPermission, hasFeature } = useTenant();
  const { user } = useMultiTenantAuth();

  return {
    // Permissions basées sur le tenant
    hasPermission,
    hasFeature,

    // Vérifications de rôles (mappées vers les permissions tenant)
    hasRole: (role: string) => hasPermission(`role:${role}`),
    hasAnyRole: (roles: string[]) => roles.some(role => hasPermission(`role:${role}`)),
    
    // Rôles spécifiques (mappés vers les permissions)
    isAdmin: () => hasPermission('tenant:manage') || hasPermission('users:manage'),
    isSuperAdmin: () => hasPermission('system:admin'),
    isOrganizer: () => hasPermission('events:manage'),
    isModerator: () => hasPermission('content:moderate'),
    isAnalyst: () => hasPermission('reports:view'),
    isParticipant: () => hasPermission('events:participate'),

    // Permissions fonctionnelles
    canCreateEvents: () => hasPermission('events:manage'),
    canManageUsers: () => hasPermission('users:manage'),
    canViewReports: () => hasPermission('reports:view'),
    canManageSettings: () => hasPermission('settings:manage'),
    canSendNotifications: () => hasPermission('notifications:send'),
    canExportData: () => hasPermission('data:export'),
    canManageRoles: () => hasPermission('roles:manage'),
    canAccessAnalytics: () => hasFeature('analytics'),
    canModerateContent: () => hasPermission('content:moderate'),
    canManageIntegrations: () => hasPermission('integrations:manage'),

    // Vérifications de statut utilisateur
    isActive: () => user?.status === 'active',
    isEmailVerified: () => user?.isEmailVerified || false,
    needsEmailVerification: () => !user?.isEmailVerified,
    requiresPasswordChange: () => false, // TODO: Implémenter si nécessaire
    isAccountLocked: () => user?.lockedUntil ? new Date(user.lockedUntil) > new Date() : false,
    isTwoFactorEnabled: () => user?.twoFactorEnabled || false,

    // Permissions object direct (pour compatibilité)
    permissions: {}, // TODO: Mapper les permissions tenant vers l'ancien format
  };
};

/**
 * Hook API unifié
 * Compatible avec l'ancien useApiToken mais utilise le système multi-tenant
 */
export const useUnifiedApiToken = () => {
  const { isAuthenticated } = useMultiTenantAuth();

  const getAuthHeaders = (): Record<string, string> => {
    // TODO: Récupérer le token depuis le contexte multi-tenant
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
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
        // TODO: Implémenter le refresh token avec le système multi-tenant
        throw new Error('Session expired. Please login again.');
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
    apiCall,
    isAuthenticated
  };
};

// Exports pour compatibilité
export const useAuth = useUnifiedAuth;
export const usePermissions = useUnifiedPermissions;
export const useApiToken = useUnifiedApiToken;