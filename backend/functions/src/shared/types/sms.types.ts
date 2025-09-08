// shared/types/sms.types.ts

import { BaseEntity } from "./common.types";
import { EventType } from "./event.types";
import { NotificationPriority, NotificationType } from "./notification.types";
import { UserRole } from "./role.types";

export enum SmsProviderType {
  TWILIO = 'twilio',
  VONAGE = 'vonage',
  AWS_SNS = 'aws_sns',
  MESSAGEBIRD = 'messagebird',
  SENDGRID = 'sendgrid',
  CUSTOM_API = 'custom_api',
  WEBHOOK = 'webhook'
}

export class SmsError extends Error {
  code?: string;
  statusCode?: number;
  retryable?: boolean;
  
  constructor(message: string, code?: string, statusCode?: number, retryable = false) {
    super(message);
    this.name = 'SmsError';
    this.code = code ??'SMS_ERROR';
    this.statusCode = statusCode ?? 500; // Default to 500 if not provided
    this.retryable = retryable;
    Error.captureStackTrace(this, SmsError);
  }
}

export interface ISmsProvider {
  readonly id: string;
  readonly name: string;
  readonly type: SmsProviderType;
  readonly priority: number;
  readonly isActive: boolean;

  // Méthodes principales
  sendSms(phone: string, message: string): Promise<SmsResult>;
  sendSmsWithOptions?(message: SmsMessage): Promise<SmsResult>;
  
  // Utilitaires
  canSendSms(): Promise<boolean>;
  testConnection(): Promise<boolean>;
}

export interface SmsProviderConfig extends BaseEntity  {
  id: string;
  name: string;
  type: SmsProviderType;
  isActive: boolean;
  priority: number;
  
  // Configuration spécifique au provider
  config: {
    apiKey?: string;
    apiSecret?: string;
    senderId?: string;
    endpoint?: string;
    headers?: Record<string, string>;
    authType?: 'api_key' | 'basic_auth' | 'bearer_token' | 'oauth';
    webhookUrl?: string;
    features?: string[]; // delivery_reports, two_way_messaging, etc.
  };
  
  // Limites et quotas
  rateLimit: {
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
    maxPerMonth?: number;
  };
  
  // Coûts
  pricing: {
    costPerSms: number;
    currency: string;
    freeCredits?: number;
    monthlyQuota?: number;
  };
  
  // Zones géographiques supportées
  supportedCountries?: string[];
  restrictions?: string[];
  
  // Statistiques
  stats: {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    totalCost: number;
    deliveryRate: number;
    avgDeliveryTime: number; // en secondes
    lastUsed?: Date;
    monthlyUsage: number;
  };
  
  // Configuration avancée
  settings: {
    enableDeliveryReports?: boolean;
    enableFailover?: boolean;
    retryAttempts?: number;
    statusCallback?: string;
    type?:string;
    webhookUrl?:string;
    defaultTtl?:number;
    defaultSenderId?:string;
    testEndpoint?:string;
    smsType?: string;
    maxPrice?: string;
    bodyTemplate?:{
      [key : string]: string;
    },
    responseMapping?:{
      [key : string]: string;
    };
    timeout?: number; // en secondes
    encoding?: 'GSM7' | 'UCS2' | 'UTF8';
  };
}

export interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  eventType?: EventType;
  notificationType?: NotificationType;
  language: string;
  isActive: boolean;
  category?: string;
  maxLength: number;
  estimatedSegments: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  tags?: string[];
}
export interface SmsResult {
  success: boolean;
  messageId: string;
  status: string;
  cost: number;
  provider: string;
  metadata?: Record<string, any>;
}
export interface SmsMessage extends BaseEntity {
  templateId?: string;
  recipientPhone: string;
  recipientUserId?: string;
  content: string;
  providerId: string;
  
  // État et tracking
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'expired';
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  
  // Erreurs et retry
  error?: string;
  errorCode?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  
  // Métadonnées du provider
  messageId?: string; // ID du provider
  segmentCount?: number;
  cost?: number;
  
  // Informations de livraison
  deliveryReport?: {
    status: string;
    timestamp: Date;
    errorCode?: string;
    description?: string;
  };
  
  // Contexte
  eventId?: string;
  notificationId?: string;
  campaignId?: string;
  
  // Métadonnées système
  priority: NotificationPriority;
  scheduledFor?: Date;
  expiresAt?: Date;
}

export interface SmsCampaign extends BaseEntity {
  name: string;
  description?: string;
  templateId: string;
  recipients: string[];
  filters?: {
    roles?: UserRole[];
    departments?: string[];
    tags?: string[];
  };
  
  // Programmation
  scheduledFor?: Date;
  timezone: string;
  
  // État
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed';
  
  // Statistiques
  stats: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
    totalCost: number;
  };
  
  // Configuration
  settings: {
    providerId?: string;
    sendRate?: number; // messages par minute
    enableTracking: boolean;
    allowOptOut: boolean;
  };
  
  createdBy: string;
  startedAt?: Date;
  completedAt?: Date;
}


export interface TwilioConfig extends SmsProviderConfig {
  type: SmsProviderType.TWILIO;
  credentials: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
}

interface CountrySettings {
  senderId: string;
  pricing: number;
}
export interface VonageConfig extends SmsProviderConfig {
  type: SmsProviderType.VONAGE;
  credentials: {
    apiKey: string;
    apiSecret: string;
    brandName: string;
  };
  countrySettings: {
    [key: string]: CountrySettings
  }
}

export interface AwsSnsConfig extends SmsProviderConfig {
  type: SmsProviderType.AWS_SNS;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  messageAttributes:{
    [key: string]: any
  }
}

export interface CustomApiConfig extends SmsProviderConfig {
  type: SmsProviderType.CUSTOM_API;
  credentials: {
    apiKey?: string;
    endpoint: string;
    headers?: Record<string, string>;
    method?: string;
  };
}