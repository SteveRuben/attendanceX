import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { ValidationError } from "../utils/common/errors";
import { 
  Subscription, 
  SubscriptionStatus, 
  CreateSubscriptionRequest 
} from "../common/types/subscription.types";

// Export des types pour utilisation dans d'autres modules
export { SubscriptionStatus, type Subscription, type CreateSubscriptionRequest } from "../common/types/subscription.types";

// Interface pour le document Firestore (avec champs internes)
export interface SubscriptionDocument extends Subscription {
  // Champs internes supplémentaires si nécessaire
  internalNotes?: string;
  auditLog?: Array<{
    action: string;
    timestamp: Date;
    userId: string;
    details?: any;
  }>;
}

export class SubscriptionModel extends BaseModel<SubscriptionDocument> {
  constructor(data: Partial<SubscriptionDocument>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const subscription = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(subscription, [
      "tenantId", "planId", "status", "createdBy", "basePrice", "currency"
    ]);

    // Validation du statut
    if (!Object.values(SubscriptionStatus).includes(subscription.status)) {
      throw new ValidationError("Invalid subscription status");
    }

    // Validation du tenantId
    if (!subscription.tenantId || subscription.tenantId.length < 1) {
      throw new ValidationError("Valid tenantId is required");
    }

    // Validation du planId
    if (!subscription.planId || subscription.planId.length < 1) {
      throw new ValidationError("Valid planId is required");
    }

    // Validation du prix de base
    if (typeof subscription.basePrice !== 'number' || subscription.basePrice < 0) {
      throw new ValidationError("Base price must be a non-negative number");
    }

    // Validation de la devise
    if (!subscription.currency || !/^[A-Z]{3}$/.test(subscription.currency)) {
      throw new ValidationError("Currency must be a valid 3-letter ISO code");
    }

    // Validation des dates
    if (subscription.gracePeriodEndsAt && subscription.gracePeriodEndsAt <= new Date()) {
      throw new ValidationError("Grace period end date must be in the future");
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = SubscriptionModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  static fromFirestore(doc: DocumentSnapshot): SubscriptionModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = SubscriptionModel.prototype.convertDatesFromFirestore(data);

    return new SubscriptionModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(
    request: CreateSubscriptionRequest & { id?: string }
  ): SubscriptionModel {
    const subscriptionData: SubscriptionDocument = {
      ...request,
      status: SubscriptionStatus.ACTIVE,
      basePrice: 0, // À définir lors de la création
      currency: "EUR",
      isInGracePeriod: false,
      planHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: request.metadata || {},
    };

    return new SubscriptionModel(subscriptionData);
  }

  // Méthodes d'instance
  isInGracePeriod(): boolean {
    return this.data.isInGracePeriod === true && 
           this.data.status === SubscriptionStatus.GRACE_PERIOD;
  }

  isActive(): boolean {
    return this.data.status === SubscriptionStatus.ACTIVE;
  }

  canMigrate(): boolean {
    return this.data.planId === 'free' && 
           (this.data.status === SubscriptionStatus.ACTIVE || 
            this.data.status === SubscriptionStatus.TRIALING) &&
           !this.isInGracePeriod();
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

  /**
   * Sets the base price for the subscription
   * @param price - The new base price (must be non-negative)
   * @throws {ValidationError} If price is invalid
   */
  public setBasePrice(price: number): void {
    if (price < 0) {
      throw new ValidationError("Base price cannot be negative");
    }
    if (!Number.isFinite(price)) {
      throw new ValidationError("Base price must be a valid number");
    }
    
    this.data.basePrice = price;
    this.data.updatedAt = new Date();
  }

  /**
   * Sets the currency for the subscription
   * @param currency - ISO 3-letter currency code (e.g., USD, EUR)
   * @throws {ValidationError} If currency format is invalid
   */
  public setCurrency(currency: string): void {
    if (!currency || currency.trim().length === 0) {
      throw new ValidationError("Currency is required");
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new ValidationError("Currency must be a valid 3-letter ISO code (e.g., USD, EUR)");
    }
    
    this.data.currency = currency.toUpperCase();
    this.data.updatedAt = new Date();
  }

  /**
   * Returns a safe API representation of the subscription
   * Excludes sensitive internal fields
   * @returns Subscription data safe for API responses
   */
  public toAPI(): Partial<SubscriptionDocument> {
    const data = { ...this.data };
    
    // Remove sensitive fields systematically
    delete (data as any).internalNotes;
    delete (data as any).auditLog;
    
    return data;
  }

  public applyPromoCode(
    promoCodeId: string,
    code: string,
    discountType: any,
    discountValue: number,
    expiresAt?: Date
  ): void {
    // Implémentation simplifiée pour la compilation
    this.data.updatedAt = new Date();
  }

  public removePromoCode(): void {
    // Implémentation simplifiée pour la compilation
    this.data.updatedAt = new Date();
  }
}