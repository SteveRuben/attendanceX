/**
 * Tests pour le service de validation de présence
 */

import { presenceValidationService, ClockInValidationContext, ClockOutValidationContext } from '../../../../backend/functions/src/services/presence-validation.service';
import { Employee, PresenceEntry, GeoLocation } from '@attendance-x/shared';
import { employeeService } from '../../../../backend/functions/src/services/employee.service';
import { workScheduleService } from '../../../../backend/functions/src/services/work-schedule.service';

// Mock des services
jest.mock('../../../../backend/functions/src/services/employee.service');
jest.mock('../../../../backend/functions/src/services/work-schedule.service');

describe('PresenceValidationService', () => {
  const mockEmployee: Employee = {
    id: 'emp123',
    userId: 'user123',
    employeeId: 'EMP001',
    organizationId: 'org123',
    position: 'Developer',
    hireDate: new Date('2023-01-01'),
    isActive: true,
    requiresGeolocation: false,
    locationRadius: 100,
    allowedLocations: [],
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

  const mockPresenceEntry: PresenceEntry = {
    id: 'entry123',
    employeeId: 'emp123',
    organizationId: 'org123',
    date: new Date().toISOString().split('T')[0],
    clockInTime: new Date(),
    status: 'present',
    totalHours: 0,
    breakEntries: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateClockIn', () => {
    it('should validate successful clock-in', async () => {
      const context: ClockInValidationContext = {
        employee: mockEmployee,
        timestamp: new Date(),
        location: mockLocation
      };

      const result = await presenceValidationService.validateClockIn(context);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject clock-in for inactive employee', async () => {
      const inactiveEmployee = { ...mockEmployee, isActive: false };
      const context: ClockInValidationContext = {
        employee: inactiveEmployee,
        timestamp: new Date()
      };

      const result = await presenceValidationService.validateClockIn(context);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'employee',
          code: 'EMPLOYEE_INACTIVE'
        })
      );
    });

    it('should reject future timestamp', async () => {
      const futureTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes in future
      const context: ClockInValidationContext = {
        employee: mockEmployee,
        timestamp: futureTime
      };

      const result = await presenceValidationService.validateClockIn(context);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'timestamp',
          code: 'FUTURE_TIMESTAMP'
        })
      );
    });

    it('should reject old timestamp', async () => {
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const context: ClockInValidationContext = {
        employee: mockEmployee,
        timestamp: oldTime
      };

      const result = await presenceValidationService.validateClockIn(context);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'timestamp',
          code: 'OLD_TIMESTAMP'
        })
      );
    });

    it('should require location when geolocation is required', async () => {
      const employeeWithGeo = { ...mockEmployee, requiresGeolocation: true };
      const context: ClockInValidationContext = {
        employee: employeeWithGeo,
        timestamp: new Date()
        // No location provided
      };

      const result = await presenceValidationService.validateClockIn(context);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'location',
          code: 'LOCATION_REQUIRED'
        })
      );
    });

    it('should validate location coordinates', async () => {
      const employeeWithGeo = { ...mockEmployee, requiresGeolocation: true };
      const invalidLocation = { latitude: 91, longitude: 181, accuracy: 10 }; // Invalid coordinates
      const context: ClockInValidationContext = {
        employee: employeeWithGeo,
        timestamp: new Date(),
        location: invalidLocation
      };

      const result = await presenceValidationService.validateClockIn(context);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'location.latitude',
          code: 'INVALID_LATITUDE'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'location.longitude',
          code: 'INVALID_LONGITUDE'
        })
      );
    });

    it('should warn about low accuracy', async () => {
      const employeeWithGeo = { ...mockEmployee, requiresGeolocation: true };
      const lowAccuracyLocation = { ...mockLocation, accuracy: 150 };\n      const context: ClockInValidationContext = {\n        employee: employeeWithGeo,\n        timestamp: new Date(),\n        location: lowAccuracyLocation\n      };\n\n      const result = await presenceValidationService.validateClockIn(context);\n\n      expect(result.warnings).toContainEqual(\n        expect.objectContaining({\n          field: 'location.accuracy',\n          code: 'LOW_ACCURACY'\n        })\n      );\n    });\n\n    it('should reject location outside allowed area', async () => {\n      const allowedLocation = { latitude: 48.8566, longitude: 2.3522 };\n      const employeeWithGeo = {\n        ...mockEmployee,\n        requiresGeolocation: true,\n        allowedLocations: [allowedLocation],\n        locationRadius: 50\n      };\n      const farLocation = { latitude: 48.9566, longitude: 2.4522, accuracy: 10 }; // Far from allowed\n      const context: ClockInValidationContext = {\n        employee: employeeWithGeo,\n        timestamp: new Date(),\n        location: farLocation\n      };\n\n      const result = await presenceValidationService.validateClockIn(context);\n\n      expect(result.isValid).toBe(false);\n      expect(result.errors).toContainEqual(\n        expect.objectContaining({\n          field: 'location',\n          code: 'LOCATION_NOT_ALLOWED'\n        })\n      );\n    });\n\n    it('should reject duplicate clock-in', async () => {\n      const existingEntry = { ...mockPresenceEntry, clockInTime: new Date() };\n      const context: ClockInValidationContext = {\n        employee: mockEmployee,\n        timestamp: new Date(),\n        existingEntry\n      };\n\n      const result = await presenceValidationService.validateClockIn(context);\n\n      expect(result.isValid).toBe(false);\n      expect(result.errors).toContainEqual(\n        expect.objectContaining({\n          field: 'clockIn',\n          code: 'ALREADY_CLOCKED_IN'\n        })\n      );\n    });\n  });\n\n  describe('validateClockOut', () => {\n    it('should validate successful clock-out', async () => {\n      const context: ClockOutValidationContext = {\n        employee: mockEmployee,\n        timestamp: new Date(),\n        presenceEntry: mockPresenceEntry\n      };\n\n      const result = await presenceValidationService.validateClockOut(context);\n\n      expect(result.isValid).toBe(true);\n      expect(result.errors).toHaveLength(0);\n    });\n\n    it('should reject clock-out without clock-in', async () => {\n      const entryWithoutClockIn = { ...mockPresenceEntry, clockInTime: undefined };\n      const context: ClockOutValidationContext = {\n        employee: mockEmployee,\n        timestamp: new Date(),\n        presenceEntry: entryWithoutClockIn\n      };\n\n      const result = await presenceValidationService.validateClockOut(context);\n\n      expect(result.isValid).toBe(false);\n      expect(result.errors).toContainEqual(\n        expect.objectContaining({\n          field: 'clockIn',\n          code: 'NOT_CLOCKED_IN'\n        })\n      );\n    });\n\n    it('should reject duplicate clock-out', async () => {\n      const entryWithClockOut = {\n        ...mockPresenceEntry,\n        clockOutTime: new Date()\n      };\n      const context: ClockOutValidationContext = {\n        employee: mockEmployee,\n        timestamp: new Date(),\n        presenceEntry: entryWithClockOut\n      };\n\n      const result = await presenceValidationService.validateClockOut(context);\n\n      expect(result.isValid).toBe(false);\n      expect(result.errors).toContainEqual(\n        expect.objectContaining({\n          field: 'clockOut',\n          code: 'ALREADY_CLOCKED_OUT'\n        })\n      );\n    });\n\n    it('should warn about short work duration', async () => {\n      const recentClockIn = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago\n      const entryWithRecentClockIn = {\n        ...mockPresenceEntry,\n        clockInTime: recentClockIn\n      };\n      const context: ClockOutValidationContext = {\n        employee: mockEmployee,\n        timestamp: new Date(),\n        presenceEntry: entryWithRecentClockIn\n      };\n\n      const result = await presenceValidationService.validateClockOut(context);\n\n      expect(result.warnings).toContainEqual(\n        expect.objectContaining({\n          field: 'duration',\n          code: 'SHORT_WORK_DURATION'\n        })\n      );\n    });\n\n    it('should warn about unfinished breaks', async () => {\n      const entryWithUnfinishedBreak = {\n        ...mockPresenceEntry,\n        breakEntries: [{\n          id: 'break1',\n          type: 'lunch',\n          startTime: new Date(Date.now() - 30 * 60 * 1000),\n          // No endTime\n        }]\n      };\n      const context: ClockOutValidationContext = {\n        employee: mockEmployee,\n        timestamp: new Date(),\n        presenceEntry: entryWithUnfinishedBreak\n      };\n\n      const result = await presenceValidationService.validateClockOut(context);\n\n      expect(result.warnings).toContainEqual(\n        expect.objectContaining({\n          field: 'breaks',\n          code: 'UNFINISHED_BREAKS'\n        })\n      );\n    });\n  });\n\n  describe('validatePresenceEntryData', () => {\n    it('should validate complete presence entry', () => {\n      const entry = {\n        employeeId: 'emp123',\n        date: '2023-12-01',\n        clockInTime: new Date('2023-12-01T09:00:00'),\n        clockOutTime: new Date('2023-12-01T17:00:00'),\n        breakEntries: [{\n          id: 'break1',\n          type: 'lunch',\n          startTime: new Date('2023-12-01T12:00:00'),\n          endTime: new Date('2023-12-01T13:00:00')\n        }]\n      };\n\n      const result = presenceValidationService.validatePresenceEntryData(entry);\n\n      expect(result.isValid).toBe(true);\n      expect(result.errors).toHaveLength(0);\n    });\n\n    it('should reject entry without required fields', () => {\n      const entry = {};\n\n      const result = presenceValidationService.validatePresenceEntryData(entry);\n\n      expect(result.isValid).toBe(false);\n      expect(result.errors).toContainEqual(\n        expect.objectContaining({\n          field: 'employeeId',\n          code: 'MISSING_EMPLOYEE_ID'\n        })\n      );\n      expect(result.errors).toContainEqual(\n        expect.objectContaining({\n          field: 'date',\n          code: 'MISSING_DATE'\n        })\n      );\n    });\n\n    it('should reject invalid time order', () => {\n      const entry = {\n        employeeId: 'emp123',\n        date: '2023-12-01',\n        clockInTime: new Date('2023-12-01T17:00:00'),\n        clockOutTime: new Date('2023-12-01T09:00:00') // Before clock-in\n      };\n\n      const result = presenceValidationService.validatePresenceEntryData(entry);\n\n      expect(result.isValid).toBe(false);\n      expect(result.errors).toContainEqual(\n        expect.objectContaining({\n          field: 'clockOutTime',\n          code: 'INVALID_TIME_ORDER'\n        })\n      );\n    });\n\n    it('should reject invalid break time order', () => {\n      const entry = {\n        employeeId: 'emp123',\n        date: '2023-12-01',\n        breakEntries: [{\n          id: 'break1',\n          type: 'lunch',\n          startTime: new Date('2023-12-01T13:00:00'),\n          endTime: new Date('2023-12-01T12:00:00') // Before start\n        }]\n      };\n\n      const result = presenceValidationService.validatePresenceEntryData(entry);\n\n      expect(result.isValid).toBe(false);\n      expect(result.errors).toContainEqual(\n        expect.objectContaining({\n          field: 'breakEntries[0].endTime',\n          code: 'INVALID_BREAK_TIME_ORDER'\n        })\n      );\n    });\n  });\n});"} 
ToolResult: SUCCESS - Created the tests/backend/unit/services/presence-validation.service.test.ts file. 
Maintenant, créons des tests pour le service d'audit :

<function_calls>
<invoke name="fsWrite">
<parameter name="path">tests/backend/unit/services/presence-audit.service.test.ts**
 * Tests pour le service d'audit de présence
 */

import { presenceAuditService, AuditEntry } from '../../../../backend/functions/src/services/presence-audit.service';
import { firestore } from '../../../../backend/functions/src/config/firebase';

// Mock Firestore
jest.mock('../../../../backend/functions/src/config/firebase', () => ({
  firestore: {
    collection: jest.fn(),
    batch: jest.fn()
  }
}));

describe('PresenceAuditService', () => {
  const mockCollection = {
    add: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    offset: jest.fn(),
    get: jest.fn()
  };

  const mockBatch = {
    delete: jest.fn(),
    commit: jest.fn()
  };

  const mockAuditEntry: Omit<AuditEntry, 'id' | 'timestamp'> = {
    userId: 'user123',
    employeeId: 'emp123',
    organizationId: 'org123',
    action: 'clock_in',
    resource: 'presence_entry',
    resourceId: 'entry123',
    details: {
      location: { latitude: 48.8566, longitude: 2.3522 }
    },
    metadata: {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      deviceFingerprint: 'abc123'
    },
    success: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (firestore.collection as jest.Mock).mockReturnValue(mockCollection);
    (firestore.batch as jest.Mock).mockReturnValue(mockBatch);
    
    // Chain methods for query building
    mockCollection.where.mockReturnValue(mockCollection);
    mockCollection.orderBy.mockReturnValue(mockCollection);
    mockCollection.limit.mockReturnValue(mockCollection);
    mockCollection.offset.mockReturnValue(mockCollection);
  });

  describe('logAction', () => {
    it('should create audit entry successfully', async () => {
      const mockDocRef = { id: 'audit123' };
      mockCollection.add.mockResolvedValue(mockDocRef);

      const result = await presenceAuditService.logAction(mockAuditEntry);

      expect(result).toBe('audit123');
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockAuditEntry,
          timestamp: expect.any(Object) // Firestore Timestamp
        })
      );
    });

    it('should handle creation errors', async () => {
      mockCollection.add.mockRejectedValue(new Error('Firestore error'));

      await expect(presenceAuditService.logAction(mockAuditEntry))
        .rejects.toThrow('Failed to create audit entry');
    });
  });

  describe('logClockingAction', () => {
    it('should log clocking action with correct format', async () => {
      const mockDocRef = { id: 'audit123' };
      mockCollection.add.mockResolvedValue(mockDocRef);

      const clockingData = {
        userId: 'user123',
        employeeId: 'emp123',
        organizationId: 'org123',
        action: 'clock_in' as const,
        success: true,
        details: {
          entryId: 'entry123',
          location: { latitude: 48.8566, longitude: 2.3522 }
        },
        metadata: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      };

      const result = await presenceAuditService.logClockingAction(clockingData);

      expect(result).toBe('audit123');
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          employeeId: 'emp123',
          organizationId: 'org123',
          action: 'clock_in',
          resource: 'presence_entry',
          resourceId: 'entry123',
          details: expect.objectContaining({
            clockingType: 'clock_in'
          }),
          success: true
        })
      );
    });
  });

  describe('logManagementAction', () => {
    it('should log management action correctly', async () => {
      const mockDocRef = { id: 'audit123' };
      mockCollection.add.mockResolvedValue(mockDocRef);

      const managementData = {
        userId: 'manager123',
        employeeId: 'emp123',
        organizationId: 'org123',
        action: 'validate_entry' as const,
        resourceId: 'entry123',
        success: true,
        details: {
          managerNotes: 'Approved after review'
        },
        metadata: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      };

      const result = await presenceAuditService.logManagementAction(managementData);

      expect(result).toBe('audit123');
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'validate_entry',
          resource: 'presence_entry',
          resourceId: 'entry123'
        })
      );
    });
  });

  describe('logSuspiciousActivity', () => {
    it('should log suspicious activity with patterns', async () => {
      const mockDocRef = { id: 'audit123' };
      mockCollection.add.mockResolvedValue(mockDocRef);

      const suspiciousData = {
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

      const result = await presenceAuditService.logSuspiciousActivity(suspiciousData);

      expect(result).toBe('audit123');
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            suspicious: true,
            patterns: ['RAPID_ATTEMPTS', 'MULTIPLE_IPS']
          }),
          success: false,
          errorCode: 'SUSPICIOUS_ACTIVITY'
        })
      );
    });
  });

  describe('getAuditEntries', () => {
    it('should retrieve audit entries with filters', async () => {
      const mockDocs = [
        {
          id: 'audit1',
          data: () => ({
            ...mockAuditEntry,
            timestamp: { toDate: () => new Date('2023-12-01T10:00:00') }
          })
        },
        {
          id: 'audit2',
          data: () => ({
            ...mockAuditEntry,
            timestamp: { toDate: () => new Date('2023-12-01T11:00:00') }
          })
        }
      ];

      mockCollection.get.mockResolvedValue({ docs: mockDocs });

      const query = {
        userId: 'user123',
        organizationId: 'org123',
        startDate: new Date('2023-12-01'),
        endDate: new Date('2023-12-02'),
        limit: 10
      };

      const result = await presenceAuditService.getAuditEntries(query);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('audit1');
      expect(result.hasMore).toBe(false);
      
      // Verify filters were applied
      expect(mockCollection.where).toHaveBeenCalledWith('userId', '==', 'user123');
      expect(mockCollection.where).toHaveBeenCalledWith('organizationId', '==', 'org123');
      expect(mockCollection.orderBy).toHaveBeenCalledWith('timestamp', 'desc');
    });

    it('should handle pagination correctly', async () => {
      const mockDocs = Array(11).fill(null).map((_, i) => ({
        id: `audit${i}`,
        data: () => ({
          ...mockAuditEntry,
          timestamp: { toDate: () => new Date() }
        })
      }));

      mockCollection.get.mockResolvedValue({ docs: mockDocs });

      const query = {
        limit: 10,
        offset: 5
      };

      const result = await presenceAuditService.getAuditEntries(query);

      expect(result.data).toHaveLength(10); // Should limit to 10
      expect(result.hasMore).toBe(true); // Should detect more results
      expect(mockCollection.offset).toHaveBeenCalledWith(5);
      expect(mockCollection.limit).toHaveBeenCalledWith(11); // +1 for hasMore detection
    });
  });

  describe('getAuditStats', () => {
    it('should calculate audit statistics correctly', async () => {
      const mockDocs = [
        {
          data: () => ({
            userId: 'user1',
            action: 'clock_in',
            success: true,
            timestamp: new Date('2023-12-01T10:00:00')
          })
        },
        {
          data: () => ({
            userId: 'user2',
            action: 'clock_out',
            success: true,
            timestamp: new Date('2023-12-01T11:00:00')
          })
        },
        {
          data: () => ({
            userId: 'user1',
            action: 'clock_in',
            success: false,
            timestamp: new Date('2023-12-01T12:00:00')
          })
        }
      ];

      mockCollection.get.mockResolvedValue({ docs: mockDocs });

      const query = {
        organizationId: 'org123',
        startDate: new Date('2023-12-01'),
        endDate: new Date('2023-12-02')
      };

      const result = await presenceAuditService.getAuditStats(query);

      expect(result.totalEntries).toBe(3);
      expect(result.successfulActions).toBe(2);
      expect(result.failedActions).toBe(1);
      expect(result.uniqueUsers).toBe(2);
      expect(result.actionBreakdown).toEqual({
        clock_in: 2,
        clock_out: 1
      });
    });
  });

  describe('getSuspiciousActivities', () => {
    it('should retrieve suspicious activities within time window', async () => {
      const mockDocs = [
        {
          id: 'suspicious1',
          data: () => ({
            ...mockAuditEntry,
            details: { suspicious: true, patterns: ['RAPID_ATTEMPTS'] },
            timestamp: { toDate: () => new Date() }
          })
        }
      ];

      mockCollection.get.mockResolvedValue({ docs: mockDocs });

      const result = await presenceAuditService.getSuspiciousActivities('org123', 24);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('suspicious1');
      
      // Verify filters
      expect(mockCollection.where).toHaveBeenCalledWith('details.suspicious', '==', true);
      expect(mockCollection.where).toHaveBeenCalledWith('organizationId', '==', 'org123');
      expect(mockCollection.where).toHaveBeenCalledWith('timestamp', '>=', expect.any(Object));
    });
  });

  describe('cleanupOldEntries', () => {
    it('should delete old audit entries', async () => {
      const mockDocs = [
        { ref: 'ref1' },
        { ref: 'ref2' },
        { ref: 'ref3' }
      ];

      mockCollection.get.mockResolvedValue({ 
        empty: false,
        docs: mockDocs 
      });
      mockBatch.commit.mockResolvedValue(undefined);

      const result = await presenceAuditService.cleanupOldEntries(90);

      expect(result).toBe(3);
      expect(mockBatch.delete).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should return 0 when no old entries found', async () => {
      mockCollection.get.mockResolvedValue({ empty: true });

      const result = await presenceAuditService.cleanupOldEntries(90);

      expect(result).toBe(0);
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });
  });

  describe('exportAuditData', () => {
    it('should export audit data for compliance', async () => {
      const mockDocs = [
        {
          id: 'audit1',
          data: () => ({
            ...mockAuditEntry,
            timestamp: { toDate: () => new Date() }
          })
        }
      ];

      mockCollection.get.mockResolvedValue({ docs: mockDocs });

      const query = {
        organizationId: 'org123',
        startDate: new Date('2023-12-01'),
        endDate: new Date('2023-12-02')
      };

      const result = await presenceAuditService.exportAuditData(query);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('audit1');
      
      // Should use high limit for export
      expect(mockCollection.limit).toHaveBeenCalledWith(10001); // 10000 + 1
    });
  });
});