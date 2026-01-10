/**
 * Types pour le système de billing - Backend
 */

import { BaseEntity } from "./common.types";
import { TenantScopedEntity } from "./tenant.types";

export enum SubscriptionPlanType {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  TRIALING = 'trialing'
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum PaymentProvider {
  NOTCHPAY = 'notchpay',
  STRIPE = 'stripe',
  PAYPAL = 'paypal'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible'
}

export interface PlanFeatures {
  maxEvents: number;
  maxParticipants: number;
  maxTeams: number;
  maxStorage: number; // in GB
  maxApiCalls: number;
  customBranding: boolean;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  ssoIntegration: boolean;
  customDomain: boolean;
  advancedReporting: boolean;
}

export interface PlanLimits {
  maxUsers: number;
  maxEvents: number;
  maxStorage: number; // in MB
  apiCallsPerMonth: number;
}

export interface PlanFeaturesBoolean {
  advancedReporting: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  webhooks: boolean;
  ssoIntegration: boolean;
  prioritySupport: boolean;
}

export interface SubscriptionPlan extends BaseEntity {
  id: string;
  name: string;
  description?: string;
  type: SubscriptionPlanType;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  isActive: boolean;
  isPopular?: boolean;
  isEnterprise?: boolean;
  trialDays?: number;
  gracePeriodDays: number;
  sortOrder: number;
  features: PlanFeaturesBoolean;
  limits: PlanLimits;
}

export interface CreateSubscriptionRequest {
  planId: SubscriptionPlanType;
  billingCycle: BillingCycle;
  paymentProvider: PaymentProvider;
  paymentMethodId?: string;
  promoCode?: string;
  trialDays?: number;
}

export interface UpdateSubscriptionRequest {
  planId?: SubscriptionPlanType;
  billingCycle?: BillingCycle;
  promoCode?: string;
  pauseCollection?: boolean;
}

export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  paymentProvider: PaymentProvider;
  paymentMethodId?: string;
  subscriptionId?: string;
  invoiceId?: string;
  metadata?: Record<string, any>;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  clientSecret?: string;
  paymentUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface WebhookEvent {
  id: string;
  type: string;
  provider: PaymentProvider;
  data: any;
  processed: boolean;
  createdAt: Date;
}

export interface UsageMetrics {
  tenantId: string;
  period: string; // YYYY-MM format
  events: number;
  participants: number;
  teams: number;
  storage: number; // in bytes
  apiCalls: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingAlert {
  id: string;
  tenantId: string;
  type: 'usage_warning' | 'payment_failed' | 'subscription_expiring' | 'overage_detected' | 'trial_ending';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  dismissed: boolean;
  createdAt: Date;
  dismissedAt?: Date;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  currency?: string;
  maxUses?: number;
  usedCount: number;
  validFrom: Date;
  validUntil?: Date;
  applicablePlans?: SubscriptionPlanType[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplyPromoCodeRequest {
  code: string;
  subscriptionId?: string;
}

export interface GracePeriod {
  id: string;
  tenantId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  source: string;
  status: 'active' | 'expired' | 'converted';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGracePeriodRequest {
  tenantId: string;
  userId: string;
  durationDays?: number;
  source?: string;
  metadata?: Record<string, any>;
}

// ===== CORE BILLING ENTITIES =====

export interface Subscription extends BaseEntity, TenantScopedEntity {
  planId: SubscriptionPlanType;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  paymentProvider: PaymentProvider;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelledAt?: Date;
  cancelAtPeriodEnd: boolean;
  priceId?: string;
  quantity: number;
  unitAmount: number;
  currency: string;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount: number;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
  failedPaymentCount: number;
  paymentMethodId?: string;
  promoCodeId?: string;
  metadata?: Record<string, any>;
}

export interface Invoice extends BaseEntity, TenantScopedEntity {
  subscriptionId?: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  dueDate: Date;
  paidAt?: Date;
  voidedAt?: Date;
  paymentAttemptCount: number;
  lastPaymentAttempt?: Date;
  nextPaymentAttempt?: Date;
  lineItems: InvoiceLineItem[];
  paymentIntentId?: string;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
  metadata?: Record<string, any>;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  currency: string;
  period?: {
    start: Date;
    end: Date;
  };
  metadata?: Record<string, any>;
}

export interface Payment extends BaseEntity, TenantScopedEntity {
  subscriptionId?: string;
  invoiceId?: string;
  paymentIntentId: string;
  paymentProvider: PaymentProvider;
  paymentMethodId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  failureCode?: string;
  failureMessage?: string;
  processedAt?: Date;
  refundedAt?: Date;
  refundAmount?: number;
  fees?: PaymentFees;
  metadata?: Record<string, any>;
}

export interface PaymentFees {
  processingFee: number;
  platformFee: number;
  currency: string;
}

export interface PaymentMethod extends BaseEntity, TenantScopedEntity {
  paymentProvider: PaymentProvider;
  type: 'card' | 'bank_account' | 'wallet';
  isDefault: boolean;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    country?: string;
  };
  bankAccount?: {
    bankName: string;
    accountType: string;
    last4: string;
    country: string;
  };
  wallet?: {
    type: string;
    email?: string;
  };
  metadata?: Record<string, any>;
}