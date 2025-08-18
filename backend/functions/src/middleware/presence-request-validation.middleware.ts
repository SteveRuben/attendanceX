/**
 * Middlewares de validation des requêtes de présence
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types/middleware.types';
import { collections } from '../config';
import { logger } from 'firebase-functions';
import { UserRole } from '@attendance-x/shared';

// Schémas de validation Zod
const ClockInSchema = z.object({
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().positive().optional(),
    timestamp: z.string().datetime().optional()
  }).optional(),
  note: z.string().max(500).optional(),
  workSiteId: z.string().optional()
});

const ClockOutSchema = z.object({
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().positive().optional(),
    timestamp: z.string().datetime().optional()
  }).optional(),
  note: z.string().max(500).optional()
});

const BreakSchema = z.object({
  type: z.enum(['lunch', 'coffee', 'personal', 'other']).optional(),
  note: z.string().max(500).optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().positive().optional()
  }).optional()
});

/**
 * Middleware pour valider l'existence et les permissions sur un employé
 */
export const validateEmployeeMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const user = req.user;

    if (!employeeId) {
      res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
      return;
    }

    // Vérifier que l'employé existe
    const employeeDoc = await collections.employees.doc(employeeId).get();
    if (!employeeDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
      return;
    }

    const employeeData = employeeDoc.data();
    
    // Vérifier les permissions
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER) {
      // Les employés ne peuvent accéder qu'à leurs propres données
      if (employeeData?.userId !== user.uid) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }
    }

    // Ajouter les données de l'employé à la requête
    req.employee = employeeData;
    next();
  } catch (error) {
    logger.error('Error validating employee', { error, employeeId: req.params.employeeId });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Middleware pour valider une requête de clock-in
 */
export const validateClockInRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const result = ClockInSchema.safeParse(req.body);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: result.error.errors
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error validating clock-in request', { error });
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
};

/**
 * Middleware pour valider une requête de clock-out
 */
export const validateClockOutRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const result = ClockOutSchema.safeParse(req.body);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: result.error.errors
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error validating clock-out request', { error });
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
};

/**
 * Middleware pour valider une requête de début de pause
 */
export const validateStartBreakRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const result = BreakSchema.safeParse(req.body);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: result.error.errors
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error validating start break request', { error });
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
};

/**
 * Middleware pour valider une requête de fin de pause
 */
export const validateEndBreakRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const result = BreakSchema.safeParse(req.body);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: result.error.errors
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error validating end break request', { error });
    res.status(500).json({
      success: false,
      error: 'Validation error'
    });
  }
};

/**
 * Middleware pour nettoyer et valider les données de présence
 */
export const sanitizePresenceData = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Nettoyer les données d'entrée
    if (req.body.note) {
      req.body.note = req.body.note.trim().substring(0, 500);
    }

    if (req.body.location) {
      // Arrondir les coordonnées à 6 décimales (précision ~10cm)
      if (req.body.location.latitude) {
        req.body.location.latitude = Math.round(req.body.location.latitude * 1000000) / 1000000;
      }
      if (req.body.location.longitude) {
        req.body.location.longitude = Math.round(req.body.location.longitude * 1000000) / 1000000;
      }
    }

    next();
  } catch (error) {
    logger.error('Error sanitizing presence data', { error });
    res.status(500).json({
      success: false,
      error: 'Data sanitization error'
    });
  }
};

/**
 * Middleware pour valider les coordonnées GPS
 */
export const validateCoordinates = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { location } = req.body;

    if (location) {
      const { latitude, longitude } = location;

      // Vérifier que les coordonnées sont dans les limites valides
      if (latitude < -90 || latitude > 90) {
        res.status(400).json({
          success: false,
          error: 'Invalid latitude. Must be between -90 and 90'
        });
        return;
      }

      if (longitude < -180 || longitude > 180) {
        res.status(400).json({
          success: false,
          error: 'Invalid longitude. Must be between -180 and 180'
        });
        return;
      }

      // Vérifier que les coordonnées ne sont pas (0,0) sauf si explicitement autorisé
      if (latitude === 0 && longitude === 0) {
        logger.warn('Suspicious coordinates (0,0) detected', {
          userId: (req as AuthenticatedRequest).user?.uid,
          employeeId: req.params.employeeId
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Error validating coordinates', { error });
    res.status(500).json({
      success: false,
      error: 'Coordinate validation error'
    });
  }
};

/**
 * Middleware pour valider les paramètres de requête de présence
 */
export const validatePresenceQueryParams = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { startDate, endDate, limit, offset } = req.query;

    // Valider les dates
    if (startDate && isNaN(Date.parse(startDate as string))) {
      res.status(400).json({
        success: false,
        error: 'Invalid start date format'
      });
      return;
    }

    if (endDate && isNaN(Date.parse(endDate as string))) {
      res.status(400).json({
        success: false,
        error: 'Invalid end date format'
      });
      return;
    }

    // Valider la pagination
    if (limit && (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 1000)) {
      res.status(400).json({
        success: false,
        error: 'Invalid limit. Must be between 1 and 1000'
      });
      return;
    }

    if (offset && (isNaN(Number(offset)) || Number(offset) < 0)) {
      res.status(400).json({
        success: false,
        error: 'Invalid offset. Must be 0 or greater'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error validating query parameters', { error });
    res.status(500).json({
      success: false,
      error: 'Query parameter validation error'
    });
  }
};

// Middlewares supplémentaires (stubs pour éviter les erreurs)
export const validateLocationMiddleware = (req: Request, res: Response, next: NextFunction): void => next();
export const validateWorkingHoursMiddleware = (req: Request, res: Response, next: NextFunction): void => next();
export const preventDuplicateClockingMiddleware = (req: Request, res: Response, next: NextFunction): void => next();
export const validatePresenceEntryPermissions = (req: Request, res: Response, next: NextFunction): void => next();
export const validateUpdatePresenceEntry = (req: Request, res: Response, next: NextFunction): void => next();
export const validatePresenceEntryValidation = (req: Request, res: Response, next: NextFunction): void => next();
export const validatePresenceEntryCorrection = (req: Request, res: Response, next: NextFunction): void => next();
export const validateDateRange = (req: Request, res: Response, next: NextFunction): void => next();
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => next();
export const validateProcessEndOfDay = (req: Request, res: Response, next: NextFunction): void => next();