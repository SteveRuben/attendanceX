/**
 * Service de notifications brandées pour les tenants
 * Génère des notifications avec le branding personnalisé du tenant
 */

import { tenantBrandingService } from '../branding/tenant-branding.service';
import { emailService } from './email.service';
import { TenantError, TenantErrorCode } from '../../shared/types/tenant.types';

export interface BrandedEmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

export interface BrandedNotificationOptions {
  tenantId: string;
  templateName: string;
  recipientEmail: string;
  recipientName?: string;
  variables?: Record<string, any>;
  attachments?: EmailAttachment[];
}

export interface SMSNotificationOptions {
  tenantId: string;
  templateName: string;
  phoneNumber: string;
  variables?: Record<string, any>;
}

export interface InAppNotificationOptions {
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  actionText?: string;
}

export interface PDFReportOptions {
  tenantId: string;
  templateName: string;
  data: any;
  filename: string;
}

export class BrandedNotificationService {

  /**
   * Envoyer un email brandé
   */
  async sendBrandedEmail(options: BrandedNotificationOptions): Promise<void> {
    try {
      // Obtenir le branding du tenant
      const branding = await tenantBrandingService.getTenantBranding(options.tenantId);
      
      // Générer le template brandé
      const template = await this.generateBrandedEmailTemplate(
        options.templateName,
        options.variables || {},
        branding
      );

      // Envoyer l'email
      await emailService.sendEmail({
        to: options.recipientEmail,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent,
        attachments: options.attachments
      });
    } catch (error) {
      console.error('Error sending branded email:', error);
      throw new TenantError(
        'Failed to send branded email',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Envoyer un SMS brandé
   */
  async sendBrandedSMS(options: SMSNotificationOptions): Promise<void> {
    try {
      // Obtenir le branding du tenant
      const branding = await tenantBrandingService.getTenantBranding(options.tenantId);
      
      // Générer le contenu SMS brandé
      const content = await this.generateBrandedSMSContent(
        options.templateName,
        options.variables || {},
        branding
      );

      // Envoyer le SMS (simulation)
      console.log(`Sending SMS to ${options.phoneNumber}: ${content}`);
      
      // Dans un vrai environnement, utiliser un service comme Twilio
      // await twilioService.sendSMS(options.phoneNumber, content);
    } catch (error) {
      console.error('Error sending branded SMS:', error);
      throw new TenantError(
        'Failed to send branded SMS',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Créer une notification in-app brandée
   */
  async createInAppNotification(options: InAppNotificationOptions): Promise<void> {
    try {
      // Obtenir le branding du tenant
      const branding = await tenantBrandingService.getTenantBranding(options.tenantId);
      
      // Créer la notification avec le style brandé
      const notification = {
        id: this.generateNotificationId(),
        tenantId: options.tenantId,
        userId: options.userId,
        title: options.title,
        message: options.message,
        type: options.type,
        actionUrl: options.actionUrl,
        actionText: options.actionText,
        styling: {
          primaryColor: branding?.primaryColor || '#1e40af',
          accentColor: branding?.accentColor || '#60a5fa',
          fontFamily: branding?.fontFamily || 'inherit'
        },
        read: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
      };

      // Sauvegarder la notification (simulation)
      console.log('Creating in-app notification:', notification);
      
      // Dans un vrai environnement, sauvegarder en base de données
      // await collections.notifications.add(notification);
    } catch (error) {
      console.error('Error creating in-app notification:', error);
      throw new TenantError(
        'Failed to create in-app notification',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Générer un rapport PDF brandé
   */
  async generateBrandedPDFReport(options: PDFReportOptions): Promise<Buffer> {
    try {
      // Obtenir le branding du tenant
      const branding = await tenantBrandingService.getTenantBranding(options.tenantId);
      
      // Générer le HTML brandé pour le PDF
      //@ts-ignore
      const htmlContent = await this.generateBrandedReportHTML(
        options.templateName,
        options.data,
        branding
      );

      // Générer le PDF (simulation)
      console.log('Generating branded PDF report:', options.filename);
      
      // Dans un vrai environnement, utiliser une bibliothèque comme Puppeteer
      // const pdf = await puppeteer.generatePDF(htmlContent);
      
      // Pour la simulation, retourner un buffer vide
      return Buffer.from('PDF content would be here');
    } catch (error) {
      console.error('Error generating branded PDF report:', error);
      throw new TenantError(
        'Failed to generate branded PDF report',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Générer un template email brandé
   */
  private async generateBrandedEmailTemplate(
    templateName: string,
    variables: Record<string, any>,
    branding: any
  ): Promise<BrandedEmailTemplate> {
    const baseTemplate = this.getBaseEmailTemplate(templateName);
    
    // Appliquer le branding
    const brandedHTML = this.applyBrandingToHTML(baseTemplate.html, branding, variables);
    const brandedText = this.applyVariablesToText(baseTemplate.text, variables);
    const brandedSubject = this.applyVariablesToText(baseTemplate.subject, variables);

    return {
      subject: brandedSubject,
      htmlContent: brandedHTML,
      textContent: brandedText
    };
  }

  /**
   * Générer le contenu SMS brandé
   */
  private async generateBrandedSMSContent(
    templateName: string,
    variables: Record<string, any>,
    branding: any
  ): Promise<string> {
    const baseTemplate = this.getBaseSMSTemplate(templateName);
    
    // Appliquer les variables
    let content = this.applyVariablesToText(baseTemplate, variables);
    
    // Ajouter une signature brandée si disponible
    if (branding?.logoUrl || variables.tenantName) {
      content += `\n\n- ${variables.tenantName || 'Votre équipe'}`;
    }

    return content;
  }

  /**
   * Générer le HTML brandé pour un rapport
   */
  private async generateBrandedReportHTML(
    templateName: string,
    data: any,
    branding: any
  ): Promise<string> {
    const baseTemplate = this.getBaseReportTemplate(templateName);
    
    // Appliquer le branding et les données
    return this.applyBrandingToHTML(baseTemplate, branding, data);
  }

  /**
   * Appliquer le branding au HTML
   */
  private applyBrandingToHTML(
    html: string,
    branding: any,
    variables: Record<string, any>
  ): string {
    let brandedHTML = html;

    // Remplacer les variables
    brandedHTML = this.applyVariablesToText(brandedHTML, variables);

    // Appliquer les couleurs
    if (branding?.primaryColor) {
      brandedHTML = brandedHTML.replace(/{{PRIMARY_COLOR}}/g, branding.primaryColor);
    }
    if (branding?.secondaryColor) {
      brandedHTML = brandedHTML.replace(/{{SECONDARY_COLOR}}/g, branding.secondaryColor);
    }
    if (branding?.accentColor) {
      brandedHTML = brandedHTML.replace(/{{ACCENT_COLOR}}/g, branding.accentColor);
    }
    if (branding?.backgroundColor) {
      brandedHTML = brandedHTML.replace(/{{BACKGROUND_COLOR}}/g, branding.backgroundColor);
    }
    if (branding?.textColor) {
      brandedHTML = brandedHTML.replace(/{{TEXT_COLOR}}/g, branding.textColor);
    }

    // Appliquer le logo
    if (branding?.logoUrl) {
      brandedHTML = brandedHTML.replace(/{{LOGO_URL}}/g, branding.logoUrl);
      brandedHTML = brandedHTML.replace(/{{SHOW_LOGO}}/g, 'block');
    } else {
      brandedHTML = brandedHTML.replace(/{{LOGO_URL}}/g, '');
      brandedHTML = brandedHTML.replace(/{{SHOW_LOGO}}/g, 'none');
    }

    // Appliquer les polices
    if (branding?.fontFamily) {
      brandedHTML = brandedHTML.replace(/{{FONT_FAMILY}}/g, branding.fontFamily);
    }
    if (branding?.headingFontFamily) {
      brandedHTML = brandedHTML.replace(/{{HEADING_FONT_FAMILY}}/g, branding.headingFontFamily);
    }

    // Nettoyer les variables non remplacées
    brandedHTML = brandedHTML.replace(/{{[^}]+}}/g, '');

    return brandedHTML;
  }

  /**
   * Appliquer les variables au texte
   */
  private applyVariablesToText(text: string, variables: Record<string, any>): string {
    let result = text;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    return result;
  }

  /**
   * Obtenir le template email de base
   */
  private getBaseEmailTemplate(templateName: string): { subject: string; html: string; text: string } {
    const templates = {
      welcome: {
        subject: 'Bienvenue chez {{tenantName}} !',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: {{FONT_FAMILY}}, Arial, sans-serif; color: {{TEXT_COLOR}}; background-color: {{BACKGROUND_COLOR}}; }
              .header { background-color: {{PRIMARY_COLOR}}; padding: 20px; text-align: center; }
              .logo { display: {{SHOW_LOGO}}; max-height: 60px; }
              .content { padding: 30px; }
              .button { background-color: {{ACCENT_COLOR}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
              .footer { background-color: {{SECONDARY_COLOR}}; padding: 20px; text-align: center; color: white; }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="{{LOGO_URL}}" alt="Logo" class="logo">
              <h1 style="color: white; font-family: {{HEADING_FONT_FAMILY}}, Arial, sans-serif;">{{tenantName}}</h1>
            </div>
            <div class="content">
              <h2>Bienvenue {{userName}} !</h2>
              <p>Nous sommes ravis de vous accueillir dans notre plateforme.</p>
              <p>Voici ce que vous pouvez faire maintenant :</p>
              <ul>
                <li>Configurer votre profil</li>
                <li>Explorer les fonctionnalités</li>
                <li>Inviter votre équipe</li>
              </ul>
              <p><a href="{{actionUrl}}" class="button">Commencer</a></p>
            </div>
            <div class="footer">
              <p>&copy; {{currentYear}} {{tenantName}}. Tous droits réservés.</p>
            </div>
          </body>
          </html>
        `,
        text: `
          Bienvenue {{userName}} !
          
          Nous sommes ravis de vous accueillir chez {{tenantName}}.
          
          Voici ce que vous pouvez faire maintenant :
          - Configurer votre profil
          - Explorer les fonctionnalités
          - Inviter votre équipe
          
          Commencez dès maintenant : {{actionUrl}}
          
          Cordialement,
          L'équipe {{tenantName}}
        `
      },
      invitation: {
        subject: '{{inviterName}} vous invite à rejoindre {{tenantName}}',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: {{FONT_FAMILY}}, Arial, sans-serif; color: {{TEXT_COLOR}}; background-color: {{BACKGROUND_COLOR}}; }
              .header { background-color: {{PRIMARY_COLOR}}; padding: 20px; text-align: center; }
              .logo { display: {{SHOW_LOGO}}; max-height: 60px; }
              .content { padding: 30px; }
              .button { background-color: {{ACCENT_COLOR}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
              .footer { background-color: {{SECONDARY_COLOR}}; padding: 20px; text-align: center; color: white; }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="{{LOGO_URL}}" alt="Logo" class="logo">
              <h1 style="color: white; font-family: {{HEADING_FONT_FAMILY}}, Arial, sans-serif;">{{tenantName}}</h1>
            </div>
            <div class="content">
              <h2>Vous êtes invité(e) !</h2>
              <p>{{inviterName}} vous invite à rejoindre {{tenantName}}.</p>
              <p>Rôle : {{role}}</p>
              <p><a href="{{invitationUrl}}" class="button">Accepter l'invitation</a></p>
              <p><small>Cette invitation expire le {{expirationDate}}.</small></p>
            </div>
            <div class="footer">
              <p>&copy; {{currentYear}} {{tenantName}}. Tous droits réservés.</p>
            </div>
          </body>
          </html>
        `,
        text: `
          Vous êtes invité(e) !
          
          {{inviterName}} vous invite à rejoindre {{tenantName}}.
          Rôle : {{role}}
          
          Accepter l'invitation : {{invitationUrl}}
          
          Cette invitation expire le {{expirationDate}}.
          
          Cordialement,
          L'équipe {{tenantName}}
        `
      },
      payment_failed: {
        subject: 'Problème de paiement - {{tenantName}}',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: {{FONT_FAMILY}}, Arial, sans-serif; color: {{TEXT_COLOR}}; background-color: {{BACKGROUND_COLOR}}; }
              .header { background-color: {{PRIMARY_COLOR}}; padding: 20px; text-align: center; }
              .logo { display: {{SHOW_LOGO}}; max-height: 60px; }
              .content { padding: 30px; }
              .button { background-color: {{ACCENT_COLOR}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
              .alert { background-color: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 4px; margin: 20px 0; }
              .footer { background-color: {{SECONDARY_COLOR}}; padding: 20px; text-align: center; color: white; }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="{{LOGO_URL}}" alt="Logo" class="logo">
              <h1 style="color: white; font-family: {{HEADING_FONT_FAMILY}}, Arial, sans-serif;">{{tenantName}}</h1>
            </div>
            <div class="content">
              <div class="alert">
                <h2>Problème de paiement</h2>
                <p>Nous n'avons pas pu traiter votre paiement pour la facture {{invoiceNumber}}.</p>
              </div>
              <p>Montant : {{amount}} {{currency}}</p>
              <p>Date d'échéance : {{dueDate}}</p>
              <p>Pour éviter toute interruption de service, veuillez mettre à jour votre méthode de paiement.</p>
              <p><a href="{{paymentUrl}}" class="button">Mettre à jour le paiement</a></p>
            </div>
            <div class="footer">
              <p>&copy; {{currentYear}} {{tenantName}}. Tous droits réservés.</p>
            </div>
          </body>
          </html>
        `,
        text: `
          Problème de paiement - {{tenantName}}
          
          Nous n'avons pas pu traiter votre paiement pour la facture {{invoiceNumber}}.
          
          Montant : {{amount}} {{currency}}
          Date d'échéance : {{dueDate}}
          
          Pour éviter toute interruption de service, veuillez mettre à jour votre méthode de paiement.
          
          Mettre à jour le paiement : {{paymentUrl}}
          
          Cordialement,
          L'équipe {{tenantName}}
        `
      }
    };

    return templates[templateName as keyof typeof templates] || templates.welcome;
  }

  /**
   * Obtenir le template SMS de base
   */
  private getBaseSMSTemplate(templateName: string): string {
    const templates = {
      welcome: 'Bienvenue {{userName}} chez {{tenantName}} ! Commencez dès maintenant : {{actionUrl}}',
      invitation: '{{inviterName}} vous invite à rejoindre {{tenantName}}. Acceptez : {{invitationUrl}}',
      payment_reminder: 'Rappel : Votre facture {{invoiceNumber}} de {{amount}} {{currency}} est due. Payez : {{paymentUrl}}',
      security_alert: 'Alerte sécurité {{tenantName}} : {{alertMessage}}. Si ce n\'est pas vous, contactez le support.'
    };

    return templates[templateName as keyof typeof templates] || templates.welcome;
  }

  /**
   * Obtenir le template de rapport de base
   */
  private getBaseReportTemplate(templateName: string): string {
    const templates = {
      usage_report: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: {{FONT_FAMILY}}, Arial, sans-serif; color: {{TEXT_COLOR}}; }
            .header { background-color: {{PRIMARY_COLOR}}; color: white; padding: 20px; text-align: center; }
            .logo { display: {{SHOW_LOGO}}; max-height: 60px; }
            .content { padding: 30px; }
            .metric { background-color: {{BACKGROUND_COLOR}}; border: 1px solid {{ACCENT_COLOR}}; padding: 15px; margin: 10px 0; border-radius: 4px; }
            .footer { background-color: {{SECONDARY_COLOR}}; color: white; padding: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="{{LOGO_URL}}" alt="Logo" class="logo">
            <h1 style="font-family: {{HEADING_FONT_FAMILY}}, Arial, sans-serif;">Rapport d'utilisation</h1>
            <p>{{reportPeriod}}</p>
          </div>
          <div class="content">
            <h2>Résumé de l'utilisation</h2>
            <div class="metric">
              <h3>Utilisateurs actifs</h3>
              <p>{{activeUsers}} utilisateurs</p>
            </div>
            <div class="metric">
              <h3>Événements créés</h3>
              <p>{{eventsCreated}} événements</p>
            </div>
            <div class="metric">
              <h3>Stockage utilisé</h3>
              <p>{{storageUsed}} / {{storageLimit}}</p>
            </div>
          </div>
          <div class="footer">
            <p>Généré le {{generatedDate}} pour {{tenantName}}</p>
          </div>
        </body>
        </html>
      `,
      invoice: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: {{FONT_FAMILY}}, Arial, sans-serif; color: {{TEXT_COLOR}}; }
            .header { background-color: {{PRIMARY_COLOR}}; color: white; padding: 20px; }
            .logo { display: {{SHOW_LOGO}}; max-height: 60px; float: left; }
            .invoice-info { float: right; text-align: right; }
            .content { padding: 30px; clear: both; }
            .line-item { border-bottom: 1px solid #eee; padding: 10px 0; }
            .total { background-color: {{ACCENT_COLOR}}; color: white; padding: 15px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="{{LOGO_URL}}" alt="Logo" class="logo">
            <div class="invoice-info">
              <h1 style="font-family: {{HEADING_FONT_FAMILY}}, Arial, sans-serif;">Facture</h1>
              <p>N° {{invoiceNumber}}</p>
              <p>Date : {{invoiceDate}}</p>
            </div>
          </div>
          <div class="content">
            <h2>Détails de facturation</h2>
            {{#lineItems}}
            <div class="line-item">
              <span>{{description}}</span>
              <span style="float: right;">{{amount}} {{currency}}</span>
            </div>
            {{/lineItems}}
            <div class="total">
              <span>Total : {{totalAmount}} {{currency}}</span>
            </div>
          </div>
        </body>
        </html>
      `
    };

    return templates[templateName as keyof typeof templates] || templates.usage_report;
  }

  /**
   * Générer un ID de notification unique
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

// Instance singleton
export const brandedNotificationService = new BrandedNotificationService();
export default brandedNotificationService;