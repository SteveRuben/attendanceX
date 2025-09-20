// Presence Services Domain
// Centralized exports for all presence-related services

export { PresenceService, presenceService } from './presence.service';
export { PresenceValidationService, presenceValidationService } from './presence-validation.service';
export { PresenceSecurityService, presenceSecurityService } from './presence-security.service';
export { PresenceReportService, presenceReportService } from './presence-report.service';
export { PresenceMaintenanceService, presenceMaintenanceService } from './presence-maintenance.service';
export { PresenceAuditService, presenceAuditService } from './presence-audit.service';
export { PresenceNotificationService, presenceNotificationService } from './presence-notification.service';

// Re-export types if needed
export type {
  PresenceEntry,
  PresenceStatus,
  PresenceAlert,
  PresenceQueryParams,
  PresenceStatusResponse,
  ClockInRequest,
  ClockOutRequest
} from '../../common/types';