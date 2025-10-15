// tests/frontend/unit/utils/validation.verification.test.ts
import { validateEmail, validateVerificationToken, validateResendRequest } from '../utils/validation';

describe('Validation Utils - Email Verification', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toEqual({ isValid: true });
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        '   ',
        'invalid-email',
        'test@',
        '@example.com',
        'test..test@example.com',
        'test@example',
        'test@.com',
        'test@example.',
        'test space@example.com'
      ];

      invalidEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should provide specific error messages for different validation failures', () => {
      expect(validateEmail('')).toEqual({
        isValid: false,
        error: 'Email address is required'
      });

      expect(validateEmail('   ')).toEqual({
        isValid: false,
        error: 'Email address is required'
      });

      expect(validateEmail('invalid-email')).toEqual({
        isValid: false,
        error: 'Please enter a valid email address'
      });

      expect(validateEmail('test@')).toEqual({
        isValid: false,
        error: 'Please enter a valid email address'
      });
    });

    it('should normalize email addresses', () => {
      const result = validateEmail('  TEST@EXAMPLE.COM  ');
      expect(result.isValid).toBe(true);
      expect(result.normalizedEmail).toBe('test@example.com');
    });
  });

  describe('validateVerificationToken', () => {
    it('should validate correct verification tokens', () => {
      const validTokens = [
        'abc123def456',
        'token-with-dashes',
        'token_with_underscores',
        'UPPERCASE_TOKEN',
        'mixedCaseToken123',
        'a'.repeat(32), // 32 character token
        'a'.repeat(64)  // 64 character token
      ];

      validTokens.forEach(token => {
        expect(validateVerificationToken(token)).toEqual({ isValid: true });
      });
    });

    it('should reject invalid verification tokens', () => {
      const invalidTokens = [
        '',
        '   ',
        'short',
        'token with spaces',
        'token@with#special!chars',
        'a'.repeat(5), // Too short
        null,
        undefined
      ];

      invalidTokens.forEach(token => {
        const result = validateVerificationToken(token as any);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should provide specific error messages for token validation failures', () => {
      expect(validateVerificationToken('')).toEqual({
        isValid: false,
        error: 'Verification token is required'
      });

      expect(validateVerificationToken('   ')).toEqual({
        isValid: false,
        error: 'Verification token is required'
      });

      expect(validateVerificationToken('short')).toEqual({
        isValid: false,
        error: 'Invalid verification token format'
      });

      expect(validateVerificationToken('token with spaces')).toEqual({
        isValid: false,
        error: 'Invalid verification token format'
      });
    });

    it('should normalize verification tokens', () => {
      const result = validateVerificationToken('  TOKEN123  ');
      expect(result.isValid).toBe(true);
      expect(result.normalizedToken).toBe('TOKEN123');
    });
  });

  describe('validateResendRequest', () => {
    it('should validate correct resend requests', () => {
      const validRequests = [
        { email: 'test@example.com' },
        { email: 'user.name@domain.co.uk' },
        { email: 'user+tag@example.org' }
      ];

      validRequests.forEach(request => {
        expect(validateResendRequest(request)).toEqual({ isValid: true });
      });
    });

    it('should reject invalid resend requests', () => {
      const invalidRequests = [
        {},
        { email: '' },
        { email: '   ' },
        { email: 'invalid-email' },
        { email: 'test@' },
        null,
        undefined
      ];

      invalidRequests.forEach(request => {
        const result = validateResendRequest(request as any);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should provide specific error messages for resend request validation failures', () => {
      expect(validateResendRequest({})).toEqual({
        isValid: false,
        error: 'Email address is required'
      });

      expect(validateResendRequest({ email: '' })).toEqual({
        isValid: false,
        error: 'Email address is required'
      });

      expect(validateResendRequest({ email: 'invalid-email' })).toEqual({
        isValid: false,
        error: 'Please enter a valid email address'
      });
    });

    it('should normalize resend request data', () => {
      const result = validateResendRequest({ email: '  TEST@EXAMPLE.COM  ' });
      expect(result.isValid).toBe(true);
      expect(result.normalizedData).toEqual({ email: 'test@example.com' });
    });
  });

  describe('edge cases and security', () => {
    it('should handle extremely long email addresses', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email address is too long');
    });

    it('should handle extremely long verification tokens', () => {
      const longToken = 'a'.repeat(1000);
      const result = validateVerificationToken(longToken);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Verification token is too long');
    });

    it('should sanitize input to prevent injection attacks', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>@example.com',
        'test@example.com<script>',
        'javascript:alert(1)@example.com'
      ];

      maliciousInputs.forEach(input => {
        const result = validateEmail(input);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Please enter a valid email address');
      });
    });

    it('should handle unicode characters in email addresses', () => {
      const unicodeEmails = [
        'tëst@example.com',
        'test@exämple.com',
        'тест@example.com'
      ];

      unicodeEmails.forEach(email => {
        const result = validateEmail(email);
        // Depending on implementation, these might be valid or invalid
        expect(result.isValid).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
      });
    });
  });

  describe('performance', () => {
    it('should validate emails efficiently for large batches', () => {
      const emails = Array.from({ length: 1000 }, (_, i) => `user${i}@example.com`);
      
      const startTime = Date.now();
      emails.forEach(email => validateEmail(email));
      const endTime = Date.now();
      
      // Should complete within reasonable time (less than 100ms for 1000 emails)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should validate tokens efficiently for large batches', () => {
      const tokens = Array.from({ length: 1000 }, (_, i) => `token${i}${'a'.repeat(20)}`);
      
      const startTime = Date.now();
      tokens.forEach(token => validateVerificationToken(token));
      const endTime = Date.now();
      
      // Should complete within reasonable time (less than 50ms for 1000 tokens)
      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});