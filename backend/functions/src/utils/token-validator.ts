import { ERROR_CODES } from "@attendance-x/shared";
import { logger } from "firebase-functions";

// Safe logger wrapper for testing
const safeLogger = {
  info: (message: string, data?: any) => {
    if (logger && logger.info) {
      logger.info(message, data);
    } else {
      console.info(message, data);
    }
  },
  warn: (message: string, data?: any) => {
    if (logger && logger.warn) {
      logger.warn(message, data);
    } else {
      console.warn(message, data);
    }
  },
  error: (message: string, data?: any) => {
    if (logger && logger.error) {
      logger.error(message, data);
    } else {
      console.error(message, data);
    }
  }
};

export interface TokenValidationResult {
  isValid: boolean;
  cleanedToken?: string;
  error?: string;
  errorCode?: string;
}

export interface TokenStructureValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    hasCorrectParts: boolean;
    headerValid: boolean;
    payloadValid: boolean;
    signatureValid: boolean;
  };
}

/**
 * Utility class for robust token validation and cleaning
 * Handles token structure validation before JWT verification
 */
export class TokenValidator {
  
  /**
   * Clean token by removing invisible characters and whitespace
   * @param token - Raw token string
   * @returns Cleaned token string
   */
  public static cleanToken(token: string): string {
    if (!token || typeof token !== 'string') {
      return '';
    }

    // Remove invisible characters, control characters, and whitespace
    return token
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
      .replace(/\s/g, '') // Remove all whitespace
      .trim();
  }

  /**
   * Validate JWT token structure before verification
   * @param token - Token to validate
   * @returns Validation result with details
   */
  public static validateTokenStructure(token: string): TokenStructureValidationResult {
    if (!token || typeof token !== 'string') {
      return {
        isValid: false,
        error: 'Token is empty or not a string'
      };
    }

    // Clean the token first
    const cleanedToken = this.cleanToken(token);
    
    if (!cleanedToken) {
      return {
        isValid: false,
        error: 'Token is empty after cleaning'
      };
    }

    // JWT should have exactly 3 parts separated by dots
    const parts = cleanedToken.split('.');
    
    if (parts.length !== 3) {
      return {
        isValid: false,
        error: `Invalid JWT structure: expected 3 parts, got ${parts.length}`,
        details: {
          hasCorrectParts: false,
          headerValid: false,
          payloadValid: false,
          signatureValid: false
        }
      };
    }

    const [header, payload, signature] = parts;
    
    // Validate each part is not empty and contains valid base64url characters
    const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
    
    const headerValid = header && base64UrlPattern.test(header);
    const payloadValid = payload && base64UrlPattern.test(payload);
    const signatureValid = signature && base64UrlPattern.test(signature);

    const isValid = headerValid && payloadValid && signatureValid;

    const details = {
      hasCorrectParts: true,
      headerValid: !!headerValid,
      payloadValid: !!payloadValid,
      signatureValid: !!signatureValid
    };

    if (!isValid) {
      const invalidParts = [];
      if (!headerValid) invalidParts.push('header');
      if (!payloadValid) invalidParts.push('payload');
      if (!signatureValid) invalidParts.push('signature');
      
      return {
        isValid: false,
        error: `Invalid JWT parts: ${invalidParts.join(', ')}`,
        details
      };
    }

    return {
      isValid: true,
      details
    };
  }

  /**
   * Comprehensive token validation with cleaning and structure checks
   * @param token - Raw token to validate
   * @returns Validation result with cleaned token if valid
   */
  public static validateAndCleanToken(token: string): TokenValidationResult {
    try {
      // Step 1: Basic validation
      if (!token || typeof token !== 'string') {
        safeLogger.warn('Token validation failed: empty or invalid type', {
          tokenType: typeof token,
          tokenLength: token ? token.length : 0
        });
        
        return {
          isValid: false,
          error: 'Token is required and must be a string',
          errorCode: ERROR_CODES.INVALID_TOKEN
        };
      }

      // Step 2: Clean the token
      const cleanedToken = this.cleanToken(token);
      
      if (!cleanedToken) {
        safeLogger.warn('Token validation failed: empty after cleaning', {
          originalLength: token.length,
          cleanedLength: 0
        });
        
        return {
          isValid: false,
          error: 'Token is empty after cleaning invisible characters',
          errorCode: ERROR_CODES.INVALID_TOKEN
        };
      }

      // Step 3: Validate structure
      const structureValidation = this.validateTokenStructure(cleanedToken);
      
      if (!structureValidation.isValid) {
        logger.warn('Token validation failed: invalid structure', {
          error: structureValidation.error,
          details: structureValidation.details,
          tokenPrefix: cleanedToken.substring(0, 20) + '...',
          originalTokenPrefix: token.substring(0, 20) + '...'
        });
        
        return {
          isValid: false,
          error: structureValidation.error,
          errorCode: ERROR_CODES.INVALID_TOKEN
        };
      }

      // Step 4: Additional malformed token checks
      if (cleanedToken.length < 50) { // JWT tokens are typically much longer
        logger.warn('Token validation failed: token too short', {
          tokenLength: cleanedToken.length,
          tokenPrefix: cleanedToken.substring(0, 20) + '...'
        });
        
        return {
          isValid: false,
          error: 'Token appears to be malformed (too short)',
          errorCode: ERROR_CODES.INVALID_TOKEN
        };
      }

      safeLogger.info('Token validation successful', {
        originalLength: token.length,
        cleanedLength: cleanedToken.length,
        hadInvisibleChars: token.length !== cleanedToken.length
      });

      return {
        isValid: true,
        cleanedToken
      };

    } catch (error) {
      safeLogger.error('Token validation error', {
        error: error instanceof Error ? error.message : String(error),
        tokenPrefix: token ? token.substring(0, 20) + '...' : 'null'
      });
      
      return {
        isValid: false,
        error: 'Token validation failed due to unexpected error',
        errorCode: ERROR_CODES.INVALID_TOKEN
      };
    }
  }

  /**
   * Log token validation failure with context
   * @param token - Original token
   * @param error - Validation error
   * @param context - Additional context for logging
   */
  public static logTokenValidationFailure(
    token: string, 
    error: string, 
    context: {
      ip?: string;
      userAgent?: string;
      endpoint?: string;
    } = {}
  ): void {
    logger.warn('Token validation failure', {
      error,
      tokenPrefix: token ? token.substring(0, 20) + '...' : 'null',
      tokenLength: token ? token.length : 0,
      tokenType: typeof token,
      hasInvisibleChars: token ? token !== this.cleanToken(token) : false,
      context
    });
  }
}