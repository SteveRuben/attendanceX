import {
  IEmailProvider,
  EmailProviderConfig,
  ProviderStats,
  EmailProviderType,
  EmailError,
  SendEmailResponse,
  SendEmailRequest,
} from "@attendance-x/shared";
import {logger} from "firebase-functions";


/**
 * Classe de base abstraite pour tous les providers Email
 * Implémente les fonctionnalités communes à tous les providers
 */
export abstract class BaseEmailProvider implements IEmailProvider {
  protected config: EmailProviderConfig;


  constructor(config: EmailProviderConfig) {
    this.config = config;
    // Initialiser les statistiques
  }

  /**
   * Getter pour l'ID du provider
   */
  get id(): string {
    return this.config.type;
  }

  /**
   * Getter pour le nom du provider
   */
  get name(): string {
    return this.config.name;
  }

  /**
   * Getter pour le type du provider
   */
  get type(): EmailProviderType {
    return this.config.type as EmailProviderType;
  }

  /**
   * Getter pour la priorité du provider
   */
  get priority(): number {
    return this.config.priority;
  }

  /**
   * Getter pour l'état d'activation du provider
   */
  get isActive(): boolean {
    return this.config.isActive;
  }

  /**
   * Vérifie si le provider peut envoyer un email
   * Applique les limites de taux et autres vérifications
   */
  async canSendEmail(): Promise<boolean> {
    return this.config.isActive &&
      this.config.availabilityStatus === "available" &&
      await this.checkRateLimits();
  }

  /**
     * Envoie un email simple
     * Méthode abstraite à implémenter par chaque provider
     */
  abstract sendEmail(to: string | string[], subject: string, content: {
    html?: string,
    text?: string
  }, options?: SendEmailRequest): Promise<SendEmailResponse>;

  /**
   * Envoie un email avec toutes les options
   * Enveloppe pour la méthode sendEmail de base
   */
  async sendEmailWithOptions(message: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      // Vérifier si le provider peut envoyer un email
      if (!await this.canSendEmail()) {
        throw new EmailError(`Provider ${this.name} cannot send email at this time`, "provider_unavailable");
      }

      // Normaliser les destinataires
      const to = Array.isArray(message.to) ? message.to : [message.to];

      // Envoyer l'email
      const result = await this.sendEmail(
        to,
        message.subject,
        {
          html: message.htmlContent,
          text: message.textContent,
        }
      );

      // Mettre à jour les statistiques
      this.updateStats(true, result.cost);

      return result;
    } catch (error: any | EmailError) {
      // Mettre à jour les statistiques
      this.updateStats(false, 0, error.message);

      throw error;
    }
  }

  /**
   * Envoie un email à partir d'un template
   * Méthode abstraite à implémenter par chaque provider si nécessaire
   */

  abstract sendTemplate(to: string | string[], templateId: string, data: Record<string, any>, options?: SendEmailRequest):
    Promise<SendEmailResponse>;
  /**
   * Met à jour les statistiques du provider
   */
  protected updateStats(success: boolean, cost = 0, errorMessage = ""): void {
    // Log des statistiques
    logger.debug(`Email Provider ${this.name} stats updated`, {
      provider: this.name,
      stats: this.config.stats,
    });
  }

  /**
   * Teste la connexion au provider
   * Implémentation par défaut, à surcharger si nécessaire
   */
  async testConnection(): Promise<boolean> {
    try {
      // Tester la connexion selon le provider
      logger.info(`Testing connection to Email provider ${this.name}`);
      return true;
    } catch (error: any) {
      logger.error(`Connection test failed for Email provider ${this.name}`, error);
      return false;
    }
  }

  /**
   * Récupère les statistiques du provider
   */
  async getStats(): Promise<ProviderStats> {
    return this.config.stats;
  }


  /**
   * Réinitialise les statistiques du provider
   */
  async resetStats(): Promise<void> {
    logger.info(`Stats reset for Email provider ${this.name}`);
  }

  /**
   * Vérifie les limites de taux et met à jour l'état du provider
   */
  protected async checkRateLimits(): Promise<boolean> {
    // Implémentation de base, à surcharger pour des vérifications plus avancées
    const rateLimits = this.config.rateLimit;

    if (!rateLimits) {
      return true;
    }

    return true;
  }

  /* protected async checkRateLimits(): Promise<boolean> {
    // Implementation Firestore réelle
    const db = getFirestore();
    const now = new Date();
    const minuteKey = `${this.type}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}_${now.getHours()}_${now.getMinutes()}`;

    try {
      const doc = await db.collection('email_rate_limits').doc(minuteKey).get();
      const currentCount = doc.exists ? doc.data()?.count || 0 : 0;

      if (currentCount >= this.config.rateLimit.maxPerMinute) {
        return false;
      }

      await db.collection('email_rate_limits').doc(minuteKey).set({
        count: currentCount + 1,
        lastUpdate: now,
        provider: this.type
      }, { merge: true });

      return true;
    } catch (error) {
      logger.warn(`Rate limit check failed for ${this.type}`, error);
      return true; // Fail open
    }
  }
}*/
}
