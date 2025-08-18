import { apiService } from './apiService';

export interface PresenceEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockInTime?: string;
  clockOutTime?: string;
  status: 'present' | 'absent' | 'late' | 'on_break';
  totalHours?: number;
  effectiveHours?: number;
  totalBreakHours?: number;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  notes?: string;
  hasAnomalies?: boolean;
  anomalyTypes?: string[];
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PresenceStatus {
  status: 'present' | 'absent' | 'on_break' | 'late';
  clockInTime?: string;
  clockOutTime?: string;
  totalHours?: number;
  currentBreak?: {
    startTime: string;
    type: string;
  };
}

export interface PresenceStats {
  totalHours: number;
  effectiveHours: number;
  totalBreaks: number;
  totalBreakTime: number;
  attendanceRate: number;
  daysPresent: number;
  averageHours: number;
  lateCount: number;
}

export interface ClockingRequest {
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  note?: string;
  workSiteId?: string;
}

export interface PresenceAlert {
  id: string;
  type: 'anomaly' | 'late' | 'missing_clockout' | 'long_break';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  employeeId: string;
  entryId?: string;
  createdAt: string;
}

class PresenceService {
  private baseUrl = '/api/presence';

  // Clock In/Out
  async clockIn(data: ClockingRequest) {
    return apiService.post(`${this.baseUrl}/employees/me/clock-in`, data);
  }

  async clockOut(data: ClockingRequest) {
    return apiService.post(`${this.baseUrl}/employees/me/clock-out`, data);
  }

  // Breaks
  async startBreak(data: { type?: string; note?: string; location?: any }) {
    return apiService.post(`${this.baseUrl}/employees/me/breaks/start`, data);
  }

  async endBreak(data: { note?: string; location?: any }) {
    return apiService.post(`${this.baseUrl}/employees/me/breaks/end`, data);
  }

  // Status
  async getMyPresenceStatus(): Promise<{ data: PresenceStatus }> {
    return apiService.get(`${this.baseUrl}/employees/me/status`);
  }

  async getEmployeePresenceStatus(employeeId: string): Promise<{ data: PresenceStatus }> {
    return apiService.get(`${this.baseUrl}/employees/${employeeId}/status`);
  }

  // Entries
  async getPresenceEntries(params: {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    return apiService.get(`${this.baseUrl}/entries`, { params });
  }

  async updatePresenceEntry(entryId: string, data: Partial<PresenceEntry>) {
    return apiService.put(`${this.baseUrl}/entries/${entryId}`, data);
  }

  async validatePresenceEntry(entryId: string, data: { notes?: string }) {
    return apiService.post(`${this.baseUrl}/entries/${entryId}/validate`, data);
  }

  async correctPresenceEntry(entryId: string, data: {
    clockInTime?: string;
    clockOutTime?: string;
    notes: string;
    reason: string;
  }) {
    return apiService.post(`${this.baseUrl}/entries/${entryId}/correct`, data);
  }

  // Team Management
  async getCurrentlyPresentEmployees(organizationId: string) {
    return apiService.get(`${this.baseUrl}/organizations/${organizationId}/currently-present`);
  }

  async getTeamPresenceSummary(organizationId: string) {
    return apiService.get(`${this.baseUrl}/organizations/${organizationId}/team-summary`);
  }

  // Statistics
  async getPresenceStats(params: {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
  }): Promise<{ data: PresenceStats }> {
    return apiService.get(`${this.baseUrl}/organizations/me/stats`, { params });
  }

  async getMyPresenceStats(params: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: PresenceStats }> {
    return apiService.get(`${this.baseUrl}/employees/me/stats`, { params });
  }

  // Anomalies
  async detectAnomalies(organizationId: string, params?: {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
  }) {
    return apiService.get(`${this.baseUrl}/organizations/${organizationId}/anomalies`, { params });
  }

  async getPresenceAlerts(params?: {
    type?: string;
    severity?: string;
    resolved?: boolean;
    limit?: number;
  }): Promise<{ data: PresenceAlert[] }> {
    return apiService.get(`${this.baseUrl}/alerts`, { params });
  }

  // Reports
  async generatePresenceReport(data: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    startDate: string;
    endDate: string;
    employeeIds?: string[];
    departments?: string[];
    format?: 'json' | 'csv' | 'excel' | 'pdf';
  }) {
    return apiService.post(`${this.baseUrl}/reports/generate`, data);
  }

  async downloadPresenceReport(reportId: string, format: 'csv' | 'excel' | 'pdf') {
    const response = await apiService.get(`${this.baseUrl}/reports/${reportId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `presence-report.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response;
  }

  async getPresenceReports(params?: {
    type?: string;
    limit?: number;
    offset?: number;
  }) {
    return apiService.get(`${this.baseUrl}/reports`, { params });
  }

  // Processing
  async processEndOfDay(organizationId: string, data: { date: string }) {
    return apiService.post(`${this.baseUrl}/organizations/${organizationId}/process-end-of-day`, data);
  }

  async processDailyNotifications(organizationId: string) {
    return apiService.post(`${this.baseUrl}/organizations/${organizationId}/process-notifications`);
  }

  // Health Check
  async getHealthStatus() {
    return apiService.get(`${this.baseUrl}/health`);
  }
}

export const presenceService = new PresenceService();
export default presenceService;