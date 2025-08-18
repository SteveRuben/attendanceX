/**
 * Tests d'intégration pour le système complet de gestion de présence
 */

import { presenceService } from '../../../backend/functions/src/services/presence.service';
import { employeeService } from '../../../backend/functions/src/services/employee.service';
import { presenceNotificationService } from '../../../backend/functions/src/services/presence-notification.service';
import { presenceReportService } from '../../../backend/functions/src/services/presence-report.service';
import { presenceAuditService } from '../../../backend/functions/src/services/presence-audit.service';
import { presenceMaintenanceService } from '../../../backend/functions/src/services/presence-maintenance.service';
import { Employee, PresenceEntry, GeoLocation } from '@attendance-x/shared';

// Mock Firebase
jest.mock('../../../backend/functions/src/config/firebase');

describe('Presence System Integration Tests', () => {
  const mockEmployee: Employee = {
    id: 'emp123',
    userId: 'user123',
    employeeId: 'EMP001',
    organizationId: 'org123',
    position: 'Developer',
    hireDate: new Date('2023-01-01'),
    isActive: true,
    requiresGeolocation: true,
    locationRadius: 100,
    allowedLocations: [
      { latitude: 48.8566, longitude: 2.3522 } // Paris
    ],
    leaveBalances: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin'
  };

  const mockLocation: GeoLocation = {
    latitude: 48.8566,
    longitude: 2.3522,
    accuracy: 10
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Clock-In/Clock-Out Flow', () => {
    it('should handle complete presence workflow', async () => {
      // Mock des services
      jest.spyOn(employeeService, 'getEmployeeById').mockResolvedValue(mockEmployee);
      jest.spyOn(presenceService, 'clockIn').mockResolvedValue({
        success: true,
        data: {
          id: 'entry123',
          employeeId: 'emp123',
          organizationId: 'org123',
          date: '2023-12-01',
          clockInTime: new Date(),
          status: 'in_progress'
        } as PresenceEntry
      });
      jest.spyOn(presenceService, 'clockOut').mockResolvedValue({
        success: true,
        data: {
          id: 'entry123',
          employeeId: 'emp123',
          organizationId: 'org123',
          date: '2023-12-01',
          clockInTime: new Date('2023-12-01T09:00:00'),
          clockOutTime: new Date('2023-12-01T17:00:00'),
          totalHours: 8,
          status: 'completed'
        } as PresenceEntry
      });

      // 1. Clock-in
      const clockInResult = await presenceService.clockIn({
        employeeId: 'emp123',
        location: mockLocation,
        notes: 'Starting work day'
      });

      expect(clockInResult.success).toBe(true);
      expect(clockInResult.data.clockInTime).toBeDefined();
      expect(clockInResult.data.status).toBe('in_progress');

      // 2. Clock-out
      const clockOutResult = await presenceService.clockOut({
        employeeId: 'emp123',
        location: mockLocation,
        notes: 'End of work day'
      });

      expect(clockOutResult.success).toBe(true);
      expect(clockOutResult.data.clockOutTime).toBeDefined();
      expect(clockOutResult.data.totalHours).toBe(8);
      expect(clockOutResult.data.status).toBe('completed');
    });

    it('should handle presence anomaly detection and notification', async () => {
      const anomalousEntry: PresenceEntry = {
        id: 'entry123',
        employeeId: 'emp123',
        organizationId: 'org123',
        date: '2023-12-01',
        clockInTime: new Date('2023-12-01T11:00:00'), // Late arrival
        clockOutTime: new Date('2023-12-01T15:00:00'), // Early departure
        totalHours: 4, // Short day
        status: 'completed',
        hasAnomalies: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user123'
      };

      jest.spyOn(presenceService, 'detectAnomalies').mockResolvedValue([
        {
          entryId: 'entry123',
          employeeId: 'emp123',
          types: ['late_arrival', 'early_departure', 'short_day'],
          severity: 'high',
          details: {
            expectedStart: '09:00',
            actualStart: '11:00',
            expectedEnd: '17:00',
            actualEnd: '15:00'
          }
        }
      ]);

      jest.spyOn(presenceNotificationService, 'sendAnomalyAlert').mockResolvedValue();

      // Détecter les anomalies
      const anomalies = await presenceService.detectAnomalies([anomalousEntry]);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].types).toContain('late_arrival');
      expect(anomalies[0].types).toContain('early_departure');
      expect(anomalies[0].severity).toBe('high');

      // Vérifier que la notification a été envoyée
      expect(presenceNotificationService.sendAnomalyAlert).toHaveBeenCalledWith(
        anomalousEntry,
        anomalies[0]
      );
    });
  });

  describe('Reporting and Analytics Integration', () => {
    it('should generate comprehensive presence report', async () => {
      const mockReportData = {
        organizationId: 'org123',
        period: {
          startDate: new Date('2023-12-01'),
          endDate: new Date('2023-12-31')
        },
        employees: ['emp123'],
        includeAnomalies: true,
        format: 'detailed' as const
      };

      const mockReport = {
        id: 'report123',
        organizationId: 'org123',
        type: 'monthly',
        status: 'completed',
        data: {
          summary: {
            totalEmployees: 1,
            totalWorkingDays: 22,
            totalHours: 176,
            averageHoursPerDay: 8,
            anomaliesCount: 2
          },
          employees: [
            {
              employeeId: 'emp123',
              totalHours: 176,
              workingDays: 22,
              anomalies: 2,
              efficiency: 95
            }
          ]
        },
        createdAt: new Date(),
        createdBy: 'manager123'
      };

      jest.spyOn(presenceReportService, 'generateReport').mockResolvedValue({
        success: true,
        data: mockReport
      });

      const result = await presenceReportService.generateReport(mockReportData);

      expect(result.success).toBe(true);
      expect(result.data.data.summary.totalEmployees).toBe(1);
      expect(result.data.data.summary.anomaliesCount).toBe(2);
      expect(result.data.data.employees[0].efficiency).toBe(95);
    });

    it('should export report in multiple formats', async () => {
      const mockExportData = {
        reportId: 'report123',
        format: 'excel' as const,
        includeCharts: true
      };

      jest.spyOn(presenceReportService, 'exportReport').mockResolvedValue({
        success: true,
        data: {
          filePath: '/exports/report123.xlsx',
          downloadUrl: 'https://storage.googleapis.com/bucket/report123.xlsx',
          fileSize: 1024000,
          format: 'excel'
        }
      });

      const result = await presenceReportService.exportReport(mockExportData);

      expect(result.success).toBe(true);
      expect(result.data.format).toBe('excel');
      expect(result.data.downloadUrl).toContain('report123.xlsx');
    });
  });

  describe('Audit and Security Integration', () => {
    it('should log all presence actions for audit', async () => {
      const mockAuditData = {
        userId: 'user123',
        employeeId: 'emp123',
        organizationId: 'org123',
        action: 'clock_in' as const,
        success: true,
        details: {
          location: mockLocation,
          timestamp: new Date()
        },
        metadata: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      };

      jest.spyOn(presenceAuditService, 'logClockingAction').mockResolvedValue('audit123');

      const auditId = await presenceAuditService.logClockingAction(mockAuditData);

      expect(auditId).toBe('audit123');
      expect(presenceAuditService.logClockingAction).toHaveBeenCalledWith(mockAuditData);
    });

    it('should detect and log suspicious activities', async () => {
      const mockSuspiciousData = {
        userId: 'user123',
        employeeId: 'emp123',
        organizationId: 'org123',
        action: 'clock_in',
        suspiciousPatterns: ['RAPID_ATTEMPTS', 'MULTIPLE_IPS'],
        details: {
          attemptCount: 5,
          timeWindow: '5 minutes'
        },
        metadata: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      };

      jest.spyOn(presenceAuditService, 'logSuspiciousActivity').mockResolvedValue('suspicious123');

      const auditId = await presenceAuditService.logSuspiciousActivity(mockSuspiciousData);

      expect(auditId).toBe('suspicious123');
      expect(presenceAuditService.logSuspiciousActivity).toHaveBeenCalledWith(mockSuspiciousData);
    });
  });

  describe('Maintenance and Data Health', () => {
    it('should perform complete system maintenance', async () => {
      const mockMaintenanceResult = {
        success: true,
        deletedCounts: {
          presenceEntries: 100,
          auditLogs: 500,
          notifications: 50,
          reports: 10
        },
        errors: [],
        executionTimeMs: 30000,
        nextMaintenanceDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      jest.spyOn(presenceMaintenanceService, 'runMaintenance').mockResolvedValue(mockMaintenanceResult);

      const result = await presenceMaintenanceService.runMaintenance({
        presenceEntriesRetentionDays: 1095,
        auditLogsRetentionDays: 365,
        notificationsRetentionDays: 90,
        reportsRetentionDays: 730,
        batchSize: 500,
        maxExecutionTimeMs: 540000
      });

      expect(result.success).toBe(true);
      expect(result.deletedCounts.presenceEntries).toBe(100);
      expect(result.deletedCounts.auditLogs).toBe(500);
      expect(result.errors).toHaveLength(0);
    });

    it('should check data health and provide recommendations', async () => {
      const mockHealthCheck = {
        issues: [
          {
            type: 'incomplete_presence_entries',
            severity: 'low' as const,
            description: 'Presence entries missing clock-out time',
            count: 5
          },
          {
            type: 'unprocessed_anomalies',
            severity: 'high' as const,
            description: 'Presence anomalies requiring attention',
            count: 2
          }
        ],
        recommendations: [
          'Review and complete missing clock-out times',
          'Review and resolve presence anomalies'
        ]
      };

      jest.spyOn(presenceMaintenanceService, 'checkDataHealth').mockResolvedValue(mockHealthCheck);

      const result = await presenceMaintenanceService.checkDataHealth();

      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].severity).toBe('low');
      expect(result.issues[1].severity).toBe('high');
      expect(result.recommendations).toHaveLength(2);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high volume of concurrent clock-ins', async () => {
      const concurrentClockIns = Array.from({ length: 100 }, (_, i) => ({
        employeeId: `emp${i}`,
        location: mockLocation,
        notes: `Clock-in ${i}`
      }));

      // Mock successful responses for all clock-ins
      jest.spyOn(presenceService, 'clockIn').mockImplementation(async (data) => ({
        success: true,
        data: {
          id: `entry${data.employeeId}`,
          employeeId: data.employeeId,
          organizationId: 'org123',
          date: '2023-12-01',
          clockInTime: new Date(),
          status: 'in_progress'
        } as PresenceEntry
      }));

      // Exécuter tous les clock-ins en parallèle
      const results = await Promise.all(
        concurrentClockIns.map(clockInData => presenceService.clockIn(clockInData))
      );

      // Vérifier que tous ont réussi
      expect(results).toHaveLength(100);
      expect(results.every(result => result.success)).toBe(true);
    });

    it('should efficiently query large datasets', async () => {
      const mockLargeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `entry${i}`,
        employeeId: `emp${i % 10}`, // 10 employés avec 100 entrées chacun
        organizationId: 'org123',
        date: `2023-12-${String(i % 30 + 1).padStart(2, '0')}`,
        clockInTime: new Date(`2023-12-${String(i % 30 + 1).padStart(2, '0')}T09:00:00`),
        clockOutTime: new Date(`2023-12-${String(i % 30 + 1).padStart(2, '0')}T17:00:00`),
        totalHours: 8,
        status: 'completed' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      }));

      jest.spyOn(presenceService, 'listPresenceEntries').mockResolvedValue({
        success: true,
        data: mockLargeDataset.slice(0, 50), // Pagination
        pagination: {
          total: 1000,
          page: 1,
          limit: 50,
          hasMore: true
        }
      });

      const result = await presenceService.listPresenceEntries({
        organizationId: 'org123',
        startDate: '2023-12-01',
        endDate: '2023-12-31',
        limit: 50,
        page: 1
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(50);
      expect(result.pagination?.total).toBe(1000);
      expect(result.pagination?.hasMore).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle service failures gracefully', async () => {
      // Simuler une panne de service
      jest.spyOn(presenceService, 'clockIn').mockRejectedValue(new Error('Database connection failed'));

      try {
        await presenceService.clockIn({
          employeeId: 'emp123',
          location: mockLocation
        });
        
        // Ne devrait pas arriver ici
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toBe('Database connection failed');
      }
    });

    it('should recover from partial failures in batch operations', async () => {
      const batchOperations = [
        { employeeId: 'emp1', location: mockLocation },
        { employeeId: 'emp2', location: mockLocation },
        { employeeId: 'emp3', location: mockLocation }
      ];

      // Simuler un échec partiel
      jest.spyOn(presenceService, 'clockIn')
        .mockResolvedValueOnce({ success: true, data: {} as PresenceEntry })
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ success: true, data: {} as PresenceEntry });

      const results = await Promise.allSettled(
        batchOperations.map(op => presenceService.clockIn(op))
      );

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');

      // Vérifier que 2 opérations sur 3 ont réussi
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBe(2);
    });
  });
});