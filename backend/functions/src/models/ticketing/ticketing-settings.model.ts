/**
 * Modèle pour les paramètres de billetterie
 * Gère la validation et la persistance des paramètres de billetterie d'un événement
 */

import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel, ValidationError } from "../base.model";
import { 
  TicketingSettings,
  ServiceFeeType,
  ServiceFeePayer,
  QuestionType,
  CreateTicketingSettingsRequest 
} from "../../common/types/ticket-config.types";

export class TicketingSettingsModel extends BaseModel<TicketingSettings> {
  constructor(data: Partial<TicketingSettings>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const settings = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(settings, [
      "eventId",
      "tenantId",
      "enabled",
      "currency",
      "serviceFeeType",
      "serviceFeeValue",
      "serviceFeePayedBy"
    ]);

    // Validation de la devise
    if (!this.isValidCurrency(settings.currency)) {
      throw new ValidationError("Invalid currency code", "currency");
    }

    // Validation du taux de TVA
    if (settings.taxRate !== undefined) {
      if (settings.taxRate < 0 || settings.taxRate > 100) {
        throw new ValidationError("Tax rate must be between 0 and 100", "taxRate");
      }
    }

    // Validation du type de frais de service
    BaseModel.validateEnum(settings.serviceFeeType, ServiceFeeType, "serviceFeeType");

    // Validation de la valeur des frais de service
    if (settings.serviceFeeType === ServiceFeeType.PERCENTAGE) {
      if (settings.serviceFeeValue < 0 || settings.serviceFeeValue > 100) {
        throw new ValidationError(
          "Service fee percentage must be between 0 and 100",
          "serviceFeeValue"
        );
      }
    } else if (settings.serviceFeeType === ServiceFeeType.FIXED_AMOUNT) {
      if (settings.serviceFeeValue < 0) {
        throw new ValidationError(
          "Service fee amount cannot be negative",
          "serviceFeeValue"
        );
      }
      if (settings.serviceFeeValue > 10000) {
        throw new ValidationError(
          "Service fee amount cannot exceed 10,000",
          "serviceFeeValue"
        );
      }
    }

    // Validation du payeur des frais
    BaseModel.validateEnum(settings.serviceFeePayedBy, ServiceFeePayer, "serviceFeePayedBy");

    // Validation de la politique de remboursement
    if (settings.refundPolicy) {
      this.validateRefundPolicy(settings.refundPolicy);
    }

    // Validation des questions personnalisées
    if (settings.customQuestions && settings.customQuestions.length > 0) {
      this.validateCustomQuestions(settings.customQuestions);
    }

    // Validation du nombre maximum de billets par commande
    if (settings.maxTicketsPerOrder !== undefined) {
      if (settings.maxTicketsPerOrder < 1) {
        throw new ValidationError(
          "Max tickets per order must be at least 1",
          "maxTicketsPerOrder"
        );
      }
      if (settings.maxTicketsPerOrder > 100) {
        throw new ValidationError(
          "Max tickets per order cannot exceed 100",
          "maxTicketsPerOrder"
        );
      }
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = TicketingSettingsModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  /**
   * Sérialisation sécurisée pour API
   */
  public toAPI(): Partial<TicketingSettings> {
    const data = this.data as any;
    const cleaned = { ...data };
    
    // Pas de champs sensibles à supprimer pour les paramètres
    
    return cleaned;
  }

  static fromFirestore(doc: DocumentSnapshot): TicketingSettingsModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = TicketingSettingsModel.prototype.convertDatesFromFirestore(data);

    return new TicketingSettingsModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(
    request: CreateTicketingSettingsRequest & { tenantId: string }
  ): TicketingSettingsModel {
    const settingsData: Partial<TicketingSettings> = {
      eventId: request.eventId,
      tenantId: request.tenantId,
      enabled: request.enabled !== undefined ? request.enabled : true,
      currency: request.currency || "EUR",
      taxRate: request.taxRate,
      serviceFeeType: request.serviceFeeType || ServiceFeeType.NONE,
      serviceFeeValue: request.serviceFeeValue || 0,
      serviceFeePayedBy: request.serviceFeePayedBy || ServiceFeePayer.PARTICIPANT,
      refundPolicy: request.refundPolicy,
      customQuestions: request.customQuestions || [],
      maxTicketsPerOrder: request.maxTicketsPerOrder,
      requiresApproval: request.requiresApproval || false,
      waitlistEnabled: request.waitlistEnabled || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return new TicketingSettingsModel(settingsData);
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
   * Validation de la devise ISO 4217
   */
  private isValidCurrency(currency: string): boolean {
    const validCurrencies = [
      "EUR", "USD", "GBP", "CHF", "CAD", "AUD", "JPY", "CNY", "INR", "BRL",
      "MXN", "ZAR", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN",
      "HRK", "RUB", "TRY", "ILS", "AED", "SAR", "QAR", "KWD", "BHD", "OMR"
    ];
    return validCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Validation de la politique de remboursement
   */
  private validateRefundPolicy(policy: any): void {
    if (!policy.enabled) {
      return; // Si désactivé, pas besoin de valider les autres champs
    }

    // Validation des dates
    if (policy.fullRefundUntil) {
      if (!BaseModel.validateDate(policy.fullRefundUntil)) {
        throw new ValidationError("Invalid full refund until date", "refundPolicy.fullRefundUntil");
      }
    }

    if (policy.noRefundAfter) {
      if (!BaseModel.validateDate(policy.noRefundAfter)) {
        throw new ValidationError("Invalid no refund after date", "refundPolicy.noRefundAfter");
      }
    }

    // Vérifier la cohérence des dates
    if (policy.fullRefundUntil && policy.noRefundAfter) {
      if (policy.noRefundAfter <= policy.fullRefundUntil) {
        throw new ValidationError(
          "No refund after date must be after full refund until date",
          "refundPolicy"
        );
      }
    }

    // Validation du pourcentage de remboursement partiel
    if (policy.partialRefundPercentage !== undefined) {
      if (policy.partialRefundPercentage < 0 || policy.partialRefundPercentage > 100) {
        throw new ValidationError(
          "Partial refund percentage must be between 0 and 100",
          "refundPolicy.partialRefundPercentage"
        );
      }
    }

    // Validation de la politique personnalisée
    if (policy.customPolicy && policy.customPolicy.length > 1000) {
      throw new ValidationError(
        "Custom policy text cannot exceed 1000 characters",
        "refundPolicy.customPolicy"
      );
    }
  }

  /**
   * Validation des questions personnalisées
   */
  private validateCustomQuestions(questions: any[]): void {
    if (questions.length > 20) {
      throw new ValidationError(
        "Cannot have more than 20 custom questions",
        "customQuestions"
      );
    }

    questions.forEach((question, index) => {
      // Validation de l'ID
      if (!question.id || question.id.trim().length === 0) {
        throw new ValidationError(
          `Question ${index + 1}: ID is required`,
          `customQuestions[${index}].id`
        );
      }

      // Validation de la question
      if (!question.question || question.question.trim().length < 3) {
        throw new ValidationError(
          `Question ${index + 1}: Question text must be at least 3 characters`,
          `customQuestions[${index}].question`
        );
      }

      if (question.question.length > 500) {
        throw new ValidationError(
          `Question ${index + 1}: Question text cannot exceed 500 characters`,
          `customQuestions[${index}].question`
        );
      }

      // Validation du type
      if (!Object.values(QuestionType).includes(question.type)) {
        throw new ValidationError(
          `Question ${index + 1}: Invalid question type`,
          `customQuestions[${index}].type`
        );
      }

      // Validation des options pour les types qui en nécessitent
      const typesRequiringOptions = [
        QuestionType.SELECT,
        QuestionType.RADIO,
        QuestionType.CHECKBOX
      ];

      if (typesRequiringOptions.includes(question.type)) {
        if (!question.options || question.options.length < 2) {
          throw new ValidationError(
            `Question ${index + 1}: At least 2 options required for ${question.type} type`,
            `customQuestions[${index}].options`
          );
        }

        if (question.options.length > 50) {
          throw new ValidationError(
            `Question ${index + 1}: Cannot have more than 50 options`,
            `customQuestions[${index}].options`
          );
        }

        // Vérifier que les options ne sont pas vides
        question.options.forEach((option: string, optIndex: number) => {
          if (!option || option.trim().length === 0) {
            throw new ValidationError(
              `Question ${index + 1}, Option ${optIndex + 1}: Option cannot be empty`,
              `customQuestions[${index}].options[${optIndex}]`
            );
          }
        });
      }

      // Validation de l'ordre
      if (question.order < 0) {
        throw new ValidationError(
          `Question ${index + 1}: Order must be non-negative`,
          `customQuestions[${index}].order`
        );
      }
    });

    // Vérifier l'unicité des IDs
    const ids = questions.map(q => q.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      throw new ValidationError(
        "Question IDs must be unique",
        "customQuestions"
      );
    }
  }

  /**
   * Calculer les frais de service pour un montant donné
   */
  public calculateServiceFee(amount: number): number {
    if (this.data.serviceFeeType === ServiceFeeType.NONE) {
      return 0;
    }

    if (this.data.serviceFeeType === ServiceFeeType.PERCENTAGE) {
      return (amount * this.data.serviceFeeValue) / 100;
    }

    // Fixed amount
    return this.data.serviceFeeValue;
  }

  /**
   * Calculer le montant total avec frais et taxes
   */
  public calculateTotalAmount(baseAmount: number): {
    baseAmount: number;
    serviceFee: number;
    tax: number;
    totalAmount: number;
  } {
    const serviceFee = this.calculateServiceFee(baseAmount);
    
    // Déterminer qui paie les frais
    const amountBeforeTax = this.data.serviceFeePayedBy === ServiceFeePayer.PARTICIPANT
      ? baseAmount + serviceFee
      : baseAmount;

    const tax = this.data.taxRate
      ? (amountBeforeTax * this.data.taxRate) / 100
      : 0;

    const totalAmount = amountBeforeTax + tax;

    return {
      baseAmount,
      serviceFee: this.data.serviceFeePayedBy === ServiceFeePayer.PARTICIPANT ? serviceFee : 0,
      tax,
      totalAmount
    };
  }

  /**
   * Vérifier si un remboursement est possible à une date donnée
   */
  public canRefundAt(date: Date = new Date()): {
    canRefund: boolean;
    refundPercentage: number;
    reason?: string;
  } {
    if (!this.data.refundPolicy || !this.data.refundPolicy.enabled) {
      return {
        canRefund: false,
        refundPercentage: 0,
        reason: "Refunds are not enabled"
      };
    }

    const policy = this.data.refundPolicy;

    // Vérifier si après la date limite de remboursement
    if (policy.noRefundAfter && date > policy.noRefundAfter) {
      return {
        canRefund: false,
        refundPercentage: 0,
        reason: "Refund period has ended"
      };
    }

    // Vérifier si dans la période de remboursement complet
    if (policy.fullRefundUntil && date <= policy.fullRefundUntil) {
      return {
        canRefund: true,
        refundPercentage: 100
      };
    }

    // Remboursement partiel
    if (policy.partialRefundPercentage !== undefined) {
      return {
        canRefund: true,
        refundPercentage: policy.partialRefundPercentage
      };
    }

    // Par défaut, pas de remboursement
    return {
      canRefund: false,
      refundPercentage: 0,
      reason: "No refund policy defined for this period"
    };
  }
}
