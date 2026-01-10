import { Router } from 'express';
import { authenticate, requireTenantPermission } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { rateLimit } from '../../middleware/rateLimit';
import { z } from 'zod';
import { EventCampaignController } from '../../controllers/campaign/event-campaign.controller';

const router = Router();

// 🔒 Authentication required for all routes
router.use(authenticate);

// ==========================================
// Event Campaign Management Routes
// ==========================================

// 🎯 Create campaign from event
router.post('/events/:eventId/campaigns',
  requireTenantPermission('send_notifications'),
  validateParams(z.object({
    eventId: z.string().min(1, 'Event ID is required')
  })),
  validateBody(z.object({
    type: z.enum(['confirmation', 'reminder', 'update', 'cancellation']),
    notificationMethods: z.object({
      email: z.object({
        enabled: z.boolean(),
        generateQR: z.boolean(),
        templateId: z.string().optional()
      }).optional(),
      sms: z.object({
        enabled: z.boolean(),
        generatePIN: z.boolean(),
        templateId: z.string().optional()
      }).optional()
    }),
    scheduledAt: z.string().datetime().optional(),
    customMessage: z.string().max(1000).optional(),
    reminderSettings: z.object({
      send24hBefore: z.boolean().default(false),
      send1hBefore: z.boolean().default(false)
    }).optional()
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
  }),
  EventCampaignController.createEventCampaign
);

// 📋 Get event campaigns
router.get('/events/:eventId/campaigns',
  validateParams(z.object({
    eventId: z.string().min(1, 'Event ID is required')
  })),
  validateQuery(z.object({
    status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'failed']).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).default(0)
  })),
  EventCampaignController.getEventCampaigns
);

// 👀 Preview event campaign
router.post('/events/:eventId/campaigns/preview',
  requireTenantPermission('send_notifications'),
  validateParams(z.object({
    eventId: z.string().min(1, 'Event ID is required')
  })),
  validateBody(z.object({
    notificationMethods: z.object({
      email: z.object({
        enabled: z.boolean(),
        generateQR: z.boolean(),
        templateId: z.string().optional()
      }).optional(),
      sms: z.object({
        enabled: z.boolean(),
        generatePIN: z.boolean(),
        templateId: z.string().optional()
      }).optional()
    })
  })),
  EventCampaignController.previewEventCampaign
);

// 🚀 Send event campaign
router.post('/campaigns/:campaignId/send',
  requireTenantPermission('send_notifications'),
  validateParams(z.object({
    campaignId: z.string().min(1, 'Campaign ID is required')
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 5,
  }),
  EventCampaignController.sendEventCampaign
);

// ==========================================
// Access Code Validation Routes
// ==========================================

// 🔍 Validate QR code for event
router.post('/events/:eventId/validate-qr',
  validateParams(z.object({
    eventId: z.string().min(1, 'Event ID is required')
  })),
  validateBody(z.object({
    qrCodeId: z.string().min(1, 'QR code ID is required'),
    location: z.object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      accuracy: z.number().optional(),
      timestamp: z.string().datetime().optional()
    }).optional()
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
  }),
  EventCampaignController.validateQRCode
);

// 🔢 Validate PIN code for event
router.post('/events/:eventId/validate-pin',
  validateParams(z.object({
    eventId: z.string().min(1, 'Event ID is required')
  })),
  validateBody(z.object({
    pinCode: z.string().regex(/^\d{6}$/, 'PIN code must be 6 digits'),
    userId: z.string().optional()
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
  }),
  EventCampaignController.validatePINCode
);

// ==========================================
// Analytics and Statistics Routes
// ==========================================

// 📊 Get access code statistics for event
router.get('/events/:eventId/access-codes/stats',
  requireTenantPermission('view_reports'),
  validateParams(z.object({
    eventId: z.string().min(1, 'Event ID is required')
  })),
  EventCampaignController.getAccessCodeStats
);

// 📈 Get event campaign analytics
router.get('/campaigns/:campaignId/analytics',
  requireTenantPermission('view_reports'),
  validateParams(z.object({
    campaignId: z.string().min(1, 'Campaign ID is required')
  })),
  EventCampaignController.getEventCampaignAnalytics
);

export { router as eventCampaignRoutes };