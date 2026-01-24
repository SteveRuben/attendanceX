/**
 * Modèle pour les codes promo
 * Gère la validation et la persistance des codes promotionnels
 */

import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel, ValidationError } from "../base.model";
import { 
  PromoCode, 
  PromoCodeType,
  CreatePromoCodeRequest 
} from "../../common/types/ticket-config.types";

export class PromoCodeModel extends BaseModel<PromoCode> {
  constructor(data: Partial<PromoCode>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const promoCode = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(promoCode, [
      "eventId",
      "tenantId",
      "code",
      "type",
      "value",
      "createdBy"
    ]);

    // Validation du code
    if (promoCode.code.trim().length < 3) {
      throw new ValidationError("Promo code must be at least 3 characters", "code");
    }

    if (promoCode.code.length > 50) {
      throw new ValidationError("Promo code must not exceed 50 characters", "code");
    }

    // Le code doit être en majuscules et alphanumérique
    if (!/^[A-Z0-9_-]+$/.test(promoCode.code)) {
      throw new ValidationError(
        "Promo code must contain only uppercase letters, numbers, hyphens and underscores",
        "code"
      );
    }

    // Validation du type
    BaseModel.validateEnum(promoCode.type, PromoCodeType, "type");

    // Validation de la valeur selon le type
    if (promoCode.type === PromoCodeType.PERCENTAGE) {
      if (promoCode.value < 0 || promoCode.value > 100) {
        throw new ValidationError("Percentage value must be between 0 and 100", "value");
      }
    } else if (promoCode.type === PromoCodeType.FIXED_AMOUNT) {
      if (promoCode.value < 0) {
        throw new ValidationError("Fixed amount cannot be negative", "value");
      }
      if (promoCode.value > 100000) {
        throw new ValidationError("Fixed amount cannot exceed 100,000", "value");
      }
    }

    // Validation des utilisations
    if (promoCode.maxUses !== undefined && promoCode.maxUses < 1) {
      throw new ValidationError("Max uses must be at least 1", "maxUses");
    }

    if (promoCode.usedCount < 0) {
      throw new ValidationError("Used count cannot be negative", "usedCount");
    }

    if (promoCode.maxUses && promoCode.usedCount > promoCode.maxUses) {
      throw new ValidationError("Used count cannot exceed max uses", "usedCount");
    }

    // Validation des dates de validité
    if (promoCode.validFrom && promoCode.validUntil) {
      this.validateDateRange(
        promoCode.validFrom,
        promoCode.validUntil,
        "validity period"
      );
    }

    // Validation du montant minimum d'achat
    if (promoCode.minimumPurchaseAmount !== undefined) {
      if (promoCode.minimumPurchaseAmount < 0) {
        throw new ValidationError(
          "Minimum purchase amount cannot be negative",
          "minimumPurchaseAmount"
        );
      }
    }

    // Validation des types de billets applicables
    if (promoCode.applicableTicketTypes && promoCode.applicableTicketTypes.length === 0) {
      throw new ValidationError(
        "If specified, applicable ticket types must contain at least one ticket type",
        "applicableTicketTypes"
      );
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = PromoCodeModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  /**
   * Sérialisation sécurisée pour API
   */
  public toAPI(): Partial<PromoCode> {
    const data = this.data as any;
    const cleaned = { ...data };
    
    // Pas de champs sensibles à supprimer pour les codes promo
    
    return cleaned;
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
    request: CreatePromoCodeRequest & { tenantId: string; createdBy: string }
  ): PromoCodeModel {
    const promoCodeData: Partial<PromoCode> = {
      eventId: request.eventId,
      tenantId: request.tenantId,
      code: request.code.toUpperCase().trim(),
      type: request.type,
      value: request.value,
      maxUses: request.maxUses,
      usedCount: 0,
      validFrom: request.validFrom,
      validUntil: request.validUntil,
      applicableTicketTypes: request.applicableTicketTypes,
      minimumPurchaseAmount: request.minimumPurchaseAmount,
      isActive: true,
      metadata: request.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: request.createdBy,
    };

    return new PromoCodeModel(promoCodeData);
  }

  /**
   * Supprimer les champs undefined
   */
  private static removeUndefinedFields(obj: any): any {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key];
      }
    });
    return cleaned;
  }

  /**
   * Vérifier si le code promo est valide à une date donnée
   */
  public isValidAt(date: Date = new Date()): boolean {
    // Vérifier si actif
    if (!this.data.isActive) {
      return false;
    }

    // Vérifier les dates de validité
    if (this.data.validFrom && date < this.data.validFrom) {
      return false;
    }

    if (this.data.validUntil && date > this.data.validUntil) {
      return false;
    }

    // Vérifier les utilisations
    if (this.data.maxUses && this.data.usedCount >= this.data.maxUses) {
      return false;
    }

    return true;
  }

  /**
   * Vérifier si le code promo est applicable à un type de billet
   */
  public isApplicableToTicketType(ticketTypeId: string): boolean {
    // Si aucun type spécifié, applicable à tous
    if (!this.data.applicableTicketTypes || this.data.applicableTicketTypes.length === 0) {
      return true;
    }

    return this.data.applicableTicketTypes.includes(ticketTypeId);
  }

  /**
   * Calculer le montant de la réduction
   */
  public calculateDiscount(amount: number): number {
    if (!this.isValidAt()) {
      return 0;
    }

    // Vérifier le montant minimum d'achat
    if (this.data.minimumPurchaseAmount && amount < this.data.minimumPurchaseAmount) {
      return 0;
    }

    if (this.data.type === PromoCodeType.PERCENTAGE) {
      return (amount * this.data.value) / 100;
    } else {
      // Fixed amount - ne pas dépasser le montant total
      return Math.min(this.data.value, amount);
    }
  }

  /**
   * Incrémenter le compteur d'utilisations
   */
  public incrementUsage(): void {
    if (this.data.maxUses && this.data.usedCount >= this.data.maxUses) {
      throw new ValidationError(
        "Promo code usage limit reached",
        "usedCount"
      );
    }

    this.data.usedCount += 1;
    this.updateTimestamp();
  }

  /**
   * Décrémenter le compteur d'utilisations (en cas d'annulation)
   */
  public decrementUsage(): void {
    if (this.data.usedCount <= 0) {
      throw new ValidationError(
        "Cannot decrement usage count below zero",
        "usedCount"
      );
    }

    this.data.usedCount -= 1;
    this.updateTimestamp();
  }

  /**
   * Obtenir le nombre d'utilisations restantes
   */
  public getRemainingUses(): number | null {
    if (!this.data.maxUses) {
      return null; // Illimité
    }

    return Math.max(0, this.data.maxUses - this.data.usedCount);
  }
}
