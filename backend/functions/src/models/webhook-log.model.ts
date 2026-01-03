import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { WebhookEventType } from "../common/types/form-builder.types";

export interface WebhookLogDocument {
  id: string;
  event: WebhookEventType;
  tenantId: string;
  formId?: string;
  eventId?: string;
  sourceIp: string;
  timestamp: Date;
  signature?: string;
  processed: boolean;
  processingResult?: {
    success: boolean;
    message: string;
    errors?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWebhookLogRequest {
  event: WebhookEventType;
  tenantId: string;
  formId?: string;
  eventId?: string;
  sourceIp: string;
  timestamp: Date;
  signature?: string;
}

export class WebhookLogModel extends BaseModel<WebhookLogDocument> {
  constructor(data: Partial<WebhookLogDocument>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const log = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(log, [
      "event", "tenantId", "sourceIp", "timestamp"
    ]);

    // Validation du type d'événement
    if (!Object.values(WebhookEventType).includes(log.event)) {
      throw new Error("Invalid webhook event type");
    }

    // Validation de l'IP source
    if (!this.isValidIpAddress(log.sourceIp)) {
      throw new Error("Invalid source IP address");
    }

    // Validation du timestamp
    if (!(log.timestamp instanceof Date)) {
      throw new Error("Invalid timestamp");
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = WebhookLogModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  public toAPI(): Partial<WebhookLogDocument> {
    const data = this.data as any;
    const cleaned = { ...data };
    
    // Supprimer les champs sensibles si nécessaire
    // Pour les logs webhook, tous les champs peuvent être exposés
    
    return cleaned;
  }

  static fromFirestore(doc: DocumentSnapshot): WebhookLogModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = WebhookLogModel.prototype.convertDatesFromFirestore(data);

    return new WebhookLogModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(request: CreateWebhookLogRequest): WebhookLogModel {
    const logData = {
      ...request,
      processed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return new WebhookLogModel(logData);
  }

  // Marquer comme traité
  markAsProcessed(result: { success: boolean; message: string; errors?: string[] }): void {
    this.update({
      processed: true,
      processingResult: result,
      updatedAt: new Date()
    });
  }

  private isValidIpAddress(ip: string): boolean {
    // IPv4 regex
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    // IPv6 regex (simplified)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === 'unknown';
  }

  public static removeUndefinedFields(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedFields(item));
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedFields(value);
        }
      });
      return cleaned;
    }

    return obj;
  }
}