import { 
  NotificationChannel, 
  NotificationPriority, 
  NotificationStatus, 
  NotificationType 
} from "../types";

// shared/src/constants/notification-types.ts
/* export const NOTIFICATION_TYPES = {
  EVENT_REMINDER: 'EVENT_REMINDER',
  ATTENDANCE_MARKED: 'ATTENDANCE_MARKED',
  EVENT_CANCELLED: 'EVENT_CANCELLED',
  EVENT_UPDATED: 'EVENT_UPDATED',
  NEW_EVENT: 'NEW_EVENT',
  ABSENT_WARNING: 'ABSENT_WARNING',
  ACCOUNT_CREATED: 'ACCOUNT_CREATED',
  PASSWORD_RESET: 'PASSWORD_RESET',
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PHONE_VERIFICATION: 'PHONE_VERIFICATION',
  TWO_FACTOR_CODE: 'TWO_FACTOR_CODE',
  SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE',
  WEEKLY_REPORT: 'WEEKLY_REPORT',
  MONTHLY_REPORT: 'MONTHLY_REPORT'
} as const;
 */


export const NOTIFICATION_TYPE_LABELS = {
  [NotificationType.EVENT_REMINDER]: 'Rappel d\'événement',
  [NotificationType.ATTENDANCE_MARKED]: 'Présence enregistrée',
  [NotificationType.EVENT_CANCELLED]: 'Événement annulé',
  [NotificationType.EVENT_UPDATED]: 'Événement modifié',
  [NotificationType.NEW_EVENT]: 'Nouvel événement',
  [NotificationType.ABSENT_WARNING]: 'Alerte d\'absence',
  [NotificationType.ACCOUNT_CREATED]: 'Compte créé',
  [NotificationType.PASSWORD_RESET]: 'Réinitialisation mot de passe',
  [NotificationType.EMAIL_VERIFICATION]: 'Vérification email',
  [NotificationType.PHONE_VERIFICATION]: 'Vérification téléphone',
  [NotificationType.TWO_FACTOR_CODE]: 'Code d\'authentification',
  [NotificationType.SYSTEM_MAINTENANCE]: 'Maintenance système',
  [NotificationType.WEEKLY_REPORT]: 'Rapport hebdomadaire',
  [NotificationType.MONTHLY_REPORT]: 'Rapport mensuel',
  
  // Grace Period notifications
  [NotificationType.GRACE_PERIOD_WELCOME]: 'Bienvenue - Période de grâce',
  [NotificationType.GRACE_PERIOD_REMINDER_7_DAYS]: 'Rappel - 7 jours restants',
  [NotificationType.GRACE_PERIOD_REMINDER_3_DAYS]: 'Rappel - 3 jours restants',
  [NotificationType.GRACE_PERIOD_REMINDER_1_DAY]: 'Rappel - 1 jour restant',
  [NotificationType.GRACE_PERIOD_EXPIRED]: 'Période de grâce expirée',
  [NotificationType.GRACE_PERIOD_CONVERSION_SUCCESS]: 'Conversion réussie',
  
  // Promo Code notifications
  [NotificationType.PROMO_CODE_APPLIED]: 'Code promo appliqué',
  [NotificationType.PROMO_CODE_EXPIRING_SOON]: 'Code promo expire bientôt',
  [NotificationType.PROMO_CODE_EXPIRED]: 'Code promo expiré',
  [NotificationType.NEW_PROMO_AVAILABLE]: 'Nouvelle promotion disponible',
  
  // Billing notifications
  [NotificationType.SUBSCRIPTION_CREATED]: 'Abonnement créé',
  [NotificationType.SUBSCRIPTION_UPDATED]: 'Abonnement modifié',
  [NotificationType.SUBSCRIPTION_CANCELLED]: 'Abonnement annulé',
  [NotificationType.PAYMENT_SUCCESS]: 'Paiement réussi',
  [NotificationType.PAYMENT_FAILED]: 'Échec de paiement',
  [NotificationType.INVOICE_READY]: 'Facture disponible'
} as const;

export const NOTIFICATION_CHANNEL_LABELS = {
  [NotificationChannel.EMAIL]: 'Email',
  [NotificationChannel.SMS]: 'SMS',
  [NotificationChannel.PUSH]: 'Notification Push',
  [NotificationChannel.IN_APP]: 'Notification dans l\'app'
} as const;

export const NOTIFICATION_STATUS_LABELS = {
  [NotificationStatus.PENDING]: 'En attente',
  [NotificationStatus.SENT]: 'Envoyé',
  [NotificationStatus.DELIVERED]: 'Livré',
  [NotificationStatus.READ]: 'Lu',
  [NotificationStatus.FAILED]: 'Échec',
  [NotificationStatus.CANCELLED]: 'Annulé'
} as const;

export const NOTIFICATION_PRIORITY_LABELS = {
  [NotificationPriority.LOW]: 'Faible',
  [NotificationPriority.NORMAL]: 'Normal',
  [NotificationPriority.HIGH]: 'Élevé',
  [NotificationPriority.URGENT]: 'Urgent'
} as const;

export const NOTIFICATION_STATUS_COLORS = {
  [NotificationStatus.PENDING]: 'yellow',
  [NotificationStatus.SENT]: 'blue',
  [NotificationStatus.DELIVERED]: 'green',
  [NotificationStatus.READ]: 'purple',
  [NotificationStatus.FAILED]: 'red',
  [NotificationStatus.CANCELLED]: 'gray'
} as const;

export const NOTIFICATION_PRIORITY_COLORS = {
  [NotificationPriority.LOW]: 'gray',
  [NotificationPriority.NORMAL]: 'blue',
  [NotificationPriority.HIGH]: 'orange',
  [NotificationPriority.URGENT]: 'red'
} as const;

// Types de notifications urgentes (SMS + Push même si désactivé)
export const URGENT_NOTIFICATION_TYPES = [
  NotificationType.EVENT_CANCELLED,
  NotificationType.ABSENT_WARNING,
  NotificationType.PASSWORD_RESET,
  NotificationType.TWO_FACTOR_CODE,
  NotificationType.SYSTEM_MAINTENANCE,
  NotificationType.GRACE_PERIOD_REMINDER_1_DAY,
  NotificationType.GRACE_PERIOD_EXPIRED,
  NotificationType.PAYMENT_FAILED
] as const;

// Types de notifications configurables par l'utilisateur
export const USER_CONFIGURABLE_NOTIFICATION_TYPES = [
  NotificationType.EVENT_REMINDER,
  NotificationType.ATTENDANCE_MARKED,
  NotificationType.EVENT_UPDATED,
  NotificationType.NEW_EVENT,
  NotificationType.WEEKLY_REPORT,
  NotificationType.MONTHLY_REPORT,
  NotificationType.GRACE_PERIOD_WELCOME,
  NotificationType.GRACE_PERIOD_REMINDER_7_DAYS,
  NotificationType.GRACE_PERIOD_REMINDER_3_DAYS,
  NotificationType.PROMO_CODE_APPLIED,
  NotificationType.PROMO_CODE_EXPIRING_SOON,
  NotificationType.NEW_PROMO_AVAILABLE,
  NotificationType.SUBSCRIPTION_CREATED,
  NotificationType.SUBSCRIPTION_UPDATED,
  NotificationType.PAYMENT_SUCCESS,
  NotificationType.INVOICE_READY
] as const;

// Intervalles de rappel par défaut (en minutes avant l'événement)
export const DEFAULT_REMINDER_INTERVALS = [
  1440, // 24 heures
  60,   // 1 heure
  15    // 15 minutes
] as const;

// Limites de notifications par utilisateur
export const NOTIFICATION_RATE_LIMITS = {
  PER_HOUR: 10,
  PER_DAY: 50,
  PER_WEEK: 200,
  SMS_PER_DAY: 5,
  EMAIL_PER_DAY: 20,
  PUSH_PER_HOUR: 5,
  BILLING_PER_DAY: 10,
  GRACE_PERIOD_PER_DAY: 3,
  PROMO_CODE_PER_DAY: 5
} as const;

// Categories de notifications
export const NOTIFICATION_CATEGORIES = {
  EVENTS: 'events',
  ATTENDANCE: 'attendance',
  SYSTEM: 'system',
  BILLING: 'billing',
  GRACE_PERIOD: 'grace_period',
  PROMO_CODES: 'promo_codes',
  SECURITY: 'security',
  REPORTS: 'reports'
} as const;

// Mapping des types vers les catégories
export const NOTIFICATION_TYPE_CATEGORIES = {
  // Grace Period
  [NotificationType.GRACE_PERIOD_WELCOME]: NOTIFICATION_CATEGORIES.GRACE_PERIOD,
  [NotificationType.GRACE_PERIOD_REMINDER_7_DAYS]: NOTIFICATION_CATEGORIES.GRACE_PERIOD,
  [NotificationType.GRACE_PERIOD_REMINDER_3_DAYS]: NOTIFICATION_CATEGORIES.GRACE_PERIOD,
  [NotificationType.GRACE_PERIOD_REMINDER_1_DAY]: NOTIFICATION_CATEGORIES.GRACE_PERIOD,
  [NotificationType.GRACE_PERIOD_EXPIRED]: NOTIFICATION_CATEGORIES.GRACE_PERIOD,
  [NotificationType.GRACE_PERIOD_CONVERSION_SUCCESS]: NOTIFICATION_CATEGORIES.GRACE_PERIOD,
  
  // Promo Codes
  [NotificationType.PROMO_CODE_APPLIED]: NOTIFICATION_CATEGORIES.PROMO_CODES,
  [NotificationType.PROMO_CODE_EXPIRING_SOON]: NOTIFICATION_CATEGORIES.PROMO_CODES,
  [NotificationType.PROMO_CODE_EXPIRED]: NOTIFICATION_CATEGORIES.PROMO_CODES,
  [NotificationType.NEW_PROMO_AVAILABLE]: NOTIFICATION_CATEGORIES.PROMO_CODES,
  
  // Billing
  [NotificationType.SUBSCRIPTION_CREATED]: NOTIFICATION_CATEGORIES.BILLING,
  [NotificationType.SUBSCRIPTION_UPDATED]: NOTIFICATION_CATEGORIES.BILLING,
  [NotificationType.SUBSCRIPTION_CANCELLED]: NOTIFICATION_CATEGORIES.BILLING,
  [NotificationType.PAYMENT_SUCCESS]: NOTIFICATION_CATEGORIES.BILLING,
  [NotificationType.PAYMENT_FAILED]: NOTIFICATION_CATEGORIES.BILLING,
  [NotificationType.INVOICE_READY]: NOTIFICATION_CATEGORIES.BILLING,
  
  // Events
  [NotificationType.EVENT_REMINDER]: NOTIFICATION_CATEGORIES.EVENTS,
  [NotificationType.EVENT_CANCELLED]: NOTIFICATION_CATEGORIES.EVENTS,
  [NotificationType.EVENT_UPDATED]: NOTIFICATION_CATEGORIES.EVENTS,
  [NotificationType.NEW_EVENT]: NOTIFICATION_CATEGORIES.EVENTS,
  
  // Security
  [NotificationType.PASSWORD_RESET]: NOTIFICATION_CATEGORIES.SECURITY,
  [NotificationType.EMAIL_VERIFICATION]: NOTIFICATION_CATEGORIES.SECURITY,
  [NotificationType.TWO_FACTOR_CODE]: NOTIFICATION_CATEGORIES.SECURITY,
  
  // System
  [NotificationType.SYSTEM_MAINTENANCE]: NOTIFICATION_CATEGORIES.SYSTEM,
  [NotificationType.ACCOUNT_CREATED]: NOTIFICATION_CATEGORIES.SYSTEM
} as const;

// shared/src/constants/user-statuses.ts
export const USER_STATUSES = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING: 'PENDING',
  BLOCKED: 'BLOCKED',
  DELETED: 'DELETED'
} as const;

export const USER_STATUS_LABELS = {
  [USER_STATUSES.ACTIVE]: 'Actif',
  [USER_STATUSES.INACTIVE]: 'Inactif',
  [USER_STATUSES.SUSPENDED]: 'Suspendu',
  [USER_STATUSES.PENDING]: 'En attente',
  [USER_STATUSES.BLOCKED]: 'Bloqué',
  [USER_STATUSES.DELETED]: 'Supprimé'
} as const;

export const USER_STATUS_COLORS = {
  [USER_STATUSES.ACTIVE]: 'green',
  [USER_STATUSES.INACTIVE]: 'gray',
  [USER_STATUSES.SUSPENDED]: 'orange',
  [USER_STATUSES.PENDING]: 'yellow',
  [USER_STATUSES.BLOCKED]: 'red',
  [USER_STATUSES.DELETED]: 'black'
} as const;

// Statuts qui permettent la connexion
export const LOGIN_ALLOWED_STATUSES = [
  USER_STATUSES.ACTIVE
] as const;

// Statuts qui permettent de recevoir des notifications
export const NOTIFICATION_ALLOWED_STATUSES = [
  USER_STATUSES.ACTIVE,
  USER_STATUSES.INACTIVE
] as const;