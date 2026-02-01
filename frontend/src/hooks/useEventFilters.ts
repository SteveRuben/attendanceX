/**
 * useEventFilters Hook
 * 
 * Manages event filter state and applies filters to event lists.
 * Syncs filter state with URL query parameters for shareable URLs.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Event } from '@/components/events/EventCard';

/**
 * Date range filter type
 */
export type DateRangeFilter = 'today' | 'week' | 'month' | 'custom' | 'all';

/**
 * Price type filter
 */
export type PriceTypeFilter = 'free' | 'paid' | 'all';

/**
 * Sort by options
 */
export type SortByOption = 'date' | 'distance' | 'popularity' | 'price';

/**
 * Event filters interface
 */
export interface EventFilters {
  category?: string;
  dateRange?: DateRangeFilter;
  priceType?: PriceTypeFilter;
  sortBy?: SortByOption;
  radius?: number;
  searchQuery?: string;
}

/**
 * useEventFilters return interface
 */
export interface UseEventFiltersReturn {
  filters: EventFilters;
  updateFilter: <K extends keyof EventFilters>(key: K, value: EventFilters[K]) => void;
  clearFilters: () => void;
  applyFilters: (events: Event[], userPosition?: { latitude: number; longitude: number }) => Event[];
  hasActiveFilters: boolean;
}

/**
 * Default filters
 */
const DEFAULT_FILTERS: EventFilters = {
  category: undefined,
  dateRange: 'all',
  priceType: 'all',
  sortBy: 'date',
  radius: undefined,
  searchQuery: undefined,
};

/**
 * useEventFilters Hook
 * 
 * @returns UseEventFiltersReturn
 * 
 * @example
 * const { 
 *   filters, 
 *   updateFilter, 
 *   clearFilters, 
 *   applyFilters,
 *   hasActiveFilters 
 * } = useEventFilters();
 */
export const useEventFilters = (): UseEventFiltersReturn => {
  const router = useRouter();
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);

  /**
   * Load filters from URL query params on mount
   */
  useEffect(() => {
    const query = router.query;
    
    const urlFilters: EventFilters = {
      category: query.category as string | undefined,
      dateRange: (query.dateRange as DateRangeFilter) || 'all',
      priceType: (query.priceType as PriceTypeFilter) || 'all',
      sortBy: (query.sortBy as SortByOption) || 'date',
      radius: query.radius ? parseInt(query.radius as string, 10) : undefined,
      searchQuery: query.search as string | undefined,
    };

    setFilters(urlFilters);
  }, [router.query]);

  /**
   * Update a single filter
   */
  const updateFilter = useCallback(<K extends keyof EventFilters>(
    key: K,
    value: EventFilters[K]
  ) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      
      // Update URL query params
      const query: Record<string, string> = {};
      
      if (newFilters.category) query.category = newFilters.category;
      if (newFilters.dateRange && newFilters.dateRange !== 'all') query.dateRange = newFilters.dateRange;
      if (newFilters.priceType && newFilters.priceType !== 'all') query.priceType = newFilters.priceType;
      if (newFilters.sortBy && newFilters.sortBy !== 'date') query.sortBy = newFilters.sortBy;
      if (newFilters.radius) query.radius = newFilters.radius.toString();
      if (newFilters.searchQuery) query.search = newFilters.searchQuery;
      
      router.push({ query }, undefined, { shallow: true });
      
      return newFilters;
    });
  }, [router]);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    router.push({ query: {} }, undefined, { shallow: true });
  }, [router]);

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.category ||
      (filters.dateRange && filters.dateRange !== 'all') ||
      (filters.priceType && filters.priceType !== 'all') ||
      filters.radius ||
      filters.searchQuery
    );
  }, [filters]);

  /**
   * Apply filters to event list
   */
  const applyFilters = useCallback((
    events: Event[],
    userPosition?: { latitude: number; longitude: number }
  ): Event[] => {
    let filtered = [...events];

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter(event => 
        event.category.toLowerCase() === filters.category!.toLowerCase()
      );
    }

    // Filter by price type
    if (filters.priceType && filters.priceType !== 'all') {
      if (filters.priceType === 'free') {
        filtered = filtered.filter(event => event.price?.isFree === true);
      } else if (filters.priceType === 'paid') {
        filtered = filtered.filter(event => event.price?.isFree === false);
      }
    }

    // Filter by date range
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(event => {
        const eventDate = typeof event.startDate === 'string' 
          ? new Date(event.startDate) 
          : event.startDate;

        switch (filters.dateRange) {
          case 'today':
            return eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
          case 'week':
            const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            return eventDate >= today && eventDate < weekFromNow;
          case 'month':
            const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
            return eventDate >= today && eventDate < monthFromNow;
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.location.city.toLowerCase().includes(query) ||
        event.category.toLowerCase().includes(query)
      );
    }

    // Sort events
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'date':
          filtered.sort((a, b) => {
            const dateA = typeof a.startDate === 'string' ? new Date(a.startDate) : a.startDate;
            const dateB = typeof b.startDate === 'string' ? new Date(b.startDate) : b.startDate;
            return dateA.getTime() - dateB.getTime();
          });
          break;
        
        case 'price':
          filtered.sort((a, b) => {
            const priceA = a.price?.isFree ? 0 : (a.price?.amount || 0);
            const priceB = b.price?.isFree ? 0 : (b.price?.amount || 0);
            return priceA - priceB;
          });
          break;
        
        case 'popularity':
          filtered.sort((a, b) => {
            const participantsA = a.participants?.current || 0;
            const participantsB = b.participants?.current || 0;
            return participantsB - participantsA;
          });
          break;
        
        case 'distance':
          if (userPosition) {
            filtered.sort((a, b) => {
              const distanceA = a.location.coordinates 
                ? calculateDistance(userPosition, a.location.coordinates)
                : Infinity;
              const distanceB = b.location.coordinates
                ? calculateDistance(userPosition, b.location.coordinates)
                : Infinity;
              return distanceA - distanceB;
            });
          }
          break;
      }
    }

    return filtered;
  }, [filters]);

  return {
    filters,
    updateFilter,
    clearFilters,
    applyFilters,
    hasActiveFilters,
  };
};

/**
 * Helper function to calculate distance (Haversine formula)
 */
function calculateDistance(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) *
    Math.cos(toRadians(to.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export default useEventFilters;
