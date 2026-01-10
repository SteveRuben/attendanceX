/**
 * Service de gestion des permissions simplifié
 */

import { 
  TenantRole, 
  FeaturePermission, 
  UserContext,
  PlanFeatures,
  PlanLimits
} from '../../common/types/tenant.types';

// Configuration des permissions par défaut par rôle
const ROLE_PERMISSIONS: Record<TenantRole, FeaturePermission[]> = {
  [TenantRole.OWNER]: [
    FeaturePermission.MANAGE_USERS,
    FeaturePermission.INVITE_USERS,
    FeaturePermission.VIEW_USERS,
    FeaturePermission.MANAGE_PRESENCE,
    FeaturePermission.VIEW_PRESENCE,
    FeaturePermission.CHECK_PRESENCE,
    FeaturePermission.MANAGE_SETTINGS,
    FeaturePermission.VIEW_ADVANCED_ANALYTICS,
    FeaturePermission.API_ACCESS
  ],
  [TenantRole.ADMIN]: [
    FeaturePermission.MANAGE_USERS,
    FeaturePermission.INVITE_USERS,
    FeaturePermission.VIEW_USERS,
    FeaturePermission.MANAGE_PRESENCE,
    FeaturePermission.VIEW_PRESENCE,
    FeaturePermission.CHECK_PRESENCE,
    FeaturePermission.VIEW_BASIC_ANALYTICS
  ],
  [TenantRole.MANAGER]: [
    FeaturePermission.INVITE_USERS,
    FeaturePermission.VIEW_USERS,
    FeaturePermission.MANAGE_PRESENCE,
    FeaturePermission.VIEW_PRESENCE,
    FeaturePermission.CHECK_PRESENCE
  ],
  [TenantRole.MEMBER]: [
    FeaturePermission.VIEW_USERS,
    FeaturePermission.VIEW_PRESENCE,
    FeaturePermission.CHECK_PRESENCE
  ],
  [TenantRole.VIEWER]: [
    FeaturePermission.VIEW_USERS,
    FeaturePermission.VIEW_PRESENCE
  ]
};

export class PermissionService {

  /**
   * Crée un contexte utilisateur complet avec toutes les informations de permissions
   */
  static createUserContext(
    userId: string,
    tenantRole: TenantRole,
    planFeatures: Record<string, any> = {},
    planLimits: Record<string, any> = {}
  ): UserContext {
    const typedPlanFeatures: PlanFeatures = {
      advancedReporting: !!planFeatures.advancedReporting,
      apiAccess: !!planFeatures.apiAccess,
      customBranding: !!planFeatures.customBranding,
      webhooks: !!planFeatures.webhooks,
      ssoIntegration: !!planFeatures.ssoIntegration,
      prioritySupport: !!planFeatures.prioritySupport
    };

    const typedPlanLimits: PlanLimits = {
      maxUsers: planLimits.maxUsers || -1,
      maxEvents: planLimits.maxEvents || -1,
      maxStorage: planLimits.maxStorage || -1,
      apiCallsPerMonth: planLimits.apiCallsPerMonth || -1
    };

    return {
      userId,
      tenantRole,
      effectivePermissions: this.getDefaultRolePermissions(tenantRole),
      planFeatures: typedPlanFeatures,
      planLimits: typedPlanLimits
    };
  }

  /**
   * Obtient les permissions par défaut d'un rôle
   */
  static getDefaultRolePermissions(role: TenantRole): FeaturePermission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Vérifie si un utilisateur a une permission spécifique
   */
  static hasPermission(
    role: TenantRole,
    customPermissions: FeaturePermission[] = [],
    requiredPermission: FeaturePermission
  ): boolean {
    const rolePermissions = this.getDefaultRolePermissions(role);
    const allPermissions = [...rolePermissions, ...customPermissions];
    return allPermissions.includes(requiredPermission);
  }

  /**
   * Vérifie si un contexte utilisateur a une permission tenant spécifique
   */
  static hasTenantPermission(
    userContext: UserContext,
    minimumRole: TenantRole,
    specificPermission?: FeaturePermission
  ): boolean {
    const roleHierarchy = {
      [TenantRole.VIEWER]: 1,
      [TenantRole.MEMBER]: 2,
      [TenantRole.MANAGER]: 3,
      [TenantRole.ADMIN]: 4,
      [TenantRole.OWNER]: 5
    };

    const userRoleLevel = roleHierarchy[userContext.tenantRole] || 0;
    const requiredRoleLevel = roleHierarchy[minimumRole] || 0;

    const hasRolePermission = userRoleLevel >= requiredRoleLevel;

    if (specificPermission) {
      const hasSpecificPermission = userContext.effectivePermissions.includes(specificPermission);
      return hasRolePermission && hasSpecificPermission;
    }

    return hasRolePermission;
  }

  /**
   * Vérifie si un contexte utilisateur a une permission de fonctionnalité spécifique
   */
  static hasFeaturePermission(
    userContext: UserContext,
    requiredPermission: FeaturePermission
  ): boolean {
    return userContext.effectivePermissions.includes(requiredPermission);
  }
}