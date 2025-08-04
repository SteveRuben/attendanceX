// tests/backend/unit/email-verification-errors.test.ts
import { EmailVerificationErrors } from "../../../backend/functions/src/utils/email-verification-errors";
import { EmailVerificationValidation } from "../../../backend/functions/src/utils/email-verification-validation";
import { ERROR_CODES } from "@attendance-x/shared";

describe('EmailVerificationErrors', () => {
  describe('Error Creation', () => {
    test('should create emailAlreadyVerified error correctly', () => {
      const error = EmailVerificationErrors.emailAlreadyVerified("test@example.com");
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ERROR_CODES.EMAIL_ALREADY_VERIFIED);
      expect(error.message).toContain("déjà vérifiée");
      expect(error.details.email).toBe("test@example.com");
    });

    test('should create verificationTokenExpired error correctly', () => {
      const error = EmailVerificationErrors.verificationTokenExpired("test@example.com");
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ERROR_CODES.VERIFICATION_TOKEN_EXPIRED);
      expect(error.message).toContain("expiré");
      expect(error.details.email).toBe("test@example.com");
    });

    test('should create verificationRateLimitExceeded error correctly', () => {
      const nextAllowedTime = new Date(Date.now() + 15 * 60 * 1000);
      const error = EmailVerificationErrors.verificationRateLimitExceeded("test@example.com", nextAllowedTime);
      
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe(ERROR_CODES.VERIFICATION_RATE_LIMIT_EXCEEDED);
      expect(error.message).toContain("limite");
      expect(error.details.email).toBe("test@example.com");
      expect(error.details.nextAllowedTime).toBe(nextAllowedTime.toISOString());
    });

    test('should create emailNotVerifiedForLogin error with resend allowed', () => {
      const lastSentAt = new Date();
      const error = EmailVerificationErrors.emailNotVerifiedForLogin(
        "test@example.com", 
        true, 
        lastSentAt, 
        2
      );
      
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ERROR_CODES.EMAIL_NOT_VERIFIED);
      expect(error.details.canResend).toBe(true);
      expect(error.details.attemptsRemaining).toBe(2);
    });

    test('should create emailNotVerifiedForLogin error with resend not allowed', () => {
      const error = EmailVerificationErrors.emailNotVerifiedForLogin(
        "test@example.com", 
        false, 
        undefined, 
        0
      );
      
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ERROR_CODES.EMAIL_NOT_VERIFIED);
      expect(error.details.canResend).toBe(false);
      expect(error.details.attemptsRemaining).toBe(0);
    });
  });

  describe('Success Responses', () => {
    test('should create registrationSuccessWithVerification response correctly', () => {
      const response = EmailVerificationErrors.registrationSuccessWithVerification(
        "test@example.com", 
        "user123", 
        true
      );
      
      expect(response.success).toBe(true);
      expect(response.message).toContain("Inscription réussie");
      expect(response.data.email).toBe("test@example.com");
      expect(response.data.userId).toBe("user123");
      expect(response.data.verificationSent).toBe(true);
      expect(response.data.expiresIn).toBe("24 heures");
    });

    test('should create emailVerificationSuccess response correctly', () => {
      const response = EmailVerificationErrors.emailVerificationSuccess("test@example.com");
      
      expect(response.success).toBe(true);
      expect(response.message).toContain("vérifiée avec succès");
      expect(response.data.email).toBe("test@example.com");
    });

    test('should create verificationEmailSentSuccess response correctly', () => {
      const response = EmailVerificationErrors.verificationEmailSentSuccess("test@example.com", true);
      
      expect(response.success).toBe(true);
      expect(response.message).toContain("envoyé avec succès");
      expect(response.data.email).toBe("test@example.com");
      expect(response.data.canResend).toBe(true);
    });
  });

  describe('HTTP Status Codes', () => {
    test('should return correct HTTP status codes', () => {
      expect(EmailVerificationErrors.getHttpStatusCode(ERROR_CODES.EMAIL_ALREADY_VERIFIED)).toBe(400);
      expect(EmailVerificationErrors.getHttpStatusCode(ERROR_CODES.EMAIL_NOT_VERIFIED)).toBe(403);
      expect(EmailVerificationErrors.getHttpStatusCode(ERROR_CODES.VERIFICATION_RATE_LIMIT_EXCEEDED)).toBe(429);
      expect(EmailVerificationErrors.getHttpStatusCode(ERROR_CODES.EMAIL_VERIFICATION_SEND_FAILED)).toBe(500);
    });
  });

  describe('Actionable Error Messages', () => {
    test('should return actionable messages for different scenarios', () => {
      const canResendMessage = EmailVerificationErrors.getActionableErrorMessage(
        ERROR_CODES.EMAIL_NOT_VERIFIED, 
        { canResend: true }
      );
      expect(canResendMessage).toContain("Cliquez sur");

      const cannotResendMessage = EmailVerificationErrors.getActionableErrorMessage(
        ERROR_CODES.EMAIL_NOT_VERIFIED, 
        { canResend: false }
      );
      expect(cannotResendMessage).toContain("Contactez");

      const expiredMessage = EmailVerificationErrors.getActionableErrorMessage(
        ERROR_CODES.VERIFICATION_TOKEN_EXPIRED
      );
      expect(expiredMessage).toContain("Demandez un nouveau");
    });
  });
});

describe('EmailVerificationValidation', () => {
  describe('Email Validation', () => {
    test('should validate correct email addresses', () => {
      const validation = EmailVerificationValidation.validateEmail("test@example.com");
      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeNull();
    });

    test('should reject invalid email addresses', () => {
      const validation = EmailVerificationValidation.validateEmail("invalid-email");
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBeTruthy();
      expect(validation.error?.code).toBe(ERROR_CODES.INVALID_EMAIL_FORMAT);
    });
  });

  describe('Token Validation', () => {
    test('should validate correct tokens', () => {
      const validToken = "a".repeat(64); // 64 character hex string
      const validation = EmailVerificationValidation.validateToken(validToken);
      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeNull();
    });

    test('should reject invalid tokens', () => {
      const validation = EmailVerificationValidation.validateToken("invalid-token");
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBeTruthy();
      expect(validation.error?.code).toBe(ERROR_CODES.INVALID_VERIFICATION_TOKEN);
    });
  });
});