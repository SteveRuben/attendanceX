import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";

export interface UserNotificationDocument {
  id: string;
  userId: string;
  tenantId: string;
  type: 'event' | 'attendance' | 'team' | 'system' | 'general';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date;
  data?: Record<string, any>;
  actionUrl?: string;
  expiresAt?: Date;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export interface CreateUserNotificationRequest {
  userId: string;
  tenantId: string;
  type: 'event' | 'attendance' | 'team' | 'system' | 'general';
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  expiresAt?: Date;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export class UserNotificationModel extends BaseModel<UserNotificationDocument> {
  constructor(data: Partial<UserNotificationDocument>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const notification = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(notification, [
      "userId", "tenantId", "type", "title", "message"
    ]);

    // Validation du type
    const validTypes = ['event', 'attendance', 'team', 'system', 'general'];
    if (!validTypes.includes(notification.type)) {
      throw new Error("Invalid notification type");
    }

    // Validation des longueurs
    this.validateLength(notification.title, 1, 200, "title");
    this.validateLength(notification.message, 1, 1000, "message");

    // Validation de la priorité si fournie
    if (notification.priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(notification.priority)) {
        throw new Error("Invalid priority level");
      }
    }

    // Validation de l'URL d'action si fournie
    if (notification.actionUrl && !BaseModel.validateUrl(notification.actionUrl)) {
      throw new Error("Invalid action URL");
    }

    // Validation de la date d'expiration
    if (notification.expiresAt && notification.expiresAt <= new Date()) {
      throw new Error("Expiration date must be in the future");
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = UserNotificationModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  // Sérialisation sécurisée pour API
  public toAPI(): Partial<UserNotificationDocument> {
    const data = this.data as any;
    const cleaned = { ...data };
    
    // Pas de champs sensibles à supprimer pour les notifications utilisateur
    return cleaned;
  }

  static fromFirestore(doc: DocumentSnapshot): UserNotificationModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = UserNotificationModel.prototype.convertDatesFromFirestore(data);

    return new UserNotificationModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(request: CreateUserNotificationRequest): UserNotificationModel {
    const notificationData = {
      ...request,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      priority: request.priority || 'medium' as const,
    };

    return new UserNotificationModel(notificationData);
  }

  // Méthodes d'instance
  isExpired(): boolean {
    return this.data.expiresAt ? this.data.expiresAt < new Date() : false;
  }

  markAsRead(): void {
    if (!this.data.read) {
      this.update({
        read: true,
        readAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  isUnread(): boolean {
    return !this.data.read;
  }

  belongsToTenant(tenantId: string): boolean {
    return this.data.tenantId === tenantId;
  }

  belongsToUser(userId: string): boolean {
    return this.data.userId === userId;
  }

  // Utilitaire pour nettoyer les champs undefined récursivement
  public static removeUndefinedFields(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedFields(item));
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedFields(value);
        }
      });
      return cleaned;
    }

    return obj;
  }
}