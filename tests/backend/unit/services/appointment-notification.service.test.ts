import { AppointmentNotificationService } from '../../../../backend/functions/src/services/appointment-notification.service';
import { ClientService } from '../../../../backend/functions/src/services/client.service';
import { appointmentTemplateService } from '../../../../backend/functions/src/services/appointment-template.service';
import { 
  Appointment, 
  Client, 
  OrganizationAppointmentSettings,
  APPOINTMENT_STATUSES 
} from '@attendance-x/shared';

// Mock des services
jest.mock('../../../../backend/functions/src/services/client.service');
jest.mock('../../../../backend/functions/src/services/appointment-template.service');
jest.mock('firebase-admin/firestore');

// Mock du service client
const mockClientService = {
  getClientById: jest.fn()
};
(ClientService as jest.MockedClass<typeof ClientService>).prototype.getClientById = mockClientService.getClientById;

describe('AppointmentNotificationService', () => {
  let service: AppointmentNotificationService;
  let mockClient: Client;
  let mockAppointment: Appointment;
  let mockOrgSettings: OrganizationAppointmentSettings;

  beforeEach(() => {
    jest.clearAllMocks();
    
    service = new AppointmentNotificationService();
    
    mockClient = {
      id: 'client-1',
      organizationId: 'org-1',
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      phone: '+33123456789',
      preferences: {
        reminderMethod: 'both',
        language: 'fr'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockAppointment = {
      id: 'appointment-1',
      organizationId: 'org-1',
      clientId: 'client-1',
      practitionerId: 'practitioner-1',
      serviceId: 'service-1',
      date: new Date('2024-12-15'),
      startTime: '14:00',
      duration: 60,
      status: APPOINTMENT_STATUSES.SCHEDULED,
      reminders: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockOrgSettings = {
      id: 'org-settings-1',
      workingHours: {
        monday: { start: '09:00', end: '18:00', isOpen: true },
        tuesday: { start: '09:00', end: '18:00', isOpen: true },
        wednesday: { start: '09:00', end: '18:00', isOpen: true },
        thursday: { start: '09:00', end: '18:00', isOpen: true },
        friday: { start: '09:00', end: '18:00', isOpen: true },
        saturday: { start: '09:00', end: '12:00', isOpen: true },
        sunday: { start: '09:00', end: '12:00', isOpen: false }
      },
      services: [],
      bookingRules: {
        advanceBookingDays: 30,
        cancellationDeadlineHours: 24,
        allowOnlineBooking: true,
        requireConfirmation: false,
        allowSameDayBooking: true
      },
      reminderConfig: {
        enabled: true,
        timings: [24, 2],
        templates: [],
        maxRetries: 3,
        retryIntervalMinutes: 30
      },
      timezone: 'Europe/Paris',
      defaultAppointmentDuration: 60,
      bufferTimeBetweenAppointments: 15,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  describe('scheduleReminders', () => {
    it('should schedule reminders for an appointment', async () => {
      // Mock des services
      mockClientService.getClientById.mockResolvedValue(mockClient);
      
      // Mock Firestore
      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => mockOrgSettings
        }),
        update: jest.fn().mockResolvedValue(undefined)
      };
      
      const mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc)
      };
      
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      // Mock getFirestore
      const { getFirestore } = require('firebase-admin/firestore');
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      await service.scheduleReminders(mockAppointment);

      expect(mockClientService.getClientById).toHaveBeenCalledWith('client-1');
      expect(mockDb.collection).toHaveBeenCalledWith('organization_appointment_settings');
      expect(mockDoc.get).toHaveBeenCalled();
      expect(mockDoc.update).toHaveBeenCalled();
    });

    it('should not schedule reminders if reminder config is disabled', async () => {
      const disabledOrgSettings = {
        ...mockOrgSettings,
        reminderConfig: {
          ...mockOrgSettings.reminderConfig,
          enabled: false
        }
      };

      mockClientService.getClientById.mockResolvedValue(mockClient);
      
      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => disabledOrgSettings
        }),
        update: jest.fn()
      };
      
      const mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc)
      };
      
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getFirestore } = require('firebase-admin/firestore');
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      await service.scheduleReminders(mockAppointment);

      expect(mockDoc.update).not.toHaveBeenCalled();
    });

    it('should throw error if client not found', async () => {
      mockClientService.getClientById.mockResolvedValue(null);

      await expect(service.scheduleReminders(mockAppointment))
        .rejects.toThrow('Client not found');
    });
  });

  describe('sendAppointmentConfirmation', () => {
    it('should send confirmation via email and SMS', async () => {
      mockClientService.getClientById.mockResolvedValue(mockClient);
      
      const mockEmailContent = {
        subject: 'Confirmation de rendez-vous',
        content: 'Votre rendez-vous est confirmé',
        html: '<p>Votre rendez-vous est confirmé</p>'
      };
      
      const mockSmsContent = {
        content: 'RDV confirmé'
      };

      (appointmentTemplateService.generateConfirmationContent as jest.Mock)
        .mockResolvedValueOnce(mockEmailContent)
        .mockResolvedValueOnce(mockSmsContent);

      const mockEmailService = {
        sendEmail: jest.fn().mockResolvedValue({ success: true })
      };
      
      const mockSmsService = {
        sendSms: jest.fn().mockResolvedValue({ status: 'sent' })
      };

      // Mock des services
      (service as any).emailService = mockEmailService;
      (service as any).smsService = mockSmsService;

      // Mock Firestore pour getOrganizationSettings
      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => mockOrgSettings
        })
      };
      
      const mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc)
      };
      
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getFirestore } = require('firebase-admin/firestore');
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      await service.sendAppointmentConfirmation(mockAppointment);

      expect(appointmentTemplateService.generateConfirmationContent).toHaveBeenCalledTimes(2);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        'jean.dupont@example.com',
        'Confirmation de rendez-vous',
        {
          html: '<p>Votre rendez-vous est confirmé</p>',
          text: 'Votre rendez-vous est confirmé'
        },
        {
          userId: 'client-1',
          trackingId: 'appointment-confirmation-appointment-1'
        }
      );
      expect(mockSmsService.sendSms).toHaveBeenCalledWith(
        '+33123456789',
        'RDV confirmé',
        {
          userId: 'client-1',
          trackingId: 'appointment-confirmation-appointment-1'
        }
      );
    });

    it('should throw error if client not found', async () => {
      mockClientService.getClientById.mockResolvedValue(null);

      await expect(service.sendAppointmentConfirmation(mockAppointment))
        .rejects.toThrow('Client not found');
    });
  });

  describe('sendAppointmentCancellation', () => {
    it('should send cancellation notification with reason', async () => {
      const reason = 'Urgence médicale';
      
      mockClientService.getClientById.mockResolvedValue(mockClient);
      
      const mockEmailContent = {
        subject: 'Annulation de rendez-vous',
        content: 'Votre rendez-vous a été annulé',
        html: '<p>Votre rendez-vous a été annulé</p>'
      };
      
      const mockSmsContent = {
        content: 'RDV annulé'
      };

      (appointmentTemplateService.generateCancellationContent as jest.Mock)
        .mockResolvedValueOnce(mockEmailContent)
        .mockResolvedValueOnce(mockSmsContent);

      const mockEmailService = {
        sendEmail: jest.fn().mockResolvedValue({ success: true })
      };
      
      const mockSmsService = {
        sendSms: jest.fn().mockResolvedValue({ status: 'sent' })
      };

      // Mock des services
      (service as any).emailService = mockEmailService;
      (service as any).smsService = mockSmsService;

      // Mock Firestore
      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => mockOrgSettings
        })
      };
      
      const mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc)
      };
      
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getFirestore } = require('firebase-admin/firestore');
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      await service.sendAppointmentCancellation(mockAppointment, reason);

      expect(appointmentTemplateService.generateCancellationContent).toHaveBeenCalledWith(
        mockAppointment,
        mockClient,
        'email',
        reason,
        mockOrgSettings
      );
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
      expect(mockSmsService.sendSms).toHaveBeenCalled();
    });
  });

  describe('cancelReminders', () => {
    it('should cancel all pending reminders for an appointment', async () => {
      const appointmentWithReminders = {
        ...mockAppointment,
        reminders: [
          {
            id: 'reminder-1',
            appointmentId: 'appointment-1',
            type: 'email' as const,
            scheduledFor: new Date(),
            status: 'pending' as const,
            content: 'Rappel',
            retryCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      };

      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => appointmentWithReminders
        }),
        update: jest.fn().mockResolvedValue(undefined)
      };
      
      const mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc)
      };
      
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getFirestore } = require('firebase-admin/firestore');
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      await service.cancelReminders('appointment-1');

      expect(mockDoc.update).toHaveBeenCalledWith({
        reminders: expect.arrayContaining([
          expect.objectContaining({
            status: 'failed',
            errorMessage: 'Cancelled due to appointment cancellation'
          })
        ]),
        updatedAt: expect.any(Date)
      });
    });
  });

  describe('getReminderStats', () => {
    it('should return reminder statistics for an appointment', async () => {
      const appointmentWithReminders = {
        ...mockAppointment,
        reminders: [
          {
            id: 'reminder-1',
            status: 'sent' as const,
            appointmentId: 'appointment-1',
            type: 'email' as const,
            scheduledFor: new Date(),
            content: 'Rappel',
            retryCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'reminder-2',
            status: 'pending' as const,
            appointmentId: 'appointment-1',
            type: 'sms' as const,
            scheduledFor: new Date(),
            content: 'Rappel',
            retryCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'reminder-3',
            status: 'failed' as const,
            appointmentId: 'appointment-1',
            type: 'email' as const,
            scheduledFor: new Date(),
            content: 'Rappel',
            retryCount: 3,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      };

      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => appointmentWithReminders
        })
      };
      
      const mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc)
      };
      
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getFirestore } = require('firebase-admin/firestore');
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      const stats = await service.getReminderStats('appointment-1');

      expect(stats).toEqual({
        total: 3,
        sent: 1,
        failed: 1,
        pending: 1
      });
    });

    it('should throw error if appointment not found', async () => {
      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          exists: false
        })
      };
      
      const mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc)
      };
      
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getFirestore } = require('firebase-admin/firestore');
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      await expect(service.getReminderStats('appointment-1'))
        .rejects.toThrow('Appointment not found');
    });
  });
});