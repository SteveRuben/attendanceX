import {DocumentSnapshot} from "firebase-admin/firestore";
import {BaseModel} from "./base.model";
import { EmailProviderConfig, EmailProviderType } from "../common/types";

export class EmailProviderModel extends BaseModel<EmailProviderConfig> {
  constructor(data: Partial<EmailProviderConfig>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const provider = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(provider, [
      "name", "type", "isActive", "priority", "config", "rateLimit", "pricing",
    ]);

    // Validation du type
    BaseModel.validateEnum(provider.type, EmailProviderType, "type");

    // Validation de la priorité
    this.validateRange(provider.priority, 1, 100, "priority");

    // Validation de l'email from
    if (!BaseModel.validateEmail(provider.config.fromEmail)) {
      throw new Error("Invalid from email address");
    }

    // Validation du reply-to si fourni
    if (
      provider.config.replyTo &&
        !BaseModel.validateEmail(provider.config.replyTo)) {
      throw new Error("Invalid reply-to email address");
    }

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
    if (provider.rateLimit.maxPerMonth < provider.rateLimit.maxPerDay) {
      throw new Error("Max per month must be greater than max per day");
    }

    // Validation du pricing
    if (provider.pricing.costPerEmail < 0) {
      throw new Error("Cost per email cannot be negative");
    }

    // Validation de la configuration selon le type
    this.validateProviderConfig(provider.type, provider.config);

    return true;
  }

  private validateProviderConfig(
    type: EmailProviderType,
    config: any
  ): void {
    switch (type) {
    case EmailProviderType.SENDGRID:
      BaseModel.validateRequired(config, ["apiKey", "fromEmail"]);
      break;

    case EmailProviderType.MAILGUN:
      BaseModel.validateRequired(config, ["apiKey", "domain", "fromEmail"]);
      break;

    case EmailProviderType.AWS_SES:
      BaseModel.validateRequired(config, ["apiKey", "apiSecret", "fromEmail"]);
      break;

    case EmailProviderType.SMTP:
      BaseModel.validateRequired(
        config,
        ["host", "port", "username", "password", "fromEmail"]
      );
      if (config.port < 1 || config.port > 65535) {
        throw new Error("Invalid SMTP port");
      }
      break;

    case EmailProviderType.POSTMARK:
      BaseModel.validateRequired(config, ["apiKey", "fromEmail"]);
      break;

    case EmailProviderType.CUSTOM_API:
      BaseModel.validateRequired(config, ["endpoint", "fromEmail"]);
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

  static fromFirestore(doc: DocumentSnapshot):
      EmailProviderModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData =
        EmailProviderModel.prototype.convertDatesFromFirestore(data);

    // Déchiffrer les clés sensibles
    const decryptedData =
        EmailProviderModel.prototype.decryptSensitiveData(convertedData);

    return new EmailProviderModel({
      id: doc.id,
      ...decryptedData,
    });
  }

  private encryptSensitiveData(data: any): any {
    // TODO: Implémenter le chiffrement des clés API
    const secureCopy = {...data};

    if (secureCopy.config) {
      secureCopy.config = {...secureCopy.config};

      // Masquer les clés sensibles (à remplacer par un vrai chiffrement)
      if (secureCopy.config.apiKey) {
        secureCopy.config.apiKey =
            this.maskSensitiveValue(secureCopy.config.apiKey);
      }
      if (secureCopy.config.apiSecret) {
        secureCopy.config.apiSecret =
            this.maskSensitiveValue(secureCopy.config.apiSecret);
      }
      if (secureCopy.config.password) {
        secureCopy.config.password =
            this.maskSensitiveValue(secureCopy.config.password);
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

    return value.substring(0, 4) +
        "*".repeat(value.length - 8) +
        value.substring(value.length - 4);
  }

  // Méthodes d'instance
  isWithinLimits(
    sentThisMinute: number,
    sentThisHour: number,
    sentThisDay: number,
    sentThisMonth: number): boolean {
    return sentThisMinute < this.data.rateLimit.maxPerMinute &&
           sentThisHour < this.data.rateLimit.maxPerHour &&
           sentThisDay < this.data.rateLimit.maxPerDay &&
           sentThisMonth < this.data.rateLimit.maxPerMonth;
  }

  updateStats(
    sent: number,
    delivered: number,
    bounced: number,
    complaints: number,
    opens: number,
    clicks: number, cost: number): void {
    const stats = this.data.stats;

    const newTotalSent = stats.totalSent + sent;
    const newTotalDelivered = stats.totalDelivered + delivered;

    this.update({
      stats: {
        ...stats,
        totalSent: newTotalSent,
        totalDelivered: newTotalDelivered,
        totalBounced: stats.totalBounced + bounced,
        totalComplaints: stats.totalComplaints + complaints,
        totalOpens: stats.totalOpens + opens,
        totalClicks: stats.totalClicks + clicks,
        totalCost: stats.totalCost + cost,
        deliveryRate: newTotalSent > 0 ?
          (newTotalDelivered / newTotalSent) * 100 : 0,
        openRate: newTotalDelivered > 0 ?
          ((stats.totalOpens + opens) / newTotalDelivered) * 100 : 0,
        clickRate: newTotalDelivered > 0 ?
          ((stats.totalClicks + clicks) / newTotalDelivered) * 100 : 0,
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

  estimateCost(emailCount: number): number {
    return emailCount * this.data.pricing.costPerEmail;
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

  canSendEmail(): boolean {
    return this.data.isActive && this.data.config.fromEmail !== "";
  }

  supportsFeature(feature: keyof EmailProviderConfig["features"]): boolean {
    return this.data.features[feature] === true;
  }
}
