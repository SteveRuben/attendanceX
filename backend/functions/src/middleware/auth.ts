// ==========================================
/**
 * Solution 1: Permissions organisées par ressource (recommandée)
 * Format: { "events": ["create", "read"], "users": ["read", "update"] }
 *//*
function hasPermissionByResource(authReq: AuthenticatedRequest, permission: string): boolean {
  // Vérifier dans toutes les ressources
  return Object.values(authReq.user.permissions).some(permissionArray => 
    permissionArray.includes(permission)
  );
}*/
// ==========================================

import {ERROR_CODES, UserRole} from "@attendance-x/shared";
import {Request, Response, NextFunction} from "express";
import {logger} from "firebase-functions";
import {auth, collections, db} from "../config";


export interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
    email: string;
    role: UserRole;
    permissions: Record<string, boolean>;
    sessionId?: string;
  };
}


/**
 * Middleware d'authentification principal
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: ERROR_CODES.INVALID_TOKEN,
        message: "Token d'authentification requis",
      });
    }

    // Vérifier le token Firebase
    const decodedToken = await auth.verifyIdToken(token);

    // Récupérer les informations utilisateur
    const userDoc = await collections.users.doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return res.status(401).json({
        success: false,
        error: ERROR_CODES.USER_NOT_FOUND,
        message: "Utilisateur non trouvé",
      });
    }

    const userData = userDoc.data()!;

    // Vérifier le statut du compte
    if (userData.status !== "active") {
      return res.status(403).json({
        success: false,
        error: ERROR_CODES.ACCOUNT_INACTIVE,
        message: "Compte inactif",
      });
    }

    // Vérifier si le compte est verrouillé
    if (userData.accountLockedUntil && userData.accountLockedUntil > new Date()) {
      return res.status(403).json({
        success: false,
        error: ERROR_CODES.ACCOUNT_LOCKED,
        message: "Compte temporairement verrouillé",
      });
    }

    // Ajouter les informations utilisateur à la requête
    (req as AuthenticatedRequest).user = {
      uid: decodedToken.uid,
      email: userData.email,
      role: userData.role,
      permissions: userData.permissions || [],
      sessionId: decodedToken.sessionId,
    };

    // Log de l'accès (sans données sensibles)
    logger.info("User authenticated", {
      uid: decodedToken.uid,
      role: userData.role,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      endpoint: req.path,
    });

    return next();
  } catch (error : any) {
    logger.error("Authentication error", {
      error: error.message,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    if (error.code === "auth/id-token-expired") {
      return res.status(401).json({
        success: false,
        error: ERROR_CODES.SESSION_EXPIRED,
        message: "Token expiré",
      });
    }

    return res.status(401).json({
      success: false,
      error: ERROR_CODES.INVALID_TOKEN,
      message: "Token invalide",
    });
  }
};

/**
 * Middleware de vérification des permissions
 */
/* export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `Permission requise: ${permission}`
      });
    }
    next();
  };
}; */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return res.status(401).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: "Authentification requise",
      });
    }


    if (!authReq.user.permissions[permission]) {
      logger.warn("Permission denied", {
        uid: authReq.user.uid,
        role: authReq.user.role,
        requiredPermission: permission,
        userPermissions: authReq.user.permissions,
        endpoint: req.path,
      });

      return res.status(403).json({
        success: false,
        error: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        message: "Permissions insuffisantes",
      });
    }

    return next();
  };
};

/**
 * Middleware de vérification des rôles
 */
/* export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return res.status(401).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentification requise'
      });
    }

    if (!roles.includes(authReq.user.role)) {
      return res.status(403).json({
        success: false,
        error: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        message: 'Rôle insuffisant'
      });
    }

    next();
  };
}; */

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
     const authReq = req as AuthenticatedRequest;
    if (!roles.includes(authReq.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Rôle requis: ${roles.join(" ou ")}`,
      });
    }
    return next();
  };
};

/**
 * Middleware d'authentification optionnelle
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);

    if (token) {
      const decodedToken = await auth.verifyIdToken(token);
      const userDoc = await db.collection("users").doc(decodedToken.uid).get();

      if (userDoc.exists) {
        const userData = userDoc.data()!;
        (req as AuthenticatedRequest).user = {
          uid: decodedToken.uid,
          email: userData.email,
          role: userData.role,
          permissions: userData.permissions || [],
        };
      }
    }

    next();
  } catch (error) {
    // En cas d'erreur, continuer sans authentification
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

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token d'authentification requis",
      });
    }

    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);

    // Récupérer les informations utilisateur depuis Firestore
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    const userData = userDoc.data()!;

    (req as AuthenticatedRequest).user = {
      uid: decodedToken.uid,
      email: decodedToken.email!,
      role: userData.role,
      permissions: userData.permissions,
      sessionId: decodedToken.sessionId,
    };

    return next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({
      success: false,
      message: "Token d'authentification invalide",
    });
  }
};


