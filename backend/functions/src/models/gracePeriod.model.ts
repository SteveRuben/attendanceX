import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";

/**
 * Énumérations pour les périodes de grâce
 */
export enum GracePeriodStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CONVERTED = 'converted',
  CANCELLED = 'cancelled'
}

export enum GracePeriodSource {
  NEW_REGISTRATION = 'new_registration',
  PLAN_MIGRATION = 'plan_migration',
  ADMIN_GRANTED = 'admin_granted',
  PROMO_CODE = 'promo_code'
}

export enum GraceNotificationType {
  REMINDER_7D = 'reminder_7d',
  REMINDER_3D = 'reminder_3d',
  REMINDER_1D = 'reminder_1d',
  EXPIRED = 'expired'
}

/**
 * Interface pour les notifications de période de grâce
 */
export interface GraceNotification {
  type: GraceNotificationType;
  sentAt: Date;
  emailSent: boolean;
  pushSent: boolean;
  smsSent?: boolean;
}

/**
 * Interface pour les détails de la source de période de grâce
 */
export interface GracePeriodSourceDetails {
  promoCodeId?: string;
  adminUserId?: string;
  migrationReason?: string;
  originalPlanId?: string;
}

/**
 * Interface pour les périodes de grâce
 */
export interface GracePeriod {
  id?: string;
  userId: string;
  tenantId: string;
  
  // Configuration de la période
  startDate: Date;
  endDate: Date;
  durationDays: number;
  
  // Statut
  status: GracePeriodStatus;
  
  // Origine de la période de grâce
  source: GracePeriodSource;
  sourceDetails?: GracePeriodSourceDetails;
  
  // Notifications envoyées
  notificationsSent: GraceNotification[];
  
  // Conversion
  convertedAt?: Date;
  selectedPlanId?: string;
  subscriptionId?: string;
  
  // Extensions
  originalEndDate?: Date; // Date de fin originale avant extensions
  extensionHistory?: GracePeriodExtension[];
  
  // Métadonnées
  metadata?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface pour l'historique des extensions
 */
export interface GracePeriodExtension {
  extendedBy: string; // ID de l'admin qui a étendu
  extendedAt: Date;
  additionalDays: number;
  reason?: string;
  previousEndDate: Date;
  newEndDate: Date;
}

/**
 * Interface pour créer une période de grâce
 */
export interface CreateGracePeriodRequest {
  userId: string;
  tenantId: string;
  durationDays: number;
  source: GracePeriodSource;
  sourceDetails?: GracePeriodSourceDetails;
  metadata?: Record<string, any>;
}

/**
 * Interface pour étendre une période de grâce
 */
export interface ExtendGracePeriodRequest {
  additionalDays: number;
  reason?: string;
  extendedBy: string;
}

/**
 * Interface pour convertir une période de grâce
 */
export interface ConvertGracePeriodRequest {
  planId: string;
  promoCodeId?: string;
}

/**
 * Modèle de données pour les périodes de grâce
 */
export class GracePeriodModel extends BaseModel<GracePeriod> {
  constructor(data: Partial<GracePeriod>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const gracePeriod = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(gracePeriod, [
      "userId", "tenantId", "startDate", "endDate", 
      "durationDays", "status", "source"
    ]);

    // Validation des énumérations
    BaseModel.validateEnum(gracePeriod.status, GracePeriodStatus, "status");
    BaseModel.validateEnum(gracePeriod.source, GracePeriodSource, "source");

    // Validation des dates
    if (gracePeriod.endDate <= gracePeriod.startDate) {
      throw new Error("End date must be after start date");
    }

    // Validation de la durée
    if (gracePeriod.durationDays <= 0 || gracePeriod.durationDays > 365) {
      throw new Error("Duration must be between 1 and 365 days");
    }

    // Validation de la cohérence des dates et durée
    const expectedEndDate = new Date(gracePeriod.startDate);
    expectedEndDate.setDate(expectedEndDate.getDate() + gracePeriod.durationDays);
    
    // Tolérance d'une heure pour les différences de timezone
    const timeDiff = Math.abs(gracePeriod.endDate.getTime() - expectedEndDate.getTime());
    if (timeDiff > 3600000) { // 1 heure en millisecondes
      throw new Error("End date does not match start date + duration");
    }

    // Validation des notifications
    if (gracePeriod.notificationsSent) {
      for (const notification of gracePeriod.notificationsSent) {
        if (!Object.values(GraceNotificationType).includes(notification.type)) {
          throw new Error(`Invalid notification type: ${notification.type}`);
        }
      }
    }

    // Validation de la conversion
    if (gracePeriod.status === GracePeriodStatus.CONVERTED) {
      if (!gracePeriod.convertedAt || !gracePeriod.selectedPlanId) {
        throw new Error("Converted grace period must have convertedAt and selectedPlanId");
      }
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    return this.convertDatesToFirestore(data);
  }

  static fromFirestore(doc: DocumentSnapshot): GracePeriodModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = GracePeriodModel.prototype.convertDatesFromFirestore(data);

    return new GracePeriodModel({
      id: doc.id,
      ...convertedData,
      notificationsSent: convertedData.notificationsSent || [],
      extensionHistory: convertedData.extensionHistory || [],
    });
  }

  static fromCreateRequest(request: CreateGracePeriodRequest): GracePeriodModel {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + request.durationDays);

    return new GracePeriodModel({
      ...request,
      startDate,
      endDate,
      status: GracePeriodStatus.ACTIVE,
      notificationsSent: [],
      extensionHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Méthodes d'instance
  isActive(): boolean {
    const now = new Date();
    return this.data.status === GracePeriodStatus.ACTIVE && 
           now >= this.data.startDate && 
           now <= this.data.endDate;
  }

  isExpired(): boolean {
    const now = new Date();
    return now > this.data.endDate && this.data.status !== GracePeriodStatus.CONVERTED;
  }

  isConverted(): boolean {
    return this.data.status === GracePeriodStatus.CONVERTED;
  }

  isCancelled(): boolean {
    return this.data.status === GracePeriodStatus.CANCELLED;
  }

  getDaysRemaining(): number {
    const now = new Date();
    const diffTime = this.data.endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  getHoursRemaining(): number {
    const now = new Date();
    const diffTime = this.data.endDate.getTime() - now.getTime();
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    return Math.max(0, diffHours);
  }

  getProgressPercentage(): number {
    const now = new Date();
    const totalDuration = this.data.endDate.getTime() - this.data.startDate.getTime();
    const elapsed = now.getTime() - this.data.startDate.getTime();
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    return Math.round(progress);
  }

  shouldSendNotification(type: GraceNotificationType): boolean {
    // Vérifier si la notification a déjà été envoyée
    const alreadySent = this.data.notificationsSent.some(n => n.type === type);
    if (alreadySent) {
      return false;
    }

    const daysRemaining = this.getDaysRemaining();

    switch (type) {
      case GraceNotificationType.REMINDER_7D:
        return daysRemaining <= 7 && daysRemaining > 3;
      case GraceNotificationType.REMINDER_3D:
        return daysRemaining <= 3 && daysRemaining > 1;
      case GraceNotificationType.REMINDER_1D:
        return daysRemaining <= 1 && daysRemaining > 0;
      case GraceNotificationType.EXPIRED:
        return this.isExpired();
      default:
        return false;
    }
  }

  addNotification(
    type: GraceNotificationType, 
    emailSent: boolean = false, 
    pushSent: boolean = false,
    smsSent: boolean = false
  ): void {
    const notification: GraceNotification = {
      type,
      sentAt: new Date(),
      emailSent,
      pushSent,
      smsSent
    };

    this.data.notificationsSent.push(notification);
    this.data.updatedAt = new Date();
  }

  extend(request: ExtendGracePeriodRequest): void {
    if (this.data.status !== GracePeriodStatus.ACTIVE) {
      throw new Error("Can only extend active grace periods");
    }

    const previousEndDate = new Date(this.data.endDate);
    const newEndDate = new Date(this.data.endDate);
    newEndDate.setDate(newEndDate.getDate() + request.additionalDays);

    // Ajouter à l'historique des extensions
    const extension: GracePeriodExtension = {
      extendedBy: request.extendedBy,
      extendedAt: new Date(),
      additionalDays: request.additionalDays,
      reason: request.reason,
      previousEndDate,
      newEndDate
    };

    if (!this.data.extensionHistory) {
      this.data.extensionHistory = [];
    }
    this.data.extensionHistory.push(extension);

    // Sauvegarder la date de fin originale si c'est la première extension
    if (!this.data.originalEndDate) {
      this.data.originalEndDate = previousEndDate;
    }

    // Mettre à jour la date de fin et la durée
    this.data.endDate = newEndDate;
    this.data.durationDays += request.additionalDays;
    this.data.updatedAt = new Date();
  }

  convert(planId: string, subscriptionId?: string): void {
    if (this.data.status !== GracePeriodStatus.ACTIVE) {
      throw new Error("Can only convert active grace periods");
    }

    this.data.status = GracePeriodStatus.CONVERTED;
    this.data.convertedAt = new Date();
    this.data.selectedPlanId = planId;
    this.data.subscriptionId = subscriptionId;
    this.data.updatedAt = new Date();
  }

  cancel(reason?: string): void {
    if (this.data.status === GracePeriodStatus.CONVERTED) {
      throw new Error("Cannot cancel converted grace period");
    }

    this.data.status = GracePeriodStatus.CANCELLED;
    this.data.updatedAt = new Date();

    if (reason) {
      if (!this.data.metadata) {
        this.data.metadata = {};
      }
      this.data.metadata.cancellationReason = reason;
    }
  }

  expire(): void {
    if (this.data.status === GracePeriodStatus.ACTIVE) {
      this.data.status = GracePeriodStatus.EXPIRED;
      this.data.updatedAt = new Date();
    }
  }

  getTotalExtensionDays(): number {
    if (!this.data.extensionHistory) {
      return 0;
    }
    return this.data.extensionHistory.reduce((total, ext) => total + ext.additionalDays, 0);
  }

  getOriginalDuration(): number {
    return this.data.durationDays - this.getTotalExtensionDays();
  }

  hasBeenExtended(): boolean {
    return this.data.extensionHistory && this.data.extensionHistory.length > 0;
  }

  getNotificationHistory(): GraceNotification[] {
    return [...this.data.notificationsSent].sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  }

  getNextNotificationDue(): GraceNotificationType | null {
    const daysRemaining = this.getDaysRemaining();

    // Vérifier dans l'ordre de priorité
    const notificationTypes = [
      GraceNotificationType.REMINDER_7D,
      GraceNotificationType.REMINDER_3D,
      GraceNotificationType.REMINDER_1D,
      GraceNotificationType.EXPIRED
    ];

    for (const type of notificationTypes) {
      if (this.shouldSendNotification(type)) {
        return type;
      }
    }

    return null;
  }

  // Méthodes statiques utilitaires
  static calculateEndDate(startDate: Date, durationDays: number): Date {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);
    return endDate;
  }

  static getDefaultDurationForSource(source: GracePeriodSource): number {
    switch (source) {
      case GracePeriodSource.NEW_REGISTRATION:
        return 14; // 14 jours par défaut pour nouveaux utilisateurs
      case GracePeriodSource.PLAN_MIGRATION:
        return 14; // 14 jours pour migration depuis plan gratuit
      case GracePeriodSource.ADMIN_GRANTED:
        return 7; // 7 jours par défaut pour octroi admin
      case GracePeriodSource.PROMO_CODE:
        return 30; // 30 jours pour codes promo spéciaux
      default:
        return 14;
    }
  }
}