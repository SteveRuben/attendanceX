import { BaseEntity } from './common.types';

// Énumération des rôles système
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  OWNER="owner",
  MANAGER = 'manager',
  ORGANIZER = 'organizer',
  MODERATOR = 'moderator',
  PARTICIPANT = 'participant',
  ANALYST = 'analyst',
  CONTRIBUTOR = 'contributor',
  VIEWER = 'viewer',
  GUEST = 'guest',
}

// Énumération des permissions granulaires
export enum Permission {
  // 👥 Gestion des utilisateurs
  VIEW_ALL_USERS = 'view_all_users',
  VIEW_USER_DETAILS = 'view_user_details',
  CREATE_USERS = 'create_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  MANAGE_USER_ROLES = 'manage_user_roles',
  MANAGE_USER_PERMISSIONS = 'manage_user_permissions',
  INVITE_USERS = 'invite_users',
  SUSPEND_USERS = 'suspend_users',
  VIEW_USER_ACTIVITY = 'view_user_activity',
  
  // 📅 Gestion des événements
  VIEW_ALL_EVENTS = 'view_all_events',
  VIEW_EVENT_DETAILS = 'view_event_details',
  CREATE_EVENTS = 'create_events',
  EDIT_OWN_EVENTS = 'edit_own_events',
  EDIT_ALL_EVENTS = 'edit_all_events',
  DELETE_OWN_EVENTS = 'delete_own_events',
  DELETE_ALL_EVENTS = 'delete_all_events',
  MANAGE_EVENT_PARTICIPANTS = 'manage_event_participants',
  APPROVE_EVENTS = 'approve_events',
  PUBLISH_EVENTS = 'publish_events',
  CANCEL_EVENTS = 'cancel_events',
  DUPLICATE_EVENTS = 'duplicate_events',
  VIEW_EVENT_ANALYTICS = 'view_event_analytics',
  
  // ✅ Gestion des présences
  VIEW_ALL_ATTENDANCES = 'view_all_attendances',
  VIEW_OWN_ATTENDANCES = 'view_own_attendances',
  MARK_ATTENDANCE = 'mark_attendance',
  MARK_ATTENDANCE_FOR_OTHERS = 'mark_attendance_for_others',
  VALIDATE_ATTENDANCES = 'validate_attendances',
  EDIT_ATTENDANCES = 'edit_attendances',
  DELETE_ATTENDANCES = 'delete_attendances',
  BULK_MANAGE_ATTENDANCES = 'bulk_manage_attendances',
  VIEW_ATTENDANCE_PATTERNS = 'view_attendance_patterns',
  OVERRIDE_ATTENDANCE_RULES = 'override_attendance_rules',
  
  // 🔔 Gestion des notifications
  VIEW_ALL_NOTIFICATIONS = 'view_all_notifications',
  SEND_NOTIFICATIONS = 'send_notifications',
  SEND_BULK_NOTIFICATIONS = 'send_bulk_notifications',
  MANAGE_NOTIFICATION_TEMPLATES = 'manage_notification_templates',
  VIEW_NOTIFICATION_STATS = 'view_notification_stats',
  CONFIGURE_NOTIFICATION_SETTINGS = 'configure_notification_settings',
  
  // 📊 Rapports et analytics
  VIEW_BASIC_REPORTS = 'view_basic_reports',
  VIEW_ADVANCED_REPORTS = 'view_advanced_reports',
  CREATE_CUSTOM_REPORTS = 'create_custom_reports',
  SCHEDULE_REPORTS = 'schedule_reports',
  EXPORT_REPORTS = 'export_reports',
  VIEW_REAL_TIME_ANALYTICS = 'view_real_time_analytics',
  VIEW_ML_INSIGHTS = 'view_ml_insights',
  
  // 🔧 Administration système
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  VIEW_SYSTEM_LOGS = 'view_system_logs',
  MANAGE_INTEGRATIONS = 'manage_integrations',
  MANAGE_API_KEYS = 'manage_api_keys',
  PERFORM_SYSTEM_MAINTENANCE = 'perform_system_maintenance',
  MANAGE_BACKUPS = 'manage_backups',
  VIEW_SYSTEM_HEALTH = 'view_system_health',
  
  // 📁 Gestion des fichiers
  UPLOAD_FILES = 'upload_files',
  VIEW_ALL_FILES = 'view_all_files',
  DELETE_FILES = 'delete_files',
  MANAGE_FILE_PERMISSIONS = 'manage_file_permissions',
  
  // 🔒 Sécurité
  VIEW_SECURITY_LOGS = 'view_security_logs',
  MANAGE_SECURITY_SETTINGS = 'manage_security_settings',
  RESET_USER_PASSWORDS = 'reset_user_passwords',
  MANAGE_2FA_SETTINGS = 'manage_2fa_settings',
  VIEW_LOGIN_ATTEMPTS = 'view_login_attempts',
  
  // 🧠 Machine Learning
  VIEW_ML_MODELS = 'view_ml_models',
  MANAGE_ML_MODELS = 'manage_ml_models',
  TRAIN_ML_MODELS = 'train_ml_models',
  VIEW_ML_PREDICTIONS = 'view_ml_predictions',
  
  // 🔄 Intégrations
  MANAGE_WEBHOOKS = 'manage_webhooks',
  VIEW_API_USAGE = 'view_api_usage',
  MANAGE_THIRD_PARTY_INTEGRATIONS = 'manage_third_party_integrations',
  
  // 💰 Facturation et licences
  VIEW_BILLING_INFO = 'view_billing_info',
  MANAGE_BILLING = 'manage_billing',
  VIEW_USAGE_METRICS = 'view_usage_metrics',
  MANAGE_LICENSES = 'manage_licenses'
}

// Catégories de permissions pour l'organisation
export enum PermissionCategory {
  USER_MANAGEMENT = 'user_management',
  EVENT_MANAGEMENT = 'event_management',
  ATTENDANCE_MANAGEMENT = 'attendance_management',
  NOTIFICATIONS = 'notifications',
  REPORTS_ANALYTICS = 'reports_analytics',
  SYSTEM_ADMINISTRATION = 'system_administration',
  FILE_MANAGEMENT = 'file_management',
  SECURITY = 'security',
  MACHINE_LEARNING = 'machine_learning',
  INTEGRATIONS = 'integrations',
  BILLING = 'billing'
}

// Définition d'un rôle
export interface RoleDefinition extends BaseEntity {
  name: string;
  displayName: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean; // Rôles système non modifiables
  isActive: boolean;
  hierarchy: number; // 1 = le plus élevé (super admin), plus élevé = plus de pouvoir
  color: string; // Couleur pour l'affichage UI
  icon: string; // Icône pour l'affichage UI
  
  // Limites du rôle
  limitations: {
    maxEventsPerMonth?: number;
    maxParticipantsPerEvent?: number;
    maxFileUploadSizeMB?: number;
    maxReportsPerDay?: number;
    canAccessAPI?: boolean;
    canUseAdvancedFeatures?: boolean;
  };
  
  // Métadonnées
  createdBy?: string;
  lastModifiedBy?: string;
  assignedUsersCount?: number;
  
  // Contexte d'application
  scope: RoleScope;
  departmentRestrictions?: string[]; // Limitations par département
  locationRestrictions?: string[]; // Limitations géographiques
}

// Portée d'application d'un rôle
export enum RoleScope {
  GLOBAL = 'global', // Accès à toute l'organisation
  DEPARTMENT = 'department', // Limité au département
  LOCATION = 'location', // Limité à un lieu
  PROJECT = 'project', // Limité à des projets spécifiques
  CUSTOM = 'custom' // Portée personnalisée
}

// Contexte de permission (pour les vérifications dynamiques)
export interface PermissionContext {
  userId?: string;
  eventId?: string;
  organizerId?: string;
  departmentId?: string;
  locationId?: string;
  resourceOwnerId?: string;
  action?: string;
  resource?: string;
}

// Résultat de vérification de permission
export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  context?: PermissionContext;
  inheritedFrom?: UserRole;
  restrictions?: string[];
}

// Groupe de permissions pour faciliter l'attribution
export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  category: PermissionCategory;
  requiredRole?: UserRole; // Rôle minimum requis
}