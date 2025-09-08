// backend/functions/src/config/security.config.ts - Configuration de sécurité centralisée

import { UserRole } from "../shared";

/**
 * Configuration JWT centralisée
 */
export const JWT_CONFIG = {
  // Secrets et clés
  ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-key',
  REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
  
  // Durées de vie des tokens
  ACCESS_TOKEN_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  
  // Configuration des tokens
  ISSUER: process.env.JWT_ISSUER || 'attendance-management-system',
  AUDIENCE: process.env.JWT_AUDIENCE || 'attendance-app',
  
  // Algorithme de signature
  ALGORITHM: 'HS256' as const,
  
  // Headers personnalisés
  CUSTOM_HEADERS: {
    typ: 'JWT',
    alg: 'HS256'
  }
} as const;

/**
 * Configuration des sessions
 */
export const SESSION_CONFIG = {
  // Durée de vie des sessions
  DEFAULT_EXPIRY: 24 * 60 * 60 * 1000, // 24 heures en ms
  REMEMBER_ME_EXPIRY: 30 * 24 * 60 * 60 * 1000, // 30 jours en ms
  
  // Nettoyage automatique
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 heure
  
  // Limite de sessions par utilisateur
  MAX_SESSIONS_PER_USER: 5,
  
  // Configuration des cookies (si utilisés)
  COOKIE_CONFIG: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  }
} as const;

/**
 * Configuration de sécurité des mots de passe
 */
export const PASSWORD_CONFIG = {
  // Politique de mot de passe
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SYMBOLS: true,
  
  // Bcrypt configuration
  SALT_ROUNDS: 12,
  
  // Validation regex
  VALIDATION_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  
  // Mots de passe interdits (patterns communs)
  FORBIDDEN_PATTERNS: [
    /password/i,
    /123456/,
    /qwerty/i,
    /admin/i,
    /letmein/i
  ]
} as const;

/**
 * Configuration de la limitation de taux (Rate Limiting)
 */
export const RATE_LIMIT_CONFIG = {
  // Limites par endpoint
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives par IP
    message: 'Trop de tentatives de connexion, réessayez dans 15 minutes'
  },
  
  REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 3, // 3 inscriptions par IP
    message: 'Trop d\'inscriptions, réessayez dans 1 heure'
  },
  
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 3, // 3 demandes par IP
    message: 'Trop de demandes de réinitialisation, réessayez dans 1 heure'
  },
  
  API_GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requêtes par IP
    message: 'Trop de requêtes, réessayez plus tard'
  }
} as const;

/**
 * Configuration de l'authentification à deux facteurs
 */
export const TWO_FACTOR_CONFIG = {
  // Configuration TOTP
  TOTP_WINDOW: 1, // Fenêtre de tolérance (30s avant/après)
  TOTP_STEP: 30, // Durée de validité d'un code (30 secondes)
  
  // Codes de sauvegarde
  BACKUP_CODES_COUNT: 10,
  BACKUP_CODE_LENGTH: 8,
  
  // QR Code
  QR_CODE_SIZE: 200,
  QR_CODE_ERROR_CORRECTION: 'M' as const
} as const;

/**
 * Définitions des rôles et permissions centralisées
 */
export const ROLE_DEFINITIONS = {
  [UserRole.SUPER_ADMIN]: {
    name: 'Super Administrateur',
    level: 100,
    permissions: [
      'system:manage',
      'users:manage',
      'organizations:manage',
      'events:manage',
      'reports:view',
      'analytics:view',
      'settings:manage'
    ]
  },
  
  [UserRole.ADMIN]: {
    name: 'Administrateur',
    level: 80,
    permissions: [
      'users:manage',
      'events:manage',
      'reports:view',
      'analytics:view',
      'settings:view'
    ]
  },
  
  [UserRole.MANAGER]: {
    name: 'Gestionnaire',
    level: 60,
    permissions: [
      'events:create',
      'events:update',
      'users:view',
      'reports:view',
      'attendance:manage'
    ]
  },
  
  [UserRole.GUEST]: {
    name: 'Utilisateur',
    level: 40,
    permissions: [
      'events:view',
      'attendance:mark',
      'profile:update'
    ]
  },
  
  [UserRole.VIEWER]: {
    name: 'Observateur',
    level: 20,
    permissions: [
      'events:view',
      'profile:view'
    ]
  }
} as const;

/**
 * Configuration de sécurité des headers HTTP
 */
export const SECURITY_HEADERS = {
  // CORS
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  CORS_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] as string[],
  CORS_HEADERS: ['Content-Type', 'Authorization', 'X-Requested-With'] as string[],
  
  // Headers de sécurité
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  }
} as const;

/**
 * Configuration de l'audit et logging de sécurité
 */
export const AUDIT_CONFIG = {
  // Événements à auditer
  AUDIT_EVENTS: [
    'user:login',
    'user:logout',
    'user:register',
    'user:password_change',
    'user:role_change',
    'session:create',
    'session:destroy',
    'permission:denied',
    'security:violation'
  ],
  
  // Rétention des logs
  LOG_RETENTION_DAYS: 90,
  
  // Niveaux de log
  LOG_LEVELS: {
    SECURITY: 'security',
    AUDIT: 'audit',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  }
} as const;

/**
 * Configuration de validation des entrées
 */
export const VALIDATION_CONFIG = {
  // Tailles maximales
  MAX_STRING_LENGTH: 1000,
  MAX_EMAIL_LENGTH: 254,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 2000,
  
  // Patterns de validation
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s\-()]{10,}$/,
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // Sanitisation
  HTML_SANITIZE: true,
  STRIP_TAGS: true,
  TRIM_WHITESPACE: true
} as const;

/**
 * Utilitaires de sécurité
 */
export class SecurityUtils {
  /**
   * Vérifie si un utilisateur a une permission spécifique
   */
  static hasPermission(userRole: UserRole, permission: string): boolean {
    const roleDefinition = ROLE_DEFINITIONS[userRole];
    return roleDefinition?.permissions.includes(permission) || false;
  }

  /**
   * Obtient toutes les permissions d'un rôle
   */
  static getRolePermissions(userRole: UserRole): string[] {
    const roleDefinition = ROLE_DEFINITIONS[userRole];
    return roleDefinition?.permissions || [];
  }
  
  /**
   * Vérifie si un rôle a un niveau suffisant
   */
  static hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
    const userLevel = ROLE_DEFINITIONS[userRole]?.level || 0;
    const minimumLevel = ROLE_DEFINITIONS[minimumRole]?.level || 0;
    return userLevel >= minimumLevel;
  }
  
  /**
   * Génère un token sécurisé
   */
  static generateSecureToken(length: number = 32): string {
    return require('crypto').randomBytes(length).toString('hex');
  }
  
  /**
   * Hash sécurisé d'un mot de passe
   */
  static async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt');
    return bcrypt.hash(password, PASSWORD_CONFIG.SALT_ROUNDS);
  }
  
  /**
   * Vérification d'un mot de passe
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcrypt');
    return bcrypt.compare(password, hash);
  }
  
  /**
   * Validation de la force d'un mot de passe
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    score: number;
  } {
    const errors: string[] = [];
    let score = 0;
    
    if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
      errors.push(`Le mot de passe doit contenir au moins ${PASSWORD_CONFIG.MIN_LENGTH} caractères`);
    } else {
      score += 20;
    }
    
    if (PASSWORD_CONFIG.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule');
    } else {
      score += 20;
    }
    
    if (PASSWORD_CONFIG.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une minuscule');
    } else {
      score += 20;
    }
    
    if (PASSWORD_CONFIG.REQUIRE_NUMBERS && !/\d/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    } else {
      score += 20;
    }
    
    if (PASSWORD_CONFIG.REQUIRE_SYMBOLS && !/[@$!%*?&]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    } else {
      score += 20;
    }
    
    // Vérifier les patterns interdits
    for (const pattern of PASSWORD_CONFIG.FORBIDDEN_PATTERNS) {
      if (pattern.test(password)) {
        errors.push('Le mot de passe contient un pattern interdit');
        score -= 30;
        break;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      score: Math.max(0, Math.min(100, score))
    };
  }
}

export default {
  JWT_CONFIG,
  SESSION_CONFIG,
  PASSWORD_CONFIG,
  RATE_LIMIT_CONFIG,
  TWO_FACTOR_CONFIG,
  ROLE_DEFINITIONS,
  SECURITY_HEADERS,
  AUDIT_CONFIG,
  VALIDATION_CONFIG,
  SecurityUtils
};