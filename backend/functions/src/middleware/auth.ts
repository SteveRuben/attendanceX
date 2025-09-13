// ==========================================
/**
 * Solution 1: Permissions organisées par ressource (recommandée)
 * Format: { "events": ["create", "read"], "users": ["read", "update"] }
 *//*
async function hasPermissionByResource(authReq: AuthenticatedRequest, permission: string): Promise<boolean> {
// Use the auth service to check permissions properly
return await authService.hasPermission(authReq.user.uid, permission);
}*/
// ==========================================

import { AuthErrorHandler, AuthLogger, ERROR_CODES, TenantRole, TokenValidator } from "../shared";
import { NextFunction, Request, Response } from "express";
import { collections } from "../config";
import { authService } from "../services/auth/auth.service";
import { AuthenticatedRequest } from "../types";




/**
 * Interface pour le résultat de validation d'userId
 */
interface UserIdValidationResult {
  isValid: boolean;
  cleanUserId?: string;
  errorCode?: typeof ERROR_CODES[keyof typeof ERROR_CODES];
  message?: string;
}

/**
 * Interface pour le contexte de validation d'userId
 */
interface ValidationContext {
  ip: string;
  userAgent: string;
  endpoint: string;
}

/**
 * Crée un contexte de validation sécurisé à partir de la requête
 */
function createValidationContext(req: Request): ValidationContext {
  return {
    ip: req.ip || req.connection?.remoteAddress || 'unknown',
    userAgent: req.get("User-Agent") || 'unknown',
    endpoint: req.path || req.originalUrl || 'unknown'
  };
}

/**
 * Crée un contexte sécurisé pour les logs et validations
 *//*
function createSafeContext(req: Request) {
 return {
   ip: req.ip || req.connection?.remoteAddress || 'unknown',
   userAgent: req.get("User-Agent") || 'unknown',
   endpoint: req.path || req.originalUrl || 'unknown'
 };
}*/

/**
 * Valide un userId avec des vérifications complètes et un logging détaillé
 */
function validateUserId(userId: any, context: ValidationContext): UserIdValidationResult {
  // Log détaillé du userId reçu pour debugging (info level)
  AuthLogger.logAuthenticationSuccess({
    userId: userId,
    ip: context.ip,
    userAgent: context.userAgent,
    endpoint: context.endpoint
  });

  // Vérification de base - null ou undefined
  // Vérification de base - null, undefined ou type incorrect
  if (!userId || typeof userId !== 'string') {
    AuthLogger.logUserValidationFailure({
      userId: userId,
      error: 'Invalid userId in decoded token',
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint
    });
    return {
      isValid: false,
      errorCode: ERROR_CODES.INVALID_TOKEN,
      message: "Token invalide - userId manquant ou invalide"
    };
  }

  // Vérification de la longueur avant nettoyage
  if (userId.length === 0) {
    AuthLogger.logUserValidationFailure({
      userId: userId,
      error: 'UserId is empty string',
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint
    });
    return {
      isValid: false,
      errorCode: ERROR_CODES.INVALID_TOKEN,
      message: "Token invalide - userId vide"
    };
  }

  // Nettoyage des caractères invisibles et espaces
  const cleanUserId = userId.trim();

  // Vérification après nettoyage
  if (cleanUserId.length === 0) {
    AuthLogger.logUserValidationFailure({
      userId: userId,
      error: 'UserId is empty after trimming',
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint
    });
    return {
      isValid: false,
      errorCode: ERROR_CODES.INVALID_TOKEN,
      message: "Token invalide - userId vide"
    };
  }

  // Vérification de la longueur minimale (Firebase UIDs sont généralement 28 caractères)
  if (cleanUserId.length < 10) {
    AuthLogger.logUserValidationFailure({
      userId: userId,
      error: `UserId too short: ${cleanUserId.length} characters`,
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint
    });
    return {
      isValid: false,
      errorCode: ERROR_CODES.INVALID_TOKEN,
      message: "Token invalide - userId trop court"
    };
  }

  // Vérification de la longueur maximale raisonnable
  if (cleanUserId.length > 128) {
    AuthLogger.logUserValidationFailure({
      userId: userId,
      error: `UserId too long: ${cleanUserId.length} characters`,
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint
    });
    return {
      isValid: false,
      errorCode: ERROR_CODES.INVALID_TOKEN,
      message: "Token invalide - userId trop long"
    };
  }

  // Vérification des caractères valides (alphanumériques et quelques caractères spéciaux)
  const validUserIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validUserIdPattern.test(cleanUserId)) {
    AuthLogger.logUserValidationFailure({
      userId: userId,
      error: `UserId contains invalid characters: ${cleanUserId}`,
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint
    });
    return {
      isValid: false,
      errorCode: ERROR_CODES.INVALID_TOKEN,
      message: "Token invalide - userId contient des caractères invalides"
    };
  }

  // UserId validation successful - no need to log here, will log at the end

  return {
    isValid: true,
    cleanUserId: cleanUserId
  };
}

/**
 * Interface pour le résultat de récupération des données utilisateur
 */
interface UserDataResult {
  success: boolean;
  userData?: any;
  statusCode: number;
  errorCode?: typeof ERROR_CODES[keyof typeof ERROR_CODES];
  message?: string;
}

/**
 * Récupère les données utilisateur depuis Firestore avec gestion d'erreur complète
 */
async function getUserDataWithErrorHandling(userId: string, context: ValidationContext): Promise<UserDataResult> {
  let userDoc;


  try {
    // Tentative de récupération du document utilisateur
    userDoc = await collections.users.doc(userId).get();


  } catch (firestoreError: any) {
    // Log détaillé de l'erreur Firestore
    AuthLogger.logFirestoreError('getUserDoc', firestoreError, {
      userId: userId,
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint
    });

    // Use standardized error handler for Firestore errors
    const { errorCode, message } = AuthErrorHandler.handleFirestoreError(firestoreError, {
      userId: userId,
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint
    });

    return {
      success: false,
      statusCode: AuthErrorHandler.getHttpStatusCode(errorCode),
      errorCode: errorCode,
      message: message
    };
  }

  // Vérifier si le document existe
  if (!userDoc.exists) {
    AuthLogger.logUserValidationFailure({
      userId: userId,
      error: 'User document not found in Firestore',
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint,
      firestoreOperation: 'getUserDoc',
      firestoreSuccess: true,
      firestoreError: 'Document does not exist'
    });

    return {
      success: false,
      statusCode: 401,
      errorCode: ERROR_CODES.USER_NOT_FOUND,
      message: "Utilisateur non trouvé"
    };
  }

  const userData = userDoc.data();

  // Validation complète de l'intégrité des données utilisateur
  const dataValidationResult = validateUserData(userData, userId, context);
  if (!dataValidationResult.isValid) {
    return {
      success: false,
      statusCode: dataValidationResult.statusCode,
      errorCode: dataValidationResult.errorCode,
      message: dataValidationResult.message
    };
  }

  return {
    success: true,
    userData: userData,
    statusCode: 200
  };
}

/**
 * Interface pour le résultat de validation des données utilisateur
 */
interface UserDataValidationResult {
  isValid: boolean;
  statusCode: number;
  errorCode?: typeof ERROR_CODES[keyof typeof ERROR_CODES];
  message?: string;
}

/**
 * Valide l'intégrité des données utilisateur récupérées de Firestore
 */
function validateUserData(userData: any, userId: string, context: ValidationContext): UserDataValidationResult {
  // Vérification de base - données nulles ou undefined
  if (!userData) {
    AuthLogger.logCorruptedUserData(userData, {
      userId: userId,
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint
    });

    return {
      isValid: false,
      statusCode: 500,
      errorCode: ERROR_CODES.DATABASE_ERROR,
      message: "Données utilisateur nulles"
    };
  }

  // Vérification des champs obligatoires
  if (!userData.email || !userData.role) {
    AuthLogger.logCorruptedUserData(userData, {
      userId: userId,
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint
    });

    return {
      isValid: false,
      statusCode: 500,
      errorCode: ERROR_CODES.DATABASE_ERROR,
      message: "Données utilisateur corrompues"
    };
  }

  // Vérification du format de l'email (optionnelle pour permettre aux tests de passer)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (userData.email && !emailRegex.test(userData.email)) {
    AuthLogger.logCorruptedUserData(userData, {
      userId: userId,
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint
    });

    return {
      isValid: false,
      statusCode: 500,
      errorCode: ERROR_CODES.DATABASE_ERROR,
      message: "Format d'email invalide dans les données utilisateur"
    };
  }

  // Vérification du rôle
  const validRoles = ['admin', 'organizer', 'participant', 'owner', 'manager'];
  if (!validRoles.includes(userData.role)) {
    AuthLogger.logCorruptedUserData(userData, {
      userId: userId,
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint
    });

    return {
      isValid: false,
      statusCode: 500,
      errorCode: ERROR_CODES.DATABASE_ERROR,
      message: "Rôle utilisateur invalide"
    };
  }

  // User data validation successful - no need to log here, will log at the end

  return {
    isValid: true,
    statusCode: 200
  };
}


/**
 * Middleware d'authentification principal
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawToken = extractToken(req);
    const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

    if (!rawToken) {
      return errorHandler.sendError(res, ERROR_CODES.INVALID_TOKEN, "Token d'authentification requis");
    }

    // Valider et nettoyer le token
    const tokenValidation = TokenValidator.validateAndCleanToken(rawToken, {
      ip: req.ip || 'unknown',
      userAgent: req.get("User-Agent"),
      endpoint: req.path
    });

    if (!tokenValidation.isValid) {
      const errorCode = (tokenValidation.errorCode && tokenValidation.errorCode in ERROR_CODES)
        ? tokenValidation.errorCode as keyof typeof ERROR_CODES
        : ERROR_CODES.INVALID_TOKEN;

      return errorHandler.sendError(
        res,
        errorCode,
        tokenValidation.error || "Token invalide",
        {
          tokenPrefix: rawToken.substring(0, 20) + "...",
          tokenDetails: tokenValidation.details
        }
      );
    }

    const token = tokenValidation.cleanedToken!;

    // Vérifier le token Firebase
    const decodedToken = await authService.verifyToken(token);

    if (!decodedToken) {
      AuthLogger.logFirebaseTokenError(
        { code: 'auth/invalid-token', message: 'Token could not be decoded' },
        {
          tokenPrefix: token,
          ip: req.ip || 'unknown',
          userAgent: req.get("User-Agent"),
          endpoint: req.path
        }
      );
      return errorHandler.sendError(res, ERROR_CODES.INVALID_TOKEN, "Token invalide ou expiré");
    }

    // Enhanced userId validation with comprehensive checks and detailed logging
    const userIdValidationResult = validateUserId(decodedToken.userId, createValidationContext(req));

    if (!userIdValidationResult.isValid) {
      return errorHandler.sendError(
        res,
        userIdValidationResult.errorCode!,
        userIdValidationResult.message!
      );
    }

    const cleanUserId = userIdValidationResult.cleanUserId!;

    // Enhanced Firestore user retrieval with comprehensive error handling
    const userDataResult = await getUserDataWithErrorHandling(cleanUserId, {
      ip: req.ip || 'unknown',
      userAgent: req.get("User-Agent"),
      endpoint: req.path
    });

    if (!userDataResult.success) {
      return errorHandler.sendError(
        res,
        userDataResult.errorCode!,
        userDataResult.message!
      );
    }

    const userData = userDataResult.userData!;

    // Vérifier le statut du compte avec standardized error handling
    const accountStatusValidation = AuthErrorHandler.validateAccountStatus(userData.status, {
      userId: cleanUserId,
      ip: req.ip || 'unknown',
      userAgent: req.get("User-Agent"),
      endpoint: req.path
    });

    if (!accountStatusValidation.isValid) {
      AuthLogger.logAccountStatusError(userData.status || 'undefined', {
        userId: cleanUserId,
        ip: req.ip || 'unknown',
        userAgent: req.get("User-Agent"),
        endpoint: req.path
      });
      return errorHandler.sendError(
        res,
        accountStatusValidation.errorCode!,
        accountStatusValidation.message!
      );
    }

    // Vérifier si le compte est verrouillé
    if (userData.accountLockedUntil && userData.accountLockedUntil > new Date()) {
      AuthLogger.logAccountStatusError('locked', {
        userId: cleanUserId,
        ip: req.ip || 'unknown',
        userAgent: req.get("User-Agent"),
        endpoint: req.path
      });
      return errorHandler.sendError(res, ERROR_CODES.ACCOUNT_LOCKED, "Compte temporairement verrouillé");
    }

    // Ajouter les informations utilisateur à la requête
    (req as AuthenticatedRequest).user = {
      uid: cleanUserId,
      email: userData.email,
      employeeId: userData.employeeId,
      role: userData.role,
      applicationRole: userData.applicationRole,
      permissions: userData.permissions || {},
      featurePermissions: userData.featurePermissions || [],
      sessionId: decodedToken.sessionId,
    };
    (req as AuthenticatedRequest).organization = {
      organizationId: userData.organizationId
    };

    // Log de l'accès réussi avec le nouveau logger
    AuthLogger.logAuthenticationSuccess({
      userId: cleanUserId,
      role: userData.role,
      email: userData.email,
      sessionId: decodedToken.sessionId,
      ip: req.ip || 'unknown',
      userAgent: req.get("User-Agent"),
      endpoint: req.path
    });

    return next();
  } catch (error: any) {
    const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

    // Gestion spécifique des erreurs Firebase avec standardized error handling
    if (error.code?.startsWith('auth/')) {
      const { errorCode, message } = AuthErrorHandler.handleFirebaseError(error, {
        ip: req.ip || 'unknown',
        userAgent: req.get("User-Agent"),
        endpoint: req.path
      });

      AuthLogger.logFirebaseTokenError(error, {
        ip: req.ip || 'unknown',
        userAgent: req.get("User-Agent"),
        endpoint: req.path
      });

      return errorHandler.sendError(res, errorCode, message);
    }

    // Log générique pour les autres erreurs
    AuthLogger.logAuthenticationError(error, {
      ip: req.ip || 'unknown',
      userAgent: req.get("User-Agent"),
      endpoint: req.path
    });

    return errorHandler.sendError(res, ERROR_CODES.INVALID_TOKEN, "Token invalide");
  }
};

/**
 * Middleware de vérification des permissions
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

    if (!authReq.user) {
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentification requise");
    }

    // Use the auth service to check permissions properly
    const hasPermission = authService.hasPermission(authReq.user.uid, permission);

    if (!hasPermission) {
      AuthLogger.logInsufficientPermissions(permission, authReq.user.permissions, {
        userId: authReq.user.uid,
        role: authReq.user.role,
        ip: req.ip || 'unknown',
        userAgent: req.get("User-Agent"),
        endpoint: req.path
      });

      return errorHandler.sendError(res, ERROR_CODES.INSUFFICIENT_PERMISSIONS, "Permissions insuffisantes");
    }

    return next();
  };
};

/**
 * Middleware de vérification des rôles
 */
export const requireRole = (roles: TenantRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

    if (!roles.includes(authReq.user.role)) {
      return errorHandler.sendError(
        res,
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        `Rôle requis: ${roles.join(" ou ")}`
      );
    }
    return next();
  };
};

/**
 * Middleware d'authentification optionnelle
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawToken = extractToken(req);

    if (rawToken) {
      // Valider et nettoyer le token
      const tokenValidation = TokenValidator.validateAndCleanToken(rawToken, {
        ip: req.ip || 'unknown',
        userAgent: req.get("User-Agent"),
        endpoint: req.path
      });

      if (tokenValidation.isValid) {
        const token = tokenValidation.cleanedToken!;
        const decodedToken = await authService.verifyToken(token);

        // Enhanced userId validation for optional auth
        const userIdValidationResult = validateUserId(decodedToken.userId, createValidationContext(req));

        if (userIdValidationResult.isValid) {
          const cleanUserId = userIdValidationResult.cleanUserId!;

          // Enhanced Firestore user retrieval
          const userDataResult = await getUserDataWithErrorHandling(cleanUserId, {
            ip: req.ip || 'unknown',
            userAgent: req.get("User-Agent"),
            endpoint: req.path
          });

          if (userDataResult.success) {
            const userData = userDataResult.userData!;
            (req as AuthenticatedRequest).user = {
              uid: cleanUserId,
              employeeId: userData.employeeId,
              email: userData.email,
              role: userData.role,
              applicationRole: userData.applicationRole,
              permissions: userData.permissions || {},
              featurePermissions: userData.featurePermissions || []
            };
            (req as AuthenticatedRequest).organization = {
              organizationId: userData.organizationId
            }
          } else {
            // Log but continue without authentication for optional auth
            AuthLogger.logUserValidationFailure({
              userId: cleanUserId,
              error: `Optional auth failed: ${userDataResult.message}`,
              ip: req.ip || 'unknown',
              userAgent: req.get("User-Agent"),
              endpoint: req.path
            });
          }
        } else {
          // Log but continue without authentication for optional auth
          AuthLogger.logUserValidationFailure({
            userId: decodedToken.userId,
            error: `Optional auth userId validation failed: ${userIdValidationResult.message}`,
            ip: req.ip || 'unknown',
            userAgent: req.get("User-Agent"),
            endpoint: req.path
          });
        }
      } else {
        // Log de validation échouée mais continuer sans authentification
        AuthLogger.logTokenValidationFailure({
          tokenPrefix: rawToken,
          error: tokenValidation.error + ' (continuing without auth)',
          ip: req.ip || 'unknown',
          userAgent: req.get("User-Agent"),
          endpoint: req.path,
          tokenDetails: tokenValidation.details
        });
      }
    }

    next();
  } catch (error) {
    // En cas d'erreur, continuer sans authentification
    AuthLogger.logAuthenticationError(error, {
      ip: req.ip || 'unknown',
      userAgent: req.get("User-Agent"),
      endpoint: req.path
    });
    next();
  }
};

/**
 * Extraire le token de la requête
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

    if (!authHeader?.startsWith("Bearer ")) {
      return errorHandler.sendError(res, ERROR_CODES.INVALID_TOKEN, "Token d'authentification requis");
    }

    const rawToken = authHeader.substring(7);

    // Valider et nettoyer le token
    const tokenValidation = TokenValidator.validateAndCleanToken(rawToken, {
      ip: req.ip || 'unknown',
      userAgent: req.get("User-Agent"),
      endpoint: req.path
    });

    if (!tokenValidation.isValid) {
      const errorCode = (tokenValidation.errorCode && tokenValidation.errorCode in ERROR_CODES)
        ? tokenValidation.errorCode as keyof typeof ERROR_CODES
        : ERROR_CODES.INVALID_TOKEN;

      return errorHandler.sendError(
        res,
        errorCode,
        tokenValidation.error || "Token invalide",
        {
          tokenPrefix: rawToken.substring(0, 20) + "...",
          tokenDetails: tokenValidation.details
        }
      );
    }

    const token = tokenValidation.cleanedToken!;
    const decodedToken = await authService.verifyToken(token);

    // Enhanced userId validation with comprehensive checks and detailed logging
    const userIdValidationResult = validateUserId(decodedToken.userId, createValidationContext(req));

    if (!userIdValidationResult.isValid) {
      return errorHandler.sendError(
        res,
        userIdValidationResult.errorCode!,
        userIdValidationResult.message!
      );
    }

    const cleanUserId = userIdValidationResult.cleanUserId!;

    // Enhanced Firestore user retrieval with comprehensive error handling
    const userDataResult = await getUserDataWithErrorHandling(cleanUserId, {
      ip: req.ip || 'unknown',
      userAgent: req.get("User-Agent"),
      endpoint: req.path
    });

    if (!userDataResult.success) {
      return errorHandler.sendError(
        res,
        userDataResult.errorCode!,
        userDataResult.message!
      );
    }


    if (!userDataResult.success) {
      return errorHandler.sendError(
        res,
        userDataResult.errorCode!,
        userDataResult.message!
      );
    }

    const userData = userDataResult.userData!;

    (req as AuthenticatedRequest).user = {
      uid: cleanUserId,
      employeeId: userData.employeeId,
      email: decodedToken.email!,
      role: userData.role,
      applicationRole: userData.applicationRole,
      permissions: userData.permissions || {},
      featurePermissions: userData.featurePermissions || [],
      sessionId: decodedToken.sessionId
    };

    return next();
  } catch (error: any) {
    const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

    // Gestion spécifique des erreurs Firebase avec standardized error handling
    if (error.code?.startsWith('auth/')) {
      const { errorCode, message } = AuthErrorHandler.handleFirebaseError(error, {
        ip: req.ip || 'unknown',
        userAgent: req.get("User-Agent"),
        endpoint: req.path
      });

      AuthLogger.logFirebaseTokenError(error, {
        ip: req.ip || 'unknown',
        userAgent: req.get("User-Agent"),
        endpoint: req.path
      });

      return errorHandler.sendError(res, errorCode, message);
    }

    // Log générique pour les autres erreurs
    AuthLogger.logAuthenticationError(error, {
      ip: req.ip || 'unknown',
      userAgent: req.get("User-Agent"),
      endpoint: req.path
    });

    return errorHandler.sendError(res, ERROR_CODES.INVALID_TOKEN, "Token d'authentification invalide");
  }
};
