/**
 * Services unifiés - Point d'entrée principal
 * 
 * Ces services remplacent les anciens services avec une architecture cohérente :
 * - attendanceService (remplace attendanceService.ts et presenceService.ts)
 * - analyticsService (remplace analyticsService.ts et organizationAnalyticsService.ts)
 * - qrCodeService (version unifiée et améliorée)
 * - reportService (centralise toutes les fonctionnalités de reporting)
 */

// Services unifiés
export { attendanceService } from './attendanceService';
export { analyticsService } from './analyticsService';
export { qrCodeService } from './qrCodeService';
export { reportService } from './reportService';

// Types exportés
export type {
  // Attendance
  AttendanceFilters,
  AttendanceStats,
  CheckInRequest,
  RealtimeMetrics,
  AttendancePatterns
} from './attendanceService';

export type {
  // Analytics
  DateRange,
  AnalyticsFilters,
  EventAnalytics,
  OrganizationAnalytics,
  TeamAnalytics,
  ValidationReport,
  AnalyticsInsights
} from './analyticsService';

export type {
  // QR Code
  QRCodeData,
  QRCodeGenerationOptions,
  QRCodeValidationResult,
  QRCodeStats,
  CheckInResult,
  QRCodeScanEvent
} from './qrCodeService';

export type {
  // Reports
  ReportType,
  ReportFormat,
  ReportStatus,
  Report,
  ReportFilters,
  ReportTemplate,
  ScheduledReport,
  ReportStats
} from './reportService';

// Service de base
export { BaseService } from '../core/baseService';
export type { BaseFilters, ExportOptions } from '../core/baseService';