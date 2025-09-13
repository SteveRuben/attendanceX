/**
 * Service de facturation basée sur l'usage
 * Calcule les frais d'overage et génère les factures basées sur l'utilisation
 */

import { 
  SubscriptionPlan,
  TenantUsage,
  TenantError,
  TenantErrorCode
} from '../../shared/types/tenant.types';
import { collections } from '../../config/database';
import { tenantService } from '../tenant/tenant.service';
import { subscriptionPlanService } from '../subscription/subscription-plan.service';
import { subscriptionLifecycleService } from '../subscription/subscription-lifecycle.service';

export interface UsageBillingPeriod {
  id: string;
  tenantId: string;
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  
  // Usage data
  baseUsage: TenantUsage;
  overageUsage: TenantUsage;
  totalUsage: TenantUsage;
  
  // Billing calculations
  baseCost: number;
  overageCosts: UsageOverageCost[];
  totalOverageCost: number;
  totalCost: number;
  
  // Status
  status: BillingPeriodStatus;
  invoiceId?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

export interface UsageOverageCost {
  metric: keyof TenantUsage;
  baseLimit: number;
  actualUsage: number;
  overageAmount: number;
  unitPrice: number;
  totalCost: number;
}

export enum BillingPeriodStatus {
  PENDING = 'pending',
  CALCULATED = 'calculated',
  INVOICED = 'invoiced',
  PAID = 'paid',
  FAILED = 'failed'
}

export interface OverageRate {
  metric: keyof TenantUsage;
  unitPrice: number; // Prix par unité d'overage
  currency: string;
  tierPricing?: Array<{
    from: number;
    to: number;
    unitPrice: number;
  }>;
}

export interface BillingCalculationResult {
  baseCost: number;
  overageCosts: UsageOverageCost[];
  totalOverageCost: number;
  totalCost: number;
  currency: string;
  breakdown: {
    subscription: {
      planName: string;
      baseCost: number;
    };
    overage: UsageOverageCost[];
  };
}

export class UsageBillingService {
  
  // Tarifs d'overage par défaut (en EUR)
  private readonly DEFAULT_OVERAGE_RATES: Record<keyof TenantUsage, OverageRate> = {
    users: {
      metric: 'users',
      unitPrice: 5.0, // 5€ par utilisateur supplémentaire
      currency: 'EUR'
    },
    events: {
      metric: 'events',
      unitPrice: 0.50, // 0.50€ par événement supplémentaire
      currency: 'EUR'
    },
    storage: {
      metric: 'storage',
      unitPrice: 0.10, // 0.10€ par MB supplémentaire
      currency: 'EUR'
    },
    apiCalls: {
      metric: 'apiCalls',
      unitPrice: 0.001, // 0.001€ par appel API supplémentaire
      currency: 'EUR',
      tierPricing: [
        { from: 0, to: 10000, unitPrice: 0.001 },
        { from: 10001, to: 100000, unitPrice: 0.0008 },
        { from: 100001, to: -1, unitPrice: 0.0005 }
      ]
    }
  };

  /**
   * Calculer la facturation pour une période donnée
   */
  async calculateBillingForPeriod(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<BillingCalculationResult> {
    try {
      // Obtenir le tenant et son abonnement
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const subscription = await subscriptionLifecycleService.getActiveSubscriptionByTenant(tenantId);
      if (!subscription) {
        throw new TenantError(
          'No active subscription found',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      const plan = await subscriptionPlanService.getPlanById(subscription.planId);
      if (!plan) {
        throw new TenantError(
          'Plan not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Obtenir l'usage pour la période
      const usage = await this.getUsageForPeriod(tenantId, periodStart, periodEnd);
      
      // Calculer les coûts de base
      const baseCost = subscription.basePrice * (subscription.discountPercent ? 
        (100 - subscription.discountPercent) / 100 : 1);

      // Calculer les coûts d'overage
      const overageCosts = await this.calculateOverageCosts(usage, plan);
      const totalOverageCost = overageCosts.reduce((sum, cost) => sum + cost.totalCost, 0);
      const totalCost = baseCost + totalOverageCost;

      return {
        baseCost,
        overageCosts,
        totalOverageCost,
        totalCost,
        currency: plan.currency,
        breakdown: {
          subscription: {
            planName: plan.name,
            baseCost
          },
          overage: overageCosts
        }
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error calculating billing for period:', error);
      throw new TenantError(
        'Failed to calculate billing',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Créer une période de facturation
   */
  async createBillingPeriod(
    tenantId: string,
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<UsageBillingPeriod> {
    try {
      // Vérifier qu'une période n'existe pas déjà
      const existingPeriod = await this.getBillingPeriod(tenantId, periodStart, periodEnd);
      if (existingPeriod) {
        throw new TenantError(
          'Billing period already exists',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      // Calculer la facturation
      const calculation = await this.calculateBillingForPeriod(tenantId, periodStart, periodEnd);
      const usage = await this.getUsageForPeriod(tenantId, periodStart, periodEnd);
      
      // Obtenir le plan pour les limites
      const subscription = await subscriptionLifecycleService.getSubscriptionById(subscriptionId);
      const plan = await subscriptionPlanService.getPlanById(subscription!.planId);
      
      // Calculer l'usage de base et d'overage
      const baseUsage: TenantUsage = {
        users: Math.min(usage.users, plan!.limits.maxUsers === -1 ? usage.users : plan!.limits.maxUsers),
        events: Math.min(usage.events, plan!.limits.maxEvents === -1 ? usage.events : plan!.limits.maxEvents),
        storage: Math.min(usage.storage, plan!.limits.maxStorage === -1 ? usage.storage : plan!.limits.maxStorage),
        apiCalls: Math.min(usage.apiCalls, plan!.limits.apiCallsPerMonth === -1 ? usage.apiCalls : plan!.limits.apiCallsPerMonth)
      };

      const overageUsage: TenantUsage = {
        users: Math.max(0, usage.users - (plan!.limits.maxUsers === -1 ? 0 : plan!.limits.maxUsers)),
        events: Math.max(0, usage.events - (plan!.limits.maxEvents === -1 ? 0 : plan!.limits.maxEvents)),
        storage: Math.max(0, usage.storage - (plan!.limits.maxStorage === -1 ? 0 : plan!.limits.maxStorage)),
        apiCalls: Math.max(0, usage.apiCalls - (plan!.limits.apiCallsPerMonth === -1 ? 0 : plan!.limits.apiCallsPerMonth))
      };

      // Créer la période de facturation
      const now = new Date();
      const billingPeriodData: Omit<UsageBillingPeriod, 'id'> = {
        tenantId,
        subscriptionId,
        periodStart,
        periodEnd,
        baseUsage,
        overageUsage,
        totalUsage: usage,
        baseCost: calculation.baseCost,
        overageCosts: calculation.overageCosts,
        totalOverageCost: calculation.totalOverageCost,
        totalCost: calculation.totalCost,
        status: BillingPeriodStatus.CALCULATED,
        createdAt: now,
        updatedAt: now,
        processedAt: now
      };

      const billingPeriodRef = await collections.billing_periods.add(billingPeriodData);
      
      return {
        id: billingPeriodRef.id,
        ...billingPeriodData
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error creating billing period:', error);
      throw new TenantError(
        'Failed to create billing period',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir une période de facturation
   */
  async getBillingPeriod(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<UsageBillingPeriod | null> {
    try {
      const snapshot = await collections.billing_periods
        .where('tenantId', '==', tenantId)
        .where('periodStart', '==', periodStart)
        .where('periodEnd', '==', periodEnd)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as UsageBillingPeriod;
    } catch (error) {
      console.error('Error getting billing period:', error);
      return null;
    }
  }

  /**
   * Obtenir toutes les périodes de facturation d'un tenant
   */
  async getBillingPeriodsByTenant(tenantId: string): Promise<UsageBillingPeriod[]> {
    try {
      const snapshot = await collections.billing_periods
        .where('tenantId', '==', tenantId)
        .orderBy('periodStart', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UsageBillingPeriod));
    } catch (error) {
      console.error('Error getting billing periods by tenant:', error);
      return [];
    }
  }

  /**
   * Calculer les coûts d'overage
   */
  private async calculateOverageCosts(
    usage: TenantUsage,
    plan: SubscriptionPlan
  ): Promise<UsageOverageCost[]> {
    const overageCosts: UsageOverageCost[] = [];

    // Calculer pour chaque métrique
    Object.keys(usage).forEach(key => {
      const metric = key as keyof TenantUsage;
      const actualUsage = usage[metric];
      const baseLimit = plan.limits[metric];
      
      // Skip si illimité
      if (baseLimit === -1) {
        return;
      }

      const overageAmount = Math.max(0, actualUsage - baseLimit);
      
      if (overageAmount > 0) {
        const overageRate = this.DEFAULT_OVERAGE_RATES[metric];
        let totalCost = 0;

        if (overageRate.tierPricing) {
          // Calcul par paliers
          let remainingUsage = overageAmount;
          
          for (const tier of overageRate.tierPricing) {
            if (remainingUsage <= 0) break;
            
            const tierMax = tier.to === -1 ? remainingUsage : Math.min(remainingUsage, tier.to - tier.from);
            totalCost += tierMax * tier.unitPrice;
            remainingUsage -= tierMax;
          }
        } else {
          // Calcul simple
          totalCost = overageAmount * overageRate.unitPrice;
        }

        overageCosts.push({
          metric,
          baseLimit,
          actualUsage,
          overageAmount,
          unitPrice: overageRate.unitPrice,
          totalCost: Math.round(totalCost * 100) / 100 // Arrondir à 2 décimales
        });
      }
    });

    return overageCosts;
  }

  /**
   * Obtenir l'usage pour une période donnée
   */
  private async getUsageForPeriod(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<TenantUsage> {
    try {
      // Pour simplifier, on utilise l'usage actuel du tenant
      // Dans une implémentation complète, on devrait agréger les métriques historiques
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // TODO: Implémenter l'agrégation des métriques historiques
      // const historicalUsage = await this.aggregateHistoricalUsage(tenantId, periodStart, periodEnd);
      
      return tenant.usage;
    } catch (error) {
      console.error('Error getting usage for period:', error);
      return {
        users: 0,
        events: 0,
        storage: 0,
        apiCalls: 0
      };
    }
  }

  /**
   * Traiter les périodes de facturation en attente (job automatique)
   */
  async processPendingBillingPeriods(): Promise<{
    processed: number;
    invoiced: number;
    errors: number;
  }> {
    try {
      const results = {
        processed: 0,
        invoiced: 0,
        errors: 0
      };

      // Obtenir les périodes en attente
      const pendingSnapshot = await collections.billing_periods
        .where('status', '==', BillingPeriodStatus.CALCULATED)
        .limit(100) // Traiter par lots
        .get();

      for (const doc of pendingSnapshot.docs) {
        try {
          const billingPeriod = { id: doc.id, ...doc.data() } as UsageBillingPeriod;
          results.processed++;

          // Créer une facture si le coût total > 0
          if (billingPeriod.totalCost > 0) {
            // TODO: Intégrer avec le service de facturation (Stripe, etc.)
            // const invoice = await this.createInvoice(billingPeriod);
            
            await collections.billing_periods.doc(billingPeriod.id).update({
              status: BillingPeriodStatus.INVOICED,
              // invoiceId: invoice.id,
              updatedAt: new Date()
            });
            
            results.invoiced++;
          } else {
            // Marquer comme payé si pas de coût
            await collections.billing_periods.doc(billingPeriod.id).update({
              status: BillingPeriodStatus.PAID,
              updatedAt: new Date()
            });
          }
        } catch (error) {
          console.error(`Error processing billing period ${doc.id}:`, error);
          results.errors++;
        }
      }

      return results;
    } catch (error) {
      console.error('Error processing pending billing periods:', error);
      return {
        processed: 0,
        invoiced: 0,
        errors: 1
      };
    }
  }

  /**
   * Obtenir un aperçu des coûts d'overage pour un tenant
   */
  async getOveragePreview(tenantId: string): Promise<{
    currentUsage: TenantUsage;
    limits: SubscriptionPlan['limits'];
    projectedOverage: UsageOverageCost[];
    estimatedCost: number;
  }> {
    try {
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const subscription = await subscriptionLifecycleService.getActiveSubscriptionByTenant(tenantId);
      if (!subscription) {
        throw new TenantError(
          'No active subscription found',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      const plan = await subscriptionPlanService.getPlanById(subscription.planId);
      if (!plan) {
        throw new TenantError(
          'Plan not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const projectedOverage = await this.calculateOverageCosts(tenant.usage, plan);
      const estimatedCost = projectedOverage.reduce((sum, cost) => sum + cost.totalCost, 0);

      return {
        currentUsage: tenant.usage,
        limits: plan.limits,
        projectedOverage,
        estimatedCost
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error getting overage preview:', error);
      throw new TenantError(
        'Failed to get overage preview',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }
}

// Ajouter la collection billing_periods
// Note: Ceci devrait être ajouté dans database.ts
declare module '../../config/database' {
  interface Collections {
    billing_periods: any;
  }
}

// Instance singleton
export const usageBillingService = new UsageBillingService();
export default usageBillingService;