/**
 * Audit Log Types
 * System for tracking all important actions in the application
 */

export enum AuditAction {
  // Authentication
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_REGISTER = 'user.register',
  PASSWORD_RESET = 'user.password_reset',
  PASSWORD_CHANGE = 'user.password_change',
  EMAIL_VERIFY = 'user.email_verify',
  
  // User Management
  USER_CREATE = 'user.create',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',
  USER_ROLE_CHANGE = 'user.role_change',
  USER_SUSPEND = 'user.suspend',
  USER_ACTIVATE = 'user.activate',
  
  // Organization/Tenant
  TENANT_CREATE = 'tenant.create',
  TENANT_UPDATE = 'tenant.update',
  TENANT_DELETE = 'tenant.delete',
  TENANT_SETTINGS_UPDATE = 'tenant.settings_update',
  
  // Events
  EVENT_CREATE = 'event.create',
  EVENT_UPDATE = 'event.update',
  EVENT_DELETE = 'event.delete',
  EVENT_PUBLISH = 'event.publish',
  EVENT_CANCEL = 'event.cancel',
  
  // Attendance
  ATTENDANCE_CHECKIN = 'attendance.checkin',
  ATTENDANCE_CHECKOUT = 'attendance.checkout',
  ATTENDANCE_UPDATE = 'attendance.update',
  
  // Permissions
  PERMISSION_GRANT = 'permission.grant',
  PERMISSION_REVOKE = 'permission.revoke',
  ROLE_CREATE = 'role.create',
  ROLE_UPDATE = 'role.update',
  ROLE_DELETE = 'role.delete',
  
  // Email
  EMAIL_SEND = 'email.send',
  EMAIL_FAIL = 'email.fail',
  EMAIL_CONFIG_UPDATE = 'email.config_update',
  EMAIL_PROVIDER_CHANGE = 'email.provider_change',
  
  // Security
  SECURITY_BREACH_ATTEMPT = 'security.breach_attempt',
  RATE_LIMIT_EXCEEDED = 'security.rate_limit_exceeded',
  UNAUTHORIZED_ACCESS = 'security.unauthorized_access',
  
  // System
  SYSTEM_CONFIG_UPDATE = 'system.config_update',
  SYSTEM_BACKUP = 'system.backup',
  SYSTEM_RESTORE = 'system.restore',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  action: AuditAction;
  severity: AuditSeverity;
  
  // Actor (who performed the action)
  actorId: string;
  actorEmail?: string;
  actorRole?: string;
  actorIp?: string;
  actorUserAgent?: string;
  
  // Target (what was affected)
  targetType?: string; // 'user', 'event', 'tenant', etc.
  targetId?: string;
  targetName?: string;
  
  // Details
  description: string;
  metadata?: Record<string, any>;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  
  // Context
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  
  // Request context
  requestId?: string;
  endpoint?: string;
  method?: string;
}

export interface CreateAuditLogRequest {
  action: AuditAction;
  severity?: AuditSeverity;
  actorId: string;
  actorEmail?: string;
  actorRole?: string;
  actorIp?: string;
  actorUserAgent?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  description: string;
  metadata?: Record<string, any>;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  success?: boolean;
  errorMessage?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
}

export interface AuditLogFilters {
  tenantId?: string;
  actorId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  targetType?: string;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  page?: number;
  limit?: number;
}
