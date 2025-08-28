/**
 * Tests pour le service de présence
 */

import { presenceService } from '../../../../backend/functions/src/services/presence.service';
import { PresenceEntry, PresenceStatus, Employee, ClockInRequest, ClockOutRequest, GeoLocation } from '@attendance-x/shared';
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
          limit: jest.fn(() => ({
            get: jest.fn()
          })),
          orderBy: jest.fn(() => ({
            offset: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn()
              }))
            }))
          })),
          count: jest.fn(() => ({
            get: jest.fn()
          })),
          get: jest.fn()
        })),
        limit: jest.fn(() => ({
          get: jest.fn()
        })),
        orderBy: jest.fn(() => ({
          offset: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn()
            }))
          }))
        })),
        count: jest.fn(() => ({
          get: jest.fn()
        })),
        get: jest.fn()
      })),
      add: jest.fn()
    }))
  },
  collections: {
    employees: 'employees',
    presence_entries: 'presence_entries'
  }
}));

describe('PresenceService', () => {
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
    date: '2023-12-01',
    status: PresenceStatus.PRESENT,
    clockInTime: new Date('2023-12-01T09:00:00Z'),
    isValidated: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('clockIn', () => {
    it('should clock in successfully', async () => {
      // Mock employee exists and is active
      const mockEmployeeDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      // Mock no existing entry for today
      const mockTodayQuery = {
        empty: true,
        docs: []
      };

      // Mock document reference for new entry
      const mockDocRef = {
        id: 'entry123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'employees') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeDoc)
            })
          };
        }
        if (collectionName === 'presence_entries') {
          return {
            where: () => ({
              where: () => ({
                limit: () => ({
                  get: jest.fn().mockResolvedValue(mockTodayQuery)
                })
              })
            }),
            doc: () => mockDocRef
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const request: ClockInRequest = {
        location: mockLocation,
        notes: 'Starting work'
      };

      const result = await presenceService.clockIn('emp123', request);

      expect(result).toBeDefined();
      expect(result.employeeId).toBe('emp123');
      expect(result.clockInTime).toBeDefined();
      expect(mockDocRef.set).toHaveBeenCalled();
    });

    it('should throw error if employee not found', async () => {
      const mockEmployeeDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'employees') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeDoc)
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const request: ClockInRequest = {};

      await expect(presenceService.clockIn('emp123', request))
        .rejects.toThrow('Employee not found');
    });

    it('should throw error if employee is not active', async () => {
      const inactiveEmployee = { ...mockEmployee, isActive: false };
      const mockEmployeeDoc = {
        exists: true,
        id: 'emp123',
        data: () => inactiveEmployee
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'employees') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeDoc)
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const request: ClockInRequest = {};

      await expect(presenceService.clockIn('emp123', request))
        .rejects.toThrow('Employee is not active');
    });

    it('should throw error if already clocked in', async () => {
      const mockEmployeeDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const existingEntry = {
        ...mockPresenceEntry,
        clockInTime: new Date()
      };

      const mockTodayQuery = {
        empty: false,
        docs: [{
          exists: true,
          id: 'entry123',
          data: () => existingEntry
        }]
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'employees') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeDoc)
            })
          };
        }
        if (collectionName === 'presence_entries') {
          return {
            where: () => ({
              where: () => ({
                limit: () => ({
                  get: jest.fn().mockResolvedValue(mockTodayQuery)
                })
              })
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const request: ClockInRequest = {};

      await expect(presenceService.clockIn('emp123', request))
        .rejects.toThrow('Employee is already clocked in today');
    });

    it('should throw error if location required but not provided', async () => {
      const employeeWithGeo = { ...mockEmployee, requiresGeolocation: true };
      const mockEmployeeDoc = {
        exists: true,
        id: 'emp123',
        data: () => employeeWithGeo
      };

      const mockTodayQuery = {
        empty: true,
        docs: []
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'employees') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeDoc)
            })
          };
        }
        if (collectionName === 'presence_entries') {
          return {
            where: () => ({
              where: () => ({
                limit: () => ({
                  get: jest.fn().mockResolvedValue(mockTodayQuery)
                })
              })
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const request: ClockInRequest = {}; // No location

      await expect(presenceService.clockIn('emp123', request))
        .rejects.toThrow('Location is required for this employee');
    });
  });

  describe('clockOut', () => {
    it('should clock out successfully', async () => {
      const mockEmployeeDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const existingEntry = {
        ...mockPresenceEntry,
        clockInTime: new Date('2023-12-01T09:00:00Z'),
        clockOutTime: undefined
      };

      const mockTodayQuery = {
        empty: false,
        docs: [{
          exists: true,
          id: 'entry123',
          data: () => existingEntry
        }]
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'employees') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeDoc)
            })
          };
        }
        if (collectionName === 'presence_entries') {
          return {
            where: () => ({
              where: () => ({
                limit: () => ({
                  get: jest.fn().mockResolvedValue(mockTodayQuery)
                })
              })
            }),
            doc: () => ({
              update: mockUpdate
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const request: ClockOutRequest = {
        location: mockLocation,
        notes: 'End of work'
      };

      const result = await presenceService.clockOut('emp123', request);

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw error if employee not found', async () => {
      const mockEmployeeDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'employees') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeDoc)
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const request: ClockOutRequest = {};

      await expect(presenceService.clockOut('emp123', request))
        .rejects.toThrow('Employee not found');
    });

    it('should throw error if not clocked in', async () => {
      const mockEmployeeDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const mockTodayQuery = {
        empty: true,
        docs: []
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'employees') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeDoc)
            })
          };
        }
        if (collectionName === 'presence_entries') {
          return {
            where: () => ({
              where: () => ({
                limit: () => ({
                  get: jest.fn().mockResolvedValue(mockTodayQuery)
                })
              })
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const request: ClockOutRequest = {};

      await expect(presenceService.clockOut('emp123', request))
        .rejects.toThrow('Employee must clock in first');
    });

    it('should throw error if already clocked out', async () => {
      const mockEmployeeDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const existingEntry = {
        ...mockPresenceEntry,
        clockInTime: new Date('2023-12-01T09:00:00Z'),
        clockOutTime: new Date('2023-12-01T17:00:00Z')
      };

      const mockTodayQuery = {
        empty: false,
        docs: [{
          exists: true,
          id: 'entry123',
          data: () => existingEntry
        }]
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'employees') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeDoc)
            })
          };
        }
        if (collectionName === 'presence_entries') {
          return {
            where: () => ({
              where: () => ({
                limit: () => ({
                  get: jest.fn().mockResolvedValue(mockTodayQuery)
                })
              })
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const request: ClockOutRequest = {};

      await expect(presenceService.clockOut('emp123', request))
        .rejects.toThrow('Employee is already clocked out');
    });
  });

  describe('startBreak', () => {
    it('should start break successfully', async () => {
      const existingEntry = {
        ...mockPresenceEntry,
        clockInTime: new Date('2023-12-01T09:00:00Z'),
        clockOutTime: undefined
      };

      const mockTodayQuery = {
        empty: false,
        docs: [{
          exists: true,
          id: 'entry123',
          data: () => existingEntry
        }]
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          where: () => ({
            limit: () => ({
              get: jest.fn().mockResolvedValue(mockTodayQuery)
            })
          })
        }),
        doc: () => ({
          update: mockUpdate
        })
      });

      const result = await presenceService.startBreak('emp123', 'lunch', mockLocation);

      expect(result).toBeDefined();
      expect(result.breakId).toBeDefined();
      expect(result.presenceEntry).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw error if not clocked in', async () => {
      const mockTodayQuery = {
        empty: true,
        docs: []
      };

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          where: () => ({
            limit: () => ({
              get: jest.fn().mockResolvedValue(mockTodayQuery)
            })
          })
        })
      });

      await expect(presenceService.startBreak('emp123', 'lunch'))
        .rejects.toThrow('Employee must be clocked in to start a break');
    });
  });

  describe('endBreak', () => {
    it('should end break successfully', async () => {
      const existingEntry = {
        ...mockPresenceEntry,
        clockInTime: new Date('2023-12-01T09:00:00Z'),
        breakEntries: [{
          id: 'break123',
          startTime: new Date('2023-12-01T12:00:00Z'),
          type: 'lunch'
        }]
      };

      const mockTodayQuery = {
        empty: false,
        docs: [{
          exists: true,
          id: 'entry123',
          data: () => existingEntry
        }]
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          where: () => ({
            limit: () => ({
              get: jest.fn().mockResolvedValue(mockTodayQuery)
            })
          })
        }),
        doc: () => ({
          update: mockUpdate
        })
      });

      const result = await presenceService.endBreak('emp123', 'break123', mockLocation);

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw error if no presence entry found', async () => {
      const mockTodayQuery = {
        empty: true,
        docs: []
      };

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          where: () => ({
            limit: () => ({
              get: jest.fn().mockResolvedValue(mockTodayQuery)
            })
          })
        })
      });

      await expect(presenceService.endBreak('emp123', 'break123'))
        .rejects.toThrow('No presence entry found for today');
    });
  });

  describe('getPresenceStatus', () => {
    it('should return presence status successfully', async () => {
      const mockEmployeeDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const mockTodayQuery = {
        empty: false,
        docs: [{
          exists: true,
          id: 'entry123',
          data: () => mockPresenceEntry
        }]
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'employees') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeDoc)
            })
          };
        }
        if (collectionName === 'presence_entries') {
          return {
            where: () => ({
              where: () => ({
                limit: () => ({
                  get: jest.fn().mockResolvedValue(mockTodayQuery)
                })
              })
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const result = await presenceService.getPresenceStatus('emp123');

      expect(result).toBeDefined();
      expect(result.employee).toEqual(mockEmployee);
      expect(result.currentStatus).toBe(PresenceStatus.PRESENT);
      expect(result.todayEntry).toBeDefined();
    });

    it('should throw error if employee not found', async () => {
      const mockEmployeeDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'employees') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeDoc)
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      await expect(presenceService.getPresenceStatus('emp123'))
        .rejects.toThrow('Employee not found');
    });
  });

  describe('listPresenceEntries', () => {
    it('should list presence entries with pagination', async () => {
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            exists: true,
            id: 'entry123',
            data: () => mockPresenceEntry
          });
        })
      };

      const mockCountSnapshot = {
        data: () => ({ count: 1 })
      };

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          where: () => ({
            where: () => ({
              orderBy: () => ({
                offset: () => ({
                  limit: () => ({
                    get: jest.fn().mockResolvedValue(mockSnapshot)
                  })
                })
              })
            })
          })
        }),
        orderBy: () => ({
          offset: () => ({
            limit: () => ({
              get: jest.fn().mockResolvedValue(mockSnapshot)
            })
          })
        }),
        count: () => ({
          get: jest.fn().mockResolvedValue(mockCountSnapshot)
        })
      });

      const result = await presenceService.listPresenceEntries({
        employeeId: 'emp123',
        page: 1,
        limit: 10
      });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('detectAnomalies', () => {
    it('should detect missed clock in anomaly', async () => {
      const entryWithoutClockIn = {
        ...mockPresenceEntry,
        clockInTime: undefined
      };

      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            exists: true,
            id: 'entry123',
            data: () => entryWithoutClockIn
          });
        })
      };

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          where: () => ({
            get: jest.fn().mockResolvedValue(mockSnapshot)
          })
        })
      });

      const result = await presenceService.detectAnomalies('org123', '2023-12-01');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('missed_clock_in');
      expect(result[0].severity).toBe('medium');
    });

    it('should detect overtime anomaly', async () => {
      const entryWithOvertime = {
        ...mockPresenceEntry,
        overtimeHours: 5 // Excessive overtime
      };

      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            exists: true,
            id: 'entry123',
            data: () => entryWithOvertime
          });
        })
      };

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          where: () => ({
            get: jest.fn().mockResolvedValue(mockSnapshot)
          })
        })
      });

      const result = await presenceService.detectAnomalies('org123', '2023-12-01');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('overtime');
      expect(result[0].severity).toBe('medium');
    });
  });

  describe('getPresenceStats', () => {
    it('should return presence statistics', async () => {
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          // Present entry
          callback({
            exists: true,
            id: 'entry1',
            data: () => ({ ...mockPresenceEntry, status: PresenceStatus.PRESENT, actualWorkHours: 8 })
          });
          // Late entry
          callback({
            exists: true,
            id: 'entry2',
            data: () => ({ ...mockPresenceEntry, status: PresenceStatus.LATE, actualWorkHours: 7.5 })
          });
          // Absent entry
          callback({
            exists: true,
            id: 'entry3',
            data: () => ({ ...mockPresenceEntry, status: PresenceStatus.ABSENT })
          });
        })
      };

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          where: () => ({
            where: () => ({
              get: jest.fn().mockResolvedValue(mockSnapshot)
            })
          })
        })
      });

      const result = await presenceService.getPresenceStats('org123', '2023-12-01', '2023-12-03');

      expect(result).toBeDefined();
      expect(result.totalEntries).toBe(3);
      expect(result.presentDays).toBe(2); // Present + Late
      expect(result.absentDays).toBe(1);
      expect(result.lateDays).toBe(1);
      expect(result.averageWorkHours).toBeGreaterThan(0);
    });
  });
});