import {SendgridProvider} from "./SendgridProvider";
import {MailgunProvider} from "./MailgunProvider";
import {AwsSesProvider} from "./AwsSesProvider";
import {SmtpProvider} from "./SmtpProvider";
import {logger} from "firebase-functions";
import {collections, emailProviderConfigs} from "../../../config";
import { EmailProviderConfig, EmailProviderType, IEmailProvider } from "../../../common/types";


/**
 * Factory pour créer des instances de providers Email
 * Centralise la création et la gestion des providers avec support multi-tenant
 */
export class EmailProviderFactory {
  private static providers: Map<string, IEmailProvider> = new Map();
  
  // Cache tenant-aware pour les providers spécifiques aux tenants
  private static tenantProviders: Map<string, Map<string, IEmailProvider>> = new Map();

  /**
   * Crée ou récupère une instance de provider Email selon le type (rétrocompatibilité)
   */
  static async getProvider(type: EmailProviderType): Promise<IEmailProvider> {
    return this.getProviderForTenant(type, null);
  }

  /**
   * Crée ou récupère une instance de provider Email pour un tenant spécifique
   * Utilise la configuration tenant → global → statique avec fallback automatique
   */
  static async getProviderForTenant(
    type: EmailProviderType, 
    tenantId: string | null
  ): Promise<IEmailProvider> {
    // Vérifier le cache tenant-specific
    if (tenantId && this.tenantProviders.has(tenantId)) {
      const tenantCache = this.tenantProviders.get(tenantId)!;
      if (tenantCache.has(type)) {
        return tenantCache.get(type)!;
      }
    }
    
    // Vérifier le cache global pour les configs par défaut
    if (!tenantId && this.providers.has(type)) {
      return this.providers.get(type)!;
    }

    // Récupérer la configuration avec fallback tenant → global → statique
    const config = await this.getProviderConfig(type, tenantId);

    if (!config) {
      throw new Error(`Email provider configuration not found for type: ${type}`);
    }

    // Créer le provider avec la config appropriée
    const provider = this.createProviderInstance(type, config);

    // Mettre en cache selon le contexte
    if (tenantId) {
      if (!this.tenantProviders.has(tenantId)) {
        this.tenantProviders.set(tenantId, new Map());
      }
      this.tenantProviders.get(tenantId)!.set(type, provider);
    } else {
      this.providers.set(type, provider);
    }

    logger.info(`Email provider created: ${type}`, { tenantId });
    return provider;
  }

  /**
   * Crée une instance de provider selon le type
   */
  private static createProviderInstance(type: EmailProviderType, config: EmailProviderConfig): IEmailProvider {
    switch (type) {
    case EmailProviderType.SENDGRID:
      return new SendgridProvider(config as any);
    case EmailProviderType.MAILGUN:
      return new MailgunProvider(config as any);
    case EmailProviderType.AWS_SES:
      return new AwsSesProvider(config as any);
    case EmailProviderType.SMTP:
      return new SmtpProvider(config as any);
    default:
      throw new Error(`Unsupported Email provider type: ${type}`);
    }
  }

  /**
   * Récupère tous les providers Email disponibles et actifs
   * Support multi-tenant avec fallback automatique
   */
  static async getAllProviders(tenantId?: string): Promise<IEmailProvider[]> {
    const providers: IEmailProvider[] = [];

    // Types de providers à initialiser
    const providerTypes: EmailProviderType[] = [
      EmailProviderType.SENDGRID,
      EmailProviderType.MAILGUN,
      EmailProviderType.AWS_SES,
      EmailProviderType.POSTMARK,
      EmailProviderType.CUSTOM_API,
      EmailProviderType.SMTP];

    // Initialiser chaque provider avec support tenant
    for (const type of providerTypes) {
      try {
        const config = await this.getProviderConfig(type, tenantId || null);

        // Ne créer que les providers activés
        if (config && config.isActive) {
          const provider = await this.getProviderForTenant(type, tenantId || null);
          providers.push(provider);
        }
      } catch (error) {
        logger.warn(`Failed to initialize Email provider: ${type}`, { error, tenantId });
      }
    }

    // Trier par priorité
    providers.sort((a, b) => a.priority - b.priority);

    return providers;
  }

  /**
   * Récupère la configuration d'un provider avec fallback tenant → global → statique
   */
  private static async getProviderConfig(
    type: EmailProviderType, 
    tenantId: string | null
  ): Promise<EmailProviderConfig | null> {
    try {
      // 1. Essayer config tenant-specific en premier
      if (tenantId) {
        const tenantConfig = await this.getTenantProviderConfig(type, tenantId);
        if (tenantConfig) {
          logger.debug(`Email provider config loaded from tenant: ${type}`, { tenantId });
          return tenantConfig;
        }
      }

      // 2. Fallback vers config globale (Firestore)
      const globalConfig = await this.getGlobalProviderConfig(type);
      if (globalConfig) {
        logger.debug(`Email provider config loaded from global: ${type}`, { tenantId });
        return globalConfig;
      }

      // 3. Fallback vers config statique
      const staticConfig = emailProviderConfigs[type];
      if (staticConfig) {
        logger.debug(`Email provider config loaded from static: ${type}`, { tenantId });
        return staticConfig;
      }

      logger.warn(`No configuration found for Email provider: ${type}`, { tenantId });
      return null;
    } catch (error) {
      logger.error(`Error loading Email provider config: ${type}`, { error, tenantId });
      return null;
    }
  }

  /**
   * Récupère la configuration tenant-specific depuis Firestore
   */
  private static async getTenantProviderConfig(
    type: EmailProviderType, 
    tenantId: string
  ): Promise<EmailProviderConfig | null> {
    try {
      const snapshot = await collections.tenants
        .doc(tenantId)
        .collection('emailProviders')
        .where('type', '==', type)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data() as EmailProviderConfig;
        return {
          id: snapshot.docs[0].id,
          ...data,
        };
      }

      return null;
    } catch (error) {
      logger.error(`Error loading tenant Email provider config: ${type}`, { error, tenantId });
      return null;
    }
  }

  /**
   * Récupère la configuration globale depuis Firestore
   */
  private static async getGlobalProviderConfig(
    type: EmailProviderType
  ): Promise<EmailProviderConfig | null> {
    try {
      const snapshot = await collections.emailProviders
        .where("type", "==", type)
        .where("isActive", "==", true)
        .limit(1).get();

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data() as EmailProviderConfig;
        return {
          id: snapshot.docs[0].id,
          ...data,
        };
      }

      return null;
    } catch (error) {
      logger.error(`Error loading global Email provider config: ${type}`, { error });
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
   * Recharge les providers d'un tenant spécifique
   */
  static reloadTenantProviders(tenantId: string): void {
    this.tenantProviders.delete(tenantId);
    logger.info(`Tenant Email providers reloaded: ${tenantId}`);
  }

  /**
   * Recharge tous les providers (global et tenant)
   */
  static reloadAllProviders(): void {
    EmailProviderFactory.providers.clear();
    this.tenantProviders.clear();
    logger.info("All Email providers reloaded");
  }

  /**
   * Teste la connexion à tous les providers pour un tenant
   */
  static async testAllProviders(tenantId?: string): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    const providers = await EmailProviderFactory.getAllProviders(tenantId);

    for (const provider of providers) {
      try {
        results[provider.type] = await provider.testConnection();
      } catch (error) {
        logger.error(`Error testing Email provider: ${provider.type}`, { error, tenantId });
        results[provider.type] = false;
      }
    }

    return results;
  }
}

export default EmailProviderFactory;
