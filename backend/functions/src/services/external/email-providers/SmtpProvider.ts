import { EmailProviderConfig, EmailProviderType, IEmailProvider, ProviderStats, SendEmailRequest, SendEmailResponse } from "../../../common/types";
import { logger } from "firebase-functions";
import * as nodemailer from "nodemailer";

export class SmtpProvider implements IEmailProvider {
  public readonly id: string;
  public readonly name: string;
  public readonly type: EmailProviderType;
  public readonly isActive: boolean;
  public readonly priority: number;

  private transporter: nodemailer.Transporter;
  private stats: ProviderStats;

  constructor(config: EmailProviderConfig) {
    this.id = config.id || '';
    this.name = config.name;
    this.type = EmailProviderType.SMTP;
    this.isActive = config.isActive;
    this.priority = config.priority;

    // Initialiser les statistiques
    this.stats = {
      totalSent: 0,
      totalDelivered: 0,
      totalBounced: 0,
      totalComplaints: 0,
      totalClicks: 0,
      totalOpens: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      monthlyUsage: 0,
      totalCost: 0,
      totalFailed: 0,
      totalUnsubscribes: 0,
      bounceRate: 0,
      complaintRate: 0,
      unsubscribeRate: 0,
      averageCostPerEmail: 0,
      periodStart: new Date(),
      periodEnd: new Date(),
    };

    // Créer le transporteur SMTP
    this.transporter = nodemailer.createTransport({
      host: config.config.host,
      port: config.config.port,
      secure: config.config.secure || false,
      auth: {
        user: config.config.username,
        pass: config.config.password,
      },
    });
  }

  async sendEmail(
    to: string | string[],
    subject: string,
    content: { html?: string; text?: string },
    options: SendEmailRequest
  ): Promise<SendEmailResponse> {
    try {
      const mailOptions = {
        from: `${options.fromName || "Attendance-X"} <${options.fromEmail || this.getFromEmail()}>`,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        text: content.text,
        html: content.html,
        replyTo: options.replyTo,
        cc: options.cc?.join(", "),
        bcc: options.bcc?.join(", "),
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info("SMTP email sent successfully", {
        messageId: result.messageId,
        to: mailOptions.to,
        subject,
      });

      // Mettre à jour les statistiques
      this.stats.totalSent++;
      this.stats.totalDelivered++;

      return {
        success: true,
        messageId: result.messageId,
        providerId: this.id,
        cost: 0, // SMTP is usually free
        queuedAt: new Date(),
      };
    } catch (error) {
      logger.error("SMTP email sending failed", {
        error: error instanceof Error ? error.message : String(error),
        to,
        subject,
      });

      // Mettre à jour les statistiques d'échec
      this.stats.totalSent++;
      this.stats.totalFailed++;

      return {
        success: false,
        errors: [error instanceof Error ? error.message : "Unknown SMTP error"],
        providerId: this.id,
        cost: 0,
        queuedAt: new Date(),
      };
    }
  }

  async sendTemplate(
    to: string | string[],
    templateId: string,
    data: Record<string, any>,
    options: SendEmailRequest
  ): Promise<SendEmailResponse> {
    // SMTP doesn't have native template support, so we'll use the basic sendEmail method
    throw new Error("Template sending not supported by SMTP provider. Use sendEmail with processed template content.");
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info("SMTP connection test successful");
      return true;
    } catch (error) {
      logger.error("SMTP connection test failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async canSendEmail(): Promise<boolean> {
    return this.isActive && await this.testConnection();
  }

  async getStats(): Promise<ProviderStats> {
    return { ...this.stats };
  }

  async resetStats(): Promise<void> {
    this.stats = {
      totalSent: 0,
      totalDelivered: 0,
      totalBounced: 0,
      totalComplaints: 0,
      totalClicks: 0,
      totalOpens: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      monthlyUsage: 0,
      totalCost: 0,
      totalFailed: 0,
      totalUnsubscribes: 0,
      bounceRate: 0,
      complaintRate: 0,
      unsubscribeRate: 0,
      averageCostPerEmail: 0,
      periodStart: new Date(),
      periodEnd: new Date(),
    };
  }

  private getFromEmail(): string {
    // Cette méthode devrait retourner l'email par défaut configuré
    return process.env.SMTP_FROM_EMAIL || "noreply@attendance-x.com";
  }
}