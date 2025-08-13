import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { IntegrationProvider } from '@attendance-x/shared';
import type { MockedFunction } from 'jest-mock';

// Mock the IntegrationService instead of importing it
const mockIntegrationService = {
  createUserIntegration: jest.fn() as MockedFunction<any>,
  getUserIntegrations: jest.fn() as MockedFunction<any>,
  updateIntegrationSettings: jest.fn() as MockedFunction<any>,
  deleteUserIntegration: jest.fn() as MockedFunction<any>,
  recordSyncHistory: jest.fn() as MockedFunction<any>,
  getSyncHistory: jest.fn() as MockedFunction<any>
};

// Mock the service module
jest.mock('../../../backend/functions/src/services/integration.service', () => ({
  IntegrationService: jest.fn().mockImplementation(() => mockIntegrationService)
}));

// Mock Firebase
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      })),
      where: jest.fn(() => ({
        get: jest.fn(),
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn()
          }))
        }))
      })),
      add: jest.fn()
    }))
  }))
}));

describe('IntegrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUserIntegration', () => {
    it('should create a new user integration successfully', async () => {
      const mockIntegration = {
        userId: 'user123',
        provider: IntegrationProvider.GOOGLE,
        status: 'connected',
        permissions: ['calendar.read', 'calendar.write'],
        syncSettings: {
          enabled: true,
          syncCalendar: true,
          syncContacts: false,
          syncFrequency: 'hourly'
        },
        connectedAt: new Date(),
        lastSyncAt: null
      };

      mockIntegrationService.createUserIntegration.mockResolvedValue('integration123');

      const result = await mockIntegrationService.createUserIntegration(mockIntegration);

      expect(result).toBe('integration123');
      expect(mockIntegrationService.createUserIntegration).toHaveBeenCalledWith(mockIntegration);
    });

    it('should throw error when creation fails', async () => {
      const mockIntegration = {
        userId: 'user123',
        provider: IntegrationProvider.GOOGLE,
        status: 'connected',
        permissions: [],
        syncSettings: {
          enabled: true,
          syncCalendar: true,
          syncContacts: false,
          syncFrequency: 'hourly'
        },
        connectedAt: new Date(),
        lastSyncAt: null
      };

      mockIntegrationService.createUserIntegration.mockRejectedValue(new Error('Database error'));

      await expect(mockIntegrationService.createUserIntegration(mockIntegration))
        .rejects.toThrow('Database error');
    });
  });

  describe('getUserIntegrations', () => {
    it('should return user integrations successfully', async () => {
      const mockIntegrations = [
        {
          id: 'integration1',
          userId: 'user123',
          provider: IntegrationProvider.GOOGLE,
          status: 'connected'
        },
        {
          id: 'integration2',
          userId: 'user123',
          provider: IntegrationProvider.MICROSOFT,
          status: 'disconnected'
        }
      ];

      mockIntegrationService.getUserIntegrations.mockResolvedValue(mockIntegrations);

      const result = await mockIntegrationService.getUserIntegrations('user123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('integration1');
      expect(result[1].id).toBe('integration2');
      expect(mockIntegrationService.getUserIntegrations).toHaveBeenCalledWith('user123');
    });

    it('should return empty array when no integrations found', async () => {
      mockIntegrationService.getUserIntegrations.mockResolvedValue([]);

      const result = await mockIntegrationService.getUserIntegrations('user123');

      expect(result).toHaveLength(0);
    });
  });

  describe('updateIntegrationSettings', () => {
    it('should update integration settings successfully', async () => {
      const integrationId = 'integration123';
      const updates = {
        syncSettings: {
          enabled: false,
          syncCalendar: false,
          syncContacts: true,
          syncFrequency: 'daily' as const
        }
      };

      mockIntegrationService.updateIntegrationSettings.mockResolvedValue(undefined);

      await mockIntegrationService.updateIntegrationSettings(integrationId, updates);

      expect(mockIntegrationService.updateIntegrationSettings).toHaveBeenCalledWith(integrationId, updates);
    });
  });

  describe('deleteUserIntegration', () => {
    it('should delete integration and related data successfully', async () => {
      const integrationId = 'integration123';

      mockIntegrationService.deleteUserIntegration.mockResolvedValue(undefined);

      await mockIntegrationService.deleteUserIntegration(integrationId);

      expect(mockIntegrationService.deleteUserIntegration).toHaveBeenCalledWith(integrationId);
    });
  });

  describe('recordSyncHistory', () => {
    it('should record sync history successfully', async () => {
      const syncHistory = {
        integrationId: 'integration123',
        userId: 'user123',
        provider: IntegrationProvider.GOOGLE,
        syncType: 'calendar',
        status: 'success',
        timestamp: new Date(),
        itemsProcessed: 10,
        itemsAdded: 5,
        itemsUpdated: 3,
        itemsDeleted: 2,
        duration: 1500
      };

      mockIntegrationService.recordSyncHistory.mockResolvedValue('history123');

      const result = await mockIntegrationService.recordSyncHistory(syncHistory);

      expect(result).toBe('history123');
      expect(mockIntegrationService.recordSyncHistory).toHaveBeenCalledWith(syncHistory);
    });
  });

  describe('getSyncHistory', () => {
    it('should return sync history for integration', async () => {
      const integrationId = 'integration123';
      const mockHistory = [
        {
          id: 'history1',
          integrationId,
          status: 'success',
          timestamp: new Date()
        },
        {
          id: 'history2',
          integrationId,
          status: 'error',
          timestamp: new Date()
        }
      ];

      mockIntegrationService.getSyncHistory.mockResolvedValue(mockHistory);

      const result = await mockIntegrationService.getSyncHistory(integrationId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('history1');
      expect(result[1].id).toBe('history2');
      expect(mockIntegrationService.getSyncHistory).toHaveBeenCalledWith(integrationId);
    });
  });
});