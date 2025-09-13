/**
 * Exemples d'utilisation du middleware de feature gating
 * Montre comment protéger les routes avec les fonctionnalités et limites
 */

import { Router } from 'express';
import { authenticate } from './auth';
import { tenantContextMiddleware } from './tenant-context.middleware';
import {
  requireFeature,
  checkUsageLimit,
  incrementUsageAfterSuccess,
  requireFeatures,
  addPlanInfo,
  logFeatureUsage
} from './feature-gating.middleware';
import { SubscriptionPlan, TenantUsage } from '../shared/types/tenant.types';
import '../types/express';

/**
 * Mapping entre les clés de limites de plan et les clés d'usage de tenant
 */
const PLAN_LIMIT_TO_USAGE_KEY: Record<keyof SubscriptionPlan['limits'], keyof TenantUsage> = {
  maxUsers: 'users',
  maxEvents: 'events',
  maxStorage: 'storage',
  apiCallsPerMonth: 'apiCalls'
};

const router = Router();

// Middleware de base pour toutes les routes protégées
const baseProtection = [
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  addPlanInfo() // Ajouter les infos de plan à toutes les réponses
];

// Exemple 1: Route protégée par une fonctionnalité simple
router.get('/advanced-reports',
  ...baseProtection,
  requireFeature('advancedReporting'), // Vérifier la fonctionnalité
  logFeatureUsage('advancedReporting'), // Logger l'usage
  (req, res) => {
    res.json({
      success: true,
      message: 'Advanced reporting is available',
      data: {
        reports: [
          { id: 1, name: 'Attendance Analytics', type: 'advanced' },
          { id: 2, name: 'User Engagement', type: 'advanced' }
        ]
      }
    });
  }
);

// Exemple 2: Route avec vérification de limite d'usage
router.post('/create-event',
  ...baseProtection,
  checkUsageLimit('maxEvents'), // Vérifier la limite avant création
  incrementUsageAfterSuccess('maxEvents', 1, 'ui'), // Incrémenter après succès
  (req, res) => {
    // Simuler la création d'événement
    const eventData = {
      id: Date.now(),
      title: req.body.title,
      description: req.body.description,
      createdAt: new Date()
    };

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: eventData
    });
  }
);

// Exemple 3: Route API avec limite d'appels
router.get('/api/users',
  ...baseProtection,
  requireFeature('apiAccess'), // Vérifier l'accès API
  checkUsageLimit('apiCallsPerMonth'), // Vérifier la limite d'appels
  incrementUsageAfterSuccess('apiCallsPerMonth', 1, 'api'), // Incrémenter les appels API
  (req, res) => {
    res.json({
      success: true,
      data: {
        users: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ]
      }
    });
  }
);

// Exemple 4: Route avec plusieurs fonctionnalités requises
router.post('/webhook-config',
  ...baseProtection,
  requireFeatures(['webhooks', 'apiAccess'], true), // Toutes les fonctionnalités requises
  (req, res) => {
    res.json({
      success: true,
      message: 'Webhook configuration updated',
      data: {
        webhookUrl: req.body.url,
        events: req.body.events
      }
    });
  }
);

// Exemple 5: Route avec dégradation gracieuse
router.get('/dashboard',
  ...baseProtection,
  requireFeature({
    feature: 'advancedReporting',
    gracefulDegradation: true // Ne pas bloquer, juste limiter les fonctionnalités
  }),
  (req, res) => {
    const hasAdvancedReporting = req.featureRestrictions?.advancedReporting;

    const dashboardData = {
      basicStats: {
        totalUsers: 150,
        totalEvents: 25,
        thisMonth: 8
      }
    };

    // Ajouter des données avancées seulement si la fonctionnalité est disponible
    if (hasAdvancedReporting) {
      (dashboardData as any).advancedStats = {
        userEngagement: 85,
        eventSuccessRate: 92,
        trends: [/* données de tendance */]
      };
    }

    res.json({
      success: true,
      data: dashboardData,
      features: {
        advancedReporting: hasAdvancedReporting
      }
    });
  }
);

// Exemple 6: Route avec limite d'overage autorisée
router.post('/bulk-invite',
  ...baseProtection,
  checkUsageLimit({
    limitType: 'maxUsers',
    allowOverage: true,
    overageLimit: 10 // Autoriser 10 utilisateurs supplémentaires
  }),
  (req, res) => {
    const emails = req.body.emails || [];

    // Simuler l'invitation en masse
    res.json({
      success: true,
      message: `${emails.length} invitations sent`,
      data: {
        invited: emails.length,
        overage: req.usageLimits?.maxUsers?.exceeded || false
      }
    });
  }
);

// Exemple 7: Route avec message d'erreur personnalisé
router.get('/sso-config',
  ...baseProtection,
  requireFeature({
    feature: 'ssoIntegration',
    customErrorMessage: 'SSO integration is only available in Enterprise plans',
    redirectUrl: '/billing/upgrade?feature=sso'
  }),
  (req, res) => {
    res.json({
      success: true,
      data: {
        ssoProviders: ['Google', 'Microsoft', 'SAML'],
        currentConfig: {
          provider: 'Google',
          domain: 'example.com'
        }
      }
    });
  }
);

// Exemple 8: Route avec vérification de stockage
router.post('/upload-file',
  ...baseProtection,
  checkUsageLimit({
    limitType: 'maxStorage',
    customErrorMessage: 'Storage limit exceeded. Please upgrade your plan or delete some files.'
  }),
  (req, res) => {
    const fileSize = req.body.fileSize || 0; // en MB

    // Simuler l'upload
    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileName: req.body.fileName,
        size: fileSize,
        url: '/files/uploaded-file.pdf'
      }
    });
  }
);

// Exemple 9: Route d'information sur le plan (sans protection)
router.get('/plan-info',
  ...baseProtection,
  (req, res) => {
    const { plan } = req.tenantContext!;

    res.json({
      success: true,
      data: {
        currentPlan: {
          name: plan.name,
          price: plan.price,
          currency: plan.currency
        },
        features: plan.features,
        limits: plan.limits,
        usage: req.tenantContext!.tenant.usage
      }
    });
  }
);

// Exemple 10: Route pour vérifier les limites sans bloquer
router.get('/usage-check',
  ...baseProtection,
  (req, res) => {
    const { tenant, plan } = req.tenantContext!;

    const usageStatus = Object.keys(plan.limits).reduce((acc, limitKey) => {
      const key = limitKey as keyof typeof plan.limits;
      const limit = plan.limits[key];
      const usageKey = PLAN_LIMIT_TO_USAGE_KEY[key];
      const usage = tenant.usage[usageKey] || 0;

      acc[key] = {
        current: usage,
        limit: limit === -1 ? 'unlimited' : limit,
        percentage: limit === -1 ? 0 : Math.round((usage / limit) * 100),
        status: limit === -1 ? 'unlimited' :
          usage >= limit ? 'exceeded' :
            usage >= limit * 0.8 ? 'warning' : 'ok'
      };

      return acc;
    }, {} as any);

    res.json({
      success: true,
      data: {
        plan: plan.name,
        usage: usageStatus
      }
    });
  }
);

export default router;