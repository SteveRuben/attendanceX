/**
 * Service de gestion des permissions à deux niveaux
 * Gère les rôles tenant ET les rôles application
 */

import { ApplicationRole, ApplicationRoleConfig, FeaturePermission, PlanType, TenantRole, UserContext } from "../../common/types";



export class PermissionService {
  
  // Configuration des rôles application
  private static readonly APPLICATION_ROLES: ApplicationRoleConfig[] = [
    {
      role: ApplicationRole.PREMIUM_USER,
      displayName: 'Utilisateur Premium',
      description: 'Accès complet à toutes les fonctionnalités',
      permissions: [
        FeaturePermission.ADVANCED_PRESENCE_TRACKING,
        FeaturePermission.BULK_PRESENCE_MANAGEMENT,
        FeaturePermission.PRESENCE_ANALYTICS,
        FeaturePermission.GEOFENCING,
        FeaturePermission.BASIC_REPORTS,
        FeaturePermission.ADVANCED_REPORTS,
        FeaturePermission.CUSTOM_REPORTS,
        FeaturePermission.SCHEDULED_REPORTS,
        FeaturePermission.EXPORT_REPORTS,
        FeaturePermission.API_ACCESS,
        FeaturePermission.WEBHOOK_ACCESS,
        FeaturePermission.THIRD_PARTY_INTEGRATIONS,
        FeaturePermission.MACHINE_LEARNING_INSIGHTS,
        FeaturePermission.PREDICTIVE_ANALYTICS,
        FeaturePermission.CUSTOM_BRANDING,
        FeaturePermission.WHITE_LABELING,
        FeaturePermission.PRIORITY_SUPPORT,
        FeaturePermission.DEDICATED_SUPPORT,
        FeaturePermission.TRAINING_SESSIONS
      ],
      planRequirement: PlanType.ENTERPRISE,
      isDefault: false
    },
    {
      role: ApplicationRole.STANDARD_USER,
      displayName: 'Utilisateur Standard',
      description: 'Accès aux fonctionnalités principales',
      permissions: [
        FeaturePermission.ADVANCED_PRESENCE_TRACKING,
        FeaturePermission.PRESENCE_ANALYTICS,
        FeaturePermission.BASIC_REPORTS,
        FeaturePermission.ADVANCED_REPORTS,
        FeaturePermission.EXPORT_REPORTS,
        FeaturePermission.API_ACCESS,
        FeaturePermission.PRIORITY_SUPPORT
      ],
      planRequirement: PlanType.PRO,
      isDefault: false
    },
    {
      role: ApplicationRole.BASIC_USER,
      displayName: 'Utilisateur Basique',
      description: 'Accès aux fonctionnalités de base',
      permissions: [
        FeaturePermission.BASIC_REPORTS,
        FeaturePermission.EXPORT_REPORTS
      ],
      planRequirement: PlanType.BASIC,
      isDefault: true
    },
    {
      role: ApplicationRole.TRIAL_USER,
      displayName: 'Utilisateur Essai',
      description: 'Accès limité pendant la période d\'essai',
      permissions: [
        FeaturePermission.BASIC_REPORTS
      ],
      planRequirement: PlanType.FREE,
      isDefault: false
    },
    {
      role: ApplicationRole.RESTRICTED_USER,
      displayName: 'Utilisateur Restreint',
      description: 'Accès très limité',
      permissions: [],
      isDefault: false
    }
  ];

  /**
   * Vérifier si un utilisateur a une permission tenant
   */
  static hasTenantPermission(
    userContext: UserContext,
    requiredRole: TenantRole,
    specificPermission?: string
  ): boolean {
    // Vérifier le rôle tenant
    const roleHierarchy = {
      [TenantRole.OWNER]: 5,
      [TenantRole.ADMIN]: 4,
      [TenantRole.MANAGER]: 3,
      [TenantRole.MEMBER]: 2,
      [TenantRole.VIEWER]: 1
    };

    const userRoleLevel = roleHierarchy[userContext.tenantRole];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    if (userRoleLevel >= requiredRoleLevel) {
      return true;
    }

    // Vérifier les permissions spécifiques
    if (specificPermission && userContext.tenantPermissions.includes(specificPermission)) {
      return true;
    }

    return false;
  }

  /**
   * Vérifier si un utilisateur a une permission de fonctionnalité
   */
  static hasFeaturePermission(
    userContext: UserContext,
    requiredPermission: FeaturePermission
  ): boolean {
    return userContext.featurePermissions.includes(requiredPermission);
  }

  /**
   * Vérifier si un utilisateur peut accéder à une fonctionnalité
   * (combine les vérifications tenant ET application)
   */
  static canAccessFeature(
    userContext: UserContext,
    featurePermission: FeaturePermission,
    minimumTenantRole?: TenantRole
  ): boolean {
    // Vérifier la permission de fonctionnalité
    const hasFeatureAccess = this.hasFeaturePermission(userContext, featurePermission);
    
    if (!hasFeatureAccess) {
      return false;
    }

    // Vérifier le rôle tenant si requis
    if (minimumTenantRole) {
      const hasTenantAccess = this.hasTenantPermission(userContext, minimumTenantRole);
      return hasTenantAccess;
    }

    return true;
  }

  /**
   * Obtenir le rôle application basé sur le plan
   */
  static getApplicationRoleForPlan(planType: PlanType): ApplicationRole {
    switch (planType) {
      case PlanType.ENTERPRISE:
        return ApplicationRole.PREMIUM_USER;
      case PlanType.PRO:
        return ApplicationRole.STANDARD_USER;
      case PlanType.BASIC:
        return ApplicationRole.BASIC_USER;
      case PlanType.FREE:
        return ApplicationRole.TRIAL_USER;
      default:
        return ApplicationRole.RESTRICTED_USER;
    }
  }

  /**
   * Obtenir les permissions pour un rôle application
   */
  static getPermissionsForApplicationRole(role: ApplicationRole): FeaturePermission[] {
    const roleConfig = this.APPLICATION_ROLES.find(r => r.role === role);
    return roleConfig?.permissions || [];
  }

  /**
   * Vérifier si un plan supporte un rôle application
   */
  static isPlanCompatibleWithRole(planType: PlanType, applicationRole: ApplicationRole): boolean {
    const roleConfig = this.APPLICATION_ROLES.find(r => r.role === applicationRole);
    if (!roleConfig || !roleConfig.planRequirement) {
      return true;
    }

    const planHierarchy = {
      [PlanType.FREE]: 1,
      [PlanType.BASIC]: 2,
      [PlanType.PRO]: 3,
      [PlanType.ENTERPRISE]: 4
    };

    const currentPlanLevel = planHierarchy[planType];
    const requiredPlanLevel = planHierarchy[roleConfig.planRequirement];

    return currentPlanLevel >= requiredPlanLevel;
  }

  /**
   * Créer un contexte utilisateur complet
   */
  static createUserContext(
    userId: string,
    tenantRole: TenantRole,
    applicationRole: ApplicationRole,
    tenantPermissions: string[],
    planFeatures: any,
    planLimits: any
  ): UserContext {
    const featurePermissions = this.getPermissionsForApplicationRole(applicationRole);

    return {
      userId,
      tenantRole,
      applicationRole,
      featurePermissions,
      tenantPermissions,
      planFeatures,
      planLimits
    };
  }

  /**
   * Obtenir toutes les configurations de rôles application
   */
  static getApplicationRoleConfigs(): ApplicationRoleConfig[] {
    return [...this.APPLICATION_ROLES];
  }
}

export default PermissionService;