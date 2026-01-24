import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { ValidationError } from "../utils/common/errors";
import { 
  GracePeriod, 
  GracePeriodStatus, 
  CreateGracePeriodRequest 
} from "../common/types/grace-period.types";

// Export des types pour utilisation dans d'autres modules
export { GracePeriodStatus } from "../common/types/grace-period.types";

// Interface pour le document Firestore (avec champs internes)
export interface GracePeriodDocument extends GracePeriod {
  // Champs internes supplémentaires si nécessaire
  internalNotes?: string;
  auditLog?: Array<{
    action: string;
    timestamp: Date;
    userId: string;
    details?: any;
  }>;
}

export class GracePeriodModel extends BaseModel<GracePeriodDocument> {
  constructor(data: Partial<GracePeriodDocument>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const gracePeriod = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(gracePeriod, [
      "tenantId", "subscriptionId", "status", "startsAt", "endsAt", "originalPlanId", "reason"
    ]);

    // Validation du statut
    if (!Object.values(GracePeriodStatus).includes(gracePeriod.status)) {
      throw new ValidationError("Invalid grace period status");
    }

    // Validation des dates
    if (gracePeriod.startsAt && gracePeriod.endsAt && gracePeriod.startsAt >= gracePeriod.endsAt) {
      throw new ValidationError("Start date must be before end date");
    }

    // Validation du tenantId
    if (!gracePeriod.tenantId || gracePeriod.tenantId.length < 1) {
      throw new ValidationError("Valid tenantId is required");
    }

    // Validation du subscriptionId
    if (!gracePeriod.subscriptionId || gracePeriod.subscriptionId.length < 1) {
      throw new ValidationError("Valid subscriptionId is required");
    }

    // Validation de la raison
    if (!gracePeriod.reason || gracePeriod.reason.length < 1) {
      throw new ValidationError("Reason is required");
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = GracePeriodModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  public toAPI(): Partial<GracePeriodDocument> {
    const data = this.data as any;
    const cleaned = { ...data };
    
    // Supprimer les champs sensibles si nécessaire
    delete cleaned.metadata?.internalNotes;
    
    return cleaned;
  }

  static fromFirestore(doc: DocumentSnapshot): GracePeriodModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = GracePeriodModel.prototype.convertDatesFromFirestore(data);

    return new GracePeriodModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(
    request: CreateGracePeriodRequest & { id?: string }
  ): GracePeriodModel {
    const gracePeriodData: GracePeriodDocument = {
      ...request,
      status: GracePeriodStatus.ACTIVE,
      notificationsSent: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: request.metadata || {},
    };

    return new GracePeriodModel(gracePeriodData);
  }

  // Méthodes d'instance
  isActive(): boolean {
    const now = new Date();
    return this.data.status === GracePeriodStatus.ACTIVE &&
           this.data.startsAt <= now &&
           this.data.endsAt > now;
  }

  isExpired(): boolean {
    const now = new Date();
    return this.data.endsAt <= now || this.data.status === GracePeriodStatus.EXPIRED;
  }

  getDaysRemaining(): number {
    const now = new Date();
    const diffTime = this.data.endsAt.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  shouldSendNotification(type: 'warning' | 'final' | 'expired'): boolean {
    const alreadySent = this.data.notificationsSent?.some(n => n.type === type);
    if (alreadySent) {return false;}

    const daysRemaining = this.getDaysRemaining();
    
    switch (type) {
      case 'warning':
        return daysRemaining <= 7 && daysRemaining > 3;
      case 'final':
        return daysRemaining <= 3 && daysRemaining > 0;
      case 'expired':
        return daysRemaining <= 0;
      default:
        return false;
    }
  }

  markNotificationSent(type: 'warning' | 'final' | 'expired'): void {
    if (!this.data.notificationsSent) {
      this.data.notificationsSent = [];
    }

    this.data.notificationsSent.push({
      type,
      sentAt: new Date(),
      daysRemaining: this.getDaysRemaining()
    });

    this.data.updatedAt = new Date();
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