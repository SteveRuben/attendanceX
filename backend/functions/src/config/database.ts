import { CollectionReference, DocumentData, getFirestore } from "firebase-admin/firestore";

// Instance Firestore avec configuration pour ignorer les valeurs undefined
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

// Configuration des collections Firestore - CENTRALISÉE
export const collections = {
  // Collections principales
  users: db.collection("users"),
  events: db.collection("events"),
  attendances: db.collection("attendances"),
  notifications: db.collection("notifications"),
  reports: db.collection("reports"),
  
  // Collections d'authentification et sécurité
  rate_limits: db.collection("rate_limits"),
  user_invitations: db.collection("user_invitations"),
  user_sessions: db.collection("user_sessions"),
  audit_logs: db.collection("audit_logs"),
  email_verification_tokens: db.collection("email_verification_tokens"),
  
  // Collections de profil et préférences utilisateur
  user_statistics: db.collection("user_statistics"),
  user_preferences: db.collection("user_preferences"),
  user_profiles: db.collection("user_profiles"),
  user_integrations: db.collection("user_integrations"),
  user_files: db.collection("user_files"),
  
  // Collections de groupes et organisation
  groups: db.collection("groups"),
  departments: db.collection("departments"),
  
  // Collections de notifications
  notification_templates: db.collection("notification_templates"),
  scheduled_notifications: db.collection("scheduled_notifications"),
  notifications_archive: db.collection("notifications_archive"),
  
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
  generateId,
};
