import { apiClient } from '@/services/apiClient'
import {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  OrganizationSettings,
  OrganizationBranding,
  DomainCheckResponse
} from '@/types/organization.types'

export class OrganizationService {
  /**
   * Obtenir l'organisation du tenant actuel
   */
  static async getOrganizationByTenant(): Promise<Organization | null> {
    try {
      const response = await apiClient.get<Organization>('/organizations/tenant', {
        withAuth: true
      })
      return response
    } catch (error: any) {
      if (error.status === 404) {
        return null // Pas d'organisation pour ce tenant
      }
      throw error
    }
  }

  /**
   * Créer une nouvelle organisation
   */
  static async createOrganization(data: CreateOrganizationRequest): Promise<Organization> {
    const response = await apiClient.post<Organization>('/organizations', data, {
      withAuth: true,
      withToast: {
        loading: 'Création de l\'organisation...',
        success: 'Organisation créée avec succès'
      }
    })
    return response
  }

  /**
   * Obtenir une organisation par ID
   */
  static async getOrganization(organizationId: string): Promise<Organization> {
    const response = await apiClient.get<Organization>(`/organizations/${organizationId}`, {
      withAuth: true
    })
    return response
  }

  /**
   * Mettre à jour une organisation
   */
  static async updateOrganization(
    organizationId: string,
    data: UpdateOrganizationRequest
  ): Promise<Organization> {
    const response = await apiClient.put<Organization>(`/organizations/${organizationId}`, data, {
      withAuth: true,
      withToast: {
        loading: 'Mise à jour de l\'organisation...',
        success: 'Organisation mise à jour avec succès'
      }
    })
    return response
  }

  /**
   * Mettre à jour les paramètres de l'organisation
   */
  static async updateOrganizationSettings(
    organizationId: string,
    settings: Partial<OrganizationSettings>
  ): Promise<Organization> {
    const response = await apiClient.put<Organization>(
      `/organizations/${organizationId}/settings`,
      { settings },
      {
        withAuth: true,
        withToast: {
          loading: 'Mise à jour des paramètres...',
          success: 'Paramètres mis à jour avec succès'
        }
      }
    )
    return response
  }

  /**
   * Mettre à jour le branding de l'organisation
   */
  static async updateOrganizationBranding(
    organizationId: string,
    branding: Partial<OrganizationBranding>
  ): Promise<Organization> {
    const response = await apiClient.put<Organization>(
      `/organizations/${organizationId}/branding`,
      { branding },
      {
        withAuth: true,
        withToast: {
          loading: 'Mise à jour du branding...',
          success: 'Branding mis à jour avec succès'
        }
      }
    )
    return response
  }

  /**
   * Supprimer une organisation
   */
  static async deleteOrganization(organizationId: string): Promise<void> {
    await apiClient.delete(`/organizations/${organizationId}`, {
      withAuth: true,
      withToast: {
        loading: 'Suppression de l\'organisation...',
        success: 'Organisation supprimée avec succès'
      }
    })
  }

  /**
   * Vérifier la disponibilité d'un sous-domaine
   */
  static async checkSubdomainAvailability(subdomain: string): Promise<DomainCheckResponse> {
    const response = await apiClient.get<DomainCheckResponse>(
      `/organizations/check/subdomain/${subdomain}`,
      { withAuth: true }
    )
    return response
  }

  /**
   * Tester la configuration SMTP
   */
  static async testSmtpConfiguration(
    organizationId: string,
    smtpConfig: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `/organizations/${organizationId}/test-smtp`,
        smtpConfig,
        { withAuth: true }
      )
      return response
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erreur lors du test SMTP'
      }
    }
  }

  /**
   * Tester la configuration SMS
   */
  static async testSmsConfiguration(
    organizationId: string,
    smsConfig: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `/organizations/${organizationId}/test-sms`,
        smsConfig,
        { withAuth: true }
      )
      return response
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erreur lors du test SMS'
      }
    }
  }
}

export default OrganizationService