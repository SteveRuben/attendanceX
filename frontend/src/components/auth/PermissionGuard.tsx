/**
 * Composant de protection basé sur les permissions
 * Affiche le contenu seulement si l'utilisateur a les permissions requises
 */

import { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { FeaturePermission, TenantRole } from '@/types/permission.types'

interface PermissionGuardProps {
  /** Permission unique requise */
  permission?: FeaturePermission
  
  /** Liste de permissions (au moins une requise par défaut) */
  permissions?: FeaturePermission[]
  
  /** Rôle(s) requis */
  role?: TenantRole | TenantRole[]
  
  /** Si true, toutes les permissions sont requises (ET logique) */
  requireAll?: boolean
  
  /** Composant à afficher si l'accès est refusé */
  fallback?: ReactNode
  
  /** Message d'erreur personnalisé */
  errorMessage?: string
  
  /** Afficher un message d'erreur par défaut */
  showError?: boolean
  
  /** Vérification de propriété de ressource */
  resourceOwnerId?: string
  
  /** Fonction de vérification personnalisée */
  customCheck?: () => boolean
  
  /** Contenu à protéger */
  children: ReactNode
}

export function PermissionGuard({
  permission,
  permissions,
  role,
  requireAll = false,
  fallback = null,
  errorMessage,
  showError = false,
  resourceOwnerId,
  customCheck,
  children
}: PermissionGuardProps) {
  const {
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    canAccessResource,
    membership
  } = usePermissions()

  // Vérification personnalisée
  if (customCheck && !customCheck()) {
    return renderFallback()
  }

  // Vérification des rôles
  if (role && !hasRole(role)) {
    return renderFallback()
  }

  // Vérification de permission unique
  if (permission && !hasPermission(permission)) {
    return renderFallback()
  }

  // Vérification de permissions multiples
  if (permissions) {
    const hasRequiredPermissions = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
    
    if (!hasRequiredPermissions) {
      return renderFallback()
    }
  }

  // Vérification de propriété de ressource
  if (resourceOwnerId && !canAccessResource(resourceOwnerId)) {
    return renderFallback()
  }

  // Toutes les vérifications passées, afficher le contenu
  return <>{children}</>

  function renderFallback(): ReactNode {
    if (fallback !== null) {
      return fallback
    }

    if (showError) {
      return (
        <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-1">
            Accès restreint
          </div>
          <div className="text-xs text-gray-500">
            {errorMessage || getDefaultErrorMessage()}
          </div>
        </div>
      )
    }

    return null
  }

  function getDefaultErrorMessage(): string {
    if (role) {
      const roleText = Array.isArray(role) ? role.join(' ou ') : role
      return `Rôle requis: ${roleText}`
    }

    if (permission) {
      return `Permission requise: ${permission}`
    }

    if (permissions) {
      const permText = permissions.join(requireAll ? ' et ' : ' ou ')
      return `Permissions requises: ${permText}`
    }

    return 'Vous n\'avez pas les permissions nécessaires pour accéder à cette fonctionnalité.'
  }
}

// ==========================================
// COMPOSANTS SPÉCIALISÉS
// ==========================================

/**
 * Protection pour les fonctionnalités d'administration
 */
export function AdminGuard({ 
  children, 
  fallback = null 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <PermissionGuard
      role={[TenantRole.OWNER, TenantRole.ADMIN]}
      fallback={fallback}
      showError={!fallback}
      errorMessage="Accès réservé aux administrateurs"
    >
      {children}
    </PermissionGuard>
  )
}

/**
 * Protection pour les managers et plus
 */
export function ManagerGuard({ 
  children, 
  fallback = null 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <PermissionGuard
      role={[TenantRole.OWNER, TenantRole.ADMIN, TenantRole.MANAGER]}
      fallback={fallback}
      showError={!fallback}
      errorMessage="Accès réservé aux managers et administrateurs"
    >
      {children}
    </PermissionGuard>
  )
}

/**
 * Protection pour les fonctionnalités de timesheet
 */
export function TimesheetGuard({ 
  action,
  children, 
  fallback = null 
}: { 
  action: 'view' | 'create' | 'edit' | 'approve'
  children: ReactNode
  fallback?: ReactNode 
}) {
  const permissionMap: Record<string, FeaturePermission> = {
    view: FeaturePermission.VIEW_TIMESHEET,
    create: FeaturePermission.CREATE_TIMESHEET,
    edit: FeaturePermission.CREATE_TIMESHEET, // Assuming edit uses create permission
    approve: FeaturePermission.APPROVE_TIMESHEET
  }

  return (
    <PermissionGuard
      permission={permissionMap[action]}
      fallback={fallback}
      showError={!fallback}
      errorMessage={`Permission requise pour ${action === 'view' ? 'voir' : action === 'create' ? 'créer' : action === 'edit' ? 'modifier' : 'approuver'} les timesheets`}
    >
      {children}
    </PermissionGuard>
  )
}

/**
 * Protection pour les fonctionnalités d'événements
 */
export function EventGuard({ 
  action,
  isOwner = false,
  children, 
  fallback = null 
}: { 
  action: 'view' | 'create' | 'manage'
  isOwner?: boolean
  children: ReactNode
  fallback?: ReactNode 
}) {
  const getPermission = (): FeaturePermission => {
    switch (action) {
      case 'view':
        return FeaturePermission.VIEW_ALL_EVENTS
      case 'create':
        return FeaturePermission.CREATE_EVENTS
      case 'manage':
        return isOwner ? FeaturePermission.EDIT_EVENTS : FeaturePermission.DELETE_EVENTS
      default:
        return FeaturePermission.VIEW_ALL_EVENTS
    }
  }

  return (
    <PermissionGuard
      permission={getPermission()}
      fallback={fallback}
      showError={!fallback}
      errorMessage={`Permission requise pour ${action === 'view' ? 'voir' : action === 'create' ? 'créer' : 'gérer'} les événements`}
    >
      {children}
    </PermissionGuard>
  )
}

/**
 * Protection pour les rapports
 */
export function ReportGuard({ 
  children, 
  fallback = null 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <PermissionGuard
      permissions={[FeaturePermission.VIEW_REPORTS, FeaturePermission.VIEW_ANALYTICS]}
      fallback={fallback}
      showError={!fallback}
      errorMessage="Accès aux rapports requis"
    >
      {children}
    </PermissionGuard>
  )
}