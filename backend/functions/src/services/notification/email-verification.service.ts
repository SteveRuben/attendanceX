// backend/functions/src/services/notification/email-verification.service.ts

import { NotificationChannel, NotificationPriority, NotificationStatus, NotificationType } from "@attendance-x/shared";
import { logger } from "firebase-functions";
import { collections } from "../../config";
import { NotificationService } from "./notification.service";
import { TemplateService } from "./TemplateService";
import { EMAIL_VERIFICATION_TEMPLATE, EMAIL_VERIFICATION_NOTIFICATION_TEMPLATE } from "./templates/email-verification.template";

export interface EmailVerificationData {
  userId: string;
  userName: string;
  email: string;
  token: string;
  expirationHours?: number;
}

export interface VerificationUrlOptions {
  baseUrl?: string;
  routePath?: string;
}

/**
 * Service spécialisé pour l'envoi d'emails de vérification
 * Intègre avec le système de notification existant
 */
export class EmailVerificationService {
  private readonly notificationService: NotificationService;
  private readonly templateService: TemplateService;
  private readonly defaultExpirationHours = 24;
  private readonly defaultBaseUrl = process.env.FRONTEND_URL || 'https://app.attendance-x.com';
  private readonly defaultRoutePath = '/verify-email';
  private readonly supportEmail = process.env.SUPPORT_EMAIL || 'support@attendance-x.com';
  private readonly appName = process.env.APP_NAME || 'Attendance-X';

  constructor() {
    this.notificationService = new NotificationService();
    this.templateService = new TemplateService();
    this.initializeTemplate();
  }

  /**
   * Envoie un email de vérification à un utilisateur
   */
  async sendEmailVerification(
    data: EmailVerificationData,
    options: VerificationUrlOptions = {}
  ): Promise<{
    success: boolean;
    notificationId?: string;
    error?: string;
  }> {
    try {
      logger.info('Sending email verification', {
        userId: data.userId,
        email: data.email
      });

      // Générer l'URL de vérification
      const verificationUrl = this.generateVerificationUrl(data.token, options);
      
      // Préparer les variables du template
      const templateVariables = {
        userName: data.userName,
        verificationUrl,
        expirationTime: this.formatExpirationTime(data.expirationHours || this.defaultExpirationHours),
        supportEmail: this.supportEmail,
        appName: this.appName
      };

      // Valider les variables du template
      const missingVariables = this.templateService.validateTemplateVariables(
        EMAIL_VERIFICATION_TEMPLATE.textContent,
        templateVariables
      );

      if (missingVariables.length > 0) {
        logger.warn('Missing template variables', { missingVariables });
      }

      // Envoyer la notification via le service de notification
      const notification = await this.notificationService.sendNotification({
        userId: data.userId,
        type: NotificationType.EMAIL_VERIFICATION,
        title: this.templateService.processTemplate(
          EMAIL_VERIFICATION_NOTIFICATION_TEMPLATE.title,
          templateVariables
        ),
        message: this.templateService.processTemplate(
          EMAIL_VERIFICATION_NOTIFICATION_TEMPLATE.content,
          templateVariables
        ),
        data: {
          email: data.email,
          token: data.token,
          verificationUrl,
          expirationHours: data.expirationHours || this.defaultExpirationHours
        },
        channels: [NotificationChannel.EMAIL],
        priority: NotificationPriority.HIGH,
        sentBy: 'system'
      });

      logger.info('Email verification sent successfully', {
        userId: data.userId,
        notificationId: notification.id,
        email: data.email
      });

      return {
        success: true,
        notificationId: notification.id
      };

    } catch (error) {
      logger.error('Failed to send email verification', {
        userId: data.userId,
        email: data.email,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Génère l'URL de vérification avec le token
   */
  generateVerificationUrl(
    token: string,
    options: VerificationUrlOptions = {}
  ): string {
    const baseUrl = options.baseUrl || this.defaultBaseUrl;
    const routePath = options.routePath || this.defaultRoutePath;
    
    // Nettoyer l'URL de base (supprimer le slash final s'il existe)
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    
    // Nettoyer le chemin de route (s'assurer qu'il commence par /)
    const cleanRoutePath = routePath.startsWith('/') ? routePath : `/${routePath}`;
    
    // Construire l'URL complète avec le token en paramètre
    const verificationUrl = `${cleanBaseUrl}${cleanRoutePath}?token=${encodeURIComponent(token)}`;
    
    logger.debug('Generated verification URL', {
      baseUrl: cleanBaseUrl,
      routePath: cleanRoutePath,
      hasToken: !!token
    });

    return verificationUrl;
  }

  /**
   * Formate le temps d'expiration en français
   */
  private formatExpirationTime(hours: number): string {
    if (hours === 1) {
      return '1 heure';
    } else if (hours < 24) {
      return `${hours} heures`;
    } else if (hours === 24) {
      return '24 heures (1 jour)';
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      
      if (remainingHours === 0) {
        return days === 1 ? '1 jour' : `${days} jours`;
      } else {
        return `${days} jour${days > 1 ? 's' : ''} et ${remainingHours} heure${remainingHours > 1 ? 's' : ''}`;
      }
    }
  }

  /**
   * Initialise le template d'email de vérification dans la base de données
   * Cette méthode est appelée au démarrage pour s'assurer que le template existe
   */
  private async initializeTemplate(): Promise<void> {
    try {
      // Vérifier si le template existe déjà
      const existingTemplate = await this.templateService.getEmailTemplate('email_verification');
      
      if (!existingTemplate) {
        logger.info('Creating email verification template');
        
        // Créer le template avec les métadonnées complètes
        const templateToCreate = {
          ...EMAIL_VERIFICATION_TEMPLATE,
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await this.templateService.saveEmailTemplate(templateToCreate);
        
        logger.info('Email verification template created successfully');
      } else {
        logger.debug('Email verification template already exists');
      }

      // Également créer/mettre à jour le template de notification
      await this.initializeNotificationTemplate();

    } catch (error) {
      logger.error('Failed to initialize email verification template', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Initialise le template de notification pour la vérification d'email
   */
  private async initializeNotificationTemplate(): Promise<void> {
    try {
      const templateId = EMAIL_VERIFICATION_NOTIFICATION_TEMPLATE.id;
      
      // Vérifier si le template de notification existe
      const existingNotificationTemplate = await collections.notification_templates
        .doc(templateId)
        .get();

      if (!existingNotificationTemplate.exists) {
        logger.info('Creating email verification notification template');
        
        await collections.notification_templates.doc(templateId).set({
          ...EMAIL_VERIFICATION_NOTIFICATION_TEMPLATE,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system'
        });
        
        logger.info('Email verification notification template created successfully');
      } else {
        logger.debug('Email verification notification template already exists');
      }

    } catch (error) {
      logger.error('Failed to initialize notification template', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Met à jour le template d'email de vérification
   */
  async updateEmailTemplate(updates: Partial<typeof EMAIL_VERIFICATION_TEMPLATE>): Promise<void> {
    try {
      const existingTemplate = await this.templateService.getEmailTemplate('email_verification');
      
      if (!existingTemplate) {
        throw new Error('Email verification template not found');
      }

      const updatedTemplate = {
        ...existingTemplate,
        ...updates,
        lastModifiedBy: 'system',
        updatedAt: new Date(),
        version: (existingTemplate.version || 1) + 1
      };

      await this.templateService.saveEmailTemplate(updatedTemplate);
      
      logger.info('Email verification template updated successfully');

    } catch (error) {
      logger.error('Failed to update email verification template', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Récupère les statistiques d'envoi des emails de vérification
   */
  async getVerificationStats(timeRange: { start: Date; end: Date }): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: number;
  }> {
    try {
      const notifications = await this.notificationService.getNotifications({
        type: NotificationType.EMAIL_VERIFICATION,
        dateRange: timeRange,
        limit: 1000 // Ajuster selon les besoins
      });

      const stats = notifications.notifications.reduce(
        (acc, notification) => {
          acc.totalSent++;
          
          if (notification.delivered) {
            acc.totalDelivered++;
          }
          
          if (notification.status === NotificationStatus.FAILED) {
            acc.totalFailed++;
          }
          
          return acc;
        },
        { totalSent: 0, totalDelivered: 0, totalFailed: 0 }
      );

      const deliveryRate = stats.totalSent > 0 
        ? (stats.totalDelivered / stats.totalSent) * 100 
        : 0;

      return {
        ...stats,
        deliveryRate: Math.round(deliveryRate * 100) / 100
      };

    } catch (error) {
      logger.error('Failed to get verification stats', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        deliveryRate: 0
      };
    }
  }
}

// Export d'une instance singleton
export const emailVerificationService = new EmailVerificationService();