import { UserModel } from "../../models/user.model";
import { OrganizationRole } from "../../shared";


export class PermissionService {
  /**
   * Vérifier si un utilisateur a une permission spécifique
   */
  static hasPermission(user: UserModel, permission: string): boolean {
    // Le owner a automatiquement toutes les permissions - accès complet
    if (user.isOrganizationOwner()) {
      return true;
    }

    return user.hasOrganizationPermission(permission);
  }

  /**
   * Vérifier si un utilisateur peut gérer un autre utilisateur
   */
  static canManageUser(manager: UserModel, targetUser: UserModel): boolean {
    // Un utilisateur ne peut pas se gérer lui-même via cette méthode
    if (manager.id === targetUser.id) {
      return false;
    }

    // Le owner peut gérer tout le monde
    if (manager.isOrganizationOwner()) {
      return true;
    }

    // Obtenir les rôles via les getters publics
    const managerRole = manager.toUser().organizationRole;
    const targetRole = targetUser.toUser().organizationRole;

    // Un admin peut gérer les membres et managers, mais pas les owners
    if (managerRole === OrganizationRole.ADMIN) {
      return targetRole !== OrganizationRole.OWNER;
    }

    // Un manager peut gérer les membres seulement
    if (managerRole === OrganizationRole.MANAGER) {
      return targetRole === OrganizationRole.MEMBER ||
             targetRole === OrganizationRole.VIEWER;
    }

    return false;
  }

  /**
   * Vérifier si un utilisateur peut assigner un rôle spécifique
   */
  static canAssignRole(assigner: UserModel, targetRole: OrganizationRole): boolean {
    // Le owner peut assigner n'importe quel rôle
    if (assigner.isOrganizationOwner()) {
      return true;
    }

    const assignerRole = assigner.toUser().organizationRole;

    // Un admin peut assigner tous les rôles sauf owner
    if (assignerRole === OrganizationRole.ADMIN) {
      return targetRole !== OrganizationRole.OWNER;
    }

    // Un manager peut assigner seulement member et viewer
    if (assignerRole === OrganizationRole.MANAGER) {
      return targetRole === OrganizationRole.MEMBER || 
             targetRole === OrganizationRole.VIEWER;
    }

    return false;
  }

  /**
   * Obtenir les rôles qu'un utilisateur peut assigner
   */
  static getAssignableRoles(user: UserModel): OrganizationRole[] {
    if (user.isOrganizationOwner()) {
      return Object.values(OrganizationRole);
    }

    const userRole = user.toUser().organizationRole;

    if (userRole === OrganizationRole.ADMIN) {
      return [
        OrganizationRole.ADMIN,
        OrganizationRole.MANAGER,
        OrganizationRole.MEMBER,
        OrganizationRole.VIEWER
      ];
    }

    if (userRole === OrganizationRole.MANAGER) {
      return [
        OrganizationRole.MEMBER,
        OrganizationRole.VIEWER
      ];
    }

    return [];
  }

  /**
   * Vérifier si un utilisateur peut accéder à une ressource
   */
  static canAccessResource(user: UserModel, resource: string, action: string): boolean {
    // Le owner peut accéder à toutes les ressources
    if (user.isOrganizationOwner()) {
      return true;
    }

    // Construire la permission complète
    const permission = `${action.toUpperCase()}_${resource.toUpperCase()}`;
    
    return user.hasOrganizationPermission(permission);
  }

  /**
   * Vérifier les permissions pour les actions critiques
   */
  static canPerformCriticalAction(user: UserModel, action: CriticalAction): boolean {
    // Seul le owner peut effectuer certaines actions critiques
    const ownerOnlyActions: CriticalAction[] = [
      'DELETE_ORGANIZATION',
      'TRANSFER_OWNERSHIP',
      'MANAGE_BILLING',
      'CHANGE_ORGANIZATION_SETTINGS'
    ];

    if (ownerOnlyActions.includes(action)) {
      return user.isOrganizationOwner();
    }

    // Pour les autres actions critiques, vérifier les permissions normales
    const criticalPermissions: Record<CriticalAction, string> = {
      'DELETE_ORGANIZATION': 'DELETE_ORGANIZATION',
      'TRANSFER_OWNERSHIP': 'MANAGE_MEMBERS',
      'MANAGE_BILLING': 'MANAGE_BILLING',
      'CHANGE_ORGANIZATION_SETTINGS': 'UPDATE_ORGANIZATION_SETTINGS',
      'REMOVE_ADMIN': 'MANAGE_MEMBERS',
      'EXPORT_ALL_DATA': 'EXPORT_DATA'
    };

    const requiredPermission = criticalPermissions[action];
    return requiredPermission ? user.hasOrganizationPermission(requiredPermission) : false;
  }

  /**
   * Obtenir un résumé des permissions d'un utilisateur
   */
  static getPermissionSummary(user: UserModel): PermissionSummary {
    const isOwner = user.isOrganizationOwner();
    const isAdmin = user.isOrganizationAdmin();
    const effectivePermissions = user.getEffectivePermissions();
    const userData = user.toUser();

    return {
      userId: user.id!,
      organizationRole: userData.organizationRole,
      isOwner,
      isAdmin,
      permissions: effectivePermissions,
      canManageUsers: isOwner || isAdmin,
      canManageOrganization: isOwner || user.hasOrganizationPermission('UPDATE_ORGANIZATION_SETTINGS'),
      canViewAnalytics: isOwner || user.hasOrganizationPermission('VIEW_ANALYTICS'),
      canExportData: isOwner || user.hasOrganizationPermission('EXPORT_DATA'),
      canManageBilling: isOwner || user.hasOrganizationPermission('MANAGE_BILLING')
    };
  }

  /**
   * Middleware pour vérifier les permissions dans les routes
   */
  static requirePermission(permission: string) {
    return (user: UserModel): boolean => {
      return PermissionService.hasPermission(user, permission);
    };
  }

  /**
   * Middleware pour vérifier le rôle minimum requis
   */
  static requireRole(minimumRole: OrganizationRole) {
    return (user: UserModel): boolean => {
      const roleHierarchy: Record<OrganizationRole, number> = {
        [OrganizationRole.VIEWER]: 1,
        [OrganizationRole.MEMBER]: 2,
        [OrganizationRole.MANAGER]: 3,
        [OrganizationRole.ADMIN]: 4,
        [OrganizationRole.OWNER]: 5
      };

      const userData = user.toUser();
      const userRoleLevel = roleHierarchy[userData.organizationRole!] || 0;
      const requiredRoleLevel = roleHierarchy[minimumRole];

      return userRoleLevel >= requiredRoleLevel;
    };
  }

  /**
   * Vérifier si un utilisateur peut inviter d'autres utilisateurs
   */
  static canInviteUsers(user: UserModel): boolean {
    return user.isOrganizationOwner() || 
           user.hasOrganizationPermission('INVITE_MEMBERS');
  }

  /**
   * Vérifier si un utilisateur peut voir les données sensibles
   */
  static canViewSensitiveData(user: UserModel): boolean {
    return user.isOrganizationOwner() || 
           user.toUser().organizationRole === OrganizationRole.ADMIN;
  }

  /**
   * Vérifier si un utilisateur a des droits illimités (owner)
   */
  static hasUnlimitedAccess(user: UserModel): boolean {
    return user.isOrganizationOwner();
  }
}

// Types pour les actions critiques
export type CriticalAction = 
  | 'DELETE_ORGANIZATION'
  | 'TRANSFER_OWNERSHIP'
  | 'MANAGE_BILLING'
  | 'CHANGE_ORGANIZATION_SETTINGS'
  | 'REMOVE_ADMIN'
  | 'EXPORT_ALL_DATA';

// Interface pour le résumé des permissions
export interface PermissionSummary {
  userId: string;
  organizationRole?: OrganizationRole;
  isOwner: boolean;
  isAdmin: boolean;
  permissions: string[];
  canManageUsers: boolean;
  canManageOrganization: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
  canManageBilling: boolean;
}