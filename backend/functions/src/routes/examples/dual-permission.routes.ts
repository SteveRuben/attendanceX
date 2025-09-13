/**
 * Exemples d'utilisation des permissions à deux niveaux
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantContextMiddleware } from '../../middleware/tenant-context.middleware';
import { 
  requireDualPermission,
  requireFeaturePermission,
  requireTenantRole,
  requireAdvancedFeature
} from '../../middleware/dual-permission.middleware';
import { TenantRole, FeaturePermission } from '../../shared/types/tenant.types';

const router = Router();

// Middleware de base
const baseProtection = [
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess()
];

// Exemple 1: Fonctionnalité accessible seulement avec permission de feature
router.get('/advanced-analytics',
  ...baseProtection,
  requireFeaturePermission(FeaturePermission.MACHINE_LEARNING_INSIGHTS),
  (req, res) => {
    res.json({
      success: true,
      message: 'Advanced analytics available',
      data: {
        insights: ['Pattern analysis', 'Predictive modeling', 'Anomaly detection'],
        userRole: req.user?.role,
        applicationRole: req.user?.applicationRole
      }
    });
  }
);

// Exemple 2: Fonctionnalité nécessitant un rôle tenant minimum
router.post('/manage-team',
  ...baseProtection,
  requireTenantRole(TenantRole.MANAGER),
  (req, res) => {
    res.json({
      success: true,
      message: 'Team management access granted',
      data: {
        availableActions: ['Add members', 'Remove members', 'Assign roles'],
        userRole: req.user?.role
      }
    });
  }
);

// Exemple 3: Fonctionnalité avancée nécessitant les DEUX permissions
router.post('/bulk-operations',
  ...baseProtection,
  requireAdvancedFeature(
    TenantRole.MANAGER, 
    FeaturePermission.BULK_PRESENCE_MANAGEMENT
  ),
  (req, res) => {
    res.json({
      success: true,
      message: 'Bulk operations available',
      data: {
        operations: ['Bulk import', 'Bulk export', 'Bulk update'],
        userContext: req.userContext
      }
    });
  }
);

// Exemple 4: Accès flexible (tenant OU feature permission)
router.get('/reports',
  ...baseProtection,
  requireDualPermission({
    minimumTenantRole: TenantRole.MANAGER,
    requiredFeaturePermission: FeaturePermission.BASIC_REPORTS,
    requireBoth: false // OR logic
  }),
  (req, res) => {
    const userContext = req.userContext!;
    
    res.json({
      success: true,
      message: 'Reports access granted',
      data: {
        availableReports: userContext.featurePermissions.includes(FeaturePermission.ADVANCED_REPORTS) 
          ? ['Basic', 'Advanced', 'Custom'] 
          : ['Basic'],
        accessReason: req.permissionRestrictions ? 'tenant_role' : 'feature_permission'
      }
    });
  }
);

// Exemple 5: Dégradation gracieuse
router.get('/dashboard',
  ...baseProtection,
  requireDualPermission({
    minimumTenantRole: TenantRole.MEMBER,
    requiredFeaturePermission: FeaturePermission.ADVANCED_REPORTS,
    gracefulDegradation: true
  }),
  (req, res) => {
    const restrictions = req.permissionRestrictions;
    // @ts-ignore
    const userContext = req.userContext!;
    
    const dashboardData: any = {
      basicStats: {
        totalEvents: 25,
        totalUsers: 150
      }
    };

    // Ajouter des données avancées seulement si autorisé
    if (!restrictions?.featurePermissionDenied) {
      dashboardData.advancedStats = {
        trends: ['Increasing attendance', 'Peak hours: 9-11 AM'],
        predictions: ['Next month: +15% attendance']
      };
    }

    // Ajouter des actions de gestion si rôle suffisant
    if (!restrictions?.tenantPermissionDenied) {
      dashboardData.managementActions = ['Export data', 'Configure settings'];
    }

   return res.json({
      success: true,
      data: dashboardData,
      restrictions: restrictions ? {
        limitedFeatures: restrictions.featurePermissionDenied,
        limitedManagement: restrictions.tenantPermissionDenied
      } : null
    });
  }
);

// Exemple 6: API avec différents niveaux d'accès
router.get('/api/users',
  ...baseProtection,
  requireFeaturePermission(FeaturePermission.API_ACCESS),
  (req, res) => {
    const userContext = req.userContext!;
    
    // Données de base pour tous
    const userData = {
      users: [
        { id: 1, name: 'John Doe', email: 'john@example.com' }
      ]
    };

    // Données sensibles seulement pour les managers+
    if (userContext.tenantRole === TenantRole.MANAGER || 
        userContext.tenantRole === TenantRole.ADMIN || 
        userContext.tenantRole === TenantRole.OWNER) {
      (userData as any).sensitiveData = {
        lastLogin: '2024-01-15T10:30:00Z',
        ipAddress: '192.168.1.1'
      };
    }

    res.json({
      success: true,
      data: userData,
      accessLevel: userContext.tenantRole
    });
  }
);

// Route d'information sur les permissions utilisateur
router.get('/permissions-info',
  ...baseProtection,
  (req, res) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    return res.json({
      success: true,
      data: {
        tenantRole: req.user.role,
        applicationRole: req.user.applicationRole,
        featurePermissions: req.user.featurePermissions,
        planFeatures: req.tenantContext?.plan.features,
        planLimits: req.tenantContext?.plan.limits
      }
    });
  }
);

export default router;