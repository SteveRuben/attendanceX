import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rateLimit';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { z } from 'zod';
import { CampaignDeliveryController } from '../../controllers/notification/campaign-delivery.controller';

const router = Router();

// Apply authentication to all routes (except tracking endpoints)
router.use('/campaigns', authenticate);

// Campaign delivery status
router.get('/campaigns/:campaignId/status',
  validateParams(z.object({
    campaignId: z.string().min(1)
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 200,
  }),
  CampaignDeliveryController.getDeliveryStatus
);

// Campaign queue status
router.get('/campaigns/:campaignId/queue',
  validateParams(z.object({
    campaignId: z.string().min(1)
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 200,
  }),
  CampaignDeliveryController.getQueueStatus
);

// Retry failed deliveries
router.post('/campaigns/:campaignId/retry',
  requirePermission('send_notifications'),
  validateParams(z.object({
    campaignId: z.string().min(1)
  })),
  validateBody(z.object({
    maxRetries: z.number().int().min(1).max(10).default(3)
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
  }),
  CampaignDeliveryController.retryFailedDeliveries
);

// Get email providers status
router.get('/providers/status',
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),
  CampaignDeliveryController.getProvidersStatus
);

// Test email delivery
router.post('/test',
  requirePermission('send_notifications'),
  validateBody(z.object({
    testEmail: z.string().email(),
    campaignId: z.string().optional(),
    templateId: z.string().optional(),
    subject: z.string().min(1).max(500).optional(),
    content: z.object({
      htmlContent: z.string().optional(),
      textContent: z.string().optional()
    }).optional(),
    provider: z.string().optional()
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30, // Limited test emails per minute
  }),
  CampaignDeliveryController.testDelivery
);

// Get delivery analytics
router.get('/campaigns/:campaignId/analytics',
  validateParams(z.object({
    campaignId: z.string().min(1)
  })),
  validateQuery(z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    groupBy: z.enum(['hour', 'day', 'week']).default('day'),
    includeDetails: z.enum(['true', 'false']).default('false')
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),
  CampaignDeliveryController.getDeliveryAnalytics
);

// Tracking endpoints (no authentication required)

// Email open tracking pixel
router.get('/track/pixel/:pixelId',
  validateParams(z.object({
    pixelId: z.string().min(1)
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 1000, // High limit for tracking
  }),
  CampaignDeliveryController.trackPixel
);

// Link click tracking
router.get('/track/click/:linkId',
  validateParams(z.object({
    linkId: z.string().min(1)
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 1000, // High limit for tracking
  }),
  CampaignDeliveryController.trackClick
);

// Unsubscribe page (GET)
router.get('/unsubscribe/:token',
  validateParams(z.object({
    token: z.string().min(1)
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 200,
  }),
  CampaignDeliveryController.getUnsubscribePage
);

// Process unsubscribe (POST)
router.post('/unsubscribe/:token',
  validateParams(z.object({
    token: z.string().min(1)
  })),
  validateBody(z.object({
    reason: z.string().max(500).optional()
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),
  CampaignDeliveryController.handleUnsubscribe
);

export default router;