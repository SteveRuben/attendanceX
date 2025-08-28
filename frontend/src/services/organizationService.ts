import { type Organization, OrganizationSector, type CreateOrganizationRequest, type OrganizationTemplate, type OrganizationInvitation } from '@attendance-x/shared';
import { apiService } from './apiService';


class OrganizationService {
  /**
   * Créer une nouvelle organisation
   */
  async createOrganization(data: CreateOrganizationRequest): Promise<Organization> {
    try {
      const response = await apiService.post('/organizations', data);
      console.log(response);
      return response.data.organization;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }

  /**
   * Récupérer une organisation par ID
   */
  async getOrganization(id: string): Promise<Organization> {
    try {
      const response = await apiService.get(`/organizations/${id}`);
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching organization:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une organisation
   */
  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    try {
      const response = await apiService.put(`/organizations/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating organization:', error);
      throw error;
    }
  }

  /**
   * Supprimer une organisation
   */
  async deleteOrganization(id: string): Promise<void> {
    try {
      await apiService.delete(`/organizations/${id}`);
    } catch (error) {
      console.error('Error deleting organization:', error);
      throw error;
    }
  }

  /**
   * Récupérer les templates pour un secteur donné
   */
  async getSectorTemplates(sector: OrganizationSector): Promise<OrganizationTemplate[]> {
    try {
      const response = await apiService.get(`/organizations/templates/${sector}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sector templates:', error);
      // Retourner une erreur pour que le composant utilise les templates par défaut
      throw error;
    }
  }

  /**
   * Inviter un utilisateur à rejoindre l'organisation
   */
  async inviteUser(organizationId: string, email: string, role: string, message?: string): Promise<OrganizationInvitation> {
    try {
      const response = await apiService.post(`/organizations/${organizationId}/invitations`, {
        email,
        role,
        message
      });
      return response.data;
    } catch (error) {
      console.error('Error inviting user:', error);
      throw error;
    }
  }

  /**
   * Accepter une invitation
   */
  async acceptInvitation(token: string): Promise<void> {
    try {
      await apiService.post('/organizations/invitations/accept', { token });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Récupérer les invitations d'une organisation
   */
  async getOrganizationInvitations(organizationId: string): Promise<OrganizationInvitation[]> {
    try {
      const response = await apiService.get(`/organizations/${organizationId}/invitations`);
      return response.data;
    } catch (error) {
      console.error('Error fetching organization invitations:', error);
      throw error;
    }
  }

  /**
   * Annuler une invitation
   */
  async cancelInvitation(organizationId: string, invitationId: string): Promise<void> {
    try {
      await apiService.delete(`/organizations/${organizationId}/invitations/${invitationId}`);
    } catch (error) {
      console.error('Error canceling invitation:', error);
      throw error;
    }
  }

  /**
   * Récupérer les membres d'une organisation
   */
  async getOrganizationMembers(organizationId: string): Promise<any[]> {
    try {
      const response = await apiService.get(`/organizations/${organizationId}/members`);
      return response.data;
    } catch (error) {
      console.error('Error fetching organization members:', error);
      throw error;
    }
  }

  /**
   * Supprimer un membre de l'organisation
   */
  async removeMember(organizationId: string, userId: string): Promise<void> {
    try {
      await apiService.delete(`/organizations/${organizationId}/members/${userId}`);
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le rôle d'un membre
   */
  async updateMemberRole(organizationId: string, userId: string, role: string): Promise<void> {
    try {
      await apiService.put(`/organizations/${organizationId}/members/${userId}`, { role });
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques d'une organisation
   */
  async getOrganizationStats(organizationId: string): Promise<any> {
    try {
      const response = await apiService.get(`/organizations/${organizationId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching organization stats:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour les paramètres de branding
   */
  async updateBranding(organizationId: string, branding: any): Promise<void> {
    try {
      await apiService.put(`/organizations/${organizationId}/branding`, branding);
    } catch (error) {
      console.error('Error updating branding:', error);
      throw error;
    }
  }

  /**
   * Uploader un logo d'organisation
   */
  async uploadLogo(organizationId: string, file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await apiService.post(`/organizations/${organizationId}/logo`, formData);
      
      return response.data.logoUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  }
}

export const organizationService = new OrganizationService();