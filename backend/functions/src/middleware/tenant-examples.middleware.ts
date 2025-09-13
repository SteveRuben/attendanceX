/**
 * Exemples d'utilisation du middleware multi-tenant
 * Ces exemples montrent comment utiliser les différents middlewares tenant
 */

import { Router } from 'express';
import { authenticate } from './auth';
import { tenantContextMiddleware } from './tenant-context.middleware';

const router = Router();

// Exemple 1: Route basique avec contexte tenant
router.get('/tenant-info',
  authenticate, // D'abord l'authentification
  tenantContextMiddleware.injectTenantContext(), // Puis le contexte tenant
  tenantContextMiddleware.validateTenantAccess(), // Validation de l'accès
  (req, res) => {
    const { tenantContext } = req as any;
    
    res.json({
      success: true,
      data: {
        tenant: {
          id: tenantContext.tenant.id,
          name: tenantContext.tenant.name,
          plan: tenantContext.plan.name,
          status: tenantContext.tenant.status
        },
        membership: {
          role: tenantContext.membership.role,
          permissions: tenantContext.permissions
        }
      }
    });
  }
);

// Exemple 2: Route avec vérification de fonctionnalité
router.get('/advanced-reports',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  tenantContextMiddleware.requireFeature('advancedReporting'), // Vérifier la fonctionnalité
  (req, res) => {
    res.json({
      success: true,
      message: 'Advanced reporting is available for your plan'
    });
  }
);

// Exemple 3: Route avec vérification de limite d'usage
router.post('/create-event',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  tenantContextMiddleware.checkUsageLimits('maxEvents'), // Vérifier les limites
  (req, res) => {
    // Ici, on peut créer l'événement en toute sécurité
    res.json({
      success: true,
      message: 'Event creation allowed'
    });
  }
);

// Exemple 4: Route avec isolation des données
router.get('/tenant-events',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  tenantContextMiddleware.enforceTenantIsolation(), // Isolation automatique
  async (req, res) => {
    const { tenantContext } = req as any;
    
    // Les données seront automatiquement filtrées par tenant
    // grâce au middleware enforceTenantIsolation
    res.json({
      success: true,
      data: {
        events: [], // Sera filtré automatiquement
        tenantId: tenantContext.tenantId
      }
    });
  }
);

// Exemple 5: Middleware combiné pour une protection complète
const fullTenantProtection = [
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  tenantContextMiddleware.enforceTenantIsolation()
];

router.get('/protected-resource', ...fullTenantProtection, (req, res) => {
  res.json({
    success: true,
    message: 'This resource is fully protected by tenant isolation'
  });
});

// Exemple 6: Route avec vérification de rôle tenant
router.delete('/admin-action',
  ...fullTenantProtection,
  (req, res, next) => {
    const { tenantContext } = req as any;
    
    // Vérifier le rôle dans le tenant
    if (!['owner', 'admin'].includes(tenantContext.membership.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Admin role required for this action'
        }
      });
    }
    
    return next();
  },
  (req, res) => {
    res.json({
      success: true,
      message: 'Admin action completed'
    });
  }
);

export default router;