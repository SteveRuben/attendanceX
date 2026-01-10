/**
 * Utilitaires pour la gestion des permissions
 * Fonctions helper pour les vérifications de permissions sans hooks
 */

import { Permission, TenantRole, ROLE_HIERARCHY, PERMISSION_CATEGORIES } from '@/types/permissions'

export interface TenantMembership {
  tenantId: string
  userId: string
  role: TenantRole
  permissions: Permission[]
  isActive: boolean
}

/**
 * Vérifie si un rôle a une permission spécifique (logique côté client)
 */
export function roleHasPermission(role: TenantRole, permission: Permission): boolean {
  // Les owners ont toutes les permissions
  if (role === 'owner') return true

  // Mapping des permissions par rôle (simplifié pour le client)
  const rolePermissions: Record<TenantRole, Permission[]> = {
    owner: Object.values(PERMISSION_CATEGORIES).flat(),
    admin: [
      ...PERMISSION_CATEGORIES.TIMESHEET,
      ...PERMISSION_CATEGORIES.TIME_ENTRY,
      ...PERMISSION_CATEGORIES.PROJECT,
      ...PERMISSION_CATEGORIES.ACTIVITY_CODE,
      ...PERMISSION_CATEGORIES.EVENT,
      ...PERMISSION_CATEGORIES.ATTENDANCE,
      ...PERMISSION_CATEGORIES.REPORTS,
      ...PERMISSION_CATEGORIES.NOTIFICATIONS,
      ...PERMISSION_CATEGORIES.INTEGRATIONS,
      ...PERMISSION_CATEGORIES.TEAMS,
      'manage_attendance_policy'
    ],
    manager: [
      'view_timesheet', 'create_timesheet', 'edit_timesheet', 'submit_timesheet', 'approve_timesheet',
      'view_time_entry', 'create_time_entry', 'edit_time_entry',
      'view_project', 'edit_project',
      'view_activity_code',
      'create_events', 'manage_own_events', 'view_all_events',
      'record_attendance', 'view_all_attendance', 'validate_attendance',
      'view_reports', 'view_analytics',
      'view_integrations',
      'view_teams', 'manage_team_members',
      'send_notifications'
    ],
    member: [
      'view_timesheet', 'create_timesheet', 'edit_timesheet', 'submit_timesheet',
      'view_time_entry', 'create_time_entry', 'edit_time_entry',
      'view_project',
      'view_activity_code',
      'create_events', 'manage_own_events', 'view_all_events',
      'record_attendance', 'view_own_attendance',
      'view_teams',
      'view_integrations'
    ],
    viewer: [
      'view_timesheet',
      'view_time_entry',
      'view_project',
      'view_activity_code',
      'view_all_events',
      'view_own_attendance',
      'view_teams',
      'view_integrations'
    ]
  }

  return rolePermissions[role]?.includes(permission) || false
}

/**
 * Vérifie si un membership a une permission
 */
export function membershipHasPermission(membership: TenantMembership | null, permission: Permission): boolean {
  if (!membership || !membership.isActive) return false
  
  // Vérifier les permissions explicites
  if (membership.permissions?.includes(permission)) return true
  
  // Vérifier les permissions basées sur le rôle
  return roleHasPermission(membership.role, permission)
}

/**
 * Vérifie si un membership a un rôle spécifique
 */
export function membershipHasRole(membership: TenantMembership | null, roles: TenantRole | TenantRole[]): boolean {
  if (!membership || !membership.isActive) return false
  
  const roleArray = Array.isArray(roles) ? roles : [roles]
  return roleArray.includes(membership.role)
}

/**
 * Compare deux rôles selon la hiérarchie
 */
export function compareRoles(role1: TenantRole, role2: TenantRole): number {
  const level1 = ROLE_HIERARCHY[role1] || 0
  const level2 = ROLE_HIERARCHY[role2] || 0
  return level1 - level2
}

/**
 * Vérifie si un rôle est supérieur ou égal à un autre
 */
export function isRoleHigherOrEqual(userRole: TenantRole, requiredRole: TenantRole): boolean {
  return compareRoles(userRole, requiredRole) >= 0
}

/**
 * Obtient toutes les permissions pour un rôle donné
 */
export function getPermissionsForRole(role: TenantRole): Permission[] {
  if (role === 'owner') {
    return Object.values(PERMISSION_CATEGORIES).flat()
  }

  // Utiliser la même logique que roleHasPermission mais retourner toutes les permissions
  const rolePermissions: Record<TenantRole, Permission[]> = {
    owner: Object.values(PERMISSION_CATEGORIES).flat(),
    admin: [
      ...PERMISSION_CATEGORIES.TIMESHEET,
      ...PERMISSION_CATEGORIES.TIME_ENTRY,
      ...PERMISSION_CATEGORIES.PROJECT,
      ...PERMISSION_CATEGORIES.ACTIVITY_CODE,
      ...PERMISSION_CATEGORIES.EVENT,
      ...PERMISSION_CATEGORIES.ATTENDANCE,
      ...PERMISSION_CATEGORIES.REPORTS,
      ...PERMISSION_CATEGORIES.NOTIFICATIONS,
      ...PERMISSION_CATEGORIES.INTEGRATIONS,
      ...PERMISSION_CATEGORIES.TEAMS,
      'manage_attendance_policy'
    ],
    manager: [
      'view_timesheet', 'create_timesheet', 'edit_timesheet', 'submit_timesheet', 'approve_timesheet',
      'view_time_entry', 'create_time_entry', 'edit_time_entry',
      'view_project', 'edit_project',
      'view_activity_code',
      'create_events', 'manage_own_events', 'view_all_events',
      'record_attendance', 'view_all_attendance', 'validate_attendance',
      'view_reports', 'view_analytics',
      'view_integrations',
      'view_teams', 'manage_team_members',
      'send_notifications'
    ],
    member: [
      'view_timesheet', 'create_timesheet', 'edit_timesheet', 'submit_timesheet',
      'view_time_entry', 'create_time_entry', 'edit_time_entry',
      'view_project',
      'view_activity_code',
      'create_events', 'manage_own_events', 'view_all_events',
      'record_attendance', 'view_own_attendance',
      'view_teams',
      'view_integrations'
    ],
    viewer: [
      'view_timesheet',
      'view_time_entry',
      'view_project',
      'view_activity_code',
      'view_all_events',
      'view_own_attendance',
      'view_teams',
      'view_integrations'
    ]
  }

  return rolePermissions[role] || []
}

/**
 * Filtre une liste d'éléments basée sur les permissions
 */
export function filterByPermission<T>(
  items: T[],
  membership: TenantMembership | null,
  getRequiredPermission: (item: T) => Permission
): T[] {
  if (!membership) return []
  
  return items.filter(item => {
    const requiredPermission = getRequiredPermission(item)
    return membershipHasPermission(membership, requiredPermission)
  })
}

/**
 * Groupe les permissions par catégorie
 */
export function groupPermissionsByCategory(permissions: Permission[]): Record<string, Permission[]> {
  const grouped: Record<string, Permission[]> = {}
  
  Object.entries(PERMISSION_CATEGORIES).forEach(([category, categoryPermissions]) => {
    const matchingPermissions = permissions.filter(p => categoryPermissions.includes(p))
    if (matchingPermissions.length > 0) {
      grouped[category] = matchingPermissions
    }
  })
  
  return grouped
}

/**
 * Obtient un nom lisible pour une permission
 */
export function getPermissionDisplayName(permission: Permission): string {
  const displayNames: Record<Permission, string> = {
    // Timesheet
    'create_timesheet': 'Créer des timesheets',
    'view_timesheet': 'Voir les timesheets',
    'edit_timesheet': 'Modifier les timesheets',
    'delete_timesheet': 'Supprimer les timesheets',
    'submit_timesheet': 'Soumettre les timesheets',
    'approve_timesheet': 'Approuver les timesheets',
    'lock_timesheet': 'Verrouiller les timesheets',
    
    // Time Entry
    'create_time_entry': 'Créer des entrées de temps',
    'view_time_entry': 'Voir les entrées de temps',
    'edit_time_entry': 'Modifier les entrées de temps',
    'delete_time_entry': 'Supprimer les entrées de temps',
    'export_time_entry': 'Exporter les entrées de temps',
    
    // Project
    'create_project': 'Créer des projets',
    'view_project': 'Voir les projets',
    'edit_project': 'Modifier les projets',
    'delete_project': 'Supprimer les projets',
    
    // Activity Code
    'create_activity_code': 'Créer des codes d\'activité',
    'view_activity_code': 'Voir les codes d\'activité',
    'edit_activity_code': 'Modifier les codes d\'activité',
    'delete_activity_code': 'Supprimer les codes d\'activité',
    
    // Event
    'create_events': 'Créer des événements',
    'manage_all_events': 'Gérer tous les événements',
    'manage_own_events': 'Gérer ses propres événements',
    'view_all_events': 'Voir tous les événements',
    'delete_events': 'Supprimer des événements',
    
    // Attendance
    'record_attendance': 'Enregistrer les présences',
    'view_all_attendance': 'Voir toutes les présences',
    'view_own_attendance': 'Voir ses propres présences',
    'validate_attendance': 'Valider les présences',
    'manage_checkin_settings': 'Gérer les paramètres de check-in',
    
    // Reports
    'view_reports': 'Voir les rapports',
    'export_data': 'Exporter les données',
    'view_analytics': 'Voir les analyses',
    
    // Notifications
    'send_notifications': 'Envoyer des notifications',
    'manage_notifications': 'Gérer les notifications',
    
    // Settings
    'manage_tenant_settings': 'Gérer les paramètres du tenant',
    'manage_attendance_policy': 'Gérer la politique de présence',
    
    // Integrations
    'manage_integrations': 'Gérer les intégrations',
    'view_integrations': 'Voir les intégrations',
    
    // Teams
    'manage_teams': 'Gérer les équipes',
    'view_teams': 'Voir les équipes',
    'manage_team_members': 'Gérer les membres d\'équipe'
  }
  
  return displayNames[permission] || permission
}

/**
 * Obtient un nom lisible pour un rôle
 */
export function getRoleDisplayName(role: TenantRole): string {
  const displayNames: Record<TenantRole, string> = {
    owner: 'Propriétaire',
    admin: 'Administrateur',
    manager: 'Manager',
    member: 'Membre',
    viewer: 'Observateur'
  }
  
  return displayNames[role] || role
}