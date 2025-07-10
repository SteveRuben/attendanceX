import {VonageConfig, SmsResult, SmsError} from "@attendance-x/shared";
import { parsePhoneNumber } from 'libphonenumber-js';
import {BaseSmsProvider} from "./BaseSmsProvider";
import axios from "axios";
import { logger } from "firebase-functions";


/**
 * Provider SMS utilisant l'API Vonage (ex-Nexmo)
 */
export class VonageProvider extends BaseSmsProvider {
  protected config: VonageConfig;
  protected baseUrl = "https://rest.nexmo.com/sms/json";

  constructor(config: VonageConfig) {
    super(config);
    this.config = config;

    logger.info("VonageProvider initialized");
  }

  /**
   * Envoie un SMS via l'API Vonage
   */
  async sendSms(phone: string, message: string): Promise<SmsResult> {
    try {
      // Vérifier les limites de taux
      if (!await this.checkRateLimits()) {
        throw new SmsError("Rate limit exceeded for Vonage provider", "rate_limit_exceeded");
      }

      // Normaliser le numéro de téléphone
      const normalizedPhone = this.normalizePhoneNumber(phone);

      // Déterminer les paramètres spécifiques au pays
      const countryCode = this.getCountryCode(normalizedPhone);
      const countrySettings = this.config.countrySettings[countryCode] || {};

      // Paramètres de la requête
      const params = {
        api_key: this.config.credentials.apiKey,
        api_secret: this.config.credentials.apiSecret,
        from: countrySettings.senderId || this.config.credentials.brandName,
        to: normalizedPhone,
        text: message,
        type: this.config.settings?.type || "text",
        ttl:  this.config.settings?.defaultTtl || 86400000,
        callback: this.config.settings?.webhookUrl,
        status_report_req: 1,
      };

      // Envoyer la requête à l'API Vonage
      logger.debug(`Sending SMS via Vonage to ${normalizedPhone}`, {
        provider: "vonage",
        to: normalizedPhone,
        messageLength: message.length,
      });

      const response = await axios.post(this.baseUrl, params);

      // Vérifier la réponse
      if (response.status !== 200) {
        throw new SmsError(
          `Vonage API returned status ${response.status}`,
          "vonage_api_error"
        );
      }

      // Vérifier les messages
      const result = response.data;

      if (result.messages?.length === 0) {
        throw new SmsError("Vonage API returned no messages", "vonage_no_messages");
      }

      const messageResult = result.messages[0];

      // Vérifier le statut
      if (messageResult.status !== "0") {
        throw new SmsError(
          `Vonage message delivery failed: ${messageResult["error-text"] || "Unknown error"}`,
          `vonage_error_${messageResult.status}`
        );
      }

      logger.info("SMS sent successfully via Vonage", {
        provider: "vonage",
        messageId: messageResult["message-id"],
        status: messageResult.status,
      });

      // Calculer le coût approximatif (Vonage ne renvoie pas le coût direct)
      const estimatedCost = this.calculateEstimatedCost(message, countryCode);

      // Retourner le résultat
      return {
        success: true,
        messageId: messageResult["message-id"],
        status: "sent",
        cost: estimatedCost,
        provider: "vonage",
        metadata: {
          remainingBalance: result["remaining-balance"],
          messageCount: messageResult["message-price"],
          network: messageResult.network,
        },
      };
    } catch (error) {
      // Logger l'erreur
      logger.error("Failed to send SMS via Vonage", {
        provider: "vonage",
        error: error instanceof Error ? error.name : String(error),
        errorCode: error instanceof Error ? error.message : String(error),
        to: phone,
      });

      throw error;
    }
  }

  /**
   * Teste la connexion à l'API Vonage
   */
  async testConnection(): Promise<boolean> {
    try {
      // Effectuer une requête de test à l'API Vonage (récupération du solde)
      const params = {
        api_key: this.config.credentials.apiKey,
        api_secret: this.config.credentials.apiSecret,
      };

      const response = await axios.get("https://rest.nexmo.com/account/get-balance", {params});

      if (response.status !== 200) {
        throw new Error(`Vonage API returned status ${response.status}`);
      }

      // Vérifier le solde
      const result = response.data;

      if (result.value === undefined) {
        throw new Error("Invalid response from Vonage API");
      }

      logger.info(`Vonage connection test successful, balance: ${result.value}`);
      /* this.stats.availabilityStatus = "available"; */
      return true;
    } catch (error) {
      logger.error("Vonage connection test failed", error);
     /*  this.stats.availabilityStatus = "unavailable";
      this.stats.lastError = {
        message: error.message,
        timestamp: new Date(),
      }; */
      return false;
    }
  }

  /**
   * Normalise un numéro de téléphone pour Vonage
   * S'assure que le numéro est au format international
   */
  protected normalizePhoneNumber(phone: string): string {
    const phoneNumber = parsePhoneNumber(phone);
    return phoneNumber.isValid() ? phoneNumber.formatInternational() : phone;
  }

  /**
   * Extrait le code pays d'un numéro de téléphone
   */
  private getCountryCode(phone: string): string {
   const phoneNumber = parsePhoneNumber(phone);
   return phoneNumber.country || "OTHER";
  }

  /**
   * Calcule le coût estimé d'un SMS
   */
  private calculateEstimatedCost(message: string, countryCode: string): number {
    // Implémentation simplifiée - les coûts réels dépendent de l'accord avec Vonage
    const baseRates: Record<string, number> = {
      "US": 0.0075,
      "FR": 0.0080,
      "GB": 0.0085,
      "OTHER": 0.01,
    };

    const baseRate = baseRates[countryCode] || baseRates.OTHER;
    const messageCount = Math.ceil(message.length / 160);

    return baseRate * messageCount;
  }
}
