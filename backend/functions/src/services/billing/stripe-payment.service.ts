/**
 * Service d'intégration Stripe pour le traitement des paiements
 * Gère les clients, méthodes de paiement, abonnements et webhooks Stripe
 */

import Stripe from 'stripe';
import {
  SubscriptionPlan,
  TenantError,
  TenantErrorCode
} from '../../shared/types/tenant.types';
import { collections } from '../../config/database';
import { tenantService } from '../tenant/tenant.service';
import { subscriptionPlanService } from '../subscription/subscription-plan.service';
import subscriptionLifecycleService, { BillingCycle, SubscriptionStatus } from '../subscription/subscription-lifecycle.service';



// Configuration Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil'
});

export interface StripeCustomer {
  id: string;
  tenantId: string;
  stripeCustomerId: string;
  email: string;
  name: string;
  defaultPaymentMethodId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StripeSubscription {
  id: string;
  tenantId: string;
  subscriptionId: string; // Notre ID d'abonnement interne
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStripeCustomerRequest {
  tenantId: string;
  email: string;
  name: string;
  paymentMethodId?: string;
}

export interface CreateStripeSubscriptionRequest {
  tenantId: string;
  planId: string;
  billingCycle: BillingCycle;
  paymentMethodId?: string;
  trialDays?: number;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: any;
  created: number;
  processed: boolean;
  processedAt?: Date;
  error?: string;
}

export class StripePaymentService {

  /**
   * Créer un client Stripe
   */
  async createStripeCustomer(request: CreateStripeCustomerRequest): Promise<StripeCustomer> {
    try {
      // Vérifier que le tenant existe
      const tenant = await tenantService.getTenant(request.tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Vérifier qu'un client Stripe n'existe pas déjà
      const existingCustomer = await this.getStripeCustomerByTenant(request.tenantId);
      if (existingCustomer) {
        throw new TenantError(
          'Stripe customer already exists for this tenant',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      // Créer le client dans Stripe
      const stripeCustomer = await stripe.customers.create({
        email: request.email,
        name: request.name,
        metadata: {
          tenantId: request.tenantId,
          tenantName: tenant.name
        }
      });

      // Attacher la méthode de paiement si fournie
      if (request.paymentMethodId) {
        await stripe.paymentMethods.attach(request.paymentMethodId, {
          customer: stripeCustomer.id
        });

        // Définir comme méthode par défaut
        await stripe.customers.update(stripeCustomer.id, {
          invoice_settings: {
            default_payment_method: request.paymentMethodId
          }
        });
      }

      // Sauvegarder dans notre base de données
      const now = new Date();
      const customerData: Omit<StripeCustomer, 'id'> = {
        tenantId: request.tenantId,
        stripeCustomerId: stripeCustomer.id,
        email: request.email,
        name: request.name,
        defaultPaymentMethodId: request.paymentMethodId,
        createdAt: now,
        updatedAt: now
      };

      const customerRef = await collections.stripe_customers.add(customerData);

      return {
        id: customerRef.id,
        ...customerData
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error creating Stripe customer:', error);
      throw new TenantError(
        'Failed to create Stripe customer',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Créer un abonnement Stripe
   */
  async createStripeSubscription(request: CreateStripeSubscriptionRequest): Promise<StripeSubscription> {
    try {
      // Obtenir le client Stripe
      const customer = await this.getStripeCustomerByTenant(request.tenantId);
      if (!customer) {
        throw new TenantError(
          'Stripe customer not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Obtenir le plan
      const plan = await subscriptionPlanService.getPlanById(request.planId);
      if (!plan) {
        throw new TenantError(
          'Plan not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Créer ou obtenir le prix Stripe
      const stripePriceId = await this.getOrCreateStripePrice(plan, request.billingCycle);

      // Créer l'abonnement dans Stripe
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customer.stripeCustomerId,
        items: [{ price: stripePriceId }],
        metadata: {
          tenantId: request.tenantId,
          planId: request.planId,
          billingCycle: request.billingCycle
        },
        expand: ['latest_invoice.payment_intent']
      };

      // Ajouter la période d'essai si demandée
      if (request.trialDays && request.trialDays > 0) {
        subscriptionParams.trial_period_days = request.trialDays;
      }

      // Définir la méthode de paiement par défaut
      if (request.paymentMethodId) {
        subscriptionParams.default_payment_method = request.paymentMethodId;
      }

      const stripeSubscription = await stripe.subscriptions.create(subscriptionParams);

      // Créer notre abonnement interne
      const internalSubscription = await subscriptionLifecycleService.createSubscription({
        tenantId: request.tenantId,
        planId: request.planId,
        billingCycle: request.billingCycle,
        paymentMethodId: request.paymentMethodId,
        startTrial: request.trialDays ? request.trialDays > 0 : false,
        trialDays: request.trialDays
      });

      // Sauvegarder la relation Stripe
      const now = new Date();
      const stripeSubscriptionData: Omit<StripeSubscription, 'id'> = {
        tenantId: request.tenantId,
        subscriptionId: internalSubscription.id,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: customer.stripeCustomerId,
        stripePriceId,
        status: stripeSubscription.status,
        currentPeriodStart: new Date(stripeSubscription.start_date * 1000),
        currentPeriodEnd: new Date(stripeSubscription.ended_at * 1000),
        createdAt: now,
        updatedAt: now
      };

      const stripeSubRef = await collections.stripe_subscriptions.add(stripeSubscriptionData);

      return {
        id: stripeSubRef.id,
        ...stripeSubscriptionData
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error creating Stripe subscription:', error);
      throw new TenantError(
        'Failed to create Stripe subscription',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Traiter les webhooks Stripe
   */
  async handleStripeWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<{ received: boolean; processed: boolean }> {
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!endpointSecret) {
        throw new Error('Stripe webhook secret not configured');
      }

      // Vérifier la signature du webhook
      const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);

      // Enregistrer l'événement
      await this.saveWebhookEvent(event);

      // Traiter l'événement
      const processed = await this.processWebhookEvent(event);

      return { received: true, processed };
    } catch (error) {
      console.error('Error handling Stripe webhook:', error);
      return { received: false, processed: false };
    }
  }

  /**
   * Traiter un événement webhook spécifique
   */
  private async processWebhookEvent(event: Stripe.Event): Promise<boolean> {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
          return false;
      }

      return true;
    } catch (error) {
      console.error(`Error processing webhook event ${event.type}:`, error);
      return false;
    }
  }

  /**
   * Gérer la création d'abonnement
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription created:', subscription.id);
    // La création est déjà gérée dans createStripeSubscription
  }

  /**
   * Gérer la mise à jour d'abonnement
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const stripeSubscription = await this.getStripeSubscriptionByStripeId(subscription.id);
      if (!stripeSubscription) {
        console.warn(`Stripe subscription not found: ${subscription.id}`);
        return;
      }

      // Mettre à jour notre abonnement interne
      const updates: any = {
        status: this.mapStripeStatusToInternal(subscription.status),
        currentPeriodStart: new Date(subscription.start_date * 1000),
        currentPeriodEnd: new Date(subscription.ended_at * 1000),
        updatedAt: new Date()
      };

      await collections.stripe_subscriptions.doc(stripeSubscription.id).update(updates);

      // Mettre à jour le statut du tenant si nécessaire
      if (subscription.status === 'active') {
        await tenantService.updateTenant(stripeSubscription.tenantId, {
          status: 'active' as any
        });
      } else if (subscription.status === 'canceled') {
        await tenantService.updateTenant(stripeSubscription.tenantId, {
          status: 'cancelled' as any
        });
      }
    } catch (error) {
      console.error('Error handling subscription updated:', error);
    }
  }

  /**
   * Gérer la suppression d'abonnement
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const stripeSubscription = await this.getStripeSubscriptionByStripeId(subscription.id);
      if (!stripeSubscription) {
        return;
      }

      // Annuler notre abonnement interne
      await subscriptionLifecycleService.cancelSubscription({
        subscriptionId: stripeSubscription.subscriptionId,
        reason: 'Cancelled via Stripe'
      });
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
    }
  }

  /**
   * Gérer le paiement réussi
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      // Vérifier si la facture est liée à un abonnement
      const subscriptionId = null;

      if (!subscriptionId) {return;}

      const stripeSubscription = await this.getStripeSubscriptionByStripeId(subscriptionId);
      if (!stripeSubscription) {
        return;
      }

      // Renouveler l'abonnement interne
      await subscriptionLifecycleService.renewSubscription(stripeSubscription.subscriptionId);

      console.log(`Payment succeeded for tenant ${stripeSubscription.tenantId}`);
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
    }
  }

  /**
   * Gérer l'échec de paiement
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      // Vérifier si la facture est liée à un abonnement
      const subscriptionId = null;

      if (!subscriptionId) {return;}

      const stripeSubscription = await this.getStripeSubscriptionByStripeId(subscriptionId);
      if (!stripeSubscription) {
        return;
      }

      // Marquer le tenant comme ayant des problèmes de paiement
      await tenantService.updateTenant(stripeSubscription.tenantId, {
        status: 'suspended' as any
      });

      // TODO: Envoyer une notification de paiement échoué
      console.log(`Payment failed for tenant ${stripeSubscription.tenantId}`);
    } catch (error) {
      console.error('Error handling payment failed:', error);
    }
  }

  /**
   * Gérer la fin prochaine de l'essai
   */
  private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    try {
      const stripeSubscription = await this.getStripeSubscriptionByStripeId(subscription.id);
      if (!stripeSubscription) {
        return;
      }

      // TODO: Envoyer une notification de fin d'essai
      console.log(`Trial will end for tenant ${stripeSubscription.tenantId}`);
    } catch (error) {
      console.error('Error handling trial will end:', error);
    }
  }

  /**
   * Créer un PaymentIntent pour un paiement ponctuel
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    customerId: string;
    paymentMethodId?: string;
    confirm?: boolean;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: params.amount,
        currency: params.currency,
        customer: params.customerId,
        metadata: params.metadata || {}
      };

      if (params.paymentMethodId) {
        paymentIntentParams.payment_method = params.paymentMethodId;
      }

      if (params.confirm) {
        paymentIntentParams.confirm = true;
        paymentIntentParams.return_url = process.env.FRONTEND_URL || 'http://localhost:3000';
      }

      return await stripe.paymentIntents.create(paymentIntentParams);
    } catch (error) {
      console.error('Error creating PaymentIntent:', error);
      throw error;
    }
  }

  /**
   * Obtenir un client Stripe par tenant
   */
  async getStripeCustomerByTenant(tenantId: string): Promise<StripeCustomer | null> {
    try {
      const snapshot = await collections.stripe_customers
        .where('tenantId', '==', tenantId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as StripeCustomer;
    } catch (error) {
      console.error('Error getting Stripe customer by tenant:', error);
      return null;
    }
  }

  /**
   * Obtenir un abonnement Stripe par ID Stripe
   */
  private async getStripeSubscriptionByStripeId(stripeSubscriptionId: string): Promise<StripeSubscription | null> {
    try {
      const snapshot = await collections.stripe_subscriptions
        .where('stripeSubscriptionId', '==', stripeSubscriptionId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as StripeSubscription;
    } catch (error) {
      console.error('Error getting Stripe subscription by Stripe ID:', error);
      return null;
    }
  }

  /**
   * Créer ou obtenir un prix Stripe pour un plan
   */
  private async getOrCreateStripePrice(plan: SubscriptionPlan, billingCycle: BillingCycle): Promise<string> {
    try {
      // Chercher un prix existant
      const prices = await stripe.prices.list({
        product: plan.id,
        active: true,
        recurring: {
          interval: billingCycle === BillingCycle.YEARLY ? 'year' : 'month'
        }
      });

      if (prices.data.length > 0) {
        return prices.data[0].id;
      }

      // Créer le produit s'il n'existe pas
      let product: Stripe.Product;
      try {
        product = await stripe.products.retrieve(plan.id);
      } catch {
        product = await stripe.products.create({
          id: plan.id,
          name: plan.name,
          description: `${plan.name} subscription plan`,
          metadata: {
            planId: plan.id,
            planType: plan.type
          }
        });
      }

      // Créer le prix
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(plan.price * 100), // Convertir en centimes
        currency: plan.currency.toLowerCase(),
        recurring: {
          interval: billingCycle === BillingCycle.YEARLY ? 'year' : 'month'
        },
        metadata: {
          planId: plan.id,
          billingCycle
        }
      });

      return price.id;
    } catch (error) {
      console.error('Error creating Stripe price:', error);
      throw error;
    }
  }

  /**
   * Mapper le statut Stripe vers notre statut interne
   */
  private mapStripeStatusToInternal(stripeStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      'active': SubscriptionStatus.ACTIVE,
      'trialing': SubscriptionStatus.TRIALING,
      'past_due': SubscriptionStatus.PAST_DUE,
      'canceled': SubscriptionStatus.CANCELLED,
      'unpaid': SubscriptionStatus.UNPAID,
      'incomplete': SubscriptionStatus.INCOMPLETE
    };

    return statusMap[stripeStatus] || SubscriptionStatus.INCOMPLETE;
  }

  /**
   * Sauvegarder un événement webhook
   */
  private async saveWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      const webhookEventData: Omit<StripeWebhookEvent, 'id'> = {
        type: event.type,
        data: event.data,
        created: event.created,
        processed: false
      };

      await collections.stripe_webhook_events.add(webhookEventData);
    } catch (error) {
      console.error('Error saving webhook event:', error);
    }
  }
}

// Ajouter les collections Stripe manquantes
// Note: Ceci devrait être ajouté dans database.ts
declare module '../../config/database' {
  interface Collections {
    stripe_customers: any;
    stripe_subscriptions: any;
    stripe_webhook_events: any;
  }
}

// Instance singleton
export const stripePaymentService = new StripePaymentService();
export default stripePaymentService;