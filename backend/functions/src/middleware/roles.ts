import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@attendance-x/shared';

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    organizationId: string;
  };
}

/**
 * Middleware pour vérifier les rôles utilisateur
 */
export const requireRole = (allowedRoles: UserRole[]) => {
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
export const requireAdmin = requireRole([UserRole.ADMIN]);

/**
 * Middleware pour vérifier si l'utilisateur est admin ou manager
 */
export const requireManagerOrAdmin = requireRole([UserRole.ADMIN, UserRole.MANAGER]);

/**
 * Middleware pour vérifier si l'utilisateur est organizer, manager ou admin
 */
export const requireOrganizerOrAbove = requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.ORGANIZER]);