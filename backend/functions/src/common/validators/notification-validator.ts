// shared/src/validators/notification-validator.ts
import { z } from 'zod';
import { NotificationType, NotificationChannel } from '../types';
import { baseIdSchema, emailSchema, phoneSchema, validateAndFormat } from './common-validator';

// Énums pour la validation
const notificationTypeSchema = z.nativeEnum(NotificationType);
const notificationChannelSchema = z.nativeEnum(NotificationChannel);
//const notificationStatusSchema = z.nativeEnum(NotificationStatus);

// Schéma pour les données de template
export const templateDataSchema = z.object({
  eventTitle: z.string().optional(),
  eventDate: z.string().optional(),
  eventLocation: z.string().optional(),
  userName: z.string().optional(),
  organizerName: z.string().optional(),
  checkInTime: z.string().optional(),
  qrCodeUrl: z.string().url().optional(),
  resetLink: z.string().url().optional(),
  verificationLink: z.string().url().optional(),
  timeUntil: z.string().optional(),
  customData: z.record(z.string(), z.any()).optional()
});

// Schéma complet notification
export const notificationSchema = z.object({
  id: baseIdSchema,
  type: notificationTypeSchema,
  channel: notificationChannelSchema,
  /* status: notificationStatusSchema, */
  recipientId: baseIdSchema,
  title: z.string().min(1, 'Titre requis').max(200),
  content: z.string().min(1, 'Contenu requis').max(2000),
  data: templateDataSchema.optional(),
  metadata: z.object({
    eventId: baseIdSchema.optional(),
    templateId: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    expiresAt: z.date().optional(),
    retryCount: z.number().int().min(0).default(0),
    lastRetryAt: z.date().optional(),
    deliveredAt: z.date().optional(),
    readAt: z.date().optional(),
    clickedAt: z.date().optional(),
    errorMessage: z.string().optional(),
    providerResponse: z.record(z.string(), z.any()).optional()
  }).optional(),
  scheduledFor: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Schéma pour créer une notification
export const createNotificationSchema = z.object({
  type: notificationTypeSchema,
  channels: z.array(notificationChannelSchema).min(1, 'Au moins un canal requis'),
  recipientIds: z.array(baseIdSchema).min(1, 'Au moins un destinataire requis').max(1000, 'Trop de destinataires'),
  title: z.string().min(1, 'Titre requis').max(200),
  content: z.string().min(1, 'Contenu requis').max(2000),
  data: templateDataSchema.optional(),
  eventId: baseIdSchema.optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  useTemplate: z.boolean().default(false),
  templateId: z.string().optional()
}).refine(data => {
  // Si scheduledFor est défini, il doit être dans le futur
  if (data.scheduledFor) {
    return new Date(data.scheduledFor) > new Date();
  }
  return true;
}, {
  message: 'La date de programmation doit être dans le futur',
  path: ['scheduledFor']
}).refine(data => {
  // Si useTemplate est true, templateId est requis
  if (data.useTemplate) {
    return !!data.templateId;
  }
  return true;
}, {
  message: 'ID du template requis quand useTemplate est activé',
  path: ['templateId']
});

// Schéma pour envoyer une notification par email
export const sendEmailNotificationSchema = z.object({
  to: z.array(emailSchema).min(1, 'Au moins un destinataire requis').max(100),
  cc: z.array(emailSchema).max(50).optional(),
  bcc: z.array(emailSchema).max(50).optional(),
  subject: z.string().min(1, 'Sujet requis').max(200),
  htmlContent: z.string().min(1, 'Contenu HTML requis'),
  textContent: z.string().optional(),
  templateId: z.string().optional(),
  templateData: templateDataSchema.optional(),
  attachments: z.array(z.object({
    filename: z.string().min(1),
    content: z.string(), // Base64 ou URL
    contentType: z.string().min(1),
    size: z.number().positive().max(25 * 1024 * 1024) // 25MB max
  })).max(10).optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  trackOpens: z.boolean().default(true),
  trackClicks: z.boolean().default(true)
});

// Schéma pour envoyer une notification SMS
export const sendSmsNotificationSchema = z.object({
  to: z.array(phoneSchema).min(1, 'Au moins un destinataire requis').max(100),
  message: z.string().min(1, 'Message requis').max(160, 'Message SMS trop long'),
  templateId: z.string().optional(),
  templateData: templateDataSchema.optional(),
  senderId: z.string().max(11).optional(), // Nom d'expéditeur
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  scheduledFor: z.string().datetime().optional()
});

// Schéma pour envoyer une notification push
export const sendPushNotificationSchema = z.object({
  userIds: z.array(baseIdSchema).min(1, 'Au moins un utilisateur requis').max(1000),
  title: z.string().min(1, 'Titre requis').max(100),
  body: z.string().min(1, 'Corps requis').max(200),
  icon: z.string().url().optional(),
  image: z.string().url().optional(),
  badge: z.string().url().optional(),
  sound: z.string().optional(),
  clickAction: z.string().url().optional(),
  data: z.record(z.string(), z.string()).optional(),
  ttl: z.number().int().positive().max(2419200).default(86400), // Max 28 jours, défaut 1 jour
  priority: z.enum(['normal', 'high']).default('normal'),
  collapseKey: z.string().max(64).optional()
});

// Schéma pour marquer une notification comme lue
export const markNotificationReadSchema = z.object({
  notificationIds: z.array(baseIdSchema).min(1, 'Au moins un ID requis').max(100),
  markAllAsRead: z.boolean().default(false)
}).refine(data => {
  // Si markAllAsRead est true, notificationIds peut être vide
  if (data.markAllAsRead) {
    return true;
  }
  return data.notificationIds.length > 0;
}, {
  message: 'IDs de notifications requis si markAllAsRead est false'
});

// Schéma pour les préférences de notification
export const notificationPreferencesSchema = z.object({
  emailNotifications: z.object({
    enabled: z.boolean().default(true),
    eventReminders: z.boolean().default(true),
    attendanceConfirmations: z.boolean().default(true),
    eventUpdates: z.boolean().default(true),
    systemNotifications: z.boolean().default(true),
    weeklyReports: z.boolean().default(false)
  }),
  smsNotifications: z.object({
    enabled: z.boolean().default(false),
    urgentOnly: z.boolean().default(true),
    eventReminders: z.boolean().default(false),
    eventCancellations: z.boolean().default(true)
  }),
  pushNotifications: z.object({
    enabled: z.boolean().default(true),
    eventReminders: z.boolean().default(true),
    attendanceConfirmations: z.boolean().default(true),
    eventUpdates: z.boolean().default(true),
    quietHours: z.object({
      enabled: z.boolean().default(false),
      startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('22:00'),
      endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('07:00')
    })
  }),
  inAppNotifications: z.object({
    enabled: z.boolean().default(true),
    autoMarkRead: z.boolean().default(false),
    showDesktop: z.boolean().default(true)
  })
});

// Schéma pour rechercher les notifications
export const searchNotificationsSchema = z.object({
  userId: baseIdSchema.optional(),
  type: notificationTypeSchema.optional(),
  channel: notificationChannelSchema.optional(),
 /*  status: notificationStatusSchema.optional(), */
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  eventId: baseIdSchema.optional(),
  isRead: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'scheduledFor', 'deliveredAt', 'priority']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Schéma pour les statistiques de notifications
export const notificationStatsSchema = z.object({
  userId: baseIdSchema.optional(),
  eventId: baseIdSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['type', 'channel', 'status', 'date']).default('type')
});

// Schéma pour la configuration des templates
export const notificationTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Nom requis').max(100),
  description: z.string().max(500).optional(),
  type: notificationTypeSchema,
  channel: notificationChannelSchema,
  subject: z.string().max(200).optional(), // Pour les emails
  content: z.string().min(1, 'Contenu requis').max(5000),
  variables: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean().default(false),
    defaultValue: z.string().optional()
  })).default([]),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Fonctions de validation
export function validateNotification(data: unknown) {
  return validateAndFormat(notificationSchema, data);
}

export function validateCreateNotification(data: unknown) {
  return validateAndFormat(createNotificationSchema, data);
}

export function validateSendEmailNotification(data: unknown) {
  return validateAndFormat(sendEmailNotificationSchema, data);
}

export function validateSendSmsNotification(data: unknown) {
  return validateAndFormat(sendSmsNotificationSchema, data);
}

export function validateSendPushNotification(data: unknown) {
  return validateAndFormat(sendPushNotificationSchema, data);
}

export function validateMarkNotificationRead(data: unknown) {
  return validateAndFormat(markNotificationReadSchema, data);
}

export function validateNotificationPreferences(data: unknown) {
  return validateAndFormat(notificationPreferencesSchema, data);
}

export function validateSearchNotifications(data: unknown) {
  return validateAndFormat(searchNotificationsSchema, data);
}

export function validateNotificationStats(data: unknown) {
  return validateAndFormat(notificationStatsSchema, data);
}

export function validateNotificationTemplate(data: unknown) {
  return validateAndFormat(notificationTemplateSchema, data);
}

// Validation des heures silencieuses
export function isInQuietHours(
  currentTime: Date,
  quietHours: { enabled: boolean; startTime: string; endTime: string }
): boolean {
  if (!quietHours.enabled) {
    return false;
  }

  const current = currentTime.getHours() * 60 + currentTime.getMinutes();
  const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
  const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
  
  const start = Number(startHour) * 60 + Number(startMin);
  const end = Number(endHour) * 60 + Number(endMin);

  // Gérer le cas où les heures silencieuses traversent minuit
  if (start > end) {
    return current >= start || current <= end;
  }
  
  return current >= start && current <= end;
}

// Validation du contenu des templates
export function validateTemplateContent(
  content: string,
  requiredVariables: string[]
): { isValid: boolean; missingVariables: string[] } {
  const usedVariables = content.match(/\{([^}]+)\}/g)?.map(v => v.slice(1, -1)) || [];
  const missingVariables = requiredVariables.filter(req => !usedVariables.includes(req));
  
  return {
    isValid: missingVariables.length === 0,
    missingVariables
  };
}

// Validation de la limite de notifications par utilisateur
export function validateNotificationRateLimit(
  userId: string,
  type: NotificationType,
  recentNotifications: Array<{ type: NotificationType; createdAt: Date }>,
  limits: { perHour: number; perDay: number }
): { allowed: boolean; reason?: string; retryAfter?: number } {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const hourlyCount = recentNotifications.filter(n => 
    n.type === type && n.createdAt >= oneHourAgo
  ).length;

  const dailyCount = recentNotifications.filter(n => 
    n.type === type && n.createdAt >= oneDayAgo
  ).length;

  if (hourlyCount >= limits.perHour) {
    return {
      allowed: false,
      reason: 'Limite horaire dépassée',
      retryAfter: 3600 - Math.floor((now.getTime() - oneHourAgo.getTime()) / 1000)
    };
  }

  if (dailyCount >= limits.perDay) {
    return {
      allowed: false,
      reason: 'Limite quotidienne dépassée',
      retryAfter: 86400 - Math.floor((now.getTime() - oneDayAgo.getTime()) / 1000)
    };
  }

  return { allowed: true };
}