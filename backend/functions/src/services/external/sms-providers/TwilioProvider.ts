
import {BaseSmsProvider} from "./BaseSmsProvider";
import Twilio from "twilio";
import { logger } from "firebase-functions";
import { SmsResult, TwilioConfig } from "../../../common/types";

/**
 * Provider SMS utilisant l'API Twilio
 */
export class TwilioProvider extends BaseSmsProvider {
  //@ts-ignore
  protected client: Twilio.Twilio;
  protected config: TwilioConfig;

  constructor(config: TwilioConfig) {
    super(config);
    this.config = config;

    // Initialiser le client Twilio
    try {
      this.client = Twilio(
        this.config.credentials.accountSid,
        this.config.credentials.authToken
      );

      logger.info("TwilioProvider initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize TwilioProvider", error);
    }
  }

  sendSms(phone: string, message: string): Promise<SmsResult> {
    throw new Error("Method not implemented.");
  }
  /**
   * Envoie un SMS via l'API Twilio
   */
  /* async sendSms(phone: string, message: string): Promise<SmsResult> {
    try {
      // Vérifier les limites de taux
      if (!await this.checkRateLimits()) {
        throw new SmsError("Rate limit exceeded for Twilio provider", "rate_limit_exceeded");
      }

      // Normaliser le numéro de téléphone
      const normalizedPhone = this.normalizePhoneNumber(phone);

      // Paramètres de l'envoi
      const messageParams: Twilio.MessageCreateOptions = {
        body: message,
        from: this.config.credentials.phoneNumber,
        to: normalizedPhone,
        statusCallback: this.config.settings?.statusCallback,
      };

      // Envoyer le SMS via Twilio
      logger.debug(`Sending SMS via Twilio to ${normalizedPhone}`, {
        provider: "twilio",
        to: normalizedPhone,
        messageLength: message.length,
      });

      const result = await this.client.messages.create(messageParams);

      // Vérifier le statut
      if (result.status === "failed" || result.status === "undelivered") {
        throw new SmsError(
          `Twilio message delivery failed: ${result.errorMessage || "Unknown error"}`,
          result.errorCode || "twilio_delivery_failed"
        );
      }

      logger.info("SMS sent successfully via Twilio", {
        provider: "twilio",
        messageId: result.sid,
        status: result.status,
      });

      // Retourner le résultat
      return {
        success: true,
        messageId: result.sid,
        status: result.status,
        cost: parseFloat(result.price || "0"),
        provider: "twilio",
        metadata: {
          numSegments: result.numSegments,
          direction: result.direction,
          apiVersion: result.apiVersion,
        },
      };
    } catch (error) {
      // Logger l'erreur
      logger.error("Failed to send SMS via Twilio", {
        provider: "twilio",
        error: error.message,
        errorCode: error.code,
        to: phone,
      });

      // Convertir l'erreur en SmsError si nécessaire
      let smsError: SmsError;
      if (!(error instanceof SmsError)) {
        smsError = new SmsError(
          `Twilio error: ${error.message}`,
          error.code || "twilio_error"
        );
      } else {
        smsError = error;
      }

      // Mettre à jour le statut du provider si nécessaire
      if (smsError.code === "twilio_auth_error" || smsError.code === "twilio_account_error") {
        this.stats.availabilityStatus = "unavailable";
      }

      throw smsError;
    }
  } */

  /**
   * Teste la connexion à l'API Twilio
   */
  /* async testConnection(): Promise<boolean> {
    try {
      // Vérifier les informations d'identification en récupérant le compte
      const account = await this.client.api.accounts(this.config.credentials.accountSid).fetch();

      // Vérifier le statut du compte
      if (account.status !== "active") {
        logger.warn(`Twilio account is not active: ${account.status}`);
        this.stats.availabilityStatus = "unavailable";
        return false;
      }

      // Vérifier que le numéro de téléphone est valide
      const numbers = await this.client.incomingPhoneNumbers.list({limit: 20});
      const phoneNumberExists = numbers.some(
        (number) => number.phoneNumber === this.config.credentials.phoneNumber
      );

      if (!phoneNumberExists) {
        logger.warn(`Phone number ${this.config.credentials.phoneNumber} not found in Twilio account`);
      }

      logger.info("Twilio connection test successful");
      this.stats.availabilityStatus = "available";
      return true;
    } catch (error) {
      logger.error("Twilio connection test failed", error);
      this.stats.availabilityStatus = "unavailable";
      this.stats.lastError = {
        message: error.message,
        timestamp: new Date(),
      };
      return false;
    }
  } */

  /**
   * Normalise un numéro de téléphone pour Twilio
   * S'assure que le numéro est au format E.164
   */
  protected normalizePhoneNumber(phone: string): string {
    // Supprimer tous les caractères non numériques
    let normalized = phone.replace(/\D/g, "");

    // S'assurer que le numéro commence par +
    if (!normalized.startsWith("+")) {
      normalized = `+${normalized}`;
    }

    return normalized;
  }

  /**
   * Vérifie les limites de taux spécifiques à Twilio
   */
  protected async checkRateLimits(): Promise<boolean> {
    // Implémenter une vérification plus avancée des limites de taux pour Twilio
    // Pour l'instant, on utilise l'implémentation de base
    return await super.checkRateLimits();
  }
}
