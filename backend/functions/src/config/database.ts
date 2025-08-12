import { CollectionReference, DocumentData, getFirestore } from "firebase-admin/firestore";

// Instance Firestore - utilise l'instance déjà configurée dans firebase.ts
const db = getFirestore();

// Configuration des collections Firestore - CENTRALISÉE
export const collections = {
  // Collections principales
  users: db.collection("users"),
  events: db.collection("events"),
  attendances: db.collection("attendances"),
  notifications: db.collection("notifications"),
  reports: db.collection("reports"),
  organizations: db.collection("organizations"),
  organization_invitations: db.collection("organization_invitations"),
  suspension_appeals: db.collection("suspension_appeals"),
  organization_metrics: db.collection("organization_metrics"),
  
  // Collections d'authentification et sécurité
  rate_limits: db.collection("rate_limits"),
  user_invitations: db.collection("user_invitations"),
  user_sessions: db.collection("user_sessions"),
  audit_logs: db.collection("audit_logs"),
  email_verification_tokens: db.collection("email_verification_tokens"),
  email_verification_metrics: db.collection("email_verification_metrics"),
  
  // Collections de profil et préférences utilisateur
  user_statistics: db.collection("user_statistics"),
  user_preferences: db.collection("user_preferences"),
  user_profiles: db.collection("user_profiles"),
  user_integrations: db.collection("user_integrations"),
  user_files: db.collection("user_files"),
  
  // Collections d'intégrations
  oauth_tokens: db.collection("oauth_tokens"),
  oauth_states: db.collection("oauth_states"),
  sync_history: db.collection("sync_history"),
  integration_policies: db.collection("integration_policies"),
  synced_calendar_events: db.collection("synced_calendar_events"),
  synced_contacts: db.collection("synced_contacts"),
  synced_presence: db.collection("synced_presence"),
  encryption_keys: db.collection("encryption_keys"),
  
  // Collections de groupes et organisation
  groups: db.collection("groups"),
  departments: db.collection("departments"),
  
  // Collections de notifications
  notification_templates: db.collection("notification_templates"),
  scheduled_notifications: db.collection("scheduled_notifications"),
  notifications_archive: db.collection("notifications_archive"),
  alerts: db.collection("alerts"),
  alert_rules: db.collection("alert_rules"),
  active_alerts: db.collection("active_alerts"),
  system_stats: db.collection("system_stats"),
  weekly_reports: db.collection("weekly_reports"),
  performance_logs: db.collection("performance_logs"),
  feature_usage_logs: db.collection("feature_usage_logs"),
  request_logs: db.collection("request_logs"),
  
  // Collections email
  emailProviders: db.collection("emailProviders"),
  emailTemplates: db.collection("emailTemplates"),
  email_logs: db.collection("email_logs"),
  
  // Collections SMS
  smsProviders: db.collection("smsProviders"),
  smsTemplates: db.collection("smsTemplates"),
  smsMessages: db.collection("smsMessages"),
  sms_logs: db.collection("sms_logs"),
  
  // Collections Push
  push_devices: db.collection("push_devices"),
  pushTokens: db.collection("pushTokens"),
  pushMetrics: db.collection("pushMetrics"),
  pushTemplates: db.collection("pushTemplates"),
  scheduledPushNotifications: db.collection("scheduledPushNotifications"),
  
  // Collections de contenu et feedback
  feedbacks: db.collection("feedbacks"),
  invitations: db.collection("invitations"),
  
  // Collections système
  settings: db.collection("settings"),
  file_metadata: db.collection("file_metadata"),
  
  // Collections ML et analytics
  ml_models: db.collection("ml_models"),
  ml_predictions: db.collection("ml_predictions"),
  analytics_events: db.collection("analytics_events"),
  
  // Collections de cache et performance
  cache_entries: db.collection("cache_entries"),
  performance_metrics: db.collection("performance_metrics"),
  
  // Collections de logs et monitoring
  error_logs: db.collection("error_logs"),
  access_logs: db.collection("access_logs"),
  
  // Collections temporaires et jobs
  background_jobs: db.collection("background_jobs"),
  scheduled_tasks: db.collection("scheduled_tasks"),
  
  // Alias pour compatibilité (à supprimer progressivement)
  auditLogs: db.collection("audit_logs"), // Alias pour audit_logs
};

// Typages génériques pour les collections Firestore
// eslint-disable-next-line require-jsdoc
export function typedCollection<T = DocumentData>(collectionPath: string):
  CollectionReference<T> {
  return db.collection(collectionPath) as CollectionReference<T>;
}

// Configuration de la base de données
export const databaseConfig = {
  // Firestore settings
  firestoreMaxConnections:
    parseInt(process.env.FIRESTORE_MAX_CONNECTIONS || "100", 10),
  firestoreTimeout:
    parseInt(process.env.FIRESTORE_TIMEOUT_SECONDS || "60", 10) * 1000,
  firestoreRetryAttempts:
    parseInt(process.env.FIRESTORE_RETRY_ATTEMPTS || "3", 10),

  // Cache configuration
  cacheEnabled: process.env.ENABLE_CACHE === "true",
  cacheTtl: parseInt(process.env.CACHE_TTL_SECONDS || "300", 10), // 5 minutes
  cacheMaxSize: parseInt(process.env.CACHE_MAX_SIZE || "1000", 10),
  memoryCacheEnabled: process.env.MEMORY_CACHE_ENABLED === "true",
  redisCacheEnabled: process.env.REDIS_CACHE_ENABLED === "true",
};

// Préfixes de cache par entité
export const cacheKeys = {
  USER: "user:",
  EVENT: "event:",
  ATTENDANCE: "attendance:",
  USERS_LIST: "users:list",
  EVENTS_LIST: "events:list",
  ATTENDANCES_LIST: "attendances:list",
  SETTINGS: "settings:",
};

// Constantes pour les types de documents
export const documentTypes = {
  USER: "user",
  EVENT: "event",
  ATTENDANCE: "attendance",
  NOTIFICATION: "notification",
  SMS_PROVIDER: "smsProvider",
  SMS_TEMPLATE: "smsTemplate",
  EMAIL_TEMPLATE: "emailTemplate",
  AUDIT_LOG: "auditLog",
  REPORT: "report",
  SETTING: "setting",
};

// Noms des collections centralisés
export const collectionNames = {
  USERS: "users",
  EVENTS: "events",
  ATTENDANCES: "attendances",
  NOTIFICATIONS: "notifications",
  REPORTS: "reports",
  ORGANIZATIONS: "organizations",
  ORGANIZATION_INVITATIONS: "organization_invitations",
  SUSPENSION_APPEALS: "suspension_appeals",
  ORGANIZATION_METRICS: "organization_metrics",
  
  // Authentification et sécurité
  RATE_LIMITS: "rate_limits",
  USER_INVITATIONS: "user_invitations",
  USER_SESSIONS: "user_sessions",
  AUDIT_LOGS: "audit_logs",
  EMAIL_VERIFICATION_TOKENS: "email_verification_tokens",
  EMAIL_VERIFICATION_METRICS: "email_verification_metrics",
  
  // Profil et préférences utilisateur
  USER_STATISTICS: "user_statistics",
  USER_PREFERENCES: "user_preferences",
  USER_PROFILES: "user_profiles",
  USER_INTEGRATIONS: "user_integrations",
  USER_FILES: "user_files",
  
  // Intégrations
  OAUTH_TOKENS: "oauth_tokens",
  OAUTH_STATES: "oauth_states",
  SYNC_HISTORY: "sync_history",
  INTEGRATION_POLICIES: "integration_policies",
  SYNCED_CALENDAR_EVENTS: "synced_calendar_events",
  SYNCED_CONTACTS: "synced_contacts",
  SYNCED_PRESENCE: "synced_presence",
  ENCRYPTION_KEYS: "encryption_keys",
  
  // Groupes et organisation
  GROUPS: "groups",
  DEPARTMENTS: "departments",
  
  // Notifications
  NOTIFICATION_TEMPLATES: "notification_templates",
  SCHEDULED_NOTIFICATIONS: "scheduled_notifications",
  NOTIFICATIONS_ARCHIVE: "notifications_archive",
  ALERTS: "alerts",
  ALERT_RULES: "alert_rules",
  ACTIVE_ALERTS: "active_alerts",
  SYSTEM_STATS: "system_stats",
  WEEKLY_REPORTS: "weekly_reports",
  PERFORMANCE_LOGS: "performance_logs",
  FEATURE_USAGE_LOGS: "feature_usage_logs",
  REQUEST_LOGS: "request_logs",
  
  // Email
  EMAIL_PROVIDERS: "emailProviders",
  EMAIL_TEMPLATES: "emailTemplates",
  EMAIL_LOGS: "email_logs",
  
  // SMS
  SMS_PROVIDERS: "smsProviders",
  SMS_TEMPLATES: "smsTemplates",
  SMS_MESSAGES: "smsMessages",
  SMS_LOGS: "sms_logs",
  
  // Push
  PUSH_DEVICES: "push_devices",
  PUSH_TOKENS: "pushTokens",
  PUSH_METRICS: "pushMetrics",
  PUSH_TEMPLATES: "pushTemplates",
  SCHEDULED_PUSH_NOTIFICATIONS: "scheduledPushNotifications",
  
  // Contenu et feedback
  FEEDBACKS: "feedbacks",
  INVITATIONS: "invitations",
  
  // Système
  SETTINGS: "settings",
  FILE_METADATA: "file_metadata",
  
  // ML et analytics
  ML_MODELS: "ml_models",
  ML_PREDICTIONS: "ml_predictions",
  ANALYTICS_EVENTS: "analytics_events",
  
  // Cache et performance
  CACHE_ENTRIES: "cache_entries",
  PERFORMANCE_METRICS: "performance_metrics",
  
  // Logs et monitoring
  ERROR_LOGS: "error_logs",
  ACCESS_LOGS: "access_logs",
  
  // Jobs et tâches
  BACKGROUND_JOBS: "background_jobs",
  SCHEDULED_TASKS: "scheduled_tasks",
};

// Fonction pour générer un ID unique
export const generateId = (prefix = ""): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `${prefix}${timestamp}${randomStr}`;
};

export default {
  collections,
  typedCollection,
  databaseConfig,
  cacheKeys,
  documentTypes,
  collectionNames,
  generateId,
};
