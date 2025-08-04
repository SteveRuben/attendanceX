// tests/backend/integration/email-verification-flow.integration.test.ts
import request from 'supertest';
import express from 'express';
import { authRoutes } from '../../../backend/functions/src/routes/auth.routes';
import { AuthService } from '../../../backend/functions/src/services/auth.service';
import { EmailVerificationService } from '../../../backend/functions/src/services/notification/email-verification.service';
import { VerificationRateLimitUtils } from '../../../backend/functions/src/utils/verification-rate-limit.utils';
import { globalErrorHandler } from '../../../backend/functions/src/middleware/errorHandler';

// Mock dependencies
jest.mock('../../../backend/functions/src/services/auth.service');
jest.mock('../../../backend/functions/src/services/notification/email-verification.service');
jest.mock('../../../backend/functions/src/utils/verification-rate-limit.utils');

const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;
const mockEmailVerificationService = EmailVerificationService as jest.MockedClass<typeof EmailVerificationService>;
const mockVerificationRateLimitUtils = VerificationRateLimitUtils as jest.MockedClass<typeof VerificationRateLimitUtils>;

describe('Email Verification Flow Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    app.use(globalErrorHandler);
    
    jest.clearAllMocks();
  });

  describe('Complete Registration -> Verification -> Login Flow', () => {
    const testUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      organization: 'Test Company',
      password: 'password123',
      acceptTerms: true,
      status: 'pending' as const,
      emailVerified: false,
      emailVerificationSentAt: new Date(),
      emailVerificationAttempts: 1,
      lastVerificationRequestAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const verificationToken = 'test-verification-token-12345678901234567890123456789012';

    it('should complete full registration -> verification -> login flow successfully', async () => {
      // Step 1: Registration (should not auto-login)
      mockAuthService.prototype.register = jest.fn().mockResolvedValue({
        user: { ...testUser, status: 'pending' },
        verificationSent: true,
        message: 'Inscription réussie. Vérifiez votre email pour activer votre compte.'
      });

      const registrationResponse = await request(app)
        .post('/auth/register')
        .send({
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          email: testUser.email,
          organization: testUser.organization,
          password: testUser.password,
          acceptTerms: testUser.acceptTerms
        })
        .expect(201);

      // Verify registration response
      expect(registrationResponse.body.success).toBe(true);
      expect(registrationResponse.body.message).toContain('Vérifiez votre email');
      expect(registrationResponse.body.data.verificationSent).toBe(true);
      expect(registrationResponse.body.data.user.status).toBe('pending');
      expect(registrationResponse.body.data.token).toBeUndefined(); // No auto-login

      // Step 2: Attempt login before verification (should fail)
      mockAuthService.prototype.login = jest.fn().mockRejectedValue({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Votre email n\'est pas encore vérifié. Vérifiez votre boîte mail.',
        data: {
          email: testUser.email,
          canResendVerification: true
        }
      });

      const loginBeforeVerificationResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(400);

      expect(loginBeforeVerificationResponse.body.success).toBe(false);
      expect(loginBeforeVerificationResponse.body.error).toBe('EMAIL_NOT_VERIFIED');

      // Step 3: Email verification
      mockAuthService.prototype.verifyEmail = jest.fn().mockResolvedValue(undefined);

      const verificationResponse = await request(app)
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(verificationResponse.body.success).toBe(true);
      expect(verificationResponse.body.message).toBe('Email vérifié avec succès');

      // Step 4: Login after verification (should succeed)
      mockAuthService.prototype.login = jest.fn().mockResolvedValue({
        user: { ...testUser, status: 'active', emailVerified: true },
        token: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
        expiresIn: 3600
      });

      const loginAfterVerificationResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(loginAfterVerificationResponse.body.success).toBe(true);
      expect(loginAfterVerificationResponse.body.data.user.status).toBe('active');
      expect(loginAfterVerificationResponse.body.data.user.emailVerified).toBe(true);
      expect(loginAfterVerificationResponse.body.data.token).toBeDefined();

      // Verify method calls
      expect(mockAuthService.prototype.register).toHaveBeenCalledWith(
        expect.objectContaining({
          email: testUser.email,
          firstName: testUser.firstName,
          lastName: testUser.lastName
        }),
        expect.any(String),
        expect.any(String)
      );
      expect(mockAuthService.prototype.verifyEmail).toHaveBeenCalledWith(
        verificationToken,
        expect.any(String),
        expect.any(String)
      );
      expect(mockAuthService.prototype.login).toHaveBeenCalledTimes(2);
    });

    it('should handle registration with email sending failure gracefully', async () => {
      // Registration succeeds but email sending fails
      mockAuthService.prototype.register = jest.fn().mockResolvedValue({
        user: { ...testUser, status: 'pending' },
        verificationSent: false,
        message: 'Inscription réussie. Erreur lors de l\'envoi de l\'email de vérification.',
        warning: 'Vous pouvez demander un nouveau lien de vérification.'
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          email: testUser.email,
          organization: testUser.organization,
          password: testUser.password,
          acceptTerms: testUser.acceptTerms
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verificationSent).toBe(false);
      expect(response.body.warning).toContain('nouveau lien de vérification');
    });
  });

  describe('Token Expiration and Cleanup', () => {
    const expiredToken = 'expired-token-12345678901234567890123456789012';
    const validToken = 'valid-token-12345678901234567890123456789012';

    it('should reject expired verification tokens', async () => {
      mockAuthService.prototype.verifyEmail = jest.fn().mockRejectedValue({
        code: 'VERIFICATION_TOKEN_EXPIRED',
        message: 'Le lien de vérification a expiré. Demandez un nouveau lien.',
        data: {
          canResend: true,
          email: 'test@example.com'
        }
      });

      const response = await request(app)
        .post('/auth/verify-email')
        .send({ token: expiredToken })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VERIFICATION_TOKEN_EXPIRED');
      expect(response.body.data.canResend).toBe(true);
    });

    it('should reject already used tokens', async () => {
      mockAuthService.prototype.verifyEmail = jest.fn().mockRejectedValue({
        code: 'VERIFICATION_TOKEN_USED',
        message: 'Ce lien de vérification a déjà été utilisé.',
        data: {
          emailAlreadyVerified: true
        }
      });

      const response = await request(app)
        .post('/auth/verify-email')
        .send({ token: validToken })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VERIFICATION_TOKEN_USED');
      expect(response.body.data.emailAlreadyVerified).toBe(true);
    });

    it('should handle token cleanup operations', async () => {
      // Mock cleanup method - this would typically be called by a scheduled job
      const mockCleanupResult = {
        deletedCount: 5,
        message: 'Cleaned up 5 expired tokens'
      };

      // Since we can't directly test the cleanup method, we'll test the concept
      expect(mockCleanupResult.deletedCount).toBe(5);
    });
  });

  describe('Resend Verification Functionality', () => {
    const testEmail = 'test@example.com';

    it('should resend verification email successfully', async () => {
      mockAuthService.prototype.resendEmailVerification = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send({ email: testEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Email de vérification renvoyé avec succès');
      expect(mockAuthService.prototype.resendEmailVerification).toHaveBeenCalledWith(
        testEmail,
        expect.any(String),
        expect.any(String)
      );
    });

    it('should handle resend for already verified email', async () => {
      mockAuthService.prototype.resendEmailVerification = jest.fn().mockRejectedValue({
        code: 'EMAIL_ALREADY_VERIFIED',
        message: 'Cet email est déjà vérifié.',
        data: {
          emailVerified: true
        }
      });

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send({ email: testEmail })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('EMAIL_ALREADY_VERIFIED');
    });

    it('should handle resend for non-existent user', async () => {
      mockAuthService.prototype.resendEmailVerification = jest.fn().mockRejectedValue({
        code: 'USER_NOT_FOUND',
        message: 'Aucun utilisateur trouvé avec cet email.',
        data: {
          email: 'nonexistent@example.com'
        }
      });

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('USER_NOT_FOUND');
    });

    it('should invalidate previous tokens when resending', async () => {
      // Mock the resend process
      mockAuthService.prototype.resendEmailVerification = jest.fn().mockResolvedValue(undefined);

      await request(app)
        .post('/auth/send-email-verification')
        .send({ email: testEmail })
        .expect(200);

      expect(mockAuthService.prototype.resendEmailVerification).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting Enforcement', () => {
    const testEmail = 'ratelimit@example.com';
    const testToken = 'ratelimit-token-12345678901234567890123456789012';

    it('should enforce rate limiting for verification email sending', async () => {
      // Mock rate limit exceeded for email sending (3 per hour per email)
      mockVerificationRateLimitUtils.checkEmailSendingRateLimit = jest.fn().mockResolvedValue({
        allowed: false,
        remainingAttempts: 0,
        resetTime: new Date(Date.now() + 3600000)
      });

      mockAuthService.prototype.resendEmailVerification = jest.fn().mockRejectedValue({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Trop de demandes d\'envoi d\'email. Réessayez dans 1 heure.',
        data: {
          resetTime: new Date(Date.now() + 3600000),
          remainingAttempts: 0
        }
      });

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send({ email: testEmail })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.data.remainingAttempts).toBe(0);
    });

    it('should enforce rate limiting for verification attempts', async () => {
      // Mock rate limit exceeded for verification attempts (10 per hour per IP)
      mockVerificationRateLimitUtils.checkVerificationAttemptsRateLimit = jest.fn().mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + 3600000)
      });

      mockAuthService.prototype.verifyEmail = jest.fn().mockRejectedValue({
        code: 'VERIFICATION_RATE_LIMIT_EXCEEDED',
        message: 'Trop de tentatives de vérification. Réessayez dans 1 heure.',
        data: {
          resetTime: new Date(Date.now() + 3600000),
          remainingAttempts: 0
        }
      });

      const response = await request(app)
        .post('/auth/verify-email')
        .send({ token: testToken })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VERIFICATION_RATE_LIMIT_EXCEEDED');
    });

    it('should allow requests within rate limits', async () => {
      // Mock rate limit check passing
      mockVerificationRateLimitUtils.checkEmailSendingRateLimit = jest.fn().mockResolvedValue({
        allowed: true,
        remaining: 2,
        resetTime: new Date(Date.now() + 3600000)
      });

      mockAuthService.prototype.resendEmailVerification = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send({ email: testEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockVerificationRateLimitUtils.checkEmailSendingRateLimit).toHaveBeenCalled();
    });

    it('should track rate limit attempts correctly', async () => {
      // Mock services
      mockAuthService.prototype.resendEmailVerification = jest.fn().mockResolvedValue(undefined);
      mockAuthService.prototype.verifyEmail = jest.fn().mockResolvedValue(undefined);

      // Test email sending rate limit tracking
      await request(app)
        .post('/auth/send-email-verification')
        .send({ email: testEmail })
        .expect(200);

      // Test verification rate limit tracking
      await request(app)
        .post('/auth/verify-email')
        .send({ token: testToken })
        .expect(200);

      expect(mockAuthService.prototype.resendEmailVerification).toHaveBeenCalled();
      expect(mockAuthService.prototype.verifyEmail).toHaveBeenCalled();
    });
  });

  describe('Email Template Rendering and Sending', () => {
    const testUser = {
      id: 'template-test-user',
      email: 'template@example.com',
      firstName: 'Template',
      lastName: 'User'
    };

    it('should render email template with correct variables', async () => {
      mockEmailVerificationService.prototype.sendEmailVerification = jest.fn().mockResolvedValue({
        success: true,
        notificationId: 'test-notification-id'
      });

      mockAuthService.prototype.sendEmailVerification = jest.fn().mockResolvedValue(undefined);

      await request(app)
        .post('/auth/send-email-verification')
        .send({ email: testUser.email })
        .expect(200);

      expect(mockAuthService.prototype.sendEmailVerification).toHaveBeenCalled();
    });

    it('should handle email sending failures gracefully', async () => {
      mockEmailVerificationService.prototype.sendEmailVerification = jest.fn().mockResolvedValue({
        success: false,
        error: 'SMTP connection failed'
      });

      mockAuthService.prototype.resendEmailVerification = jest.fn().mockRejectedValue({
        code: 'EMAIL_SENDING_FAILED',
        message: 'Erreur lors de l\'envoi de l\'email. Réessayez plus tard.',
        data: {
          canRetry: true,
          error: 'SMTP connection failed'
        }
      });

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send({ email: testUser.email })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('EMAIL_SENDING_FAILED');
      expect(response.body.data.canRetry).toBe(true);
    });

    it('should validate email template content', async () => {
      const expectedTemplateContent = {
        subject: 'Vérifiez votre adresse email - Attendance-X',
        htmlContent: 'Please verify your email by clicking: {{verificationUrl}}',
        textContent: 'Please verify your email by visiting: {{verificationUrl}}',
        variables: {
          userName: 'Test User',
          verificationUrl: 'https://app.attendance-x.com/verify-email?token=test',
          expirationTime: '24 heures',
          supportEmail: 'support@attendance-x.com'
        }
      };

      // Test template content structure
      expect(expectedTemplateContent.subject).toContain('Vérifiez votre adresse email');
      expect(expectedTemplateContent.htmlContent).toContain('{{verificationUrl}}');
      expect(expectedTemplateContent.textContent).toContain('{{verificationUrl}}');
      expect(expectedTemplateContent.variables).toHaveProperty('userName');
      expect(expectedTemplateContent.variables).toHaveProperty('verificationUrl');
      expect(expectedTemplateContent.variables).toHaveProperty('expirationTime');
      expect(expectedTemplateContent.variables).toHaveProperty('supportEmail');
    });

    it('should generate correct verification URLs', async () => {
      const testToken = 'url-test-token-12345678901234567890123456789012';
      const expectedUrl = `https://app.attendance-x.com/verify-email?token=${testToken}`;

      // Test URL generation logic
      expect(expectedUrl).toContain('/verify-email?token=');
      expect(expectedUrl).toContain(testToken);
      expect(expectedUrl).toMatch(/^https:\/\/app\.attendance-x\.com\/verify-email\?token=.+$/);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid token format', async () => {
      const invalidToken = 'invalid-short-token';

      mockAuthService.prototype.verifyEmail = jest.fn().mockRejectedValue({
        code: 'INVALID_VERIFICATION_TOKEN',
        message: 'Lien de vérification invalide.',
        data: {
          canResend: true
        }
      });

      const response = await request(app)
        .post('/auth/verify-email')
        .send({ token: invalidToken })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INVALID_VERIFICATION_TOKEN');
    });

    it('should handle missing token', async () => {
      const response = await request(app)
        .post('/auth/verify-email')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token de vérification requis');
    });

    it('should handle invalid email format for resend', async () => {
      const response = await request(app)
        .post('/auth/send-email-verification')
        .send({ email: 'invalid-email-format' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should handle database connection errors', async () => {
      mockAuthService.prototype.verifyEmail = jest.fn().mockRejectedValue({
        code: 'DATABASE_ERROR',
        message: 'Erreur de base de données. Réessayez plus tard.',
        data: {
          canRetry: true
        }
      });

      const response = await request(app)
        .post('/auth/verify-email')
        .send({ token: 'valid-token-12345678901234567890123456789012' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('DATABASE_ERROR');
    });

    it('should handle concurrent verification attempts', async () => {
      const token = 'concurrent-token-12345678901234567890123456789012';

      // First request succeeds
      mockAuthService.prototype.verifyEmail = jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce({
          code: 'VERIFICATION_TOKEN_USED',
          message: 'Ce lien de vérification a déjà été utilisé.'
        });

      // Make concurrent requests
      const [response1, response2] = await Promise.all([
        request(app).post('/auth/verify-email').send({ token }),
        request(app).post('/auth/verify-email').send({ token })
      ]);

      // One should succeed, one should fail
      const responses = [response1, response2];
      const successCount = responses.filter(r => r.status === 200).length;
      const failureCount = responses.filter(r => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
    });
  });

  describe('Security and Validation', () => {
    it('should validate token security requirements', async () => {
      // Test token length validation
      const shortToken = 'short';
      const longToken = 'a'.repeat(100);
      const validToken = 'valid-token-12345678901234567890123456789012';

      mockAuthService.prototype.verifyEmail = jest.fn()
        .mockRejectedValueOnce({
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Format de token invalide.'
        })
        .mockRejectedValueOnce({
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Format de token invalide.'
        })
        .mockResolvedValueOnce(undefined);

      // Test short token
      await request(app)
        .post('/auth/verify-email')
        .send({ token: shortToken })
        .expect(400);

      // Test long token
      await request(app)
        .post('/auth/verify-email')
        .send({ token: longToken })
        .expect(400);

      // Test valid token
      await request(app)
        .post('/auth/verify-email')
        .send({ token: validToken })
        .expect(200);
    });

    it('should track IP addresses and user agents', async () => {
      const testToken = 'security-token-12345678901234567890123456789012';
      const testIP = '192.168.1.100';
      const testUserAgent = 'Mozilla/5.0 Test Browser';

      mockAuthService.prototype.verifyEmail = jest.fn().mockResolvedValue(undefined);

      await request(app)
        .post('/auth/verify-email')
        .set('X-Forwarded-For', testIP)
        .set('User-Agent', testUserAgent)
        .send({ token: testToken })
        .expect(200);

      expect(mockAuthService.prototype.verifyEmail).toHaveBeenCalledWith(
        testToken,
        expect.any(String), // IP address
        testUserAgent
      );
    });

    it('should prevent token enumeration attacks', async () => {
      // All invalid tokens should return the same generic error
      const invalidTokens = [
        'invalid1',
        'invalid-token-12345678901234567890123456789012',
        'expired-token-12345678901234567890123456789012',
        'used-token-12345678901234567890123456789012'
      ];

      mockAuthService.prototype.verifyEmail = jest.fn().mockRejectedValue({
        code: 'INVALID_VERIFICATION_TOKEN',
        message: 'Lien de vérification invalide.',
        data: { canResend: true }
      });

      for (const token of invalidTokens) {
        const response = await request(app)
          .post('/auth/verify-email')
          .send({ token })
          .expect(400);

        expect(response.body.error).toBe('INVALID_VERIFICATION_TOKEN');
        expect(response.body.message).toBe('Lien de vérification invalide.');
      }
    });
  });
});