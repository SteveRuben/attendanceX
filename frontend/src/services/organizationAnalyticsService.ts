/**
 * Service pour les analytics d'organisation
 */

import { apiService } from './apiService';

// Types locaux pour les analytics d'organisation
export interface OrganizationStats {
  totalMembers: number;
  activeMembers: number;
  totalEvents: number;
  totalAppointments: number;
  attendanceRate: number;
  averagePresenceHours: number;
  departmentStats: {
    name: string;
    memberCount: number;
    attendanceRate: number;
    averageHours: number;
  }[];
  monthlyTrends: {
    month: string;
    attendance: number;
    events: number;
    appointments: number;
  }[];
}

export interface ActivityEntry {
  id: string;
  type: 'user_joined' | 'event_created' | 'appointment_booked' | 'presence_marked' | 'report_generated';
  description: string;
  userId: string;
  userName: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UsageMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  featureUsage: {
    feature: string;
    usage: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  peakUsageHours: {
    hour: number;
    usage: number;
  }[];
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  uptime: number;
  errorRate: number;
  apiCallsPerDay: number;
  storageUsed: number;
  storageLimit: number;
}

class OrganizationAnalyticsService {
  private readonly basePath = '/api/organizations';

  /**
   * Obtenir les statistiques d'une organisation
   */
  async getOrganizationStats(organizationId: string, timeframe?: {
    startDate: string;
    endDate: string;
  }) {
    const params = timeframe ? {
      startDate: timeframe.startDate,
      endDate: timeframe.endDate
    } : {};

    return apiService.get<OrganizationStats>(`${this.basePath}/${organizationId}/stats`, {
      params
    });
  }

  /**
   * Obtenir l'activité récente de l'organisation
   */
  async getRecentActivity(organizationId: string, params?: {
    limit?: number;
    offset?: number;
    type?: string;
    userId?: string;
  }) {
    return apiService.get<{
      data: ActivityEntry[];
      total: number;
      hasMore: boolean;
    }>(`${this.basePath}/${organizationId}/activity`, { params });
  }

  /**
   * Obtenir les métriques d'utilisation
   */
  async getUsageMetrics(organizationId: string, timeframe?: {
    startDate: string;
    endDate: string;
  }) {
    const params = timeframe ? {
      startDate: timeframe.startDate,
      endDate: timeframe.endDate
    } : {};

    return apiService.get<UsageMetrics>(`${this.basePath}/${organizationId}/usage-metrics`, {
      params
    });
  }

  /**
   * Obtenir les métriques de performance
   */
  async getPerformanceMetrics(organizationId: string) {
    return apiService.get<PerformanceMetrics>(`${this.basePath}/${organizationId}/performance-metrics`);
  }

  /**
   * Obtenir les statistiques par département
   */
  async getDepartmentStats(organizationId: string, timeframe?: {
    startDate: string;
    endDate: string;
  }) {
    const params = timeframe ? {
      startDate: timeframe.startDate,
      endDate: timeframe.endDate
    } : {};

    return apiService.get<{
      departments: {
        id: string;
        name: string;
        memberCount: number;
        attendanceRate: number;
        averageHours: number;
        eventsCreated: number;
        appointmentsBooked: number;
      }[];
    }>(`${this.basePath}/${organizationId}/department-stats`, { params });
  }

  /**
   * Obtenir les tendances temporelles
   */
  async getTimeTrends(organizationId: string, params: {
    metric: 'attendance' | 'events' | 'appointments' | 'users';
    period: 'daily' | 'weekly' | 'monthly';
    startDate: string;
    endDate: string;
  }) {
    return apiService.get<{
      trends: {
        date: string;
        value: number;
        change: number;
      }[];
    }>(`${this.basePath}/${organizationId}/trends`, { params });
  }

  /**
   * Obtenir le rapport de santé de l'organisation
   */
  async getHealthReport(organizationId: string) {
    return apiService.get<{
      overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
      score: number;
      factors: {
        name: string;
        score: number;
        status: 'good' | 'warning' | 'critical';
        description: string;
        recommendations?: string[];
      }[];
      recommendations: string[];
    }>(`${this.basePath}/${organizationId}/health-report`);
  }

  /**
   * Obtenir les insights automatiques
   */
  async getInsights(organizationId: string) {
    return apiService.get<{
      insights: {
        id: string;
        type: 'positive' | 'negative' | 'neutral';
        title: string;
        description: string;
        impact: 'low' | 'medium' | 'high';
        actionable: boolean;
        actions?: string[];
      }[];
    }>(`${this.basePath}/${organizationId}/insights`);
  }

  /**
   * Comparer avec des organisations similaires (anonymisé)
   */
  async getBenchmarkData(organizationId: string) {
    return apiService.get<{
      benchmarks: {
        metric: string;
        yourValue: number;
        industryAverage: number;
        percentile: number;
        status: 'above' | 'average' | 'below';
      }[];
      recommendations: string[];
    }>(`${this.basePath}/${organizationId}/benchmarks`);
  }

  /**
   * Exporter les analytics
   */
  async exportAnalytics(organizationId: string, params: {
    format: 'csv' | 'excel' | 'pdf';
    sections: string[];
    timeframe?: {
      startDate: string;
      endDate: string;
    };
  }) {
    const response = await apiService.post(`${this.basePath}/${organizationId}/export-analytics`, params, {
      responseType: 'blob'
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `organization-analytics.${params.format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return response;
  }

  /**
   * Obtenir les statistiques en temps réel
   */
  async getRealTimeStats(organizationId: string) {
    return apiService.get<{
      currentlyPresent: number;
      todayEvents: number;
      todayAppointments: number;
      activeUsers: number;
      systemLoad: number;
      lastUpdated: Date;
    }>(`${this.basePath}/${organizationId}/realtime-stats`);
  }

  /**
   * Obtenir les prédictions basées sur l'historique
   */
  async getPredictions(organizationId: string, params: {
    metric: 'attendance' | 'events' | 'growth';
    horizon: 'week' | 'month' | 'quarter';
  }) {
    return apiService.get<{
      predictions: {
        date: string;
        predicted: number;
        confidence: number;
        factors: string[];
      }[];
      accuracy: number;
      methodology: string;
    }>(`${this.basePath}/${organizationId}/predictions`, { params });
  }

  /**
   * Obtenir les alertes et notifications analytics
   */
  async getAnalyticsAlerts(organizationId: string) {
    return apiService.get<{
      alerts: {
        id: string;
        type: 'performance' | 'usage' | 'anomaly' | 'threshold';
        severity: 'low' | 'medium' | 'high';
        title: string;
        description: string;
        createdAt: Date;
        resolved: boolean;
        actions?: string[];
      }[];
    }>(`${this.basePath}/${organizationId}/analytics-alerts`);
  }

  /**
   * Configurer des seuils d'alerte
   */
  async configureAlerts(organizationId: string, config: {
    attendanceThreshold: number;
    usageThreshold: number;
    performanceThreshold: number;
    enableEmailAlerts: boolean;
    alertRecipients: string[];
  }) {
    return apiService.put(`${this.basePath}/${organizationId}/alert-config`, config);
  }

  /**
   * Obtenir le tableau de bord exécutif
   */
  async getExecutiveDashboard(organizationId: string) {
    return apiService.get<{
      kpis: {
        name: string;
        value: number;
        target: number;
        trend: 'up' | 'down' | 'stable';
        change: number;
        status: 'good' | 'warning' | 'critical';
      }[];
      highlights: string[];
      concerns: string[];
      recommendations: string[];
    }>(`${this.basePath}/${organizationId}/executive-dashboard`);
  }
}

export const organizationAnalyticsService = new OrganizationAnalyticsService();