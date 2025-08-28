/**
 * Service API pour la gestion des rapports de présence
 */

import { apiService } from '../apiService';

// Types locaux pour les rapports
interface PresenceReport {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  period: {
    startDate: Date;
    endDate: Date;
  };
  createdAt: Date;
  createdBy: string;
}

interface ReportFilter {
  startDate: Date;
  endDate: Date;
  employeeIds?: string[];
  departments?: string[];
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
}

interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  filters: ReportFilter;
  organizationId: string;
  createdAt: Date;
}

interface ReportSchedule {
  id: string;
  name: string;
  templateId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  organizationId: string;
  createdAt: Date;
}

export const presenceReportsApi = {
  // Obtenir tous les rapports
  async getReports(organizationId: string): Promise<PresenceReport[]> {
    const response = await apiService.get(`/organizations/${organizationId}/presence/reports`);
    return response.data;
  },

  // Obtenir un rapport spécifique
  async getReport(organizationId: string, reportId: string): Promise<PresenceReport> {
    const response = await apiService.get(`/organizations/${organizationId}/presence/reports/${reportId}`);
    return response.data;
  },

  // Générer un nouveau rapport
  async generateReport(organizationId: string, filter: ReportFilter & { createdBy: string }): Promise<PresenceReport> {
    const response = await apiService.post(`/organizations/${organizationId}/presence/reports/generate`, filter);
    return response.data;
  },

  // Exporter un rapport
  async exportReport(organizationId: string, reportId: string, format: string): Promise<Blob> {
    const response = await apiService.get(
      `/organizations/${organizationId}/presence/reports/${reportId}/export`,
      {
        params: { format },
        responseType: 'blob'
      }
    );
    return response.data;
  },

  // Supprimer un rapport
  async deleteReport(organizationId: string, reportId: string): Promise<void> {
    await apiService.delete(`/organizations/${organizationId}/presence/reports/${reportId}`);
  },

  // Modèles de rapports
  async getReportTemplates(organizationId: string): Promise<ReportTemplate[]> {
    const response = await apiService.get(`/organizations/${organizationId}/presence/report-templates`);
    return response.data;
  },

  // Sauvegarder un modèle de rapport
  async saveReportTemplate(organizationId: string, template: Omit<ReportTemplate, 'id' | 'createdAt'>): Promise<ReportTemplate> {
    const response = await apiService.post(`/organizations/${organizationId}/presence/report-templates`, template);
    return response.data;
  },

  // Mettre à jour un modèle de rapport
  async updateReportTemplate(organizationId: string, templateId: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const response = await apiService.put(`/organizations/${organizationId}/presence/report-templates/${templateId}`, updates);
    return response.data;
  },

  // Supprimer un modèle de rapport
  async deleteReportTemplate(organizationId: string, templateId: string): Promise<void> {
    await apiService.delete(`/organizations/${organizationId}/presence/report-templates/${templateId}`);
  },

  // Rapports programmés
  async getScheduledReports(organizationId: string): Promise<ReportSchedule[]> {
    const response = await apiService.get(`/organizations/${organizationId}/presence/scheduled-reports`);
    return response.data;
  },

  // Programmer un rapport
  async scheduleReport(organizationId: string, schedule: Omit<ReportSchedule, 'id' | 'createdAt'>): Promise<ReportSchedule> {
    const response = await apiService.post(`/organizations/${organizationId}/presence/scheduled-reports`, schedule);
    return response.data;
  },

  // Mettre à jour un rapport programmé
  async updateScheduledReport(organizationId: string, scheduleId: string, updates: Partial<ReportSchedule>): Promise<ReportSchedule> {
    const response = await apiService.put(`/organizations/${organizationId}/presence/scheduled-reports/${scheduleId}`, updates);
    return response.data;
  },

  // Supprimer un rapport programmé
  async deleteScheduledReport(organizationId: string, scheduleId: string): Promise<void> {
    await apiService.delete(`/organizations/${organizationId}/presence/scheduled-reports/${scheduleId}`);
  },

  // Exécuter manuellement un rapport programmé
  async executeScheduledReport(organizationId: string, scheduleId: string): Promise<PresenceReport> {
    const response = await apiService.post(`/organizations/${organizationId}/presence/scheduled-reports/${scheduleId}/execute`);
    return response.data;
  },

  // Obtenir les statistiques de rapports
  async getReportStats(organizationId: string, period?: string): Promise<{
    totalReports: number;
    reportsThisMonth: number;
    reportsThisWeek: number;
    averageGenerationTime: number;
    mostUsedReportType: string;
    exportsByFormat: Record<string, number>;
  }> {
    const response = await apiService.get(`/organizations/${organizationId}/presence/reports/stats`, {
      params: { period }
    });
    return response.data;
  },

  // Obtenir l'aperçu d'un rapport avant génération
  async previewReport(organizationId: string, filter: ReportFilter): Promise<{
    estimatedRows: number;
    estimatedSize: string;
    estimatedGenerationTime: number;
    dataAvailability: {
      hasPresenceData: boolean;
      hasLeaveData: boolean;
      hasScheduleData: boolean;
      dateRange: {
        earliest: string;
        latest: string;
      };
    };
  }> {
    const response = await apiService.post(`/organizations/${organizationId}/presence/reports/preview`, filter);
    return response.data;
  },

  // Dupliquer un rapport existant
  async duplicateReport(organizationId: string, reportId: string, newFilter?: Partial<ReportFilter>): Promise<PresenceReport> {
    const response = await apiService.post(`/organizations/${organizationId}/presence/reports/${reportId}/duplicate`, newFilter);
    return response.data;
  },

  // Partager un rapport
  async shareReport(organizationId: string, reportId: string, shareConfig: {
    recipients: string[];
    message?: string;
    expiresAt?: string;
    allowDownload?: boolean;
  }): Promise<{
    shareId: string;
    shareUrl: string;
    expiresAt: string;
  }> {
    const response = await apiService.post(`/organizations/${organizationId}/presence/reports/${reportId}/share`, shareConfig);
    return response.data;
  },

  // Obtenir un rapport partagé
  async getSharedReport(shareId: string): Promise<PresenceReport> {
    const response = await apiService.get(`/shared/presence/reports/${shareId}`);
    return response.data;
  }
};