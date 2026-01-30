/**
 * Composant de protection basé sur les permissions
 */

import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { FeaturePermission, TenantRole } from '../../types/permission.types';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: FeaturePermission;
  role?: TenantRole;
  userId?: string;
  fallback?: React.ReactNode;
  showError?: boolean;
  loading?: React.ReactNode;
}

export function PermissionGuard({
  children,
  permission,
  role,
  userId,
  fallback,
  showError = true,
  loading
}: PermissionGuardProps) {
  const { userContext, loading: permissionsLoading, error, hasPermission, hasMinimumRole } = usePermissions(userId);

  // Affichage du loading
  if (permissionsLoading) {
    if (loading) {
      return <>{loading}</>;
    }
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Affichage d'erreur
  if (error && showError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors de la vérification des permissions : {error}
        </AlertDescription>
      </Alert>
    );
  }

  // Pas de contexte utilisateur
  if (!userContext) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  // Vérification des permissions
  let hasAccess = true;

  if (permission && !hasPermission(permission)) {
    hasAccess = false;
  }

  if (role && !hasMinimumRole(role)) {
    hasAccess = false;
  }

  // Accès refusé
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    if (showError) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Vous n'avez pas les permissions nécessaires pour accéder à cette fonctionnalité.
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }

  // Accès autorisé
  return <>{children}</>;
}

interface ConditionalRenderProps {
  children: React.ReactNode;
  permission?: FeaturePermission;
  role?: TenantRole;
  userId?: string;
  fallback?: React.ReactNode;
}

/**
 * Composant pour le rendu conditionnel basé sur les permissions
 * Plus léger que PermissionGuard, sans gestion d'erreur
 */
export function ConditionalRender({
  children,
  permission,
  role,
  userId,
  fallback
}: ConditionalRenderProps) {
  const { userContext, loading, hasPermission, hasMinimumRole } = usePermissions(userId);

  if (loading || !userContext) {
    return fallback ? <>{fallback}</> : null;
  }

  let hasAccess = true;

  if (permission && !hasPermission(permission)) {
    hasAccess = false;
  }

  if (role && !hasMinimumRole(role)) {
    hasAccess = false;
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}