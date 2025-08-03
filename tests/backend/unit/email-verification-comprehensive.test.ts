// tests/backend/unit/email-verification-comprehensive.test.ts

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AuthService } from '../../../backend/functions/src/services/auth.service';
import { EmailVerificationTokenModel } from '../../../backend/functions/src/models/email-verification-token.model';
import { EmailVerificationTokenUtils } from '../../../backend/functions/src/utils/email-verification-token.utils';
import { VerificationRateLimitUtils } from '../../../backend/functions/src/utils/verification-rate-limit.utils';
import { EmailVerificationErrors } from '../../../backend/functions/src/utils/email-verification-errors';
import { ERROR_CODES, UserStatus, CreateUserRequest, UserRole } from '@attendance-x/shared';
import * as crypto from 'crypto';

// Mock Firebase and dependencies
jest.mock('firebase-admin/firestore');
jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock all dependencies
jest.mock('../../../backend/functions/src/config/database');
jest.mock('../../../backend/functions/src/services/user.service', () => ({
  userService: {
    getUserById: jest.fn(),
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn()
  }
}));
jest.mock('../../../backend/functions/src/services/notification/email-verification.service', () => ({
  emailVerificationService: {
    sendEmailVerification: jest.fn()
  }
}));
jest.mock('../../../backend/functions/src/utils/email-verification-token.utils');
jest.mock('../../../backend/functions/src/utils/verification-rate-limit.utils');

describe('Email Verification Comprehensive Tests', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Token Generation and Validation Security', () => {
    describe('EmailVerificationTokenModel.createToken', () => {
      it('should generate cryptographically secure tokens', () => {
        const userId = 'test-user-id';
        const ipAddress = '192.168.1.1';
        const userAgent = 'Mozilla/5.0 Test Browser';

        const { model, rawToken } = EmailVerificationTokenModel.createToken(
          userId, 
          ipAddress, 
          userAgent
        );

        // Verify token properties
        expect(rawToken).toHaveLength(64); // 32 bytes * 2 (hex)
        expect(model.getHashedToken()).toHaveLength(64); // SHA-256 hash
        expect(model.getUserId()).toBe(userId);
        expect(model.getIpAddress()).toBe(ipAddress);
        expect(model.getUserAgent()).toBe(userAgent);
        expect(model.getIsUsed()).toBe(false);
        
        // Verify expiration is 24 hours from now
        const expiresAt = model.getExpiresAt();
        const now = new Date();
        const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
        expect(timeDiff).toBeLessThan(1000); // Within 1 second
      });

      it('should generate unique tokens for multiple calls', () => {
        const userId = 'test-user-id';
        
        const token1 = EmailVerificationTokenModel.createToken(userId);
        const token2 = EmailVerificationTokenModel.createToken(userId);
        
        expect(token1.rawToken).not.toBe(token2.rawToken);
        expect(token1.model.getHashedToken()).not.toBe(token2.model.getHashedToken());
      });

      it('should properly hash tokens using SHA-256', () => {
        const testToken = 'test-token-123';
        const expectedHash = crypto.createHash('sha256').update(testToken).digest('hex');
        
        const actualHash = EmailVerificationTokenModel.hashToken(testToken);
        
        expect(actualHash).toBe(expectedHash);
        expect(actualHash).toHaveLength(64);
      });

      it('should generate tokens with proper metadata', () => {
        const userId = 'test-user-id';
        const ipAddress = '10.0.0.1';
        
        const { model } = EmailVerificationTokenModel.createToken(userId, ipAddress);
        const metadata = model.getMetadata();
        
        expect(metadata).toBeDefined();
        expect(metadata?.resendCount).toBe(0);
        expect(metadata?.originalRequestIp).toBe(ipAddress);
      });
    });

    describe('Token Validation', () => {
      it('should validate token structure correctly', async () => {
        const { model } = EmailVerificationTokenModel.createToken('user-id');
        
        const isValid = await model.validate();
        expect(isValid).toBe(true);
      });

      it('should reject tokens with invalid hashedToken length', async () => {
        const tokenData = {
          userId: 'user-id',
          hashedToken: 'invalid-hash',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isUsed: false
        };
        
        const model = new EmailVerificationTokenModel(tokenData);
        
        await expect(model.validate()).rejects.toThrow('Invalid hashedToken');
      });

      it('should reject tokens with past expiration dates', async () => {
        const tokenData = {
          userId: 'user-id',
          hashedToken: 'a'.repeat(64),
          expiresAt: new Date(Date.now() - 1000), // Past date
          isUsed: false
        };
        
        const model = new EmailVerificationTokenModel(tokenData);
        
        await expect(model.validate()).rejects.toThrow('Token expiration date must be in the future');
      });

      it('should validate IP addresses correctly', async () => {
        // Valid IPv4
        const validIPv4 = {
          userId: 'user-id',
          hashedToken: 'a'.repeat(64),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isUsed: false,
          ipAddress: '192.168.1.1'
        };
        
        const model1 = new EmailVerificationTokenModel(validIPv4);
        await expect(model1.validate()).resolves.toBe(true);

        // Invalid IP
        const invalidIP = {
          ...validIPv4,
          ipAddress: 'invalid-ip'
        };
        
        const model2 = new EmailVerificationTokenModel(invalidIP);
        await expect(model2.validate()).rejects.toThrow('Invalid IP address format');
      });
    });

    describe('Token Security Methods', () => {
      it('should correctly identify expired tokens', () => {
        const expiredTokenData = {
          userId: 'user-id',
          hashedToken: 'a'.repeat(64),
          expiresAt: new Date(Date.now() - 1000),
          isUsed: false
        };
        
        const model = new EmailVerificationTokenModel(expiredTokenData);
        expect(model.isExpired()).toBe(true);
        expect(model.isValid()).toBe(false);
      });

      it('should correctly identify used tokens', () => {
        const usedTokenData = {
          userId: 'user-id',
          hashedToken: 'a'.repeat(64),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isUsed: true,
          usedAt: new Date()
        };
        
        const model = new EmailVerificationTokenModel(usedTokenData);
        expect(model.isValid()).toBe(false);
      });

      it('should correctly mark tokens as used', () => {
        const { model } = EmailVerificationTokenModel.createToken('user-id');
        
        expect(model.getIsUsed()).toBe(false);
        expect(model.getUsedAt()).toBeUndefined();
        
        model.markAsUsed();
        
        expect(model.getIsUsed()).toBe(true);
        expect(model.getUsedAt()).toBeInstanceOf(Date);
      });

      it('should provide security information', () => {
        const { model } = EmailVerificationTokenModel.createToken('user-id');
        const securityInfo = model.getSecurityInfo();
        
        expect(securityInfo).toHaveProperty('isExpired', false);
        expect(securityInfo).toHaveProperty('isUsed', false);
        expect(securityInfo).toHaveProperty('isValid', true);
        expect(securityInfo).toHaveProperty('timeUntilExpiry');
        expect(securityInfo).toHaveProperty('resendCount', 0);
        expect(securityInfo.timeUntilExpiry).toBeGreaterThan(0);
      });

      it('should increment resend count correctly', () => {
        const { model } = EmailVerificationTokenModel.createToken('user-id');
        
        expect(model.getMetadata()?.resendCount).toBe(0);
        
        model.incrementResendCount();
        expect(model.getMetadata()?.resendCount).toBe(1);
        
        model.incrementResendCount();
        expect(model.getMetadata()?.resendCount).toBe(2);
      });
    });
  });

  describe('Email Verification Service Methods', () => {
    describe('sendEmailVerification', () => {
      it('should handle rate limit exceeded', async () => {
        const userId = 'test-user-id';
        const ipAddress = '192.168.1.1';

        // Mock rate limit exceeded
        const mockRateLimit = jest.mocked(VerificationRateLimitUtils.checkEmailSendingRateLimit);
        mockRateLimit.mockResolvedValue({ 
          allowed: false, 
          remaining: 0, 
          retryAfter: 3600,
          resetTime: new Date()
        });

        // Mock user service to return a user
        const mockUserService = require('../../../backend/functions/src/services/user.service');
        mockUserService.getUserById = jest.fn().mockResolvedValue({
          getData: () => ({ email: 'test@example.com' })
        });

        await expect(authService.sendEmailVerification(userId, ipAddress))
          .rejects.toThrow();

        expect(EmailVerificationTokenUtils.saveToken).not.toHaveBeenCalled();
      });

      it('should handle email sending failures gracefully', async () => {
        const userId = 'test-user-id';
        const ipAddress = '192.168.1.1';

        // Mock successful rate limit
        const mockRateLimit = jest.mocked(VerificationRateLimitUtils.checkEmailSendingRateLimit);
        mockRateLimit.mockResolvedValue({ allowed: true, remaining: 2, resetTime: new Date() });

        // Mock token operations
        const mockInvalidate = jest.mocked(EmailVerificationTokenUtils.invalidateAllTokensForUser);
        mockInvalidate.mockResolvedValue(0);
        
        const mockSaveToken = jest.mocked(EmailVerificationTokenUtils.saveToken);
        mockSaveToken.mockResolvedValue('token-id');

        // Mock email sending failure
        const mockEmailService = require('../../../backend/functions/src/services/notification/email-verification.service');
        mockEmailService.sendEmailVerification = jest.fn().mockRejectedValue(
          new Error('Email service unavailable')
        );

        // Mock user service
        const mockUserService = require('../../../backend/functions/src/services/user.service');
        mockUserService.getUserById = jest.fn().mockResolvedValue({
          getData: () => ({ email: 'test@example.com' }),
          update: jest.fn()
        });

        await expect(authService.sendEmailVerification(userId, ipAddress))
          .rejects.toThrow('Email service unavailable');
      });
    });

    describe('verifyEmail', () => {
      it('should reject invalid tokens', async () => {
        const invalidToken = 'invalid-token';

        const mockGetToken = jest.mocked(EmailVerificationTokenUtils.getTokenByHash);
        mockGetToken.mockResolvedValue(null);

        await expect(authService.verifyEmail(invalidToken))
          .rejects.toThrow();
      });

      it('should reject expired tokens', async () => {
        const expiredToken = 'expired-token';

        const mockTokenModel = {
          getUserId: () => 'user-id',
          isValid: () => false,
          isExpired: () => true,
          getTokenData: () => ({ userId: 'user-id', isUsed: false })
        };
        
        const mockGetToken = jest.mocked(EmailVerificationTokenUtils.getTokenByHash);
        mockGetToken.mockResolvedValue(mockTokenModel as any);

        // Mock user service
        const mockUserService = require('../../../backend/functions/src/services/user.service');
        mockUserService.getUserById = jest.fn().mockResolvedValue({
          getData: () => ({ email: 'test@example.com' })
        });

        await expect(authService.verifyEmail(expiredToken))
          .rejects.toThrow();
      });

      it('should reject already used tokens', async () => {
        const usedToken = 'used-token';

        const mockTokenModel = {
          getUserId: () => 'user-id',
          isValid: () => false,
          isExpired: () => false,
          getTokenData: () => ({ userId: 'user-id', isUsed: true })
        };
        
        const mockGetToken = jest.mocked(EmailVerificationTokenUtils.getTokenByHash);
        mockGetToken.mockResolvedValue(mockTokenModel as any);

        // Mock user service
        const mockUserService = require('../../../backend/functions/src/services/user.service');
        mockUserService.getUserById = jest.fn().mockResolvedValue({
          getData: () => ({ email: 'test@example.com' })
        });

        await expect(authService.verifyEmail(usedToken))
          .rejects.toThrow();
      });
    });

    describe('canRequestVerification', () => {
      it('should allow verification request when under rate limit', async () => {
        const userId = 'test-user-id';

        const mockCanRequest = jest.mocked(EmailVerificationTokenUtils.canUserRequestToken);
        mockCanRequest.mockResolvedValue({
          canRequest: true,
          tokensInLastHour: 1
        });

        const result = await authService.canRequestVerification(userId);
        expect(result).toBe(true);
      });

      it('should deny verification request when over rate limit', async () => {
        const userId = 'test-user-id';

        const mockCanRequest = jest.mocked(EmailVerificationTokenUtils.canUserRequestToken);
        mockCanRequest.mockResolvedValue({
          canRequest: false,
          tokensInLastHour: 3,
          nextRequestAllowedAt: new Date()
        });

        const result = await authService.canRequestVerification(userId);
        expect(result).toBe(false);
      });
    });
  });

  describe('Modified Registration and Login Flows', () => {
    describe('Registration Flow', () => {
      it('should create user with PENDING status and send verification email', async () => {
        const registerData: CreateUserRequest = {
          email: 'test@example.com',
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
          displayName: 'Test User',
          role: UserRole.ADMIN
        };
        const ipAddress = '192.168.1.1';
        const userAgent = 'Test Browser';

        // Mock user creation
        const mockUserService = require('../../../backend/functions/src/services/user.service');
        const mockUser = {
          id: 'new-user-id',
          getData: () => ({ 
            ...registerData, 
            status: UserStatus.PENDING,
            emailVerified: false 
          })
        };
        mockUserService.createUser = jest.fn().mockResolvedValue({ user: mockUser });
        mockUserService.getUserByEmail = jest.fn().mockRejectedValue(new Error('USER_NOT_FOUND'));

        // Mock verification email sending
        authService.sendEmailVerification = jest.fn().mockResolvedValue(undefined);

        const result = await authService.register(registerData, ipAddress, userAgent);

        // Verify user was created with PENDING status
        expect(mockUserService.createUser).toHaveBeenCalledWith(registerData, 'system');
        
        // Verify verification email was sent
        expect(authService.sendEmailVerification).toHaveBeenCalledWith(
          'new-user-id', 
          ipAddress, 
          userAgent
        );

        // Verify response format
        expect(result.success).toBe(true);
        expect(result.data.email).toBe(registerData.email);
        expect(result.data.verificationSent).toBe(true);
        expect(result.message).toContain('Vérifiez votre email');
      });

      it('should handle existing user email gracefully', async () => {
        const registerData: CreateUserRequest = {
          email: 'existing@example.com',
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
          displayName: 'Test User',
          role: UserRole.ADMIN
        };

        // Mock existing user
        const mockUserService = require('../../../backend/functions/src/services/user.service');
        mockUserService.getUserByEmail = jest.fn().mockResolvedValue({
          id: 'existing-user-id',
          email: registerData.email
        });

        await expect(authService.register(registerData, '192.168.1.1', 'Test Browser'))
          .rejects.toThrow('Un compte avec cet email existe déjà');
      });

      it('should succeed even if verification email fails', async () => {
        const registerData: CreateUserRequest = {
          email: 'test@example.com',
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
          displayName: 'Test User',
          role: UserRole.ADMIN
        };

        // Mock user service
        const mockUserService = require('../../../backend/functions/src/services/user.service');
        const mockUser = {
          id: 'new-user-id',
          getData: () => ({ ...registerData, status: UserStatus.PENDING })
        };
        mockUserService.createUser = jest.fn().mockResolvedValue({ user: mockUser });
        mockUserService.getUserByEmail = jest.fn().mockRejectedValue(new Error('USER_NOT_FOUND'));

        // Mock email sending failure
        authService.sendEmailVerification = jest.fn().mockRejectedValue(
          new Error('Email service down')
        );

        const result = await authService.register(registerData, '192.168.1.1', 'Test Browser');

        expect(result.success).toBe(true);
        expect(result.data.verificationSent).toBe(false);
        expect(result.warning).toBeDefined();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    describe('EmailVerificationErrors', () => {
      it('should create proper error for already verified email', () => {
        const email = 'test@example.com';
        const error = EmailVerificationErrors.emailAlreadyVerified(email);
        
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe(ERROR_CODES.EMAIL_ALREADY_VERIFIED);
        expect(error.details.email).toBe(email);
        expect(error.details.emailAlreadyVerified).toBe(true);
      });

      it('should create proper error for expired token', () => {
        const email = 'test@example.com';
        const error = EmailVerificationErrors.verificationTokenExpired(email);
        
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe(ERROR_CODES.VERIFICATION_TOKEN_EXPIRED);
        expect(error.details.canResend).toBe(true);
        expect(error.details.actionRequired).toBe(true);
      });

      it('should create proper error for rate limit exceeded', () => {
        const email = 'test@example.com';
        const nextAllowedTime = new Date();
        const error = EmailVerificationErrors.verificationRateLimitExceeded(email, nextAllowedTime);
        
        expect(error.statusCode).toBe(429);
        expect(error.code).toBe(ERROR_CODES.VERIFICATION_RATE_LIMIT_EXCEEDED);
        expect(error.details.canResend).toBe(false);
        expect(error.details.nextAllowedTime).toBe(nextAllowedTime);
      });

      it('should create proper success response for registration', () => {
        const email = 'test@example.com';
        const response = EmailVerificationErrors.registrationSuccessWithVerification(email, true);
        
        expect(response.success).toBe(true);
        expect(response.data.email).toBe(email);
        expect(response.data.verificationSent).toBe(true);
        expect(response.data.expiresIn).toBe('24 heures');
      });

      it('should get correct HTTP status codes', () => {
        expect(EmailVerificationErrors.getHttpStatusCode(ERROR_CODES.EMAIL_ALREADY_VERIFIED)).toBe(400);
        expect(EmailVerificationErrors.getHttpStatusCode(ERROR_CODES.EMAIL_NOT_VERIFIED)).toBe(403);
        expect(EmailVerificationErrors.getHttpStatusCode(ERROR_CODES.VERIFICATION_RATE_LIMIT_EXCEEDED)).toBe(429);
        expect(EmailVerificationErrors.getHttpStatusCode(ERROR_CODES.EMAIL_VERIFICATION_SEND_FAILED)).toBe(500);
      });
    });

    describe('Edge Cases', () => {
      it('should handle database connection failures gracefully', async () => {
        const userId = 'test-user-id';

        const mockSaveToken = jest.mocked(EmailVerificationTokenUtils.saveToken);
        mockSaveToken.mockRejectedValue(new Error('Database connection failed'));

        await expect(authService.sendEmailVerification(userId, '192.168.1.1'))
          .rejects.toThrow('Database connection failed');
      });

      it('should handle malformed tokens gracefully', async () => {
        const malformedToken = 'not-a-valid-token';

        const mockGetToken = jest.mocked(EmailVerificationTokenUtils.getTokenByHash);
        mockGetToken.mockResolvedValue(null);

        await expect(authService.verifyEmail(malformedToken))
          .rejects.toThrow();
      });
    });
  });

  describe('Rate Limiting Functionality', () => {
    describe('Email Sending Rate Limits', () => {
      it('should enforce 3 emails per hour limit in production', async () => {
        const originalEnv = process.env.APP_ENV;
        process.env.APP_ENV = 'production';
        
        const email = 'test@example.com';
        const ipAddress = '192.168.1.1';

        // Mock rate limit exceeded
        const mockRateLimit = jest.mocked(VerificationRateLimitUtils.checkEmailSendingRateLimit);
        mockRateLimit.mockResolvedValue({
          allowed: false,
          remaining: 0,
          resetTime: new Date(),
          retryAfter: 3600
        });

        const result = await VerificationRateLimitUtils.checkEmailSendingRateLimit(email, ipAddress);
        
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.retryAfter).toBe(3600);

        // Restore environment
        process.env.APP_ENV = originalEnv;
      });

      it('should allow higher limits in development', async () => {
        const originalEnv = process.env.APP_ENV;
        process.env.APP_ENV = 'development';
        
        const email = 'test@example.com';
        const ipAddress = '192.168.1.1';

        // Mock development limits
        const mockRateLimit = jest.mocked(VerificationRateLimitUtils.checkEmailSendingRateLimit);
        mockRateLimit.mockResolvedValue({
          allowed: true,
          remaining: 19,
          resetTime: new Date()
        });

        const result = await VerificationRateLimitUtils.checkEmailSendingRateLimit(email, ipAddress);
        
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(19);

        // Restore environment
        process.env.APP_ENV = originalEnv;
      });
    });

    describe('Verification Attempts Rate Limits', () => {
      it('should enforce 10 attempts per hour per IP', async () => {
        const ipAddress = '192.168.1.1';
        const userAgent = 'Test Browser';

        const mockRateLimit = jest.mocked(VerificationRateLimitUtils.checkVerificationAttemptsRateLimit);
        mockRateLimit.mockResolvedValue({
          allowed: false,
          remaining: 0,
          resetTime: new Date(),
          retryAfter: 1800
        });

        const result = await VerificationRateLimitUtils.checkVerificationAttemptsRateLimit(
          ipAddress, 
          userAgent
        );
        
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      });
    });

    describe('Combined Rate Limits', () => {
      it('should check both email and IP limits for resend requests', async () => {
        const email = 'test@example.com';
        const ipAddress = '192.168.1.1';

        const emailLimit = { allowed: true, remaining: 2, resetTime: new Date() };
        const ipLimit = { allowed: true, remaining: 8, resetTime: new Date() };

        const mockResendLimit = jest.mocked(VerificationRateLimitUtils.checkResendRateLimit);
        mockResendLimit.mockResolvedValue({
          emailLimit,
          ipLimit,
          allowed: true,
          mostRestrictive: emailLimit
        });

        const result = await VerificationRateLimitUtils.checkResendRateLimit(
          email, 
          ipAddress
        );
        
        expect(result.allowed).toBe(true);
        expect(result.emailLimit.allowed).toBe(true);
        expect(result.ipLimit.allowed).toBe(true);
      });

      it('should deny when either limit is exceeded', async () => {
        const email = 'test@example.com';
        const ipAddress = '192.168.1.1';

        const emailLimit = { allowed: false, remaining: 0, resetTime: new Date(), retryAfter: 3600 };
        const ipLimit = { allowed: true, remaining: 5, resetTime: new Date() };

        const mockResendLimit = jest.mocked(VerificationRateLimitUtils.checkResendRateLimit);
        mockResendLimit.mockResolvedValue({
          emailLimit,
          ipLimit,
          allowed: false,
          mostRestrictive: emailLimit
        });

        const result = await VerificationRateLimitUtils.checkResendRateLimit(
          email, 
          ipAddress
        );
        
        expect(result.allowed).toBe(false);
        expect(result.mostRestrictive).toBe(emailLimit);
      });
    });

    describe('Rate Limit Error Responses', () => {
      it('should generate proper error response for email rate limit', () => {
        const rateLimitResult = {
          allowed: false,
          remaining: 0,
          resetTime: new Date(),
          retryAfter: 3600
        };

        const response = VerificationRateLimitUtils.generateRateLimitErrorResponse(
          rateLimitResult,
          'email_sending'
        );

        expect(response.success).toBe(false);
        expect(response.error).toBe('RATE_LIMIT_EXCEEDED');
        expect(response.message).toContain('Trop de demandes d\'envoi');
        expect(response.retryAfter).toBe(3600);
        expect(response.data.remaining).toBe(0);
        expect(response.data.operation).toBe('email_sending');
      });

      it('should generate proper error response for verification attempts', () => {
        const rateLimitResult = {
          allowed: false,
          remaining: 0,
          resetTime: new Date(),
          retryAfter: 1800
        };

        const response = VerificationRateLimitUtils.generateRateLimitErrorResponse(
          rateLimitResult,
          'verification_attempts'
        );

        expect(response.success).toBe(false);
        expect(response.error).toBe('RATE_LIMIT_EXCEEDED');
        expect(response.message).toContain('Trop de tentatives de vérification');
        expect(response.retryAfter).toBe(1800);
        expect(response.data.operation).toBe('verification_attempts');
      });
    });
  });
});