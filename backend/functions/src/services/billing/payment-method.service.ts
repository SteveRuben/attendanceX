/**
 * Service de gestion des méthodes de paiement
 */

import { collections } from '../../config/database';
import { logger } from 'firebase-functions';
import { PaymentMethod } from '../../common/types/billing.types';
import { PaymentMethodModel, CreatePaymentMethodRequest } from '../../models/payment-method.model';
import { ValidationError, NotFoundError } from '../../utils/common/errors';

export interface UpdatePaymentMethodRequest {
  isDefault?: boolean;
  metadata?: Record<string, any>;
}

// Re-export for controller usage
export { CreatePaymentMethodRequest } from '../../models/payment-method.model';

export class PaymentMethodService {

  async createPaymentMethod(
    request: CreatePaymentMethodRequest, 
    userId: string
  ): Promise<PaymentMethod> {
    const startTime = Date.now();
    
    try {
      // Validation métier
      await this.validateCreateRequest(request);
      
      // Si c'est la méthode par défaut, désactiver les autres
      if (request.isDefault) {
        await this.unsetDefaultPaymentMethods(request.tenantId);
      }
      
      // Créer le modèle
      const paymentMethodModel = PaymentMethodModel.fromCreateRequest({
        ...request,
        createdBy: userId
      });
      
      // Valider le modèle
      await paymentMethodModel.validate();
      
      // Sauvegarder
      const paymentMethodRef = collections.payment_methods.doc();
      await paymentMethodRef.set(paymentMethodModel.toFirestore());
      
      const duration = Date.now() - startTime;
      logger.info(`✅ Payment method created: ${paymentMethodRef.id} in ${duration}ms`, {
        tenantId: request.tenantId,
        type: request.type,
        provider: request.paymentProvider,
        userId,
        duration
      });
      
      // Retourner l'entité
      return {
        id: paymentMethodRef.id,
        ...paymentMethodModel.toAPI()
      } as PaymentMethod;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('❌ Error creating payment method:', {
        error: error.message,
        tenantId: request.tenantId,
        type: request.type,
        userId,
        duration
      });
      
      if (error instanceof ValidationError) {throw error;}
      throw new Error(`Failed to create payment method: ${error.message}`);
    }
  }

  async getPaymentMethod(paymentMethodId: string, tenantId: string): Promise<PaymentMethod | null> {
    try {
      const doc = await collections.payment_methods.doc(paymentMethodId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      const paymentMethodModel = PaymentMethodModel.fromFirestore(doc);
      if (!paymentMethodModel || paymentMethodModel.toAPI().tenantId !== tenantId) {
        return null;
      }
      
      return paymentMethodModel.toAPI() as PaymentMethod;
    } catch (error: any) {
      logger.error('❌ Error getting payment method:', {
        error: error.message,
        paymentMethodId,
        tenantId
      });
      throw new Error(`Failed to get payment method: ${error.message}`);
    }
  }

  async getPaymentMethodsByTenant(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt' | 'updatedAt' | 'type';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<PaymentMethod[]> {
    try {
      const {
        limit = 20,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options || {};

      let query = collections.payment_methods
        .where('tenantId', '==', tenantId)
        .orderBy(sortBy, sortOrder);

      if (offset > 0) {
        query = query.offset(offset);
      }

      if (limit > 0) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();

      return snapshot.docs
        .map(doc => PaymentMethodModel.fromFirestore(doc))
        .filter(model => model !== null)
        .map(model => model!.toAPI() as PaymentMethod);
    } catch (error: any) {
      logger.error('❌ Error getting payment methods by tenant:', {
        error: error.message,
        tenantId,
        options
      });
      throw new Error(`Failed to get payment methods: ${error.message}`);
    }
  }

  async updatePaymentMethod(
    paymentMethodId: string, 
    updates: UpdatePaymentMethodRequest, 
    tenantId: string
  ): Promise<PaymentMethod> {
    try {
      const existing = await this.getPaymentMethod(paymentMethodId, tenantId);
      if (!existing) {
        throw new NotFoundError("Payment method not found");
      }
      
      // Si on définit comme défaut, désactiver les autres
      if (updates.isDefault) {
        await this.unsetDefaultPaymentMethods(tenantId);
      }
      
      // Appliquer les mises à jour
      const updatedData = {
        ...existing,
        ...updates,
        updatedAt: new Date()
      };
      
      const paymentMethodModel = new PaymentMethodModel(updatedData);
      await paymentMethodModel.validate();
      
      await collections.payment_methods.doc(paymentMethodId).update(paymentMethodModel.toFirestore());
      
      logger.info(`✅ Payment method updated: ${paymentMethodId}`, {
        tenantId,
        updates: Object.keys(updates)
      });
      
      return paymentMethodModel.toAPI() as PaymentMethod;
    } catch (error: any) {
      logger.error('❌ Error updating payment method:', {
        error: error.message,
        paymentMethodId,
        tenantId
      });
      
      if (error instanceof NotFoundError) {throw error;}
      throw new Error(`Failed to update payment method: ${error.message}`);
    }
  }

  async deletePaymentMethod(paymentMethodId: string, tenantId: string): Promise<void> {
    try {
      const existing = await this.getPaymentMethod(paymentMethodId, tenantId);
      if (!existing) {
        throw new NotFoundError("Payment method not found");
      }
      
      await collections.payment_methods.doc(paymentMethodId).delete();
      
      logger.info(`🗑️ Payment method deleted: ${paymentMethodId}`, {
        tenantId,
        type: existing.type,
        provider: existing.paymentProvider
      });
    } catch (error: any) {
      logger.error('❌ Error deleting payment method:', {
        error: error.message,
        paymentMethodId,
        tenantId
      });
      
      if (error instanceof NotFoundError) {throw error;}
      throw new Error(`Failed to delete payment method: ${error.message}`);
    }
  }

  private async validateCreateRequest(request: CreatePaymentMethodRequest): Promise<void> {
    // Validation des champs requis selon le type
    if (request.type === 'card' && !request.card) {
      throw new ValidationError("Card information is required for card type", { field: "card" });
    }
    
    if (request.type === 'bank_account' && !request.bankAccount) {
      throw new ValidationError("Bank account information is required for bank_account type", { field: "bankAccount" });
    }
    
    if (request.type === 'wallet' && !request.wallet) {
      throw new ValidationError("Wallet information is required for wallet type", { field: "wallet" });
    }

    // Vérifier les limites du tenant (ex: max 5 méthodes de paiement)
    const existingMethods = await this.getPaymentMethodsByTenant(request.tenantId);
    if (existingMethods.length >= 5) {
      throw new ValidationError("Maximum number of payment methods reached (5)", { field: "limit" });
    }

    // Vérifier l'unicité pour certains types (ex: une seule méthode par défaut)
    if (request.isDefault) {
      const defaultMethods = existingMethods.filter(method => method.isDefault);
      if (defaultMethods.length > 0) {
        logger.info(`Existing default payment method will be updated: ${defaultMethods[0].id}`, {
          tenantId: request.tenantId
        });
      }
    }
  }

  private async unsetDefaultPaymentMethods(tenantId: string): Promise<void> {
    try {
      const snapshot = await collections.payment_methods
        .where('tenantId', '==', tenantId)
        .where('isDefault', '==', true)
        .get();

      if (!snapshot.empty) {
        const batch = collections.payment_methods.firestore.batch();
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { isDefault: false, updatedAt: new Date() });
        });
        await batch.commit();
      }
    } catch (error: any) {
      logger.error('❌ Error unsetting default payment methods:', {
        error: error.message,
        tenantId
      });
      // Ne pas faire échouer l'opération principale
    }
  }
}

export const paymentMethodService = new PaymentMethodService();