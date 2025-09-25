/**
 * Middleware pour les permissions à deux niveaux
 * Vérifie les rôles tenant ET les permissions de fonctionnalités
 */

import { NextFunction, Response } from 'express';
import { FeaturePermission, TenantErrorCode, TenantRole } from '../common/types';
import { AuthenticatedRequest } from '../types/middleware.types';
import { PermissionService } from 'services/permissions';

export interface DualPermissionOptions {
  // Permissions tenant
  minimumTenantRole?: TenantRole;
  specificTenantPermission?: FeaturePermission;

  // Permissions de fonctionnalités
  requiredFeaturePermission?: FeaturePermission;

  // Options
  requireBoth?: boolean; // true = AND, false = OR
  gracefulDegradation?: boolean;
  customErrorMessage?: string;
}

/**
 * Middleware pour vérifier les permissions à deux niveaux
 */
export function requireDualPermission(options: DualPermissionOptions) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.tenantContext || !req.user) {
        return res.status(403).json({
          success: false,
          error: {
            code: TenantErrorCode.TENANT_ACCESS_DENIED,
            message: 'Authentication and tenant context required'
          }
        });
      }

      const userContext = PermissionService.createUserContext(
        req.user.uid,
        req.user.role,
        req.user.applicationRole,
        req.user.permissions ? Object.keys(req.user.permissions).filter(p => req.user!.permissions[p]) : [],
        req.tenantContext.plan.features,
        req.tenantContext.plan.limits
      );

      let hasTenantPermission = true;
      let hasFeaturePermission = true;

      // Vérifier les permissions tenant
      if (options.minimumTenantRole || options.specificTenantPermission) {
        hasTenantPermission = PermissionService.hasTenantPermission(
          userContext,
          options.minimumTenantRole || TenantRole.MEMBER,
          options.specificTenantPermission
        );
      }

      // Vérifier les permissions de fonctionnalités
      if (options.requiredFeaturePermission) {
        hasFeaturePermission = PermissionService.hasFeaturePermission(
          userContext,
          options.requiredFeaturePermission
        );
      }

      // Logique de combinaison
      const hasAccess = options.requireBoth !== false
        ? hasTenantPermission && hasFeaturePermission  // AND par défaut
        : hasTenantPermission || hasFeaturePermission; // OR si spécifié

      if (!hasAccess) {
        if (options.gracefulDegradation) {
          // Ajouter des informations sur les restrictions
          req.permissionRestrictions = {
            tenantPermissionDenied: !hasTenantPermission,
            featurePermissionDenied: !hasFeaturePermission,
            userContext
          };
          return next();
        }

        // Déterminer le message d'erreur approprié
        let errorMessage = options.customErrorMessage;
        if (!errorMessage) {
          if (!hasTenantPermission && !hasFeaturePermission) {
            errorMessage = 'Insufficient tenant role and feature permissions';
          } else if (!hasTenantPermission) {
            errorMessage = `Minimum tenant role required: ${options.minimumTenantRole}`;
          } else {
            errorMessage = `Feature permission required: ${options.requiredFeaturePermission}`;
          }
        }

        return res.status(403).json({
          success: false,
          error: {
            code: TenantErrorCode.FEATURE_NOT_AVAILABLE,
            message: errorMessage,
            details: {
              tenantRole: req.user.role,
              applicationRole: req.user.applicationRole,
              requiredTenantRole: options.minimumTenantRole,
              requiredFeaturePermission: options.requiredFeaturePermission
            }
          }
        });
      }

      // Ajouter le contexte utilisateur à la requête
      req.userContext = userContext;
      next();

    } catch (error) {
      console.error('Error in dual permission middleware:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check permissions'
        }
      });
    }
  };
}

/**
 * Middleware simplifié pour les permissions de fonctionnalités uniquement
 */
export function requireFeaturePermission(permission: FeaturePermission, gracefulDegradation = false) {
  return requireDualPermission({
    requiredFeaturePermission: permission,
    gracefulDegradation,
    requireBoth: false
  });
}

/**
 * Middleware simplifié pour les rôles tenant uniquement
 */
export function requireTenantRole(role: TenantRole, gracefulDegradation = false) {
  return requireDualPermission({
    minimumTenantRole: role,
    gracefulDegradation,
    requireBoth: false
  });
}

/**
 * Middleware pour les fonctionnalités avancées (tenant + feature)
 */
export function requireAdvancedFeature(
  tenantRole: TenantRole,
  featurePermission: FeaturePermission,
  gracefulDegradation = false
) {
  return requireDualPermission({
    minimumTenantRole: tenantRole,
    requiredFeaturePermission: featurePermission,
    requireBoth: true,
    gracefulDegradation
  });
}

export default {
  requireDualPermission,
  requireFeaturePermission,
  requireTenantRole,
  requireAdvancedFeature
};