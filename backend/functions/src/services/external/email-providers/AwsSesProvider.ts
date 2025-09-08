
import AWS from "aws-sdk";
import {BaseEmailProvider} from "./BaseEmailProvider";
import {EmailAttachment, EmailError, EmailProviderConfig, SendEmailRequest, SendEmailResponse} from "../../../shared";
import {logger} from "firebase-functions";

/**
 * Provider Email utilisant Amazon SES
 */
export class AwsSesProvider extends BaseEmailProvider {
/*   private config: EmailProviderConfig;*/
  // @ts-ignore
  private ses: AWS.SES;

  constructor(config: EmailProviderConfig) {
    super(config);
    this.config = config;

    // Initialiser le client SES
    try {
      // Configurer AWS avec les credentials
      AWS.config.update({
        accessKeyId: this.config.config.apiKey,
        secretAccessKey: this.config.config.apiSecret,
        region: this.config.config.region,
      });

      // Créer l'instance SES
      this.ses = new AWS.SES({
        apiVersion: "2010-12-01",
      });

      logger.info(`AwsSesProvider initialized successfully for region: ${this.config.config.region}`);
    } catch (error) {
      logger.error("Failed to initialize AwsSesProvider", error);
      this.config.availabilityStatus = "unavailable";
    }
  }

  /* async sendEmail(
    to: string | string[],
    subject: string,
    content: { html?: string; text?: string; }): Promise<SendEmailResponse> {
    try {
      if (! this.checkRateLimits()) {
        throw new EmailError("Rate limit exceeded for AWS SES provider", "rate_limit_exceeded");
      }
      const recipients = Array.isArray(to) ? to : [to];
      // Préparer l'expéditeur
      const fromName = this.config.config.fromName;
      const fromEmail = this.config.config.fromEmail;
      const sender = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
      // Préparer les paramètres de l'email
      const params: AWS.SES.SendEmailRequest = {
        Source: sender,
        Destination: {
          ToAddresses: recipients,
          CcAddresses: [],
          BccAddresses: [],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {},
        },
        ReplyToAddresses: undefined,
        ConfigurationSetName: undefined,
      };

      // Ajouter le contenu HTML si disponible
      if (content.html) {
        params.Message.Body.Html = {
          Data: content.html,
          Charset: "UTF-8",
        };
      }

      // Ajouter le contenu texte si disponible
      if (content.text) {
        params.Message.Body.Text = {
          Data: content.text,
          Charset: "UTF-8",
        };
      }


      // Envoyer l'email
      logger.debug(`Sending email via AWS SES to ${recipients.join(", ")}`, {
        provider: "aws_ses",
        subject,
        recipientsCount: recipients.length,
      });

      const response = await this.ses.sendEmail(params).promise();

      // Calculer le coût estimé
      const estimatedCost = this.calculateEstimatedCost(recipients.length);

      logger.info("Email sent successfully via AWS SES", {
        provider: "aws_ses",
        messageId: response.MessageId,
        recipientsCount: recipients.length,
      });
      return {
        success: true,
        messageId: response.MessageId,
        cost: estimatedCost,
        providerId: "ses",
        queuedAt: new Date(),
        metadata: {
          requestId: response.$response.requestId,
          region: this.config.config.region,
        },
      } as SendEmailResponse;
    } catch (error:any) {
      // Logger l'erreur
      logger.error("Failed to send email via AWS SES", {
        provider: "aws_ses",
        error: error.message,
        errorCode: error.code,
        to,
      });

      // Convertir l'erreur en EmailError si nécessaire
      let emailError: EmailError;
      if (!(error instanceof EmailError)) {
        emailError = new EmailError(
          `AWS SES error: ${error.message}`,
          error.code || "aws_ses_error"
        );
      } else {
        emailError = error;
      }

      // Mettre à jour le statut du provider si nécessaire
      if (emailError.code === "AccessDenied" || emailError.code === "InvalidClientTokenId") {
        this.config.availabilityStatus = "unavailable";
      }

      throw emailError;
    }
  }*/

  /**
   * Envoie un email simple
   * Méthode implémentée pour AWS SES
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    content: { html?: string; text?: string },
    options: SendEmailRequest
  ): Promise<SendEmailResponse> {
    try {
      if (!await this.checkRateLimits()) {
        throw new EmailError("Rate limit exceeded for AWS SES provider", "rate_limit_exceeded");
      }

      const recipients = Array.isArray(to) ? to : [to];
      const fromEmail = options.fromEmail || this.config.config.fromEmail;
      const fromName = options.fromName || this.config.config.fromName;
      const sender = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

      const params: AWS.SES.SendEmailRequest = {
        Source: sender,
        Destination: {
          ToAddresses: recipients,
          CcAddresses: options.cc || [],
          BccAddresses: options.bcc || [],
        },
        Message: {
          Subject: {Data: subject, Charset: "UTF-8"},
          Body: {},
        },
        ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
      };

      if (content.html) {
        params.Message.Body.Html = {Data: content.html, Charset: "UTF-8"};
      }
      if (content.text) {
        params.Message.Body.Text = {Data: content.text, Charset: "UTF-8"};
      }

      // CORRECTION CRITIQUE - Attendre la réponse
      const response = await this.ses.sendEmail(params).promise();
      const estimatedCost = this.calculateEstimatedCost(recipients.length);

      logger.info("Email sent successfully via AWS SES", {
        provider: "aws_ses",
        messageId: response.MessageId,
        recipientsCount: recipients.length,
      });

      return {
        success: true,
        messageId: response.MessageId!,
        cost: estimatedCost,
        providerId: "ses",
        queuedAt: new Date(),
      };
    } catch (error: any) {
      logger.error("Failed to send email via AWS SES", {
        provider: "aws_ses",
        error: error.message,
        to,
      });
      throw new EmailError(`AWS SES error: ${error.message}`, error.code || "aws_ses_error");
    }
  }

  /**
   * Envoie un email à partir d'un template
   * Méthode abstraite à implémenter par chaque provider si nécessaire
   */
  // Note: AWS SES ne supporte pas directement les templates comme Sendgrid ou Mailgun
  // Il faut utiliser des templates pré-créés dans la console AWS ou gérer les templates
  // manuellement dans le code.
  // Pour cette implémentation, nous allons lever une erreur si cette méthode est appelée.
  sendTemplate(to: string | string[], templateId: string, data: Record<string, any>): Promise<SendEmailResponse> {
    throw new Error("Method not implemented.");
  }

  /*
  sendTemplate(to: string | string[], templateId: string, data: Record<string, any>, options: SendEmailRequest): Promise<SendEmailResponse> {
     throw new Error("Method not implemented.");
    /* try {
      // Vérifier les limites de taux
      if (!await this.checkRateLimits()) {
        throw new EmailError("Rate limit exceeded for AWS SES provider", "rate_limit_exceeded");
      }

      // Normaliser les destinataires
      const recipients = Array.isArray(to) ? to : [to];

      // Préparer l'expéditeur
      const fromName = options.fromName || this.config.settings.fromName;
      const fromEmail = options.from || this.config.settings.fromEmail;
      const sender = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

      // Préparer les paramètres pour l'envoi du template
      const params: AWS.SES.SendTemplatedEmailRequest = {
        Source: sender,
        Destination: {
          ToAddresses: recipients,
          CcAddresses: options.cc || [],
          BccAddresses: options.bcc || [],
        },
        Template: templateId,
        TemplateData: JSON.stringify(data),
        ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
        ConfigurationSetName: options.configurationSet,
      };

      // Ajouter les tags si spécifiés
      if (options.tags && Object.keys(options.tags).length > 0) {
        params.Tags = Object.entries(options.tags).map(([Name, Value]) => ({Name, Value}));
      }

      // Envoyer l'email avec le template
      logger.debug(`Sending email via AWS SES template to ${recipients.join(", ")}`, {
        provider: "aws_ses",
        templateId,
        recipientsCount: recipients.length,
      });

      const response = await this.ses.sendTemplatedEmail(params).promise();

      // Calculer le coût estimé
      const estimatedCost = this.calculateEstimatedCost(recipients.length);

      logger.info("Email sent successfully via AWS SES template", {
        provider: "aws_ses",
        messageId: response.MessageId,
        templateId,
        recipientsCount: recipients.length,
      });

      // Retourner le résultat
      return {
        success: true,
        messageId: response.MessageId,
        status: "sent",
        cost: estimatedCost,
        provider: "ses",
        metadata: {
          requestId: response.$response.requestId,
          region: this.config.credentials.region,
          templateId,
        },
      };
    } catch (error) {
      // Logger l'erreur
      logger.error("Failed to send email via AWS SES template", {
        provider: "aws_ses",
        error: error.message,
        errorCode: error.code,
        templateId,
        to,
      });

      // Convertir l'erreur en EmailError si nécessaire
      if (!(error instanceof EmailError)) {
        let errorCode = "aws_ses_template_error";

        // Codes d'erreur spécifiques pour les templates
        if (error.code === "TemplateDoesNotExist") {
          errorCode = "aws_ses_template_not_found";
        } else if (error.code === "InvalidTemplateData") {
          errorCode = "aws_ses_invalid_template_data";
        }

        const templateError = new EmailError(
          `AWS SES template error: ${error.message}`,
          errorCode
        );
        error = templateError;
      }

      throw error;
    } *//*
  }*/

  /**
   * Calcule le coût estimé d'un email
   */
  private calculateEstimatedCost(recipientsCount: number, attachments: EmailAttachment[] = []): number {
    // AWS SES facture par email envoyé et par taille
    // Implémentation simplifiée - les coûts réels dépendent de la région et du volume
    const baseEmailCost = 0.0001; // $0.0001 par email (tarif standard)

    // Calcul de base en fonction du nombre de destinataires
    let cost = baseEmailCost * recipientsCount;

    // Ajouter un coût supplémentaire pour les pièces jointes
    if (attachments && attachments.length > 0) {
      // Estimer la taille totale des pièces jointes
      const totalAttachmentSize = attachments.reduce((size, attachment) => {
        // Estimer la taille en Mo en utilisant la longueur de la chaîne base64
        // et en convertissant en octets (approximativement 0.75 * longueur de la chaîne)
        const estimatedSizeInBytes = attachment.content.length * 0.75;
        return size + estimatedSizeInBytes;
      }, 0);

      // Coût supplémentaire par Mo (approximatif)
      const costPerMB = 0.00001;
      cost += (totalAttachmentSize / (1024 * 1024)) * costPerMB;
    }

    return cost;
  }

  /**
   * Teste la connexion à AWS SES
   */
  async testConnection(): Promise<boolean> {
    try {
      // Vérifier la connectivité en récupérant les quotas d'envoi
      const response = await this.ses.getSendQuota().promise();

      logger.info("AWS SES connection test successful", {
        quotas: response,
        region: this.config.config.region,
      });

      this.config.availabilityStatus = "available";
      return true;
    } catch (error) {
      logger.error("AWS SES connection test failed", error);
      this.config.availabilityStatus = "unavailable";
      return false;
    }
  }
}
