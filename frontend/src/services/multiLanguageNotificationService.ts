/**
 * Service pour la gestion des notifications multi-langues
 */

import {
  type NotificationTemplate,
  NotificationType,
  NotificationChannel,
  type SendNotificationRequest
} from '../shared';
import { apiService } from './apiService';

export interface MultiLanguageTemplate {
  baseTemplateId: string;
  organizationId: string;
  type: NotificationType;
  name: string;
  translations: {
    [language: string]: {
      subject: string;
      content: string;
      htmlContent?: string;
    };
  };
  defaultLanguage: string;
  variables: string[];
  channels: NotificationChannel[];
  isActive: boolean;
  priority?: string;
  category?: string;
}

export interface NotificationRecipient {
  userId?: string;
  email?: string;
  phone?: string;
  preferredLanguage?: string;
}

export interface MultiLanguageNotificationRequest {
  type: NotificationType;
  recipients: NotificationRecipient[];
  templateId?: string;
  variables?: Record<string, any>;
  channels: NotificationChannel[];
  priority?: string;
  organizationId: string;
  fallbackLanguage?: string;
}

export interface LanguageDetectionResult {
  userId?: string;
  email?: string;
  phone?: string;
  detectedLanguage: string;
  confidence: number;
  source: 'user_preference' | 'organization_default' | 'system_default' | 'auto_detect';
}

class MultiLanguageNotificationService {
  private readonly basePath = '/api/notifications';

  /**
   * Détecter automatiquement la langue d'un utilisateur
   */
  async detectUserLanguage(
    userId?: string,
    email?: string,
    phone?: string,
    organizationId?: string
  ): Promise<LanguageDetectionResult> {
    const response = await apiService.post<LanguageDetectionResult>(
      `${this.basePath}/detect-language`,
      { userId, email, phone, organizationId }
    );

    return response.data || {
      detectedLanguage: 'fr',
      confidence: 0,
      source: 'system_default'
    };
  }

  /**
   * Récupérer un template dans une langue spécifique
   */
  async getTemplateInLanguage(
    templateId: string,
    language: string,
    fallbackLanguage: string = 'fr'
  ): Promise<NotificationTemplate> {
    const response = await apiService.get<NotificationTemplate>(
      `${this.basePath}/templates/${templateId}`,
      {
        params: { language, fallbackLanguage }
      }
    );

    if (!response.success || !response.data) {
      throw new Error('Template not found');
    }

    return response.data;
  }

  /**
   * Créer un template multi-langues
   */
  async createMultiLanguageTemplate(template: Omit<MultiLanguageTemplate, 'baseTemplateId'>) {
    return apiService.post<MultiLanguageTemplate>(
      `${this.basePath}/templates/multilanguage`,
      template
    );
  }

  /**
   * Mettre à jour un template multi-langues
   */
  async updateMultiLanguageTemplate(
    templateId: string,
    updates: Partial<MultiLanguageTemplate>
  ) {
    return apiService.put<MultiLanguageTemplate>(
      `${this.basePath}/templates/multilanguage/${templateId}`,
      updates
    );
  }

  /**
   * Obtenir tous les templates multi-langues
   */
  async getMultiLanguageTemplates(organizationId: string, language?: string) {
    return apiService.get<MultiLanguageTemplate[]>(
      `${this.basePath}/templates/multilanguage`,
      {
        params: { organizationId, language }
      }
    );
  }

  /**
   * Envoyer une notification avec détection automatique de langue
   */
  async sendNotificationWithLanguageDetection(
    request: MultiLanguageNotificationRequest
  ) {
    // Détecter la langue pour chaque destinataire
    const recipientsWithLanguage = await Promise.all(
      request.recipients.map(async (recipient) => {
        if (recipient.preferredLanguage) {
          return {
            ...recipient,
            detectedLanguage: recipient.preferredLanguage,
            confidence: 1.0,
            source: 'explicit' as const
          };
        }

        const detection = await this.detectUserLanguage(
          recipient.userId,
          recipient.email,
          recipient.phone,
          request.organizationId
        );

        return {
          ...recipient,
          ...detection
        };
      })
    );

    // Grouper les destinataires par langue
    const recipientsByLanguage = recipientsWithLanguage.reduce((acc, recipient) => {
      const lang = recipient.detectedLanguage;
      if (!acc[lang]) {
        acc[lang] = [];
      }
      acc[lang].push(recipient);
      return acc;
    }, {} as Record<string, typeof recipientsWithLanguage>);

    // Envoyer les notifications pour chaque langue
    const results = await Promise.all(
      Object.entries(recipientsByLanguage).map(async ([language, recipients]) => {
        try {
          // Récupérer le template dans la langue appropriée
          let template: NotificationTemplate | null = null;
          if (request.templateId) {
            try {
              template = await this.getTemplateInLanguage(
                request.templateId,
                language,
                request.fallbackLanguage
              );
            } catch (error) {
              console.warn(`Template not found for language ${language}, using fallback`);
            }
          }

          // Préparer la requête de notification
          const userIds = recipients.map(r => r.userId).filter(Boolean) as string[];
          const notificationRequest: SendNotificationRequest = {
            userId: userIds[0] || 'system', // Required field - use first user or system
            userIds: userIds.length > 1 ? userIds : [], // Use userIds for multiple recipients
            type: request.type,
            title: template?.subject || `Notification (${language})`,
            message: this.interpolateTemplate(
              template?.content || 'Notification content',
              request.variables || {}
            ),
            channels: request.channels,
            priority: request.priority as any,
            templateId: template?.id,
            data: {
              language,
              variables: request.variables,
              originalRecipients: recipients
            },
          };

          // Envoyer la notification
          const response = await apiService.post(
            `${this.basePath}/send`,
            notificationRequest
          );

          return {
            language,
            recipients: recipients.length,
            success: response.success,
            error: response.success ? null : response.error
          };

        } catch (error) {
          return {
            language,
            recipients: recipients.length,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return {
      totalRecipients: request.recipients.length,
      languageBreakdown: results,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  }

  /**
   * Envoyer des notifications en masse avec support multi-langues
   */
  async sendBulkMultiLanguageNotifications(
    notifications: MultiLanguageNotificationRequest[]
  ) {
    const results = await Promise.all(
      notifications.map(notification =>
        this.sendNotificationWithLanguageDetection(notification)
      )
    );

    return {
      totalNotifications: notifications.length,
      totalRecipients: results.reduce((sum, r) => sum + r.totalRecipients, 0),
      successful: results.reduce((sum, r) => sum + r.successful, 0),
      failed: results.reduce((sum, r) => sum + r.failed, 0),
      results
    };
  }

  /**
   * Obtenir les langues supportées par l'organisation
   */
  async getSupportedLanguages(organizationId: string) {
    const response = await apiService.get<{
      supported: string[];
      default: string;
      fallback: string;
    }>(`${this.basePath}/languages/${organizationId}`);

    return response.data || {
      supported: ['fr', 'en'],
      default: 'fr',
      fallback: 'fr'
    };
  }

  /**
   * Configurer les langues supportées par l'organisation
   */
  async configureSupportedLanguages(
    organizationId: string,
    config: {
      supported: string[];
      default: string;
      fallback: string;
    }
  ) {
    return apiService.put(
      `${this.basePath}/languages/${organizationId}`,
      config
    );
  }

  /**
   * Prévisualiser une notification dans différentes langues
   */
  async previewNotificationInLanguages(
    templateId: string,
    variables: Record<string, any>,
    languages: string[]
  ) {
    const previews = await Promise.all(
      languages.map(async (language) => {
        try {
          const template = await this.getTemplateInLanguage(templateId, language);
          return {
            language,
            subject: this.interpolateTemplate(template.subject, variables),
            content: this.interpolateTemplate(template.content, variables),
            htmlContent: template.htmlContent
              ? this.interpolateTemplate(template.htmlContent, variables)
              : undefined,
            success: true
          };
        } catch (error) {
          return {
            language,
            subject: '',
            content: '',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return previews;
  }

  /**
   * Obtenir les statistiques d'utilisation des langues
   */
  async getLanguageUsageStats(organizationId: string, timeframe?: {
    startDate: string;
    endDate: string;
  }) {
    return apiService.get<{
      totalNotifications: number;
      byLanguage: Record<string, number>;
      byChannel: Record<string, Record<string, number>>;
      detectionSources: Record<string, number>;
    }>(`${this.basePath}/stats/languages/${organizationId}`, {
      params: timeframe
    });
  }

  /**
   * Interpoler les variables dans un template
   */
  private interpolateTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  /**
   * Valider un template multi-langues
   */
  async validateMultiLanguageTemplate(template: Partial<MultiLanguageTemplate>) {
    return apiService.post<{
      valid: boolean;
      errors: Array<{
        language?: string;
        field: string;
        message: string;
      }>;
      warnings: Array<{
        language?: string;
        field: string;
        message: string;
      }>;
    }>(`${this.basePath}/templates/validate`, template);
  }

  /**
   * Importer des templates depuis un fichier
   */
  async importTemplates(organizationId: string, file: File, options?: {
    overwriteExisting?: boolean;
    validateOnly?: boolean;
  }) {
    // Convert options to string values for FormData
    const additionalData: Record<string, string> = {
      organizationId
    };

    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        additionalData[key] = String(value);
      });
    }

    return apiService.upload<{
      imported: number;
      updated: number;
      failed: number;
      errors: Array<{
        template: string;
        error: string;
      }>;
    }>(`${this.basePath}/templates/import`, file, additionalData);
  }

  /**
   * Exporter des templates
   */
  async exportTemplates(organizationId: string, options?: {
    languages?: string[];
    templateIds?: string[];
    format?: 'json' | 'csv';
  }): Promise<void> {
    try {
      // Build URL with parameters
      const url = new URL(`${window.location.origin}/api${this.basePath}/templates/export/${organizationId}`);
      if (options) {
        Object.entries(options).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => url.searchParams.append(key, String(v)));
            } else {
              url.searchParams.append(key, String(value));
            }
          }
        });
      }

      // Make direct fetch request for blob response
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const format = options?.format || 'json';
      link.setAttribute('download', `notification-templates.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      console.error('Error exporting templates:', error);
      throw new Error(error.message || 'Failed to export templates');
    }
  }
}

export const multiLanguageNotificationService = new MultiLanguageNotificationService();