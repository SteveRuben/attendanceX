import { apiClient } from '@/services/apiClient'

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  currency: string;
  features: string[];
  limits: {
    users: number;
    events: number;
    storage: number;
    apiCalls: number;
  };
  isPopular?: boolean;
  isEnterprise?: boolean;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
  billingCycle: 'monthly' | 'yearly';
  currency: string;
  amount: number;
  nextPaymentDate: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  plan?: Plan;
}

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'cancelled';
  dueDate: string;
  paidAt?: string;
  createdAt: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface UsageStats {
  users: {
    current: number;
    limit: number;
    percentage: number;
  };
  events: {
    current: number;
    limit: number;
    percentage: number;
  };
  storage: {
    current: number;
    limit: number;
    percentage: number;
    unit: 'GB' | 'MB';
  };
  apiCalls: {
    current: number;
    limit: number;
    percentage: number;
  };
}

export interface BillingDashboard {
  currentPlan: Plan;
  subscription: Subscription;
  usage: UsageStats;
  limits: Plan['limits'];
  overagePreview: OveragePreview;
  recentInvoices: Invoice[];
  billingInfo: {
    nextBillingDate: string;
    billingCycle: 'monthly' | 'yearly';
    currency: string;
  };
}

export interface OveragePreview {
  hasOverage: boolean;
  estimatedCost: number;
  currency: string;
  details: {
    users?: { overage: number; cost: number };
    events?: { overage: number; cost: number };
    storage?: { overage: number; cost: number };
    apiCalls?: { overage: number; cost: number };
  };
}

export interface BillingAlert {
  id: string;
  type: 'usage_warning' | 'payment_failed' | 'subscription_expiring' | 'overage_detected';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  dismissedAt?: string;
}

export interface GracePeriodStatus {
  hasActiveGracePeriod: boolean;
  gracePeriod: {
    id: string;
    userId: string;
    tenantId: string;
    startDate: string;
    endDate: string;
    source: string;
    status: 'active' | 'expired' | 'converted';
  } | null;
  daysRemaining?: number;
  hoursRemaining?: number;
  progressPercentage?: number;
  isExpiringSoon?: boolean;
  isOverdue?: boolean;
}

export interface ChangePlanRequest {
  planId: string;
  billingCycle?: 'monthly' | 'yearly';
  promoCode?: string;
}

export interface ApplyPromoCodeRequest {
  subscriptionId: string;
  promoCode: string;
}

export interface CreateGracePeriodRequest {
  userId: string;
  tenantId: string;
  durationDays?: number;
  source?: string;
}

// Billing service following the same pattern as eventsService
export const billingService = {
  // Dashboard
  async getDashboard(): Promise<BillingDashboard> {
    const data = await apiClient.get<any>('/billing/dashboard')
    return (data as any)?.data ?? data
  },

  // Plans
  async getPlans(): Promise<Plan[]> {
    const data = await apiClient.get<any>('/billing/plans')
    const list = Array.isArray((data as any)?.data) ? (data as any).data : Array.isArray(data) ? (data as any) : []
    return list
  },

  // Subscription
  async getCurrentSubscription(): Promise<Subscription> {
    const data = await apiClient.get<any>('/billing/subscription')
    return (data as any)?.data ?? data
  },

  async changePlan(request: ChangePlanRequest): Promise<Subscription> {
    const data = await apiClient.post<any>('/billing/change-plan', request, {
      withToast: { loading: 'Changing plan...', success: 'Plan changed successfully' }
    })
    return (data as any)?.data ?? data
  },

  async cancelSubscription(reason?: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/billing/cancel', { reason }, {
      withToast: { loading: 'Canceling subscription...', success: 'Subscription canceled' }
    })
  },

  // Billing History
  async getBillingHistory(page: number = 1, limit: number = 20): Promise<{
    invoices: Invoice[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const data = await apiClient.get<any>(`/billing/history?page=${page}&limit=${limit}`)
    return (data as any)?.data ?? data
  },

  // Invoices
  async getInvoices(page: number = 1, limit: number = 10): Promise<{
    invoices: Invoice[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const data = await apiClient.get<any>(`/billing/invoices?page=${page}&limit=${limit}`)
    return (data as any)?.data ?? data
  },

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const data = await apiClient.get<any>(`/billing/invoices/${invoiceId}`)
    return (data as any)?.data ?? data
  },

  async payInvoice(invoiceId: string): Promise<{
    success: boolean;
    paymentIntentId: string;
    message: string;
  }> {
    return apiClient.post(`/billing/invoices/${invoiceId}/pay`, {}, {
      withToast: { loading: 'Processing payment...', success: 'Payment processed' }
    })
  },

  // Usage
  async getUsageStats(): Promise<UsageStats> {
    const data = await apiClient.get<any>('/billing/usage')
    return (data as any)?.data ?? data
  },

  async getOveragePreview(): Promise<OveragePreview> {
    const data = await apiClient.get<any>('/billing/overage-preview')
    return (data as any)?.data ?? data
  },

  // Promo Codes
  async applyPromoCode(request: ApplyPromoCodeRequest): Promise<{
    success: boolean;
    message: string;
    discount: {
      amount: number;
      percentage?: number;
      currency: string;
    };
  }> {
    return apiClient.post('/billing/apply-promo-code', request, {
      withToast: { loading: 'Applying promo code...', success: 'Promo code applied' }
    })
  },

  async removePromoCode(subscriptionId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.delete(`/billing/remove-promo-code/${subscriptionId}`, {
      withToast: { loading: 'Removing promo code...', success: 'Promo code removed' }
    })
  },

  // Alerts
  async getAlerts(): Promise<BillingAlert[]> {
    const data = await apiClient.get<any>('/billing/alerts')
    const list = Array.isArray((data as any)?.data) ? (data as any).data : Array.isArray(data) ? (data as any) : []
    return list
  },

  async dismissAlert(alertId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`/billing/alerts/${alertId}/dismiss`, {})
  },

  // Grace Period
  async getMyGracePeriodStatus(): Promise<GracePeriodStatus> {
    const data = await apiClient.get<any>('/billing/my-grace-period-status')
    return (data as any)?.data ?? data
  },

  async createGracePeriod(request: CreateGracePeriodRequest): Promise<{
    success: boolean;
    gracePeriod: GracePeriodStatus['gracePeriod'];
  }> {
    return apiClient.post('/billing/create-grace-period', request)
  },

  async extendGracePeriod(gracePeriodId: string, additionalDays: number, reason?: string): Promise<{
    success: boolean;
    gracePeriod: GracePeriodStatus['gracePeriod'];
  }> {
    return apiClient.put(`/billing/extend-grace-period/${gracePeriodId}`, {
      additionalDays,
      reason
    })
  },

  async convertGracePeriod(gracePeriodId: string, planId: string, promoCodeId?: string): Promise<{
    success: boolean;
    subscription: Subscription;
  }> {
    return apiClient.post(`/billing/convert-grace-period/${gracePeriodId}`, {
      planId,
      promoCodeId
    })
  },

  // Admin functions
  async migrateUser(userId: string, tenantId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiClient.post('/billing/migrate-user', { userId, tenantId })
  },

  async migrateExistingUsers(): Promise<{
    migrated: number;
    failed: number;
    details: string[];
  }> {
    return apiClient.post('/billing/migrate-existing-users', {})
  }
};