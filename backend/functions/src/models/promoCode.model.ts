import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import {BaseEntity} from "../common/types";

/**
 * Énumérations pour les codes promotionnels
 */
export enum PromoCodeDiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount'
}

export enum PromoCodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  EXHAUSTED = 'exhausted'
}

/**
 * Interface pour les codes promotionnels
 */
export interface PromoCode {
  id?: string;
  code: string; // Code unique (ex: "WELCOME2024")
  name: string; // Nom descriptif
  description?: string;
  
  // Type de réduction
  discountType: PromoCodeDiscountType;
  discountValue: number; // Pourcentage (0-100) ou montant fixe
  
  // Validité
  isActive: boolean;
  validFrom: Date;
  validUntil?: Date;
  
  // Limitations d'usage
  maxUses?: number; // Nombre max d'utilisations
  currentUses: number; // Utilisations actuelles
  maxUsesPerUser?: number; // Max par utilisateur
  
  // Restrictions
  applicablePlans?: string[]; // Plans éligibles (vide = tous)
  minimumAmount?: number; // Montant minimum requis
  newUsersOnly?: boolean; // Réservé aux nouveaux utilisateurs
  
  // Métadonnées
  createdBy: string;
  tenantId?: string; // Pour les codes spécifiques à un tenant
  metadata?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface pour le tracking des utilisations de codes promo
 */
export interface PromoCodeUsage extends BaseEntity{
  promoCodeId: string;
  userId: string;
  subscriptionId?: string;
  discountApplied: number;
  usedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  tenantId: string;
}

/**
 * Interface pour créer un code promo
 */
export interface CreatePromoCodeRequest {
  code: string;
  name: string;
  description?: string;
  discountType: PromoCodeDiscountType;
  discountValue: number;
  validFrom: Date;
  validUntil?: Date;
  maxUses?: number;
  maxUsesPerUser?: number;
  applicablePlans?: string[];
  minimumAmount?: number;
  newUsersOnly?: boolean;
  tenantId?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface pour mettre à jour un code promo
 */
export interface UpdatePromoCodeRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  validUntil?: Date;
  maxUses?: number;
  maxUsesPerUser?: number;
  applicablePlans?: string[];
  minimumAmount?: number;
  metadata?: Record<string, any>;
}

/**
 * Interface pour la validation d'un code promo
 */
export interface PromoCodeValidationContext {
  userId: string;
  planId?: string;
  subscriptionAmount?: number;
  isNewUser?: boolean;
  tenantId: string;
}

export interface PromoCodeValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: string;
  discountAmount?: number;
  finalAmount?: number;
}

/**
 * Interface pour les filtres de codes promo
 */
export interface PromoCodeFilters {
    isActive?: boolean;
    discountType?: PromoCodeDiscountType;
    tenantId?: string;
    createdBy?: string;
    validFrom?: Date;
    validUntil?: Date;
    search?: string; // Recherche dans code et nom
}

/**
 * Interface pour les options de requête
 */
export interface PromoCodeQueryOptions {
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'validFrom' | 'validUntil' | 'currentUses' | 'name';
    sortOrder?: 'asc' | 'desc';
}

/**
 * Interface pour les résultats paginés
 */
export interface PaginatedPromoCodes {
    items: PromoCode[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

/**
 * Interface pour les statistiques d'un code promo
 */
export interface PromoCodeStats {
    totalUses: number;
    uniqueUsers: number;
    totalDiscountApplied: number;
    averageDiscountPerUse: number;
    usageByDay: Array<{
        date: string;
        uses: number;
        discountApplied: number;
    }>;
    topUsers: Array<{
        userId: string;
        uses: number;
        totalDiscount: number;
    }>;
    conversionRate: number; // Pourcentage d'utilisateurs qui ont converti après utilisation
}
/**
 * Modèle de données pour les codes promotionnels
 */
export class PromoCodeModel extends BaseModel<PromoCode> {
  constructor(data: Partial<PromoCode>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const promoCode = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(promoCode, [
      "code", "name", "discountType", "discountValue", 
      "createdBy", "validFrom"
    ]);

    // Validation du code (format)
    if (!this.validateCodeFormat(promoCode.code)) {
      throw new Error("Code format is invalid. Must be 3-50 characters, alphanumeric with dashes and underscores only");
    }

    // Validation du type de réduction
    BaseModel.validateEnum(promoCode.discountType, PromoCodeDiscountType, "discountType");

    // Validation de la valeur de réduction
    if (promoCode.discountValue <= 0) {
      throw new Error("Discount value must be positive");
    }

    if (promoCode.discountType === PromoCodeDiscountType.PERCENTAGE && promoCode.discountValue > 100) {
      throw new Error("Percentage discount cannot exceed 100%");
    }

    // Validation des dates
    if (promoCode.validUntil && promoCode.validUntil <= promoCode.validFrom) {
      throw new Error("Valid until date must be after valid from date");
    }

    // Validation des limites d'usage
    if (promoCode.maxUses !== undefined && promoCode.maxUses <= 0) {
      throw new Error("Max uses must be positive");
    }

    if (promoCode.maxUsesPerUser !== undefined && promoCode.maxUsesPerUser <= 0) {
      throw new Error("Max uses per user must be positive");
    }

    // Validation du montant minimum
    if (promoCode.minimumAmount !== undefined && promoCode.minimumAmount < 0) {
      throw new Error("Minimum amount cannot be negative");
    }

    // Validation des longueurs
    this.validateLength(promoCode.name, 1, 100, "name");
    if (promoCode.description) {
      this.validateLength(promoCode.description, 0, 500, "description");
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    return this.convertDatesToFirestore(data);
  }

  static fromFirestore(doc: DocumentSnapshot): PromoCodeModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = PromoCodeModel.prototype.convertDatesFromFirestore(data);

    return new PromoCodeModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(
    request: CreatePromoCodeRequest, 
    createdBy: string
  ): PromoCodeModel {
    return new PromoCodeModel({
      ...request,
      code: request.code.toUpperCase(), // Normaliser en majuscules
      createdBy,
      isActive: true,
      currentUses: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Méthodes de validation
  private validateCodeFormat(code: string): boolean {
    // Code doit être 3-50 caractères, alphanumériques avec tirets et underscores
    const codeRegex = /^[A-Z0-9_-]{3,50}$/;
    return codeRegex.test(code);
  }

  // Méthodes d'instance
  isValid(): boolean {
    const now = new Date();
    
    // Vérifier si le code est actif
    if (!this.data.isActive) {
      return false;
    }

    // Vérifier les dates de validité
    if (now < this.data.validFrom) {
      return false;
    }

    if (this.data.validUntil && now > this.data.validUntil) {
      return false;
    }

    // Vérifier les limites d'usage
    if (this.data.maxUses && this.data.currentUses >= this.data.maxUses) {
      return false;
    }

    return true;
  }

  isExpired(): boolean {
    if (!this.data.validUntil) {
      return false;
    }
    return new Date() > this.data.validUntil;
  }

  isExhausted(): boolean {
    if (!this.data.maxUses) {
      return false;
    }
    return this.data.currentUses >= this.data.maxUses;
  }

  canBeUsedBy(context: PromoCodeValidationContext): PromoCodeValidationResult {
    // Vérifier si le code est valide globalement
    if (!this.isValid()) {
      let error = "Code promotionnel invalide";
      let errorCode = "INVALID_CODE";

      if (!this.data.isActive) {
        error = "Ce code promotionnel n'est plus actif";
        errorCode = "CODE_INACTIVE";
      } else if (this.isExpired()) {
        error = "Ce code promotionnel a expiré";
        errorCode = "CODE_EXPIRED";
      } else if (this.isExhausted()) {
        error = "Ce code promotionnel a atteint sa limite d'utilisation";
        errorCode = "CODE_EXHAUSTED";
      }

      return {
        isValid: false,
        error,
        errorCode
      };
    }

    // Vérifier si le code est réservé aux nouveaux utilisateurs
    if (this.data.newUsersOnly && !context.isNewUser) {
      return {
        isValid: false,
        error: "Ce code est réservé aux nouveaux utilisateurs",
        errorCode: "NEW_USERS_ONLY"
      };
    }

    // Vérifier si le plan est éligible
    if (this.data.applicablePlans && this.data.applicablePlans.length > 0 && context.planId) {
      if (!this.data.applicablePlans.includes(context.planId)) {
        return {
          isValid: false,
          error: "Ce code n'est pas applicable à ce plan",
          errorCode: "PLAN_NOT_ELIGIBLE"
        };
      }
    }

    // Vérifier le montant minimum
    if (this.data.minimumAmount && context.subscriptionAmount) {
      if (context.subscriptionAmount < this.data.minimumAmount) {
        return {
          isValid: false,
          error: `Montant minimum requis: ${this.data.minimumAmount}€`,
          errorCode: "MINIMUM_AMOUNT_NOT_MET"
        };
      }
    }

    // Calculer la réduction
    let discountAmount = 0;
    let finalAmount = context.subscriptionAmount || 0;

    if (this.data.discountType === PromoCodeDiscountType.PERCENTAGE) {
      discountAmount = (finalAmount * this.data.discountValue) / 100;
    } else {
      discountAmount = this.data.discountValue;
    }

    // S'assurer que la réduction ne dépasse pas le montant total
    discountAmount = Math.min(discountAmount, finalAmount);
    finalAmount = Math.max(0, finalAmount - discountAmount);

    return {
      isValid: true,
      discountAmount,
      finalAmount
    };
  }

  incrementUsage(): void {
    this.data.currentUses = (this.data.currentUses || 0) + 1;
    this.data.updatedAt = new Date();

    // Mettre à jour le statut si nécessaire
    if (this.isExhausted()) {
      this.data.isActive = false;
    }
  }

  decrementUsage(): void {
    if (this.data.currentUses > 0) {
      this.data.currentUses--;
      this.data.updatedAt = new Date();

      // Réactiver si c'était épuisé
      if (this.data.currentUses < (this.data.maxUses || Infinity) && !this.data.isActive) {
        this.data.isActive = true;
      }
    }
  }

  deactivate(): void {
    this.data.isActive = false;
    this.data.updatedAt = new Date();
  }

  activate(): void {
    // Ne peut être réactivé que si pas expiré ou épuisé
    if (!this.isExpired() && !this.isExhausted()) {
      this.data.isActive = true;
      this.data.updatedAt = new Date();
    }
  }

  getStatus(): PromoCodeStatus {
    if (!this.data.isActive) {
      return PromoCodeStatus.INACTIVE;
    }

    if (this.isExpired()) {
      return PromoCodeStatus.EXPIRED;
    }

    if (this.isExhausted()) {
      return PromoCodeStatus.EXHAUSTED;
    }

    return PromoCodeStatus.ACTIVE;
  }

  getUsagePercentage(): number {
    if (!this.data.maxUses) {
      return 0; // Pas de limite
    }
    return Math.min(100, (this.data.currentUses / this.data.maxUses) * 100);
  }

  getDaysUntilExpiry(): number | null {
    if (!this.data.validUntil) {
      return null;
    }

    const now = new Date();
    const diffTime = this.data.validUntil.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }
}

/**
 * Modèle pour le tracking des utilisations
 */
export class PromoCodeUsageModel extends BaseModel<PromoCodeUsage> {
  constructor(data: Partial<PromoCodeUsage>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const usage = this.data;

    BaseModel.validateRequired(usage, [
      "promoCodeId", "userId", "discountApplied", "usedAt", "tenantId"
    ]);

    if (usage.discountApplied < 0) {
      throw new Error("Discount applied cannot be negative");
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    return this.convertDatesToFirestore(data);
  }

  static fromFirestore(doc: DocumentSnapshot): PromoCodeUsageModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = PromoCodeUsageModel.prototype.convertDatesFromFirestore(data);

    return new PromoCodeUsageModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static create(
    promoCodeId: string,
    userId: string,
    discountApplied: number,
    tenantId: string,
    subscriptionId?: string,
    ipAddress?: string,
    userAgent?: string
  ): PromoCodeUsageModel {
    return new PromoCodeUsageModel({
      promoCodeId,
      userId,
      subscriptionId,
      discountApplied,
      usedAt: new Date(),
      ipAddress,
      userAgent,
      tenantId
    });
  }
}