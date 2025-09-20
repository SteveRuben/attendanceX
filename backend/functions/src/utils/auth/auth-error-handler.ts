// shared/utils/auth/auth-error-handler.ts
import { Request, Response } from "express";
import { AuthLogger } from "./auth-logger";
import { ERROR_CODES, ERROR_MESSAGES } from "../../common/constants";

/**
 * Interface for standardized authentication error response
 */
export interface AuthErrorResponse {
  success: false;
  error: string; // Standardized error code
  message: string; // User-friendly message
  details: {
    userId?: string;
    timestamp: Date;
    requestId: string;
    context?: Record<string, any>;
    request?: {
      ip?: string;
      userAgent?: string;
      endpoint?: string;
    };
  };
}

/**
 * Interface for authentication error context
 */
export interface AuthErrorContext {
  userId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  tokenPrefix?: string;
  sessionId?: string;
  additionalContext?: Record<string, any>;
}

/**
 * Utility class for standardized authentication error handling
 */
export class AuthErrorHandler {
  
  /**
   * Create a standardized authentication error response
   */
  static createErrorResponse(
    errorCode: keyof typeof ERROR_CODES,
    customMessage?: string,
    context?: AuthErrorContext
  ): AuthErrorResponse {
    const message = customMessage || ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] || "Erreur d'authentification";
    
    const response: AuthErrorResponse = {
      success: false,
      error: errorCode,
      message,
      details: {
        timestamp: new Date(),
        requestId: this.generateRequestId()
      }
    };

    // Add context details if provided
    if (context) {
      if (context.userId) {
        response.details.userId = context.userId;
      }
      
      if (context.additionalContext) {
        response.details.context = context.additionalContext;
      }

      // Add request context for debugging
      if (context.ip || context.userAgent || context.endpoint) {
        response.details.request = {
          ip: context.ip,
          userAgent: context.userAgent,
          endpoint: context.endpoint
        };
      }
    }

    return response;
  }

  /**
   * Send standardized error response with appropriate HTTP status code
   */
  static sendErrorResponse(
    res: Response,
    errorCode: keyof typeof ERROR_CODES,
    customMessage?: string,
    context?: AuthErrorContext
  ): void {
    const statusCode = this.getHttpStatusCode(errorCode);
    const errorResponse = this.createErrorResponse(errorCode, customMessage, context);
    
    // Log the error with context
    if (context) {
      this.logAuthError(errorCode, errorResponse.message, context);
    }
    
    res.status(statusCode).json(errorResponse);
  }

  /**
   * Get appropriate HTTP status code for authentication error
   */
  static getHttpStatusCode(errorCode: keyof typeof ERROR_CODES): number {
    const statusCodeMap: Record<string, number> = {
      // 400 - Bad Request
      [ERROR_CODES.BAD_REQUEST]: 400,
      [ERROR_CODES.VALIDATION_ERROR]: 400,
      [ERROR_CODES.INVALID_EMAIL]: 400,
      [ERROR_CODES.WEAK_PASSWORD]: 400,
      [ERROR_CODES.EMAIL_ALREADY_VERIFIED]: 400,
      [ERROR_CODES.VERIFICATION_TOKEN_EXPIRED]: 400,
      [ERROR_CODES.VERIFICATION_TOKEN_USED]: 400,
      [ERROR_CODES.INVALID_VERIFICATION_TOKEN]: 400,

      // 401 - Unauthorized
      [ERROR_CODES.UNAUTHORIZED]: 401,
      [ERROR_CODES.INVALID_CREDENTIALS]: 401,
      [ERROR_CODES.INVALID_TOKEN]: 401,
      [ERROR_CODES.SESSION_EXPIRED]: 401,
      [ERROR_CODES.SESSION_NOT_FOUND]: 401,
      [ERROR_CODES.PASSWORD_EXPIRED]: 401,

      // 403 - Forbidden
      [ERROR_CODES.FORBIDDEN]: 403,
      [ERROR_CODES.ACCOUNT_LOCKED]: 403,
      [ERROR_CODES.ACCOUNT_INACTIVE]: 403,
      [ERROR_CODES.ACCOUNT_SUSPENDED]: 403,
      [ERROR_CODES.EMAIL_NOT_VERIFIED]: 403,
      [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 403,

      // 404 - Not Found
      [ERROR_CODES.NOT_FOUND]: 404,
      [ERROR_CODES.USER_NOT_FOUND]: 404,

      // 409 - Conflict
      [ERROR_CODES.CONFLICT]: 409,
      [ERROR_CODES.EMAIL_ALREADY_EXISTS]: 409,
      [ERROR_CODES.PHONE_ALREADY_EXISTS]: 409,

      // 422 - Unprocessable Entity
      [ERROR_CODES.TWO_FACTOR_REQUIRED]: 422,
      [ERROR_CODES.INVALID_2FA_CODE]: 422,

      // 429 - Too Many Requests
      [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
      [ERROR_CODES.VERIFICATION_RATE_LIMIT_EXCEEDED]: 429,

      // 500 - Internal Server Error
      [ERROR_CODES.INTERNAL_SERVER_ERROR]: 500,
      [ERROR_CODES.DATABASE_ERROR]: 500,
      [ERROR_CODES.EMAIL_VERIFICATION_SEND_FAILED]: 500,
      [ERROR_CODES.SMS_PROVIDER_ERROR]: 500,
      [ERROR_CODES.EMAIL_PROVIDER_ERROR]: 500,
      [ERROR_CODES.EXTERNAL_API_ERROR]: 500,

      // 503 - Service Unavailable
      // (Database temporarily unavailable, etc.)
    };

    return statusCodeMap[errorCode] || 500;
  }

  /**
   * Handle Firebase authentication errors and map to standardized codes
   */
  static handleFirebaseError(firebaseError: any, context?: AuthErrorContext): {
    errorCode: keyof typeof ERROR_CODES;
    message: string;
  } {
    const firebaseErrorMap: Record<string, keyof typeof ERROR_CODES> = {
      'auth/id-token-expired': ERROR_CODES.SESSION_EXPIRED,
      'auth/id-token-revoked': ERROR_CODES.SESSION_EXPIRED,
      'auth/invalid-id-token': ERROR_CODES.INVALID_TOKEN,
      'auth/argument-error': ERROR_CODES.INVALID_TOKEN,
      'auth/user-not-found': ERROR_CODES.USER_NOT_FOUND,
      'auth/user-disabled': ERROR_CODES.ACCOUNT_SUSPENDED,
      'auth/email-not-verified': ERROR_CODES.EMAIL_NOT_VERIFIED,
      'auth/too-many-requests': ERROR_CODES.RATE_LIMIT_EXCEEDED,
      'auth/network-request-failed': ERROR_CODES.EXTERNAL_API_ERROR,
    };

    const errorCode = firebaseErrorMap[firebaseError.code] || ERROR_CODES.INVALID_TOKEN;
    const message = ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES];

    return { errorCode, message };
  }

  /**
   * Handle Firestore errors and map to standardized codes
   */
  static handleFirestoreError(firestoreError: any, context?: AuthErrorContext): {
    errorCode: keyof typeof ERROR_CODES;
    message: string;
  } {
    const firestoreErrorMap: Record<string, keyof typeof ERROR_CODES> = {
      'permission-denied': ERROR_CODES.FORBIDDEN,
      'not-found': ERROR_CODES.USER_NOT_FOUND,
      'unavailable': ERROR_CODES.DATABASE_ERROR,
      'deadline-exceeded': ERROR_CODES.DATABASE_ERROR,
      'resource-exhausted': ERROR_CODES.RATE_LIMIT_EXCEEDED,
      'failed-precondition': ERROR_CODES.BAD_REQUEST,
      'invalid-argument': ERROR_CODES.BAD_REQUEST,
    };

    const errorCode = firestoreErrorMap[firestoreError.code] || ERROR_CODES.DATABASE_ERROR;
    const message = ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES];

    return { errorCode, message };
  }

  /**
   * Validate user account status and return appropriate error
   */
  static validateAccountStatus(userStatus: string, context?: AuthErrorContext): {
    isValid: boolean;
    errorCode?: keyof typeof ERROR_CODES;
    message?: string;
  } {
    const statusErrorMap: Record<string, keyof typeof ERROR_CODES> = {
      'suspended': ERROR_CODES.ACCOUNT_SUSPENDED,
      'pending': ERROR_CODES.EMAIL_NOT_VERIFIED,
      'blocked': ERROR_CODES.ACCOUNT_LOCKED,
      'inactive': ERROR_CODES.ACCOUNT_INACTIVE,
    };

    if (userStatus === 'active') {
      return { isValid: true };
    }

    const errorCode = statusErrorMap[userStatus] || ERROR_CODES.ACCOUNT_INACTIVE;
    const message = ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES];

    return {
      isValid: false,
      errorCode,
      message
    };
  }

  /**
   * Log authentication error with standardized format
   */
  private static logAuthError(
    errorCode: string,
    message: string,
    context: AuthErrorContext
  ): void {
    AuthLogger.logAuthenticationError(
      new Error(`${errorCode}: ${message}`),
      {
        userId: context.userId,
        ip: context.ip,
        userAgent: context.userAgent,
        endpoint: context.endpoint,
        tokenPrefix: context.tokenPrefix,
        sessionId: context.sessionId,
        ...context.additionalContext
      }
    );
  }

  /**
   * Generate unique request ID for error tracking
   */
  private static generateRequestId(): string {
    return `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate that an error response follows the standardized format
   */
  static validateErrorResponseFormat(response: any): boolean {
    return (
      response &&
      response.success === false &&
      typeof response.error === 'string' &&
      typeof response.message === 'string' &&
      response.details &&
      response.details.timestamp instanceof Date &&
      typeof response.details.requestId === 'string'
    );
  }

  /**
   * Ensure error code is valid and return appropriate fallback
   */
  static validateErrorCode(errorCode: any): keyof typeof ERROR_CODES {
    if (typeof errorCode === 'string' && errorCode in ERROR_CODES) {
      return errorCode as keyof typeof ERROR_CODES;
    }
    return ERROR_CODES.INTERNAL_SERVER_ERROR;
  }

  /**
   * Create middleware-compatible error response handler
   */
  static createMiddlewareErrorHandler(req: Request) {
    return {
      sendError: (
        res: Response,
        errorCode: keyof typeof ERROR_CODES,
        customMessage?: string,
        additionalContext?: Record<string, any>
      ) => {
        // Validate and sanitize error code
        const validatedErrorCode = this.validateErrorCode(errorCode);
        
        const context: AuthErrorContext = {
          ip: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get("User-Agent") || 'unknown',
          endpoint: req.path || req.url || 'unknown',
          additionalContext
        };

        // Add user context if available
        const authReq = req as any;
        if (authReq.user?.uid) {
          context.userId = authReq.user.uid;
        }

        // Add session context if available
        if (authReq.user?.sessionId) {
          context.sessionId = authReq.user.sessionId;
        }

        this.sendErrorResponse(res, validatedErrorCode, customMessage, context);
      }
    };
  }
}