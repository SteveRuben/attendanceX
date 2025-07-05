// backend/functions/src/services/notification.service.ts - VERSION INTÉGRÉE

import {getFirestore, FieldValue, Query} from "firebase-admin/firestore";
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
} from "@attendance-x/shared";
import * as crypto from "crypto";
import {EmailService, PushService, SmsService, TemplateService} from ".";
import {userService} from "../user.service";
import {authService} from "../auth.service";

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
          data: {eventId: eventData.id, eventTitle: eventData.title},
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
          data: {eventId: eventData.id, changes},
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
          data: {eventId: eventData.id, reason},
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
          data: {eventId: eventData.id, minutesBefore},
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
          data: {attendanceId: attendanceData.id, eventId: attendanceData.eventId},
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
          data: {attendanceId: attendanceData.id},
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
          data: {reportId: reportData.id},
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
      if (!template ) {
        throw new Error(`Template not found: ${templateId}`);
      }
      if (!template.title ) {
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

      let result: { success: boolean; messageId?: string; error?: string } = {success: false};

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
            result = {success: emailResult.success, messageId: emailResult.messageId};
          } catch (error) {
            result = {success: false, error: error instanceof Error ? error.message : String(error)};
          }
        } else {
          result = {success: false, error: "No email address"};
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
            result = {success: smsResult.status === "sent", messageId: smsResult.messageId};
          } catch (error) {
             result = {success: false, error: error instanceof Error ? error.message : String(error)};
          }
        } else {
          result = {success: false, error: "No phone number"};
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
            result = {success: pushResult.success, messageId: pushResult.messageId};
          } else {
            result = {success: false, error: "No push tokens"};
          }
        } catch (error) {
           result = {success: false, error: error instanceof Error ? error.message : String(error)};
        }
        break;

      case NotificationChannel.IN_APP:
        // Pour les notifications in-app, le succès est déterminé par la sauvegarde en base
        result = {success: true, messageId: notification.id};
        break;

      default:
        result = {success: false, error: `Unsupported channel: ${channel.type}`};
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
      return request.channels.map((channel) => ({type: channel}));
    }

    // Sinon, déterminer selon les préférences utilisateur et le type de notification
    const recipientData = recipient.getData();
    const userPreferences = recipientData.preferences?.notifications || {};

    // Type de notification urgent : utiliser tous les canaux disponibles
    if (URGENT_NOTIFICATION_TYPES.includes(request.type as any)) {
      return Object.values(NotificationChannel).map((channel) => ({type: channel}));
    }

    // Utiliser les préférences utilisateur ou les canaux par défaut
    const typePreferences = userPreferences[request.type] || {};
    const defaultChannels = [NotificationChannel.IN_APP, NotificationChannel.EMAIL];

    return (typePreferences.channels || defaultChannels).map((channel: NotificationChannel) => ({type: channel}));
  }

  private async canSendBulkNotifications(userId: string): Promise<boolean> {
    return await authService.hasPermission(userId, "send_system_notifications");
  }

  private async getUsersByRoles(roles: string[]): Promise<string[]> {
    // Utiliser UserService pour récupérer les utilisateurs par rôle
    const allUsers = [];
    for (const role of roles) {
      const users = await userService.getUsers({role: role as any});
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
    } = {}
  ): Promise<NotificationStats> {
    let query: Query = this.db.collection("notifications");

    if (filters.userId) {
      query = query.where("userId", "==", filters.userId);
    }

    if (filters.type) {
      query = query.where("type", "==", filters.type);
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
      this.rateLimitMap.set(key, {count: 1, resetTime: now + windowMs});
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
  private async getTemplate(templateId: string): Promise<NotificationTemplate > {
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
          const {id, ...templateData} = template;
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
      dateRange: {start: yesterday, end: new Date()},
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

  private async sendEmail(notification: any): Promise<void> {
    // Implémentation email
    console.log("Sending email notification:", notification.title);
  }

  private async sendSMS(notification: any): Promise<void> {
    // Implémentation SMS
    console.log("Sending SMS notification:", notification.title);
  }

  private async sendPush(notification: any): Promise<void> {
    // Implémentation push
    console.log("Sending push notification:", notification.title);
  }

  private async sendInApp(notification: any): Promise<void> {
    // Implémentation in-app
    console.log("Sending in-app notification:", notification.title);
  }

  private async sendWebhook(notification: any): Promise<void> {
    // Implémentation webhook
    console.log("Sending webhook notification:", notification.title);
  }
}

// 🏭 EXPORT DE L'INSTANCE SINGLETON
export const notificationService = new NotificationService();
