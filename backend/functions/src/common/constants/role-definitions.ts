import { 
  RoleDefinition, 
  UserRole, 
  Permission, 
  RoleScope,
  PermissionGroup,
  PermissionCategory 
} from '../types/role.types';

// 🏛️ Définitions complètes des rôles système
export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
    [UserRole.OWNER]: {
    id: 'super_admin',
    name: UserRole.SUPER_ADMIN,
    displayName: 'Super Administrateur',
    description: 'Accès complet à toutes les fonctionnalités du système. Peut gérer tous les utilisateurs, paramètres et données.',
    permissions: Object.values(Permission), // TOUTES les permissions
    isSystemRole: true,
    isActive: true,
    hierarchy: 1,
    color: '#dc2626', // Rouge
    icon: 'crown',
    scope: RoleScope.GLOBAL,
    limitations: {
      canAccessAPI: true,
      canUseAdvancedFeatures: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  [UserRole.SUPER_ADMIN]: {
    id: 'super_admin',
    name: UserRole.SUPER_ADMIN,
    displayName: 'Super Administrateur',
    description: 'Accès complet à toutes les fonctionnalités du système. Peut gérer tous les utilisateurs, paramètres et données.',
    permissions: Object.values(Permission), // TOUTES les permissions
    isSystemRole: true,
    isActive: true,
    hierarchy: 1,
    color: '#dc2626', // Rouge
    icon: 'crown',
    scope: RoleScope.GLOBAL,
    limitations: {
      canAccessAPI: true,
      canUseAdvancedFeatures: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [UserRole.ADMIN]: {
    id: 'admin',
    name: UserRole.ADMIN,
    displayName: 'Administrateur',
    description: 'Gestion complète des utilisateurs, événements et configuration système. Accès aux rapports avancés.',
    permissions: [
      // Gestion utilisateurs
      Permission.VIEW_ALL_USERS,
      Permission.VIEW_USER_DETAILS,
      Permission.CREATE_USERS,
      Permission.EDIT_USERS,
      Permission.DELETE_USERS,
      Permission.MANAGE_USER_ROLES,
      Permission.INVITE_USERS,
      Permission.SUSPEND_USERS,
      Permission.VIEW_USER_ACTIVITY,

      // Gestion événements
      Permission.VIEW_ALL_EVENTS,
      Permission.VIEW_EVENT_DETAILS,
      Permission.CREATE_EVENTS,
      Permission.EDIT_ALL_EVENTS,
      Permission.DELETE_ALL_EVENTS,
      Permission.MANAGE_EVENT_PARTICIPANTS,
      Permission.APPROVE_EVENTS,
      Permission.PUBLISH_EVENTS,
      Permission.CANCEL_EVENTS,
      Permission.DUPLICATE_EVENTS,
      Permission.VIEW_EVENT_ANALYTICS,

      // Gestion présences
      Permission.VIEW_ALL_ATTENDANCES,
      Permission.MARK_ATTENDANCE_FOR_OTHERS,
      Permission.VALIDATE_ATTENDANCES,
      Permission.EDIT_ATTENDANCES,
      Permission.BULK_MANAGE_ATTENDANCES,
      Permission.VIEW_ATTENDANCE_PATTERNS,
      Permission.OVERRIDE_ATTENDANCE_RULES,

      // Notifications
      Permission.VIEW_ALL_NOTIFICATIONS,
      Permission.SEND_NOTIFICATIONS,
      Permission.SEND_BULK_NOTIFICATIONS,
      Permission.MANAGE_NOTIFICATION_TEMPLATES,
      Permission.VIEW_NOTIFICATION_STATS,
      Permission.CONFIGURE_NOTIFICATION_SETTINGS,

      // Rapports
      Permission.VIEW_BASIC_REPORTS,
      Permission.VIEW_ADVANCED_REPORTS,
      Permission.CREATE_CUSTOM_REPORTS,
      Permission.SCHEDULE_REPORTS,
      Permission.EXPORT_REPORTS,
      Permission.VIEW_REAL_TIME_ANALYTICS,
      Permission.VIEW_ML_INSIGHTS,

      // Administration
      Permission.MANAGE_SYSTEM_SETTINGS,
      Permission.VIEW_SYSTEM_LOGS,
      Permission.MANAGE_INTEGRATIONS,
      Permission.VIEW_SYSTEM_HEALTH,

      // Fichiers
      Permission.UPLOAD_FILES,
      Permission.VIEW_ALL_FILES,
      Permission.DELETE_FILES,
      Permission.MANAGE_FILE_PERMISSIONS,

      // Sécurité
      Permission.VIEW_SECURITY_LOGS,
      Permission.RESET_USER_PASSWORDS,
      Permission.VIEW_LOGIN_ATTEMPTS,

      // ML
      Permission.VIEW_ML_MODELS,
      Permission.VIEW_ML_PREDICTIONS,
    ],
    isSystemRole: true,
    isActive: true,
    hierarchy: 2,
    color: '#ea580c', // Orange
    icon: 'shield-check',
    scope: RoleScope.GLOBAL,
    limitations: {
      canAccessAPI: true,
      canUseAdvancedFeatures: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [UserRole.MANAGER]: {
    id: 'manager',
    name: UserRole.MANAGER,
    displayName: 'Manager',
    description: 'Gestion des équipes et événements de son département. Validation des présences et accès aux rapports.',
    permissions: [
      // Gestion utilisateurs limitée
      Permission.VIEW_ALL_USERS,
      Permission.VIEW_USER_DETAILS,
      Permission.INVITE_USERS,
      Permission.VIEW_USER_ACTIVITY,

      // Gestion événements
      Permission.VIEW_ALL_EVENTS,
      Permission.VIEW_EVENT_DETAILS,
      Permission.CREATE_EVENTS,
      Permission.EDIT_OWN_EVENTS,
      Permission.DELETE_OWN_EVENTS,
      Permission.MANAGE_EVENT_PARTICIPANTS,
      Permission.PUBLISH_EVENTS,
      Permission.DUPLICATE_EVENTS,
      Permission.VIEW_EVENT_ANALYTICS,

      // Gestion présences
      Permission.VIEW_ALL_ATTENDANCES,
      Permission.MARK_ATTENDANCE_FOR_OTHERS,
      Permission.VALIDATE_ATTENDANCES,
      Permission.EDIT_ATTENDANCES,
      Permission.BULK_MANAGE_ATTENDANCES,
      Permission.VIEW_ATTENDANCE_PATTERNS,

      // Notifications
      Permission.SEND_NOTIFICATIONS,
      Permission.SEND_BULK_NOTIFICATIONS,
      Permission.VIEW_NOTIFICATION_STATS,

      // Rapports
      Permission.VIEW_BASIC_REPORTS,
      Permission.VIEW_ADVANCED_REPORTS,
      Permission.CREATE_CUSTOM_REPORTS,
      Permission.EXPORT_REPORTS,
      Permission.VIEW_REAL_TIME_ANALYTICS,

      // Fichiers
      Permission.UPLOAD_FILES,
      Permission.VIEW_ALL_FILES,
    ],
    isSystemRole: true,
    isActive: true,
    hierarchy: 3,
    color: '#059669', // Vert
    icon: 'users',
    scope: RoleScope.DEPARTMENT,
    limitations: {
      maxEventsPerMonth: 50,
      maxParticipantsPerEvent: 500,
      maxFileUploadSizeMB: 50,
      maxReportsPerDay: 20,
      canAccessAPI: true,
      canUseAdvancedFeatures: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [UserRole.ORGANIZER]: {
    id: 'organizer',
    name: UserRole.ORGANIZER,
    displayName: 'Organisateur',
    description: 'Création et gestion d\'événements. Gestion des participants et suivi des présences.',
    permissions: [
      // Utilisateurs basique
      Permission.VIEW_USER_DETAILS,

      // Gestion événements
      Permission.VIEW_ALL_EVENTS,
      Permission.VIEW_EVENT_DETAILS,
      Permission.CREATE_EVENTS,
      Permission.EDIT_OWN_EVENTS,
      Permission.DELETE_OWN_EVENTS,
      Permission.MANAGE_EVENT_PARTICIPANTS,
      Permission.PUBLISH_EVENTS,
      Permission.DUPLICATE_EVENTS,
      Permission.VIEW_EVENT_ANALYTICS,

      // Gestion présences
      Permission.VIEW_ALL_ATTENDANCES,
      Permission.MARK_ATTENDANCE_FOR_OTHERS,
      Permission.VALIDATE_ATTENDANCES,
      Permission.VIEW_ATTENDANCE_PATTERNS,

      // Notifications
      Permission.SEND_NOTIFICATIONS,
      Permission.VIEW_NOTIFICATION_STATS,

      // Rapports
      Permission.VIEW_BASIC_REPORTS,
      Permission.EXPORT_REPORTS,
      Permission.VIEW_REAL_TIME_ANALYTICS,

      // Fichiers
      Permission.UPLOAD_FILES,
    ],
    isSystemRole: true,
    isActive: true,
    hierarchy: 4,
    color: '#2563eb', // Bleu
    icon: 'calendar',
    scope: RoleScope.DEPARTMENT,
    limitations: {
      maxEventsPerMonth: 20,
      maxParticipantsPerEvent: 200,
      maxFileUploadSizeMB: 25,
      maxReportsPerDay: 10,
      canAccessAPI: false,
      canUseAdvancedFeatures: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [UserRole.MODERATOR]: {
    id: 'moderator',
    name: UserRole.MODERATOR,
    displayName: 'Modérateur',
    description: 'Validation des présences et assistance aux participants. Accès aux rapports de base.',
    permissions: [
      // Gestion présences
      Permission.VIEW_ALL_ATTENDANCES,
      Permission.MARK_ATTENDANCE_FOR_OTHERS,
      Permission.VALIDATE_ATTENDANCES,
      Permission.EDIT_ATTENDANCES,

      // Événements consultation
      Permission.VIEW_ALL_EVENTS,
      Permission.VIEW_EVENT_DETAILS,
      Permission.VIEW_EVENT_ANALYTICS,

      // Notifications basiques
      Permission.SEND_NOTIFICATIONS,

      // Rapports
      Permission.VIEW_BASIC_REPORTS,
      Permission.EXPORT_REPORTS,

      // Fichiers
      Permission.UPLOAD_FILES,
    ],
    isSystemRole: true,
    isActive: true,
    hierarchy: 5,
    color: '#7c3aed', // Violet
    icon: 'check-circle',
    scope: RoleScope.LOCATION,
    limitations: {
      maxFileUploadSizeMB: 10,
      maxReportsPerDay: 5,
      canAccessAPI: false,
      canUseAdvancedFeatures: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [UserRole.PARTICIPANT]: {
    id: 'participant',
    name: UserRole.PARTICIPANT,
    displayName: 'Participant',
    description: 'Utilisateur standard pouvant s\'inscrire aux événements et marquer sa présence.',
    permissions: [
      // Présences personnelles
      Permission.VIEW_OWN_ATTENDANCES,
      Permission.MARK_ATTENDANCE,

      // Événements consultation
      Permission.VIEW_EVENT_DETAILS,

      // Fichiers basiques
      Permission.UPLOAD_FILES,
    ],
    isSystemRole: true,
    isActive: true,
    hierarchy: 6,
    color: '#16a34a', // Vert clair
    icon: 'user',
    scope: RoleScope.GLOBAL,
    limitations: {
      maxFileUploadSizeMB: 5,
      canAccessAPI: false,
      canUseAdvancedFeatures: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [UserRole.VIEWER]: {
    id: 'viewer',
    name: UserRole.VIEWER,
    displayName: 'Observateur',
    description: 'Accès en lecture seule aux événements publics et à ses propres données.',
    permissions: [
      // Consultation uniquement
      Permission.VIEW_OWN_ATTENDANCES,
      Permission.VIEW_EVENT_DETAILS,
    ],
    isSystemRole: true,
    isActive: true,
    hierarchy: 7,
    color: '#64748b', // Gris
    icon: 'eye',
    scope: RoleScope.GLOBAL,
    limitations: {
      canAccessAPI: false,
      canUseAdvancedFeatures: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [UserRole.GUEST]: {
    id: 'guest',
    name: UserRole.GUEST,
    displayName: 'Invité',
    description: 'Accès très limité pour les utilisateurs temporaires ou externes.',
    permissions: [
      // Accès minimal
      Permission.VIEW_EVENT_DETAILS,
      Permission.MARK_ATTENDANCE,
    ],
    isSystemRole: true,
    isActive: true,
    hierarchy: 8,
    color: '#94a3b8', // Gris clair
    icon: 'user-plus',
    scope: RoleScope.CUSTOM,
    limitations: {
      canAccessAPI: false,
      canUseAdvancedFeatures: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  [UserRole.ANALYST]: {
    id: 'guest',
    name: UserRole.GUEST,
    displayName: 'Invité',
    description: 'Accès très limité pour les utilisateurs temporaires ou externes.',
    permissions: [
      // Accès minimal
      Permission.VIEW_EVENT_DETAILS,
      Permission.MARK_ATTENDANCE,
    ],
    isSystemRole: true,
    isActive: true,
    hierarchy: 8,
    color: '#94a3b8', // Gris clair
    icon: 'user-plus',
    scope: RoleScope.CUSTOM,
    limitations: {
      canAccessAPI: false,
      canUseAdvancedFeatures: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  [UserRole.CONTRIBUTOR]: {
    id: 'guest',
    name: UserRole.GUEST,
    displayName: 'Invité',
    description: 'Accès très limité pour les utilisateurs temporaires ou externes.',
    permissions: [
      // Accès minimal
      Permission.VIEW_EVENT_DETAILS,
      Permission.MARK_ATTENDANCE,
    ],
    isSystemRole: true,
    isActive: true,
    hierarchy: 8,
    color: '#94a3b8', // Gris clair
    icon: 'user-plus',
    scope: RoleScope.CUSTOM,
    limitations: {
      canAccessAPI: false,
      canUseAdvancedFeatures: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

// 🎯 Groupes de permissions pour faciliter l'attribution
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'user_management_basic',
    name: 'Gestion Utilisateurs - Basique',
    description: 'Consultation et actions de base sur les utilisateurs',
    category: PermissionCategory.USER_MANAGEMENT,
    permissions: [
      Permission.VIEW_ALL_USERS,
      Permission.VIEW_USER_DETAILS,
      Permission.INVITE_USERS,
    ],
    requiredRole: UserRole.ORGANIZER,
  },
  {
    id: 'user_management_advanced',
    name: 'Gestion Utilisateurs - Avancée',
    description: 'Création, modification et suppression d\'utilisateurs',
    category: PermissionCategory.USER_MANAGEMENT,
    permissions: [
      Permission.CREATE_USERS,
      Permission.EDIT_USERS,
      Permission.DELETE_USERS,
      Permission.MANAGE_USER_ROLES,
      Permission.SUSPEND_USERS,
    ],
    requiredRole: UserRole.ADMIN,
  },
  {
    id: 'event_management_basic',
    name: 'Gestion Événements - Basique',
    description: 'Création et gestion de ses propres événements',
    category: PermissionCategory.EVENT_MANAGEMENT,
    permissions: [
      Permission.CREATE_EVENTS,
      Permission.EDIT_OWN_EVENTS,
      Permission.DELETE_OWN_EVENTS,
      Permission.MANAGE_EVENT_PARTICIPANTS,
    ],
    requiredRole: UserRole.ORGANIZER,
  },
  {
    id: 'event_management_advanced',
    name: 'Gestion Événements - Avancée',
    description: 'Gestion complète de tous les événements',
    category: PermissionCategory.EVENT_MANAGEMENT,
    permissions: [
      Permission.EDIT_ALL_EVENTS,
      Permission.DELETE_ALL_EVENTS,
      Permission.APPROVE_EVENTS,
      Permission.CANCEL_EVENTS,
    ],
    requiredRole: UserRole.MANAGER,
  },
  {
    id: 'attendance_management',
    name: 'Gestion des Présences',
    description: 'Validation et gestion des présences',
    category: PermissionCategory.ATTENDANCE_MANAGEMENT,
    permissions: [
      Permission.VALIDATE_ATTENDANCES,
      Permission.EDIT_ATTENDANCES,
      Permission.BULK_MANAGE_ATTENDANCES,
      Permission.OVERRIDE_ATTENDANCE_RULES,
    ],
    requiredRole: UserRole.MODERATOR,
  },
  {
    id: 'reports_basic',
    name: 'Rapports - Basique',
    description: 'Consultation des rapports de base',
    category: PermissionCategory.REPORTS_ANALYTICS,
    permissions: [
      Permission.VIEW_BASIC_REPORTS,
      Permission.EXPORT_REPORTS,
    ],
    requiredRole: UserRole.ORGANIZER,
  },
  {
    id: 'reports_advanced',
    name: 'Rapports - Avancée',
    description: 'Création et programmation de rapports personnalisés',
    category: PermissionCategory.REPORTS_ANALYTICS,
    permissions: [
      Permission.VIEW_ADVANCED_REPORTS,
      Permission.CREATE_CUSTOM_REPORTS,
      Permission.SCHEDULE_REPORTS,
      Permission.VIEW_ML_INSIGHTS,
    ],
    requiredRole: UserRole.MANAGER,
  },
  {
    id: 'system_administration',
    name: 'Administration Système',
    description: 'Configuration et maintenance du système',
    category: PermissionCategory.SYSTEM_ADMINISTRATION,
    permissions: [
      Permission.MANAGE_SYSTEM_SETTINGS,
      Permission.VIEW_SYSTEM_LOGS,
      Permission.MANAGE_INTEGRATIONS,
      Permission.PERFORM_SYSTEM_MAINTENANCE,
    ],
    requiredRole: UserRole.ADMIN,
  },
];

// 🏛️ Hiérarchie des rôles (pour les vérifications d'autorité)
export const ROLE_HIERARCHY = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.ORGANIZER,
  UserRole.MODERATOR,
  UserRole.PARTICIPANT,
  UserRole.VIEWER,
  UserRole.GUEST,
];

// 🎨 Configuration UI pour les rôles
export const ROLE_UI_CONFIG = {
  [UserRole.SUPER_ADMIN]: {
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    iconClass: 'text-red-600',
    priority: 'highest' as const,
  },
  [UserRole.ADMIN]: {
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    iconClass: 'text-orange-600',
    priority: 'high' as const,
  },
  [UserRole.MANAGER]: {
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
    iconClass: 'text-green-600',
    priority: 'medium' as const,
  },
  [UserRole.ORGANIZER]: {
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    iconClass: 'text-blue-600',
    priority: 'medium' as const,
  },
  [UserRole.MODERATOR]: {
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    iconClass: 'text-purple-600',
    priority: 'low' as const,
  },
  [UserRole.PARTICIPANT]: {
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
    iconClass: 'text-gray-600',
    priority: 'low' as const,
  },
  [UserRole.VIEWER]: {
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconClass: 'text-slate-600',
    priority: 'lowest' as const,
  },
  [UserRole.GUEST]: {
    badgeClass: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    iconClass: 'text-neutral-600',
    priority: 'lowest' as const,
  },
};