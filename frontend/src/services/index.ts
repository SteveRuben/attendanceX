// src/services/index.ts - Export centralisé de tous les services
export { apiService } from './apiService';
export { authService } from './authService';
export { userService } from './userService';
export { eventService } from './eventService';
export { attendanceService } from './attendanceService';
export { notificationService } from './notificationService';
export { reportService } from './reportService';
export { mlService } from './mlService';
export { appointmentService } from './appointmentService';
export { qrCodeService } from './qrCodeService';
export { organizationAnalyticsService } from './organizationAnalyticsService';
export { presenceService } from './presenceService';
// Types exports
export type { ApiResponse, PaginatedResponse } from './apiService';
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