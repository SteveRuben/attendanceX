/**
 * Middleware pour la gestion de présence
 */

import { Response, NextFunction } from 'express';
import { logger } from 'firebase-functions';
import { AuthenticatedRequest } from '../types';

/**
 * Middleware d'audit pour les actions de présence
 */
export const auditPresenceAction = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Log de l'action de présence pour audit
    logger.info('Presence action audit', {
      userId: req.user?.uid,
      employeeId: req.user?.employeeId,
      organizationId: req.organization?.organizationId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    next();
  } catch (error) {
    logger.error('Error in presence audit middleware', { error });
    next();
  }
};

/**
 * Middleware pour prévenir les attaques de timing
 */
export const preventTimingAttacks = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Ajouter un délai aléatoire minimal pour prévenir les attaques de timing
    const delay = Math.random() * 50; // 0-50ms
    
    setTimeout(() => {
      next();
    }, delay);
  } catch (error) {
    logger.error('Error in timing attack prevention middleware', { error });
    next();
  }
};

/**
 * Middleware d'audit spécifique à la présence
 */
export const presenceAuditMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Audit spécifique aux actions de présence
    const auditData = {
      userId: req.user?.uid,
      employeeId: req.user?.employeeId,
      organizationId: req.organization?.organizationId,
      action: `${req.method} ${req.path}`,
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.method !== 'GET' ? req.body : undefined
    };

    logger.info('Presence audit', auditData);
    next();
  } catch (error) {
    logger.error('Error in presence audit middleware', { error });
    next();
  }
};