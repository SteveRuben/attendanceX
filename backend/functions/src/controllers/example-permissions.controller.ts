/**
 * Exemple d'utilisation du système de permissions simplifié
 * TenantRole + FeaturePermission
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types/middleware.types';
import { asyncAuthHandler } from '../middleware/errorHandler';
import { PermissionService } from '../services/permissions';
import { FeaturePermission, TenantRole, PlanType } from '../common/types';

export class ExamplePermissionsController {

  /**
   * Exemple 1: Vérification d'une permission simple
   */
  static getUsers = [
    PermissionService.requirePermission(FeaturePermission.VIEW_USERS),
    asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
      // L'utilisateur a la permission VIEW_USERS
      res.json({
        success: true,
        message: "User has VIEW_USERS permission",
        data: []
      });
    })
  ];

  /**
   * Exemple 2: Vérification de plusieurs permissions (toutes requises)
   */
  static manageUsers = [
    PermissionService.requireAllPermissions([
      FeaturePermission.MANAGE_USERS,
      FeaturePermission.VIEW_USERS
    ]),
    asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
      // L'utilisateur a toutes les permissions requises
      res.json({
        success: true,
        message: "User has all required permissions",
        data: []
      });
    })
  ];

  /**
   * Exemple 3: Vérification d'au moins une permission
   */
  static viewAnalytics = [
    PermissionService.requireAnyPermission([
      FeaturePermission.VIEW_BASIC_ANALYTICS,
      FeaturePermission.VIEW_ADVANCED_ANALYTICS
    ]),
    asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
      // L'utilisateur a au moins une des permissions requises
      res.json({
        success: true,
        message: "User has analytics permission",
        data: []
      });
    })
  ];

  /**
   * Exemple 4: Vérification manuelle des permissions
   */
  static customPermissionCheck = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { role, featurePermissions = [], applicationRole } = req.user || {};

    // Vérification manuelle
    const canExportData = PermissionService.hasPermission(
      role as TenantRole,
      featurePermissions as FeaturePermission[],
      applicationRole as PlanType,
      FeaturePermission.EXPORT_DATA
    );

    if (!canExportData) {
      return res.status(403).json({
        success: false,
        error: 'Cannot export data',
        userRole: role,
        userPlan: applicationRole
      });
    }

    return res.json({
      success: true,
      message: "User can export data",
      data: []
    });
  });

  /**
   * Exemple 5: Obtenir les permissions effectives d'un utilisateur
   */
  static getUserPermissions = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { role, featurePermissions, applicationRole } = req.user || {};

    const effectivePermissions = PermissionService.getEffectivePermissions(
        role as TenantRole,
        featurePermissions as FeaturePermission[],
      applicationRole as PlanType
    );

    const defaultRolePermissions = PermissionService.getDefaultRolePermissions(role as TenantRole);

    res.json({
      success: true,
      data: {
        userRole: role,
        userPlan: applicationRole,
        featurePermissions,
        defaultRolePermissions,
        effectivePermissions,
        totalPermissions: effectivePermissions.length
      }
    });
  });

  /**
   * Exemple 6: Vérifier les permissions manquantes
   */
  static checkMissingPermissions = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { role, featurePermissions = [], applicationRole } = req.user || {};
    const { requiredPermissions } = req.body;

    const missingPermissions = PermissionService.getMissingPermissions(
        role as TenantRole,
      featurePermissions as FeaturePermission[],
      applicationRole as PlanType,
      requiredPermissions
    );

    res.json({
      success: true,
      data: {
        requiredPermissions,
        missingPermissions,
        hasAllPermissions: missingPermissions.length === 0
      }
    });
  });

  /**
   * Exemple 7: Permissions par rôle et plan
   */
  static getPermissionMatrix = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const matrix: any = {};

    // Pour chaque rôle
    Object.values(TenantRole).forEach(role => {
      matrix[role] = {};
      
      // Pour chaque plan
      Object.values(PlanType).forEach(plan => {
        matrix[role][plan] = PermissionService.getEffectivePermissions(
          role,
          [], // Pas de permissions custom
          plan
        );
      });
    });

    res.json({
      success: true,
      data: {
        permissionMatrix: matrix,
        availableRoles: Object.values(TenantRole),
        availablePlans: Object.values(PlanType),
        availablePermissions: Object.values(FeaturePermission)
      }
    });
  });
}

export default ExamplePermissionsController;