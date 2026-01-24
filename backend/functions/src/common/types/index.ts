// Export de tous les types
export * from './common.types';
export * from './user.types';
export * from './event.types';
export * from './appointment.types';
export * from './attendance.types';
export * from './notification.types';
export * from './sms.types';
export * from './report.types';
export * from './email.types';
export * from './email-campaign.types';
export * from './role.types';
export * from './ml.types';
export * from './push.types';
export * from './file.types';
export * from './integration.types';
export * from './presence.types';
export * from './participant.types';
export * from './team.types';
export * from './tenant.types';
export * from './timesheet.types';

// Types d'API spécifiques
export * from './api.types';
export * from './auth.types';

// Permission types - explicit exports to avoid conflicts
export {
  FeaturePermission,
  TenantRole,
  UserPermission,
  RolePermission,
  PermissionGrant,
  PermissionScope,
  CreateUserPermissionRequest,
  UpdateUserPermissionRequest,
  PermissionCheckRequest,
  PermissionCheckResponse,
  PermissionValidationResult,
  BulkPermissionRequest,
  BulkPermissionResponse,
  PermissionAuditEntry,
  DEFAULT_ROLE_PERMISSIONS,
  UserContext,
  PlanFeatures,
  PlanLimits
} from './permission.types';

// Types de billing - exports explicites pour éviter les conflits
export {
  // Billing types uniquement
  PaymentProvider,
  PaymentStatus,
  InvoiceStatus,
  PlanFeaturesBoolean,
  SubscriptionPlan,
  CreatePaymentRequest,
  PaymentIntent,
  WebhookEvent,
  UsageMetrics,
  BillingAlert,
  PromoCode,
  ApplyPromoCodeRequest,
  Invoice,
  InvoiceLineItem,
  Payment,
  PaymentFees,
  PaymentMethod
} from './billing.types';

/**
 * Billing and Subscription Types
 * 
 * These types are exported with explicit aliases to avoid naming conflicts
 * between billing, subscription, and grace-period domains.
 * 
 * Naming convention:
 * - Core entities: {Domain}{EntityName} (e.g., BillingSubscription)
 * - Requests: Create{Domain}{EntityName}Request
 * - Enums: {EntityName}{Property}Enum
 */

// Subscription types - exports with domain prefixes
export {
  PlanChangeType,
  PlanChange,
  Subscription as BillingSubscription,
  CreateSubscriptionRequest as CreateBillingSubscriptionRequest,
  UpdateSubscriptionRequest as UpdateBillingSubscriptionRequest
} from './subscription.types';

// Grace period types - exports with domain prefixes
export {
  GracePeriodStatus,
  NotificationSent,
  GracePeriod as BillingGracePeriod,
  CreateGracePeriodRequest as CreateBillingGracePeriodRequest,
  UpdateGracePeriodRequest as UpdateBillingGracePeriodRequest
} from './grace-period.types';

// Backward compatibility exports (DEPRECATED - use domain-prefixed versions)
export {
  Subscription,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest
} from './subscription.types';

export {
  GracePeriod,
  CreateGracePeriodRequest,
  UpdateGracePeriodRequest
} from './grace-period.types';

// Enum exports with consistent naming
export {
  BillingCycle as BillingCycleEnum,
  SubscriptionStatus as SubscriptionStatusEnum,
  SubscriptionPlanType
} from './billing.types';