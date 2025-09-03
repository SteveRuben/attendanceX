import { apiService } from './apiService';

export interface ReportData {
  id: string;
  name: string;
  description: string;
  type: 'performance' | 'engagement' | 'delivery' | 'custom';
  config: {
    metrics: string[];
    groupBy: string[];
    filters: any;
    dateRange: {
      start: string;
      end: string;
    };
    chartType: string;
  };
  data: {
    summary: any;
    chartData: any[];
    tableData: any[];
  };
  generatedAt: string;
  executionTime: number;
}

export interface ScheduledReport {
  id: string;
  reportId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  nextRun: string;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
  isActive: boolean;
}

class CampaignReportsService {
  private baseUrl = '/api/email-campaigns/reports';

  /**
   * Générer un rapport personnalisé
   */
  async generateReport(config: {
    name: string;
    description: string;
    metrics: string[];
    groupBy: string[];
    filters: any;
    dateRange: { start: string; end: string };
    chartType: string;
  }): Promise<ReportData> {
    const response = await apiService.post(`${this.baseUrl}/generate`, config);
    return response.data;
  }

  /**
   * Récupérer les rapports sauvegardés
   */
  async getSavedReports(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    lastRun?: string;
    runCount: number;
    isScheduled: boolean;
    scheduleFrequency?: string;
    tags: string[];
  }>> {
    const response = await apiService.get(`${this.baseUrl}/saved`);
    return response.data;
  }

  /**
   * Sauvegarder un rapport
   */
  async saveReport(config: any): Promise<{ id: string }> {
    const response = await apiService.post(`${this.baseUrl}/save`, config);
    return response.data;
  }

  /**
   * Mettre à jour un rapport sauvegardé
   */
  async updateReport(reportId: string, config: any): Promise<void> {
    await apiService.put(`${this.baseUrl}/saved/${reportId}`, config);
  }

  /**
   * Supprimer un rapport sauvegardé
   */
  async deleteReport(reportId: string): Promise<void> {
    await apiService.delete(`${this.baseUrl}/saved/${reportId}`);
  }

  /**
   * Exécuter un rapport sauvegardé
   */
  async runSavedReport(reportId: string): Promise<ReportData> {
    const response = await apiService.post(`${this.baseUrl}/saved/${reportId}/run`);
    return response.data;
  }

  /**
   * Exporter un rapport
   */
  async exportReport(
    reportId: string, 
    format: 'pdf' | 'excel' | 'csv' = 'pdf'
  ): Promise<Blob> {
    const response = await apiService.get(`${this.baseUrl}/${reportId}/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Programmer un rapport
   */
  async scheduleReport(config: {
    reportId: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    format: 'pdf' | 'excel' | 'csv';
    startDate: string;
  }): Promise<ScheduledReport> {
    const response = await apiService.post(`${this.baseUrl}/schedule`, config);
    return response.data;
  }

  /**
   * Récupérer les rapports programmés
   */
  async getScheduledReports(): Promise<ScheduledReport[]> {
    const response = await apiService.get(`${this.baseUrl}/scheduled`);
    return response.data;
  }

  /**
   * Mettre à jour un rapport programmé
   */
  async updateScheduledReport(scheduleId: string, config: Partial<ScheduledReport>): Promise<void> {
    await apiService.put(`${this.baseUrl}/scheduled/${scheduleId}`, config);
  }

  /**
   * Supprimer un rapport programmé
   */
  async deleteScheduledReport(scheduleId: string): Promise<void> {
    await apiService.delete(`${this.baseUrl}/scheduled/${scheduleId}`);
  }

  /**
   * Récupérer les templates de rapport
   */
  async getReportTemplates(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    config: any;
  }>> {
    const response = await apiService.get(`${this.baseUrl}/templates`);
    return response.data;
  }

  /**
   * Récupérer les données d'analytics pour un rapport
   */
  async getAnalyticsData(filters: {
    campaignIds?: string[];
    dateRange: { start: string; end: string };
    metrics: string[];
    groupBy: string[];
  }): Promise<{
    summary: any;
    chartData: any[];
    tableData: any[];
    insights: string[];
  }> {
    const response = await apiService.post(`${this.baseUrl}/analytics`, filters);
    return response.data;
  }

  /**
   * Comparer plusieurs campagnes
   */
  async compareCampaigns(campaignIds: string[]): Promise<{
    campaigns: any[];
    comparison: {
      metrics: any[];
      insights: string[];
      recommendations: string[];
    };
  }> {
    const response = await apiService.post(`${this.baseUrl}/compare`, { campaignIds });
    return response.data;
  }

  /**
   * Récupérer les insights automatiques
   */
  async getInsights(organizationId: string, timeRange: string = '30d'): Promise<{
    insights: Array<{
      type: 'positive' | 'negative' | 'neutral';
      title: string;
      description: string;
      metric: string;
      value: number;
      trend: number;
      recommendations: string[];
    }>;
    summary: {
      totalCampaigns: number;
      bestPerforming: any;
      worstPerforming: any;
      trends: any;
    };
  }> {
    const response = await apiService.get(`${this.baseUrl}/insights?timeRange=${timeRange}`);
    return response.data;
  }

  /**
   * Générer et télécharger un résumé exécutif
   */
  async exportExecutiveSummary(
    organizationId: string,
    timeRange: string = '30d',
    format: 'pdf' | 'excel' | 'powerpoint' = 'pdf'
  ): Promise<Blob> {
    const response = await apiService.get(
      `${this.baseUrl}/executive-summary/export?timeRange=${timeRange}&format=${format}`,
      { responseType: 'blob' }
    );
    return response.data;
  }

  /**
   * Récupérer les données du résumé exécutif
   */
  async getExecutiveSummary(organizationId: string, timeRange: string = '30d'): Promise<{
    period: { start: string; end: string; label: string };
    overview: any;
    trends: any;
    bestPerforming: any;
    worstPerforming: any;
    insights: any[];
    recommendations: any;
  }> {
    const response = await apiService.get(`${this.baseUrl}/executive-summary?timeRange=${timeRange}`);
    return response.data;
  }

  /**
   * Envoyer un rapport par email
   */
  async emailReport(
    reportId: string,
    recipients: string[],
    format: 'pdf' | 'excel' | 'csv' = 'pdf',
    message?: string
  ): Promise<void> {
    await apiService.post(`${this.baseUrl}/${reportId}/email`, {
      recipients,
      format,
      message
    });
  }

  /**
   * Créer un lien de partage pour un rapport
   */
  async createShareLink(
    reportId: string,
    expiresIn: number = 7 // jours
  ): Promise<{ shareUrl: string; expiresAt: string }> {
    const response = await apiService.post(`${this.baseUrl}/${reportId}/share`, {
      expiresIn
    });
    return response.data;
  }
}

export const campaignReportsService = new CampaignReportsService();