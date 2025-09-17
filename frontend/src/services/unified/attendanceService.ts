/**
 * Service unifié pour la gestion des présences/attendance
 * Remplace attendanceService.ts et presenceService.ts
 */

import { BaseService, type BaseFilters, type ExportOptions } from '../core/baseService';
import { apiService, type ApiResponse } from '../api';
import { AttendanceMethod, AttendanceStatus, type AttendanceRecord } from '../../shared';

export interface AttendanceFilters extends BaseFilters {
  eventId?: string;
  userId?: string;
  status?: AttendanceStatus;
  method?: AttendanceMethod;
  validationStatus?: 'pending' | 'validated' | 'rejected';
  organizationId?: string;
  department?: string;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
  punctualityRate: number;
  averageCheckInTime: string;
  byMethod: Record<AttendanceMethod, number>;
  byStatus: Record<AttendanceStatus, number>;
  trends: {
    daily: Array<{ date: string; count: number; rate: number }>;
    weekly: Array<{ week: string; count: number; rate: number }>;
    monthly: Array<{ month: string; count: number; rate: number }>;
  };
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
  deviceInfo?: {
    type: 'web' | 'mobile' | 'tablet';
    userAgent?: string;
  };
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
  lastUpdated: Date;
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
    preferredMethods: AttendanceMethod[];
  };
  insights: string[];
  recommendations: string[];
}

class UnifiedAttendanceService extends BaseService {
  protected basePath = '/api/attendance';

  // ==================== CHECK-IN/OUT ====================

  /**
   * Effectuer un check-in
   */
  async checkIn(data: CheckInRequest): Promise<ApiResponse<AttendanceRecord>> {
    try {
      return await apiService.post<AttendanceRecord>(`${this.basePath}/check-in`, data);
    } catch (error) {
      return this.handleError(error, 'checkIn');
    }
  }

  /**
   * Effectuer un check-out
   */
  async checkOut(eventId: string, data?: {
    location?: { latitude: number; longitude: number };
    notes?: string;
  }): Promise<ApiResponse<AttendanceRecord>> {
    try {
      return await apiService.post<AttendanceRecord>(`${this.basePath}/check-out`, {
        eventId,
        ...data
      });
    } catch (error) {
      return this.handleError(error, 'checkOut');
    }
  }

  // ==================== RÉCUPÉRATION DE DONNÉES ====================

  /**
   * Obtenir les présences avec filtres
   */
  async getAttendances(filters: AttendanceFilters = {}): Promise<ApiResponse<any>> {
    try {
      return await this.getItems<AttendanceRecord>('', filters);
    } catch (error) {
      return this.handleError(error, 'getAttendances');
    }
  }

  /**
   * Obtenir mes présences
   */
  async getMyAttendances(filters: Partial<AttendanceFilters> = {}): Promise<ApiResponse<AttendanceRecord[]>> {
    try {
      return await apiService.get<AttendanceRecord[]>(`${this.basePath}/my-attendances`, filters);
    } catch (error) {
      return this.handleError(error, 'getMyAttendances');
    }
  }

  /**
   * Obtenir une présence par ID
   */
  async getAttendanceById(id: string): Promise<ApiResponse<AttendanceRecord>> {
    try {
      return await this.getItemById<AttendanceRecord>('', id);
    } catch (error) {
      return this.handleError(error, 'getAttendanceById');
    }
  }

  /**
   * Obtenir les présences d'un événement
   */
  async getEventAttendances(eventId: string, filters: Partial<AttendanceFilters> = {}): Promise<ApiResponse<AttendanceRecord[]>> {
    try {
      return await apiService.get<AttendanceRecord[]>(`${this.basePath}/events/${eventId}`, filters);
    } catch (error) {
      return this.handleError(error, 'getEventAttendances');
    }
  }

  // ==================== STATISTIQUES ET ANALYTICS ====================

  /**
   * Obtenir les statistiques de présence
   */
  async getAttendanceStats(filters: Partial<AttendanceFilters> = {}): Promise<ApiResponse<AttendanceStats>> {
    try {
      return await this.getStats<AttendanceStats>('', filters);
    } catch (error) {
      return this.handleError(error, 'getAttendanceStats');
    }
  }

  /**
   * Obtenir les métriques temps réel d'un événement
   */
  async getRealtimeMetrics(eventId: string): Promise<ApiResponse<RealtimeMetrics>> {
    try {
      return await apiService.get<RealtimeMetrics>(`${this.basePath}/events/${eventId}/realtime`);
    } catch (error) {
      return this.handleError(error, 'getRealtimeMetrics');
    }
  }

  /**
   * Obtenir les patterns de présence d'un utilisateur
   */
  async getAttendancePatterns(userId?: string): Promise<ApiResponse<AttendancePatterns>> {
    try {
      const endpoint = userId ? `/patterns/${userId}` : '/patterns/me';
      return await apiService.get<AttendancePatterns>(`${this.basePath}${endpoint}`);
    } catch (error) {
      return this.handleError(error, 'getAttendancePatterns');
    }
  }

  // ==================== VALIDATION ====================

  /**
   * Valider une présence
   */
  async validateAttendance(
    id: string, 
    approved: boolean, 
    notes?: string,
    validatedBy?: string
  ): Promise<ApiResponse<AttendanceRecord>> {
    try {
      return await apiService.post<AttendanceRecord>(`${this.basePath}/${id}/validate`, {
        approved,
        notes,
        validatedBy,
        validatedAt: new Date()
      });
    } catch (error) {
      return this.handleError(error, 'validateAttendance');
    }
  }

  /**
   * Validation en masse
   */
  async bulkValidateAttendances(
    attendanceIds: string[], 
    approved: boolean, 
    notes?: string,
    validatedBy?: string
  ): Promise<ApiResponse<{ successful: number; failed: number; errors: any[] }>> {
    try {
      return await apiService.post(`${this.basePath}/bulk-validate`, {
        attendanceIds,
        approved,
        notes,
        validatedBy
      });
    } catch (error) {
      return this.handleError(error, 'bulkValidateAttendances');
    }
  }

  /**
   * Marquer les présences en masse
   */
  async bulkMarkAttendance(
    operation: 'mark_present' | 'mark_absent' | 'mark_late',
    eventId: string,
    userIds: string[],
    notes?: string,
    validatedBy?: string
  ): Promise<ApiResponse<{ successful: number; failed: number; errors: any[] }>> {
    try {
      return await apiService.post(`${this.basePath}/bulk-mark`, {
        operation,
        eventId,
        userIds,
        notes,
        validatedBy
      });
    } catch (error) {
      return this.handleError(error, 'bulkMarkAttendance');
    }
  }

  // ==================== GESTION D'ÉVÉNEMENTS ====================

  /**
   * Marquer automatiquement les absents
   */
  async markAbsentees(eventId: string): Promise<ApiResponse<{ marked: number; errors: any[] }>> {
    try {
      return await apiService.post(`${this.basePath}/events/${eventId}/mark-absentees`);
    } catch (error) {
      return this.handleError(error, 'markAbsentees');
    }
  }

  /**
   * Synchroniser les présences d'un événement
   */
  async synchronizeEventAttendances(eventId: string): Promise<ApiResponse<{ synchronized: number; errors: any[] }>> {
    try {
      return await apiService.post(`${this.basePath}/events/${eventId}/synchronize`);
    } catch (error) {
      return this.handleError(error, 'synchronizeEventAttendances');
    }
  }

  /**
   * Diagnostiquer les problèmes de présence
   */
  async diagnoseAttendanceIssues(eventId: string): Promise<ApiResponse<{
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      affectedUsers: string[];
      recommendations: string[];
    }>;
  }>> {
    try {
      return await apiService.get(`${this.basePath}/events/${eventId}/diagnose`);
    } catch (error) {
      return this.handleError(error, 'diagnoseAttendanceIssues');
    }
  }

  // ==================== RAPPORTS ET EXPORT ====================

  /**
   * Générer un rapport de présence pour un événement
   */
  async getEventAttendanceReport(eventId: string): Promise<ApiResponse<{
    summary: AttendanceStats;
    details: AttendanceRecord[];
    insights: string[];
    recommendations: string[];
  }>> {
    try {
      return await apiService.get(`${this.basePath}/events/${eventId}/report`);
    } catch (error) {
      return this.handleError(error, 'getEventAttendanceReport');
    }
  }

  /**
   * Générer un rapport utilisateur
   */
  async getUserAttendanceReport(
    userId: string, 
    filters: { startDate?: string; endDate?: string } = {}
  ): Promise<ApiResponse<{
    summary: AttendanceStats;
    patterns: AttendancePatterns;
    history: AttendanceRecord[];
    insights: string[];
  }>> {
    try {
      return await apiService.get(`${this.basePath}/users/${userId}/report`, { params: filters });
    } catch (error) {
      return this.handleError(error, 'getUserAttendanceReport');
    }
  }

  /**
   * Exporter les données de présence
   */
  async exportAttendances(
    filters: Partial<AttendanceFilters>, 
    options: ExportOptions
  ): Promise<void> {
    try {
      const blob = await this.exportData('', { ...options, filters });
      const filename = `attendance-export-${new Date().toISOString().split('T')[0]}.${options.format}`;
      this.downloadFile(blob, filename);
    } catch (error) {
      return this.handleError(error, 'exportAttendances');
    }
  }

  // ==================== UTILITAIRES ====================

  /**
   * Vérifier si un utilisateur peut effectuer un check-in
   */
  async canCheckIn(eventId: string, userId?: string): Promise<ApiResponse<{
    canCheckIn: boolean;
    reason?: string;
    restrictions?: string[];
  }>> {
    try {
      const params = userId ? { userId } : {};
      return await apiService.get(`${this.basePath}/events/${eventId}/can-check-in`, { params });
    } catch (error) {
      return this.handleError(error, 'canCheckIn');
    }
  }

  /**
   * Obtenir le statut de présence actuel d'un utilisateur
   */
  async getCurrentAttendanceStatus(userId?: string): Promise<ApiResponse<{
    currentEvent?: {
      eventId: string;
      eventTitle: string;
      checkedIn: boolean;
      checkInTime?: string;
    };
    todayStats: {
      eventsAttended: number;
      totalEvents: number;
      attendanceRate: number;
    };
  }>> {
    try {
      const endpoint = userId ? `/users/${userId}/current-status` : '/me/current-status';
      return await apiService.get(`${this.basePath}${endpoint}`);
    } catch (error) {
      return this.handleError(error, 'getCurrentAttendanceStatus');
    }
  }

  /**
   * Obtenir les alertes de présence
   */
  async getAttendanceAlerts(filters: {
    type?: 'late' | 'absent' | 'anomaly';
    severity?: 'low' | 'medium' | 'high';
    resolved?: boolean;
    limit?: number;
  } = {}): Promise<ApiResponse<Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    eventId?: string;
    userId?: string;
    createdAt: Date;
    resolved: boolean;
    actions?: string[];
  }>>> {
    try {
      return await apiService.get(`${this.basePath}/alerts`, { params: filters });
    } catch (error) {
      return this.handleError(error, 'getAttendanceAlerts');
    }
  }
}

export const attendanceService = new UnifiedAttendanceService();