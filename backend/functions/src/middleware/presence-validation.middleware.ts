/**
 * Middleware de validation pour la présence
 */

import { Response, NextFunction } from 'express';
import { logger } from 'firebase-functions';
import { AuthenticatedRequest } from '../types';
import { UserRole } from '@attendance-x/shared';

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

    // Vérifier les permissions pour l'accès aux données sensibles
    const hasPermission = user.role === UserRole.ADMIN || 
                         user.role === UserRole.MANAGER ;
                         //||  user.permissions.includes('presence.view_sensitive');

    if (!hasPermission) {
      logger.warn('Unauthorized sensitive data access attempt', {
        userId: user.uid,
        role: user.role,
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