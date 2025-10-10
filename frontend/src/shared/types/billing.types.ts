/**
 * Types pour la gestion de la facturation côté frontend
 * Inclut les types pour les codes promo et les périodes de grâce
 */

// Types de base pour la facturation
export interface BillingDashboard {
  currentPlan: SubscriptionPlan;
  subscription: Subscription;
  usage: TenantUsage;
  limits: PlanLimits;
  overagePreview: OveragePreview;
  recentInvoices: Invoice[];
  billingInfo: BillingInfo;
  gracePeriodStatus?: GracePeriodStatus;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: PlanFeatures;
  limits: PlanLimits;
  isActive: boolean;
  sortOrder: number;
  gracePeriodDays?: number;
}

export interface PlanFeatures {
  advancedReporting: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  webhooks: boolean;
  ssoIntegration: boolean;
  prioritySupport: boolean;
}

export interface PlanLimits {
  maxUsers: number;
  maxEvents: number;
  maxStorage: number; // in MB
  apiCallsPerMonth: number;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  billingCycle: 'monthly' | 'yearly';
  basePrice: number;
  currency: string;
  discountPercent?: number;
  nextPaymentDate: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  appliedPromoCodes?: AppliedPromoCode[];
  gracePeriodId?: string;
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete',
  GRACE_PERIOD = 'grace_period'
}

export interface TenantUsage {
  users: number;
  events: number;
  storage: number; // in MB
  apiCalls: number;
}

export interface OveragePreview {
  hasOverages: boolean;
  totalOverageCost: number;
  currency: string;
  overages: OverageDetail[];
}

export interface OverageDetail {
  metric: string;
  baseLimit: number;
  actualUsage: number;
  overageAmount: number;
  unitPrice: number;
  totalCost: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  paidAt?: Date;
  lineItems: InvoiceLineItem[];
  stripeInvoiceId?: string;
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible'
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: 'subscription' | 'overage' | 'one_time';
  metadata?: Record<string, any>;
}

export interface BillingInfo {
  nextBillingDate: Date;
  billingCycle: 'monthly' | 'yearly';
  currency: string;
}

export interface PlanComparison {
  plans: SubscriptionPlan[];
  comparison: PlanComparisonMatrix;
}

export interface PlanComparisonMatrix {
  features: string[];
  planFeatures: Record<string, boolean[]>;
}

export interface ChangePlanRequest {
  newPlanId: string;
  billingCycle: 'monthly' | 'yearly';
  effectiveDate?: Date;
  promoCode?: string;
}

export interface ChangePlanResponse {
  subscription: Subscription;
  upgradeInfo: PlanUpgradeInfo;
  message: string;
}

export interface PlanUpgradeInfo {
  isUpgrade: boolean;
  priceDifference: number;
  prorationAmount?: number;
  effectiveDate: Date;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'invoice';
  lastFour?: string;
  expiryDate?: string;
  brand?: string;
  isDefault: boolean;
}

export interface BillingAlert {
  id: string;
  type: 'usage_warning' | 'payment_failed' | 'trial_ending' | 'subscription_cancelled' | 'grace_period_expiring';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  actionUrl?: string;
  actionText?: string;
  createdAt: Date;
  dismissedAt?: Date;
}

// Types pour les codes promo
export interface PromoCode {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: PromoCodeDiscountType;
  discountValue: number;
  isActive: boolean;
  validFrom: Date;
  validUntil?: Date;
  maxUses?: number;
  currentUses: number;
  maxUsesPerUser?: number;
  applicablePlans?: string[];
  minimumAmount?: number;
  newUsersOnly?: boolean;
  tenantId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum PromoCodeDiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount'
}

export interface AppliedPromoCode {
  id: string;
  promoCodeId: string;
  promoCode: PromoCode;
  subscriptionId: string;
  userId: string;
  tenantId: string;
  discountAmount: number;
  appliedAt: Date;
  isActive: boolean;
}

export interface PromoCodeValidationRequest {
  code: string;
  planId?: string;
  subscriptionAmount?: number;
}

export interface PromoCodeValidationResponse {
  isValid: boolean;
  promoCode?: PromoCode;
  discountAmount?: number;
  finalAmount?: number;
  errorMessage?: string;
}

export interface ApplyPromoCodeRequest {
  subscriptionId: string;
  promoCode: string;
}

export interface ApplyPromoCodeResponse {
  success: boolean;
  appliedPromoCode?: AppliedPromoCode;
  newSubscriptionAmount: number;
  discountAmount: number;
  message: string;
}

// Types pour les périodes de grâce
export interface GracePeriod {
  id: string;
  userId: string;
  tenantId: string;
  status: GracePeriodStatus;
  source: GracePeriodSource;
  sourceDetails?: Record<string, any>;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  notificationsSent: GracePeriodNotification[];
  extensions: GracePeriodExtension[];
  convertedAt?: Date;
  convertedToSubscriptionId?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum GracePeriodStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CONVERTED = 'converted',
  CANCELLED = 'cancelled'
}

export enum GracePeriodSource {
  MIGRATION = 'migration',
  TRIAL_EXPIRED = 'trial_expired',
  PAYMENT_FAILED = 'payment_failed',
  ADMIN_GRANTED = 'admin_granted',
  CUSTOMER_REQUEST = 'customer_request'
}

export interface GracePeriodNotification {
  id: string;
  type: GracePeriodNotificationType;
  sentAt: Date;
  channel: 'email' | 'in_app' | 'sms';
  status: 'sent' | 'delivered' | 'failed';
  metadata?: Record<string, any>;
}

export enum GracePeriodNotificationType {
  WELCOME = 'welcome',
  REMINDER_7_DAYS = 'reminder_7_days',
  REMINDER_3_DAYS = 'reminder_3_days',
  REMINDER_1_DAY = 'reminder_1_day',
  EXPIRED = 'expired',
  EXTENDED = 'extended',
  CONVERTED = 'converted'
}

export interface GracePeriodExtension {
  id: string;
  extendedBy: string;
  additionalDays: number;
  reason?: string;
  extendedAt: Date;
}

export interface GracePeriodStatus {
  hasActiveGracePeriod: boolean;
  gracePeriod?: GracePeriod;
  daysRemaining?: number;
  hoursRemaining?: number;
  progressPercentage?: number;
  isExpiringSoon?: boolean;
  isOverdue?: boolean;
}

export interface CreateGracePeriodRequest {
  userId: string;
  tenantId: string;
  durationDays?: number;
  source?: GracePeriodSource;
  sourceDetails?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ExtendGracePeriodRequest {
  additionalDays: number;
  reason?: string;
}

export interface ConvertGracePeriodRequest {
  planId: string;
  promoCodeId?: string;
}

export interface ConvertGracePeriodResponse {
  success: boolean;
  subscription: Subscription;
  gracePeriod: GracePeriod;
  message: string;
}

// Types pour les statistiques et rapports
export interface BillingStats {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
  averageRevenuePerUser: number;
  currency: string;
  period: {
    start: Date;
    end: Date;
  };
}

export interface PromoCodeStats {
  totalCodes: number;
  activeCodes: number;
  totalUses: number;
  totalDiscountAmount: number;
  conversionRate: number;
  topPerformingCodes: Array<{
    code: string;
    uses: number;
    discountAmount: number;
  }>;
}

export interface GracePeriodStats {
  totalGracePeriods: number;
  activeGracePeriods: number;
  expiredGracePeriods: number;
  convertedGracePeriods: number;
  conversionRate: number;
  averageDaysToConversion: number;
  totalExtensions: number;
}

// Types pour les requêtes de migration
export interface MigrationResult {
  success: boolean;
  migrated?: number;
  failed?: number;
  errors?: string[];
  gracePeriodId?: string;
  message?: string;
  error?: string;
}

export interface MigrateUserRequest {
  userId: string;
  tenantId: string;
}

// Types pour les hooks et événements
export interface BillingEvent {
  type: BillingEventType;
  data: any;
  timestamp: Date;
}

export enum BillingEventType {
  PLAN_CHANGED = 'plan_changed',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  PROMO_CODE_APPLIED = 'promo_code_applied',
  PROMO_CODE_REMOVED = 'promo_code_removed',
  GRACE_PERIOD_STARTED = 'grace_period_started',
  GRACE_PERIOD_EXTENDED = 'grace_period_extended',
  GRACE_PERIOD_CONVERTED = 'grace_period_converted',
  GRACE_PERIOD_EXPIRED = 'grace_period_expired'
}