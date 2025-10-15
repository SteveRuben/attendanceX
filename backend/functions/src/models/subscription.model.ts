import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { PromoCodeDiscountType } from "./promoCode.model";

/**
 * Énumérations pour les abonnements
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete',
  GRACE_PERIOD = 'grace_period' // Nouveau statut pour période de grâce
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum PlanChangeType {
  UPGRADE = 'upgrade',
  DOWNGRADE = 'downgrade',
  LATERAL = 'lateral',
  GRACE_CONVERSION = 'grace_conversion'
}

/**
 * Interface pour les codes promo appliqués
 */
export interface AppliedPromoCode {
  promoCodeId: string;
  code: string;
  discountType: PromoCodeDiscountType;
  discountValue: number;
  appliedAt: Date;
  expiresAt?: Date; // Pour les réductions temporaires
  discountAmount: number; // Montant réel de la réduction appliquée
}

/**
 * Interface pour l'historique des changements de plan
 */
export interface PlanChange {
  id: string;
  fromPlanId?: string;
  toPlanId: string;
  changedAt: Date;
  changeType: PlanChangeType;
  reason?: string;
  promoCodeUsed?: string;
  priceDifference: number;
  effectiveDate: Date;
  changedBy: string; // ID de l'utilisateur qui a effectué le changement
}

/**
 * Interface pour les abonnements
 */
export interface Subscription {
  id?: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  
  // Billing cycle
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  billingCycle: BillingCycle;
  
  // Pricing
  basePrice: number;
  currency: string;
  discountPercent?: number; // Réduction générale (legacy)
  
  // Codes promotionnels
  appliedPromoCode?: AppliedPromoCode;
  
  // Payment
  paymentMethodId?: string;
  nextPaymentDate: Date;
  
  // Période de grâce
  gracePeriodId?: string;
  isInGracePeriod: boolean;
  gracePeriodEndsAt?: Date;
  
  // Trial (legacy - remplacé par grace period)
  trialStart?: Date;
  trialEnd?: Date;
  isTrialActive: boolean;
  
  // Lifecycle
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  
  // Historique des changements
  planHistory: PlanChange[];
  
  // Stripe integration
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  
  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Interface pour créer un abonnement
 */
export interface CreateSubscriptionRequest {
  tenantId: string;
  planId: string;
  billingCycle: BillingCycle;
  paymentMethodId?: string;
  discountPercent?: number;
  promoCodeId?: string;
  gracePeriodId?: string;
  startTrial?: boolean; // Legacy
  trialDays?: number; // Legacy
}

/**
 * Interface pour changer de plan
 */
export interface ChangePlanRequest {
  subscriptionId: string;
  newPlanId: string;
  billingCycle?: BillingCycle;
  promoCodeId?: string;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  effectiveDate?: Date;
  reason?: string;
}

/**
 * Interface pour annuler un abonnement
 */
export interface CancelSubscriptionRequest {
  subscriptionId: string;
  reason?: string;
  cancelAtPeriodEnd?: boolean;
  effectiveDate?: Date;
}

/**
 * Modèle de données pour les abonnements
 */
export class SubscriptionModel extends BaseModel<Subscription> {
  constructor(data: Partial<Subscription>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const subscription = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(subscription, [
      "tenantId", "planId", "status", "currentPeriodStart", 
      "currentPeriodEnd", "billingCycle", "basePrice", "currency"
    ]);

    // Validation des énumérations
    BaseModel.validateEnum(subscription.status, SubscriptionStatus, "status");
    BaseModel.validateEnum(subscription.billingCycle, BillingCycle, "billingCycle");

    // Validation des dates
    if (subscription.currentPeriodEnd <= subscription.currentPeriodStart) {
      throw new Error("Current period end must be after current period start");
    }

    // Validation du prix
    if (subscription.basePrice < 0) {
      throw new Error("Base price cannot be negative");
    }

    // Validation de la devise
    if (subscription.currency.length !== 3) {
      throw new Error("Currency must be a 3-letter ISO code");
    }

    // Validation de la période de grâce
    if (subscription.isInGracePeriod) {
      if (!subscription.gracePeriodId || !subscription.gracePeriodEndsAt) {
        throw new Error("Grace period subscription must have gracePeriodId and gracePeriodEndsAt");
      }
    }

    // Validation du code promo appliqué
    if (subscription.appliedPromoCode) {
      this.validateAppliedPromoCode(subscription.appliedPromoCode);
    }

    // Validation de l'historique des plans
    if (subscription.planHistory) {
      for (const change of subscription.planHistory) {
        this.validatePlanChange(change);
      }
    }

    return true;
  }

  private validateAppliedPromoCode(promoCode: AppliedPromoCode): void {
    BaseModel.validateRequired(promoCode, [
      "promoCodeId", "code", "discountType", "discountValue", 
      "appliedAt", "discountAmount"
    ]);

    if (promoCode.discountValue <= 0) {
      throw new Error("Promo code discount value must be positive");
    }

    if (promoCode.discountAmount < 0) {
      throw new Error("Promo code discount amount cannot be negative");
    }

    if (promoCode.expiresAt && promoCode.expiresAt <= promoCode.appliedAt) {
      throw new Error("Promo code expiry date must be after applied date");
    }
  }

  private validatePlanChange(change: PlanChange): void {
    BaseModel.validateRequired(change, [
      "id", "toPlanId", "changedAt", "changeType", 
      "priceDifference", "effectiveDate", "changedBy"
    ]);

    BaseModel.validateEnum(change.changeType, PlanChangeType, "changeType");
  }

  toFirestore() {
    const { id, ...data } = this.data;
    return this.convertDatesToFirestore(data);
  }

  static fromFirestore(doc: DocumentSnapshot): SubscriptionModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = SubscriptionModel.prototype.convertDatesFromFirestore(data);

    return new SubscriptionModel({
      id: doc.id,
      ...convertedData,
      planHistory: convertedData.planHistory || [],
      isInGracePeriod: convertedData.isInGracePeriod || false,
      isTrialActive: convertedData.isTrialActive || false,
    });
  }

  static fromCreateRequest(request: CreateSubscriptionRequest): SubscriptionModel {
    const now = new Date();
    const periodEnd = new Date(now);
    
    // Calculer la fin de période selon le cycle de facturation
    if (request.billingCycle === BillingCycle.MONTHLY) {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    return new SubscriptionModel({
      tenantId: request.tenantId,
      planId: request.planId,
      status: request.gracePeriodId ? SubscriptionStatus.GRACE_PERIOD : 
              request.startTrial ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      billingCycle: request.billingCycle,
      basePrice: 0, // À définir lors de la création
      currency: "EUR",
      paymentMethodId: request.paymentMethodId,
      nextPaymentDate: periodEnd,
      gracePeriodId: request.gracePeriodId,
      isInGracePeriod: !!request.gracePeriodId,
      isTrialActive: request.startTrial || false,
      planHistory: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  // Méthodes d'instance
  isActive(): boolean {
    return this.data.status === SubscriptionStatus.ACTIVE;
  }

  isInGracePeriod(): boolean {
    return this.data.isInGracePeriod && this.data.status === SubscriptionStatus.GRACE_PERIOD;
  }

  isCancelled(): boolean {
    return this.data.status === SubscriptionStatus.CANCELLED;
  }

  isPastDue(): boolean {
    return this.data.status === SubscriptionStatus.PAST_DUE;
  }

  hasActivePromoCode(): boolean {
    if (!this.data.appliedPromoCode) {
      return false;
    }

    const now = new Date();
    return !this.data.appliedPromoCode.expiresAt || 
           this.data.appliedPromoCode.expiresAt > now;
  }

  getEffectivePrice(): number {
    let price = this.data.basePrice;

    // Appliquer la réduction du code promo
    if (this.hasActivePromoCode()) {
      const promo = this.data.appliedPromoCode!;
      if (promo.discountType === PromoCodeDiscountType.PERCENTAGE) {
        price = price * (1 - promo.discountValue / 100);
      } else {
        price = Math.max(0, price - promo.discountValue);
      }
    }

    // Appliquer la réduction générale (legacy)
    if (this.data.discountPercent) {
      price = price * (1 - this.data.discountPercent / 100);
    }

    return Math.round(price * 100) / 100; // Arrondir à 2 décimales
  }

  getDaysUntilRenewal(): number {
    const now = new Date();
    const diffTime = this.data.currentPeriodEnd.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysInGracePeriod(): number | null {
    if (!this.isInGracePeriod() || !this.data.gracePeriodEndsAt) {
      return null;
    }

    const now = new Date();
    const diffTime = this.data.gracePeriodEndsAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  applyPromoCode(
    promoCodeId: string,
    code: string,
    discountType: PromoCodeDiscountType,
    discountValue: number,
    expiresAt?: Date
  ): void {
    const discountAmount = this.calculatePromoDiscount(discountType, discountValue);

    this.data.appliedPromoCode = {
      promoCodeId,
      code,
      discountType,
      discountValue,
      appliedAt: new Date(),
      expiresAt,
      discountAmount
    };

    this.data.updatedAt = new Date();
  }

  removePromoCode(): void {
    this.data.appliedPromoCode = undefined;
    this.data.updatedAt = new Date();
  }

  private calculatePromoDiscount(
    discountType: PromoCodeDiscountType,
    discountValue: number
  ): number {
    if (discountType === PromoCodeDiscountType.PERCENTAGE) {
      return (this.data.basePrice * discountValue) / 100;
    } else {
      return Math.min(discountValue, this.data.basePrice);
    }
  }

  changePlan(
    newPlanId: string,
    newPrice: number,
    changeType: PlanChangeType,
    changedBy: string,
    reason?: string,
    promoCodeUsed?: string
  ): void {
    const now = new Date();
    const priceDifference = newPrice - this.data.basePrice;

    // Ajouter à l'historique
    const planChange: PlanChange = {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromPlanId: this.data.planId,
      toPlanId: newPlanId,
      changedAt: now,
      changeType,
      reason,
      promoCodeUsed,
      priceDifference,
      effectiveDate: now,
      changedBy
    };

    if (!this.data.planHistory) {
      this.data.planHistory = [];
    }
    this.data.planHistory.push(planChange);

    // Mettre à jour l'abonnement
    this.data.planId = newPlanId;
    this.data.basePrice = newPrice;
    this.data.updatedAt = now;

    // Si c'était une conversion depuis une période de grâce
    if (changeType === PlanChangeType.GRACE_CONVERSION) {
      this.data.isInGracePeriod = false;
      this.data.gracePeriodId = undefined;
      this.data.gracePeriodEndsAt = undefined;
      this.data.status = SubscriptionStatus.ACTIVE;
    }
  }

  convertFromGracePeriod(planId: string, planPrice: number, changedBy: string): void {
    this.changePlan(
      planId,
      planPrice,
      PlanChangeType.GRACE_CONVERSION,
      changedBy,
      "Conversion from grace period"
    );
  }

  cancel(reason?: string, cancelAtPeriodEnd: boolean = true): void {
    const now = new Date();

    this.data.status = SubscriptionStatus.CANCELLED;
    this.data.cancelledAt = cancelAtPeriodEnd ? this.data.currentPeriodEnd : now;
    this.data.cancelReason = reason;
    this.data.updatedAt = now;
  }

  reactivate(): void {
    if (this.data.status === SubscriptionStatus.CANCELLED) {
      this.data.status = SubscriptionStatus.ACTIVE;
      this.data.cancelledAt = undefined;
      this.data.cancelReason = undefined;
      this.data.updatedAt = new Date();
    }
  }

  updateStatus(newStatus: SubscriptionStatus): void {
    this.data.status = newStatus;
    this.data.updatedAt = new Date();
  }

  extendPeriod(days: number): void {
    const newEndDate = new Date(this.data.currentPeriodEnd);
    newEndDate.setDate(newEndDate.getDate() + days);
    
    this.data.currentPeriodEnd = newEndDate;
    this.data.nextPaymentDate = newEndDate;
    this.data.updatedAt = new Date();
  }

  getLastPlanChange(): PlanChange | null {
    if (!this.data.planHistory || this.data.planHistory.length === 0) {
      return null;
    }

    return this.data.planHistory
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())[0];
  }

  getPlanChangeHistory(): PlanChange[] {
    if (!this.data.planHistory) {
      return [];
    }

    return [...this.data.planHistory]
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
  }

  hasChangedPlanRecently(days: number = 30): boolean {
    const lastChange = this.getLastPlanChange();
    if (!lastChange) {
      return false;
    }

    const daysSinceChange = (Date.now() - lastChange.changedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange <= days;
  }
}