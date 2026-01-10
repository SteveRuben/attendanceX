/**
 * Middleware de validation pour la présence
 */

import { NextFunction, Response } from 'express';
import { logger } from 'firebase-functions';
import { AuthenticatedRequest } from '../types/middleware.types';

/**
 * Middleware pour valider l'intégrité de la localisation
 */
export const validateLocationIntegrity = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const { location } = req.body;

    if (location) {
      // Validation de base de la localisation
      if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        res.status(400).json({
          success: false,
          error: 'Invalid location data: latitude and longitude must be numbers'
        });
        return;
      }

      // Vérifier les limites géographiques valides
      if (location.latitude < -90 || location.latitude > 90) {
        res.status(400).json({
          success: false,
          error: 'Invalid latitude: must be between -90 and 90'
        });
        return;
      }

      if (location.longitude < -180 || location.longitude > 180) {
        res.status(400).json({
          success: false,
          error: 'Invalid longitude: must be between -180 and 180'
        });
        return;
      }

      // Vérifier la précision si fournie
      if (location.accuracy && (location.accuracy < 0 || location.accuracy > 10000)) {
        res.status(400).json({
          success: false,
          error: 'Invalid accuracy: must be between 0 and 10000 meters'
        });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('Error in location validation middleware', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error during location validation'
    });
  }
};

/**
 * Middleware pour valider l'accès aux données sensibles
 */
export const validateSensitiveDataAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required for sensitive data access'
      });
      return;
    }

    // Vérifier que l'utilisateur a un rôle suffisant (MANAGER ou plus élevé)
    // Note: Role checking now requires tenant context - this middleware needs updating
    // TODO: Update to use tenant-based role checking
    const hasRequiredRole = false; // Temporarily disabled - needs tenant context

    if (!hasRequiredRole) {
      logger.warn('Unauthorized sensitive data access attempt - role checking disabled (needs tenant context)', {
        userId: user.uid,
        // Note: No role property - roles are tenant-specific
        path: req.path,
        ip: req.ip
      });

      res.status(403).json({
        success: false,
        error: 'Insufficient role for sensitive data access'
      });
      return;
    }

    // Vérifier les permissions de fonctionnalité en utilisant les méthodes existantes
    const tenantContext = req.tenantContext;
    const planType = tenantContext?.tenant?.planId || 'free';

    // Utiliser les méthodes existantes du PermissionService
    // Note: Role-based permission checking needs to be updated for tenant context
    const hasFeaturePermission = false; // Temporarily disabled - needs tenant-aware permission checking
    // TODO: Update to use tenant permission service

    if (!hasFeaturePermission) {
      logger.warn('Unauthorized sensitive data access attempt - permission checking disabled (needs tenant context)', {
        userId: user.uid,
        // Note: No role property - roles are tenant-specific
        planType,
        path: req.path,
        ip: req.ip
      });

      res.status(403).json({
        success: false,
        error: 'Insufficient permissions for sensitive data access'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error in sensitive data validation middleware', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error during permission validation'
    });
  }
};