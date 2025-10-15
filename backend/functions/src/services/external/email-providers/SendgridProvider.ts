import { EmailError, EmailProviderConfig, SendEmailRequest, SendEmailResponse } from "../../../common/types";
import { BaseEmailProvider } from "./BaseEmailProvider";

import axios from "axios";
import { logger } from "firebase-functions";

/**
 * Provider Email utilisant l'API SendGrid
 */
export class SendgridProvider extends BaseEmailProvider {
  private baseUrl = "https://api.sendgrid.com/v3";

  constructor(config: EmailProviderConfig) {
    super(config);
    this.config = config;

    logger.info("SendgridProvider initialized");
  }

  async sendEmail(to: string | string[],
    subject: string,
    content: { html?: string; text?: string; },
    options?: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      if (!await this.checkRateLimits()) {
        throw new EmailError("Rate limit exceeded for SendGrid provider", "rate_limit_exceeded");
      }
      // Normaliser les destinataires
      const recipients = Array.isArray(to) ? to : [to];

      // Préparer le corps de la requête pour l'API SendGrid
      const payload = {
        personalizations: [
          {
            to: recipients.map((email) => ({ email })),
            subject: subject,
            cc : [] as any[],
            bcc : [] as any[],
          },
        ],
        from: {
          email: options?.fromEmail || this.config.config.fromEmail,
          name: options?.fromName || this.config.config.fromName,
        },
        reply_to: {email: ''},
        categories: [] as string[],
        attachments: [] as any[],  
        content: [] as any[],
      };

      // Ajouter le contenu HTML si disponible
      if (content.html) {
        payload.content.push({
          type: "text/html",
          value: content.html,
        });
      }

      // Ajouter le contenu texte si disponible
      if (content.text) {
        payload.content.push({
          type: "text/plain",
          value: content.text,
        });
      }

      // Ajouter les destinataires en copie si spécifiés
      if (options?.cc && options.cc.length > 0) {
        payload.personalizations[0].cc = options.cc.map((email) => ({ email }));
      }

      // Ajouter les destinataires en copie cachée si spécifiés
      if (options?.bcc && options.bcc.length > 0) {
        payload.personalizations[0].bcc = options.bcc.map((email) => ({ email }));
      }

      // Ajouter l'adresse de réponse si spécifiée
      if (options?.replyTo) {
        payload.reply_to = {
          email: options.replyTo,
        };
      }

      // Ajouter les pièces jointes si spécifiées
      if (options?.attachments && options.attachments.length > 0) {
        payload.attachments = options.attachments.map((attachment) => ({
          content: attachment.content,
          filename: attachment.filename,
          type: attachment.contentType,
          disposition: attachment.disposition || "attachment",
        }));
      }

      // Ajouter les catégories si spécifiées
      if (options?.categories && options.categories.length > 0) {
        payload.categories = options.categories;
      }

      // Envoyer la requête à l'API SendGrid
      logger.debug(`Sending email via SendGrid to ${recipients.join(", ")}`, {
        provider: "sendgrid",
        subject,
        recipientsCount: recipients.length,
      });

      const response = await axios({
        method: "POST",
        url: `${this.baseUrl}/mail/send`,
        headers: {
          "Authorization": `Bearer ${this.config.config.apiKey}`,
          "Content-Type": "application/json",
        },
        data: payload,
      });

      // SendGrid renvoie un code 202 en cas de succès
      if (response.status !== 202) {
        throw new EmailError(
          `SendGrid API returned status ${response.status}`,
          "sendgrid_api_error"
        );
      }

      // Calculer le coût estimé (SendGrid ne renvoie pas le coût directement)
      const estimatedCost = this.calculateEstimatedCost(recipients.length, content);

      logger.info("Email sent successfully via SendGrid", {
        provider: "sendgrid",
        subject,
        recipientsCount: recipients.length,
      });

      // Retourner le résultat
      return {
        success: true,
        messageId: response.headers["x-message-id"] || `sendgrid-${Date.now()}`,
        cost: estimatedCost,
        providerId: "sendgrid",
        queuedAt: new Date(),
        metadata: {
          responseId: response.headers["x-message-id"],
          statusCode: response.status,
        },
      };
    } catch (error:any) {
      // Logger l'erreur
      logger.error("Failed to send email via SendGrid", {
        provider: "sendgrid",
        error: error instanceof Error ? error.message : String(error),
        errorCode: error instanceof Error ? error.stack : String(error),
        to,
      });

      // Convertir l'erreur en EmailError si nécessaire
      if (!(error instanceof EmailError)) {
        let errorCode = "sendgrid_error";

        // Essayer d'extraire le code d'erreur de SendGrid si disponible
        if (error.response?.data?.errors?.[0]?.message) {
          errorCode = `sendgrid_${error.response.data.errors[0].message.toLowerCase().replace(/\s+/g, "_")}`;
        }

        const emailError = new EmailError(
          `SendGrid error: ${error.message}`,
          errorCode
        );
        error = emailError;
      }

      // Mettre à jour le statut du provider si nécessaire
      if (error.code === "sendgrid_auth_error" || error.code === "sendgrid_account_error") {
        this.config.availabilityStatus = "unavailable";
      }

      throw error;
    }
  }

  async sendTemplate(to: string | string[], templateId: string, data: Record<string, any>, options?: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      // Vérifier les limites de taux
      if (!await this.checkRateLimits()) {
        throw new EmailError("Rate limit exceeded for SendGrid provider", "rate_limit_exceeded");
      }

      // Normaliser les destinataires
      const recipients = Array.isArray(to) ? to : [to];

      // Vérifier que le template ID est spécifié
      if (!templateId) {
        throw new EmailError("Template ID is required", "missing_template_id");
      }

      // Préparer le corps de la requête pour l'API SendGrid
      const payload = {
        personalizations: [
          {
            to: recipients.map((email) => ({ email })),
            dynamic_template_data: data,
            subject:'',
            cc: [] as any[],
            bcc: [] as any[],
          },
        ],
        from: {
          email: options?.fromEmail || this.config.config.fromEmail,
          name: options?.fromName || this.config.config.fromName,
        },
        template_id: templateId,
        reply_to: {email: ''},
        categories: [] as string[],
        attachments: [] as any[],  
      };

      // Ajouter le sujet si spécifié
      if (options?.subject) {
        payload.personalizations[0].subject = options.subject;
      }

      // Ajouter les destinataires en copie si spécifiés
      if (options?.cc && options.cc.length > 0) {
        payload.personalizations[0].cc = options.cc.map((email) => ({ email }));
      }

      // Ajouter les destinataires en copie cachée si spécifiés
      if (options?.bcc && options.bcc.length > 0) {
        payload.personalizations[0].bcc = options.bcc.map((email) => ({ email }));
      }

      // Ajouter l'adresse de réponse si spécifiée
      if (options?.replyTo) {
        payload.reply_to = {
          email: options.replyTo,
        };
      }

      // Ajouter les pièces jointes si spécifiées
      if (options?.attachments && options.attachments.length > 0) {
        payload.attachments = options.attachments.map((attachment) => ({
          content: attachment.content,
          filename: attachment.filename,
          type: attachment.contentType,
          disposition: attachment.disposition || "attachment",
        }));
      }

      // Ajouter les catégories si spécifiées
      if (options?.categories && options.categories.length > 0) {
        payload.categories = options.categories;
      }

      // Envoyer la requête à l'API SendGrid
      logger.debug(`Sending email via SendGrid template to ${recipients.join(", ")}`, {
        provider: "sendgrid",
        templateId,
        recipientsCount: recipients.length,
      });

      const response = await axios({
        method: "POST",
        url: `${this.baseUrl}/mail/send`,
        headers: {
          "Authorization": `Bearer ${this.config.config.apiKey}`,
          "Content-Type": "application/json",
        },
        data: payload,
      });

      // SendGrid renvoie un code 202 en cas de succès
      if (response.status !== 202) {
        throw new EmailError(
          `SendGrid API returned status ${response.status}`,
          "sendgrid_api_error"
        );
      }

      // Calculer le coût estimé
      const estimatedCost = this.calculateEstimatedCost(recipients.length);

      logger.info("Email sent successfully via SendGrid template", {
        provider: "sendgrid",
        templateId,
        recipientsCount: recipients.length,
      });

      // Retourner le résultat
      return {
        success: true,
        messageId: response.headers["x-message-id"] || `sendgrid-template-${Date.now()}`,
        cost: estimatedCost,
        providerId: "sendgrid",
        queuedAt: new Date(),
        templateId,
        metadata: {
          responseId: response.headers["x-message-id"],
          statusCode: response.status,

        },
      };
    } catch (error:any) {
      // Logger l'erreur
      logger.error("Failed to send email via SendGrid template", {
        provider: "sendgrid",
        error: error instanceof Error ? error.message : String(error),
        errorCode: error instanceof Error ? error.stack : String(error),
        templateId,
        to,
      });

      // Convertir l'erreur en EmailError si nécessaire
      if (!(error instanceof EmailError)) {
        let errorCode = "sendgrid_template_error";

        // Essayer d'extraire le code d'erreur de SendGrid si disponible
        if (error.response?.data?.errors?.[0]?.message) {
          errorCode = `sendgrid_${error.response.data.errors[0].message.toLowerCase().replace(/\s+/g, "_")}`;
        }

        const emailError = new EmailError(
          `SendGrid template error: ${error.message}`,
          errorCode
        );
        error = emailError;
      }

      throw error;
    }
  }


  /**
   * Teste la connexion à l'API SendGrid
   */
  async testConnection(): Promise<boolean> {
    try {
      // Tester l'API SendGrid en récupérant les statistiques
      const response = await axios({
        method: "GET",
        url: `${this.baseUrl}/user/credits`,
        headers: {
          "Authorization": `Bearer ${this.config.config.apiKey}`,
        },
      });

      if (response.status === 200) {
        logger.info("SendGrid connection test successful");
        this.config.availabilityStatus = "available";
        return true;
      }

      throw new Error(`SendGrid API returned status ${response.status}`);
    } catch (error) {
      logger.error("SendGrid connection test failed", error);
      this.config.availabilityStatus = "unavailable";
      return false;
    }
  }

  /**
   * Calcule le coût estimé d'un email
   */
  private calculateEstimatedCost(recipientsCount: number, content: any = {}): number {
    // SendGrid facture généralement par email envoyé
    // Implémentation simplifiée - les coûts réels dépendent du plan
    const baseEmailCost = 0.0001; // $0.0001 par email pour un plan standard
    // Calcul simple basé sur le nombre de destinataires
    return baseEmailCost * recipientsCount;
  }
}
