import { useState, useEffect, useCallback } from 'react';
import { ticketService, TicketQueryParams } from '../services/ticketService';
import {
  EventTicket,
  PaginatedTicketsResponse,
  TicketFilters,
  TicketSortOptions
} from '../types/ticket.types';

export interface UseTicketsOptions {
  eventId: string;
  initialParams?: TicketQueryParams;
  autoFetch?: boolean;
}

export interface UseTicketsReturn {
  tickets: EventTicket[];
  pagination: PaginatedTicketsResponse['pagination'] | null;
  loading: boolean;
  error: string | null;
  filters: TicketFilters;
  sort: TicketSortOptions;
  fetchTickets: () => Promise<void>;
  setFilters: (filters: TicketFilters) => void;
  setSort: (sort: TicketSortOptions) => void;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export const useTickets = ({
  eventId,
  initialParams = {},
  autoFetch = true
}: UseTicketsOptions): UseTicketsReturn => {
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [pagination, setPagination] = useState<PaginatedTicketsResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFiltersState] = useState<TicketFilters>(
    initialParams.filters || {}
  );
  const [sort, setSortState] = useState<TicketSortOptions>(
    initialParams.sort || { field: 'createdAt', direction: 'desc' }
  );
  const [page, setPageState] = useState(initialParams.page || 1);
  const [limit] = useState(initialParams.limit || 20);

  const fetchTickets = useCallback(async () => {
    if (!eventId) return;

    setLoading(true);
    setError(null);

    try {
      const params: TicketQueryParams = {
        page,
        limit,
        filters,
        sort
      };

      const response = await ticketService.getTicketsByEvent(eventId, params);
      setTickets(response.tickets);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des billets');
      setTickets([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [eventId, page, limit, filters, sort]);

  const setFilters = useCallback((newFilters: TicketFilters) => {
    setFiltersState(newFilters);
    setPageState(1); // Reset to first page when filters change
  }, []);

  const setSort = useCallback((newSort: TicketSortOptions) => {
    setSortState(newSort);
    setPageState(1); // Reset to first page when sort changes
  }, []);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const refresh = useCallback(async () => {
    await fetchTickets();
  }, [fetchTickets]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchTickets();
    }
  }, [fetchTickets, autoFetch]);

  return {
    tickets,
    pagination,
    loading,
    error,
    filters,
    sort,
    fetchTickets,
    setFilters,
    setSort,
    setPage,
    refresh,
    clearError
  };
};