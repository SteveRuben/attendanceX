/**
 * Hook pour la gestion de présence
 */

import { useState, useEffect, useCallback } from 'react';
import { presenceService } from '../services/presenceService';
import { useAuth } from './use-auth';

// Types locaux pour la présence
interface GeoLocation {
  latitude: number;
  longitude: number;
}

interface PresenceEntry {
  id: string;
  employeeId: string;
  organizationId: string;
  date: string;
  clockInTime: Date;
  clockOutTime?: Date;
  clockInLocation?: GeoLocation;
  clockOutLocation?: GeoLocation;
  status: 'present' | 'late' | 'absent' | 'early_leave';
  totalHours?: number;
  notes?: string;
}

interface ClockInData {
  location?: GeoLocation;
  notes?: string;
  deviceInfo?: {
    deviceId?: string;
    platform?: string;
    version?: string;
  };
}

interface ClockOutData {
  location?: GeoLocation;
  notes?: string;
  deviceInfo?: {
    deviceId?: string;
    platform?: string;
    version?: string;
  };
}

interface StartBreakData {
  type: 'lunch' | 'coffee' | 'personal' | 'other';
  location?: GeoLocation;
  notes?: string;
}

interface EndBreakData {
  breakId: string;
  location?: GeoLocation;
  notes?: string;
}

interface PresenceStatus {
  status: 'not_started' | 'working' | 'on_break' | 'completed';
  clockInTime?: Date;
  clockOutTime?: Date;
  totalHours?: number;
  activeBreak?: {
    id: string;
    type: string;
    startTime: Date;
  };
}

export const usePresence = (employeeId?: string) => {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<PresenceStatus | null>(null);
  const [todayEntry, setTodayEntry] = useState<PresenceEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetEmployeeId = employeeId || user?.employeeId;

  // Charger le statut actuel
  const loadCurrentStatus = useCallback(async () => {
    if (!targetEmployeeId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await presenceService.getPresenceStatus(targetEmployeeId);
      
      if (response.success) {
        setCurrentStatus(response.data.status);
        setTodayEntry(response.data.todayEntry);
      } else {
        setError(response.error || 'Erreur lors du chargement du statut');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Failed to load presence status:', err);
    } finally {
      setLoading(false);
    }
  }, [targetEmployeeId]);

  // Pointer l'arrivée
  const clockIn = useCallback(async (data: ClockInData) => {
    if (!targetEmployeeId) {
      setError('ID employé manquant');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await presenceService.clockIn(targetEmployeeId, data);
      
      if (response.success) {
        setTodayEntry(response.data);
        setCurrentStatus({
          status: 'working',
          clockInTime: new Date(response.data.clockInTime!),
          totalHours: response.data.totalHours
        });
      } else {
        setError(response.error || 'Erreur lors du pointage d\'arrivée');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Clock-in failed:', err);
    } finally {
      setLoading(false);
    }
  }, [targetEmployeeId]);

  // Pointer la sortie
  const clockOut = useCallback(async (data: ClockOutData) => {
    if (!targetEmployeeId) {
      setError('ID employé manquant');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await presenceService.clockOut(targetEmployeeId, data);
      
      if (response.success) {
        setTodayEntry(response.data);
        setCurrentStatus({
          status: 'completed',
          clockInTime: new Date(response.data.clockInTime!),
          clockOutTime: new Date(response.data.clockOutTime!),
          totalHours: response.data.totalHours
        });
      } else {
        setError(response.error || 'Erreur lors du pointage de sortie');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Clock-out failed:', err);
    } finally {
      setLoading(false);
    }
  }, [targetEmployeeId]);

  // Commencer une pause
  const startBreak = useCallback(async (data: StartBreakData) => {
    if (!targetEmployeeId) {
      setError('ID employé manquant');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await presenceService.startBreak(targetEmployeeId, data);
      
      if (response.success) {
        setTodayEntry(response.data);
        
        const activeBreak = response.data.breakEntries?.find(b => !b.endTime);
        setCurrentStatus({
          status: 'on_break',
          clockInTime: new Date(response.data.clockInTime!),
          totalHours: response.data.totalHours,
          activeBreak: activeBreak ? {
            id: activeBreak.id,
            type: activeBreak.type,
            startTime: new Date(activeBreak.startTime!)
          } : undefined
        });
      } else {
        setError(response.error || 'Erreur lors du début de pause');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Start break failed:', err);
    } finally {
      setLoading(false);
    }
  }, [targetEmployeeId]);

  // Terminer une pause
  const endBreak = useCallback(async (data: EndBreakData) => {
    if (!targetEmployeeId) {
      setError('ID employé manquant');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await presenceService.endBreak(targetEmployeeId, data);
      
      if (response.success) {
        setTodayEntry(response.data);
        setCurrentStatus({
          status: 'working',
          clockInTime: new Date(response.data.clockInTime!),
          totalHours: response.data.totalHours
        });
      } else {
        setError(response.error || 'Erreur lors de la fin de pause');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('End break failed:', err);
    } finally {
      setLoading(false);
    }
  }, [targetEmployeeId]);

  // Actualiser les données
  const refresh = useCallback(() => {
    loadCurrentStatus();
  }, [loadCurrentStatus]);

  // Charger les données au montage et périodiquement
  useEffect(() => {
    loadCurrentStatus();

    // Actualiser toutes les 30 secondes
    const interval = setInterval(loadCurrentStatus, 30000);
    
    return () => clearInterval(interval);
  }, [loadCurrentStatus]);

  return {
    currentStatus,
    todayEntry,
    loading,
    error,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    refresh
  };
};