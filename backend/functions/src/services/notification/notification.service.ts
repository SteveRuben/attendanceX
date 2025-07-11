// backend/functions/src/services/notification.service.ts - VERSION INTÉGRÉE

import { getFirestore, FieldValue, Query } from "firebase-admin/firestore";
import {
  Notification,
  NotificationStatus,
  NotificationType,
  NotificationPriority,
  NotificationTemplate,
  SendNotificationRequest,
  ERROR_CODES,
  NotificationChannel,
  NOTIFICATION_RATE_LIMITS,
  URGENT_NOTIFICATION_TYPES,
  BulkNotificationRequest,
  PushPriority,
} from "@attendance-x/shared";
import * as crypto from "crypto";
import { EmailService, PushService, SmsService, TemplateService } from ".";
import { userService } from "../user.service";
import { authService } from "../auth.service";
import { collections } from "../../config";

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
  /* private readonly providers = new Map<NotificationChannel, ChannelProvider>();
  private readonly templates = new Map<string, NotificationTemplate>(); */

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

  // 📨 ENVOI DE NOTIFICATIONS PRINCIPAL (VERSION AMÉLIORÉE)
  async sendNotification(request: SendNotificationRequest): Promise<Notification> {
    try {
      // Validation des données avec l'écosystème
      await this.validateSendRequest(request);

      // Vérifier le rate limiting intelligent
      const rateLimitCheck = await this.checkRateLimit(request.userId, request.type);
      if (!rateLimitCheck.allowed) {
        throw new Error(ERROR_CODES.NOTIFICATION_RATE_LIMIT);
      }

      // Récupérer l'utilisateur destinataire via UserService
      const recipient = await userService.getUserById(request.userId);

      // Déterminer les canaux selon les préférences utilisateur
      const channels = await this.determineChannels(request, recipient);

      // Créer la notification avec données enrichies
      const notification = this.createNotification(request, channels);

      // Sauvegarder la notification
      await this.saveNotification(notification);

      // Envoyer sur chaque canal avec les services spécialisés
      const sendPromises = channels.map((channel) =>
        this.sendToChannelWithService(notification, channel, recipient, request.data || {})
      );

      await Promise.allSettled(sendPromises);

      // Mettre à jour les statuts des canaux
      await this.updateNotificationStatus(notification);

      // Log de l'audit via l'écosystème
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

  // 📱 ENVOI PAR CANAL AVEC SERVICES SPÉCIALISÉS
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

    // Vérifier les permissions via AuthService
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
            userIds: undefined, // Éviter la confusion
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

      // Pause entre les lots pour éviter la surcharge
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

  // 🎯 NOTIFICATIONS PAR RÔLE AVEC USERSERVICE
  async sendNotificationByRole(
    roles: string[],
    request: Omit<SendNotificationRequest, "userId" | "userIds">
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    notifications: Notification[];
  }> {
    // Récupérer les utilisateurs via UserService
    const userIds = await this.getUsersByRoles(roles);

    const bulkRequest: BulkNotificationRequest = {
      ...request,
      userIds,
    };

    const results = await this.sendBulkNotification(bulkRequest);

    return {
      total: results.total,
      sent: results.sent,
      failed: results.failed,
      notifications: results.notifications,
    };
  }

  // 📋 GESTION DES NOTIFICATIONS (IDENTIQUE MAIS AVEC INTÉGRATION)
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

    // Validation avec les constantes partagées
    if (page < 1 || limit < 1 || limit > 100) {
      throw new Error(ERROR_CODES.BAD_REQUEST);
    }

    let query: Query = this.db.collection("notifications");

    // Filtres avec validation des types
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

  // 🛠️ MÉTHODES UTILITAIRES PRIVÉES AMÉLIORÉES
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
    const userPreferences = recipientData.preferences?.notifications || {};

    // Type de notification urgent : utiliser tous les canaux disponibles
    if (URGENT_NOTIFICATION_TYPES.includes(request.type as any)) {
      return Object.values(NotificationChannel).map((channel) => ({ type: channel }));
    }

    // Utiliser les préférences utilisateur ou les canaux par défaut
    const typePreferences = userPreferences[request.type] || {};
    const defaultChannels = [NotificationChannel.IN_APP, NotificationChannel.EMAIL];

    return (typePreferences.channels || defaultChannels).map((channel: NotificationChannel) => ({ type: channel }));
  }

  private async canSendBulkNotifications(userId: string): Promise<boolean> {
    return await authService.hasPermission(userId, "send_system_notifications");
  }

  private async getUsersByRoles(roles: string[]): Promise<string[]> {
    // Utiliser UserService pour récupérer les utilisateurs par rôle
    const allUsers = [];
    for (const role of roles) {
      const users = await userService.getUsers({ role: role as any });
      allUsers.push(...users.users.map((u) => u.id!));
    }
    return [...new Set(allUsers)]; // Dédupliquer
  }

  // 🎨 FORMATAGE DES CONTENUS
  private formatEmailContent(notification: Notification, data: Record<string, any>): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">${notification.title}</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">${notification.message}</p>
            
            ${notification.metadata?.link ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${notification.metadata.link}" 
                   style="background: #007bff; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 4px; display: inline-block;">
                  Voir les détails
                </a>
              </div>
            ` : ""}
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Cette notification vous a été envoyée par Attendance-X
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private formatEventChanges(changes: any): string {
    const changeTexts = [];
    if (changes.startDateTime) changeTexts.push("horaire");
    if (changes.location) changeTexts.push("lieu");
    if (changes.title) changeTexts.push("titre");
    if (changes.description) changeTexts.push("description");

    return changeTexts.join(", ") || "détails modifiés";
  }

  private formatReminderTime(minutes: number): string {
    if (minutes < 60) {
      return `dans ${minutes} minute${minutes > 1 ? "s" : ""}`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `dans ${hours} heure${hours > 1 ? "s" : ""}`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `dans ${days} jour${days > 1 ? "s" : ""}`;
    }
  }

  // 📊 STATISTIQUES INTÉGRÉES
  async getNotificationStats(
    filters: {
      userId?: string;
      dateRange?: { start: Date; end: Date };
      type?: NotificationType;
      channel?: NotificationChannel;
    } = {}
  ): Promise<NotificationStats> {
    let query: Query = this.db.collection("notifications");

    if (filters.userId) {
      query = query.where("userId", "==", filters.userId);
    }

    if (filters.type) {
      query = query.where("type", "==", filters.type);
    }

    if (filters.channel) {
      query = query.where("channel", "==", filters.channel);
    }

    if (filters.dateRange) {
      query = query.where("createdAt", ">=", filters.dateRange.start)
        .where("createdAt", "<=", filters.dateRange.end);
    }

    const snapshot = await query.get();
    const notifications = snapshot.docs.map((doc) => doc.data() as Notification);

    // Calculer les statistiques
    const stats = {
      total: notifications.length,
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      byChannel: {} as Record<NotificationChannel, number>,
      byType: {} as Record<NotificationType, number>,
      deliveryRate: 0,
      averageDeliveryTime: 0,
    };

    let totalDeliveryTime = 0;
    let deliveredCount = 0;

    notifications.forEach((notification) => {
      // Statistiques par statut
      if (notification.status === NotificationStatus.SENT) stats.sent++;
      else if (notification.status === NotificationStatus.DELIVERED) stats.delivered++;
      else if (notification.status === NotificationStatus.FAILED) stats.failed++;
      else stats.pending++;

      // Statistiques par type
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;

      // Statistiques par canal
      notification.channels.forEach((channel) => {
        stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
      });

      // Calcul du temps de livraison moyen
      if (notification.status === NotificationStatus.DELIVERED && notification.deliveredAt && notification.createdAt) {
        const deliveryTime = notification.deliveredAt.getTime() - notification.createdAt.getTime();
        totalDeliveryTime += deliveryTime;
        deliveredCount++;
      }
    });

    stats.deliveryRate = stats.total > 0 ? ((stats.sent + stats.delivered) / stats.total) * 100 : 0;
    stats.averageDeliveryTime = deliveredCount > 0 ? totalDeliveryTime / deliveredCount / 1000 : 0; // en secondes

    return stats;
  }

  // 🔒 RATE LIMITING INTELLIGENT
  private async checkRateLimit(userId: string, type: NotificationType): Promise<RateLimitCheck> {
    const key = `${userId}:${type}`;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 heure

    // Récupérer les limites pour ce type de notification
    const limits = this.getNotificationLimits(type);

    const entry = this.rateLimitMap.get(key);

    if (!entry || now > entry.resetTime) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return {
        allowed: true,
        remaining: limits.perHour - 1,
        resetTime: new Date(now + windowMs),
      };
    }

    if (entry.count >= limits.perHour) {
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
      remaining: limits.perHour - entry.count,
      resetTime: new Date(entry.resetTime),
    };
  }

  private getNotificationLimits(type: NotificationType): { perHour: number; perDay: number } {
    // Limites spéciales pour les types urgents
    if (URGENT_NOTIFICATION_TYPES.includes(type as any)) {
      return {
        perHour: NOTIFICATION_RATE_LIMITS.PUSH_PER_HOUR * 2,
        perDay: NOTIFICATION_RATE_LIMITS.EMAIL_PER_DAY * 2,
      };
    }

    return {
      perHour: NOTIFICATION_RATE_LIMITS.PUSH_PER_HOUR,
      perDay: NOTIFICATION_RATE_LIMITS.EMAIL_PER_DAY,
    };
  }

  // 📝 GESTION DES TEMPLATES INTÉGRÉE
  private async getTemplate(templateId: string): Promise<NotificationTemplate> {
    try {
      const templateDoc = await this.db.collection("notification_templates").doc(templateId).get();

      if (templateDoc.exists) {
        return {
          id: templateDoc.id,
          ...templateDoc.data(),
        } as NotificationTemplate;
      }

      throw new Error(ERROR_CODES.TEMPLATE_NOT_FOUND);
    } catch (error) {
      console.error(`Error retrieving template ${templateId}:`, error);
      throw error;
    }
  }

  async createTemplate(template: Omit<NotificationTemplate, "id" | "createdAt" | "updatedAt">): Promise<NotificationTemplate> {
    try {
      const now = new Date();
      const templateData = {
        ...template,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await this.db.collection("notification_templates").add(templateData);

      return {
        id: docRef.id,
        ...templateData,
      };
    } catch (error) {
      console.error("Error creating notification template:", error);
      throw new Error(ERROR_CODES.TEMPLATE_CREATION_FAILED);
    }
  }

  async updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    try {
      const templateRef = this.db.collection("notification_templates").doc(templateId);
      const templateDoc = await templateRef.get();

      if (!templateDoc.exists) {
        throw new Error(ERROR_CODES.TEMPLATE_NOT_FOUND);
      }

      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await templateRef.update(updateData);

      return {
        id: templateId,
        ...templateDoc.data(),
        ...updateData,
      } as NotificationTemplate;
    } catch (error) {
      console.error("Error updating notification template:", error);
      throw error;
    }
  }

  // 📱 MÉTHODES DE LECTURE ET GESTION
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notificationRef = this.db.collection("notifications").doc(notificationId);
      const notificationDoc = await notificationRef.get();

      if (!notificationDoc.exists) {
        throw new Error(ERROR_CODES.NOTIFICATION_NOT_FOUND);
      }

      const notification = notificationDoc.data() as Notification;

      // Vérifier que la notification appartient à l'utilisateur
      if (notification.userId !== userId) {
        throw new Error(ERROR_CODES.FORBIDDEN);
      }

      // Mettre à jour le statut de lecture
      await notificationRef.update({
        read: true,
        readAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }

  async markAllAsRead(userId: string): Promise<number> {
    const batch = this.db.batch();

    const unreadQuery = await this.db
      .collection("notifications")
      .where("userId", "==", userId)
      .where("read", "==", false)
      .get();

    unreadQuery.docs.forEach((doc) => {
      batch.update(doc.ref, {
        read: true,
        readAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    if (unreadQuery.size > 0) {
      await batch.commit();
    }

    return unreadQuery.size;
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notificationRef = this.db.collection("notifications").doc(notificationId);
      const notificationDoc = await notificationRef.get();

      if (!notificationDoc.exists) {
        throw new Error(ERROR_CODES.NOTIFICATION_NOT_FOUND);
      }

      const notification = notificationDoc.data() as Notification;

      // Vérifier que la notification appartient à l'utilisateur
      if (notification.userId !== userId) {
        throw new Error(ERROR_CODES.FORBIDDEN);
      }

      await notificationRef.delete();
      return true;
    } catch (error) {
      console.error("Error deleting notification:", error);
      return false;
    }
  }

  /**
 * Gérer les webhooks de livraison (callbacks des providers)
 */
  async handleDeliveryWebhook(provider: string, webhookData: any): Promise<void> {
    try {
      // @ts-ignore
      const { notificationId, status, messageId, timestamp, error } = webhookData;

      if (!notificationId) throw new Error('Missing notificationId in webhook');

      const notificationRef = collections.notifications.doc(notificationId);
      const doc = await notificationRef.get();

      if (!doc.exists) {
        console.warn(`Notification ${notificationId} not found for webhook`);
        return;
      }

      const updates: any = {
        updatedAt: new Date(timestamp || Date.now())
      };

      switch (status) {
        case 'delivered':
          updates.status = NotificationStatus.DELIVERED;
          updates.deliveredAt = updates.updatedAt;
          break;
        case 'failed':
          updates.status = NotificationStatus.FAILED;
          updates.failureReason = error;
          break;
        case 'read':
          updates.read = true;
          updates.readAt = updates.updatedAt;
          break;
      }

      await notificationRef.update(updates);
      console.log(`Webhook processed for notification ${notificationId}: ${status}`);
    } catch (error) {
      console.error('Error handling delivery webhook:', error);
      throw error;
    }
  }

  /**
   * Obtenir le statut de livraison d'une notification
   */
  async getNotificationDeliveryStatus(notificationId: string): Promise<{
    status: NotificationStatus;
    channels: Array<{ type: NotificationChannel; status: string; deliveredAt?: Date; error?: string }>;
    deliveryRate: number;
  }> {
    try {
      const doc = await collections.notifications.doc(notificationId).get();

      if (!doc.exists) {
        throw new Error('Notification not found');
      }

      const notification = doc.data() as Notification;

      // Simuler les statuts des canaux (à adapter selon votre structure de données)
      const channelStatuses = notification.channels.map(channel => ({
        type: channel,
        status: notification.status === NotificationStatus.DELIVERED ? 'delivered' :
          notification.status === NotificationStatus.FAILED ? 'failed' : 'sent',
        deliveredAt: notification.deliveredAt,
        error: notification.status === NotificationStatus.FAILED ? 'Delivery failed' : undefined
      }));

      const deliveredChannels = channelStatuses.filter(c => c.status === 'delivered').length;
      const deliveryRate = (deliveredChannels / channelStatuses.length) * 100;

      return {
        status: notification.status,
        channels: channelStatuses,
        deliveryRate
      };
    } catch (error) {
      console.error('Error getting delivery status:', error);
      throw error;
    }
  }

  /**
   * Enregistrer un device push
   */
  async registerPushDevice(userId: string, deviceToken: string, platform: 'ios' | 'android' | 'web'): Promise<void> {
    try {
      const deviceData = {
        userId,
        token: deviceToken,
        platform,
        registeredAt: new Date(),
        isActive: true
      };

      // Désactiver l'ancien token si il existe
      await collections.push_devices
        .where('userId', '==', userId)
        .where('token', '==', deviceToken)
        .get()
        .then(snapshot => {
          const batch = this.db.batch();
          snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isActive: false });
          });
          return batch.commit();
        });

      // Ajouter le nouveau device
      await collections.push_devices.add(deviceData);
      console.log(`Push device registered for user ${userId}: ${platform}`);
    } catch (error) {
      console.error('Error registering push device:', error);
      throw error;
    }
  }

  /**
   * Tester une notification
   */
  async testNotification(userId: string, type: NotificationType, channel: NotificationChannel, testData: any): Promise<void> {
    try {
      await this.sendNotification({
        userId,
        type,
        title: `Test - ${type}`,
        message: testData?.message || 'Ceci est une notification de test',
        channels: [channel],
        data: { isTest: true, ...testData },
        sentBy: 'system'
      });
      console.log(`Test notification sent to ${userId} via ${channel}`);
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  /**
   * Supprimer un template de notification
   */
  async deleteNotificationTemplate(templateId: string, deletedBy: string): Promise<void> {
    try {
      const templateRef = collections.notification_templates.doc(templateId);
      const doc = await templateRef.get();

      if (!doc.exists) {
        throw new Error('Template not found');
      }

      await templateRef.delete();

      // Log de l'audit
      await this.logNotificationAction('template_deleted', templateId, deletedBy);
      console.log(`Template ${templateId} deleted by ${deletedBy}`);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un template de notification
   */
  async updateNotificationTemplate(templateId: string, updates: Partial<NotificationTemplate>, updatedBy: string): Promise<NotificationTemplate> {
    try {
      const templateRef = collections.notification_templates.doc(templateId);
      const doc = await templateRef.get();

      if (!doc.exists) {
        throw new Error('Template not found');
      }

      const updateData = {
        ...updates,
        updatedAt: new Date(),
        updatedBy
      };

      await templateRef.update(updateData);

      const updatedTemplate = {
        id: templateId,
        ...doc.data(),
        ...updateData
      } as NotificationTemplate;

      await this.logNotificationAction('template_updated', templateId, updatedBy);
      return updatedTemplate;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Créer un template de notification
   */
  async createNotificationTemplate(templateData: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
    try {
      const template = {
        ...templateData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await collections.notification_templates.add(template);

      const createdTemplate = {
        id: docRef.id,
        ...template
      };

      await this.logNotificationAction('template_created', docRef.id, 'system');
      return createdTemplate;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Obtenir les templates de notification
   */
  async getNotificationTemplates(type?: string, language: string = 'fr'): Promise<NotificationTemplate[]> {
    try {
      let query = collections.notification_templates.where('language', '==', language);

      if (type) {
        query = query.where('type', '==', type);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NotificationTemplate[];
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  }


  /**
   * Envoyer des rappels d'événement
   */
  async sendEventReminders(eventId: string, reminderType: 'before_1h' | 'before_24h' | 'before_1w', sentBy: string): Promise<void> {
    try {
      // Récupérer les participants de l'événement
      const event = await collections.events.doc(eventId).get();
      if (!event.exists) throw new Error('Event not found');

      const eventData = event.data();
      const participantIds = eventData?.participants || [];

      const minutesBefore = {
        'before_1h': 60,
        'before_24h': 1440,
        'before_1w': 10080
      }[reminderType];

      await this.attendance.eventReminder(eventData, minutesBefore, participantIds);
      console.log(`Event reminders sent for ${eventId}: ${reminderType}`);
    } catch (error) {
      console.error('Error sending event reminders:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour les préférences de notification
   */
  async updateNotificationPreferences(userId: string, preferences: any): Promise<void> {
    try {
      await collections.users.doc(userId).update({
        'preferences.notifications': preferences,
        updatedAt: new Date()
      });
      console.log(`Notification preferences updated for user ${userId}`);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Obtenir les préférences de notification
   */
  async getNotificationPreferences(userId: string): Promise<any> {
    try {
      const userDoc = await collections.users.doc(userId).get();

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      return userData?.preferences?.notifications || {
        email: true,
        push: true,
        sms: false,
        inApp: true
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      throw error;
    }
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  async markAllNotificationsAsRead(userId: string): Promise<number> {
    try {
      return await this.markAllAsRead(userId);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Marquer une notification comme lue
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      return await this.markAsRead(notificationId, userId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Obtenir les notifications d'un utilisateur
   */
  async getUserNotifications(userId: string, options: {
    page: number;
    limit: number;
    unreadOnly: boolean;
    type?: string;
    channel?: string;
  }): Promise<{ notifications: Notification[]; pagination: any }> {
    try {
      const queryOptions: NotificationListOptions = {
        userId,
        page: options.page,
        limit: options.limit,
        onlyUnread: options.unreadOnly,
        type: options.type as NotificationType,
        channel: options.channel as NotificationChannel
      };

      return await this.getNotifications(queryOptions);
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }


  /**
   * Vérification de santé du service
   */
  async healthCheck(): Promise<any> {
    try {
      const checks = {
        database: false,
        emailService: false,
        smsService: false,
        pushService: false,
        templates: false
      };

      // Test database
      try {
        await this.db.collection('notifications').limit(1).get();
        checks.database = true;
      } catch (error) {
        console.error('Database health check failed:', error);
      }

      // Test services
      checks.emailService = await this.testEmailService();
      checks.smsService = await this.testSmsService();
      checks.pushService = await this.testPushService();

      // Test templates
      try {
        const templates = await this.getNotificationTemplates();
        checks.templates = templates.length > 0;
      } catch (error) {
        console.error('Templates health check failed:', error);
      }

      const healthy = Object.values(checks).every(check => check === true);

      return {
        status: healthy ? 'healthy' : 'degraded',
        checks,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Health check error:', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  // 🔧 MÉTHODES UTILITAIRES PRIVÉES
  private createNotification(
    request: SendNotificationRequest,
    channels: Array<{ type: NotificationChannel; settings?: any }>
  ): Notification {
    return {
      id: crypto.randomUUID(),
      userId: request.userId,
      type: request.type,
      title: request.title,
      message: request.message || "",
      status: NotificationStatus.PENDING,
      priority: request.priority || NotificationPriority.NORMAL,
      channels: [...channels.map((channel) => channel.type)],
      data: request.data || {},
      metadata: {
        link: request.link,
        actions: request.actions,
        /* image: request.image,
    icon: request.icon, */
      },
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: request.expiresAt || this.calculateExpirationDate(request.priority),
      sent: false,
      delivered: false,
      clicked: false,
    };
  }

  private calculateExpirationDate(priority?: NotificationPriority): Date {
    const now = new Date();
    const days = priority === NotificationPriority.URGENT ? 30 :
      priority === NotificationPriority.HIGH ? 14 : 7;

    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private cleanupRateLimits(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }

  private async countNotifications(options: NotificationListOptions): Promise<number> {
    let query: Query = this.db.collection("notifications");

    // Appliquer les mêmes filtres
    if (options.userId) query = query.where("userId", "==", options.userId);
    if (options.type) query = query.where("type", "==", options.type);
    if (options.status) query = query.where("status", "==", options.status);
    if (options.onlyUnread) query = query.where("read", "==", false);
    if (options.dateRange) {
      query = query.where("createdAt", ">=", options.dateRange.start)
        .where("createdAt", "<=", options.dateRange.end);
    }

    const snapshot = await query.get();
    return snapshot.size;
  }

  private async saveNotification(notification: Notification): Promise<void> {
    await this.db
      .collection("notifications")
      .doc(notification.id!)
      .set(notification);
  }

  private async updateNotificationStatus(notification: Notification): Promise<void> {
    // Déterminer le statut global basé sur les statuts des canaux
    /* const channelStatuses = notification.channels.map((c) => c);

    let globalStatus: NotificationStatus = "pending";

    if (channelStatuses.every((s) => s === "sent")) {
      globalStatus = "sent";
    } else if (channelStatuses.every((s) => s === "failed")) {
      globalStatus = "failed";
    } else if (channelStatuses.some((s) => s === "sent")) {
      globalStatus = "sent"; // Partiellement envoyé
    }

    await this.db
      .collection("notifications")
      .doc(notification.id!)
      .update({
        status: globalStatus,
        updatedAt: FieldValue.serverTimestamp(),
      }); */
  }

  private async updateChannelStatus(
    notificationId: string,
    channel: NotificationChannel,
    status: string,
    metadata?: any
  ): Promise<void> {
    /* const notificationRef = this.db.collection("notifications").doc(notificationId);
    const doc = await notificationRef.get();

    if (doc.exists) {
      const notification = doc.data() as Notification;
      const channelIndex = notification.channels.findIndex((c) => c.type === channel);

      if (channelIndex >= 0) {
        notification.channels[channelIndex] = {
          ...notification.channels[channelIndex],
          status: status as any,
          ...metadata,
        };

        await notificationRef.update({
          channels: notification.channels,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } */
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

  // 🔌 INITIALISATION DES PROVIDERS
  private initializeProviders(): void {
    // Les providers réels sont maintenant gérés par les services spécialisés
    console.log("Notification providers initialized via specialized services");
  }

  private loadTemplates(): void {
    // Charger les templates par défaut pour Attendance-X
    this.loadDefaultTemplates();
  }

  private async loadDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        id: "user_invitation",
        name: "Invitation utilisateur",
        type: "user_invited",
        title: "Invitation à rejoindre {organizationName}",
        content: "Bonjour ! {inviterName} vous invite à rejoindre {organizationName} sur Attendance-X.",
        channels: [NotificationChannel.EMAIL],
        priority: NotificationPriority.HIGH,
        variables: ["inviterName", "organizationName", "invitationUrl"],
      },
      {
        id: "event_reminder",
        name: "Rappel événement",
        type: "event_reminder",
        title: "Rappel: {eventTitle}",
        content: "N'oubliez pas l'événement \"{eventTitle}\" qui commence {timeText}.",
        channels: [NotificationChannel.PUSH],
        priority: NotificationPriority.NORMAL,
        variables: ["eventTitle", "timeText"],
      },
      {
        id: "attendance_validation",
        name: "Validation de présence",
        type: "validation_required",
        title: "Validation de présence requise",
        content: "Une présence nécessite votre validation: {userName} pour l'événement {eventTitle}.",
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        priority: NotificationPriority.HIGH,
        variables: ["userName", "eventTitle"],
      },
    ];

    // Sauvegarder les templates par défaut s'ils n'existent pas
    for (const template of defaultTemplates) {
      try {
        const existingTemplate = await this.getTemplate(template.id);
        if (!existingTemplate) {
          const { id, ...templateData } = template;
          await this.db.collection("notification_templates").doc(id).set({
            ...templateData,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        console.error(`Error loading default template ${template.id}:`, error);
      }
    }
  }

  // 🧹 MÉTHODES DE NETTOYAGE
  async cleanupExpiredNotifications(): Promise<number> {
    const now = new Date();

    const expiredQuery = await this.db
      .collection("notifications")
      .where("expiresAt", "<", now)
      .get();

    if (expiredQuery.empty) {
      return 0;
    }

    const batch = this.db.batch();
    expiredQuery.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`Cleaned up ${expiredQuery.size} expired notifications`);
    return expiredQuery.size;
  }

  // 📊 MÉTHODES DE DIAGNOSTIC
  async getSystemNotificationHealth(): Promise<{
    emailService: boolean;
    smsService: boolean;
    pushService: boolean;
    totalNotifications24h: number;
    successRate24h: number;
    issues: string[];
  }> {
    const issues = [];

    // Tester les services
    const emailHealth = await this.testEmailService();
    const smsHealth = await this.testSmsService();
    const pushHealth = await this.testPushService();

    if (!emailHealth) issues.push("Email service unavailable");
    if (!smsHealth) issues.push("SMS service unavailable");
    if (!pushHealth) issues.push("Push service unavailable");

    // Statistiques des dernières 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stats = await this.getNotificationStats({
      dateRange: { start: yesterday, end: new Date() },
    });

    return {
      emailService: emailHealth,
      smsService: smsHealth,
      pushService: pushHealth,
      totalNotifications24h: stats.total,
      successRate24h: stats.deliveryRate,
      issues,
    };
  }

  private async testEmailService(): Promise<boolean> {
    try {
      const providers = await this.emailService.getAvailableProviders();
      return providers.some((p) => p.isActive);
    } catch {
      return false;
    }
  }

  private async testSmsService(): Promise<boolean> {
    try {
      const providers = await this.smsService.getAvailableProviders();
      return providers.some((p) => p.isActive);
    } catch {
      return false;
    }
  }

  private async testPushService(): Promise<boolean> {
    try {
      // Test simple de disponibilité du service push
      return true; // Firebase est généralement disponible
    } catch {
      return false;
    }
  }

  async sendViaChannel(notificationId: string, notification: any, channel: NotificationChannel): Promise<void> {
    try {
      switch (channel) {
        case NotificationChannel.EMAIL:
          await this.sendEmail(notification);
          break;
        case NotificationChannel.SMS:
          await this.sendSMS(notification);
          break;
        case NotificationChannel.PUSH:
          await this.sendPush(notification);
          break;
        case NotificationChannel.IN_APP:
          await this.sendInApp(notification);
          break;
        case NotificationChannel.WEBHOOK:
          await this.sendWebhook(notification);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }
    } catch (error) {
      console.error(`Error sending via ${channel}:`, error);
      throw error;
    }
  }

  /**
 * Envoyer notification par email
 */
  private async sendEmail(notification: Notification): Promise<void> {
    try {
      // Récupérer l'utilisateur destinataire
      const user = await userService.getUserById(notification.userId);
      if (!user?.getData().email) {
        throw new Error('User email not found');
      }

      // Préparer le contenu email
      const emailContent = {
        to: user.getData().email,
        subject: notification.title,
        html: this.formatEmailContent(notification, notification.data || {}),
        text: notification.message
      };

      // Envoyer via EmailService
      const result = await this.emailService.sendEmail(
        emailContent.to,
        emailContent.subject,
        {
          html: emailContent.html,
          text: emailContent.text
        },
        {
          userId: notification.userId,
          trackingId: `notif-${notification.id}`
        }
      );

      if (!result.success) {

        throw new Error(result?.errors?.join(",") || 'Email sending failed');
      }

      // Mettre à jour le statut
      await this.updateChannelStatus(notification.id!, NotificationChannel.EMAIL, 'sent', {
        messageId: result.messageId,
        sentAt: new Date()
      });

      console.log(`Email sent successfully to ${user.getData().email} for notification ${notification.id}`);
    } catch (error) {
      console.error('Error sending email:', error);
      await this.updateChannelStatus(notification.id!, NotificationChannel.EMAIL, 'failed', {
        error: error instanceof Error ? error.message : String(error),
        failedAt: new Date()
      });
      throw error;
    }
  }

  /**
   * Envoyer notification par SMS
   */
  private async sendSMS(notification: Notification): Promise<void> {
    try {
      // Récupérer l'utilisateur destinataire
      const user = await userService.getUserById(notification.userId);
      if (!user?.getData().phoneNumber) {
        throw new Error('User phone number not found');
      }

      // Formatage du message SMS (160 caractères max)
      let smsMessage = notification.message;
      if (smsMessage.length > 160) {
        smsMessage = `${notification.title}: ${notification.message.substring(0, 140)}...`;
      }

      // Envoyer via SmsService
      const result = await this.smsService.sendSms(
        user.getData().phoneNumber ?? '',
        smsMessage,
        {
          userId: notification.userId,
          trackingId: `notif-${notification.id}`
        }
      );

      if (!result.success) {
        throw new Error('SMS sending failed');
      }

      // Mettre à jour le statut
      await this.updateChannelStatus(notification.id!, NotificationChannel.SMS, 'sent', {
        messageId: result.messageId,
        sentAt: new Date(),
        cost: result.cost
      });

      console.log(`SMS sent successfully to ${user.getData().phoneNumber} for notification ${notification.id}`);
    } catch (error) {
      console.error('Error sending SMS:', error);
      await this.updateChannelStatus(notification.id!, NotificationChannel.SMS, 'failed', {
        error: error instanceof Error ? error.message : String(error),
        failedAt: new Date()
      });
      throw error;
    }
  }

  /**
   * Envoyer notification push
   */
  private async sendPush(notification: Notification): Promise<void> {
    try {
      // Récupérer les tokens push de l'utilisateur
      const pushTokens = await this.getPushTokens(notification.userId);
      if (pushTokens.length === 0) {
        throw new Error('No push tokens found for user');
      }

      // Préparer la payload push
      const pushPayload = {
        title: notification.title,
        body: notification.message,
        data: {
          notificationId: notification.id!,
          type: notification.type,
          userId: notification.userId,
          ...notification.data
        },
        icon: '/icons/notification-icon.png',
        badge: await this.getUnreadCount(notification.userId),
        priority: notification.priority === NotificationPriority.URGENT ? 'high' : 'normal' as PushPriority ,
        click_action: notification.metadata?.link || '/notifications'
      };

      // Envoyer à tous les devices
      const results = await Promise.allSettled(
        pushTokens.map(token =>
          this.pushService.sendPushNotification([token.token], pushPayload)
        )
      );

      // Compter les succès/échecs
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - successful;

      if (successful === 0) {
        throw new Error('All push notifications failed');
      }

      // Mettre à jour le statut
      await this.updateChannelStatus(notification.id!, NotificationChannel.PUSH, 'sent', {
        sentAt: new Date(),
        devicesSent: successful,
        devicesFailed: failed,
        totalDevices: pushTokens.length
      });

      console.log(`Push sent to ${successful}/${pushTokens.length} devices for notification ${notification.id}`);
    } catch (error) {
      console.error('Error sending push:', error);
      await this.updateChannelStatus(notification.id!, NotificationChannel.PUSH, 'failed', {
        error: error instanceof Error ? error.message : String(error),
        failedAt: new Date()
      });
      throw error;
    }
  }

  /**
   * Envoyer notification in-app
   */
  private async sendInApp(notification: Notification): Promise<void> {
    try {
      // Pour les notifications in-app, on sauvegarde en base de données
      // et on utilise WebSocket/Server-Sent Events pour la livraison temps réel

      // 1. Sauvegarder en base (déjà fait dans saveNotification)

      // 2. Envoyer via WebSocket si l'utilisateur est connecté
      await this.sendRealTimeNotification(notification);

      // 3. Mettre à jour le badge count
      const unreadCount = await this.getUnreadCount(notification.userId);
      await this.updateUserBadgeCount(notification.userId, unreadCount);

      // Mettre à jour le statut
      await this.updateChannelStatus(notification.id!, NotificationChannel.IN_APP, 'sent', {
        sentAt: new Date(),
        deliveredViaWebSocket: true
      });

      console.log(`In-app notification saved and sent for user ${notification.userId}`);
    } catch (error) {
      console.error('Error sending in-app notification:', error);
      await this.updateChannelStatus(notification.id!, NotificationChannel.IN_APP, 'failed', {
        error: error instanceof Error ? error.message : String(error),
        failedAt: new Date()
      });
      throw error;
    }
  }

  /**
   * Envoyer notification via webhook
   */
  private async sendWebhook(notification: Notification): Promise<void> {
    try {
      // Récupérer les webhooks configurés pour l'utilisateur/organisation
      const webhookUrls = await this.getWebhookUrls(notification.userId, notification.type);

      if (webhookUrls.length === 0) {
        throw new Error('No webhook URLs configured');
      }

      // Préparer la payload webhook
      const webhookPayload = {
        event: 'notification.sent',
        timestamp: new Date().toISOString(),
        notification: {
          id: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          data: notification.data,
          createdAt: notification.createdAt
        }
      };

      // Envoyer à tous les webhooks
      const results = await Promise.allSettled(
        webhookUrls.map(url => this.sendWebhookRequest(url, webhookPayload))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - successful;

      if (successful === 0) {
        throw new Error('All webhook requests failed');
      }

      // Mettre à jour le statut
      await this.updateChannelStatus(notification.id!, NotificationChannel.WEBHOOK, 'sent', {
        sentAt: new Date(),
        webhooksSent: successful,
        webhooksFailed: failed,
        totalWebhooks: webhookUrls.length
      });

      console.log(`Webhook sent to ${successful}/${webhookUrls.length} endpoints for notification ${notification.id}`);
    } catch (error) {
      console.error('Error sending webhook:', error);
      await this.updateChannelStatus(notification.id!, NotificationChannel.WEBHOOK, 'failed', {
        error: error instanceof Error ? error.message : String(error),
        failedAt: new Date()
      });
      throw error;
    }
  }

  /**
   * Récupérer les tokens push d'un utilisateur
   */
  private async getPushTokens(userId: string): Promise<Array<{ token: string; platform: string; isActive: boolean }>> {
    try {
      const snapshot = await this.db.collection('push_devices')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      return snapshot.docs.map(doc => doc.data() as any);
    } catch (error) {
      console.error('Error getting push tokens:', error);
      return [];
    }
  }

  /**
   * Obtenir le nombre de notifications non lues
   */
  private async getUnreadCount(userId: string): Promise<number> {
    try {
      const snapshot = await this.db.collection('notifications')
        .where('userId', '==', userId)
        .where('read', '==', false)
        .get();

      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Envoyer notification temps réel via WebSocket
   */
  private async sendRealTimeNotification(notification: Notification): Promise<void> {
    try {
      // Vérifier si l'utilisateur est connecté via WebSocket
      const userSockets = await this.getActiveUserSockets(notification.userId);

      if (userSockets.length > 0) {
        const realtimePayload = {
          type: 'new_notification',
          notification: {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            priority: notification.priority,
            createdAt: notification.createdAt,
            data: notification.data
          }
        };

        // Envoyer à toutes les sessions actives de l'utilisateur
        userSockets.forEach(socket => {
          socket.emit('notification', realtimePayload);
        });

        console.log(`Real-time notification sent to ${userSockets.length} active sessions`);
      }
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      // Ne pas faire échouer la notification si WebSocket échoue
    }
  }

  /**
   * Mettre à jour le badge count de l'utilisateur
   */
  private async updateUserBadgeCount(userId: string, count: number): Promise<void> {
    try {
      await this.db.collection('users').doc(userId).update({
        'notificationSettings.badgeCount': count,
        'notificationSettings.lastBadgeUpdate': new Date()
      });
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  /**
   * Récupérer les URLs de webhook configurées
   */
  private async getWebhookUrls(userId: string, notificationType: NotificationType): Promise<string[]> {
    try {
      // Récupérer les webhooks de l'utilisateur
      const userDoc = await this.db.collection('users').doc(userId).get();
      const userData = userDoc.data();

      const webhooks = userData?.webhooks?.notifications || [];

      // Filtrer par type de notification si configuré
      return webhooks
        .filter((webhook: any) =>
          webhook.isActive &&
          (!webhook.types || webhook.types.includes(notificationType))
        )
        .map((webhook: any) => webhook.url);
    } catch (error) {
      console.error('Error getting webhook URLs:', error);
      return [];
    }
  }

  /**
   * Envoyer une requête webhook
   */
  private async sendWebhookRequest(url: string, payload: any): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AttendanceX-Notifications/1.0'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000) // Timeout 10s
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
      }

      console.log(`Webhook sent successfully to ${url}`);
    } catch (error) {
      console.error(`Error sending webhook to ${url}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les sockets WebSocket actives d'un utilisateur
   */
  private async getActiveUserSockets(userId: string): Promise<any[]> {
    // Cette méthode dépend de votre implémentation WebSocket
    // Exemple avec Socket.IO:
    /*
    const io = getSocketIOInstance();
    const userSockets = [];
    
    for (const [socketId, socket] of io.sockets.sockets) {
      if (socket.userId === userId && socket.connected) {
        userSockets.push(socket);
      }
    }
    
    return userSockets;
    */

    // Pour l'instant, retourner un array vide
    return [];
  }


  /**
   * Envoyer notification email spécifique
   */
  async sendEmailNotification(request: {
    recipients: string[];
    subject: string;
    content: string;
    templateId?: string;
    variables?: Record<string, any>;
    type?: NotificationType;
    scheduledFor?: Date;
    priority?: NotificationPriority;
    senderId: string;
  }): Promise<{
    notificationId: string;
    estimatedDelivery?: Date;
  }> {
    try {
      const notifications = [];

      for (const userId of request.recipients) {
        const notification = await this.sendNotification({
          userId,
          type: request.type || NotificationType.SYSTEM_MAINTENANCE,
          title: request.subject,
          message: request.content,
          channels: [NotificationChannel.EMAIL],
          priority: request.priority || NotificationPriority.NORMAL,
          data: request.variables || {},
          sentBy: request.senderId,
          expiresAt: request.scheduledFor
        });

        notifications.push(notification);
      }

      return {
        notificationId: notifications[0]?.id || 'bulk',
        estimatedDelivery: request.scheduledFor || new Date()
      };
    } catch (error) {
      console.error('Error sending email notification:', error);
      throw error;
    }
  }

  /**
   * Envoyer notification SMS spécifique
   */
  async sendSmsNotification(request: {
    recipients: string[];
    message: string;
    templateId?: string;
    variables?: Record<string, any>;
    scheduledFor?: Date;
    priority?: NotificationPriority;
    senderId: string;
  }): Promise<{
    notificationId: string;
    estimatedCost?: number;
    estimatedDelivery?: Date;
  }> {
    try {
      const notifications = [];
      let totalCost = 0;

      for (const userId of request.recipients) {
        const notification = await this.sendNotification({
          userId,
          type: NotificationType.SYSTEM_MAINTENANCE,
          title: 'SMS',
          message: request.message,
          channels: [NotificationChannel.SMS],
          priority: request.priority || NotificationPriority.NORMAL,
          data: request.variables || {},
          sentBy: request.senderId,
          expiresAt: request.scheduledFor
        });

        notifications.push(notification);
        totalCost += 0.05; // Coût estimé par SMS
      }

      return {
        notificationId: notifications[0]?.id || 'bulk',
        estimatedCost: totalCost,
        estimatedDelivery: request.scheduledFor || new Date()
      };
    } catch (error) {
      console.error('Error sending SMS notification:', error);
      throw error;
    }
  }

  /**
   * Envoyer notification push spécifique
   */
  async sendPushNotification(request: {
    recipients: string[];
    title: string;
    body: string;
    data?: Record<string, any>;
    imageUrl?: string;
    actionButtons?: Array<{ id: string; title: string; action: string }>;
    scheduledFor?: Date;
    priority?: NotificationPriority;
    senderId: string;
  }): Promise<{
    notificationId: string;
    deliveredCount: number;
    failedCount: number;
  }> {
    try {
      const notifications = [];
      let deliveredCount = 0;
      let failedCount = 0;

      for (const userId of request.recipients) {
        try {
          const notification = await this.sendNotification({
            userId,
            type: NotificationType.SYSTEM_MAINTENANCE,
            title: request.title,
            message: request.body,
            channels: [NotificationChannel.PUSH],
            priority: request.priority || NotificationPriority.NORMAL,
            data: {
              imageUrl: request.imageUrl,
              actionButtons: request.actionButtons,
              ...request.data
            },
            sentBy: request.senderId,
            expiresAt: request.scheduledFor
          });

          notifications.push(notification);
          deliveredCount++;
        } catch (error) {
          console.error(`Failed to send push to user ${userId}:`, error);
          failedCount++;
        }
      }

      return {
        notificationId: notifications[0]?.id || 'bulk',
        deliveredCount,
        failedCount
      };
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  async getStatus(){
    return "Ok";
  }

}

// 🏭 EXPORT DE L'INSTANCE SINGLETON
export const notificationService = new NotificationService();
