import { AppointmentTemplateService } from '../../../../backend/functions/src/services/appointment-template.service';
import { 
  Appointment, 
  Client, 
  OrganizationAppointmentSettings,
  APPOINTMENT_STATUSES 
} from '@attendance-x/shared';
import { 
  getAppointmentTemplate, 
  processAppointmentTemplate 
} from '../../../../backend/functions/src/services/notification/templates/appointment-templates';

// Mock Firestore
jest.mock('firebase-admin/firestore');

describe('AppointmentTemplateService', () => {
  let service: AppointmentTemplateService;
  let mockClient: Client;
  let mockAppointment: Appointment;
  let mockOrgSettings: OrganizationAppointmentSettings;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the constructor's initializeDefaultTemplates call
    const mockDoc = {
      get: jest.fn().mockResolvedValue({ exists: true }),
      set: jest.fn().mockResolvedValue(undefined)
    };
    
    const mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc)
    };
    
    const mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection)
    };
    
    const { getFirestore } = require('firebase-admin/firestore');
    (getFirestore as jest.Mock).mockReturnValue(mockDb);
    
    service = new AppointmentTemplateService();
    
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

  describe('generateReminderContent', () => {
    it('should generate reminder content for 24h reminder', async () => {
      // Mock Firestore
      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            id: 'appointment_reminder_24h_email',
            type: 'email',
            language: 'fr',
            subject: 'Rappel: Rendez-vous demain à {{startTime}}',
            content: 'Bonjour {{clientFirstName}}, rappel pour demain à {{startTime}}',
            variables: ['clientFirstName', 'startTime']
          })
        })
      };
      
      const mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] })
      };
      
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getFirestore } = require('firebase-admin/firestore');
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      const result = await service.generateReminderContent(
        mockAppointment,
        mockClient,
        'email',
        24,
        mockOrgSettings
      );

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('html');
      expect(result.content).toContain('Jean');
    });

    it('should generate reminder content for 2h reminder', async () => {
      // Mock Firestore
      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            id: 'appointment_reminder_2h_sms',
            type: 'sms',
            language: 'fr',
            content: 'Rappel: RDV dans 2h à {{startTime}}',
            variables: ['startTime']
          })
        })
      };
      
      const mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] })
      };
      
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getFirestore } = require('firebase-admin/firestore');
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      const result = await service.generateReminderContent(
        mockAppointment,
        mockClient,
        'sms',
        2,
        mockOrgSettings
      );

      expect(result).toHaveProperty('content');
      expect(result.content).toContain('14:00');
    });

    it('should fallback to default content when template not found', async () => {
      // Mock Firestore to return no template
      const mockDoc = {
        get: jest.fn().mockResolvedValue({ exists: false })
      };
      
      const mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] })
      };
      
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getFirestore } = require('firebase-admin/firestore');
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      const result = await service.generateReminderContent(
        mockAppointment,
        mockClient,
        'email',
        24,
        mockOrgSettings
      );

      expect(result).toHaveProperty('content');
      expect(result.content).toContain('Jean');
      expect(result.content).toContain('demain');
    });
  });

  describe('generateConfirmationContent', () => {
    it('should generate confirmation content for email', async () => {
      // Mock Firestore
      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            id: 'appointment_confirmation_email',
            type: 'email',
            language: 'fr',
            subject: 'Confirmation de votre rendez-vous',
            content: 'Bonjour {{clientFirstName}}, votre RDV est confirmé',
            variables: ['clientFirstName']
          })
        })
      };
      
      const mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] })
      };
      
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getFirestore } = require('firebase-admin/firestore');
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      const result = await service.generateConfirmationContent(
        mockAppointment,
        mockClient,
        'email',
        mockOrgSettings
      );

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('content');
      expect(result.content).toContain('Jean');
    });
  });

  describe('generateCancellationContent', () => {
    it('should generate cancellation content with reason', async () => {
      const reason = 'Urgence médicale';
      
      // Mock Firestore
      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            id: 'appointment_cancellation_email',
            type: 'email',
            language: 'fr',
            subject: 'Annulation de votre rendez-vous',
            content: 'Bonjour {{clientFirstName}}, votre RDV est annulé. {{#if reason}}Raison: {{reason}}{{/if}}',
            variables: ['clientFirstName', 'reason']
          })
        })
      };
      
      const mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] })
      };
      
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getFirestore } = require('firebase-admin/firestore');
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      const result = await service.generateCancellationContent(
        mockAppointment,
        mockClient,
        'email',
        reason,
        mockOrgSettings
      );

      expect(result).toHaveProperty('content');
      expect(result.content).toContain('Jean');
      expect(result.content).toContain(reason);
    });
  });

  describe('saveCustomTemplate', () => {
    it('should save a custom template', async () => {
      const mockTemplate = {
        type: 'email' as const,
        language: 'fr',
        subject: 'Custom subject',
        content: 'Custom content',
        variables: ['clientFirstName']
      };

      const mockDocRef = {
        id: 'new-template-id'
      };

      const mockAdd = jest.fn().mockResolvedValue(mockDocRef);
      const mockCollection = {
        add: mockAdd
      };
      
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getFirestore } = require('firebase-admin/firestore');
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      const templateId = await service.saveCustomTemplate('org-1', mockTemplate);

      expect(templateId).toBe('new-template-id');
      expect(mockCollection.add).toHaveBeenCalledWith({
        ...mockTemplate,
        organizationId: 'org-1',
        isDefault: false,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });
  });

  describe('getOrganizationTemplates', () => {
    it('should return organization templates', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          organizationId: 'org-1',
          type: 'email',
          language: 'fr',
          subject: 'Template 1',
          content: 'Content 1',
          variables: []
        }
      ];

      const mockSnapshot = {
        docs: mockTemplates.map(template => ({
          id: template.id,
          data: () => template
        }))
      };

      const mockQuery = {
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      const mockCollection = {
        where: jest.fn().mockReturnValue(mockQuery)
      };
      
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getFirestore } = require('firebase-admin/firestore');
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      const templates = await service.getOrganizationTemplates('org-1');

      expect(templates).toHaveLength(1);
      expect(templates[0]).toMatchObject({
        id: 'template-1',
        type: 'email'
      });
    });
  });
});

describe('Template Processing Functions', () => {
  describe('getAppointmentTemplate', () => {
    it('should return email template for reminder_24h', () => {
      const template = getAppointmentTemplate('reminder_24h', 'email', 'fr');
      
      expect(template).toBeTruthy();
      expect(template?.id).toBe('appointment_reminder_24h_email');
      expect(template?.type).toBe('email');
    });

    it('should return SMS template for reminder_2h', () => {
      const template = getAppointmentTemplate('reminder_2h', 'sms', 'fr');
      
      expect(template).toBeTruthy();
      expect(template?.id).toBe('appointment_reminder_2h_sms');
      expect(template?.type).toBe('sms');
    });

    it('should return null for non-existent template', () => {
      const template = getAppointmentTemplate('reminder_24h', 'email', 'en');
      
      expect(template).toBeNull();
    });
  });

  describe('processAppointmentTemplate', () => {
    it('should replace simple variables', () => {
      const template = {
        id: 'test',
        type: 'email' as const,
        language: 'fr',
        subject: 'Hello {{clientFirstName}}',
        content: 'Bonjour {{clientFirstName}} {{clientLastName}}',
        variables: ['clientFirstName', 'clientLastName']
      };

      const variables = {
        clientFirstName: 'Jean',
        clientLastName: 'Dupont'
      };

      const result = processAppointmentTemplate(template, variables);

      expect(result.subject).toBe('Hello Jean');
      expect(result.content).toBe('Bonjour Jean Dupont');
    });

    it('should handle conditional blocks', () => {
      const template = {
        id: 'test',
        type: 'email' as const,
        language: 'fr',
        content: 'Hello {{clientFirstName}}{{#if reason}} - Reason: {{reason}}{{/if}}',
        variables: ['clientFirstName', 'reason']
      };

      const variablesWithReason = {
        clientFirstName: 'Jean',
        reason: 'Emergency'
      };

      const variablesWithoutReason = {
        clientFirstName: 'Jean',
        reason: ''
      };

      const resultWithReason = processAppointmentTemplate(template, variablesWithReason);
      const resultWithoutReason = processAppointmentTemplate(template, variablesWithoutReason);

      expect(resultWithReason.content).toBe('Hello Jean - Reason: Emergency');
      expect(resultWithoutReason.content).toBe('Hello Jean');
    });

    it('should handle missing variables gracefully', () => {
      const template = {
        id: 'test',
        type: 'email' as const,
        language: 'fr',
        content: 'Hello {{clientFirstName}} {{missingVariable}}',
        variables: ['clientFirstName']
      };

      const variables = {
        clientFirstName: 'Jean'
      };

      const result = processAppointmentTemplate(template, variables);

      expect(result.content).toBe('Hello Jean ');
    });
  });
});