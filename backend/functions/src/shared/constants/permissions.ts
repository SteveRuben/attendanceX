// import { Permission, UserRole } from "../types"; // Imports inutilisés


// shared/src/constants/permissions.ts
/*export const USER_PERMISSIONS = {
  // Permissions système
  MANAGE_ROLES: 'manage_roles',
  MANAGE_SYSTEM_SETTINGS: 'manage_system_settings',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_SMS_PROVIDERS: 'manage_sms_providers',
  MANAGE_EMAIL_PROVIDERS: 'manage_email_providers',
  EXPORT_ALL_DATA: 'export_all_data',
  
  // Permissions utilisateurs
  MANAGE_USERS: 'manage_users',
  VIEW_ALL_USERS: 'view_all_users',
  CREATE_ADMIN_USERS: 'create_admin_users',
  DELETE_ANY_USER: 'delete_any_user',
  RESET_ANY_PASSWORD: 'reset_any_password',
  VIEW_TEAM_USERS: 'view_team_users',
  CREATE_PARTICIPANTS: 'create_participants',
  EDIT_TEAM_PROFILES: 'edit_team_profiles',
  UPDATE_PROFILE: 'update_profile',
  
  // Permissions événements
  CREATE_EVENTS: 'create_events',
  EDIT_EVENTS: 'edit_events',
  DELETE_EVENTS: 'delete_events',
  DELETE_OWN_EVENTS: 'delete_own_events',
  VIEW_ALL_EVENTS: 'view_all_events',
  VIEW_OWN_EVENTS: 'view_own_events',
  VIEW_PUBLIC_EVENTS: 'view_public_events',
  GENERATE_QR_CODES: 'generate_qr_codes',
  
  // Permissions présences
  MARK_ATTENDANCE: 'mark_attendance',
  VALIDATE_ATTENDANCES: 'validate_attendances',
  VALIDATE_TEAM_ATTENDANCES: 'validate_team_attendances',
  VIEW_ALL_ATTENDANCES: 'view_all_attendances',
  VIEW_EVENT_ATTENDANCES: 'view_event_attendances',
  VIEW_TEAM_ATTENDANCES: 'view_team_attendances',
  VIEW_OWN_ATTENDANCE: 'view_own_attendance',
  DELETE_ATTENDANCES: 'delete_attendances',
  
  // Permissions rapports
  GENERATE_ALL_REPORTS: 'generate_all_reports',
  GENERATE_EVENT_REPORTS: 'generate_event_reports',
  GENERATE_TEAM_REPORTS: 'generate_team_reports',
  EXPORT_EVENT_DATA: 'export_event_data',
  
  // Permissions notifications
  SEND_SYSTEM_NOTIFICATIONS: 'send_system_notifications',
  SEND_EVENT_NOTIFICATIONS: 'send_event_notifications',
  VIEW_NOTIFICATIONS: 'view_notifications',
  MARK_NOTIFICATIONS_READ: 'mark_notifications_read',
  
  // Permissions templates
  MANAGE_TEMPLATES: 'manage_templates'
} as const;*/

export const PERMISSION_CATEGORIES = {
  SYSTEM: 'Système',
  USERS: 'Utilisateurs', 
  EVENTS: 'Événements',
  ATTENDANCE: 'Présences',
  REPORTS: 'Rapports',
  NOTIFICATIONS: 'Notifications',
  TEMPLATES: 'Templates'
} as const;
/*
export const PERMISSION_LABELS = {
  [Permission.MANAGE_ROLES]: 'Gérer les rôles et permissions',
  [Permission.MANAGE_SYSTEM_SETTINGS]: 'Configurer les paramètres système',
  [Permission.VIEW_AUDIT_LOGS]: 'Consulter les logs d\'audit',
  [Permission.MANAGE_SMS_PROVIDERS]: 'Gérer les fournisseurs SMS',
  [Permission.MANAGE_EMAIL_PROVIDERS]: 'Gérer les fournisseurs d\'email',
  [Permission.EXPORT_ALL_DATA]: 'Exporter toutes les données',
  
  [Permission.MANAGE_USERS]: 'Gérer tous les utilisateurs',
  [Permission.VIEW_ALL_USERS]: 'Voir tous les utilisateurs',
  [Permission.CREATE_ADMIN_USERS]: 'Créer des utilisateurs admin',
  [Permission.DELETE_ANY_USER]: 'Supprimer n\'importe quel utilisateur',
  [Permission.RESET_ANY_PASSWORD]: 'Réinitialiser n\'importe quel mot de passe',
  [Permission.VIEW_TEAM_USERS]: 'Voir les utilisateurs de son équipe',
  [Permission.CREATE_PARTICIPANTS]: 'Créer des utilisateurs participants',
  [Permission.EDIT_TEAM_PROFILES]: 'Modifier les profils de son équipe',
  [Permission.UPDATE_PROFILE]: 'Mettre à jour son profil',
  
  [Permission.CREATE_EVENTS]: 'Créer des événements',
  [Permission.EDIT_EVENTS]: 'Modifier des événements',
  [Permission.DELETE_EVENTS]: 'Supprimer n\'importe quel événement',
  [Permission.DELETE_OWN_EVENTS]: 'Supprimer ses propres événements',
  [Permission.VIEW_ALL_EVENTS]: 'Voir tous les événements',
  [Permission.VIEW_OWN_EVENTS]: 'Voir ses propres événements',
  [Permission.VIEW_PUBLIC_EVENTS]: 'Voir les événements publics',
  [Permission.GENERATE_QR_CODES]: 'Générer des codes QR',
  
  [Permission.MARK_ATTENDANCE]: 'Marquer sa présence',
  [Permission.VALIDATE_ATTENDANCES]: 'Valider les présences',
  [Permission.VALIDATE_TEAM_ATTENDANCES]: 'Valider les présences de son équipe',
  [Permission.VIEW_ALL_ATTENDANCES]: 'Voir toutes les présences',
  [Permission.VIEW_EVENT_ATTENDANCES]: 'Voir les présences d\'un événement',
  [Permission.VIEW_TEAM_ATTENDANCES]: 'Voir les présences de son équipe',
  [Permission.VIEW_OWN_ATTENDANCE]: 'Voir ses propres présences',
  [Permission.DELETE_ATTENDANCES]: 'Supprimer des présences',
  
  [Permission.GENERATE_ALL_REPORTS]: 'Générer tous types de rapports',
  [Permission.GENERATE_EVENT_REPORTS]: 'Générer des rapports pour ses événements',
  [Permission.GENERATE_TEAM_REPORTS]: 'Générer des rapports pour son équipe',
  [Permission.EXPORT_EVENT_DATA]: 'Exporter les données de ses événements',
  
  [Permission.SEND_SYSTEM_NOTIFICATIONS]: 'Envoyer des notifications système',
  [Permission.SEND_EVENT_NOTIFICATIONS]: 'Envoyer des notifications pour ses événements',
  [Permission.VIEW_NOTIFICATIONS]: 'Voir ses notifications',
  [Permission.MARK_NOTIFICATIONS_READ]: 'Marquer ses notifications comme lues',
  
  [Permission.MANAGE_TEMPLATES]: 'Gérer les templates (email, SMS)'
} as const;

// Mapping des permissions par rôle
export const ROLE_PERMISSIONS = {
  [UserRole.SUPER_ADMIN]: [
    Permission.MANAGE_ROLES,
    Permission.MANAGE_SYSTEM_SETTINGS,
    Permission.DELETE_ANY_USER,
    Permission.RESET_ANY_PASSWORD,
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_SMS_PROVIDERS,
    Permission.MANAGE_EMAIL_PROVIDERS,
    Permission.EXPORT_ALL_DATA,
    // Hérite de ADMIN
    Permission.MANAGE_USERS,
    Permission.VIEW_ALL_USERS,
    Permission.VIEW_ALL_EVENTS,
    Permission.VIEW_ALL_ATTENDANCES,
    Permission.GENERATE_ALL_REPORTS,
    Permission.CREATE_ADMIN_USERS,
    Permission.DELETE_EVENTS,
    Permission.DELETE_ATTENDANCES,
    Permission.MANAGE_TEMPLATES,
    Permission.SEND_SYSTEM_NOTIFICATIONS,
    // Hérite de ORGANIZER
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
    Permission.DELETE_OWN_EVENTS,
    Permission.VIEW_EVENT_ATTENDANCES,
    Permission.VALIDATE_ATTENDANCES,
    Permission.GENERATE_QR_CODES,
    Permission.SEND_EVENT_NOTIFICATIONS,
    Permission.GENERATE_EVENT_REPORTS,
    Permission.EXPORT_EVENT_DATA,
    // Hérite de MANAGER
    Permission.VIEW_TEAM_USERS,
    Permission.VIEW_TEAM_ATTENDANCES,
    Permission.GENERATE_TEAM_REPORTS,
    Permission.VALIDATE_TEAM_ATTENDANCES,
    Permission.CREATE_PARTICIPANTS,
    Permission.EDIT_TEAM_PROFILES,
    // Hérite de PARTICIPANT
    Permission.MARK_ATTENDANCE,
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.VIEW_OWN_EVENTS,
    Permission.UPDATE_PROFILE,
    Permission.VIEW_NOTIFICATIONS,
    Permission.MARK_NOTIFICATIONS_READ,
    // Hérite de GUEST
    Permission.VIEW_PUBLIC_EVENTS
  ],
  
  [UserRole.ADMIN]: [
    Permission.MANAGE_USERS,
    Permission.VIEW_ALL_USERS,
    Permission.VIEW_ALL_EVENTS,
    Permission.VIEW_ALL_ATTENDANCES,
    Permission.GENERATE_ALL_REPORTS,
    Permission.CREATE_ADMIN_USERS,
    Permission.DELETE_EVENTS,
    Permission.DELETE_ATTENDANCES,
    Permission.MANAGE_TEMPLATES,
    Permission.SEND_SYSTEM_NOTIFICATIONS,
    // Hérite de ORGANIZER
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
    Permission.DELETE_OWN_EVENTS,
    Permission.VIEW_EVENT_ATTENDANCES,
    Permission.VALIDATE_ATTENDANCES,
    Permission.GENERATE_QR_CODES,
    Permission.SEND_EVENT_NOTIFICATIONS,
    Permission.GENERATE_EVENT_REPORTS,
    Permission.EXPORT_EVENT_DATA,
    // Hérite de MANAGER
    Permission.VIEW_TEAM_USERS,
    Permission.VIEW_TEAM_ATTENDANCES,
    Permission.GENERATE_TEAM_REPORTS,
    Permission.VALIDATE_TEAM_ATTENDANCES,
    Permission.CREATE_PARTICIPANTS,
    Permission.EDIT_TEAM_PROFILES,
    // Hérite de PARTICIPANT
    Permission.MARK_ATTENDANCE,
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.VIEW_OWN_EVENTS,
    Permission.UPDATE_PROFILE,
    Permission.VIEW_NOTIFICATIONS,
    Permission.MARK_NOTIFICATIONS_READ,
    // Hérite de GUEST
    Permission.VIEW_PUBLIC_EVENTS
  ],
  
  [UserRole.ORGANIZER]: [
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
    Permission.DELETE_OWN_EVENTS,
    Permission.VIEW_EVENT_ATTENDANCES,
    Permission.VALIDATE_ATTENDANCES,
    Permission.GENERATE_QR_CODES,
    Permission.SEND_EVENT_NOTIFICATIONS,
    Permission.GENERATE_EVENT_REPORTS,
    Permission.EXPORT_EVENT_DATA,
    // Hérite de MANAGER
    Permission.VIEW_TEAM_USERS,
    Permission.VIEW_TEAM_ATTENDANCES,
    Permission.GENERATE_TEAM_REPORTS,
    Permission.VALIDATE_TEAM_ATTENDANCES,
    Permission.CREATE_PARTICIPANTS,
    Permission.EDIT_TEAM_PROFILES,
    // Hérite de PARTICIPANT
    Permission.MARK_ATTENDANCE,
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.VIEW_OWN_EVENTS,
    Permission.UPDATE_PROFILE,
    Permission.VIEW_NOTIFICATIONS,
    Permission.MARK_NOTIFICATIONS_READ,
    // Hérite de GUEST
    Permission.VIEW_PUBLIC_EVENTS
  ],
  
  [UserRole.MANAGER]: [
    Permission.VIEW_TEAM_USERS,
    Permission.VIEW_TEAM_ATTENDANCES,
    Permission.GENERATE_TEAM_REPORTS,
    Permission.VALIDATE_TEAM_ATTENDANCES,
    Permission.CREATE_PARTICIPANTS,
    Permission.EDIT_TEAM_PROFILES,
    // Hérite de PARTICIPANT
    Permission.MARK_ATTENDANCE,
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.VIEW_OWN_EVENTS,
    Permission.UPDATE_PROFILE,
    Permission.VIEW_NOTIFICATIONS,
    Permission.MARK_NOTIFICATIONS_READ,
    // Hérite de GUEST
    Permission.VIEW_PUBLIC_EVENTS
  ],
  
  [UserRole.PARTICIPANT]: [
    Permission.MARK_ATTENDANCE,
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.VIEW_OWN_EVENTS,
    Permission.UPDATE_PROFILE,
    Permission.VIEW_NOTIFICATIONS,
    Permission.MARK_NOTIFICATIONS_READ,
    // Hérite de GUEST
    Permission.VIEW_PUBLIC_EVENTS
  ],
  
  [UserRole.GUEST]: [
    Permission.VIEW_PUBLIC_EVENTS
  ]
} as const;

// Groupement des permissions par catégorie
export const PERMISSIONS_BY_CATEGORY = {
  [PERMISSION_CATEGORIES.SYSTEM]: [
    Permission.MANAGE_ROLES,
    Permission.MANAGE_SYSTEM_SETTINGS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_SMS_PROVIDERS,
    Permission.MANAGE_EMAIL_PROVIDERS,
    Permission.EXPORT_ALL_DATA
  ],
  [PERMISSION_CATEGORIES.USERS]: [
    Permission.MANAGE_USERS,
    Permission.VIEW_ALL_USERS,
    Permission.CREATE_ADMIN_USERS,
    Permission.DELETE_ANY_USER,
    Permission.RESET_ANY_PASSWORD,
    Permission.VIEW_TEAM_USERS,
    Permission.CREATE_PARTICIPANTS,
    Permission.EDIT_TEAM_PROFILES,
    Permission.UPDATE_PROFILE
  ],
  [PERMISSION_CATEGORIES.EVENTS]: [
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
    Permission.DELETE_EVENTS,
    Permission.DELETE_OWN_EVENTS,
    Permission.VIEW_ALL_EVENTS,
    Permission.VIEW_OWN_EVENTS,
    Permission.VIEW_PUBLIC_EVENTS,
    Permission.GENERATE_QR_CODES
  ],
  [PERMISSION_CATEGORIES.ATTENDANCE]: [
    Permission.MARK_ATTENDANCE,
    Permission.VALIDATE_ATTENDANCES,
    Permission.VALIDATE_TEAM_ATTENDANCES,
    Permission.VIEW_ALL_ATTENDANCES,
    Permission.VIEW_EVENT_ATTENDANCES,
    Permission.VIEW_TEAM_ATTENDANCES,
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.DELETE_ATTENDANCES
  ],
  [PERMISSION_CATEGORIES.REPORTS]: [
    Permission.GENERATE_ALL_REPORTS,
    Permission.GENERATE_EVENT_REPORTS,
    Permission.GENERATE_TEAM_REPORTS,
    Permission.EXPORT_EVENT_DATA
  ],
  [PERMISSION_CATEGORIES.NOTIFICATIONS]: [
    Permission.SEND_SYSTEM_NOTIFICATIONS,
    Permission.SEND_EVENT_NOTIFICATIONS,
    Permission.VIEW_NOTIFICATIONS,
    Permission.MARK_NOTIFICATIONS_READ
  ],
  [PERMISSION_CATEGORIES.TEMPLATES]: [
    Permission.MANAGE_TEMPLATES
  ]
} as const;*/