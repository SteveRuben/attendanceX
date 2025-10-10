/**
 * Middleware de sécurité pour les opérations de billing
 * Gère le rate limiting, la détection de fraude et l'audit automatique
 */

import { Request, Response, NextFunction } from 'express';
import { billingAuditService, BillingAction, BillingEntityType } from '../services/billing/billingAudit.service';
import { logger } from 'firebase-functions';

export interface BillingSecurityOptions {
  action: BillingAction;
  entityType: BillingEntityType;
  rateLimitKey?: string;
  skipRateLimit?: boolean;
  skipAudit?: boolean;
  requireAuth?: boolean;
  adminOnly?: boolean;
}

/**
 * Middleware principal de sécurité billing
 */
export function billingSecurityMiddleware(options: BillingSecurityOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const startTime = Date.now();
      
      // Extraire les informations de la requête
      const tenantId = req.body.tenantId || req.params.tenantId || req.headers['x-tenant-id'];
      const userId = req.user?.uid || req.body.userId || 'anonymous';
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const sessionId = req.headers['x-session-id'] as string;
      const requestId = req.headers['x-request-id'] as string;

      // Vérification de l'authentification si requise
      if (options.requireAuth && !req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Vérification des permissions admin si requises
      if (options.adminOnly && !req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      // Vérification du rate limiting
      if (!options.skipRateLimit) {
        const rateLimitKey = options.rateLimitKey || options.action;
        const rateLimitResult = await billingAuditService.checkRateLimit(
          tenantId,
          userId,
          rateLimitKey
        );

        if (!rateLimitResult.allowed) {
          // Logger la tentative de dépassement de limite
          if (!options.skipAudit) {
            await billingAuditService.logBillingAction({
              tenantId,
              userId,
              action: BillingAction.RATE_LIMIT_EXCEEDED,
              entityType: options.entityType,
              entityId: 'rate_limit',
              metadata: {
                ipAddress,
                userAgent,
                sessionId,
                requestId,
                source: 'api',
                rateLimitKey,
                remaining: rateLimitResult.remaining,
                blocked: rateLimitResult.blocked
              },
              severity: 'medium'
            });
          }

          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            data: {
              remaining: rateLimitResult.remaining,
              resetTime: rateLimitResult.resetTime,
              blocked: rateLimitResult.blocked
            }
          });
        }

        // Ajouter les informations de rate limit aux headers de réponse
        res.set({
          'X-RateLimit-Limit': '10', // À adapter selon la configuration
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString()
        });
      }

      // Ajouter les informations de sécurité à la requête pour utilisation ultérieure
      req.billingContext = {
        tenantId,
        userId,
        action: options.action,
        entityType: options.entityType,
        metadata: {
          ipAddress,
          userAgent,
          sessionId,
          requestId,
          source: 'api',
          startTime
        },
        skipAudit: options.skipAudit || false
      };

      next();
    } catch (error) {
      logger.error('Error in billing security middleware:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal security error'
      });
    }
  };
}

/**
 * Middleware d'audit automatique pour les réponses
 */
export function billingAuditMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Intercepter la réponse pour logger l'audit
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function(body: any) {
      logBillingResponse(req, res, body);
      return originalSend.call(this, body);
    };

    res.json = function(body: any) {
      logBillingResponse(req, res, body);
      return originalJson.call(this, body);
    };

    next();
  };
}

/**
 * Logger la réponse de billing pour audit
 */
async function logBillingResponse(req: Request, res: Response, responseBody: any) {
  try {
    const context = req.billingContext;
    if (!context || context.skipAudit) return;

    const endTime = Date.now();
    const duration = endTime - context.metadata.startTime;
    const success = res.statusCode >= 200 && res.statusCode < 300;

    // Déterminer l'ID de l'entité depuis la réponse ou la requête
    const entityId = responseBody?.data?.id || 
                    req.params.id || 
                    req.body.id || 
                    'unknown';

    // Préparer les valeurs pour l'audit
    const oldValues = req.body.oldValues || undefined;
    const newValues = success ? responseBody?.data : undefined;

    await billingAuditService.logBillingAction({
      tenantId: context.tenantId,
      userId: context.userId,
      action: context.action,
      entityType: context.entityType,
      entityId,
      oldValues,
      newValues,
      metadata: {
        ...context.metadata,
        responseStatus: res.statusCode,
        responseTime: duration,
        success
      },
      severity: success ? 'low' : 'medium'
    });
  } catch (error) {
    logger.error('Error logging billing response:', error);
  }
}

/**
 * Middleware spécialisé pour les codes promo
 */
export function promoCodeSecurityMiddleware(action: 'validate' | 'apply' | 'create' | 'delete') {
  const actionMap = {
    validate: BillingAction.PROMO_CODE_VALIDATED,
    apply: BillingAction.PROMO_CODE_APPLIED,
    create: BillingAction.PROMO_CODE_CREATED,
    delete: BillingAction.PROMO_CODE_REMOVED
  };

  return billingSecurityMiddleware({
    action: actionMap[action],
    entityType: BillingEntityType.PROMO_CODE,
    rateLimitKey: `promo_code_${action}`,
    requireAuth: true,
    adminOnly: action === 'create' || action === 'delete'
  });
}

/**
 * Middleware spécialisé pour les abonnements
 */
export function subscriptionSecurityMiddleware(action: 'create' | 'update' | 'cancel' | 'renew') {
  const actionMap = {
    create: BillingAction.SUBSCRIPTION_CREATED,
    update: BillingAction.SUBSCRIPTION_UPDATED,
    cancel: BillingAction.SUBSCRIPTION_CANCELLED,
    renew: BillingAction.SUBSCRIPTION_RENEWED
  };

  return billingSecurityMiddleware({
    action: actionMap[action],
    entityType: BillingEntityType.SUBSCRIPTION,
    rateLimitKey: 'subscription_changes',
    requireAuth: true
  });
}

/**
 * Middleware spécialisé pour les paiements
 */
export function paymentSecurityMiddleware(action: 'attempt' | 'success' | 'failed' | 'refund') {
  const actionMap = {
    attempt: BillingAction.PAYMENT_ATTEMPTED,
    success: BillingAction.PAYMENT_SUCCESS,
    failed: BillingAction.PAYMENT_FAILED,
    refund: BillingAction.PAYMENT_REFUNDED
  };

  return billingSecurityMiddleware({
    action: actionMap[action],
    entityType: BillingEntityType.PAYMENT,
    rateLimitKey: 'payment_attempts',
    requireAuth: true
  });
}

/**
 * Middleware spécialisé pour les périodes de grâce
 */
export function gracePeriodSecurityMiddleware(action: 'start' | 'extend' | 'convert' | 'expire') {
  const actionMap = {
    start: BillingAction.GRACE_PERIOD_STARTED,
    extend: BillingAction.GRACE_PERIOD_EXTENDED,
    convert: BillingAction.GRACE_PERIOD_CONVERTED,
    expire: BillingAction.GRACE_PERIOD_EXPIRED
  };

  return billingSecurityMiddleware({
    action: actionMap[action],
    entityType: BillingEntityType.GRACE_PERIOD,
    requireAuth: true,
    adminOnly: action === 'extend'
  });
}

/**
 * Middleware de validation des données sensibles
 */
export function sensitiveDataValidationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Masquer les données sensibles dans les logs
      if (req.body) {
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'cardNumber', 'cvv'];
        
        for (const field of sensitiveFields) {
          if (req.body[field]) {
            req.body[field] = '***MASKED***';
          }
        }
      }

      // Valider les formats des données critiques
      if (req.body.email && !isValidEmail(req.body.email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }

      if (req.body.amount && (!isValidAmount(req.body.amount))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount format'
        });
      }

      next();
    } catch (error) {
      logger.error('Error in sensitive data validation middleware:', error);
      return res.status(500).json({
        success: false,
        error: 'Data validation error'
      });
    }
  };
}

// Fonctions utilitaires

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidAmount(amount: any): boolean {
  const num = Number(amount);
  return !isNaN(num) && num >= 0 && num <= 999999.99;
}

// Étendre le type Request pour inclure le contexte de billing
declare global {
  namespace Express {
    interface Request {
      billingContext?: {
        tenantId: string;
        userId: string;
        action: BillingAction;
        entityType: BillingEntityType;
        metadata: {
          ipAddress?: string;
          userAgent?: string;
          sessionId?: string;
          requestId?: string;
          source: 'web' | 'api' | 'system' | 'webhook';
          startTime: number;
          [key: string]: any;
        };
        skipAudit: boolean;
      };
    }
  }
}