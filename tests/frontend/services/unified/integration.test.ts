/**
 * Tests d'intégration pour les services unifiés
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  attendanceService, 
  analyticsService, 
  qrCodeService, 
  reportService 
} from '../../../../frontend/src/services/unified';
import { apiService } from '../../../../frontend/src/services/apiService';

// Mock du service API
vi.mock('../../../../frontend/src/services/apiService', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    getBaseUrl: vi.fn(() => 'https://api.example.com'),
    getAuthToken: vi.fn(() => 'mock-token')
  }
}));

describe('Services Unifiés - Tests d\'Intégration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Workflow Complet - Check-in avec QR Code', () => {
    it('should handle complete QR code check-in workflow', async () => {
      const eventId = 'event-123';
      const qrCodeData = 'qr-code-data-123';
      const userId = 'user-123';

      // Mock des réponses API
      const mockQRCode = {
        id: 'qr-123',
        eventId,
        qrCodeData,
        isActive: true,
        generatedAt: new Date(),
        usageCount: 0
      };

      const mockValidation = {
        isValid: true,
        eventId,
        eventTitle: 'Test Event',
        canCheckIn: true
      };

      const mockCheckInResult = {
        success: true,
        attendanceId: 'attendance-123',
        message: 'Check-in réussi'
      };

      const mockAttendanceRecord = {
        id: 'attendance-123',
        eventId,
        userId,
        status: 'present',
        checkInTime: new Date(),
        method: 'qr_code'
      };

      // Configuration des mocks
      (apiService.get as any)
        .mockResolvedValueOnce({ data: mockQRCode }) // getEventQRCode
        .mockResolvedValueOnce({ data: mockAttendanceRecord }); // getAttendanceById

      (apiService.post as any)
        .mockResolvedValueOnce({ data: mockValidation }) // validateQRCode
        .mockResolvedValueOnce({ data: mockCheckInResult }); // processQRCodeCheckIn

      // 1. Vérifier que le QR code existe et est valide
      const qrCode = await qrCodeService.getEventQRCode(eventId);
      expect(qrCode.success).toBe(true);
      expect(qrCode.data?.isActive).toBe(true);

      // 2. Valider le QR code
      const validation = await qrCodeService.validateQRCode(qrCodeData, {
        location: { latitude: 48.8566, longitude: 2.3522 }
      });
      expect(validation.success).toBe(true);
      expect(validation.data?.isValid).toBe(true);

      // 3. Effectuer le check-in
      const checkInResult = await qrCodeService.processQRCodeCheckIn(qrCodeData, {
        location: { latitude: 48.8566, longitude: 2.3522 },
        deviceInfo: { type: 'mobile', platform: 'iOS' }
      });
      expect(checkInResult.success).toBe(true);
      expect(checkInResult.data?.success).toBe(true);

      // 4. Vérifier l'enregistrement de présence
      const attendance = await attendanceService.getAttendanceById('attendance-123');
      expect(attendance.success).toBe(true);
      expect(attendance.data?.status).toBe('present');

      // Vérifier les appels API
      expect(apiService.get).toHaveBeenCalledWith('/api/qr-codes/events/event-123');
      expect(apiService.post).toHaveBeenCalledWith('/api/qr-codes/validate', {
        qrCodeData,
        location: { latitude: 48.8566, longitude: 2.3522 }
      });
      expect(apiService.post).toHaveBeenCalledWith('/api/qr-codes/check-in', {
        qrCodeData,
        location: { latitude: 48.8566, longitude: 2.3522 },
        deviceInfo: { type: 'mobile', platform: 'iOS' }
      });
    });
  });

  describe('Workflow Analytics - Génération de Rapport', () => {
    it('should handle complete analytics and reporting workflow', async () => {
      const organizationId = 'org-123';
      const eventId = 'event-123';
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      // Mock des données analytics
      const mockEventAnalytics = {
        eventId,
        eventTitle: 'Test Event',
        totalInvited: 50,
        totalAttended: 45,
        attendanceRate: 90,
        teamBreakdown: [
          { teamId: 'team-1', teamName: 'Dev Team', invited: 20, attended: 18, attendanceRate: 90 }
        ]
      };

      const mockOrgAnalytics = {
        organizationId,
        organizationName: 'Test Org',
        period: dateRange,
        totalEvents: 25,
        totalParticipants: 500,
        averageAttendanceRate: 88
      };

      const mockReport = {
        id: 'report-123',
        type: 'organization_overview',
        format: 'pdf',
        status: 'completed',
        title: 'Rapport Organisation',
        downloadUrl: 'https://api.example.com/reports/report-123/download'
      };

      // Configuration des mocks
      (apiService.get as any)
        .mockResolvedValueOnce({ data: mockEventAnalytics }) // getEventAnalytics
        .mockResolvedValueOnce({ data: mockOrgAnalytics }); // getOrganizationAnalytics

      (apiService.post as any)
        .mockResolvedValueOnce({ data: mockReport }); // generateReport

      // 1. Obtenir les analytics d'événement
      const eventAnalytics = await analyticsService.getEventAnalytics(eventId);
      expect(eventAnalytics.success).toBe(true);
      expect(eventAnalytics.data?.attendanceRate).toBe(90);

      // 2. Obtenir les analytics d'organisation
      const orgAnalytics = await analyticsService.getOrganizationAnalytics(
        organizationId,
        dateRange
      );
      expect(orgAnalytics.success).toBe(true);
      expect(orgAnalytics.data?.totalEvents).toBe(25);

      // 3. Générer un rapport basé sur les analytics
      const report = await reportService.generateReport(
        'organization_overview',
        {
          dateRange,
          eventIds: [eventId]
        },
        {
          format: 'pdf',
          includeCharts: true,
          includeInsights: true
        }
      );
      expect(report.success).toBe(true);
      expect(report.data?.status).toBe('completed');

      // Vérifier les appels API
      expect(apiService.get).toHaveBeenCalledWith('/api/analytics/events/event-123');
      expect(apiService.get).toHaveBeenCalledWith(
        '/api/analytics/organizations/org-123',
        {
          params: {
            startDate: dateRange.startDate.toISOString(),
            endDate: dateRange.endDate.toISOString()
          }
        }
      );
      expect(apiService.post).toHaveBeenCalledWith('/api/reports/generate', {
        type: 'organization_overview',
        filters: {
          dateRange: {
            startDate: dateRange.startDate.toISOString(),
            endDate: dateRange.endDate.toISOString()
          },
          eventIds: [eventId]
        },
        options: {
          format: 'pdf',
          includeCharts: true,
          includeInsights: true,
          language: 'fr'
        }
      });
    });
  });

  describe('Workflow Validation - Validation en Masse', () => {
    it('should handle bulk attendance validation workflow', async () => {
      const eventId = 'event-123';
      const attendanceIds = ['att-1', 'att-2', 'att-3'];
      const validatedBy = 'validator-123';

      // Mock des données
      const mockAttendances = attendanceIds.map(id => ({
        id,
        eventId,
        userId: `user-${id}`,
        status: 'present',
        validationStatus: 'pending'
      }));

      const mockBulkValidationResult = {
        successful: 3,
        failed: 0,
        errors: []
      };

      const mockValidationReport = {
        organizationId: 'org-123',
        period: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        totalValidations: 150,
        validatedByTeam: [
          {
            teamId: 'team-1',
            teamName: 'Validators Team',
            validations: 50,
            validators: [
              { userId: validatedBy, userName: 'Validator User', validationCount: 25 }
            ]
          }
        ]
      };

      // Configuration des mocks
      (apiService.get as any)
        .mockResolvedValueOnce({ data: { data: mockAttendances, total: 3 } }) // getEventAttendances
        .mockResolvedValueOnce({ data: mockValidationReport }); // getValidationReport

      (apiService.post as any)
        .mockResolvedValueOnce({ data: mockBulkValidationResult }); // bulkValidateAttendances

      // 1. Obtenir les présences à valider
      const attendances = await attendanceService.getEventAttendances(eventId, {
        validationStatus: 'pending'
      });
      expect(attendances.success).toBe(true);
      expect(attendances.data?.length).toBe(3);

      // 2. Valider en masse
      const validationResult = await attendanceService.bulkValidateAttendances(
        attendanceIds,
        true,
        'Validation en masse',
        validatedBy
      );
      expect(validationResult.success).toBe(true);
      expect(validationResult.data?.successful).toBe(3);

      // 3. Obtenir le rapport de validation
      const validationReport = await analyticsService.getValidationReport(
        'org-123',
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        }
      );
      expect(validationReport.success).toBe(true);
      expect(validationReport.data?.totalValidations).toBe(150);

      // Vérifier les appels API
      expect(apiService.get).toHaveBeenCalledWith('/api/attendance/events/event-123', {
        validationStatus: 'pending'
      });
      expect(apiService.post).toHaveBeenCalledWith('/api/attendance/bulk-validate', {
        attendanceIds,
        approved: true,
        notes: 'Validation en masse',
        validatedBy
      });
    });
  });

  describe('Gestion d\'Erreurs Unifiée', () => {
    it('should handle errors consistently across all services', async () => {
      const errorMessage = 'API Error';
      const apiError = new Error(errorMessage);

      // Mock d'erreur API
      (apiService.get as any).mockRejectedValue(apiError);

      // Test avec chaque service
      const services = [
        { name: 'attendanceService', method: () => attendanceService.getAttendances() },
        { name: 'analyticsService', method: () => analyticsService.getEventAnalytics('event-123') },
        { name: 'qrCodeService', method: () => qrCodeService.getEventQRCode('event-123') },
        { name: 'reportService', method: () => reportService.getReports() }
      ];

      for (const service of services) {
        try {
          await service.method();
          // Ne devrait pas arriver
          expect(true).toBe(false);
        } catch (error: any) {
          expect(error.message).toBe(errorMessage);
        }
      }
    });
  });

  describe('Cohérence des Types', () => {
    it('should have consistent type definitions across services', () => {
      // Vérifier que les services sont bien typés
      expect(typeof attendanceService.checkIn).toBe('function');
      expect(typeof analyticsService.getEventAnalytics).toBe('function');
      expect(typeof qrCodeService.generateEventQRCode).toBe('function');
      expect(typeof reportService.generateReport).toBe('function');

      // Vérifier l'héritage du BaseService
      expect(attendanceService).toHaveProperty('basePath');
      expect(analyticsService).toHaveProperty('basePath');
      expect(qrCodeService).toHaveProperty('basePath');
      expect(reportService).toHaveProperty('basePath');
    });
  });
});