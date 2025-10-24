import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import { tenantContextMiddleware } from '../../middleware/tenant-context.middleware';
import { validateBody } from '../../middleware/validation';
import { rateLimit } from '../../middleware/rateLimit';
import { PromoCodeController } from '../../controllers/promoCode/promoCode.controller';
import { PromoCodeDiscountType } from '../../models/promoCode.model';

const router = Router();

/**
 * Middleware d'authentification pour toutes les routes
 */
router.use(authenticate);

/**
 * Créer un nouveau code promo
 * POST /api/v1/promo-codes
 * Accès: Admin seulement
 */
router.post('/',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 20 }), // 20 créations par 15 minutes
  [
    body('code')
      .isString()
      .isLength({ min: 3, max: 50 })
      .matches(/^[A-Z0-9_-]+$/)
      .withMessage('Code must be 3-50 characters, uppercase alphanumeric with dashes and underscores only'),
    body('name')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be 1-100 characters'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Description must be maximum 500 characters'),
    body('discountType')
      .isIn(Object.values(PromoCodeDiscountType))
      .withMessage('Discount type must be percentage or fixed_amount'),
    body('discountValue')
      .isFloat({ min: 0.01 })
      .withMessage('Discount value must be positive'),
    body('validFrom')
      .isISO8601()
      .toDate()
      .withMessage('Valid from must be a valid date'),
    body('validUntil')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Valid until must be a valid date'),
    body('maxUses')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Max uses must be a positive integer'),
    body('maxUsesPerUser')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Max uses per user must be a positive integer'),
    body('applicablePlans')
      .optional()
      .isArray()
      .withMessage('Applicable plans must be an array'),
    body('minimumAmount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum amount must be positive'),
    body('newUsersOnly')
      .optional()
      .isBoolean()
      .withMessage('New users only must be a boolean'),
    body('tenantId')
      .optional()
      .isString()
      .withMessage('Tenant ID must be a string')
  ],
  validateBody,
  PromoCodeController.createPromoCode
);

/**
 * Lister les codes promo avec filtres et pagination
 * GET /api/v1/promo-codes
 * Accès: Admin seulement
 */
router.get('/',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 100 }),
  [
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    query('discountType')
      .optional()
      .isIn(Object.values(PromoCodeDiscountType))
      .withMessage('Invalid discount type'),
    query('tenantId')
      .optional()
      .isString()
      .withMessage('Tenant ID must be a string'),
    query('createdBy')
      .optional()
      .isString()
      .withMessage('Created by must be a string'),
    query('search')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Search query must be maximum 100 characters'),
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
      .isIn(['createdAt', 'updatedAt', 'validFrom', 'validUntil', 'currentUses', 'name'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],
  validateBody,
  PromoCodeController.listPromoCodes
);

/**
 * Obtenir un code promo par ID
 * GET /api/v1/promo-codes/:promoCodeId
 * Accès: Admin seulement
 */
router.get('/:promoCodeId',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 100 }),
  [
    param('promoCodeId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Promo code ID is required')
  ],
  validateBody,
  PromoCodeController.getPromoCode
);

/**
 * Mettre à jour un code promo
 * PUT /api/v1/promo-codes/:promoCodeId
 * Accès: Admin seulement
 */
router.put('/:promoCodeId',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 50 }),
  [
    param('promoCodeId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Promo code ID is required'),
    body('name')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be 1-100 characters'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Description must be maximum 500 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('validUntil')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Valid until must be a valid date'),
    body('maxUses')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Max uses must be a positive integer'),
    body('maxUsesPerUser')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Max uses per user must be a positive integer'),
    body('applicablePlans')
      .optional()
      .isArray()
      .withMessage('Applicable plans must be an array'),
    body('minimumAmount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum amount must be positive')
  ],
  validateBody,
  PromoCodeController.updatePromoCode
);

/**
 * Supprimer un code promo
 * DELETE /api/v1/promo-codes/:promoCodeId
 * Accès: Admin seulement
 */
router.delete('/:promoCodeId',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 20 }),
  [
    param('promoCodeId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Promo code ID is required')
  ],
  validateBody,
  PromoCodeController.deletePromoCode
);

/**
 * Valider un code promo (endpoint public)
 * POST /api/v1/promo-codes/validate
 * Accès: Utilisateur authentifié
 */
router.post('/validate',
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 30 }), // Rate limiting plus strict pour éviter l'abus
  [
    body('code')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Code is required and must be maximum 50 characters'),
    body('planId')
      .optional()
      .isString()
      .withMessage('Plan ID must be a string'),
    body('subscriptionAmount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Subscription amount must be positive')
  ],
  validateBody,
  PromoCodeController.validatePromoCode
);

/**
 * Appliquer un code promo
 * POST /api/v1/promo-codes/apply
 * Accès: Utilisateur authentifié
 */
router.post('/apply',
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 }), // Rate limiting strict pour l'application
  [
    body('code')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Code is required and must be maximum 50 characters'),
    body('subscriptionId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Subscription ID is required'),
    body('subscriptionAmount')
      .isFloat({ min: 0.01 })
      .withMessage('Subscription amount is required and must be positive')
  ],
  validateBody,
  PromoCodeController.applyPromoCode
);

/**
 * Révoquer l'utilisation d'un code promo
 * DELETE /api/v1/promo-codes/usage/:usageId
 * Accès: Admin seulement
 */
router.delete('/usage/:usageId',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 20 }),
  [
    param('usageId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Usage ID is required')
  ],
  validateBody,
  PromoCodeController.revokePromoCode
);

/**
 * Obtenir les statistiques d'un code promo
 * GET /api/v1/promo-codes/:promoCodeId/stats
 * Accès: Admin seulement
 */
router.get('/:promoCodeId/stats',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 100 }),
  [
    param('promoCodeId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Promo code ID is required')
  ],
  validateBody,
  PromoCodeController.getPromoCodeStats
);

/**
 * Générer un rapport d'utilisation
 * GET /api/v1/promo-codes/usage-report
 * Accès: Admin seulement
 */
router.get('/usage-report',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 50 }),
  [
    query('promoCodeId')
      .optional()
      .isString()
      .withMessage('Promo code ID must be a string'),
    query('userId')
      .optional()
      .isString()
      .withMessage('User ID must be a string'),
    query('tenantId')
      .optional()
      .isString()
      .withMessage('Tenant ID must be a string'),
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Date from must be a valid ISO date'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('Date to must be a valid ISO date')
  ],
  validateBody,
  PromoCodeController.getUsageReport
);

/**
 * Activer/désactiver un code promo
 * PUT /api/v1/promo-codes/:promoCodeId/toggle
 * Accès: Admin seulement
 */
router.put('/:promoCodeId/toggle',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 50 }),
  [
    param('promoCodeId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Promo code ID is required'),
    body('isActive')
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ],
  validateBody,
  PromoCodeController.togglePromoCode
);

/**
 * Obtenir un code promo par son code (endpoint public pour validation)
 * GET /api/v1/promo-codes/by-code/:code
 * Accès: Utilisateur authentifié
 */
router.get('/by-code/:code',
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 50 }),
  [
    param('code')
      .isString()
      .isLength({ min: 1, max: 50 })
      .matches(/^[A-Z0-9_-]+$/i)
      .withMessage('Code must be alphanumeric with dashes and underscores only')
  ],
  validateBody,
  PromoCodeController.getPromoCodeByCode
);

/**
 * Générer des codes promo en masse
 * POST /api/v1/promo-codes/bulk-generate
 * Accès: Admin seulement
 */
router.post('/bulk-generate',
  rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 5 }), // Très restrictif: 5 générations en masse par heure
  [
    body('baseName')
      .isString()
      .isLength({ min: 3, max: 20 })
      .matches(/^[A-Z0-9_-]+$/i)
      .withMessage('Base name must be 3-20 characters, alphanumeric with dashes and underscores only'),
    body('count')
      .isInt({ min: 1, max: 100 })
      .withMessage('Count must be between 1 and 100'),
    body('discountType')
      .isIn(Object.values(PromoCodeDiscountType))
      .withMessage('Discount type must be percentage or fixed_amount'),
    body('discountValue')
      .isFloat({ min: 0.01 })
      .withMessage('Discount value must be positive'),
    body('validFrom')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Valid from must be a valid date'),
    body('validUntil')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Valid until must be a valid date'),
    body('maxUses')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Max uses must be a positive integer'),
    body('maxUsesPerUser')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Max uses per user must be a positive integer')
  ],
  validateBody,
  PromoCodeController.bulkGeneratePromoCodes
);

export default router;