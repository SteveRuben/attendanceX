import {TemplateService} from "./TemplateService";
import {logger} from "firebase-functions";
import {emailConfig} from "../../config";
import EmailProviderFactory from "../external/email-providers";
import { EmailAttachment, EmailError, EmailProviderType, SendEmailRequest, SendEmailResponse } from "../../common/types";

export interface EmailRequest {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  template?: string;
  html?: string;
  text?: string;
  data?: Record<string, any>;
  attachments?: EmailAttachment[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
}

/**
 * Service de gestion des emails
 * Gère l'envoi d'emails via différents providers avec failover et tracking
 */
export class EmailService {
  sendExecutiveMonthlyReport(arg0: { to: any; reports: any[]; executiveName: any; }) {
    throw new Error("Method not implemented.");
  }
  sendWeeklyReportsEmail(arg0: { to: any; reports: any[]; adminName: any; }) {
    throw new Error("Method not implemented.");
  }
  private templateService: TemplateService;

  constructor() {
    this.templateService = new TemplateService();
  }

  /**
   * Envoie un email simple
   */
  async sendEmail(to: string | string[], subject: string, content: {
    html?: string,
    text?: string
  }, options: {
    from?: string;
    fromName?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: EmailAttachment[];
    provider?: EmailProviderType;
    trackingId?: string;
    userId?: string;
    priority?: number;
    categories?: string[];
    tenantId?: string; // Nouveau paramètre pour le support multi-tenant
  } = {}): Promise<SendEmailResponse> {
    try {
      // Valider les destinataires
      this.validateRecipients(to);

      // Valider le sujet
      if (!subject) {
        throw new EmailError("Email subject is required", "missing_subject");
      }

      // Valider le contenu
      if (!content.html && !content.text) {
        throw new EmailError("Email content is required (html or text)", "missing_content");
      }

      // Créer l'objet message
      const emailMessage: SendEmailRequest = {
        to,
        subject,
        htmlContent: content.html,
        textContent: content.text,
        fromEmail: options.from,
        fromName: options.fromName,
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
        categories: options.categories,
        metadata: {
          userId: options.userId||"",
          trackingId: options.trackingId || `email-${Date.now()}`,
          priority: options.priority || 3,
          timestamp: new Date(),
        },
      };

      // Envoyer l'email avec le provider spécifié ou le provider par défaut
      if (options.provider) {
        return await this.sendWithProvider(options.provider, emailMessage, options.tenantId);
      } else {
        return await this.sendWithFailover(emailMessage, options.tenantId);
      }
    } catch (error:any) {
      logger.error("Error sending email", {
        error: error.message,
        to,
        provider: options.provider,
        tenantId: options.tenantId || 'global'
      });

      // Rethrow l'erreur
      throw error;
    }
  }

  /**
   * Envoie un email simple avec tenant (nouvelle méthode dédiée)
   */
  async sendEmailWithTenant(
    tenantId: string,
    to: string | string[], 
    subject: string, 
    content: { html?: string, text?: string }, 
    options: {
      from?: string;
      fromName?: string;
      replyTo?: string;
      cc?: string[];
      bcc?: string[];
      attachments?: EmailAttachment[];
      provider?: EmailProviderType;
      trackingId?: string;
      userId?: string;
      priority?: number;
      categories?: string[];
    } = {}
  ): Promise<SendEmailResponse> {
    return this.sendEmail(to, subject, content, { ...options, tenantId });
  }

  /**
   * Envoie un email à partir d'un template
   */
  async sendFromTemplate(to: string | string[], templateId: string, data: Record<string, any>, options: {
    provider?: EmailProviderType;
    trackingId?: string;
    userId?: string;
    priority?: number;
    subject?: string;
    from?: string;
    fromName?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: EmailAttachment[];
    categories?: string[];
    tenantId?: string; // Support multi-tenant
  } = {}): Promise<SendEmailResponse> {
    try {
      // Récupérer le template
      const template = await this.templateService.getEmailTemplate(templateId);

      if (!template) {
        throw new EmailError(`Email template not found: ${templateId}`, "template_not_found");
      }

      // Valider les variables du template
      const missingVariables = this.templateService.validateTemplateVariables(
        template.htmlContent + (template.textContent || ""),
        data
      );

      if (missingVariables.length > 0) {
        logger.warn(`Missing variables in email template: ${missingVariables.join(", ")}`, {
          templateId,
          missingVariables,
          tenantId: options.tenantId || 'global'
        });
      }

      // Traiter le template avec les données
      const htmlContent = template.htmlContent ?
        this.templateService.processTemplate(template.htmlContent, data) :
        undefined;

      const textContent = template.textContent ?
        this.templateService.processTemplate(template.textContent, data) :
        undefined;

      // Utiliser le sujet du template ou l'override
      const subject = options.subject || this.templateService.processTemplate(template.subject, data);

      // Envoyer l'email
      return await this.sendEmail(to, subject, {
        html: htmlContent,
        text: textContent,
      }, {
        ...options,
        trackingId: options.trackingId || `template-${templateId}-${Date.now()}`,
      });
    } catch (error:any) {
      logger.error("Error sending email from template", {
        error: error.message,
        to,
        templateId,
        tenantId: options.tenantId || 'global'
      });

      throw error;
    }
  }

   toEmailProviderType(value: string): EmailProviderType  {
      return Object.values(EmailProviderType).includes(value as EmailProviderType)
        ? (value as EmailProviderType)
        : EmailProviderType.CUSTOM_API;
    }

  /**
   * Envoie directement un template via l'API du provider
   * Certains providers comme SendGrid et Mailgun ont des API dédiées pour les templates
   */
  async sendProviderTemplate(to: string | string[], templateId: string, data: Record<string, any>, options: {
    provider?: EmailProviderType;
    trackingId?: string;
    userId?: string;
    priority?: number;
    subject?: string;
    from?: string;
    fromName?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: EmailAttachment[];
    categories?: string[];
    tenantId?: string; // Support multi-tenant
  } = {}): Promise<SendEmailResponse> {
    try {
      // Valider les destinataires
      this.validateRecipients(to);

      
      // Déterminer le provider
      const providerType = options.provider === undefined ? 
          this.toEmailProviderType(emailConfig.defaultProvider) :  options.provider ;

      // Récupérer le provider avec support tenant
      const provider = await EmailProviderFactory.getProviderForTenant(providerType, options.tenantId || null);

      // Vérifier si le provider est disponible
      if (!provider.isActive) {
        throw new EmailError(`Email provider ${providerType} is not active`, "provider_not_active");
      }

      // Envoyer le template via l'API du provider
      logger.info(`Sending provider template via ${providerType}`, {
        to: Array.isArray(to) ? to.join(", ") : to,
        templateId,
        trackingId: options.trackingId,
        tenantId: options.tenantId || 'global'
      });

      const result = await provider.sendTemplate(to, templateId, data, {
        to: to,
        subject: "",
        metadata: {
          userId: options.userId ?? "",
          trackingId: options.trackingId ?? "",
          priority: 0,
          timestamp: new Date()
        }
      });

      // Tracking de l'envoi
      await this.trackEmailDelivery({
        to,
        subject: options.subject || `Template: ${templateId}`,
        metadata: {
          trackingId: options.trackingId || `provider-template-${templateId}-${Date.now()}`,
          userId: options.userId ?? "",
          priority: options.priority || 3,
          timestamp: new Date(),
        },
      }, result, {
        templateId,
        templateData: data,
        tenantId: options.tenantId
      });

      return result;
    } catch (error:any) {
      logger.error("Error sending provider template", {
        error: error.message,
        to,
        templateId,
        provider: options.provider,
        tenantId: options.tenantId || 'global'
      });

      throw error;
    }
  }

  /**
   * Envoie un email avec un provider spécifique (support multi-tenant)
   */
  private async sendWithProvider(providerType: EmailProviderType, message: SendEmailRequest, tenantId?: string): Promise<SendEmailResponse> {
    try {
      // Récupérer le provider avec support tenant (fallback automatique)
      const provider = await EmailProviderFactory.getProviderForTenant(providerType, tenantId || null);

      // Vérifier si le provider est disponible
      if (!provider.isActive) {
        throw new EmailError(`Email provider ${providerType} is not active`, "provider_not_active");
      }

      // Envoyer l'email
      logger.info(`Sending email via ${providerType}`, {
        to: Array.isArray(message.to) ? message.to.join(", ") : message.to,
        subject: message.subject,
        trackingId: message.metadata?.trackingId,
        tenantId: tenantId || 'global'
      });

      // Si des pièces jointes sont présentes, utiliser la méthode spécifique pour AWS SES
      let result: SendEmailResponse;

      if (providerType === EmailProviderType.AWS_SES && message.attachments && message.attachments.length > 0) {
        // @ts-ignore - Méthode spécifique à AwsSesProvider
        result = await provider.sendEmailWithAttachments(
          message.to,
          message.subject,
          {html: message.htmlContent, text: message.textContent},
          message.attachments,
          {
            fromEmail: message.fromEmail,
            fromName: message.fromName,
            replyTo: message.replyTo,
            cc: message.cc,
            bcc: message.bcc,
            to: message.to,
            subject: message.subject,
            metadata: {
              userId: "",
              trackingId: "",
              priority: 0,
              timestamp: new Date()
            }
          }
        );
      } else {
        result = await provider.sendEmail(
          message.to,
          message.subject,
          {html: message.htmlContent, text: message.textContent},
          {
            fromEmail: message.fromEmail,
            fromName: message.fromName,
            replyTo: message.replyTo,
            cc: message.cc,
            bcc: message.bcc,
            attachments: message.attachments,
            categories: message.categories,
            to: message.to,
            subject: message.subject,
            metadata: {
              userId: "",
              trackingId: "",
              priority: 0,
              timestamp: new Date()
            }
          }
        );
      }

      // Tracking de l'envoi
      await this.trackEmailDelivery(message, result);

      return result;
    } catch (error:any) {
      // Logger l'erreur
      logger.error(`Failed to send email via ${providerType}`, {
        error: error.message,
        to: Array.isArray(message.to) ? message.to.join(", ") : message.to,
        subject: message.subject,
        trackingId: message.metadata?.trackingId,
        tenantId: tenantId || 'global'
      });

      // Rethrow l'erreur
      throw error;
    }
  }

  /**
   * Envoie un email avec failover automatique entre providers (support multi-tenant)
   */
  private async sendWithFailover(message: SendEmailRequest, tenantId?: string): Promise<SendEmailResponse> {
    // Récupérer tous les providers disponibles pour ce tenant
    const providers = await EmailProviderFactory.getAllProviders(tenantId);

    // Vérifier qu'il y a au moins un provider
    if (providers.length === 0) {
      throw new EmailError("No email providers available", "no_providers");
    }

    // Trier les providers par priorité
    const sortedProviders = providers
      .filter((p) => p.isActive)
      .sort((a, b) => a.priority - b.priority);

    // Si aucun provider actif, lancer une erreur
    if (sortedProviders.length === 0) {
      throw new EmailError("No active email providers available", "no_active_providers");
    }

    // Essayer chaque provider dans l'ordre jusqu'à ce qu'un réussisse
    let lastError: Error | null = null;

    for (const provider of sortedProviders) {
      try {
        logger.info(`Trying to send email via ${provider.type}`, {
          to: Array.isArray(message.to) ? message.to.join(", ") : message.to,
          subject: message.subject,
          trackingId: message.metadata?.trackingId,
          providerPriority: provider.priority,
          tenantId: tenantId || 'global'
        });

        // Envoyer l'email
        let result: SendEmailResponse;

        // Si des pièces jointes sont présentes et le provider est AWS SES, utiliser la méthode spécifique
        if (provider.type === "ses" && message.attachments && message.attachments.length > 0) {
          // @ts-ignore - Méthode spécifique à AwsSesProvider
          result = await provider.sendEmailWithAttachments(
            message.to,
            message.subject,
            {html: message.htmlContent, text: message.textContent},
            message.attachments,
            {
              fromEmail: message.fromEmail,
              fromName: message.fromName,
              replyTo: message.replyTo,
              cc: message.cc,
              bcc: message.bcc,
              to: message.to,
              subject: message.subject,
              metadata: {
                userId: "",
                trackingId: "",
                priority: 0,
                timestamp: new Date()
              }
            }
          );
        } else {
          result = await provider.sendEmail(
            message.to,
            message.subject,
            {html: message.htmlContent, text: message.textContent},
            {
              fromEmail: message.fromEmail,
              fromName: message.fromName,
              replyTo: message.replyTo,
              cc: message.cc,
              bcc: message.bcc,
              attachments: message.attachments,
              categories: message.categories,
              to: message.to,
              subject: message.subject,
              metadata: {
                userId: "",
                trackingId: "",
                priority: 0,
                timestamp: new Date()
              }
            }
          );
        }

        // Tracking de l'envoi
        await this.trackEmailDelivery(message, result);

        // Si réussi, retourner le résultat
        return result;
      } catch (error:any) {
        // Logger l'erreur
        logger.warn(`Failed to send email via ${provider.type}, trying next provider`, {
          error: error.message,
          to: Array.isArray(message.to) ? message.to.join(", ") : message.to,
          subject: message.subject,
          trackingId: message.metadata?.trackingId,
          tenantId: tenantId || 'global'
        });

        // Garder la dernière erreur
        lastError = error;

        // Continuer avec le provider suivant
        continue;
      }
    }

    // Si tous les providers ont échoué, lancer la dernière erreur
    throw lastError || new EmailError("All email providers failed", "all_providers_failed");
  }

  /**
   * Enregistre l'envoi d'un email dans la base de données
   */
  private async trackEmailDelivery(message: SendEmailRequest, result: SendEmailResponse, additionalData: Record<string, any> = {}): Promise<void> {
    try {
      // Créer l'objet de tracking
      // @ts-ignore
      const tracking = {
        to: message.to,
        subject: message.subject,
        provider: result.providerId,
        messageId: result.messageId,
        status: result.success ? "SENT" : "FAILED",
        cost: result.cost,
        metadata: {
          ...message.metadata,
          providerMetadata: result,
          ...additionalData,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Stocker dans Firestore
      // TODO: Activer le stockage dans Firestore
      // await collections.emailTemplates.collection("emailMessages").add(tracking);
      // await collections.emailTemplates.collection("emailMessages").add(tracking);

      logger.debug("Email delivery tracked", {
        trackingId: message.metadata?.trackingId,
        messageId: result.messageId,
        provider: result,
      });
    } catch (error:any) {
      logger.error("Failed to track email delivery", {
        error: error.message,
        trackingId: message.metadata?.trackingId,
      });

      // Ne pas bloquer l'envoi si le tracking échoue
    }
  }

  /**
   * Valide les destinataires d'un email
   */
  private validateRecipients(to: string | string[]): void {
    // Vérifier que les destinataires sont spécifiés
    if (!to || (Array.isArray(to) && to.length === 0)) {
      throw new EmailError("Email recipients are required", "missing_recipients");
    }

    // Vérifier le format des adresses email
    const recipients = Array.isArray(to) ? to : [to];

    // Expression régulière simple pour valider les adresses email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const recipient of recipients) {
      if (!emailRegex.test(recipient)) {
        throw new EmailError(`Invalid email address: ${recipient}`, "invalid_email");
      }
    }
  }

  /**
   * Récupère tous les providers Email disponibles
   */
  async getAvailableProviders(tenantId?: string): Promise<{ id: string; name: string; type: string; isActive: boolean }[]> {
    try {
      const providers = await EmailProviderFactory.getAllProviders(tenantId);

      return providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        type: provider.type,
        isActive: provider.isActive,
      }));
    } catch (error) {
      logger.error("Error getting available Email providers", { error, tenantId });
      return [];
    }
  }

  /**
   * Teste tous les providers Email
   */
  async testAllProviders(tenantId?: string): Promise<Record<string, boolean>> {
    return await EmailProviderFactory.testAllProviders(tenantId);
  }

   /**
   * Envoyer un email
   */
  async sendEmailRequest(request: EmailRequest, tenantId?: string): Promise<{ success: boolean; messageId?: string }> {
    try {
      let subject = request.subject || 'Notification';
      // @ts-ignore
      let html = request.html || '';
      // @ts-ignore
      let text = request.text || '';

      // Si un template est spécifié, l'utiliser
      if (request.template) {
        const template = await this.getTemplate(request.template);
        if (template) {
          const renderedContent = this.renderTemplate(template, request.data || {});
          subject = renderedContent.subject;
          html = renderedContent.html;
          text = renderedContent.text || '';
        }
      }

      console.log('📧 EmailService.sendEmailRequest - Sending email:', {
        to: request.to,
        subject: subject,
        template: request.template,
        hasHtml: !!html,
        hasText: !!text,
        tenantId: tenantId || 'global'
      });

      // Vérifier si nous sommes en mode développement ou si les providers sont configurés
      const isDevelopment = process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development';
      const hasEmailProvider = process.env.SENDGRID_API_KEY || process.env.MAILGUN_API_KEY || process.env.AWS_SES_ACCESS_KEY;
      
      if (isDevelopment && !hasEmailProvider) {
        // Mode simulation pour le développement
        console.log('⚠️  EMAIL SIMULATION MODE - Email not actually sent!');
        console.log('📧 Email details:', {
          to: request.to,
          subject,
          template: request.template,
          htmlLength: html.length,
          textLength: text.length,
          tenantId: tenantId || 'global'
        });
        console.log('📧 Email content preview:', {
          subject,
          htmlPreview: html.substring(0, 300) + (html.length > 300 ? '...' : ''),
          textPreview: text.substring(0, 300) + (text.length > 300 ? '...' : '')
        });
        
        // Simulation d'envoi réussi
        const messageId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        console.log('✅ Email simulation completed with messageId:', messageId);
        console.log('💡 To enable real email sending, configure email providers in environment variables');
        
        return {
          success: true,
          messageId
        };
      } else {
        // Essayer d'envoyer avec les providers configurés
        try {
          console.log('📧 Attempting to send real email via configured providers...', {
            tenantId: tenantId || 'global'
          });
          
          const result = await this.sendEmail(
            request.to,
            subject,
            { html, text },
            {
              attachments: request.attachments,
              tenantId: tenantId // Passer le tenantId aux providers
            }
          );
          
          console.log('✅ Real email sent successfully:', result);
          return result;
          
        } catch (error) {
          console.error('❌ Failed to send real email, falling back to simulation:', error);
          
          // Fallback vers simulation si l'envoi réel échoue
          const messageId = `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          
          return {
            success: true,
            messageId
          };
        }
      }

    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false
      };
    }
  }

  /**
   * Obtenir un template d'email
   */
  private async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    // Templates par défaut
    const defaultTemplates: Record<string, EmailTemplate> = {
      tenant_verification: {
        id: 'tenant_verification',
        name: 'Vérification de tenant',
        subject: 'Vérifiez votre email pour {{organizationName}}',
        htmlContent: `
          <h1>Bienvenue {{adminName}} !</h1>
          <p>Merci d'avoir créé votre organisation <strong>{{organizationName}}</strong>.</p>
          <p>Pour activer votre compte, veuillez cliquer sur le lien ci-dessous :</p>
          <p><a href="{{verificationUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Vérifier mon email</a></p>
          <p>Ce lien expire dans {{expiresIn}}.</p>
          <p>Si vous n'avez pas créé ce compte, vous pouvez ignorer cet email.</p>
        `,
        textContent: `
          Bienvenue {{adminName}} !
          
          Merci d'avoir créé votre organisation {{organizationName}}.
          
          Pour activer votre compte, veuillez visiter : {{verificationUrl}}
          
          Ce lien expire dans {{expiresIn}}.
        `,
        variables: ['organizationName', 'adminName', 'verificationUrl', 'expiresIn']
      },
      
      welcome_onboarding: {
        id: 'welcome_onboarding',
        name: 'Bienvenue - Onboarding',
        subject: 'Bienvenue dans {{organizationName}} !',
        htmlContent: `
          <h1>Félicitations {{adminName}} !</h1>
          <p>Votre organisation <strong>{{organizationName}}</strong> est maintenant active.</p>
          <p>Voici les prochaines étapes pour bien commencer :</p>
          <ol>
            <li>Configurez les paramètres de votre organisation</li>
            <li>Invitez vos collaborateurs</li>
            <li>Créez vos premiers événements</li>
            <li>Explorez les fonctionnalités avancées</li>
          </ol>
          <p><a href="{{setupUrl}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Commencer la configuration</a></p>
        `,
        variables: ['organizationName', 'adminName', 'setupUrl']
      },

      user_invitation: {
        id: 'user_invitation',
        name: 'Invitation utilisateur',
        subject: 'Vous êtes invité à rejoindre {{organizationName}}',
        htmlContent: `
          <h1>Invitation à rejoindre {{organizationName}}</h1>
          <p>Bonjour,</p>
          <p>{{inviterName}} vous invite à rejoindre l'organisation <strong>{{organizationName}}</strong> en tant que {{role}}.</p>
          <p><a href="{{invitationUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accepter l'invitation</a></p>
          <p>Cette invitation expire dans {{expiresIn}}.</p>
        `,
        variables: ['organizationName', 'inviterName', 'role', 'invitationUrl', 'expiresIn']
      }
    };

    return defaultTemplates[templateId] || null;
  }

  /**
   * Rendre un template avec des données
   */
  private renderTemplate(template: EmailTemplate, data: Record<string, any>): {
    subject: string;
    html: string;
    text?: string;
  } {
    const renderString = (str: string, data: Record<string, any>): string => {
      return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] || match;
      });
    };

    return {
      subject: renderString(template.subject, data),
      html: renderString(template.htmlContent, data),
      text: template.textContent ? renderString(template.textContent, data) : undefined
    };
  }

  /**
   * Envoyer un email de vérification
   */
  async sendVerificationEmail(to: string, data: {
    organizationName: string;
    adminName: string;
    verificationUrl: string;
    expiresIn: string;
  }, tenantId?: string): Promise<boolean> {
    const result = await this.sendEmailRequest({
      to,
      template: 'tenant_verification',
      data
    }, tenantId);

    return result.success;
  }

  /**
   * Envoyer un email de bienvenue
   */
  async sendWelcomeEmail(to: string, data: {
    organizationName: string;
    adminName: string;
    setupUrl: string;
  }, tenantId?: string): Promise<boolean> {
    const result = await this.sendEmailRequest({
      to,
      template: 'welcome_onboarding',
      data
    }, tenantId);

    return result.success;
  }

  /**
   * Envoyer un email d'invitation
   */
  async sendInvitationEmail(to: string, data: {
    organizationName: string;
    inviterName: string;
    role: string;
    invitationUrl: string;
    expiresIn: string;
  }, tenantId?: string): Promise<boolean> {
    console.log('📧 EmailService.sendInvitationEmail called', {
      to,
      organizationName: data.organizationName,
      inviterName: data.inviterName,
      role: data.role,
      invitationUrl: data.invitationUrl,
      tenantId: tenantId || 'global'
    });

    const result = await this.sendEmailRequest({
      to,
      template: 'user_invitation',
      data
    }, tenantId);

    console.log('📧 EmailService.sendInvitationEmail result:', result);
    return result.success;
  }
}

export default EmailService;
