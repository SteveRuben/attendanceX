import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../../middleware/validation";
import { rateLimit } from "../../middleware/rateLimit";
import { z } from "zod";
import {
  CampaignStatus,
  CampaignType
} from "../../common/types";
import { EmailCampaignController } from "../../controllers/notification/email-campaign.controller";
import campaignTemplateRoutes from "./campaign-template.routes";

const router = Router();

// 🔒 Authentication required for all routes
router.use(authenticate);

// ==========================================
// Campaign Management Routes
// ==========================================

// 📋 Campaign listing & filtering
router.get("/",
  validateQuery(z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.nativeEnum(CampaignStatus).optional(),
    type: z.nativeEnum(CampaignType).optional(),
    createdBy: z.string().optional(),
    search: z.string().optional(),
    tags: z.string().optional(), // CSV string
    sortBy: z.enum(["name", "createdAt", "scheduledAt", "status"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc")
  })),
  EmailCampaignController.getCampaigns
);

// 🎯 Campaign creation
router.post("/",
  requirePermission("send_notifications"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
  }),
  validateBody(z.object({
    name: z.string().min(1, "Campaign name is required").max(200),
    type: z.nativeEnum(CampaignType),
    subject: z.string().min(1, "Subject is required").max(500),
    templateId: z.string().optional(),
    content: z.object({
      htmlContent: z.string().optional(),
      textContent: z.string().optional(),
      templateData: z.record(z.any()).optional(),
      attachments: z.array(z.object({
        filename: z.string(),
        content: z.string(),
        contentType: z.string(),
        size: z.number()
      })).optional()
    }),
    recipientCriteria: z.object({
      teams: z.array(z.string()).optional(),
      roles: z.array(z.string()).optional(),
      departments: z.array(z.string()).optional(),
      eventParticipants: z.array(z.string()).optional(),
      customFilters: z.array(z.object({
        field: z.string(),
        operator: z.enum(['equals', 'contains', 'startsWith', 'endsWith', 'in', 'notIn']),
        value: z.any()
      })).optional(),
      excludeUnsubscribed: z.boolean().default(true),
      includeInactive: z.boolean().default(false)
    }),
    scheduledAt: z.string().datetime().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().max(1000).optional()
  })),
  EmailCampaignController.createCampaign
);

// 🔍 Individual campaign routes
router.get("/:campaignId",
  validateParams(z.object({
    campaignId: z.string().min(1, "Campaign ID is required"),
  })),
  EmailCampaignController.getCampaign
);

router.put("/:campaignId",
  requirePermission("send_notifications"),
  validateParams(z.object({
    campaignId: z.string().min(1, "Campaign ID is required"),
  })),
  validateBody(z.object({
    name: z.string().min(1).max(200).optional(),
    subject: z.string().min(1).max(500).optional(),
    content: z.object({
      htmlContent: z.string().optional(),
      textContent: z.string().optional(),
      templateData: z.record(z.any()).optional(),
      attachments: z.array(z.object({
        filename: z.string(),
        content: z.string(),
        contentType: z.string(),
        size: z.number()
      })).optional()
    }).optional(),
    recipientCriteria: z.object({
      teams: z.array(z.string()).optional(),
      roles: z.array(z.string()).optional(),
      departments: z.array(z.string()).optional(),
      eventParticipants: z.array(z.string()).optional(),
      customFilters: z.array(z.object({
        field: z.string(),
        operator: z.enum(['equals', 'contains', 'startsWith', 'endsWith', 'in', 'notIn']),
        value: z.any()
      })).optional(),
      excludeUnsubscribed: z.boolean().optional(),
      includeInactive: z.boolean().optional()
    }).optional(),
    scheduledAt: z.string().datetime().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().max(1000).optional()
  })),
  EmailCampaignController.updateCampaign
);

router.delete("/:campaignId",
  requirePermission("send_notifications"),
  validateParams(z.object({
    campaignId: z.string().min(1, "Campaign ID is required"),
  })),
  EmailCampaignController.deleteCampaign
);

// 📋 Campaign duplication
router.post("/:campaignId/duplicate",
  requirePermission("send_notifications"),
  validateParams(z.object({
    campaignId: z.string().min(1, "Campaign ID is required"),
  })),
  validateBody(z.object({
    newName: z.string().min(1).max(200).optional()
  })),
  EmailCampaignController.duplicateCampaign
);

// ==========================================
// Campaign Preview & Testing Routes
// ==========================================

// 👀 Preview campaign content
router.post("/preview",
  validateBody(z.object({
    templateId: z.string().optional(),
    content: z.object({
      subject: z.string().optional(),
      htmlContent: z.string().optional(),
      textContent: z.string().optional(),
      templateData: z.record(z.any()).optional()
    }),
    sampleRecipient: z.object({
      email: z.string().email(),
      firstName: z.string(),
      lastName: z.string(),
      personalizations: z.record(z.any()).optional(),
      unsubscribed: z.boolean().default(false),
      bounced: z.boolean().default(false)
    }).optional()
  })),
  EmailCampaignController.previewCampaign
);

// 👥 Preview recipients
router.post("/recipients/preview",
  validateBody(z.object({
    criteria: z.object({
      teams: z.array(z.string()).optional(),
      roles: z.array(z.string()).optional(),
      departments: z.array(z.string()).optional(),
      eventParticipants: z.array(z.string()).optional(),
      customFilters: z.array(z.object({
        field: z.string(),
        operator: z.enum(['equals', 'contains', 'startsWith', 'endsWith', 'in', 'notIn']),
        value: z.any()
      })).optional(),
      excludeUnsubscribed: z.boolean().default(true),
      includeInactive: z.boolean().default(false)
    }),
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).default(0)
  })),
  EmailCampaignController.previewRecipients
);

// 🧪 Send test campaign
router.post("/:campaignId/test",
  requirePermission("send_notifications"),
  validateParams(z.object({
    campaignId: z.string().min(1, "Campaign ID is required"),
  })),
  validateBody(z.object({
    testRecipients: z.array(z.string().email()).min(1, "At least one test recipient is required").max(10, "Maximum 10 test recipients allowed")
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 5,
  }),
  EmailCampaignController.sendTestCampaign
);

// ==========================================
// Campaign Scheduling & Control Routes
// ==========================================

// ⏰ Schedule campaign
router.post("/:campaignId/schedule",
  requirePermission("send_notifications"),
  validateParams(z.object({
    campaignId: z.string().min(1, "Campaign ID is required"),
  })),
  validateBody(z.object({
    scheduledAt: z.string().datetime().optional(),
    priority: z.number().int().min(1).max(10).default(5),
    batchSize: z.number().int().min(10).max(1000).default(100)
  })),
  EmailCampaignController.scheduleCampaign
);

// 🚀 Send campaign immediately
router.post("/:campaignId/send",
  requirePermission("send_notifications"),
  validateParams(z.object({
    campaignId: z.string().min(1, "Campaign ID is required"),
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 3,
  }),
  EmailCampaignController.sendCampaign
);

// ⏸️ Pause campaign
router.post("/:campaignId/pause",
  requirePermission("send_notifications"),
  validateParams(z.object({
    campaignId: z.string().min(1, "Campaign ID is required"),
  })),
  EmailCampaignController.pauseCampaign
);

// ▶️ Resume campaign
router.post("/:campaignId/resume",
  requirePermission("send_notifications"),
  validateParams(z.object({
    campaignId: z.string().min(1, "Campaign ID is required"),
  })),
  EmailCampaignController.resumeCampaign
);

// ❌ Cancel campaign
router.post("/:campaignId/cancel",
  requirePermission("send_notifications"),
  validateParams(z.object({
    campaignId: z.string().min(1, "Campaign ID is required"),
  })),
  EmailCampaignController.cancelCampaign
);

// ==========================================
// Analytics & Reporting Routes
// ==========================================

// 📊 Campaign analytics
router.get("/:campaignId/analytics",
  requirePermission("view_reports"),
  validateParams(z.object({
    campaignId: z.string().min(1, "Campaign ID is required"),
  })),
  EmailCampaignController.getCampaignAnalytics
);

// 📈 Real-time performance
router.get("/:campaignId/performance",
  requirePermission("view_reports"),
  validateParams(z.object({
    campaignId: z.string().min(1, "Campaign ID is required"),
  })),
  EmailCampaignController.getRealTimePerformance
);

// 📊 Comparative analytics
router.get("/analytics/comparative",
  requirePermission("view_reports"),
  validateQuery(z.object({
    campaignType: z.nativeEnum(CampaignType).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    campaignIds: z.string().optional() // CSV string of campaign IDs
  })),
  EmailCampaignController.getComparativeAnalytics
);

// 🎯 Engagement insights
router.get("/analytics/engagement",
  requirePermission("view_reports"),
  validateQuery(z.object({
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional()
  })),
  EmailCampaignController.getEngagementInsights
);

// ==========================================
// Template Management Routes
// ==========================================
router.use("/templates", campaignTemplateRoutes);

// ==========================================
// Recipient Management Routes
// ==========================================
import campaignRecipientRoutes from "./campaign-recipient.routes";
router.use("/recipients", campaignRecipientRoutes);

// ==========================================
// Delivery and Tracking Routes
// ==========================================
import campaignDeliveryRoutes from "./campaign-delivery.routes";
router.use("/delivery", campaignDeliveryRoutes);

export { router as emailCampaignRoutes };