/**
 * Tests unitaires pour le service d'intégration API de présence
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { presenceIntegrationApi } from '../../../../frontend/src/services/api/presence-integration.api';
import { PresenceEntry, Employee } from '@attendance-x/shared';

// Mock fetch
global.fetch = vi.fn();

describe('PresenceIntegrationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as Mock).mockClear();
  });

  afterEach(() => {
    presenceIntegrationApi.cleanup();
  });

  describe('Clock In/Out Operations', () => {
    it('should successfully clock in an employee', async () => {
      const mockPresenceEntry: PresenceEntry = {
        id: 'presence-1',
        employeeId: 'emp-1',
        clockInTime: new Date(),
        location: { latitude: 48.8566, longitude: 2.3522 },
        status: 'present'
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPresenceEntry, success: true })
      });

      const result = await presenceIntegrationApi.clockIn('emp-1', {
        latitude: 48.8566,
        longitude: 2.3522
      });

      expect(fetch).toHaveBeenCalledWith('/api/presence/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: 'emp-1',
          location: { latitude: 48.8566, longitude: 2.3522 },
          timestamp: expect.any(Number)
        })
      });

      expect(result).toEqual(mockPresenceEntry);
    });

    it('should successfully clock out an employee', async () => {
      const mockPresenceEntry: PresenceEntry = {
        id: 'presence-1',
        employeeId: 'emp-1',
        clockInTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
        clockOutTime: new Date(),
        location: { latitude: 48.8566, longitude: 2.3522 },
        status: 'absent'
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPresenceEntry, success: true })
      });

      const result = await presenceIntegrationApi.clockOut('emp-1', {
        latitude: 48.8566,
        longitude: 2.3522
      });

      expect(result).toEqual(mockPresenceEntry);
    });

    it('should handle clock in API errors with retry', async () => {
      // Premier appel échoue avec erreur 500
      (fetch as Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'presence-1' }, success: true })
        });

      const result = await presenceIntegrationApi.clockIn('emp-1');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ id: 'presence-1' });
    });

    it('should fail after max retries', async () => {
      (fetch as Mock).mockRejectedValue(new Error('Persistent network error'));

      await expect(presenceIntegrationApi.clockIn('emp-1')).rejects.toThrow('Persistent network error');
      expect(fetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });

  describe('Break Operations', () => {
    it('should start a break successfully', async () => {
      const mockPresenceEntry: PresenceEntry = {
        id: 'presence-1',
        employeeId: 'emp-1',
        clockInTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        onBreak: true,
        status: 'on_break'
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPresenceEntry, success: true })
      });

      const result = await presenceIntegrationApi.startBreak('emp-1');

      expect(fetch).toHaveBeenCalledWith('/api/presence/start-break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: 'emp-1',
          timestamp: expect.any(Number)
        })
      });

      expect(result.onBreak).toBe(true);
    });

    it('should end a break successfully', async () => {
      const mockPresenceEntry: PresenceEntry = {
        id: 'presence-1',
        employeeId: 'emp-1',
        clockInTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        onBreak: false,
        status: 'present'
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPresenceEntry, success: true })
      });

      const result = await presenceIntegrationApi.endBreak('emp-1');
      expect(result.onBreak).toBe(false);
    });
  });

  describe('Data Retrieval', () => {
    it('should get current presence for an employee', async () => {
      const mockPresence: PresenceEntry = {
        id: 'presence-1',
        employeeId: 'emp-1',
        clockInTime: new Date(),
        status: 'present'
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPresence, success: true })
      });

      const result = await presenceIntegrationApi.getCurrentPresence('emp-1');
      expect(result).toEqual(mockPresence);
    });

    it('should return null when no current presence exists', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null, success: true })
      });

      const result = await presenceIntegrationApi.getCurrentPresence('emp-1');
      expect(result).toBeNull();
    });

    it('should get presence history for date range', async () => {
      const mockHistory: PresenceEntry[] = [
        {
          id: 'presence-1',
          employeeId: 'emp-1',
          clockInTime: new Date('2024-01-01T09:00:00Z'),
          clockOutTime: new Date('2024-01-01T17:00:00Z'),
          status: 'absent'
        },
        {
          id: 'presence-2',
          employeeId: 'emp-1',
          clockInTime: new Date('2024-01-02T09:15:00Z'),
          clockOutTime: new Date('2024-01-02T17:30:00Z'),
          status: 'absent'
        }
      ];

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockHistory, success: true })
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');
      
      const result = await presenceIntegrationApi.getPresenceHistory('emp-1', startDate, endDate);

      expect(fetch).toHaveBeenCalledWith(
        '/api/presence/history/emp-1?startDate=2024-01-01T00%3A00%3A00.000Z&endDate=2024-01-02T00%3A00%3A00.000Z'
      );
      expect(result).toEqual(mockHistory);
    });
  });

  describe('Offline Sync', () => {
    it('should sync offline data successfully', async () => {
      const offlineEntries = [
        {
          id: 'offline-1',
          type: 'clock-in',
          employeeId: 'emp-1',
          timestamp: Date.now() - 1000,
          synced: false
        }
      ];

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { synced: 1, failed: 0 }, success: true })
      });

      const result = await presenceIntegrationApi.syncOfflineData(offlineEntries);

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should get sync status', async () => {
      const mockSyncStatus = {
        lastSync: Date.now() - 60000,
        pendingCount: 2,
        failedCount: 0,
        status: 'synced' as const
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSyncStatus, success: true })
      });

      const result = await presenceIntegrationApi.getSyncStatus('emp-1');
      expect(result).toEqual(mockSyncStatus);
    });
  });

  describe('Team Management', () => {
    it('should get team presence data', async () => {
      const mockTeamPresence: PresenceEntry[] = [
        {
          id: 'presence-1',
          employeeId: 'emp-1',
          clockInTime: new Date(),
          status: 'present'
        },
        {
          id: 'presence-2',
          employeeId: 'emp-2',
          clockInTime: new Date(),
          status: 'present'
        }
      ];

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockTeamPresence, success: true })
      });

      const result = await presenceIntegrationApi.getTeamPresence('manager-1');
      expect(result).toEqual(mockTeamPresence);
    });

    it('should get presence anomalies', async () => {
      const mockAnomalies = [
        {
          id: 'anomaly-1',
          employeeId: 'emp-1',
          type: 'late_arrival',
          severity: 'medium',
          timestamp: new Date()
        }
      ];

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAnomalies, success: true })
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const result = await presenceIntegrationApi.getPresenceAnomalies('manager-1', startDate, endDate);
      expect(result).toEqual(mockAnomalies);
    });
  });

  describe('Health Check', () => {
    it('should perform health check successfully', async () => {
      const mockHealth = {
        status: 'healthy',
        timestamp: Date.now()
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockHealth, success: true })
      });

      const result = await presenceIntegrationApi.healthCheck();
      expect(result).toEqual(mockHealth);
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors properly', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Employee not found'
      });

      await expect(presenceIntegrationApi.getCurrentPresence('invalid-id'))
        .rejects.toThrow('HTTP 404: Not Found');
    });

    it('should handle network errors', async () => {
      (fetch as Mock).mockRejectedValueOnce(new TypeError('Network request failed'));

      await expect(presenceIntegrationApi.getCurrentPresence('emp-1'))
        .rejects.toThrow('Network request failed');
    });
  });

  describe('API Key Authentication', () => {
    it('should include API key in requests when set', async () => {
      presenceIntegrationApi.setApiKey('test-api-key');

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null, success: true })
      });

      await presenceIntegrationApi.getCurrentPresence('emp-1');

      expect(fetch).toHaveBeenCalledWith('/api/presence/current/emp-1', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key'
        }
      });
    });
  });
});