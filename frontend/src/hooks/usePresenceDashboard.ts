import { useState, useEffect } from 'react';
import { presenceService } from '@/services/presenceService';
import { useAuth } from './use-auth';
import { toast } from 'react-toastify';

interface PresenceStatus {
  status: 'present' | 'absent' | 'on_break' | 'late';
  clockInTime?: string;
  clockOutTime?: string;
  totalHours?: number;
  currentBreak?: {
    startTime: string;
    type: string;
  };
}

interface PresenceStats {
  totalHours: number;
  effectiveHours: number;
  totalBreaks: number;
  totalBreakTime: number;
  attendanceRate: number;
  daysPresent: number;
  averageHours: number;
  lateCount: number;
}

interface PresenceEntry {
  id: string;
  date: string;
  clockInTime?: string;
  clockOutTime?: string;
  status: string;
  totalHours?: number;
  notes?: string;
}

interface PresenceAlert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export const usePresenceDashboard = () => {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<PresenceStatus | null>(null);
  const [todayStats, setTodayStats] = useState<PresenceStats | null>(null);
  const [weekStats, setWeekStats] = useState<PresenceStats | null>(null);
  const [recentEntries, setRecentEntries] = useState<PresenceEntry[]>([]);
  const [alerts, setAlerts] = useState<PresenceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPresenceData();
    }
  }, [user]);

  const loadPresenceData = async () => {
    try {
      setIsLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [statusRes, todayStatsRes, weekStatsRes, entriesRes, alertsRes] = await Promise.allSettled([
        presenceService.getMyPresenceStatus(),
        presenceService.getMyPresenceStats({ startDate: today, endDate: today }),
        presenceService.getMyPresenceStats({ startDate: weekStart, endDate: today }),
        presenceService.getPresenceEntries({ 
          employeeId: user?.uid, 
          startDate: weekStart, 
          limit: 10 
        }),
        presenceService.getPresenceAlerts({ resolved: false, limit: 5 })
      ]);

      if (statusRes.status === 'fulfilled') {
        setCurrentStatus(statusRes.value.data);
      }
      
      if (todayStatsRes.status === 'fulfilled') {
        setTodayStats(todayStatsRes.value.data);
      }
      
      if (weekStatsRes.status === 'fulfilled') {
        setWeekStats(weekStatsRes.value.data);
      }
      
      if (entriesRes.status === 'fulfilled') {
        setRecentEntries(entriesRes.value.data || []);
      }
      
      if (alertsRes.status === 'fulfilled') {
        setAlerts(alertsRes.value.data || []);
      }

    } catch (error) {
      console.error('Error loading presence data:', error);
      toast.error('Erreur lors du chargement des données de présence');
    } finally {
      setIsLoading(false);
    }
  };

  const clockIn = async (location?: { latitude: number; longitude: number; accuracy?: number }) => {
    try {
      await presenceService.clockIn({ location });
      toast.success('Arrivée pointée avec succès');
      await loadPresenceData();
    } catch (error) {
      console.error('Error clocking in:', error);
      toast.error('Erreur lors du pointage d\'arrivée');
    }
  };

  const clockOut = async (location?: { latitude: number; longitude: number; accuracy?: number }) => {
    try {
      await presenceService.clockOut({ location });
      toast.success('Sortie pointée avec succès');
      await loadPresenceData();
    } catch (error) {
      console.error('Error clocking out:', error);
      toast.error('Erreur lors du pointage de sortie');
    }
  };

  const startBreak = async (type: string = 'coffee') => {
    try {
      await presenceService.startBreak({ type });
      toast.success('Pause commencée');
      await loadPresenceData();
    } catch (error) {
      console.error('Error starting break:', error);
      toast.error('Erreur lors du début de pause');
    }
  };

  const endBreak = async () => {
    try {
      await presenceService.endBreak({});
      toast.success('Pause terminée');
      await loadPresenceData();
    } catch (error) {
      console.error('Error ending break:', error);
      toast.error('Erreur lors de la fin de pause');
    }
  };

  return {
    currentStatus,
    todayStats,
    weekStats,
    recentEntries,
    alerts,
    isLoading,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    refresh: loadPresenceData
  };
};