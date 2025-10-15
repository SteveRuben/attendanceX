import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { SubscriptionPlan, PlanType, PlanLimits, PlanFeatures } from "../common/types/tenant.types";

/**
 * Interface pour créer un plan d'abonnement
 */
export interface CreateSubscriptionPlanRequest {
  name: string;
  description?: string;
  price: number;
  currency: string;
  type: PlanType;
  billingCycle: 'monthly' | 'yearly';
  limits: PlanLimits;
  features: PlanFeatures;
  gracePeriodDays?: number;
  stripeProductId?: string;
  stripePriceId?: string;
  sortOrder?: number;
  isPopular?: boolean;
}

/**
 * Interface pour mettre à jour un plan d'abonnement
 */
export interface UpdateSubscriptionPlanRequest {
  name?: string;
  description?: string;
  price?: number;
  limits?: Partial<PlanLimits>;
  features?: Partial<PlanFeatures>;
  gracePeriodDays?: number;
  stripeProductId?: string;
  stripePriceId?: string;
  sortOrder?: number;
  isPopular?: boolean;
  isActive?: boolean;
}

/**
 * Modèle de données pour les plans d'abonnement
 */
export class SubscriptionPlanModel extends BaseModel<SubscriptionPlan> {
  constructor(data: Partial<SubscriptionPlan>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const plan = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(plan, [
      "name", "price", "currency", "type", "billingCycle",
      "limits", "features", "gracePeriodDays", "sortOrder"
    ]);

    // Validation du type de plan
    BaseModel.validateEnum(plan.type, PlanType, "type");

    // Validation du cycle de facturation
    if (!['monthly', 'yearly'].includes(plan.billingCycle)) {
      throw new Error("Billing cycle must be 'monthly' or 'yearly'");
    }

    // Validation du prix
    if (plan.price < 0) {
      throw new Error("Price cannot be negative");
    }

    // Validation de la période de grâce
    if (plan.gracePeriodDays < 0 || plan.gracePeriodDays > 365) {
      throw new Error("Grace period must be between 0 and 365 days");
    }

    // Validation des limites
    this.validateLimits(plan.limits);

    // Validation des fonctionnalités
    this.validateFeatures(plan.features);

    // Validation des longueurs
    this.validateLength(plan.name, 1, 100, "name");
    if (plan.description) {
      this.validateLength(plan.description, 0, 500, "description");
    }

    // Validation de la devise
    if (plan.currency.length !== 3) {
      throw new Error("Currency must be a 3-letter ISO code");
    }

    return true;
  }

  private validateLimits(limits: PlanLimits): void {
    const requiredLimits = ['maxUsers', 'maxEvents', 'maxStorage', 'apiCallsPerMonth'];
    
    for (const limit of requiredLimits) {
      if (!(limit in limits)) {
        throw new Error(`Missing required limit: ${limit}`);
      }
      
      const value = limits[limit as keyof PlanLimits];
      if (typeof value !== 'number' || (value < -1)) {
        throw new Error(`Invalid limit value for ${limit}. Must be -1 (unlimited) or positive number`);
      }
    }
  }

  private validateFeatures(features: PlanFeatures): void {
    const requiredFeatures = [
      'advancedReporting', 'apiAccess', 'customBranding', 
      'webhooks', 'ssoIntegration', 'prioritySupport'
    ];
    
    for (const feature of requiredFeatures) {
      if (!(feature in features)) {
        throw new Error(`Missing required feature: ${feature}`);
      }
      
      const value = features[feature as keyof PlanFeatures];
      if (typeof value !== 'boolean') {
        throw new Error(`Feature ${feature} must be a boolean value`);
      }
    }
  }

  toFirestore() {
    const { id, ...data } = this.data;
    return this.convertDatesToFirestore(data);
  }

  static fromFirestore(doc: DocumentSnapshot): SubscriptionPlanModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = SubscriptionPlanModel.prototype.convertDatesFromFirestore(data);

    return new SubscriptionPlanModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(request: CreateSubscriptionPlanRequest): SubscriptionPlanModel {
    return new SubscriptionPlanModel({
      ...request,
      gracePeriodDays: request.gracePeriodDays || this.getDefaultGracePeriod(request.type),
      sortOrder: request.sortOrder || this.getDefaultSortOrder(request.type),
      isPopular: request.isPopular || false,
      currency: request.currency.toUpperCase(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Méthodes statiques pour les valeurs par défaut
  static getDefaultGracePeriod(planType: PlanType): number {
    switch (planType) {
      case PlanType.STARTER:
        return 14; // 14 jours pour le plan starter
      case PlanType.PROFESSIONAL:
        return 14; // 14 jours pour le plan professionnel
      case PlanType.ENTERPRISE:
        return 30; // 30 jours pour le plan enterprise
      default:
        return 14;
    }
  }

  static getDefaultSortOrder(planType: PlanType): number {
    switch (planType) {
      case PlanType.STARTER:
        return 1;
      case PlanType.PROFESSIONAL:
        return 2;
      case PlanType.ENTERPRISE:
        return 3;
      default:
        return 999;
    }
  }

  // Méthodes d'instance
  isValidForNewSubscription(): boolean {
    return this.data.isActive && this.data.price > 0;
  }

  hasFeature(feature: keyof PlanFeatures): boolean {
    return this.data.features[feature] === true;
  }

  getLimitValue(limit: keyof PlanLimits): number {
    return this.data.limits[limit];
  }

  isLimitUnlimited(limit: keyof PlanLimits): boolean {
    return this.data.limits[limit] === -1;
  }

  canAccommodateUsage(usage: {
    users: number;
    events: number;
    storage: number;
    apiCalls: number;
  }): boolean {
    const limits = this.data.limits;
    
    return (limits.maxUsers === -1 || usage.users <= limits.maxUsers) &&
           (limits.maxEvents === -1 || usage.events <= limits.maxEvents) &&
           (limits.maxStorage === -1 || usage.storage <= limits.maxStorage) &&
           (limits.apiCallsPerMonth === -1 || usage.apiCalls <= limits.apiCallsPerMonth);
  }

  getMonthlyPrice(): number {
    if (this.data.billingCycle === 'monthly') {
      return this.data.price;
    } else {
      // Convertir le prix annuel en prix mensuel
      return Math.round((this.data.price / 12) * 100) / 100;
    }
  }

  getYearlyPrice(): number {
    if (this.data.billingCycle === 'yearly') {
      return this.data.price;
    } else {
      // Convertir le prix mensuel en prix annuel (avec réduction de 10%)
      return Math.round((this.data.price * 12 * 0.9) * 100) / 100;
    }
  }

  getYearlySavings(): number {
    const monthlyTotal = this.getMonthlyPrice() * 12;
    const yearlyPrice = this.getYearlyPrice();
    return Math.round((monthlyTotal - yearlyPrice) * 100) / 100;
  }

  compareWith(otherPlan: SubscriptionPlan): {
    priceDifference: number;
    isUpgrade: boolean;
    newFeatures: string[];
    improvedLimits: string[];
  } {
    const priceDifference = this.data.price - otherPlan.price;
    const isUpgrade = priceDifference > 0;

    // Identifier les nouvelles fonctionnalités
    const newFeatures: string[] = [];
    Object.keys(this.data.features).forEach(feature => {
      const featureKey = feature as keyof PlanFeatures;
      if (this.data.features[featureKey] && !otherPlan.features[featureKey]) {
        newFeatures.push(feature);
      }
    });

    // Identifier les limites améliorées
    const improvedLimits: string[] = [];
    Object.keys(this.data.limits).forEach(limit => {
      const limitKey = limit as keyof PlanLimits;
      const currentValue = this.data.limits[limitKey];
      const otherValue = otherPlan.limits[limitKey];
      
      if (currentValue > otherValue || (currentValue === -1 && otherValue !== -1)) {
        improvedLimits.push(limit);
      }
    });

    return {
      priceDifference,
      isUpgrade,
      newFeatures,
      improvedLimits
    };
  }

  activate(): void {
    this.data.isActive = true;
    this.data.updatedAt = new Date();
  }

  deactivate(): void {
    this.data.isActive = false;
    this.data.updatedAt = new Date();
  }

  updatePrice(newPrice: number): void {
    if (newPrice < 0) {
      throw new Error("Price cannot be negative");
    }
    this.data.price = newPrice;
    this.data.updatedAt = new Date();
  }

  updateGracePeriod(days: number): void {
    if (days < 0 || days > 365) {
      throw new Error("Grace period must be between 0 and 365 days");
    }
    this.data.gracePeriodDays = days;
    this.data.updatedAt = new Date();
  }

  updateFeature(feature: keyof PlanFeatures, enabled: boolean): void {
    this.data.features[feature] = enabled;
    this.data.updatedAt = new Date();
  }

  updateLimit(limit: keyof PlanLimits, value: number): void {
    if (value < -1) {
      throw new Error("Limit value must be -1 (unlimited) or positive number");
    }
    this.data.limits[limit] = value;
    this.data.updatedAt = new Date();
  }

  // Méthodes statiques utilitaires
  static createStarterPlan(): SubscriptionPlanModel {
    return new SubscriptionPlanModel({
      name: "Starter",
      description: "Parfait pour les petites équipes qui commencent",
      price: 29,
      currency: "EUR",
      type: PlanType.STARTER,
      billingCycle: "monthly",
      limits: {
        maxUsers: 10,
        maxEvents: 50,
        maxStorage: 1000, // 1GB
        apiCallsPerMonth: 1000
      },
      features: {
        advancedReporting: false,
        apiAccess: false,
        customBranding: false,
        webhooks: false,
        ssoIntegration: false,
        prioritySupport: false
      },
      gracePeriodDays: 14,
      sortOrder: 1,
      isPopular: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  static createProfessionalPlan(): SubscriptionPlanModel {
    return new SubscriptionPlanModel({
      name: "Professional",
      description: "Idéal pour les équipes en croissance",
      price: 79,
      currency: "EUR",
      type: PlanType.PROFESSIONAL,
      billingCycle: "monthly",
      limits: {
        maxUsers: 50,
        maxEvents: 200,
        maxStorage: 5000, // 5GB
        apiCallsPerMonth: 10000
      },
      features: {
        advancedReporting: true,
        apiAccess: true,
        customBranding: false,
        webhooks: true,
        ssoIntegration: false,
        prioritySupport: false
      },
      gracePeriodDays: 14,
      sortOrder: 2,
      isPopular: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  static createEnterprisePlan(): SubscriptionPlanModel {
    return new SubscriptionPlanModel({
      name: "Enterprise",
      description: "Solution complète pour les grandes organisations",
      price: 199,
      currency: "EUR",
      type: PlanType.ENTERPRISE,
      billingCycle: "monthly",
      limits: {
        maxUsers: -1, // Illimité
        maxEvents: -1, // Illimité
        maxStorage: -1, // Illimité
        apiCallsPerMonth: -1 // Illimité
      },
      features: {
        advancedReporting: true,
        apiAccess: true,
        customBranding: true,
        webhooks: true,
        ssoIntegration: true,
        prioritySupport: true
      },
      gracePeriodDays: 30,
      sortOrder: 3,
      isPopular: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}