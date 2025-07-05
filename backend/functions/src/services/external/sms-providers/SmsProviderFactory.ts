
import {TwilioProvider} from "./TwilioProvider";
import {VonageProvider} from "./VonageProvider";
import {AwsSnsProvider} from "./AwsSnsProvider";
import {CustomApiProvider} from "./CustomApiProvider";
import {ISmsProvider, SmsProviderConfig, SmsProviderType} from "@attendance-x/shared";
import {collections, smsProviderConfigs} from "../../../config";
import {logger} from "firebase-functions";

/**
 * Interface pour le factory SMS
 */
export interface ISmsProviderFactory {
  getProvider(type: SmsProviderType): Promise<ISmsProvider>;
  getAllProviders(): Promise<ISmsProvider[]>;
  getDefaultProvider(): Promise<ISmsProvider>;
  getFallbackProviders(): Promise<ISmsProvider[]>;
  reloadProvider(type: SmsProviderType): void;
  testAllProviders(): Promise<Record<string, boolean>>;
}

/**
 * Factory pour créer des instances de providers SMS
 * Centralise la création et la gestion des providers
 */
export class SmsProviderFactory implements ISmsProviderFactory {
  private static providers: Map<string, ISmsProvider> = new Map();

  /**
   * Récupère le provider par défaut
   */
  static async getDefaultProvider(): Promise<ISmsProvider> {
    const configs = Object.values(smsProviderConfigs).filter((config) => config.isActive);

    if (configs.length === 0) {
      throw new Error("No active SMS provider found");
    }

    // Trier par priorité et prendre le premier
    const defaultConfig = configs.sort((a, b) => a.priority - b.priority)[0];

    return await SmsProviderFactory.getProvider(defaultConfig.type);
  }

  /**
   * Récupère les providers de fallback
   */
  static async getFallbackProviders(): Promise<ISmsProvider[]> {
    const allProviders = await SmsProviderFactory.getAllProviders();

    // Retourner tous sauf le premier (qui est le default)
    return allProviders.slice(1);
  }

  /**
   * Crée ou récupère une instance de provider SMS selon le type
   */
  static async getProvider(type: SmsProviderType): Promise<ISmsProvider> {
    // Vérifier si le provider existe déjà en cache
    if (SmsProviderFactory.providers.has(type)) {
      return SmsProviderFactory.providers.get(type)!;
    }

    // Récupérer la configuration du provider
    const config = await SmsProviderFactory.getProviderConfig(type);

    if (!config) {
      throw new Error(`SMS provider configuration not found for type: ${type}`);
    }

    // Créer une nouvelle instance selon le type
    let provider: ISmsProvider;

    switch (type) {
    case "twilio":
      provider = new TwilioProvider(config as any);
      break;
    case "vonage":
      provider = new VonageProvider(config as any);
      break;
    case "aws_sns":
      provider = new AwsSnsProvider(config as any);
      break;
    case "custom_api":
      provider = new CustomApiProvider(config as any);
      break;
    default:
      throw new Error(`Unsupported SMS provider type: ${type}`);
    }

    // Mettre en cache le provider
    SmsProviderFactory.providers.set(type, provider);

    logger.info(`SMS provider created: ${type}`);
    return provider;
  }

  /**
   * Récupère tous les providers SMS disponibles et actifs
   */
  static async getAllProviders(): Promise<ISmsProvider[]> {
    const providers: ISmsProvider[] = [];

    // Types de providers à initialiser
    const providerTypes: SmsProviderType[] = [
      SmsProviderType.TWILIO,
      SmsProviderType.VONAGE,
      SmsProviderType.AWS_SNS,
      SmsProviderType.CUSTOM_API,
      SmsProviderType.MESSAGEBIRD,
      SmsProviderType.SENDGRID,
      SmsProviderType.WEBHOOK];

    // Initialiser chaque provider
    for (const type of providerTypes) {
      try {
        const config = await SmsProviderFactory.getProviderConfig(type);

        // Ne créer que les providers activés
        if (config && config.isActive) {
          const provider = await SmsProviderFactory.getProvider(type);
          providers.push(provider);
        }
      } catch (error) {
        logger.warn(`Failed to initialize SMS provider: ${type}`, error);
      }
    }

    // Trier par priorité
    providers.sort((a, b) => a.priority - b.priority);

    return providers;
  }

  /**
   * Récupère la configuration d'un provider depuis la base de données ou la config statique
   */
  private static async getProviderConfig(type: SmsProviderType): Promise<SmsProviderConfig | null> {
    try {
      // Essayer de récupérer la configuration depuis Firestore
      const snapshot = await collections.smsProviders.where("type", "==", type).limit(1).get();

      if (!snapshot.empty) {
        // Configuration trouvée dans la base de données
        const data = snapshot.docs[0].data() as SmsProviderConfig;
        logger.debug(`SMS provider config loaded from database: ${type}`);
        return {
          ...data,
          id: snapshot.docs[0].id,
        };
      }

      // Sinon, utiliser la configuration statique
      const staticConfig = smsProviderConfigs[type];

      if (!staticConfig) {
        logger.warn(`No configuration found for SMS provider: ${type}`);
        return null;
      }

      logger.debug(`SMS provider config loaded from static config: ${type}`);
      return staticConfig;
    } catch (error) {
      logger.error(`Error loading SMS provider config: ${type}`, error);

      // En cas d'erreur, essayer d'utiliser la configuration statique
      return smsProviderConfigs[type] || null;
    }
  }

  /**
   * Recharge un provider spécifique (supprime l'instance du cache)
   */
  static reloadProvider(type: SmsProviderType): void {
    SmsProviderFactory.providers.delete(type);
    logger.info(`SMS provider reloaded: ${type}`);
  }

  /**
   * Recharge tous les providers
   */
  static reloadAllProviders(): void {
    SmsProviderFactory.providers.clear();
    logger.info("All SMS providers reloaded");
  }

  /**
   * Teste la connexion à tous les providers
   */
  static async testAllProviders(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    const providers = await SmsProviderFactory.getAllProviders();

    for (const provider of providers) {
      try {
        results[provider.type] = await provider.testConnection();
      } catch (error) {
        logger.error(`Error testing SMS provider: ${provider.type}`, error);
        results[provider.type] = false;
      }
    }

    return results;
  }

  /**
   * Trouve le meilleur provider disponible
   */
  static async getBestAvailableProvider(): Promise<ISmsProvider | null> {
    const providers = await SmsProviderFactory.getAllProviders();

    for (const provider of providers) {
      try {
        if (await provider.canSendSms()) {
          return provider;
        }
      } catch (error: any) {
        logger.warn(`Provider ${provider.name} is not available`, error);
        continue;
      }
    }

    return null;
  }

  /**
   * Envoie un SMS avec failover automatique
   */
  static async sendSmsWithFailover(phone: string, message: string): Promise<{
    success: boolean;
    result?: any;
    provider?: string;
    error?: string;
  }> {
    const providers = await SmsProviderFactory.getAllProviders();

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        if (await provider.canSendSms()) {
          const result = await provider.sendSms(phone, message);

          logger.info(`SMS sent successfully via ${provider.name}`, {
            provider: provider.type,
            messageId: result.messageId,
          });

          return {
            success: true,
            result,
            provider: provider.type,
          };
        }
      } catch (error: any) {
        lastError = error;
        logger.warn(`Failed to send SMS via ${provider.name}, trying next provider`, {
          provider: provider.type,
          error: error.message,
        });
        continue;
      }
    }

    // Tous les providers ont échoué
    logger.error("All SMS providers failed", {
      lastError: lastError?.message,
      providersCount: providers.length,
    });

    return {
      success: false,
      error: lastError?.message || "All SMS providers failed",
    };
  }
}

export default SmsProviderFactory;
