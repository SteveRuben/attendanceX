// Hook personnalisé pour faciliter l'utilisation du système multi-tenant
import { useMultiTenantAuth, useTenant } from '../contexts/MultiTenantAuthContext';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

export const useMultiTenant = () => {
  const navigate = useNavigate();
  const auth = useMultiTenantAuth();
  const tenant = useTenant();

  // Navigation avec vérification des permissions
  const navigateWithPermission = useCallback((
    path: string, 
    requiredPermissions: string[] = [],
    requiredFeatures: string[] = []
  ) => {
    // Vérifier les permissions
    const hasPermissions = requiredPermissions.every(permission => 
      tenant.hasPermission(permission)
    );
    
    // Vérifier les fonctionnalités
    const hasFeatures = requiredFeatures.every(feature => 
      tenant.hasFeature(feature)
    );

    if (!hasPermissions) {
      navigate('/unauthorized');
      return false;
    }

    if (!hasFeatures) {
      navigate('/upgrade', { state: { requiredFeatures } });
      return false;
    }

    navigate(path);
    return true;
  }, [navigate, tenant]);

  // Vérifier si l'utilisateur peut accéder à une fonctionnalité
  const canAccess = useCallback((
    permissions: string[] = [],
    features: string[] = []
  ) => {
    const hasPermissions = permissions.length === 0 || 
      permissions.every(permission => tenant.hasPermission(permission));
    
    const hasFeatures = features.length === 0 || 
      features.every(feature => tenant.hasFeature(feature));

    return hasPermissions && hasFeatures;
  }, [tenant]);

  // Obtenir les informations de limite d'usage
  const getUsageInfo = useCallback(() => {
    const subscription = tenant.context?.subscription;
    if (!subscription) return null;

    return {
      users: {
        current: subscription.usage.users,
        limit: subscription.limits.maxUsers,
        percentage: Math.round((subscription.usage.users / subscription.limits.maxUsers) * 100)
      },
      events: {
        current: subscription.usage.events,
        limit: subscription.limits.maxEvents,
        percentage: Math.round((subscription.usage.events / subscription.limits.maxEvents) * 100)
      },
      storage: {
        current: subscription.usage.storage,
        limit: subscription.limits.maxStorage,
        percentage: Math.round((subscription.usage.storage / subscription.limits.maxStorage) * 100)
      },
      apiCalls: {
        current: subscription.usage.apiCalls,
        limit: subscription.limits.apiCallsPerMonth,
        percentage: Math.round((subscription.usage.apiCalls / subscription.limits.apiCallsPerMonth) * 100)
      }
    };
  }, [tenant.context]);

  // Vérifier si une limite est proche d'être atteinte
  const isNearLimit = useCallback((type: 'users' | 'events' | 'storage' | 'apiCalls', threshold = 80) => {
    const usage = getUsageInfo();
    if (!usage) return false;
    
    return usage[type].percentage >= threshold;
  }, [getUsageInfo]);

  // Obtenir les fonctionnalités disponibles selon le plan
  const getAvailableFeatures = useCallback(() => {
    const features = tenant.context?.features;
    if (!features) return [];

    return Object.entries(features)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => feature);
  }, [tenant.context]);

  // Obtenir les permissions de l'utilisateur
  const getUserPermissions = useCallback(() => {
    return tenant.context?.membership?.permissions || [];
  }, [tenant.context]);

  // Vérifier le rôle de l'utilisateur
  const hasRole = useCallback((roles: string | string[]) => {
    const userRole = tenant.context?.membership?.role;
    if (!userRole) return false;

    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(userRole);
  }, [tenant.context]);

  // Obtenir les informations de branding
  const getBrandingStyles = useCallback(() => {
    const branding = tenant.branding;
    return {
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      cssVariables: {
        '--primary-color': branding.primaryColor,
        '--secondary-color': branding.secondaryColor
      }
    };
  }, [tenant.branding]);

  // Créer un nouveau tenant
  const createNewTenant = useCallback(async (tenantData: any) => {
    try {
      const newTenant = await auth.createTenant(tenantData);
      // Automatiquement basculer vers le nouveau tenant
      await auth.switchTenant(newTenant.id);
      navigate('/dashboard');
      return newTenant;
    } catch (error) {
      console.error('Failed to create tenant:', error);
      throw error;
    }
  }, [auth, navigate]);

  return {
    // État d'authentification
    ...auth,
    
    // Informations du tenant
    ...tenant,
    
    // Fonctions utilitaires
    navigateWithPermission,
    canAccess,
    getUsageInfo,
    isNearLimit,
    getAvailableFeatures,
    getUserPermissions,
    hasRole,
    getBrandingStyles,
    createNewTenant,
    
    // Raccourcis pour les vérifications communes
    isOwner: hasRole('owner'),
    isAdmin: hasRole(['owner', 'admin']),
    isManager: hasRole(['owner', 'admin', 'manager']),
    canManageUsers: canAccess(['manage_users']),
    canViewReports: canAccess(['view_reports']),
    canManageOrganization: canAccess(['manage_organization']),
    hasAdvancedFeatures: canAccess([], ['advancedAnalytics', 'apiAccess']),
  };
};

// Hook pour les notifications de limite d'usage
export const useUsageAlerts = () => {
  const { getUsageInfo, isNearLimit } = useMultiTenant();

  const getUsageAlerts = useCallback(() => {
    const alerts = [];
    
    if (isNearLimit('users', 90)) {
      alerts.push({
        type: 'warning',
        message: 'You are approaching your user limit. Consider upgrading your plan.',
        action: 'upgrade'
      });
    }
    
    if (isNearLimit('events', 90)) {
      alerts.push({
        type: 'warning',
        message: 'You are approaching your monthly event limit.',
        action: 'upgrade'
      });
    }
    
    if (isNearLimit('storage', 90)) {
      alerts.push({
        type: 'warning',
        message: 'You are running low on storage space.',
        action: 'upgrade'
      });
    }

    return alerts;
  }, [isNearLimit]);

  return {
    getUsageAlerts,
    hasAlerts: getUsageAlerts().length > 0
  };
};