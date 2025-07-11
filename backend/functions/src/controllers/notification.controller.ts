import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthenticatedRequest } from "../middleware/auth";
import { notificationService } from "../services/notification";
import { BulkNotificationRequest, NotificationChannel, NotificationType } from "@attendance-x/shared";

/**
 * Contrôleur de gestion des notifications
 */
export class NotificationController {

  /**
   * Envoyer une notification
   */
  static sendNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const notificationData = req.body;
    const sentBy = req.user.uid;

    const result = await notificationService.sendNotification({
      ...notificationData,
      sentBy,
    });

    res.json({
      success: true,
      message: "Notification envoyée avec succès",
      data: result,
    });
  });

  /**
   * Envoyer une notification en masse
   */
  static sendBulkNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {recipients, ...notificationData} = req.body;
    const sentBy = req.user.uid;
/* 
    recipients,
      notificationData,
      sentBy */
    let bulkNotif:BulkNotificationRequest = {
      userIds: [...recipients],
      sentBy,
      type: NotificationType.EVENT_REMINDER,
      title:  notificationData.title,
      message: notificationData.message,
      channels: [NotificationChannel.EMAIL]
    };

    const result = await notificationService.sendBulkNotification(bulkNotif);

    res.json({
      success: true,
      message: `Notifications envoyées: ${result.sent} succès, ${result.failed} échecs`,
      data: result,
    });
  });

  /**
   * Obtenir mes notifications
   */
  static getMyNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      unreadOnly: req.query.unreadOnly === "true",
      type: req.query.type as string,
      channel: req.query.channel as string,
    };

    const result = await notificationService.getUserNotifications(userId, options);

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
    });
  });

  /**
   * Marquer une notification comme lue
   */
  static markAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const userId = req.user.uid;

    await notificationService.markNotificationAsRead(id, userId);

    res.json({
      success: true,
      message: "Notification marquée comme lue",
    });
  });

  /**
   * Marquer toutes les notifications comme lues
   */
  static markAllAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;

    const count = await notificationService.markAllNotificationsAsRead(userId);

    res.json({
      success: true,
      message: `${count} notifications marquées comme lues`,
    });
  });

  /**
   * Supprimer une notification
   */
  static deleteNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const userId = req.user.uid;

    await notificationService.deleteNotification(id, userId);

    res.json({
      success: true,
      message: "Notification supprimée",
    });
  });

  /**
   * Obtenir les préférences de notification
   */
  static getNotificationPreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;

    const preferences = await notificationService.getNotificationPreferences(userId);

    res.json({
      success: true,
      data: preferences,
    });
  });

  /**
   * Mettre à jour les préférences de notification
   */
  static updateNotificationPreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;
    const preferences = req.body;

    await notificationService.updateNotificationPreferences(userId, preferences);

    res.json({
      success: true,
      message: "Préférences mises à jour",
    });
  });

  /**
   * Obtenir les templates de notification
   */
  static getNotificationTemplates = asyncHandler(async (req: Request, res: Response) => {
    const type = req.query.type as string;
    const language = req.query.language as string || "fr";

    const templates = await notificationService.getNotificationTemplates(type, language);

    res.json({
      success: true,
      data: templates,
    });
  });

  /**
   * Créer un template de notification
   */
  static createNotificationTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const templateData = req.body;
    const createdBy = req.user.uid;

    const template = await notificationService.createNotificationTemplate({
      ...templateData,
      createdBy,
    });

    res.status(201).json({
      success: true,
      message: "Template créé avec succès",
      data: template,
    });
  });

  /**
   * Mettre à jour un template de notification
   */
  static updateNotificationTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const updates = req.body;
    const updatedBy = req.user.uid;

    const template = await notificationService.updateNotificationTemplate(id, updates, updatedBy);

    res.json({
      success: true,
      message: "Template mis à jour",
      data: template,
    });
  });

  /**
   * Supprimer un template de notification
   */
  static deleteNotificationTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const deletedBy = req.user.uid;

    await notificationService.deleteNotificationTemplate(id, deletedBy);

    res.json({
      success: true,
      message: "Template supprimé",
    });
  });

  /**
   * Tester une notification
   */
  static testNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {type, channel, testData} = req.body;
    const userId = req.user.uid;

    const result = await notificationService.testNotification(userId, type, channel, testData);

    res.json({
      success: true,
      message: "Notification de test envoyée",
      data: result,
    });
  });

  /**
   * Obtenir les statistiques des notifications
   */
  static getNotificationStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters = {
      userId: req.query.userId as string,
      type: req.query.type as NotificationType,
      channel: req.query.channel as NotificationChannel,
      dateRange: req.query.startDate && req.query.endDate ? {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string),
      } : undefined,
    };

    const stats = await notificationService.getNotificationStats(filters);

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Envoyer des rappels d'événement
   */
  static sendEventReminders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {eventId, reminderType} = req.body;
    const sentBy = req.user.uid;

    const result = await notificationService.sendEventReminders(eventId, reminderType, sentBy);

    res.json({
      success: true,
      message: "Rappels envoyés",
      data: result,
    });
  });

  /**
   * Configurer les notifications push
   */
  static configurePushNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {deviceToken, platform} = req.body;
    const userId = req.user.uid;

    await notificationService.registerPushDevice(userId, deviceToken, platform);

    res.json({
      success: true,
      message: "Notifications push configurées",
    });
  });

  /**
   * Obtenir le statut de livraison des notifications
   */
  static getDeliveryStatus = asyncHandler(async (req: Request, res: Response) => {
    const {id} = req.params;

    const status = await notificationService.getNotificationDeliveryStatus(id);

    res.json({
      success: true,
      data: status,
    });
  });

  /**
   * Webhook pour les statuts de livraison
   */
  static handleDeliveryWebhook = asyncHandler(async (req: Request, res: Response) => {
    const {provider} = req.params;
    const webhookData = req.body;

    await notificationService.handleDeliveryWebhook(provider, webhookData);

    res.status(200).send("OK");
  });

  static sendPushNotification = asyncHandler(async (req: Request, res: Response) => {
    throw new Error("Method not implemented.");
  });

  static sendSmsNotification= asyncHandler(async (req: Request, res: Response) => {
    throw new Error("Method not implemented.");
  });

  static sendEmailNotification = asyncHandler(async (req: Request, res: Response) => {
    throw new Error("Method not implemented.");
  });
}
