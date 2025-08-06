import { logger } from "firebase-functions";

/**
 * Interface pour le contexte de logging d'authentification
 */
export interface AuthLogContext {
  userId?: any; // Permet tous types pour analyser les cas invalides
  userIdType?: string;
  userIdLength?: number;
  tokenPrefix?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  error?: any;
  sessionId?: string;
  role?: string;
  email?: string;
  accountStatus?: string;
  firestoreOperation?: string;
  firestoreSuccess?: boolean;
  firestoreError?: string;
  tokenDetails?: {
    originalLength?: number;
    cleanedLength?: number;
    hasInvisibleChars?: boolean;
    structure?: {
      hasDots: boolean;
      partCount: number;
      isBase64Like: boolean;
    } | string;
  };
}

/**
 * Interface pour les détails d'un userId invalide
 */
export interface UserIdDetails {
  type: string;
  length: number;
  value?: string; // Tronqué pour sécurité
  isNull: boolean;
  isUndefined: boolean;
  isEmpty: boolean;
  hasWhitespace: boolean;
}

/**
 * Classe de logging structuré pour l'authentification
 * Fournit des méthodes de logging contextuelles sans exposer de données sensibles
 */
export class AuthLogger {
  private static readonly MAX_TOKEN_PREFIX_LENGTH = 20;
  private static readonly MAX_USERID_LOG_LENGTH = 50;

  /**
   * Nettoie et tronque un token pour le logging sécurisé
   */
  private static sanitizeTokenForLogging(token: string): string {
    if (!token || token.length === 0) return "[empty]";
    if (token.length <= this.MAX_TOKEN_PREFIX_LENGTH) {
      return token + "...";
    }
    return token.substring(0, this.MAX_TOKEN_PREFIX_LENGTH) + "...";
  }

  /**
   * Nettoie et tronque un userId pour le logging sécurisé
   */
  private static sanitizeUserIdForLogging(userId: any): string {
    if (userId === null) return "[null]";
    if (userId === undefined) return "[undefined]";
    if (typeof userId !== 'string') return `[${typeof userId}]`;
    if (userId.length === 0) return "[empty string]";

    const truncated = userId.length > this.MAX_USERID_LOG_LENGTH
      ? userId.substring(0, this.MAX_USERID_LOG_LENGTH) + "..."
      : userId;

    return truncated;
  }

  /**
   * Analyse les détails d'un userId pour le logging
   */
  private static analyzeUserId(userId: any): UserIdDetails {
    return {
      type: typeof userId,
      length: userId ? userId.length || 0 : 0,
      value: this.sanitizeUserIdForLogging(userId),
      isNull: userId === null,
      isUndefined: userId === undefined,
      isEmpty: typeof userId === 'string' && userId.length === 0,
      hasWhitespace: typeof userId === 'string' && userId !== userId.trim()
    };
  }

  /**
   * Crée un contexte de base pour les logs
   */
  private static createBaseContext(context: AuthLogContext) {
    return {
      timestamp: new Date().toISOString(),
      request: {
        ip: context.ip || 'unknown',
        userAgent: context.userAgent || 'unknown',
        endpoint: context.endpoint || 'unknown'
      }
    };
  }

  /**
   * Log d'échec de validation de token
   */
  static logTokenValidationFailure(context: AuthLogContext): void {
    const baseContext = this.createBaseContext(context);

    logger.warn("Token validation failed", {
      ...baseContext,
      error: context.error,
      token: context.tokenPrefix !== undefined ? {
        prefix: this.sanitizeTokenForLogging(context.tokenPrefix),
        details: context.tokenDetails
      } : undefined,
      userId: context.userId !== undefined ? this.analyzeUserId(context.userId) : undefined
    });
  }

  /**
   * Log d'échec de validation d'utilisateur
   */
  static logUserValidationFailure(context: AuthLogContext): void {
    const baseContext = this.createBaseContext(context);
    const userIdDetails = context.userId !== undefined ? this.analyzeUserId(context.userId) : undefined;

    logger.warn("User validation failed", {
      ...baseContext,
      userId: userIdDetails,
      error: context.error,
      firestore: context.firestoreOperation ? {
        operation: context.firestoreOperation,
        success: context.firestoreSuccess || false,
        error: context.firestoreError
      } : undefined
    });
  }

  /**
   * Log de succès d'authentification
   */
  static logAuthenticationSuccess(context: AuthLogContext): void {
    const baseContext = this.createBaseContext(context);

    logger.info("User authenticated successfully", {
      ...baseContext,
      user: {
        uid: context.userId ? this.sanitizeUserIdForLogging(context.userId) : undefined,
        role: context.role,
        email: context.email ? context.email.substring(0, 3) + "***" : undefined,
        sessionId: context.sessionId
      }
    });
  }

  /**
   * Log de tentative de déconnexion
   */
  static logLogoutAttempt(context: AuthLogContext): void {
    const baseContext = this.createBaseContext(context);

    logger.info("Logout attempt", {
      ...baseContext,
      user: {
        uid: context.userId ? this.sanitizeUserIdForLogging(context.userId) : undefined,
        sessionId: context.sessionId
      },
      firestore: context.firestoreOperation ? {
        operation: context.firestoreOperation,
        success: context.firestoreSuccess || false,
        error: context.firestoreError
      } : undefined
    });
  }

  /**
   * Log d'erreur Firestore avec contexte
   */
  static logFirestoreError(operation: string, error: any, context: AuthLogContext): void {
    const baseContext = this.createBaseContext(context);

    logger.error("Firestore operation failed", {
      ...baseContext,
      firestore: {
        operation,
        error: error.message || String(error),
        code: error.code,
        details: error.details
      },
      user: {
        uid: context.userId ? this.sanitizeUserIdForLogging(context.userId) : undefined
      }
    });
  }

  /**
   * Log d'erreur de vérification de token Firebase
   */
  static logFirebaseTokenError(error: any, context: AuthLogContext): void {
    const baseContext = this.createBaseContext(context);

    logger.warn("Firebase token verification failed", {
      ...baseContext,
      firebase: {
        errorCode: error.code,
        errorMessage: error.message,
        isExpired: error.code === 'auth/id-token-expired',
        isInvalid: error.code === 'auth/argument-error'
      },
      token: context.tokenPrefix ? {
        prefix: this.sanitizeTokenForLogging(context.tokenPrefix)
      } : undefined
    });
  }

  /**
   * Log d'erreur de statut de compte
   */
  static logAccountStatusError(status: string, context: AuthLogContext): void {
    const baseContext = this.createBaseContext(context);

    logger.warn("Account status check failed", {
      ...baseContext,
      account: {
        status,
        userId: context.userId ? this.sanitizeUserIdForLogging(context.userId) : undefined
      }
    });
  }

  /**
   * Log de données utilisateur corrompues
   */
  static logCorruptedUserData(userData: any, context: AuthLogContext): void {
    const baseContext = this.createBaseContext(context);

    logger.error("Corrupted user data detected", {
      ...baseContext,
      userData: {
        hasEmail: !!userData?.email,
        hasRole: !!userData?.role,
        hasPermissions: !!userData?.permissions,
        hasStatus: !!userData?.status,
        keys: userData ? Object.keys(userData) : []
      },
      user: {
        uid: context.userId ? this.sanitizeUserIdForLogging(context.userId) : undefined
      }
    });
  }

  /**
   * Log de tentative d'accès avec permissions insuffisantes
   */
  static logInsufficientPermissions(requiredPermission: string, userPermissions: Record<string, boolean>, context: AuthLogContext): void {
    const baseContext = this.createBaseContext(context);

    logger.warn("Insufficient permissions", {
      ...baseContext,
      permission: {
        required: requiredPermission,
        userHasPermission: !!userPermissions[requiredPermission],
        userPermissionCount: Object.keys(userPermissions || {}).length
      },
      user: {
        uid: context.userId ? this.sanitizeUserIdForLogging(context.userId) : undefined,
        role: context.role
      }
    });
  }

  /**
   * Log générique d'erreur d'authentification
   */
  static logAuthenticationError(error: any, context: AuthLogContext): void {
    const baseContext = this.createBaseContext(context);

    logger.error("Authentication error", {
      ...baseContext,
      error: {
        message: error.message || String(error),
        code: error.code,
        stack: error.stack
      },
      user: {
        uid: context.userId ? this.sanitizeUserIdForLogging(context.userId) : undefined
      }
    });
  }
}