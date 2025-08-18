/**
 * Service pour la gestion des invitations
 */

import { apiService } from './apiService';

// Types locaux pour les invitations
export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invitedBy: string;
  invitedByName: string;
  message?: string;
  permissions?: string[];
  expirationDate: Date;
  createdAt: Date;
  acceptedAt?: Date;
}

export interface CreateInvitationData {
  email: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  permissions?: string[];
  message?: string;
  expirationDays?: number;
}

export interface BulkInvitationData {
  invitations: {
    email: string;
    role: 'admin' | 'manager' | 'member' | 'viewer';
    firstName?: string;
    lastName?: string;
  }[];
  message?: string;
  expirationDays?: number;
}

export interface InvitationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  organizationId: string;
  isDefault: boolean;
}

export interface InvitationStats {
  totalSent: number;
  pending: number;
  accepted: number;
  declined: number;
  expired: number;
  acceptanceRate: number;
  averageResponseTime: number;
}

class InvitationService {
  private readonly basePath = '/api/organizations';

  /**
   * Créer une invitation
   */
  async createInvitation(organizationId: string, data: CreateInvitationData) {
    return apiService.post<Invitation>(`${this.basePath}/${organizationId}/invitations`, data);
  }

  /**
   * Créer des invitations en masse
   */
  async createBulkInvitations(organizationId: string, data: BulkInvitationData) {
    return apiService.post<{
      invitations: Invitation[];
      successful: number;
      failed: number;
      errors: { email: string; error: string }[];
    }>(`${this.basePath}/${organizationId}/invitations/bulk`, data);
  }

  /**
   * Lister les invitations d'une organisation
   */
  async getInvitations(organizationId: string, params?: {
    status?: 'pending' | 'accepted' | 'declined' | 'expired';
    role?: string;
    page?: number;
    limit?: number;
  }) {
    return apiService.get<{
      data: Invitation[];
      total: number;
      page: number;
      limit: number;
    }>(`${this.basePath}/${organizationId}/invitations`, { params });
  }

  /**
   * Obtenir une invitation par ID
   */
  async getInvitationById(organizationId: string, invitationId: string) {
    return apiService.get<Invitation>(`${this.basePath}/${organizationId}/invitations/${invitationId}`);
  }

  /**
   * Renouveler une invitation
   */
  async renewInvitation(organizationId: string, invitationId: string, expirationDays?: number) {
    return apiService.post<Invitation>(
      `${this.basePath}/${organizationId}/invitations/${invitationId}/renew`,
      { expirationDays }
    );
  }

  /**
   * Annuler une invitation
   */
  async cancelInvitation(organizationId: string, invitationId: string) {
    return apiService.delete(`${this.basePath}/${organizationId}/invitations/${invitationId}`);
  }

  /**
   * Accepter une invitation (endpoint public)
   */
  async acceptInvitation(token: string) {
    return apiService.post<{
      success: boolean;
      organization: any;
      user: any;
    }>(`${this.basePath}/invitations/accept`, { token });
  }

  /**
   * Décliner une invitation (endpoint public)
   */
  async declineInvitation(token: string, reason?: string) {
    return apiService.post(`${this.basePath}/invitations/decline`, { token, reason });
  }

  /**
   * Obtenir les détails d'une invitation par token (endpoint public)
   */
  async getInvitationByToken(token: string) {
    return apiService.get<{
      invitation: Invitation;
      organization: {
        name: string;
        description?: string;
        logo?: string;
      };
      invitedBy: {
        name: string;
        email: string;
      };
    }>(`${this.basePath}/invitations/details/${token}`);
  }

  /**
   * Renvoyer une invitation
   */
  async resendInvitation(organizationId: string, invitationId: string) {
    return apiService.post(`${this.basePath}/${organizationId}/invitations/${invitationId}/resend`);
  }

  /**
   * Renvoyer plusieurs invitations
   */
  async resendBulkInvitations(organizationId: string, invitationIds: string[]) {
    return apiService.post(`${this.basePath}/${organizationId}/invitations/resend-bulk`, {
      invitationIds
    });
  }

  /**
   * Obtenir les statistiques des invitations
   */
  async getInvitationStats(organizationId: string, timeframe?: {
    startDate: string;
    endDate: string;
  }) {
    const params = timeframe ? {
      startDate: timeframe.startDate,
      endDate: timeframe.endDate
    } : {};

    return apiService.get<InvitationStats>(`${this.basePath}/${organizationId}/invitations/stats`, {
      params
    });
  }

  /**
   * Créer un template d'invitation
   */
  async createInvitationTemplate(organizationId: string, template: {
    name: string;
    subject: string;
    content: string;
    isDefault?: boolean;
  }) {
    return apiService.post<InvitationTemplate>(
      `${this.basePath}/${organizationId}/invitation-templates`,
      template
    );
  }

  /**
   * Lister les templates d'invitation
   */
  async getInvitationTemplates(organizationId: string) {
    return apiService.get<InvitationTemplate[]>(`${this.basePath}/${organizationId}/invitation-templates`);
  }

  /**
   * Mettre à jour un template d'invitation
   */
  async updateInvitationTemplate(organizationId: string, templateId: string, updates: {
    name?: string;
    subject?: string;
    content?: string;
    isDefault?: boolean;
  }) {
    return apiService.put<InvitationTemplate>(
      `${this.basePath}/${organizationId}/invitation-templates/${templateId}`,
      updates
    );
  }

  /**
   * Supprimer un template d'invitation
   */
  async deleteInvitationTemplate(organizationId: string, templateId: string) {
    return apiService.delete(`${this.basePath}/${organizationId}/invitation-templates/${templateId}`);
  }

  /**
   * Importer des invitations depuis un fichier CSV
   */
  async importInvitations(organizationId: string, file: File, options?: {
    role?: string;
    message?: string;
    expirationDays?: number;
  }) {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, value.toString());
        }
      });
    }

    return apiService.post<{
      imported: number;
      failed: number;
      errors: { row: number; email: string; error: string }[];
    }>(`${this.basePath}/${organizationId}/invitations/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  /**
   * Exporter les invitations
   */
  async exportInvitations(organizationId: string, params?: {
    status?: string;
    format?: 'csv' | 'excel';
    includeStats?: boolean;
  }) {
    const response = await apiService.get(`${this.basePath}/${organizationId}/invitations/export`, {
      params,
      responseType: 'blob'
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const format = params?.format || 'csv';
    link.setAttribute('download', `invitations.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return response;
  }

  /**
   * Obtenir les invitations en attente pour l'utilisateur connecté
   */
  async getMyPendingInvitations() {
    return apiService.get<Invitation[]>('/api/users/me/pending-invitations');
  }

  /**
   * Import en masse des utilisateurs avec affectation aux équipes
   */
  async importUsersWithTeams(organizationId: string, file: File, options?: {
    defaultRole?: string;
    defaultOrganizationRole?: string;
    defaultPassword?: string;
    defaultTeams?: string[];
    createMissingTeams?: boolean;
    autoAssignByDepartment?: boolean;
    sendWelcomeEmail?: boolean;
    language?: string;
  }) {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, typeof value === 'boolean' ? value.toString() : value);
        }
      });
    }

    return apiService.post<{
      imported: number;
      failed: number;
      createdTeams: string[];
      errors: { row: number; email: string; error: string }[];
    }>(`${this.basePath}/${organizationId}/users/import-with-teams`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  /**
   * Obtenir l'historique des invitations envoyées par l'utilisateur
   */
  async getMyInvitationHistory(params?: {
    organizationId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    return apiService.get<{
      data: Invitation[];
      total: number;
    }>('/api/users/me/invitation-history', { params });
  }

  /**
   * Valider une adresse email avant invitation
   */
  async validateEmail(email: string) {
    return apiService.post<{
      valid: boolean;
      exists: boolean;
      suggestions?: string[];
    }>('/api/invitations/validate-email', { email });
  }

  /**
   * Obtenir les suggestions de rôles basées sur l'email
   */
  async getSuggestedRole(organizationId: string, email: string) {
    return apiService.post<{
      suggestedRole: string;
      confidence: number;
      reasons: string[];
    }>(`${this.basePath}/${organizationId}/invitations/suggest-role`, { email });
  }

  /**
   * Créer un lien d'invitation publique
   */
  async createPublicInvitationLink(organizationId: string, options: {
    role: string;
    maxUses?: number;
    expirationDays?: number;
    requireApproval?: boolean;
  }) {
    return apiService.post<{
      link: string;
      token: string;
      expiresAt: Date;
    }>(`${this.basePath}/${organizationId}/invitations/public-link`, options);
  }

  /**
   * Utiliser un lien d'invitation publique
   */
  async usePublicInvitationLink(token: string, userData: {
    firstName: string;
    lastName: string;
    email: string;
  }) {
    return apiService.post<{
      success: boolean;
      requiresApproval: boolean;
      organization: any;
    }>(`${this.basePath}/invitations/public-link/${token}/use`, userData);
  }
}

export const invitationService = new InvitationService();