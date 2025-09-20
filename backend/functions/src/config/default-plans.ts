/**
 * Plans d'abonnement par défaut pour le système multi-tenant
 */

import { PlanType, SubscriptionPlan } from '../common/types';
import { collections } from './database';

export const defaultPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'EUR',
    type: PlanType.FREE,
    limits: {
      maxUsers: 5,
      maxEvents: 10,
      maxStorage: 100, // 100 MB
      apiCallsPerMonth: 1000
    },
    features: {
      advancedReporting: false,
      apiAccess: false,
      customBranding: false,
      webhooks: false,
      ssoIntegration: false,
      prioritySupport: false
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    currency: 'EUR',
    type: PlanType.BASIC,
    limits: {
      maxUsers: 25,
      maxEvents: 100,
      maxStorage: 1000, // 1 GB
      apiCallsPerMonth: 10000
    },
    features: {
      advancedReporting: true,
      apiAccess: true,
      customBranding: false,
      webhooks: false,
      ssoIntegration: false,
      prioritySupport: false
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    currency: 'EUR',
    type: PlanType.PRO,
    limits: {
      maxUsers: 100,
      maxEvents: 500,
      maxStorage: 5000, // 5 GB
      apiCallsPerMonth: 50000
    },
    features: {
      advancedReporting: true,
      apiAccess: true,
      customBranding: true,
      webhooks: true,
      ssoIntegration: false,
      prioritySupport: true
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    currency: 'EUR',
    type: PlanType.ENTERPRISE,
    limits: {
      maxUsers: -1, // Unlimited
      maxEvents: -1, // Unlimited
      maxStorage: 50000, // 50 GB
      apiCallsPerMonth: 500000
    },
    features: {
      advancedReporting: true,
      apiAccess: true,
      customBranding: true,
      webhooks: true,
      ssoIntegration: true,
      prioritySupport: true
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

/**
 * Fonction pour initialiser les plans par défaut dans Firestore
 */
export async function initializeDefaultPlans() {
  
  for (const plan of defaultPlans) {
    try {
      const planDoc = await collections.subscription_plans.doc(plan.id).get();
      if (!planDoc.exists) {
        await collections.subscription_plans.doc(plan.id).set(plan);
        console.log(`✅ Plan ${plan.name} créé avec succès`);
      } else {
        console.log(`ℹ️ Plan ${plan.name} existe déjà`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la création du plan ${plan.name}:`, error);
    }
  }
}

/**
 * Fonction pour obtenir un plan par son ID
 */
export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return defaultPlans.find(plan => plan.id === planId);
}

/**
 * Fonction pour obtenir le plan gratuit par défaut
 */
export function getFreePlan(): SubscriptionPlan {
  return defaultPlans.find(plan => plan.type === PlanType.FREE)!;
}

/**
 * Fonction pour vérifier si une fonctionnalité est disponible dans un plan
 */
export function isPlanFeatureAvailable(planId: string, feature: keyof SubscriptionPlan['features']): boolean {
  const plan = getPlanById(planId);
  return plan ? plan.features[feature] : false;
}

/**
 * Fonction pour vérifier si une limite est respectée
 */
export function isPlanLimitExceeded(planId: string, limitType: keyof SubscriptionPlan['limits'], currentValue: number): boolean {
  const plan = getPlanById(planId);
  if (!plan) {return true;}
  
  const limit = plan.limits[limitType];
  if (limit === -1) {return false;} // Unlimited
  
  return currentValue >= limit;
}

export default {
  defaultPlans,
  initializeDefaultPlans,
  getPlanById,
  getFreePlan,
  isPlanFeatureAvailable,
  isPlanLimitExceeded
};