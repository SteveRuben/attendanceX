/**
 * Routes pour les webhooks Stripe
 * Gère les événements de paiement et d'abonnement
 */

import { Router, Request, Response } from 'express';
import { stripePaymentService } from '../services/billing/stripe-payment.service';
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

    // Traiter le webhook
    const result = await stripePaymentService.handleStripeWebhook(payload, signature);

    if (result.received) {
      logger.info('Stripe webhook processed', {
        processed: result.processed,
        signature: signature.substring(0, 20) + '...'
      });

      return res.status(200).json({
        success: true,
        received: result.received,
        processed: result.processed
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

export default router;