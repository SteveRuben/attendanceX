/**
 * Types pour le système de permissions tenant-scoped
 * Aligné avec le backend permission system
 */

export type Permission = 
  // Timesheet Management
  | 'create_timesheet' | 'view_timesheet' | 'edit_timesheet' | 'delete_timesheet'
  | 'submit_timesheet' | 'approve_timesheet' | 'lock_timesheet'
  
  // Time Entry Management  
  | 'create_time_entry' | 'view_time_entry' | 'edit_time_entry' 
  | 'delete_time_entry' | 'export_time_entry'
  
  // Project Management
  | 'create_project' | 'view_project' | 'edit_project' | 'delete_project'
  
  // Activity Code Management
  | 'create_activity_code' | 'view_activity_code' | 'edit_activity_code' | 'delete_activity_code'
  
  // Event Management
  | 'create_events' | 'manage_all_events' | 'manage_own_events' 
  | 'view_all_events' | 'delete_events'
  
  // Attendance & Check-in
  | 'record_attendance' | 'view_all_attendance' | 'view_own_attendance' 
  | 'validate_attendance' | 'manage_checkin_settings'
  
  // Reports & Analytics
  | 'view_reports' | 'export_data' | 'view_analytics'
  
  // Notifications
  | 'send_notifications' | 'manage_notifications'
  
  // Tenant Settings
  | 'manage_tenant_settings' | 'manage_attendance_policy'
  
  // Integrations
  | 'manage_integrations' | 'view_integrations'
  
  // Teams & Departments
  | 'manage_teams' | 'view_teams' | 'manage_team_members'

export type TenantRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer'

export interface PermissionCheck {
  permission?: Permission
  permissions?: Permission[]
  role?: TenantRole | TenantRole[]
  requireAll?: boolean
}

export interface PermissionContext {
  userId: string
  tenantId: string
  resourceId?: string
  resourceType?: string
  resourceOwnerId?: string
}

// Permission categories for organization
export const PERMISSION_CATEGORIES = {
  TIMESHEET: [
    'create_timesheet', 'view_timesheet', 'edit_timesheet', 'delete_timesheet',
    'submit_timesheet', 'approve_timesheet', 'lock_timesheet'
  ] as Permission[],
  
  TIME_ENTRY: [
    'create_time_entry', 'view_time_entry', 'edit_time_entry', 
    'delete_time_entry', 'export_time_entry'
  ] as Permission[],
  
  PROJECT: [
    'create_project', 'view_project', 'edit_project', 'delete_project'
  ] as Permission[],
  
  ACTIVITY_CODE: [
    'create_activity_code', 'view_activity_code', 'edit_activity_code', 'delete_activity_code'
  ] as Permission[],
  
  EVENT: [
    'create_events', 'manage_all_events', 'manage_own_events', 
    'view_all_events', 'delete_events'
  ] as Permission[],
  
  ATTENDANCE: [
    'record_attendance', 'view_all_attendance', 'view_own_attendance', 
    'validate_attendance', 'manage_checkin_settings'
  ] as Permission[],
  
  REPORTS: [
    'view_reports', 'export_data', 'view_analytics'
  ] as Permission[],
  
  NOTIFICATIONS: [
    'send_notifications', 'manage_notifications'
  ] as Permission[],
  
  SETTINGS: [
    'manage_tenant_settings', 'manage_attendance_policy'
  ] as Permission[],
  
  INTEGRATIONS: [
    'manage_integrations', 'view_integrations'
  ] as Permission[],
  
  TEAMS: [
    'manage_teams', 'view_teams', 'manage_team_members'
  ] as Permission[]
} as const

// Role hierarchy levels for comparison
export const ROLE_HIERARCHY: Record<TenantRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  viewer: 1
} as const