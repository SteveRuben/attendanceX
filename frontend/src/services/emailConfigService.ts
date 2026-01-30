import { apiClient } from './apiClient';

export interface EmailProvider {
  id: string;
  type: EmailProviderType;
  name: string;
  isActive: boolean;
  priority: number;
  config: any;
  createdAt: string;
  updatedAt: string;
  isGlobal?: boolean;
}

export interface CreateEmailProviderRequest {
  type: EmailProviderType;
  name: string;
  isActive: boolean;
  priority: number;
  config: any;
}

export interface UpdateEmailProviderRequest {
  name?: string;
  isActive?: boolean;
  priority?: number;
  config?: any;
}

export interface TestEmailProviderRequest {
  type: EmailProviderType;
  config: any;
  testEmail: string;
}

export interface TestEmailProviderResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface ProviderTypeInfo {
  type: EmailProviderType;
  name: string;
  description: string;
  configSchema: any;
}

export enum EmailProviderType {
  SENDGRID = 'sendgrid',
  MAILGUN = 'mailgun',
  AWS_SES = 'aws_ses',
  SMTP = 'smtp'
}

export const emailConfigService = {
  /**
   * Récupérer tous les providers email du tenant
   */
  async getEmailProviders(): Promise<EmailProvider[]> {
    return await apiClient.get<EmailProvider[]>('/api/admin/email-providers', { withAuth: true });
  },

  /**
   * Récupérer les types de providers disponibles
   */
  async getAvailableProviderTypes(): Promise<ProviderTypeInfo[]> {
    return await apiClient.get<ProviderTypeInfo[]>('/api/admin/email-providers/types', { withAuth: true });
  },

  /**
   * Créer une nouvelle configuration email
   */
  async createEmailProvider(providerData: CreateEmailProviderRequest): Promise<EmailProvider> {
    return await apiClient.post<EmailProvider>('/api/admin/email-providers', providerData, { 
      withAuth: true,
      withToast: { 
        loading: 'Création de la configuration...', 
        success: 'Configuration créée avec succès' 
      }
    });
  },

  /**
   * Mettre à jour une configuration email
   */
  async updateEmailProvider(providerId: string, updateData: UpdateEmailProviderRequest): Promise<EmailProvider> {
    return await apiClient.put<EmailProvider>(`/api/admin/email-providers/${providerId}`, updateData, { 
      withAuth: true,
      withToast: { 
        loading: 'Mise à jour de la configuration...', 
        success: 'Configuration mise à jour avec succès' 
      }
    });
  },

  /**
   * Supprimer une configuration email
   */
  async deleteEmailProvider(providerId: string): Promise<void> {
    await apiClient.delete(`/api/admin/email-providers/${providerId}`, { 
      withAuth: true,
      withToast: { 
        loading: 'Suppression de la configuration...', 
        success: 'Configuration supprimée avec succès' 
      }
    });
  },

  /**
   * Tester une configuration email
   */
  async testEmailProvider(testData: TestEmailProviderRequest): Promise<TestEmailProviderResult> {
    return await apiClient.post<TestEmailProviderResult>('/api/admin/email-providers/test', testData, { 
      withAuth: true,
      withToast: { 
        loading: 'Test de la configuration en cours...' 
      }
    });
  }
};