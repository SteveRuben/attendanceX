// backend/functions/src/utils/email-verification-validation.ts
import { ERROR_CODES } from "@attendance-x/shared";
import { createError } from "../middleware/errorHandler";
import { AuthErrorHandler } from "./auth-error-handler";

/**
 * Validation utilities for email verification requests
 */
export class EmailVerificationValidation {
  
  /**
   * Validate email format
   */
  static validateEmail(email: string): { isValid: boolean; error?: any } {
    if (!email) {
      return {
        isValid: false,
        error: createError(
          "L'adresse email est requise",
          400,
          ERROR_CODES.VALIDATION_ERROR,
          { field: "email", reason: "required" }
        )
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        error: createError(
          "Format d'adresse email invalide",
          400,
          ERROR_CODES.INVALID_EMAIL,
          { field: "email", reason: "invalid_format" }
        )
      };
    }

    return { isValid: true };
  }

  /**
   * Validate verification token format
   */
  static validateToken(token: string): { isValid: boolean; error?: any } {
    if (!token) {
      return {
        isValid: false,
        error: createError(
          "Le token de vérification est requis",
          400,
          ERROR_CODES.VALIDATION_ERROR,
          { field: "token", reason: "required" }
        )
      };
    }

    // Token should be a hex string of specific length (64 characters for 32 bytes)
    if (!/^[a-fA-F0-9]{64}$/.test(token)) {
      return {
        isValid: false,
        error: createError(
          "Format de token de vérification invalide",
          400,
          ERROR_CODES.INVALID_VERIFICATION_TOKEN,
          { field: "token", reason: "invalid_format" }
        )
      };
    }

    return { isValid: true };
  }

  /**
   * Validate resend email verification request
   */
  static validateResendRequest(body: any): { isValid: boolean; errors: any[] } {
    const errors: any[] = [];

    const emailValidation = this.validateEmail(body.email);
    if (!emailValidation.isValid) {
      errors.push(emailValidation.error);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate verify email request
   */
  static validateVerifyRequest(body: any): { isValid: boolean; errors: any[] } {
    const errors: any[] = [];

    const tokenValidation = this.validateToken(body.token);
    if (!tokenValidation.isValid) {
      errors.push(tokenValidation.error);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create validation error response
   */
  static createValidationErrorResponse(errors: any[]): any {
    const firstError = errors[0];
    return createError(
      firstError.message || "Erreur de validation",
      400,
      ERROR_CODES.VALIDATION_ERROR,
      {
        validationErrors: errors.map(err => ({
          field: err.details?.field,
          reason: err.details?.reason,
          message: err.message
        }))
      }
    );
  }
}