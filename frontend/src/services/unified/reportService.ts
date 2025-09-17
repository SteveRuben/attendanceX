/**
 * Service unifié pour la génération de rapports et exports
 * Centralise toutes les fonctionnalités de reporting
 */

import { BaseService, type ExportOptions } from '../core/baseService';
import { apiService, type ApiResponse } from '../api';
import { EventType, EventStatus } from '../../shared';

// ==================== TYPES UNIFIÉS ====================

export type ReportType = 
  | 'attendance_summary'
  | 'event_analytics'
  | 'user_performance'
  | 'team_performance'
  | 'organization_overview'
  | 'validation_report'
  | 'monthly_summary'
  | 'executive_dashboard'
  | 'custom';

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';

export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

export interface Report {
  id: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  title: string;
  description?: string;
  organizationId: string;
  
  // Configuration
  filters: Record<string, any>;
  options: {
    includeCharts?: boolean;
    includeInsights?: boolean;
    language?: 'fr' | 'en';
    template?: string;
    customSections?: string[];
  };
  
  // Métadonnées
  generatedBy: string;
  generatedAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  
  // Résultats
  downloadUrl?: string;
  fileSize?: number;
  pageCount?: number;
  
  // Erreurs
  error?: string;
  warnings?: string[];
  
  // Statistiques
  processingTime?: number;
  dataPoints?: number;
}

export interface ReportFilters {
  // Temporel
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  
  // Entités
  eventIds?: string[];
  userIds?: string[];
  teamIds?: string[];
  departmentIds?: string[];
  
  // Critères
  eventTypes?: EventType[];
  eventStatuses?: EventStatus[];
  attendanceStatuses?: string[];
  
  // Autres
  includeArchived?: boolean;
  minAttendanceRate?: number;
  maxAttendanceRate?: number;
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  category: 'standard' | 'custom' | 'executive';
  
  // Configuration
  defaultFilters: ReportFilters;
  defaultOptions: Record<string, any>;
  
  // Structure
  sections: Array<{
    id: string;
    name: string;
    type: 'chart' | 'table' | 'text' | 'metrics';
    required: boolean;
    configurable: boolean;
  }>;
  
  // Variables
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'select';
    required: boolean;
    description: string;
    options?: string[];
    defaultValue?: any;
  }>;
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublic: boolean;
  usageCount: number;
}

export interface ScheduledReport {
  id: string;
  name: string;
  description?: string;
  
  // Configuration du rapport
  type: ReportType;
  format: ReportFormat;
  templateId?: string;
  filters: ReportFilters;
  options: Record<string, any>;
  
  // Planification
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number; // 0-6 pour weekly
    dayOfMonth?: number; // 1-31 pour monthly
    time: string; // HH:mm format
    timezone: string;
  };
  
  // Distribution
  recipients: Array<{
    email: string;
    name?: string;
    role?: string;
  }>;
  
  // État
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
  lastStatus?: ReportStatus;
  lastError?: string;
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  organizationId: string;
}

export interface ReportStats {
  // Globales
  totalReports: number;
  reportsThisMonth: number;
  
  // Par statut
  byStatus: Record<ReportStatus, number>;
  
  // Par type
  byType: Record<ReportType, number>;
  
  // Par format
  byFormat: Record<ReportFormat, number>;
  
  // Performance
  averageGenerationTime: number;
  totalFileSize: number;
  successRate: number;
  
  // Tendances
  trends: Array<{
    date: string;
    generated: number;
    completed: number;
    failed: number;
  }>;
  
  // Top utilisateurs
  topGenerators: Array<{
    userId: string;
    userName: string;
    reportCount: number;
  }>;
}

class UnifiedReportService extends BaseService {
  protected basePath = '/api/reports';

  // ==================== GÉNÉRATION DE RAPPORTS ====================

  /**
   * Générer un rapport
   */
  async generateReport(
    type: ReportType,
    filters: ReportFilters,
    options: {
      format?: ReportFormat;
      includeCharts?: boolean;
      includeInsights?: boolean;
      language?: 'fr' | 'en';
      template?: string;
      title?: string;
      description?: string;
    } = {}
  ): Promise<ApiResponse<Report>> {
    try {
      const payload = {
        type,
        filters: this.serializeDateFilters(filters),
        options: {
          format: 'pdf',
          includeCharts: true,
          includeInsights: true,
          language: 'fr',
          ...options
        }
      };

      return await apiService.post<Report>(`${this.basePath}/generate`, payload);
    } catch (error) {
      return this.handleError(error, 'generateReport');
    }
  }

  /**
   * Prévisualiser un rapport avant génération
   */
  async previewReport(
    type: ReportType,
    filters: ReportFilters,
    options: Record<string, any> = {}
  ): Promise<ApiResponse<{
    preview: {
      sections: Array<{
        name: string;
        type: string;
        dataPoints: number;
        estimatedSize: string;
      }>;
      estimatedPages: number;
      estimatedGenerationTime: number;
      dataAvailability: Record<string, boolean>;
    };
    warnings: string[];
  }>> {
    try {
      return await apiService.post(`${this.basePath}/preview`, {
        type,
        filters: this.serializeDateFilters(filters),
        options
      });
    } catch (error) {
      return this.handleError(error, 'previewReport');
    }
  }

  // ==================== GESTION DES RAPPORTS ====================

  /**
   * Obtenir la liste des rapports
   */
  async getReports(filters: {
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'type' | 'status' | 'title';
    sortOrder?: 'asc' | 'desc';
    type?: ReportType;
    status?: ReportStatus;
    generatedBy?: string;
    startDate?: Date;
    endDate?: Date;
    format?: ReportFormat;
  } = {}): Promise<ApiResponse<{
    reports: Report[];
    total: number;
    page: number;
    limit: number;
  }>> {
    try {
      const params = {
        ...filters,
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString()
      };

      return await apiService.get(`${this.basePath}`, { params });
    } catch (error) {
      return this.handleError(error, 'getReports');
    }
  }

  /**
   * Obtenir un rapport par ID
   */
  async getReportById(id: string): Promise<ApiResponse<Report>> {
    try {
      return await this.getItemById<Report>('', id);
    } catch (error) {
      return this.handleError(error, 'getReportById');
    }
  }

  /**
   * Télécharger un rapport
   */
  async downloadReport(id: string): Promise<void> {
    try {
      const response = await apiService.get(`${this.basePath}/${id}/download`, {
        responseType: 'blob'
      });

      // Obtenir les informations du rapport pour le nom de fichier
      const reportResponse = await this.getReportById(id);
      if (reportResponse.success && reportResponse.data) {
        const report = reportResponse.data;
        const filename = `${report.title || 'report'}-${report.id}.${report.format}`;
        this.downloadFile(response.data, filename);
      } else {
        const filename = `report-${id}.pdf`;
        this.downloadFile(response.data, filename);
      }
    } catch (error) {
      return this.handleError(error, 'downloadReport');
    }
  }

  /**
   * Supprimer un rapport
   */
  async deleteReport(id: string): Promise<ApiResponse<void>> {
    try {
      return await this.deleteItem('', id);
    } catch (error) {
      return this.handleError(error, 'deleteReport');
    }
  }

  /**
   * Dupliquer un rapport
   */
  async duplicateReport(
    id: string,
    modifications?: {
      title?: string;
      filters?: Partial<ReportFilters>;
      options?: Record<string, any>;
    }
  ): Promise<ApiResponse<Report>> {
    try {
      return await apiService.post<Report>(`${this.basePath}/${id}/duplicate`, modifications);
    } catch (error) {
      return this.handleError(error, 'duplicateReport');
    }
  }

  // ==================== RAPPORTS RAPIDES ====================

  /**
   * Générer un rapport de présence pour un événement
   */
  async generateAttendanceReport(
    eventId: string,
    options: {
      format?: ReportFormat;
      includeCharts?: boolean;
      includeParticipantList?: boolean;
      includeStatistics?: boolean;
    } = {}
  ): Promise<ApiResponse<Report>> {
    try {
      return await apiService.post<Report>(`${this.basePath}/quick/attendance/${eventId}`, options);
    } catch (error) {
      return this.handleError(error, 'generateAttendanceReport');
    }
  }

  /**
   * Générer un rapport utilisateur
   */
  async generateUserReport(
    userId: string,
    options: {
      format?: ReportFormat;
      dateRange?: { startDate: Date; endDate: Date };
      includePatterns?: boolean;
      includeRecommendations?: boolean;
    } = {}
  ): Promise<ApiResponse<Report>> {
    try {
      const payload = {
        ...options,
        dateRange: options.dateRange ? {
          startDate: options.dateRange.startDate.toISOString(),
          endDate: options.dateRange.endDate.toISOString()
        } : undefined
      };

      return await apiService.post<Report>(`${this.basePath}/quick/user/${userId}`, payload);
    } catch (error) {
      return this.handleError(error, 'generateUserReport');
    }
  }

  /**
   * Générer un rapport d'équipe
   */
  async generateTeamReport(
    teamId: string,
    options: {
      format?: ReportFormat;
      dateRange?: { startDate: Date; endDate: Date };
      includeComparison?: boolean;
      includeMemberDetails?: boolean;
    } = {}
  ): Promise<ApiResponse<Report>> {
    try {
      const payload = {
        ...options,
        dateRange: options.dateRange ? {
          startDate: options.dateRange.startDate.toISOString(),
          endDate: options.dateRange.endDate.toISOString()
        } : undefined
      };

      return await apiService.post<Report>(`${this.basePath}/quick/team/${teamId}`, payload);
    } catch (error) {
      return this.handleError(error, 'generateTeamReport');
    }
  }

  /**
   * Générer un résumé mensuel
   */
  async generateMonthlySummary(
    organizationId: string,
    options: {
      month: number;
      year: number;
      format?: ReportFormat;
      includeComparisons?: boolean;
      includeRecommendations?: boolean;
    }
  ): Promise<ApiResponse<Report>> {
    try {
      return await apiService.post<Report>(`${this.basePath}/quick/monthly-summary/${organizationId}`, options);
    } catch (error) {
      return this.handleError(error, 'generateMonthlySummary');
    }
  }

  // ==================== TEMPLATES ====================

  /**
   * Obtenir les templates de rapports
   */
  async getReportTemplates(filters: {
    type?: ReportType;
    category?: 'standard' | 'custom' | 'executive';
    isPublic?: boolean;
  } = {}): Promise<ApiResponse<ReportTemplate[]>> {
    try {
      return await apiService.get<ReportTemplate[]>(`${this.basePath}/templates`, { params: filters });
    } catch (error) {
      return this.handleError(error, 'getReportTemplates');
    }
  }

  /**
   * Obtenir un template par ID
   */
  async getReportTemplate(id: string): Promise<ApiResponse<ReportTemplate>> {
    try {
      return await apiService.get<ReportTemplate>(`${this.basePath}/templates/${id}`);
    } catch (error) {
      return this.handleError(error, 'getReportTemplate');
    }
  }

  /**
   * Créer un template personnalisé
   */
  async createReportTemplate(
    template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'usageCount'>
  ): Promise<ApiResponse<ReportTemplate>> {
    try {
      return await apiService.post<ReportTemplate>(`${this.basePath}/templates`, template);
    } catch (error) {
      return this.handleError(error, 'createReportTemplate');
    }
  }

  // ==================== RAPPORTS PLANIFIÉS ====================

  /**
   * Créer un rapport planifié
   */
  async scheduleReport(
    data: Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'organizationId' | 'nextRun'>
  ): Promise<ApiResponse<ScheduledReport>> {
    try {
      const payload = {
        ...data,
        filters: this.serializeDateFilters(data.filters)
      };

      return await apiService.post<ScheduledReport>(`${this.basePath}/scheduled`, payload);
    } catch (error) {
      return this.handleError(error, 'scheduleReport');
    }
  }

  /**
   * Obtenir les rapports planifiés
   */
  async getScheduledReports(): Promise<ApiResponse<ScheduledReport[]>> {
    try {
      return await apiService.get<ScheduledReport[]>(`${this.basePath}/scheduled`);
    } catch (error) {
      return this.handleError(error, 'getScheduledReports');
    }
  }

  /**
   * Mettre à jour un rapport planifié
   */
  async updateScheduledReport(
    id: string,
    updates: Partial<Omit<ScheduledReport, 'id' | 'createdAt' | 'createdBy' | 'organizationId'>>
  ): Promise<ApiResponse<ScheduledReport>> {
    try {
      const payload = updates.filters ? {
        ...updates,
        filters: this.serializeDateFilters(updates.filters)
      } : updates;

      return await apiService.put<ScheduledReport>(`${this.basePath}/scheduled/${id}`, payload);
    } catch (error) {
      return this.handleError(error, 'updateScheduledReport');
    }
  }

  /**
   * Supprimer un rapport planifié
   */
  async deleteScheduledReport(id: string): Promise<ApiResponse<void>> {
    try {
      return await apiService.delete(`${this.basePath}/scheduled/${id}`);
    } catch (error) {
      return this.handleError(error, 'deleteScheduledReport');
    }
  }

  /**
   * Exécuter manuellement un rapport planifié
   */
  async runScheduledReport(id: string): Promise<ApiResponse<Report>> {
    try {
      return await apiService.post<Report>(`${this.basePath}/scheduled/${id}/run`);
    } catch (error) {
      return this.handleError(error, 'runScheduledReport');
    }
  }

  // ==================== STATISTIQUES ====================

  /**
   * Obtenir les statistiques des rapports
   */
  async getReportStats(filters: {
    startDate?: Date;
    endDate?: Date;
    generatedBy?: string;
  } = {}): Promise<ApiResponse<ReportStats>> {
    try {
      const params = {
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString(),
        generatedBy: filters.generatedBy
      };

      return await apiService.get<ReportStats>(`${this.basePath}/stats`, { params });
    } catch (error) {
      return this.handleError(error, 'getReportStats');
    }
  }

  // ==================== MAINTENANCE ====================

  /**
   * Nettoyer les rapports expirés
   */
  async cleanupExpiredReports(): Promise<ApiResponse<{
    deleted: number;
    freed: number; // bytes
  }>> {
    try {
      return await apiService.post(`${this.basePath}/cleanup-expired`);
    } catch (error) {
      return this.handleError(error, 'cleanupExpiredReports');
    }
  }

  /**
   * Obtenir l'état du système de rapports
   */
  async getSystemHealth(): Promise<ApiResponse<{
    status: 'healthy' | 'degraded' | 'down';
    queueSize: number;
    averageProcessingTime: number;
    diskUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    activeGenerations: number;
    errors: Array<{
      type: string;
      count: number;
      lastOccurrence: Date;
    }>;
  }>> {
    try {
      return await apiService.get(`${this.basePath}/system/health`);
    } catch (error) {
      return this.handleError(error, 'getSystemHealth');
    }
  }

  // ==================== UTILITAIRES PRIVÉES ====================

  /**
   * Sérialiser les filtres de date pour l'API
   */
  private serializeDateFilters(filters: ReportFilters): any {
    return {
      ...filters,
      dateRange: filters.dateRange ? {
        startDate: filters.dateRange.startDate.toISOString(),
        endDate: filters.dateRange.endDate.toISOString()
      } : undefined
    };
  }
}

export const reportService = new UnifiedReportService();