import {DocumentSnapshot} from "firebase-admin/firestore";
import {BaseModel} from "./base.model";
import {
  SmsProviderConfig,
  SmsProviderType,
} from "@attendance-x/shared";
/**
 * Modèle de données pour les fournisseurs de services SMS
 *
 * Ce modèle gère la validation, la transformation et la manipulation des configurations
 * des fournisseurs de services SMS. Il inclut des méthodes pour valider les configurations,
 * estimer les coûts et gérer les statistiques d'envoi.
 */
export class SmsProviderModel extends BaseModel<SmsProviderConfig> {
  constructor(data: Partial<SmsProviderConfig>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const provider = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(provider, [
      "name", "type", "isActive", "priority", "config", "rateLimit", "pricing",
    ]);

    // Validation du type
    BaseModel.validateEnum(provider.type, SmsProviderType, "type");

    // Validation de la priorité
    this.validateRange(provider.priority, 1, 100, "priority");

    // Validation des limites de taux
    if (provider.rateLimit.maxPerMinute < 1) {
      throw new Error("Max per minute must be at least 1");
    }
    if (provider.rateLimit.maxPerHour < provider.rateLimit.maxPerMinute) {
      throw new Error("Max per hour must be greater than max per minute");
    }
    if (provider.rateLimit.maxPerDay < provider.rateLimit.maxPerHour) {
      throw new Error("Max per day must be greater than max per hour");
    }

    // Validation du pricing
    if (provider.pricing.costPerSms < 0) {
      throw new Error("Cost per SMS cannot be negative");
    }

    // Validation de la configuration selon le type
    this.validateProviderConfig(provider.type, provider.config);

    return true;
  }

  private validateProviderConfig(type: SmsProviderType, config: any): void {
    switch (type) {
    case SmsProviderType.TWILIO:
      BaseModel.validateRequired(config, ["apiKey", "apiSecret", "senderId"]);
      break;

    case SmsProviderType.VONAGE:
      BaseModel.validateRequired(config, ["apiKey", "apiSecret"]);
      break;

    case SmsProviderType.AWS_SNS:
      BaseModel.validateRequired(config, ["apiKey", "apiSecret"]);
      break;

    case SmsProviderType.CUSTOM_API:
      BaseModel.validateRequired(config, ["endpoint"]);
      if (!BaseModel.validateUrl(config.endpoint)) {
        throw new Error("Invalid endpoint URL");
      }
      break;

    default:
      throw new Error("Unknown provider type");
    }
  }

  toFirestore() {
    const {id, ...data} = this.data;

    // Chiffrer les clés sensibles avant de sauvegarder
    const secureData = this.encryptSensitiveData(data);

    return this.convertDatesToFirestore(secureData);
  }

  static fromFirestore(doc: DocumentSnapshot): SmsProviderModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = SmsProviderModel.prototype.convertDatesFromFirestore(data);

    // Déchiffrer les clés sensibles
    const decryptedData = SmsProviderModel.prototype.decryptSensitiveData(convertedData);

    return new SmsProviderModel({
      id: doc.id,
      ...decryptedData,
    });
  }

  private encryptSensitiveData(data: any): any {
    // TODO: Implémenter le chiffrement des clés API
    // Pour l'instant, on simule en masquant les données
    const secureCopy = {...data};

    if (secureCopy.config) {
      secureCopy.config = {...secureCopy.config};

      // Masquer les clés sensibles (à remplacer par un vrai chiffrement)
      if (secureCopy.config.apiKey) {
        secureCopy.config.apiKey = this.maskSensitiveValue(secureCopy.config.apiKey);
      }
      if (secureCopy.config.apiSecret) {
        secureCopy.config.apiSecret = this.maskSensitiveValue(secureCopy.config.apiSecret);
      }
    }

    return secureCopy;
  }

  private decryptSensitiveData(data: any): any {
    // TODO: Implémenter le déchiffrement des clés API
    return data;
  }

  private maskSensitiveValue(value: string): string {
    if (value.length <= 8) {
      return "*".repeat(value.length);
    }

    return value.substring(0, 4) + "*".repeat(value.length - 8) + value.substring(value.length - 4);
  }

  // Méthodes d'instance
  isWithinLimits(sentThisMinute: number, sentThisHour: number, sentThisDay: number): boolean {
    return sentThisMinute < this.data.rateLimit.maxPerMinute &&
           sentThisHour < this.data.rateLimit.maxPerHour &&
           sentThisDay < this.data.rateLimit.maxPerDay;
  }

  updateStats(sent: number, delivered: number, failed: number, cost: number): void {
    const stats = this.data.stats;

    this.update({
      stats: {
        ...stats,
        totalSent: stats.totalSent + sent,
        totalDelivered: stats.totalDelivered + delivered,
        totalFailed: stats.totalFailed + failed,
        totalCost: stats.totalCost + cost,
        deliveryRate: ((stats.totalDelivered + delivered) / (stats.totalSent + sent)) * 100,
        lastUsed: new Date(),
        monthlyUsage: stats.monthlyUsage + sent,
      },
    });
  }

  resetMonthlyStats(): void {
    this.update({
      stats: {
        ...this.data.stats,
        monthlyUsage: 0,
      },
    });
  }

  testConnection(): Promise<boolean> {
    // TODO: Implémenter le test de connexion selon le type de provider
    return Promise.resolve(true);
  }

  estimateCost(messageCount: number, segmentCount = 1): number {
    return messageCount * segmentCount * this.data.pricing.costPerSms;
  }

  activate(): void {
    this.update({isActive: true});
  }

  deactivate(): void {
    this.update({isActive: false});
  }

  updatePriority(newPriority: number): void {
    this.validateRange(newPriority, 1, 100, "priority");
    this.update({priority: newPriority});
  }
}
