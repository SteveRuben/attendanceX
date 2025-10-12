// src/services/eventService.ts - Service pour la gestion des événements
import { apiService, type ApiResponse, type PaginatedResponse } from './api';
import { type Event, type CreateEventRequest, type UpdateEventRequest, EventType, EventStatus } from '../shared';
import { mockEvents, mockEventStats } from './mockData/eventMockData';

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
  private useMockData = true;

  private filterMockEvents(filters: EventSearchFilters): Event[] {
    let filtered = [...mockEvents];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(searchLower) ||
        e.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(e => e.status === filters.status);
    }

    if (filters.type) {
      filtered = filtered.filter(e => e.type === filters.type);
    }

    if (filters.organizerId) {
      filtered = filtered.filter(e => e.organizerId === filters.organizerId);
    }

    if (filters.participantId) {
      filtered = filtered.filter(e => e.participants.includes(filters.participantId!));
    }

    if (filters.tags) {
      const tags = filters.tags.split(',');
      filtered = filtered.filter(e =>
        tags.some(tag => e.tags.includes(tag.trim()))
      );
    }

    if (filters.isPrivate !== undefined) {
      filtered = filtered.filter(e => e.isPrivate === filters.isPrivate);
    }

    if (filters.location) {
      filtered = filtered.filter(e => e.location.type === filters.location);
    }

    const sortBy = filters.sortBy || 'startDateTime';
    const sortOrder = filters.sortOrder || 'asc';
    filtered.sort((a, b) => {
      let aVal: any = a[sortBy as keyof Event];
      let bVal: any = b[sortBy as keyof Event];

      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }

  // Get events with filters
  async getEvents(filters: EventSearchFilters = {}): Promise<ApiResponse<PaginatedResponse<Event>>> {
    if (this.useMockData) {
      const filtered = this.filterMockEvents(filters);
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const start = (page - 1) * limit;
      const end = start + limit;

      return {
        success: true,
        data: filtered.slice(start, end),
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit)
        }
      };
    }
    return apiService.get<PaginatedResponse<Event>>('/events', filters);
  }

  // Get my events
  async getMyEvents(filters: Partial<EventSearchFilters> = {}): Promise<ApiResponse<PaginatedResponse<Event>>> {
    if (this.useMockData) {
      return this.getEvents(filters);
    }
    return apiService.get<PaginatedResponse<Event>>('/events/my-events', filters);
  }

  // Get upcoming events
  async getUpcomingEvents(limit: number = 10): Promise<ApiResponse<Event[]>> {
    if (this.useMockData) {
      const now = new Date();
      const upcoming = mockEvents
        .filter(e => new Date(e.startDateTime) > now)
        .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
        .slice(0, limit);

      return {
        success: true,
        data: upcoming
      };
    }
    return apiService.get<Event[]>('/events/upcoming', { limit });
  }

  // Get event by ID
  async getEventById(id: string): Promise<ApiResponse<Event>> {
    if (this.useMockData) {
      const event = mockEvents.find(e => e.id === id);
      if (event) {
        return {
          success: true,
          data: event
        };
      }
      return {
        success: false,
        error: 'Event not found'
      };
    }
    return apiService.get<Event>(`/events/${id}`);
  }

  // Create new event
  async createEvent(data: CreateEventRequest): Promise<ApiResponse<Event>> {
    if (this.useMockData) {
      const newEvent: Event = {
        id: `evt-${Date.now()}`,
        ...data,
        status: EventStatus.DRAFT,
        priority: 'medium' as any,
        organizationId: 'org-001',
        organizationName: 'TechCorp',
        startDateTime: new Date(data.startDateTime || new Date()),
        endDateTime: new Date(data.endDateTime || new Date()),
        timezone: 'Europe/Paris',
        allDay: false,
        recurrence: {
          enabled: false,
          frequency: 'none' as any,
          interval: 1
        },
        organizerId: 'user-001',
        organizerName: 'Current User',
        coOrganizers: [],
        participants: data.participants || [],
        confirmedParticipants: [],
        waitingList: [],
        attendanceSettings: {
          trackingEnabled: true,
          requireCheckIn: true,
          requireCheckOut: false,
          allowLateCheckIn: true,
          lateThreshold: 15,
          autoMarkAbsent: true,
          autoMarkAbsentAfter: 30,
          allowedMethods: ['qr', 'manual']
        },
        reminderSettings: {
          enabled: true,
          times: [24, 1],
          channels: ['email']
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-001',
        updatedBy: 'user-001',
        tenantId: 'tenant-001'
      } as Event;

      mockEvents.push(newEvent);

      return {
        success: true,
        data: newEvent
      };
    }
    return apiService.post<Event>('/events', data);
  }

  // Update event
  async updateEvent(id: string, data: Partial<UpdateEventRequest>): Promise<ApiResponse<Event>> {
    if (this.useMockData) {
      const index = mockEvents.findIndex(e => e.id === id);
      if (index !== -1) {
        mockEvents[index] = {
          ...mockEvents[index],
          ...data,
          updatedAt: new Date()
        };
        return {
          success: true,
          data: mockEvents[index]
        };
      }
      return {
        success: false,
        error: 'Event not found'
      };
    }
    return apiService.put<Event>(`/events/${id}`, data);
  }

  // Duplicate event
  async duplicateEvent(id: string, modifications?: {
    title?: string;
    startDate?: string;
    endDate?: string;
    participants?: string[];
  }): Promise<ApiResponse<Event>> {
    if (this.useMockData) {
      const original = mockEvents.find(e => e.id === id);
      if (!original) {
        return {
          success: false,
          error: 'Event not found'
        };
      }

      const duplicated: Event = {
        ...original,
        id: `evt-${Date.now()}`,
        title: modifications?.title || `${original.title} (Copie)`,
        status: EventStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockEvents.push(duplicated);

      return {
        success: true,
        data: duplicated
      };
    }
    return apiService.post<Event>(`/events/${id}/duplicate`, modifications);
  }

  // Change event status
  async changeEventStatus(id: string, status: EventStatus, reason?: string): Promise<ApiResponse<Event>> {
    if (this.useMockData) {
      const index = mockEvents.findIndex(e => e.id === id);
      if (index !== -1) {
        mockEvents[index].status = status;
        mockEvents[index].updatedAt = new Date();
        return {
          success: true,
          data: mockEvents[index]
        };
      }
      return {
        success: false,
        error: 'Event not found'
      };
    }
    return apiService.post<Event>(`/events/${id}/status`, { status, reason });
  }

  // Search events
  async searchEvents(query: string, filters?: Partial<EventSearchFilters>): Promise<ApiResponse<Event[]>> {
    if (this.useMockData) {
      const searchFilters: EventSearchFilters = {
        ...filters,
        search: query
      };
      const filtered = this.filterMockEvents(searchFilters);
      return {
        success: true,
        data: filtered
      };
    }
    return apiService.post<Event[]>('/events/search', { query, ...filters });
  }

  // Get recommended events
  async getRecommendedEvents(limit: number = 5): Promise<ApiResponse<Event[]>> {
    if (this.useMockData) {
      const now = new Date();
      const recommended = mockEvents
        .filter(e => new Date(e.startDateTime) > now && e.status === EventStatus.PUBLISHED)
        .slice(0, limit);

      return {
        success: true,
        data: recommended
      };
    }
    return apiService.get<Event[]>('/events/recommendations', { limit });
  }

  // Get event statistics
  async getEventStats(organizerId?: string): Promise<ApiResponse<EventStats>> {
    if (this.useMockData) {
      return {
        success: true,
        data: mockEventStats
      };
    }
    return apiService.get<EventStats>('/events/stats', organizerId ? { organizerId } : {});
  }

  // Get event analytics
  async getEventAnalytics(id: string): Promise<ApiResponse<EventAnalytics>> {
    if (this.useMockData) {
      const event = mockEvents.find(e => e.id === id);
      if (!event) {
        return {
          success: false,
          error: 'Event not found'
        };
      }

      const totalRegistered = event.participants.length;
      const totalAttended = event.confirmedParticipants.length;

      return {
        success: true,
        data: {
          attendanceRate: totalRegistered > 0 ? (totalAttended / totalRegistered) * 100 : 0,
          totalRegistered,
          totalAttended,
          lateArrivals: Math.floor(totalAttended * 0.1),
          earlyDepartures: Math.floor(totalAttended * 0.05),
          noShows: totalRegistered - totalAttended,
          attendanceByHour: [
            { hour: 9, count: Math.floor(totalAttended * 0.3) },
            { hour: 10, count: Math.floor(totalAttended * 0.5) },
            { hour: 11, count: Math.floor(totalAttended * 0.2) }
          ],
          participantFeedback: {
            average: 4.2,
            total: totalAttended,
            distribution: {
              1: 2,
              2: 3,
              3: 8,
              4: 15,
              5: 10
            }
          }
        }
      };
    }
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
    if (this.useMockData) {
      return {
        success: true,
        data: {
          hasConflicts: false,
          conflicts: []
        }
      };
    }
    return apiService.post<ConflictCheck>('/events/check-conflicts', data);
  }

  // Participant management
  async addParticipant(eventId: string, userId: string): Promise<ApiResponse<void>> {
    if (this.useMockData) {
      const event = mockEvents.find(e => e.id === eventId);
      if (event && !event.participants.includes(userId)) {
        event.participants.push(userId);
        event.updatedAt = new Date();
      }
      return {
        success: true,
        data: undefined
      };
    }
    return apiService.post<void>(`/events/${eventId}/participants`, { userId });
  }

  async removeParticipant(eventId: string, userId: string, reason?: string): Promise<ApiResponse<void>> {
    if (this.useMockData) {
      const event = mockEvents.find(e => e.id === eventId);
      if (event) {
        event.participants = event.participants.filter(id => id !== userId);
        event.confirmedParticipants = event.confirmedParticipants.filter(id => id !== userId);
        event.updatedAt = new Date();
      }
      return {
        success: true,
        data: undefined
      };
    }
    return apiService.delete<void>(`/events/${eventId}/participants/${userId}`);
  }

  async confirmParticipant(eventId: string, userId: string): Promise<ApiResponse<void>> {
    if (this.useMockData) {
      const event = mockEvents.find(e => e.id === eventId);
      if (event && !event.confirmedParticipants.includes(userId)) {
        event.confirmedParticipants.push(userId);
        event.updatedAt = new Date();
      }
      return {
        success: true,
        data: undefined
      };
    }
    return apiService.post<void>(`/events/${eventId}/participants/${userId}/confirm`);
  }

  async bulkInviteParticipants(eventId: string, userIds: string[]): Promise<ApiResponse<void>> {
    if (this.useMockData) {
      const event = mockEvents.find(e => e.id === eventId);
      if (event) {
        userIds.forEach(userId => {
          if (!event.participants.includes(userId)) {
            event.participants.push(userId);
          }
        });
        event.updatedAt = new Date();
      }
      return {
        success: true,
        data: undefined
      };
    }
    return apiService.post<void>(`/events/${eventId}/participants/bulk-invite`, { userIds });
  }

  // Bulk operations
  async bulkOperations(operation: 'update_status' | 'delete' | 'duplicate', eventIds: string[], data?: any): Promise<ApiResponse<void>> {
    if (this.useMockData) {
      return {
        success: true,
        data: undefined
      };
    }
    return apiService.post<void>('/events/bulk-operations', { operation, eventIds, data });
  }

  // Export events
  async exportEvents(filters: Partial<EventSearchFilters>, format: 'csv' | 'json' | 'excel' = 'csv'): Promise<ApiResponse<Blob>> {
    if (this.useMockData) {
      const filtered = this.filterMockEvents(filters);
      const jsonData = JSON.stringify(filtered, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      return {
        success: true,
        data: blob
      };
    }
    return apiService.post<Blob>('/events/export', { filters, format });
  }
}

export const eventService = new EventService();