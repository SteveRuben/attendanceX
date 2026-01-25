import { apiClient } from './apiClient';
import { clientCache } from '@/lib/cache';

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  limits: {
    users?: number;
    events?: number;
    storage?: number;
  };
  popular?: boolean;
}

export interface PlansResponse {
  plans: Plan[];
  currency: string;
  billingCycles: string[];
}

export const plansService = {
  /**
   * Récupère tous les plans disponibles depuis le backend
   * Utilise le cache pour améliorer les performances
   */
  async getPublicPlans(): Promise<PlansResponse> {
    const CACHE_KEY = 'public-plans';
    const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
    
    try {
      // Vérifier le cache d'abord
      const cached = clientCache.get<PlansResponse>(CACHE_KEY);
      if (cached) {
        console.log('📦 Plans loaded from cache');
        return cached;
      }

      console.log('🌐 Fetching plans from API...');
      const startTime = Date.now();
      
      // apiClient.request() already extracts the 'data' field from the response
      // So we get PlansResponse directly, not { success: true, data: PlansResponse }
      const response = await apiClient.get<PlansResponse>('/public/plans', {
        withAuth: false
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Plans fetched in ${duration}ms`);
      
      // Mettre en cache pour 10 minutes
      clientCache.set(CACHE_KEY, response, CACHE_TTL);
      
      return response;
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }
  },

  /**
   * Invalider le cache des plans
   * Utile après une mise à jour des plans
   */
  invalidateCache(): void {
    clientCache.delete('public-plans');
    console.log('🗑️ Plans cache invalidated');
  }
};
