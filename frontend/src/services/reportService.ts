// src/services/reportService.ts - Service pour la gestion des rapports
import { apiService, type ApiResponse, type PaginatedResponse } from './apiService';

export type ReportType = 
  | 'attendance_summary'
  | 'event_detail'
  | 'user_attendance'
  | 'department_analytics'
  | 'monthly_summary'
  | 'custom';

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';

export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Report {
  id: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  title: string;
  description?: string;
  filters: Record<string, any>;
  options: Record<string, any>;
  generatedBy: string;
  generatedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  fileSize?: number;
  error?: string;
}

export interface GenerateReportRequest {
  type: ReportType;
  format?: ReportFormat;
  filters?: {
    eventId?: string;
    userId?: string;
    organizerId?: string;
    department?: string;
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
  };
  options?: {
    includeCharts?: boolean;
    includeInsights?: boolean;
    language?: 'fr' | 'en';
    template?: string;
  };
}

export interface ReportSearchFilters {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'type' | 'status';
  sortOrder?: 'asc' | 'desc';
  type?: ReportType;
  status?: ReportStatus;
  generatedBy?: string;
  startDate?: string;
  endDate?: string;
  format?: ReportFormat;
}

export interface ReportStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  byType: Record<ReportType, number>;
  byFormat: Record<ReportFormat, number>;
  averageGenerationTime: number;
  totalFileSize: number;
}

export interface ScheduledReport {
  id: string;
  name: string;
  type: ReportType;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
  };
  recipients: string[];
  filters: Record<string, any>;
  options: Record<string, any>;
  isActive: boolean;
  lastRun?: string;
  nextRun: string;
  createdAt: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  template: string;
  variables: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

class ReportService {
  // Generate report
  async generateReport(data: GenerateReportRequest): Promise<ApiResponse<Report>> {
    return apiService.post<Report>('/reports/generate', data);
  }

  // Preview report
  async previewReport(data: GenerateReportRequest): Promise<ApiResponse<any>> {
    return apiService.post<any>('/reports/preview', data);
  }

  // Get reports list
  async getReports(filters: ReportSearchFilters = {}): Promise<ApiResponse<PaginatedResponse<Report>>> {
    return apiService.get<PaginatedResponse<Report>>('/reports', filters);
  }

  // Get report by ID
  async getReportById(id: string): Promise<ApiResponse<Report>> {
    return apiService.get<Report>(`/reports/${id}`);
  }

  // Download report
  async downloadReport(id: string): Promise<ApiResponse<Blob>> {
    return apiService.get<Blob>(`/reports/${id}/download`);
  }

  // Delete report
  async deleteReport(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/reports/${id}`);
  }

  // Get report statistics
  async getReportStats(filters: {
    generatedBy?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<ApiResponse<ReportStats>> {
    return apiService.get<ReportStats>('/reports/stats', filters);
  }

  // Schedule report
  async scheduleReport(data: {
    name: string;
    type: ReportType;
    schedule: {
      frequency: 'daily' | 'weekly' | 'monthly';
      dayOfWeek?: number;
      dayOfMonth?: number;
      time: string;
    };
    recipients: string[];
    filters?: Record<string, any>;
    options?: Record<string, any>;
    isActive?: boolean;
  }): Promise<ApiResponse<ScheduledReport>> {
    return apiService.post<ScheduledReport>('/reports/schedule', data);
  }

  // Get report templates
  async getReportTemplates(): Promise<ApiResponse<ReportTemplate[]>> {
    return apiService.get<ReportTemplate[]>('/reports/templates');
  }

  // Get report template by ID
  async getReportTemplate(id: string): Promise<ApiResponse<ReportTemplate>> {
    return apiService.get<ReportTemplate>(`/reports/templates/${id}`);
  }

  // Quick report generation methods
  async generateAttendanceReport(eventId: string, format: ReportFormat = 'pdf'): Promise<ApiResponse<Report>> {
    return apiService.post<Report>(`/reports/attendance/${eventId}`, {}, { format });
  }

  async generateUserReport(userId: string, options: {
    format?: ReportFormat;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<ApiResponse<Report>> {
    return apiService.post<Report>(`/reports/user/${userId}`, {}, options);
  }

  async generateMonthlySummary(options: {
    month: number;
    year: number;
    format?: ReportFormat;
  }): Promise<ApiResponse<Report>> {
    return apiService.post<Report>('/reports/monthly-summary', {}, options);
  }

  // Maintenance
  async cleanupExpiredReports(): Promise<ApiResponse<void>> {
    return apiService.post<void>('/reports/cleanup-expired');
  }
}

export const reportService = new ReportService();