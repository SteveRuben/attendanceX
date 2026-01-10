import { useState, useEffect, useCallback } from 'react';
import { ticketService } from '../services/ticketService';
import { TicketStatistics } from '../types/ticket.types';

export interface UseTicketStatisticsOptions {
  eventId: string;
  autoFetch?: boolean;
  refreshInterval?: number; // in milliseconds
}

export interface UseTicketStatisticsReturn {
  statistics: TicketStatistics | null;
  loading: boolean;
  error: string | null;
  fetchStatistics: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export const useTicketStatistics = ({
  eventId,
  autoFetch = true,
  refreshInterval
}: UseTicketStatisticsOptions): UseTicketStatisticsReturn => {
  const [statistics, setStatistics] = useState<TicketStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    if (!eventId) return;

    setLoading(true);
    setError(null);

    try {
      const stats = await ticketService.getTicketStatistics(eventId);
      setStatistics(stats);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des statistiques');
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const refresh = useCallback(async () => {
    await fetchStatistics();
  }, [fetchStatistics]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchStatistics();
    }
  }, [fetchStatistics, autoFetch]);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      if (!loading) {
        fetchStatistics();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, loading, fetchStatistics]);

  return {
    statistics,
    loading,
    error,
    fetchStatistics,
    refresh,
    clearError
  };
};