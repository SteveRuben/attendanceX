import {DocumentSnapshot} from "firebase-admin/firestore";
import {
  Notification,
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  SendNotificationRequest} from "@attendance-x/shared";
import {BaseModel} from "./base.model";
/**
 * Modèle de données pour les notifications
 *
 * Ce modèle gère la validation, la transformation et la manipulation des notifications.
 * Il inclut des méthodes pour valider les champs, gérer les canaux de notification,
 * et suivre l'état d'envoi et de livraison.
 */
export class NotificationModel extends BaseModel<Notification> {
  constructor(data: Partial<Notification>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const notification = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(notification, [
      "userId", "type", "title", "message", "channels", "priority",
    ]);

    // Validation des enums
    BaseModel.validateEnum(notification.type, NotificationType, "type");
    BaseModel.validateEnum(notification.priority, NotificationPriority, "priority");

    // Validation des canaux
    if (!Array.isArray(notification.channels) || notification.channels.length === 0) {
      throw new Error("At least one notification channel is required");
    }

    notification.channels.forEach((channel) => {
      BaseModel.validateEnum(channel, NotificationChannel, "channel");
    });

    // Validation des longueurs
    this.validateLength(notification.title, 1, 200, "title");
    this.validateLength(notification.message, 1, 1000, "message");

    // Validation des dates
    if (notification.scheduledFor && !BaseModel.validateDate(notification.scheduledFor)) {
      throw new Error("Invalid scheduled date");
    }
    if (notification.expiresAt && !BaseModel.validateDate(notification.expiresAt)) {
      throw new Error("Invalid expiration date");
    }

    // Validation de la logique des dates
    if (notification.scheduledFor && notification.expiresAt &&
        notification.expiresAt <= notification.scheduledFor) {
      throw new Error("Expiration date must be after scheduled date");
    }

    return true;
  }

  toFirestore() {
    const {id, ...data} = this.data;
    return this.convertDatesToFirestore(data);
  }

  static fromFirestore(doc: DocumentSnapshot): NotificationModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = NotificationModel.prototype.convertDatesFromFirestore(data);

    return new NotificationModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromSendRequest(request: SendNotificationRequest, userId: string): NotificationModel {
    return new NotificationModel({
      userId,
      type: request.type,
      title: request.title,
      message: request.message,
      channels: request.channels,
      priority: request.priority || NotificationPriority.MEDIUM,
      data: request.data,
      templateId: request.templateId,
      scheduledFor: request.scheduledFor,
      expiresAt: request.expiresAt,
      actions: request.actions,
      read: false,
      sent: false,
      delivered: false,
      clicked: false,
      sendResults: {},
    });
  }

  // Méthodes d'instance
  isExpired(): boolean {
    return this.data.expiresAt ? this.data.expiresAt < new Date() : false;
  }

  isScheduled(): boolean {
    return this.data.scheduledFor ? this.data.scheduledFor > new Date() : false;
  }

  shouldSend(): boolean {
    if (this.isExpired() || this.data.sent) {
      return false;
    }

    if (this.data.scheduledFor) {
      return this.data.scheduledFor <= new Date();
    }

    return true;
  }

  markAsSent(channel: NotificationChannel, messageId?: string, cost?: number): void {
    const sendResult = {
      sent: true,
      sentAt: new Date(),
      messageId,
      cost,
    };

    if (!this.data.sendResults) {
      this.data.sendResults = {};
    }
    this.data.sendResults[channel] = sendResult;

    // Marquer comme envoyé si tous les canaux ont été traités
    const allChannelsSent = this.data.channels.every((ch) =>
      this.data.sendResults && this.data.sendResults[ch]?.sent === true
    );

    if (allChannelsSent) {
      this.data.sent = true;
    }

    this.updateTimestamp();
  }

  markAsDelivered(channel: NotificationChannel): void {
    if (!this.data.sendResults) {
      this.data.sendResults = {};
    }
    if (this.data.sendResults[channel]) {
      this.data.sendResults[channel]!.delivered = true;
      this.data.sendResults[channel]!.deliveredAt = new Date();
    }

    // Marquer comme livré si au moins un canal a été livré
    const anyChannelDelivered = Object.values(this.data.sendResults)
      .some((result) => result?.delivered === true);

    if (anyChannelDelivered) {
      this.data.delivered = true;
    }

    this.updateTimestamp();
  }

  markAsRead(): void {
    if (!this.data.read) {
      this.update({
        read: true,
        readAt: new Date(),
      });
    }
  }

  markAsClicked(actionTaken?: string): void {
    this.update({
      clicked: true,
      clickedAt: new Date(),
      actionTaken,
    });
  }

  markAsFailed(channel: NotificationChannel, error: string): void {
    const sendResult = {
      sent: false,
      error,
      sentAt: new Date(),
    };
    if (!this.data.sendResults) {
      this.data.sendResults = {};
    }
    this.data.sendResults[channel] = sendResult;
    this.updateTimestamp();
  }

  getDeliveryRate(): number {
    const totalChannels = this.data.channels.length;
    const deliveredChannels = this.data.sendResults ?
      Object.values(this.data.sendResults).filter((result) =>
        result?.delivered === true).length :
      0;

    return totalChannels > 0 ? (deliveredChannels / totalChannels) * 100 : 0;
  }
}
