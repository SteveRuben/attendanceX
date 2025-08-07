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

// Appointment types
export type {
  Appointment,
  AppointmentWithDetails,
  AppointmentFilters,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  PublicBookingRequest,
  AvailableSlot,
  AppointmentStats,
  AppointmentConflict,
  AppointmentLoadingStates,
  AppointmentError,
  AppointmentServiceResponse,
  UseAppointmentsReturn,
  UseAppointmentReturn,
  UseAvailableSlotsReturn,
  UseAppointmentStatsReturn
} from '../types/appointment.types';