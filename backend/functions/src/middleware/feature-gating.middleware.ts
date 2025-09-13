/**
 * Middleware de gating des fonctionnalités
 * Contrôle l'accès aux fonctionnalités basé sur le plan d'abonnement
 */

import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/middleware.types';
import {
  SubscriptionPlan,
  TenantErrorCode,
  TenantUsage
} from '../shared/types/tenant.types';
import { tenantUsageService } from '../services/tenant/tenant-usage.service';

/**
 * Mapping entre les clés de limites de plan et les clés d'usage de tenant
 */
const PLAN_LIMIT_TO_USAGE_KEY: Record<keyof SubscriptionPlan['limits'], keyof TenantUsage> = {
  maxUsers: 'users',
  maxEvents: 'events',
  maxStorage: 'storage',
  apiCallsPerMonth: 'apiCalls'
};

/**
 * Convertir une clé de limite de plan en clé d'usage de tenant
 */
function mapLimitKeyToUsageKey(limitKey: keyof SubscriptionPlan['limits']): keyof TenantUsage {
  return PLAN_LIMIT_TO_USAGE_KEY[limitKey];
}

export interface FeatureGateOptions {
  feature: keyof SubscriptionPlan['features'];
  gracefulDegradation?: boolean;
  customErrorMessage?: string;
  redirectUrl?: string;
}

export interface UsageLimitOptions {
  limitType: keyof SubscriptionPlan['limits'];
  gracefulDegradation?: boolean;
  customErrorMessage?: string;
  allowOverage?: boolean;
  overageLimit?: number;
}

export interface FeatureGateResponse {
  success: false;
  error: {
    code: TenantErrorCode;
    message: string;
    feature?: string;
    currentPlan?: string;
    upgradeRequired?: boolean;
    upgradeUrl?: string;
  };
  timestamp: string;
  requestId: string;
}

export interface UsageLimitResponse {
  success: false;
  error: {
    code: TenantErrorCode;
    message: string;
    limitType?: string;
    currentUsage?: number;
    limit?: number;
    percentage?: number;
    upgradeRequired?: boolean;
    upgradeUrl?: string;
  };
  timestamp: string;
  requestId: string;
}

export class FeatureGatingMiddleware {

  /**
   * Middleware pour vérifier qu'une fonctionnalité est disponible
   */
  requireFeature(options: FeatureGateOptions | keyof SubscriptionPlan['features']) {
    const config: FeatureGateOptions = typeof options === 'string'
      ? { feature: options }
      : options;

    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.tenantContext) {
          return res.status(403).json({
            success: false,
            error: {
              code: TenantErrorCode.TENANT_ACCESS_DENIED,
              message: 'Tenant context required'
            }
          });
        }

        const { plan } = req.tenantContext;
        const isAvailable = plan.features[config.feature];

        if (!isAvailable) {
          if (config.gracefulDegradation) {
            // Ajouter un flag pour indiquer que la fonctionnalité n'est pas disponible
            req.featureRestrictions = req.featureRestrictions || {};
            req.featureRestrictions[config.feature] = false;
            return next();
          }

          const response: FeatureGateResponse = {
            success: false,
            error: {
              code: TenantErrorCode.FEATURE_NOT_AVAILABLE,
              message: config.customErrorMessage ||
                `Feature '${config.feature}' is not available in your ${plan.name} plan`,
              feature: config.feature,
              currentPlan: plan.name,
              upgradeRequired: true,
              upgradeUrl: config.redirectUrl || '/billing/upgrade'
            },
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] as string || 'unknown'
          };

          return res.status(403).json(response);
        }

        // Fonctionnalité disponible
        req.featureRestrictions = req.featureRestrictions || {};
        req.featureRestrictions[config.feature] = true;
        next();

      } catch (error) {
        console.error('Error in feature gate middleware:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to check feature availability'
          }
        });
      }
    };
  }

  /**
   * Middleware pour vérifier les limites d'usage
   */
  checkUsageLimit(options: UsageLimitOptions | keyof SubscriptionPlan['limits']) {
    const config: UsageLimitOptions = typeof options === 'string'
      ? { limitType: options }
      : options;

    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.tenantContext) {
          return res.status(403).json({
            success: false,
            error: {
              code: TenantErrorCode.TENANT_ACCESS_DENIED,
              message: 'Tenant context required'
            }
          });
        }

        const { tenant, plan } = req.tenantContext;
        const limit = plan.limits[config.limitType];
        const usageKey = mapLimitKeyToUsageKey(config.limitType);
        const currentUsage = tenant.usage[usageKey] || 0;

        // -1 signifie illimité
        if (limit === -1) {
          return next();
        }

        const percentage = (currentUsage / limit) * 100;
        const isExceeded = currentUsage >= limit;

        // Vérifier si la limite est dépassée
        if (isExceeded && !config.allowOverage) {
          if (config.gracefulDegradation) {
            req.usageLimits = req.usageLimits || {};
            req.usageLimits[config.limitType] = {
              exceeded: true,
              currentUsage,
              limit,
              percentage
            };
            return next();
          }

          const response: UsageLimitResponse = {
            success: false,
            error: {
              code: TenantErrorCode.TENANT_LIMIT_EXCEEDED,
              message: config.customErrorMessage ||
                `${config.limitType} limit exceeded (${currentUsage}/${limit})`,
              limitType: config.limitType,
              currentUsage,
              limit,
              percentage,
              upgradeRequired: true,
              upgradeUrl: '/billing/upgrade'
            },
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] as string || 'unknown'
          };

          return res.status(403).json(response);
        }

        // Vérifier les limites d'overage si autorisées
        if (config.allowOverage && config.overageLimit) {
          const overageUsage = currentUsage - limit;
          if (overageUsage > config.overageLimit) {
            const response: UsageLimitResponse = {
              success: false,
              error: {
                code: TenantErrorCode.TENANT_LIMIT_EXCEEDED,
                message: `Overage limit exceeded for ${config.limitType}`,
                limitType: config.limitType,
                currentUsage,
                limit: limit + config.overageLimit,
                percentage: (currentUsage / (limit + config.overageLimit)) * 100,
                upgradeRequired: true,
                upgradeUrl: '/billing/upgrade'
              },
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] as string || 'unknown'
            };

            return res.status(403).json(response);
          }
        }

        // Ajouter les informations d'usage à la requête
        req.usageLimits = req.usageLimits || {};
        req.usageLimits[config.limitType] = {
          exceeded: false,
          currentUsage,
          limit,
          percentage
        };

        next();

      } catch (error) {
        console.error('Error in usage limit middleware:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to check usage limits'
          }
        });
      }
    };
  }

  /**
   * Middleware pour incrémenter automatiquement l'usage après une action réussie
   */
  incrementUsageAfterSuccess(
    limitType: keyof SubscriptionPlan['limits'],
    increment: number = 1,
    source: string = 'api'
  ) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.tenantContext) {
          return next();
        }

        // Intercepter la réponse pour incrémenter l'usage seulement en cas de succès
        const originalJson = res.json;
        res.json = function (body: any) {
          // Incrémenter l'usage seulement si la réponse indique un succès
          if (body && body.success !== false && res.statusCode >= 200 && res.statusCode < 300) {
            const usageKey = mapLimitKeyToUsageKey(limitType);
            tenantUsageService.incrementUsage(
              req.tenantContext!.tenant.id,
              usageKey,
              increment,
              source,
              {
                endpoint: req.path,
                method: req.method,
                timestamp: new Date()
              }
            ).catch(error => {
              console.error('Error incrementing usage:', error);
              // Ne pas faire échouer la requête pour ça
            });
          }

          return originalJson.call(this, body);
        };

        next();

      } catch (error) {
        console.error('Error in usage increment middleware:', error);
        next(); // Continuer même en cas d'erreur
      }
    };
  }

  /**
   * Middleware pour vérifier plusieurs fonctionnalités à la fois
   */
  requireFeatures(features: Array<keyof SubscriptionPlan['features']>, requireAll: boolean = true) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.tenantContext) {
          return res.status(403).json({
            success: false,
            error: {
              code: TenantErrorCode.TENANT_ACCESS_DENIED,
              message: 'Tenant context required'
            }
          });
        }

        const { plan } = req.tenantContext;
        const availableFeatures = features.filter(feature => plan.features[feature]);
        const unavailableFeatures = features.filter(feature => !plan.features[feature]);

        if (requireAll && unavailableFeatures.length > 0) {
          return res.status(403).json({
            success: false,
            error: {
              code: TenantErrorCode.FEATURE_NOT_AVAILABLE,
              message: `Features not available: ${unavailableFeatures.join(', ')}`,
              currentPlan: plan.name,
              upgradeRequired: true,
              upgradeUrl: '/billing/upgrade'
            }
          });
        }

        if (!requireAll && availableFeatures.length === 0) {
          return res.status(403).json({
            success: false,
            error: {
              code: TenantErrorCode.FEATURE_NOT_AVAILABLE,
              message: `None of the required features are available: ${features.join(', ')}`,
              currentPlan: plan.name,
              upgradeRequired: true,
              upgradeUrl: '/billing/upgrade'
            }
          });
        }

        // Ajouter les informations de fonctionnalités à la requête
        req.featureRestrictions = req.featureRestrictions || {};
        features.forEach(feature => {
          req.featureRestrictions![feature] = plan.features[feature];
        });

        return next();

      } catch (error) {
        console.error('Error in multiple features middleware:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to check feature availability'
          }
        });
      }
    };
  }

  /**
   * Middleware pour ajouter des informations de plan à la réponse
   */
  addPlanInfo() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.tenantContext) {
          return next();
        }

        const originalJson = res.json;
        res.json = function (body: any) {
          if (body && typeof body === 'object') {
            body.planInfo = {
              name: req.tenantContext!.plan.name,
              type: req.tenantContext!.plan.type,
              features: req.featureRestrictions || {},
              usage: req.usageLimits || {}
            };
          }

          return originalJson.call(this, body);
        };

        next();

      } catch (error) {
        console.error('Error in plan info middleware:', error);
        next();
      }
    };
  }

  /**
   * Middleware pour logger l'usage des fonctionnalités
   */
  logFeatureUsage(feature: keyof SubscriptionPlan['features']) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (req.tenantContext) {
          // Logger l'utilisation de la fonctionnalité
          console.log(`Feature usage: ${feature}`, {
            tenantId: req.tenantContext.tenant.id,
            userId: req.user?.uid,
            plan: req.tenantContext.plan.name,
            endpoint: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
          });

          // TODO: Envoyer à un service d'analytics
          // analyticsService.trackFeatureUsage(...)
        }

        next();

      } catch (error) {
        console.error('Error in feature usage logging:', error);
        next();
      }
    };
  }
}

// Étendre le type AuthenticatedRequest pour inclure les nouvelles propriétés
declare module '../types/middleware.types' {
  interface AuthenticatedRequest {
    featureRestrictions?: Record<string, boolean>;
    usageLimits?: Record<string, {
      exceeded: boolean;
      currentUsage: number;
      limit: number;
      percentage: number;
    }>;
  }
}

// Instance singleton
export const featureGatingMiddleware = new FeatureGatingMiddleware();

// Exports des middlewares individuels pour faciliter l'utilisation
export const requireFeature = featureGatingMiddleware.requireFeature.bind(featureGatingMiddleware);
export const checkUsageLimit = featureGatingMiddleware.checkUsageLimit.bind(featureGatingMiddleware);
export const incrementUsageAfterSuccess = featureGatingMiddleware.incrementUsageAfterSuccess.bind(featureGatingMiddleware);
export const requireFeatures = featureGatingMiddleware.requireFeatures.bind(featureGatingMiddleware);
export const addPlanInfo = featureGatingMiddleware.addPlanInfo.bind(featureGatingMiddleware);
export const logFeatureUsage = featureGatingMiddleware.logFeatureUsage.bind(featureGatingMiddleware);

export default featureGatingMiddleware;