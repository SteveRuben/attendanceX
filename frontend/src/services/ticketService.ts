import { apiClient } from './apiClient';
import {
  EventTicket,
  CreateTicketRequest,
  UpdateTicketRequest,
  BulkTicketRequest,
  TicketValidationRequest,
  TicketValidationResult,
  TicketEmailOptions,
  TicketStatistics,
  PaginatedTicketsResponse,
  TicketFilters,
  TicketSortOptions
} from '../types/ticket.types';

export interface TicketQueryParams {
  page?: number;
  limit?: number;
  filters?: TicketFilters;
  sort?: TicketSortOptions;
}

class TicketService {
  private baseUrl = '/api/tickets';

  /**
   * Créer un nouveau billet
   */
  async createTicket(data: CreateTicketRequest): Promise<EventTicket> {
    const response = await apiClient.post<{ success: boolean; data: EventTicket }>(
      this.baseUrl,
      data
    );
    return response.data.data;
  }

  /**
   * Créer plusieurs billets en lot
   */
  async createBulkTickets(data: BulkTicketRequest): Promise<EventTicket[]> {
    const response = await apiClient.post<{ success: boolean; data: EventTicket[] }>(
      `${this.baseUrl}/bulk`,
      data
    );
    return response.data.data;
  }

  /**
   * Obtenir un billet par ID
   */
  async getTicket(ticketId: string): Promise<EventTicket> {
    const response = await apiClient.get<{ success: boolean; data: EventTicket }>(
      `${this.baseUrl}/${ticketId}`
    );
    return response.data.data;
  }

  /**
   * Obtenir tous les billets d'un événement
   */
  async getTicketsByEvent(
    eventId: string,
    params?: TicketQueryParams
  ): Promise<PaginatedTicketsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    if (params?.filters) {
      if (params.filters.status?.length) {
        queryParams.append('status', params.filters.status.join(','));
      }
      if (params.filters.type?.length) {
        queryParams.append('type', params.filters.type.join(','));
      }
      if (params.filters.search) {
        queryParams.append('search', params.filters.search);
      }
      if (params.filters.dateFrom) {
        queryParams.append('dateFrom', params.filters.dateFrom.toISOString());
      }
      if (params.filters.dateTo) {
        queryParams.append('dateTo', params.filters.dateTo.toISOString());
      }
      if (params.filters.emailSent !== undefined) {
        queryParams.append('emailSent', params.filters.emailSent.toString());
      }
      if (params.filters.checkedIn !== undefined) {
        queryParams.append('checkedIn', params.filters.checkedIn.toString());
      }
    }

    if (params?.sort) {
      queryParams.append('sortBy', params.sort.field);
      queryParams.append('sortOrder', params.sort.direction);
    }

    const queryString = queryParams.toString();
    const url = `${this.baseUrl}/events/${eventId}${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<{ success: boolean; data: PaginatedTicketsResponse }>(url);
    return response.data.data;
  }

  /**
   * Obtenir tous les billets d'un participant
   */
  async getTicketsByParticipant(participantId: string): Promise<EventTicket[]> {
    const response = await apiClient.get<{ success: boolean; data: EventTicket[] }>(
      `${this.baseUrl}/participants/${participantId}`
    );
    return response.data.data;
  }

  /**
   * Mettre à jour un billet
   */
  async updateTicket(ticketId: string, data: UpdateTicketRequest): Promise<EventTicket> {
    const response = await apiClient.put<{ success: boolean; data: EventTicket }>(
      `${this.baseUrl}/${ticketId}`,
      data
    );
    return response.data.data;
  }

  /**
   * Annuler un billet
   */
  async cancelTicket(ticketId: string, reason?: string): Promise<void> {
    await apiClient.post(`${this.baseUrl}/${ticketId}/cancel`, { reason });
  }

  /**
   * Valider un billet
   */
  async validateTicket(data: TicketValidationRequest): Promise<TicketValidationResult> {
    const response = await apiClient.post<{ success: boolean; data: TicketValidationResult }>(
      `${this.baseUrl}/validate`,
      data
    );
    return response.data.data;
  }

  /**
   * Check-in d'un billet
   */
  async checkInTicket(ticketId: string): Promise<EventTicket> {
    const response = await apiClient.post<{ success: boolean; data: EventTicket }>(
      `${this.baseUrl}/${ticketId}/checkin`
    );
    return response.data.data;
  }

  /**
   * Télécharger un billet en PDF
   */
  async downloadTicketPDF(ticketId: string): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/${ticketId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Envoyer un billet par email
   */
  async sendTicketEmail(ticketId: string, options?: TicketEmailOptions): Promise<void> {
    await apiClient.post(`${this.baseUrl}/${ticketId}/send-email`, options || {});
  }

  /**
   * Obtenir les statistiques des billets pour un événement
   */
  async getTicketStatistics(eventId: string): Promise<TicketStatistics> {
    const response = await apiClient.get<{ success: boolean; data: TicketStatistics }>(
      `${this.baseUrl}/events/${eventId}/statistics`
    );
    return response.data.data;
  }

  /**
   * Traiter une inscription d'événement avec génération automatique de billet
   */
  async processEventRegistration(data: {
    formSubmission: any;
    config?: any;
  }): Promise<{ success: boolean; ticket?: EventTicket; emailSent: boolean }> {
    const response = await apiClient.post<{
      success: boolean;
      data: { success: boolean; ticket?: EventTicket; emailSent: boolean };
    }>(`${this.baseUrl}/registration/process`, data);
    return response.data.data;
  }

  /**
   * Télécharger un billet en tant que fichier
   */
  async downloadTicketAsFile(ticketId: string, filename?: string): Promise<void> {
    const blob = await this.downloadTicketPDF(ticketId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `ticket-${ticketId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Obtenir l'URL de prévisualisation d'un billet
   */
  getTicketPreviewUrl(ticketId: string): string {
    return `${this.baseUrl}/${ticketId}/preview`;
  }

  /**
   * Vérifier si un email est déjà enregistré pour un événement
   */
  async checkEmailRegistration(eventId: string, email: string): Promise<{
    isRegistered: boolean;
    ticket?: EventTicket;
  }> {
    const response = await apiClient.get<{
      success: boolean;
      data: { isRegistered: boolean; ticket?: EventTicket };
    }>(`${this.baseUrl}/events/${eventId}/check-email?email=${encodeURIComponent(email)}`);
    return response.data.data;
  }
}

export const ticketService = new TicketService();