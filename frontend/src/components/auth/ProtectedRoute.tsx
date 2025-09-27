// Composant de protection des routes avec gestion multi-tenant
import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMultiTenantAuth } from '../../contexts/MultiTenantAuthContext';

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

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireTenant?: boolean;
  requiredPermissions?: string[];
  requiredFeatures?: string[];
  fallbackPath?: string;
  loadingComponent?: ReactNode;
  // Nouvelles props pour la gestion des transitions
  allowTransitioning?: boolean;
  onTransitionError?: (error: string) => void;
  transitionFallback?: React.ComponentType;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireTenant = true,
  requiredPermissions = [],
  requiredFeatures = [],
  fallbackPath = '/login',
  loadingComponent = <LoadingSpinner />,
  allowTransitioning = false,
  onTransitionError,
  transitionFallback: TransitionFallback
}) => {
  const location = useLocation();
  const {
    isAuthenticated,
    isLoading,
    currentTenant,
    tenantContext,
    hasPermission,
    hasFeature,
    isTransitioning,
    transitionError
  } = useMultiTenantAuth();

  if (isDevSuperuser()) {
    return <>{children}</>;
  }

  // Afficher le chargement pendant l'initialisation
  if (isLoading) {
    return <>{loadingComponent}</>;
  }

  // Gérer les états de transition
  if (isTransitioning && allowTransitioning) {
    if (TransitionFallback) {
      return <TransitionFallback />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Setting up your workspace...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait while we prepare your dashboard</p>
        </div>
      </div>
    );
  }

  // Gérer les erreurs de transition
  if (transitionError && onTransitionError) {
    onTransitionError(transitionError);
  }

  // Vérifier l'authentification
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Vérifier la présence d'un tenant avec gestion intelligente
  if (requireTenant && isAuthenticated && !currentTenant && !isTransitioning) {
    // Si l'utilisateur vient de l'onboarding, permettre un délai pour la synchronisation
    const fromOnboarding = location.state?.from?.pathname?.includes('/onboarding');
    if (fromOnboarding && allowTransitioning) {
      // Attendre un peu pour la synchronisation
      setTimeout(() => {
        if (!currentTenant) {
          // Si toujours pas de tenant après le délai, rediriger vers l'onboarding
          window.location.href = '/onboarding/tenant';
        }
      }, 2000);

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Finalizing setup...</p>
          </div>
        </div>
      );
    }

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
    if (isDevSuperuser()) return 'owner';
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