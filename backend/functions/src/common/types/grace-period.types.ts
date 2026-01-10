// Types pour le système de périodes de grâce

import { BaseEntity } from "./common.types";
import { TenantScopedEntity } from "./tenant.types";

export enum GracePeriodStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  CONVERTED = 'converted'
}

export interface NotificationSent {
  type: 'warning' | 'final' | 'expired';
  sentAt: Date;
  daysRemaining: number;
}

export interface GracePeriod extends BaseEntity, TenantScopedEntity {
  subscriptionId: string;
  status: GracePeriodStatus;
  startsAt: Date;
  endsAt: Date;
  originalPlanId: string;
  reason: string;
  notificationsSent: NotificationSent[];
  metadata?: Record<string, any>;
}

export interface CreateGracePeriodRequest {
  tenantId: string;
  subscriptionId: string;
  startsAt: Date;
  endsAt: Date;
  originalPlanId: string;
  reason: string;
  metadata?: Record<string, any>;
}

export interface UpdateGracePeriodRequest {
  status?: GracePeriodStatus;
  endsAt?: Date;
  reason?: string;
  metadata?: Record<string, any>;
}