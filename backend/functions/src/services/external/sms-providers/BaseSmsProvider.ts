import {
  ISmsProvider,
  SmsError,
  SmsMessage,
  SmsProviderConfig,
  SmsProviderType,
  SmsResult} from "../../../shared";
import {db} from "../../../config";
import {logger} from "firebase-functions";


/**
 * Classe de base abstraite pour tous les providers SMS
 * Implémente les fonctionnalités communes à tous les providers
 */
export abstract class BaseSmsProvider implements ISmsProvider {
  protected config: SmsProviderConfig;


  constructor(config: SmsProviderConfig) {
    this.config = config;

    // Initialiser les statistiques
  }

  /**
   * Getter pour l'ID du provider
   */
  get id(): string {
    return this.config.id || this.config.type;
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
  get type(): SmsProviderType {
    return this.config.type;
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
   * Vérifie si le provider peut envoyer un SMS
   * Applique les limites de taux et autres vérifications
   */
  async canSendSms(): Promise<boolean> {
    // Vérifier si le provider est activé
    if (!this.config.isActive) {
      logger.warn(`Provider ${this.name} is disabled`);
      return false;
    }

    // Vérifier les limites de taux

    // Vérifier la disponibilité


    return true;
  }

  /**
   * Envoie un SMS en utilisant le provider spécifique
   * Méthode abstraite à implémenter par chaque provider
   */
  abstract sendSms(phone: string, message: string): Promise<SmsResult>;

  /**
   * Envoie un SMS avec plus d'options
   * Enveloppe pour la méthode sendSms de base
   */
  async sendSmsWithOptions(message: SmsMessage): Promise<SmsResult> {
    try {
      // Vérifier si le provider peut envoyer un SMS
      if (!await this.canSendSms()) {
        throw new SmsError(`Provider ${this.name} cannot send SMS at this time`, "provider_unavailable");
      }

      const result = await this.sendSms(message.recipientPhone, message.content);

      // Mettre à jour les statistiques
      this.updateStats(true, result.cost);

      return result;
    } catch (error: any) {
      // Mettre à jour les statistiques
      this.updateStats(false, 0, error.message);

      throw error;
    }
  }

  /**
   * Met à jour les statistiques du provider
   */
  protected updateStats(success: boolean, cost = 0, errorMessage = ""): void {
    // Mettre à jour les compteurs

    // Log des statistiques
    logger.debug(`SMS Provider ${this.name} stats updated`, {
      provider: this.name,
    });
  }

  /**
   * Teste la connexion au provider
   * Implémentation par défaut, à surcharger si nécessaire
   */
  async testConnection(): Promise<boolean> {
    try {
      // Tester la connexion selon le provider
      logger.info(`Testing connection to SMS provider ${this.name}`);

      // Par défaut, on considère que le provider est disponible
      // Les implémentations spécifiques doivent surcharger cette méthode
      return true;
    } catch (error: any) {
      logger.error(`Connection test failed for SMS provider ${this.name}`, error);
      return false;
    }
  }

  /**
   * Réinitialise les statistiques du provider
   */
  async resetStats(): Promise<void> {
    /*     this.stats = {
      totalSent: 0,
      totalFailed: 0,
      successRate: 0,
      lastUsed: null,
      averageCost: 0,
      totalCost: 0,
      lastError: null,
      rateLimitReached: false,
      availabilityStatus: "available",
    }; */

    logger.info(`Stats reset for SMS provider ${this.name}`);
  }

  /**
   * Vérifie les limites de taux et met à jour l'état du provider
   */
  protected async checkRateLimits(): Promise<boolean> {
    const rateLimits = this.config.rateLimit;

    if (!rateLimits) {
      return true;
    }

    // Implementation avec Firestore
    const now = new Date();
    const providerKey = `rate_limit_sms_${this.type}_${now.getMinutes()}`;

    try {
      const doc = await db.collection("rate_limits").doc(providerKey).get();
      const currentCount = doc.exists ? doc.data()?.count || 0 : 0;

      if (currentCount >= rateLimits.maxPerMinute) {
        /* this.stats.rateLimitReached = true; */
        logger.warn(`Rate limit exceeded for SMS provider ${this.name}`, {
          provider: this.name,
          currentCount,
          maxPerMinute: rateLimits.maxPerMinute,
        });
        return false;
      }

      // Increment counter
      await db.collection("rate_limits").doc(providerKey).set({
        count: currentCount + 1,
        lastUpdate: now,
        provider: this.type,
        resetAt: new Date(Math.ceil(now.getTime() / (60 * 1000)) * (60 * 1000)), // Next minute
      }, {merge: true});

      return true;
    } catch (error: any) {
      logger.warn("Rate limit check failed, allowing request", {
        provider: this.name,
        error: error.message,
      });
      return true; // Fail open
    }
  }

  /**
   * Normalise un numéro de téléphone au format E.164
   */
  protected normalizePhoneNumber(phone: string): string {
    // Supprimer tous les caractères non numériques sauf le +
    let normalized = phone.replace(/[^\d+]/g, "");

    // S'assurer que le numéro commence par +
    if (!normalized.startsWith("+")) {
      // Si le numéro commence par 00, remplacer par +
      if (normalized.startsWith("00")) {
        normalized = "+" + normalized.substring(2);
      } else {
        // Ajouter le + au début
        normalized = "+" + normalized;
      }
    }

    return normalized;
  }

  /**
   * Calcule le coût estimé par défaut
   */
  protected calculateBaseCost(messageLength: number, baseRate = 0.01): number {
    // Calcul basé sur le nombre de segments SMS (160 caractères par segment)
    const segments = Math.ceil(messageLength / 160);
    return baseRate * segments;
  }
}
/**
 * Classe de base abstraite pour tous les providers SMS
 * Implémente les fonctionnalités communes à tous les providers
 *//*
export abstract class BaseSmsProvider implements ISmsProvider {
  protected config: SmsProviderConfig;
  protected stats: ProviderStats;

  constructor(config: SmsProviderConfig) {
    this.config = config;

    // Initialiser les statistiques
    this.stats = {
      totalSent: 0,
      totalFailed: 0,
      successRate: 0,
      lastUsed: null,
      averageCost: 0,
      totalCost: 0,
      lastError: null,
      rateLimitReached: false,
      availabilityStatus: "available",
    };
  }

  /**
   * Getter pour l'ID du provider
   *//*
  get id(): string {
    return this.config.type;
  }

  /**
   * Getter pour le nom du provider
   *//*
  get name(): string {
    return this.config.name;
  }

  /**
   * Getter pour le type du provider
   *//*
  get type(): SmsProviderType {
    return this.config.type as SmsProviderType;
  }

  /**
   * Getter pour la priorité du provider
   *//*
  get priority(): number {
    return this.config.priority;
  }

  /**
   * Getter pour l'état d'activation du provider
   *//*
  get isActive(): boolean {
    return this.config.enabled && !this.stats.rateLimitReached;
  }

  /**
   * Vérifie si le provider peut envoyer un SMS
   * Applique les limites de taux et autres vérifications
   *//*
  async canSendSms(): Promise<boolean> {
    // Vérifier si le provider est activé
    if (!this.config.enabled) {
      logger.warn(`Provider ${this.name} is disabled`);
      return false;
    }

    // Vérifier les limites de taux
    if (this.stats.rateLimitReached) {
      logger.warn(`Rate limit reached for provider ${this.name}`);
      return false;
    }

    // Vérifier la disponibilité
    if (this.stats.availabilityStatus !== "available") {
      logger.warn(`Provider ${this.name} is not available (${this.stats.availabilityStatus})`);
      return false;
    }

    return true;
  }

  /**
   * Envoie un SMS en utilisant le provider spécifique
   * Méthode abstraite à implémenter par chaque provider
   *//*
  abstract sendSms(phone: string, message: string): Promise<SmsResult>;

  /**
   * Envoie un SMS avec plus d'options
   * Enveloppe pour la méthode sendSms de base
   *//*
  async sendSmsWithOptions(message: SmsMessage): Promise<SmsResult> {
    try {
      // Vérifier si le provider peut envoyer un SMS
      if (!await this.canSendSms()) {
        throw new Error(`Provider ${this.name} cannot send SMS at this time`);
      }

      const result = await this.sendSms(message.to, message.body);

      // Mettre à jour les statistiques
      this.updateStats(true, result.cost);

      return result;
    } catch (error) {
      // Mettre à jour les statistiques
      this.updateStats(false, 0, error.message);

      throw error;
    }
  }

  /**
   * Met à jour les statistiques du provider
   *//*
  protected updateStats(success: boolean, cost = 0, errorMessage = ""): void {
    const now = new Date();

    // Mettre à jour les compteurs
    if (success) {
      this.stats.totalSent++;
      this.stats.totalCost += cost;
      this.stats.averageCost = this.stats.totalCost / this.stats.totalSent;
    } else {
      this.stats.totalFailed++;
      this.stats.lastError = {
        message: errorMessage,
        timestamp: now,
      };
    }

    // Mettre à jour le taux de réussite
    const total = this.stats.totalSent + this.stats.totalFailed;
    this.stats.successRate = total > 0 ? (this.stats.totalSent / total) : 0;

    // Mettre à jour la date de dernière utilisation
    this.stats.lastUsed = now;

    // Log des statistiques
    logger.debug(`SMS Provider ${this.name} stats updated`, {
      provider: this.name,
      stats: this.stats,
    });
  }

  /**
   * Teste la connexion au provider
   * Implémentation par défaut, à surcharger si nécessaire
   *//*
  async testConnection(): Promise<boolean> {
    try {
      // Tester la connexion selon le provider
      logger.info(`Testing connection to SMS provider ${this.name}`);

      // Par défaut, on considère que le provider est disponible
      // Les implémentations spécifiques doivent surcharger cette méthode
      return true;
    } catch (error) {
      logger.error(`Connection test failed for SMS provider ${this.name}`, error);
      this.stats.availabilityStatus = "unavailable";
      this.stats.lastError = {
        message: error.message,
        timestamp: new Date(),
      };
      return false;
    }
  }

  /**
   * Récupère les statistiques du provider
   *//*
  async getStats(): Promise<ProviderStats> {
    return this.stats;
  }

  /**
   * Réinitialise les statistiques du provider
   *//*
  async resetStats(): Promise<void> {
    this.stats = {
      totalSent: 0,
      totalFailed: 0,
      successRate: 0,
      lastUsed: null,
      averageCost: 0,
      totalCost: 0,
      lastError: null,
      rateLimitReached: false,
      availabilityStatus: "available",
    };

    logger.info(`Stats reset for SMS provider ${this.name}`);
  }

  /**
   * Vérifie les limites de taux et met à jour l'état du provider
   *//*
  protected async checkRateLimits(): Promise<boolean> {
    // Implémentation de base, à surcharger pour des vérifications plus avancées
    const rateLimits = this.config.rateLimits;

    if (!rateLimits) {
      return true;
    }

    // Ici, vous devriez implémenter une vérification réelle des limites
    // en stockant les compteurs dans Firestore ou Redis
    // Ceci est une implémentation simplifiée

    if (this.stats.rateLimitReached) {
      // Vérifier si la période de limitation est terminée
      const rateLimitResetTime = 1 * 60 * 60 * 1000; // 1 heure en ms
      const lastUsed = this.stats.lastUsed || new Date(0);
      const now = new Date();

      if (now.getTime() - lastUsed.getTime() > rateLimitResetTime) {
        // Réinitialiser le flag de limite de taux
        this.stats.rateLimitReached = false;
        logger.info(`Rate limit reset for SMS provider ${this.name}`);
        return true;
      }

      return false;
    }

    return true;
  }
}
*/
