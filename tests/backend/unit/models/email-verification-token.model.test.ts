import { EmailVerificationTokenModel } from '../../../../backend/functions/src/models/email-verification-token.model';
import { EmailVerificationToken } from '@attendance-x/shared';
import * as crypto from 'crypto';

describe('EmailVerificationTokenModel', () => {
  let validTokenData: Partial<EmailVerificationToken>;

  beforeEach(() => {
    validTokenData = {
      userId: 'test-user-id',
      hashedToken: crypto.createHash('sha256').update('test-token').digest('hex'),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      isUsed: false,
      ipAddress: '192.168.1.1',
      userAgent: 'test-agent',
      metadata: {
        resendCount: 0,
        originalRequestIp: '192.168.1.1'
      }
    };
  });

  describe('createToken', () => {
    it('should create a token with cryptographically secure random bytes', () => {
      const { model, rawToken } = EmailVerificationTokenModel.createToken('user-123');
      
      expect(rawToken).toBeDefined();
      expect(rawToken).toHaveLength(64); // 32 bytes * 2 (hex)
      expect(model.getUserId()).toBe('user-123');
      expect(model.getIsUsed()).toBe(false);
      expect(model.getExpiresAt()).toBeInstanceOf(Date);
    });

    it('should create different tokens on each call', () => {
      const { rawToken: token1 } = EmailVerificationTokenModel.createToken('user-123');
      const { rawToken: token2 } = EmailVerificationTokenModel.createToken('user-123');
      
      expect(token1).not.toBe(token2);
    });

    it('should set expiration to 24 hours from now', () => {
      const beforeCreate = Date.now();
      const { model } = EmailVerificationTokenModel.createToken('user-123');
      const afterCreate = Date.now();
      
      const expiresAt = model.getExpiresAt().getTime();
      const expectedMin = beforeCreate + (24 * 60 * 60 * 1000);
      const expectedMax = afterCreate + (24 * 60 * 60 * 1000);
      
      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });

    it('should include IP address and user agent when provided', () => {
      const { model } = EmailVerificationTokenModel.createToken(
        'user-123', 
        '192.168.1.1', 
        'Mozilla/5.0'
      );
      
      expect(model.getIpAddress()).toBe('192.168.1.1');
      expect(model.getUserAgent()).toBe('Mozilla/5.0');
      expect(model.getMetadata()?.originalRequestIp).toBe('192.168.1.1');
    });
  });

  describe('hashToken', () => {
    it('should create SHA-256 hash of token', () => {
      const rawToken = 'test-token-123';
      const hashedToken = EmailVerificationTokenModel.hashToken(rawToken);
      
      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      expect(hashedToken).toBe(expectedHash);
      expect(hashedToken).toHaveLength(64); // SHA-256 hex length
    });

    it('should create different hashes for different tokens', () => {
      const hash1 = EmailVerificationTokenModel.hashToken('token1');
      const hash2 = EmailVerificationTokenModel.hashToken('token2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validation', () => {
    it('should validate a valid token', async () => {
      const model = new EmailVerificationTokenModel(validTokenData);
      
      await expect(model.validate()).resolves.toBe(true);
    });

    it('should reject token without userId', async () => {
      const invalidData = { ...validTokenData };
      delete invalidData.userId;
      const model = new EmailVerificationTokenModel(invalidData);
      
      await expect(model.validate()).rejects.toThrow('Invalid userId');
    });

    it('should reject token with invalid hashedToken length', async () => {
      const invalidData = { ...validTokenData, hashedToken: 'short-hash' };
      const model = new EmailVerificationTokenModel(invalidData);
      
      await expect(model.validate()).rejects.toThrow('Invalid hashedToken - must be 64 character SHA-256 hash');
    });

    it('should reject token with past expiration date for new tokens', async () => {
      const invalidData = { 
        ...validTokenData, 
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        isUsed: false 
      };
      const model = new EmailVerificationTokenModel(invalidData);
      
      await expect(model.validate()).rejects.toThrow('Token expiration date must be in the future');
    });

    it('should accept used token with past expiration date', async () => {
      const validData = { 
        ...validTokenData, 
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        isUsed: true,
        usedAt: new Date()
      };
      const model = new EmailVerificationTokenModel(validData);
      
      await expect(model.validate()).resolves.toBe(true);
    });

    it('should reject token with invalid IP address', async () => {
      const invalidData = { ...validTokenData, ipAddress: 'invalid-ip' };
      const model = new EmailVerificationTokenModel(invalidData);
      
      await expect(model.validate()).rejects.toThrow('Invalid IP address format');
    });
  });

  describe('token state management', () => {
    it('should correctly identify expired tokens', () => {
      const expiredData = { 
        ...validTokenData, 
        expiresAt: new Date(Date.now() - 1000) // 1 second ago
      };
      const model = new EmailVerificationTokenModel(expiredData);
      
      expect(model.isExpired()).toBe(true);
      expect(model.isValid()).toBe(false);
    });

    it('should correctly identify valid tokens', () => {
      const model = new EmailVerificationTokenModel(validTokenData);
      
      expect(model.isExpired()).toBe(false);
      expect(model.isValid()).toBe(true);
    });

    it('should correctly identify used tokens as invalid', () => {
      const usedData = { ...validTokenData, isUsed: true };
      const model = new EmailVerificationTokenModel(usedData);
      
      expect(model.isValid()).toBe(false);
    });

    it('should mark token as used', () => {
      const model = new EmailVerificationTokenModel(validTokenData);
      
      expect(model.getIsUsed()).toBe(false);
      expect(model.getUsedAt()).toBeUndefined();
      
      model.markAsUsed();
      
      expect(model.getIsUsed()).toBe(true);
      expect(model.getUsedAt()).toBeInstanceOf(Date);
    });

    it('should increment resend count', () => {
      const model = new EmailVerificationTokenModel(validTokenData);
      
      expect(model.getMetadata()?.resendCount).toBe(0);
      
      model.incrementResendCount();
      
      expect(model.getMetadata()?.resendCount).toBe(1);
    });
  });

  describe('security information', () => {
    it('should provide comprehensive security info for valid token', () => {
      const model = new EmailVerificationTokenModel(validTokenData);
      const securityInfo = model.getSecurityInfo();
      
      expect(securityInfo.isExpired).toBe(false);
      expect(securityInfo.isUsed).toBe(false);
      expect(securityInfo.isValid).toBe(true);
      expect(securityInfo.timeUntilExpiry).toBeGreaterThan(0);
      expect(securityInfo.resendCount).toBe(0);
    });

    it('should provide security info for expired token', () => {
      const expiredData = { 
        ...validTokenData, 
        expiresAt: new Date(Date.now() - 1000) // 1 second ago
      };
      const model = new EmailVerificationTokenModel(expiredData);
      const securityInfo = model.getSecurityInfo();
      
      expect(securityInfo.isExpired).toBe(true);
      expect(securityInfo.isValid).toBe(false);
      expect(securityInfo.timeUntilExpiry).toBeUndefined();
    });
  });

  describe('IP address validation', () => {
    it('should accept valid IPv4 addresses', async () => {
      const validIPs = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '8.8.8.8'];
      
      for (const ip of validIPs) {
        const data = { ...validTokenData, ipAddress: ip };
        const model = new EmailVerificationTokenModel(data);
        await expect(model.validate()).resolves.toBe(true);
      }
    });

    it('should accept valid IPv6 addresses', async () => {
      const validIPs = ['::1', '::', '2001:0db8:85a3:0000:0000:8a2e:0370:7334'];
      
      for (const ip of validIPs) {
        const data = { ...validTokenData, ipAddress: ip };
        const model = new EmailVerificationTokenModel(data);
        await expect(model.validate()).resolves.toBe(true);
      }
    });

    it('should reject invalid IP addresses', async () => {
      const invalidIPs = ['256.256.256.256', '192.168.1', 'not-an-ip', '192.168.1.1.1'];
      
      for (const ip of invalidIPs) {
        const data = { ...validTokenData, ipAddress: ip };
        const model = new EmailVerificationTokenModel(data);
        await expect(model.validate()).rejects.toThrow('Invalid IP address format');
      }
    });
  });
});