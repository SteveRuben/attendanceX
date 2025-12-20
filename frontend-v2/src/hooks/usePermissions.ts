/**
 * Hook personnalisé pour la gestion des permissions tenant-scoped
 * Fournit des helpers pour les vérifications de permissions courantes
 */

import { useTenant } from '@/contexts/TenantContext'
import { Permission, TenantRole, ROLE_HIERARCHY } from '@/types/permissions'

export function usePermissions() {
  const { hasPermission, hasRole, membership, currentTenant } = useTenant()

  // ==========================================
  // TIMESHEET PERMISSIONS
  // ==========================================
  const canCreateTimesheet = () => hasPermission('create_timesheet')
  const canViewTimesheet = () => hasPermission('view_timesheet')
  const canEditTimesheet = () => hasPermission('edit_timesheet')
  const canDeleteTimesheet = () => hasPermission('delete_timesheet')
  const canSubmitTimesheet = () => hasPermission('submit_timesheet')
  const canApproveTimesheet = () => hasPermission('approve_timesheet')
  const canLockTimesheet = () => hasPermission('lock_timesheet')

  // ==========================================
  // TIME ENTRY PERMISSIONS
  // ==========================================
  const canCreateTimeEntry = () => hasPermission('create_time_entry')
  const canViewTimeEntry = () => hasPermission('view_time_entry')
  const canEditTimeEntry = () => hasPermission('edit_time_entry')
  const canDeleteTimeEntry = () => hasPermission('delete_time_entry')
  const canExportTimeEntry = () => hasPermission('export_time_entry')

  // ==========================================
  // PROJECT PERMISSIONS
  // ==========================================
  const canCreateProject = () => hasPermission('create_project')
  const canViewProject = () => hasPermission('view_project')
  const canEditProject = () => hasPermission('edit_project')
  const canDeleteProject = () => hasPermission('delete_project')

  // ==========================================
  // ACTIVITY CODE PERMISSIONS
  // ==========================================
  const canCreateActivityCode = () => hasPermission('create_activity_code')
  const canViewActivityCode = () => hasPermission('view_activity_code')
  const canEditActivityCode = () => hasPermission('edit_activity_code')
  const canDeleteActivityCode = () => hasPermission('delete_activity_code')

  // ==========================================
  // EVENT PERMISSIONS
  // ==========================================
  const canCreateEvents = () => hasPermission('create_events')
  const canManageAllEvents = () => hasPermission('manage_all_events')
  const canManageOwnEvents = () => hasPermission('manage_own_events')
  const canViewAllEvents = () => hasPermission('view_all_events')
  const canDeleteEvents = () => hasPermission('delete_events')

  // ==========================================
  // ATTENDANCE PERMISSIONS
  // ==========================================
  const canRecordAttendance = () => hasPermission('record_attendance')
  const canViewAllAttendance = () => hasPermission('view_all_attendance')
  const canViewOwnAttendance = () => hasPermission('view_own_attendance')
  const canValidateAttendance = () => hasPermission('validate_attendance')
  const canManageCheckinSettings = () => hasPermission('manage_checkin_settings')

  // ==========================================
  // REPORTS & ANALYTICS PERMISSIONS
  // ==========================================
  const canViewReports = () => hasPermission('view_reports')
  const canExportData = () => hasPermission('export_data')
  const canViewAnalytics = () => hasPermission('view_analytics')

  // ==========================================
  // NOTIFICATION PERMISSIONS
  // ==========================================
  const canSendNotifications = () => hasPermission('send_notifications')
  const canManageNotifications = () => hasPermission('manage_notifications')

  // ==========================================
  // TENANT SETTINGS PERMISSIONS
  // ==========================================
  const canManageTenantSettings = () => hasPermission('manage_tenant_settings')
  const canManageAttendancePolicy = () => hasPermission('manage_attendance_policy')

  // ==========================================
  // INTEGRATION PERMISSIONS
  // ==========================================
  const canManageIntegrations = () => hasPermission('manage_integrations')
  const canViewIntegrations = () => hasPermission('view_integrations')

  // ==========================================
  // TEAM PERMISSIONS
  // ==========================================
  const canManageTeams = () => hasPermission('manage_teams')
  const canViewTeams = () => hasPermission('view_teams')
  const canManageTeamMembers = () => hasPermission('manage_team_members')

  // ==========================================
  // ROLE CHECKS
  // ==========================================
  const isOwner = () => hasRole('owner')
  const isAdmin = () => hasRole(['owner', 'admin'])
  const isManager = () => hasRole(['owner', 'admin', 'manager'])
  const isMember = () => hasRole(['owner', 'admin', 'manager', 'member'])
  const isViewer = () => hasRole('viewer')

  // ==========================================
  // ADVANCED PERMISSION CHECKS
  // ==========================================
  
  /**
   * Vérifie si l'utilisateur a au moins une des permissions spécifiées
   */
  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }

  /**
   * Vérifie si l'utilisateur a toutes les permissions spécifiées
   */
  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission))
  }

  /**
   * Vérifie si l'utilisateur a un rôle supérieur ou égal au rôle spécifié
   */
  const hasRoleLevel = (minRole: TenantRole): boolean => {
    if (!membership?.role) return false
    const userLevel = ROLE_HIERARCHY[membership.role as TenantRole] || 0
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0
    return userLevel >= requiredLevel
  }

  /**
   * Vérifie si l'utilisateur peut gérer un autre utilisateur basé sur la hiérarchie des rôles
   */
  const canManageUser = (targetUserRole: TenantRole): boolean => {
    if (!membership?.role) return false
    const userLevel = ROLE_HIERARCHY[membership.role as TenantRole] || 0
    const targetLevel = ROLE_HIERARCHY[targetUserRole] || 0
    return userLevel > targetLevel
  }

  /**
   * Vérifie si l'utilisateur peut accéder à une ressource spécifique
   */
  const canAccessResource = (resourceOwnerId?: string): boolean => {
    if (!membership) return false
    
    // Les owners et admins peuvent accéder à toutes les ressources
    if (isAdmin()) return true
    
    // Les autres utilisateurs peuvent accéder à leurs propres ressources
    if (resourceOwnerId && membership.userId === resourceOwnerId) return true
    
    return false
  }

  // ==========================================
  // COMPOSITE PERMISSIONS (Business Logic)
  // ==========================================
  
  /**
   * Peut gérer les timesheets (créer, éditer, approuver)
   */
  const canManageTimesheets = () => {
    return hasAnyPermission(['create_timesheet', 'edit_timesheet', 'approve_timesheet'])
  }

  /**
   * Peut gérer les événements (créer, éditer, supprimer)
   */
  const canManageEvents = () => {
    return hasAnyPermission(['create_events', 'manage_all_events', 'manage_own_events'])
  }

  /**
   * Peut gérer les présences (enregistrer, valider)
   */
  const canManageAttendance = () => {
    return hasAnyPermission(['record_attendance', 'validate_attendance'])
  }

  /**
   * A accès aux fonctionnalités d'administration
   */
  const hasAdminAccess = () => {
    return hasAnyPermission([
      'manage_tenant_settings',
      'manage_integrations',
      'manage_teams',
      'manage_notifications'
    ])
  }

  /**
   * A accès aux rapports et analytics
   */
  const hasReportingAccess = () => {
    return hasAnyPermission(['view_reports', 'view_analytics', 'export_data'])
  }

  return {
    // Timesheet permissions
    canCreateTimesheet,
    canViewTimesheet,
    canEditTimesheet,
    canDeleteTimesheet,
    canSubmitTimesheet,
    canApproveTimesheet,
    canLockTimesheet,

    // Time entry permissions
    canCreateTimeEntry,
    canViewTimeEntry,
    canEditTimeEntry,
    canDeleteTimeEntry,
    canExportTimeEntry,

    // Project permissions
    canCreateProject,
    canViewProject,
    canEditProject,
    canDeleteProject,

    // Activity code permissions
    canCreateActivityCode,
    canViewActivityCode,
    canEditActivityCode,
    canDeleteActivityCode,

    // Event permissions
    canCreateEvents,
    canManageAllEvents,
    canManageOwnEvents,
    canViewAllEvents,
    canDeleteEvents,

    // Attendance permissions
    canRecordAttendance,
    canViewAllAttendance,
    canViewOwnAttendance,
    canValidateAttendance,
    canManageCheckinSettings,

    // Reports & analytics permissions
    canViewReports,
    canExportData,
    canViewAnalytics,

    // Notification permissions
    canSendNotifications,
    canManageNotifications,

    // Settings permissions
    canManageTenantSettings,
    canManageAttendancePolicy,

    // Integration permissions
    canManageIntegrations,
    canViewIntegrations,

    // Team permissions
    canManageTeams,
    canViewTeams,
    canManageTeamMembers,

    // Role checks
    isOwner,
    isAdmin,
    isManager,
    isMember,
    isViewer,

    // Advanced checks
    hasAnyPermission,
    hasAllPermissions,
    hasRoleLevel,
    canManageUser,
    canAccessResource,

    // Composite permissions
    canManageTimesheets,
    canManageEvents,
    canManageAttendance,
    hasAdminAccess,
    hasReportingAccess,

    // Raw access to context
    hasPermission,
    hasRole,
    membership,
    currentTenant
  }
}