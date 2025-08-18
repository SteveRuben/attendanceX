import { multiLanguageNotificationService } from '../../../frontend/src/services/multiLanguageNotificationService';
import { apiService } from '../../../frontend/src/services/apiService';
import { NotificationType, NotificationChannel } from '@attendance-x/shared';

// Mock apiService
jest.mock('../../../frontend/src/services/apiService');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('MultiLanguageNotificationService', () => {
  const organizationId = 'org-123';
  const templateId = 'template-456';
  const userId = 'user-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectUserLanguage', () => {
    it('should detect user language from preferences', async () => {
      const mockDetection = {
        userId,
        detectedLanguage: 'fr',
        confidence: 1.0,
        source: 'user_preference' as const
      };

      mockApiService.post.mockResolvedValue({
        success: true,
        data: mockDetection
      });

      const result = await multiLanguageNotificationService.detectUserLanguage(
        userId, 
        'user@example.com', 
        '+33123456789',
        organizationId
      );

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/notifications/detect-language',
        { userId, email: 'user@example.com', phone: '+33123456789', organizationId }
      );
      expect(result).toEqual(mockDetection);
    });

    it('should fallback to system default when no preferences found', async () => {
      mockApiService.post.mockResolvedValue({
        success: false,
        data: null
      });

      const result = await multiLanguageNotificationService.detectUserLanguage(
        undefined, 
        'unknown@example.com'
      );

      expect(result).toEqual({
        detectedLanguage: 'fr',
        confidence: 0,
        source: 'system_default'
      });
    });
  });

  describe('getTemplateInLanguage', () => {
    it('should fetch template in specified language', async () => {
      const mockTemplate = {
        id: templateId,
        name: 'Event Reminder',
        type: NotificationType.EVENT_REMINDER,
        subject: 'Rappel d\'événement',
        content: 'Votre événement commence bientôt',
        language: 'fr',
        variables: ['eventTitle', 'eventDate'],
        channels: [NotificationChannel.EMAIL],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        version: 1
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockTemplate
      });

      const result = await multiLanguageNotificationService.getTemplateInLanguage(
        templateId, 
        'fr', 
        'en'
      );

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/notifications/templates/${templateId}`,
        { params: { language: 'fr', fallbackLanguage: 'en' } }
      );
      expect(result).toEqual(mockTemplate);
    });

    it('should throw error when template not found', async () => {
      mockApiService.get.mockResolvedValue({
        success: false,
        data: null
      });

      await expect(
        multiLanguageNotificationService.getTemplateInLanguage(templateId, 'fr')
      ).rejects.toThrow('Template not found');
    });
  });

  describe('createMultiLanguageTemplate', () => {
    it('should create multi-language template', async () => {
      const templateData = {
        organizationId,
        type: NotificationType.EVENT_REMINDER,
        name: 'Event Reminder',
        translations: {
          fr: {
            subject: 'Rappel d\'événement',
            content: 'Votre événement {{eventTitle}} commence le {{eventDate}}'
          },
          en: {
            subject: 'Event Reminder',
            content: 'Your event {{eventTitle}} starts on {{eventDate}}'
          }
        },
        defaultLanguage: 'fr',
        variables: ['eventTitle', 'eventDate'],
        channels: [NotificationChannel.EMAIL],
        isActive: true
      };

      const mockCreatedTemplate = {
        baseTemplateId: 'base-123',
        ...templateData
      };

      mockApiService.post.mockResolvedValue({
        success: true,
        data: mockCreatedTemplate
      });

      const result = await multiLanguageNotificationService.createMultiLanguageTemplate(templateData);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/notifications/templates/multilanguage',
        templateData
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedTemplate);
    });
  });

  describe('sendNotificationWithLanguageDetection', () => {
    it('should send notifications with automatic language detection', async () => {
      const request = {
        type: NotificationType.EVENT_REMINDER,
        recipients: [
          { userId: 'user-1', email: 'user1@example.com' },
          { userId: 'user-2', email: 'user2@example.com', preferredLanguage: 'en' },
          { email: 'user3@example.com', phone: '+33123456789' }
        ],
        templateId,
        variables: { eventTitle: 'Team Meeting', eventDate: '2024-12-01' },
        channels: [NotificationChannel.EMAIL],
        organizationId,
        fallbackLanguage: 'en'
      };

      // Mock language detection for recipients without explicit preference
      mockApiService.post
        .mockResolvedValueOnce({
          success: true,
          data: { detectedLanguage: 'fr', confidence: 0.8, source: 'user_preference' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { detectedLanguage: 'fr', confidence: 0.5, source: 'organization_default' }
        });

      // Mock template fetching
      mockApiService.get
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: templateId,
            subject: 'Rappel d\'événement',
            content: 'Votre événement {{eventTitle}} commence le {{eventDate}}',
            language: 'fr'
          }
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: templateId,
            subject: 'Event Reminder',
            content: 'Your event {{eventTitle}} starts on {{eventDate}}',
            language: 'en'
          }
        });

      // Mock notification sending
      mockApiService.post
        .mockResolvedValueOnce({ success: true, data: { sent: true } })
        .mockResolvedValueOnce({ success: true, data: { sent: true } });

      const result = await multiLanguageNotificationService.sendNotificationWithLanguageDetection(request);

      expect(result.totalRecipients).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.languageBreakdown).toHaveLength(2); // fr and en
    });

    it('should handle template not found gracefully', async () => {
      const request = {
        type: NotificationType.EVENT_REMINDER,
        recipients: [{ userId: 'user-1', preferredLanguage: 'de' }],
        templateId,
        channels: [NotificationChannel.EMAIL],
        organizationId
      };

      // Mock template not found
      mockApiService.get.mockRejectedValue(new Error('Template not found'));

      // Mock notification sending with fallback
      mockApiService.post.mockResolvedValue({ success: true, data: { sent: true } });

      const result = await multiLanguageNotificationService.sendNotificationWithLanguageDetection(request);

      expect(result.totalRecipients).toBe(1);
      expect(result.successful).toBe(1);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should fetch supported languages for organization', async () => {
      const mockLanguageConfig = {
        supported: ['fr', 'en', 'es'],
        default: 'fr',
        fallback: 'en'
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockLanguageConfig
      });

      const result = await multiLanguageNotificationService.getSupportedLanguages(organizationId);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/notifications/languages/${organizationId}`
      );
      expect(result).toEqual(mockLanguageConfig);
    });

    it('should return default config when API fails', async () => {
      mockApiService.get.mockResolvedValue({
        success: false,
        data: null
      });

      const result = await multiLanguageNotificationService.getSupportedLanguages(organizationId);

      expect(result).toEqual({
        supported: ['fr', 'en'],
        default: 'fr',
        fallback: 'fr'
      });
    });
  });

  describe('previewNotificationInLanguages', () => {
    it('should generate previews in multiple languages', async () => {
      const variables = { eventTitle: 'Team Meeting', eventDate: '2024-12-01' };
      const languages = ['fr', 'en'];

      // Mock template fetching for each language
      mockApiService.get
        .mockResolvedValueOnce({
          success: true,
          data: {
            subject: 'Rappel: {{eventTitle}}',
            content: 'Votre événement {{eventTitle}} commence le {{eventDate}}',
            htmlContent: '<p>Votre événement <strong>{{eventTitle}}</strong> commence le {{eventDate}}</p>'
          }
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            subject: 'Reminder: {{eventTitle}}',
            content: 'Your event {{eventTitle}} starts on {{eventDate}}',
            htmlContent: '<p>Your event <strong>{{eventTitle}}</strong> starts on {{eventDate}}</p>'
          }
        });

      const result = await multiLanguageNotificationService.previewNotificationInLanguages(
        templateId,
        variables,
        languages
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        language: 'fr',
        subject: 'Rappel: Team Meeting',
        content: 'Votre événement Team Meeting commence le 2024-12-01',
        htmlContent: '<p>Votre événement <strong>Team Meeting</strong> commence le 2024-12-01</p>',
        success: true
      });
      expect(result[1]).toEqual({
        language: 'en',
        subject: 'Reminder: Team Meeting',
        content: 'Your event Team Meeting starts on 2024-12-01',
        htmlContent: '<p>Your event <strong>Team Meeting</strong> starts on 2024-12-01</p>',
        success: true
      });
    });

    it('should handle template fetch errors', async () => {
      const variables = { eventTitle: 'Test Event' };
      const languages = ['fr', 'de'];

      // Mock successful fetch for French, error for German
      mockApiService.get
        .mockResolvedValueOnce({
          success: true,
          data: { subject: 'Test', content: 'Content' }
        })
        .mockRejectedValueOnce(new Error('Template not found'));

      const result = await multiLanguageNotificationService.previewNotificationInLanguages(
        templateId,
        variables,
        languages
      );

      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(false);
      expect(result[1].error).toBe('Template not found');
    });
  });

  describe('getLanguageUsageStats', () => {
    it('should fetch language usage statistics', async () => {
      const mockStats = {
        totalNotifications: 1000,
        byLanguage: {
          fr: 600,
          en: 300,
          es: 100
        },
        byChannel: {
          email: { fr: 400, en: 200, es: 50 },
          sms: { fr: 200, en: 100, es: 50 }
        },
        detectionSources: {
          user_preference: 700,
          organization_default: 200,
          system_default: 100
        }
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockStats
      });

      const timeframe = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      const result = await multiLanguageNotificationService.getLanguageUsageStats(
        organizationId,
        timeframe
      );

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/notifications/stats/languages/${organizationId}`,
        { params: timeframe }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
    });
  });

  describe('validateMultiLanguageTemplate', () => {
    it('should validate template and return validation results', async () => {
      const template = {
        name: 'Test Template',
        type: NotificationType.EVENT_REMINDER,
        translations: {
          fr: { subject: 'Test', content: 'Contenu {{variable}}' },
          en: { subject: 'Test', content: 'Content {{variable}}' }
        },
        variables: ['variable']
      };

      const mockValidation = {
        valid: true,
        errors: [],
        warnings: [
          {
            language: 'fr',
            field: 'content',
            message: 'Consider adding more context'
          }
        ]
      };

      mockApiService.post.mockResolvedValue({
        success: true,
        data: mockValidation
      });

      const result = await multiLanguageNotificationService.validateMultiLanguageTemplate(template);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/notifications/templates/validate',
        template
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockValidation);
    });
  });

  describe('exportTemplates', () => {
    it('should export templates and trigger download', async () => {
      const mockBlob = new Blob(['template data'], { type: 'application/json' });
      
      // Mock URL and DOM methods
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();
      
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
        remove: jest.fn(),
        setAttribute: jest.fn()
      };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation();
      jest.spyOn(document.body, 'removeChild').mockImplementation();

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockBlob
      });

      const options = {
        languages: ['fr', 'en'],
        format: 'json' as const
      };

      const result = await multiLanguageNotificationService.exportTemplates(organizationId, options);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/notifications/templates/export/${organizationId}`,
        {
          params: options,
          responseType: 'blob'
        }
      );
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'notification-templates.json');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });
});