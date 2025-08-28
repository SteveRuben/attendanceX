/**
 * Tests pour le service Employee
 */

import { employeeService, EmployeeCreateRequest, EmployeeUpdateRequest, LeaveBalanceUpdate } from '../../../../backend/functions/src/services/employee.service';
import { Employee, LeaveType, DEFAULT_LEAVE_BALANCES, GeoLocation } from '@attendance-x/shared';
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
            limit: jest.fn(() => ({
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
          limit: jest.fn(() => ({
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
        limit: jest.fn(() => ({
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
      add: jest.fn()
    }))
  },
  collections: {
    employees: 'employees',
    users: 'users'
  }
}));

describe('EmployeeService', () => {
  const mockEmployee: Employee = {
    id: 'emp123',
    userId: 'user123',
    employeeId: 'EMP001',
    organizationId: 'org123',
    departmentId: 'dept123',
    position: 'Software Developer',
    hireDate: new Date('2023-01-01'),
    isActive: true,
    requiresGeolocation: false,
    locationRadius: 100,
    leaveBalances: {
      [LeaveType.VACATION]: 25,
      [LeaveType.SICK_LEAVE]: 10,
      [LeaveType.PERSONAL]: 5,
      [LeaveType.MATERNITY]: 0,
      [LeaveType.PATERNITY]: 0,
      [LeaveType.BEREAVEMENT]: 3,
      [LeaveType.UNPAID]: 0,
      [LeaveType.COMPENSATORY]: 0
    },
    workEmail: 'john.doe@company.com',
    workPhone: '+33123456789',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin123'
  };

  const mockCreateRequest: EmployeeCreateRequest = {
    userId: 'user123',
    employeeId: 'EMP001',
    organizationId: 'org123',
    departmentId: 'dept123',
    position: 'Software Developer',
    hireDate: new Date('2023-01-01'),
    workEmail: 'john.doe@company.com',
    workPhone: '+33123456789',
    createdBy: 'admin123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEmployee', () => {
    it('should create employee successfully', async () => {
      // Mock user exists
      const mockUserDoc = {
        exists: true,
        data: () => ({ id: 'user123', email: 'john@example.com' })
      };

      // Mock no existing employee with same employeeId
      const mockEmployeeIdQuery = {
        empty: true,
        docs: []
      };

      // Mock no existing employee for user in organization
      const mockUserOrgQuery = {
        empty: true,
        docs: []
      };

      // Mock document reference
      const mockDocRef = {
        id: 'emp123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'users') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockUserDoc)
            })
          };
        }
        if (collectionName === 'employees') {
          return {
            where: jest.fn(() => ({
              where: jest.fn(() => ({
                limit: jest.fn(() => ({
                  get: jest.fn().mockResolvedValue(mockEmployeeIdQuery)
                })),
                get: jest.fn().mockResolvedValue(mockUserOrgQuery)
              }))
            })),
            doc: () => mockDocRef
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const result = await employeeService.createEmployee(mockCreateRequest);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockCreateRequest.userId);
      expect(result.employeeId).toBe(mockCreateRequest.employeeId);
      expect(result.organizationId).toBe(mockCreateRequest.organizationId);
      expect(result.leaveBalances).toEqual(DEFAULT_LEAVE_BALANCES);
      expect(mockDocRef.set).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      const mockUserDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'users') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockUserDoc)
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      await expect(employeeService.createEmployee(mockCreateRequest))
        .rejects.toThrow('User not found');
    });

    it('should throw error if employeeId already exists', async () => {
      const mockUserDoc = {
        exists: true,
        data: () => ({ id: 'user123' })
      };

      const mockEmployeeIdQuery = {
        empty: false,
        docs: [{ id: 'existing123' }]
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'users') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockUserDoc)
            })
          };
        }
        if (collectionName === 'employees') {
          return {
            where: jest.fn(() => ({
              where: jest.fn(() => ({
                get: jest.fn().mockResolvedValue(mockEmployeeIdQuery)
              }))
            }))
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      await expect(employeeService.createEmployee(mockCreateRequest))
        .rejects.toThrow('Employee ID EMP001 already exists in this organization');
    });

    it('should throw error if user already employee in organization', async () => {
      const mockUserDoc = {
        exists: true,
        data: () => ({ id: 'user123' })
      };

      const mockEmployeeIdQuery = {
        empty: true,
        docs: []
      };

      const mockUserOrgQuery = {
        empty: false,
        docs: [{ id: 'existing123', data: () => mockEmployee }]
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'users') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockUserDoc)
            })
          };
        }
        if (collectionName === 'employees') {
          return {
            where: jest.fn((field) => ({
              where: jest.fn(() => ({
                limit: jest.fn(() => ({
                  get: jest.fn().mockResolvedValue(
                    field === 'employeeId' ? mockEmployeeIdQuery : mockUserOrgQuery
                  )
                })),
                get: jest.fn().mockResolvedValue(mockUserOrgQuery)
              }))
            }))
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      await expect(employeeService.createEmployee(mockCreateRequest))
        .rejects.toThrow('User is already an employee in this organization');
    });
  });

  describe('getEmployeeById', () => {
    it('should return employee if found', async () => {
      const mockDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      const result = await employeeService.getEmployeeById('emp123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('emp123');
      expect(result?.employeeId).toBe('EMP001');
    });

    it('should return null if employee not found', async () => {
      const mockDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      const result = await employeeService.getEmployeeById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getEmployeeByEmployeeId', () => {
    it('should return employee if found', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{
          exists: true,
          id: 'emp123',
          data: () => mockEmployee
        }]
      };

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          where: () => ({
            limit: () => ({
              get: jest.fn().mockResolvedValue(mockSnapshot)
            })
          })
        })
      });

      const result = await employeeService.getEmployeeByEmployeeId('EMP001', 'org123');

      expect(result).toBeDefined();
      expect(result?.employeeId).toBe('EMP001');
    });

    it('should return null if employee not found', async () => {
      const mockSnapshot = {
        empty: true,
        docs: []
      };

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          where: () => ({
            limit: () => ({
              get: jest.fn().mockResolvedValue(mockSnapshot)
            })
          })
        })
      });

      const result = await employeeService.getEmployeeByEmployeeId('NONEXISTENT', 'org123');

      expect(result).toBeNull();
    });
  });

  describe('findByUserAndOrganization', () => {
    it('should return employee if found', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{
          exists: true,
          id: 'emp123',
          data: () => mockEmployee
        }]
      };

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          where: () => ({
            limit: () => ({
              get: jest.fn().mockResolvedValue(mockSnapshot)
            })
          })
        })
      });

      const result = await employeeService.findByUserAndOrganization('user123', 'org123');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('user123');
    });
  });

  describe('listEmployees', () => {
    it('should list employees with pagination', async () => {
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            exists: true,
            id: 'emp123',
            data: () => mockEmployee
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

      const result = await employeeService.listEmployees({
        organizationId: 'org123',
        page: 1,
        limit: 10
      });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter employees by search term', async () => {
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            exists: true,
            id: 'emp123',
            data: () => mockEmployee
          });
          callback({
            exists: true,
            id: 'emp456',
            data: () => ({
              ...mockEmployee,
              id: 'emp456',
              employeeId: 'EMP002',
              position: 'Designer'
            })
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

      const result = await employeeService.listEmployees({
        organizationId: 'org123',
        searchTerm: 'developer',
        page: 1,
        limit: 10
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].position).toBe('Software Developer');
    });
  });

  describe('updateEmployee', () => {
    it('should update employee successfully', async () => {
      const mockDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc),
          update: mockUpdate
        })
      });

      const updateRequest: EmployeeUpdateRequest = {
        position: 'Senior Developer',
        workEmail: 'john.senior@company.com',
        updatedBy: 'admin123'
      };

      const result = await employeeService.updateEmployee('emp123', updateRequest);

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw error if employee not found', async () => {
      const mockDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      const updateRequest: EmployeeUpdateRequest = {
        position: 'Senior Developer',
        updatedBy: 'admin123'
      };

      await expect(employeeService.updateEmployee('nonexistent', updateRequest))
        .rejects.toThrow('Employee not found');
    });
  });

  describe('deleteEmployee', () => {
    it('should soft delete employee successfully', async () => {
      const mockDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc),
          update: mockUpdate
        })
      });

      await employeeService.deleteEmployee('emp123', 'admin123');

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw error if employee not found', async () => {
      const mockDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      await expect(employeeService.deleteEmployee('nonexistent', 'admin123'))
        .rejects.toThrow('Employee not found');
    });
  });

  describe('toggleEmployeeStatus', () => {
    it('should activate employee successfully', async () => {
      const inactiveEmployee = { ...mockEmployee, isActive: false };
      const mockDoc = {
        exists: true,
        id: 'emp123',
        data: () => inactiveEmployee
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc),
          update: mockUpdate
        })
      });

      const result = await employeeService.toggleEmployeeStatus('emp123', true, 'admin123');

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should deactivate employee successfully', async () => {
      const mockDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc),
          update: mockUpdate
        })
      });

      const result = await employeeService.toggleEmployeeStatus('emp123', false, 'admin123');

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('assignWorkSchedule', () => {
    it('should assign work schedule successfully', async () => {
      const mockDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc),
          update: mockUpdate
        })
      });

      const result = await employeeService.assignWorkSchedule('emp123', 'schedule123', 'admin123');

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('removeWorkSchedule', () => {
    it('should remove work schedule successfully', async () => {
      const employeeWithSchedule = { ...mockEmployee, workScheduleId: 'schedule123' };
      const mockDoc = {
        exists: true,
        id: 'emp123',
        data: () => employeeWithSchedule
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc),
          update: mockUpdate
        })
      });

      const result = await employeeService.removeWorkSchedule('emp123', 'admin123');

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('updateLeaveBalance', () => {
    it('should update leave balance successfully', async () => {
      const mockDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc),
          update: mockUpdate
        })
      });

      const balanceUpdate: LeaveBalanceUpdate = {
        leaveType: LeaveType.VACATION,
        amount: 5,
        reason: 'Annual allocation',
        updatedBy: 'admin123'
      };

      const result = await employeeService.updateLeaveBalance('emp123', balanceUpdate);

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw error if insufficient balance for deduction', async () => {
      const mockDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      const balanceUpdate: LeaveBalanceUpdate = {
        leaveType: LeaveType.VACATION,
        amount: -30, // More than available balance
        updatedBy: 'admin123'
      };

      await expect(employeeService.updateLeaveBalance('emp123', balanceUpdate))
        .rejects.toThrow('Insufficient leave balance');
    });
  });

  describe('resetLeaveBalances', () => {
    it('should reset leave balances successfully', async () => {
      const mockDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc),
          update: mockUpdate
        })
      });

      const newBalances = {
        [LeaveType.VACATION]: 30,
        [LeaveType.SICK_LEAVE]: 15
      };

      const result = await employeeService.resetLeaveBalances('emp123', newBalances, 'admin123');

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('updateLocationSettings', () => {
    it('should update location settings successfully', async () => {
      const mockDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc),
          update: mockUpdate
        })
      });

      const locationSettings = {
        requiresGeolocation: true,
        locationRadius: 200,
        allowedLocations: [
          { latitude: 48.8566, longitude: 2.3522 }
        ] as GeoLocation[]
      };

      const result = await employeeService.updateLocationSettings('emp123', locationSettings, 'admin123');

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('getEmployeesByDepartment', () => {
    it('should return employees by department', async () => {
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            exists: true,
            id: 'emp123',
            data: () => mockEmployee
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

      const result = await employeeService.getEmployeesByDepartment('org123', 'dept123');

      expect(result).toHaveLength(1);
      expect(result[0].departmentId).toBe('dept123');
    });
  });

  describe('getEmployeeStats', () => {
    it('should return employee statistics', async () => {
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          // Active employee
          callback({
            exists: true,
            id: 'emp1',
            data: () => ({ ...mockEmployee, isActive: true, departmentId: 'dept1' })
          });
          // Inactive employee
          callback({
            exists: true,
            id: 'emp2',
            data: () => ({ ...mockEmployee, id: 'emp2', isActive: false, departmentId: 'dept2' })
          });
        })
      };

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          get: jest.fn().mockResolvedValue(mockSnapshot)
        })
      });

      const result = await employeeService.getEmployeeStats('org123');

      expect(result).toBeDefined();
      expect(result.total).toBe(2);
      expect(result.active).toBe(1);
      expect(result.inactive).toBe(1);
      expect(result.byDepartment['dept1']).toBe(1);
      expect(result.byDepartment['dept2']).toBe(1);
      expect(result.totalLeaveBalance[LeaveType.VACATION]).toBeGreaterThan(0);
    });
  });
});