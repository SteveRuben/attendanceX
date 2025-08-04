// Configuration générale de l'application
export const appConfig = {
  name: "AttendanceX",
  version: "1.0.0",
  apiVersion: "v1",
  environment: process.env.APP_ENV || "development",
  isProduction: process.env.APP_ENV === "production",
  isDevelopment: process.env.APP_ENV === "development",
  isTest: process.env.APP_ENV === "test",
  port: 5001,
  logLevel: process.env.LOG_LEVEL || "info",
  region: process.env.FUNCTIONS_REGION || "us-central1",
};

// Configuration CSP et HSTS (sécurité)
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

export const hsts = {
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true,
};

// Configuration de la sécurité
export const securityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || "your-default-secret-key-minimum-32-chars",
    expiresIn: process.env.JWT_EXPIRY || "24h",
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    algorithm: "HS256" as const,
  },
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "12", 10),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === "true",
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === "true",
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === "true",
    requireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS === "true",
    maxAge: parseInt(process.env.PASSWORD_MAX_AGE_DAYS || "90", 10),
  },
  auth: {
    enable2FA: process.env.ENABLE_2FA === "true",
    lockoutMinutes: parseInt(process.env.ACCOUNT_LOCKOUT_MINUTES || "30", 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5", 10),
    sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || "60", 10),
  },
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
  databaseTimeout: parseInt(process.env.DATABASE_TIMEOUT_SECONDS || "10", 10) * 1000,
  externalApiTimeout: parseInt(process.env.EXTERNAL_API_TIMEOUT_SECONDS || "15", 10) * 1000,
};

// Export de la configuration complète (sans CORS)
export const config = {
  app: appConfig,
  security: securityConfig,
  pagination: paginationConfig,
  validation: validationConfig,
  timeout: timeoutConfig,
};

export default config;