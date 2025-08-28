/**
 * Tests pour le service Leave
 */

import { leaveService } from '../../../../backend/functions/src/services/leave.service';
import { LeaveRequest, LeaveType, LeaveStatus, LeaveRequestInput, LeaveApprovalInput, Employee } from '@attendance-x/shared';
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
    leave_requests: 'leave_requests',
    employees: 'employees'
  }
}));

describe('LeaveService', () => {
  const mockEmployee: Employee = {
    id: 'emp123',
    userId: 'user123',
    employeeId: 'EMP001',
    organizationId: 'org123',
    position: 'Developer',
    hireDate: new Date('2023-01-01'),
    isActive: true,
    requiresGeolocation: false,
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
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin'
  };

  const mockLeaveRequest: LeaveRequest = {
    id: 'leave123',
    employeeId: 'emp123',
    organizationId: 'org123',
    type: LeaveType.VACATION,
    startDate: '2023-12-01',
    endDate: '2023-12-05',
    totalDays: 5,
    isHalfDay: false,
    reason: 'Family vacation',
    status: LeaveStatus.PENDING,
    deductedFromBalance: true,
    balanceImpact: {
      [LeaveType.VACATION]: 5,
      [LeaveType.SICK_LEAVE]: 0,
      [LeaveType.PERSONAL]: 0,
      [LeaveType.MATERNITY]: 0,
      [LeaveType.PATERNITY]: 0,
      [LeaveType.BEREAVEMENT]: 0,
      [LeaveType.UNPAID]: 0,
      [LeaveType.COMPENSATORY]: 0
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitLeaveRequest', () => {
    it('should submit leave request successfully', async () => {
      // Mock employee exists and is active
      const mockEmployeeDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      // Mock no conflicting leave requests
      const mockConflictQuery = {
        forEach: jest.fn()
      };

      // Mock document reference for new request
      const mockDocRef = {
        id: 'leave123',
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
        if (collectionName === 'leave_requests') {
          return {
            where: () => ({
              where: () => ({
                where: () => ({
                  get: jest.fn().mockResolvedValue(mockConflictQuery)
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

      const requestInput: LeaveRequestInput = {
        type: LeaveType.VACATION,
        startDate: '2023-12-01',
        endDate: '2023-12-05',
        reason: 'Family vacation'
      };

      const result = await leaveService.submitLeaveRequest('emp123', requestInput);

      expect(result).toBeDefined();
      expect(result.employeeId).toBe('emp123');
      expect(result.type).toBe(LeaveType.VACATION);
      expect(result.status).toBe(LeaveStatus.PENDING);
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

      const requestInput: LeaveRequestInput = {
        type: LeaveType.VACATION,
        startDate: '2023-12-01',
        endDate: '2023-12-05',
        reason: 'Family vacation'
      };

      await expect(leaveService.submitLeaveRequest('emp123', requestInput))
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

      const requestInput: LeaveRequestInput = {
        type: LeaveType.VACATION,
        startDate: '2023-12-01',
        endDate: '2023-12-05',
        reason: 'Family vacation'
      };

      await expect(leaveService.submitLeaveRequest('emp123', requestInput))
        .rejects.toThrow('Employee is not active');
    });

    it('should throw error for conflicting leave requests', async () => {
      const mockEmployeeDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      // Mock conflicting leave request
      const conflictingRequest = {
        ...mockLeaveRequest,
        startDate: '2023-11-30',
        endDate: '2023-12-03'
      };

      const mockConflictQuery = {
        forEach: jest.fn((callback) => {
          callback({
            exists: true,
            id: 'conflict123',
            data: () => conflictingRequest
          });
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
        if (collectionName === 'leave_requests') {
          return {
            where: () => ({
              where: () => ({
                where: () => ({
                  get: jest.fn().mockResolvedValue(mockConflictQuery)
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

      const requestInput: LeaveRequestInput = {
        type: LeaveType.VACATION,
        startDate: '2023-12-01',
        endDate: '2023-12-05',
        reason: 'Family vacation'
      };

      await expect(leaveService.submitLeaveRequest('emp123', requestInput))
        .rejects.toThrow('Leave request conflicts with existing requests');
    });

    it('should handle half day leave request', async () => {
      const mockEmployeeDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const mockConflictQuery = {
        forEach: jest.fn()
      };

      const mockDocRef = {
        id: 'leave123',
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
        if (collectionName === 'leave_requests') {
          return {
            where: () => ({
              where: () => ({
                where: () => ({
                  get: jest.fn().mockResolvedValue(mockConflictQuery)
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

      const requestInput: LeaveRequestInput = {
        type: LeaveType.PERSONAL,
        startDate: '2023-12-01',
        endDate: '2023-12-01',
        isHalfDay: true,
        halfDayPeriod: 'morning',
        reason: 'Personal appointment'
      };

      const result = await leaveService.submitLeaveRequest('emp123', requestInput);

      expect(result).toBeDefined();
      expect(result.isHalfDay).toBe(true);
      expect(result.totalDays).toBe(0.5);
    });
  });

  describe('approveLeaveRequest', () => {
    it('should approve leave request successfully', async () => {
      const pendingRequest = { ...mockLeaveRequest, status: LeaveStatus.PENDING };
      const mockLeaveDoc = {
        exists: true,
        id: 'leave123',
        data: () => pendingRequest
      };

      const mockEmployeeDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockEmployeeUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'leave_requests') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockLeaveDoc),
              update: mockUpdate
            })
          };
        }
        if (collectionName === 'employees') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeDoc),
              update: mockEmployeeUpdate
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const approvalInput: LeaveApprovalInput = {
        status: LeaveStatus.APPROVED,
        notes: 'Approved for vacation'
      };

      const result = await leaveService.approveLeaveRequest('leave123', approvalInput, 'manager123');

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEmployeeUpdate).toHaveBeenCalled(); // Balance should be deducted
    });

    it('should reject leave request successfully', async () => {
      const pendingRequest = { ...mockLeaveRequest, status: LeaveStatus.PENDING };
      const mockLeaveDoc = {
        exists: true,
        id: 'leave123',
        data: () => pendingRequest
      };

      const mockEmployeeDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'leave_requests') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockLeaveDoc),
              update: mockUpdate
            })
          };
        }
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

      const approvalInput: LeaveApprovalInput = {
        status: LeaveStatus.REJECTED,
        rejectionReason: 'Insufficient coverage'
      };

      const result = await leaveService.approveLeaveRequest('leave123', approvalInput, 'manager123');

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw error if leave request not found', async () => {
      const mockLeaveDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'leave_requests') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockLeaveDoc)
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const approvalInput: LeaveApprovalInput = {
        status: LeaveStatus.APPROVED
      };

      await expect(leaveService.approveLeaveRequest('nonexistent', approvalInput, 'manager123'))
        .rejects.toThrow('Leave request not found');
    });

    it('should throw error if request is not pending', async () => {
      const approvedRequest = { ...mockLeaveRequest, status: LeaveStatus.APPROVED };
      const mockLeaveDoc = {
        exists: true,
        id: 'leave123',
        data: () => approvedRequest
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'leave_requests') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockLeaveDoc)
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const approvalInput: LeaveApprovalInput = {
        status: LeaveStatus.APPROVED
      };

      await expect(leaveService.approveLeaveRequest('leave123', approvalInput, 'manager123'))
        .rejects.toThrow('Only pending requests can be approved');
    });

    it('should throw error if insufficient leave balance', async () => {
      const pendingRequest = { ...mockLeaveRequest, totalDays: 30 }; // More than available balance
      const mockLeaveDoc = {
        exists: true,
        id: 'leave123',
        data: () => pendingRequest
      };

      const mockEmployeeDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'leave_requests') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockLeaveDoc)
            })
          };
        }
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

      const approvalInput: LeaveApprovalInput = {
        status: LeaveStatus.APPROVED
      };

      await expect(leaveService.approveLeaveRequest('leave123', approvalInput, 'manager123'))
        .rejects.toThrow('Insufficient leave balance');
    });
  });

  describe('cancelLeaveRequest', () => {
    it('should cancel pending leave request successfully', async () => {
      const pendingRequest = { ...mockLeaveRequest, status: LeaveStatus.PENDING };
      const mockLeaveDoc = {
        exists: true,
        id: 'leave123',
        data: () => pendingRequest
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'leave_requests') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockLeaveDoc),
              update: mockUpdate
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const result = await leaveService.cancelLeaveRequest('leave123', 'emp123');

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should cancel approved leave request and restore balance', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const approvedRequest = { 
        ...mockLeaveRequest, 
        status: LeaveStatus.APPROVED,
        startDate: tomorrow.toISOString().split('T')[0]
      };
      
      const mockLeaveDoc = {
        exists: true,
        id: 'leave123',
        data: () => approvedRequest
      };

      const mockEmployeeDoc = {
        exists: true,
        id: 'emp123',
        data: () => mockEmployee
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockEmployeeUpdate = jest.fn().mockResolvedValue(undefined);

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'leave_requests') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockLeaveDoc),
              update: mockUpdate
            })
          };
        }
        if (collectionName === 'employees') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockEmployeeDoc),
              update: mockEmployeeUpdate
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      const result = await leaveService.cancelLeaveRequest('leave123', 'emp123');

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEmployeeUpdate).toHaveBeenCalled(); // Balance should be restored
    });

    it('should throw error if leave request not found', async () => {
      const mockLeaveDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'leave_requests') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue(mockLeaveDoc)
            })
          };
        }
        return {
          doc: () => ({}),
          where: () => ({})
        };
      });

      await expect(leaveService.cancelLeaveRequest('nonexistent', 'emp123'))
        .rejects.toThrow('Leave request not found');
    });
  });

  describe('getLeaveRequestById', () => {
    it('should return leave request if found', async () => {
      const mockDoc = {
        exists: true,
        id: 'leave123',
        data: () => mockLeaveRequest
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      const result = await leaveService.getLeaveRequestById('leave123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('leave123');
      expect(result?.type).toBe(LeaveType.VACATION);
    });

    it('should return null if leave request not found', async () => {
      const mockDoc = {
        exists: false
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => ({
          get: jest.fn().mockResolvedValue(mockDoc)
        })
      });

      const result = await leaveService.getLeaveRequestById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listLeaveRequests', () => {
    it('should list leave requests with pagination', async () => {
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            exists: true,
            id: 'leave123',
            data: () => mockLeaveRequest
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

      const result = await leaveService.listLeaveRequests({
        organizationId: 'org123',
        employeeId: 'emp123',
        page: 1,
        limit: 10
      });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getPendingLeaveRequests', () => {
    it('should return pending leave requests', async () => {
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            exists: true,
            id: 'leave123',
            data: () => ({ ...mockLeaveRequest, status: LeaveStatus.PENDING })
          });
        })
      };

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          where: () => ({
            orderBy: () => ({
              get: jest.fn().mockResolvedValue(mockSnapshot)
            })
          })
        })
      });

      const result = await leaveService.getPendingLeaveRequests('org123');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(LeaveStatus.PENDING);
    });
  });

  describe('getUpcomingLeaves', () => {
    it('should return upcoming approved leaves', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const upcomingLeave = {
        ...mockLeaveRequest,
        status: LeaveStatus.APPROVED,
        startDate: tomorrow.toISOString().split('T')[0]
      };

      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            exists: true,
            id: 'leave123',
            data: () => upcomingLeave
          });
        })
      };

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          where: () => ({
            where: () => ({
              where: () => ({
                orderBy: () => ({
                  get: jest.fn().mockResolvedValue(mockSnapshot)
                })
              })
            })
          })
        })
      });

      const result = await leaveService.getUpcomingLeaves('org123', 'emp123');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(LeaveStatus.APPROVED);
    });
  });

  describe('getLeaveStatistics', () => {
    it('should return leave statistics', async () => {
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          // Pending request
          callback({
            exists: true,
            id: 'leave1',
            data: () => ({ ...mockLeaveRequest, status: LeaveStatus.PENDING, totalDays: 3 })
          });
          // Approved request
          callback({
            exists: true,
            id: 'leave2',
            data: () => ({ ...mockLeaveRequest, status: LeaveStatus.APPROVED, totalDays: 5 })
          });
          // Rejected request
          callback({
            exists: true,
            id: 'leave3',
            data: () => ({ ...mockLeaveRequest, status: LeaveStatus.REJECTED, totalDays: 2 })
          });
        })
      };

      (db.collection as jest.Mock).mockReturnValue({
        where: () => ({
          where: () => ({
            where: () => ({
              get: jest.fn().mockResolvedValue(mockSnapshot)
            })
          }),
          get: jest.fn().mockResolvedValue(mockSnapshot)
        })
      });

      const result = await leaveService.getLeaveStatistics('org123', '2023-01-01', '2023-12-31');

      expect(result).toBeDefined();
      expect(result.totalRequests).toBe(3);
      expect(result.pendingRequests).toBe(1);
      expect(result.approvedRequests).toBe(1);
      expect(result.rejectedRequests).toBe(1);
      expect(result.totalDaysRequested).toBe(10); // 3 + 5 + 2
      expect(result.totalDaysApproved).toBe(5);
      expect(result.averageRequestDuration).toBe(10 / 3);
      expect(result.byType[LeaveType.VACATION]).toBe(3);
    });
  });
});