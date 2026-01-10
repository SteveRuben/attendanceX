// Types pour le système d'abonnements

import { BaseEntity } from "./common.types";
import { TenantScopedEntity } from "./tenant.types";

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELLED = 'cancelled',
  TRIALING = 'trialing',
  GRACE_PERIOD = 'grace_period',
  PAST_DUE = 'past_due'
}

export enum PlanChangeType {
  UPGRADE = 'upgrade',
  DOWNGRADE = 'downgrade',
  GRACE_CONVERSION = 'grace_conversion',
  CANCELLATION = 'cancellation'
}

export interface PlanChange {
  id: string;
  fromPlanId: string;
  toPlanId: string;
  changedAt: Date;
  changeType: PlanChangeType;
  reason: string;
  priceDifference: number;
  effectiveDate: Date;
  changedBy: string;
}

export interface Subscription extends BaseEntity, TenantScopedEntity {
  planId: string;
  status: SubscriptionStatus;
  basePrice: number;
  currency: string;
  isInGracePeriod?: boolean;
  gracePeriodId?: string;
  gracePeriodEndsAt?: Date;
  planHistory?: PlanChange[];
  createdBy: string;
  metadata?: Record<string, any>;
}

export interface CreateSubscriptionRequest {
  planId: string;
  tenantId: string;
  createdBy: string;
  billingCycle?: BillingCycle;
  metadata?: Record<string, any>;
}

export interface UpdateSubscriptionRequest {
  planId?: string;
  status?: SubscriptionStatus;
  metadata?: Record<string, any>;
}