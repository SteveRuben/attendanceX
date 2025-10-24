// src/services/index.ts - Export centralisé de tous les services

// Core services
export { apiService } from './api';
export { authService } from './authService';

// Unified services (recommended - use these for new development)
export * from './unified';

// Other services
export { userService } from './userService';
export { eventService } from './eventService';
export { notificationService } from './notificationService';
export { mlService } from './mlService';
export { appointmentService } from './appointmentService';
export { organizationService } from './organizationService';
export { preferencesService } from './preferencesService';
export { teamService } from './teamService';
export { participantService } from './participantService';
export { invitationService } from './invitationService';
export { integrationService } from './integrationService';
export { clientService } from './clientService';
export { publicBookingService } from './publicBookingService';
export { multiLanguageNotificationService } from './multiLanguageNotificationService';
export { offlineSyncService } from './offlineSync.service';

// Legacy services (deprecated - migrate to unified services)
export { attendanceService as legacyAttendanceService } from './attendanceService';
export { reportService as legacyReportService } from './reportService';
export { qrCodeService as legacyQrCodeService } from './qrCodeService';
export { analyticsService as legacyAnalyticsService } from './analyticsService';
export { organizationAnalyticsService as legacyOrganizationAnalyticsService } from './organizationAnalyticsService';
export { presenceService as legacyPresenceService } from './presenceService';
// Types exports
export type { ApiResponse, PaginatedResponse } from './api';
export type { UserSearchFilters, UserStats } from './userService';
export type { EventSearchFilters, EventStats, EventAnalytics } from './eventService';
export type { AttendanceSearchFilters, AttendanceStats, AttendancePatterns } from './attendanceService';
export type { NotificationSearchFilters, NotificationStats } from './notificationService';
export type { ReportType, ReportFormat, ReportStatus, Report, GenerateReportRequest } from './reportService';
export type { 
  AttendancePrediction, 
  MLRecommendation, 
  MLAnomaly, 
  MLInsight, 
  MLModel, 
  InfluencingFactor,
  MLTrend,
  MLAnalytics 
} from './mlService';

// Re-export shared appointment types
export type {
  Appointment,
  AppointmentFilters,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  PublicBookingRequest,
  AvailableSlot,
  AppointmentStats,
  AppointmentConflict,
  AppointmentStatus,
  Client,
  Service
} from '@attendance-x/shared';

// Frontend-specific appointment types
export type {
  AppointmentWithDetails,
  AppointmentListResponse,
  Practitioner
} from './appointmentService';