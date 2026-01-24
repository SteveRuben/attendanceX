/**
 * Types pour le système multi-tenant
 */

import { BaseEntity } from "./common.types";
import { TenantRole, FeaturePermission } from "./index";

// TenantError class implementation
export class TenantError extends Error {
  public code: TenantErrorCode;
  public tenantId?: string;
  public details?: any;
  public retryAfter?: number;

  constructor(message: string, code: TenantErrorCode, tenantId?: string, details?: any) {
    super(message);
    this.name = 'TenantError';
    this.code = code;
    this.tenantId = tenantId;
    this.details = details;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TenantError);
    }
  }
}

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  TRIAL = 'trial'
}

export enum PlanType {
  FREE = 'free',
  BASIC = 'basic',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

// Interface de base pour toutes les entités tenant-scoped
export interface TenantScopedEntity {
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Modèle Tenant simplifié
export interface Tenant extends BaseEntity {
  name: string;
  slug: string; // URL-friendly identifier
  // Subscription essentials
  planId: string;
  status: TenantStatus;

  // Core settings (simplified)
  settings: TenantSettings;

  // Usage tracking (simplified)
  usage: TenantUsage;
  // onboarding
  isNewlyCreated?: boolean;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: Date;
  firstDashboardAccess?: Date;

  // Metadata
  createdBy: string;
  metadata?: Record<string, any>; // Métadonnées flexibles
}

export interface TenantSettings {
  timezone: string;
  locale: string;
  currency: string;
}

export interface TenantUsage {
  users: number;
  events: number;
  storage: number; // in MB
  apiCalls: number; // current month
}

// Plan d'abonnement avec limites et fonctionnalités
export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  type: PlanType;
  billingCycle: 'monthly' | 'yearly';

  // Limits (simplified)
  limits: PlanLimits;

  // Features (boolean flags only)
  features: PlanFeatures;

  // Grace period configuration
  gracePeriodDays: number; // Configurable grace period duration

  // Stripe integration
  stripeProductId?: string;
  stripePriceId?: string;

  // Display and ordering
  sortOrder: number;
  isPopular?: boolean;

  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanLimits {
  maxUsers: number;
  maxEvents: number;
  maxStorage: number; // in MB
  apiCallsPerMonth: number;
}

export interface PlanFeatures {
  advancedReporting: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  webhooks: boolean;
  ssoIntegration: boolean;
  prioritySupport: boolean;
}

// Branding optionnel (collection séparée pour la performance)
export interface TenantBranding {
  tenantId: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  createdAt: Date;
  updatedAt: Date;
}

// Membership d'un utilisateur dans un tenant
export interface TenantMembership {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantRole;
  featurePermissions: FeaturePermission[];
  isActive: boolean;
  joinedAt: Date;
  invitedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription details for a tenant (aligned with frontend)
export interface TenantSubscription {
  id: string;
  tenantId: string;
  planId: string;
  status: 'active' | 'past_due' | 'cancelled' | 'unpaid' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  usage: TenantUsage;
  limits: PlanLimits;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}


// Features available to a tenant based on their plan (aligned with frontend)
export interface TenantFeatures {
  advancedReporting: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  webhooks: boolean;
  integrations: boolean;
  analytics: boolean;
  ssoIntegration?: boolean;
  prioritySupport?: boolean;
}

// Type aliases for consistency
export type TenantLimits = PlanLimits;

// Contexte tenant pour les requêtes
export interface TenantContext {
    tenantId: string;
    tenant: Tenant;
  membership: TenantMembership;
  features: TenantFeatures;
  subscription?: TenantSubscription;
  plan: TenantLimits;
}

// Requêtes pour la création/mise à jour
export interface CreateTenantRequest {
  name: string;
  slug?: string;
  planId: string;
  settings?: Partial<TenantSettings>;
  createdBy: string;
  metadata?: Record<string, any>;
}

export interface UpdateTenantRequest {
  name?: string;
  slug?: string;
  planId?: string;
  status?: TenantStatus;
  settings?: Partial<TenantSettings>;
  metadata?: Record<string, any>;
}

export interface CreateTenantMembershipRequest {
  tenantId: string;
  userId: string;
  role: TenantRole;
  featurePermissions?: FeaturePermission[];
  invitedBy: string;
}

// Erreurs spécifiques au multi-tenant
export enum TenantErrorCode {
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  TENANT_CREATION_FAILED = 'TENANT_CREATION_FAILED',
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  TENANT_SUSPENDED = 'TENANT_SUSPENDED',
  TENANT_LIMIT_EXCEEDED = 'TENANT_LIMIT_EXCEEDED',
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  TENANT_ACCESS_DENIED = 'TENANT_ACCESS_DENIED',
  INVALID_TENANT_SLUG = 'INVALID_TENANT_SLUG',
  TENANT_SLUG_EXISTS = 'TENANT_SLUG_EXISTS'
}



// Contexte utilisateur simplifié
export interface UserContext {
  userId: string;
  tenantRole: TenantRole;
  effectivePermissions: FeaturePermission[];
  planFeatures: PlanFeatures;
  planLimits: PlanLimits;
}