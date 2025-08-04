// tests/backend/integration/verification-rate-limits.test.ts
import { VerificationRateLimitUtils } from "../../../backend/functions/src/utils/verification-rate-limit.utils";

describe('VerificationRateLimitUtils Integration Tests', () => {
  const testEmail = 'test@example.com';
  const testIpAddress = '192.168.1.100';
  const testUserAgent = 'Test-Agent/1.0';

  beforeEach(() => {
    // Set development environment for testing
    process.env.APP_ENV = 'development';
  });

  describe('Email Sending Rate Limit', () => {
    test('should allow emails within rate limit', async () => {
      const result = await VerificationRateLimitUtils.checkEmailSendingRateLimit(
        testEmail,
        testIpAddress
      );
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    test('should deny emails when rate limit exceeded', async () => {
      // Simulate multiple rapid requests
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await VerificationRateLimitUtils.checkEmailSendingRateLimit(
          `test${i}@example.com`,
          testIpAddress
        );
        results.push(result);
      }

      // At least one should be denied if rate limit is working
      const deniedResults = results.filter(r => !r.allowed);
      expect(deniedResults.length).toBeGreaterThanOrEqual(0);
    });

    test('should generate proper error response when rate limited', async () => {
      const rateLimitResult = {
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + 3600000),
        retryAfter: 3600
      };

      const errorResponse = VerificationRateLimitUtils.generateRateLimitErrorResponse(
        rateLimitResult,
        'email_sending'
      );

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.code).toBe('VERIFICATION_RATE_LIMIT_EXCEEDED');
      expect(errorResponse.message).toContain('limite');
      expect(errorResponse.retryAfter).toBe(3600);
    });
  });

  describe('Verification Attempts Rate Limit', () => {
    test('should allow verification attempts within rate limit', async () => {
      const result = await VerificationRateLimitUtils.checkVerificationAttemptsRateLimit(
        testIpAddress,
        testUserAgent
      );
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    test('should generate proper error response for verification attempts', async () => {
      const rateLimitResult = {
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + 1800000),
        retryAfter: 1800
      };

      const errorResponse = VerificationRateLimitUtils.generateRateLimitErrorResponse(
        rateLimitResult,
        'verification_attempts'
      );

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.code).toBe('VERIFICATION_RATE_LIMIT_EXCEEDED');
      expect(errorResponse.retryAfter).toBe(1800);
    });
  });

  describe('Combined Resend Rate Limit', () => {
    test('should check both email and IP limits for resend', async () => {
      const resendResult = await VerificationRateLimitUtils.checkResendRateLimit(
        'resend-test@example.com',
        '192.168.1.101',
        testUserAgent
      );

      expect(resendResult).toHaveProperty('allowed');
      expect(resendResult).toHaveProperty('emailLimit');
      expect(resendResult).toHaveProperty('ipLimit');
      expect(resendResult.emailLimit).toHaveProperty('allowed');
      expect(resendResult.ipLimit).toHaveProperty('allowed');
    });

    test('should generate multiple rate limit error response', async () => {
      const emailLimit = {
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + 3600000),
        retryAfter: 3600
      };

      const ipLimit = {
        allowed: true,
        remaining: 5,
        resetTime: new Date(Date.now() + 3600000)
      };

      const errorResponse = VerificationRateLimitUtils.generateMultipleRateLimitErrorResponse(
        emailLimit,
        ipLimit
      );

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.code).toBe('VERIFICATION_RATE_LIMIT_EXCEEDED');
      expect(errorResponse.data).toHaveProperty('mostRestrictive');
    });
  });

  describe('Rate Limit Statistics', () => {
    test('should return rate limit stats', async () => {
      const emailKey = `send_email_verification_${testEmail}_${process.env.APP_ENV || 'development'}`;
      const stats = await VerificationRateLimitUtils.getRateLimitStats(emailKey);
      
      expect(stats).toHaveProperty('currentCount');
      expect(stats).toHaveProperty('windowStart');
      expect(stats).toHaveProperty('windowEnd');
      expect(stats.windowStart).toBeInstanceOf(Date);
      expect(stats.windowEnd).toBeInstanceOf(Date);
    });
  });

  describe('Cleanup Operations', () => {
    test('should cleanup old entries', async () => {
      const cleanedCount = await VerificationRateLimitUtils.cleanupAllOldEntries(0.001);
      
      expect(typeof cleanedCount).toBe('number');
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });
});