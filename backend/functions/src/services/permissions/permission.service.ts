/**
 * Service de gestion des permissions simplifié
 * TenantRole + FeaturePermission seulement
 */

import { TenantRole, FeaturePermission, PlanType, UserContext, PlanFeatures, PlanLimits } from '../../common/types';

// Configuration des permissions par défaut par rôle
export const DEFAULT_ROLE_PERMISSIONS: Record<TenantRole, FeaturePermission[]> = {
    [TenantRole.OWNER]: [
        // Toutes les permissions
        FeaturePermission.MANAGE_USERS,
        FeaturePermission.INVITE_USERS,
        FeaturePermission.VIEW_USERS,
        FeaturePermission.MANAGE_PRESENCE,
        FeaturePermission.VIEW_PRESENCE,
        FeaturePermission.CHECK_PRESENCE,
        FeaturePermission.BULK_PRESENCE_MANAGEMENT,
        FeaturePermission.GEOFENCING,
        FeaturePermission.VIEW_BASIC_ANALYTICS,
        FeaturePermission.VIEW_ADVANCED_ANALYTICS,
        FeaturePermission.PRESENCE_ANALYTICS,
        FeaturePermission.CUSTOM_REPORTS,
        FeaturePermission.SCHEDULED_REPORTS,
        FeaturePermission.EXPORT_DATA,
        FeaturePermission.MANAGE_SETTINGS,
        FeaturePermission.MANAGE_INTEGRATIONS,
        FeaturePermission.CUSTOM_BRANDING,
        FeaturePermission.API_ACCESS,
        FeaturePermission.WEBHOOK_ACCESS,
        FeaturePermission.THIRD_PARTY_INTEGRATIONS,
        FeaturePermission.PRIORITY_SUPPORT
    ],

    [TenantRole.ADMIN]: [
        FeaturePermission.MANAGE_USERS,
        FeaturePermission.INVITE_USERS,
        FeaturePermission.VIEW_USERS,
        FeaturePermission.MANAGE_PRESENCE,
        FeaturePermission.VIEW_PRESENCE,
        FeaturePermission.CHECK_PRESENCE,
        FeaturePermission.BULK_PRESENCE_MANAGEMENT,
        FeaturePermission.GEOFENCING,
        FeaturePermission.VIEW_BASIC_ANALYTICS,
        FeaturePermission.VIEW_ADVANCED_ANALYTICS,
        FeaturePermission.PRESENCE_ANALYTICS,
        FeaturePermission.CUSTOM_REPORTS,
        FeaturePermission.SCHEDULED_REPORTS,
        FeaturePermission.EXPORT_DATA,
        FeaturePermission.API_ACCESS,
        FeaturePermission.WEBHOOK_ACCESS
    ],

    [TenantRole.MANAGER]: [
        FeaturePermission.INVITE_USERS,
        FeaturePermission.VIEW_USERS,
        FeaturePermission.MANAGE_PRESENCE,
        FeaturePermission.VIEW_PRESENCE,
        FeaturePermission.CHECK_PRESENCE,
        FeaturePermission.VIEW_BASIC_ANALYTICS,
        FeaturePermission.VIEW_ADVANCED_ANALYTICS,
        FeaturePermission.PRESENCE_ANALYTICS,
        FeaturePermission.EXPORT_DATA
    ],

    [TenantRole.MEMBER]: [
        FeaturePermission.VIEW_USERS,
        FeaturePermission.VIEW_PRESENCE,
        FeaturePermission.CHECK_PRESENCE,
        FeaturePermission.VIEW_BASIC_ANALYTICS
    ],

    [TenantRole.VIEWER]: [
        FeaturePermission.VIEW_USERS,
        FeaturePermission.VIEW_PRESENCE,
        FeaturePermission.VIEW_BASIC_ANALYTICS
    ]
};

// Configuration des permissions limitées par plan
export const PLAN_PERMISSION_LIMITS: Record<string, FeaturePermission[]> = {
    [PlanType.FREE]: [
        FeaturePermission.VIEW_USERS,
        FeaturePermission.VIEW_PRESENCE,
        FeaturePermission.CHECK_PRESENCE,
        FeaturePermission.VIEW_BASIC_ANALYTICS
    ],

    [PlanType.BASIC]: [
        FeaturePermission.MANAGE_USERS,
        FeaturePermission.INVITE_USERS,
        FeaturePermission.VIEW_USERS,
        FeaturePermission.MANAGE_PRESENCE,
        FeaturePermission.VIEW_PRESENCE,
        FeaturePermission.CHECK_PRESENCE,
        FeaturePermission.VIEW_BASIC_ANALYTICS,
        FeaturePermission.VIEW_ADVANCED_ANALYTICS,
        FeaturePermission.EXPORT_DATA
    ],

    [PlanType.PRO]: [
        // Toutes les permissions BASIC +
        FeaturePermission.MANAGE_USERS,
        FeaturePermission.INVITE_USERS,
        FeaturePermission.VIEW_USERS,
        FeaturePermission.MANAGE_PRESENCE,
        FeaturePermission.VIEW_PRESENCE,
        FeaturePermission.CHECK_PRESENCE,
        FeaturePermission.BULK_PRESENCE_MANAGEMENT,
        FeaturePermission.GEOFENCING,
        FeaturePermission.VIEW_BASIC_ANALYTICS,
        FeaturePermission.VIEW_ADVANCED_ANALYTICS,
        FeaturePermission.PRESENCE_ANALYTICS,
        FeaturePermission.CUSTOM_REPORTS,
        FeaturePermission.SCHEDULED_REPORTS,
        FeaturePermission.EXPORT_DATA,
        FeaturePermission.MANAGE_INTEGRATIONS,
        FeaturePermission.CUSTOM_BRANDING,
        FeaturePermission.API_ACCESS,
        FeaturePermission.WEBHOOK_ACCESS,
        FeaturePermission.THIRD_PARTY_INTEGRATIONS
    ],

    [PlanType.ENTERPRISE]: [
        // Toutes les permissions (pas de limitation)
    ]
};



export class PermissionService {

    /**
     * Crée un contexte utilisateur complet avec toutes les informations de permissions
     */
    static createUserContext(
        userId: string,
        tenantRole: TenantRole,
        applicationRole?: string,
        permissions: string[] = [],
        planFeatures: Record<string, any> = {},
        planLimits: Record<string, any> = {}
    ): UserContext {
        // Obtenir les permissions par défaut du rôle
        const defaultRolePermissions = this.getDefaultRolePermissions(tenantRole);

        // Convertir les permissions string en FeaturePermission
        const customFeaturePermissions = permissions
            .filter(p => Object.values(FeaturePermission).includes(p as FeaturePermission))
            .map(p => p as FeaturePermission);

        // Combiner les permissions par défaut et personnalisées
        const allFeaturePermissions = [...new Set([...defaultRolePermissions, ...customFeaturePermissions])];

        // Déterminer le type de plan basé sur les fonctionnalités
        let planType = PlanType.FREE;
        if (planFeatures.customBranding || planFeatures.apiAccess) {
            planType = PlanType.PRO;
        } else if (planFeatures.advancedReporting) {
            planType = PlanType.BASIC;
        }
        if (planFeatures.prioritySupport) {
            planType = PlanType.ENTERPRISE;
        }

        // Calculer les permissions effectives en tenant compte du plan
        const effectivePermissions = this.getEffectivePermissions(
            tenantRole,
            allFeaturePermissions,
            planType
        );

        // Convertir les objets génériques en types spécifiques
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
            effectivePermissions,
            planFeatures: typedPlanFeatures,
            planLimits: typedPlanLimits
        };
    }

    /**
     * Vérifie si un contexte utilisateur a une permission tenant spécifique
     */
    static hasTenantPermission(
        userContext: UserContext,
        minimumRole: TenantRole,
        specificPermission?: FeaturePermission
    ): boolean {
        // Vérifier la hiérarchie des rôles
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

        // Si une permission spécifique est requise, la vérifier aussi
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

    /**
     * Obtient toutes les permissions manquantes pour un contexte utilisateur
     */
    static getMissingPermissionsForContext(
        userContext: UserContext,
        requiredPermissions: FeaturePermission[]
    ): FeaturePermission[] {
        return requiredPermissions.filter(permission =>
            !userContext.effectivePermissions.includes(permission)
        );
    }

    /**
     * Vérifie si un contexte utilisateur peut accéder à une fonctionnalité du plan
     */
    static canAccessPlanFeature(
        userContext: UserContext,
        featureName: string
    ): boolean {
        return !!userContext.planFeatures[featureName];
    }

    /**
     * Vérifie si un contexte utilisateur a atteint une limite du plan
     */
    static hasExceededPlanLimit(
        userContext: UserContext,
        limitName: string,
        currentUsage: number
    ): boolean {
        const limit = userContext.planLimits[limitName];
        if (limit === -1) return false; // Unlimited
        return currentUsage >= limit;
    }

    /**
     * Obtient les permissions par défaut d'un rôle
     */
    static getDefaultRolePermissions(role: TenantRole): FeaturePermission[] {
        return DEFAULT_ROLE_PERMISSIONS[role] || [];
    }

    /**
     * Calcule les permissions effectives d'un utilisateur
     * Permissions = (Permissions du rôle + Permissions custom) ∩ Limitations du plan
     */
    static getEffectivePermissions(
        role: TenantRole,
        customPermissions: FeaturePermission[] = [],
        planType: PlanType
    ): FeaturePermission[] {
        // 1. Permissions du rôle + permissions custom
        const rolePermissions = this.getDefaultRolePermissions(role);
        const allPermissions = [...new Set([...rolePermissions, ...customPermissions])];

        // 2. Appliquer les limitations du plan
        if (planType === PlanType.ENTERPRISE) {
            // Enterprise = pas de limitation
            return allPermissions;
        }

        const planLimits = PLAN_PERMISSION_LIMITS[planType] || [];

        // Intersection des permissions avec les limitations du plan
        return allPermissions.filter(permission => planLimits.includes(permission));
    }

    /**
     * Vérifie si un utilisateur a une permission spécifique
     */
    static hasPermission(
        role: TenantRole,
        customPermissions: FeaturePermission[] = [],
        planType: PlanType,
        requiredPermission: FeaturePermission
    ): boolean {
        const effectivePermissions = this.getEffectivePermissions(role, customPermissions, planType);
        return effectivePermissions.includes(requiredPermission);
    }

    /**
     * Vérifie si un utilisateur a toutes les permissions requises
     */
    static hasAllPermissions(
        role: TenantRole,
        customPermissions: FeaturePermission[] = [],
        planType: PlanType,
        requiredPermissions: FeaturePermission[]
    ): boolean {
        const effectivePermissions = this.getEffectivePermissions(role, customPermissions, planType);
        return requiredPermissions.every(permission => effectivePermissions.includes(permission));
    }

    /**
     * Vérifie si un utilisateur a au moins une des permissions requises
     */
    static hasAnyPermission(
        role: TenantRole,
        customPermissions: FeaturePermission[] = [],
        planType: PlanType,
        requiredPermissions: FeaturePermission[]
    ): boolean {
        const effectivePermissions = this.getEffectivePermissions(role, customPermissions, planType);
        return requiredPermissions.some(permission => effectivePermissions.includes(permission));
    }

    /**
     * Obtient les permissions manquantes pour un utilisateur
     */
    static getMissingPermissions(
        role: TenantRole,
        customPermissions: FeaturePermission[] = [],
        planType: PlanType,
        requiredPermissions: FeaturePermission[]
    ): FeaturePermission[] {
        const effectivePermissions = this.getEffectivePermissions(role, customPermissions, planType);
        return requiredPermissions.filter(permission => !effectivePermissions.includes(permission));
    }

    /**
     * Middleware pour vérifier une permission
     */
    static requirePermission(permission: FeaturePermission) {
        return (req: any, res: any, next: any) => {
            const { tenantRole, customPermissions = [], planType } = req.user || {};

            if (!tenantRole || !planType) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            if (this.hasPermission(tenantRole, customPermissions, planType, permission)) {
                next();
            } else {
                res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions',
                    code: 'PERMISSION_DENIED',
                    required: permission,
                    userRole: tenantRole,
                    userPlan: planType
                });
            }
        };
    }

    /**
     * Middleware pour vérifier plusieurs permissions (toutes requises)
     */
    static requireAllPermissions(permissions: FeaturePermission[]) {
        return (req: any, res: any, next: any) => {
            const { tenantRole, customPermissions = [], planType } = req.user || {};

            if (!tenantRole || !planType) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            if (this.hasAllPermissions(tenantRole, customPermissions, planType, permissions)) {
                next();
            } else {
                const missing = this.getMissingPermissions(tenantRole, customPermissions, planType, permissions);
                res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions',
                    code: 'PERMISSION_DENIED',
                    required: permissions,
                    missing: missing,
                    userRole: tenantRole,
                    userPlan: planType
                });
            }
        };
    }

    /**
     * Middleware pour vérifier au moins une permission
     */
    static requireAnyPermission(permissions: FeaturePermission[]) {
        return (req: any, res: any, next: any) => {
            const { tenantRole, customPermissions = [], planType } = req.user || {};

            if (!tenantRole || !planType) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            if (this.hasAnyPermission(tenantRole, customPermissions, planType, permissions)) {
                next();
            } else {
                res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions',
                    code: 'PERMISSION_DENIED',
                    required: permissions,
                    userRole: tenantRole,
                    userPlan: planType
                });
            }
        };
    }
}

export default PermissionService;