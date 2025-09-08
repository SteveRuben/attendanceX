/**
 * Configuration des permissions pour la navigation
 */

import { OrganizationRole, UserRole } from '../shared';

export interface NavigationPermission {
  roles?: OrganizationRole[];
  userRoles?: UserRole[];
  permissions?: string[];
  requireOwner?: boolean;
  requireAdmin?: boolean;
}

export const NAVIGATION_PERMISSIONS: Record<string, NavigationPermission> = {
  // Administration - Réservé aux admins et owners
  'admin': {
    requireAdmin: true,
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN]
  },
  'admin-dashboard': {
    requireAdmin: true,
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN]
  },
  'admin-users': {
    requireAdmin: true,
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN],
    permissions: ['MANAGE_MEMBERS']
  },
  'admin-integrations': {
    requireAdmin: true,
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN],
    permissions: ['MANAGE_INTEGRATIONS']
  },
  'admin-reports': {
    requireAdmin: true,
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN],
    permissions: ['VIEW_ANALYTICS', 'EXPORT_DATA']
  },

  // Intelligence Artificielle - Admins et managers
  'ai-ml': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER],
    permissions: ['VIEW_ANALYTICS']
  },
  'ml-dashboard': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER],
    permissions: ['VIEW_ANALYTICS']
  },

  // Présence avancée - Managers et plus
  'presence': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER],
    permissions: ['VIEW_ALL_ATTENDANCE']
  },
  'presence-dashboard': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER],
    permissions: ['VIEW_ALL_ATTENDANCE']
  },
  'presence-qr': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER, OrganizationRole.MEMBER],
    permissions: ['RECORD_ATTENDANCE']
  },

  // Outils Manager - Managers et plus
  'manager': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER],
    permissions: ['MANAGE_ATTENDANCE']
  },
  'manager-dashboard': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER],
    permissions: ['MANAGE_ATTENDANCE']
  },

  // Analytics - Selon les permissions
  'analytics': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER],
    permissions: ['VIEW_ANALYTICS']
  },
  'analytics-events': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER],
    permissions: ['VIEW_ANALYTICS']
  },
  'analytics-validation': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER],
    permissions: ['VIEW_ANALYTICS']
  },

  // Équipes - Managers et plus
  'teams': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER],
    permissions: ['VIEW_TEAMS']
  },
  'teams-management': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER],
    permissions: ['MANAGE_TEAMS']
  },

  // Organisation - Admins et owners
  'organization': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN],
    permissions: ['VIEW_ORGANIZATION']
  },
  'org-settings': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN],
    permissions: ['UPDATE_ORGANIZATION_SETTINGS']
  },
  'org-members': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN],
    permissions: ['MANAGE_MEMBERS']
  },
  'org-billing': {
    requireOwner: true,
    roles: [OrganizationRole.OWNER],
    permissions: ['MANAGE_BILLING']
  },

  // Campagnes - Managers et plus
  'campaigns': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER],
    permissions: ['SEND_NOTIFICATIONS']
  },

  // Événements - Tous les membres
  'events': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER, OrganizationRole.MEMBER],
    permissions: ['VIEW_EVENTS']
  },
  'events-create': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER],
    permissions: ['CREATE_EVENTS']
  },

  // Présences - Tous les membres pour voir les leurs
  'attendance': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER, OrganizationRole.MEMBER],
    permissions: ['RECORD_ATTENDANCE']
  },
  'attendance-validation': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER],
    permissions: ['MANAGE_ATTENDANCE']
  },

  // Tableau de bord - Tous les utilisateurs
  'dashboard': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER, OrganizationRole.MEMBER, OrganizationRole.VIEWER]
  },

  // Profil - Tous les utilisateurs
  'profile': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER, OrganizationRole.MEMBER, OrganizationRole.VIEWER]
  },

  // Notifications - Tous les utilisateurs
  'notifications': {
    roles: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER, OrganizationRole.MEMBER, OrganizationRole.VIEWER]
  }
};

/**
 * Vérifier si un utilisateur a accès à une section de navigation
 */
export const hasNavigationAccess = (
  sectionId: string,
  userRole?: OrganizationRole,
  userPermissions: string[] = [],
  isOwner = false,
  isAdmin = false
): boolean => {
  const permission = NAVIGATION_PERMISSIONS[sectionId];
  
  // Le owner a accès à tout, toujours
  if (isOwner) {
    return true;
  }

  // Si aucune permission n'est définie, l'accès est autorisé par défaut
  if (!permission) {
    return true;
  }

  // Vérifier si owner requis
  if (permission.requireOwner && !isOwner) {
    return false;
  }

  // Vérifier si admin requis
  if (permission.requireAdmin && !isAdmin && !isOwner) {
    return false;
  }

  // Vérifier les rôles d'organisation
  if (permission.roles && userRole) {
    // Convertir le rôle string en OrganizationRole si nécessaire
    const roleToCheck = typeof userRole === 'string' ? 
      userRole.toUpperCase() as OrganizationRole : userRole;
    
    if (!permission.roles.includes(roleToCheck)) {
      return false;
    }
  }

  // Vérifier les permissions spécifiques
  if (permission.permissions && permission.permissions.length > 0) {
    const hasRequiredPermission = permission.permissions.some(perm => 
      userPermissions.includes(perm)
    );
    if (!hasRequiredPermission) {
      return false;
    }
  }

  return true;
};

/**
 * Filtrer les éléments de navigation selon les permissions
 */
export const filterNavigationItems = (
  items: any[],
  userRole?: OrganizationRole,
  userPermissions: string[] = [],
  isOwner = false,
  isAdmin = false
): any[] => {
  console.log('filterNavigationItems called with:', {
    userRole,
    userPermissions,
    isOwner,
    isAdmin,
    itemsCount: items.length
  });

  return items.filter(item => {
    // Vérifier l'accès à l'élément principal
    const hasAccess = hasNavigationAccess(item.id, userRole, userPermissions, isOwner, isAdmin);
    
    console.log(`Item ${item.id} (${item.label}): hasAccess = ${hasAccess}`);
    
    if (!hasAccess) {
      return false;
    }

    // Filtrer les sous-éléments si présents
    if (item.dropdown) {
      const originalDropdownLength = item.dropdown.length;
      item.dropdown = item.dropdown.filter((subItem: any) => {
        const subHasAccess = hasNavigationAccess(subItem.id, userRole, userPermissions, isOwner, isAdmin);
        console.log(`  SubItem ${subItem.id} (${subItem.label}): hasAccess = ${subHasAccess}`);
        return subHasAccess;
      });
      
      console.log(`Item ${item.id}: dropdown filtered from ${originalDropdownLength} to ${item.dropdown.length} items`);
      
      // Si aucun sous-élément n'est accessible, masquer l'élément parent
      if (item.dropdown.length === 0) {
        console.log(`Item ${item.id}: hidden because no accessible dropdown items`);
        return false;
      }
    }

    return true;
  });
};