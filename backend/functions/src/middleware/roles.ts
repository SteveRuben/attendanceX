import { TenantRole } from '../common/types';
import { AuthenticatedRequest } from '../types/middleware.types';
import { NextFunction, Response } from 'express';


/**
 * Middleware pour vérifier les rôles utilisateur
 */
export const requireRole = (allowedRoles: TenantRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
};

/**
 * Middleware pour vérifier si l'utilisateur est admin
 */
export const requireAdmin = requireRole([TenantRole.ADMIN]);

/**
 * Middleware pour vérifier si l'utilisateur est admin ou manager
 */
export const requireManagerOrAdmin = requireRole([TenantRole.ADMIN, TenantRole.OWNER, TenantRole.MANAGER]);

/**
 * Middleware pour vérifier si l'utilisateur est organizer, manager ou admin
 */
export const requireOrganizerOrAbove = requireRole([TenantRole.ADMIN, TenantRole.MANAGER, TenantRole.OWNER]);