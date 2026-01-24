/**
 * Permission System Types
 * Defines comprehensive permission management for multi-tenant architecture
 */

import { BaseEntity } from "./common.types";
import { TenantScopedEntity } from "./tenant.types";

// Core Permission Enums
export enum FeaturePermission {
  // User Management
  MANAGE_USERS = 'manage_users',
  INVITE_USERS = 'invite_users',
  VIEW_USERS = 'view_users',
  DELETE_USERS = 'delete_users',
  
  // Event Management
  MANAGE_EVENTS = 'manage_events',
  CREATE_EVENTS = 'create_events',
  VIEW_EVENTS = 'view_events',
  DELETE_EVENTS = 'delete_events',
  
  // Presence Management
  MANAGE_PRESENCE = 'manage_presence',
  VIEW_PRESENCE = 'view_presence',
  CHECK_PRESENCE = 'check_presence',
  EXPORT_PRESENCE = 'export_presence',
  BULK_PRESENCE_MANAGEMENT = 'bulk_presence_management',
  GEOFENCING = 'geofencing',
  
  // Billing & Subscription
  MANAGE_BILLING = 'manage_billing',
  VIEW_BILLING = 'view_billing',
  MANAGE_SUBSCRIPTIONS = 'manage_subscriptions',
  
  // Reports & Analytics
  VIEW_REPORTS = 'view_reports',
  EXPORT_REPORTS = 'export_reports',
  MANAGE_REPORTS = 'manage_reports',
  VIEW_BASIC_ANALYTICS = 'view_basic_analytics',
  VIEW_ADVANCED_ANALYTICS = 'view_advanced_analytics',
  PRESENCE_ANALYTICS = 'presence_analytics',
  CUSTOM_REPORTS = 'custom_reports',
  SCHEDULED_REPORTS = 'scheduled_reports',
  EXPORT_DATA = 'export_data',
  
  // System Administration
  MANAGE_SETTINGS = 'manage_settings',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  MANAGE_INTEGRATIONS = 'manage_integrations',
  CUSTOM_BRANDING = 'custom_branding',
  
  // API & Integrations
  API_ACCESS = 'api_access',
  WEBHOOK_ACCESS = 'webhook_access',
  THIRD_PARTY_INTEGRATIONS = 'third_party_integrations',
  
  // Support
  PRIORITY_SUPPORT = 'priority_support',
  
  // Tenant Management
  MANAGE_TENANT = 'manage_tenant',
  VIEW_TENANT_STATS = 'view_tenant_stats'
}

export enum TenantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export enum PermissionScope {
  GLOBAL = 'global',
  TENANT = 'tenant',
  RESOURCE = 'resource'
}

// Permission Entities
export interface UserPermission extends BaseEntity, TenantScopedEntity {
  userId: string;
  permissions: FeaturePermission[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  scope: PermissionScope;
  resourceId?: string;
  resourceType?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface RolePermission extends BaseEntity {
  role: TenantRole;
  permissions: FeaturePermission[];
  isDefault: boolean;
  description: string;
  createdBy: string;
  updatedBy?: string;
}

export interface PermissionGrant extends BaseEntity, TenantScopedEntity {
  userId: string;
  permission: FeaturePermission;
  grantedBy: string;
  grantedAt: Date;
  revokedBy?: string;
  revokedAt?: Date;
  reason?: string;
  scope: PermissionScope;
  resourceId?: string;
  resourceType?: string;
  isActive: boolean;
}

// Request/Response Types
export interface CreateUserPermissionRequest {
  userId: string;
  permissions: FeaturePermission[];
  scope?: PermissionScope;
  resourceId?: string;
  resourceType?: string;
  expiresAt?: Date;
  reason?: string;
}

export interface UpdateUserPermissionRequest {
  permissions?: FeaturePermission[];
  expiresAt?: Date;
  isActive?: boolean;
  reason?: string;
}

export interface PermissionCheckRequest {
  userId: string;
  permission: FeaturePermission;
  resourceId?: string;
  resourceType?: string;
}

export interface PermissionCheckResult {
  hasPermission: boolean;
  source: 'role' | 'explicit' | 'none';
  permission: FeaturePermission;
  userId: string;
  role?: TenantRole;
  expiresAt?: Date;
}

export interface PermissionCheckResponse {
  hasPermission: boolean;
  source: 'role' | 'grant' | 'custom';
  expiresAt?: Date;
  reason?: string;
}

export interface BulkPermissionRequest {
  userIds: string[];
  permissions: FeaturePermission[];
  action: 'grant' | 'revoke';
  scope?: PermissionScope;
  resourceId?: string;
  resourceType?: string;
  expiresAt?: Date;
  reason?: string;
}

export interface BulkPermissionResult {
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
  details: Array<{
    userId: string;
    success: boolean;
    message?: string;
    error?: string;
  }>;
}

export interface BulkPermissionResponse {
  successful: string[];
  failed: Array<{
    userId: string;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// User Context Types
export interface UserContext {
  userId: string;
  tenantId: string;
  tenantRole: TenantRole;
  effectivePermissions: FeaturePermission[];
  customPermissions?: FeaturePermission[];
  planFeatures: PlanFeatures;
  planLimits: PlanLimits;
  isActive?: boolean;
  lastUpdated?: Date;
}

export interface PlanFeatures {
  maxEvents: number;
  maxParticipants: number;
  maxTeams: number;
  maxStorage: number;
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
  maxStorage: number;
  apiCallsPerMonth: number;
}

// Permission validation types
export interface PermissionValidationResult {
  isValid: boolean;
  hasPermission: boolean;
  missingPermissions: FeaturePermission[];
  errors: string[];
  warnings: string[];
}

// Permission audit types
export interface PermissionAuditEntry extends BaseEntity, TenantScopedEntity {
  userId: string;
  targetUserId?: string;
  action: 'grant' | 'revoke' | 'check' | 'update';
  permission: FeaturePermission;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

// Default role configurations
export const DEFAULT_ROLE_PERMISSIONS: Record<TenantRole, FeaturePermission[]> = {
  [TenantRole.OWNER]: [
    FeaturePermission.MANAGE_USERS,
    FeaturePermission.INVITE_USERS,
    FeaturePermission.VIEW_USERS,
    FeaturePermission.DELETE_USERS,
    FeaturePermission.MANAGE_EVENTS,
    FeaturePermission.CREATE_EVENTS,
    FeaturePermission.VIEW_EVENTS,
    FeaturePermission.DELETE_EVENTS,
    FeaturePermission.MANAGE_PRESENCE,
    FeaturePermission.VIEW_PRESENCE,
    FeaturePermission.CHECK_PRESENCE,
    FeaturePermission.EXPORT_PRESENCE,
    FeaturePermission.BULK_PRESENCE_MANAGEMENT,
    FeaturePermission.GEOFENCING,
    FeaturePermission.MANAGE_BILLING,
    FeaturePermission.VIEW_BILLING,
    FeaturePermission.MANAGE_SUBSCRIPTIONS,
    FeaturePermission.VIEW_REPORTS,
    FeaturePermission.EXPORT_REPORTS,
    FeaturePermission.MANAGE_REPORTS,
    FeaturePermission.VIEW_BASIC_ANALYTICS,
    FeaturePermission.VIEW_ADVANCED_ANALYTICS,
    FeaturePermission.PRESENCE_ANALYTICS,
    FeaturePermission.CUSTOM_REPORTS,
    FeaturePermission.SCHEDULED_REPORTS,
    FeaturePermission.EXPORT_DATA,
    FeaturePermission.MANAGE_SETTINGS,
    FeaturePermission.VIEW_AUDIT_LOGS,
    FeaturePermission.MANAGE_INTEGRATIONS,
    FeaturePermission.CUSTOM_BRANDING,
    FeaturePermission.API_ACCESS,
    FeaturePermission.WEBHOOK_ACCESS,
    FeaturePermission.THIRD_PARTY_INTEGRATIONS,
    FeaturePermission.PRIORITY_SUPPORT,
    FeaturePermission.MANAGE_TENANT,
    FeaturePermission.VIEW_TENANT_STATS
  ],
  [TenantRole.ADMIN]: [
    FeaturePermission.MANAGE_USERS,
    FeaturePermission.INVITE_USERS,
    FeaturePermission.VIEW_USERS,
    FeaturePermission.MANAGE_EVENTS,
    FeaturePermission.CREATE_EVENTS,
    FeaturePermission.VIEW_EVENTS,
    FeaturePermission.MANAGE_PRESENCE,
    FeaturePermission.VIEW_PRESENCE,
    FeaturePermission.CHECK_PRESENCE,
    FeaturePermission.EXPORT_PRESENCE,
    FeaturePermission.BULK_PRESENCE_MANAGEMENT,
    FeaturePermission.VIEW_REPORTS,
    FeaturePermission.EXPORT_REPORTS,
    FeaturePermission.VIEW_BASIC_ANALYTICS,
    FeaturePermission.PRESENCE_ANALYTICS,
    FeaturePermission.MANAGE_SETTINGS,
    FeaturePermission.MANAGE_INTEGRATIONS
  ],
  [TenantRole.MANAGER]: [
    FeaturePermission.INVITE_USERS,
    FeaturePermission.VIEW_USERS,
    FeaturePermission.CREATE_EVENTS,
    FeaturePermission.VIEW_EVENTS,
    FeaturePermission.MANAGE_PRESENCE,
    FeaturePermission.VIEW_PRESENCE,
    FeaturePermission.CHECK_PRESENCE,
    FeaturePermission.VIEW_REPORTS,
    FeaturePermission.VIEW_BASIC_ANALYTICS
  ],
  [TenantRole.MEMBER]: [
    FeaturePermission.VIEW_USERS,
    FeaturePermission.VIEW_EVENTS,
    FeaturePermission.VIEW_PRESENCE,
    FeaturePermission.CHECK_PRESENCE
  ],
  [TenantRole.VIEWER]: [
    FeaturePermission.VIEW_USERS,
    FeaturePermission.VIEW_EVENTS,
    FeaturePermission.VIEW_PRESENCE
  ]
};