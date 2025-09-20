import {   EmailFailoverConfig,
  EmailProviderConfig,
  EmailProviderType,
  EmailRetryConfig } from "../common/types";

// Configuration générale des emails
export const emailConfig = {
  defaultProvider: process.env.DEFAULT_EMAIL_PROVIDER || "sendgrid",
  rateLimits: {
    perMinute: parseInt(process.env.EMAIL_RATE_LIMIT_PER_MINUTE || "50", 10),
    perHour: parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR || "1000", 10),
    perDay: parseInt(process.env.EMAIL_RATE_LIMIT_PER_DAY || "10000", 10),
  },
  retryConfig: {
    attempts: 3,
    delaySeconds: 60,
  },
  failoverEnabled: process.env.EMAIL_FAILOVER_ENABLED === "true",
  trackingEnabled: process.env.EMAIL_TRACKING_ENABLED !== "false",
};

// Configuration de retry globale
export const emailRetryConfig: EmailRetryConfig = {
  maxAttempts: parseInt(process.env.EMAIL_MAX_RETRY_ATTEMPTS || "3", 10),
  backoffMultiplier:
    parseFloat(process.env.EMAIL_RETRY_BACKOFF_MULTIPLIER || "2.0"),
  initialDelayMs:
    parseInt(process.env.EMAIL_RETRY_INITIAL_DELAY_MS || "1000", 10),
  maxDelayMs: parseInt(process.env.EMAIL_RETRY_MAX_DELAY_MS || "30000", 10),
  retryOnStatuses: [429, 500, 502, 503, 504], // Rate limited, server errors
};

// Configuration de failover
export const emailFailoverConfig: EmailFailoverConfig = {
  enabled: process.env.EMAIL_FAILOVER_ENABLED === "true",
  fallbackProviders:
    (process.env.EMAIL_FALLBACK_PROVIDERS || "mailgun,ses").split(","),
  triggerConditions: {
    consecutiveFailures:
      parseInt(process.env.EMAIL_FAILOVER_CONSECUTIVE_FAILURES || "3", 10),
    failureRateThreshold:
      parseFloat(process.env.EMAIL_FAILOVER_FAILURE_RATE_THRESHOLD || "10.0"),
    responseTimeThreshold:
      parseInt(process.env.EMAIL_FAILOVER_RESPONSE_TIME_THRESHOLD ||
        "5000", 10),
  },
  cooldownPeriod:
    parseInt(process.env.EMAIL_FAILOVER_COOLDOWN_PERIOD ||
      "30", 10), // minutes
};

// Configuration SendGrid
export const sendgridConfig: EmailProviderConfig = {
  id: "sendgrid-primary",
  name: "SendGrid",
  type: EmailProviderType.SENDGRID,
  isActive: process.env.SENDGRID_ENABLED !== "false",
  priority: parseInt(process.env.SENDGRID_PRIORITY || "1", 10),

  config: {
    apiKey: process.env.SENDGRID_API_KEY || "",
    fromEmail: process.env.SENDGRID_FROM_EMAIL || "noreply@attendancex.com",
    fromName: process.env.SENDGRID_FROM_NAME || "AttendanceX",
    replyTo: process.env.SENDGRID_REPLY_TO || "support@attendancex.com",
  },

  rateLimit: {
    maxPerMinute:
      parseInt(process.env.SENDGRID_RATE_LIMIT_PER_MINUTE || "60", 10),
    maxPerHour:
      parseInt(process.env.SENDGRID_RATE_LIMIT_PER_HOUR || "1000", 10),
    maxPerDay:
      parseInt(process.env.SENDGRID_RATE_LIMIT_PER_DAY || "10000", 10),
    maxPerMonth:
      parseInt(process.env.SENDGRID_RATE_LIMIT_PER_MONTH || "300000", 10),
  },

  pricing: {
    costPerEmail:
      parseFloat(process.env.SENDGRID_COST_PER_EMAIL ||
        "0.0006"), // $0.0006 per email
    currency: "USD",
    freeQuota: parseInt(process.env.SENDGRID_FREE_QUOTA || "100", 10),
  },

  stats: {
    totalSent: 0,
    totalDelivered: 0,
    totalBounced: 0,
    totalComplaints: 0,
    totalClicks: 0,
    totalOpens: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    monthlyUsage: 0,
    totalCost: 0,
    totalFailed: 0,
    totalUnsubscribes: 0,
    bounceRate: 0,
    complaintRate: 0,
    unsubscribeRate: 0,
    averageCostPerEmail: 0,
    periodStart: new Date(),
    periodEnd: new Date(),
  },

  features: {
    trackingPixel: true,
    clickTracking: true,
    unsubscribeLink: true,
    customHeaders: true,
    attachments: true,
    templates: true,
    scheduling: true,
    bulkSending: true,
  },

  webhooks: {
    deliveryUrl: process.env.SENDGRID_WEBHOOK_DELIVERY_URL,
    bounceUrl: process.env.SENDGRID_WEBHOOK_BOUNCE_URL,
    complaintUrl: process.env.SENDGRID_WEBHOOK_COMPLAINT_URL,
    openUrl: process.env.SENDGRID_WEBHOOK_OPEN_URL,
    clickUrl: process.env.SENDGRID_WEBHOOK_CLICK_URL,
    unsubscribeUrl: process.env.SENDGRID_WEBHOOK_UNSUBSCRIBE_URL,
  },

  createdAt: new Date(),
  updatedAt: new Date(),
};

// Configuration Mailgun
export const mailgunConfig: EmailProviderConfig = {
  id: "mailgun-backup",
  name: "Mailgun",
  type: EmailProviderType.MAILGUN,
  isActive: process.env.MAILGUN_ENABLED === "true",
  priority: parseInt(process.env.MAILGUN_PRIORITY || "2", 10),

  config: {
    apiKey: process.env.MAILGUN_API_KEY || "",
    domain: process.env.MAILGUN_DOMAIN || "",
    fromEmail: process.env.MAILGUN_FROM_EMAIL || "noreply@attendancex.com",
    fromName: process.env.MAILGUN_FROM_NAME || "AttendanceX",
    replyTo: process.env.MAILGUN_REPLY_TO || "support@attendancex.com",
  },

  rateLimit: {
    maxPerMinute:
      parseInt(process.env.MAILGUN_RATE_LIMIT_PER_MINUTE || "50", 10),
    maxPerHour: parseInt(process.env.MAILGUN_RATE_LIMIT_PER_HOUR || "800", 10),
    maxPerDay: parseInt(process.env.MAILGUN_RATE_LIMIT_PER_DAY || "8000", 10),
    maxPerMonth:
      parseInt(process.env.MAILGUN_RATE_LIMIT_PER_MONTH || "240000", 10),
  },

  pricing: {
    costPerEmail:
      parseFloat(process.env.MAILGUN_COST_PER_EMAIL ||
        "0.0008"), // $0.0008 per email
    currency: "USD",
    freeQuota: parseInt(process.env.MAILGUN_FREE_QUOTA || "100", 10),
  },

  stats: {
    totalSent: 0,
    totalDelivered: 0,
    totalBounced: 0,
    totalComplaints: 0,
    totalClicks: 0,
    totalOpens: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    monthlyUsage: 0,
    totalCost: 0,
    totalFailed: 0,
    totalUnsubscribes: 0,
    bounceRate: 0,
    complaintRate: 0,
    unsubscribeRate: 0,
    averageCostPerEmail: 0,
    periodStart: new Date(),
    periodEnd: new Date(),
  },

  features: {
    trackingPixel: true,
    clickTracking: true,
    unsubscribeLink: true,
    customHeaders: true,
    attachments: true,
    templates: true,
    scheduling: false,
    bulkSending: true,
  },

  webhooks: {
    deliveryUrl: process.env.MAILGUN_WEBHOOK_DELIVERY_URL,
    bounceUrl: process.env.MAILGUN_WEBHOOK_BOUNCE_URL,
    complaintUrl: process.env.MAILGUN_WEBHOOK_COMPLAINT_URL,
    openUrl: process.env.MAILGUN_WEBHOOK_OPEN_URL,
    clickUrl: process.env.MAILGUN_WEBHOOK_CLICK_URL,
  },

  createdAt: new Date(),
  updatedAt: new Date(),
};

// Configuration AWS SES
export const sesConfig: EmailProviderConfig = {
  id: "aws-ses-backup",
  name: "AWS SES",
  type: EmailProviderType.AWS_SES,
  isActive: process.env.AWS_SES_ENABLED === "true",
  priority: parseInt(process.env.AWS_SES_PRIORITY || "3", 10),

  config: {
    apiKey: process.env.AWS_ACCESS_KEY_ID || "",
    apiSecret: process.env.AWS_SECRET_ACCESS_KEY || "",
    fromEmail: process.env.AWS_SES_FROM_EMAIL || "noreply@attendancex.com",
    fromName: process.env.AWS_SES_FROM_NAME || "AttendanceX",
    replyTo: process.env.AWS_SES_REPLY_TO || "support@attendancex.com",
  },

  rateLimit: {
    maxPerMinute:
      parseInt(process.env.AWS_SES_RATE_LIMIT_PER_MINUTE || "100", 10),
    maxPerHour: parseInt(process.env.AWS_SES_RATE_LIMIT_PER_HOUR || "1500", 10),
    maxPerDay: parseInt(process.env.AWS_SES_RATE_LIMIT_PER_DAY || "15000", 10),
    maxPerMonth:
      parseInt(process.env.AWS_SES_RATE_LIMIT_PER_MONTH || "450000", 10),
  },

  pricing: {
    costPerEmail:
      parseFloat(process.env.AWS_SES_COST_PER_EMAIL ||
        "0.0001"), // $0.0001 per email
    currency: "USD",
    freeQuota: parseInt(process.env.AWS_SES_FREE_QUOTA || "200", 10),
  },

  stats: {
    totalSent: 0,
    totalDelivered: 0,
    totalBounced: 0,
    totalComplaints: 0,
    totalClicks: 0,
    totalOpens: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    monthlyUsage: 0,
    totalCost: 0,
    totalFailed: 0,
    totalUnsubscribes: 0,
    bounceRate: 0,
    complaintRate: 0,
    unsubscribeRate: 0,
    averageCostPerEmail: 0,
    periodStart: new Date(),
    periodEnd: new Date(),
  },

  features: {
    trackingPixel: false, // AWS SES requires custom implementation
    clickTracking: false,
    unsubscribeLink: false,
    customHeaders: true,
    attachments: true,
    templates: true,
    scheduling: false,
    bulkSending: true,
  },

  webhooks: {
    deliveryUrl: process.env.AWS_SES_WEBHOOK_DELIVERY_URL,
    bounceUrl: process.env.AWS_SES_WEBHOOK_BOUNCE_URL,
    complaintUrl: process.env.AWS_SES_WEBHOOK_COMPLAINT_URL,
  },

  createdAt: new Date(),
  updatedAt: new Date(),
};

// Configuration SMTP (pour serveurs locaux ou providers custom)
export const smtpConfig: EmailProviderConfig = {
  id: "smtp-local",
  name: "SMTP Server",
  type: EmailProviderType.SMTP,
  isActive: process.env.SMTP_ENABLED === "true",
  priority: parseInt(process.env.SMTP_PRIORITY || "4", 10),

  config: {
    host: process.env.SMTP_HOST || "localhost",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    username: process.env.SMTP_USERNAME || "",
    password: process.env.SMTP_PASSWORD || "",
    fromEmail: process.env.SMTP_FROM_EMAIL || "noreply@attendancex.com",
    fromName: process.env.SMTP_FROM_NAME || "AttendanceX",
    replyTo: process.env.SMTP_REPLY_TO || "support@attendancex.com",
  },

  rateLimit: {
    maxPerMinute: parseInt(process.env.SMTP_RATE_LIMIT_PER_MINUTE || "30", 10),
    maxPerHour: parseInt(process.env.SMTP_RATE_LIMIT_PER_HOUR || "500", 10),
    maxPerDay: parseInt(process.env.SMTP_RATE_LIMIT_PER_DAY || "5000", 10),
    maxPerMonth:
      parseInt(process.env.SMTP_RATE_LIMIT_PER_MONTH || "150000", 10),
  },

  pricing: {
    costPerEmail: 0, // Usually free for self-hosted
    currency: "USD",
    freeQuota: undefined,
  },

  stats: {
    totalSent: 0,
    totalDelivered: 0,
    totalBounced: 0,
    totalComplaints: 0,
    totalClicks: 0,
    totalOpens: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    monthlyUsage: 0,
    totalCost: 0,
    totalFailed: 0,
    totalUnsubscribes: 0,
    bounceRate: 0,
    complaintRate: 0,
    unsubscribeRate: 0,
    averageCostPerEmail: 0,
    periodStart: new Date(),
    periodEnd: new Date(),
  },

  features: {
    trackingPixel: false,
    clickTracking: false,
    unsubscribeLink: false,
    customHeaders: true,
    attachments: true,
    templates: false,
    scheduling: false,
    bulkSending: false,
  },

  createdAt: new Date(),
  updatedAt: new Date(),
};

// Configuration Postmark
export const postmarkConfig: EmailProviderConfig = {
  id: "postmark-transactional",
  name: "Postmark",
  type: EmailProviderType.POSTMARK,
  isActive: process.env.POSTMARK_ENABLED === "true",
  priority: parseInt(process.env.POSTMARK_PRIORITY || "5", 10),

  config: {
    apiKey: process.env.POSTMARK_API_KEY || "",
    fromEmail: process.env.POSTMARK_FROM_EMAIL || "noreply@attendancex.com",
    fromName: process.env.POSTMARK_FROM_NAME || "AttendanceX",
    replyTo: process.env.POSTMARK_REPLY_TO || "support@attendancex.com",
  },

  rateLimit: {
    maxPerMinute:
      parseInt(process.env.POSTMARK_RATE_LIMIT_PER_MINUTE || "100", 10),
    maxPerHour:
      parseInt(process.env.POSTMARK_RATE_LIMIT_PER_HOUR || "1000", 10),
    maxPerDay: parseInt(process.env.POSTMARK_RATE_LIMIT_PER_DAY || "10000", 10),
    maxPerMonth:
      parseInt(process.env.POSTMARK_RATE_LIMIT_PER_MONTH || "300000", 10),
  },

  pricing: {
    costPerEmail:
      parseFloat(process.env.POSTMARK_COST_PER_EMAIL ||
        "0.0025"), // $0.0025 per email
    currency: "USD",
    freeQuota: parseInt(process.env.POSTMARK_FREE_QUOTA || "100", 10),
  },

  stats: {
    totalSent: 0,
    totalDelivered: 0,
    totalBounced: 0,
    totalComplaints: 0,
    totalClicks: 0,
    totalOpens: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    monthlyUsage: 0,
    totalCost: 0,
    totalFailed: 0,
    totalUnsubscribes: 0,
    bounceRate: 0,
    complaintRate: 0,
    unsubscribeRate: 0,
    averageCostPerEmail: 0,
    periodStart: new Date(),
    periodEnd: new Date(),
  },

  features: {
    trackingPixel: true,
    clickTracking: true,
    unsubscribeLink: true,
    customHeaders: true,
    attachments: true,
    templates: true,
    scheduling: false,
    bulkSending: false,
  },

  webhooks: {
    deliveryUrl: process.env.POSTMARK_WEBHOOK_DELIVERY_URL,
    bounceUrl: process.env.POSTMARK_WEBHOOK_BOUNCE_URL,
    complaintUrl: process.env.POSTMARK_WEBHOOK_COMPLAINT_URL,
    openUrl: process.env.POSTMARK_WEBHOOK_OPEN_URL,
    clickUrl: process.env.POSTMARK_WEBHOOK_CLICK_URL,
  },

  createdAt: new Date(),
  updatedAt: new Date(),
};

// Map pour récupérer la configuration par type
export const emailProviderConfigs: Record<string, EmailProviderConfig> = {
  sendgrid: sendgridConfig,
  mailgun: mailgunConfig,
  ses: sesConfig,
  smtp: smtpConfig,
  postmark: postmarkConfig,
};

// eslint-disable-next-line valid-jsdoc
/**
 * Fonction pour récupérer la configuration du provider par défaut
 */
export function getDefaultEmailProvider(): EmailProviderConfig {
  const defaultProviderName = emailConfig.defaultProvider;
  const config = emailProviderConfigs[defaultProviderName];

  if (!config) {
    throw new Error(
      `Email provider configuration not found: ${defaultProviderName}`);
  }

  if (!config.isActive) {
    console.warn(
      `Default email provider ${defaultProviderName} is not active,
      falling back to first active provider`);

    // Trouver le premier provider actif par ordre de priorité
    const activeProvider = Object.values(emailProviderConfigs)
      .filter((provider) => provider.isActive)
      .sort((a, b) => a.priority - b.priority)[0];

    if (!activeProvider) {
      throw new Error("No active email provider found");
    }

    return activeProvider;
  }

  return config;
}

// Fonction pour récupérer les providers de fallback
// eslint-disable-next-line require-jsdoc
export function getFallbackEmailProviders(): EmailProviderConfig[] {
  return emailFailoverConfig.fallbackProviders
    .map((providerName) => emailProviderConfigs[providerName])
    .filter((config) => config && config.isActive)
    .sort((a, b) => a.priority - b.priority);
}

// Fonction pour valider la configuration
// eslint-disable-next-line require-jsdoc
export function validateEmailConfiguration(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Vérifier qu'au moins un provider est actif
  const activeProviders =
    Object.values(emailProviderConfigs)
      .filter((config) => config.isActive);
  if (activeProviders.length === 0) {
    errors.push("No active email provider configured");
  }

  // Vérifier que le provider par défaut existe et est actif
  const defaultProvider = emailProviderConfigs[emailConfig.defaultProvider];
  if (!defaultProvider) {
    errors.push(
      `Default email provider '${emailConfig.defaultProvider}' not found`);
  } else if (!defaultProvider.isActive) {
    errors.push(
      `Default email provider '${emailConfig.defaultProvider}' is not active`);
  }

  // Vérifier les configurations requises pour chaque provider actif
  activeProviders.forEach((provider) => {
    const missingFields: string[] = [];

    switch (provider.type) {
      case EmailProviderType.SENDGRID:
        if (!provider.config.apiKey) { missingFields.push("apiKey"); }
        break;

      case EmailProviderType.MAILGUN:
        if (!provider.config.apiKey) { missingFields.push("apiKey"); }
        if (!provider.config.domain) { missingFields.push("domain"); }
        break;

      case EmailProviderType.AWS_SES:
        if (!provider.config.apiKey) {
          missingFields.push("apiKey (AWS_ACCESS_KEY_ID)");
        }
        if (!provider.config.apiSecret) {
          missingFields.push("apiSecret (AWS_SECRET_ACCESS_KEY)");
        }
        break;

      case EmailProviderType.SMTP:
        if (!provider.config.host) { missingFields.push("host"); }
        if (!provider.config.username) { missingFields.push("username"); }
        if (!provider.config.password) { missingFields.push("password"); }
        break;

      case EmailProviderType.POSTMARK:
        if (!provider.config.apiKey) { missingFields.push("apiKey"); }
        break;
    }

    if (!provider.config.fromEmail) { missingFields.push("fromEmail"); }

    if (missingFields.length > 0) {
      errors.push(
        `${provider.name} (${provider.type}): Missing required fields:
           ${missingFields.join(", ")}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Export par défaut
export default {
  emailConfig,
  emailRetryConfig,
  emailFailoverConfig,
  sendgridConfig,
  mailgunConfig,
  sesConfig,
  smtpConfig,
  postmarkConfig,
  emailProviderConfigs,
  getDefaultEmailProvider,
  getFallbackEmailProviders,
  validateEmailConfiguration,
};

// Templates par défaut pour chaque provider
export const defaultEmailTemplates = {
  welcome: {
    subject: "Bienvenue sur {{appName}} !",
    htmlContent: `
      <h1>Bienvenue {{userName}} !</h1>
      <p>Nous sommes ravis de vous compter parmi nous.</p>
      <p>Pour commencer, veuillez vérifier 
      votre adresse email en cliquant sur le lien ci-dessous :</p>
      <a href="{{verificationLink}}" 
      style="background-color: #007bff; color: white; padding: 10px 20px; 
      text-decoration: none; border-radius: 5px;">Vérifier mon email</a>
      <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
      <p>L'équipe {{appName}}</p>
    `,
    variables: ["userName", "appName", "verificationLink"],
  },

  eventReminder: {
    subject: "Rappel : {{eventTitle}} dans {{timeUntil}}",
    htmlContent: `
      <h1>N'oubliez pas votre événement !</h1>
      <h2>{{eventTitle}}</h2>
      <p><strong>Date :</strong> {{eventDate}}</p>
      <p><strong>Lieu :</strong> {{eventLocation}}</p>
      <p><strong>Début :</strong> {{eventTime}}</p>
      {{#if qrCodeUrl}}
      <p>Voici votre QR code pour l'enregistrement :</p>
      <img src="{{qrCodeUrl}}" 
      alt="QR Code" style="width: 200px; height: 200px;">
      {{/if}}
      <p>Nous avons hâte de vous voir !</p>
    `,
    variables: ["eventTitle", "timeUntil",
      "eventDate", "eventLocation", "eventTime", "qrCodeUrl"],
  },

  attendanceConfirmation: {
    subject: "Présence confirmée pour {{eventTitle}}",
    htmlContent: `
      <h1>Présence confirmée !</h1>
      <p>Bonjour {{userName}},</p>
      <p>Votre présence à l'événement 
      <strong>{{eventTitle}}</strong> a été confirmée.</p>
      <p><strong>Heure d'arrivée :</strong> {{checkInTime}}</p>
      <p><strong>Statut :</strong> {{status}}</p>
      <p>Merci de votre participation !</p>
    `,
    variables: ["userName", "eventTitle", "checkInTime", "status"],
  },

  resetPassword: {
    subject: "Réinitialisation de votre mot de passe",
    htmlContent: `
      <h1>Réinitialisation de mot de passe</h1>
      <p>Bonjour {{userName}},</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
      <a href="{{resetLink}}" 
      style="background-color: #dc3545; color: white; padding: 10px 20px; 
      text-decoration: none; border-radius: 5px;">
      Réinitialiser mon mot de passe</a>
      <p>Ce lien expirera dans 24 heures.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation,
       ignorez ce message.</p>
    `,
    variables: ["userName", "resetLink"],
  },
};
