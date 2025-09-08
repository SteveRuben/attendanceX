import {SendgridProvider} from "./SendgridProvider";
import {MailgunProvider} from "./MailgunProvider";
import {AwsSesProvider} from "./AwsSesProvider";
import {SmtpProvider} from "./SmtpProvider";
import {EmailProviderConfig, EmailProviderType, IEmailProvider} from "../../../shared";
import {logger} from "firebase-functions";
import {collections, emailProviderConfigs} from "../../../config";


/**
 * Factory pour créer des instances de providers Email
 * Centralise la création et la gestion des providers
 */
export class EmailProviderFactory {
  private static providers: Map<string, IEmailProvider> = new Map();

  /**
   * Crée ou récupère une instance de provider Email selon le type
   */
  static async getProvider(type: EmailProviderType): Promise<IEmailProvider> {
    // Vérifier si le provider existe déjà en cache
    if (EmailProviderFactory.providers.has(type)) {
      return EmailProviderFactory.providers.get(type)!;
    }

    // Récupérer la configuration du provider
    const config = await EmailProviderFactory.getProviderConfig(type);

    if (!config) {
      throw new Error(`Email provider configuration not found for type: ${type}`);
    }

    // Créer une nouvelle instance selon le type
    let provider: IEmailProvider;

    switch (type) {
    case EmailProviderType.SENDGRID:
      provider = new SendgridProvider(config as any);
      break;
    case EmailProviderType.MAILGUN:
      provider = new MailgunProvider(config as any);
      break;
    case EmailProviderType.AWS_SES:
      provider = new AwsSesProvider(config as any);
      break;
    case EmailProviderType.SMTP:
      provider = new SmtpProvider(config as any);
      break;
    default:
      throw new Error(`Unsupported Email provider type: ${type}`);
    }

    // Mettre en cache le provider
    EmailProviderFactory.providers.set(type, provider);

    logger.info(`Email provider created: ${type}`);
    return provider;
  }

  /**
   * Récupère tous les providers Email disponibles et actifs
   */
  static async getAllProviders(): Promise<IEmailProvider[]> {
    const providers: IEmailProvider[] = [];

    // Types de providers à initialiser
    const providerTypes: EmailProviderType[] = [
      EmailProviderType.SENDGRID,
      EmailProviderType.MAILGUN,
      EmailProviderType.AWS_SES,
      EmailProviderType.POSTMARK,
      EmailProviderType.CUSTOM_API,
      EmailProviderType.SMTP];

    // Initialiser chaque provider
    for (const type of providerTypes) {
      try {
        const config = await EmailProviderFactory.getProviderConfig(type);

        // Ne créer que les providers activés
        if (config && config.isActive) {
          const provider = await EmailProviderFactory.getProvider(type);
          providers.push(provider);
        }
      } catch (error) {
        logger.warn(`Failed to initialize Email provider: ${type}`, error);
      }
    }

    // Trier par priorité
    providers.sort((a, b) => a.priority - b.priority);

    return providers;
  }

  /**
   * Récupère la configuration d'un provider depuis la base de données ou la config statique
   */
  private static async getProviderConfig(type: EmailProviderType): Promise<EmailProviderConfig | null> {
    try {
      // Essayer de récupérer la configuration depuis Firestore
      const snapshot = await collections.emailProviders
        .where("type", "==", type)
        .where("isActive", "==", true)
        .limit(1).get();

      if (!snapshot.empty) {
        // Configuration trouvée dans la base de données
        const data = snapshot.docs[0].data() as EmailProviderConfig;
        logger.debug(`Email provider config loaded from database: ${type}`);
        return {
          id: snapshot.docs[0].id,
          ...data,
        };
      }

      // Sinon, utiliser la configuration statique
      const staticConfig = emailProviderConfigs[type];

      if (!staticConfig) {
        logger.warn(`No configuration found for Email provider: ${type}`);
        return null;
      }

      logger.debug(`Email provider config loaded from static config: ${type}`);
      return staticConfig;
    } catch (error) {
      logger.error(`Error loading Email provider config: ${type}`, error);

      // En cas d'erreur, essayer d'utiliser la configuration statique
      return null;
    }
  }

  /**
   * Recharge un provider spécifique (supprime l'instance du cache)
   */
  static reloadProvider(type: EmailProviderType): void {
    EmailProviderFactory.providers.delete(type);
    logger.info(`Email provider reloaded: ${type}`);
  }

  /**
   * Recharge tous les providers
   */
  static reloadAllProviders(): void {
    EmailProviderFactory.providers.clear();
    logger.info("All Email providers reloaded");
  }

  /**
   * Teste la connexion à tous les providers
   */
  static async testAllProviders(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    const providers = await EmailProviderFactory.getAllProviders();

    for (const provider of providers) {
      try {
        results[provider.type] = await provider.testConnection();
      } catch (error) {
        logger.error(`Error testing Email provider: ${provider.type}`, error);
        results[provider.type] = false;
      }
    }

    return results;
  }
}

export default EmailProviderFactory;
