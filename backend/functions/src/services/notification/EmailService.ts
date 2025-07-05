import {EmailAttachment, EmailError, EmailProviderType, SendEmailRequest, SendEmailResponse} from "@attendance-x/shared";
import {TemplateService} from "./TemplateService";
import {logger} from "firebase-functions";
import {collections, emailConfig} from "../../config";
import EmailProviderFactory from "../external/email-providers";


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
        return await this.sendWithProvider(options.provider, emailMessage);
      } else {
        return await this.sendWithFailover(emailMessage);
      }
    } catch (error:any) {
      logger.error("Error sending email", {
        error: error.message,
        to,
        provider: options.provider,
      });

      // Rethrow l'erreur
      throw error;
    }
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
      });

      throw error;
    }
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
  } = {}): Promise<SendEmailResponse> {
    try {
      // Valider les destinataires
      this.validateRecipients(to);

      // Déterminer le provider
      const providerType = options.provider || emailConfig.defaultProvider;

      // Récupérer le provider
      const provider = await EmailProviderFactory.getProvider(providerType);

      // Vérifier si le provider est disponible
      if (!provider.isActive) {
        throw new EmailError(`Email provider ${providerType} is not active`, "provider_not_active");
      }

      // Envoyer le template via l'API du provider
      logger.info(`Sending provider template via ${providerType}`, {
        to: Array.isArray(to) ? to.join(", ") : to,
        templateId,
        trackingId: options.trackingId,
      });

      const result = await provider.sendTemplate(to, templateId, data, options);

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
      });

      return result;
    } catch (error:any) {
      logger.error("Error sending provider template", {
        error: error.message,
        to,
        templateId,
        provider: options.provider,
      });

      throw error;
    }
  }

  /**
   * Envoie un email avec un provider spécifique
   */
  private async sendWithProvider(providerType: EmailProviderType, message: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      // Récupérer le provider
      const provider = await EmailProviderFactory.getProvider(providerType);

      // Vérifier si le provider est disponible
      if (!provider.isActive) {
        throw new EmailError(`Email provider ${providerType} is not active`, "provider_not_active");
      }

      // Envoyer l'email
      logger.info(`Sending email via ${providerType}`, {
        to: Array.isArray(message.to) ? message.to.join(", ") : message.to,
        subject: message.subject,
        trackingId: message.metadata?.trackingId,
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
      });

      // Rethrow l'erreur
      throw error;
    }
  }

  /**
   * Envoie un email avec failover automatique entre providers
   */
  private async sendWithFailover(message: SendEmailRequest): Promise<SendEmailResponse> {
    // Récupérer tous les providers disponibles
    const providers = await EmailProviderFactory.getAllProviders();

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
  async getAvailableProviders(): Promise<{ id: string; name: string; type: string; isActive: boolean }[]> {
    try {
      const providers = await EmailProviderFactory.getAllProviders();

      return providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        type: provider.type,
        isActive: provider.isActive,
      }));
    } catch (error) {
      logger.error("Error getting available Email providers", error);
      return [];
    }
  }

  /**
   * Teste tous les providers Email
   */
  async testAllProviders(): Promise<Record<string, boolean>> {
    return await EmailProviderFactory.testAllProviders();
  }
}

export default EmailService;
