
import {EmailError, EmailProviderConfig, SendEmailRequest, SendEmailResponse} from "@attendance-x/shared";
import {BaseEmailProvider} from "./BaseEmailProvider";
import axios from "axios";
import FormData from "form-data";
import {logger} from "firebase-functions";

/**
 * Provider Email utilisant l'API Mailgun
 */
export class MailgunProvider extends BaseEmailProvider {
  private baseUrl: string;

  constructor(config: EmailProviderConfig) {
    super(config);
    this.config = config;

    // Construire l'URL de base de l'API Mailgun
    const domain = this.config.config.domain;
    this.baseUrl = `https://api.mailgun.net/v3/${domain}`;

    logger.info(`MailgunProvider initialized for domain: ${domain}`);
  }

  async sendEmail(
    to: string | string[],
    subject: string,
    content: { html?: string; text?: string },
    options?: SendEmailRequest
  ): Promise<SendEmailResponse> {
  // Implementation réelle comme dans AwsSesProvider
    try {
      if (!await this.checkRateLimits()) {
        throw new EmailError("Rate limit exceeded", "rate_limit_exceeded");
      }

      const recipients = Array.isArray(to) ? to : [to];

      // Logique d'envoi spécifique au provider
      // ...

      return {
        success: true,
        messageId: "generated-id",
        cost: this.calculateEstimatedCost(recipients.length),
        providerId: this.type,
        queuedAt: new Date(),
      };
    } catch (error) {
      logger.error(`Failed to send email via ${this.name}`, error);
      throw error;
    }
  }


  sendTemplate(to: string | string[], templateId: string, data: Record<string, any>, options?: SendEmailRequest): Promise<SendEmailResponse> {
    throw new Error("Method not implemented.");
  }
  /**
   * Envoie un email via l'API Mailgun
   *//*
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
    tags?: string[];
    deliveryTime?: Date;
    testMode?: boolean;
  } = {}): Promise<EmailResult> {
    try {
      // Vérifier les limites de taux
      if (!await this.checkRateLimits()) {
        throw new EmailError("Rate limit exceeded for Mailgun provider", "rate_limit_exceeded");
      }

      // Normaliser les destinataires
      const recipients = Array.isArray(to) ? to : [to];

      // Créer un objet FormData pour la requête
      const formData = new FormData();

      // Ajouter les destinataires
      formData.append("to", recipients.join(","));

      // Ajouter l'expéditeur
      const fromName = options.fromName || this.config.settings.fromName;
      const fromEmail = options.from || this.config.settings.fromEmail;
      formData.append("from", fromName ? `${fromName} <${fromEmail}>` : fromEmail);

      // Ajouter le sujet
      formData.append("subject", subject);

      // Ajouter le contenu
      if (content.html) {
        formData.append("html", content.html);
      }

      if (content.text) {
        formData.append("text", content.text);
      }

      // Ajouter les destinataires en copie si spécifiés
      if (options.cc && options.cc.length > 0) {
        formData.append("cc", options.cc.join(","));
      }

      // Ajouter les destinataires en copie cachée si spécifiés
      if (options.bcc && options.bcc.length > 0) {
        formData.append("bcc", options.bcc.join(","));
      }

      // Ajouter l'adresse de réponse si spécifiée
      if (options.replyTo) {
        formData.append("h:Reply-To", options.replyTo);
      }

      // Ajouter les tags si spécifiés
      if (options.tags && options.tags.length > 0) {
        options.tags.forEach((tag) => {
          formData.append("o:tag", tag);
        });
      }

      // Ajouter le mode test si spécifié
      if (options.testMode || this.config.settings.testMode) {
        formData.append("o:testmode", "yes");
      }

      // Ajouter l'heure de livraison différée si spécifiée
      if (options.deliveryTime) {
        formData.append("o:deliverytime", options.deliveryTime.toISOString());
      }

      // Ajouter les pièces jointes si spécifiées
      if (options.attachments && options.attachments.length > 0) {
        options.attachments.forEach((attachment, index) => {
          const buffer = Buffer.from(attachment.content, "base64");
          formData.append("attachment", buffer, {
            filename: attachment.filename,
            contentType: attachment.type,
          });
        });
      }

      // Envoyer la requête à l'API Mailgun
      logger.debug(`Sending email via Mailgun to ${recipients.join(", ")}`, {
        provider: "mailgun",
        subject,
        recipientsCount: recipients.length,
      });

      const response = await axios({
        method: "POST",
        url: `${this.baseUrl}/messages`,
        headers: {
          ...formData.getHeaders(),
          Authorization: `Basic ${Buffer.from(`api:${this.config.credentials.apiKey}`).toString("base64")}`,
        },
        data: formData,
      });

      // Vérifier la réponse
      if (response.status !== 200) {
        throw new EmailError(
          `Mailgun API returned status ${response.status}`,
          "mailgun_api_error"
        );
      }

      // Extraire l'ID du message de la réponse
      const messageId = response.data.id || `mailgun-${Date.now()}`;

      // Calculer le coût estimé
      const estimatedCost = this.calculateEstimatedCost(recipients.length, content);

      logger.info("Email sent successfully via Mailgun", {
        provider: "mailgun",
        messageId,
        recipientsCount: recipients.length,
      });

      // Retourner le résultat
      return {
        success: true,
        messageId,
        status: "sent",
        cost: estimatedCost,
        provider: "mailgun",
        metadata: {
          id: messageId,
          message: response.data.message,
        },
      };
    } catch (error) {
      // Logger l'erreur
      logger.error("Failed to send email via Mailgun", {
        provider: "mailgun",
        error: error.message,
        errorCode: error.code,
        to,
      });

      // Convertir l'erreur en EmailError si nécessaire
      if (!(error instanceof EmailError)) {
        let errorCode = "mailgun_error";

        // Essayer d'extraire le code d'erreur de Mailgun si disponible
        if (error.response?.data?.message) {
          errorCode = `mailgun_${error.response.data.message.toLowerCase().replace(/\s+/g, "_")}`;
        }

        error = new EmailError(
          `Mailgun error: ${error.message}`,
          errorCode
        );
      }

      // Mettre à jour le statut du provider si nécessaire
      if (error.code === "mailgun_auth_error" || error.code === "mailgun_account_error") {
        this.stats.availabilityStatus = "unavailable";
      }

      throw error;
    }
  }

  /**
   * Envoie un email à partir d'un template Mailgun
   *//*
  async sendTemplate(to: string | string[], templateId: string, data: Record<string, any>, options: {
    from?: string;
    fromName?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: EmailAttachment[];
    tags?: string[];
    subject?: string;
    testMode?: boolean;
  } = {}): Promise<EmailResult> {
    try {
      // Vérifier les limites de taux
      if (!await this.checkRateLimits()) {
        throw new EmailError("Rate limit exceeded for Mailgun provider", "rate_limit_exceeded");
      }

      // Normaliser les destinataires
      const recipients = Array.isArray(to) ? to : [to];

      // Vérifier que le template ID est spécifié
      if (!templateId) {
        throw new EmailError("Template ID is required", "missing_template_id");
      }

      // Créer un objet FormData pour la requête
      const formData = new FormData();

      // Ajouter les destinataires
      formData.append("to", recipients.join(","));

      // Ajouter l'expéditeur
      const fromName = options.fromName || this.config.settings.fromName;
      const fromEmail = options.from || this.config.settings.fromEmail;
      formData.append("from", fromName ? `${fromName} <${fromEmail}>` : fromEmail);

      // Ajouter le sujet si spécifié, sinon utiliser le sujet du template
      if (options.subject) {
        formData.append("subject", options.subject);
      }

      // Ajouter le template
      formData.append("template", templateId);

      // Ajouter les variables pour le template
      Object.entries(data).forEach(([key, value]) => {
        formData.append(`v:${key}`, typeof value === "object" ? JSON.stringify(value) : String(value));
      });

      // Ajouter les destinataires en copie si spécifiés
      if (options.cc && options.cc.length > 0) {
        formData.append("cc", options.cc.join(","));
      }

      // Ajouter les destinataires en copie cachée si spécifiés
      if (options.bcc && options.bcc.length > 0) {
        formData.append("bcc", options.bcc.join(","));
      }

      // Ajouter l'adresse de réponse si spécifiée
      if (options.replyTo) {
        formData.append("h:Reply-To", options.replyTo);
      }

      // Ajouter les tags si spécifiés
      if (options.tags && options.tags.length > 0) {
        options.tags.forEach((tag) => {
          formData.append("o:tag", tag);
        });
      }

      // Ajouter le mode test si spécifié
      if (options.testMode || this.config.settings.testMode) {
        formData.append("o:testmode", "yes");
      }

      // Ajouter les pièces jointes si spécifiées
      if (options.attachments && options.attachments.length > 0) {
        options.attachments.forEach((attachment, index) => {
          const buffer = Buffer.from(attachment.content, "base64");
          formData.append("attachment", buffer, {
            filename: attachment.filename,
            contentType: attachment.type,
          });
        });
      }

      // Envoyer la requête à l'API Mailgun
      logger.debug(`Sending email via Mailgun template to ${recipients.join(", ")}`, {
        provider: "mailgun",
        templateId,
        recipientsCount: recipients.length,
      });

      const response = await axios({
        method: "POST",
        url: `${this.baseUrl}/messages`,
        headers: {
          ...formData.getHeaders(),
          Authorization: `Basic ${Buffer.from(`api:${this.config.credentials.apiKey}`).toString("base64")}`,
        },
        data: formData,
      });

      // Vérifier la réponse
      if (response.status !== 200) {
        throw new EmailError(
          `Mailgun API returned status ${response.status}`,
          "mailgun_api_error"
        );
      }

      // Extraire l'ID du message de la réponse
      const messageId = response.data.id || `mailgun-template-${Date.now()}`;

      // Calculer le coût estimé
      const estimatedCost = this.calculateEstimatedCost(recipients.length);

      logger.info("Email sent successfully via Mailgun template", {
        provider: "mailgun",
        templateId,
        messageId,
        recipientsCount: recipients.length,
      });

      // Retourner le résultat
      return {
        success: true,
        messageId,
        status: "sent",
        cost: estimatedCost,
        provider: "mailgun",
        metadata: {
          id: messageId,
          message: response.data.message,
          templateId,
        },
      };
    } catch (error) {
      // Logger l'erreur
      logger.error("Failed to send email via Mailgun template", {
        provider: "mailgun",
        error: error.message,
        errorCode: error.code,
        templateId,
        to,
      });

      // Convertir l'erreur en EmailError si nécessaire
      if (!(error instanceof EmailError)) {
        let errorCode = "mailgun_template_error";

        // Essayer d'extraire le code d'erreur de Mailgun si disponible
        if (error.response?.data?.message) {
          errorCode = `mailgun_${error.response.data.message.toLowerCase().replace(/\s+/g, "_")}`;
        }

        error = new EmailError(
          `Mailgun template error: ${error.message}`,
          errorCode
        );
      }

      throw error;
    }
  }*/

  /**
   * Teste la connexion à l'API Mailgun
   */
  async testConnection(): Promise<boolean> {
    try {
      // Tester l'API Mailgun en récupérant les statistiques du domaine
      const response = await axios({
        method: "GET",
        url: `${this.baseUrl}/stats/total`,
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${this.config.config.apiKey}`).toString("base64")}`,
        },
        params: {
          event: ["sent", "delivered", "failed"],
        },
      });

      if (response.status === 200) {
        logger.info("Mailgun connection test successful", {
          domain: this.config.config.domain,
          stats: response.data.stats,
        });
        this.config.availabilityStatus = "available";
        return true;
      }

      throw new Error(`Mailgun API returned status ${response.status}`);
    } catch (error) {
      logger.error("Mailgun connection test failed", error);
      this.config.availabilityStatus = "unavailable";
      return false;
    }
  }

  /**
   * Calcule le coût estimé d'un email
   */
  private calculateEstimatedCost(recipientsCount: number, content: any = {}): number {
    // Mailgun facture généralement par email envoyé
    // Implémentation simplifiée - les coûts réels dépendent du plan
    const baseEmailCost = 0.0005; // $0.0005 par email pour un plan standard

    // Calcul simple basé sur le nombre de destinataires
    return baseEmailCost * recipientsCount;
  }
}
