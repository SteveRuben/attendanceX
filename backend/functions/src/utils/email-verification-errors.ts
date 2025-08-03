// backend/functions/src/utils/email-verification-errors.ts
import { ERROR_CODES, ERROR_MESSAGES } from "@attendance-x/shared";
import { createError } from "../middleware/errorHandler";

/**
 * Utility class for creating standardized email verification errors
 * with proper HTTP status codes and French messages
 */
export class EmailVerificationErrors {
  
  /**
   * Create error for already verified email
   */
  static emailAlreadyVerified(email?: string) {
    return createError(
      ERROR_MESSAGES[ERROR_CODES.EMAIL_ALREADY_VERIFIED],
      400,
      ERROR_CODES.EMAIL_ALREADY_VERIFIED,
      {
        email,
        emailAlreadyVerified: true,
        actionRequired: false
      }
    );
  }

  /**
   * Create error for expired verification token
   */
  static verificationTokenExpired(email?: string) {
    return createError(
      ERROR_MESSAGES[ERROR_CODES.VERIFICATION_TOKEN_EXPIRED],
      400,
      ERROR_CODES.VERIFICATION_TOKEN_EXPIRED,
      {
        email,
        canResend: true,
        actionRequired: true,
        suggestedAction: "Demandez un nouveau lien de vérification"
      }
    );
  }

  /**
   * Create error for already used verification token
   */
  static verificationTokenUsed(email?: string) {
    return createError(
      ERROR_MESSAGES[ERROR_CODES.VERIFICATION_TOKEN_USED],
      400,
      ERROR_CODES.VERIFICATION_TOKEN_USED,
      {
        email,
        emailAlreadyVerified: true,
        actionRequired: false,
        suggestedAction: "Votre email est déjà vérifié, vous pouvez vous connecter"
      }
    );
  }

  /**
   * Create error for invalid verification token
   */
  static invalidVerificationToken(email?: string) {
    return createError(
      ERROR_MESSAGES[ERROR_CODES.INVALID_VERIFICATION_TOKEN],
      400,
      ERROR_CODES.INVALID_VERIFICATION_TOKEN,
      {
        email,
        canResend: true,
        actionRequired: true,
        suggestedAction: "Demandez un nouveau lien de vérification"
      }
    );
  }

  /**
   * Create error for rate limit exceeded on verification requests
   */
  static verificationRateLimitExceeded(email?: string, nextAllowedTime?: Date) {
    return createError(
      ERROR_MESSAGES[ERROR_CODES.VERIFICATION_RATE_LIMIT_EXCEEDED],
      429,
      ERROR_CODES.VERIFICATION_RATE_LIMIT_EXCEEDED,
      {
        email,
        canResend: false,
        actionRequired: false,
        nextAllowedTime,
        suggestedAction: "Veuillez patienter avant de demander un nouveau lien"
      }
    );
  }

  /**
   * Create error for email verification send failure
   */
  static emailVerificationSendFailed(email?: string, reason?: string) {
    return createError(
      ERROR_MESSAGES[ERROR_CODES.EMAIL_VERIFICATION_SEND_FAILED],
      500,
      ERROR_CODES.EMAIL_VERIFICATION_SEND_FAILED,
      {
        email,
        canResend: true,
        actionRequired: true,
        reason,
        suggestedAction: "Réessayez dans quelques minutes ou contactez le support"
      }
    );
  }

  /**
   * Create error for unverified email during login
   */
  static emailNotVerifiedForLogin(email: string, canResend: boolean, lastVerificationSent?: Date, verificationAttempts?: number) {
    const baseMessage = ERROR_MESSAGES[ERROR_CODES.EMAIL_NOT_VERIFIED];
    const actionMessage = canResend 
      ? " Vérifiez votre boîte mail ou demandez un nouveau lien de vérification."
      : " Vérifiez votre boîte mail. Vous avez atteint la limite de demandes de vérification.";
    
    return createError(
      baseMessage + actionMessage,
      403,
      ERROR_CODES.EMAIL_NOT_VERIFIED,
      {
        email,
        canResendVerification: canResend,
        lastVerificationSent,
        verificationAttempts: verificationAttempts || 0,
        actionRequired: true,
        suggestedAction: canResend 
          ? "Vérifiez votre boîte mail ou cliquez sur 'Renvoyer l'email de vérification'"
          : "Vérifiez votre boîte mail, y compris le dossier spam"
      }
    );
  }

  /**
   * Create success response for registration with verification email sent
   */
  static registrationSuccessWithVerification(email: string, userId: string, verificationSent: boolean, warning?: string) {
    return {
      success: true,
      message: verificationSent 
        ? "Inscription réussie. Vérifiez votre email pour activer votre compte."
        : "Inscription réussie. Erreur lors de l'envoi de l'email de vérification.",
      data: {
        email,
        userId,
        verificationSent,
        expiresIn: verificationSent ? "24 heures" : undefined,
        canResend: !verificationSent,
        actionRequired: true,
        nextStep: verificationSent 
          ? "Consultez votre boîte mail et cliquez sur le lien de vérification"
          : "Demandez un nouveau lien de vérification"
      },
      warning
    };
  }

  /**
   * Create success response for email verification completed
   */
  static emailVerificationSuccess(email: string) {
    return {
      success: true,
      message: "Email vérifié avec succès. Vous pouvez maintenant vous connecter.",
      data: {
        email,
        emailVerified: true,
        actionRequired: true,
        nextStep: "Connectez-vous avec vos identifiants",
        redirectTo: "/login"
      }
    };
  }

  /**
   * Create success response for verification email sent/resent
   */
  static verificationEmailSentSuccess(email: string, isResend: boolean = false) {
    const action = isResend ? "renvoyé" : "envoyé";
    return {
      success: true,
      message: `Email de vérification ${action} avec succès.`,
      data: {
        email,
        verificationSent: true,
        expiresIn: "24 heures",
        actionRequired: true,
        nextStep: "Consultez votre boîte mail et cliquez sur le lien de vérification",
        checkSpamFolder: true
      }
    };
  }

  /**
   * Get user-friendly error message with actionable guidance
   */
  static getActionableErrorMessage(errorCode: string, context?: any): string {
    const baseMessage = ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES];
    
    switch (errorCode) {
      case ERROR_CODES.EMAIL_NOT_VERIFIED:
        return context?.canResend 
          ? `${baseMessage}. Vérifiez votre boîte mail ou demandez un nouveau lien de vérification.`
          : `${baseMessage}. Vérifiez votre boîte mail, y compris le dossier spam.`;
      
      case ERROR_CODES.VERIFICATION_TOKEN_EXPIRED:
        return `${baseMessage}. Demandez un nouveau lien de vérification pour continuer.`;
      
      case ERROR_CODES.VERIFICATION_TOKEN_USED:
        return `${baseMessage}. Votre email est déjà vérifié, vous pouvez vous connecter.`;
      
      case ERROR_CODES.INVALID_VERIFICATION_TOKEN:
        return `${baseMessage}. Demandez un nouveau lien de vérification.`;
      
      case ERROR_CODES.VERIFICATION_RATE_LIMIT_EXCEEDED:
        return `${baseMessage}. Veuillez patienter avant de demander un nouveau lien.`;
      
      case ERROR_CODES.EMAIL_VERIFICATION_SEND_FAILED:
        return `${baseMessage}. Réessayez dans quelques minutes ou contactez le support.`;
      
      default:
        return baseMessage || "Une erreur s'est produite lors de la vérification de l'email.";
    }
  }

  /**
   * Get HTTP status code for email verification error
   */
  static getHttpStatusCode(errorCode: string): number {
    switch (errorCode) {
      case ERROR_CODES.EMAIL_ALREADY_VERIFIED:
      case ERROR_CODES.VERIFICATION_TOKEN_EXPIRED:
      case ERROR_CODES.VERIFICATION_TOKEN_USED:
      case ERROR_CODES.INVALID_VERIFICATION_TOKEN:
        return 400; // Bad Request
      
      case ERROR_CODES.EMAIL_NOT_VERIFIED:
        return 403; // Forbidden
      
      case ERROR_CODES.VERIFICATION_RATE_LIMIT_EXCEEDED:
        return 429; // Too Many Requests
      
      case ERROR_CODES.EMAIL_VERIFICATION_SEND_FAILED:
        return 500; // Internal Server Error
      
      default:
        return 400; // Default to Bad Request
    }
  }
}