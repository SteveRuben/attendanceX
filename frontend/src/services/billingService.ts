/**
 * Service de gestion de la facturation côté frontend
 * Gère les abonnements, factures, et méthodes de paiement
 */

import { apiService } from './apiService';

// Types pour la facturation
export interface BillingDashboard {
  currentPlan: SubscriptionPlan;
  subscription: Subscription;
  usage: TenantUsage;
  limits: PlanLimits;
  overagePreview: OveragePreview;
  recentInvoices: Invoice[];
  billingInfo: BillingInfo;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: PlanFeatures;
  limits: PlanLimits;
  isActive: boolean;
  sortOrder: number;
}

export interface PlanFeatures {
  advancedReporting: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  webhooks: boolean;
  ssoIntegration: boolean;
  prioritySupport: boolean;
}

export interface PlanLimits {
  maxUsers: number;
  maxEvents: number;
  maxStorage: number; // in MB
  apiCallsPerMonth: number;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  billingCycle: 'monthly' | 'yearly';
  basePrice: number;
  currency: string;
  discountPercent?: number;
  nextPaymentDate: Date;
  cancelledAt?: Date;
  cancelReason?: string;
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete'
}

export interface TenantUsage {
  users: number;
  events: number;
  storage: number; // in MB
  apiCalls: number;
}

export interface OveragePreview {
  hasOverages: boolean;
  totalOverageCost: number;
  currency: string;
  overages: OverageDetail[];
}

export interface OverageDetail {
  metric: string;
  baseLimit: number;
  actualUsage: number;
  overageAmount: number;
  unitPrice: number;
  totalCost: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  paidAt?: Date;
  lineItems: InvoiceLineItem[];
  stripeInvoiceId?: string;
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible'
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: 'subscription' | 'overage' | 'one_time';
  metadata?: Record<string, any>;
}

export interface BillingInfo {
  nextBillingDate: Date;
  billingCycle: 'monthly' | 'yearly';
  currency: string;
}

export interface PlanComparison {
  plans: SubscriptionPlan[];
  comparison: PlanComparisonMatrix;
}

export interface PlanComparisonMatrix {
  features: string[];
  planFeatures: Record<string, boolean[]>;
}

export interface ChangePlanRequest {
  newPlanId: string;
  billingCycle: 'monthly' | 'yearly';
  effectiveDate?: Date;
}

export interface ChangePlanResponse {
  subscription: Subscription;
  upgradeInfo: PlanUpgradeInfo;
  message: string;
}

export interface PlanUpgradeInfo {
  isUpgrade: boolean;
  priceDifference: number;
  prorationAmount?: number;
  effectiveDate: Date;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'invoice';
  lastFour?: string;
  expiryDate?: string;
  brand?: string;
  isDefault: boolean;
}

export interface BillingAlert {
  id: string;
  type: 'usage_warning' | 'payment_failed' | 'trial_ending' | 'subscription_cancelled';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  actionUrl?: string;
  actionText?: string;
  createdAt: Date;
  dismissedAt?: Date;
}

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
      ...request,
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