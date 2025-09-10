// shared/types/notification.types.ts

// shared/types/notification.types.ts
import type { BaseEntity } from "./common.types";

export enum NotificationType {
  EVENT_REMINDER = 'event_reminder',
  DAILY_EVENT_REMINDER = 'daily_event_reminder',
  WEEKLY_EVENT_REMINDER = 'weekly_event_reminder',
  EVENT_CREATED = 'event_created',
  EVENT_UPDATED = 'event_updated',
  EVENT_CANCELLED = 'event_cancelled',
  EVENT_STARTING_SOON = 'event_starting_soon',
  LATE_ARRIVAL = 'late_arrival',
  ATTENDANCE_MARKED = 'attendance_marked',
  ATTENDANCE_CONFIRMATION = 'attendance_confirmation',
  ATTENDANCE_REQUIRED = 'attendance_required',
  ATTENDANCE_REMINDER = 'attendance_reminder',
  ATTENDANCE_VALIDATION_REQUIRED = 'attendance_validation_required',
  ATTENDANCE_REMOVED = 'attendance_removed',
  ATTENDANCE_SUMMARY = 'attendance_summary',
  ATTENDANCE_ALERT = 'attendance_alert',
  INVITATION_RECEIVED = 'invitation_received',
  REGISTRATION_CONFIRMED = 'registration_confirmed',
  REPORT_READY = 'report_ready',
  SYSTEM_ALERT = 'system_alert',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  SIGNIFICANT_DELAY = 'signficant_delay',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  WELCOME = 'welcome',
  ADMIN_ALERT = 'admin_alert',
  ONBOARDING_STEP = 'onboarding_step',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_LOCKED = 'account_locked',
  SECURITY_ALERT = 'security_alert',
  FEEDBACK_REQUEST = 'feedback_request',
  APPROVAL_NEEDED = 'approval_needed',
  DEADLINE_APPROACHING = 'deadline_approaching',
  NEW_EVENT = "NEW_EVENT",
  ABSENT_WARNING = "ABSENT_WARNING",
  ACCOUNT_CREATED = "ACCOUNT_CREATED",
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
  PHONE_VERIFICATION = "PHONE_VERIFICATION",
  TWO_FACTOR_CODE = "TWO_FACTOR_CODE",
  WEEKLY_REPORT = "WEEKLY_REPORT",
  MONTHLY_REPORT = "MONTHLY_REPORT",
  ACCOUNT_STATUS_CHANGED = "ACCOUNT_STATUS_CHANGED",
  USER_MENTIONED = "USER_MENTIONED",
  EMAIL_CHANGED = "EMAIL_CHANGED",
  PHONE_CHANGED = "PHONE_CHANGED",
  USER_DELETED = "USER_DELETED",
  PERMISSIONS_CHANGED = "PERMISSIONS_CHANGED",
  ROLE_CHANGED = "ROLE_CHANGED",
  CALENDAR_CONFLICT = "CALENDAR_CONFLICT",
  EVENT_INVITATION = "EVENT_INVITATION",
  EVENT_REMOVED = "EVENT_REMOVED",
  EVENT_FEEDBACK_REQUEST = "EVENT_FEEDBACK_REQUEST",
  EVENT_CONFIRMED = "EVENT_CONFIRMED",
  EVENT_REJECTED = "EVENT_REJECTED",
  EVENT_POSTPONED = "EVENT_POSTPONED",
  EVENT_RESCHEDULED = "EVENT_RESCHEDULED",
  CALENDAR_UPDATE = "CALENDAR_UPDATE",
  ORGANIZER_ALERT = "ORGANIZER_ALERT",
  ORGANIZER_UPDATE = "ORGANIZER_UPDATE",
  STATUS_CHANGE = "STATUS_CHANGE",
  ORGANIZATION_SUSPENDED = "ORGANIZATION_SUSPENDED",
  ORGANIZATION_REACTIVATED = "ORGANIZATION_REACTIVATED"
}

export enum NotificationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  RATE_LIMITED = 'rate_limited',
  SCHEDULED = 'scheduled',
  RETRY_SCHEDULED = 'retry_scheduled',
  PERMANENTLY_FAILED = 'permanently_failed',
  CANCELLED = 'cancelled',
  IGNORED = 'ignored',
  SENT = 'sent',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export interface NotificationTemplate {
  id: string;
  title?: string;
  description?: string;
  name: string;
  type: NotificationType;
  subject: string;
  content: string;
  htmlContent?: string;
  variables: string[];
  channels: NotificationChannel[];
  isActive: boolean;
  priority?: NotificationPriority;
  language: string;
  category?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface NotificationAction {
  id: string;
  label: string;
  action: string;
  url?: string;
  style?: 'primary' | 'secondary' | 'danger';
  icon?: string;
}

export interface Notification extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  htmlMessage?: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  
  // État
  read: boolean;
  sent: boolean;
  delivered: boolean;
  clicked: boolean;
  status: NotificationStatus;
  
  // Métadonnées
  data?: Record<string, any>;
  metadata?:{
    [key: string]: any; // Pour stocker des données supplémentaires spécifiques à la notification
  }
  templateId?: string;
  category?: string;
  relatedEntityId?: string; // ID de l'entité liée (event, user, etc.)
  relatedEntityType?: string;
  
  // Programmation
  scheduledFor?: Date;
  expiresAt?: Date;
  deliveredAt?: Date; // Date à laquelle la notification a été livrée


  // Résultats d'envoi
  sendResults?: {
    [key in NotificationChannel]?: {
      sent: boolean;
      sentAt?: Date;
      delivered?: boolean;
      deliveredAt?: Date;
      error?: string;
      messageId?: string;
      cost?: number;
    }
  };
  
  // Actions disponibles
  actions?: NotificationAction[];
  
  // Tracking
  readAt?: Date;
  clickedAt?: Date;
  actionTaken?: string;
}

export interface SendNotificationRequest {
  userId: string;
  userIds?: string[];
  type: NotificationType;
  title: string;
  message: string;
  recipients?: string[];
  channels: NotificationChannel[];
  priority?: NotificationPriority;
  data?: Record<string, any>;
  link?: string; // Lien vers une ressource ou une action
  templateId?: string;
  scheduledFor?: Date;
  expiresAt?: Date;
  actions?: NotificationAction[];
  sentBy?: string; // ID de l'utilisateur ou du système qui envoie la notification
}


export interface CreateNotificationRequest {
  type: NotificationType;
  title: string;
  message: string;
  recipients?: string[];
  channels: NotificationChannel[];
  priority?: NotificationPriority;
  data?: Record<string, any>;
  link?: string;
  templateId?: string;
  scheduledFor?: Date;
  expiresAt?: Date;
  actions?: NotificationAction[];
}

export interface NotificationPreferences {
  emailNotifications: {
    enabled: boolean;
    events: boolean;
    reminders: boolean;
    reports: boolean;
    marketing: boolean;
  };
  pushNotifications: {
    enabled: boolean;
    events: boolean;
    reminders: boolean;
    mentions: boolean;
    updates: boolean;
  };
  smsNotifications: {
    enabled: boolean;
    urgent: boolean;
    reminders: boolean;
  };
  inAppNotifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
  frequency: {
    digest: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
    quietHours: {
      enabled: boolean;
      start: string; // Format HH:mm
      end: string;   // Format HH:mm
    };
  };
}

export interface BulkNotificationRequest {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  recipients?: string[];
  channels: NotificationChannel[];
  priority?: NotificationPriority;
  data?: Record<string, any>;
  link?: string; // Lien vers une ressource ou une action
  templateId?: string;
  scheduledFor?: Date;
  expiresAt?: Date;
  actions?: NotificationAction[];
  batchSize?: number; // Nombre maximum de notifications à envoyer par lot
  sentBy?: string; // ID de l'utilisateur ou du système qui envoie la notification
}