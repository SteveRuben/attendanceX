import {NextFunction, Request, Response, RequestHandler} from "express";
import {logger} from "firebase-functions";
import {FieldValue} from "firebase-admin/firestore";
import { collections } from "../config/database";
import { AuthenticatedRequest } from "../types/middleware.types";
import { BaseError } from "../utils/common/errors";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
  details?: any;
  fieldErrorDetails?: Record<string, string>;
}

/**
 * Middleware de gestion globale des erreurs
 * Formats errors consistently for frontend consumption
 */
export const globalErrorHandler = (
  error: AppError | BaseError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Extract error properties
  const statusCode = error.statusCode || 500;
  const code = error.code || (statusCode < 500 ? 'CLIENT_ERROR' : 'INTERNAL_SERVER_ERROR');
  const message = error.message || 'An error occurred';
  const details = (error as any).details;
  const fieldErrorDetails = (error as any).fieldErrorDetails;

  // Generate request ID for tracking
  const requestId = req.headers["x-request-id"] || generateRequestId();

  // Log de l'erreur avec contexte
  const errorLog = {
    message,
    stack: error.stack,
    statusCode,
    code,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId: (req as any).user?.uid,
    timestamp: new Date(),
    requestId,
    details,
    fieldErrorDetails
  };

  // Log selon la sévérité
  if (statusCode < 500) {
    logger.warn("Client error", errorLog);
  } else {
    logger.error("Server error", errorLog);

    // Sauvegarder les erreurs critiques
    saveErrorToDatabase(errorLog).catch((dbError) => {
      logger.error("Failed to save error to database", {dbError});
    });
  }

  // Format response for frontend
  const isDevelopment = process.env.APP_ENV === "development";

  // Standard error response format that frontend expects
  const errorResponse: any = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(fieldErrorDetails && { fieldErrorDetails })
    },
    requestId
  };

  // Add development-only information
  if (isDevelopment) {
    errorResponse.error.stack = error.stack;
    errorResponse.error.statusCode = statusCode;
  }

  // Set appropriate status code and send response
  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware pour capturer les erreurs asynchrones
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware pour capturer les erreurs asynchrones avec AuthenticatedRequest
 */
export const asyncAuthHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
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
 * Helper function to handle controller errors consistently
 */
export const handleControllerError = (error: any, res: Response) => {
  // If it's already a properly formatted error, let the global handler deal with it
  if (error.statusCode || error instanceof BaseError) {
    throw error;
  }

  // Handle common error patterns
  if (error.code === 'auth/user-not-found') {
    throw createError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (error.code === 'permission-denied') {
    throw createError('Access denied', 403, 'FORBIDDEN');
  }

  // Default to internal server error
  throw createError(
    error.message || 'Internal server error',
    500,
    'INTERNAL_SERVER_ERROR',
    { originalError: error.message }
  );
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
