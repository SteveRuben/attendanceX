// Composant de protection des routes avec gestion multi-tenant
import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMultiTenantAuth } from '../../contexts/MultiTenantAuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireTenant?: boolean;
  requiredPermissions?: string[];
  requiredFeatures?: string[];
  fallbackPath?: string;
  loadingComponent?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireTenant = true,
  requiredPermissions = [],
  requiredFeatures = [],
  fallbackPath = '/login',
  loadingComponent = <LoadingSpinner />
}) => {
  const location = useLocation();
  const {
    isAuthenticated,
    isLoading,
    currentTenant,
    tenantContext,
    hasPermission,
    hasFeature
  } = useMultiTenantAuth();

  // Afficher le chargement pendant l'initialisation
  if (isLoading) {
    return <>{loadingComponent}</>;
  }

  // Vérifier l'authentification
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Vérifier la présence d'un tenant
  if (requireTenant && isAuthenticated && !currentTenant) {
    return <Navigate to="/onboarding/tenant" state={{ from: location }} replace />;
  }

  // Vérifier les permissions requises
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => hasPermission(permission));
    if (!hasAllPermissions) {
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  }

  // Vérifier les fonctionnalités requises
  if (requiredFeatures.length > 0) {
    const hasAllFeatures = requiredFeatures.every(feature => hasFeature(feature));
    if (!hasAllFeatures) {
      return <Navigate to="/upgrade" state={{ from: location, requiredFeatures }} replace />;
    }
  }

  // Toutes les vérifications sont passées, afficher le contenu
  return <>{children}</>;
};

// Composant de chargement par défaut
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

// Hook pour vérifier les permissions dans les composants
export const usePermissions = () => {
  const { hasPermission, hasFeature, tenantContext } = useMultiTenantAuth();

  const checkPermission = (permission: string): boolean => {
    return hasPermission(permission);
  };

  const checkFeature = (feature: string): boolean => {
    return hasFeature(feature);
  };

  const checkMultiplePermissions = (permissions: string[], requireAll = true): boolean => {
    if (requireAll) {
      return permissions.every(permission => hasPermission(permission));
    } else {
      return permissions.some(permission => hasPermission(permission));
    }
  };

  const checkMultipleFeatures = (features: string[], requireAll = true): boolean => {
    if (requireAll) {
      return features.every(feature => hasFeature(feature));
    } else {
      return features.some(feature => hasFeature(feature));
    }
  };

  const getUserRole = (): string | null => {
    return tenantContext?.membership?.role || null;
  };

  const isOwner = (): boolean => {
    return getUserRole() === 'owner';
  };

  const isAdmin = (): boolean => {
    const role = getUserRole();
    return role === 'owner' || role === 'admin';
  };

  const isManager = (): boolean => {
    const role = getUserRole();
    return role === 'owner' || role === 'admin' || role === 'manager';
  };

  return {
    checkPermission,
    checkFeature,
    checkMultiplePermissions,
    checkMultipleFeatures,
    getUserRole,
    isOwner,
    isAdmin,
    isManager,
    hasPermission,
    hasFeature
  };
};

// Composant pour afficher du contenu conditionnel basé sur les permissions
interface ConditionalRenderProps {
  children: ReactNode;
  permissions?: string[];
  features?: string[];
  roles?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  children,
  permissions = [],
  features = [],
  roles = [],
  requireAll = true,
  fallback = null
}) => {
  const { checkMultiplePermissions, checkMultipleFeatures, getUserRole } = usePermissions();

  // Vérifier les permissions
  if (permissions.length > 0) {
    const hasPermissions = checkMultiplePermissions(permissions, requireAll);
    if (!hasPermissions) {
      return <>{fallback}</>;
    }
  }

  // Vérifier les fonctionnalités
  if (features.length > 0) {
    const hasFeatures = checkMultipleFeatures(features, requireAll);
    if (!hasFeatures) {
      return <>{fallback}</>;
    }
  }

  // Vérifier les rôles
  if (roles.length > 0) {
    const userRole = getUserRole();
    const hasRole = roles.includes(userRole || '');
    if (!hasRole) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};