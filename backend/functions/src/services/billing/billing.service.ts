/**
 * Service principal de facturation
 * Gère les plans, abonnements et facturation
 */

import { collections } from '../../config/database';
import { SubscriptionPlan, PlanType } from '../../common/types';
import { defaultPlans } from '../../config/default-plans';
import { ERROR_CODES } from '../../common/constants';
import { AuthErrorHandler } from '../../utils/auth';

export interface CreatePlanRequest {
  name: string;
  price: number;
  currency: string;
  type: PlanType;
  limits: {
    maxUsers: number;
    maxEvents: number;
    maxStorage: number;
    apiCallsPerMonth: number;
  };
  features: {
    advancedReporting: boolean;
    apiAccess: boolean;
    customBranding: boolean;
    webhooks: boolean;
    ssoIntegration: boolean;
    prioritySupport: boolean;
  };
  isActive?: boolean;
}

export interface UpdatePlanRequest {
  name?: string;
  price?: number;
  currency?: string;
  limits?: Partial<SubscriptionPlan['limits']>;
  features?: Partial<SubscriptionPlan['features']>;
  isActive?: boolean;
}

export interface PlanListOptions {
  isActive?: boolean;
  type?: PlanType;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'name' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export class BillingService {

  /**
   * Initialiser les plans par défaut si la base est vide
   */
  async initializeDefaultPlansIfEmpty(): Promise<void> {
    try {
      const existingPlans = await collections.subscription_plans.limit(1).get();
      
      if (existingPlans.empty) {
        console.log('🔄 Base de données vide, initialisation des plans par défaut...');
        
        for (const plan of defaultPlans) {
          await collections.subscription_plans.doc(plan.id).set({
            ...plan,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`✅ Plan ${plan.name} créé avec succès`);
        }
        
        console.log('✅ Tous les plans par défaut ont été initialisés');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des plans par défaut:', error);
      throw AuthErrorHandler.createErrorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to initialize default plans'
      );
    }
  }

  /**
   * Obtenir tous les plans disponibles
   */
  async getPlans(options: PlanListOptions = {}): Promise<SubscriptionPlan[]> {
    try {
      // S'assurer que les plans par défaut existent
      await this.initializeDefaultPlansIfEmpty();

      let query = collections.subscription_plans.where('isActive', '==', true);

      // Appliquer les filtres
      if (options.isActive !== undefined) {
        query = query.where('isActive', '==', options.isActive);
      }

      if (options.type) {
        query = query.where('type', '==', options.type);
      }

      // Appliquer le tri
      const sortBy = options.sortBy || 'price';
      const sortOrder = options.sortOrder || 'asc';
      query = query.orderBy(sortBy, sortOrder);

      const snapshot = await query.get();
      let plans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SubscriptionPlan[];

      // Filtrer par prix côté client (Firestore ne supporte pas les requêtes de plage complexes)
      if (options.minPrice !== undefined) {
        plans = plans.filter(plan => plan.price >= options.minPrice!);
      }

      if (options.maxPrice !== undefined) {
        plans = plans.filter(plan => plan.price <= options.maxPrice!);
      }

      return plans;
    } catch (error) {
      console.error('Error getting plans:', error);
      throw AuthErrorHandler.createErrorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,'Failed to get plans'
      );
    }
  }

  /**
   * Obtenir un plan par ID
   */
  async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    try {
      // S'assurer que les plans par défaut existent
      await this.initializeDefaultPlansIfEmpty();

      const doc = await collections.subscription_plans.doc(planId).get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data()
      } as SubscriptionPlan;
    } catch (error) {
      console.error('Error getting plan by ID:', error);
      throw  AuthErrorHandler.createErrorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to get plan'
      );
    }
  }

  /**
   * Créer un nouveau plan
   */
  async createPlan(request: CreatePlanRequest): Promise<SubscriptionPlan> {
    try {
      // Valider les données
      await this.validatePlanRequest(request);

      // Générer un ID unique
      const planId = this.generatePlanId(request.name);

      // Vérifier que l'ID n'existe pas déjà
      const existingPlan = await this.getPlanById(planId);
      if (existingPlan) {
        throw  AuthErrorHandler.createErrorResponse(
          ERROR_CODES.CONFLICT,'Plan with this name already exists'
        );
      }

      const now = new Date();
      const planData: SubscriptionPlan = {
        id: planId,
        name: request.name,
        price: request.price,
        currency: request.currency,
        type: request.type,
        limits: request.limits,
        features: request.features,
        isActive: request.isActive !== undefined ? request.isActive : true,
        createdAt: now,
        updatedAt: now
      };

      // Sauvegarder dans Firestore
      await collections.subscription_plans.doc(planId).set(planData);

      return planData;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      console.error('Error creating plan:', error);
      throw  AuthErrorHandler.createErrorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,'Failed to create plan'
      );
    }
  }

  /**
   * Mettre à jour un plan
   */
  async updatePlan(planId: string, updates: UpdatePlanRequest): Promise<SubscriptionPlan> {
    try {
      // Vérifier que le plan existe
      const existingPlan = await this.getPlanById(planId);
      if (!existingPlan) {
        throw  AuthErrorHandler.createErrorResponse(
           ERROR_CODES.NOT_FOUND,'Plan not found'
         
        );
      }

      // Préparer les données de mise à jour
      const updateData: any = {
        ...updates,
        updatedAt: new Date()
      };

      // Fusionner les limites et fonctionnalités partielles
      if (updates.limits) {
        updateData.limits = {
          ...existingPlan.limits,
          ...updates.limits
        };
      }

      if (updates.features) {
        updateData.features = {
          ...existingPlan.features,
          ...updates.features
        };
      }

      // Mettre à jour dans Firestore
      await collections.subscription_plans.doc(planId).update(updateData);

      // Retourner le plan mis à jour
      const updatedPlan = await this.getPlanById(planId);
      return updatedPlan!;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      console.error('Error updating plan:', error);
      throw  AuthErrorHandler.createErrorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,'Failed to update plan'
        
      );
    }
  }

  /**
   * Supprimer un plan (soft delete)
   */
  async deletePlan(planId: string): Promise<boolean> {
    try {
      // Vérifier que le plan existe
      const existingPlan = await this.getPlanById(planId);
      if (!existingPlan) {
        throw  AuthErrorHandler.createErrorResponse(
          ERROR_CODES.NOT_FOUND,'Plan not found'
        );
      }

      // Vérifier qu'aucun tenant n'utilise ce plan
      const tenantsUsingPlan = await collections.tenants
        .where('planId', '==', planId)
        .limit(1)
        .get();

      if (!tenantsUsingPlan.empty) {
        throw  AuthErrorHandler.createErrorResponse(
          ERROR_CODES.CONFLICT,'Cannot delete plan that is currently in use'
          
        );
      }

      // Désactiver le plan au lieu de le supprimer
      await collections.subscription_plans.doc(planId).update({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date()
      });

      return true;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      console.error('Error deleting plan:', error);
      throw  AuthErrorHandler.createErrorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,'Failed to delete plan'
      );
    }
  }

  /**
   * Obtenir le plan gratuit par défaut
   */
  async getFreePlan(): Promise<SubscriptionPlan> {
    try {
      // S'assurer que les plans par défaut existent
      await this.initializeDefaultPlansIfEmpty();

      const plans = await this.getPlans({ type: PlanType.FREE });
      const freePlan = plans.find(plan => plan.type === PlanType.FREE);

      if (!freePlan) {
        throw  AuthErrorHandler.createErrorResponse(
          ERROR_CODES.NOT_FOUND,'Free plan not found'
          
        );
      }

      return freePlan;
    } catch (error) {
      console.error('Error getting free plan:', error);
      throw  AuthErrorHandler.createErrorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,'Failed to get free plan'
      );
    }
  }

  /**
   * Vérifier si une fonctionnalité est disponible dans un plan
   */
  async isPlanFeatureAvailable(planId: string, feature: keyof SubscriptionPlan['features']): Promise<boolean> {
    try {
      const plan = await this.getPlanById(planId);
      return plan ? plan.features[feature] : false;
    } catch (error) {
      console.error('Error checking plan feature:', error);
      return false;
    }
  }

  /**
   * Vérifier si une limite est dépassée
   */
  async isPlanLimitExceeded(planId: string, limitType: keyof SubscriptionPlan['limits'], currentValue: number): Promise<boolean> {
    try {
      const plan = await this.getPlanById(planId);
      if (!plan) return true;

      const limit = plan.limits[limitType];
      if (limit === -1) return false; // Unlimited

      return currentValue >= limit;
    } catch (error) {
      console.error('Error checking plan limit:', error);
      return true; // En cas d'erreur, considérer comme dépassé par sécurité
    }
  }

  /**
   * Obtenir les statistiques des plans
   */
  async getPlanStats(): Promise<{
    totalPlans: number;
    activePlans: number;
    plansByType: Record<PlanType, number>;
    averagePrice: number;
    mostPopularPlan: string | null;
  }> {
    try {
      const allPlans = await collections.subscription_plans.get();
      const plans = allPlans.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SubscriptionPlan[];

      const activePlans = plans.filter(plan => plan.isActive);
      
      // Compter par type
      const plansByType: Record<PlanType, number> = {
        [PlanType.FREE]: 0,
        [PlanType.BASIC]: 0,
        [PlanType.PRO]: 0,
        [PlanType.ENTERPRISE]: 0
      };

      activePlans.forEach(plan => {
        plansByType[plan.type] = (plansByType[plan.type] || 0) + 1;
      });

      // Calculer le prix moyen
      const totalPrice = activePlans.reduce((sum, plan) => sum + plan.price, 0);
      const averagePrice = activePlans.length > 0 ? totalPrice / activePlans.length : 0;

      // Trouver le plan le plus populaire (basé sur l'utilisation par les tenants)
      const tenantPlans = await collections.tenants.get();
      const planUsage: Record<string, number> = {};
      
      tenantPlans.docs.forEach(doc => {
        const tenant = doc.data();
        const planId = tenant.planId;
        planUsage[planId] = (planUsage[planId] || 0) + 1;
      });

      const mostPopularPlan = Object.keys(planUsage).reduce((a, b) => 
        planUsage[a] > planUsage[b] ? a : b, null
      );

      return {
        totalPlans: plans.length,
        activePlans: activePlans.length,
        plansByType,
        averagePrice,
        mostPopularPlan
      };
    } catch (error) {
      console.error('Error getting plan stats:', error);
      throw  AuthErrorHandler.createErrorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,'Failed to get plan statistics'
        
      );
    }
  }

  // Méthodes privées

  private async validatePlanRequest(request: CreatePlanRequest): Promise<void> {
    const errors: string[] = [];

    if (!request.name?.trim()) {
      errors.push('Plan name is required');
    }

    if (request.price < 0) {
      errors.push('Price cannot be negative');
    }

    if (!request.currency?.trim()) {
      errors.push('Currency is required');
    }

    if (!Object.values(PlanType).includes(request.type)) {
      errors.push('Invalid plan type');
    }

    if (!request.limits) {
      errors.push('Plan limits are required');
    } else {
      if (request.limits.maxUsers < -1) {
        errors.push('Max users must be -1 (unlimited) or positive');
      }
      if (request.limits.maxEvents < -1) {
        errors.push('Max events must be -1 (unlimited) or positive');
      }
      if (request.limits.maxStorage < -1) {
        errors.push('Max storage must be -1 (unlimited) or positive');
      }
      if (request.limits.apiCallsPerMonth < -1) {
        errors.push('API calls per month must be -1 (unlimited) or positive');
      }
    }

    if (!request.features) {
      errors.push('Plan features are required');
    }

    if (errors.length > 0) {
      throw  AuthErrorHandler.createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,`Validation failed: ${errors.join(', ')}`
      );
    }
  }

  private generatePlanId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Obtenir l'abonnement actuel d'un tenant
   */
  async getCurrentSubscription(tenantId: string): Promise<{
    tenantId: string;
    planId: string;
    status: string;
    startDate: Date;
    nextBillingDate?: Date;
    billingCycle?: string;
    amount?: number;
    currency?: string;
  }> {
    try {
      // Récupérer les informations du tenant
      const tenantDoc = await collections.tenants.doc(tenantId).get();
      if (!tenantDoc.exists) {
        throw AuthErrorHandler.createErrorResponse(
          ERROR_CODES.NOT_FOUND,
          'Tenant not found'
        );
      }

      const tenant = tenantDoc.data();
      const planId = tenant.planId || 'free';

      // Récupérer les détails du plan
      const plan = await this.getPlanById(planId);
      if (!plan) {
        throw AuthErrorHandler.createErrorResponse(
          ERROR_CODES.NOT_FOUND,
          'Plan not found'
        );
      }

      // Récupérer l'abonnement depuis la collection subscriptions
      const subscriptionQuery = await collections.subscriptions
        .where('tenantId', '==', tenantId)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      let subscription;
      if (!subscriptionQuery.empty) {
        const subscriptionDoc = subscriptionQuery.docs[0];
        const subscriptionData = subscriptionDoc.data();
        
        subscription = {
          tenantId,
          planId: subscriptionData.planId,
          status: subscriptionData.status,
          startDate: subscriptionData.startDate.toDate(),
          nextBillingDate: subscriptionData.nextBillingDate?.toDate(),
          billingCycle: subscriptionData.billingCycle,
          amount: subscriptionData.amount,
          currency: subscriptionData.currency || plan.currency
        };
      } else {
        // Abonnement par défaut si aucun trouvé
        subscription = {
          tenantId,
          planId,
          status: 'active',
          startDate: tenant.createdAt?.toDate() || new Date(),
          billingCycle: 'monthly',
          amount: plan.price,
          currency: plan.currency
        };
      }

      return subscription;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      console.error('Error getting current subscription:', error);
      throw AuthErrorHandler.createErrorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to get current subscription'
      );
    }
  }

  /**
   * Changer le plan d'abonnement d'un tenant
   */
  async changePlan(
    tenantId: string, 
    newPlanId: string, 
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    ipAddress?: string
  ): Promise<{
    tenantId: string;
    oldPlanId: string;
    newPlanId: string;
    billingCycle: string;
    effectiveDate: Date;
    prorationAmount?: number;
  }> {
    try {
      // Vérifier que le tenant existe
      const tenantDoc = await collections.tenants.doc(tenantId).get();
      if (!tenantDoc.exists) {
        throw AuthErrorHandler.createErrorResponse(
          ERROR_CODES.NOT_FOUND,
          'Tenant not found'
        );
      }

      const tenant = tenantDoc.data();
      const oldPlanId = tenant.planId || 'free';

      // Vérifier que le nouveau plan existe
      const newPlan = await this.getPlanById(newPlanId);
      if (!newPlan) {
        throw AuthErrorHandler.createErrorResponse(
          ERROR_CODES.NOT_FOUND,
          'New plan not found'
        );
      }

      // Vérifier que ce n'est pas le même plan
      if (oldPlanId === newPlanId) {
        throw AuthErrorHandler.createErrorResponse(
          ERROR_CODES.BAD_REQUEST,
          'Cannot change to the same plan'
        );
      }

      const effectiveDate = new Date();

      // Mettre à jour le tenant avec le nouveau plan
      await collections.tenants.doc(tenantId).update({
        planId: newPlanId,
        updatedAt: effectiveDate
      });

      // Créer ou mettre à jour l'abonnement
      const subscriptionData = {
        tenantId,
        planId: newPlanId,
        status: 'active',
        billingCycle,
        amount: newPlan.price,
        currency: newPlan.currency,
        startDate: effectiveDate,
        nextBillingDate: this.calculateNextBillingDate(effectiveDate, billingCycle),
        updatedAt: effectiveDate
      };

      // Chercher un abonnement existant
      const existingSubscriptionQuery = await collections.subscriptions
        .where('tenantId', '==', tenantId)
        .limit(1)
        .get();

      if (!existingSubscriptionQuery.empty) {
        // Mettre à jour l'abonnement existant
        const subscriptionDoc = existingSubscriptionQuery.docs[0];
        await subscriptionDoc.ref.update(subscriptionData);
      } else {
        // Créer un nouvel abonnement
        await collections.subscriptions.add({
          ...subscriptionData,
          createdAt: effectiveDate
        });
      }

      // Enregistrer l'historique du changement
      await collections.billing_history.add({
        tenantId,
        type: 'plan_change',
        description: `Plan changed from ${oldPlanId} to ${newPlanId}`,
        oldPlanId,
        newPlanId,
        billingCycle,
        amount: newPlan.price,
        currency: newPlan.currency,
        ipAddress,
        createdAt: effectiveDate
      });

      return {
        tenantId,
        oldPlanId,
        newPlanId,
        billingCycle,
        effectiveDate,
        prorationAmount: 0 // TODO: Calculer la proration si nécessaire
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      console.error('Error changing plan:', error);
      throw AuthErrorHandler.createErrorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to change plan'
      );
    }
  }

  /**
   * Obtenir l'historique de facturation d'un tenant
   */
  async getBillingHistory(
    tenantId: string, 
    options: { page: number; limit: number }
  ): Promise<{
    tenantId: string;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    invoices: any[];
  }> {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      // Compter le total
      const totalSnapshot = await collections.billing_history
        .where('tenantId', '==', tenantId)
        .get();
      const total = totalSnapshot.size;

      // Récupérer les données avec pagination
      const historyQuery = await collections.billing_history
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc')
        .offset(offset)
        .limit(limit)
        .get();

      const invoices = historyQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      return {
        tenantId,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        invoices
      };
    } catch (error) {
      console.error('Error getting billing history:', error);
      throw AuthErrorHandler.createErrorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to get billing history'
      );
    }
  }

  /**
   * Annuler l'abonnement d'un tenant
   */
  async cancelSubscription(
    tenantId: string, 
    reason?: string, 
    ipAddress?: string
  ): Promise<{
    tenantId: string;
    cancelledAt: Date;
    reason?: string;
    refundAmount?: number;
  }> {
    try {
      // Vérifier que le tenant existe
      const tenantDoc = await collections.tenants.doc(tenantId).get();
      if (!tenantDoc.exists) {
        throw AuthErrorHandler.createErrorResponse(
          ERROR_CODES.NOT_FOUND,
          'Tenant not found'
        );
      }

      const cancelledAt = new Date();

      // Mettre à jour le tenant vers le plan gratuit
      const freePlan = await this.getFreePlan();
      await collections.tenants.doc(tenantId).update({
        planId: freePlan.id,
        updatedAt: cancelledAt
      });

      // Mettre à jour l'abonnement
      const subscriptionQuery = await collections.subscriptions
        .where('tenantId', '==', tenantId)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!subscriptionQuery.empty) {
        const subscriptionDoc = subscriptionQuery.docs[0];
        await subscriptionDoc.ref.update({
          status: 'cancelled',
          cancelledAt,
          cancelReason: reason,
          updatedAt: cancelledAt
        });
      }

      // Enregistrer l'historique
      await collections.billing_history.add({
        tenantId,
        type: 'subscription_cancelled',
        description: `Subscription cancelled${reason ? `: ${reason}` : ''}`,
        reason,
        ipAddress,
        createdAt: cancelledAt
      });

      return {
        tenantId,
        cancelledAt,
        reason,
        refundAmount: 0 // TODO: Calculer le remboursement si applicable
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      console.error('Error cancelling subscription:', error);
      throw AuthErrorHandler.createErrorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to cancel subscription'
      );
    }
  }

  /**
   * Obtenir les statistiques d'utilisation d'un tenant
   */
  async getUsageStats(tenantId: string): Promise<{
    tenantId: string;
    currentPeriod: {
      users: number;
      events: number;
      storage: number;
      apiCalls: number;
    };
    limits: {
      users: number;
      events: number;
      storage: number;
      apiCalls: number;
    };
    percentageUsed: {
      users: number;
      events: number;
      storage: number;
      apiCalls: number;
    };
  }> {
    try {
      // Récupérer les informations du tenant
      const tenantDoc = await collections.tenants.doc(tenantId).get();
      if (!tenantDoc.exists) {
        throw AuthErrorHandler.createErrorResponse(
          ERROR_CODES.NOT_FOUND,
          'Tenant not found'
        );
      }

      const tenant = tenantDoc.data();
      const planId = tenant.planId || 'free';

      // Récupérer les limites du plan
      const plan = await this.getPlanById(planId);
      if (!plan) {
        throw AuthErrorHandler.createErrorResponse(
          ERROR_CODES.NOT_FOUND,
          'Plan not found'
        );
      }

      // Récupérer l'utilisation actuelle depuis le tenant
      const usage = tenant.usage || {
        users: 0,
        events: 0,
        storage: 0,
        apiCalls: 0
      };

      const limits = plan.limits;

      // Calculer les pourcentages d'utilisation
      const percentageUsed = {
        users: limits.maxUsers === -1 ? 0 : Math.min((usage.users / limits.maxUsers) * 100, 100),
        events: limits.maxEvents === -1 ? 0 : Math.min((usage.events / limits.maxEvents) * 100, 100),
        storage: limits.maxStorage === -1 ? 0 : Math.min((usage.storage / limits.maxStorage) * 100, 100),
        apiCalls: limits.apiCallsPerMonth === -1 ? 0 : Math.min((usage.apiCalls / limits.apiCallsPerMonth) * 100, 100)
      };

      return {
        tenantId,
        currentPeriod: {
          users: usage.users,
          events: usage.events,
          storage: usage.storage,
          apiCalls: usage.apiCalls
        },
        limits: {
          users: limits.maxUsers,
          events: limits.maxEvents,
          storage: limits.maxStorage,
          apiCalls: limits.apiCallsPerMonth
        },
        percentageUsed
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      console.error('Error getting usage stats:', error);
      throw AuthErrorHandler.createErrorResponse(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to get usage statistics'
      );
    }
  }

  /**
   * Calculer la prochaine date de facturation
   */
  private calculateNextBillingDate(startDate: Date, billingCycle: string): Date {
    const nextDate = new Date(startDate);
    
    if (billingCycle === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    return nextDate;
  }
}

// Ajouter les collections manquantes
declare module '../../config/database' {
  interface Collections {
    subscriptions: any;
    billing_history: any;
  }
}

// Instance singleton
export const billingService = new BillingService();
export default billingService;