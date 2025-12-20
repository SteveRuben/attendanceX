/**
 * Tenant-Scoped Permission Service
 * 
 * Provides comprehensive permission management for multi-tenant applications
 * Combines role-based permissions with feature-specific overrides and resource-level access control
 */

import { logger } from "firebase-functions";
import { collections } from "../../config/database";
import { TenantRole, TenantMembership, FeaturePermission } from "../../common/types";

// Permission categories for your attendance/event system
export enum PermissionCategory {
  // User Management
  USERS = 'users',
  // Event Management  
  EVENTS = 'events',
  // Attendance & Check-in
  ATTENDANCE = 'attendance',
  // Reporting & Analytics
  REPORTS = 'reports',
  // Tenant Settings
  SETTINGS = 'settings',
  // Integrations
  INTEGRATIONS = 'integrations',
  // Teams & Departments
  TEAMS = 'teams',
  // Notifications
  NOTIFICATIONS = 'notifications'
}

// Specific permissions for each category
export const PERMISSIONS = {
  // User Management
  MANAGE_USERS: 'manage_users',
  VIEW_ALL_USERS: 'view_all_users',
  INVITE_USERS: 'invite_users',
  CHANGE_USER_ROLES: 'change_user_roles',
  
  // Event Management
  CREATE_EVENTS: 'create_events',
  MANAGE_ALL_EVENTS: 'manage_all_events',
  MANAGE_OWN_EVENTS: 'manage_own_events',
  VIEW_ALL_EVENTS: 'view_all_events',
  DELETE_EVENTS: 'delete_events',
  
  // Attendance & Check-in
  RECORD_ATTENDANCE: 'record_attendance',
  VIEW_ALL_ATTENDANCE: 'view_all_attendance',
  VIEW_OWN_ATTENDANCE: 'view_own_attendance',
  MANAGE_CHECKIN_SETTINGS: 'manage_checkin_settings',
  VALIDATE_ATTENDANCE: 'validate_attendance',
  
  // Timesheet Management
  CREATE_TIMESHEET: 'create_timesheet',
  VIEW_TIMESHEET: 'view_timesheet',
  EDIT_TIMESHEET: 'edit_timesheet',
  DELETE_TIMESHEET: 'delete_timesheet',
  SUBMIT_TIMESHEET: 'submit_timesheet',
  APPROVE_TIMESHEET: 'approve_timesheet',
  LOCK_TIMESHEET: 'lock_timesheet',
  
  // Time Entry Management
  CREATE_TIME_ENTRY: 'create_time_entry',
  VIEW_TIME_ENTRY: 'view_time_entry',
  EDIT_TIME_ENTRY: 'edit_time_entry',
  DELETE_TIME_ENTRY: 'delete_time_entry',
  EXPORT_TIME_ENTRY: 'export_time_entry',
  
  // Project Management
  CREATE_PROJECT: 'create_project',
  VIEW_PROJECT: 'view_project',
  EDIT_PROJECT: 'edit_project',
  DELETE_PROJECT: 'delete_project',
  
  // Activity Code Management
  CREATE_ACTIVITY_CODE: 'create_activity_code',
  VIEW_ACTIVITY_CODE: 'view_activity_code',
  EDIT_ACTIVITY_CODE: 'edit_activity_code',
  DELETE_ACTIVITY_CODE: 'delete_activity_code',
  
  // Reporting & Analytics
  VIEW_REPORTS: 'view_reports',
  EXPORT_DATA: 'export_data',
  VIEW_ANALYTICS: 'view_analytics',
  
  // Tenant Settings
  MANAGE_TENANT_SETTINGS: 'manage_tenant_settings',
  MANAGE_ATTENDANCE_POLICY: 'manage_attendance_policy',
  
  // Integrations
  MANAGE_INTEGRATIONS: 'manage_integrations',
  VIEW_INTEGRATIONS: 'view_integrations',
  
  // Teams & Departments
  MANAGE_TEAMS: 'manage_teams',
  VIEW_TEAMS: 'view_teams',
  MANAGE_TEAM_MEMBERS: 'manage_team_members',
  
  // Notifications
  MANAGE_NOTIFICATIONS: 'manage_notifications',
  SEND_NOTIFICATIONS: 'send_notifications'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role hierarchy and default permissions
const ROLE_PERMISSIONS: Record<TenantRole, Permission[]> = {
  [TenantRole.OWNER]: [
    // All permissions - owners can do everything
    ...Object.values(PERMISSIONS)
  ],
  
  [TenantRole.ADMIN]: [
    // User management
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_ALL_USERS,
    PERMISSIONS.INVITE_USERS,
    PERMISSIONS.CHANGE_USER_ROLES,
    
    // Event management
    PERMISSIONS.CREATE_EVENTS,
    PERMISSIONS.MANAGE_ALL_EVENTS,
    PERMISSIONS.VIEW_ALL_EVENTS,
    PERMISSIONS.DELETE_EVENTS,
    
    // Attendance
    PERMISSIONS.RECORD_ATTENDANCE,
    PERMISSIONS.VIEW_ALL_ATTENDANCE,
    PERMISSIONS.MANAGE_CHECKIN_SETTINGS,
    PERMISSIONS.VALIDATE_ATTENDANCE,
    
    // Timesheet management
    PERMISSIONS.CREATE_TIMESHEET,
    PERMISSIONS.VIEW_TIMESHEET,
    PERMISSIONS.EDIT_TIMESHEET,
    PERMISSIONS.DELETE_TIMESHEET,
    PERMISSIONS.SUBMIT_TIMESHEET,
    PERMISSIONS.APPROVE_TIMESHEET,
    PERMISSIONS.LOCK_TIMESHEET,
    
    // Time entry management
    PERMISSIONS.CREATE_TIME_ENTRY,
    PERMISSIONS.VIEW_TIME_ENTRY,
    PERMISSIONS.EDIT_TIME_ENTRY,
    PERMISSIONS.DELETE_TIME_ENTRY,
    PERMISSIONS.EXPORT_TIME_ENTRY,
    
    // Project management
    PERMISSIONS.CREATE_PROJECT,
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.EDIT_PROJECT,
    PERMISSIONS.DELETE_PROJECT,
    
    // Activity code management
    PERMISSIONS.CREATE_ACTIVITY_CODE,
    PERMISSIONS.VIEW_ACTIVITY_CODE,
    PERMISSIONS.EDIT_ACTIVITY_CODE,
    PERMISSIONS.DELETE_ACTIVITY_CODE,
    
    // Reports & Analytics
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_ANALYTICS,
    
    // Settings (limited)
    PERMISSIONS.MANAGE_ATTENDANCE_POLICY,
    
    // Integrations
    PERMISSIONS.MANAGE_INTEGRATIONS,
    PERMISSIONS.VIEW_INTEGRATIONS,
    
    // Teams
    PERMISSIONS.MANAGE_TEAMS,
    PERMISSIONS.VIEW_TEAMS,
    PERMISSIONS.MANAGE_TEAM_MEMBERS,
    
    // Notifications
    PERMISSIONS.MANAGE_NOTIFICATIONS,
    PERMISSIONS.SEND_NOTIFICATIONS
  ],
  
  [TenantRole.MANAGER]: [
    // Limited user management
    PERMISSIONS.VIEW_ALL_USERS,
    PERMISSIONS.INVITE_USERS,
    
    // Event management
    PERMISSIONS.CREATE_EVENTS,
    PERMISSIONS.MANAGE_OWN_EVENTS,
    PERMISSIONS.VIEW_ALL_EVENTS,
    
    // Attendance
    PERMISSIONS.RECORD_ATTENDANCE,
    PERMISSIONS.VIEW_ALL_ATTENDANCE,
    PERMISSIONS.VALIDATE_ATTENDANCE,
    
    // Timesheet management (limited)
    PERMISSIONS.CREATE_TIMESHEET,
    PERMISSIONS.VIEW_TIMESHEET,
    PERMISSIONS.EDIT_TIMESHEET,
    PERMISSIONS.SUBMIT_TIMESHEET,
    PERMISSIONS.APPROVE_TIMESHEET,
    
    // Time entry management
    PERMISSIONS.CREATE_TIME_ENTRY,
    PERMISSIONS.VIEW_TIME_ENTRY,
    PERMISSIONS.EDIT_TIME_ENTRY,
    
    // Project management (limited)
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.EDIT_PROJECT,
    
    // Activity code management (view only)
    PERMISSIONS.VIEW_ACTIVITY_CODE,
    
    // Reports
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_ANALYTICS,
    
    // Teams (limited)
    PERMISSIONS.VIEW_TEAMS,
    PERMISSIONS.MANAGE_TEAM_MEMBERS,
    
    // Integrations (view only)
    PERMISSIONS.VIEW_INTEGRATIONS,
    
    // Notifications
    PERMISSIONS.SEND_NOTIFICATIONS
  ],
  
  [TenantRole.MEMBER]: [
    // Basic event access
    PERMISSIONS.CREATE_EVENTS,
    PERMISSIONS.MANAGE_OWN_EVENTS,
    PERMISSIONS.VIEW_ALL_EVENTS,
    
    // Own attendance and timesheet
    PERMISSIONS.RECORD_ATTENDANCE,
    PERMISSIONS.VIEW_OWN_ATTENDANCE,
    PERMISSIONS.CREATE_TIMESHEET,
    PERMISSIONS.VIEW_TIMESHEET,
    PERMISSIONS.EDIT_TIMESHEET,
    PERMISSIONS.SUBMIT_TIMESHEET,
    
    // Own time entries
    PERMISSIONS.CREATE_TIME_ENTRY,
    PERMISSIONS.VIEW_TIME_ENTRY,
    PERMISSIONS.EDIT_TIME_ENTRY,
    
    // Basic viewing
    PERMISSIONS.VIEW_TEAMS,
    PERMISSIONS.VIEW_INTEGRATIONS,
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.VIEW_ACTIVITY_CODE
  ],
  
  [TenantRole.VIEWER]: [
    // Read-only access
    PERMISSIONS.VIEW_ALL_EVENTS,
    PERMISSIONS.VIEW_OWN_ATTENDANCE,
    PERMISSIONS.VIEW_TIMESHEET,
    PERMISSIONS.VIEW_TIME_ENTRY,
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.VIEW_ACTIVITY_CODE,
    PERMISSIONS.VIEW_TEAMS,
    PERMISSIONS.VIEW_INTEGRATIONS
  ]
};

export interface PermissionContext {
  userId: string;
  tenantId: string;
  resourceId?: string;
  resourceType?: string;
  resourceOwnerId?: string;
}

export interface PermissionCheckResult {
  granted: boolean;
  reason: string;
  source: 'role' | 'feature' | 'resource' | 'denied';
}

export class TenantPermissionService {
  private membershipCache = new Map<string, TenantMembership | null>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Main permission check method
   */
  async hasPermission(
    context: PermissionContext,
    permission: Permission
  ): Promise<boolean> {
    const result = await this.checkPermission(context, permission);
    return result.granted;
  }

  /**
   * Detailed permission check with reasoning
   */
  async checkPermission(
    context: PermissionContext,
    permission: Permission
  ): Promise<PermissionCheckResult> {
    try {
      const { userId, tenantId, resourceId, resourceType, resourceOwnerId } = context;

      // Get user's tenant membership
      const membership = await this.getTenantMembership(userId, tenantId);
      
      if (!membership) {
        return {
          granted: false,
          reason: 'User is not a member of this tenant',
          source: 'denied'
        };
      }

      if (!membership.isActive) {
        return {
          granted: false,
          reason: 'User membership is inactive',
          source: 'denied'
        };
      }

      // 1. Check role-based permissions (fastest check)
      if (this.roleHasPermission(membership.role, permission)) {
        return {
          granted: true,
          reason: `Permission granted by role: ${membership.role}`,
          source: 'role'
        };
      }

      // 2. Check feature-specific overrides
      if (membership.featurePermissions?.some(fp => 
        this.featurePermissionMatches(fp, permission)
      )) {
        return {
          granted: true,
          reason: 'Permission granted by feature override',
          source: 'feature'
        };
      }

      // 3. Check resource-specific permissions (if applicable)
      if (resourceId && resourceType) {
        const resourcePermission = await this.checkResourcePermission(
          context,
          permission,
          resourceType,
          resourceId,
          resourceOwnerId
        );
        
        if (resourcePermission.granted) {
          return resourcePermission;
        }
      }

      return {
        granted: false,
        reason: `Permission '${permission}' not granted for role '${membership.role}'`,
        source: 'denied'
      };

    } catch (error) {
      logger.error('Error checking permission:', error);
      return {
        granted: false,
        reason: 'Error checking permission',
        source: 'denied'
      };
    }
  }

  /**
   * Check multiple permissions at once
   */
  async hasAnyPermission(
    context: PermissionContext,
    permissions: Permission[]
  ): Promise<boolean> {
    const results = await Promise.all(
      permissions.map(permission => this.hasPermission(context, permission))
    );
    return results.some(granted => granted);
  }

  /**
   * Check if user has all specified permissions
   */
  async hasAllPermissions(
    context: PermissionContext,
    permissions: Permission[]
  ): Promise<boolean> {
    const results = await Promise.all(
      permissions.map(permission => this.hasPermission(context, permission))
    );
    return results.every(granted => granted);
  }

  /**
   * Get all permissions for a user in a tenant
   */
  async getUserPermissions(
    userId: string,
    tenantId: string
  ): Promise<Permission[]> {
    const membership = await this.getTenantMembership(userId, tenantId);
    
    if (!membership || !membership.isActive) {
      return [];
    }

    // Start with role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[membership.role] || [];
    
    // Add feature-specific permissions
    const featurePermissions = membership.featurePermissions?.map(fp => 
      this.extractPermissionFromFeature(fp)
    ).filter(Boolean) || [];

    // Combine and deduplicate
    const allPermissions = [...new Set([...rolePermissions, ...featurePermissions])];
    
    return allPermissions;
  }

  /**
   * Check if role has permission
   */
  private roleHasPermission(role: TenantRole, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    return rolePermissions.includes(permission);
  }

  /**
   * Check if feature permission matches requested permission
   */
  private featurePermissionMatches(
    featurePermission: FeaturePermission,
    requestedPermission: Permission
  ): boolean {
    // This depends on how you structure FeaturePermission
    // For now, assuming it has a 'permission' field
    return (featurePermission as any).permission === requestedPermission;
  }

  /**
   * Extract permission string from feature permission object
   */
  private extractPermissionFromFeature(featurePermission: FeaturePermission): Permission | null {
    // This depends on your FeaturePermission structure
    return (featurePermission as any).permission || null;
  }

  /**
   * Check resource-specific permissions (e.g., "can edit THIS event")
   */
  private async checkResourcePermission(
    context: PermissionContext,
    permission: Permission,
    resourceType: string,
    resourceId: string,
    resourceOwnerId?: string
  ): Promise<PermissionCheckResult> {
    const { userId } = context;

    // Resource ownership check
    if (resourceOwnerId === userId) {
      // User owns the resource - check if they can manage their own resources
      const ownResourcePermissions: Permission[] = [
        PERMISSIONS.MANAGE_OWN_EVENTS,
        PERMISSIONS.VIEW_OWN_ATTENDANCE
      ];
      
      if (ownResourcePermissions.includes(permission)) {
        return {
          granted: true,
          reason: 'Permission granted - user owns this resource',
          source: 'resource'
        };
      }
    }

    // Team-based resource access (if applicable)
    if (resourceType === 'event' || resourceType === 'team') {
      // Check if user is part of the team that manages this resource
      // This would require additional team membership checks
      // Implementation depends on your team structure
    }

    return {
      granted: false,
      reason: 'No resource-specific permission found',
      source: 'denied'
    };
  }

  /**
   * Get tenant membership with caching
   */
  private async getTenantMembership(
    userId: string,
    tenantId: string
  ): Promise<TenantMembership | null> {
    const cacheKey = `${userId}:${tenantId}`;
    const now = Date.now();
    
    // Check cache
    if (this.membershipCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (now < expiry) {
        return this.membershipCache.get(cacheKey) || null;
      }
    }

    try {
      // Fetch from database
      const membershipQuery = await collections.tenant_memberships
        .where('userId', '==', userId)
        .where('tenantId', '==', tenantId)
        .limit(1)
        .get();

      const membership = membershipQuery.empty 
        ? null 
        : { id: membershipQuery.docs[0].id, ...membershipQuery.docs[0].data() } as TenantMembership;

      // Cache the result
      this.membershipCache.set(cacheKey, membership);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);

      return membership;
    } catch (error) {
      logger.error('Error fetching tenant membership:', error);
      return null;
    }
  }

  /**
   * Clear cache for a specific user or tenant
   */
  clearCache(userId?: string, tenantId?: string): void {
    if (userId && tenantId) {
      const cacheKey = `${userId}:${tenantId}`;
      this.membershipCache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
    } else if (userId) {
      // Clear all entries for this user
      for (const key of this.membershipCache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.membershipCache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.membershipCache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * Get default permissions for a role
   */
  static getDefaultRolePermissions(role: TenantRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if one role is higher than another in hierarchy
   */
  static isRoleHigherThan(role1: TenantRole, role2: TenantRole): boolean {
    const hierarchy = {
      [TenantRole.OWNER]: 5,
      [TenantRole.ADMIN]: 4,
      [TenantRole.MANAGER]: 3,
      [TenantRole.MEMBER]: 2,
      [TenantRole.VIEWER]: 1
    };
    
    return (hierarchy[role1] || 0) > (hierarchy[role2] || 0);
  }
}

// Export singleton instance
export const tenantPermissionService = new TenantPermissionService();