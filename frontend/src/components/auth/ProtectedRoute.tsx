// src/components/auth/ProtectedRoute.tsx - Composant de route protégée
import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  fallbackPath?: string;
}

const ProtectedRoute = ({ 
  children, 
  requireAuth = true,
  requiredPermissions = [],
  requiredRoles = [],
  fallbackPath = '/login'
}: ProtectedRouteProps) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location, message: 'Vous devez être connecté pour accéder à cette page.' }}
        replace 
      />
    );
  }

  // Check role requirements
  if (requiredRoles.length > 0 && user) {
    const hasRequiredRole = requiredRoles.some(role => {
      switch (role.toLowerCase()) {
        case 'admin':
          return user.role === 'admin' || user.role === 'super_admin';
        case 'super_admin':
          return user.role === 'super_admin';
        case 'organizer':
          return ['organizer', 'admin', 'super_admin'].includes(user.role);
        case 'moderator':
          return ['moderator', 'admin', 'super_admin'].includes(user.role);
        case 'analyst':
          return ['analyst', 'admin', 'super_admin'].includes(user.role);
        default:
          return user.role === role;
      }
    });

    if (!hasRequiredRole) {
      return (
        <Navigate 
          to="/unauthorized" 
          state={{ 
            message: 'Vous n\'avez pas les permissions nécessaires pour accéder à cette page.',
            requiredRoles 
          }}
          replace 
        />
      );
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0 && user) {
    // This would need to be implemented based on your permission system
    // For now, we'll use a basic role-based check
    const hasPermissions = requiredPermissions.every(permission => {
      switch (permission) {
        case 'manage_users':
          return ['admin', 'super_admin'].includes(user.role);
        case 'create_events':
          return ['organizer', 'admin', 'super_admin'].includes(user.role);
        case 'view_reports':
          return ['analyst', 'organizer', 'admin', 'super_admin'].includes(user.role);
        case 'manage_settings':
          return ['admin', 'super_admin'].includes(user.role);
        case 'send_notifications':
          return ['organizer', 'admin', 'super_admin'].includes(user.role);
        case 'export_data':
          return ['analyst', 'admin', 'super_admin'].includes(user.role);
        default:
          return true; // Allow by default for unknown permissions
      }
    });

    if (!hasPermissions) {
      return (
        <Navigate 
          to="/unauthorized" 
          state={{ 
            message: 'Vous n\'avez pas les permissions nécessaires pour accéder à cette page.',
            requiredPermissions 
          }}
          replace 
        />
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;