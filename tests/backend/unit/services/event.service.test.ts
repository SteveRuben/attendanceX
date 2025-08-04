// tests/backend/unit/services/event.service.test.ts
import { EventService } from '../../../../backend/functions/src/services/event.service';
import { AuthService } from '../../../../backend/functions/src/services/auth.service';
import { UserService } from '../../../../backend/functions/src/services/user.service';
import { EventModel } from '../../../../backend/functions/src/models/event.model';
import { 
  CreateEventRequest, 
  UpdateEventRequest, 
  EventType, 
  EventStatus,
  EventPriority,
  ERROR_CODES,
  RecurrenceSettings 
} from '@attendance-x/shared';
import { getFirestore } from 'firebase-admin/firestore';

// Mock dependencies
jest.mock('firebase-admin/firestore');
jest.mock('../../../../backend/functions/src/services/auth.service');
jest.mock('../../../../backend/functions/src/services/user.service');
jest.mock('../../../../backend/functions/src/models/event.model');

const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
    where: jest.fn(() => ({
      get: jest.fn(),
      orderBy: jest.fn(() => ({
        get: jest.fn(),
        limit: jest.fn(() => ({
          get: jest.fn(),
        })),
        offset: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn(),
          })),
        })),
      })),
      limit: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
    orderBy: jest.fn(() => ({
      offset: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
    })),
    add: jest.fn(),
  })),
  batch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(),
  })),
};

(getFirestore as jest.Mock).mockReturnValue(mockFirestore);

const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;
const mockUserService = UserService as jest.MockedClass<typeof UserService>;
const mockEventModel = EventModel as jest.MockedClass<typeof EventModel>;

describe('EventService', () => {
  let eventService: EventService;

  beforeEach(() => {
    eventService = new EventService();
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    const validCreateRequest: CreateEventRequest = {
      title: 'Test Event',
      description: 'This is a test event',
      type: EventType.MEETING,
      startDateTime: new Date(Date.now() + 86400000), // Tomorrow
      endDateTime: new Date(Date.now() + 90000000), // Tomorrow + 1 hour
      location: {
        type: 'physical',
        address: {
          street: '123 Test St',
          city: 'Test City',
          postalCode: '12345',
          country: 'Test Country',
        },
      },
      participants: ['participant-1', 'participant-2'],
      maxParticipants: 50,
      attendanceSettings: {
        requireQRCode: true,
        requireGeolocation: false,
        requireBiometric: false,
        lateThresholdMinutes: 15,
        earlyThresholdMinutes: 15,
        checkInWindow: {
          beforeMinutes: 30,
          afterMinutes: 60,
        },
        geofenceRadius: 100,
      },
      priority: EventPriority.MEDIUM,
      tags: ['meeting', 'important'],
    };

    it('should create event successfully', async () => {
      const mockOrganizer = {
        id: 'organizer-id',
        getData: () => ({ displayName: 'Test Organizer' }),
      } as any;

      const mockEvent = {
        id: 'event-id',
        getData: () => ({ ...validCreateRequest, id: 'event-id' }),
        generateSecureQRCode: jest.fn().mockReturnValue({
          qrCode: 'qr-code-data',
          expiresAt: new Date(),
        }),
      } as any;

      mockEventService.prototype.validateCreateEventRequest = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.canCreateEvent = jest.fn().mockResolvedValue(true);
      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockOrganizer);
      mockEventService.prototype.checkScheduleConflicts = jest.fn().mockResolvedValue([]);
      mockEventModel.fromCreateRequest = jest.fn().mockReturnValue(mockEvent);
      mockEventService.prototype.saveEvent = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.logEventAction = jest.fn().mockResolvedValue(undefined);

      const result = await eventService.createEvent(validCreateRequest, 'organizer-id');

      expect(result).toBe(mockEvent);
      expect(mockEventService.prototype.saveEvent).toHaveBeenCalledWith(mockEvent);
      expect(mockEvent.generateSecureQRCode).toHaveBeenCalled();
    });

    it('should throw error for insufficient permissions', async () => {
      mockEventService.prototype.validateCreateEventRequest = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.canCreateEvent = jest.fn().mockResolvedValue(false);

      await expect(
        eventService.createEvent(validCreateRequest, 'organizer-id')
      ).rejects.toThrow(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        ...validCreateRequest,
        title: '',
      };

      mockEventService.prototype.validateCreateEventRequest = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.VALIDATION_ERROR)
      );

      await expect(
        eventService.createEvent(invalidRequest, 'organizer-id')
      ).rejects.toThrow(ERROR_CODES.VALIDATION_ERROR);
    });

    it('should validate date range', async () => {
      const invalidRequest = {
        ...validCreateRequest,
        startDateTime: new Date(Date.now() + 90000000),
        endDateTime: new Date(Date.now() + 86400000),
      };

      mockEventService.prototype.validateCreateEventRequest = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.INVALID_DATE_RANGE)
      );

      await expect(
        eventService.createEvent(invalidRequest, 'organizer-id')
      ).rejects.toThrow(ERROR_CODES.INVALID_DATE_RANGE);
    });

    it('should validate past dates', async () => {
      const invalidRequest = {
        ...validCreateRequest,
        startDateTime: new Date(Date.now() - 86400000), // Yesterday
        endDateTime: new Date(Date.now() - 82800000), // Yesterday + 1 hour
      };

      mockEventService.prototype.validateCreateEventRequest = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.INVALID_DATE_RANGE)
      );

      await expect(
        eventService.createEvent(invalidRequest, 'organizer-id')
      ).rejects.toThrow(ERROR_CODES.INVALID_DATE_RANGE);
    });

    it('should handle schedule conflicts', async () => {
      const conflicts = [
        {
          eventId: 'conflict-event-id',
          eventTitle: 'Conflicting Event',
          startDateTime: validCreateRequest.startDateTime,
          endDateTime: validCreateRequest.endDateTime,
          conflictType: 'overlap' as const,
        },
      ];

      mockEventService.prototype.validateCreateEventRequest = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.canCreateEvent = jest.fn().mockResolvedValue(true);
      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue({
        getData: () => ({ displayName: 'Test Organizer' }),
      });
      mockEventService.prototype.checkScheduleConflicts = jest.fn().mockResolvedValue(conflicts);

      // Should log conflicts but still create event
      const mockEvent = {
        id: 'event-id',
        getData: () => ({ ...validCreateRequest, id: 'event-id' }),
        generateSecureQRCode: jest.fn().mockReturnValue({
          qrCode: 'qr-code-data',
          expiresAt: new Date(),
        }),
      } as any;

      mockEventModel.fromCreateRequest = jest.fn().mockReturnValue(mockEvent);
      mockEventService.prototype.saveEvent = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.logEventAction = jest.fn().mockResolvedValue(undefined);

      const result = await eventService.createEvent(validCreateRequest, 'organizer-id');

      expect(result).toBe(mockEvent);
      expect(console.warn).toHaveBeenCalledWith('Schedule conflicts detected:', conflicts);
    });

    it('should create recurring events', async () => {
      const requestWithRecurrence = {
        ...validCreateRequest,
        recurrence: {
          type: 'weekly' as const,
          interval: 1,
          occurrences: 4,
        } as RecurrenceSettings,
      };

      const mockEvent = {
        id: 'event-id',
        getData: () => ({ ...requestWithRecurrence, id: 'event-id' }),
        generateSecureQRCode: jest.fn().mockReturnValue({
          qrCode: 'qr-code-data',
          expiresAt: new Date(),
        }),
      } as any;

      mockEventService.prototype.validateCreateEventRequest = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.canCreateEvent = jest.fn().mockResolvedValue(true);
      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue({
        getData: () => ({ displayName: 'Test Organizer' }),
      });
      mockEventService.prototype.checkScheduleConflicts = jest.fn().mockResolvedValue([]);
      mockEventModel.fromCreateRequest = jest.fn().mockReturnValue(mockEvent);
      mockEventService.prototype.saveEvent = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.createRecurringEvents = jest.fn().mockResolvedValue([]);
      mockEventService.prototype.logEventAction = jest.fn().mockResolvedValue(undefined);

      const result = await eventService.createEvent(requestWithRecurrence, 'organizer-id');

      expect(result).toBe(mockEvent);
      expect(mockEventService.prototype.createRecurringEvents).toHaveBeenCalledWith(
        mockEvent,
        requestWithRecurrence.recurrence
      );
    });
  });

  describe('createRecurringEvents', () => {
    const mockTemplate = {
      id: 'template-id',
      getData: () => ({
        id: 'template-id',
        title: 'Recurring Event',
        startDateTime: new Date('2023-01-01T10:00:00Z'),
        endDateTime: new Date('2023-01-01T11:00:00Z'),
        organizerId: 'organizer-id',
      }),
      update: jest.fn(),
    } as any;

    const recurrence: RecurrenceSettings = {
      type: 'weekly',
      interval: 1,
      occurrences: 3,
    };

    it('should create weekly recurring events', async () => {
      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };

      mockFirestore.batch.mockReturnValue(mockBatch);
      mockEventService.prototype.saveEvent = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.calculateRecurrenceOccurrences = jest.fn().mockReturnValue([
        {
          startDateTime: new Date('2023-01-08T10:00:00Z'),
          endDateTime: new Date('2023-01-08T11:00:00Z'),
        },
        {
          startDateTime: new Date('2023-01-15T10:00:00Z'),
          endDateTime: new Date('2023-01-15T11:00:00Z'),
        },
      ]);
      mockEventService.prototype.logEventAction = jest.fn().mockResolvedValue(undefined);

      const result = await eventService.createRecurringEvents(mockTemplate, recurrence);

      expect(result).toHaveLength(2);
      expect(mockTemplate.update).toHaveBeenCalledWith({ seriesId: expect.any(String) });
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should handle monthly recurrence', async () => {
      const monthlyRecurrence: RecurrenceSettings = {
        type: 'monthly',
        interval: 1,
        occurrences: 3,
      };

      mockEventService.prototype.calculateRecurrenceOccurrences = jest.fn().mockReturnValue([
        {
          startDateTime: new Date('2023-02-01T10:00:00Z'),
          endDateTime: new Date('2023-02-01T11:00:00Z'),
        },
        {
          startDateTime: new Date('2023-03-01T10:00:00Z'),
          endDateTime: new Date('2023-03-01T11:00:00Z'),
        },
      ]);

      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };

      mockFirestore.batch.mockReturnValue(mockBatch);
      mockEventService.prototype.saveEvent = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.logEventAction = jest.fn().mockResolvedValue(undefined);

      const result = await eventService.createRecurringEvents(mockTemplate, monthlyRecurrence);

      expect(result).toHaveLength(2);
    });

    it('should respect end date limit', async () => {
      const recurrenceWithEndDate: RecurrenceSettings = {
        type: 'weekly',
        interval: 1,
        endDate: new Date('2023-01-10T00:00:00Z'), // Only allows 1 occurrence
      };

      mockEventService.prototype.calculateRecurrenceOccurrences = jest.fn().mockReturnValue([
        {
          startDateTime: new Date('2023-01-08T10:00:00Z'),
          endDateTime: new Date('2023-01-08T11:00:00Z'),
        },
      ]);

      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };

      mockFirestore.batch.mockReturnValue(mockBatch);
      mockEventService.prototype.saveEvent = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.logEventAction = jest.fn().mockResolvedValue(undefined);

      const result = await eventService.createRecurringEvents(mockTemplate, recurrenceWithEndDate);

      expect(result).toHaveLength(1);
    });

    it('should handle exceptions in recurrence', async () => {
      const recurrenceWithExceptions: RecurrenceSettings = {
        type: 'weekly',
        interval: 1,
        occurrences: 3,
        exceptions: [new Date('2023-01-08T10:00:00Z')], // Skip second occurrence
      };

      mockEventService.prototype.calculateRecurrenceOccurrences = jest.fn().mockReturnValue([
        {
          startDateTime: new Date('2023-01-15T10:00:00Z'),
          endDateTime: new Date('2023-01-15T11:00:00Z'),
        },
      ]);

      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };

      mockFirestore.batch.mockReturnValue(mockBatch);
      mockEventService.prototype.saveEvent = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.logEventAction = jest.fn().mockResolvedValue(undefined);

      const result = await eventService.createRecurringEvents(mockTemplate, recurrenceWithExceptions);

      expect(result).toHaveLength(1); // One occurrence skipped due to exception
    });
  });

  describe('getEventById', () => {
    it('should return event by ID', async () => {
      const mockEvent = {
        id: 'event-id',
        getData: () => ({ id: 'event-id', title: 'Test Event' }),
      } as any;

      const mockDoc = {
        exists: true,
        data: () => ({ id: 'event-id', title: 'Test Event' }),
      };

      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);
      mockEventModel.fromFirestore = jest.fn().mockReturnValue(mockEvent);
      mockEventService.prototype.canViewEvent = jest.fn().mockResolvedValue(true);

      const result = await eventService.getEventById('event-id', 'user-id');

      expect(result).toBe(mockEvent);
      expect(mockFirestore.collection).toHaveBeenCalledWith('events');
      expect(mockFirestore.collection().doc).toHaveBeenCalledWith('event-id');
    });

    it('should throw error for non-existent event', async () => {
      const mockDoc = {
        exists: false,
      };

      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);

      await expect(
        eventService.getEventById('non-existent-id')
      ).rejects.toThrow(ERROR_CODES.EVENT_NOT_FOUND);
    });

    it('should throw error for insufficient permissions', async () => {
      const mockEvent = {
        id: 'event-id',
        getData: () => ({ id: 'event-id', title: 'Private Event', isPrivate: true }),
      } as any;

      const mockDoc = {
        exists: true,
        data: () => ({ id: 'event-id', title: 'Private Event' }),
      };

      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);
      mockEventModel.fromFirestore = jest.fn().mockReturnValue(mockEvent);
      mockEventService.prototype.canViewEvent = jest.fn().mockResolvedValue(false);

      await expect(
        eventService.getEventById('event-id', 'unauthorized-user')
      ).rejects.toThrow(ERROR_CODES.FORBIDDEN);
    });
  });

  describe('updateEvent', () => {
    const updateRequest: UpdateEventRequest = {
      title: 'Updated Event Title',
      description: 'Updated description',
      maxParticipants: 100,
    };

    it('should update event successfully', async () => {
      const mockEvent = {
        id: 'event-id',
        getData: () => ({ 
          id: 'event-id', 
          title: 'Original Title',
          status: EventStatus.DRAFT,
          participants: ['user-1'],
        }),
        update: jest.fn(),
        isQRCodeValid: jest.fn().mockReturnValue(true),
      } as any;

      mockEventService.prototype.getEventById = jest.fn().mockResolvedValue(mockEvent);
      mockEventService.prototype.canEditEvent = jest.fn().mockResolvedValue(true);
      mockEventService.prototype.canModifyEvent = jest.fn().mockReturnValue(true);
      mockEventService.prototype.validateUpdateRequest = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.isSignificantChange = jest.fn().mockReturnValue(false);
      mockEventService.prototype.saveEvent = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.logEventAction = jest.fn().mockResolvedValue(undefined);

      const result = await eventService.updateEvent('event-id', updateRequest, 'updater-id');

      expect(result).toBe(mockEvent);
      expect(mockEvent.update).toHaveBeenCalledWith(updateRequest);
      expect(mockEventService.prototype.saveEvent).toHaveBeenCalledWith(mockEvent);
    });

    it('should throw error for insufficient permissions', async () => {
      const mockEvent = {
        id: 'event-id',
        getData: () => ({ id: 'event-id', organizerId: 'other-user' }),
      } as any;

      mockEventService.prototype.getEventById = jest.fn().mockResolvedValue(mockEvent);
      mockEventService.prototype.canEditEvent = jest.fn().mockResolvedValue(false);

      await expect(
        eventService.updateEvent('event-id', updateRequest, 'unauthorized-user')
      ).rejects.toThrow(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    });

    it('should throw error for completed event', async () => {
      const mockEvent = {
        id: 'event-id',
        getData: () => ({ 
          id: 'event-id', 
          status: EventStatus.COMPLETED,
        }),
      } as any;

      mockEventService.prototype.getEventById = jest.fn().mockResolvedValue(mockEvent);
      mockEventService.prototype.canEditEvent = jest.fn().mockResolvedValue(true);
      mockEventService.prototype.canModifyEvent = jest.fn().mockReturnValue(false);

      await expect(
        eventService.updateEvent('event-id', updateRequest, 'updater-id')
      ).rejects.toThrow(ERROR_CODES.EVENT_ALREADY_STARTED);
    });

    it('should check schedule conflicts on date change', async () => {
      const updateWithDates = {
        ...updateRequest,
        startDateTime: new Date(Date.now() + 172800000), // Day after tomorrow
        endDateTime: new Date(Date.now() + 176400000), // Day after tomorrow + 1 hour
      };

      const mockEvent = {
        id: 'event-id',
        getData: () => ({ 
          id: 'event-id',
          status: EventStatus.DRAFT,
          participants: ['user-1'],
          location: { type: 'physical' },
        }),
        update: jest.fn(),
        isQRCodeValid: jest.fn().mockReturnValue(true),
      } as any;

      mockEventService.prototype.getEventById = jest.fn().mockResolvedValue(mockEvent);
      mockEventService.prototype.canEditEvent = jest.fn().mockResolvedValue(true);
      mockEventService.prototype.canModifyEvent = jest.fn().mockReturnValue(true);
      mockEventService.prototype.validateUpdateRequest = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.checkScheduleConflicts = jest.fn().mockResolvedValue([]);
      mockEventService.prototype.isSignificantChange = jest.fn().mockReturnValue(true);
      mockEventService.prototype.notifyEventUpdate = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.saveEvent = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.logEventAction = jest.fn().mockResolvedValue(undefined);

      const result = await eventService.updateEvent('event-id', updateWithDates, 'updater-id');

      expect(mockEventService.prototype.checkScheduleConflicts).toHaveBeenCalled();
      expect(mockEventService.prototype.notifyEventUpdate).toHaveBeenCalled();
      expect(result).toBe(mockEvent);
    });

    it('should refresh QR code when attendance settings change', async () => {
      const updateWithAttendance = {
        ...updateRequest,
        attendanceSettings: {
          requireQRCode: true,
          lateThresholdMinutes: 10,
        },
      };

      const mockEvent = {
        id: 'event-id',
        getData: () => ({ 
          id: 'event-id',
          status: EventStatus.DRAFT,
          participants: ['user-1'],
        }),
        update: jest.fn(),
        isQRCodeValid: jest.fn().mockReturnValue(false),
        refreshQRCode: jest.fn(),
      } as any;

      mockEventService.prototype.getEventById = jest.fn().mockResolvedValue(mockEvent);
      mockEventService.prototype.canEditEvent = jest.fn().mockResolvedValue(true);
      mockEventService.prototype.canModifyEvent = jest.fn().mockReturnValue(true);
      mockEventService.prototype.validateUpdateRequest = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.isSignificantChange = jest.fn().mockReturnValue(false);
      mockEventService.prototype.saveEvent = jest.fn().mockResolvedValue(undefined);
      mockEventService.prototype.logEventAction = jest.fn().mockResolvedValue(undefined);

      const result = await eventService.updateEvent('event-id', updateWithAttendance, 'updater-id');

      expect(mockEvent.refreshQRCode).toHaveBeenCalled();
      expect(result).toBe(mockEvent);
    });
  });

  describe('checkScheduleConflicts', () => {
    const startDateTime = new Date('2023-01-01T10:00:00Z');
    const endDateTime = new Date('2023-01-01T11:00:00Z');
    const participantIds = ['participant-1', 'participant-2'];
    const location = {
      type: 'physical' as const,
      address: {
        street: '123 Test St',
        city: 'Test City',
        postalCode: '12345',
        country: 'Test Country',
      },
    };

    it('should detect time overlap conflicts', async () => {
      const conflictingEvents = [
        {
          id: 'conflict-event',
          title: 'Conflicting Event',
          startDateTime: new Date('2023-01-01T09:30:00Z'),
          endDateTime: new Date('2023-01-01T10:30:00Z'),
        },
      ];

      const mockSnapshot = {
        docs: conflictingEvents.map(event => ({
          id: event.id,
          data: () => event,
        })),
      };

      mockFirestore.collection().where().get.mockResolvedValue(mockSnapshot);
      mockEventService.prototype.checkLocationConflicts = jest.fn().mockResolvedValue([]);

      const result = await eventService.checkScheduleConflicts(
        startDateTime,
        endDateTime,
        participantIds,
        location
      );

      expect(result).toHaveLength(1);
      expect(result[0].conflictType).toBe('overlap');
      expect(result[0].eventId).toBe('conflict-event');
    });

    it('should detect location conflicts', async () => {
      const mockSnapshot = { docs: [] };
      mockFirestore.collection().where().get.mockResolvedValue(mockSnapshot);

      const locationConflicts = [
        {
          eventId: 'location-conflict',
          eventTitle: 'Same Location Event',
          startDateTime,
          endDateTime,
          conflictType: 'location_conflict' as const,
        },
      ];

      mockEventService.prototype.checkLocationConflicts = jest.fn().mockResolvedValue(locationConflicts);

      const result = await eventService.checkScheduleConflicts(
        startDateTime,
        endDateTime,
        participantIds,
        location
      );

      expect(result).toHaveLength(1);
      expect(result[0].conflictType).toBe('location_conflict');
    });

    it('should exclude specified event from conflicts', async () => {
      const conflictingEvents = [
        {
          id: 'same-event', // This should be excluded
          title: 'Same Event',
          startDateTime,
          endDateTime,
        },
        {
          id: 'different-event',
          title: 'Different Event',
          startDateTime,
          endDateTime,
        },
      ];

      const mockSnapshot = {
        docs: conflictingEvents.map(event => ({
          id: event.id,
          data: () => event,
        })),
      };

      mockFirestore.collection().where().get.mockResolvedValue(mockSnapshot);
      mockEventService.prototype.checkLocationConflicts = jest.fn().mockResolvedValue([]);

      const result = await eventService.checkScheduleConflicts(
        startDateTime,
        endDateTime,
        participantIds,
        location,
        'same-event' // Exclude this event
      );

      expect(result).toHaveLength(1);
      expect(result[0].eventId).toBe('different-event');
    });

    it('should handle virtual events without location conflicts', async () => {
      const virtualLocation = {
        type: 'virtual' as const,
        virtualUrl: 'https://meet.example.com/test',
      };

      const mockSnapshot = { docs: [] };
      mockFirestore.collection().where().get.mockResolvedValue(mockSnapshot);

      const result = await eventService.checkScheduleConflicts(
        startDateTime,
        endDateTime,
        participantIds,
        virtualLocation
      );

      expect(result).toHaveLength(0);
      expect(mockEventService.prototype.checkLocationConflicts).not.toHaveBeenCalled();
    });
  });

  describe('getEvents', () => {
    it('should return paginated events', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Event 1', isPrivate: false },
        { id: 'event-2', title: 'Event 2', isPrivate: false },
      ];

      const mockSnapshot = {
        docs: mockEvents.map(event => ({
          data: () => event,
        })),
      };

      mockFirestore.collection().orderBy().offset().limit().get.mockResolvedValue(mockSnapshot);
      mockEventModel.fromFirestore = jest.fn()
        .mockReturnValueOnce({ getData: () => mockEvents[0] })
        .mockReturnValueOnce({ getData: () => mockEvents[1] });
      mockEventService.prototype.canViewEvent = jest.fn().mockResolvedValue(true);
      mockEventService.prototype.countEvents = jest.fn().mockResolvedValue(10);

      const result = await eventService.getEvents({
        page: 1,
        limit: 2,
      }, 'user-id');

      expect(result.events).toHaveLength(2);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
    });

    it('should filter by event type', async () => {
      const mockSnapshot = { docs: [] };
      mockFirestore.collection().where().orderBy().offset().limit().get.mockResolvedValue(mockSnapshot);
      mockEventService.prototype.countEvents = jest.fn().mockResolvedValue(0);

      await eventService.getEvents({ type: EventType.MEETING });

      expect(mockFirestore.collection().where).toHaveBeenCalledWith('type', '==', EventType.MEETING);
    });

    it('should filter by event status', async () => {
      const mockSnapshot = { docs: [] };
      mockFirestore.collection().where().orderBy().offset().limit().get.mockResolvedValue(mockSnapshot);
      mockEventService.prototype.countEvents = jest.fn().mockResolvedValue(0);

      await eventService.getEvents({ status: EventStatus.PUBLISHED });

      expect(mockFirestore.collection().where).toHaveBeenCalledWith('status', '==', EventStatus.PUBLISHED);
    });

    it('should filter by organizer', async () => {
      const mockSnapshot = { docs: [] };
      mockFirestore.collection().where().orderBy().offset().limit().get.mockResolvedValue(mockSnapshot);
      mockEventService.prototype.countEvents = jest.fn().mockResolvedValue(0);

      await eventService.getEvents({ organizerId: 'organizer-id' });

      expect(mockFirestore.collection().where).toHaveBeenCalledWith('organizerId', '==', 'organizer-id');
    });

    it('should filter by participant', async () => {
      const mockSnapshot = { docs: [] };
      mockFirestore.collection().where().orderBy().offset().limit().get.mockResolvedValue(mockSnapshot);
      mockEventService.prototype.countEvents = jest.fn().mockResolvedValue(0);

      await eventService.getEvents({ participantId: 'participant-id' });

      expect(mockFirestore.collection().where).toHaveBeenCalledWith('participants', 'array-contains', 'participant-id');
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      const mockSnapshot = { docs: [] };
      mockFirestore.collection().where().orderBy().offset().limit().get.mockResolvedValue(mockSnapshot);
      mockEventService.prototype.countEvents = jest.fn().mockResolvedValue(0);

      await eventService.getEvents({ startDate, endDate });

      expect(mockFirestore.collection().where).toHaveBeenCalledWith('startDateTime', '>=', startDate);
      expect(mockFirestore.collection().where).toHaveBeenCalledWith('startDateTime', '<=', endDate);
    });

    it('should validate pagination parameters', async () => {
      await expect(
        eventService.getEvents({ page: 0, limit: 1000 })
      ).rejects.toThrow(ERROR_CODES.BAD_REQUEST);
    });

    it('should respect privacy settings', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Public Event', isPrivate: false },
        { id: 'event-2', title: 'Private Event', isPrivate: true },
      ];

      const mockSnapshot = {
        docs: mockEvents.map(event => ({
          data: () => event,
        })),
      };

      mockFirestore.collection().orderBy().offset().limit().get.mockResolvedValue(mockSnapshot);
      mockEventModel.fromFirestore = jest.fn()
        .mockReturnValueOnce({ getData: () => mockEvents[0] })
        .mockReturnValueOnce({ getData: () => mockEvents[1] });
      mockEventService.prototype.canViewEvent = jest.fn()
        .mockResolvedValueOnce(true)  // Can view public event
        .mockResolvedValueOnce(false); // Cannot view private event
      mockEventService.prototype.countEvents = jest.fn().mockResolvedValue(2);

      const result = await eventService.getEvents({}, 'user-id');

      expect(result.events).toHaveLength(1); // Only public event returned
      expect(result.events[0].title).toBe('Public Event');
    });
  });

  describe('getUpcomingEvents', () => {
    it('should return upcoming events for user', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Upcoming Event 1',
          startDateTime: new Date(Date.now() + 86400000),
          status: EventStatus.PUBLISHED,
        },
        {
          id: 'event-2',
          title: 'Upcoming Event 2',
          startDateTime: new Date(Date.now() + 172800000),
          status: EventStatus.PUBLISHED,
        },
      ];

      const mockSnapshot = {
        docs: mockEvents.map(event => ({
          data: () => event,
        })),
      };

      mockFirestore.collection().where().orderBy().limit().get.mockResolvedValue(mockSnapshot);
      mockEventModel.fromFirestore = jest.fn()
        .mockReturnValueOnce({ getData: () => mockEvents[0] })
        .mockReturnValueOnce({ getData: () => mockEvents[1] });
      mockEventService.prototype.canViewEvent = jest.fn().mockResolvedValue(true);

      const result = await eventService.getUpcomingEvents('user-id', 5);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Upcoming Event 1');
      expect(mockFirestore.collection().where).toHaveBeenCalledWith('participants', 'array-contains', 'user-id');
    });

    it('should return public upcoming events when no user specified', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Public Upcoming Event',
          startDateTime: new Date(Date.now() + 86400000),
          status: EventStatus.PUBLISHED,
          isPrivate: false,
        },
      ];

      const mockSnapshot = {
        docs: mockEvents.map(event => ({
          data: () => event,
        })),
      };

      mockFirestore.collection().where().orderBy().limit().get.mockResolvedValue(mockSnapshot);
      mockEventModel.fromFirestore = jest.fn()
        .mockReturnValueOnce({ getData: () => mockEvents[0] });

      const result = await eventService.getUpcomingEvents(undefined, 5);

      expect(result).toHaveLength(1);
      expect(mockFirestore.collection().where).toHaveBeenCalledWith('isPrivate', '==', false);
    });

    it('should filter by event status', async () => {
      const mockSnapshot = { docs: [] };
      mockFirestore.collection().where().orderBy().limit().get.mockResolvedValue(mockSnapshot);

      await eventService.getUpcomingEvents('user-id');

      expect(mockFirestore.collection().where).toHaveBeenCalledWith(
        'status', 
        'in', 
        [EventStatus.PUBLISHED, EventStatus.IN_PROGRESS]
      );
    });

    it('should order by start date', async () => {
      const mockSnapshot = { docs: [] };
      mockFirestore.collection().where().orderBy().limit().get.mockResolvedValue(mockSnapshot);

      await eventService.getUpcomingEvents('user-id');

      expect(mockFirestore.collection().where().orderBy).toHaveBeenCalledWith('startDateTime', 'asc');
    });
  });

  describe('bulkInviteParticipants', () => {
    it('should invite multiple participants successfully', async () => {
      const mockEvent = {
        id: 'event-id',
        getData: () => ({ 
          id: 'event-id',
          organizerId: 'organizer-id',
          participants: ['existing-participant'],
        }),
      } as any;

      const userIds = ['user-1', 'user-2', 'user-3'];

      mockEventService.prototype.getEventById = jest.fn().mockResolvedValue(mockEvent);
      mockEventService.prototype.canManageParticipants = jest.fn().mockResolvedValue(true);
      mockEventService.prototype.addParticipant = jest.fn()
        .mockResolvedValueOnce(undefined) // user-1 success
        .mockResolvedValueOnce(undefined) // user-2 success
        .mockRejectedValueOnce(new Error('User not found')); // user-3 fails

      const result = await eventService.bulkInviteParticipants('event-id', userIds, 'inviter-id');

      expect(result.success).toEqual(['user-1', 'user-2']);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].userId).toBe('user-3');
      expect(result.failed[0].error).toBe('User not found');
    });

    it('should throw error for insufficient permissions', async () => {
      const mockEvent = {
        id: 'event-id',
        getData: () => ({ 
          id: 'event-id',
          organizerId: 'other-user',
        }),
      } as any;

      mockEventService.prototype.getEventById = jest.fn().mockResolvedValue(mockEvent);
      mockEventService.prototype.canManageParticipants = jest.fn().mockResolvedValue(false);

      await expect(
        eventService.bulkInviteParticipants('event-id', ['user-1'], 'unauthorized-user')
      ).rejects.toThrow(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    });

    it('should process participants in batches', async () => {
      const mockEvent = {
        id: 'event-id',
        getData: () => ({ 
          id: 'event-id',
          organizerId: 'organizer-id',
        }),
      } as any;

      // Create 25 user IDs to test batching (batch size is 10)
      const userIds = Array.from({ length: 25 }, (_, i) => `user-${i + 1}`);

      mockEventService.prototype.getEventById = jest.fn().mockResolvedValue(mockEvent);
      mockEventService.prototype.canManageParticipants = jest.fn().mockResolvedValue(true);
      mockEventService.prototype.addParticipant = jest.fn().mockResolvedValue(undefined);

      const result = await eventService.bulkInviteParticipants('event-id', userIds, 'inviter-id');

      expect(result.success).toHaveLength(25);
      expect(result.failed).toHaveLength(0);
      expect(mockEventService.prototype.addParticipant).toHaveBeenCalledTimes(25);
    });
  });
});