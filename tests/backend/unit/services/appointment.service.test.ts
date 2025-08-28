// tests/backend/unit/services/appointment.service.test.ts
import { AppointmentService } from '../../../../backend/functions/src/services/appointment.service';
import { AppointmentModel } from '../../../../backend/functions/src/models/appointment.model';
import { ClientModel } from '../../../../backend/functions/src/models/client.model';
import { OrganizationAppointmentSettingsModel } from '../../../../backend/functions/src/models/organization-appointment-settings.model';
import { 
  APPOINTMENT_STATUSES, 
  APPOINTMENT_CONFLICT_TYPES,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  AppointmentFilters
} from '@attendance-x/shared';
import { getFirestore } from 'firebase-admin/firestore';

// Mock Firebase
jest.mock('firebase-admin/firestore');
jest.mock('../../../../backend/functions/src/models/appointment.model');
jest.mock('../../../../backend/functions/src/models/client.model');
jest.mock('../../../../backend/functions/src/models/organization-appointment-settings.model');

// Mock static methods
const mockAppointmentModelFromFirestore = jest.fn();
const mockClientModelFromFirestore = jest.fn();
const mockOrganizationAppointmentSettingsModelFromFirestore = jest.fn();

// Mock the classes
(AppointmentModel as any).fromFirestore = mockAppointmentModelFromFirestore;
(ClientModel as any).fromFirestore = mockClientModelFromFirestore;
(OrganizationAppointmentSettingsModel as any).fromFirestore = mockOrganizationAppointmentSettingsModelFromFirestore;

const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      update: jest.fn()
    })),
    add: jest.fn(),
    where: jest.fn(() => ({
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            orderBy: jest.fn(() => ({
              orderBy: jest.fn(() => ({
                get: jest.fn()
              }))
            }))
          }))
        }))
      }))
    }))
  }))
};

(getFirestore as jest.Mock).mockReturnValue(mockFirestore);

describe('AppointmentService', () => {
  let appointmentService: AppointmentService;

  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-123';
  const mockClientId = 'client-123';
  const mockPractitionerId = 'practitioner-123';
  const mockServiceId = 'service-123';

  beforeEach(() => {
    appointmentService = new AppointmentService();
    jest.clearAllMocks();
  });

  describe('createAppointment', () => {
    const mockCreateRequest: CreateAppointmentRequest = {
      clientId: mockClientId,
      practitionerId: mockPractitionerId,
      serviceId: mockServiceId,
      date: '2024-12-15',
      startTime: '10:00',
      notes: 'Test appointment'
    };

    it('should create a new appointment successfully', async () => {
      // Mock client exists
      const mockClientDoc = {
        exists: true,
        data: () => ({ organizationId: mockOrganizationId })
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockClientDoc);
      
      // Mock ClientModel
      const mockClient = {
        getData: () => ({ organizationId: mockOrganizationId })
      };
      mockClientModelFromFirestore.mockReturnValue(mockClient);

      // Mock no conflicts
      jest.spyOn(appointmentService as any, 'checkAvailability').mockResolvedValue([]);

      // Mock appointment model
      const mockAppointmentModelInstance = {
        validate: jest.fn().mockResolvedValue(true),
        toFirestore: jest.fn().mockReturnValue({}),
        update: jest.fn(),
        id: 'appointment-123'
      };
      (AppointmentModel as any).mockImplementation(() => mockAppointmentModelInstance);

      // Mock Firestore add
      const mockDocRef = { id: 'appointment-123', update: jest.fn() };
      mockFirestore.collection().add.mockResolvedValue(mockDocRef);

      const result = await appointmentService.createAppointment(
        mockCreateRequest,
        mockOrganizationId,
        mockUserId
      );

      expect(result).toBe(mockAppointmentModelInstance);
      expect(mockAppointmentModelInstance.validate).toHaveBeenCalled();
      expect(mockFirestore.collection().add).toHaveBeenCalled();
    });

    it('should throw error if client not found', async () => {
      const mockClientDoc = { exists: false };
      mockFirestore.collection().doc().get.mockResolvedValue(mockClientDoc);

      await expect(
        appointmentService.createAppointment(
          mockCreateRequest,
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow('Client not found');
    });

    it('should throw error if client not in organization', async () => {
      const mockClientDoc = {
        exists: true,
        data: () => ({ organizationId: 'other-org' })
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockClientDoc);

      const mockClient = {
        getData: () => ({ organizationId: 'other-org' })
      };
      mockClientModelFromFirestore.mockReturnValue(mockClient);

      await expect(
        appointmentService.createAppointment(
          mockCreateRequest,
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow('Client not found in organization');
    });

    it('should throw error if appointment conflicts exist', async () => {
      // Mock client exists
      const mockClientDoc = {
        exists: true,
        data: () => ({ organizationId: mockOrganizationId })
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockClientDoc);
      
      const mockClient = {
        getData: () => ({ organizationId: mockOrganizationId })
      };
      mockClientModelFromFirestore.mockReturnValue(mockClient);

      // Mock conflicts
      const mockConflicts = [{
        type: APPOINTMENT_CONFLICT_TYPES.TIME_OVERLAP,
        message: 'Time conflict detected'
      }];
      jest.spyOn(appointmentService as any, 'checkAvailability').mockResolvedValue(mockConflicts);

      await expect(
        appointmentService.createAppointment(
          mockCreateRequest,
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow('Appointment conflicts detected');
    });

    it('should validate date format', async () => {
      const invalidRequest = {
        ...mockCreateRequest,
        date: 'invalid-date'
      };

      await expect(
        appointmentService.createAppointment(
          invalidRequest,
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow('Invalid date format');
    });

    it('should validate time format', async () => {
      const invalidRequest = {
        ...mockCreateRequest,
        startTime: '25:00'
      };

      await expect(
        appointmentService.createAppointment(
          invalidRequest,
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow('Invalid time format');
    });

    it('should reject past dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const invalidRequest = {
        ...mockCreateRequest,
        date: pastDate.toISOString().split('T')[0]
      };

      await expect(
        appointmentService.createAppointment(
          invalidRequest,
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow('Appointment date must be in the future');
    });
  });

  describe('updateAppointment', () => {
    const mockAppointmentId = 'appointment-123';
    const mockUpdateRequest: UpdateAppointmentRequest = {
      startTime: '11:00',
      notes: 'Updated notes'
    };

    it('should update appointment successfully', async () => {
      // Mock existing appointment
      const mockAppointment = {
        canBeModified: () => true,
        getData: () => ({
          date: new Date('2024-12-15'),
          startTime: '10:00',
          duration: 30,
          practitionerId: mockPractitionerId
        }),
        update: jest.fn(),
        validate: jest.fn().mockResolvedValue(true),
        toFirestore: jest.fn().mockReturnValue({})
      };

      jest.spyOn(appointmentService, 'getAppointmentById').mockResolvedValue(mockAppointment as any);
      jest.spyOn(appointmentService as any, 'checkAvailability').mockResolvedValue([]);

      const mockDocRef = { get: jest.fn(), update: jest.fn() };
      mockFirestore.collection().doc.mockReturnValue(mockDocRef);

      const result = await appointmentService.updateAppointment(
        mockAppointmentId,
        mockUpdateRequest,
        mockOrganizationId,
        mockUserId
      );

      expect(result).toBe(mockAppointment);
      expect(mockAppointment.update).toHaveBeenCalled();
      expect(mockAppointment.validate).toHaveBeenCalled();
      expect(mockDocRef.update).toHaveBeenCalled();
    });

    it('should throw error if appointment not found', async () => {
      jest.spyOn(appointmentService, 'getAppointmentById').mockResolvedValue(null);

      await expect(
        appointmentService.updateAppointment(
          mockAppointmentId,
          mockUpdateRequest,
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow('Appointment not found');
    });

    it('should throw error if appointment cannot be modified', async () => {
      const mockAppointment = {
        canBeModified: () => false
      };

      jest.spyOn(appointmentService, 'getAppointmentById').mockResolvedValue(mockAppointment as any);

      await expect(
        appointmentService.updateAppointment(
          mockAppointmentId,
          mockUpdateRequest,
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow('This appointment cannot be modified');
    });
  });

  describe('deleteAppointment', () => {
    const mockAppointmentId = 'appointment-123';

    it('should delete appointment successfully', async () => {
      const mockAppointment = {
        update: jest.fn(),
        toFirestore: jest.fn().mockReturnValue({})
      };

      jest.spyOn(appointmentService, 'getAppointmentById').mockResolvedValue(mockAppointment as any);

      const mockDocRef = { get: jest.fn(), update: jest.fn() };
      mockFirestore.collection().doc.mockReturnValue(mockDocRef);

      await appointmentService.deleteAppointment(
        mockAppointmentId,
        mockOrganizationId,
        mockUserId,
        'Test reason'
      );

      expect(mockAppointment.update).toHaveBeenCalledWith(
        { status: APPOINTMENT_STATUSES.CANCELLED },
        {
          action: 'cancelled',
          performedBy: mockUserId,
          reason: 'Test reason'
        }
      );
      expect(mockDocRef.update).toHaveBeenCalled();
    });

    it('should throw error if appointment not found', async () => {
      jest.spyOn(appointmentService, 'getAppointmentById').mockResolvedValue(null);

      await expect(
        appointmentService.deleteAppointment(
          mockAppointmentId,
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow('Appointment not found');
    });
  });

  describe('getAppointmentById', () => {
    const mockAppointmentId = 'appointment-123';

    it('should return appointment if found and belongs to organization', async () => {
      const mockDoc = { exists: true };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);

      const mockAppointment = {
        getData: () => ({ organizationId: mockOrganizationId }),
        id: mockAppointmentId
      };
      mockAppointmentModelFromFirestore.mockReturnValue(mockAppointment);

      const result = await appointmentService.getAppointmentById(
        mockAppointmentId,
        mockOrganizationId
      );

      expect(result).toBe(mockAppointment);
    });

    it('should return null if document does not exist', async () => {
      const mockDoc = { exists: false };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);

      const result = await appointmentService.getAppointmentById(
        mockAppointmentId,
        mockOrganizationId
      );

      expect(result).toBeNull();
    });

    it('should return null if appointment belongs to different organization', async () => {
      const mockDoc = { exists: true };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);

      const mockAppointment = {
        getData: () => ({ organizationId: 'other-org' })
      };
      mockAppointmentModelFromFirestore.mockReturnValue(mockAppointment);

      const result = await appointmentService.getAppointmentById(
        mockAppointmentId,
        mockOrganizationId
      );

      expect(result).toBeNull();
    });
  });

  describe('getAppointments', () => {
    it('should return appointments with basic filters', async () => {
      const mockSnapshot = {
        docs: [
          { id: 'app1' },
          { id: 'app2' }
        ]
      };

      // Mock query chain
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };
      mockFirestore.collection().where.mockReturnValue(mockQuery);

      const mockAppointments = [
        { getData: () => ({ id: 'app1' }) },
        { getData: () => ({ id: 'app2' }) }
      ];
      mockAppointmentModelFromFirestore
        .mockReturnValueOnce(mockAppointments[0])
        .mockReturnValueOnce(mockAppointments[1]);

      const filters: AppointmentFilters = {
        practitionerId: mockPractitionerId
      };

      const result = await appointmentService.getAppointments(
        mockOrganizationId,
        filters
      );

      expect(result).toHaveLength(2);
      expect(mockQuery.where).toHaveBeenCalledWith('organizationId', '==', mockOrganizationId);
      expect(mockQuery.where).toHaveBeenCalledWith('practitionerId', '==', mockPractitionerId);
    });

    it('should filter by search query', async () => {
      const mockSnapshot = {
        docs: [{ id: 'app1' }]
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };
      mockFirestore.collection().where.mockReturnValue(mockQuery);

      const mockAppointment = {
        getData: () => ({ 
          notes: 'Test appointment notes',
          clientId: 'client-123',
          serviceId: 'service-123'
        })
      };
      mockAppointmentModelFromFirestore.mockReturnValue(mockAppointment);

      const filters: AppointmentFilters = {
        searchQuery: 'test'
      };

      const result = await appointmentService.getAppointments(
        mockOrganizationId,
        filters
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockAppointment);
    });
  });

  describe('checkAvailability', () => {
    it('should return no conflicts for available slot', async () => {
      // Mock working hours check
      jest.spyOn(appointmentService as any, 'checkWorkingHours').mockResolvedValue(null);
      
      // Mock time conflicts check
      jest.spyOn(appointmentService as any, 'checkTimeConflicts').mockResolvedValue([]);

      const result = await appointmentService.checkAvailability(
        mockOrganizationId,
        mockPractitionerId,
        '2024-12-15',
        '10:00',
        30
      );

      expect(result).toHaveLength(0);
    });

    it('should return working hours conflict', async () => {
      const mockConflict = {
        type: APPOINTMENT_CONFLICT_TYPES.OUTSIDE_WORKING_HOURS,
        message: 'Outside working hours'
      };

      jest.spyOn(appointmentService as any, 'checkWorkingHours').mockResolvedValue(mockConflict);
      jest.spyOn(appointmentService as any, 'checkTimeConflicts').mockResolvedValue([]);

      const result = await appointmentService.checkAvailability(
        mockOrganizationId,
        mockPractitionerId,
        '2024-12-15',
        '10:00',
        30
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockConflict);
    });

    it('should return time conflicts', async () => {
      const mockConflicts = [{
        type: APPOINTMENT_CONFLICT_TYPES.TIME_OVERLAP,
        message: 'Time overlap detected'
      }];

      jest.spyOn(appointmentService as any, 'checkWorkingHours').mockResolvedValue(null);
      jest.spyOn(appointmentService as any, 'checkTimeConflicts').mockResolvedValue(mockConflicts);

      const result = await appointmentService.checkAvailability(
        mockOrganizationId,
        mockPractitionerId,
        '2024-12-15',
        '10:00',
        30
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockConflicts[0]);
    });
  });

  describe('updateAppointmentStatus', () => {
    const mockAppointmentId = 'appointment-123';

    it('should update status successfully', async () => {
      const mockAppointment = {
        getData: () => ({ status: APPOINTMENT_STATUSES.SCHEDULED }),
        updateStatus: jest.fn(),
        validate: jest.fn().mockResolvedValue(true),
        toFirestore: jest.fn().mockReturnValue({})
      };

      jest.spyOn(appointmentService, 'getAppointmentById').mockResolvedValue(mockAppointment as any);
      jest.spyOn(appointmentService as any, 'validateStatusTransition').mockImplementation(() => {});

      const mockDocRef = { get: jest.fn(), update: jest.fn() };
      mockFirestore.collection().doc.mockReturnValue(mockDocRef);

      const result = await appointmentService.updateAppointmentStatus(
        mockAppointmentId,
        APPOINTMENT_STATUSES.CONFIRMED,
        mockOrganizationId,
        mockUserId,
        'Test reason'
      );

      expect(result).toBe(mockAppointment);
      expect(mockAppointment.updateStatus).toHaveBeenCalledWith(
        APPOINTMENT_STATUSES.CONFIRMED,
        mockUserId,
        'Test reason'
      );
    });

    it('should throw error for invalid status transition', async () => {
      const mockAppointment = {
        getData: () => ({ status: APPOINTMENT_STATUSES.COMPLETED })
      };

      jest.spyOn(appointmentService, 'getAppointmentById').mockResolvedValue(mockAppointment as any);

      await expect(
        appointmentService.updateAppointmentStatus(
          mockAppointmentId,
          APPOINTMENT_STATUSES.SCHEDULED,
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('confirmAppointment', () => {
    it('should confirm appointment', async () => {
      const mockAppointment = { id: 'appointment-123' };
      
      jest.spyOn(appointmentService, 'updateAppointmentStatus')
        .mockResolvedValue(mockAppointment as any);

      const result = await appointmentService.confirmAppointment(
        'appointment-123',
        mockOrganizationId,
        mockUserId
      );

      expect(result).toBe(mockAppointment);
      expect(appointmentService.updateAppointmentStatus).toHaveBeenCalledWith(
        'appointment-123',
        APPOINTMENT_STATUSES.CONFIRMED,
        mockOrganizationId,
        mockUserId,
        'Appointment confirmed'
      );
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment if within deadline', async () => {
      const mockAppointment = {
        canBeCancelled: jest.fn().mockReturnValue(true)
      };

      jest.spyOn(appointmentService, 'getAppointmentById').mockResolvedValue(mockAppointment as any);
      jest.spyOn(appointmentService as any, 'getOrganizationSettings').mockResolvedValue({
        getData: () => ({ bookingRules: { cancellationDeadlineHours: 24 } })
      });
      jest.spyOn(appointmentService, 'updateAppointmentStatus').mockResolvedValue(mockAppointment as any);

      const result = await appointmentService.cancelAppointment(
        'appointment-123',
        mockOrganizationId,
        mockUserId,
        'Test reason'
      );

      expect(result).toBe(mockAppointment);
      expect(mockAppointment.canBeCancelled).toHaveBeenCalledWith(24);
    });

    it('should throw error if cancellation deadline passed', async () => {
      const mockAppointment = {
        canBeCancelled: jest.fn().mockReturnValue(false)
      };

      jest.spyOn(appointmentService, 'getAppointmentById').mockResolvedValue(mockAppointment as any);
      jest.spyOn(appointmentService as any, 'getOrganizationSettings').mockResolvedValue({
        getData: () => ({ bookingRules: { cancellationDeadlineHours: 24 } })
      });

      await expect(
        appointmentService.cancelAppointment(
          'appointment-123',
          mockOrganizationId,
          mockUserId
        )
      ).rejects.toThrow('Cancellation deadline has passed');
    });
  });

  describe('getAvailableSlots', () => {
    it('should return available slots', async () => {
      const mockSettings = {
        getData: () => ({
          bufferTimeBetweenAppointments: 5
        }),
        getWorkingHoursForDay: jest.fn().mockReturnValue({
          start: '09:00',
          end: '17:00'
        })
      };

      jest.spyOn(appointmentService as any, 'getOrganizationSettings')
        .mockResolvedValue(mockSettings);
      
      jest.spyOn(appointmentService, 'getAppointments').mockResolvedValue([]);

      const result = await appointmentService.getAvailableSlots(
        mockOrganizationId,
        mockPractitionerId,
        '2024-12-15',
        mockServiceId,
        30
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('date', '2024-12-15');
      expect(result[0]).toHaveProperty('startTime');
      expect(result[0]).toHaveProperty('endTime');
      expect(result[0]).toHaveProperty('duration', 30);
    });

    it('should return empty array if not open', async () => {
      const mockSettings = {
        getWorkingHoursForDay: jest.fn().mockReturnValue(null)
      };

      jest.spyOn(appointmentService as any, 'getOrganizationSettings')
        .mockResolvedValue(mockSettings);

      const result = await appointmentService.getAvailableSlots(
        mockOrganizationId,
        mockPractitionerId,
        '2024-12-15'
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('utility methods', () => {
    describe('validateStatusTransition', () => {
      it('should allow valid transitions', () => {
        expect(() => {
          (appointmentService as any).validateStatusTransition(
            APPOINTMENT_STATUSES.SCHEDULED,
            APPOINTMENT_STATUSES.CONFIRMED
          );
        }).not.toThrow();
      });

      it('should reject invalid transitions', () => {
        expect(() => {
          (appointmentService as any).validateStatusTransition(
            APPOINTMENT_STATUSES.COMPLETED,
            APPOINTMENT_STATUSES.SCHEDULED
          );
        }).toThrow('Invalid status transition');
      });
    });

    describe('calculateEndTime', () => {
      it('should calculate end time correctly', () => {
        const result = (appointmentService as any).calculateEndTime('10:00', 30);
        expect(result).toBe('10:30');
      });

      it('should handle hour overflow', () => {
        const result = (appointmentService as any).calculateEndTime('23:45', 30);
        expect(result).toBe('00:15');
      });
    });

    describe('timeToMinutes', () => {
      it('should convert time to minutes', () => {
        const result = (appointmentService as any).timeToMinutes('10:30');
        expect(result).toBe(630); // 10*60 + 30
      });
    });

    describe('minutesToTime', () => {
      it('should convert minutes to time', () => {
        const result = (appointmentService as any).minutesToTime(630);
        expect(result).toBe('10:30');
      });
    });

    describe('getDayOfWeek', () => {
      it('should return correct day of week', () => {
        const date = new Date('2024-12-15'); // Sunday
        const result = (appointmentService as any).getDayOfWeek(date);
        expect(result).toBe('sunday');
      });
    });
  });
});