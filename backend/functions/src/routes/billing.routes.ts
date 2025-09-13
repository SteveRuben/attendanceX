/**
 * Routes pour la gestion de la facturation
 * Dashboard et gestion des abonnements pour les tenants
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { tenantContextMiddleware } from '../middleware/tenant-context.middleware';
import { subscriptionPlanService } from '../services/subscription/subscription-plan.service';
import { subscriptionLifecycleService } from '../services/subscription/subscription-lifecycle.service';
import { automatedBillingService } from '../services/billing/automated-billing.service';
import { usageBillingService } from '../services/billing/usage-billing.service';
import { billingNotificationsService } from '../services/billing/billing-notifications.service';
import { asyncHandler } from '../middleware/errorHandler';

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
router.get('/plans', ...billingProtection, asyncHandler(async (req, res) => {
  const plans = await subscriptionPlanService.getActivePlans();
  const comparison = await subscriptionPlanService.comparePlans();

  res.json({
    success: true,
    data: {
      plans,
      comparison
    }
  });
}));

/**
 * Changer de plan
 * POST /billing/change-plan
 */
router.post('/change-plan', ...billingProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;
  const { newPlanId, billingCycle, effectiveDate } = req.body;

  const subscription = await subscriptionLifecycleService.getActiveSubscriptionByTenant(tenantContext.tenantId);
  if (!subscription) {
    return res.status(400).json({
      success: false,
      error: 'No active subscription found'
    });
  }

  // Obtenir les informations de mise à niveau
  const upgradeInfo = await subscriptionPlanService.getPlanUpgradeInfo(
    subscription.planId,
    newPlanId
  );

  // Changer le plan
  const updatedSubscription = await subscriptionLifecycleService.changePlan({
    subscriptionId: subscription.id,
    newPlanId,
    billingCycle,
    effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
    prorationBehavior: 'create_prorations'
  });

  return res.json({
    success: true,
    data: {
      subscription: updatedSubscription,
      upgradeInfo,
      message: upgradeInfo.isUpgrade ? 'Plan upgraded successfully' : 'Plan changed successfully'
    }
  });
}));

/**
 * Obtenir l'historique des factures
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
router.post('/cancel', ...billingProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;
  const { reason, cancelAtPeriodEnd = true } = req.body;

  const subscription = await subscriptionLifecycleService.getActiveSubscriptionByTenant(tenantContext.tenantId);
  if (!subscription) {
    return res.status(400).json({
      success: false,
      error: 'No active subscription found'
    });
  }

  const cancelledSubscription = await subscriptionLifecycleService.cancelSubscription({
    subscriptionId: subscription.id,
    reason,
    cancelAtPeriodEnd
  });

  return res.json({
    success: true,
    data: {
      subscription: cancelledSubscription,
      message: cancelAtPeriodEnd
        ? 'Subscription will be cancelled at the end of the current period'
        : 'Subscription cancelled immediately'
    }
  });
}));

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

export default router;