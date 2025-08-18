/**
 * Tests pour le service WorkSchedule
 */

import { workScheduleService, WorkScheduleCreateRequest, WorkScheduleUpdateRequest } from '../../../../backend/functions/src/services/work-schedule.service';
import { WorkSchedule, ScheduleType, WorkDayType, DaySchedule } from '@attendance-x/shared';
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
        count: () => ({
          get: jest.fn()
        }),
        get: jest.fn()
      })),
      add: jest.fn()
    }))
  },
  collections: {
    work_schedules: 'work_schedules',
    employees: 'employees'
  }
}));

describe('WorkScheduleService', () => {
  const mondaySchedule: DaySchedule = {
    isWorkDay: true,
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    type: WorkDayType.REGULAR
  };

  const weekendSchedule: DaySchedule = {
    isWorkDay: false,
    type: WorkDayType.WEEKEND
  };

  const mockWorkSchedule: WorkSchedule = {
    id: 'schedule123',
    name: 'Standard Schedule',
    organizationId: 'org123',
    type: ScheduleType.FIXED,
    weeklySchedule: {
      1: mondaySchedule,
      2: mondaySchedule,
      3: mondaySchedule,
      4: mondaySchedule,
      5: mondaySchedule,
      0: weekendSchedule,
      6: weekendSchedule
    },
    defaultBreakDuration: 60,
    maxOvertimeHours: 4,
    gracePeriodsMinutes: {
      lateArrival: 15,
      earlyDeparture: 15
    },
    effectiveFrom: new Date('2023-01-01'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin123'
  };

  const mockCreateRequest: WorkScheduleCreateRequest = {
    name: 'Standard Schedule',
    organizationId: 'org123',
    type: ScheduleType.FIXED,
    weeklySchedule: {
      1: mondaySchedule,
      2: mondaySchedule,
      3: mondaySchedule,
      4: mondaySchedule,
      5: mondaySchedule
    },
    effectiveFrom: new Date('2023-01-01'),
    createdBy: 'admin123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorkSchedule', () => {
    it('should create work schedule successfully', async () => {
      // Mock no existing schedule with same name
      const mockNameQuery = {
        empty: true,
        docs: []
      };

      // Mock no conflicting schedules
      const mockConflictQuery = {
        forEach: jest.fn()
      };

      // Mock document reference
      const mockDocRef = {
        id: 'schedule123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'work_schedules') {
          return {
            where: () => ({
              where: () => ({
                get: jest.fn().mockResolvedValue(mockNameQuery)
              }),
              get: jest.fn().mockResolvedValue(mockConflictQuery)
            }),
            doc: () => mockDocRef
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const result = await workScheduleService.createWorkSchedule(mockCreateRequest);

      expect(result).toBeDefined();
      expect(result.name).toBe(mockCreateRequest.name);
      expect(result.organizationId).toBe(mockCreateRequest.organizationId);
      expect(mockDocRef.set).toHaveBeenCalled();
    });

    it('should throw error if schedule name already exists', async () => {
      const mockNameQuery = {
        empty: false,
        docs: [{ id: 'existing123' }]
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'work_schedules') {
          return {
            where: () => ({
              where: () => ({
                get: jest.fn().mockResolvedValue(mockNameQuery)
              })
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      await expect(workScheduleService.createWorkSchedule(mockCreateRequest))
        .rejects.toThrow('Schedule name "Standard Schedule" already exists in this organization');
    });
  });

  describe('getWorkScheduleById', () => {
    it('should return work schedule if found', async () => {
      const mockDoc = {
        exists: true,
        id: 'schedule123',
        data: () => mockWorkSchedule
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      const result = await workScheduleService.getWorkScheduleById('schedule123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('schedule123');
      expect(result?.name).toBe('Standard Schedule');
    });

    it('should return null if schedule not found', async () => {
      const mockDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      const result = await workScheduleService.getWorkScheduleById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listWorkSchedules', () => {
    it('should list work schedules with pagination', async () => {
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            exists: true,
            id: 'schedule123',
            data: () => mockWorkSchedule
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

      const result = await workScheduleService.listWorkSchedules({
        organizationId: 'org123',
        page: 1,
        limit: 10
      });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('updateWorkSchedule', () => {
    it('should update work schedule successfully', async () => {
      const mockDoc = {
        exists: true,
        id: 'schedule123',
        data: () => mockWorkSchedule
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      // Mock name uniqueness check (no conflict)
      const mockNameQuery = {
        empty: true,
        docs: []
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc),
          update: mockUpdate
        }),
        where: () => ({
          where: () => ({
            get: jest.fn().mockResolvedValue(mockNameQuery)
          })
        })
      });

      const updateRequest: WorkScheduleUpdateRequest = {
        name: 'Updated Schedule',
        updatedBy: 'admin123'
      };

      const result = await workScheduleService.updateWorkSchedule('schedule123', updateRequest);

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw error if schedule not found', async () => {
      const mockDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      const updateRequest: WorkScheduleUpdateRequest = {
        name: 'Updated Schedule',
        updatedBy: 'admin123'
      };

      await expect(workScheduleService.updateWorkSchedule('nonexistent', updateRequest))
        .rejects.toThrow('Work schedule not found');
    });

    it('should throw error if new name already exists', async () => {
      const mockDoc = {
        exists: true,
        id: 'schedule123',
        data: () => mockWorkSchedule
      };

      const mockNameQuery = {
        empty: false,
        docs: [{ id: 'other123' }] // Different ID, so it's a conflict
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        }),
        where: () => ({
          where: () => ({
            get: jest.fn().mockResolvedValue(mockNameQuery)
          })
        })
      });

      const updateRequest: WorkScheduleUpdateRequest = {
        name: 'Existing Schedule Name',
        updatedBy: 'admin123'
      };

      await expect(workScheduleService.updateWorkSchedule('schedule123', updateRequest))
        .rejects.toThrow('Schedule name "Existing Schedule Name" already exists in this organization');
    });
  });

  describe('deleteWorkSchedule', () => {
    it('should delete work schedule successfully when no employees use it', async () => {
      const mockDoc = {
        exists: true,
        id: 'schedule123',
        data: () => mockWorkSchedule
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      // Mock no employees using this schedule
      const mockEmployeesQuery = {
        docs: []
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'work_schedules') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockDoc),
              update: mockUpdate
            })
          };
        }
        if (collectionName === 'employees') {
          return {
            where: () => ({
              where: () => ({
                get: jest.fn().mockResolvedValue(mockEmployeesQuery)
              })
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      await workScheduleService.deleteWorkSchedule('schedule123', 'admin123');

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw error if employees are using the schedule', async () => {
      const mockDoc = {
        exists: true,
        id: 'schedule123',
        data: () => mockWorkSchedule
      };

      // Mock employees using this schedule
      const mockEmployeesQuery = {
        docs: [{ id: 'emp1' }, { id: 'emp2' }]
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'work_schedules') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockDoc)
            })
          };
        }
        if (collectionName === 'employees') {
          return {
            where: () => ({
              where: () => ({
                get: jest.fn().mockResolvedValue(mockEmployeesQuery)
              })
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      await expect(workScheduleService.deleteWorkSchedule('schedule123', 'admin123'))
        .rejects.toThrow('Cannot delete schedule: 2 employees are using this schedule');
    });

    it('should throw error if schedule not found', async () => {
      const mockDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      await expect(workScheduleService.deleteWorkSchedule('nonexistent', 'admin123'))
        .rejects.toThrow('Work schedule not found');
    });
  });

  describe('toggleScheduleStatus', () => {
    it('should activate schedule successfully', async () => {
      const inactiveSchedule = { ...mockWorkSchedule, isActive: false };
      const mockDoc = {
        exists: true,
        id: 'schedule123',
        data: () => inactiveSchedule
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc),
          update: mockUpdate
        })
      });

      const result = await workScheduleService.toggleScheduleStatus('schedule123', true, 'admin123');

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should deactivate schedule successfully', async () => {
      const mockDoc = {
        exists: true,
        id: 'schedule123',
        data: () => mockWorkSchedule
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc),
          update: mockUpdate
        })
      });

      const result = await workScheduleService.toggleScheduleStatus('schedule123', false, 'admin123');

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('cloneWorkSchedule', () => {
    it('should clone work schedule successfully', async () => {
      const mockDoc = {
        exists: true,
        id: 'schedule123',
        data: () => mockWorkSchedule
      };

      // Mock no existing schedule with new name
      const mockNameQuery = {
        empty: true,
        docs: []
      };

      const mockDocRef = {
        id: 'cloned123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: (id?: string) => {
          if (id) {
            return {
              get: jest.fn().mockResolvedValue(mockDoc)
            };
          }
          return mockDocRef;
        },
        where: () => ({
          where: () => ({
            get: jest.fn().mockResolvedValue(mockNameQuery)
          })
        })
      });

      const result = await workScheduleService.cloneWorkSchedule(
        'schedule123',
        'Cloned Schedule',
        'org456',
        'admin123'
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Cloned Schedule');
      expect(result.organizationId).toBe('org456');
      expect(mockDocRef.set).toHaveBeenCalled();
    });

    it('should throw error if original schedule not found', async () => {
      const mockDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      await expect(workScheduleService.cloneWorkSchedule('nonexistent', 'Cloned', 'org456', 'admin123'))
        .rejects.toThrow('Work schedule not found');
    });
  });

  describe('updateDaySchedule', () => {
    it('should update day schedule successfully', async () => {
      const mockDoc = {
        exists: true,
        id: 'schedule123',
        data: () => mockWorkSchedule
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc),
          update: mockUpdate
        })
      });

      const newDaySchedule: DaySchedule = {
        isWorkDay: true,
        startTime: '08:00',
        endTime: '16:00',
        breakDuration: 45,
        type: WorkDayType.REGULAR
      };

      const result = await workScheduleService.updateDaySchedule('schedule123', 1, newDaySchedule, 'admin123');

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw error if schedule not found', async () => {
      const mockDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      const newDaySchedule: DaySchedule = {
        isWorkDay: true,
        startTime: '08:00',
        endTime: '16:00',
        type: WorkDayType.REGULAR
      };

      await expect(workScheduleService.updateDaySchedule('nonexistent', 1, newDaySchedule, 'admin123'))
        .rejects.toThrow('Work schedule not found');
    });
  });

  describe('getEffectiveScheduleForEmployee', () => {
    it('should return effective schedule for employee', async () => {
      const mockEmployeeDoc = {
        exists: true,
        data: () => ({
          workScheduleId: 'schedule123'
        })
      };

      const mockScheduleDoc = {
        exists: true,
        id: 'schedule123',
        data: () => mockWorkSchedule
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'employees') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeDoc)
            })
          };
        }
        if (collectionName === 'work_schedules') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockScheduleDoc)
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const monday = new Date('2023-06-05'); // A Monday
      const result = await workScheduleService.getEffectiveScheduleForEmployee('emp123', monday);

      expect(result).toBeDefined();
      expect(result.schedule).toBeDefined();
      expect(result.daySchedule).toBeDefined();
      expect(result.isWorkingDay).toBe(true);
      expect(result.expectedHours).toBeGreaterThan(0);
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

      const monday = new Date('2023-06-05');

      await expect(workScheduleService.getEffectiveScheduleForEmployee('nonexistent', monday))
        .rejects.toThrow('Employee not found');
    });

    it('should return null schedule if employee has no assigned schedule', async () => {
      const mockEmployeeDoc = {
        exists: true,
        data: () => ({
          // No workScheduleId
        })
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

      const monday = new Date('2023-06-05');
      const result = await workScheduleService.getEffectiveScheduleForEmployee('emp123', monday);

      expect(result.schedule).toBeNull();
      expect(result.daySchedule).toBeNull();
      expect(result.isWorkingDay).toBe(false);
      expect(result.expectedHours).toBe(0);
    });
  });

  describe('getActiveSchedulesForOrganization', () => {
    it('should return active schedules for organization', async () => {
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            exists: true,
            id: 'schedule123',
            data: () => mockWorkSchedule
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

      const result = await workScheduleService.getActiveSchedulesForOrganization('org123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('schedule123');
    });
  });

  describe('getScheduleStats', () => {
    it('should return schedule statistics', async () => {
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          // Active schedule
          callback({
            exists: true,
            id: 'schedule1',
            data: () => ({ ...mockWorkSchedule, isActive: true, type: ScheduleType.FIXED })
          });
          // Inactive schedule
          callback({
            exists: true,
            id: 'schedule2',
            data: () => ({ ...mockWorkSchedule, id: 'schedule2', isActive: false, type: ScheduleType.FLEXIBLE })
          });
        })
      };

      const mockEmployeesCountSnapshot = {
        data: () => ({ count: 5 })
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'work_schedules') {
          return {
            where: () => ({
              get: jest.fn().mockResolvedValue(mockSnapshot)
            })
          };
        }
        if (collectionName === 'employees') {
          return {
            where: () => ({
              where: () => ({
                count: () => ({
                  get: jest.fn().mockResolvedValue(mockEmployeesCountSnapshot)
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

      const result = await workScheduleService.getScheduleStats('org123');

      expect(result).toBeDefined();
      expect(result.total).toBe(2);
      expect(result.active).toBe(1);
      expect(result.inactive).toBe(1);
      expect(result.byType[ScheduleType.FIXED]).toBe(1);
      expect(result.byType[ScheduleType.FLEXIBLE]).toBe(1);
      expect(result.employeesAssigned).toBe(5);
      expect(result.averageWeeklyHours).toBeGreaterThan(0);
    });
  });
});