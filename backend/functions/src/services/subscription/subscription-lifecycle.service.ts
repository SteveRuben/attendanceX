/**
 * Service de gestion du cycle de vie des abonnements
 * Gère la création, renouvellement, changement et annulation des abonnements
 */

import { 
  TenantStatus,
  TenantError,
  TenantErrorCode
} from '../../shared/types/tenant.types';
import { collections } from '../../config/database';
import { tenantService } from '../tenant/tenant.service';
import { subscriptionPlanService } from './subscription-plan.service';
import { tenantContextService } from '../tenant/tenant-context.service';

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  
  // Billing cycle
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  billingCycle: BillingCycle;
  
  // Pricing
  basePrice: number;
  currency: string;
  discountPercent?: number;
  
  // Payment
  paymentMethodId?: string;
  nextPaymentDate: Date;
  
  // Lifecycle
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  
  // Trial
  trialStart?: Date;
  trialEnd?: Date;
  isTrialActive: boolean;
  
  // Metadata
  metadata?: Record<string, any>;
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete'
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export interface CreateSubscriptionRequest {
  tenantId: string;
  planId: string;
  billingCycle: BillingCycle;
  paymentMethodId?: string;
  discountPercent?: number;
  startTrial?: boolean;
  trialDays?: number;
}

export interface ChangePlanRequest {
  subscriptionId: string;
  newPlanId: string;
  billingCycle?: BillingCycle;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  effectiveDate?: Date;
}

export interface CancelSubscriptionRequest {
  subscriptionId: string;
  reason?: string;
  cancelAtPeriodEnd?: boolean;
  effectiveDate?: Date;
}

export class SubscriptionLifecycleService {
  private readonly DEFAULT_TRIAL_DAYS = 14;

  /**
   * Créer un nouvel abonnement
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    try {
      // Vérifier que le tenant existe
      const tenant = await tenantService.getTenant(request.tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Vérifier que le plan existe
      const plan = await subscriptionPlanService.getPlanById(request.planId);
      if (!plan) {
        throw new TenantError(
          'Plan not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Vérifier qu'il n'y a pas déjà un abonnement actif
      const existingSubscription = await this.getActiveSubscriptionByTenant(request.tenantId);
      if (existingSubscription) {
        throw new TenantError(
          'Tenant already has an active subscription',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      const now = new Date();
      const trialDays = request.trialDays || this.DEFAULT_TRIAL_DAYS;
      const isTrialActive = request.startTrial || plan.price === 0;

      // Calculer les dates de période
      let currentPeriodStart = now;
      let currentPeriodEnd: Date;
      let nextPaymentDate: Date;
      let status: SubscriptionStatus;

      if (isTrialActive && plan.price > 0) {
        // Période d'essai
        currentPeriodEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
        nextPaymentDate = currentPeriodEnd;
        status = SubscriptionStatus.TRIALING;
      } else {
        // Abonnement normal
        if (request.billingCycle === BillingCycle.YEARLY) {
          currentPeriodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        } else {
          currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        }
        nextPaymentDate = plan.price === 0 ? currentPeriodEnd : now;
        status = plan.price === 0 ? SubscriptionStatus.ACTIVE : SubscriptionStatus.INCOMPLETE;
      }

      // Créer l'abonnement
      const subscriptionData: Omit<Subscription, 'id'> = {
        tenantId: request.tenantId,
        planId: request.planId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        billingCycle: request.billingCycle,
        basePrice: plan.price,
        currency: plan.currency,
        discountPercent: request.discountPercent,
        paymentMethodId: request.paymentMethodId,
        nextPaymentDate,
        createdAt: now,
        updatedAt: now,
        trialStart: isTrialActive ? now : undefined,
        trialEnd: isTrialActive ? currentPeriodEnd : undefined,
        isTrialActive,
        metadata: {
          createdBy: 'system',
          planName: plan.name
        }
      };

      const subscriptionRef = await collections.subscriptions.add(subscriptionData);
      const subscription = {
        id: subscriptionRef.id,
        ...subscriptionData
      };

      // Mettre à jour le tenant
      await tenantService.updateTenant(request.tenantId, {
        planId: request.planId,
        status: isTrialActive ? TenantStatus.TRIAL : TenantStatus.ACTIVE
      });

      // Invalider le cache des contextes
      tenantContextService.invalidateTenantContexts(request.tenantId);

      return subscription;
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error creating subscription:', error);
      throw new TenantError(
        'Failed to create subscription',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Changer le plan d'un abonnement
   */
  async changePlan(request: ChangePlanRequest): Promise<Subscription> {
    try {
      // Obtenir l'abonnement existant
      const subscription = await this.getSubscriptionById(request.subscriptionId);
      if (!subscription) {
        throw new TenantError(
          'Subscription not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Vérifier que le nouveau plan existe
      const newPlan = await subscriptionPlanService.getPlanById(request.newPlanId);
      if (!newPlan) {
        throw new TenantError(
          'New plan not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const currentPlan = await subscriptionPlanService.getPlanById(subscription.planId);
      if (!currentPlan) {
        throw new TenantError(
          'Current plan not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const now = new Date();
      // @ts-ignore
      const effectiveDate = request.effectiveDate || now;
      const isUpgrade = newPlan.price > currentPlan.price;
      const isDowngrade = newPlan.price < currentPlan.price;

      // Calculer la proration si nécessaire
      let proratedAmount = 0;
      if (request.prorationBehavior === 'create_prorations' && subscription.status === SubscriptionStatus.ACTIVE) {
        const remainingDays = Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        const totalDays = Math.ceil((subscription.currentPeriodEnd.getTime() - subscription.currentPeriodStart.getTime()) / (24 * 60 * 60 * 1000));
        const remainingRatio = remainingDays / totalDays;
        
        proratedAmount = (newPlan.price - currentPlan.price) * remainingRatio;
      }

      // Mettre à jour l'abonnement
      const updates: Partial<Subscription> = {
        planId: request.newPlanId,
        basePrice: newPlan.price,
        currency: newPlan.currency,
        billingCycle: request.billingCycle || subscription.billingCycle,
        updatedAt: now,
        metadata: {
          ...subscription.metadata,
          previousPlanId: subscription.planId,
          planChangeDate: now,
          planChangeType: isUpgrade ? 'upgrade' : isDowngrade ? 'downgrade' : 'lateral',
          proratedAmount
        }
      };

      // Si c'est un downgrade, appliquer à la fin de la période
      if (isDowngrade && !request.effectiveDate) {
        updates.metadata!.pendingPlanChange = {
          planId: request.newPlanId,
          effectiveDate: subscription.currentPeriodEnd
        };
      } else {
        // Appliquer immédiatement
        await collections.subscriptions.doc(request.subscriptionId).update(updates);
        
        // Mettre à jour le tenant
        await tenantService.updateTenant(subscription.tenantId, {
          planId: request.newPlanId
        });

        // Invalider le cache des contextes
        tenantContextService.invalidateTenantContexts(subscription.tenantId);
      }

      return {
        ...subscription,
        ...updates
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error changing plan:', error);
      throw new TenantError(
        'Failed to change plan',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Renouveler un abonnement
   */
  async renewSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new TenantError(
          'Subscription not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const now = new Date();
      let newPeriodEnd: Date;

      // Calculer la nouvelle période
      if (subscription.billingCycle === BillingCycle.YEARLY) {
        newPeriodEnd = new Date(subscription.currentPeriodEnd.getFullYear() + 1, 
                               subscription.currentPeriodEnd.getMonth(), 
                               subscription.currentPeriodEnd.getDate());
      } else {
        newPeriodEnd = new Date(subscription.currentPeriodEnd.getFullYear(), 
                               subscription.currentPeriodEnd.getMonth() + 1, 
                               subscription.currentPeriodEnd.getDate());
      }

      // Mettre à jour l'abonnement
      const updates: Partial<Subscription> = {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: subscription.currentPeriodEnd,
        currentPeriodEnd: newPeriodEnd,
        nextPaymentDate: newPeriodEnd,
        isTrialActive: false,
        updatedAt: now,
        metadata: {
          ...subscription.metadata,
          lastRenewalDate: now,
          renewalCount: (subscription.metadata?.renewalCount || 0) + 1
        }
      };

      await collections.subscriptions.doc(subscriptionId).update(updates);

      // Mettre à jour le statut du tenant
      await tenantService.updateTenant(subscription.tenantId, {
        status: TenantStatus.ACTIVE
      });

      return {
        ...subscription,
        ...updates
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error renewing subscription:', error);
      throw new TenantError(
        'Failed to renew subscription',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Annuler un abonnement
   */
  async cancelSubscription(request: CancelSubscriptionRequest): Promise<Subscription> {
    try {
      const subscription = await this.getSubscriptionById(request.subscriptionId);
      if (!subscription) {
        throw new TenantError(
          'Subscription not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const now = new Date();
      const effectiveDate = request.effectiveDate || 
                           (request.cancelAtPeriodEnd ? subscription.currentPeriodEnd : now);

      const updates: Partial<Subscription> = {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: now,
        cancelReason: request.reason,
        updatedAt: now,
        metadata: {
          ...subscription.metadata,
          cancelledBy: 'user', // TODO: Obtenir l'utilisateur qui annule
          cancelAtPeriodEnd: request.cancelAtPeriodEnd,
          effectiveCancellationDate: effectiveDate
        }
      };

      await collections.subscriptions.doc(request.subscriptionId).update(updates);

      // Si l'annulation est immédiate, suspendre le tenant
      if (!request.cancelAtPeriodEnd) {
        await tenantService.updateTenant(subscription.tenantId, {
          status: TenantStatus.CANCELLED
        });
      }

      // Invalider le cache des contextes
      tenantContextService.invalidateTenantContexts(subscription.tenantId);

      return {
        ...subscription,
        ...updates
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error cancelling subscription:', error);
      throw new TenantError(
        'Failed to cancel subscription',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Réactiver un abonnement annulé
   */
  async reactivateSubscription(subscriptionId: string, newPlanId?: string): Promise<Subscription> {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new TenantError(
          'Subscription not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      if (subscription.status !== SubscriptionStatus.CANCELLED) {
        throw new TenantError(
          'Subscription is not cancelled',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      const planId = newPlanId || subscription.planId;
      const plan = await subscriptionPlanService.getPlanById(planId);
      if (!plan) {
        throw new TenantError(
          'Plan not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const now = new Date();
      let newPeriodEnd: Date;

      // Calculer la nouvelle période
      if (subscription.billingCycle === BillingCycle.YEARLY) {
        newPeriodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      } else {
        newPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      }

      const updates: Partial<Subscription> = {
        status: SubscriptionStatus.ACTIVE,
        planId,
        basePrice: plan.price,
        currentPeriodStart: now,
        currentPeriodEnd: newPeriodEnd,
        nextPaymentDate: plan.price === 0 ? newPeriodEnd : now,
        cancelledAt: undefined,
        cancelReason: undefined,
        updatedAt: now,
        metadata: {
          ...subscription.metadata,
          reactivatedAt: now,
          reactivatedBy: 'user' // TODO: Obtenir l'utilisateur
        }
      };

      await collections.subscriptions.doc(subscriptionId).update(updates);

      // Réactiver le tenant
      await tenantService.updateTenant(subscription.tenantId, {
        status: TenantStatus.ACTIVE,
        planId
      });

      // Invalider le cache des contextes
      tenantContextService.invalidateTenantContexts(subscription.tenantId);

      return {
        ...subscription,
        ...updates
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error reactivating subscription:', error);
      throw new TenantError(
        'Failed to reactivate subscription',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir un abonnement par ID
   */
  async getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
    try {
      const doc = await collections.subscriptions.doc(subscriptionId).get();
      
      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as Subscription;
    } catch (error) {
      console.error('Error getting subscription by ID:', error);
      return null;
    }
  }

  /**
   * Obtenir l'abonnement actif d'un tenant
   */
  async getActiveSubscriptionByTenant(tenantId: string): Promise<Subscription | null> {
    try {
      const snapshot = await collections.subscriptions
        .where('tenantId', '==', tenantId)
        .where('status', 'in', [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING])
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Subscription;
    } catch (error) {
      console.error('Error getting active subscription by tenant:', error);
      return null;
    }
  }

  /**
   * Obtenir tous les abonnements d'un tenant
   */
  async getSubscriptionsByTenant(tenantId: string): Promise<Subscription[]> {
    try {
      const snapshot = await collections.subscriptions
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
    } catch (error) {
      console.error('Error getting subscriptions by tenant:', error);
      return [];
    }
  }

  /**
   * Traiter les abonnements expirés (job automatique)
   */
  async processExpiredSubscriptions(): Promise<{
    processed: number;
    renewed: number;
    cancelled: number;
    errors: number;
  }> {
    try {
      const now = new Date();
      const results = {
        processed: 0,
        renewed: 0,
        cancelled: 0,
        errors: 0
      };

      // Obtenir les abonnements expirés
      const expiredSnapshot = await collections.subscriptions
        .where('status', 'in', [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING])
        .where('currentPeriodEnd', '<=', now)
        .get();

      for (const doc of expiredSnapshot.docs) {
        try {
          const subscription = { id: doc.id, ...doc.data() } as Subscription;
          results.processed++;

          if (subscription.isTrialActive) {
            // Fin de période d'essai
            if (subscription.paymentMethodId) {
              // Tenter de renouveler avec paiement
              await this.renewSubscription(subscription.id);
              results.renewed++;
            } else {
              // Pas de méthode de paiement, suspendre
              await this.cancelSubscription({
                subscriptionId: subscription.id,
                reason: 'Trial expired without payment method'
              });
              results.cancelled++;
            }
          } else {
            // Abonnement payant expiré
            if (subscription.paymentMethodId) {
              // Tenter de renouveler
              await this.renewSubscription(subscription.id);
              results.renewed++;
            } else {
              // Marquer comme impayé
              await collections.subscriptions.doc(subscription.id).update({
                status: SubscriptionStatus.PAST_DUE,
                updatedAt: now
              });
            }
          }
        } catch (error) {
          console.error(`Error processing expired subscription ${doc.id}:`, error);
          results.errors++;
        }
      }

      return results;
    } catch (error) {
      console.error('Error processing expired subscriptions:', error);
      return {
        processed: 0,
        renewed: 0,
        cancelled: 0,
        errors: 1
      };
    }
  }
}

// Ajouter les collections manquantes
// Note: Ceci devrait être ajouté dans database.ts
declare module '../../config/database' {
  interface Collections {
    subscriptions: any;
  }
}

// Instance singleton
export const subscriptionLifecycleService = new SubscriptionLifecycleService();
export default subscriptionLifecycleService;