/**
 * Tests pour le service de rapports de présence
 */

import { presenceReportService, ReportFilters, ReportOptions } from '../../../../backend/functions/src/services/presence-report.service';
import { PresenceEntry, Employee, PresenceStatus } from '@attendance-x/shared';
import { db } from '../../../../backend/functions/src/config/database';

// Mock Firestore
jest.mock('../../../../backend/functions/src/config/database', () => ({
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn()
      })),
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            orderBy: jest.fn(() => ({
              offset: jest.fn(() => ({
                limit: jest.fn(() => ({
                  get: jest.fn()
                }))
              })),
              get: jest.fn()
            })),
            get: jest.fn()
          })),
          orderBy: jest.fn(() => ({
            offset: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn()
              }))
            })),
            get: jest.fn()
          })),
          count: jest.fn(() => ({
            get: jest.fn()
          })),
          get: jest.fn()
        })),
        get: jest.fn()
      }))
    }))
  },
  collections: {
    employees: 'employees',
    presence_entries: 'presence_entries'
  }
}));

describe('PresenceReportService', () => {
  const mockEmployee: Employee = {
    id: 'emp123',
    userId: 'user123',
    employeeId: 'EMP001',
    organizationId: 'org123',
    position: 'Developer',
    hireDate: new Date('2023-01-01'),
    isActive: true,
    requiresGeolocation: false,
    leaveBalances: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin'
  };

  const mockPresenceEntries: PresenceEntry[] = [
    {
      id: 'entry1',
      employeeId: 'emp123',
      organizationId: 'org123',
      date: '2023-12-01',
      status: PresenceStatus.PRESENT,
      clockInTime: new Date('2023-12-01T09:00:00Z'),
      clockOutTime: new Date('2023-12-01T17:00:00Z'),
      actualWorkHours: 7,
      overtimeHours: 0,
      isValidated: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'entry2',
      employeeId: 'emp123',
      organizationId: 'org123',
      date: '2023-12-02',
      status: PresenceStatus.LATE,
      clockInTime: new Date('2023-12-02T09:30:00Z'),
      clockOutTime: new Date('2023-12-02T17:30:00Z'),
      actualWorkHours: 7.5,
      overtimeHours: 0.5,
      isValidated: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'entry3',
      employeeId: 'emp123',
      organizationId: 'org123',
      date: '2023-12-03',
      status: PresenceStatus.ABSENT,
      actualWorkHours: 0,
      overtimeHours: 0,
      isValidated: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockFilters: ReportFilters = {
    organizationId: 'org123',
    startDate: '2023-12-01',
    endDate: '2023-12-03'
  };

  const mockOptions: ReportOptions = {
    format: 'json',
    includeDetails: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    it('should generate a complete presence report', async () => {
      // Mock presence entries
      const mockPresenceSnapshot = {
        forEach: jest.fn((callback) => {
          mockPresenceEntries.forEach((entry, index) => {
            callback({
              exists: true,
              id: entry.id,
              data: () => entry
            });
          });
        })
      };

      // Mock employees
      const mockEmployeeSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            exists: true,
            id: mockEmployee.id,
            data: () => mockEmployee
          });
        })
      };

      // Mock document reference for saving report
      const mockDocRef = {
        id: 'report123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'presence_entries') {
          return {
            where: () => ({
              where: () => ({
                where: () => ({
                  get: jest.fn().mockResolvedValue(mockPresenceSnapshot)
                })
              })
            })
          };
        }
        if (collectionName === 'employees') {
          return {
            where: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeSnapshot)
            })
          };
        }
        if (collectionName === 'presence_reports') {
          return {
            doc: () => mockDocRef
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const report = await presenceReportService.generateReport(
        mockFilters,
        mockOptions,
        'admin123'
      );

      expect(report).toBeDefined();
      expect(report.organizationId).toBe('org123');
      expect(report.summary).toBeDefined();
      expect(report.details).toHaveLength(3);
      expect(report.summary.totalEmployees).toBe(1);
      expect(report.summary.totalPresent).toBe(2); // Present + Late
      expect(report.summary.totalAbsent).toBe(1);
      expect(report.summary.totalLate).toBe(1);
      expect(mockDocRef.set).toHaveBeenCalled();
    });

    it('should calculate correct summary statistics', async () => {
      const mockPresenceSnapshot = {
        forEach: jest.fn((callback) => {
          mockPresenceEntries.forEach((entry) => {
            callback({
              exists: true,
              id: entry.id,
              data: () => entry
            });
          });
        })
      };

      const mockEmployeeSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            exists: true,
            id: mockEmployee.id,
            data: () => mockEmployee
          });
        })
      };

      const mockDocRef = {
        id: 'report123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'presence_entries') {
          return {
            where: () => ({
              where: () => ({
                where: () => ({
                  get: jest.fn().mockResolvedValue(mockPresenceSnapshot)
                })
              })
            })
          };
        }
        if (collectionName === 'employees') {
          return {
            where: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeSnapshot)
            })
          };
        }
        if (collectionName === 'presence_reports') {
          return {
            doc: () => mockDocRef
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const report = await presenceReportService.generateReport(
        mockFilters,
        mockOptions,
        'admin123'
      );

      expect(report.summary.totalWorkDays).toBe(3);
      expect(report.summary.totalPresent).toBe(2);
      expect(report.summary.totalAbsent).toBe(1);
      expect(report.summary.totalLate).toBe(1);
      expect(report.summary.totalOvertimeHours).toBe(0.5);
      expect(report.summary.averageWorkHours).toBe((7 + 7.5 + 0) / 3);
      expect(report.summary.attendanceRate).toBe((2 / 3) * 100);
    });

    it('should filter by employee IDs when specified', async () => {
      const filtersWithEmployees = {
        ...mockFilters,
        employeeIds: ['emp123']
      };

      const mockPresenceSnapshot = {
        forEach: jest.fn((callback) => {
          mockPresenceEntries
            .filter(entry => entry.employeeId === 'emp123')
            .forEach((entry) => {
              callback({
                exists: true,
                id: entry.id,
                data: () => entry
              });
            });
        })
      };

      const mockEmployeeSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            exists: true,
            id: mockEmployee.id,
            data: () => mockEmployee
          });
        })
      };

      const mockDocRef = {
        id: 'report123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'presence_entries') {
          return {
            where: jest.fn((field, op, value) => {
              if (field === 'employeeId' && op === 'in') {
                expect(value).toEqual(['emp123']);
              }
              return {
                where: () => ({
                  where: () => ({
                    get: jest.fn().mockResolvedValue(mockPresenceSnapshot)
                  })
                })
              };
            })
          };
        }
        if (collectionName === 'employees') {
          return {
            where: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeSnapshot)
            })
          };
        }
        if (collectionName === 'presence_reports') {
          return {
            doc: () => mockDocRef
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const report = await presenceReportService.generateReport(
        filtersWithEmployees,
        mockOptions,
        'admin123'
      );

      expect(report).toBeDefined();
      expect(report.details).toHaveLength(3);
    });
  });

  describe('getReport', () => {
    it('should return existing report', async () => {
      const mockReportData = {
        id: 'report123',
        organizationId: 'org123',
        title: 'Test Report',
        summary: { totalEmployees: 1 },
        details: []
      };

      const mockDoc = {
        exists: true,
        id: 'report123',
        data: () => mockReportData
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      const report = await presenceReportService.getReport('report123');

      expect(report).toBeDefined();
      expect(report?.id).toBe('report123');
      expect(report?.organizationId).toBe('org123');
    });

    it('should return null for non-existent report', async () => {
      const mockDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      const report = await presenceReportService.getReport('nonexistent');

      expect(report).toBeNull();
    });
  });

  describe('listReports', () => {
    it('should list reports with pagination', async () => {
      const mockReports = [
        { id: 'report1', organizationId: 'org123', title: 'Report 1' },
        { id: 'report2', organizationId: 'org123', title: 'Report 2' }
      ];

      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          mockReports.forEach((report) => {
            callback({
              id: report.id,
              data: () => report
            });
          });
        })
      };

      const mockCountSnapshot = {
        data: () => ({ count: 2 })
      };

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          orderBy: () => ({
            offset: () => ({
              limit: () => ({
                get: jest.fn().mockResolvedValue(mockSnapshot)
              })
            })
          })
        }),
        count: () => ({
          get: jest.fn().mockResolvedValue(mockCountSnapshot)
        })
      });

      const result = await presenceReportService.listReports('org123', 1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
    });
  });

  describe('createScheduledReport', () => {
    it('should create a scheduled report', async () => {
      const mockDocRef = {
        id: 'scheduled123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => mockDocRef
      });

      const scheduledReport = {
        name: 'Weekly Report',
        organizationId: 'org123',
        filters: mockFilters,
        options: mockOptions,
        schedule: {
          frequency: 'weekly' as const,
          dayOfWeek: 1,
          time: '09:00'
        },
        recipients: ['user123'],
        isActive: true,
        nextRun: new Date('2023-12-11T09:00:00Z'),
        createdBy: 'admin123'
      };

      const result = await presenceReportService.createScheduledReport(scheduledReport);

      expect(result).toBeDefined();
      expect(result.id).toBe('scheduled123');
      expect(result.name).toBe('Weekly Report');
      expect(mockDocRef.set).toHaveBeenCalled();
    });
  });

  describe('exportReport', () => {
    it('should export report to specified format', async () => {
      const mockReportData = {
        id: 'report123',
        organizationId: 'org123',
        title: 'Test Report',
        summary: { totalEmployees: 1 },
        details: mockPresenceEntries.map(entry => ({
          employeeId: entry.employeeId,
          employeeName: 'John Doe',
          date: entry.date,
          clockInTime: entry.clockInTime,
          clockOutTime: entry.clockOutTime,
          status: entry.status,
          actualWorkHours: entry.actualWorkHours || 0,
          overtimeHours: entry.overtimeHours || 0,
          totalBreakTime: 0,
          isLate: entry.status === PresenceStatus.LATE,
          isEarlyLeave: false
        }))
      };

      const mockDoc = {
        exists: true,
        id: 'report123',
        data: () => mockReportData
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc),
          update: mockUpdate
        })
      });

      const fileUrl = await presenceReportService.exportReport('report123', 'excel');

      expect(fileUrl).toBeDefined();
      expect(fileUrl).toContain('rapport_presence_report123.xlsx');
      expect(mockUpdate).toHaveBeenCalledWith({
        fileUrl: expect.any(String),
        updatedAt: expect.any(Date)
      });
    });

    it('should throw error for non-existent report', async () => {
      const mockDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      await expect(presenceReportService.exportReport('nonexistent', 'pdf'))
        .rejects.toThrow('Report not found');
    });
  });
});