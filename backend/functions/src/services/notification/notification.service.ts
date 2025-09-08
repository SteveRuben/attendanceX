// backend/functions/src/services/notification/notification.service.ts - VERSION CORRIGÉE

import { getFirestore, Query } from "firebase-admin/firestore";
import {
  BulkNotificationRequest,
  ERROR_CODES,
  Notification,
  NOTIFICATION_RATE_LIMITS,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationTemplate,
  NotificationType,
  SendNotificationRequest,
} from "../../shared";
import * as crypto from "crypto";
import { EmailService } from "./EmailService";
import { PushService } from "./PushService";
import { SmsService } from "./SmsService";
import { TemplateService } from "./TemplateService";
import { userService } from "../user.service";
import { authService } from "../auth/auth.service";

// 🔧 INTERFACES ÉTENDUES POUR L'INTÉGRATION
export interface NotificationListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  userId?: string;
  type?: NotificationType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  dateRange?: { start: Date; end: Date };
  onlyUnread?: boolean;
  includeRead?: boolean;
}

export interface NotificationStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  byChannel: Record<NotificationChannel, number>;
  byType: Record<NotificationType, number>;
  deliveryRate: number;
  averageDeliveryTime: number;
}

export interface ChannelProvider {
  send(notification: Notification, recipient: any, data: any): Promise<{ success: boolean; messageId?: string; error?: string }>;
  validateRecipient(recipient: any): boolean;
  formatMessage(notification: Notification, template?: string): { subject?: string; body: string; html?: string };
}

export interface RateLimitCheck {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

// 🎯 NOTIFICATIONS PRÉDÉFINIES POUR ATTENDANCE-X
export interface AttendanceNotifications {
  eventCreated: (eventData: any, participantIds: string[]) => Promise<void>;
  eventUpdated: (eventData: any, changes: any, participantIds: string[]) => Promise<void>;
  eventCancelled: (eventData: any, reason: string, participantIds: string[]) => Promise<void>;
  eventReminder: (eventData: any, minutesBefore: number, participantIds: string[]) => Promise<void>;
  attendanceMarked: (attendanceData: any, organizerId: string) => Promise<void>;
  attendanceValidationRequired: (attendanceData: any, organizerId: string) => Promise<void>;
  userInvited: (invitationData: any, invitedUserId: string) => Promise<void>;
  reportGenerated: (reportData: any, userId: string) => Promise<void>;
}

// 🏭 CLASSE PRINCIPALE DU SERVICE INTÉGRÉ
export class NotificationService {
  private readonly db = getFirestore();
  private readonly rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  // Services spécialisés
  private readonly emailService: EmailService;
  private readonly smsService: SmsService;
  private readonly pushService: PushService;
  private readonly templateService: TemplateService;

  constructor() {
    // Initialiser les services spécialisés
    this.emailService = new EmailService();
    this.smsService = new SmsService();
    this.pushService = new PushService();
    this.templateService = new TemplateService();

    this.initializeProviders();
    this.loadTemplates();

    // Nettoyage périodique des rate limits
    setInterval(() => this.cleanupRateLimits(), 60000);
  }

  // 🎯 MÉTHODES SPÉCIALISÉES POUR ATTENDANCE-X
  get attendance(): AttendanceNotifications {
    return {
      eventCreated: async (eventData: any, participantIds: string[]) => {
        await this.sendBulkNotification({
          type: NotificationType.EVENT_CREATED,
          title: "Nouvel événement",
          message: `Vous êtes invité à l'événement "${eventData.title}"`,
          userIds: participantIds,
          data: { eventId: eventData.id, eventTitle: eventData.title },
          channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
          sentBy: eventData.organizerId,
        });
      },

      eventUpdated: async (eventData: any, changes: any, participantIds: string[]) => {
        const changeText = this.formatEventChanges(changes);
        await this.sendBulkNotification({
          type: NotificationType.EVENT_UPDATED,
          title: "Événement modifié",
          message: `L'événement "${eventData.title}" a été modifié: ${changeText}`,
          userIds: participantIds,
          data: { eventId: eventData.id, changes },
          channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
          sentBy: "system",
        });
      },

      eventCancelled: async (eventData: any, reason: string, participantIds: string[]) => {
        await this.sendBulkNotification({
          type: NotificationType.EVENT_CANCELLED,
          title: "Événement annulé",
          message: `L'événement "${eventData.title}" a été annulé. Raison: ${reason}`,
          userIds: participantIds,
          data: { eventId: eventData.id, reason },
          channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH],
          priority: NotificationPriority.HIGH,
          sentBy: "system",
        });
      },

      eventReminder: async (eventData: any, minutesBefore: number, participantIds: string[]) => {
        const timeText = this.formatReminderTime(minutesBefore);
        await this.sendBulkNotification({
          type: NotificationType.EVENT_REMINDER,
          title: "Rappel d'événement",
          message: `N'oubliez pas l'événement "${eventData.title}" qui commence ${timeText}`,
          userIds: participantIds,
          data: { eventId: eventData.id, minutesBefore },
          channels: [NotificationChannel.PUSH],
          sentBy: "system",
        });
      },

      attendanceMarked: async (attendanceData: any, organizerId: string) => {
        await this.sendNotification({
          userId: organizerId,
          type: NotificationType.ATTENDANCE_MARKED,
          title: "Présence enregistrée",
          message: `${attendanceData.userName} a marqué sa présence (${attendanceData.status})`,
          data: { attendanceId: attendanceData.id, eventId: attendanceData.eventId },
          channels: [NotificationChannel.IN_APP],
          sentBy: "system",
        });
      },

      attendanceValidationRequired: async (attendanceData: any, organizerId: string) => {
        await this.sendNotification({
          userId: organizerId,
          type: NotificationType.ATTENDANCE_VALIDATION_REQUIRED,
          title: "Validation requise",
          message: `Une présence nécessite votre validation: ${attendanceData.userName}`,
          data: { attendanceId: attendanceData.id },
          channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.HIGH,
          sentBy: "system",
        });
      },

      userInvited: async (invitationData: any, invitedUserId: string) => {
        await this.sendFromTemplate(
          invitedUserId,
          "user_invitation",
          {
            inviterName: invitationData.inviterName,
            organizationName: invitationData.organizationName,
            invitationToken: invitationData.token,
            invitationUrl: `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationData.token}`,
          },
          {
            channels: [NotificationChannel.EMAIL],
            priority: NotificationPriority.HIGH,
          }
        );
      },

      reportGenerated: async (reportData: any, userId: string) => {
        await this.sendNotification({
          userId,
          type: NotificationType.REPORT_READY,
          title: "Rapport disponible",
          message: `Votre rapport "${reportData.name}" est prêt à être téléchargé`,
          data: { reportId: reportData.id },
          link: `/reports/${reportData.id}/download`,
          channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          sentBy: "system",
        });
      },
    };
  }

  // 📨 ENVOI DE NOTIFICATIONS AVEC TEMPLATES
  async sendFromTemplate(
    userId: string,
    templateId: string,
    data: Record<string, any>,
    options: {
      channels?: NotificationChannel[];
      priority?: NotificationPriority;
      sentBy?: string;
    } = {}
  ): Promise<Notification> {
    try {
      // Récupérer le template
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }
      if (!template.title) {
        throw new Error(`Template does not have name : ${templateId}`);
      }

      // Traiter le template
      const title = this.templateService.processTemplate(template.title, data);
      const message = this.templateService.processTemplate(template.content, data);

      // Envoyer la notification
      return await this.sendNotification({
        userId,
        type: template.type as NotificationType,
        title,
        message,
        data,
        channels: options.channels || template.channels,
        priority: options.priority || template.priority,
        sentBy: options.sentBy,
      });
    } catch (error) {
      console.error("Error sending notification from template:", error);
      throw new Error(ERROR_CODES.TEMPLATE_NOT_FOUND);
    }
  }

  // 📨 ENVOI DE NOTIFICATIONS PRINCIPAL
  async sendNotification(request: SendNotificationRequest): Promise<Notification> {
    try {
      // Validation des données
      await this.validateSendRequest(request);

      // Vérifier le rate limiting
      const rateLimitCheck = await this.checkRateLimit(request.userId, request.type);
      if (!rateLimitCheck.allowed) {
        throw new Error(ERROR_CODES.NOTIFICATION_RATE_LIMIT);
      }

      // Récupérer l'utilisateur destinataire
      const recipient = await userService.getUserById(request.userId);

      // Déterminer les canaux
      const channels = await this.determineChannels(request, recipient);

      // Créer la notification
      const notification = this.createNotification(request, channels);

      // Sauvegarder la notification
      await this.saveNotification(notification);

      // Envoyer sur chaque canal
      const sendPromises = channels.map((channel) =>
        this.sendToChannelWithService(notification, channel, recipient, request.data || {})
      );

      await Promise.allSettled(sendPromises);

      // Mettre à jour les statuts
      await this.updateNotificationStatus(notification);

      // Log de l'audit
      await this.logNotificationAction("notification_sent", notification.id!, request.sentBy || "system", {
        type: request.type,
        channels: channels.map((c) => c.type),
        recipientId: request.userId,
      });

      return notification;
    } catch (error) {
      console.error("Error sending notification:", error);

      await this.logNotificationAction("notification_failed", null, request.sentBy || "system", {
        type: request.type,
        recipientId: request.userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (error instanceof Error && Object.values(ERROR_CODES).includes(error.message as any)) {
        throw error;
      }
      throw new Error(ERROR_CODES.NOTIFICATION_SEND_FAILED);
    }
  }   
  // ENVOI PAR CANAL AVEC SERVICES SPÉCIALISÉS
  private async sendToChannelWithService(
    notification: Notification,
    channel: { type: NotificationChannel; settings?: any },
    recipient: any,
    data: Record<string, any>
  ): Promise<void> {
    try {
      const recipientData = recipient.getData();

      // Mettre à jour le statut du canal
      await this.updateChannelStatus(notification.id!, channel.type, "sending");

      let result: { success: boolean; messageId?: string; error?: string } = { success: false };

      switch (channel.type) {
        case NotificationChannel.EMAIL:
          if (recipientData.email) {
            try {
              const emailResult = await this.emailService.sendEmail(
                recipientData.email,
                notification.title,
                {
                  html: this.formatEmailContent(notification, data),
                  text: notification.message,
                },
                {
                  userId: notification.userId,
                  trackingId: `notif-${notification.id}`,
                }
              );
              result = { success: emailResult.success, messageId: emailResult.messageId };
            } catch (error) {
              result = { success: false, error: error instanceof Error ? error.message : String(error) };
            }
          } else {
            result = { success: false, error: "No email address" };
          }
          break;

        case NotificationChannel.SMS:
          if (recipientData.phoneNumber) {
            try {
              const smsResult = await this.smsService.sendSms(
                recipientData.phoneNumber,
                notification.message,
                {
                  userId: notification.userId,
                  trackingId: `notif-${notification.id}`,
                }
              );
              result = { success: smsResult.status === "sent", messageId: smsResult.messageId };
            } catch (error) {
              result = { success: false, error: error instanceof Error ? error.message : String(error) };
            }
          } else {
            result = { success: false, error: "No phone number" };
          }
          break;

        case NotificationChannel.PUSH:
          try {
            const tokens = await this.pushService.getUserPushTokens(notification.userId);
            if (tokens.length > 0) {
              const pushResult = await this.pushService.sendPushNotification(tokens, {
                title: notification.title,
                body: notification.message,
                data: {
                  notificationId: notification.id!,
                  type: notification.type,
                  ...data,
                },
                priority: notification.priority === NotificationPriority.URGENT ? "high" : "normal",
              });
              result = { success: pushResult.success, messageId: pushResult.messageId ?? '' };
            } else {
              result = { success: false, error: "No push tokens" };
            }
          } catch (error) {
            result = { success: false, error: error instanceof Error ? error.message : String(error) };
          }
          break;

        case NotificationChannel.IN_APP:
          // Pour les notifications in-app, le succès est déterminé par la sauvegarde en base
          result = { success: true, messageId: notification.id };
          break;

        default:
          result = { success: false, error: `Unsupported channel: ${channel.type}` };
      }

      if (result.success) {
        await this.updateChannelStatus(notification.id!, channel.type, "sent", {
          messageId: result.messageId,
          sentAt: new Date(),
        });
      } else {
        await this.updateChannelStatus(notification.id!, channel.type, "failed", {
          error: result.error,
          failedAt: new Date(),
        });
      }
    } catch (error) {
      console.error(`Error sending to channel ${channel.type}:`, error);

      await this.updateChannelStatus(notification.id!, channel.type, "failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        failedAt: new Date(),
      });
    }
  }

  // 📊 ENVOI EN MASSE OPTIMISÉ
  async sendBulkNotification(request: BulkNotificationRequest): Promise<{
    total: number;
    sent: number;
    failed: number;
    notifications: Notification[];
    errors: Array<{ userId: string; error: string }>;
  }> {
    const results = {
      total: request.userIds.length,
      sent: 0,
      failed: 0,
      notifications: [] as Notification[],
      errors: [] as Array<{ userId: string; error: string }>,
    };

    // Vérifier les permissions
    if (request.sentBy && !await this.canSendBulkNotifications(request.sentBy)) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    // Traitement par lots optimisé
    const batchSize = request.batchSize || 50;

    for (let i = 0; i < request.userIds.length; i += batchSize) {
      const batch = request.userIds.slice(i, i + batchSize);

      await Promise.all(batch.map(async (userId) => {
        try {
          const notification = await this.sendNotification({
            ...request,
            userId,
          });

          results.sent++;
          results.notifications.push(notification);
        } catch (error) {
          results.failed++;
          results.errors.push({
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }));

      // Pause entre les lots
      if (i + batchSize < request.userIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Log de l'audit
    await this.logNotificationAction("bulk_notification_sent", null, request.sentBy || "system", {
      type: request.type,
      total: results.total,
      sent: results.sent,
      failed: results.failed,
    });

    return results;
  }

  // 📋 GESTION DES NOTIFICATIONS
  async getNotifications(options: NotificationListOptions = {}): Promise<{
    notifications: Notification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      userId,
      type,
      status,
      priority,
      channel,
      dateRange,
      onlyUnread,
      includeRead = true,
    } = options;

    // Validation
    if (page < 1 || limit < 1 || limit > 100) {
      throw new Error(ERROR_CODES.BAD_REQUEST);
    }

    let query: Query = this.db.collection("notifications");

    // Filtres
    if (userId) {
      query = query.where("userId", "==", userId);
    }

    if (type && Object.values(NotificationType).includes(type as any)) {
      query = query.where("type", "==", type);
    }

    if (status) {
      query = query.where("status", "==", status);
    }

    if (channel) {
      query = query.where("channel", "==", channel);
    }

    if (priority && Object.values(NotificationPriority).includes(priority as any)) {
      query = query.where("priority", "==", priority);
    }

    if (onlyUnread) {
      query = query.where("read", "==", false);
    } else if (!includeRead) {
      query = query.where("read", "==", true);
    }

    if (dateRange) {
      query = query.where("createdAt", ">=", dateRange.start)
        .where("createdAt", "<=", dateRange.end);
    }

    // Tri
    query = query.orderBy(sortBy, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit);

    const snapshot = await query.get();
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];

    // Compter le total
    const total = await this.countNotifications(options);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // 🛠️ MÉTHODES UTILITAIRES PRIVÉES
  private async validateSendRequest(request: SendNotificationRequest): Promise<void> {
    if (!request.userId) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    if (!Object.values(NotificationType).includes(request.type as any)) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    if (!request.title?.trim()) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    if (request.channels) {
      const invalidChannels = request.channels.filter((channel) =>
        !Object.values(NotificationChannel).includes(channel as any)
      );

      if (invalidChannels.length > 0) {
        throw new Error(ERROR_CODES.INVALID_NOTIFICATION_CHANNEL);
      }
    }
  }

  private async determineChannels(
    request: SendNotificationRequest,
    recipient: any
  ): Promise<Array<{ type: NotificationChannel; settings?: any }>> {
    // Si des canaux sont spécifiés dans la requête, les utiliser
    if (request.channels) {
      return request.channels.map((channel) => ({ type: channel }));
    }

    // Sinon, déterminer selon les préférences utilisateur et le type de notification
    const recipientData = recipient.getData();
    const channels: Array<{ type: NotificationChannel; settings?: any }> = [];

    // Logique par défaut selon le type de notification
    switch (request.type) {
      case NotificationType.EVENT_CREATED:
      case NotificationType.EVENT_UPDATED:
        channels.push({ type: NotificationChannel.EMAIL });
        channels.push({ type: NotificationChannel.PUSH });
        break;

      case NotificationType.EVENT_CANCELLED:
        channels.push({ type: NotificationChannel.EMAIL });
        channels.push({ type: NotificationChannel.SMS });
        channels.push({ type: NotificationChannel.PUSH });
        break;

      case NotificationType.EVENT_REMINDER:
        channels.push({ type: NotificationChannel.PUSH });
        break;

      default:
        channels.push({ type: NotificationChannel.IN_APP });
        if (recipientData.email) {
          channels.push({ type: NotificationChannel.EMAIL });
        }
    }

    return channels;
  }

  private createNotification(
    request: SendNotificationRequest,
    channels: Array<{ type: NotificationChannel; settings?: any }>
  ): Notification {
    return {
      id: crypto.randomUUID(),
      userId: request.userId,
      type: request.type,
      title: request.title,
      message: request.message,
      data: request.data || {},
      channels: channels.map(c => c.type),
      priority: request.priority || NotificationPriority.NORMAL,
      status: NotificationStatus.PENDING,
      read: false,
      sent: false,
      delivered: false,
      clicked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        sentBy: request.sentBy || "system",
        link: request.link,
        channelStatus: {},
        channelMetadata: {},
      },
    };
  }

  private async saveNotification(notification: Notification): Promise<void> {
    await this.db.collection("notifications").doc(notification.id!).set(notification);
  }

  private async updateNotificationStatus(notification: Notification): Promise<void> {
    // Logique pour déterminer le statut global basé sur les canaux
    const channelStatuses = notification.channels.map(channel =>
      notification.metadata?.channelStatus?.[channel] || "pending"
    );

    let globalStatus = NotificationStatus.PENDING;

    if (channelStatuses.every(status => status === "sent" || status === "delivered")) {
      globalStatus = NotificationStatus.SENT;
    } else if (channelStatuses.some(status => status === "failed")) {
      globalStatus = NotificationStatus.FAILED;
    }

    notification.status = globalStatus;
    notification.updatedAt = new Date();

    await this.db.collection("notifications").doc(notification.id!).update({
      status: globalStatus,
      updatedAt: notification.updatedAt,
    });
  }

  private async updateChannelStatus(
    notificationId: string,
    channel: NotificationChannel,
    status: string,
    metadata?: any
  ): Promise<void> {
    const updateData: any = {
      [`metadata.channelStatus.${channel}`]: status,
      updatedAt: new Date(),
    };

    if (metadata) {
      Object.keys(metadata).forEach(key => {
        updateData[`metadata.channelMetadata.${channel}.${key}`] = metadata[key];
      });
    }

    await this.db.collection("notifications").doc(notificationId).update(updateData);
  }

  private async countNotifications(options: NotificationListOptions): Promise<number> {
    let query: Query = this.db.collection("notifications");

    // Appliquer les mêmes filtres que getNotifications
    if (options.userId) {
      query = query.where("userId", "==", options.userId);
    }

    if (options.type) {
      query = query.where("type", "==", options.type);
    }

    if (options.status) {
      query = query.where("status", "==", options.status);
    }

    if (options.channel) {
      query = query.where("channel", "==", options.channel);
    }

    if (options.priority) {
      query = query.where("priority", "==", options.priority);
    }

    if (options.onlyUnread) {
      query = query.where("read", "==", false);
    } else if (!options.includeRead) {
      query = query.where("read", "==", true);
    }

    if (options.dateRange) {
      query = query.where("createdAt", ">=", options.dateRange.start)
        .where("createdAt", "<=", options.dateRange.end);
    }

    const snapshot = await query.get();
    return snapshot.size;
  }

  private async logNotificationAction(
    action: string,
    notificationId: string | null,
    performedBy: string,
    details?: any
  ): Promise<void> {
    await this.db.collection("audit_logs").add({
      action,
      targetType: "notification",
      targetId: notificationId,
      performedBy,
      performedAt: new Date(),
      details,
    });
  }

  private cleanupRateLimits(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }

  private getRateLimitForType(type: NotificationType): number {
    // Mapping des types de notifications vers les limites appropriées
    switch (type) {
      case NotificationType.EVENT_REMINDER:
      /*case NotificationType.PUSH_NOTIFICATION:
        return NOTIFICATION_RATE_LIMITS.PUSH_PER_HOUR;
      
      case NotificationType.SMS_NOTIFICATION:
        return NOTIFICATION_RATE_LIMITS.SMS_PER_DAY;
      
      case NotificationType.EMAIL_NOTIFICATION:*/
      case NotificationType.EVENT_CREATED:
      case NotificationType.EVENT_UPDATED:
      case NotificationType.EVENT_CANCELLED:
      case NotificationType.REPORT_READY:
        return NOTIFICATION_RATE_LIMITS.EMAIL_PER_DAY;
      
      case NotificationType.ATTENDANCE_MARKED:
      case NotificationType.ATTENDANCE_VALIDATION_REQUIRED:
        return NOTIFICATION_RATE_LIMITS.PER_HOUR;

      default:
        return NOTIFICATION_RATE_LIMITS.PER_HOUR;
    }
  }

  private initializeProviders(): void {
    // Initialisation des providers de canaux
    console.log("Notification providers initialized");
  }

  private loadTemplates(): void {
    // Chargement des templates par défaut
    console.log("Notification templates loaded");
  }

  // 🔧 MÉTHODES UTILITAIRES SUPPLÉMENTAIRES
  private async checkRateLimit(userId: string, type: NotificationType): Promise<RateLimitCheck> {
    const key = `${userId}:${type}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute

    // Déterminer la limite selon le type de notification
    const limit = this.getRateLimitForType(type);

    const entry = this.rateLimitMap.get(key);

    if (!entry || now > entry.resetTime) {
      // Nouvelle fenêtre
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });

      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: new Date(now + windowMs),
      };
    }

    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(entry.resetTime),
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      };
    }

    entry.count++;

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetTime: new Date(entry.resetTime),
    };
  }

  private async canSendBulkNotifications(userId: string): Promise<boolean> {
    return await authService.hasPermission(userId, "send_bulk_notifications");
  }

  // @ts-ignore
  private async getUsersByRoles(roles: string[]): Promise<string[]> {
    const userIds: string[] = [];

    for (const role of roles) {
      const result = await userService.getUsers({ role: role as any });
      userIds.push(...result.users.map(u => u.id!));
    }

    return [...new Set(userIds)]; // Dédupliquer
  }

  private async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    const doc = await this.db.collection("notification_templates").doc(templateId).get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as NotificationTemplate;
  }

  private formatEmailContent(notification: Notification, data: Record<string, any>): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${notification.title}</h2>
        <p style="color: #666; line-height: 1.6;">${notification.message}</p>
        ${notification.metadata?.link ? `<a href="${notification.metadata.link}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">Voir plus</a>` : ''}
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">AttendanceX - Système de gestion de présence</p>
      </div>
    `;
  }

  private formatEventChanges(changes: any): string {
    const changeTexts: string[] = [];

    if (changes.title) {changeTexts.push("titre");}
    if (changes.startDateTime) {changeTexts.push("heure de début");}
    if (changes.endDateTime) {changeTexts.push("heure de fin");}
    if (changes.location) {changeTexts.push("lieu");}

    return changeTexts.join(", ");
  }

  private formatReminderTime(minutesBefore: number): string {
    if (minutesBefore < 60) {
      return `dans ${minutesBefore} minutes`;
    } else if (minutesBefore < 1440) {
      const hours = Math.floor(minutesBefore / 60);
      return `dans ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(minutesBefore / 1440);
      return `dans ${days} jour${days > 1 ? 's' : ''}`;
    }
  }

  // 📱 MÉTHODES PUBLIQUES SUPPLÉMENTAIRES
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await this.db.collection("notifications").doc(notificationId).get();

    if (!notification.exists) {
      throw new Error(ERROR_CODES.NOTIFICATION_NOT_FOUND);
    }

    const notificationData = notification.data() as Notification;

    if (notificationData.userId !== userId) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    await this.db.collection("notifications").doc(notificationId).update({
      read: true,
      readAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    const batch = this.db.batch();

    const unreadNotifications = await this.db
      .collection("notifications")
      .where("userId", "==", userId)
      .where("read", "==", false)
      .get();

    unreadNotifications.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: new Date(),
        updatedAt: new Date(),
      });
    });

    await batch.commit();
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await this.db.collection("notifications").doc(notificationId).get();

    if (!notification.exists) {
      throw new Error(ERROR_CODES.NOTIFICATION_NOT_FOUND);
    }

    const notificationData = notification.data() as Notification;

    if (notificationData.userId !== userId) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    await this.db.collection("notifications").doc(notificationId).delete();
  }

  async getUnreadCount(userId: string): Promise<number> {
    const snapshot = await this.db
      .collection("notifications")
      .where("userId", "==", userId)
      .where("read", "==", false)
      .get();

    return snapshot.size;
  }

  async getNotificationStats(userId?: string): Promise<NotificationStats> {
    let query: Query = this.db.collection("notifications");

    if (userId) {
      query = query.where("userId", "==", userId);
    }

    const snapshot = await query.get();
    const notifications = snapshot.docs.map(doc => doc.data() as Notification);

    const stats: NotificationStats = {
      total: notifications.length,
      sent: notifications.filter(n => n.status === NotificationStatus.SENT).length,
      delivered: notifications.filter(n => n.status === NotificationStatus.DELIVERED).length,
      failed: notifications.filter(n => n.status === NotificationStatus.FAILED).length,
      pending: notifications.filter(n => n.status === NotificationStatus.PENDING).length,
      byChannel: {} as Record<NotificationChannel, number>,
      byType: {} as Record<NotificationType, number>,
      deliveryRate: 0,
      averageDeliveryTime: 0,
    };

    // Calculer les statistiques par canal
    Object.values(NotificationChannel).forEach(channel => {
      stats.byChannel[channel] = notifications.filter(n =>
        n.channels.includes(channel)
      ).length;
    });

    // Calculer les statistiques par type
    Object.values(NotificationType).forEach(type => {
      stats.byType[type] = notifications.filter(n => n.type === type).length;
    });

    // Calculer le taux de livraison
    if (stats.total > 0) {
      stats.deliveryRate = ((stats.sent + stats.delivered) / stats.total) * 100;
    }

    return stats;
  }
}

export const notificationService = new NotificationService();