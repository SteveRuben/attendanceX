import {z} from "zod";

// Schéma de validation pour les variables d'environnement
const environmentSchema = z.object({
  // 🔥 Configuration Firebase
  FIREBASE_PROJECT_ID: z.string().min(1, "Firebase Project ID is required"),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_DATABASE_URL: z.string().url().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),

  // 🌐 Configuration générale
  NODE_ENV: z.enum(["development", "staging", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  API_VERSION: z.string().default("1.0.0"),

  // 🔐 Sécurité
  JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),
  JWT_REFRESH_SECRET:
      z.string().min(32, "JWT refresh secret must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  ENCRYPTION_KEY:
      z.string().min(32, "Encryption key must be at least 32 characters"),

  // 🌍 URLs et domaines
  FRONTEND_URL: z.string().url(),
  ADMIN_URL: z.string().url().optional(),
  API_URL: z.string().url(),
  WEBHOOK_BASE_URL: z.string().url().optional(),

  // 📧 Configuration Email
  DEFAULT_EMAIL_PROVIDER:
      z.enum(["sendgrid", "mailgun", "ses", "smtp", "postmark"])
        .default("sendgrid"),
  EMAIL_FAILOVER_ENABLED: z.coerce.boolean().default(true),
  EMAIL_FALLBACK_PROVIDERS: z.string().default("mailgun,ses"),
  EMAIL_TRACKING_ENABLED: z.coerce.boolean().default(true),
  EMAIL_RATE_LIMIT_PER_MINUTE: z.coerce.number().default(50),
  EMAIL_RATE_LIMIT_PER_HOUR: z.coerce.number().default(1000),
  EMAIL_RATE_LIMIT_PER_DAY: z.coerce.number().default(10000),

  // 📧 SendGrid
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),
  SENDGRID_FROM_NAME: z.string().default("AttendanceX"),
  SENDGRID_REPLY_TO: z.string().email().optional(),
  SENDGRID_ENABLED: z.coerce.boolean().default(true),
  SENDGRID_WEBHOOK_VERIFY_KEY: z.string().optional(),

  // 📧 Mailgun
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  MAILGUN_FROM_EMAIL: z.string().email().optional(),
  MAILGUN_ENABLED: z.coerce.boolean().default(false),

  // 📧 AWS SES
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("eu-west-1"),
  AWS_SES_FROM_EMAIL: z.string().email().optional(),
  AWS_SES_ENABLED: z.coerce.boolean().default(false),

  // 📱 Configuration SMS
  DEFAULT_SMS_PROVIDER:
      z.enum(["twilio", "vonage", "aws_sns"])
        .default("twilio"),
  SMS_FAILOVER_ENABLED: z.coerce.boolean().default(true),
  SMS_FALLBACK_PROVIDERS: z.string().default("vonage,aws_sns"),
  SMS_RATE_LIMIT_PER_MINUTE: z.coerce.number().default(10),
  SMS_RATE_LIMIT_PER_HOUR: z.coerce.number().default(100),
  SMS_RATE_LIMIT_PER_DAY: z.coerce.number().default(1000),

  // 📱 Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_ENABLED: z.coerce.boolean().default(true),

  // 📱 Vonage (ex-Nexmo)
  VONAGE_API_KEY: z.string().optional(),
  VONAGE_API_SECRET: z.string().optional(),
  VONAGE_FROM_NUMBER: z.string().optional(),
  VONAGE_ENABLED: z.coerce.boolean().default(false),

  // 🔔 Push Notifications
  FCM_SERVER_KEY: z.string().optional(),
  FCM_PROJECT_ID: z.string().optional(),
  PUSH_ENABLED: z.coerce.boolean().default(true),

  // 🗃️ Base de données
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  FIREBASE_STORAGE_EMULATOR_HOST: z.string().optional(),

  // 📊 Analytics et Monitoring
  GOOGLE_ANALYTICS_ID: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  MIXPANEL_TOKEN: z.string().optional(),

  // 🔍 Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_FORMAT: z.enum(["json", "simple"]).default("json"),
  LOG_FILE_ENABLED: z.coerce.boolean().default(false),
  LOG_FILE_PATH: z.string().default("./logs/app.log"),

  // ⚡ Performance
  REDIS_URL: z.string().url().optional(),
  CACHE_TTL_DEFAULT: z.coerce.number().default(300), // 5 minutes
  CACHE_TTL_LONG: z.coerce.number().default(3600), // 1 hour
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // 🔒 Sécurité avancée
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  SESSION_TIMEOUT_MINUTES: z.coerce.number().default(60),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().default(5),
  ACCOUNT_LOCKOUT_MINUTES: z.coerce.number().default(30),
  PASSWORD_RESET_EXPIRES_MINUTES: z.coerce.number().default(60),
  EMAIL_VERIFICATION_EXPIRES_HOURS: z.coerce.number().default(24),

  // 🧠 Machine Learning
  ML_ENABLED: z.coerce.boolean().default(true),
  ML_MODEL_UPDATE_INTERVAL_HOURS: z.coerce.number().default(24),
  ML_PREDICTION_CACHE_TTL: z.coerce.number().default(1800), // 30 minutes
  TENSORFLOW_ENV: z.enum(["node", "cpu", "gpu"]).default("node"),

  // 📁 Fichiers et stockage
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  ALLOWED_FILE_TYPES: z.string().default("jpg,jpeg,png,pdf,doc,docx,xls,xlsx"),
  FILE_CLEANUP_INTERVAL_HOURS: z.coerce.number().default(24),
  TEMP_FILES_TTL_HOURS: z.coerce.number().default(2),

  // 🗓️ Événements
  DEFAULT_EVENT_DURATION_MINUTES: z.coerce.number().default(60),
  MAX_EVENT_DURATION_HOURS: z.coerce.number().default(24),
  DEFAULT_REMINDER_INTERVALS:
      z.string().default("1440,60,15"), // 24h, 1h, 15min
  MAX_EVENT_PARTICIPANTS: z.coerce.number().default(1000),
  QR_CODE_EXPIRY_HOURS: z.coerce.number().default(24),

  // 📍 Géolocalisation
  DEFAULT_GEOFENCE_RADIUS_METERS: z.coerce.number().default(100),
  MAX_GEOFENCE_RADIUS_METERS: z.coerce.number().default(1000),
  LOCATION_ACCURACY_THRESHOLD_METERS: z.coerce.number().default(50),

  // 📈 Reporting
  REPORT_GENERATION_TIMEOUT_MINUTES: z.coerce.number().default(10),
  REPORT_CLEANUP_DAYS: z.coerce.number().default(30),
  MAX_REPORT_SIZE_MB: z.coerce.number().default(50),
  REPORT_CACHE_TTL_HOURS: z.coerce.number().default(2),

  // 🔄 Intégrations externes
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  MICROSOFT_TEAMS_WEBHOOK_URL: z.string().url().optional(),
  ZAPIER_WEBHOOK_URL: z.string().url().optional(),

  // 🧪 Mode développement
  DEBUG_MODE: z.coerce.boolean().default(false),
  MOCK_EXTERNAL_SERVICES: z.coerce.boolean().default(false),
  DISABLE_AUTHENTICATION: z.coerce.boolean().default(false),
  SEED_DATABASE: z.coerce.boolean().default(false),

  // 📊 Métriques business
  ATTENDANCE_LATE_THRESHOLD_MINUTES: z.coerce.number().default(15),
  ATTENDANCE_EARLY_LEAVE_THRESHOLD_MINUTES: z.coerce.number().default(15),
  MIN_ATTENDANCE_RATE_PERCENT: z.coerce.number().default(80),
  NOTIFICATION_BATCH_SIZE: z.coerce.number().default(100),

  // 🌐 Internationalisation
  DEFAULT_LANGUAGE: z.enum(["fr", "en", "es", "de"]).default("fr"),
  DEFAULT_TIMEZONE: z.string().default("Europe/Paris"),
  DEFAULT_DATE_FORMAT: z.string().default("DD/MM/YYYY"),
  DEFAULT_TIME_FORMAT: z.enum(["12h", "24h"]).default("24h"),

  // 🔧 Maintenance
  MAINTENANCE_MODE: z.coerce.boolean().default(false),
  HEALTH_CHECK_INTERVAL_SECONDS: z.coerce.number().default(30),
  BACKUP_ENABLED: z.coerce.boolean().default(true),
  BACKUP_INTERVAL_HOURS: z.coerce.number().default(24),

  // 🚀 Déploiement
  DEPLOYMENT_ENVIRONMENT: z.string().default("local"),
  VERSION: z.string().default("1.0.0"),
  BUILD_NUMBER: z.string().optional(),
  COMMIT_SHA: z.string().optional(),
  DEPLOY_DATE: z.string().optional(),
});

// Type inféré du schéma
export type Environment = z.infer<typeof environmentSchema>;

// Configuration par environnement
const environmentDefaults = {
  development: {
    LOG_LEVEL: "debug",
    DEBUG_MODE: true,
    MOCK_EXTERNAL_SERVICES: true,
    CACHE_TTL_DEFAULT: 60, // 1 minute en dev
    ML_ENABLED: false, // Désactivé en dev pour les performances
    EMAIL_TRACKING_ENABLED: false,
    FIRESTORE_EMULATOR_HOST: "localhost:8080",
    FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
  },

  staging: {
    LOG_LEVEL: "info",
    DEBUG_MODE: false,
    MOCK_EXTERNAL_SERVICES: false,
    ML_ENABLED: true,
    EMAIL_TRACKING_ENABLED: true,
    SENTRY_ENVIRONMENT: "staging",
  },

  production: {
    LOG_LEVEL: "warn",
    DEBUG_MODE: false,
    MOCK_EXTERNAL_SERVICES: false,
    ML_ENABLED: true,
    EMAIL_TRACKING_ENABLED: true,
    SENTRY_ENVIRONMENT: "production",
    RATE_LIMIT_MAX_REQUESTS: 50, // Plus strict en prod
    SESSION_TIMEOUT_MINUTES: 30, // Plus court en prod
  },
} as const;

// Variables d'environnement avec validation
// eslint-disable-next-line require-jsdoc
function loadEnvironment(): Environment {
  const env =
      process.env.NODE_ENV as keyof typeof environmentDefaults || "development";

  // Merger les defaults selon l'environnement
  const defaults = environmentDefaults[env] || environmentDefaults.development;
  const envWithDefaults = {...process.env, ...defaults};

  try {
    const validatedEnv = environmentSchema.parse(envWithDefaults);

    // Validation supplémentaire pour les dépendances
    validateEnvironmentDependencies(validatedEnv);

    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) =>
        `${err.path.join(".")}: ${err.message}`
      ).join("\n");

      throw new Error(`❌ Invalid environment configuration:\n${errorMessages}`);
    }
    throw error;
  }
}

// Validation des dépendances entre variables
// eslint-disable-next-line require-jsdoc
function validateEnvironmentDependencies(env: Environment): void {
  const errors: string[] = [];

  // Validation Email
  if (env.DEFAULT_EMAIL_PROVIDER === "sendgrid" && !env.SENDGRID_API_KEY) {
    errors.push(
      "SENDGRID_API_KEY is required when using SendGrid as default provider");
  }

  if (env.DEFAULT_EMAIL_PROVIDER === "mailgun" &&
      (!env.MAILGUN_API_KEY || !env.MAILGUN_DOMAIN)) {
    errors.push(
      "MAILGUN_API_KEY and MAILGUN_DOMAIN are required when using Mailgun");
  }

  if (env.DEFAULT_EMAIL_PROVIDER === "ses" &&
      (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY)) {
    errors.push(
      "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY " +
        "are required when using AWS SES");
  }

  // Validation SMS
  if (env.DEFAULT_SMS_PROVIDER === "twilio" &&
      (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN)) {
    errors.push(
      "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN " +
        "are required when using Twilio");
  }

  if (env.DEFAULT_SMS_PROVIDER === "vonage" &&
      (!env.VONAGE_API_KEY || !env.VONAGE_API_SECRET)) {
    errors.push("VONAGE_API_KEY and VONAGE_API_SECRET " +
        "are required when using Vonage");
  }

  // Validation Push
  if (env.PUSH_ENABLED && !env.FCM_SERVER_KEY) {
    errors.push("FCM_SERVER_KEY is required " +
        "when push notifications are enabled");
  }

  // Validation Production
  if (env.NODE_ENV === "production") {
    if (!env.SENTRY_DSN) {
      console.warn("⚠️  SENTRY_DSN not configured for production environment");
    }

    if (env.DEBUG_MODE) {
      console.warn("⚠️  DEBUG_MODE is enabled in production");
    }

    if (env.DISABLE_AUTHENTICATION) {
      errors.push("DISABLE_AUTHENTICATION cannot be true in production");
    }
  }

  if (errors.length > 0) {
    throw new Error(`❌ Environment validation failed:\n${errors.join("\n")}`);
  }
}

// Configuration chargée et validée
export const env = loadEnvironment();

// Helpers pour accéder aux configurations
export const config = {
  // Configuration générale
  isDevelopment: env.NODE_ENV === "development",
  isStaging: env.NODE_ENV === "staging",
  isProduction: env.NODE_ENV === "production",
  isDebug: env.DEBUG_MODE,

  // URLs
  api: {
    url: env.API_URL,
    version: env.API_VERSION,
  },

  frontend: {
    url: env.FRONTEND_URL,
    adminUrl: env.ADMIN_URL,
  },

  // Sécurité
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtRefreshSecret: env.JWT_REFRESH_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    bcryptRounds: env.BCRYPT_ROUNDS,
    sessionTimeoutMinutes: env.SESSION_TIMEOUT_MINUTES,
    maxLoginAttempts: env.MAX_LOGIN_ATTEMPTS,
    accountLockoutMinutes: env.ACCOUNT_LOCKOUT_MINUTES,
  },

  // Rate limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    email: {
      perMinute: env.EMAIL_RATE_LIMIT_PER_MINUTE,
      perHour: env.EMAIL_RATE_LIMIT_PER_HOUR,
      perDay: env.EMAIL_RATE_LIMIT_PER_DAY,
    },
    sms: {
      perMinute: env.SMS_RATE_LIMIT_PER_MINUTE,
      perHour: env.SMS_RATE_LIMIT_PER_HOUR,
      perDay: env.SMS_RATE_LIMIT_PER_DAY,
    },
  },

  // Cache
  cache: {
    defaultTtl: env.CACHE_TTL_DEFAULT,
    longTtl: env.CACHE_TTL_LONG,
    mlPredictionTtl: env.ML_PREDICTION_CACHE_TTL,
    reportTtl: env.REPORT_CACHE_TTL_HOURS * 3600,
  },

  // Fichiers
  files: {
    maxSizeMB: env.MAX_FILE_SIZE_MB,
    allowedTypes: env.ALLOWED_FILE_TYPES.split(","),
    tempTtlHours: env.TEMP_FILES_TTL_HOURS,
  },

  // Événements
  events: {
    defaultDurationMinutes: env.DEFAULT_EVENT_DURATION_MINUTES,
    maxDurationHours: env.MAX_EVENT_DURATION_HOURS,
    maxParticipants: env.MAX_EVENT_PARTICIPANTS,
    qrCodeExpiryHours: env.QR_CODE_EXPIRY_HOURS,
    reminderIntervals: env.DEFAULT_REMINDER_INTERVALS.split(",").map(Number),
  },

  // Géolocalisation
  location: {
    defaultRadiusMeters: env.DEFAULT_GEOFENCE_RADIUS_METERS,
    maxRadiusMeters: env.MAX_GEOFENCE_RADIUS_METERS,
    accuracyThresholdMeters: env.LOCATION_ACCURACY_THRESHOLD_METERS,
  },

  // Présences
  attendance: {
    lateThresholdMinutes: env.ATTENDANCE_LATE_THRESHOLD_MINUTES,
    earlyLeaveThresholdMinutes: env.ATTENDANCE_EARLY_LEAVE_THRESHOLD_MINUTES,
    minAttendanceRatePercent: env.MIN_ATTENDANCE_RATE_PERCENT,
  },

  // Machine Learning
  ml: {
    enabled: env.ML_ENABLED,
    modelUpdateIntervalHours: env.ML_MODEL_UPDATE_INTERVAL_HOURS,
    predictionCacheTtl: env.ML_PREDICTION_CACHE_TTL,
    tensorflowEnv: env.TENSORFLOW_ENV,
  },

  // Internationalisation
  i18n: {
    defaultLanguage: env.DEFAULT_LANGUAGE,
    defaultTimezone: env.DEFAULT_TIMEZONE,
    defaultDateFormat: env.DEFAULT_DATE_FORMAT,
    defaultTimeFormat: env.DEFAULT_TIME_FORMAT,
  },

  // Logging
  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
    fileEnabled: env.LOG_FILE_ENABLED,
    filePath: env.LOG_FILE_PATH,
  },

  // Maintenance
  maintenance: {
    mode: env.MAINTENANCE_MODE,
    healthCheckIntervalSeconds: env.HEALTH_CHECK_INTERVAL_SECONDS,
    backupEnabled: env.BACKUP_ENABLED,
    backupIntervalHours: env.BACKUP_INTERVAL_HOURS,
  },

  // Déploiement
  deployment: {
    environment: env.DEPLOYMENT_ENVIRONMENT,
    version: env.VERSION,
    buildNumber: env.BUILD_NUMBER,
    commitSha: env.COMMIT_SHA,
    deployDate: env.DEPLOY_DATE,
  },
} as const;

// Fonction pour vérifier la santé de la configuration,
// "pass" | "warn" | "fail";
// eslint-disable-next-line require-jsdoc
export function checkEnvironmentHealth(): {
  status: "healthy" | "degraded" | "unhealthy";
  checks: Array<{
    name: string;
    status: string;
    message?: string | undefined }>;
    } {
  const checks = [
    {
      name: "Firebase Configuration",
      status: env.FIREBASE_PROJECT_ID ? "pass" : "fail" as const,
      message: env.FIREBASE_PROJECT_ID ? undefined :
        "Firebase Project ID not configured",
    },
    {
      name: "JWT Configuration",
      status: env.JWT_SECRET.length >= 32 ? "pass" : "fail" as const,
      message: env.JWT_SECRET.length >= 32 ? undefined : "JWT secret too short",
    },
    {
      name: "Email Provider",
      status: "pass" as const, // Validé dans validateEnvironmentDependencies
    },
    {
      name: "SMS Provider",
      status: "pass" as const, // Validé dans validateEnvironmentDependencies
    },
    {
      name: "Push Notifications",
      status: env.PUSH_ENABLED && env.FCM_SERVER_KEY ? "pass" : "warn" as const,
      message: env.PUSH_ENABLED && !env.FCM_SERVER_KEY ?
        "Push notifications enabled but FCM key missing" : undefined,
    },
    {
      name: "Monitoring",
      status: env.NODE_ENV === "production" && !env.SENTRY_DSN ?
        "warn" : "pass" as const,
      message: env.NODE_ENV === "production" && !env.SENTRY_DSN ?
        "Sentry not configured for production" : undefined,
    },
  ];

  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;

  let status: "healthy" | "degraded" | "unhealthy";
  if (failCount > 0) {
    status = "unhealthy";
  } else if (warnCount > 0) {
    status = "degraded";
  } else {
    status = "healthy";
  }

  return {status, checks};
}

// Export des variables d'environnement pour compatibilité
export {env as environment};

// Log de la configuration au démarrage
if (!config.isProduction) {
  console.log("🔧 Environment Configuration Loaded:", {
    environment: env.NODE_ENV,
    debug: config.isDebug,
    version: config.deployment.version,
    emailProvider: env.DEFAULT_EMAIL_PROVIDER,
    smsProvider: env.DEFAULT_SMS_PROVIDER,
    mlEnabled: config.ml.enabled,
  });

  const health = checkEnvironmentHealth();
  console.log(`📊 Environment Health: ${health.status.toUpperCase()}`);

  health.checks.forEach((check) => {
    const emoji = check.status === "pass" ?
      "✅" : check.status === "warn" ? "⚠️" : "❌";
    console.log(`${emoji} ${check.name}: ${check.status}${check.message ?
      ` - ${check.message}` : ""}`);
  });
}

export default config;
