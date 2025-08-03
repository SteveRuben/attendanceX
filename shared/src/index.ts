// shared/src/index.ts

// Export de tous les types
export * from './types';

// Export des constantes
export * from './constants';

// Export des validators
export * from './validators';

// Export des utilitaires
export * from './utils';

// Re-export des types les plus utilisés pour faciliter l'import
export type {
  User,
  CreateUserRequest,
  UpdateUserRequest
} from './types/user.types';

export type {
  Event,
  CreateEventRequest,
  UpdateEventRequest
} from './types/event.types';

export type {
  AttendanceRecord,
  MarkAttendanceRequest
} from './types/attendance.types';

export type {
  Notification,
  CreateNotificationRequest,
  SendNotificationRequest,
  BulkNotificationRequest,
  NotificationPreferences
} from './types/notification.types';

export type {
  ApiResponse,
  PaginatedResponse,
  BaseEntity
} from './types/common.types';

// Export des énums les plus utilisés
export {
  UserRole,
  UserStatus,
  EventType,
  EventStatus,
  AttendanceStatus,
  AttendanceMethod,
  NotificationType,
  NotificationChannel
} from './types';

// Version du package
export const VERSION = '1.0.0';