/**
 * Index des middlewares - Point d'entrée centralisé
 */

import { auditPresenceAction, clockingRateLimit, detectSuspiciousClocking, managementRateLimit, reportGenerationRateLimit, validateLocationIntegrity, validateSensitiveDataAccess } from './presence-security.middleware';
import { authenticateToken, authorize, authRateLimit, constantTimeResponse, generalRateLimit, sanitizeInput, securityLogger, strictRateLimit, validatePresenceData } from './security.middleware';

// Rate limiting
export { 
  rateLimit, 
  rateLimitConfigs, 
  cleanupRateLimits 
} from './rateLimit';

// Security middlewares
export {
  corsOptions,
  helmetOptions,
  generalRateLimit,
  strictRateLimit,
  authRateLimit,
  authenticateToken,
  authorize,
  validateAccess,
  validatePresenceData,
  encryptSensitiveFields,
  securityLogger,
  sanitizeInput,
  constantTimeResponse,
  securityMiddleware,
  authMiddleware,
  presenceSecurityMiddleware
} from './security.middleware';

// Presence security middlewares
export {
  clockingRateLimit,
  managementRateLimit,
  reportGenerationRateLimit,
  validationRateLimit,
  correctionRateLimit,
  detectSuspiciousClocking,
  validateLocationIntegrity,
  auditPresenceAction,
  validateSensitiveDataAccess,
  preventTimingAttacks,
  cleanupSecurityData
} from './presence-security.middleware';


export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

// Utilitaires pour les middlewares
export const middlewareUtils = {
  /**
   * Combine plusieurs middlewares en un seul
   */
  combine: (...middlewares: Array<(req: any, res: any, next: any) => void>) => {
    return (req: any, res: any, next: any) => {
      let index = 0;
      
      const runNext = (err?: any) => {
        if (err) {return next(err);}
        
        if (index >= middlewares.length) {
          return next();
        }
        
        const middleware = middlewares[index++];
        try {
          middleware(req, res, runNext);
        } catch (error) {
          next(error);
        }
      };
      
      runNext();
    };
  },

  /**
   * Middleware conditionnel
   */
  conditional: (
    condition: (req: any) => boolean,
    middleware: (req: any, res: any, next: any) => void
  ) => {
    return (req: any, res: any, next: any) => {
      if (condition(req)) {
        return middleware(req, res, next);
      }
      next();
    };
  },

  /**
   * Middleware avec timeout
   */
  withTimeout: (
    middleware: (req: any, res: any, next: any) => void,
    timeoutMs: number = 5000
  ) => {
    return (req: any, res: any, next: any) => {
      let finished = false;
      
      const timeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          next(new Error('Middleware timeout'));
        }
      }, timeoutMs);
      
      const wrappedNext = (err?: any) => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          next(err);
        }
      };
      
      try {
        middleware(req, res, wrappedNext);
      } catch (error) {
        wrappedNext(error);
      }
    };
  }
};

// Presets de middlewares pour différents types de routes
export const middlewarePresets = {
  // Pour les routes publiques (sans auth)
  public: [
    generalRateLimit,
    securityLogger,
    sanitizeInput
  ],

  // Pour les routes d'authentification
  auth: [
    authRateLimit,
    securityLogger,
    sanitizeInput,
    constantTimeResponse
  ],

  // Pour les routes protégées standard
  protected: [
    generalRateLimit,
    authenticateToken,
    securityLogger,
    sanitizeInput
  ],

  // Pour les routes de présence
  presence: [
    clockingRateLimit,
    authenticateToken,
    validatePresenceData,
    detectSuspiciousClocking,
    validateLocationIntegrity,
    auditPresenceAction,
    securityLogger
  ],

  // Pour les routes de gestion
  management: [
    managementRateLimit,
    authenticateToken,
    validateSensitiveDataAccess,
    auditPresenceAction,
    securityLogger
  ],

  // Pour les routes de rapports
  reports: [
    reportGenerationRateLimit,
    authenticateToken,
    validateSensitiveDataAccess,
    auditPresenceAction,
    securityLogger
  ],

  // Pour les routes admin
  admin: [
    strictRateLimit,
    authenticateToken,
    authorize(['admin']),
    validateSensitiveDataAccess,
    auditPresenceAction,
    securityLogger
  ]
};