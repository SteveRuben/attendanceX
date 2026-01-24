/**
 * Routes pour les webhooks Stripe
 * Gère les événements de paiement et d'abonnement
 */

import { Router, Request, Response } from 'express';
import { stripePaymentService } from '../../services/billing/stripe-payment.service';
import { stripePromoCodeService } from '../../integrations/stripe/stripe.service';
import { logger } from 'firebase-functions';

const router = Router();

/**
 * Endpoint pour les webhooks Stripe
 * POST /stripe/webhook
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      logger.warn('Missing Stripe signature header');
      return res.status(400).json({
        success: false,
        error: 'Missing Stripe signature'
      });
    }

    // Obtenir le payload brut
    const payload = req.body;

    // Traiter le webhook principal
    const result = await stripePaymentService.handleStripeWebhook(payload, signature);

    // Traiter les événements liés aux codes promo
    let promoCodeProcessed = false;
    try {
      // Construire l'événement pour vérifier le type
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);

      // Vérifier si c'est un événement lié aux codes promo
      const promoCodeEvents = [
        'coupon.created', 'coupon.updated', 'coupon.deleted',
        'promotion_code.created', 'promotion_code.updated',
        'customer.discount.created', 'customer.discount.deleted'
      ];

      if (promoCodeEvents.includes(event.type)) {
        promoCodeProcessed = await stripePromoCodeService.handlePromoCodeWebhook(event);
      }
    } catch (promoError) {
      logger.warn('Error processing promo code webhook:', promoError);
    }

    if (result.received) {
      logger.info('Stripe webhook processed', {
        processed: result.processed,
        promoCodeProcessed,
        signature: signature.substring(0, 20) + '...'
      });

      return res.status(200).json({
        success: true,
        received: result.received,
        processed: result.processed,
        promoCodeProcessed
      });
    } else {
      logger.error('Failed to process Stripe webhook');
      return res.status(400).json({
        success: false,
        error: 'Failed to process webhook'
      });
    }

  } catch (error) {
    logger.error('Error in Stripe webhook endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Endpoint de test pour vérifier la configuration Stripe
 * GET /stripe/test
 */
router.get('/test', async (req: Request, res: Response) => {
  try {
    // Vérifier que les clés Stripe sont configurées
    const hasSecretKey = !!process.env.STRIPE_SECRET_KEY;
    const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
    const hasPublishableKey = !!process.env.STRIPE_PUBLISHABLE_KEY;

    const config = {
      secretKey: hasSecretKey ? 'configured' : 'missing',
      webhookSecret: hasWebhookSecret ? 'configured' : 'missing',
      publishableKey: hasPublishableKey ? 'configured' : 'missing'
    };

    const allConfigured = hasSecretKey && hasWebhookSecret && hasPublishableKey;

    return res.json({
      success: true,
      data: {
        stripeConfigured: allConfigured,
        config,
        environment: process.env.NODE_ENV || 'development'
      }
    });

  } catch (error) {
    logger.error('Error in Stripe test endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Endpoint pour obtenir la clé publique Stripe
 * GET /stripe/public-key
 */
router.get('/public-key', (req: Request, res: Response) => {
  try {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      return res.status(500).json({
        success: false,
        error: 'Stripe publishable key not configured'
      });
    }

    return res.json({
      success: true,
      data: {
        publishableKey
      }
    });

  } catch (error) {
    logger.error('Error getting Stripe public key:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});


/**
 * Endpoint pour synchroniser les codes promo avec Stripe
 * POST /stripe/sync-promo-codes
 */
router.post('/sync-promo-codes', async (req: Request, res: Response) => {
  try {
    // Vérifier l'authentification admin (à implémenter selon votre système)
    // const isAdmin = await checkAdminPermissions(req);
    // if (!isAdmin) {
    //   return res.status(403).json({ success: false, error: 'Admin access required' });
    // }

    const result = await stripePromoCodeService.syncPromoCodesWithStripe();

    logger.info('Promo codes synchronized with Stripe', result);

    return res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error synchronizing promo codes with Stripe:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to synchronize promo codes'
    });
  }
});

/**
 * Endpoint pour appliquer un code promo à un abonnement
 * POST /stripe/apply-promo-code
 */
router.post('/apply-promo-code', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId, subscriptionId, promoCode } = req.body;

    if (!tenantId || !userId || !subscriptionId || !promoCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tenantId, userId, subscriptionId, promoCode'
      });
    }

    const result = await stripePromoCodeService.applyPromoCodeToSubscription({
      tenantId,
      userId,
      subscriptionId,
      promoCode
    });

    return res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    logger.error('Error applying promo code:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to apply promo code'
    });
  }
});

/**
 * Endpoint pour supprimer un code promo d'un abonnement
 * DELETE /stripe/remove-promo-code/:tenantId
 */
router.delete('/remove-promo-code/:tenantId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenantId parameter'
      });
    }

    const result = await stripePromoCodeService.removePromoCodeFromSubscription(tenantId);

    return res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    logger.error('Error removing promo code:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove promo code'
    });
  }
});

/**
 * Endpoint pour obtenir les statistiques d'utilisation d'un code promo
 * GET /stripe/promo-code-stats/:promoCodeId
 */
router.get('/promo-code-stats/:promoCodeId', async (req: Request, res: Response) => {
  try {
    const promoCodeId = req.params.promoCodeId as string;

    if (!promoCodeId) {
      return res.status(400).json({
        success: false,
        error: 'Missing promoCodeId parameter'
      });
    }

    const stats = await stripePromoCodeService.getPromoCodeUsageStats(promoCodeId);

    return res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting promo code stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get promo code statistics'
    });
  }
});

export default router;