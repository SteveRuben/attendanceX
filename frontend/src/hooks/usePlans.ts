import { useState, useEffect } from 'react';
import { API_ENDPOINTS, apiCall, ApiResponse } from '@/services/api';

export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: number;
}

export interface PlanLimits {
  users: number;
  events: number;
  storage: number;
}

export interface PlanMetadata {
  popular?: boolean;
  trial_days?: number;
  setup_fee?: number;
  most_popular?: boolean;
  custom_pricing?: boolean;
  contact_sales?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  price: string;
  priceAmount: number | null;
  currency: string;
  interval: string;
  description: string;
  features: PlanFeature[];
  limits: PlanLimits;
  recommended: boolean;
  active: boolean;
  metadata: PlanMetadata;
}

export interface UsePlansReturn {
  plans: Plan[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const usePlans = (): UsePlansReturn => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const result: ApiResponse<Plan[]> = await apiCall(API_ENDPOINTS.PLANS.LIST);

      if (result.success && result.data) {
        setPlans(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch plans');
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch plans');
      
      // Fallback vers des données statiques en cas d'erreur
      setPlans(getFallbackPlans());
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchPlans();
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return {
    plans,
    loading,
    error,
    refetch
  };
};

// Données de fallback en cas d'erreur API
const getFallbackPlans = (): Plan[] => [
  {
    id: 'basic',
    name: 'Basic',
    price: 'Free',
    priceAmount: 0,
    currency: 'USD',
    interval: 'month',
    description: 'Perfect for small teams getting started',
    features: [
      { name: 'Up to 10 users', included: true, limit: 10 },
      { name: 'Basic event management', included: true },
      { name: 'Simple attendance tracking', included: true },
      { name: 'Email support', included: true },
      { name: 'Basic reporting', included: true }
    ],
    limits: {
      users: 10,
      events: 50,
      storage: 1024
    },
    recommended: false,
    active: true,
    metadata: {
      popular: false,
      trial_days: 0,
      setup_fee: 0
    }
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$29/month',
    priceAmount: 2900,
    currency: 'USD',
    interval: 'month',
    description: 'For growing teams that need more features',
    features: [
      { name: 'Up to 100 users', included: true, limit: 100 },
      { name: 'Advanced event management', included: true },
      { name: 'QR code attendance', included: true },
      { name: 'Priority support', included: true },
      { name: 'Advanced reporting', included: true },
      { name: 'Payment processing', included: true },
      { name: 'Email campaigns', included: true }
    ],
    limits: {
      users: 100,
      events: 500,
      storage: 10240
    },
    recommended: true,
    active: true,
    metadata: {
      popular: true,
      trial_days: 14,
      setup_fee: 0,
      most_popular: true
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Contact us',
    priceAmount: null,
    currency: 'USD',
    interval: 'month',
    description: 'For large organizations with custom needs',
    features: [
      { name: 'Unlimited users', included: true, limit: -1 },
      { name: 'Custom integrations', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'API access', included: true },
      { name: 'White-label options', included: true },
      { name: 'Custom workflows', included: true }
    ],
    limits: {
      users: -1,
      events: -1,
      storage: -1
    },
    recommended: false,
    active: true,
    metadata: {
      popular: false,
      trial_days: 30,
      setup_fee: 0,
      custom_pricing: true,
      contact_sales: true
    }
  }
];

// Hook pour récupérer un plan spécifique
export const usePlan = (planId: string) => {
  const { plans, loading, error } = usePlans();
  const plan = plans.find(p => p.id === planId);
  
  return {
    plan,
    loading,
    error
  };
};

// Hook pour calculer le prix d'un plan
export const usePriceCalculation = () => {
  const [calculating, setCalculating] = useState(false);
  
  const calculatePrice = async (params: {
    planId: string;
    users?: number;
    interval?: 'month' | 'year';
    addons?: string[];
  }) => {
    try {
      setCalculating(true);
      
      const result = await apiCall(API_ENDPOINTS.PLANS.CALCULATE_PRICE, {
        method: 'POST',
        body: JSON.stringify(params)
      });

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to calculate price');
      }
    } catch (error) {
      console.error('Error calculating price:', error);
      throw error;
    } finally {
      setCalculating(false);
    }
  };

  return {
    calculatePrice,
    calculating
  };
};