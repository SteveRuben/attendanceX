/**
 * Tests unitaires pour le hook usePresence
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePresence } from '../../../../frontend/src/hooks/usePresence';
import { presenceIntegrationApi } from '../../../../frontend/src/services/api/presence-integration.api';
import { PresenceEntry } from '@attendance-x/shared';

// Mock du service API
vi.mock('../../../../frontend/src/services/api/presence-integration.api', () => ({
  presenceIntegrationApi: {
    clockIn: vi.fn(),
    clockOut: vi.fn(),
    startBreak: vi.fn(),
    endBreak: vi.fn(),
    getCurrentPresence: vi.fn(),
    getPresenceHistory: vi.fn(),
    connectRealTime: vi.fn(),
    disconnectRealTime: vi.fn()
  }
}));

// Mock du hook useAuth
vi.mock('../../../../frontend/src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', employeeId: 'emp-1' }
  })
}));

describe('usePresence Hook', () => {
  const mockPresenceEntry: PresenceEntry = {
    id: 'presence-1',
    employeeId: 'emp-1',
    clockInTime: new Date(),
    status: 'present'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => usePresence());

      expect(result.current.currentPresence).toBeNull();
      expect(result.current.todayPresence).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Clock In/Out Operations', () => {
    it('should handle clock in successfully', async () => {
      (presenceIntegrationApi.clockIn as Mock).mockResolvedValueOnce(mockPresenceEntry);
      (presenceIntegrationApi.getCurrentPresence as Mock).mockResolvedValueOnce(mockPresenceEntry);

      const { result } = renderHook(() => usePresence());

      await act(async () => {
        await result.current.clockIn({ latitude: 48.8566, longitude: 2.3522 });
      });

      expect(presenceIntegrationApi.clockIn).toHaveBeenCalledWith('emp-1', {
        latitude: 48.8566,
        longitude: 2.3522
      });
      expect(result.current.currentPresence).toEqual(mockPresenceEntry);
      expect(result.current.error).toBeNull();
    });

    it('should handle clock in error', async () => {
      const error = new Error('Clock in failed');
      (presenceIntegrationApi.clockIn as Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => usePresence());

      await act(async () => {
        await result.current.clockIn();
      });

      expect(result.current.error).toBe('Clock in failed');
      expect(result.current.currentPresence).toBeNull();
    });

    it('should handle clock out successfully', async () => {
      const clockedOutEntry = {
        ...mockPresenceEntry,
        clockOutTime: new Date(),
        status: 'absent'
      };

      (presenceIntegrationApi.clockOut as Mock).mockResolvedValueOnce(clockedOutEntry);
      (presenceIntegrationApi.getCurrentPresence as Mock).mockResolvedValueOnce(null);

      const { result } = renderHook(() => usePresence());

      await act(async () => {
        await result.current.clockOut({ latitude: 48.8566, longitude: 2.3522 });
      });

      expect(presenceIntegrationApi.clockOut).toHaveBeenCalledWith('emp-1', {
        latitude: 48.8566,
        longitude: 2.3522
      });
      expect(result.current.currentPresence).toBeNull();
    });

    it('should show loading state during clock operations', async () => {
      let resolveClockIn: (value: any) => void;
      const clockInPromise = new Promise(resolve => {
        resolveClockIn = resolve;
      });

      (presenceIntegrationApi.clockIn as Mock).mockReturnValueOnce(clockInPromise);

      const { result } = renderHook(() => usePresence());

      act(() => {
        result.current.clockIn();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveClockIn!(mockPresenceEntry);
        await clockInPromise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Break Operations', () => {
    it('should handle start break successfully', async () => {
      const onBreakEntry = {
        ...mockPresenceEntry,
        onBreak: true,
        status: 'on_break'
      };

      (presenceIntegrationApi.startBreak as Mock).mockResolvedValueOnce(onBreakEntry);
      (presenceIntegrationApi.getCurrentPresence as Mock).mockResolvedValueOnce(onBreakEntry);

      const { result } = renderHook(() => usePresence());

      await act(async () => {
        await result.current.startBreak();
      });

      expect(presenceIntegrationApi.startBreak).toHaveBeenCalledWith('emp-1');
      expect(result.current.currentPresence?.onBreak).toBe(true);
    });

    it('should handle end break successfully', async () => {
      const backFromBreakEntry = {
        ...mockPresenceEntry,
        onBreak: false,
        status: 'present'
      };

      (presenceIntegrationApi.endBreak as Mock).mockResolvedValueOnce(backFromBreakEntry);
      (presenceIntegrationApi.getCurrentPresence as Mock).mockResolvedValueOnce(backFromBreakEntry);

      const { result } = renderHook(() => usePresence());

      await act(async () => {
        await result.current.endBreak();
      });

      expect(presenceIntegrationApi.endBreak).toHaveBeenCalledWith('emp-1');
      expect(result.current.currentPresence?.onBreak).toBe(false);
    });
  });

  describe('Data Loading', () => {
    it('should load current presence on mount', async () => {
      (presenceIntegrationApi.getCurrentPresence as Mock).mockResolvedValueOnce(mockPresenceEntry);
      (presenceIntegrationApi.getPresenceHistory as Mock).mockResolvedValueOnce([mockPresenceEntry]);

      const { result } = renderHook(() => usePresence());

      await waitFor(() => {
        expect(result.current.currentPresence).toEqual(mockPresenceEntry);
      });

      expect(presenceIntegrationApi.getCurrentPresence).toHaveBeenCalledWith('emp-1');
    });

    it('should load today presence history on mount', async () => {
      const todayEntries = [mockPresenceEntry];
      
      (presenceIntegrationApi.getCurrentPresence as Mock).mockResolvedValueOnce(null);
      (presenceIntegrationApi.getPresenceHistory as Mock).mockResolvedValueOnce(todayEntries);

      const { result } = renderHook(() => usePresence());

      await waitFor(() => {
        expect(result.current.todayPresence).toEqual(todayEntries);
      });

      expect(presenceIntegrationApi.getPresenceHistory).toHaveBeenCalledWith(
        'emp-1',
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('should handle loading errors gracefully', async () => {
      const error = new Error('Failed to load presence');
      (presenceIntegrationApi.getCurrentPresence as Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => usePresence());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load presence');
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should connect to real-time updates on mount', async () => {
      renderHook(() => usePresence());

      await waitFor(() => {
        expect(presenceIntegrationApi.connectRealTime).toHaveBeenCalledWith(
          'emp-1',
          expect.any(Function)
        );
      });
    });

    it('should disconnect from real-time updates on unmount', async () => {
      const { unmount } = renderHook(() => usePresence());

      unmount();

      expect(presenceIntegrationApi.disconnectRealTime).toHaveBeenCalled();
    });

    it('should handle real-time presence updates', async () => {
      let realTimeCallback: (update: any) => void;
      
      (presenceIntegrationApi.connectRealTime as Mock).mockImplementationOnce(
        (employeeId, callback) => {
          realTimeCallback = callback;
        }
      );

      const { result } = renderHook(() => usePresence());

      await waitFor(() => {
        expect(presenceIntegrationApi.connectRealTime).toHaveBeenCalled();
      });

      // Simuler une mise à jour temps réel
      const updatedPresence = {
        ...mockPresenceEntry,
        status: 'on_break'
      };

      act(() => {
        realTimeCallback!({
          type: 'presence_update',
          data: updatedPresence,
          timestamp: Date.now(),
          employeeId: 'emp-1'
        });
      });

      expect(result.current.currentPresence).toEqual(updatedPresence);
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh presence data', async () => {
      const updatedPresence = {
        ...mockPresenceEntry,
        status: 'on_break'
      };

      (presenceIntegrationApi.getCurrentPresence as Mock)
        .mockResolvedValueOnce(mockPresenceEntry)
        .mockResolvedValueOnce(updatedPresence);
      
      (presenceIntegrationApi.getPresenceHistory as Mock)
        .mockResolvedValueOnce([mockPresenceEntry])
        .mockResolvedValueOnce([updatedPresence]);

      const { result } = renderHook(() => usePresence());

      // Attendre le chargement initial
      await waitFor(() => {
        expect(result.current.currentPresence).toEqual(mockPresenceEntry);
      });

      // Rafraîchir
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.currentPresence).toEqual(updatedPresence);
      expect(presenceIntegrationApi.getCurrentPresence).toHaveBeenCalledTimes(2);
    });
  });

  describe('Status Calculation', () => {
    it('should calculate correct status for present employee', () => {
      const presentEntry = {
        ...mockPresenceEntry,
        clockInTime: new Date(),
        clockOutTime: undefined,
        onBreak: false
      };

      (presenceIntegrationApi.getCurrentPresence as Mock).mockResolvedValueOnce(presentEntry);

      const { result } = renderHook(() => usePresence());

      waitFor(() => {
        expect(result.current.getStatus()).toBe('present');
      });
    });

    it('should calculate correct status for employee on break', () => {
      const onBreakEntry = {
        ...mockPresenceEntry,
        clockInTime: new Date(),
        clockOutTime: undefined,
        onBreak: true
      };

      (presenceIntegrationApi.getCurrentPresence as Mock).mockResolvedValueOnce(onBreakEntry);

      const { result } = renderHook(() => usePresence());

      waitFor(() => {
        expect(result.current.getStatus()).toBe('on_break');
      });
    });

    it('should calculate correct status for absent employee', () => {
      (presenceIntegrationApi.getCurrentPresence as Mock).mockResolvedValueOnce(null);

      const { result } = renderHook(() => usePresence());

      waitFor(() => {
        expect(result.current.getStatus()).toBe('absent');
      });
    });
  });

  describe('Work Duration Calculation', () => {
    it('should calculate work duration correctly', async () => {
      const clockInTime = new Date();
      clockInTime.setHours(9, 0, 0, 0);
      
      const clockOutTime = new Date();
      clockOutTime.setHours(17, 0, 0, 0);

      const completedEntry = {
        ...mockPresenceEntry,
        clockInTime,
        clockOutTime
      };

      (presenceIntegrationApi.getCurrentPresence as Mock).mockResolvedValueOnce(null);
      (presenceIntegrationApi.getPresenceHistory as Mock).mockResolvedValueOnce([completedEntry]);

      const { result } = renderHook(() => usePresence());

      await waitFor(() => {
        const duration = result.current.getTodayWorkDuration();
        expect(duration).toBe(8 * 60 * 60 * 1000); // 8 heures en millisecondes
      });
    });

    it('should calculate ongoing work duration', async () => {
      const clockInTime = new Date(Date.now() - 4 * 60 * 60 * 1000); // Il y a 4 heures
      
      const ongoingEntry = {
        ...mockPresenceEntry,
        clockInTime,
        clockOutTime: undefined
      };

      (presenceIntegrationApi.getCurrentPresence as Mock).mockResolvedValueOnce(ongoingEntry);
      (presenceIntegrationApi.getPresenceHistory as Mock).mockResolvedValueOnce([]);

      const { result } = renderHook(() => usePresence());

      await waitFor(() => {
        const duration = result.current.getTodayWorkDuration();
        expect(duration).toBeGreaterThan(3.9 * 60 * 60 * 1000); // Environ 4 heures
        expect(duration).toBeLessThan(4.1 * 60 * 60 * 1000);
      });
    });
  });
});