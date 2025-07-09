import {CollectionReference, DocumentData} from "firebase-admin/firestore";
import {db} from "./firebase";

// Configuration des collections Firestore
export const collections = {
  users: db.collection("users"),
  events: db.collection("events"),
  attendances: db.collection("attendances"),
  notifications: db.collection("notifications"),
  emailProviders: db.collection("emailProviders"),
  smsProviders: db.collection("smsProviders"),
  smsTemplates: db.collection("smsTemplates"),
  smsMessages: db.collection("smsMessages"),
  emailTemplates: db.collection("emailTemplates"),
  auditLogs: db.collection("auditLogs"),
  reports: db.collection("reports"),
  settings: db.collection("settings"),
  pushTokens: db.collection("pushTokens"),
  pushMetrics: db.collection("pushMetrics"),
  pushTemplates: db.collection("pushTemplates"),
  scheduledPushNotifications:db.collection("scheduledPushNotifications"),
  file_metadata: db.collection("file_metadata")
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
