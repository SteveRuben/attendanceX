/**
 * Routes pour la gestion de la facturation
 * Dashboard et gestion des abonnements pour les tenants
 */

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import { tenantContextMiddleware } from '../../middleware/tenant-context.middleware';
import { validateBody } from '../../middleware/validation';
import { smartRateLimit } from '../../middleware/smartRateLimit';
import { BillingController } from '../../controllers/billing/billing.controller';
import { subscriptionLifecycleService } from '../../services/subscription/subscription-lifecycle.service';
import { automatedBillingService } from '../../services/billing/automated-billing.service';
import { usageBillingService } from '../../services/billing/usage-billing.service';
import { billingNotificationsService } from '../../services/billing/billing-notifications.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { GracePeriodSource } from '../../models/gracePeriod.model';

const router = Router();

// Middleware de base pour toutes les routes de facturation
const billingProtection = [
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess()
];

/**
 * Obtenir les informations de facturation du tenant
 * GET /billing/dashboard
 */
router.get('/dashboard', ...billingProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;

  // Obtenir l'abonnement actuel
  const subscription = await subscriptionLifecycleService.getActiveSubscriptionByTenant(tenantContext.tenantId);

  // Obtenir les factures récentes
  const invoices = await automatedBillingService.getInvoicesByTenant(tenantContext.tenantId);
  const recentInvoices = invoices.slice(0, 5);

  // Obtenir l'aperçu des overages
  const overagePreview = await usageBillingService.getOveragePreview(tenantContext.tenantId);

  res.json({
    success: true,
    data: {
      currentPlan: tenantContext.plan,
      subscription,
      usage: tenantContext.tenant.usage,
      limits: tenantContext.plan.limits,
      overagePreview,
      recentInvoices,
      billingInfo: {
        nextBillingDate: subscription?.nextPaymentDate,
        billingCycle: subscription?.billingCycle,
        currency: subscription?.currency
      }
    }
  });
}));

/**
 * Obtenir tous les plans disponibles
 * GET /billing/plans
 */
router.get('/plans', 
  smartRateLimit,
  BillingController.getPlans
);

/**
 * Changer de plan
 * POST /billing/change-plan
 */
router.post('/change-plan',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  smartRateLimit,
  [
    body('planId')
      .isString()
      .notEmpty()
      .withMessage('Plan ID is required'),
    body('billingCycle')
      .optional()
      .isIn(['monthly', 'yearly'])
      .withMessage('Billing cycle must be monthly or yearly'),
    body('promoCode')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Promo code must be maximum 50 characters')
  ],
  validateBody,
  BillingController.changePlan
);

/**
 * Obtenir l'abonnement actuel du tenant
 * GET /billing/subscription
 */
router.get('/subscription',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  smartRateLimit,
  BillingController.getCurrentSubscription
);

/**
 * Obtenir l'historique de facturation
 * GET /billing/history
 */
router.get('/history',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  smartRateLimit,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  validateBody,
  BillingController.getBillingHistory
);

/**
 * Obtenir les statistiques d'utilisation
 * GET /billing/usage
 */
router.get('/usage',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  smartRateLimit,
  BillingController.getUsageStats
);

/**
 * Obtenir l'historique des factures (ancienne route pour compatibilité)
 * GET /billing/invoices
 */
router.get('/invoices', ...billingProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;
  const { page = 1, limit = 10 } = req.query;

  const allInvoices = await automatedBillingService.getInvoicesByTenant(tenantContext.tenantId);

  // Pagination simple
  const startIndex = (Number(page) - 1) * Number(limit);
  const endIndex = startIndex + Number(limit);
  const paginatedInvoices = allInvoices.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      invoices: paginatedInvoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: allInvoices.length,
        totalPages: Math.ceil(allInvoices.length / Number(limit)),
        hasNext: endIndex < allInvoices.length,
        hasPrev: Number(page) > 1
      }
    }
  });
}));

/**
 * Obtenir une facture spécifique
 * GET /billing/invoices/:invoiceId
 */
router.get('/invoices/:invoiceId', ...billingProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;
  const { invoiceId } = req.params;

  const invoice = await automatedBillingService.getInvoiceById(invoiceId);

  if (!invoice || invoice.tenantId !== tenantContext.tenantId) {
    return res.status(404).json({
      success: false,
      error: 'Invoice not found'
    });
  }

  return res.json({
    success: true,
    data: invoice
  });
}));

/**
 * Payer une facture
 * POST /billing/invoices/:invoiceId/pay
 */
router.post('/invoices/:invoiceId/pay', ...billingProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;
  const { invoiceId } = req.params;

  const invoice = await automatedBillingService.getInvoiceById(invoiceId);

  if (!invoice || invoice.tenantId !== tenantContext.tenantId) {
    return res.status(404).json({
      success: false,
      error: 'Invoice not found'
    });
  }

  const paymentResult = await automatedBillingService.processPayment(invoiceId);

  return res.json({
    success: paymentResult.success,
    data: {
      paymentIntentId: paymentResult.paymentIntentId,
      message: paymentResult.success ? 'Payment processed successfully' : 'Payment failed'
    }
  });
}));

/**
 * Obtenir l'aperçu des coûts d'overage
 * GET /billing/overage-preview
 */
router.get('/overage-preview', ...billingProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;

  const overagePreview = await usageBillingService.getOveragePreview(tenantContext.tenantId);

  res.json({
    success: true,
    data: overagePreview
  });
}));

/**
 * Annuler l'abonnement
 * POST /billing/cancel
 */
router.post('/cancel',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  smartRateLimit,
  [
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Reason must be a string with maximum 500 characters')
  ],
  validateBody,
  BillingController.cancelSubscription
);

/**
 * Obtenir les alertes de facturation
 * GET /billing/alerts
 */
router.get('/alerts', ...billingProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;

  const alerts = await billingNotificationsService.getAlertsByTenant(tenantContext.tenantId);

  res.json({
    success: true,
    data: alerts
  });
}));

/**
 * Marquer une alerte comme lue
 * POST /billing/alerts/:alertId/dismiss
 */
router.post('/alerts/:alertId/dismiss', ...billingProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;
  const { alertId } = req.params;

  await billingNotificationsService.dismissAlert(alertId, tenantContext.tenantId);

  res.json({
    success: true,
    message: 'Alert dismissed successfully'
  });
}));

/**
 * Appliquer un code promo à un abonnement
 * POST /billing/apply-promo-code
 */
router.post('/apply-promo-code',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  smartRateLimit,
  [
    body('subscriptionId')
      .isString()
      .notEmpty()
      .withMessage('Subscription ID is required'),
    body('promoCode')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Promo code is required and must be maximum 50 characters')
  ],
  validateBody,
  BillingController.applyPromoCode
);

/**
 * Supprimer un code promo d'un abonnement
 * DELETE /billing/remove-promo-code/:subscriptionId
 */
router.delete('/remove-promo-code/:subscriptionId',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  smartRateLimit,
  [
    param('subscriptionId')
      .isString()
      .notEmpty()
      .withMessage('Subscription ID is required')
  ],
  validateBody,
  BillingController.removePromoCode
);

/**
 * Routes pour les méthodes de paiement
 */
import { PaymentMethodController } from '../../controllers/billing/payment-method.controller';

/**
 * Créer une méthode de paiement
 * POST /billing/payment-methods
 */
router.post('/payment-methods',
  smartRateLimit,
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  [
    body('paymentProvider')
      .isString()
      .notEmpty()
      .withMessage('Payment provider is required'),
    body('type')
      .isIn(['card', 'bank_account', 'wallet'])
      .withMessage('Type must be card, bank_account, or wallet'),
    body('isDefault')
      .optional()
      .isBoolean()
      .withMessage('isDefault must be a boolean'),
    body('card')
      .optional()
      .isObject()
      .withMessage('Card must be an object'),
    body('bankAccount')
      .optional()
      .isObject()
      .withMessage('Bank account must be an object'),
    body('wallet')
      .optional()
      .isObject()
      .withMessage('Wallet must be an object')
  ],
  validateBody,
  PaymentMethodController.createPaymentMethod
);

/**
 * Obtenir une méthode de paiement spécifique
 * GET /billing/payment-methods/:paymentMethodId
 */
router.get('/payment-methods/:paymentMethodId',
  smartRateLimit,
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  [
    param('paymentMethodId')
      .isString()
      .notEmpty()
      .withMessage('Payment method ID is required')
  ],
  validateBody,
  PaymentMethodController.getPaymentMethod
);

/**
 * Obtenir toutes les méthodes de paiement du tenant
 * GET /billing/payment-methods
 */
router.get('/payment-methods',
  smartRateLimit,
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  PaymentMethodController.getPaymentMethods
);

/**
 * Mettre à jour une méthode de paiement
 * PUT /billing/payment-methods/:paymentMethodId
 */
router.put('/payment-methods/:paymentMethodId',
  smartRateLimit,
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  [
    param('paymentMethodId')
      .isString()
      .notEmpty()
      .withMessage('Payment method ID is required'),
    body('isDefault')
      .optional()
      .isBoolean()
      .withMessage('isDefault must be a boolean'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],
  validateBody,
  PaymentMethodController.updatePaymentMethod
);

/**
 * Supprimer une méthode de paiement
 * DELETE /billing/payment-methods/:paymentMethodId
 */
router.delete('/payment-methods/:paymentMethodId',
  smartRateLimit,
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  [
    param('paymentMethodId')
      .isString()
      .notEmpty()
      .withMessage('Payment method ID is required')
  ],
  validateBody,
  PaymentMethodController.deletePaymentMethod
);

/**
 * Créer une période de grâce pour un utilisateur
 * POST /billing/create-grace-period
 */
router.post('/create-grace-period',
  authenticate,
  smartRateLimit,
  [
    body('userId')
      .isString()
      .notEmpty()
      .withMessage('User ID is required'),
    body('tenantId')
      .isString()
      .notEmpty()
      .withMessage('Tenant ID is required'),
    body('durationDays')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Duration must be between 1 and 365 days'),
    body('source')
      .optional()
      .isIn(Object.values(GracePeriodSource))
      .withMessage('Invalid grace period source')
  ],
  validateBody,
  BillingController.createGracePeriod
);

/**
 * Étendre une période de grâce
 * PUT /billing/extend-grace-period/:gracePeriodId
 */
router.put('/extend-grace-period/:gracePeriodId',
  authenticate,
  smartRateLimit,
  [
    param('gracePeriodId')
      .isString()
      .notEmpty()
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
  BillingController.extendGracePeriod
);

/**
 * Convertir une période de grâce en abonnement payant
 * POST /billing/convert-grace-period/:gracePeriodId
 */
router.post('/convert-grace-period/:gracePeriodId',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  smartRateLimit,
  [
    param('gracePeriodId')
      .isString()
      .notEmpty()
      .withMessage('Grace period ID is required'),
    body('planId')
      .isString()
      .notEmpty()
      .withMessage('Plan ID is required'),
    body('promoCodeId')
      .optional()
      .isString()
      .withMessage('Promo code ID must be a string')
  ],
  validateBody,
  BillingController.convertGracePeriod
);

/**
 * Migrer les utilisateurs existants du plan gratuit
 * POST /billing/migrate-existing-users
 */
router.post('/migrate-existing-users',
  authenticate,
  smartRateLimit, // Très restrictif pour les migrations en masse
  BillingController.migrateExistingUsers
);

/**
 * Migrer un utilisateur spécifique
 * POST /billing/migrate-user
 */
router.post('/migrate-user',
  authenticate,
  smartRateLimit,
  [
    body('userId')
      .isString()
      .notEmpty()
      .withMessage('User ID is required'),
    body('tenantId')
      .isString()
      .notEmpty()
      .withMessage('Tenant ID is required')
  ],
  validateBody,
  BillingController.migrateUser
);

/**
 * Obtenir le statut de la période de grâce pour l'utilisateur connecté
 * GET /billing/my-grace-period-status
 */
router.get('/my-grace-period-status',
  authenticate,
  smartRateLimit, // Plus permissif car utilisé fréquemment
  BillingController.getMyGracePeriodStatus
);

export default router;
