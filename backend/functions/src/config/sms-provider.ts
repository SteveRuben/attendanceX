import {   AwsSnsConfig,
  CustomApiConfig,
  SmsProviderConfig,
  SmsProviderType,
  TwilioConfig,
  VonageConfig } from "../common/types";

export const smsConfig = {
  defaultProvider: process.env.DEFAULT_SMS_PROVIDER || "twilio",
  rateLimits: {
    perMinute: parseInt(process.env.SMS_RATE_LIMIT_PER_MINUTE || "10", 10),
    perHour: parseInt(process.env.SMS_RATE_LIMIT_PER_HOUR || "100", 10),
    perDay: parseInt(process.env.SMS_RATE_LIMIT_PER_DAY || "1000", 10),
  },
  messageConfig: {
    maxLength:50,
  },
  retryConfig: {
    attempts: 3,
    delaySeconds: 30,
  },
  failoverEnabled: process.env.SMS_FAILOVER_ENABLED === "true",
};

// Configuration Twilio
export const twilioConfig: TwilioConfig = {
  id: "twilio-primary",
  name: "Twilio",
  type: SmsProviderType.TWILIO,
  isActive: process.env.TWILIO_ENABLED === "true",
  priority: parseInt(process.env.TWILIO_PRIORITY || "1", 10),

  credentials: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
  },

  rateLimit: {
    maxPerMinute: parseInt(process.env.TWILIO_RATE_LIMIT_PER_MINUTE || "50", 10),
    maxPerHour: parseInt(process.env.TWILIO_RATE_LIMIT_PER_HOUR || "1000", 10),
    maxPerDay: parseInt(process.env.TWILIO_RATE_LIMIT_PER_DAY || "10000", 10),
  },

  settings: {
    statusCallback: process.env.TWILIO_WEBHOOK_URL ?? '',
  },

  createdAt: new Date(),
  updatedAt: new Date(),
  config: {
    apiKey: undefined,
    apiSecret: undefined,
    senderId: undefined,
    endpoint: undefined,
    headers: undefined,
    authType: undefined,
    webhookUrl: undefined,
    features: undefined
  },
  pricing: {
    costPerSms: 0,
    currency: "",
    freeCredits: undefined,
    monthlyQuota: undefined
  },
  stats: {
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalCost: 0,
    deliveryRate: 0,
    avgDeliveryTime: 0,
    lastUsed: undefined,
    monthlyUsage: 0
  }
};

// Configuration Vonage
export const vonageConfig: VonageConfig = {
  id: "vonage-backup",
  name: "Vonage",
  type: SmsProviderType.VONAGE,
  isActive: process.env.VONAGE_ENABLED === "true",
  priority: parseInt(process.env.VONAGE_PRIORITY || "2", 10),

  credentials: {
    apiKey: process.env.VONAGE_API_KEY || "",
    apiSecret: process.env.VONAGE_API_SECRET || "",
    brandName: process.env.VONAGE_BRAND_NAME || "AttendanceX",
  },

  rateLimit: {
    maxPerMinute: parseInt(process.env.VONAGE_RATE_LIMIT_PER_MINUTE || "30", 10),
    maxPerHour: parseInt(process.env.VONAGE_RATE_LIMIT_PER_HOUR || "500", 10),
    maxPerDay: parseInt(process.env.VONAGE_RATE_LIMIT_PER_DAY || "5000", 10),
  },

  settings: {
    type: "text",
    defaultTtl: 86400000, // 24h
    webhookUrl: process.env.VONAGE_WEBHOOK_URL,
  },

  countrySettings: {
    "FR": {
      senderId: process.env.VONAGE_SENDER_ID_FR || "AttendanceX",
      pricing: 0.008,
    },
    "US": {
      senderId: process.env.VONAGE_SENDER_ID_US || "AttendanceX",
      pricing: 0.0075,
    },
    "GB": {
      senderId: process.env.VONAGE_SENDER_ID_GB || "AttendanceX",
      pricing: 0.0085,
    },
  },

  createdAt: new Date(),
  updatedAt: new Date(),
  config: {
    apiKey: undefined,
    apiSecret: undefined,
    senderId: undefined,
    endpoint: undefined,
    headers: undefined,
    authType: undefined,
    webhookUrl: undefined,
    features: undefined
  },
  pricing: {
    costPerSms: 0,
    currency: "",
    freeCredits: undefined,
    monthlyQuota: undefined
  },
  stats: {
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalCost: 0,
    deliveryRate: 0,
    avgDeliveryTime: 0,
    lastUsed: new Date(),
    monthlyUsage: 0
  }
};

// Configuration AWS SNS
export const awsSnsConfig: AwsSnsConfig = {
  id: "aws-sns-backup",
  name: "AWS SNS",
  type: SmsProviderType.AWS_SNS,
  isActive: process.env.AWS_SNS_ENABLED === "true",
  priority: parseInt(process.env.AWS_SNS_PRIORITY || "3", 10),

  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    region: process.env.AWS_REGION || "us-east-1",
  },

  rateLimit: {
    maxPerMinute: parseInt(process.env.AWS_SNS_RATE_LIMIT_PER_MINUTE || "100", 10),
    maxPerHour: parseInt(process.env.AWS_SNS_RATE_LIMIT_PER_HOUR || "1500", 10),
    maxPerDay: parseInt(process.env.AWS_SNS_RATE_LIMIT_PER_DAY || "15000", 10),
  },

  settings: {
    defaultSenderId: process.env.AWS_SNS_SENDER_ID || "AttendanceX",
    smsType: "Transactional",
    maxPrice: "0.50",
  },

  messageAttributes: {
    urgent: {
      "AWS.SNS.SMS.SMSType": "Transactional",
      "AWS.SNS.SMS.MaxPrice": "1.00",
    },
    reminder: {
      "AWS.SNS.SMS.SMSType": "Promotional",
      "AWS.SNS.SMS.MaxPrice": "0.50",
    },
  },

  createdAt: new Date(),
  updatedAt: new Date(),
  config: {
    apiKey: undefined,
    apiSecret: undefined,
    senderId: undefined,
    endpoint: undefined,
    headers: undefined,
    authType: undefined,
    webhookUrl: undefined,
    features: undefined
  },
  pricing: {
    costPerSms: 0,
    currency: "",
    freeCredits: undefined,
    monthlyQuota: undefined
  },
  stats: {
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalCost: 0,
    deliveryRate: 0,
    avgDeliveryTime: 0,
    lastUsed: new Date(),
    monthlyUsage: 0
  }
};

// Configuration Custom API
export const customApiConfig: CustomApiConfig = {
  id: "custom-api",
  name: "Custom API",
  type: SmsProviderType.CUSTOM_API,
  isActive: process.env.CUSTOM_SMS_API_ENABLED === "true",
  priority: parseInt(process.env.CUSTOM_SMS_API_PRIORITY || "4", 10),

  credentials: {
    apiKey: process.env.CUSTOM_SMS_API_KEY || "",
    endpoint: process.env.CUSTOM_SMS_API_ENDPOINT || "",
    method: process.env.CUSTOM_SMS_API_METHOD || "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.CUSTOM_SMS_API_KEY}`,
    },
  },

  rateLimit: {
    maxPerMinute: parseInt(process.env.CUSTOM_SMS_API_RATE_LIMIT_PER_MINUTE || "20", 10),
    maxPerHour: parseInt(process.env.CUSTOM_SMS_API_RATE_LIMIT_PER_HOUR || "300", 10),
    maxPerDay: parseInt(process.env.CUSTOM_SMS_API_RATE_LIMIT_PER_DAY || "3000", 10),
  },

  settings: {
    testEndpoint: process.env.CUSTOM_SMS_API_TEST_ENDPOINT,
    bodyTemplate: {
      to: "{phoneNumber}",
      message: "{message}",
      from: "AttendanceX",
      timestamp: "{timestamp}",
    },
    responseMapping: {
      success: "status === 'sent' || success === true",
      error: "error || message",
      messageId: "data.id || id || messageId",
      cost: "data.cost || cost || 0",
      status: "data.status || status || 'sent'",
      metadata: "data.metadata || metadata || {}",
    },
  },

  createdAt: new Date(),
  updatedAt: new Date(),
  config: {
    apiKey: undefined,
    apiSecret: undefined,
    senderId: undefined,
    endpoint: undefined,
    headers: undefined,
    authType: undefined,
    webhookUrl: undefined,
    features: undefined
  },
  pricing: {
    costPerSms: 0,
    currency: "",
    freeCredits: undefined,
    monthlyQuota: undefined
  },
  stats: {
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalCost: 0,
    deliveryRate: 0,
    avgDeliveryTime: 0,
    lastUsed: undefined,
    monthlyUsage: 0
  }
};

// Map pour récupérer la configuration par type
export const smsProviderConfigs: Record<string, SmsProviderConfig> = {
  twilio: twilioConfig,
  vonage: vonageConfig,
  aws_sns: awsSnsConfig,
  custom_api: customApiConfig,
};

// Fonction pour récupérer le provider par défaut
export function getDefaultSmsProvider(): SmsProviderConfig {
  const defaultProviderName = smsConfig.defaultProvider;
  const config = smsProviderConfigs[defaultProviderName];

  if (!config) {
    throw new Error(`SMS provider configuration not found: ${defaultProviderName}`);
  }

  if (!config.isActive) {
    console.warn(`Default SMS provider ${defaultProviderName} is not active, falling back to first active provider`);

    const activeProvider = Object.values(smsProviderConfigs)
      .filter((provider) => provider.isActive)
      .sort((a, b) => a.priority - b.priority)[0];

    if (!activeProvider) {
      throw new Error("No active SMS provider found");
    }

    return activeProvider;
  }

  return config;
}

// Fonction pour récupérer les providers de fallback
export function getFallbackSmsProviders(): SmsProviderConfig[] {
  return Object.values(smsProviderConfigs)
    .filter((config) => config.isActive)
    .sort((a, b) => a.priority - b.priority)
    .slice(1); // Exclure le provider principal
}

// Fonction pour valider la configuration
export function validateSmsConfiguration(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Vérifier qu'au moins un provider est actif
  const activeProviders = Object.values(smsProviderConfigs).filter((config) => config.isActive);
  if (activeProviders.length === 0) {
    errors.push("No active SMS provider configured");
  }

  // Vérifier que le provider par défaut existe et est actif
  const defaultProvider = smsProviderConfigs[smsConfig.defaultProvider];
  if (!defaultProvider) {
    errors.push(`Default SMS provider '${smsConfig.defaultProvider}' not found`);
  } else if (!defaultProvider.isActive) {
    errors.push(`Default SMS provider '${smsConfig.defaultProvider}' is not active`);
  }

  // Vérifier les configurations requises pour chaque provider actif
  activeProviders.forEach((provider) => {
    const missingFields: string[] = [];

    switch (provider.type) {
    case SmsProviderType.TWILIO:
      if (!(provider as TwilioConfig).credentials.accountSid) {missingFields.push("accountSid");}
      if (!(provider as TwilioConfig).credentials.authToken) {missingFields.push("authToken");}
      if (!(provider as TwilioConfig).credentials.phoneNumber) {missingFields.push("phoneNumber");}
      break;

    case SmsProviderType.VONAGE:
      if (!(provider as VonageConfig).credentials.apiKey) {missingFields.push("apiKey");}
      if (!(provider as VonageConfig).credentials.apiSecret) {missingFields.push("apiSecret");}
      break;

    case SmsProviderType.AWS_SNS:
      if (!(provider as AwsSnsConfig).credentials.accessKeyId) {missingFields.push("accessKeyId");}
      if (!(provider as AwsSnsConfig).credentials.secretAccessKey) {missingFields.push("secretAccessKey");}
      if (!(provider as AwsSnsConfig).credentials.region) {missingFields.push("region");}
      break;

    case SmsProviderType.CUSTOM_API:
      if (!(provider as CustomApiConfig).credentials.endpoint) {missingFields.push("endpoint");}
      break;
    }

    if (missingFields.length > 0) {
      errors.push(`${provider.name} (${provider.type}): Missing required fields: ${missingFields.join(", ")}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export default {
  smsConfig,
  twilioConfig,
  vonageConfig,
  awsSnsConfig,
  customApiConfig,
  smsProviderConfigs,
  getDefaultSmsProvider,
  getFallbackSmsProviders,
  validateSmsConfiguration,
};
