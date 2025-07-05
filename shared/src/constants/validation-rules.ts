// shared/src/constants/validation-rules.ts
export const VALIDATION_RULES = {
  // Utilisateur
  USER: {
    EMAIL_MIN_LENGTH: 5,
    EMAIL_MAX_LENGTH: 254,
    PASSWORD_MIN_LENGTH: 12,
    PASSWORD_MAX_LENGTH: 128,
    FIRST_NAME_MIN_LENGTH: 1,
    FIRST_NAME_MAX_LENGTH: 50,
    LAST_NAME_MIN_LENGTH: 1,
    LAST_NAME_MAX_LENGTH: 50,
    DISPLAY_NAME_MIN_LENGTH: 1,
    DISPLAY_NAME_MAX_LENGTH: 100,
    BIO_MAX_LENGTH: 500,
    DEPARTMENT_MAX_LENGTH: 100,
    POSITION_MAX_LENGTH: 100,
    PHONE_PATTERN: /^\+?[1-9]\d{1,14}$/,
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  // Événement
  EVENT: {
    TITLE_MIN_LENGTH: 1,
    TITLE_MAX_LENGTH: 200,
    DESCRIPTION_MAX_LENGTH: 2000,
    LOCATION_NAME_MIN_LENGTH: 1,
    LOCATION_NAME_MAX_LENGTH: 100,
    LOCATION_INSTRUCTIONS_MAX_LENGTH: 500,
    MAX_TAGS: 10,
    TAG_MAX_LENGTH: 50,
    MAX_PARTICIPANTS: 10000,
    MIN_DURATION_MINUTES: 5,
    MAX_DURATION_HOURS: 720, // 30 jours
    MAX_ADVANCE_BOOKING_DAYS: 365
  },
  
  // Présence
  ATTENDANCE: {
    NOTE_MAX_LENGTH: 500,
    QR_CODE_MIN_LENGTH: 10,
    QR_CODE_MAX_LENGTH: 500,
    MAX_LOCATION_ACCURACY_METERS: 100,
    MIN_LOCATION_ACCURACY_METERS: 5,
    MAX_DISTANCE_FROM_EVENT_METERS: 1000,
    MIN_DISTANCE_FROM_EVENT_METERS: 1
  },
  
  // Notification
  NOTIFICATION: {
    TITLE_MIN_LENGTH: 1,
    TITLE_MAX_LENGTH: 200,
    CONTENT_MIN_LENGTH: 1,
    CONTENT_MAX_LENGTH: 2000,
    SMS_CONTENT_MAX_LENGTH: 160,
    PUSH_TITLE_MAX_LENGTH: 100,
    PUSH_BODY_MAX_LENGTH: 200,
    MAX_RECIPIENTS: 1000,
    MAX_ATTACHMENTS: 10,
    ATTACHMENT_MAX_SIZE: 25 * 1024 * 1024, // 25MB
    TEMPLATE_NAME_MIN_LENGTH: 1,
    TEMPLATE_NAME_MAX_LENGTH: 100,
    TEMPLATE_DESCRIPTION_MAX_LENGTH: 500
  },
  
  // Rapport
  REPORT: {
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 200,
    DESCRIPTION_MAX_LENGTH: 1000,
    MAX_ROWS_PER_EXPORT: 50000,
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    MAX_GENERATION_TIME_MINUTES: 30
  },
  
  // Recherche
  SEARCH: {
    QUERY_MIN_LENGTH: 1,
    QUERY_MAX_LENGTH: 200,
    MAX_RESULTS_PER_PAGE: 100,
    DEFAULT_RESULTS_PER_PAGE: 20,
    MAX_TOTAL_RESULTS: 10000
  },
  
  // Pagination
  PAGINATION: {
    MIN_PAGE: 1,
    MAX_PAGE: 10000,
    MIN_LIMIT: 1,
    MAX_LIMIT: 100,
    DEFAULT_LIMIT: 20
  },
  
  // Géolocalisation
  GEOLOCATION: {
    MIN_LATITUDE: -90,
    MAX_LATITUDE: 90,
    MIN_LONGITUDE: -180,
    MAX_LONGITUDE: 180,
    MIN_ACCURACY: 1,
    MAX_ACCURACY: 10000,
    DEFAULT_RADIUS: 100,
    MIN_RADIUS: 10,
    MAX_RADIUS: 1000
  }
} as const;

// Patterns de validation courants
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_INTERNATIONAL: /^\+?[1-9]\d{1,14}$/,
  PHONE_FRENCH: /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  TIME_24H: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
  DATETIME_ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  
  // Patterns pour mots de passe
  PASSWORD_LOWERCASE: /[a-z]/,
  PASSWORD_UPPERCASE: /[A-Z]/,
  PASSWORD_NUMBER: /\d/,
  PASSWORD_SPECIAL: /[!@#$%^&*(),.?":{}|<>]/,
  
  // Patterns pour codes
  TWO_FACTOR_CODE: /^\d{6}$/,
  VERIFICATION_CODE: /^[A-Z0-9]{6,8}$/,
  QR_CODE_PREFIX: /^ATX_/,
  
  // Patterns pour noms de fichiers
  FILENAME_SAFE: /^[a-zA-Z0-9._-]+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
} as const;

// Messages d'erreur de validation
export const VALIDATION_MESSAGES = {
  REQUIRED: 'Ce champ est requis',
  EMAIL_INVALID: 'Adresse email invalide',
  PHONE_INVALID: 'Numéro de téléphone invalide',
  URL_INVALID: 'URL invalide',
  PASSWORD_TOO_SHORT: 'Le mot de passe doit contenir au moins {min} caractères',
  PASSWORD_TOO_LONG: 'Le mot de passe ne peut pas dépasser {max} caractères',
  PASSWORD_NO_LOWERCASE: 'Le mot de passe doit contenir au moins une minuscule',
  PASSWORD_NO_UPPERCASE: 'Le mot de passe doit contenir au moins une majuscule',
  PASSWORD_NO_NUMBER: 'Le mot de passe doit contenir au moins un chiffre',
  PASSWORD_NO_SPECIAL: 'Le mot de passe doit contenir au moins un caractère spécial',
  STRING_TOO_SHORT: 'Doit contenir au moins {min} caractères',
  STRING_TOO_LONG: 'Ne peut pas dépasser {max} caractères',
  NUMBER_TOO_SMALL: 'Doit être supérieur ou égal à {min}',
  NUMBER_TOO_LARGE: 'Doit être inférieur ou égal à {max}',
  ARRAY_TOO_SHORT: 'Doit contenir au moins {min} éléments',
  ARRAY_TOO_LONG: 'Ne peut pas contenir plus de {max} éléments',
  DATE_INVALID: 'Date invalide',
  DATE_IN_PAST: 'La date doit être dans le futur',
  DATE_TOO_FAR: 'La date est trop éloignée',
  FILE_TOO_LARGE: 'Le fichier est trop volumineux (max {max})',
  FILE_TYPE_INVALID: 'Type de fichier non autorisé',
  COORDINATES_INVALID: 'Coordonnées géographiques invalides',
  RADIUS_INVALID: 'Rayon invalide',
  DUPLICATE_VALUE: 'Cette valeur existe déjà',
  INVALID_FORMAT: 'Format invalide'
} as const;

// Limites de taux par défaut
export const DEFAULT_RATE_LIMITS = {
  // Par minute
  LOGIN_ATTEMPTS_PER_MINUTE: 5,
  PASSWORD_RESET_PER_MINUTE: 2,
  EMAIL_VERIFICATION_PER_MINUTE: 2,
  API_REQUESTS_PER_MINUTE: 100,
  
  // Par heure
  USER_CREATION_PER_HOUR: 10,
  EVENT_CREATION_PER_HOUR: 20,
  NOTIFICATION_SEND_PER_HOUR: 50,
  REPORT_GENERATION_PER_HOUR: 10,
  
  // Par jour
  PASSWORD_RESET_PER_DAY: 5,
  SMS_NOTIFICATIONS_PER_DAY: 10,
  EMAIL_NOTIFICATIONS_PER_DAY: 50,
  FILE_UPLOADS_PER_DAY: 100,
  
  // Par utilisateur
  FAILED_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCKOUT_MINUTES: 30,
  SESSION_TIMEOUT_MINUTES: 60,
  PASSWORD_RESET_TOKEN_EXPIRY_MINUTES: 15,
  EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS: 24,
  TWO_FACTOR_CODE_EXPIRY_MINUTES: 5
} as const;

// Configurations système par défaut
export const SYSTEM_DEFAULTS = {
  LANGUAGE: 'fr',
  TIMEZONE: 'Europe/Paris',
  DATE_FORMAT: 'DD/MM/YYYY',
  TIME_FORMAT: '24h',
  CURRENCY: 'EUR',
  WEEK_STARTS_ON: 1, // Lundi
  
  // Pagination
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Cache
  CACHE_TTL_SECONDS: 300, // 5 minutes
  SESSION_TTL_SECONDS: 3600, // 1 heure
  
  // Notifications
  EMAIL_NOTIFICATIONS: true,
  SMS_NOTIFICATIONS: false,
  PUSH_NOTIFICATIONS: true,
  IN_APP_NOTIFICATIONS: true,
  
  // Présences
  LATE_THRESHOLD_MINUTES: 15,
  EARLY_CHECKIN_MINUTES: 30,
  AUTO_MARK_ABSENT_MINUTES: 120,
  QR_CODE_EXPIRY_MINUTES: 60,
  GEOLOCATION_RADIUS_METERS: 100,
  
  // Rapports
  REPORT_RETENTION_DAYS: 30,
  AUTO_DELETE_REPORTS: true,
  
  // Sécurité
  ENABLE_2FA: false,
  FORCE_PASSWORD_CHANGE_DAYS: 90,
  AUDIT_LOG_RETENTION_DAYS: 365
} as const;

// Codes de statut HTTP personnalisés
export const HTTP_STATUS_CODES = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Error
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

// Configuration des environnements
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test'
} as const;

// Niveaux de log
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  VERBOSE: 'verbose'
} as const;