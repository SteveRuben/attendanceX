import { apiService } from './api';
import { Campaign, CampaignFilters } from '@/components/campaigns/CampaignDashboard';

export interface CreateCampaignRequest {
  name: string;
  subject: string;
  type: Campaign['type'];
  templateId?: string;
  content: {
    htmlContent?: string;
    textContent?: string;
    templateData?: Record<string, any>;
  };
  recipients: {
    criteria?: {
      teams?: string[];
      roles?: string[];
      departments?: string[];
      eventParticipants?: string[];
      customFilters?: any[];
      excludeUnsubscribed: boolean;
    };
    recipientListId?: string;
    externalRecipients?: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      personalizations?: Record<string, any>;
    }>;
  };
  scheduledAt?: string;
  tags?: string[];
}

export interface UpdateCampaignRequest extends Partial<CreateCampaignRequest> {
  id: string;
}

export interface CampaignAnalytics {
  campaignId: string;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  deliveryRate: number;
  engagementScore: number;
  timeline: Array<{
    timestamp: string;
    opens: number;
    clicks: number;
    bounces: number;
    unsubscribes: number;
  }>;
  topLinks: Array<{
    url: string;
    clicks: number;
    clickRate: number;
  }>;
  deviceStats: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  locationStats: Array<{
    country: string;
    opens: number;
    clicks: number;
  }>;
}

export interface CampaignPreview {
  htmlContent: string;
  textContent: string;
  subject: string;
  previewText?: string;
}

class CampaignService {
  private baseUrl = '/api/email-campaigns';

  /**
   * Récupérer toutes les campagnes de l'organisation
   */
  async getCampaigns(filters?: Partial<CampaignFilters>): Promise<Campaign[]> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters?.dateRange && filters.dateRange !== 'all') params.append('dateRange', filters.dateRange);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await apiService.get(`${this.baseUrl}?${params.toString()}`);
    return response.data;
  }

  /**
   * Récupérer une campagne par ID
   */
  async getCampaign(id: string): Promise<Campaign> {
    const response = await apiService.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Créer une nouvelle campagne
   */
  async createCampaign(data: CreateCampaignRequest): Promise<Campaign> {
    const response = await apiService.post(this.baseUrl, data);
    return response.data;
  }

  /**
   * Mettre à jour une campagne
   */
  async updateCampaign(data: UpdateCampaignRequest): Promise<Campaign> {
    const { id, ...updateData } = data;
    const response = await apiService.put(`${this.baseUrl}/${id}`, updateData);
    return response.data;
  }

  /**
   * Supprimer une campagne
   */
  async deleteCampaign(id: string): Promise<void> {
    await apiService.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Dupliquer une campagne
   */
  async duplicateCampaign(id: string, newName?: string): Promise<Campaign> {
    const response = await apiService.post(`${this.baseUrl}/${id}/duplicate`, {
      name: newName
    });
    return response.data;
  }

  /**
   * Envoyer une campagne immédiatement
   */
  async sendCampaign(id: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/${id}/send`);
  }

  /**
   * Programmer une campagne
   */
  async scheduleCampaign(id: string, scheduledAt: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/${id}/schedule`, { scheduledAt });
  }

  /**
   * Mettre en pause une campagne
   */
  async pauseCampaign(id: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/${id}/pause`);
  }

  /**
   * Reprendre une campagne
   */
  async resumeCampaign(id: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/${id}/resume`);
  }

  /**
   * Annuler une campagne
   */
  async cancelCampaign(id: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/${id}/cancel`);
  }

  /**
   * Prévisualiser une campagne
   */
  async previewCampaign(id: string, recipientEmail?: string): Promise<CampaignPreview> {
    const params = recipientEmail ? `?recipientEmail=${recipientEmail}` : '';
    const response = await apiService.get(`${this.baseUrl}/${id}/preview${params}`);
    return response.data;
  }

  /**
   * Envoyer un test de campagne
   */
  async sendTestCampaign(id: string, testEmails: string[]): Promise<void> {
    await apiService.post(`${this.baseUrl}/${id}/test`, { testEmails });
  }

  /**
   * Récupérer les analytics d'une campagne
   */
  async getCampaignAnalytics(id: string): Promise<CampaignAnalytics> {
    const response = await apiService.get(`${this.baseUrl}/${id}/analytics`);
    return response.data;
  }

  /**
   * Récupérer les statistiques globales des campagnes
   */
  async getCampaignStats(): Promise<{
    totalCampaigns: number;
    sentCampaigns: number;
    activeCampaigns: number;
    draftCampaigns: number;
    totalRecipients: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    avgOpenRate: number;
    avgClickRate: number;
    avgBounceRate: number;
    deliveryRate: number;
  }> {
    const response = await apiService.get(`${this.baseUrl}/stats`);
    return response.data;
  }

  /**
   * Exporter les données d'une campagne
   */
  async exportCampaignData(id: string, format: 'csv' | 'excel' | 'pdf' = 'csv'): Promise<Blob> {
    const response = await apiService.get(`${this.baseUrl}/${id}/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Récupérer l'historique des actions d'une campagne
   */
  async getCampaignHistory(id: string): Promise<Array<{
    id: string;
    action: string;
    timestamp: string;
    userId: string;
    userName: string;
    details?: Record<string, any>;
  }>> {
    const response = await apiService.get(`${this.baseUrl}/${id}/history`);
    return response.data;
  }

  /**
   * Comparer plusieurs campagnes
   */
  async compareCampaigns(campaignIds: string[]): Promise<{
    campaigns: Campaign[];
    comparison: {
      metrics: Array<{
        name: string;
        values: Record<string, number>;
      }>;
      insights: string[];
    };
  }> {
    const response = await apiService.post(`${this.baseUrl}/compare`, { campaignIds });
    return response.data;
  }
}

export const campaignService = new CampaignService();