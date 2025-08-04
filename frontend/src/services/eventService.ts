// src/services/eventService.ts - Service pour la gestion des événements
import { apiService, type ApiResponse, type PaginatedResponse } from './apiService';
import { type Event, type CreateEventRequest, type UpdateEventRequest, EventType, EventStatus } from '@attendance-x/shared';

export interface EventSearchFilters {
  page?: number;
  limit?: number;
  sortBy?: 'startDate' | 'title' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  type?: EventType;
  status?: EventStatus;
  organizerId?: string;
  participantId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  tags?: string;
  isPrivate?: boolean;
  location?: 'physical' | 'virtual' | 'hybrid';
}

export interface EventStats {
  total: number;
  upcoming: number;
  ongoing: number;
  completed: number;
  cancelled: number;
  byType: Record<EventType, number>;
  byStatus: Record<EventStatus, number>;
  averageAttendance: number;
  totalParticipants: number;
}

export interface EventAnalytics {
  attendanceRate: number;
  totalRegistered: number;
  totalAttended: number;
  lateArrivals: number;
  earlyDepartures: number;
  noShows: number;
  attendanceByHour: Array<{ hour: number; count: number }>;
  participantFeedback: {
    average: number;
    total: number;
    distribution: Record<number, number>;
  };
}

export interface ConflictCheck {
  hasConflicts: boolean;
  conflicts: Array<{
    eventId: string;
    title: string;
    startDate: string;
    endDate: string;
    conflictType: 'time' | 'location' | 'participant';
  }>;
}

class EventService {
  // Get events with filters
  async getEvents(filters: EventSearchFilters = {}): Promise<ApiResponse<PaginatedResponse<Event>>> {
    return apiService.get<PaginatedResponse<Event>>('/events', filters);
  }

  // Get my events
  async getMyEvents(filters: Partial<EventSearchFilters> = {}): Promise<ApiResponse<PaginatedResponse<Event>>> {
    return apiService.get<PaginatedResponse<Event>>('/events/my-events', filters);
  }

  // Get upcoming events
  async getUpcomingEvents(limit: number = 10): Promise<ApiResponse<Event[]>> {
    return apiService.get<Event[]>('/events/upcoming', { limit });
  }

  // Get event by ID
  async getEventById(id: string): Promise<ApiResponse<Event>> {
    return apiService.get<Event>(`/events/${id}`);
  }

  // Create new event
  async createEvent(data: CreateEventRequest): Promise<ApiResponse<Event>> {
    return apiService.post<Event>('/events', data);
  }

  // Update event
  async updateEvent(id: string, data: Partial<UpdateEventRequest>): Promise<ApiResponse<Event>> {
    return apiService.put<Event>(`/events/${id}`, data);
  }

  // Duplicate event
  async duplicateEvent(id: string, modifications?: {
    title?: string;
    startDate?: string;
    endDate?: string;
    participants?: string[];
  }): Promise<ApiResponse<Event>> {
    return apiService.post<Event>(`/events/${id}/duplicate`, modifications);
  }

  // Change event status
  async changeEventStatus(id: string, status: EventStatus, reason?: string): Promise<ApiResponse<Event>> {
    return apiService.post<Event>(`/events/${id}/status`, { status, reason });
  }

  // Search events
  async searchEvents(query: string, filters?: Partial<EventSearchFilters>): Promise<ApiResponse<Event[]>> {
    return apiService.post<Event[]>('/events/search', { query, ...filters });
  }

  // Get recommended events
  async getRecommendedEvents(limit: number = 5): Promise<ApiResponse<Event[]>> {
    return apiService.get<Event[]>('/events/recommendations', { limit });
  }

  // Get event statistics
  async getEventStats(organizerId?: string): Promise<ApiResponse<EventStats>> {
    return apiService.get<EventStats>('/events/stats', organizerId ? { organizerId } : {});
  }

  // Get event analytics
  async getEventAnalytics(id: string): Promise<ApiResponse<EventAnalytics>> {
    return apiService.get<EventAnalytics>(`/events/${id}/analytics`);
  }

  // Check schedule conflicts
  async checkScheduleConflicts(data: {
    startDateTime: string;
    endDateTime: string;
    participantIds?: string[];
    location?: {
      name: string;
      coordinates?: { latitude: number; longitude: number };
    };
    excludeEventId?: string;
  }): Promise<ApiResponse<ConflictCheck>> {
    return apiService.post<ConflictCheck>('/events/check-conflicts', data);
  }

  // Participant management
  async addParticipant(eventId: string, userId: string): Promise<ApiResponse<void>> {
    return apiService.post<void>(`/events/${eventId}/participants`, { userId });
  }

  async removeParticipant(eventId: string, userId: string, reason?: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/events/${eventId}/participants/${userId}`);
  }

  async confirmParticipant(eventId: string, userId: string): Promise<ApiResponse<void>> {
    return apiService.post<void>(`/events/${eventId}/participants/${userId}/confirm`);
  }

  async bulkInviteParticipants(eventId: string, userIds: string[]): Promise<ApiResponse<void>> {
    return apiService.post<void>(`/events/${eventId}/participants/bulk-invite`, { userIds });
  }

  // Bulk operations
  async bulkOperations(operation: 'update_status' | 'delete' | 'duplicate', eventIds: string[], data?: any): Promise<ApiResponse<void>> {
    return apiService.post<void>('/events/bulk-operations', { operation, eventIds, data });
  }

  // Export events
  async exportEvents(filters: Partial<EventSearchFilters>, format: 'csv' | 'json' | 'excel' = 'csv'): Promise<ApiResponse<Blob>> {
    return apiService.post<Blob>('/events/export', { filters, format });
  }
}

export const eventService = new EventService();