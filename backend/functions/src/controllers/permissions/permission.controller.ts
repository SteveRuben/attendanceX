import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { PermissionService } from "../../services/permissions/permission.service";
import { AuthenticatedRequest } from "../../types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";
import { 
  TenantRole
} from "../../common/types";

export class PermissionController {

  /**
   * GET /permissions/context/:userId
   * Get user permission context
   */
  static getUserContext = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params.userId as string;
    const tenantId = req.user?.tenantId;

    try {
      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const tenantRole = TenantRole.MEMBER; // Placeholder
      
      const userContext = PermissionService.createUserContext(
        userId,
        tenantId,
        tenantRole
      );

      res.json({
        success: true,
        data: userContext
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting user context:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get user context");
    }
  });

  /**
   * POST /permissions/check
   * Check if user has specific permission
   */
  static checkPermission = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId, permission } = req.body;
    const tenantId = req.user?.tenantId;

    try {
      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const tenantRole = TenantRole.MEMBER; // Placeholder

      const hasPermission = PermissionService.hasPermission(
        tenantRole,
        [],
        permission
      );

      res.json({
        success: true,
        data: {
          userId,
          permission,
          hasPermission
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error checking permission:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to check permission");
    }
  });

  /**
   * GET /permissions/roles/:role
   * Get permissions for a specific role
   */
  static getPermissionsForRole = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const role = req.params.role as string;
      const permissions = PermissionService.getDefaultRolePermissions(role as TenantRole);

      res.json({
        success: true,
        data: {
          role,
          permissions
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting permissions for role:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get permissions for role");
    }
  });

  /**
   * GET /permissions/plans/:planType/features
   * Get features available for a specific plan type
   */
  static getFeaturesForPlan = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const planType = req.params.planType as string;

      // For now, return basic features based on plan type
      const features = {
        free: {
          maxUsers: 10,
          maxEvents: 5,
          basicReporting: true,
          emailSupport: true
        },
        pro: {
          maxUsers: 100,
          maxEvents: 50,
          advancedReporting: true,
          prioritySupport: true,
          apiAccess: true
        },
        enterprise: {
          maxUsers: -1,
          maxEvents: -1,
          advancedReporting: true,
          prioritySupport: true,
          apiAccess: true,
          customBranding: true,
          ssoIntegration: true
        }
      };

      const planFeatures = features[planType as keyof typeof features] || features.free;

      res.json({
        success: true,
        data: {
          planType,
          features: planFeatures
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting features for plan:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get plan features");
    }
  });
}