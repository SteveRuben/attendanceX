import {CorsOptions} from "cors";

// Configuration générale de l'application
export const appConfig = {
  name: "AttendanceX",
  version: "1.0.0",
  apiVersion: "v1",
  environment: process.env.APP_ENV || "development",
  isProduction: process.env.APP_ENV === "production",
  isDevelopment: process.env.APP_ENV === "development",
  isTest: process.env.APP_ENV === "test",
  port: 5001, // Port fixe pour Firebase Functions
  logLevel: process.env.LOG_LEVEL || "info",
  region: process.env.FUNCTIONS_REGION || "us-central1",
};


export const contentSecurityPolicy = {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.attendance-x.app"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
};
export const hsts= {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
}

// Configuration CORS
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Liste des domaines autorisés
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://attendance-app.web.app",
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    // En développement, autoriser les requêtes sans origine (ex: Postman)
    if (!origin && appConfig.isDevelopment) {
      return callback(null, true);
    }

    // En production, vérifier l'origine
    if (allowedOrigins.includes(origin as string) || !origin) {
      return callback(null, true);
    }

    callback(new Error("CORS non autorisé pour cette origine"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400, // 24 heures
};

// Configuration de la sécurité
export let securityConfig: {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    algorithm: string
  };
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    maxAge: number
  };
  auth: {
    enable2FA: boolean;
    maxLoginAttempts: number;
    lockoutMinutes: number;
    sessionTimeoutMinutes: number
  };
  headers: {
    enabled: boolean;
    contentSecurityPolicy: string;
    xFrameOptions: string;
    xContentTypeOptions: string;
    referrerPolicy: string
  }
};
// eslint-disable-next-line prefer-const
securityConfig = {
  // JWT configuration
  jwt: {
    "secret": process.env.JWT_SECRET ||
        "your-default-secret-key-minimum-32-chars",
    "expiresIn": process.env.JWT_EXPIRY || "24h",
    "refreshExpiresIn": process.env.REFRESH_TOKEN_EXPIRY || "7d",
    "algorithm": "HS256",
  },

  // Password policy
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "12", 10),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === "true",
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === "true",
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === "true",
    requireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS === "true",
    maxAge: parseInt(process.env.PASSWORD_MAX_AGE_DAYS || "90", 10),
  },

  // Authentication
  auth: {
    "enable2FA": process.env.ENABLE_2FA === "true",
    "lockoutMinutes": parseInt(process.env.ACCOUNT_LOCKOUT_MINUTES || "30", 10),
    "maxLoginAttempts": parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5", 10),
    "sessionTimeoutMinutes":
        parseInt(process.env.SESSION_TIMEOUT_MINUTES || "60", 10),
  },

  // Headers de sécurité
  headers: {
    enabled: process.env.SECURITY_HEADERS_ENABLED === "true",
    contentSecurityPolicy: "default-src 'self'; img-src 'self' data: https://*; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com;",
    xFrameOptions: "DENY",
    xContentTypeOptions: "nosniff",
    referrerPolicy: "strict-origin-when-cross-origin",
  },
};

// Configuration de la pagination
export const paginationConfig = {
  defaultLimit: parseInt(process.env.DEFAULT_PAGE_SIZE || "20", 10),
  maxLimit: parseInt(process.env.MAX_PAGE_SIZE || "100", 10),
};

// Validation des données
export const validationConfig = {
  strictValidation: true,
  sanitizeInputs: true,
  validateIds: true,
};

// Timeouts et limites
export const timeoutConfig = {
  apiTimeout: parseInt(process.env.API_TIMEOUT_SECONDS || "30", 10) * 1000,
  databaseTimeout:
      parseInt(process.env.DATABASE_TIMEOUT_SECONDS || "10", 10) * 1000,
  externalApiTimeout:
      parseInt(process.env.EXTERNAL_API_TIMEOUT_SECONDS || "15", 10) * 1000,
};

// Export de la configuration complète
export const config = {
  app: appConfig,
  cors: corsOptions,
  security: securityConfig,
  pagination: paginationConfig,
  validation: validationConfig,
  timeout: timeoutConfig,
};

export default config;
