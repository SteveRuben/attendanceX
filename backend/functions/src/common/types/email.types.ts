import { BaseEntity } from './common.types';

export class EmailError extends Error {
  code?: string; // Code d'erreur spécifique
  statusCode?: number; // Code HTTP associé
  details?: Record<string, any>; // Détails supplémentaires sur l'erreur
  retryable?: boolean; // Indique si l'erreur peut être réessayée
  constructor(message: string, code?: string, statusCode?: number, details?: Record<string, any>, retryable?: boolean) {
    super(message);
    this.name = 'EmailError';
    this.code = code ?? 'EMAIL_ERROR';
    this.statusCode = statusCode ?? 500; // Par défaut, erreur interne du serveur
    this.details = details ?? {};
    this.retryable = retryable ?? false; // Par défaut, l'erreur n'est pas réessayable
    Error.captureStackTrace(this, EmailError);
  }
};


// Énumération des fournisseurs d'email
export enum EmailProviderType {
  RESEND = 'resend',
  SENDGRID = 'sendgrid',
  MAILGUN = 'mailgun',
  AWS_SES = 'ses',
  SMTP = 'smtp',
  POSTMARK = 'postmark',
  CUSTOM_API = 'custom_api'
}

export interface ProviderStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalBounced: number;
  totalComplaints: number;
  totalClicks: number;
  totalOpens: number;
  lastUsed?: Date;
  lastError?: EmailError;
  monthlyUsage: number;
  totalUnsubscribes: number;

  // Taux
  deliveryRate: number; // (delivered / sent) * 100
  bounceRate: number; // (bounced / sent) * 100
  openRate: number; // (opens / delivered) * 100
  clickRate: number; // (clicks / delivered) * 100
  complaintRate: number; // (complaints / delivered) * 100
  unsubscribeRate: number; // (unsubscribes / delivered) * 100

  // Coûts
  totalCost: number;
  averageCostPerEmail: number;

  // Période
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Interface principale pour tous les providers Email
 * Définit le contrat que chaque provider doit respecter
 */
export interface IEmailProvider {
  // Propriétés d'identification
  readonly id: string;
  readonly name: string;
  readonly type: EmailProviderType;
  readonly priority: number;
  readonly isActive: boolean;


  /**
   * Envoie un email simple
   */
  sendEmail(
    to: string | string[],
    subject: string,
    content: {
      html?: string;
      text?: string;
    },
    options?: SendEmailRequest
  ): Promise<SendEmailResponse>;

  /**
   * Envoie un email à partir d'un template
   */
  sendTemplate(
    to: string | string[],
    templateId: string,
    data: Record<string, any>,
    options?: SendEmailRequest
  ): Promise<SendEmailResponse>;

  /**
   * Envoie un email avec pièces jointes
   */
  sendEmailWithAttachments?(
    to: string | string[],
    subject: string,
    content: { html?: string; text?: string },
    attachments: EmailAttachment[],
    options?: SendEmailRequest
  ): Promise<SendEmailResponse>;

  /**
   * Vérifie si le provider peut envoyer un email
   * (rate limits, disponibilité, configuration)
   */
  canSendEmail(): Promise<boolean>;

  /**
   * Teste la connexion au provider
   */
  testConnection(): Promise<boolean>;

  /**
   * Récupère les statistiques du provider
   */
  getStats(): Promise<ProviderStats>;

  /**
   * Réinitialise les statistiques du provider
   */
  resetStats(): Promise<void>;

  /**
   * Met à jour la configuration du provider
   */
  updateConfig?(config: Partial<EmailProviderConfig>): Promise<void>;

  /**
   * Vérifie et met à jour les limites de taux
   */
  checkRateLimit?(): Promise<boolean>;

  /**
   * Gère les webhooks de statut de livraison
   */
  handleWebhook?(payload: any, signature?: string): Promise<void>;

  /**
   * Récupère les templates disponibles
   */
  getTemplates?(): Promise<EmailTemplate[]>;

  /**
   * Crée ou met à jour un template
   */
  saveTemplate?(template: EmailTemplate): Promise<string>;
}

export interface IEmailProviderFactory {
  /**
   * Crée ou récupère une instance de provider
   */
  getProvider(type: EmailProviderType): Promise<IEmailProvider>;

  /**
   * Récupère tous les providers actifs
   */
  getAllProviders(): Promise<IEmailProvider[]>;

  /**
   * Récupère le provider par défaut
   */
  getDefaultProvider(): Promise<IEmailProvider>;

  /**
   * Récupère les providers de fallback
   */
  getFallbackProviders(): Promise<IEmailProvider[]>;

  /**
   * Recharge un provider spécifique
   */
  reloadProvider(type: EmailProviderType): void;

  /**
   * Teste tous les providers
   */
  testAllProviders(): Promise<Record<string, boolean>>;
}

// Configuration spécifique par provider
export interface EmailProviderConfig extends BaseEntity {
  name: string;
  type: EmailProviderType;
  isActive: boolean;
  priority: number; // 1-100, plus élevé = priorité plus haute
  rateLimitReached?: boolean; // Indique si les limites de taux sont atteintes
  availabilityStatus?: 'available' | 'unavailable' | 'degraded'; // État de disponibilité du provider

  // Configuration du provider
  config: {
    apiKey?: string;
    apiSecret?: string;
    region?: string; // Pour AWS SES
    domain?: string;
    fromEmail: string;
    fromName: string;
    replyTo?: string;

    // Pour SMTP
    host?: string;
    port?: number;
    secure?: boolean;
    username?: string;
    password?: string;

    // Pour API custom
    endpoint?: string;
    headers?: Record<string, string>;
  };

  // Limites de taux
  rateLimit: {
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
    maxPerMonth: number;
  };

  // Pricing
  pricing: {
    costPerEmail: number;
    currency: string;
    freeQuota?: number;
  };

  // Statistiques
  stats: ProviderStats;

  // Configuration avancée
  features: {
    trackingPixel: boolean;
    clickTracking: boolean;
    unsubscribeLink: boolean;
    customHeaders: boolean;
    attachments: boolean;
    templates: boolean;
    scheduling: boolean;
    bulkSending: boolean;
  };

  // Webhooks
  webhooks?: {
    deliveryUrl?: string;
    bounceUrl?: string;
    complaintUrl?: string;
    openUrl?: string;
    clickUrl?: string;
    unsubscribeUrl?: string;
  };
}

// Template d'email
export interface EmailTemplate extends BaseEntity {
  name: string;
  description?: string;
  category: EmailTemplateCategory;

  // Contenu du template
  subject: string;
  htmlContent: string;
  textContent?: string;

  // Variables dynamiques
  variables: string[];

  // Métadonnées
  language: string;
  isActive: boolean;
  isDefault: boolean;

  // Paramètres
  settings: {
    trackOpens: boolean;
    trackClicks: boolean;
    unsubscribeLink: boolean;
    customCss?: string;
  };

  // Audit
  createdBy: string;
  lastModifiedBy?: string;
  version: number;
  tags: string[];

  // Statistiques d'utilisation
  usage: {
    timesUsed: number;
    lastUsed?: Date;
    avgOpenRate?: number;
    avgClickRate?: number;
  };
}

// Catégories de templates
export enum EmailTemplateCategory {
  AUTHENTICATION = 'authentication',
  EVENT_INVITATION = 'event_invitation',
  EVENT_REMINDER = 'event_reminder',
  EVENT_UPDATE = 'event_update',
  EVENT_CANCELLATION = 'event_cancellation',
  ATTENDANCE_CONFIRMATION = 'attendance_confirmation',
  ATTENDANCE_REMINDER = 'attendance_reminder',
  REPORT_DELIVERY = 'report_delivery',
  USER_WELCOME = 'user_welcome',
  USER_INVITATION = 'user_invitation',
  SYSTEM_NOTIFICATION = 'system_notification',
  MARKETING = 'marketing',
  TRANSACTIONAL = 'transactional',
  CUSTOM = 'custom',
  NEWSLETTER = "NEWSLETTER"
}

// Requête d'envoi d'email
export interface SendEmailRequest {
  providerId?: string; // Si non spécifié, utilise le provider par défaut
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;

  // Contenu
  htmlContent?: string;
  textContent?: string;
  templateId?: string;
  templateData?: Record<string, any>;

  // Options
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;

  // Attachments
  attachments?: EmailAttachment[];
  categories?: string[]; // Catégories pour le tri et la recherche

  // Tracking et options
  trackOpens?: boolean;
  trackClicks?: boolean;
  unsubscribeLink?: boolean;
  metadata: {
    userId: string;
    trackingId: string; // ID unique pour le suivi
    priority: number; // 1-10, 1 = plus bas, 10 = plus haut
    timestamp: Date; // Date de création de la requête
    // Campaign-specific metadata (optional)
    campaignId?: string;
    campaignType?: string;
    recipientId?: string;
    organizationId?: string;
    trackingPixelId?: string;
    unsubscribeToken?: string;
  }
  // Scheduling
  sendAt?: Date;
  timezone?: string;

  // Métadonnées
  tags?: string[];
  customHeaders?: Record<string, string>;

  // Contexte métier
  eventId?: string;
  campaignId?: string;
}

// Attachment d'email
export interface EmailAttachment {
  filename: string;
  content: Buffer | string;// Base64 ou URL
  contentType?: string;
  size?: number;
  disposition?: 'attachment' | 'inline';
  contentId?: string; // Pour les images inline
}

// Réponse d'envoi d'email
export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  templateId?: string; // Si envoyé à partir d'un template
  providerId: string;
  cost?: number;
  queuedAt: Date;
  estimatedDelivery?: Date;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    requestId?: string; // ID de la requête pour le suivi,
    region?: string; // Pour AWS SES,
    responseId?: string;
    message?:string;
    statusCode?: number;
  };
}

// Statut de livraison d'email
export interface EmailDeliveryStatus {
  messageId: string;
  status: EmailDeliveryStatusType;
  providerId: string;
  recipient: string;

  // Timestamps
  sentAt?: Date;
  deliveredAt?: Date;
  bouncedAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  complainedAt?: Date;
  unsubscribedAt?: Date;

  // Détails
  bounceReason?: string;
  complaintType?: string;
  clickedUrls?: string[];
  userAgent?: string;
  ipAddress?: string;

  // Métadonnées
  cost?: number;
  attempts: number;
  lastAttemptAt: Date;
}

export enum EmailDeliveryStatusType {
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
  OPENED = 'opened',
  CLICKED = 'clicked',
  UNSUBSCRIBED = 'unsubscribed',
  FAILED = 'failed'
}



// Configuration de retry
export interface EmailRetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelayMs: number;
  maxDelayMs: number;
  retryOnStatuses: number[];
}

// Configuration de failover
export interface EmailFailoverConfig {
  enabled: boolean;
  fallbackProviders: string[]; // IDs des providers de fallback par ordre de priorité
  triggerConditions: {
    consecutiveFailures: number;
    failureRateThreshold: number; // Pourcentage
    responseTimeThreshold: number; // ms
  };
  cooldownPeriod: number; // minutes avant de réessayer le provider principal
}