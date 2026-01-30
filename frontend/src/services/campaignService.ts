import { apiClient } from './apiClient';
import {
  Campaign,
  EventCampaign,
  CreateCampaignRequest,
  CreateEventCampaignRequest,
  EventCampaignPreview,
  AccessCodeValidation,
  CampaignAnalytics,
  AccessCodeStats
} from '../types/campaign.types';

export const campaignService = {
  // ==========================================
  // Campagnes Standards
  // ==========================================

  /**
   * Créer une campagne (avec support événement optionnel)
   */
  async createCampaign(campaignData: CreateCampaignRequest): Promise<Campaign> {
    const response = await apiClient.post('/api/campaigns', campaignData);
    return (response as any)?.data ?? response;
  },

  /**
   * Obtenir une campagne par ID
   */
  async getCampaign(campaignId: string): Promise<Campaign> {
    const response = await apiClient.get(`/api/campaigns/${campaignId}`);
    return (response as any)?.data ?? response;
  },

  /**
   * Obtenir la liste des campagnes
   */
  async getCampaigns(params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    eventId?: string;
    search?: string;
  }): Promise<{ campaigns: Campaign[]; pagination: any }> {
    const response = await apiClient.get('/api/campaigns', { params });
    return (response as any)?.data ?? response;
  },

  /**
   * Mettre à jour une campagne
   */
  async updateCampaign(campaignId: string, updates: Partial<CreateCampaignRequest>): Promise<Campaign> {
    const response = await apiClient.put(`/api/campaigns/${campaignId}`, updates);
    return (response as any)?.data ?? response;
  },

  /**
   * Supprimer une campagne
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    await apiClient.delete(`/api/campaigns/${campaignId}`);
  },

  /**
   * Envoyer une campagne
   */
  async sendCampaign(campaignId: string): Promise<{ emailSent: boolean; smsSent: boolean; errors: string[] }> {
    const response = await apiClient.post(`/api/campaigns/${campaignId}/send`);
    return (response as any)?.data ?? response;
  },

  /**
   * Prévisualiser une campagne
   */
  async previewCampaign(campaignData: any): Promise<any> {
    const response = await apiClient.post('/api/campaigns/preview', campaignData);
    return (response as any)?.data ?? response;
  },

  // ==========================================
  // Campagnes d'Événements
  // ==========================================

  /**
   * Créer une campagne depuis un événement
   */
  async createEventCampaign(eventId: string, campaignData: CreateEventCampaignRequest): Promise<{
    campaignId: string;
    participantCount: number;
    qrCodesGenerated: number;
    pinCodesGenerated: number;
    emailCampaignId?: string;
    smsCampaignId?: string;
  }> {
    const response = await apiClient.post(`/api/events/${eventId}/campaigns`, campaignData);
    return (response as any)?.data ?? response;
  },

  /**
   * Obtenir les campagnes d'un événement
   */
  async getEventCampaigns(eventId: string, params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<EventCampaign[]> {
    const response = await apiClient.get(`/api/events/${eventId}/campaigns`, { params });
    return (response as any)?.data ?? response;
  },

  /**
   * Prévisualiser une campagne d'événement
   */
  async previewEventCampaign(eventId: string, notificationMethods: any): Promise<EventCampaignPreview> {
    const response = await apiClient.post(`/api/events/${eventId}/campaigns/preview`, {
      notificationMethods
    });
    return (response as any)?.data ?? response;
  },

  /**
   * Envoyer une campagne d'événement
   */
  async sendEventCampaign(campaignId: string): Promise<{
    emailSent: boolean;
    smsSent: boolean;
    errors: string[];
  }> {
    const response = await apiClient.post(`/api/campaigns/${campaignId}/send`);
    return (response as any)?.data ?? response;
  },

  // ==========================================
  // Validation des Codes d'Accès
  // ==========================================

  /**
   * Valider un QR code pour un événement
   */
  async validateQRCode(eventId: string, qrCodeId: string, location?: any): Promise<AccessCodeValidation> {
    const response = await apiClient.post(`/api/events/${eventId}/validate-qr`, {
      qrCodeId,
      location
    });
    return (response as any)?.data ?? response;
  },

  /**
   * Valider un PIN code pour un événement
   */
  async validatePINCode(eventId: string, pinCode: string, userId?: string): Promise<AccessCodeValidation> {
    const response = await apiClient.post(`/api/events/${eventId}/validate-pin`, {
      pinCode,
      userId
    });
    return (response as any)?.data ?? response;
  },

  // ==========================================
  // Analytics et Statistiques
  // ==========================================

  /**
   * Obtenir les statistiques des codes d'accès d'un événement
   */
  async getAccessCodeStats(eventId: string): Promise<AccessCodeStats> {
    const response = await apiClient.get(`/api/events/${eventId}/access-codes/stats`);
    return (response as any)?.data ?? response;
  },

  /**
   * Obtenir les analytics d'une campagne d'événement
   */
  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    const response = await apiClient.get(`/api/campaigns/${campaignId}/analytics`);
    return (response as any)?.data ?? response;
  },

  // ==========================================
  // Utilitaires
  // ==========================================

  /**
   * Obtenir les événements disponibles pour les campagnes
   */
  async getAvailableEvents(): Promise<Array<{
    id: string;
    title: string;
    startDateTime: string;
    participantCount: number;
    attendanceSettings?: any;
  }>> {
    const response = await apiClient.get('/api/events', {
      params: {
        status: 'active',
        limit: 100,
        sortBy: 'startDate',
        sortOrder: 'asc'
      }
    });
    
    const events = (response as any)?.data ?? response;
    return Array.isArray(events) ? events : events.events || [];
  },

  /**
   * Obtenir les templates de campagne
   */
  async getCampaignTemplates(category?: string): Promise<Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    htmlContent: string;
    textContent?: string;
  }>> {
    const response = await apiClient.get('/api/campaigns/templates', {
      params: { category }
    });
    return (response as any)?.data ?? response;
  }
};