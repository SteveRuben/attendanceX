// src/components/common/ProtectedRoute.tsx - Route protégée mise à jour
import { type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, usePermissions } from '@/hooks/use-auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Shield, AlertTriangle, Mail, Lock } from 'lucide-react';
import Loading from './Loading';
import { UserRole } from '@attendance-x/shared';

interface ProtectedRouteProps {
  children?: ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string;
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
  fallbackPath = '/login'
}) => {
  const { user, loading, isAuthenticated, sendEmailVerification } = useAuth();
  const permissions = usePermissions();
  const location = useLocation();

  // Afficher le loading pendant la vérification d'authentification
  if (loading) {
    return <Loading fullScreen />;
  }

  // Rediriger vers login si non authentifié
  if (!isAuthenticated || !user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Vérifier si l'utilisateur est actif
  if (!permissions.isActive()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Account Inactive</h2>
                <p className="text-gray-600 mt-1">
                  Your account is currently {user.status}. Please contact support for assistance.
                </p>
              </div>
              <div className="pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = 'mailto:support@attendancex.com'}
                  className="w-full"
                >
                  Contact Support
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vérifier la vérification email si requise
  if (!permissions.isEmailVerified()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Verify Your Email</h2>
                <p className="text-gray-600 mt-1">
                  Please verify your email address to access your account.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  We sent a verification link to <strong>{user.email}</strong>
                </p>
              </div>
              
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Check your spam folder if you don't see the email.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3 pt-4">
                <Button 
                  onClick={sendEmailVerification}
                  className="w-full bg-gray-900 text-white hover:bg-gray-800"
                >
                  Resend Verification Email
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  I've Verified My Email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vérifier si l'utilisateur doit changer son mot de passe
  if (permissions.requiresPasswordChange()) {
    return <Navigate to="/change-password" state={{ from: location }} replace />;
  }

  // Vérifier les rôles requis
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!permissions.hasAnyRole(roles as UserRole[])) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Access Denied</h2>
                  <p className="text-gray-600 mt-1">
                    You don't have permission to access this resource.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Required role: {Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}
                  </p>
                </div>
                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => window.history.back()}
                    className="w-full"
                  >
                    Go Back
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Vérifier les permissions spécifiques
  if (requiredPermission) {
    const hasPermission = (() => {
      switch (requiredPermission) {
        case 'canCreateEvents': return permissions.canCreateEvents();
        case 'canManageUsers': return permissions.canManageUsers();
        case 'canViewReports': return permissions.canViewReports();
        case 'canManageSettings': return permissions.canManageSettings();
        case 'canSendNotifications': return permissions.canSendNotifications();
        case 'canExportData': return permissions.canExportData();
        case 'canManageRoles': return permissions.canManageRoles();
        case 'canAccessAnalytics': return permissions.canAccessAnalytics();
        case 'canModerateContent': return permissions.canModerateContent();
        case 'canManageIntegrations': return permissions.canManageIntegrations();
        default: return false;
      }
    })();

    if (!hasPermission) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Permission Required</h2>
                  <p className="text-gray-600 mt-1">
                    You don't have the required permission to access this feature.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Required permission: {requiredPermission}
                  </p>
                </div>
                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => window.history.back()}
                    className="w-full"
                  >
                    Go Back
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Rendre le contenu protégé
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;

// Hook pour créer des routes protégées facilement
export function useProtectedRoute(options: {
  requiredRole?: UserRole | UserRole[];
  requiredPermission?: string;
  redirectTo?: string;
}) {
  const { user, isAuthenticated } = useAuth();
  const permissions = usePermissions();
  const location = useLocation();

  const checkAccess = (): {
    canAccess: boolean;
    reason?: string;
    redirectTo?: string;
  } => {
    if (!isAuthenticated || !user) {
      return {
        canAccess: false,
        reason: 'Not authenticated',
        redirectTo: options.redirectTo || '/login'
      };
    }

    if (!permissions.isActive()) {
      return {
        canAccess: false,
        reason: 'Account inactive'
      };
    }

    if (!permissions.isEmailVerified()) {
      return {
        canAccess: false,
        reason: 'Email not verified'
      };
    }

    if (options.requiredRole) {
      const roles = Array.isArray(options.requiredRole) ? options.requiredRole : [options.requiredRole];
      if (!permissions.hasAnyRole(roles)) {
        return {
          canAccess: false,
          reason: 'Insufficient role'
        };
      }
    }

    if (options.requiredPermission) {
      // Vérifier la permission comme dans ProtectedRoute
      const hasPermission = (permissions as any)[options.requiredPermission]?.();
      if (!hasPermission) {
        return {
          canAccess: false,
          reason: 'Insufficient permission'
        };
      }
    }

    return { canAccess: true };
  };

  return {
    ...checkAccess(),
    user,
    permissions
  };
}