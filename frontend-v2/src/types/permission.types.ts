/**
 * Types pour le système de permissions
 */

export enum TenantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export enum FeaturePermission {
  // Gestion utilisateurs
  MANAGE_USERS = 'manage_users',
  INVITE_USERS = 'invite_users',
  VIEW_USERS = 'view_users',

  // Événements
  VIEW_ALL_EVENTS = 'view_all_events',
  CREATE_EVENTS = 'create_events',
  EDIT_EVENTS = 'edit_events',
  DELETE_EVENTS = 'delete_events',

  // Présence
  MANAGE_PRESENCE = 'manage_presence',
  VIEW_PRESENCE = 'view_presence',
  CHECK_PRESENCE = 'check_presence',
  RECORD_ATTENDANCE = 'record_attendance',
  VIEW_OWN_ATTENDANCE = 'view_own_attendance',
  BULK_PRESENCE_MANAGEMENT = 'bulk_presence_management',
  GEOFENCING = 'geofencing',

  // Feuilles de temps
  VIEW_TIMESHEET = 'view_timesheet',
  CREATE_TIMESHEET = 'create_timesheet',
  APPROVE_TIMESHEET = 'approve_timesheet',

  // Équipes
  VIEW_TEAMS = 'view_teams',
  MANAGE_TEAMS = 'manage_teams',

  // Notifications
  SEND_NOTIFICATIONS = 'send_notifications',

  // Analytics & Reports
  VIEW_BASIC_ANALYTICS = 'view_basic_analytics',
  VIEW_ADVANCED_ANALYTICS = 'view_advanced_analytics',
  VIEW_ANALYTICS = 'view_analytics',
  VIEW_REPORTS = 'view_reports',
  PRESENCE_ANALYTICS = 'presence_analytics',
  CUSTOM_REPORTS = 'custom_reports',
  SCHEDULED_REPORTS = 'scheduled_reports',
  EXPORT_DATA = 'export_data',

  // Configuration
  MANAGE_SETTINGS = 'manage_settings',
  MANAGE_INTEGRATIONS = 'manage_integrations',
  VIEW_INTEGRATIONS = 'view_integrations',
  CUSTOM_BRANDING = 'custom_branding',

  // API & Intégrations
  API_ACCESS = 'api_access',
  WEBHOOK_ACCESS = 'webhook_access',
  THIRD_PARTY_INTEGRATIONS = 'third_party_integrations'
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

export interface UserContext {
  userId: string;
  tenantRole: TenantRole;
  effectivePermissions: FeaturePermission[];
  planFeatures: PlanFeatures;
  planLimits: PlanLimits;
}

export interface PermissionCheckRequest {
  userId: string;
  permission: FeaturePermission;
}

export interface PermissionCheckResponse {
  userId: string;
  permission: FeaturePermission;
  hasPermission: boolean;
}

export interface RolePermissionsResponse {
  role: TenantRole;
  permissions: FeaturePermission[];
}

export interface PlanFeaturesResponse {
  planType: string;
  features: {
    maxUsers?: number;
    maxEvents?: number;
    basicReporting?: boolean;
    advancedReporting?: boolean;
    emailSupport?: boolean;
    prioritySupport?: boolean;
    apiAccess?: boolean;
    customBranding?: boolean;
    ssoIntegration?: boolean;
  };
}