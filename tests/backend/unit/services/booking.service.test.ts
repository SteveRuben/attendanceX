import { BookingService } from '../../../../backend/functions/src/services/booking.service';
import { AppointmentService } from '../../../../backend/functions/src/services/appointment.service';
import { ClientService } from '../../../../backend/functions/src/services/client.service';
import { 
  APPOINTMENT_STATUSES,
  BookingRequest,
  AvailableSlot,
  Service,
  Client,
  Appointment
} from '@attendance-x/shared';

// Mock Firebase
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      })),
      add: jest.fn(),
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn()
            }))
          }))
        }))
      }))
    }))
  })),
  Timestamp: {
    fromDate: jest.fn((date) => ({ toDate: () => date }))
  }
}));

// Mock des services
jest.mock('../../../../backend/functions/src/services/appointment.service');
jest.mock('../../../../backend/functions/src/services/client.service');

describe('BookingService', () => {
  let bookingService: BookingService;
  let mockAppointmentService: jest.Mocked<AppointmentService>;
  let mockClientService: jest.Mocked<ClientService>;

  const mockOrganizationId = 'org-123';
  const mockServiceId = 'service-123';
  const mockPractitionerId = 'practitioner-123';
  const mockClientId = 'client-123';
  const mockAppointmentId = 'appointment-123';

  const mockService: Service = {
    id: mockServiceId,
    organizationId: mockOrganizationId,
    name: 'Test Service',
    duration: 30,
    practitioners: [mockPractitionerId],
    color: '#4CAF50',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockClient: Client = {
    id: mockClientId,
    organizationId: mockOrganizationId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+33123456789',
    preferences: {
      reminderMethod: 'email',
      language: 'fr'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockSettings = {
    getData: () => ({
      bookingRules: {
        allowOnlineBooking: true,
        advanceBookingDays: 30,
        allowSameDayBooking: true,
        cancellationDeadlineHours: 24
      },
      defaultAppointmentDuration: 30
    })
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAppointmentService = new AppointmentService() as jest.Mocked<AppointmentService>;
    mockClientService = new ClientService() as jest.Mocked<ClientService>;
    
    bookingService = new BookingService();
    (bookingService as any).appointmentService = mockAppointmentService;
    (bookingService as any).clientService = mockClientService;
  });

  describe('getAvailableSlots', () => {
    it('should return available slots for a valid date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const mockSlots: AvailableSlot[] = [
        {
          date: futureDateString,
          startTime: '09:00',
          endTime: '09:30',
          duration: 30,
          practitionerId: mockPractitionerId,
          serviceId: mockServiceId
        }
      ];

      // Mock organization settings
      jest.spyOn(bookingService as any, 'getOrganizationSettings')
        .mockResolvedValue(mockSettings);

      // Mock service retrieval
      jest.spyOn(bookingService as any, 'getServiceById')
        .mockResolvedValue(mockService);

      // Mock appointment service
      mockAppointmentService.getAvailableSlots.mockResolvedValue(mockSlots);

      const result = await bookingService.getAvailableSlots(
        mockOrganizationId,
        futureDateString,
        mockServiceId,
        mockPractitionerId
      );

      expect(result).toEqual(mockSlots);
      expect(mockAppointmentService.getAvailableSlots).toHaveBeenCalledWith(
        mockOrganizationId,
        mockPractitionerId,
        futureDateString,
        mockServiceId,
        30
      );
    });

    it('should throw error if online booking is disabled', async () => {
      const disabledSettings = {
        getData: () => ({
          ...mockSettings.getData(),
          bookingRules: {
            ...mockSettings.getData().bookingRules,
            allowOnlineBooking: false
          }
        })
      };

      jest.spyOn(bookingService as any, 'getOrganizationSettings')
        .mockResolvedValue(disabledSettings);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateString = futureDate.toISOString().split('T')[0];

      await expect(
        bookingService.getAvailableSlots(mockOrganizationId, futureDateString)
      ).rejects.toThrow('Online booking is not enabled for this organization');
    });

    it('should throw error for invalid date format', async () => {
      await expect(
        bookingService.getAvailableSlots(mockOrganizationId, 'invalid-date')
      ).rejects.toThrow('Invalid date format (expected YYYY-MM-DD)');
    });

    it('should throw error for past dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const pastDateString = pastDate.toISOString().split('T')[0];

      await expect(
        bookingService.getAvailableSlots(mockOrganizationId, pastDateString)
      ).rejects.toThrow('Cannot book appointments in the past');
    });
  });

  describe('createBooking', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureDateString = futureDate.toISOString().split('T')[0];

    const mockBookingRequest: BookingRequest = {
      clientData: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+33123456789'
      },
      appointmentData: {
        date: futureDateString,
        startTime: '09:00',
        serviceId: mockServiceId,
        practitionerId: mockPractitionerId
      }
    };

    it('should create a booking successfully for new client', async () => {
      const mockAppointment: Appointment = {
        id: mockAppointmentId,
        organizationId: mockOrganizationId,
        clientId: mockClientId,
        practitionerId: mockPractitionerId,
        serviceId: mockServiceId,
        date: new Date(futureDateString),
        startTime: '09:00',
        duration: 30,
        status: APPOINTMENT_STATUSES.SCHEDULED,
        reminders: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock organization settings
      jest.spyOn(bookingService as any, 'getOrganizationSettings')
        .mockResolvedValue(mockSettings);

      // Mock service retrieval
      jest.spyOn(bookingService as any, 'getServiceById')
        .mockResolvedValue(mockService);

      // Mock slot availability check
      jest.spyOn(bookingService as any, 'checkSlotAvailability')
        .mockResolvedValue([]);

      // Mock client creation
      jest.spyOn(bookingService as any, 'getOrCreateClient')
        .mockResolvedValue({ client: mockClient, isNewClient: true });

      // Mock appointment creation
      mockAppointmentService.createAppointment.mockResolvedValue({
        getData: () => mockAppointment
      } as any);

      const result = await bookingService.createBooking(mockOrganizationId, mockBookingRequest);

      expect(result.appointment).toEqual(mockAppointment);
      expect(result.client).toEqual(mockClient);
      expect(result.isNewClient).toBe(true);
    });

    it('should throw error if online booking is disabled', async () => {
      const disabledSettings = {
        getData: () => ({
          ...mockSettings.getData(),
          bookingRules: {
            ...mockSettings.getData().bookingRules,
            allowOnlineBooking: false
          }
        })
      };

      jest.spyOn(bookingService as any, 'getOrganizationSettings')
        .mockResolvedValue(disabledSettings);

      // Mock service retrieval
      jest.spyOn(bookingService as any, 'getServiceById')
        .mockResolvedValue(mockService);

      await expect(
        bookingService.createBooking(mockOrganizationId, mockBookingRequest)
      ).rejects.toThrow('Online booking is not enabled for this organization');
    });

    it('should throw error if slot is not available', async () => {
      jest.spyOn(bookingService as any, 'getOrganizationSettings')
        .mockResolvedValue(mockSettings);

      // Mock service retrieval
      jest.spyOn(bookingService as any, 'getServiceById')
        .mockResolvedValue(mockService);

      jest.spyOn(bookingService as any, 'checkSlotAvailability')
        .mockResolvedValue([{
          type: 'time_overlap',
          message: 'Time slot is already booked'
        }]);

      await expect(
        bookingService.createBooking(mockOrganizationId, mockBookingRequest)
      ).rejects.toThrow('Booking conflicts: Time slot is already booked');
    });

    it('should validate client data', async () => {
      const invalidRequest = {
        ...mockBookingRequest,
        clientData: {
          ...mockBookingRequest.clientData,
          email: 'invalid-email'
        }
      };

      await expect(
        bookingService.createBooking(mockOrganizationId, invalidRequest)
      ).rejects.toThrow('Invalid email format');
    });
  });

  describe('modifyBooking', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const mockAppointment: Appointment = {
      id: mockAppointmentId,
      organizationId: mockOrganizationId,
      clientId: mockClientId,
      practitionerId: mockPractitionerId,
      serviceId: mockServiceId,
      date: futureDate,
      startTime: '09:00',
      duration: 30,
      status: APPOINTMENT_STATUSES.SCHEDULED,
      reminders: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should modify booking successfully', async () => {
      const updates = {
        startTime: '10:00',
        notes: 'Updated appointment'
      };

      // Mock appointment retrieval
      mockAppointmentService.getAppointmentById.mockResolvedValue({
        getData: () => mockAppointment
      } as any);

      // Mock client retrieval
      mockClientService.getClientById.mockResolvedValue({
        getData: () => mockClient
      } as any);

      // Mock organization settings
      jest.spyOn(bookingService as any, 'getOrganizationSettings')
        .mockResolvedValue(mockSettings);

      // Mock modification permission check
      jest.spyOn(bookingService as any, 'canAppointmentBeModified')
        .mockReturnValue({ allowed: true });

      // Mock slot availability check
      jest.spyOn(bookingService as any, 'checkSlotAvailability')
        .mockResolvedValue([]);

      // Mock appointment update
      const updatedAppointment = { ...mockAppointment, ...updates };
      mockAppointmentService.updateAppointment.mockResolvedValue({
        getData: () => updatedAppointment
      } as any);

      const result = await bookingService.modifyBooking(
        mockOrganizationId,
        mockAppointmentId,
        updates,
        mockClient.email
      );

      expect(result.startTime).toBe('10:00');
      expect(result.notes).toBe('Updated appointment');
    });

    it('should throw error if client is not authorized', async () => {
      mockAppointmentService.getAppointmentById.mockResolvedValue({
        getData: () => mockAppointment
      } as any);

      mockClientService.getClientById.mockResolvedValue({
        getData: () => ({ ...mockClient, email: 'different@example.com' })
      } as any);

      await expect(
        bookingService.modifyBooking(
          mockOrganizationId,
          mockAppointmentId,
          { startTime: '10:00' },
          mockClient.email
        )
      ).rejects.toThrow('Unauthorized to modify this appointment');
    });

    it('should throw error if modification deadline has passed', async () => {
      // Create appointment that's too close to current time
      const soonAppointment = {
        ...mockAppointment,
        date: new Date(),
        startTime: '10:00'
      };

      mockAppointmentService.getAppointmentById.mockResolvedValue({
        getData: () => soonAppointment
      } as any);

      mockClientService.getClientById.mockResolvedValue({
        getData: () => mockClient
      } as any);

      jest.spyOn(bookingService as any, 'getOrganizationSettings')
        .mockResolvedValue(mockSettings);

      jest.spyOn(bookingService as any, 'canAppointmentBeModified')
        .mockReturnValue({ 
          allowed: false, 
          reason: 'Modification deadline has passed (24 hours before appointment)' 
        });

      await expect(
        bookingService.modifyBooking(
          mockOrganizationId,
          mockAppointmentId,
          { startTime: '11:00' },
          mockClient.email
        )
      ).rejects.toThrow('Modification deadline has passed (24 hours before appointment)');
    });
  });

  describe('cancelBooking', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const mockAppointment: Appointment = {
      id: mockAppointmentId,
      organizationId: mockOrganizationId,
      clientId: mockClientId,
      practitionerId: mockPractitionerId,
      serviceId: mockServiceId,
      date: futureDate,
      startTime: '09:00',
      duration: 30,
      status: APPOINTMENT_STATUSES.SCHEDULED,
      reminders: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should cancel booking successfully', async () => {
      mockAppointmentService.getAppointmentById.mockResolvedValue({
        getData: () => mockAppointment
      } as any);

      mockClientService.getClientById.mockResolvedValue({
        getData: () => mockClient
      } as any);

      jest.spyOn(bookingService as any, 'getOrganizationSettings')
        .mockResolvedValue(mockSettings);

      jest.spyOn(bookingService as any, 'canAppointmentBeCancelled')
        .mockReturnValue({ allowed: true });

      mockAppointmentService.cancelAppointment.mockResolvedValue({} as any);

      await bookingService.cancelBooking(
        mockOrganizationId,
        mockAppointmentId,
        mockClient.email,
        'Client requested cancellation'
      );

      expect(mockAppointmentService.cancelAppointment).toHaveBeenCalledWith(
        mockAppointmentId,
        mockOrganizationId,
        'client_cancellation',
        'Client requested cancellation'
      );
    });

    it('should throw error if client is not authorized', async () => {
      mockAppointmentService.getAppointmentById.mockResolvedValue({
        getData: () => mockAppointment
      } as any);

      mockClientService.getClientById.mockResolvedValue({
        getData: () => ({ ...mockClient, email: 'different@example.com' })
      } as any);

      await expect(
        bookingService.cancelBooking(
          mockOrganizationId,
          mockAppointmentId,
          mockClient.email
        )
      ).rejects.toThrow('Unauthorized to cancel this appointment');
    });

    it('should throw error if cancellation deadline has passed', async () => {
      mockAppointmentService.getAppointmentById.mockResolvedValue({
        getData: () => mockAppointment
      } as any);

      mockClientService.getClientById.mockResolvedValue({
        getData: () => mockClient
      } as any);

      jest.spyOn(bookingService as any, 'getOrganizationSettings')
        .mockResolvedValue(mockSettings);

      jest.spyOn(bookingService as any, 'canAppointmentBeCancelled')
        .mockReturnValue({ 
          allowed: false, 
          reason: 'Cancellation deadline has passed (24 hours before appointment)' 
        });

      await expect(
        bookingService.cancelBooking(
          mockOrganizationId,
          mockAppointmentId,
          mockClient.email
        )
      ).rejects.toThrow('Cancellation deadline has passed (24 hours before appointment)');
    });
  });

  describe('confirmBooking', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const mockAppointment: Appointment = {
      id: mockAppointmentId,
      organizationId: mockOrganizationId,
      clientId: mockClientId,
      practitionerId: mockPractitionerId,
      serviceId: mockServiceId,
      date: futureDate,
      startTime: '09:00',
      duration: 30,
      status: APPOINTMENT_STATUSES.SCHEDULED,
      reminders: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should confirm booking successfully', async () => {
      mockAppointmentService.getAppointmentById.mockResolvedValue({
        getData: () => mockAppointment
      } as any);

      mockClientService.getClientById.mockResolvedValue({
        getData: () => mockClient
      } as any);

      const confirmedAppointment = {
        ...mockAppointment,
        status: APPOINTMENT_STATUSES.CONFIRMED
      };

      mockAppointmentService.confirmAppointment.mockResolvedValue({
        getData: () => confirmedAppointment
      } as any);

      const result = await bookingService.confirmBooking(
        mockOrganizationId,
        mockAppointmentId,
        mockClient.email
      );

      expect(result.status).toBe(APPOINTMENT_STATUSES.CONFIRMED);
      expect(mockAppointmentService.confirmAppointment).toHaveBeenCalledWith(
        mockAppointmentId,
        mockOrganizationId,
        'client_confirmation'
      );
    });

    it('should throw error if appointment cannot be confirmed', async () => {
      const completedAppointment = {
        ...mockAppointment,
        status: APPOINTMENT_STATUSES.COMPLETED
      };

      mockAppointmentService.getAppointmentById.mockResolvedValue({
        getData: () => completedAppointment
      } as any);

      mockClientService.getClientById.mockResolvedValue({
        getData: () => mockClient
      } as any);

      await expect(
        bookingService.confirmBooking(
          mockOrganizationId,
          mockAppointmentId,
          mockClient.email
        )
      ).rejects.toThrow('Appointment cannot be confirmed in its current state');
    });
  });

  describe('Private methods', () => {
    describe('validateBookingParameters', () => {
      it('should validate correct parameters', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        const futureDateString = futureDate.toISOString().split('T')[0];

        await expect(
          (bookingService as any).validateBookingParameters(mockOrganizationId, futureDateString)
        ).resolves.not.toThrow();
      });

      it('should throw error for missing organization ID', async () => {
        await expect(
          (bookingService as any).validateBookingParameters('', '2024-03-15')
        ).rejects.toThrow('Organization ID is required');
      });

      it('should throw error for invalid date format', async () => {
        await expect(
          (bookingService as any).validateBookingParameters(mockOrganizationId, 'invalid-date')
        ).rejects.toThrow('Invalid date format (expected YYYY-MM-DD)');
      });
    });

    describe('canAppointmentBeModified', () => {
      it('should allow modification for scheduled appointment with enough time', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 2);
        
        const appointment = {
          id: mockAppointmentId,
          organizationId: mockOrganizationId,
          clientId: mockClientId,
          practitionerId: mockPractitionerId,
          serviceId: mockServiceId,
          date: futureDate,
          startTime: '09:00',
          duration: 30,
          status: APPOINTMENT_STATUSES.SCHEDULED,
          reminders: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = (bookingService as any).canAppointmentBeModified(appointment, mockSettings);
        expect(result.allowed).toBe(true);
      });

      it('should not allow modification for completed appointment', () => {
        const appointment = {
          id: mockAppointmentId,
          organizationId: mockOrganizationId,
          clientId: mockClientId,
          practitionerId: mockPractitionerId,
          serviceId: mockServiceId,
          date: new Date(),
          startTime: '09:00',
          duration: 30,
          status: APPOINTMENT_STATUSES.COMPLETED,
          reminders: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = (bookingService as any).canAppointmentBeModified(appointment, mockSettings);
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Appointment cannot be modified in its current state');
      });
    });

    describe('canAppointmentBeCancelled', () => {
      it('should allow cancellation for scheduled appointment with enough time', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 2);
        
        const appointment = {
          id: mockAppointmentId,
          organizationId: mockOrganizationId,
          clientId: mockClientId,
          practitionerId: mockPractitionerId,
          serviceId: mockServiceId,
          date: futureDate,
          startTime: '09:00',
          duration: 30,
          status: APPOINTMENT_STATUSES.SCHEDULED,
          reminders: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = (bookingService as any).canAppointmentBeCancelled(appointment, mockSettings);
        expect(result.allowed).toBe(true);
      });

      it('should not allow cancellation for completed appointment', () => {
        const appointment = {
          id: mockAppointmentId,
          organizationId: mockOrganizationId,
          clientId: mockClientId,
          practitionerId: mockPractitionerId,
          serviceId: mockServiceId,
          date: new Date(),
          startTime: '09:00',
          duration: 30,
          status: APPOINTMENT_STATUSES.COMPLETED,
          reminders: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = (bookingService as any).canAppointmentBeCancelled(appointment, mockSettings);
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Appointment cannot be cancelled in its current state');
      });
    });
  });
});