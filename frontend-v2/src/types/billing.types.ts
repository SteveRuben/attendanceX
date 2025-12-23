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