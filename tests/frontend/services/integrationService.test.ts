import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { integrationService } from '../../../frontend/src/services/integrationService';
import { IntegrationProvider } from '@attendance-x/shared';

// Mock API service
jest.mock('../../../frontend/src/services/apiService', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

const mockApiService = require('../../../frontend/src/services/apiService').apiService;

describe('IntegrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserIntegrations', () => {
    it('should fetch user integrations successfully', async () => {
      const mockIntegrations = [
        {
          id: 'integration1',
          provider: IntegrationProvider.GOOGLE,
          status: 'connected',
          permissions: ['calendar.read']
        },
        {
          id: 'integration2',
          provider: IntegrationProvider.MICROSOFT,
          status: 'disconnected',
          permissions: []
        }
      ];

      mockApiService.get.mockResolvedValue({ data: mockIntegrations });

      const result = await integrationService.getUserIntegrations();

      expect(result).toEqual(mockIntegrations);
      expect(mockApiService.get).toHaveBeenCalledWith('/api/user/integrations?');
    });

    it('should handle API errors', async () => {
      mockApiService.get.mockRejectedValue(new Error('API Error'));

      await expect(integrationService.getUserIntegrations())
        .rejects.toThrow('API Error');
    });
  });

  describe('initiateOAuth', () => {
    it('should initiate OAuth flow successfully', async () => {
      const mockResponse = {
        authUrl: 'https://oauth.example.com/auth',
        state: 'state123'
      };

      mockApiService.post.mockResolvedValue({ data: mockResponse });

      const result = await integrationService.initiateOAuth(
        IntegrationProvider.GOOGLE,
        { scopes: ['calendar', 'contacts'] }
      );

      expect(result).toEqual(mockResponse);
      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/user/integrations/${IntegrationProvider.GOOGLE}/connect`,
        { 
          scopes: ['calendar', 'contacts'],
          redirectUri: `${window.location.origin}/oauth/callback`
        }
      );
    });
  });

  describe('completeOAuth', () => {
    it('should handle OAuth callback successfully', async () => {
      const mockIntegration = {
        id: 'integration123',
        provider: IntegrationProvider.GOOGLE,
        status: 'connected'
      };

      mockApiService.post.mockResolvedValue({ data: mockIntegration });

      const result = await integrationService.completeOAuth(
        IntegrationProvider.GOOGLE,
        { code: 'auth_code_123', state: 'state_123' }
      );

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/user/integrations/${IntegrationProvider.GOOGLE}/callback`,
        { code: 'auth_code_123', state: 'state_123' }
      );
    });

    it('should handle OAuth callback errors', async () => {
      mockApiService.post.mockRejectedValue(new Error('Invalid authorization code'));

      await expect(
        integrationService.completeOAuth(
          IntegrationProvider.GOOGLE,
          { code: 'invalid_code', state: 'state_123' }
        )
      ).rejects.toThrow('Invalid authorization code');
    });
  });

  describe('updateSyncSettings', () => {
    it('should update integration settings successfully', async () => {
      const integrationId = 'integration123';
      const settings = {
        calendar: true,
        contacts: false,
        autoSync: true,
        syncFrequency: 60
      };

      mockApiService.put.mockResolvedValue({ data: { success: true } });

      await integrationService.updateSyncSettings(integrationId, settings);

      expect(mockApiService.put).toHaveBeenCalledWith(
        `/api/user/integrations/${integrationId}/settings`,
        { syncSettings: settings }
      );
    });
  });

  describe('disconnectIntegration', () => {
    it('should disconnect integration successfully', async () => {
      const integrationId = 'integration123';

      mockApiService.delete.mockResolvedValue({ data: { success: true } });

      await integrationService.disconnectIntegration(integrationId);

      expect(mockApiService.delete).toHaveBeenCalledWith(
        `/api/user/integrations/${integrationId}`
      );
    });
  });

  describe('getSyncHistory', () => {
    it('should fetch sync history successfully', async () => {
      const integrationId = 'integration123';
      const mockHistory = {
        history: [
          {
            id: 'history1',
            syncType: 'calendar',
            status: 'success',
            startedAt: new Date().toISOString()
          },
          {
            id: 'history2',
            syncType: 'contacts',
            status: 'error',
            startedAt: new Date().toISOString()
          }
        ],
        total: 2,
        hasMore: false
      };

      mockApiService.get.mockResolvedValue({ data: mockHistory });

      const result = await integrationService.getSyncHistory(integrationId);

      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/user/integrations/${integrationId}/history?`
      );
    });
  });

  describe('triggerSync', () => {
    it('should trigger manual sync successfully', async () => {
      const integrationId = 'integration123';

      mockApiService.post.mockResolvedValue({ 
        data: { 
          syncId: 'sync123',
          status: 'started' 
        } 
      });

      const result = await integrationService.triggerSync(integrationId, { syncType: 'full' });

      expect(result.syncId).toBe('sync123');
      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/user/integrations/${integrationId}/sync`,
        { syncType: 'full' }
      );
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const integrationId = 'integration123';
      const mockResult = {
        success: true,
        message: 'Connection successful'
      };

      mockApiService.post.mockResolvedValue({ data: mockResult });

      const result = await integrationService.testConnection(integrationId);

      expect(result.success).toBe(true);
      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/user/integrations/${integrationId}/test`
      );
    });
  });

  describe('getIntegrationStats', () => {
    it('should fetch integration stats successfully', async () => {
      const mockStats = {
        totalIntegrations: 5,
        connectedIntegrations: 3,
        totalSyncs: 150,
        successfulSyncs: 145,
        failedSyncs: 5,
        lastSyncAt: new Date().toISOString()
      };

      mockApiService.get.mockResolvedValue({ data: mockStats });

      const result = await integrationService.getIntegrationStats();

      expect(result.totalIntegrations).toBe(5);
      expect(mockApiService.get).toHaveBeenCalledWith('/api/user/integrations/stats');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const integrationId = 'integration123';
      const mockIntegration = {
        id: integrationId,
        provider: IntegrationProvider.GOOGLE,
        status: 'connected'
      };

      mockApiService.post.mockResolvedValue({ data: mockIntegration });

      const result = await integrationService.refreshTokens(integrationId);

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/user/integrations/${integrationId}/refresh`
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockApiService.get.mockRejectedValue(new Error('Network Error'));

      await expect(integrationService.getUserIntegrations())
        .rejects.toThrow('Network Error');
    });

    it('should handle API response errors', async () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            error: 'Bad Request',
            message: 'Invalid parameters'
          }
        }
      };

      mockApiService.post.mockRejectedValue(apiError);

      await expect(
        integrationService.initiateOAuth(IntegrationProvider.GOOGLE, {})
      ).rejects.toEqual(apiError);
    });
  });
});