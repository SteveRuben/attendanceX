import { apiClient } from './apiClient';

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
   */
  async getPublicPlans(): Promise<PlansResponse> {
    try {
      // apiClient.request() already extracts the 'data' field from the response
      // So we get PlansResponse directly, not { success: true, data: PlansResponse }
      const response = await apiClient.get<PlansResponse>('/public/plans', {
        withAuth: false
      });
      
      return response;
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }
  }
};
