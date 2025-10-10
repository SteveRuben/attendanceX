/**
 * Service de gestion de la facturation côté frontend
 * Gère les abonnements, factures, méthodes de paiement, codes promo et périodes de grâce
 */

import { apiService } from './api';
import {
  BillingDashboard,
  SubscriptionPlan,
  Subscription,
  SubscriptionStatus,
  TenantUsage,
  PlanLimits,
  PlanFeatures,
  OveragePreview,
  OverageDetail,
  Invoice,
  InvoiceStatus,
  InvoiceLineItem,
  BillingInfo,
  PlanComparison,
  PlanComparisonMatrix,
  ChangePlanRequest,
  ChangePlanResponse,
  PlanUpgradeInfo,
  PaymentMethod,
  BillingAlert,
  PromoCode,
  PromoCodeDiscountType,
  AppliedPromoCode,
  PromoCodeValidationRequest,
  PromoCodeValidationResponse,
  ApplyPromoCodeRequest,
  ApplyPromoCodeResponse,
  GracePeriod,
  GracePeriodStatus,
  GracePeriodSource,
  GracePeriodNotification,
  GracePeriodNotificationType,
  GracePeriodExtension,
  CreateGracePeriodRequest,
  ExtendGracePeriodRequest,
  ConvertGracePeriodRequest,
  ConvertGracePeriodResponse,
  MigrationResult,
  MigrateUserRequest,
  BillingStats,
  PromoCodeStats,
  GracePeriodStats
} from '../shared/types/billing.types';



class BillingService {
  private baseUrl = '/api/billing';

  /**
   * Obtenir le dashboard de facturation
   */
  async getBillingDashboard(): Promise<BillingDashboard> {
    const response = await apiService.get(`${this.baseUrl}/dashboard`);
    return {
      ...response.data,
      subscription: {
        ...response.data.subscription,
        currentPeriodStart: new Date(response.data.subscription.currentPeriodStart),
        currentPeriodEnd: new Date(response.data.subscription.currentPeriodEnd),
        nextPaymentDate: new Date(response.data.subscription.nextPaymentDate),
        cancelledAt: response.data.subscription.cancelledAt 
          ? new Date(response.data.subscription.cancelledAt) 
          : undefined
      },
      recentInvoices: response.data.recentInvoices.map((invoice: any) => ({
        ...invoice,
        issueDate: new Date(invoice.issueDate),
        dueDate: new Date(invoice.dueDate),
        paidAt: invoice.paidAt ? new Date(invoice.paidAt) : undefined
      })),
      billingInfo: {
        ...response.data.billingInfo,
        nextBillingDate: new Date(response.data.billingInfo.nextBillingDate)
      }
    };
  }

  /**
   * Obtenir tous les plans disponibles
   */
  async getAvailablePlans(): Promise<PlanComparison> {
    const response = await apiService.get(`${this.baseUrl}/plans`);
    return response.data;
  }

  /**
   * Changer de plan d'abonnement
   */
  async changePlan(request: ChangePlanRequest): Promise<ChangePlanResponse> {
    const response = await apiService.post(`${this.baseUrl}/change-plan`, {
      planId: request.newPlanId,
      billingCycle: request.billingCycle,
      promoCode: request.promoCode,
      effectiveDate: request.effectiveDate?.toISOString()
    });
    
    return {
      ...response.data,
      subscription: {
        ...response.data.subscription,
        currentPeriodStart: new Date(response.data.subscription.currentPeriodStart),
        currentPeriodEnd: new Date(response.data.subscription.currentPeriodEnd),
        nextPaymentDate: new Date(response.data.subscription.nextPaymentDate),
        cancelledAt: response.data.subscription.cancelledAt 
          ? new Date(response.data.subscription.cancelledAt) 
          : undefined
      },
      upgradeInfo: {
        ...response.data.upgradeInfo,
        effectiveDate: new Date(response.data.upgradeInfo.effectiveDate)
      }
    };
  }

  /**
   * Obtenir l'historique des factures
   */
  async getInvoices(page: number = 1, limit: number = 10): Promise<{
    invoices: Invoice[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const response = await apiService.get(`${this.baseUrl}/invoices`, {
      params: { page, limit }
    });
    
    return {
      ...response.data,
      invoices: response.data.invoices.map((invoice: any) => ({
        ...invoice,
        issueDate: new Date(invoice.issueDate),
        dueDate: new Date(invoice.dueDate),
        paidAt: invoice.paidAt ? new Date(invoice.paidAt) : undefined
      }))
    };
  }

  /**
   * Obtenir une facture spécifique
   */
  async getInvoice(invoiceId: string): Promise<Invoice> {
    const response = await apiService.get(`${this.baseUrl}/invoices/${invoiceId}`);
    return {
      ...response.data,
      issueDate: new Date(response.data.issueDate),
      dueDate: new Date(response.data.dueDate),
      paidAt: response.data.paidAt ? new Date(response.data.paidAt) : undefined
    };
  }

  /**
   * Payer une facture
   */
  async payInvoice(invoiceId: string): Promise<{
    success: boolean;
    paymentIntentId?: string;
    message: string;
  }> {
    const response = await apiService.post(`${this.baseUrl}/invoices/${invoiceId}/pay`);
    return response.data;
  }

  /**
   * Obtenir l'aperçu des coûts d'overage
   */
  async getOveragePreview(): Promise<OveragePreview> {
    const response = await apiService.get(`${this.baseUrl}/overage-preview`);
    return response.data;
  }

  /**
   * Annuler l'abonnement
   */
  async cancelSubscription(reason?: string, cancelAtPeriodEnd: boolean = true): Promise<{
    subscription: Subscription;
    message: string;
  }> {
    const response = await apiService.post(`${this.baseUrl}/cancel`, {
      reason,
      cancelAtPeriodEnd
    });
    
    return {
      ...response.data,
      subscription: {
        ...response.data.subscription,
        currentPeriodStart: new Date(response.data.subscription.currentPeriodStart),
        currentPeriodEnd: new Date(response.data.subscription.currentPeriodEnd),
        nextPaymentDate: new Date(response.data.subscription.nextPaymentDate),
        cancelledAt: response.data.subscription.cancelledAt 
          ? new Date(response.data.subscription.cancelledAt) 
          : undefined
      }
    };
  }

  // ==================== MÉTHODES POUR LES CODES PROMO ====================

  /**
   * Valider un code promo
   */
  async validatePromoCode(request: PromoCodeValidationRequest): Promise<PromoCodeValidationResponse> {
    const response = await apiService.post('/api/v1/promo-codes/validate', request);
    return response.data;
  }

  /**
   * Appliquer un code promo à un abonnement
   */
  async applyPromoCode(request: ApplyPromoCodeRequest): Promise<ApplyPromoCodeResponse> {
    const response = await apiService.post(`${this.baseUrl}/apply-promo-code`, request);
    return {
      ...response.data,
      appliedPromoCode: response.data.appliedPromoCode ? {
        ...response.data.appliedPromoCode,
        appliedAt: new Date(response.data.appliedPromoCode.appliedAt),
        promoCode: {
          ...response.data.appliedPromoCode.promoCode,
          validFrom: new Date(response.data.appliedPromoCode.promoCode.validFrom),
          validUntil: response.data.appliedPromoCode.promoCode.validUntil 
            ? new Date(response.data.appliedPromoCode.promoCode.validUntil) 
            : undefined,
          createdAt: new Date(response.data.appliedPromoCode.promoCode.createdAt),
          updatedAt: new Date(response.data.appliedPromoCode.promoCode.updatedAt)
        }
      } : undefined
    };
  }

  /**
   * Supprimer un code promo d'un abonnement
   */
  async removePromoCode(subscriptionId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiService.delete(`${this.baseUrl}/remove-promo-code/${subscriptionId}`);
    return response.data;
  }

  // ==================== MÉTHODES POUR LES PÉRIODES DE GRÂCE ====================

  /**
   * Obtenir le statut de la période de grâce pour l'utilisateur connecté
   */
  async getMyGracePeriodStatus(): Promise<GracePeriodStatus> {
    const response = await apiService.get(`${this.baseUrl}/my-grace-period-status`);
    const data = response.data;
    
    if (!data.hasActiveGracePeriod) {
      return {
        hasActiveGracePeriod: false,
        gracePeriod: undefined
      };
    }

    return {
      ...data,
      gracePeriod: data.gracePeriod ? {
        ...data.gracePeriod,
        startDate: new Date(data.gracePeriod.startDate),
        endDate: new Date(data.gracePeriod.endDate),
        convertedAt: data.gracePeriod.convertedAt ? new Date(data.gracePeriod.convertedAt) : undefined,
        cancelledAt: data.gracePeriod.cancelledAt ? new Date(data.gracePeriod.cancelledAt) : undefined,
        createdAt: new Date(data.gracePeriod.createdAt),
        updatedAt: new Date(data.gracePeriod.updatedAt),
        notificationsSent: data.gracePeriod.notificationsSent?.map((notif: any) => ({
          ...notif,
          sentAt: new Date(notif.sentAt)
        })) || [],
        extensions: data.gracePeriod.extensions?.map((ext: any) => ({
          ...ext,
          extendedAt: new Date(ext.extendedAt)
        })) || []
      } : undefined
    };
  }

  /**
   * Convertir une période de grâce en abonnement payant
   */
  async convertGracePeriod(gracePeriodId: string, request: ConvertGracePeriodRequest): Promise<ConvertGracePeriodResponse> {
    const response = await apiService.post(`${this.baseUrl}/convert-grace-period/${gracePeriodId}`, request);
    return {
      ...response.data,
      subscription: {
        ...response.data.subscription,
        currentPeriodStart: new Date(response.data.subscription.currentPeriodStart),
        currentPeriodEnd: new Date(response.data.subscription.currentPeriodEnd),
        nextPaymentDate: new Date(response.data.subscription.nextPaymentDate),
        cancelledAt: response.data.subscription.cancelledAt 
          ? new Date(response.data.subscription.cancelledAt) 
          : undefined
      },
      gracePeriod: {
        ...response.data.gracePeriod,
        startDate: new Date(response.data.gracePeriod.startDate),
        endDate: new Date(response.data.gracePeriod.endDate),
        convertedAt: response.data.gracePeriod.convertedAt ? new Date(response.data.gracePeriod.convertedAt) : undefined,
        cancelledAt: response.data.gracePeriod.cancelledAt ? new Date(response.data.gracePeriod.cancelledAt) : undefined,
        createdAt: new Date(response.data.gracePeriod.createdAt),
        updatedAt: new Date(response.data.gracePeriod.updatedAt)
      }
    };
  }

  // ==================== MÉTHODES D'ADMINISTRATION ====================

  /**
   * Créer une période de grâce (admin seulement)
   */
  async createGracePeriod(request: CreateGracePeriodRequest): Promise<GracePeriod> {
    const response = await apiService.post(`${this.baseUrl}/create-grace-period`, request);
    return {
      ...response.data,
      startDate: new Date(response.data.startDate),
      endDate: new Date(response.data.endDate),
      convertedAt: response.data.convertedAt ? new Date(response.data.convertedAt) : undefined,
      cancelledAt: response.data.cancelledAt ? new Date(response.data.cancelledAt) : undefined,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      notificationsSent: response.data.notificationsSent?.map((notif: any) => ({
        ...notif,
        sentAt: new Date(notif.sentAt)
      })) || [],
      extensions: response.data.extensions?.map((ext: any) => ({
        ...ext,
        extendedAt: new Date(ext.extendedAt)
      })) || []
    };
  }

  /**
   * Étendre une période de grâce (admin seulement)
   */
  async extendGracePeriod(gracePeriodId: string, request: ExtendGracePeriodRequest): Promise<GracePeriod> {
    const response = await apiService.put(`${this.baseUrl}/extend-grace-period/${gracePeriodId}`, request);
    return {
      ...response.data,
      startDate: new Date(response.data.startDate),
      endDate: new Date(response.data.endDate),
      convertedAt: response.data.convertedAt ? new Date(response.data.convertedAt) : undefined,
      cancelledAt: response.data.cancelledAt ? new Date(response.data.cancelledAt) : undefined,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      notificationsSent: response.data.notificationsSent?.map((notif: any) => ({
        ...notif,
        sentAt: new Date(notif.sentAt)
      })) || [],
      extensions: response.data.extensions?.map((ext: any) => ({
        ...ext,
        extendedAt: new Date(ext.extendedAt)
      })) || []
    };
  }

  /**
   * Migrer les utilisateurs existants du plan gratuit (admin seulement)
   */
  async migrateExistingUsers(): Promise<MigrationResult> {
    const response = await apiService.post(`${this.baseUrl}/migrate-existing-users`);
    return response.data;
  }

  /**
   * Migrer un utilisateur spécifique (admin seulement)
   */
  async migrateUser(request: MigrateUserRequest): Promise<MigrationResult> {
    const response = await apiService.post(`${this.baseUrl}/migrate-user`, request);
    return response.data;
  }

  // ==================== MÉTHODES PLACEHOLDER EXISTANTES ====================

  /**
   * Obtenir les méthodes de paiement (placeholder pour future implémentation)
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    // TODO: Implémenter quand les méthodes de paiement seront ajoutées au backend
    return [];
  }

  /**
   * Ajouter une méthode de paiement (placeholder pour future implémentation)
   */
  async addPaymentMethod(paymentMethodData: any): Promise<PaymentMethod> {
    // TODO: Implémenter quand les méthodes de paiement seront ajoutées au backend
    throw new Error('Not implemented yet');
  }

  /**
   * Supprimer une méthode de paiement (placeholder pour future implémentation)
   */
  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    // TODO: Implémenter quand les méthodes de paiement seront ajoutées au backend
    throw new Error('Not implemented yet');
  }

  /**
   * Définir la méthode de paiement par défaut (placeholder pour future implémentation)
   */
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
    // TODO: Implémenter quand les méthodes de paiement seront ajoutées au backend
    throw new Error('Not implemented yet');
  }

  /**
   * Obtenir les alertes de facturation (placeholder pour future implémentation)
   */
  async getBillingAlerts(): Promise<BillingAlert[]> {
    // TODO: Implémenter quand les alertes seront ajoutées au backend
    return [];
  }

  /**
   * Marquer une alerte comme lue (placeholder pour future implémentation)
   */
  async dismissAlert(alertId: string): Promise<void> {
    // TODO: Implémenter quand les alertes seront ajoutées au backend
  }

  /**
   * Télécharger une facture en PDF (placeholder pour future implémentation)
   */
  async downloadInvoicePDF(invoiceId: string): Promise<Blob> {
    // TODO: Implémenter quand la génération PDF sera ajoutée au backend
    throw new Error('Not implemented yet');
  }

  /**
   * Obtenir l'historique des paiements (placeholder pour future implémentation)
   */
  async getPaymentHistory(): Promise<any[]> {
    // TODO: Implémenter quand l'historique des paiements sera ajouté au backend
    return [];
  }
}

// Instance singleton
export const billingService = new BillingService();
export default billingService;