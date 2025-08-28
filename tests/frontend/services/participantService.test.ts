import { participantService } from '../../../frontend/src/services/participantService';
import { apiService } from '../../../frontend/src/services/apiService';
import { 
  EventParticipant, 
  CreateParticipantRequest, 
  AttendanceStatus,
  ParticipantStatus,
  DuplicateAction 
} from '@attendance-x/shared';

// Mock apiService
jest.mock('../../../frontend/src/services/apiService');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('ParticipantService', () => {
  const eventId = 'event-123';
  const participantId = 'participant-456';
  const userId = 'user-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createParticipant', () => {
    it('should create a participant successfully', async () => {
      const createRequest: CreateParticipantRequest = {
        eventId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        notificationPreferences: {
          email: true,
          sms: false,
          channels: ['email'],
          language: 'fr'
        }
      };

      const mockParticipant: EventParticipant = {
        id: participantId,
        eventId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isInternalUser: false,
        status: ParticipantStatus.INVITED,
        notificationPreferences: createRequest.notificationPreferences,
        registeredAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        lastModifiedBy: userId
      };

      mockApiService.post.mockResolvedValue({
        success: true,
        data: mockParticipant
      });

      const result = await participantService.createParticipant(createRequest);

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/events/${eventId}/participants`,
        createRequest
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockParticipant);
    });

    it('should handle creation errors', async () => {
      const createRequest: CreateParticipantRequest = {
        eventId,
        email: 'invalid-email',
        notificationPreferences: {
          email: true,
          sms: false,
          channels: ['email']
        }
      };

      mockApiService.post.mockRejectedValue(new Error('Invalid email format'));

      await expect(participantService.createParticipant(createRequest))
        .rejects.toThrow('Invalid email format');
    });
  });

  describe('getParticipants', () => {
    it('should fetch participants with filters', async () => {
      const mockParticipants = [
        {
          id: 'participant-1',
          eventId,
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
          status: ParticipantStatus.CONFIRMED,
          isInternalUser: false
        },
        {
          id: 'participant-2',
          eventId,
          email: 'user2@example.com',
          firstName: 'User',
          lastName: 'Two',
          status: ParticipantStatus.INVITED,
          isInternalUser: true
        }
      ];

      mockApiService.get.mockResolvedValue({
        success: true,
        data: {
          data: mockParticipants,
          total: 2,
          page: 1,
          limit: 10
        }
      });

      const filters = { status: ParticipantStatus.CONFIRMED };
      const result = await participantService.getParticipants(eventId, filters);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/events/${eventId}/participants`,
        { params: filters }
      );
      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockParticipants);
    });
  });

  describe('importParticipants', () => {
    it('should import participants from CSV file', async () => {
      const mockFile = new File(['email,firstName,lastName\ntest@example.com,John,Doe'], 'participants.csv', {
        type: 'text/csv'
      });

      const mockImportResult = {
        batchId: 'batch-123',
        imported: 1,
        failed: 0,
        duplicates: 0,
        errors: []
      };

      mockApiService.post.mockResolvedValue({
        success: true,
        data: mockImportResult
      });

      const options = {
        duplicateHandling: DuplicateAction.SKIP,
        defaultLanguage: 'fr',
        sendWelcomeNotification: true
      };

      const result = await participantService.importParticipants(eventId, mockFile, options);

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/events/${eventId}/participants/import`,
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockImportResult);
    });
  });

  describe('markAttendance', () => {
    it('should mark participant attendance', async () => {
      const mockUpdatedParticipant: EventParticipant = {
        id: participantId,
        eventId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isInternalUser: false,
        status: ParticipantStatus.ATTENDED,
        attendanceStatus: AttendanceStatus.PRESENT,
        notificationPreferences: {
          email: true,
          sms: false,
          channels: ['email']
        },
        registeredAt: new Date(),
        attendedAt: new Date(),
        validatedBy: userId,
        validatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        lastModifiedBy: userId
      };

      mockApiService.post.mockResolvedValue({
        success: true,
        data: mockUpdatedParticipant
      });

      const result = await participantService.markAttendance(
        eventId, 
        participantId, 
        AttendanceStatus.PRESENT, 
        userId
      );

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/events/${eventId}/participants/${participantId}/attendance`,
        {
          status: AttendanceStatus.PRESENT,
          validatedBy: userId,
          validatedAt: expect.any(Date)
        }
      );
      expect(result.success).toBe(true);
      expect(result.data?.attendanceStatus).toBe(AttendanceStatus.PRESENT);
    });
  });

  describe('bulkMarkAttendance', () => {
    it('should mark attendance for multiple participants', async () => {
      const attendances = [
        { participantId: 'participant-1', status: AttendanceStatus.PRESENT },
        { participantId: 'participant-2', status: AttendanceStatus.LATE }
      ];

      const mockResult = {
        successful: 2,
        failed: 0,
        errors: []
      };

      mockApiService.post.mockResolvedValue({
        success: true,
        data: mockResult
      });

      const result = await participantService.bulkMarkAttendance(eventId, attendances, userId);

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/events/${eventId}/participants/bulk-attendance`,
        {
          attendances,
          validatedBy: userId
        }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
    });
  });

  describe('detectInternalUsers', () => {
    it('should detect internal users from participant data', async () => {
      const participants = [
        { email: 'internal@company.com' },
        { email: 'external@gmail.com' },
        { phone: '+33123456789' }
      ];

      const mockDetectionResult = [
        {
          email: 'internal@company.com',
          isInternal: true,
          userId: 'user-123',
          userName: 'Internal User'
        },
        {
          email: 'external@gmail.com',
          isInternal: false
        },
        {
          phone: '+33123456789',
          isInternal: false
        }
      ];

      mockApiService.post.mockResolvedValue({
        success: true,
        data: mockDetectionResult
      });

      const result = await participantService.detectInternalUsers(eventId, participants);

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/events/${eventId}/participants/detect-internal`,
        { participants }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDetectionResult);
    });
  });

  describe('validateQRCode', () => {
    it('should validate QR code successfully', async () => {
      const qrCode = 'QR_CODE_123';
      const mockValidationResult = {
        valid: true,
        participant: {
          id: participantId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        },
        event: {
          id: eventId,
          title: 'Test Event'
        },
        message: 'Attendance validated successfully'
      };

      mockApiService.post.mockResolvedValue({
        success: true,
        data: mockValidationResult
      });

      const result = await participantService.validateQRCode(qrCode, userId);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/participants/validate-qr',
        {
          qrCode,
          validatedBy: userId
        }
      );
      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(true);
    });

    it('should handle invalid QR code', async () => {
      const qrCode = 'INVALID_QR_CODE';
      const mockValidationResult = {
        valid: false,
        message: 'QR code expired or invalid'
      };

      mockApiService.post.mockResolvedValue({
        success: true,
        data: mockValidationResult
      });

      const result = await participantService.validateQRCode(qrCode, userId);

      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(false);
      expect(result.data?.message).toBe('QR code expired or invalid');
    });
  });

  describe('getParticipantStats', () => {
    it('should fetch participant statistics', async () => {
      const mockStats = {
        total: 100,
        confirmed: 85,
        attended: 70,
        absent: 15,
        internalUsers: 30,
        externalParticipants: 70,
        byLanguage: {
          fr: 60,
          en: 30,
          es: 10
        },
        byStatus: {
          [ParticipantStatus.INVITED]: 15,
          [ParticipantStatus.CONFIRMED]: 85,
          [ParticipantStatus.DECLINED]: 0,
          [ParticipantStatus.ATTENDED]: 70,
          [ParticipantStatus.ABSENT]: 15
        }
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockStats
      });

      const result = await participantService.getParticipantStats(eventId);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/events/${eventId}/participants/stats`
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
    });
  });

  describe('exportParticipants', () => {
    it('should export participants to CSV', async () => {
      const mockBlob = new Blob(['csv content'], { type: 'text/csv' });
      
      // Mock URL.createObjectURL and related DOM methods
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();
      
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
        remove: jest.fn()
      };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation();
      jest.spyOn(document.body, 'removeChild').mockImplementation();

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockBlob
      });

      const filters = { status: ParticipantStatus.CONFIRMED };
      const result = await participantService.exportParticipants(eventId, 'csv', filters);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/events/${eventId}/participants/export`,
        {
          params: { format: 'csv', ...filters },
          responseType: 'blob'
        }
      );
      expect(mockLink.download).toBe(`participants-${eventId}.csv`);
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('searchParticipants', () => {
    it('should search participants with advanced filters', async () => {
      const query = 'john';
      const filters = {
        eventIds: [eventId],
        status: [ParticipantStatus.CONFIRMED],
        isInternalUser: false,
        language: 'fr'
      };

      const mockSearchResult = {
        data: [
          {
            id: participantId,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com'
          }
        ],
        total: 1,
        facets: {
          events: { [eventId]: 1 },
          statuses: { [ParticipantStatus.CONFIRMED]: 1 },
          languages: { fr: 1 }
        }
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockSearchResult
      });

      const result = await participantService.searchParticipants(query, filters);

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/participants/search',
        {
          params: {
            q: query,
            ...filters
          }
        }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSearchResult);
    });
  });
});