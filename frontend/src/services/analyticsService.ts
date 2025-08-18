/**
 * Service pour les analytics et rapports
 */

import { apiService } from './apiService';
import { EventType, EventStatus, AttendanceStatus } from '@attendance-x/shared';

export interface EventAnalyticsData {
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  eventStatus: EventStatus;
  startDateTime: Date;
  endDateTime: Date;
  
  // Métriques de base
  totalInvited: number;
  totalConfirmed: number;
  totalAttended: number;
  totalAbsent: number;
  totalLate: number;
  
  // Taux calculés
  attendanceRate: number;
  confirmationRate: number;
  punctualityRate: number;
  
  // Métriques temporelles
  averageCheckInTime: number; // minutes après l'heure de début
  peakCheckInHour: number;
  
  // Répartition par équipe
  teamBreakdown: Array<{
    teamId: string;
    teamName: string;
    invited: number;
    attended: number;
    attendanceRate: number;
  }>;
  
  // Tendances horaires
  hourlyAttendance: Array<{
    hour: number;
    checkIns: number;
    cumulative: number;
  }>;
}

export interface OrganizationAnalytics {
  organizationId: string;
  organizationName: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  
  // Métriques globales
  totalEvents: number;
  totalParticipants: number;
  totalAttendances: number;
  averageAttendanceRate: number;
  
  // Répartition par type d'événement
  eventsByType: Array<{
    type: EventType;
    count: number;
    attendanceRate: number;
  }>;
  
  // Répartition par statut
  eventsByStatus: Array<{
    status: EventStatus;
    count: number;
    percentage: number;
  }>;
  
  // Performance par équipe
  teamPerformance: Array<{
    teamId: string;
    teamName: string;
    eventsOrganized: number;
    totalParticipants: number;
    averageAttendanceRate: number;
    topPerformers: Array<{
      userId: string;
      userName: string;
      attendanceRate: number;
    }>;
  }>;
  
  // Tendances temporelles
  trends: {
    daily: Array<{
      date: string;
      events: number;
      attendances: number;
      rate: number;
    }>;
    weekly: Array<{
      week: string;
      events: number;
      attendances: number;
      rate: number;
    }>;
    monthly: Array<{
      month: string;
      events: number;
      attendances: number;
      rate: number;
    }>;
  };
}

export interface AttendanceValidationReport {
  organizationId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  
  // Métriques de validation
  totalValidations: number;
  validatedByTeam: Array<{
    teamId: string;
    teamName: string;
    validations: number;
    validators: Array<{
      userId: string;
      userName: string;
      validationCount: number;
    }>;
  }>;
  
  // Méthodes de validation
  validationMethods: Array<{
    method: 'qr_code' | 'manual' | 'geolocation' | 'bulk';
    count: number;
    percentage: number;
  }>;
  
  // Temps de validation
  validationTimes: {
    average: number; // minutes
    median: number;
    distribution: Array<{
      timeRange: string; // "0-5min", "5-15min", etc.
      count: number;
    }>;
  };
  
  // Problèmes identifiés
  issues: Array<{
    type: 'late_validation' | 'missing_validation' | 'duplicate_validation';
    count: number;
    events: Array<{
      eventId: string;
      eventTitle: string;
      issueDetails: string;
    }>;
  }>;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  includeCharts: boolean;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  filters?: {
    eventTypes?: EventType[];
    teams?: string[];
    statuses?: EventStatus[];
  };
}

class AnalyticsService {
  private readonly basePath = '/api/analytics';

  /**
   * Obtenir les analytics d'un événement spécifique
   */
  async getEventAnalytics(eventId: string): Promise<EventAnalyticsData> {
    const response = await apiService.get<EventAnalyticsData>(`${this.basePath}/events/${eventId}`);
    return response.data;
  }

  /**
   * Obtenir les analytics d'une organisation
   */
  async getOrganizationAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OrganizationAnalytics> {
    const response = await apiService.get<OrganizationAnalytics>(
      `${this.basePath}/organizations/${organizationId}`,
      {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      }
    );
    return response.data;
  }

  /**
   * Obtenir le rapport de validation des présences
   */
  async getAttendanceValidationReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AttendanceValidationReport> {
    const response = await apiService.get<AttendanceValidationReport>(
      `${this.basePath}/organizations/${organizationId}/attendance-validation`,
      {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      }
    );
    return response.data;
  }

  /**
   * Obtenir les métriques temps réel d'un événement
   */
  async getRealtimeEventMetrics(eventId: string) {
    const response = await apiService.get(`${this.basePath}/events/${eventId}/realtime`);
    return response.data;
  }

  /**
   * Comparer plusieurs événements
   */
  async compareEvents(eventIds: string[]) {
    const response = await apiService.post(`${this.basePath}/events/compare`, {
      eventIds
    });
    return response.data;
  }

  /**
   * Obtenir les tendances de participation par équipe
   */
  async getTeamParticipationTrends(
    organizationId: string,
    teamIds: string[],
    startDate: Date,
    endDate: Date
  ) {
    const response = await apiService.post(
      `${this.basePath}/organizations/${organizationId}/team-trends`,
      {
        teamIds,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    );
    return response.data;
  }

  /**
   * Exporter les données d'analytics
   */
  async exportAnalytics(
    organizationId: string,
    type: 'events' | 'attendance' | 'teams' | 'validation',
    options: ExportOptions
  ): Promise<Blob> {
    const response = await apiService.post(
      `${this.basePath}/organizations/${organizationId}/export/${type}`,
      options,
      {
        responseType: 'blob'
      }
    );
    return response.data;
  }

  /**
   * Obtenir les insights automatiques
   */
  async getInsights(organizationId: string, period: 'week' | 'month' | 'quarter') {
    const response = await apiService.get(
      `${this.basePath}/organizations/${organizationId}/insights`,
      {
        params: { period }
      }
    );
    return response.data;
  }

  /**
   * Obtenir les recommandations d'amélioration
   */
  async getRecommendations(organizationId: string) {
    const response = await apiService.get(
      `${this.basePath}/organizations/${organizationId}/recommendations`
    );
    return response.data;
  }

  /**
   * Obtenir les alertes de performance
   */
  async getPerformanceAlerts(organizationId: string) {
    const response = await apiService.get(
      `${this.basePath}/organizations/${organizationId}/alerts`
    );
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();