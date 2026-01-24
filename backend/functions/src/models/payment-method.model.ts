/**
 * Modèle pour les méthodes de paiement
 */

import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { 
  PaymentMethod, 
  PaymentProvider
} from "../common/types/billing.types";
import { ValidationError } from "../utils/common/errors";

export interface CreatePaymentMethodRequest {
  tenantId: string;
  paymentProvider: PaymentProvider;
  type: 'card' | 'bank_account' | 'wallet';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    country?: string;
  };
  bankAccount?: {
    bankName: string;
    accountType: string;
    last4: string;
    country: string;
  };
  wallet?: {
    type: string;
    email?: string;
  };
  isDefault?: boolean;
  metadata?: Record<string, any>;
}

export interface PaymentMethodDocument extends PaymentMethod {
  // Champs internes si nécessaire
  internalNotes?: string;
  auditLog?: Array<{
    action: string;
    timestamp: Date;
    userId: string;
  }>;
}

export class PaymentMethodModel extends BaseModel<PaymentMethodDocument> {
  constructor(data: Partial<PaymentMethodDocument>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const paymentMethod = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(paymentMethod, [
      "tenantId", "paymentProvider", "type"
    ]);

    // Validation du provider
    if (!Object.values(PaymentProvider).includes(paymentMethod.paymentProvider!)) {
      throw new ValidationError("Invalid payment provider", { field: "paymentProvider" });
    }

    // Validation du type
    const validTypes = ['card', 'bank_account', 'wallet'] as const;
    if (!validTypes.includes(paymentMethod.type as any)) {
      throw new ValidationError("Invalid payment method type", { field: "type" });
    }

    // Validation spécifique par type
    if (paymentMethod.type === 'card' && paymentMethod.card) {
      this.validateCard(paymentMethod.card);
    }

    if (paymentMethod.type === 'bank_account' && paymentMethod.bankAccount) {
      this.validateBankAccount(paymentMethod.bankAccount);
    }

    if (paymentMethod.type === 'wallet' && paymentMethod.wallet) {
      this.validateWallet(paymentMethod.wallet);
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = PaymentMethodModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  // Sérialisation sécurisée pour API
  public toAPI(): Partial<PaymentMethodDocument> {
    const data = this.data as any;
    const cleaned = { ...data };
    
    // Supprimer les champs sensibles
    delete cleaned.internalNotes;
    delete cleaned.auditLog;
    
    return cleaned;
  }

  static fromFirestore(doc: DocumentSnapshot): PaymentMethodModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = PaymentMethodModel.prototype.convertDatesFromFirestore(data);

    return new PaymentMethodModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(
    request: CreatePaymentMethodRequest & { createdBy?: string }
  ): PaymentMethodModel {
    const paymentMethodData = {
      ...request,
      isDefault: request.isDefault || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: request.metadata || {},
    };

    return new PaymentMethodModel(paymentMethodData);
  }

  private validateCard(card: any): void {
    if (!card.brand || !card.last4 || !card.expMonth || !card.expYear) {
      throw new ValidationError("Card information incomplete", { field: "card" });
    }

    if (card.expMonth < 1 || card.expMonth > 12) {
      throw new ValidationError("Invalid expiration month", { field: "card.expMonth" });
    }

    const currentYear = new Date().getFullYear();
    if (card.expYear < currentYear) {
      throw new ValidationError("Card has expired", { field: "card.expYear" });
    }

    if (!/^\d{4}$/.test(card.last4)) {
      throw new ValidationError("Invalid card last4 digits", { field: "card.last4" });
    }
  }

  private validateBankAccount(bankAccount: any): void {
    if (!bankAccount.bankName || !bankAccount.accountType || !bankAccount.last4 || !bankAccount.country) {
      throw new ValidationError("Bank account information incomplete", { field: "bankAccount" });
    }

    if (!/^\d{4}$/.test(bankAccount.last4)) {
      throw new ValidationError("Invalid account last4 digits", { field: "bankAccount.last4" });
    }
  }

  private validateWallet(wallet: any): void {
    if (!wallet.type) {
      throw new ValidationError("Wallet type is required", { field: "wallet.type" });
    }

    if (wallet.email && !this.isValidEmail(wallet.email)) {
      throw new ValidationError("Invalid wallet email", { field: "wallet.email" });
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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