/**
 * Middleware de sécurité pour la gestion de présence
 */

import { NextFunction, Response } from 'express';
import { logger } from 'firebase-functions';
import { createHash } from 'crypto';
import { rateLimit, rateLimitConfigs } from './rateLimit';
import { AuthenticatedRequest, ClockingAttempt } from '../types';
import { TenantRole } from '../common/types';


// Les interfaces sont maintenant dans ../types/middleware.types.ts

// Cache en mémoire pour les tentatives (en production, utiliser Redis)
const clockingAttempts: Map<string, ClockingAttempt[]> = new Map();
const suspiciousActivities: Map<string, number> = new Map();

/**
 * Rate limiting spécialisé pour les opérations de pointage
 */
export const clockingRateLimit = rateLimit(rateLimitConfigs.presenceClocking);

/**
 * Rate limiting pour les opérations de gestion (plus restrictif)
 */
export const managementRateLimit = rateLimit(rateLimitConfigs.presenceManagement);

/**
 * Rate limiting pour la génération de rapports
 */
export const reportGenerationRateLimit = rateLimit(rateLimitConfigs.presenceReports);

/**
 * Rate limiting pour les validations de présence
 */
export const validationRateLimit = rateLimit(rateLimitConfigs.presenceValidation);

/**
 * Rate limiting pour les corrections de présence
 */
export const correctionRateLimit = rateLimit(rateLimitConfigs.presenceCorrection);

/**
 * Middleware pour détecter les tentatives de pointage suspectes
 */
export const detectSuspiciousClocking = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const employeeId = req.params.employeeId;
    const userId = req.user?.uid;
    const ip = req.ip;
    const action = req.path.includes('clock-in') ? 'clock-in' : 'clock-out';
    const deviceFingerprint = generateDeviceFingerprint(req);

    if (!employeeId || !userId) {
      next();
      return;
    }

    const key = `${employeeId}-${userId}`;
    const now = new Date();
    const attempts = clockingAttempts.get(key) || [];

    // Nettoyer les anciennes tentatives (plus de 24h)
    const recentAttempts = attempts.filter(
      attempt => now.getTime() - attempt.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    // Détecter les patterns suspects
    const suspiciousPatterns = detectSuspiciousPatterns(recentAttempts, {
      employeeId,
      userId,
      ip,
      action,
      deviceFingerprint,
      timestamp: now
    });

    if (suspiciousPatterns.length > 0) {
      logger.warn('Suspicious clocking pattern detected', {
        employeeId,
        userId,
        ip,
        patterns: suspiciousPatterns,
        deviceFingerprint
      });

      // Augmenter le compteur d'activités suspectes
      const suspiciousCount = suspiciousActivities.get(key) || 0;
      suspiciousActivities.set(key, suspiciousCount + 1);

      // Si trop d'activités suspectes, bloquer temporairement
      if (suspiciousCount >= 3) {
        res.status(429).json({
          success: false,
          error: 'Account temporarily restricted due to suspicious activity',
          code: 'ACCOUNT_RESTRICTED'
        });
        return;
      }
    }

    // Enregistrer la tentative
    const attempt: ClockingAttempt = {
      employeeId,
      userId,
      ip,
      timestamp: now,
      action,
      success: false, // Sera mis à jour après la réponse
      deviceFingerprint
    };

    recentAttempts.push(attempt);
    clockingAttempts.set(key, recentAttempts);

    // Ajouter l'information à la requête pour le logging ultérieur
    (req as any).clockingAttempt = attempt;

    next();

  } catch (error) {
    logger.error('Suspicious clocking detection failed', { error });
    next(); // Continuer même en cas d'erreur
  }
};

/**
 * Middleware pour valider l'intégrité des données de géolocalisation
 */
export const validateLocationIntegrity = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const location = req.body.location;

    if (!location) {
      next();
      return;
    }

    // Vérifier la cohérence des données de géolocalisation
    const inconsistencies = [];

    // Vérifier la précision par rapport à la vitesse (si disponible)
    if (location.accuracy && location.speed !== undefined) {
      if (location.accuracy > 1000 && location.speed < 1) {
        inconsistencies.push('High inaccuracy with low speed');
      }
    }

    // Vérifier les coordonnées impossibles
    if (location.latitude === 0 && location.longitude === 0) {
      inconsistencies.push('Null Island coordinates');
    }

    // Vérifier les coordonnées trop précises (possiblement falsifiées)
    if (location.accuracy && location.accuracy < 1) {
      inconsistencies.push('Unrealistically high accuracy');
    }

    // Vérifier l'altitude si disponible
    if (location.altitude !== undefined) {
      if (location.altitude < -500 || location.altitude > 10000) {
        inconsistencies.push('Unrealistic altitude');
      }
    }

    if (inconsistencies.length > 0) {
      logger.warn('Location data inconsistencies detected', {
        employeeId: req.params.employeeId,
        userId: req.user?.uid,
        inconsistencies,
        location
      });

      // Ne pas bloquer, mais marquer comme suspect
      (req as any).locationSuspicious = true;
    }

    next();

  } catch (error) {
    logger.error('Location integrity validation failed', { error });
    next();
  }
};

/**
 * Middleware pour l'audit des actions de présence
 */
export const auditPresenceAction = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const originalSend = res.send;
  const startTime = Date.now();

  res.send = function (data) {
    try {
      const duration = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 300;

      // Mettre à jour la tentative de pointage si elle existe
      const attempt = (req as any).clockingAttempt;
      if (attempt) {
        attempt.success = success;
      }

      // Logger l'action
      const auditData = {
        userId: req.user?.uid,
        employeeId: req.params.employeeId,
        action: getActionFromRequest(req),
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success,
        statusCode: res.statusCode,
        duration,
        timestamp: new Date().toISOString(),
        location: req.body.location ? {
          latitude: req.body.location.latitude,
          longitude: req.body.location.longitude,
          accuracy: req.body.location.accuracy,
          suspicious: (req as any).locationSuspicious
        } : undefined,
        deviceFingerprint: generateDeviceFingerprint(req)
      };

      // Logger selon le niveau approprié
      if (success) {
        logger.info('Presence action completed', auditData);
      } else {
        logger.warn('Presence action failed', auditData);
      }

      // Logger les actions sensibles séparément
      if (isSensitiveAction(req)) {
        logger.info('Sensitive presence action', {
          ...auditData,
          sensitive: true
        });
      }

    } catch (error) {
      logger.error('Audit logging failed', { error });
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Middleware pour valider les permissions sur les données sensibles
 */
export const validateSensitiveDataAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const userId = req.user?.uid;
    const userRole = req.user?.role;
    const employeeId = req.params.employeeId;
    const organizationId = req.params.organizationId;

    // Vérifier l'accès aux données d'autres employés
    if (employeeId && userRole !== TenantRole.ADMIN && userRole !== TenantRole.MANAGER && userRole !== TenantRole.OWNER) {
      // Les employés ne peuvent accéder qu'à leurs propres données
      // Cette vérification sera complétée par validateEmployeeMiddleware
    }

    // Vérifier l'accès aux données d'organisation
    if (organizationId && userRole !== TenantRole.ADMIN && userRole !== TenantRole.OWNER) {
      // Vérifier que l'utilisateur appartient à cette organisation
      // TODO: Implémenter la vérification d'appartenance à l'organisation
    }

    // Logger l'accès aux données sensibles
    if (isSensitiveDataAccess(req)) {
      logger.info('Sensitive data access', {
        userId,
        userRole,
        employeeId,
        organizationId,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
    }

    next();

  } catch (error) {
    logger.error('Sensitive data access validation failed', { error });
    res.status(500).json({
      success: false,
      error: 'Internal security error',
      code: 'SECURITY_ERROR'
    });
  }
};

/**
 * Middleware pour prévenir les attaques de timing
 */
export const preventTimingAttacks = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const originalSend = res.send;
  const minResponseTime = 100; // Minimum 100ms de réponse
  const startTime = Date.now();

  res.send = function (data) {
    const elapsed = Date.now() - startTime;
    const delay = Math.max(0, minResponseTime - elapsed);

    if (delay > 0) {
      setTimeout(() => {
        originalSend.call(this, data);
      }, delay);
    } else {
      originalSend.call(this, data);
    }
    return this;
  };

  next();
};

// Fonctions utilitaires

function generateDeviceFingerprint(req: AuthenticatedRequest): string {
  const components = [
    req.get('User-Agent') || '',
    req.get('Accept-Language') || '',
    req.get('Accept-Encoding') || '',
    req.ip || ''
  ];

  return createHash('sha256')
    .update(components.join('|'))
    .digest('hex')
    .substring(0, 16);
}

function detectSuspiciousPatterns(
  attempts: ClockingAttempt[],
  currentAttempt: Partial<ClockingAttempt>
): string[] {
  const patterns: string[] = [];

  // Pattern 1: Trop de tentatives en peu de temps
  const recentAttempts = attempts.filter(
    attempt => currentAttempt.timestamp!.getTime() - attempt.timestamp.getTime() < 5 * 60 * 1000
  );

  if (recentAttempts.length >= 3) {
    patterns.push('RAPID_ATTEMPTS');
  }

  // Pattern 2: Changement d'IP fréquent
  const uniqueIPs = new Set(attempts.slice(-10).map(attempt => attempt.ip));
  if (uniqueIPs.size >= 3) {
    patterns.push('MULTIPLE_IPS');
  }

  // Pattern 3: Changement de dispositif fréquent
  const uniqueDevices = new Set(
    attempts.slice(-10)
      .map(attempt => attempt.deviceFingerprint)
      .filter(fp => fp)
  );
  if (uniqueDevices.size >= 3) {
    patterns.push('MULTIPLE_DEVICES');
  }

  // Pattern 4: Tentatives à des heures inhabituelles
  const hour = currentAttempt.timestamp!.getHours();
  if (hour < 5 || hour > 23) {
    patterns.push('UNUSUAL_HOURS');
  }

  return patterns;
}

function getActionFromRequest(req: AuthenticatedRequest): string {
  if (req.path.includes('clock-in')) { return 'clock_in'; }
  if (req.path.includes('clock-out')) { return 'clock_out'; }
  if (req.path.includes('breaks/start')) { return 'break_start'; }
  if (req.path.includes('breaks/end')) { return 'break_end'; }
  if (req.path.includes('validate')) { return 'validate_entry'; }
  if (req.path.includes('correct')) { return 'correct_entry'; }
  if (req.path.includes('reports')) { return 'generate_report'; }
  if (req.method === 'PUT' && req.path.includes('entries')) { return 'update_entry'; }
  if (req.method === 'GET' && req.path.includes('status')) { return 'get_status'; }
  return 'unknown';
}

function isSensitiveAction(req: AuthenticatedRequest): boolean {
  return req.path.includes('correct') ||
    req.path.includes('validate') ||
    req.path.includes('reports') ||
    (req.method === 'PUT' && req.path.includes('entries'));
}

function isSensitiveDataAccess(req: AuthenticatedRequest): boolean {
  return req.path.includes('anomalies') ||
    req.path.includes('stats') ||
    req.path.includes('reports') ||
    req.path.includes('currently-present');
}

// Fonction de nettoyage périodique (à appeler via un cron job)
export function cleanupSecurityData(): void {
  const now = new Date();
  const maxAge = 24 * 60 * 60 * 1000; // 24 heures

  // Nettoyer les tentatives de pointage anciennes
  for (const [key, attempts] of clockingAttempts.entries()) {
    const recentAttempts = attempts.filter(
      attempt => now.getTime() - attempt.timestamp.getTime() < maxAge
    );

    if (recentAttempts.length === 0) {
      clockingAttempts.delete(key);
    } else {
      clockingAttempts.set(key, recentAttempts);
    }
  }

  // Nettoyer les compteurs d'activités suspectes
  suspiciousActivities.clear();

  logger.info('Security data cleanup completed', {
    remainingAttempts: clockingAttempts.size,
    timestamp: now.toISOString()
  });
}