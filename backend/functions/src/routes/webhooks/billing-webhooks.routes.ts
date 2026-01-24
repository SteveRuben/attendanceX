/**
 * Routes pour les webhooks de billing
 * Gère les webhooks Stripe, analytics et partenaires
 */

import { Router, Request, Response } from 'express';
import { billingWebhooksService } from '../../webhooks/billing.webhooks';
import { billingSecurityMiddleware, sensitiveDataValidationMiddleware } from '../../middleware/billing-security.middleware';
import { BillingAction, BillingEntityType } from '../../services/billing/billing-audit.service';
import { logger } from 'firebase-functions';

const router = Router();

/**
 * Webhook Stripe pour les événements de billing
 * POST /webhooks/billing/stripe
 */
router.post('/stripe', 
  sensitiveDataValidationMiddleware(),
  async (req: Request, res: Response) => {
    await billingWebhooksService.handleStripeWebhook(req, res);
  }
);

/**
 * Webhook pour les événements d'analytics
 * POST /webhooks/billing/analytics
 */
router.post('/analytics',
  billingSecurityMiddleware({
    action: BillingAction.SUSPICIOUS_ACTIVITY, // Utiliser pour les événements analytics
    entityType: BillingEntityType.TENANT,
    skipRateLimit: true, // Les webhooks analytics ne doivent pas être limités
    skipAudit: false,
    requireAuth: false // Les webhooks externes n'ont pas d'auth utilisateur
  }),
  async (req: Request, res: Response) => {
    await billingWebhooksService.handleAnalyticsWebhook(req, res);
  }
);

/**
 * Webhook pour les partenaires
 * POST /webhooks/billing/partner/:partnerId
 */
router.post('/partner/:partnerId',
  billingSecurityMiddleware({
    action: BillingAction.SUSPICIOUS_ACTIVITY,
    entityType: BillingEntityType.TENANT,
    skipRateLimit: true,
    skipAudit: false,
    requireAuth: false
  }),
  async (req: Request, res: Response) => {
    await billingWebhooksService.handlePartnerWebhook(req, res);
  }
);

/**
 * Endpoint pour tester les webhooks
 * POST /webhooks/billing/test
 */
router.post('/test',
  billingSecurityMiddleware({
    action: BillingAction.SUSPICIOUS_ACTIVITY,
    entityType: BillingEntityType.TENANT,
    requireAuth: true,
    adminOnly: true
  }),
  async (req: Request, res: Response) => {
    try {
      const { type, data } = req.body;

      if (!type || !data) {
        return res.status(400).json({
          success: false,
          error: 'Missing type or data in request body'
        });
      }

      // Simuler un événement webhook pour les tests
      const testEvent = {
        id: `test_${Date.now()}`,
        type,
        data,
        created: Math.floor(Date.now() / 1000),
        livemode: false
      };

      // Traiter l'événement de test
      await billingWebhooksService.sendToAnalytics(testEvent);
      await billingWebhooksService.notifyPartners(testEvent);

      logger.info('Test webhook processed', {
        type,
        eventId: testEvent.id
      });

      return res.json({
        success: true,
        message: 'Test webhook processed successfully',
        data: {
          eventId: testEvent.id,
          type,
          processedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error processing test webhook:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process test webhook'
      });
    }
  }
);

/**
 * Endpoint pour obtenir le statut des webhooks
 * GET /webhooks/billing/status
 */
router.get('/status',
  billingSecurityMiddleware({
    action: BillingAction.SUSPICIOUS_ACTIVITY,
    entityType: BillingEntityType.TENANT,
    requireAuth: true,
    adminOnly: true,
    skipAudit: true
  }),
  async (req: Request, res: Response) => {
    try {
      // Obtenir les statistiques des webhooks des dernières 24h
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const webhookStats = await getWebhookStats(last24h);
      const partnerStatus = await getPartnerStatus();

      return res.json({
        success: true,
        data: {
          period: '24h',
          stats: webhookStats,
          partners: partnerStatus,
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error getting webhook status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get webhook status'
      });
    }
  }
);

/**
 * Endpoint pour reconfigurer les webhooks partenaires
 * PUT /webhooks/billing/partner/:partnerId/config
 */
router.put('/partner/:partnerId/config',
  billingSecurityMiddleware({
    action: BillingAction.SUSPICIOUS_ACTIVITY,
    entityType: BillingEntityType.TENANT,
    requireAuth: true,
    adminOnly: true
  }),
  async (req: Request, res: Response) => {
    try {
      const partnerId = req.params.partnerId as string;
      const config = req.body;

      // Valider la configuration
      const validationResult = validatePartnerConfig(config);
      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid partner configuration',
          details: validationResult.errors
        });
      }

      // Sauvegarder la configuration
      await savePartnerConfig(partnerId, config);

      logger.info('Partner webhook configuration updated', {
        partnerId,
        enabled: config.enabled
      });

      return res.json({
        success: true,
        message: 'Partner configuration updated successfully',
        data: {
          partnerId,
          config
        }
      });

    } catch (error) {
      logger.error('Error updating partner configuration:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update partner configuration'
      });
    }
  }
);

/**
 * Endpoint pour obtenir les logs de webhooks
 * GET /webhooks/billing/logs
 */
router.get('/logs',
  billingSecurityMiddleware({
    action: BillingAction.SUSPICIOUS_ACTIVITY,
    entityType: BillingEntityType.TENANT,
    requireAuth: true,
    adminOnly: true,
    skipAudit: true
  }),
  async (req: Request, res: Response) => {
    try {
      const {
        source,
        type,
        processed,
        startDate,
        endDate,
        limit = 50,
        offset = 0
      } = req.query;

      const filters: any = {};
      
      if (source) {filters.source = source;}
      if (type) {filters.type = type;}
      if (processed !== undefined) {filters.processed = processed === 'true';}
      if (startDate) {filters.startDate = new Date(startDate as string);}
      if (endDate) {filters.endDate = new Date(endDate as string);}

      const logs = await getWebhookLogs(filters, Number(limit), Number(offset));

      return res.json({
        success: true,
        data: {
          logs,
          pagination: {
            limit: Number(limit),
            offset: Number(offset),
            total: logs.length
          },
          filters
        }
      });

    } catch (error) {
      logger.error('Error getting webhook logs:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get webhook logs'
      });
    }
  }
);

/**
 * Endpoint pour retry un webhook échoué
 * POST /webhooks/billing/retry/:webhookId
 */
router.post('/retry/:webhookId',
  billingSecurityMiddleware({
    action: BillingAction.SUSPICIOUS_ACTIVITY,
    entityType: BillingEntityType.TENANT,
    requireAuth: true,
    adminOnly: true
  }),
  async (req: Request, res: Response) => {
    try {
      const webhookId = req.params.webhookId as string;

      const retryResult = await retryWebhook(webhookId);

      if (!retryResult.success) {
        return res.status(400).json({
          success: false,
          error: retryResult.error
        });
      }

      return res.json({
        success: true,
        message: 'Webhook retry initiated',
        data: {
          webhookId,
          retryCount: retryResult.retryCount,
          scheduledFor: retryResult.scheduledFor
        }
      });

    } catch (error) {
      logger.error('Error retrying webhook:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retry webhook'
      });
    }
  }
);

// Fonctions utilitaires

async function getWebhookStats(since: Date): Promise<any> {
  try {
    const { collections } = require('../../config/database');
    
    const snapshot = await collections.webhook_events
      .where('timestamp', '>=', since)
      .get();

    const stats = {
      total: snapshot.size,
      processed: 0,
      failed: 0,
      bySource: {} as Record<string, number>,
      byType: {} as Record<string, number>
    };

    snapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      
      if (data.processed) {
        stats.processed++;
      } else {
        stats.failed++;
      }

      stats.bySource[data.source] = (stats.bySource[data.source] || 0) + 1;
      stats.byType[data.type] = (stats.byType[data.type] || 0) + 1;
    });

    return stats;
  } catch (error) {
    logger.error('Error getting webhook stats:', error);
    return {};
  }
}

async function getPartnerStatus(): Promise<any[]> {
  try {
    const { collections } = require('../../config/database');
    
    const snapshot = await collections.partner_webhook_configs.get();
    
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      lastPing: new Date() // À implémenter avec de vraies données
    }));
  } catch (error) {
    logger.error('Error getting partner status:', error);
    return [];
  }
}

function validatePartnerConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name) {errors.push('Name is required');}
  if (!config.url) {errors.push('URL is required');}
  if (!config.secret) {errors.push('Secret is required');}
  if (!Array.isArray(config.events)) {errors.push('Events must be an array');}

  // Valider l'URL
  try {
    new URL(config.url);
  } catch {
    errors.push('Invalid URL format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

async function savePartnerConfig(partnerId: string, config: any): Promise<void> {
  try {
    const { collections } = require('../../config/database');
    
    await collections.partner_webhook_configs.doc(partnerId).set({
      ...config,
      id: partnerId,
      updatedAt: new Date()
    });
  } catch (error) {
    logger.error('Error saving partner config:', error);
    throw error;
  }
}

async function getWebhookLogs(filters: any, limit: number, offset: number): Promise<any[]> {
  try {
    const { collections } = require('../../config/database');
    
    let query = collections.webhook_events.orderBy('timestamp', 'desc');

    // Appliquer les filtres
    if (filters.source) {
      query = query.where('source', '==', filters.source);
    }
    if (filters.type) {
      query = query.where('type', '==', filters.type);
    }
    if (filters.processed !== undefined) {
      query = query.where('processed', '==', filters.processed);
    }
    if (filters.startDate) {
      query = query.where('timestamp', '>=', filters.startDate);
    }
    if (filters.endDate) {
      query = query.where('timestamp', '<=', filters.endDate);
    }

    query = query.limit(limit).offset(offset);

    const snapshot = await query.get();
    
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    logger.error('Error getting webhook logs:', error);
    return [];
  }
}

async function retryWebhook(webhookId: string): Promise<{
  success: boolean;
  error?: string;
  retryCount?: number;
  scheduledFor?: Date;
}> {
  try {
    const { collections } = require('../../config/database');
    
    const doc = await collections.webhook_events.doc(webhookId).get();
    
    if (!doc.exists) {
      return {
        success: false,
        error: 'Webhook not found'
      };
    }

    const webhookData = doc.data();
    
    if (webhookData.processed) {
      return {
        success: false,
        error: 'Webhook already processed'
      };
    }

    if (webhookData.retryCount >= webhookData.maxRetries) {
      return {
        success: false,
        error: 'Maximum retries exceeded'
      };
    }

    // Programmer le retry
    const scheduledFor = new Date(Date.now() + 60000); // 1 minute
    
    await collections.webhook_events.doc(webhookId).update({
      retryCount: webhookData.retryCount + 1,
      scheduledFor
    });

    return {
      success: true,
      retryCount: webhookData.retryCount + 1,
      scheduledFor
    };
  } catch (error) {
    logger.error('Error retrying webhook:', error);
    return {
      success: false,
      error: 'Internal error'
    };
  }
}

export default router;