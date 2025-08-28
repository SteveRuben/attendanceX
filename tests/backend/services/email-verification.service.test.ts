// tests/backend/services/email-verification.service.test.ts

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EmailVerificationService } from '../../../backend/functions/src/services/notification/email-verification.service';
import { EmailVerificationUtils } from '../../../backend/functions/src/utils/email-verification.utils';
import { NotificationChannel, NotificationPriority, NotificationType } from '@attendance-x/shared';

// Mock des dépendances
jest.mock('../../../backend/functions/src/services/notification/notification.service');
jest.mock('../../../backend/functions/src/services/notification/TemplateService');
jest.mock('../../../backend/functions/src/config', () => ({
  collections: {
    notification_templates: {
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ exists: false })),
        set: jest.fn(() => Promise.resolve())
      }))
    }
  }
}));

// Mock des variables d'environnement
const originalEnv = process.env;

describe('EmailVerificationService', () => {
  let emailVerificationService: EmailVerificationService;
  let mockNotificationService: any;
  let mockTemplateService: any;

  beforeEach(() => {
    // Reset des mocks
    jest.clearAllMocks();
    
    // Configuration des variables d'environnement pour les tests
    process.env = {
      ...originalEnv,
      FRONTEND_URL: 'https://test.attendance-x.com',
      SUPPORT_EMAIL: 'test-support@attendance-x.com',
      APP_NAME: 'Test Attendance-X'
    };

    // Mock du NotificationService
    mockNotificationService = {
      sendNotification: jest.fn(() => Promise.resolve({
        id: 'test-notification-id',
        success: true
      })),
      getNotifications: jest.fn(() => Promise.resolve({
        notifications: []
      }))
    };

    // Mock du TemplateService
    mockTemplateService = {
      getEmailTemplate: jest.fn(() => Promise.resolve(null)),
      saveEmailTemplate: jest.fn(() => Promise.resolve()),
      validateTemplateVariables: jest.fn(() => []),
      processTemplate: jest.fn((template, variables) => {
        // Simple template processing pour les tests
        if (typeof template === 'string') {
          return template.replace(/{(\w+)}/g, (match, key) => variables[key] || match);
        }
        return String(template);
      })
    };

    // Injection des mocks
    emailVerificationService = new EmailVerificationService();
    (emailVerificationService as any).notificationService = mockNotificationService;
    (emailVerificationService as any).templateService = mockTemplateService;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sendEmailVerification', () => {
    const mockVerificationData = {
      userId: 'test-user-id',
      userName: 'Test User',
      email: 'test@example.com',
      token: 'a'.repeat(64), // Token de 64 caractères
      expirationHours: 24
    };

    it('should send email verification successfully', async () => {
      const result = await emailVerificationService.sendEmailVerification(mockVerificationData);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('test-notification-id');
      expect(result.error).toBeUndefined();

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
        userId: mockVerificationData.userId,
        type: NotificationType.EMAIL_VERIFICATION,
        title: expect.stringContaining('Test Attendance-X'),
        message: expect.stringContaining(mockVerificationData.userName),
        data: {
          email: mockVerificationData.email,
          token: mockVerificationData.token,
          verificationUrl: expect.stringContaining('verify-email'),
          expirationHours: 24
        },
        channels: [NotificationChannel.EMAIL],
        priority: NotificationPriority.HIGH,
        sentBy: 'system'
      });
    });

    it('should handle notification service errors', async () => {
      mockNotificationService.sendNotification.mockRejectedValue(new Error('Notification failed'));

      const result = await emailVerificationService.sendEmailVerification(mockVerificationData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Notification failed');
      expect(result.notificationId).toBeUndefined();
    });

    it('should use custom expiration hours', async () => {
      const customData = { ...mockVerificationData, expirationHours: 48 };
      
      await emailVerificationService.sendEmailVerification(customData);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expirationHours: 48
          })
        })
      );
    });

    it('should validate template variables', async () => {
      mockTemplateService.validateTemplateVariables.mockReturnValue(['missingVar']);

      await emailVerificationService.sendEmailVerification(mockVerificationData);

      expect(mockTemplateService.validateTemplateVariables).toHaveBeenCalled();
    });
  });

  describe('generateVerificationUrl', () => {
    const testToken = 'a'.repeat(64);

    it('should generate URL with default options', () => {
      const url = emailVerificationService.generateVerificationUrl(testToken);

      expect(url).toBe(`https://test.attendance-x.com/verify-email?token=${testToken}`);
    });

    it('should generate URL with custom base URL', () => {
      const customOptions = { baseUrl: 'https://custom.example.com' };
      const url = emailVerificationService.generateVerificationUrl(testToken, customOptions);

      expect(url).toBe(`https://custom.example.com/verify-email?token=${testToken}`);
    });

    it('should generate URL with custom route path', () => {
      const customOptions = { routePath: '/custom-verify' };
      const url = emailVerificationService.generateVerificationUrl(testToken, customOptions);

      expect(url).toBe(`https://test.attendance-x.com/custom-verify?token=${testToken}`);
    });

    it('should handle base URL with trailing slash', () => {
      const customOptions = { baseUrl: 'https://example.com/' };
      const url = emailVerificationService.generateVerificationUrl(testToken, customOptions);

      expect(url).toBe(`https://example.com/verify-email?token=${testToken}`);
    });

    it('should handle route path without leading slash', () => {
      const customOptions = { routePath: 'verify' };
      const url = emailVerificationService.generateVerificationUrl(testToken, customOptions);

      expect(url).toBe(`https://test.attendance-x.com/verify?token=${testToken}`);
    });

    it('should encode token properly', () => {
      const tokenWithSpecialChars = 'token+with/special=chars';
      const url = emailVerificationService.generateVerificationUrl(tokenWithSpecialChars);

      expect(url).toContain(encodeURIComponent(tokenWithSpecialChars));
    });
  });

  describe('getVerificationStats', () => {
    const timeRange = {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31')
    };

    it('should calculate stats correctly', async () => {
      const mockNotifications = [
        { delivered: true, status: 'SENT' },
        { delivered: true, status: 'SENT' },
        { delivered: false, status: 'FAILED' },
        { delivered: false, status: 'PENDING' }
      ];

      mockNotificationService.getNotifications.mockResolvedValue({
        notifications: mockNotifications
      });

      const stats = await emailVerificationService.getVerificationStats(timeRange);

      expect(stats).toEqual({
        totalSent: 4,
        totalDelivered: 2,
        totalFailed: 1,
        deliveryRate: 50
      });

      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith({
        type: NotificationType.EMAIL_VERIFICATION,
        dateRange: timeRange,
        limit: 1000
      });
    });

    it('should handle empty results', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        notifications: []
      });

      const stats = await emailVerificationService.getVerificationStats(timeRange);

      expect(stats).toEqual({
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        deliveryRate: 0
      });
    });

    it('should handle service errors', async () => {
      mockNotificationService.getNotifications.mockRejectedValue(new Error('Service error'));

      const stats = await emailVerificationService.getVerificationStats(timeRange);

      expect(stats).toEqual({
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        deliveryRate: 0
      });
    });
  });

  describe('formatExpirationTime', () => {
    it('should format hours correctly', () => {
      const service = emailVerificationService as any;
      
      expect(service.formatExpirationTime(1)).toBe('1 heure');
      expect(service.formatExpirationTime(2)).toBe('2 heures');
      expect(service.formatExpirationTime(12)).toBe('12 heures');
    });

    it('should format days correctly', () => {
      const service = emailVerificationService as any;
      
      expect(service.formatExpirationTime(24)).toBe('24 heures (1 jour)');
      expect(service.formatExpirationTime(48)).toBe('2 jours');
      expect(service.formatExpirationTime(72)).toBe('3 jours');
    });

    it('should format mixed days and hours', () => {
      const service = emailVerificationService as any;
      
      expect(service.formatExpirationTime(25)).toBe('1 jour et 1 heure');
      expect(service.formatExpirationTime(26)).toBe('1 jour et 2 heures');
      expect(service.formatExpirationTime(50)).toBe('2 jours et 2 heures');
    });
  });
});

describe('EmailVerificationUtils', () => {
  describe('validateBaseUrl', () => {
    it('should validate correct URLs', () => {
      expect(EmailVerificationUtils.validateBaseUrl('https://example.com')).toBe(true);
      expect(EmailVerificationUtils.validateBaseUrl('http://localhost:3000')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(EmailVerificationUtils.validateBaseUrl('not-a-url')).toBe(false);
      expect(EmailVerificationUtils.validateBaseUrl('ftp://example.com')).toBe(false);
      expect(EmailVerificationUtils.validateBaseUrl('')).toBe(false);
    });
  });

  describe('normalizeBaseUrl', () => {
    it('should add https protocol when missing', () => {
      expect(EmailVerificationUtils.normalizeBaseUrl('example.com')).toBe('https://example.com');
    });

    it('should remove trailing slash', () => {
      expect(EmailVerificationUtils.normalizeBaseUrl('https://example.com/')).toBe('https://example.com');
    });

    it('should preserve existing protocol', () => {
      expect(EmailVerificationUtils.normalizeBaseUrl('http://localhost:3000')).toBe('http://localhost:3000');
    });

    it('should throw error for empty URL', () => {
      expect(() => EmailVerificationUtils.normalizeBaseUrl('')).toThrow('Base URL is required');
    });
  });

  describe('normalizeRoutePath', () => {
    it('should add leading slash when missing', () => {
      expect(EmailVerificationUtils.normalizeRoutePath('verify')).toBe('/verify');
    });

    it('should remove trailing slash', () => {
      expect(EmailVerificationUtils.normalizeRoutePath('/verify/')).toBe('/verify');
    });

    it('should preserve root path', () => {
      expect(EmailVerificationUtils.normalizeRoutePath('/')).toBe('/');
    });

    it('should use default when empty', () => {
      expect(EmailVerificationUtils.normalizeRoutePath('')).toBe('/verify-email');
    });
  });

  describe('buildVerificationUrl', () => {
    const testToken = 'a'.repeat(64);

    it('should build complete URL', () => {
      const url = EmailVerificationUtils.buildVerificationUrl(
        'https://example.com',
        '/verify',
        testToken
      );

      expect(url).toBe(`https://example.com/verify?token=${testToken}`);
    });

    it('should handle additional parameters', () => {
      const url = EmailVerificationUtils.buildVerificationUrl(
        'https://example.com',
        '/verify',
        testToken,
        { redirect: '/dashboard', lang: 'fr' }
      );

      expect(url).toContain('token=' + testToken);
      expect(url).toContain('redirect=%2Fdashboard');
      expect(url).toContain('lang=fr');
    });
  });

  describe('validateTokenFormat', () => {
    it('should validate correct token format', () => {
      const validToken = 'a'.repeat(64);
      expect(EmailVerificationUtils.validateTokenFormat(validToken)).toBe(true);
    });

    it('should reject invalid token formats', () => {
      expect(EmailVerificationUtils.validateTokenFormat('too-short')).toBe(false);
      expect(EmailVerificationUtils.validateTokenFormat('a'.repeat(63))).toBe(false);
      expect(EmailVerificationUtils.validateTokenFormat('a'.repeat(65))).toBe(false);
      expect(EmailVerificationUtils.validateTokenFormat('invalid-chars-!')).toBe(false);
      expect(EmailVerificationUtils.validateTokenFormat('')).toBe(false);
    });
  });

  describe('formatExpirationTime', () => {
    it('should format various time periods', () => {
      expect(EmailVerificationUtils.formatExpirationTime(0)).toBe('immédiatement');
      expect(EmailVerificationUtils.formatExpirationTime(1)).toBe('1 heure');
      expect(EmailVerificationUtils.formatExpirationTime(24)).toBe('24 heures (1 jour)');
      expect(EmailVerificationUtils.formatExpirationTime(48)).toBe('2 jours');
      expect(EmailVerificationUtils.formatExpirationTime(25)).toBe('1 jour et 1 heure');
    });
  });

  describe('validateTemplateVariables', () => {
    it('should validate complete variables', () => {
      const variables = {
        userName: 'Test User',
        verificationUrl: 'https://example.com/verify?token=abc',
        expirationTime: '24 heures',
        supportEmail: 'support@example.com',
        appName: 'Test App'
      };

      const result = EmailVerificationUtils.validateTemplateVariables(variables);

      expect(result.isValid).toBe(true);
      expect(result.missingVariables).toEqual([]);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should detect missing variables', () => {
      const variables = {
        userName: 'Test User',
        // verificationUrl missing
        expirationTime: '24 heures',
        supportEmail: 'support@example.com',
        appName: 'Test App'
      };

      const result = EmailVerificationUtils.validateTemplateVariables(variables);

      expect(result.isValid).toBe(false);
      expect(result.missingVariables).toContain('verificationUrl');
    });

    it('should detect invalid variables', () => {
      const variables = {
        userName: '', // Empty string
        verificationUrl: 'invalid-url',
        expirationTime: '24 heures',
        supportEmail: 'support@example.com',
        appName: 'Test App'
      };

      const result = EmailVerificationUtils.validateTemplateVariables(variables);

      expect(result.isValid).toBe(false);
      expect(result.invalidVariables).toContain('userName');
      expect(result.invalidVariables).toContain('invalidVariables');
    });
  });
});