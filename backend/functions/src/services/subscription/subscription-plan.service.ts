/**
 * Service de gestion des plans d'abonnement
 * Gère les plans, leurs fonctionnalités et les comparaisons
 */


import { PlanType, SubscriptionPlan, TenantError, TenantErrorCode } from '../../common/types';
import { collections } from '../../config/database';
import { defaultPlans, initializeDefaultPlans } from '../../config/default-plans';


export interface PlanComparison {
  plans: SubscriptionPlan[];
  features: Array<{
    name: string;
    description: string;
    availability: Record<string, boolean | string | number>;
  }>;
  limits: Array<{
    name: string;
    description: string;
    values: Record<string, number | string>;
  }>;
}

export interface PlanUpgradeInfo {
  currentPlan: SubscriptionPlan;
  targetPlan: SubscriptionPlan;
  priceDifference: number;
  newFeatures: string[];
  increasedLimits: Array<{
    limit: string;
    currentValue: number;
    newValue: number;
  }>;
  isUpgrade: boolean;
}

export class SubscriptionPlanService {

  /**
   * Initialiser les plans par défaut
   */
  async initializePlans(): Promise<void> {
    await initializeDefaultPlans();
  }

  /**
   * Obtenir tous les plans actifs
   */
  async getActivePlans(): Promise<SubscriptionPlan[]> {
    try {
      const snapshot = await collections.subscription_plans
        .where('isActive', '==', true)
        .orderBy('price', 'asc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPlan));
    } catch (error) {
      console.error('Error getting active plans:', error);
      return defaultPlans.filter(plan => plan.isActive);
    }
  }

  /**
   * Obtenir un plan par ID
   */
  async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    try {
      const doc = await collections.subscription_plans.doc(planId).get();
      
      if (!doc.exists) {
        // Fallback vers les plans par défaut
        return defaultPlans.find(plan => plan.id === planId) || null;
      }

      return { id: doc.id, ...doc.data() } as SubscriptionPlan;
    } catch (error) {
      console.error('Error getting plan by ID:', error);
      return defaultPlans.find(plan => plan.id === planId) || null;
    }
  }

  /**
   * Obtenir un plan par type
   */
  async getPlanByType(type: PlanType): Promise<SubscriptionPlan | null> {
    try {
      const snapshot = await collections.subscription_plans
        .where('type', '==', type)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as SubscriptionPlan;
      }

      // Fallback vers les plans par défaut
      return defaultPlans.find(plan => plan.type === type && plan.isActive) || null;
    } catch (error) {
      console.error('Error getting plan by type:', error);
      return defaultPlans.find(plan => plan.type === type && plan.isActive) || null;
    }
  }

  /**
   * Créer un nouveau plan personnalisé
   */
  async createPlan(planData: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan> {
    try {
      // Vérifier que le type n'existe pas déjà
      const existingPlan = await this.getPlanByType(planData.type);
      if (existingPlan) {
        throw new TenantError(
          'Plan type already exists',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      const now = new Date();
      const plan: Omit<SubscriptionPlan, 'id'> = {
        ...planData,
        createdAt: now,
        updatedAt: now
      };

      const planRef = await collections.subscription_plans.add(plan);
      
      return {
        id: planRef.id,
        ...plan
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error creating plan:', error);
      throw new TenantError(
        'Failed to create plan',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Mettre à jour un plan
   */
  async updatePlan(
    planId: string, 
    updates: Partial<Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<SubscriptionPlan> {
    try {
      const existingPlan = await this.getPlanById(planId);
      if (!existingPlan) {
        throw new TenantError(
          'Plan not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await collections.subscription_plans.doc(planId).update(updateData);

      return {
        ...existingPlan,
        ...updateData
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error updating plan:', error);
      throw new TenantError(
        'Failed to update plan',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Désactiver un plan
   */
  async deactivatePlan(planId: string): Promise<boolean> {
    try {
      await collections.subscription_plans.doc(planId).update({
        isActive: false,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error deactivating plan:', error);
      return false;
    }
  }

  /**
   * Comparer les plans disponibles
   */
  async comparePlans(): Promise<PlanComparison> {
    try {
      const plans = await this.getActivePlans();
      
      // Définir les fonctionnalités à comparer
      const featureDefinitions = [
        {
          key: 'advancedReporting',
          name: 'Rapports avancés',
          description: 'Accès aux rapports détaillés et analytics'
        },
        {
          key: 'apiAccess',
          name: 'Accès API',
          description: 'Intégration via API REST'
        },
        {
          key: 'customBranding',
          name: 'Branding personnalisé',
          description: 'Logo et couleurs personnalisés'
        },
        {
          key: 'webhooks',
          name: 'Webhooks',
          description: 'Notifications en temps réel'
        },
        {
          key: 'ssoIntegration',
          name: 'SSO',
          description: 'Authentification unique'
        },
        {
          key: 'prioritySupport',
          name: 'Support prioritaire',
          description: 'Support technique prioritaire'
        }
      ];

      // Définir les limites à comparer
      const limitDefinitions = [
        {
          key: 'maxUsers',
          name: 'Utilisateurs',
          description: 'Nombre maximum d\'utilisateurs'
        },
        {
          key: 'maxEvents',
          name: 'Événements',
          description: 'Nombre maximum d\'événements'
        },
        {
          key: 'maxStorage',
          name: 'Stockage',
          description: 'Espace de stockage (MB)'
        },
        {
          key: 'apiCallsPerMonth',
          name: 'Appels API/mois',
          description: 'Nombre d\'appels API par mois'
        }
      ];

      // Construire la comparaison des fonctionnalités
      const features = featureDefinitions.map(feature => {
        const availability: Record<string, boolean | string | number> = {};
        
        plans.forEach(plan => {
          availability[plan.id] = plan.features[feature.key as keyof typeof plan.features];
        });

        return {
          name: feature.name,
          description: feature.description,
          availability
        };
      });

      // Construire la comparaison des limites
      const limits = limitDefinitions.map(limit => {
        const values: Record<string, number | string> = {};
        
        plans.forEach(plan => {
          const value = plan.limits[limit.key as keyof typeof plan.limits];
          values[plan.id] = value === -1 ? 'Illimité' : value;
        });

        return {
          name: limit.name,
          description: limit.description,
          values
        };
      });

      return {
        plans,
        features,
        limits
      };
    } catch (error) {
      console.error('Error comparing plans:', error);
      throw new TenantError(
        'Failed to compare plans',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir les informations de mise à niveau entre deux plans
   */
  async getPlanUpgradeInfo(currentPlanId: string, targetPlanId: string): Promise<PlanUpgradeInfo> {
    try {
      const [currentPlan, targetPlan] = await Promise.all([
        this.getPlanById(currentPlanId),
        this.getPlanById(targetPlanId)
      ]);

      if (!currentPlan || !targetPlan) {
        throw new TenantError(
          'Plan not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const priceDifference = targetPlan.price - currentPlan.price;
      const isUpgrade = priceDifference > 0;

      // Identifier les nouvelles fonctionnalités
      const newFeatures: string[] = [];
      Object.keys(targetPlan.features).forEach(feature => {
        const featureKey = feature as keyof typeof targetPlan.features;
        if (targetPlan.features[featureKey] && !currentPlan.features[featureKey]) {
          newFeatures.push(feature);
        }
      });

      // Identifier les limites augmentées
      const increasedLimits: PlanUpgradeInfo['increasedLimits'] = [];
      Object.keys(targetPlan.limits).forEach(limit => {
        const limitKey = limit as keyof typeof targetPlan.limits;
        const currentValue = currentPlan.limits[limitKey];
        const newValue = targetPlan.limits[limitKey];
        
        if (newValue > currentValue || (newValue === -1 && currentValue !== -1)) {
          increasedLimits.push({
            limit,
            currentValue,
            newValue
          });
        }
      });

      return {
        currentPlan,
        targetPlan,
        priceDifference,
        newFeatures,
        increasedLimits,
        isUpgrade
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error getting plan upgrade info:', error);
      throw new TenantError(
        'Failed to get plan upgrade info',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Vérifier si une fonctionnalité est disponible dans un plan
   */
  async isFeatureAvailable(planId: string, feature: keyof SubscriptionPlan['features']): Promise<boolean> {
    try {
      const plan = await this.getPlanById(planId);
      return plan ? plan.features[feature] : false;
    } catch (error) {
      console.error('Error checking feature availability:', error);
      return false;
    }
  }

  /**
   * Vérifier si une limite est dépassée
   */
  async isLimitExceeded(
    planId: string, 
    limitType: keyof SubscriptionPlan['limits'], 
    currentValue: number
  ): Promise<boolean> {
    try {
      const plan = await this.getPlanById(planId);
      if (!plan) {return true;}

      const limit = plan.limits[limitType];
      if (limit === -1) {return false;} // Illimité

      return currentValue >= limit;
    } catch (error) {
      console.error('Error checking limit:', error);
      return true; // En cas d'erreur, considérer comme dépassé par sécurité
    }
  }

  /**
   * Obtenir le plan recommandé pour un tenant basé sur son usage
   */
  async getRecommendedPlan(currentUsage: {
    users: number;
    events: number;
    storage: number;
    apiCalls: number;
  }): Promise<SubscriptionPlan | null> {
    try {
      const plans = await this.getActivePlans();
      
      // Trouver le plan le moins cher qui peut accommoder l'usage actuel
      const suitablePlans = plans.filter(plan => {
        return (plan.limits.maxUsers === -1 || plan.limits.maxUsers >= currentUsage.users) &&
               (plan.limits.maxEvents === -1 || plan.limits.maxEvents >= currentUsage.events) &&
               (plan.limits.maxStorage === -1 || plan.limits.maxStorage >= currentUsage.storage) &&
               (plan.limits.apiCallsPerMonth === -1 || plan.limits.apiCallsPerMonth >= currentUsage.apiCalls);
      });

      if (suitablePlans.length === 0) {
        return null; // Aucun plan ne peut accommoder l'usage
      }

      // Retourner le plan le moins cher
      return suitablePlans.reduce((cheapest, current) => 
        current.price < cheapest.price ? current : cheapest
      );
    } catch (error) {
      console.error('Error getting recommended plan:', error);
      return null;
    }
  }

  /**
   * Obtenir les statistiques d'utilisation des plans
   */
  async getPlanUsageStats(): Promise<Record<string, {
    activeSubscriptions: number;
    totalRevenue: number;
    averageUsage: {
      users: number;
      events: number;
      storage: number;
      apiCalls: number;
    };
  }>> {
    try {
      const plans = await this.getActivePlans();
      const stats: Record<string, any> = {};

      for (const plan of plans) {
        // Compter les tenants actifs avec ce plan
        const tenantsSnapshot = await collections.tenants
          .where('planId', '==', plan.id)
          .where('status', 'in', ['active', 'trial'])
          .get();

        const activeSubscriptions = tenantsSnapshot.size;
        const totalRevenue = activeSubscriptions * plan.price;

        // Calculer l'usage moyen (simplifié)
        const totalUsage = {
          users: 0,
          events: 0,
          storage: 0,
          apiCalls: 0
        };

        tenantsSnapshot.docs.forEach(doc => {
          const tenant = doc.data();
          if (tenant.usage) {
            totalUsage.users += tenant.usage.users || 0;
            totalUsage.events += tenant.usage.events || 0;
            totalUsage.storage += tenant.usage.storage || 0;
            totalUsage.apiCalls += tenant.usage.apiCalls || 0;
          }
        });

        const averageUsage = {
          users: activeSubscriptions > 0 ? Math.round(totalUsage.users / activeSubscriptions) : 0,
          events: activeSubscriptions > 0 ? Math.round(totalUsage.events / activeSubscriptions) : 0,
          storage: activeSubscriptions > 0 ? Math.round(totalUsage.storage / activeSubscriptions) : 0,
          apiCalls: activeSubscriptions > 0 ? Math.round(totalUsage.apiCalls / activeSubscriptions) : 0
        };

        stats[plan.id] = {
          activeSubscriptions,
          totalRevenue,
          averageUsage
        };
      }

      return stats;
    } catch (error) {
      console.error('Error getting plan usage stats:', error);
      return {};
    }
  }
}

// Instance singleton
export const subscriptionPlanService = new SubscriptionPlanService();
export default subscriptionPlanService;