/**
 * Types pour le système multi-tenant
 */

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
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

// Interface de base pour toutes les entités tenant-scoped
export interface TenantScopedEntity {
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Modèle Tenant simplifié
export interface Tenant {
  id: string;
  name: string;
  slug: string; // URL-friendly identifier
  
  // Subscription essentials
  planId: string;
  status: TenantStatus;
  
  // Core settings (simplified)
  settings: TenantSettings;
  
  // Usage tracking (simplified)
  usage: TenantUsage;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
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
  price: number;
  currency: string;
  type: PlanType;
  
  // Limits (simplified)
  limits: PlanLimits;
  
  // Features (boolean flags only)
  features: PlanFeatures;
  
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
  permissions: string[];
  isActive: boolean;
  joinedAt: Date;
  invitedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Nouveau : Rôle application pour les fonctionnalités
  applicationRole: ApplicationRole;
  featurePermissions: FeaturePermission[];
}

export enum TenantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

// Rôles application pour les fonctionnalités
export enum ApplicationRole {
  PREMIUM_USER = 'premium_user',
  STANDARD_USER = 'standard_user',
  BASIC_USER = 'basic_user',
  TRIAL_USER = 'trial_user',
  RESTRICTED_USER = 'restricted_user'
}

// Permissions granulaires pour les fonctionnalités
export enum FeaturePermission {
  // Fonctionnalités de présence
  ADVANCED_PRESENCE_TRACKING = 'advanced_presence_tracking',
  BULK_PRESENCE_MANAGEMENT = 'bulk_presence_management',
  PRESENCE_ANALYTICS = 'presence_analytics',
  GEOFENCING = 'geofencing',
  
  // Fonctionnalités de reporting
  BASIC_REPORTS = 'basic_reports',
  ADVANCED_REPORTS = 'advanced_reports',
  CUSTOM_REPORTS = 'custom_reports',
  SCHEDULED_REPORTS = 'scheduled_reports',
  EXPORT_REPORTS = 'export_reports',
  
  // Fonctionnalités d'intégration
  API_ACCESS = 'api_access',
  WEBHOOK_ACCESS = 'webhook_access',
  THIRD_PARTY_INTEGRATIONS = 'third_party_integrations',
  
  // Fonctionnalités avancées
  MACHINE_LEARNING_INSIGHTS = 'machine_learning_insights',
  PREDICTIVE_ANALYTICS = 'predictive_analytics',
  CUSTOM_BRANDING = 'custom_branding',
  WHITE_LABELING = 'white_labeling',
  
  // Support et services
  PRIORITY_SUPPORT = 'priority_support',
  DEDICATED_SUPPORT = 'dedicated_support',
  TRAINING_SESSIONS = 'training_sessions'
}

// Contexte tenant pour les requêtes
export interface TenantContext {
  tenantId: string;
  tenant: Tenant;
  membership: TenantMembership;
  permissions: string[];
  plan: SubscriptionPlan;
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
  permissions?: string[];
  invitedBy: string;
}

// Erreurs spécifiques au multi-tenant
export enum TenantErrorCode {
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



// Configuration des rôles application
export interface ApplicationRoleConfig {
  role: ApplicationRole;
  displayName: string;
  description: string;
  permissions: FeaturePermission[];
  planRequirement?: PlanType; // Plan minimum requis
  isDefault: boolean;
}

// Contexte utilisateur complet avec les deux niveaux de rôles
export interface UserContext {
  userId: string;
  tenantRole: TenantRole;
  applicationRole: ApplicationRole;
  featurePermissions: FeaturePermission[];
  tenantPermissions: string[];
  planFeatures: PlanFeatures;
  planLimits: PlanLimits;
}