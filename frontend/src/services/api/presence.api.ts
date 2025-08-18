/**
 * Service API pour la gestion de présence
 */

import { apiService } from '../apiService';

// Types locaux pour la présence
interface GeoLocation {
  latitude: number;
  longitude: number;
}

interface PresenceEntry {
  id: string;
  employeeId: string;
  organizationId: string;
  date: string;
  clockInTime: Date;
  clockOutTime?: Date;
  clockInLocation?: GeoLocation;
  clockOutLocation?: GeoLocation;
  status: 'present' | 'late' | 'absent' | 'early_leave';
  totalHours?: number;
  notes?: string;
}

interface PresenceAnomaly {
  id: string;
  type: 'missing_clock_out' | 'late_arrival' | 'early_departure' | 'long_break';
  severity: 'low' | 'medium' | 'high';
  description: string;
  employeeId: string;
  date: string;
  resolved: boolean;
}

export interface ClockInRequest {
  location?: GeoLocation;
  notes?: string;
  deviceInfo?: {
    deviceId?: string;
    platform?: string;
    version?: string;
  };
}

export interface ClockOutRequest {
  location?: GeoLocation;
  notes?: string;
  deviceInfo?: {
    deviceId?: string;
    platform?: string;
    version?: string;
  };
}

export interface StartBreakRequest {
  type: 'lunch' | 'coffee' | 'personal' | 'other';
  location?: GeoLocation;
  notes?: string;
}

export interface EndBreakRequest {
  breakId: string;
  location?: GeoLocation;
  notes?: string;
}

export interface PresenceQueryParams {
  employeeId?: string;
  organizationId?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeValidated?: boolean;
  includeAnomalies?: boolean;
  hasAnomalies?: boolean;
}

export interface UpdatePresenceEntryRequest {
  clockInTime?: string;
  clockOutTime?: string;
  notes?: string;
  managerNotes?: string;
  breakEntries?: Array<{
    id: string;
    type: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    notes?: string;
  }>;
}

export interface ValidatePresenceEntryRequest {
  managerNotes: string;
  isApproved?: boolean;
}

export interface CorrectPresenceEntryRequest {
  corrections: {
    clockInTime?: string;
    clockOutTime?: string;
    breakEntries?: any[];
    notes?: string;
  };
  reason: string;
}

export interface ExportPresenceDataRequest {
  employeeId?: string;
  organizationId?: string;
  startDate?: string;
  endDate?: string;
  format: 'excel' | 'csv' | 'pdf';
  includeAnomalies?: boolean;
  includeStats?: boolean;
}

class PresenceApi {
  private readonly basePath = '/api/presence';

  /**
   * Pointer l'arrivée
   */
  async clockIn(employeeId: string, data: ClockInRequest) {
    return apiService.post<PresenceEntry>(`${this.basePath}/employees/${employeeId}/clock-in`, data);
  }

  /**
   * Pointer la sortie
   */
  async clockOut(employeeId: string, data: ClockOutRequest) {
    return apiService.post<PresenceEntry>(`${this.basePath}/employees/${employeeId}/clock-out`, data);
  }

  /**
   * Commencer une pause
   */
  async startBreak(employeeId: string, data: StartBreakRequest) {
    return apiService.post<PresenceEntry>(`${this.basePath}/employees/${employeeId}/breaks/start`, data);
  }

  /**
   * Terminer une pause
   */
  async endBreak(employeeId: string, data: EndBreakRequest) {
    return apiService.post<PresenceEntry>(`${this.basePath}/employees/${employeeId}/breaks/end`, data);
  }

  /**
   * Obtenir le statut de présence actuel
   */
  async getPresenceStatus(employeeId: string) {
    return apiService.get<{
      status: {
        status: string;
        clockInTime?: Date;
        clockOutTime?: Date;
        totalHours?: number;
        activeBreak?: any;
      };
      todayEntry?: PresenceEntry;
    }>(`${this.basePath}/employees/${employeeId}/status`);
  }

  /**
   * Obtenir les employés actuellement présents
   */
  async getCurrentlyPresentEmployees(organizationId: string) {
    return apiService.get<any[]>(`${this.basePath}/organizations/${organizationId}/currently-present`);
  }

  /**
   * Obtenir le résumé de présence d'équipe
   */
  async getTeamPresenceSummary(organizationId: string) {
    return apiService.get<any[]>(`${this.basePath}/organizations/${organizationId}/team-summary`);
  }

  /**
   * Lister les entrées de présence
   */
  async listPresenceEntries(params: PresenceQueryParams) {
    return apiService.get<PresenceEntry[]>(`${this.basePath}/entries`, { params });
  }

  /**
   * Mettre à jour une entrée de présence
   */
  async updatePresenceEntry(entryId: string, data: UpdatePresenceEntryRequest) {
    return apiService.put<PresenceEntry>(`${this.basePath}/entries/${entryId}`, data);
  }

  /**
   * Valider une entrée de présence
   */
  async validatePresenceEntry(entryId: string, data: ValidatePresenceEntryRequest) {
    return apiService.post<PresenceEntry>(`${this.basePath}/entries/${entryId}/validate`, data);
  }

  /**
   * Corriger une entrée de présence
   */
  async correctPresenceEntry(entryId: string, data: CorrectPresenceEntryRequest) {
    return apiService.post<PresenceEntry>(`${this.basePath}/entries/${entryId}/correct`, data);
  }

  /**
   * Détecter les anomalies de présence
   */
  async detectAnomalies(organizationId: string) {
    return apiService.get<PresenceAnomaly[]>(`${this.basePath}/organizations/${organizationId}/anomalies`);
  }

  /**
   * Obtenir les statistiques de présence
   */
  async getPresenceStats(organizationId: string) {
    return apiService.get<any>(`${this.basePath}/organizations/${organizationId}/stats`);
  }

  /**
   * Obtenir les statistiques d'un employé
   */
  async getEmployeeStats(employeeId: string, params: { period: string }) {
    return apiService.get<any>(`${this.basePath}/employees/${employeeId}/stats`, { params });
  }

  /**
   * Traitement de fin de journée
   */
  async processEndOfDay(organizationId: string, data: { date?: string; autoClockOut?: boolean; notifyManagers?: boolean }) {
    return apiService.post<any>(`${this.basePath}/organizations/${organizationId}/process-end-of-day`, data);
  }

  /**
   * Traitement des notifications quotidiennes
   */
  async processDailyNotifications(organizationId: string) {
    return apiService.post<any>(`${this.basePath}/organizations/${organizationId}/process-notifications`);
  }

  /**
   * Exporter les données de présence
   */
  async exportPresenceData(params: ExportPresenceDataRequest) {
    return apiService.post<{
      downloadUrl: string;
      filename: string;
      fileSize: number;
      format: string;
    }>(`${this.basePath}/export`, params);
  }

  /**
   * Obtenir les entrées d'audit
   */
  async getAuditEntries(params: {
    organizationId?: string;
    userId?: string;
    employeeId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    success?: boolean;
    limit?: number;
    offset?: number;
  }) {
    return apiService.get<any[]>(`${this.basePath}/audit/entries`, { params });
  }

  /**
   * Obtenir les activités suspectes
   */
  async getSuspiciousActivities(organizationId?: string, hours: number = 24) {
    return apiService.get<any[]>(`${this.basePath}/audit/suspicious`, {
      params: { organizationId, hours }
    });
  }

  /**
   * Vérifier la santé du service
   */
  async checkHealth() {
    return apiService.get<{
      status: string;
      timestamp: string;
      services: Record<string, string>;
      version: string;
      uptime: number;
    }>(`${this.basePath}/health`);
  }
}

export const presenceApi = new PresenceApi();