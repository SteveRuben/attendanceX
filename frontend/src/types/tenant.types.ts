// Types pour le système multi-tenant
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  planId: string;
  settings: TenantSettings;
  branding?: TenantBranding;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  timezone: string;
  locale: string;
  currency: string;
  features?: TenantFeatures;
}

export interface TenantBranding {
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  customDomain?: string;
}

export interface TenantFeatures {
  advancedReporting: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  webhooks: boolean;
  integrations: boolean;
  analytics: boolean;
}

export interface TenantMembership {
  tenantId: string;
  userId: string;
  role: TenantRole;
  permissions: string[];
  joinedAt: string;
  isActive: boolean;
  invitedBy?: string;
}

export interface TenantContext {
  tenant: Tenant;
  membership: TenantMembership;
  features: TenantFeatures;
  subscription?: TenantSubscription;
}

export interface TenantSubscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  usage: TenantUsage;
  limits: TenantLimits;
}

export interface TenantUsage {
  users: number;
  events: number;
  storage: number; // in MB
  apiCalls: number;
}

export interface TenantLimits {
  maxUsers: number;
  maxEvents: number;
  maxStorage: number; // in MB
  apiCallsPerMonth: number;
}

export type TenantStatus = 'active' | 'suspended' | 'cancelled' | 'trial';
export type TenantRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'unpaid' | 'trialing';

// Requêtes d'authentification multi-tenant
export interface MultiTenantLoginRequest {
  email: string;
  password: string;
  tenantId?: string;
  rememberMe?: boolean;
  deviceInfo?: {
    type: string;
    name: string;
    browser: string;
    os: string;
  };
}

export interface MultiTenantLoginResponse {
  success: boolean;
  data: {
    user: any;
    token: string;
    refreshToken: string;
    tenantContext?: TenantContext;
    availableTenants?: TenantMembership[];
    requiresTenantSelection?: boolean;
  };
}

export interface TenantSwitchRequest {
  tenantId: string;
}

export interface TenantSwitchResponse {
  success: boolean;
  data: {
    token: string;
    tenantContext: TenantContext;
  };
}

// Événements d'authentification multi-tenant
export interface AuthStateChangeEvent {
  user: any | null;
  tenantContext: TenantContext | null;
  isAuthenticated: boolean;
}