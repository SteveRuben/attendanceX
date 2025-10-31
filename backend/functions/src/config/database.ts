import { CollectionReference, DocumentData, getFirestore } from "firebase-admin/firestore";

// Instance Firestore centralisée avec configuration
export const db = getFirestore();

// Configuration Firestore pour ignorer les valeurs undefined
try {
  db.settings({
    ignoreUndefinedProperties: true,
    timestampsInSnapshots: true
  });
} catch (error) {
  // Ignorer l'erreur si les settings ont déjà été appliqués
  console.warn("Firestore settings already applied:", error);
}

// Configuration des collections Firestore - CENTRALISÉE
export const collections = {
  // Collections principales
  users: db.collection("users"),
  clients: db.collection("clients"),
  user_consents: db.collection("user_consents"),
  email_verifications: db.collection("email_verifications"),
  two_factor_setup: db.collection("two_factor_setup"),
  invitation_tokens: db.collection("invitation_tokens"),

  events: db.collection("events"),
  event_metrics: db.collection("event_metrics"),
  events_archive: db.collection("events_archive"),
  resolutions: db.collection("resolutions"),

  attendances: db.collection("attendances"),
  attendances_archive: db.collection("attendance_archive"),

  notifications: db.collection("notifications"),
  reports: db.collection("reports"),

  // Multi-tenant collections
  tenants: db.collection("tenants"),
  tenant_suggestions: db.collection("tenant_suggestions"),
  tenant_analytics: db.collection("tenant_analytics"),
  tenant_memberships: db.collection("tenant_memberships"),
  tenant_branding: db.collection("tenant_branding"),
  subscription_plans: db.collection("subscription_plans"),
  usage_metrics: db.collection("usage_metrics"),
  usage_alerts: db.collection("usage_alerts"),
  usage_reports: db.collection("usage_reports"),
  subscriptions: db.collection("subscriptions"),
  billing_periods: db.collection("billing_periods"),
  billing_alerts: db.collection("billing_alerts"),
  billing_history: db.collection("billing_history"),

  invitation_activities: db.collection("invitation_activities"),

  feature_toggles: db.collection("feature_toggles"),
  custom_fields: db.collection("custom_fields"),
  custom_domains: db.collection("custom_domains"),
  dashboard_layouts: db.collection("dashboard_layouts"),
  onboarding_status: db.collection("onboarding_status"),
  setup_wizard_status: db.collection("setup_wizard_status"),
  workflow_configurations: db.collection("workflow_configurations"),

  stripe_customers: db.collection("stripe_customers"),
  stripe_subscriptions: db.collection("stripe_subscriptions"),
  stripe_webhook_events: db.collection("stripe_webhook_events"),
  invoices: db.collection("invoices"),

  dunning_processes: db.collection("dunning_processes"),
  dunning_steps: db.collection("dunning_steps"),
  dunning_reports: db.collection("dunning_reports"),
  dunning_templates: db.collection("dunning_templates"),

  // Legacy organization collections (deprecated)
  organizations: db.collection("organizations"),
  organization_invitations: db.collection("organization_invitations"),
  organization_members: db.collection("organization_members"),

  teams: db.collection("teams"),
  team_members: db.collection("team_members"),

  suspension_appeals: db.collection("suspension_appeals"),
  organization_metrics: db.collection("organization_metrics"),

  // Collections d'authentification et sécurité
  rate_limits: db.collection("rate_limits"),

  user_invitations: db.collection("user_invitations"),
  user_sessions: db.collection("user_sessions"),

  audit_logs: db.collection("audit_logs"),
  calendar_events: db.collection("calendar_events"),
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

  // Collections de présence
  presence_entries: db.collection("presence_entries"),
  employees: db.collection("employees"),
  employee_presence_stats: db.collection("employee_presence_stats"),
  work_schedules: db.collection("work_schedules"),
  presence_settings: db.collection("presence_settings"),
  presence_reports: db.collection("presence_reports"),
  scheduled_reports: db.collection("scheduled_reports"),
  leave_requests: db.collection("leave_requests"),
  presence_alerts: db.collection("presence_alerts"),
  presence_notifications: db.collection("presence_notifications"),
  location_tracking: db.collection("location_tracking"),
  work_areas: db.collection("work_areas"),

  // Collections de notifications
  notification_templates: db.collection("notification_templates"),
  notification_logs: db.collection("notification_logs"),
  notification_stats: db.collection("notification_stats"),
  notification_analytics: db.collection("notification_analytics"),
  notification_metrics: db.collection("notification_metrics"),
  scheduled_notifications: db.collection("scheduled_notifications"),
  notifications_archive: db.collection("notifications_archive"),
  alerts: db.collection("alerts"),
  alert_rules: db.collection("alert_rules"),
  active_alerts: db.collection("active_alerts"),
  system_stats: db.collection("system_stats"),
  security_events: db.collection("security_events"),
  weekly_reports: db.collection("weekly_reports"),
  performance_logs: db.collection("performance_logs"),
  feature_usage_logs: db.collection("feature_usage_logs"),
  request_logs: db.collection("request_logs"),

  // Collections email
  custom_reminders: db.collection("custom_reminders"),
  emailProviders: db.collection("emailProviders"),
  email_templates: db.collection("email_templates"),
  email_logs: db.collection("email_logs"),

  // Collections email campaigns
  email_campaigns: db.collection("email_campaigns"),
  campaign_templates: db.collection("campaign_templates"),
  campaign_deliveries: db.collection("campaign_deliveries"),
  campaign_delivery_queues: db.collection("campaign_delivery_queues"),
  campaign_tracking_events: db.collection("campaign_tracking_events"),
  campaign_unsubscribes: db.collection("campaign_unsubscribes"),
  campaign_analytics: db.collection("campaign_analytics"),
  campaign_queues: db.collection("campaign_queues"),
  campaign_recipient_lists: db.collection("campaign_recipient_lists"),
  email_tracking: db.collection("email_tracking"),
  email_unsubscribes: db.collection("email_unsubscribes"),
  unsubscribe_tokens: db.collection("unsubscribe_tokens"),
  event_participants: db.collection("event_participants"),

  // Collections SMS
  smsProviders: db.collection("smsProviders"),
  smsTemplates: db.collection("smsTemplates"),
  smsMessages: db.collection("smsMessages"),
  sms_logs: db.collection("sms_logs"),

  partner_webhook_configs: db.collection("partner_webhook_configs"),
  webhook_events: db.collection("webhook_events"),

  // promo code
  promo_codes: db.collection("promo_codes"),
  promo_code_usages: db.collection("promo_code_usages"),
  promo_code_attempts: db.collection("promo_code_attempts"),
  grace_periods: db.collection("grace_periods"),
  stripe_coupons: db.collection("stripe_coupons"),
  compliance_reports: db.collection("compliance_reports"),

  billing_audit_logs: db.collection("billing_audit_logs"),
  privacy_requests: db.collection("privacy_requests"),
  compliance_checks: db.collection("compliance_checks"),
  rate_limit_blocks: db.collection("rate_limit_blocks"),

  // Collections Push
  push_devices: db.collection("push_devices"),
  pushTokens: db.collection("pushTokens"),
  pushMetrics: db.collection("pushMetrics"),
  pushTemplates: db.collection("pushTemplates"),
  scheduledPushNotifications: db.collection("scheduledPushNotifications"),

  // Collections de contenu et feedback
  approval_workflows: db.collection("approval_workflows"),
  approver_assignments: db.collection("approver_assignments"),
  approval_configurations: db.collection("approval_configurations"),
  feedbacks: db.collection("feedbacks"),
  invitations: db.collection("invitations"),

  // Collections système
  settings: db.collection("settings"),
  file_metadata: db.collection("file_metadata"),

  dashboard: db.collection("dashboard"),
  user_actions: db.collection("user_actions"),
  // user analytic
  analytics: db.collection("analytics"),
  // Collections ML et analytics
  ml_models: db.collection("ml_models"),
  ml_predictions: db.collection("ml_predictions"),
  analytics_events: db.collection("analytics_events"),

  // Collections de cache et performance
  cache_entries: db.collection("cache_entries"),
  performance_metrics: db.collection("performance_metrics"),

  // Collections de métriques système
  user_adoption_metrics: db.collection("user_adoption_metrics"),
  system_health_metrics: db.collection("system_health_metrics"),

  // Collections de logs et monitoring
  error_logs: db.collection("error_logs"),
  access_logs: db.collection("access_logs"),

  // Collections temporaires et jobs
  background_jobs: db.collection("background_jobs"),
  scheduled_tasks: db.collection("scheduled_tasks"),

  // Collections Timesheet et Time Tracking
  timesheets: db.collection("timesheets"),
  time_entries: db.collection("time_entries"),
  projects: db.collection("projects"),
  activity_codes: db.collection("activity_codes"),

  // Collections Reports
  report_exports: db.collection("report_exports"),
  report_templates: db.collection("report_templates"),
  report_schedules: db.collection("report_schedules"),

  // Collections Export et Audit
  export_audit_logs: db.collection("export_audit_logs"),
  export_metrics: db.collection("export_metrics"),
  export_alert_rules: db.collection("export_alert_rules"),
  export_alerts: db.collection("export_alerts"),

  // Collections Optimization
  query_performance: db.collection("query_performance"),
  optimization_metrics: db.collection("optimization_metrics"),

  // Collections Synchronization
  coherence_checks: db.collection("coherence_checks"),
  coherence_issues: db.collection("coherence_issues"),
  sync_jobs: db.collection("sync_jobs"),
  import_jobs: db.collection("import_jobs"),
  prefill_configurations: db.collection("prefill_configurations"),
  sync_results: db.collection("sync_results"),
  sync_conflicts: db.collection("sync_conflicts"),
  sync_configurations: db.collection("sync_configurations"),

  // Collections Deployment
  deployment_logs: db.collection("deployment_logs"),
  migration_jobs: db.collection("migration_jobs"),
  training_modules: db.collection("training_modules"),
  documentation: db.collection("documentation"),

  // Alias pour compatibilité (à supprimer progressivement)
  auditLogs: db.collection("audit_logs"), // Alias pour audit_logs
  health_check: db.collection("health_check")
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
  // Multi-tenant collection names
  TENANTS: "tenants",
  TENANT_MEMBERSHIPS: "tenant_memberships",
  TENANT_BRANDING: "tenant_branding",
  SUBSCRIPTION_PLANS: "subscription_plans",
  USAGE_METRICS: "usage_metrics",
  USAGE_ALERTS: "usage_alerts",
  USAGE_REPORTS: "usage_reports",
  SUBSCRIPTIONS: "subscriptions",
  BILLING_PERIODS: "billing_periods",
  STRIPE_CUSTOMERS: "stripe_customers",
  STRIPE_SUBSCRIPTIONS: "stripe_subscriptions",
  STRIPE_WEBHOOK_EVENTS: "stripe_webhook_events",

  // Legacy organization collection names (deprecated)
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

  // Présence
  PRESENCE_ENTRIES: "presence_entries",
  EMPLOYEES: "employees",
  EMPLOYEE_PRESENCE_STATS: "employee_presence_stats",
  WORK_SCHEDULES: "work_schedules",
  PRESENCE_SETTINGS: "presence_settings",
  PRESENCE_REPORTS: "presence_reports",
  SCHEDULED_REPORTS: "scheduled_reports",
  LEAVE_REQUESTS: "leave_requests",
  PRESENCE_ALERTS: "presence_alerts",
  PRESENCE_NOTIFICATIONS: "presence_notifications",
  LOCATION_TRACKING: "location_tracking",
  WORK_AREAS: "work_areas",

  // Notifications
  NOTIFICATION_TEMPLATES: "notification_templates",
  NOTIFICATION_LOGS: "notification_logs",
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

  // Email Campaigns
  EMAIL_CAMPAIGNS: "email_campaigns",
  CAMPAIGN_TEMPLATES: "campaign_templates",
  CAMPAIGN_DELIVERIES: "campaign_deliveries",
  CAMPAIGN_TRACKING_EVENTS: "campaign_tracking_events",
  CAMPAIGN_UNSUBSCRIBES: "campaign_unsubscribes",
  CAMPAIGN_ANALYTICS: "campaign_analytics",
  CAMPAIGN_QUEUES: "campaign_queues",

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

  // Timesheet et Time Tracking
  TIMESHEETS: "timesheets",
  TIME_ENTRIES: "time_entries",
  PROJECTS: "projects",
  ACTIVITY_CODES: "activity_codes",

  // Reports
  REPORT_EXPORTS: "report_exports",
  REPORT_TEMPLATES: "report_templates",
  REPORT_SCHEDULES: "report_schedules",

  // Export et Audit
  EXPORT_AUDIT_LOGS: "export_audit_logs",
  EXPORT_METRICS: "export_metrics",
  EXPORT_ALERT_RULES: "export_alert_rules",
  EXPORT_ALERTS: "export_alerts",

  // Optimization
  QUERY_PERFORMANCE: "query_performance",
  OPTIMIZATION_METRICS: "optimization_metrics",

  // Synchronization
  COHERENCE_CHECKS: "coherence_checks",
  COHERENCE_ISSUES: "coherence_issues",
  SYNC_JOBS: "sync_jobs",
  IMPORT_JOBS: "import_jobs",
  PREFILL_CONFIGURATIONS: "prefill_configurations",
  SYNC_RESULTS: "sync_results",
  SYNC_CONFLICTS: "sync_conflicts",
  SYNC_CONFIGURATIONS: "sync_configurations",

  // Deployment
  DEPLOYMENT_LOGS: "deployment_logs",
  MIGRATION_JOBS: "migration_jobs",
  TRAINING_MODULES: "training_modules",
  DOCUMENTATION: "documentation",
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
