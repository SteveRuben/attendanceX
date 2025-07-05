import {
  SmsMessage,
  SmsResult,
  SmsError,
  SmsTemplate,
  SmsProviderType,
  NotificationPriority,
} from "@attendance-x/shared";
import {collections,smsConfig} from "../../config";
import {SmsProviderFactory} from "../external/sms-providers/SmsProviderFactory";
import {TemplateService} from "./TemplateService";
import { logger } from "firebase-functions";

/**
 * Service de gestion des SMS
 * Gère l'envoi de SMS via différents providers avec failover et tracking
 */
export class SmsService {
  private templateService: TemplateService;

  constructor() {
    this.templateService = new TemplateService();
  }

  /**
   * Envoie un SMS simple
   */
  async sendSms(phone: string, message: string, options: {
    provider?: SmsProviderType;
    trackingId?: string;
    userId?: string;
    priority?: number;
  } = {}): Promise<SmsResult> {
    try {
      // Valider le numéro de téléphone
      this.validatePhoneNumber(phone);

      // Valider le message
      this.validateMessage(message);

      // Créer l'objet message
      const smsMessage: SmsMessage = {
        recipientPhone: phone,
        content: message,
        recipientUserId: options.userId,
        priority: NotificationPriority.MEDIUM,
        eventId: options.trackingId || `sms-${Date.now()}`,
        providerId: String(options.provider),
        status: "sent",
        retryCount: 0,
        maxRetries: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Envoyer le SMS avec le provider spécifié ou le provider par défaut
      if (options.provider) {
        return await this.sendWithProvider(options.provider, smsMessage);
      } else {
        return await this.sendWithFailover(smsMessage);
      }
    } catch (error) {
      logger.error("Error sending SMS", {
        error: error instanceof Error ? error.message : String(error),
        to: phone,
        provider: options.provider,
      });

      // Rethrow l'erreur
      throw error;
    }
  }

  /**
   * Envoie un SMS à partir d'un template
   */
  async sendFromTemplate(phone: string, templateId: string, data: Record<string, any>, options: {
    provider?: SmsProviderType;
    trackingId?: string;
    userId?: string;
    priority?: number;
  } = {}): Promise<SmsResult> {
    try {
      // Récupérer le template
      const template = await this.getTemplate(templateId);

      if (!template) {
        throw new SmsError(`SMS template not found: ${templateId}`, "template_not_found");
      }

      // Traiter le template avec les données
      const message = this.templateService.processTemplate(template.content, data);

      // Envoyer le SMS
      return await this.sendSms(phone, message, {
        ...options,
        trackingId: options.trackingId || `template-${templateId}-${Date.now()}`,
      });
    } catch (error) {
      logger.error("Error sending SMS from template", {
        error: error instanceof Error ? error.message : String(error),
        to: phone,
        templateId,
      });

      throw error;
    }
  }

  /**
   * Envoie un SMS avec un provider spécifique
   */
  private async sendWithProvider(providerType: SmsProviderType, message: SmsMessage): Promise<SmsResult> {
    try {
      // Récupérer le provider
      const provider = await SmsProviderFactory.getProvider(providerType);

      // Vérifier si le provider est disponible
      if (!provider.isActive) {
        throw new SmsError(`SMS provider ${providerType} is not active`, "provider_not_active");
      }

      // Envoyer le SMS
      logger.info(`Sending SMS via ${providerType}`, {
        to: message.recipientPhone,
        trackingId: message.messageId,
      });

       // @ts-ignore
      const result = await provider.sendSmsWithOptions(message);

      // Tracking de l'envoi
      await this.trackSmsDelivery(message, result);

      return result;
    } catch (error) {
      // Logger l'erreur
      logger.error(`Failed to send SMS via ${providerType}`, {
        error: error instanceof Error ? error.message : String(error),
        to: message.recipientPhone,
        trackingId: message.eventId,
      });

      // Rethrow l'erreur
      throw error;
    }
  }

  /**
   * Envoie un SMS avec failover automatique entre providers
   */
  private async sendWithFailover(message: SmsMessage): Promise<SmsResult> {
    // Récupérer tous les providers disponibles
    const providers = await SmsProviderFactory.getAllProviders();

    // Vérifier qu'il y a au moins un provider
    if (providers.length === 0) {
      throw new SmsError("No SMS providers available", "no_providers");
    }

    // Trier les providers par priorité
    const sortedProviders = providers
      .filter((p) => p.isActive)
      .sort((a, b) => a.priority - b.priority);

    // Si aucun provider actif, lancer une erreur
    if (sortedProviders.length === 0) {
      throw new SmsError("No active SMS providers available", "no_active_providers");
    }

    // Essayer chaque provider dans l'ordre jusqu'à ce qu'un réussisse
    let lastError: Error | null = null;

    for (const provider of sortedProviders) {
      try {
        logger.info(`Trying to send SMS via ${provider.type}`, {
          to: message.recipientPhone,
          trackingId: message.eventId,
          providerPriority: provider.priority,
        });

        // Envoyer le SMS
        // @ts-ignore
        const result = await provider.sendSmsWithOptions(message);

        // Tracking de l'envoi
        await this.trackSmsDelivery(message, result);

        // Si réussi, retourner le résultat
        return result;
      } catch (error) {
        // Logger l'erreur
        logger.warn(`Failed to send SMS via ${provider.type}, trying next provider`, {
          error: error instanceof Error ? error.message : String(error),
          to: message.recipientPhone,
          trackingId: message.eventId,
        });

        // Garder la dernière erreur
        lastError = error instanceof Error ? error : new Error(String(error));

        // Continuer avec le provider suivant
        continue;
      }
    }

    // Si tous les providers ont échoué, lancer la dernière erreur
    throw lastError || new SmsError("All SMS providers failed", "all_providers_failed");
  }

  /**
   * Enregistre l'envoi d'un SMS dans la base de données
   */
  private async trackSmsDelivery(message: SmsMessage, result: SmsResult): Promise<void> {
    try {
      // Créer l'objet de tracking
      const tracking = {
        to: message.recipientPhone,
        body: message.content,
        provider: result.provider,
        messageId: result.messageId,
        status: result.status,
        cost: result.cost,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Stocker dans Firestore
      await collections.smsMessages.add(tracking);

      logger.debug("SMS delivery tracked", {
        trackingId: message.eventId,
        messageId: result.messageId,
        provider: result.provider,
      });
    } catch (error) {
      logger.error("Failed to track SMS delivery", {
        error: error instanceof Error ? error.message : String(error),
        trackingId: message.eventId,
      });

      // Ne pas bloquer l'envoi si le tracking échoue
    }
  }

  /**
   * Récupère un template SMS par ID
   */
  private async getTemplate(templateId: string): Promise<SmsTemplate | null> {
    try {
      // Essayer de récupérer depuis Firestore
      const snapshot = await collections.smsTemplates.doc(templateId).get();

      if (snapshot.exists) {
        const data = snapshot.data() as SmsTemplate;
        return {
           ...data,
          id: snapshot.id,
        };
      }

      // Si pas trouvé, chercher dans les templates statiques
      // (Implémentation simplifiée, à adapter selon vos besoins)

      return null;
    } catch (error) {
      logger.error(`Error retrieving SMS template: ${templateId}`, error);
      return null;
    }
  }

  /**
   * Valide un numéro de téléphone
   */
  private validatePhoneNumber(phone: string): void {
    // Validation simple - à améliorer avec une bibliothèque comme libphonenumber-js
    if (!phone || phone.length < 8) {
      throw new SmsError("Invalid phone number", "invalid_phone");
    }
  }

  /**
   * Valide un message SMS
   */
  private validateMessage(message: string): void {
    // Vérifier que le message n'est pas vide
    if (!message || message.trim().length === 0) {
      throw new SmsError("SMS message cannot be empty", "empty_message");
    }

    // Vérifier la longueur du message
    const maxLength = smsConfig.messageConfig.maxLength;
    if (message.length > maxLength) {
      throw new SmsError(`SMS message too long (max ${maxLength} characters)`, "message_too_long");
    }
  }

  /**
   * Récupère tous les providers SMS disponibles
   */
  async getAvailableProviders(): Promise<{ id: string; name: string; type: string; isActive: boolean }[]> {
    try {
      const providers = await SmsProviderFactory.getAllProviders();

      return providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        type: provider.type,
        isActive: provider.isActive,
      }));
    } catch (error) {
      logger.error("Error getting available SMS providers", error);
      return [];
    }
  }

  /**
   * Teste tous les providers SMS
   */
  async testAllProviders(): Promise<Record<string, boolean>> {
    return await SmsProviderFactory.testAllProviders();
  }
}

export default SmsService;
