// src/services/attendanceService.ts - Service pour la gestion des présences
import { apiService, ApiResponse, PaginatedResponse } from './apiService';
import { Attendance, AttendanceMethod, AttendanceStatus } from '@attendance-x/shared';

export interface AttendanceSearchFilters {
  page?: number;
  limit?: number;
  sortBy?: 'checkInTime' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
  eventId?: string;
  userId?: string;
  status?: AttendanceStatus;
  method?: AttendanceMethod;
  startDate?: string;
  endDate?: string;
  validationStatus?: 'pending' | 'validated' | 'rejected';
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
  averageCheckInTime: string;
  byMethod: Record<AttendanceMethod, number>;
  byStatus: Record<AttendanceStatus, number>;
  trends: {
    daily: Array<{ date: string; count: number; rate: number }>;
    weekly: Array<{ week: string; count: number; rate: number }>;
    monthly: Array<{ month: string; count: number; rate: number }>;
  };
}

export interface AttendancePatterns {
  userId: string;
  userName: string;
  patterns: {
    preferredCheckInTime: string;
    averageLateness: number;
    attendanceStreak: number;
    mostActiveDay: string;
    mostActiveHour: number;
    reliability: number; // 0-100
  };
  insights: string[];
  recommendations: string[];
}

export interface CheckInRequest {
  eventId: string;
  method: AttendanceMethod;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  qrCode?: string;
  biometricData?: string;
  notes?: string;
}

export interface RealtimeMetrics {
  eventId: string;
  totalExpected: number;
  currentAttendees: number;
  attendanceRate: number;
  lateArrivals: number;
  recentCheckIns: Array<{
    userId: string;
    userName: string;
    checkInTime: string;
    method: AttendanceMethod;
  }>;
  hourlyBreakdown: Array<{
    hour: number;
    checkIns: number;
    cumulative: number;
  }>;
}

class AttendanceService {
  // Check-in to event
  async checkIn(data: CheckInRequest): Promise<ApiResponse<Attendance>> {
    return apiService.post<Attendance>('/attendances/check-in', data);
  }

  // Get attendances with filters
  async getAttendances(filters: AttendanceSearchFilters = {}): Promise<ApiResponse<PaginatedResponse<Attendance>>> {
    return apiService.get<PaginatedResponse<Attendance>>('/attendances', filters);
  }

  // Get my attendances
  async getMyAttendances(filters: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    status?: AttendanceStatus;
  } = {}): Promise<ApiResponse<Attendance[]>> {
    return apiService.get<Attendance[]>('/attendances/my-attendances', filters);
  }

  // Get attendance by ID
  async getAttendanceById(id: string): Promise<ApiResponse<Attendance>> {
    return apiService.get<Attendance>(`/attendances/${id}`);
  }

  // Get attendance statistics
  async getAttendanceStats(filters: {
    userId?: string;
    eventId?: string;
    organizerId?: string;
    startDate?: string;
    endDate?: string;
    department?: string;
  } = {}): Promise<ApiResponse<AttendanceStats>> {
    return apiService.get<AttendanceStats>('/attendances/stats', filters);
  }

  // Get attendance patterns
  async getAttendancePatterns(userId?: string): Promise<ApiResponse<AttendancePatterns>> {
    const endpoint = userId ? `/attendances/patterns/${userId}` : '/attendances/patterns';
    return apiService.get<AttendancePatterns>(endpoint);
  }

  // Validate attendance (for managers/admins)
  async validateAttendance(id: string, approved: boolean, notes?: string): Promise<ApiResponse<Attendance>> {
    return apiService.post<Attendance>(`/attendances/${id}/validate`, { approved, notes });
  }

  // Bulk validate attendances
  async bulkValidateAttendances(attendanceIds: string[], approved: boolean, notes?: string): Promise<ApiResponse<void>> {
    return apiService.post<void>('/attendances/bulk-validate', { attendanceIds, approved, notes });
  }

  // Bulk mark attendance
  async bulkMarkAttendance(
    operation: 'mark_present' | 'mark_absent' | 'mark_late',
    eventId: string,
    userIds: string[],
    notes?: string
  ): Promise<ApiResponse<void>> {
    return apiService.post<void>('/attendances/bulk-mark', { operation, eventId, userIds, notes });
  }

  // Event-specific attendance methods
  async getEventAttendances(eventId: string): Promise<ApiResponse<Attendance[]>> {
    return apiService.get<Attendance[]>(`/attendances/events/${eventId}`);
  }

  async markAbsentees(eventId: string): Promise<ApiResponse<void>> {
    return apiService.post<void>(`/attendances/events/${eventId}/mark-absentees`);
  }

  async getEventAttendanceReport(eventId: string): Promise<ApiResponse<any>> {
    return apiService.get<any>(`/attendances/events/${eventId}/report`);
  }

  async getRealtimeMetrics(eventId: string): Promise<ApiResponse<RealtimeMetrics>> {
    return apiService.get<RealtimeMetrics>(`/attendances/events/${eventId}/realtime-metrics`);
  }

  async synchronizeEventAttendances(eventId: string): Promise<ApiResponse<void>> {
    return apiService.post<void>(`/attendances/events/${eventId}/synchronize`);
  }

  async diagnoseAttendanceIssues(eventId: string): Promise<ApiResponse<any>> {
    return apiService.get<any>(`/attendances/events/${eventId}/diagnose`);
  }

  // User-specific reports
  async getUserAttendanceReport(userId: string, filters: {
    startDate?: string;
    endDate?: string;
  } = {}): Promise<ApiResponse<any>> {
    return apiService.get<any>(`/attendances/users/${userId}/report`, filters);
  }

  // Export attendances
  async exportAttendances(filters: Partial<AttendanceSearchFilters>, format: 'csv' | 'json' | 'excel' = 'csv'): Promise<ApiResponse<Blob>> {
    return apiService.post<Blob>('/attendances/export', { filters, format });
  }
}

export const attendanceService = new AttendanceService();