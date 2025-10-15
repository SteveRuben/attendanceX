/**
 * Service unifié pour les analytics et rapports
 * Remplace analyticsService.ts et organizationAnalyticsService.ts
 */

import { BaseService, type ExportOptions } from '../core/baseService';
import { apiService, type ApiResponse } from '../api';
import { EventType, EventStatus } from '../../shared';

// ==================== TYPES UNIFIÉS ====================

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface AnalyticsFilters {
  organizationId?: string;
  eventIds?: string[];
  teamIds?: string[];
  userIds?: string[];
  eventTypes?: EventType[];
  eventStatuses?: EventStatus[];
  departments?: string[];
  dateRange?: DateRange;
}

// Event Analytics
export interface EventAnalytics {
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
  averageCheckInTime: number;
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

// Organization Analytics
export interface OrganizationAnalytics {
  organizationId: string;
  organizationName: string;
  period: DateRange;

  // Métriques globales
  totalEvents: number;
  totalParticipants: number;
  totalAttendances: number;
  averageAttendanceRate: number;
  activeMembers: number;

  // Répartitions
  eventsByType: Array<{
    type: EventType;
    count: number;
    attendanceRate: number;
  }>;

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

  // Performance par département
  departmentStats: Array<{
    id: string;
    name: string;
    memberCount: number;
    attendanceRate: number;
    averageHours: number;
    eventsCreated: number;
  }>;

  // Tendances temporelles
  trends: {
    daily: Array<{ date: string; events: number; attendances: number; rate: number }>;
    weekly: Array<{ week: string; events: number; attendances: number; rate: number }>;
    monthly: Array<{ month: string; events: number; attendances: number; rate: number }>;
  };

  // Métriques d'utilisation
  usageMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    featureUsage: Array<{
      feature: string;
      usage: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    peakUsageHours: Array<{
      hour: number;
      usage: number;
    }>;
  };
}

// Team Analytics
export interface TeamAnalytics {
  teamId: string;
  teamName: string;
  period: DateRange;

  // Métriques de base
  memberCount: number;
  eventsOrganized: number;
  totalParticipants: number;
  averageAttendanceRate: number;

  // Tendances
  trends: Array<{
    date: string;
    events: number;
    participants: number;
    attendanceRate: number;
    averageEngagement: number;
  }>;

  // Performance des membres
  memberPerformance: Array<{
    userId: string;
    userName: string;
    eventsAttended: number;
    attendanceRate: number;
    punctualityRate: number;
    engagement: number;
  }>;

  // Comparaison avec autres équipes
  benchmarks: {
    attendanceRank: number;
    totalTeams: number;
    percentile: number;
    comparison: 'above' | 'average' | 'below';
  };

  // Insights
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    recommendations?: string[];
  }>;
}

// Validation Report
export interface ValidationReport {
  organizationId: string;
  period: DateRange;

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
    average: number;
    median: number;
    distribution: Array<{
      timeRange: string;
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

// Insights et Recommandations
export interface AnalyticsInsights {
  organizationId: string;
  period: DateRange;

  insights: Array<{
    id: string;
    type: 'attendance' | 'engagement' | 'performance' | 'usage';
    category: 'positive' | 'negative' | 'neutral' | 'warning';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    confidence: number; // 0-1
    data: Record<string, any>;
  }>;

  recommendations: Array<{
    id: string;
    category: 'timing' | 'engagement' | 'process' | 'technology';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: string;
    actionItems: string[];
    estimatedEffort: 'low' | 'medium' | 'high';
  }>;

  alerts: Array<{
    id: string;
    type: 'performance' | 'usage' | 'anomaly' | 'threshold';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    createdAt: Date;
    resolved: boolean;
    actions?: string[];
  }>;
}

class UnifiedAnalyticsService extends BaseService {
  protected basePath = '/api/analytics';

  // ==================== EVENT ANALYTICS ====================

  /**
   * Obtenir les analytics d'un événement
   */
  async getEventAnalytics(eventId: string): Promise<ApiResponse<EventAnalytics>> {
    try {
      return await apiService.get<EventAnalytics>(`${this.basePath}/events/${eventId}`);
    } catch (error) {
      return this.handleError(error, 'getEventAnalytics');
    }
  }

  /**
   * Comparer plusieurs événements
   */
  async compareEvents(eventIds: string[]): Promise<ApiResponse<{
    events: EventAnalytics[];
    comparison: {
      bestPerforming: string;
      averageAttendance: number;
      insights: string[];
      recommendations: string[];
    };
  }>> {
    try {
      return await apiService.post(`${this.basePath}/events/compare`, { eventIds });
    } catch (error) {
      return this.handleError(error, 'compareEvents');
    }
  }

  // ==================== ORGANIZATION ANALYTICS ====================

  /**
   * Obtenir les analytics d'une organisation
   */
  async getOrganizationAnalytics(
    organizationId: string,
    dateRange: DateRange,
    filters?: Partial<AnalyticsFilters>
  ): Promise<ApiResponse<OrganizationAnalytics>> {
    try {
      return await apiService.get<OrganizationAnalytics>(
        `${this.basePath}/organizations/${organizationId}`,
        {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          ...filters
        }
      );
    } catch (error) {
      return this.handleError(error, 'getOrganizationAnalytics');
    }
  }

  /**
   * Obtenir les statistiques en temps réel
   */
  async getRealtimeStats(organizationId: string): Promise<ApiResponse<{
    currentlyPresent: number;
    todayEvents: number;
    activeUsers: number;
    systemLoad: number;
    lastUpdated: Date;
  }>> {
    try {
      return await apiService.get(`${this.basePath}/organizations/${organizationId}/realtime`);
    } catch (error) {
      return this.handleError(error, 'getRealtimeStats');
    }
  }

  // ==================== TEAM ANALYTICS ====================

  /**
   * Obtenir les analytics d'une équipe
   */
  async getTeamAnalytics(
    organizationId: string,
    teamId: string,
    dateRange: DateRange
  ): Promise<ApiResponse<TeamAnalytics>> {
    try {
      return await apiService.get<TeamAnalytics>(
        `${this.basePath}/organizations/${organizationId}/teams/${teamId}`,
        {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString()
        }
      );
    } catch (error) {
      return this.handleError(error, 'getTeamAnalytics');
    }
  }

  /**
   * Obtenir les tendances de participation par équipe
   */
  async getTeamParticipationTrends(
    organizationId: string,
    teamIds: string[],
    dateRange: DateRange
  ): Promise<ApiResponse<Array<{
    teamId: string;
    teamName: string;
    trends: Array<{
      date: string;
      events: number;
      participants: number;
      attendanceRate: number;
      averageEngagement: number;
    }>;
    summary: {
      totalEvents: number;
      totalParticipants: number;
      averageAttendanceRate: number;
      bestMonth: string;
      improvement: number;
    };
  }>>> {
    try {
      return await apiService.post(
        `${this.basePath}/organizations/${organizationId}/team-trends`,
        {
          teamIds,
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString()
        }
      );
    } catch (error) {
      return this.handleError(error, 'getTeamParticipationTrends');
    }
  }

  // ==================== VALIDATION REPORTS ====================

  /**
   * Obtenir le rapport de validation des présences
   */
  async getValidationReport(
    organizationId: string,
    dateRange: DateRange,
    filters?: { teamIds?: string[] }
  ): Promise<ApiResponse<ValidationReport>> {
    try {
      return await apiService.get<ValidationReport>(
        `${this.basePath}/organizations/${organizationId}/validation-report`,
        {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          ...filters
        }
      );
    } catch (error) {
      return this.handleError(error, 'getValidationReport');
    }
  }

  // ==================== INSIGHTS ET RECOMMANDATIONS ====================

  /**
   * Obtenir les insights automatiques
   */
  async getInsights(
    organizationId: string,
    period: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<ApiResponse<AnalyticsInsights>> {
    try {
      return await apiService.get<AnalyticsInsights>(
        `${this.basePath}/organizations/${organizationId}/insights`,
        { period }
      );
    } catch (error) {
      return this.handleError(error, 'getInsights');
    }
  }

  /**
   * Obtenir les recommandations d'amélioration
   */
  async getRecommendations(organizationId: string): Promise<ApiResponse<{
    recommendations: Array<{
      category: string;
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
      expectedImpact: string;
      actionItems: string[];
    }>;
  }>> {
    try {
      return await apiService.get(`${this.basePath}/organizations/${organizationId}/recommendations`);
    } catch (error) {
      return this.handleError(error, 'getRecommendations');
    }
  }

  /**
   * Obtenir les alertes de performance
   */
  async getPerformanceAlerts(organizationId: string): Promise<ApiResponse<{
    alerts: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      affectedEvents?: string[];
      suggestedActions: string[];
    }>;
    summary: {
      total: number;
      critical: number;
      warning: number;
      info: number;
    };
  }>> {
    try {
      return await apiService.get(`${this.basePath}/organizations/${organizationId}/alerts`);
    } catch (error) {
      return this.handleError(error, 'getPerformanceAlerts');
    }
  }

  // ==================== BENCHMARKING ====================

  /**
   * Obtenir les données de benchmark (anonymisées)
   */
  async getBenchmarkData(organizationId: string): Promise<ApiResponse<{
    benchmarks: Array<{
      metric: string;
      yourValue: number;
      industryAverage: number;
      percentile: number;
      status: 'above' | 'average' | 'below';
    }>;
    recommendations: string[];
  }>> {
    try {
      return await apiService.get(`${this.basePath}/organizations/${organizationId}/benchmarks`);
    } catch (error) {
      return this.handleError(error, 'getBenchmarkData');
    }
  }

  // ==================== PRÉDICTIONS ====================

  /**
   * Obtenir les prédictions basées sur l'historique
   */
  async getPredictions(
    organizationId: string,
    params: {
      metric: 'attendance' | 'events' | 'growth';
      horizon: 'week' | 'month' | 'quarter';
    }
  ): Promise<ApiResponse<{
    predictions: Array<{
      date: string;
      predicted: number;
      confidence: number;
      factors: string[];
    }>;
    accuracy: number;
    methodology: string;
  }>> {
    try {
      return await apiService.get(
        `${this.basePath}/organizations/${organizationId}/predictions`,
        params
      );
    } catch (error) {
      return this.handleError(error, 'getPredictions');
    }
  }

  // ==================== EXPORT ET RAPPORTS ====================

  /**
   * Exporter les analytics
   */
  async exportAnalytics(
    organizationId: string,
    type: 'events' | 'attendance' | 'teams' | 'validation' | 'complete',
    options: ExportOptions & {
      dateRange: DateRange;
      filters?: AnalyticsFilters;
    }
  ): Promise<void> {
    try {
      const exportData = {
        ...options,
        dateRange: {
          startDate: options.dateRange.startDate.toISOString(),
          endDate: options.dateRange.endDate.toISOString()
        }
      };

      const blob = await apiService.post(
        `${this.basePath}/organizations/${organizationId}/export/${type}`,
        exportData
      );

      const filename = `analytics-${type}-${organizationId}-${new Date().toISOString().split('T')[0]}.${options.format}`;
      this.downloadFile(blob.data, filename);
    } catch (error) {
      return this.handleError(error, 'exportAnalytics');
    }
  }

  /**
   * Générer un rapport exécutif
   */
  async generateExecutiveReport(
    organizationId: string,
    options: {
      period: DateRange;
      format: 'pdf' | 'excel';
      sections: string[];
      language?: 'fr' | 'en';
    }
  ): Promise<void> {
    try {
      const blob = await apiService.post(
        `${this.basePath}/organizations/${organizationId}/executive-report`,
        {
          ...options,
          period: {
            startDate: options.period.startDate.toISOString(),
            endDate: options.period.endDate.toISOString()
          }
        }
      );

      const filename = `executive-report-${organizationId}-${new Date().toISOString().split('T')[0]}.${options.format}`;
      this.downloadFile(blob.data, filename);
    } catch (error) {
      return this.handleError(error, 'generateExecutiveReport');
    }
  }

  // ==================== CONFIGURATION ====================

  /**
   * Configurer les seuils d'alerte
   */
  async configureAlerts(
    organizationId: string,
    config: {
      attendanceThreshold: number;
      usageThreshold: number;
      performanceThreshold: number;
      enableEmailAlerts: boolean;
      alertRecipients: string[];
    }
  ): Promise<ApiResponse<void>> {
    try {
      return await apiService.put(`${this.basePath}/organizations/${organizationId}/alert-config`, config);
    } catch (error) {
      return this.handleError(error, 'configureAlerts');
    }
  }

  /**
   * Obtenir la configuration des analytics
   */
  async getAnalyticsConfig(organizationId: string): Promise<ApiResponse<{
    alertThresholds: Record<string, number>;
    reportSchedules: Array<{
      id: string;
      name: string;
      frequency: string;
      recipients: string[];
    }>;
    dataRetention: {
      rawData: number; // days
      aggregatedData: number; // days
      reports: number; // days
    };
  }>> {
    try {
      return await apiService.get(`${this.basePath}/organizations/${organizationId}/config`);
    } catch (error) {
      return this.handleError(error, 'getAnalyticsConfig');
    }
  }
}

export const analyticsService = new UnifiedAnalyticsService();