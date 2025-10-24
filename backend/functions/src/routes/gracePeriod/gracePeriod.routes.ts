import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import { tenantContextMiddleware } from '../../middleware/tenant-context.middleware';
import { validateBody } from '../../middleware/validation';
import { rateLimit } from '../../middleware/rateLimit';
import { GracePeriodController } from '../../controllers/gracePeriod/gracePeriod.controller';
import { GracePeriodSource, GracePeriodStatus } from '../../models/gracePeriod.model';

const router = Router();

/**
 * Middleware d'authentification pour toutes les routes
 */
router.use(authenticate);

/**
 * Créer une nouvelle période de grâce
 * POST /api/v1/grace-periods
 * Accès: Admin seulement
 */
router.post('/',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 50 }),
  [
    body('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required'),
    body('tenantId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Tenant ID is required'),
    body('durationDays')
      .isInt({ min: 1, max: 365 })
      .withMessage('Duration must be between 1 and 365 days'),
    body('source')
      .isIn(Object.values(GracePeriodSource))
      .withMessage('Invalid grace period source'),
    body('sourceDetails')
      .optional()
      .isObject()
      .withMessage('Source details must be an object'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],
  validateBody,
  GracePeriodController.createGracePeriod
);

/**
 * Obtenir la période de grâce active d'un utilisateur
 * GET /api/v1/grace-periods/user/:userId/active
 * Accès: Admin ou utilisateur propriétaire
 */
router.get('/user/:userId/active',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 100 }),
  [
    param('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required')
  ],
  validateBody,
  GracePeriodController.getActiveGracePeriod
);

/**
 * Obtenir le statut de la période de grâce pour l'utilisateur connecté
 * GET /api/v1/grace-periods/my-status
 * Accès: Utilisateur authentifié
 */
router.get('/my-status',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 200 }), // Plus permissif car utilisé fréquemment par le frontend
  GracePeriodController.getMyGracePeriodStatus
);

/**
 * Envoyer les rappels de période de grâce (job admin)
 * POST /api/v1/grace-periods/send-reminders
 * Accès: Admin seulement (ou système)
 */
router.post('/send-reminders',
  rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 10 }), // Très restrictif pour les jobs système
  GracePeriodController.sendGraceReminders
);

/**
 * Gérer les périodes de grâce expirées (job admin)
 * POST /api/v1/grace-periods/handle-expired
 * Accès: Admin seulement (ou système)
 */
router.post('/handle-expired',
  rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 10 }), // Très restrictif pour les jobs système
  GracePeriodController.handleExpiredGracePeriods
);

/**
 * Obtenir les statistiques des périodes de grâce
 * GET /api/v1/grace-periods/stats
 * Accès: Admin seulement
 */
router.get('/stats',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 100 }),
  [
    query('tenantId')
      .optional()
      .isString()
      .withMessage('Tenant ID must be a string')
  ],
  validateBody,
  GracePeriodController.getGracePeriodStats
);

/**
 * Obtenir les périodes de grâce expirant bientôt (dashboard admin)
 * GET /api/v1/grace-periods/expiring-soon
 * Accès: Admin seulement
 */
router.get('/expiring-soon',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 100 }),
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 30 })
      .withMessage('Days must be between 1 and 30')
  ],
  validateBody,
  GracePeriodController.getExpiringSoonGracePeriods
);

/**
 * Obtenir une période de grâce par ID
 * GET /api/v1/grace-periods/:gracePeriodId
 * Accès: Admin ou propriétaire
 */
router.get('/:gracePeriodId',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 100 }),
  [
    param('gracePeriodId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Grace period ID is required')
  ],
  validateBody,
  GracePeriodController.getGracePeriod
);

/**
 * Étendre une période de grâce
 * PUT /api/v1/grace-periods/:gracePeriodId/extend
 * Accès: Admin seulement
 */
router.put('/:gracePeriodId/extend',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 20 }),
  [
    param('gracePeriodId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Grace period ID is required'),
    body('additionalDays')
      .isInt({ min: 1, max: 90 })
      .withMessage('Additional days must be between 1 and 90'),
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Reason must be maximum 500 characters')
  ],
  validateBody,
  GracePeriodController.extendGracePeriod
);

/**
 * Annuler une période de grâce
 * PUT /api/v1/grace-periods/:gracePeriodId/cancel
 * Accès: Admin seulement
 */
router.put('/:gracePeriodId/cancel',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 20 }),
  [
    param('gracePeriodId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Grace period ID is required'),
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Reason must be maximum 500 characters')
  ],
  validateBody,
  GracePeriodController.cancelGracePeriod
);

/**
 * Convertir une période de grâce en abonnement
 * POST /api/v1/grace-periods/:gracePeriodId/convert
 * Accès: Utilisateur propriétaire ou admin
 */
router.post('/:gracePeriodId/convert',
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 }),
  [
    param('gracePeriodId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Grace period ID is required'),
    body('planId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Plan ID is required'),
    body('promoCodeId')
      .optional()
      .isString()
      .withMessage('Promo code ID must be a string')
  ],
  validateBody,
  GracePeriodController.convertGracePeriod
);

/**
 * Obtenir l'historique des extensions d'une période de grâce
 * GET /api/v1/grace-periods/:gracePeriodId/extensions
 * Accès: Admin ou propriétaire
 */
router.get('/:gracePeriodId/extensions',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 100 }),
  [
    param('gracePeriodId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Grace period ID is required')
  ],
  validateBody,
  GracePeriodController.getGracePeriodExtensions
);

/**
 * Obtenir l'historique des notifications d'une période de grâce
 * GET /api/v1/grace-periods/:gracePeriodId/notifications
 * Accès: Admin ou propriétaire
 */
router.get('/:gracePeriodId/notifications',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 100 }),
  [
    param('gracePeriodId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Grace period ID is required')
  ],
  validateBody,
  GracePeriodController.getGracePeriodNotifications
);

/**
 * Lister les périodes de grâce avec filtres et pagination
 * GET /api/v1/grace-periods
 * Accès: Admin seulement
 */
router.get('/',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 100 }),
  [
    query('status')
      .optional()
      .isIn(Object.values(GracePeriodStatus))
      .withMessage('Invalid grace period status'),
    query('source')
      .optional()
      .isIn(Object.values(GracePeriodSource))
      .withMessage('Invalid grace period source'),
    query('userId')
      .optional()
      .isString()
      .withMessage('User ID must be a string'),
    query('tenantId')
      .optional()
      .isString()
      .withMessage('Tenant ID must be a string'),
    query('expiringInDays')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Expiring in days must be between 1 and 365'),
    query('isOverdue')
      .optional()
      .isBoolean()
      .withMessage('isOverdue must be a boolean'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be non-negative'),
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'startDate', 'endDate', 'durationDays'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],
  validateBody,
  GracePeriodController.listGracePeriods
);

export default router;