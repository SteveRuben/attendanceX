import { BaseEmailProvider } from "./BaseEmailProvider";
import { EmailError, EmailProviderConfig, SendEmailRequest, SendEmailResponse } from "../../../common/types";
import { logger } from "firebase-functions";
import axios from "axios";

/**
 * Provider Email pour Resend.com
 * Documentation: https://resend.com/docs/api-reference/emails/send-email
 */
export class ResendProvider extends BaseEmailProvider {
  private apiKey: string;
  private apiUrl = "https://api.resend.com/emails";

  constructor(config: EmailProviderConfig) {
    super(config);

    // Récupérer la clé API depuis la config ou les variables d'environnement
    this.apiKey = config.config.apiKey || process.env.RESEND_API_KEY || "";

    if (!this.apiKey) {
      logger.warn("Resend API key not configured");
      this.config.isActive = false;
    }
  }

  /**
   * Envoie un email via l'API Resend
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    content: { html?: string; text?: string },
    options?: SendEmailRequest
  ): Promise<SendEmailResponse> {
    try {
      // Vérifier que la clé API est configurée
      if (!this.apiKey) {
        throw new EmailError("Resend API key not configured", "missing_api_key");
      }

      // Normaliser les destinataires
      const recipients = Array.isArray(to) ? to : [to];

      // Préparer les données de l'email
      const emailData: any = {
        from: options?.fromEmail || process.env.RESEND_FROM_EMAIL || "noreply@example.com",
        to: recipients,
        subject: subject,
      };

      // Ajouter le contenu HTML si présent
      if (content.html) {
        emailData.html = content.html;
      }

      // Ajouter le contenu texte si présent
      if (content.text) {
        emailData.text = content.text;
      }

      // Ajouter les options supplémentaires
      if (options?.replyTo) {
        emailData.reply_to = options.replyTo;
      }

      if (options?.cc && options.cc.length > 0) {
        emailData.cc = options.cc;
      }

      if (options?.bcc && options.bcc.length > 0) {
        emailData.bcc = options.bcc;
      }

      // Ajouter les pièces jointes si présentes
      if (options?.attachments && options.attachments.length > 0) {
        emailData.attachments = options.attachments.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
          content_type: attachment.contentType,
        }));
      }

      // Ajouter les tags/catégories si présents
      if (options?.categories && options.categories.length > 0) {
        emailData.tags = options.categories.map((category) => ({
          name: category,
        }));
      }

      logger.info("Sending email via Resend", {
        to: recipients,
        subject,
        hasHtml: !!content.html,
        hasText: !!content.text,
        hasAttachments: !!(options?.attachments && options.attachments.length > 0),
      });

      // Envoyer la requête à l'API Resend
      const response = await axios.post(this.apiUrl, emailData, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      // Vérifier la réponse
      if (response.status !== 200) {
        throw new EmailError(
          `Resend API error: ${response.statusText}`,
          "api_error",
          response.status,
          { data: response.data }
        );
      }

      const result = response.data;

      logger.info("Email sent successfully via Resend", {
        messageId: result.id,
        to: recipients,
      });

      // Retourner la réponse standardisée
      return {
        success: true,
        messageId: result.id,
        providerId: this.id,
        queuedAt: new Date(),
        cost: this.calculateCost(recipients.length),
      };
    } catch (error: any) {
      logger.error("Error sending email via Resend", {
        error: error.message,
        to,
        subject,
        response: error.response?.data,
      });

      // Gérer les erreurs spécifiques de Resend
      if (error.response) {
        const { status, data } = error.response;

        if (status === 401) {
          throw new EmailError("Invalid Resend API key", "invalid_api_key");
        }

        if (status === 422) {
          throw new EmailError(
            `Resend validation error: ${data.message || "Invalid request"}`,
            "validation_error",
            data
          );
        }

        if (status === 429) {
          throw new EmailError("Resend rate limit exceeded", "rate_limit_exceeded");
        }
      }

      throw new EmailError(
        `Failed to send email via Resend: ${error.message}`,
        "send_failed",
        500,
        { originalError: error }
      );
    }
  }

  /**
   * Envoie un email avec un template Resend
   * Note: Resend ne supporte pas encore les templates côté serveur
   * Cette méthode utilise l'envoi standard
   */
  async sendTemplate(
    to: string | string[],
    templateId: string,
    data: Record<string, any>,
    options?: SendEmailRequest
  ): Promise<SendEmailResponse> {
    logger.warn("Resend does not support server-side templates yet, using standard email send");

    // Pour l'instant, on utilise l'envoi standard
    // Dans le futur, Resend pourrait ajouter le support des templates
    return this.sendEmail(
      to,
      options?.subject || "Notification",
      {
        html: `<p>Template ${templateId} with data: ${JSON.stringify(data)}</p>`,
        text: `Template ${templateId}`,
      },
      options
    );
  }

  /**
   * Teste la connexion au provider Resend
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        logger.warn("Resend API key not configured");
        return false;
      }

      // Tester la connexion en envoyant une requête à l'API
      // Resend n'a pas d'endpoint de test dédié, on vérifie juste l'authentification
      const response = await axios.get("https://api.resend.com/domains", {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      const isConnected = response.status === 200;

      logger.info("Resend connection test", {
        success: isConnected,
        status: response.status,
      });

      return isConnected;
    } catch (error: any) {
      logger.error("Resend connection test failed", {
        error: error.message,
        status: error.response?.status,
      });

      return false;
    }
  }

  /**
   * Calcule le coût estimé d'envoi d'un email
   * Resend: $0.001 par email (1000 emails gratuits/mois)
   */
  private calculateCost(recipientCount: number): number {
    return recipientCount * 0.001;
  }

  /**
   * Vérifie les limites de taux
   * Resend: 100 emails/seconde par défaut
   */
  protected async checkRateLimits(): Promise<boolean> {
    // Pour l'instant, on retourne toujours true
    // Dans une implémentation complète, on vérifierait les limites de taux
    return true;
  }

  /**
   * Met à jour les statistiques du provider
   */
  protected updateStats(success: boolean, cost?: number): void {
    // Implémentation des statistiques si nécessaire
    logger.debug("Resend stats updated", { success, cost });
  }
}

export default ResendProvider;
