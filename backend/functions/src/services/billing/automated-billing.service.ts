/**
 * Service de facturation automatisée
 * Génère et traite automatiquement les factures
 */

import {
  TenantError,
  TenantErrorCode
} from '../../shared/types/tenant.types';
import { collections } from '../../config/database';
import { stripePaymentService } from './stripe-payment.service';
import { usageBillingService } from './usage-billing.service';
import { subscriptionLifecycleService } from '../subscription/subscription-lifecycle.service';


export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId: string;
  billingPeriodId?: string;

  // Invoice details
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;

  // Dates
  issueDate: Date;
  dueDate: Date;
  paidAt?: Date;

  // Line items
  lineItems: InvoiceLineItem[];

  // Payment
  paymentMethodId?: string;
  stripeInvoiceId?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: 'subscription' | 'overage' | 'one_time';
  metadata?: Record<string, any>;
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible'
}

export class AutomatedBillingService {

  /**
   * Générer une facture pour un tenant
   */
  async generateInvoice(tenantId: string, billingPeriodId?: string): Promise<Invoice> {
    try {
      // Obtenir l'abonnement actif
      const subscription = await subscriptionLifecycleService.getActiveSubscriptionByTenant(tenantId);
      if (!subscription) {
        throw new TenantError(
          'No active subscription found',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      // Calculer la facturation
      let billingCalculation;
      if (billingPeriodId) {
        // Utiliser une période de facturation existante
        const billingPeriod = await collections.billing_periods.doc(billingPeriodId).get();
        if (!billingPeriod.exists) {
          throw new TenantError(
            'Billing period not found',
            TenantErrorCode.TENANT_NOT_FOUND
          );
        }
        const periodData = billingPeriod.data()!;
        billingCalculation = {
          baseCost: periodData.baseCost,
          overageCosts: periodData.overageCosts,
          totalOverageCost: periodData.totalOverageCost,
          totalCost: periodData.totalCost,
          currency: subscription.currency
        };
      } else {
        // Calculer pour la période actuelle
        billingCalculation = await usageBillingService.calculateBillingForPeriod(
          tenantId,
          subscription.currentPeriodStart,
          subscription.currentPeriodEnd
        );
      }

      // Créer les line items
      const lineItems: InvoiceLineItem[] = [];

      // Line item pour l'abonnement de base
      if (billingCalculation.baseCost > 0) {
        lineItems.push({
          description: `${subscription.planId} subscription`,
          quantity: 1,
          unitPrice: billingCalculation.baseCost,
          totalPrice: billingCalculation.baseCost,
          type: 'subscription'
        });
      }

      // Line items pour les overages
      billingCalculation.overageCosts.forEach(overage => {
        lineItems.push({
          description: `${overage.metric} overage (${overage.overageAmount} units)`,
          quantity: overage.overageAmount,
          unitPrice: overage.unitPrice,
          totalPrice: overage.totalCost,
          type: 'overage',
          metadata: {
            metric: overage.metric,
            baseLimit: overage.baseLimit,
            actualUsage: overage.actualUsage
          }
        });
      });

      // Générer le numéro de facture
      const invoiceNumber = await this.generateInvoiceNumber(tenantId);

      // Créer la facture
      const now = new Date();
      const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 jours

      const invoiceData: Omit<Invoice, 'id'> = {
        tenantId,
        subscriptionId: subscription.id,
        billingPeriodId,
        invoiceNumber,
        amount: billingCalculation.totalCost,
        currency: billingCalculation.currency,
        status: InvoiceStatus.OPEN,
        issueDate: now,
        dueDate,
        lineItems,
        createdAt: now,
        updatedAt: now
      };

      const invoiceRef = await collections.invoices.add(invoiceData);

      return {
        id: invoiceRef.id,
        ...invoiceData
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error generating invoice:', error);
      throw new TenantError(
        'Failed to generate invoice',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Traiter le paiement d'une facture
   */
  async processPayment(invoiceId: string): Promise<{ success: boolean; paymentIntentId?: string }> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      if (!invoice) {
        throw new TenantError(
          'Invoice not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      if (invoice.status !== InvoiceStatus.OPEN) {
        throw new TenantError(
          'Invoice is not open for payment',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      // Obtenir le client Stripe
      const stripeCustomer = await stripePaymentService.getStripeCustomerByTenant(invoice.tenantId);
      if (!stripeCustomer) {
        throw new TenantError(
          'Stripe customer not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Créer un PaymentIntent dans Stripe
      const paymentIntent = await stripePaymentService.createPaymentIntent({
        amount: Math.round(invoice.amount * 100), // Convertir en centimes
        currency: invoice.currency.toLowerCase(),
        customerId: stripeCustomer.stripeCustomerId,
        paymentMethodId: stripeCustomer.defaultPaymentMethodId,
        confirm: true,
        metadata: {
          invoiceId: invoice.id,
          tenantId: invoice.tenantId,
          subscriptionId: invoice.subscriptionId
        }
      });

      // Mettre à jour la facture
      await collections.invoices.doc(invoiceId).update({
        status: paymentIntent.status === 'succeeded' ? InvoiceStatus.PAID : InvoiceStatus.OPEN,
        paidAt: paymentIntent.status === 'succeeded' ? new Date() : undefined,
        stripePaymentIntentId: paymentIntent.id,
        updatedAt: new Date()
      });

      return {
        success: paymentIntent.status === 'succeeded',
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      if (error instanceof TenantError) {
        throw error;
      }
      throw new TenantError(
        'Failed to process payment',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir une facture par ID
   */
  async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    try {
      const doc = await collections.invoices.doc(invoiceId).get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as Invoice;
    } catch (error) {
      console.error('Error getting invoice by ID:', error);
      return null;
    }
  }

  /**
   * Obtenir toutes les factures d'un tenant
   */
  async getInvoicesByTenant(tenantId: string): Promise<Invoice[]> {
    try {
      const snapshot = await collections.invoices
        .where('tenantId', '==', tenantId)
        .orderBy('issueDate', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
    } catch (error) {
      console.error('Error getting invoices by tenant:', error);
      return [];
    }
  }

  /**
   * Générer un numéro de facture unique
   */
  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Compter les factures du mois pour ce tenant
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0);

    const monthlyInvoicesSnapshot = await collections.invoices
      .where('tenantId', '==', tenantId)
      .where('issueDate', '>=', startOfMonth)
      .where('issueDate', '<=', endOfMonth)
      .get();

    const sequence = String(monthlyInvoicesSnapshot.size + 1).padStart(3, '0');
    const tenantPrefix = tenantId.substring(0, 4).toUpperCase();

    return `INV-${tenantPrefix}-${year}${month}-${sequence}`;
  }
}

// Ajouter les collections manquantes
declare module '../../config/database' {
  interface Collections {
    invoices: any;
  }
}

// Instance singleton
export const automatedBillingService = new AutomatedBillingService();
export default automatedBillingService;