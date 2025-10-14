/**
 * Middleware pour la gestion du contexte multi-tenant
 * Garantit l'isolation des données et l'application des limites par tenant
 */

import { NextFunction, Response } from 'express';
import { collections } from '../config/database';
import { getPlanById } from '../config/default-plans';
import {  Tenant, TenantContext, TenantError, TenantErrorCode, TenantMembership, TenantStatus } from '../common/types';
import { AuthenticatedRequest } from '../types/middleware.types';

// Cache pour les contextes tenant (en mémoire pour la performance)
const tenantContextCache = new Map<string, { context: TenantContext; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class TenantContextMiddleware {

  /**
   * Middleware pour injecter le contexte tenant dans la requête
   */
  injectTenantContext() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'Authentication required for tenant context'
            }
          });
        }

        // Extraire le tenantId depuis différentes sources
        const tenantId = this.extractTenantId(req);

        if (!tenantId) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'TENANT_CONTEXT_REQUIRED',
              message: 'Tenant context is required'
            }
          });
        }

        // Charger le contexte tenant
        const tenantContext = await this.loadTenantContext(req.user.uid, tenantId);

        if (!tenantContext) {
          return res.status(403).json({
            success: false,
            error: {
              code: TenantErrorCode.TENANT_ACCESS_DENIED,
              message: 'Access denied to this tenant'
            }
          });
        }

        // Vérifier le statut du tenant
        if (tenantContext.tenant.status === TenantStatus.SUSPENDED) {
          return res.status(403).json({
            success: false,
            error: {
              code: TenantErrorCode.TENANT_SUSPENDED,
              message: 'Tenant is suspended'
            }
          });
        }

        // Ajouter le contexte à la requête
        req.tenantContext = tenantContext;

        return next();
      } catch (error) {
        console.error('Error injecting tenant context:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to load tenant context'
          }
        });
      }
    };
  }

  /**
   * Middleware pour valider l'accès au tenant
   */
  validateTenantAccess() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.tenantContext) {
          return res.status(403).json({
            success: false,
            error: {
              code: TenantErrorCode.TENANT_ACCESS_DENIED,
              message: 'Tenant context not found'
            }
          });
        }

        const { membership, tenant } = req.tenantContext;

        // Vérifier que le membership est actif
        if (!membership.isActive) {
          return res.status(403).json({
            success: false,
            error: {
              code: TenantErrorCode.TENANT_ACCESS_DENIED,
              message: 'Tenant membership is inactive'
            }
          });
        }

        // Vérifier le statut du tenant
        if (tenant.status !== TenantStatus.ACTIVE && tenant.status !== TenantStatus.TRIAL) {
          return res.status(403).json({
            success: false,
            error: {
              code: TenantErrorCode.TENANT_SUSPENDED,
              message: 'Tenant is not active'
            }
          });
        }

        return next();
      } catch (error) {
        console.error('Error validating tenant access:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to validate tenant access'
          }
        });
      }
    };
  }

  /**
   * Middleware pour appliquer l'isolation des données par tenant
   */
  enforceTenantIsolation() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.tenantContext) {
          return res.status(403).json({
            success: false,
            error: {
              code: TenantErrorCode.TENANT_ACCESS_DENIED,
              message: 'Tenant context required for data isolation'
            }
          });
        }

        // Ajouter un intercepteur pour les réponses JSON
        const originalJson = res.json;
        res.json = function (body: any) {
          // Filtrer les données pour s'assurer qu'elles appartiennent au bon tenant
          if (body && body.data) {
            body.data = filterDataByTenant(body.data, req.tenantContext!.tenant.id);
          }
          return originalJson.call(this, body);
        };

        return next();
      } catch (error) {
        console.error('Error enforcing tenant isolation:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to enforce tenant isolation'
          }
        });
      }
    };
  }

  /**
   * Middleware pour vérifier qu'une fonctionnalité est disponible dans le plan
   */
  requireFeature(feature: 'advancedReporting' | 'apiAccess' | 'customBranding' | 'webhooks' | 'integrations' | 'analytics' | 'ssoIntegration' | 'prioritySupport') {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

        const { features } = req.tenantContext;

        if (!features[feature as keyof typeof features]) {
          return res.status(403).json({
            success: false,
            error: {
              code: TenantErrorCode.FEATURE_NOT_AVAILABLE,
              message: `Feature '${feature}' is not available in your plan`,
              details: {
                feature,
                currentPlan: req.tenantContext.tenant.planId,
                upgradeRequired: true
              }
            }
          });
        }

        return next();
      } catch (error) {
        console.error('Error checking feature availability:', error);
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
  checkUsageLimits(limitType: 'maxUsers' | 'maxEvents' | 'maxStorage' | 'apiCallsPerMonth') {
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
        const limit = plan[limitType];
        const currentUsage = tenant.usage[limitType as keyof typeof tenant.usage] || 0;

        // -1 signifie illimité
        if (limit !== -1 && currentUsage >= limit) {
          return res.status(403).json({
            success: false,
            error: {
              code: TenantErrorCode.TENANT_LIMIT_EXCEEDED,
              message: `${limitType} limit exceeded`,
              details: {
                limit,
                currentUsage,
                limitType,
                upgradeRequired: true
              }
            }
          });
        }

        return next();
      } catch (error) {
        console.error('Error checking usage limits:', error);
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
   * Extraire le tenantId depuis la requête
   */
  private extractTenantId(req: AuthenticatedRequest): string | null {
    // Priorité: header > params > query > body
    return req.headers['x-tenant-id'] as string ||
      req.params.tenantId ||
      req.params.id || // Pour les routes /tenants/:id
      req.query.tenantId as string ||
      req.body?.tenantId ||
      null;
  }

  /**
   * Charger le contexte tenant complet
   */
  private async loadTenantContext(userId: string, tenantId: string): Promise<TenantContext | null> {
    try {
      // Vérifier le cache d'abord
      const cacheKey = `${userId}:${tenantId}`;
      const cached = tenantContextCache.get(cacheKey);

      if (cached && cached.expiry > Date.now()) {
        return cached.context;
      }

      // Charger le tenant
      const tenantDoc = await collections.tenants.doc(tenantId).get();
      if (!tenantDoc.exists) {
        return null;
      }
      const tenant = tenantDoc.data() as Tenant;

      // Charger le membership de l'utilisateur
      const membershipQuery = await collections.tenant_memberships
        .where('tenantId', '==', tenantId)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (membershipQuery.empty) {
        return null;
      }
      const membership = membershipQuery.docs[0].data() as TenantMembership;

      // Charger le plan d'abonnement
      const plan = getPlanById(tenant.planId);
      if (!plan) {
        throw new Error(`Plan not found: ${tenant.planId}`);
      }

      // Créer le contexte
      const context: TenantContext = {
        tenant,
        membership,
        features: {
          advancedReporting: plan.features.advancedReporting,
          apiAccess: plan.features.apiAccess,
          customBranding: plan.features.customBranding,
          webhooks: plan.features.webhooks,
          integrations: plan.features.webhooks, // Mapping webhooks to integrations
          analytics: plan.features.advancedReporting, // Mapping advanced reporting to analytics
          ssoIntegration: plan.features.ssoIntegration,
          prioritySupport: plan.features.prioritySupport
        },
        plan: {
          maxUsers: plan.limits.maxUsers,
          maxEvents: plan.limits.maxEvents,
          maxStorage: plan.limits.maxStorage,
          apiCallsPerMonth: plan.limits.apiCallsPerMonth
        },
        subscription: undefined // À implémenter si nécessaire
      };

      // Mettre en cache
      tenantContextCache.set(cacheKey, {
        context,
        expiry: Date.now() + CACHE_TTL
      });

      return context;
    } catch (error) {
      console.error('Error loading tenant context:', error);
      return null;
    }
  }
}

/**
 * Fonction utilitaire pour filtrer les données par tenant
 */
function filterDataByTenant(data: any, tenantId: string): any {
  if (!data) { return data; }

  if (Array.isArray(data)) {
    return data.filter(item =>
      item && typeof item === 'object' && item.tenantId === tenantId
    );
  }

  if (typeof data === 'object' && data.tenantId) {
    return data.tenantId === tenantId ? data : null;
  }

  return data;
}

/**
 * Fonction utilitaire pour ajouter automatiquement le filtre tenant aux requêtes Firestore
 */
export function addTenantFilter(query: any, tenantId: string): any {
  if (query && typeof query.where === 'function') {
    return query.where('tenantId', '==', tenantId);
  }
  return query;
}

/**
 * Fonction utilitaire pour valider que les données appartiennent au tenant
 */
export function validateTenantOwnership(data: any, tenantId: string): boolean {
  if (!data) { return false; }

  if (Array.isArray(data)) {
    return data.every(item =>
      item && typeof item === 'object' && item.tenantId === tenantId
    );
  }

  if (typeof data === 'object') {
    return data.tenantId === tenantId;
  }

  return false;
}

/**
 * Décorateur pour les méthodes de service qui nécessitent un contexte tenant
 */
export function RequireTenantContext(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const tenantId = args[0];
    if (!tenantId) {
      throw new TenantError('Tenant ID is required', TenantErrorCode.TENANT_NOT_FOUND);
    }
    return method.apply(this, args);
  };
}

// Instance singleton du middleware
export const tenantContextMiddleware = new TenantContextMiddleware();

// Exports des middlewares individuels
export const injectTenantContext = tenantContextMiddleware.injectTenantContext();
export const validateTenantAccess = tenantContextMiddleware.validateTenantAccess();
export const enforceTenantIsolation = tenantContextMiddleware.enforceTenantIsolation();

export default tenantContextMiddleware;