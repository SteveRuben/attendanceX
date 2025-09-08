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
  [NotificationType.MONTHLY_REPORT]: 'Rapport mensuel'
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
  NotificationType.SYSTEM_MAINTENANCE
] as const;

// Types de notifications configurables par l'utilisateur
export const USER_CONFIGURABLE_NOTIFICATION_TYPES = [
  NotificationType.EVENT_REMINDER,
  NotificationType.ATTENDANCE_MARKED,
  NotificationType.EVENT_UPDATED,
  NotificationType.NEW_EVENT,
  NotificationType.WEEKLY_REPORT,
  NotificationType.MONTHLY_REPORT
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
  PUSH_PER_HOUR: 5
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