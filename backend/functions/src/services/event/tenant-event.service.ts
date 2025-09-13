/**
 * Service Event tenant-aware
 * Gestion des événements avec isolation par tenant
 */

import { Event, EventStatus, EventType, EventPriority, RecurrenceType } from '../../shared/types';
import { TenantAwareService, ValidateTenant } from '../base/tenant-aware.service';
import { TenantError, TenantErrorCode } from '../../shared/types/tenant.types';

export interface CreateEventRequest {
  title: string;
  description?: string;
  type: EventType;
  startDateTime: Date;
  endDateTime: Date;
  location?: {
    type: 'physical' | 'virtual' | 'hybrid';
    address?: string;
    coordinates?: { latitude: number; longitude: number };
    virtualUrl?: string;
  };
  maxParticipants?: number;
  isPublic?: boolean;
  requiresApproval?: boolean;
  tags?: string[];
  createdBy: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  type?: EventType;
  startDateTime?: Date;
  endDateTime?: Date;
  location?: any;
  maxParticipants?: number;
  isPublic?: boolean;
  requiresApproval?: boolean;
  tags?: string[];
  status?: EventStatus;
}

export interface EventListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: EventStatus;
  type?: EventType;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  createdBy?: string;
  tags?: string[];
}

export interface EventListResponse {
  events: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class TenantEventService extends TenantAwareService<Event> {
  constructor() {
    super('events');
  }

  /**
   * Obtenir tous les événements d'un tenant
   */
  @ValidateTenant
  async getEventsByTenant(
    tenantId: string,
    options: EventListOptions = {}
  ): Promise<EventListResponse> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'startDateTime',
      sortOrder = 'asc',
      status,
      type,
      startDate,
      endDate,
      createdBy,
      tags
    } = options;

    // Construire les filtres
    const filters: Array<{ field: string; operator: any; value: any }> = [];

    if (status) {
      filters.push({ field: 'status', operator: '==', value: status });
    }

    if (type) {
      filters.push({ field: 'type', operator: '==', value: type });
    }

    if (startDate) {
      filters.push({ field: 'startDateTime', operator: '>=', value: startDate });
    }

    if (endDate) {
      filters.push({ field: 'endDateTime', operator: '<=', value: endDate });
    }

    if (createdBy) {
      filters.push({ field: 'createdBy', operator: '==', value: createdBy });
    }

    // Calculer l'offset
    const offset = (page - 1) * limit;

    // Obtenir les données
    const result = await this.getAllByTenant(tenantId, {
      limit,
      offset,
      orderBy: sortBy,
      orderDirection: sortOrder,
      filters
    });

    // Filtrer par tags et terme de recherche (côté client)
    let events = result.data;

    if (tags && tags.length > 0) {
      events = events.filter(event =>
        event.tags && tags.some(tag => event.tags!.includes(tag))
      );
    }

    if (options.searchTerm) {
      const term = options.searchTerm.toLowerCase();
      events = events.filter(event =>
        event.title.toLowerCase().includes(term) ||
        event.description?.toLowerCase().includes(term)
      );
    }

    return {
      events,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasNext: result.hasMore,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Obtenir un événement par ID avec validation tenant
   */
  @ValidateTenant
  async getEventById(tenantId: string, eventId: string): Promise<Event | null> {
    return await this.getByIdAndTenant(eventId, tenantId);
  }

  /**
   * Créer un nouvel événement
   */
  @ValidateTenant
  async createEvent(tenantId: string, eventData: CreateEventRequest): Promise<Event> {
    // Valider les dates
    if (eventData.startDateTime >= eventData.endDateTime) {
      throw new TenantError(
        'Start time must be before end time',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }

    // Préparer les données de l'événement
    const eventToCreate: Partial<Event> = {
      title: eventData.title,
      description: eventData.description || '',
      type: eventData.type,
      status: EventStatus.DRAFT,
      priority: EventPriority.MEDIUM,
      startDateTime: eventData.startDateTime,
      endDateTime: eventData.endDateTime,
      timezone: 'UTC',
      allDay: false,
      location: eventData.location as any,
      capacity: eventData.maxParticipants || 100,
      organizerId: eventData.createdBy,
      organizerName: '',
      coOrganizers: [],
      participants: [],
      confirmedParticipants: [],
      maxParticipants: eventData.maxParticipants,
      registrationRequired: eventData.requiresApproval || false,
      attendanceSettings: {
        requireQRCode: false,
        requireGeolocation: false,
        requireBiometric: false,
        lateThresholdMinutes: 15,
        earlyThresholdMinutes: 15,
        allowManualMarking: true,
        requireValidation: false,
        required: true,
        allowLateCheckIn: true,
        allowEarlyCheckOut: true,
        requireApproval: false,
        autoMarkAbsent: false,
        autoMarkAbsentAfterMinutes: 30,
        allowSelfCheckIn: true,
        allowSelfCheckOut: true,
        checkInWindow: {
          beforeMinutes: 15,
          afterMinutes: 15
        }
      },
      waitingList: [],
      tags: eventData.tags || [],
      isPrivate: !eventData.isPublic,
      requiresApproval: eventData.requiresApproval || false,
      reminderSettings: {
        enabled: true,
        intervals: [60, 15],
        channels: ['email'],
        sendToOrganizers: true,
        sendToParticipants: true
      },
      recurrence: {
        type: RecurrenceType.NONE,
        interval: 1
      },
      stats: {
        totalInvited: 0,
        totalConfirmed: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalExcused: 0,
        totalLate: 0,
        attendanceRate: 0,
        punctualityRate: 0
      },
      allowFeedback: false,
      version: 1
    };

    return await this.createWithTenant(eventToCreate, tenantId);
  }

  /**
   * Mettre à jour un événement
   */
  @ValidateTenant
  async updateEvent(tenantId: string, eventId: string, updates: UpdateEventRequest): Promise<Event> {
    // Valider les dates si elles sont mises à jour
    if (updates.startDateTime && updates.endDateTime && updates.startDateTime >= updates.endDateTime) {
      throw new TenantError(
        'Start time must be before end time',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }

    return await this.updateWithTenant(eventId, updates, tenantId);
  }

  /**
   * Supprimer un événement
   */
  @ValidateTenant
  async deleteEvent(tenantId: string, eventId: string): Promise<boolean> {
    return await this.deleteWithTenant(eventId, tenantId);
  }

  /**
   * Publier un événement
   */
  @ValidateTenant
  async publishEvent(tenantId: string, eventId: string): Promise<Event> {
    const event = await this.getEventById(tenantId, eventId);
    if (!event) {
      throw new TenantError(
        'Event not found',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }

    if (event.status !== EventStatus.DRAFT) {
      throw new TenantError(
        'Only draft events can be published',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }

    return await this.updateWithTenant(eventId, {
      status: EventStatus.PUBLISHED
    }, tenantId);
  }

  /**
   * Annuler un événement
   */
  @ValidateTenant
  async cancelEvent(tenantId: string, eventId: string, reason?: string): Promise<Event> {
    const event = await this.getEventById(tenantId, eventId);
    if (!event) {
      throw new TenantError(
        'Event not found',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }

    return await this.updateWithTenant(eventId, {
      status: EventStatus.CANCELLED
    }, tenantId);
  }

  /**
   * Rechercher des événements
   */
  @ValidateTenant
  async searchEvents(
    tenantId: string,
    searchTerm: string,
    options: { limit?: number; type?: EventType; status?: EventStatus } = {}
  ): Promise<Event[]> {
    // Recherche par titre
    const titleResults = await this.searchByTenant(
      tenantId,
      'title',
      searchTerm,
      { limit: options.limit }
    );

    // Filtrer par type et statut si spécifiés
    let results = titleResults;

    if (options.type) {
      results = results.filter(event => event.type === options.type);
    }

    if (options.status) {
      results = results.filter(event => event.status === options.status);
    }

    return results;
  }

  /**
   * Obtenir les événements à venir
   */
  @ValidateTenant
  async getUpcomingEvents(
    tenantId: string,
    limit: number = 10
  ): Promise<Event[]> {
    const now = new Date();

    const result = await this.getAllByTenant(tenantId, {
      limit,
      orderBy: 'startDateTime',
      orderDirection: 'asc',
      filters: [
        { field: 'startDateTime', operator: '>', value: now },
        { field: 'status', operator: '==', value: EventStatus.PUBLISHED }
      ]
    });

    return result.data;
  }

  /**
   * Obtenir les événements passés
   */
  @ValidateTenant
  async getPastEvents(
    tenantId: string,
    limit: number = 10
  ): Promise<Event[]> {
    const now = new Date();

    const result = await this.getAllByTenant(tenantId, {
      limit,
      orderBy: 'endDateTime',
      orderDirection: 'desc',
      filters: [
        { field: 'endDateTime', operator: '<', value: now }
      ]
    });

    return result.data;
  }

  /**
   * Obtenir les statistiques des événements pour un tenant
   */
  @ValidateTenant
  async getEventStats(tenantId: string): Promise<{
    total: number;
    published: number;
    draft: number;
    cancelled: number;
    completed: number;
    upcoming: number;
    byType: Record<EventType, number>;
    createdToday: number;
    createdThisWeek: number;
    createdThisMonth: number;
  }> {
    const baseStats = await this.getStatsForTenant(tenantId);
    const now = new Date();

    const [published, draft, cancelled, completed, upcoming] = await Promise.all([
      this.countByTenant(tenantId, [{ field: 'status', operator: '==', value: EventStatus.PUBLISHED }]),
      this.countByTenant(tenantId, [{ field: 'status', operator: '==', value: EventStatus.DRAFT }]),
      this.countByTenant(tenantId, [{ field: 'status', operator: '==', value: EventStatus.CANCELLED }]),
      this.countByTenant(tenantId, [{ field: 'status', operator: '==', value: EventStatus.COMPLETED }]),
      this.countByTenant(tenantId, [
        { field: 'startDateTime', operator: '>', value: now },
        { field: 'status', operator: '==', value: EventStatus.PUBLISHED }
      ])
    ]);

    // Compter par type
    const typePromises = Object.values(EventType).map(async type => {
      const count = await this.countByTenant(tenantId, [{ field: 'type', operator: '==', value: type }]);
      return { type, count };
    });

    const typeCounts = await Promise.all(typePromises);
    const byType = typeCounts.reduce((acc, { type, count }) => {
      acc[type] = count;
      return acc;
    }, {} as Record<EventType, number>);

    return {
      total: baseStats.total,
      published,
      draft,
      cancelled,
      completed,
      upcoming,
      byType,
      createdToday: baseStats.createdToday,
      createdThisWeek: baseStats.createdThisWeek,
      createdThisMonth: baseStats.createdThisMonth
    };
  }
}

// Instance singleton
export const tenantEventService = new TenantEventService();
export default tenantEventService;