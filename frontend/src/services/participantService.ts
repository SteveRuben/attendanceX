/**
 * Service pour la gestion des participants aux événements
 */

import {
  type EventParticipant,
  type CreateParticipantRequest,
  type UpdateParticipantRequest,
  type ParticipantImportState,
  ParticipantStatus,
  AttendanceStatus,
  DuplicateAction
} from '@attendance-x/shared';
import { apiService } from './apiService';

export interface ParticipantFilters {
  eventId?: string;
  status?: ParticipantStatus;
  attendanceStatus?: AttendanceStatus;
  isInternalUser?: boolean;
  search?: string;
  language?: string;
  importBatchId?: string;
  page?: number;
  limit?: number;
}

export interface ParticipantStats {
  total: number;
  confirmed: number;
  attended: number;
  absent: number;
  internalUsers: number;
  externalParticipants: number;
  byLanguage: Record<string, number>;
  byStatus: Record<ParticipantStatus, number>;
}

export interface BulkAttendanceResponse {
  successful: number;
  failed: number;
  errors: Array<{
    participantId: string;
    error: string;
  }>;
}

class ParticipantService {
  private readonly basePath = '/api/events';

  /**
   * Créer un nouveau participant
   */
  async createParticipant(data: CreateParticipantRequest) {
    return apiService.post<EventParticipant>(`${this.basePath}/${data.eventId}/participants`, data);
  }

  /**
   * Obtenir tous les participants d'un événement
   */
  async getParticipants(eventId: string, filters?: ParticipantFilters) {
    return apiService.get<{
      data: EventParticipant[];
      total: number;
      page: number;
      limit: number;
    }>(`${this.basePath}/${eventId}/participants`, { params: filters });
  }

  /**
   * Obtenir un participant par ID
   */
  async getParticipantById(eventId: string, participantId: string) {
    return apiService.get<EventParticipant>(`${this.basePath}/${eventId}/participants/${participantId}`);
  }

  /**
   * Mettre à jour un participant
   */
  async updateParticipant(eventId: string, participantId: string, data: UpdateParticipantRequest) {
    return apiService.put<EventParticipant>(`${this.basePath}/${eventId}/participants/${participantId}`, data);
  }

  /**
   * Supprimer un participant
   */
  async deleteParticipant(eventId: string, participantId: string) {
    return apiService.delete(`${this.basePath}/${eventId}/participants/${participantId}`);
  }

  /**
   * Import en masse des participants depuis un fichier CSV/Excel
   */
  async importParticipants(eventId: string, file: File, options?: {
    duplicateHandling?: DuplicateAction;
    defaultLanguage?: string;
    sendWelcomeNotification?: boolean;
    customMessage?: string;
  }) {
    // Convert options to string values for FormData
    const additionalData: Record<string, string> = {};
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          additionalData[key] = typeof value === 'boolean' ? value.toString() : value;
        }
      });
    }

    return apiService.upload<{
      batchId: string;
      imported: number;
      failed: number;
      duplicates: number;
      errors: Array<{ row: number; field: string; message: string }>;
    }>(`${this.basePath}/${eventId}/participants/import`, file, additionalData);
  }

  /**
   * Obtenir l'état d'un import en cours
   */
  async getImportStatus(eventId: string, batchId: string) {
    return apiService.get<ParticipantImportState>(`${this.basePath}/${eventId}/participants/import/${batchId}/status`);
  }

  /**
   * Valider et traiter les doublons détectés lors de l'import
   */
  async processDuplicates(eventId: string, batchId: string, decisions: Array<{
    row: number;
    action: DuplicateAction;
  }>) {
    return apiService.post(`${this.basePath}/${eventId}/participants/import/${batchId}/process-duplicates`, {
      decisions
    });
  }

  /**
   * Détecter automatiquement si un participant est un utilisateur interne
   */
  async detectInternalUsers(eventId: string, participants: Array<{
    email?: string;
    phone?: string;
  }>) {
    return apiService.post<Array<{
      email?: string;
      phone?: string;
      isInternal: boolean;
      userId?: string;
      userName?: string;
    }>>(`${this.basePath}/${eventId}/participants/detect-internal`, {
      participants
    });
  }

  /**
   * Lier un participant externe à un utilisateur interne
   */
  async linkToInternalUser(eventId: string, participantId: string, userId: string) {
    return apiService.post<EventParticipant>(`${this.basePath}/${eventId}/participants/${participantId}/link-user`, {
      userId
    });
  }

  /**
   * Délier un participant d'un utilisateur interne
   */
  async unlinkFromInternalUser(eventId: string, participantId: string) {
    return apiService.post<EventParticipant>(`${this.basePath}/${eventId}/participants/${participantId}/unlink-user`);
  }

  /**
   * Envoyer des invitations en masse
   */
  async sendBulkInvitations(eventId: string, participantIds: string[], options?: {
    customMessage?: string;
    scheduleFor?: Date;
    channels?: string[];
  }) {
    return apiService.post(`${this.basePath}/${eventId}/participants/send-invitations`, {
      participantIds,
      ...options
    });
  }

  /**
   * Marquer la présence d'un participant
   */
  async markAttendance(eventId: string, participantId: string, status: AttendanceStatus, validatedBy?: string) {
    return apiService.post<EventParticipant>(`${this.basePath}/${eventId}/participants/${participantId}/attendance`, {
      status,
      validatedBy,
      validatedAt: new Date()
    });
  }

  /**
   * Validation en masse des présences
   */
  async bulkMarkAttendance(eventId: string, attendances: Array<{
    participantId: string;
    status: AttendanceStatus;
  }>, validatedBy: string) {
    return apiService.post<BulkAttendanceResponse>(`${this.basePath}/${eventId}/participants/bulk-attendance`, {
      attendances,
      validatedBy
    });
  }

  /**
   * Obtenir les statistiques des participants
   */
  async getParticipantStats(eventId: string) {
    return apiService.get<ParticipantStats>(`${this.basePath}/${eventId}/participants/stats`);
  }

  /**
   * Exporter la liste des participants
   */
  async exportParticipants(eventId: string, format: 'csv' | 'excel' = 'csv', filters?: ParticipantFilters) {
    const response = await apiService.get(`${this.basePath}/${eventId}/participants/export`, {
      params: { format, ...filters },
      responseType: 'blob'
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `participants-${eventId}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return response;
  }

  /**
   * Rechercher des participants avec filtres avancés
   */
  async searchParticipants(query: string, filters?: {
    eventIds?: string[];
    organizationId?: string;
    status?: ParticipantStatus[];
    isInternalUser?: boolean;
    language?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  }) {
    return apiService.get<{
      data: EventParticipant[];
      total: number;
      facets: {
        events: Record<string, number>;
        statuses: Record<ParticipantStatus, number>;
        languages: Record<string, number>;
      };
    }>('/api/participants/search', {
      params: {
        q: query,
        ...filters
      }
    });
  }

  /**
   * Obtenir l'historique des modifications d'un participant
   */
  async getParticipantHistory(eventId: string, participantId: string) {
    return apiService.get<Array<{
      id: string;
      action: string;
      changes: Record<string, { old: any; new: any }>;
      performedBy: string;
      performedAt: Date;
      reason?: string;
    }>>(`${this.basePath}/${eventId}/participants/${participantId}/history`);
  }

  /**
   * Générer un QR code pour un participant
   */
  async generateQRCode(eventId: string, participantId: string) {
    return apiService.post<{
      qrCode: string;
      qrCodeUrl: string;
      expiresAt: Date;
    }>(`${this.basePath}/${eventId}/participants/${participantId}/qr-code`);
  }

  /**
   * Valider un QR code de participant
   */
  async validateQRCode(qrCode: string, validatedBy: string) {
    return apiService.post<{
      valid: boolean;
      participant?: EventParticipant;
      event?: any;
      message: string;
    }>('/api/participants/validate-qr', {
      qrCode,
      validatedBy
    });
  }
}

export const participantService = new ParticipantService();