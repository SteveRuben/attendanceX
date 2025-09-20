import {Router} from "express";
import {authenticate, requirePermission} from "../../middleware/auth";
import {validateBody, validateParams, validateQuery} from "../../middleware/validation";
import {rateLimit} from "../../middleware/rateLimit";
import {z} from "zod";
import {
  NotificationChannel,
  NotificationType
} from '../../common/types';
import { NotificationController } from "../../controllers/notification/notification.controller";
import { createNotificationSchema,
  notificationPreferencesSchema,
  notificationTemplateSchema,
  sendEmailNotificationSchema,
  sendPushNotificationSchema, 
  sendSmsNotificationSchema } from "../../common/validators";

const router = Router();

// 🔒 Authentification requise
router.use(authenticate);

// 📧 User notifications
router.get("/my-notifications",
  validateQuery(z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    unreadOnly: z.coerce.boolean().default(false),
    type: z.nativeEnum(NotificationType).optional(),
    channel: z.nativeEnum(NotificationChannel).optional(),
  })),
  NotificationController.getMyNotifications
);

router.post("/mark-read/:id",
  validateParams(z.object({
    id: z.string().min(1, "ID notification requis"),
  })),
  NotificationController.markAsRead
);

router.post("/mark-all-read",
  NotificationController.markAllAsRead
);

router.delete("/:id",
  validateParams(z.object({
    id: z.string().min(1, "ID notification requis"),
  })),
  NotificationController.deleteNotification
);

// ⚙️ Notification preferences
router.get("/preferences",
  NotificationController.getNotificationPreferences
);

router.put("/preferences",
  validateBody(notificationPreferencesSchema),
  NotificationController.updateNotificationPreferences
);

// 📱 Push notification setup
router.post("/push/configure",
  validateBody(z.object({
    deviceToken: z.string().min(1, "Token appareil requis"),
    platform: z.enum(["ios", "android", "web"]),
  })),
  NotificationController.configurePushNotifications
);

// 📤 Sending notifications (admin/organizer)
router.post("/send",
  requirePermission("send_notifications"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 50,
  }),
  validateBody(createNotificationSchema),
  NotificationController.sendNotification
);

router.post("/send-bulk",
  requirePermission("send_notifications"),
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10,
  }),
  validateBody(z.object({
    recipients: z.array(z.string()).min(1, "Au moins un destinataire requis"),
    type: z.nativeEnum(NotificationType),
    channels: z.array(z.nativeEnum(NotificationChannel)).min(1),
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(1000),
    data: z.record(z.any()).optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    scheduledFor: z.string().datetime().optional(),
  })),
  NotificationController.sendBulkNotification
);

// 📧 Specific notification types
router.post("/send-email",
  requirePermission("send_notifications"),
  validateBody(sendEmailNotificationSchema),
  NotificationController.sendEmailNotification
);

router.post("/send-sms",
  requirePermission("send_notifications"),
  validateBody(sendSmsNotificationSchema),
  NotificationController.sendSmsNotification
);

router.post("/send-push",
  requirePermission("send_notifications"),
  validateBody(sendPushNotificationSchema),
  NotificationController.sendPushNotification
);

// 📊 Notification analytics
router.get("/stats",
  requirePermission("view_reports"),
  validateQuery(z.object({
    userId: z.string().optional(),
    type: z.nativeEnum(NotificationType).optional(),
    channel: z.nativeEnum(NotificationChannel).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })),
  NotificationController.getNotificationStats
);

router.get("/:id/delivery-status",
  requirePermission("send_notifications"),
  validateParams(z.object({
    id: z.string().min(1, "ID notification requis"),
  })),
  NotificationController.getDeliveryStatus
);

// 🎨 Template management
router.get("/templates",
  validateQuery(z.object({
    type: z.nativeEnum(NotificationType).optional(),
    language: z.enum(["fr", "en", "es", "de"]).default("fr"),
  })),
  NotificationController.getNotificationTemplates
);

router.post("/templates",
  requirePermission("manage_settings"),
  validateBody(notificationTemplateSchema),
  NotificationController.createNotificationTemplate
);

router.put("/templates/:id",
  requirePermission("manage_settings"),
  validateParams(z.object({
    id: z.string().min(1, "ID template requis"),
  })),
  validateBody(notificationTemplateSchema.partial()),
  NotificationController.updateNotificationTemplate
);

router.delete("/templates/:id",
  requirePermission("manage_settings"),
  validateParams(z.object({
    id: z.string().min(1, "ID template requis"),
  })),
  NotificationController.deleteNotificationTemplate
);

// 🧪 Testing
router.post("/test",
  requirePermission("send_notifications"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
  }),
  validateBody(z.object({
    type: z.nativeEnum(NotificationType),
    channel: z.nativeEnum(NotificationChannel),
    testData: z.record(z.any()).optional(),
  })),
  NotificationController.testNotification
);

// 📅 Event-specific notifications
router.post("/events/:eventId/reminders",
  requirePermission("send_notifications"),
  validateParams(z.object({
    eventId: z.string().min(1, "ID événement requis"),
  })),
  validateBody(z.object({
    reminderType: z.enum(["24h", "1h", "15min", "custom"]),
    customMinutes: z.number().int().positive().optional(),
  })),
  NotificationController.sendEventReminders
);

// 🔗 Webhook for delivery status
router.post("/webhooks/:provider",
  validateParams(z.object({
    provider: z.enum(["sendgrid", "twilio", "fcm", "mailgun"]),
  })),
  NotificationController.handleDeliveryWebhook
);

export {router as notificationRoutes};
