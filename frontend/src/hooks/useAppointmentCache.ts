// src/hooks/useAppointmentCache.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { appointmentRecoveryManager } from '../utils/appointmentRecovery';

interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of cached items
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh data
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  loading?: boolean;
  error?: Error;
}

interface UseAppointmentCacheOptions<T> extends CacheConfig {
  key: string;
  fetcher: () => Promise<T>;
  dependencies?: any[];
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useAppointmentCache<T>({
  key,
  fetcher,
  dependencies = [],
  enabled = true,
  ttl = 5 * 60 * 1000, // 5 minutes default
  maxSize = 100,
  staleWhileRevalidate = true,
  onSuccess,
  onError
}: UseAppointmentCacheOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  
  const cache = useRef(new Map<string, CacheEntry<any>>());
  const abortController = useRef<AbortController | null>(null);

  // Cache management
  const getCachedData = useCallback((cacheKey: string): CacheEntry<T> | null => {
    const entry = cache.current.get(cacheKey);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired && !staleWhileRevalidate) {
      cache.current.delete(cacheKey);
      return null;
    }

    return entry;
  }, [staleWhileRevalidate]);

  const setCachedData = useCallback((cacheKey: string, data: T, error?: Error) => {
    // Implement LRU eviction if cache is full
    if (cache.current.size >= maxSize) {
      const oldestKey = cache.current.keys().next().value;
      if (oldestKey) {
        cache.current.delete(oldestKey);
      }
    }

    cache.current.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
      error
    });
  }, [maxSize, ttl]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    const cacheKey = `${key}-${JSON.stringify(dependencies)}`;
    const cached = getCachedData(cacheKey);

    // Return cached data if valid and not forcing refresh
    if (cached && !forceRefresh) {
      const isStale = Date.now() - cached.timestamp > cached.ttl;
      
      if (!isStale) {
        setData(cached.data);
        setError(cached.error || null);
        return cached.data;
      }

      // If stale but staleWhileRevalidate is enabled, return stale data
      // and fetch fresh data in background
      if (staleWhileRevalidate && cached.data) {
        setData(cached.data);
        setError(null);
        // Continue to fetch fresh data below
      }
    }

    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      // Use recovery manager for resilient data fetching
      const result = await appointmentRecoveryManager.withRetry(
        async () => {
          const response = await fetcher();
          if (abortController.current?.signal.aborted) {
            throw new Error('Request aborted');
          }
          return response;
        },
        {
          maxRetries: 3,
          retryDelay: 1000,
          onRetry: (attempt, error) => {
            console.warn(`Retry attempt ${attempt} for ${key}:`, error.message);
          }
        }
      );

      setData(result);
      setCachedData(cacheKey, result);
      setLastFetch(Date.now());
      
      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      const error = err as Error;
      
      if (error.message !== 'Request aborted') {
        setError(error);
        setCachedData(cacheKey, cached?.data || null, error);
        
        if (onError) {
          onError(error);
        }
      }

      // If we have stale data and the request failed, keep showing stale data
      if (cached?.data && staleWhileRevalidate) {
        setData(cached.data);
      }

      throw error;
    } finally {
      setLoading(false);
    }
  }, [key, dependencies, enabled, fetcher, getCachedData, setCachedData, staleWhileRevalidate, onSuccess, onError]);

  // Initial fetch and dependency-based refetch
  useEffect(() => {
    fetchData();

    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [fetchData]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Invalidate cache for this key
  const invalidate = useCallback(() => {
    const cacheKey = `${key}-${JSON.stringify(dependencies)}`;
    cache.current.delete(cacheKey);
    setData(null);
    setError(null);
    setLastFetch(0);
  }, [key, dependencies]);

  // Prefetch data (useful for hover states, etc.)
  const prefetch = useCallback(async (prefetchKey?: string, prefetchDeps?: any[]) => {
    const actualKey = prefetchKey || key;
    const actualDeps = prefetchDeps || dependencies;
    const cacheKey = `${actualKey}-${JSON.stringify(actualDeps)}`;
    
    const cached = getCachedData(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data; // Already fresh
    }

    try {
      const result = await fetcher();
      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('Prefetch failed:', error);
      return null;
    }
  }, [key, dependencies, fetcher, getCachedData, setCachedData]);

  return {
    data,
    loading,
    error,
    lastFetch,
    refresh,
    invalidate,
    prefetch,
    isStale: lastFetch > 0 && Date.now() - lastFetch > ttl
  };
}

// Hook for managing multiple related cache entries
export function useAppointmentCacheGroup() {
  const cacheRefs = useRef(new Set<string>());

  const addToGroup = useCallback((key: string) => {
    cacheRefs.current.add(key);
  }, []);

  const removeFromGroup = useCallback((key: string) => {
    cacheRefs.current.delete(key);
  }, []);

  const invalidateGroup = useCallback(() => {
    cacheRefs.current.forEach(key => {
      // This would need to be implemented with a global cache manager
      appointmentRecoveryManager.invalidateCache(key);
    });
    cacheRefs.current.clear();
  }, []);

  const refreshGroup = useCallback(async () => {
    const promises = Array.from(cacheRefs.current).map(key => {
      // This would trigger refresh for each cached item
      return Promise.resolve(); // Placeholder
    });
    
    await Promise.allSettled(promises);
  }, []);

  return {
    addToGroup,
    removeFromGroup,
    invalidateGroup,
    refreshGroup
  };
}

// Specialized hooks for common appointment data
export function useAppointments(filters?: any) {
  return useAppointmentCache({
    key: 'appointments',
    fetcher: async () => {
      const response = await fetch('/api/appointments?' + new URLSearchParams(filters));
      if (!response.ok) throw new Error('Failed to fetch appointments');
      return response.json();
    },
    dependencies: [filters],
    ttl: 2 * 60 * 1000, // 2 minutes for frequently changing data
    staleWhileRevalidate: true
  });
}

export function useAppointmentDetails(appointmentId: string) {
  return useAppointmentCache({
    key: 'appointment-details',
    fetcher: async () => {
      const response = await fetch(`/api/appointments/${appointmentId}`);
      if (!response.ok) throw new Error('Failed to fetch appointment details');
      return response.json();
    },
    dependencies: [appointmentId],
    enabled: !!appointmentId,
    ttl: 5 * 60 * 1000 // 5 minutes
  });
}

export function useAvailableSlots(practitionerId: string, date: string, serviceId: string) {
  return useAppointmentCache({
    key: 'available-slots',
    fetcher: async () => {
      const params = new URLSearchParams({ practitionerId, date, serviceId });
      const response = await fetch(`/api/appointments/available-slots?${params}`);
      if (!response.ok) throw new Error('Failed to fetch available slots');
      return response.json();
    },
    dependencies: [practitionerId, date, serviceId],
    enabled: !!(practitionerId && date && serviceId),
    ttl: 1 * 60 * 1000, // 1 minute for time-sensitive data
    staleWhileRevalidate: false // Always fetch fresh for availability
  });
}

export function useClients() {
  return useAppointmentCache({
    key: 'clients',
    fetcher: async () => {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
    dependencies: [],
    ttl: 10 * 60 * 1000 // 10 minutes for relatively stable data
  });
}

export function useServices() {
  return useAppointmentCache({
    key: 'services',
    fetcher: async () => {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    },
    dependencies: [],
    ttl: 30 * 60 * 1000 // 30 minutes for very stable data
  });
}

export function usePractitioners() {
  return useAppointmentCache({
    key: 'practitioners',
    fetcher: async () => {
      const response = await fetch('/api/practitioners');
      if (!response.ok) throw new Error('Failed to fetch practitioners');
      return response.json();
    },
    dependencies: [],
    ttl: 30 * 60 * 1000 // 30 minutes for very stable data
  });
}