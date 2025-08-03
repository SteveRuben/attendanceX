import {NextFunction, Request, Response} from "express";
import {logger} from "firebase-functions";
import {FieldValue} from "firebase-admin/firestore";
import { collections } from "../config/database";



export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
  details?: any;
}

/**
 * Middleware de gestion globale des erreurs
 */
export const globalErrorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log de l'erreur avec contexte
  const errorLog = {
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    code: error.code,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId: (req as any).user?.uid,
    timestamp: new Date(),
    requestId: req.headers["x-request-id"] || generateRequestId(),
  };

  // Log selon la sévérité
  if (error.statusCode && error.statusCode < 500) {
    logger.warn("Client error", errorLog);
  } else {
    logger.error("Server error", errorLog);

    // Sauvegarder les erreurs critiques
    saveErrorToDatabase(errorLog).catch((dbError) => {
      logger.error("Failed to save error to database", {dbError});
    });
  }

  // Réponse selon l'environnement
  const isDevelopment = process.env.APP_ENV === "development";

  if (error.statusCode && error.statusCode < 500) {
    // Erreur client (4xx)
    const response: any = {
      success: false,
      error: error.code || "CLIENT_ERROR",
      message: error.message,
      requestId: errorLog.requestId,
    };

    // Add additional details for email verification errors
    if (error.details) {
      response.data = error.details;
    }

    if (isDevelopment) {
      response.stack = error.stack;
    }

    res.status(error.statusCode).json(response);
  } else {
    // Erreur serveur (5xx)
    res.status(error.statusCode || 500).json({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
      message: isDevelopment ? error.message : "Une erreur interne s'est produite",
      requestId: errorLog.requestId,
      ...(isDevelopment && {
        stack: error.stack,
        details: error.details,
      }),
    });
  }
};

/**
 * Middleware pour capturer les erreurs asynchrones
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware pour les routes non trouvées
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Route non trouvée: ${req.method} ${req.url}`) as AppError;
  error.statusCode = 404;
  error.code = "ROUTE_NOT_FOUND";
  error.isOperational = true;

  next(error);
};

/**
 * Créer une erreur personnalisée
 */
export const createError = (
  message: string,
  statusCode = 500,
  code?: string,
  details?: any
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  error.isOperational = true;

  return error;
};

/**
 * Sauvegarder l'erreur en base de données
 */
async function saveErrorToDatabase(errorLog: any): Promise<void> {
  try {
    // Nettoyer les champs undefined avant la sauvegarde
    const cleanedLog = removeUndefinedFields({
      ...errorLog,
      createdAt: FieldValue.serverTimestamp(),
    });
    
    await collections.error_logs.add(cleanedLog);
  } catch (error) {
    // Ne pas relancer l'erreur pour éviter une boucle infinie
    console.error("Failed to save error to database:", error);
  }
}

/**
 * Utilitaire pour nettoyer les champs undefined
 */
function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item));
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefinedFields(value);
      }
    });
    return cleaned;
  }
  
  return obj;
}

/**
 * Générer un ID de requête unique
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
