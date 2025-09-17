/**
 * Service d'intégration API pour la gestion de présence
 */

import { ApiResponse, ApiError } from '../api';
import {
  type PresenceEntry, type Employee,
  type WorkSchedule, type LeaveRequest
} from '../../shared';

// Types pour les réponses API
interface PresenceApiResponse<T = any> extends ApiResponse<T> {
  timestamp: number;
  version: string;
}

interface RealTimePresenceUpdate {
  type: 'presence_update' | 'schedule_change' | 'leave_update' | 'anomaly_alert';
  data: any;
  timestamp: number;
  employeeId: string;
}

interface SyncStatus {
  lastSync: number;
  pendingCount: number;
  failedCount: number;
  status: 'synced' | 'syncing' | 'error' | 'offline';
}

class PresenceIntegrationApi {
  private baseUrl: string;
  private apiKey: string | null = null;
  private eventSource: EventSource | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/api';
    this.setupInterceptors();
  }

  /**
   * Configuration des intercepteurs pour la gestion d'erreurs et retry
   */
  private setupInterceptors() {
    // Intercepteur global pour les erreurs
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason instanceof ApiError) {
        this.handleApiError(event.reason);
      }
    });
  }

  /**
   * Définir la clé API
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Effectuer une requête avec retry automatique
   */
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<PresenceApiResponse<T>> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        ...options.headers
      };

      const response = await fetch(`${this.baseUrl}${url}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError({
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          code: errorText
        });
      }

      const data = await response.json();
      this.retryCount = 0; // Reset retry count on success

      return {
        ...data,
        timestamp: Date.now(),
        version: '1.0'
      };
    } catch (error) {
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        console.warn(`Request failed, retrying (${retryCount + 1}/${this.maxRetries})...`);
        await this.delay(this.retryDelay * Math.pow(2, retryCount));
        return this.fetchWithRetry(url, options, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Vérifier si une erreur justifie un retry
   */
  private shouldRetry(error: any): boolean {
    if (error instanceof ApiError) {
      // Retry pour les erreurs temporaires
      return error.status >= 500 || error.status === 429 || error.status === 408;
    }
    // Retry pour les erreurs réseau
    return error.name === 'TypeError' || error.name === 'NetworkError';
  }

  /**
   * Délai d'attente
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gérer les erreurs API
   */
  private handleApiError(error: ApiError) {
    console.error('API Error:', error);

    // Émettre un événement personnalisé pour que les composants puissent réagir
    window.dispatchEvent(new CustomEvent('api-error', {
      detail: { error, timestamp: Date.now() }
    }));
  }

  // === MÉTHODES D'INTÉGRATION PRÉSENCE ===

  /**
   * Pointer l'arrivée
   */
  async clockIn(employeeId: string, location?: { latitude: number; longitude: number }): Promise<PresenceEntry> {
    const response = await this.fetchWithRetry<PresenceEntry>('/presence/clock-in', {
      method: 'POST',
      body: JSON.stringify({
        employeeId,
        location,
        timestamp: Date.now()
      })
    });

    if (!response.data) {
      throw new Error('No data received from clock-in request');
    }

    return response.data;
  }

  /**
   * Pointer le départ
   */
  async clockOut(employeeId: string, location?: { latitude: number; longitude: number }): Promise<PresenceEntry> {
    const response = await this.fetchWithRetry<PresenceEntry>('/presence/clock-out', {
      method: 'POST',
      body: JSON.stringify({
        employeeId,
        location,
        timestamp: Date.now()
      })
    });

    if (!response.data) {
      throw new Error('No data received from clock-out request');
    }

    return response.data;
  }

  /**
   * Commencer une pause
   */
  async startBreak(employeeId: string): Promise<PresenceEntry> {
    const response = await this.fetchWithRetry<PresenceEntry>('/presence/start-break', {
      method: 'POST',
      body: JSON.stringify({
        employeeId,
        timestamp: Date.now()
      })
    });

    if (!response.data) {
      throw new Error('No data received from start-break request');
    }

    return response.data;
  }

  /**
   * Terminer une pause
   */
  async endBreak(employeeId: string): Promise<PresenceEntry> {
    const response = await this.fetchWithRetry<PresenceEntry>('/presence/end-break', {
      method: 'POST',
      body: JSON.stringify({
        employeeId,
        timestamp: Date.now()
      })
    });

    if (!response.data) {
      throw new Error('No data received from end-break request');
    }

    return response.data;
  }

  /**
   * Obtenir la présence actuelle
   */
  async getCurrentPresence(employeeId: string): Promise<PresenceEntry | null> {
    const response = await this.fetchWithRetry<PresenceEntry | null>(`/presence/current/${employeeId}`);
    return response.data ?? null;
  }

  /**
   * Obtenir l'historique de présence
   */
  async getPresenceHistory(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PresenceEntry[]> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    const response = await this.fetchWithRetry<PresenceEntry[]>(
      `/presence/history/${employeeId}?${params}`
    );

    return response.data || [];
  }

  /**
   * Synchroniser les données hors ligne
   */
  async syncOfflineData(offlineEntries: any[]): Promise<{ synced: number; failed: number }> {
    const response = await this.fetchWithRetry<{ synced: number; failed: number }>('/presence/sync', {
      method: 'POST',
      body: JSON.stringify({ entries: offlineEntries })
    });

    if (!response.data) {
      throw new Error('No data received from sync request');
    }

    return response.data;
  }

  /**
   * Obtenir le statut de synchronisation
   */
  async getSyncStatus(employeeId: string): Promise<SyncStatus> {
    const response = await this.fetchWithRetry<SyncStatus>(`/presence/sync-status/${employeeId}`);

    if (!response.data) {
      throw new Error('No sync status data received');
    }

    return response.data;
  }

  // === MÉTHODES TEMPS RÉEL ===

  /**
   * Établir une connexion temps réel
   */
  connectRealTime(employeeId: string, onUpdate: (update: RealTimePresenceUpdate) => void): void {
    if (this.eventSource) {
      this.eventSource.close();
    }

    const url = `${this.baseUrl}/presence/stream/${employeeId}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const update: RealTimePresenceUpdate = JSON.parse(event.data);
        onUpdate(update);
      } catch (error) {
        console.error('Failed to parse real-time update:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('EventSource error:', error);

      // Tentative de reconnexion automatique
      setTimeout(() => {
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.connectRealTime(employeeId, onUpdate);
        }
      }, 5000);
    };
  }

  /**
   * Fermer la connexion temps réel
   */
  disconnectRealTime(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  // === MÉTHODES DE GESTION D'ÉQUIPE ===

  /**
   * Obtenir la présence de l'équipe
   */
  async getTeamPresence(managerId: string): Promise<PresenceEntry[]> {
    const response = await this.fetchWithRetry<PresenceEntry[]>(`/presence/team/${managerId}`);
    return response.data || [];
  }

  /**
   * Obtenir les anomalies de présence
   */
  async getPresenceAnomalies(
    managerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    const response = await this.fetchWithRetry<any[]>(
      `/presence/anomalies/${managerId}?${params}`
    );
    return response.data || [];
  }

  // === MÉTHODES DE PLANIFICATION ===

  /**
   * Obtenir le planning d'un employé
   */
  async getEmployeeSchedule(employeeId: string, date: Date): Promise<WorkSchedule | null> {
    const params = new URLSearchParams({
      date: date.toISOString().split('T')[0]
    });

    const response = await this.fetchWithRetry<WorkSchedule | null>(
      `/schedules/employee/${employeeId}?${params}`
    );
    return response.data ?? null;
  }

  /**
   * Mettre à jour le planning
   */
  async updateSchedule(schedule: Partial<WorkSchedule>): Promise<WorkSchedule> {
    const response = await this.fetchWithRetry<WorkSchedule>('/schedules', {
      method: 'PUT',
      body: JSON.stringify(schedule)
    });

    if (!response.data) {
      throw new Error('No data received from schedule update request');
    }

    return response.data;
  }

  // === MÉTHODES DE CONGÉS ===

  /**
   * Soumettre une demande de congé
   */
  async submitLeaveRequest(leaveRequest: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const response = await this.fetchWithRetry<LeaveRequest>('/leaves/request', {
      method: 'POST',
      body: JSON.stringify(leaveRequest)
    });

    if (!response.data) {
      throw new Error('No data received from leave request submission');
    }

    return response.data;
  }

  /**
   * Approuver/Rejeter une demande de congé
   */
  async processLeaveRequest(
    requestId: string,
    action: 'approve' | 'reject',
    notes?: string
  ): Promise<LeaveRequest> {
    const response = await this.fetchWithRetry<LeaveRequest>(`/leaves/process/${requestId}`, {
      method: 'POST',
      body: JSON.stringify({ action, notes })
    });

    if (!response.data) {
      throw new Error('No data received from leave request processing');
    }

    return response.data;
  }

  /**
   * Obtenir les demandes de congé
   */
  async getLeaveRequests(employeeId?: string, status?: string): Promise<LeaveRequest[]> {
    const params = new URLSearchParams();
    if (employeeId) params.append('employeeId', employeeId);
    if (status) params.append('status', status);

    const response = await this.fetchWithRetry<LeaveRequest[]>(`/leaves?${params}`);
    return response.data || [];
  }

  // === MÉTHODES DE RAPPORTS ===

  /**
   * Générer un rapport de présence
   */
  async generatePresenceReport(
    filters: {
      employeeIds?: string[];
      startDate: Date;
      endDate: Date;
      format: 'pdf' | 'excel' | 'csv';
    }
  ): Promise<{ reportId: string; downloadUrl: string }> {
    const response = await this.fetchWithRetry<{ reportId: string; downloadUrl: string }>(
      '/reports/presence/generate',
      {
        method: 'POST',
        body: JSON.stringify(filters)
      }
    );

    if (!response.data) {
      throw new Error('No data received from report generation request');
    }

    return response.data;
  }

  /**
   * Obtenir le statut d'un rapport
   */
  async getReportStatus(reportId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    downloadUrl?: string;
  }> {
    const response = await this.fetchWithRetry<any>(`/reports/status/${reportId}`);

    if (!response.data) {
      throw new Error('No report status data received');
    }

    return response.data;
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * Vérifier la santé de l'API
   */
  async healthCheck(): Promise<{ status: string; timestamp: number }> {
    const response = await this.fetchWithRetry<{ status: string; timestamp: number }>('/health');

    if (!response.data) {
      throw new Error('No health check data received');
    }

    return response.data;
  }

  /**
   * Obtenir les statistiques de l'API
   */
  async getApiStats(): Promise<{
    uptime: number;
    requestCount: number;
    errorRate: number;
    avgResponseTime: number;
  }> {
    const response = await this.fetchWithRetry<any>('/stats');

    if (!response.data) {
      throw new Error('No API stats data received');
    }

    return response.data;
  }

  /**
   * Nettoyer les ressources
   */
  cleanup(): void {
    this.disconnectRealTime();
  }
}

// Instance singleton
export const presenceIntegrationApi = new PresenceIntegrationApi();

// Hook personnalisé pour l'intégration API
export const usePresenceApi = () => {
  return {
    api: presenceIntegrationApi,

    // Méthodes de convenance
    clockIn: presenceIntegrationApi.clockIn.bind(presenceIntegrationApi),
    clockOut: presenceIntegrationApi.clockOut.bind(presenceIntegrationApi),
    startBreak: presenceIntegrationApi.startBreak.bind(presenceIntegrationApi),
    endBreak: presenceIntegrationApi.endBreak.bind(presenceIntegrationApi),

    getCurrentPresence: presenceIntegrationApi.getCurrentPresence.bind(presenceIntegrationApi),
    getPresenceHistory: presenceIntegrationApi.getPresenceHistory.bind(presenceIntegrationApi),

    connectRealTime: presenceIntegrationApi.connectRealTime.bind(presenceIntegrationApi),
    disconnectRealTime: presenceIntegrationApi.disconnectRealTime.bind(presenceIntegrationApi),

    syncOfflineData: presenceIntegrationApi.syncOfflineData.bind(presenceIntegrationApi),
    getSyncStatus: presenceIntegrationApi.getSyncStatus.bind(presenceIntegrationApi)
  };
};