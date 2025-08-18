/**
 * Tests pour le service de notifications de présence
 */

import { presenceNotificationService } from '../../../../backend/functions/src/services/presence-notification.service';
import { Employee, PresenceEntry, LeaveRequest, PresenceStatus, LeaveType, LeaveStatus } from '@attendance-x/shared';
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
          get: jest.fn()
        })),
        get: jest.fn()
      }))
    }))
  },
  collections: {
    employees: 'employees',
    presence_entries: 'presence_entries',
    notifications: 'notifications'
  }
}));

describe('PresenceNotificationService', () => {
  const mockEmployee: Employee = {
    id: 'emp123',
    userId: 'user123',
    employeeId: 'EMP001',
    organizationId: 'org123',
    position: 'Developer',
    hireDate: new Date('2023-01-01'),
    isActive: true,
    requiresGeolocation: false,
    workEmail: 'john.doe@company.com',
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

  const mockPresenceEntry: PresenceEntry = {
    id: 'entry123',
    employeeId: 'emp123',
    organizationId: 'org123',
    date: '2023-12-01',
    status: PresenceStatus.OVERTIME,
    clockInTime: new Date('2023-12-01T09:00:00Z'),
    clockOutTime: new Date('2023-12-01T19:00:00Z'),
    actualWorkHours: 8.5,
    overtimeHours: 2.5,
    isValidated: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockLeaveRequest: LeaveRequest = {
    id: 'leave123',
    employeeId: 'emp123',
    organizationId: 'org123',
    type: LeaveType.VACATION,
    startDate: '2023-12-15',
    endDate: '2023-12-20',
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

  describe('sendMissedClockInNotification', () => {
    it('should send missed clock-in notification to employee', async () => {
      const mockDocRef = {
        id: 'notification123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => mockDocRef
      });

      const scheduledStartTime = new Date('2023-12-01T09:00:00Z');
      const currentTime = new Date('2023-12-01T09:30:00Z'); // 30 minutes late

      await presenceNotificationService.sendMissedClockInNotification(
        mockEmployee,
        scheduledStartTime,
        currentTime
      );

      expect(mockDocRef.set).toHaveBeenCalled();
      const notificationData = mockDocRef.set.mock.calls[0][0];
      expect(notificationData.type).toBe('presence.missed_clock_in');
      expect(notificationData.title).toBe('Pointage d\'arrivée manqué');
      expect(notificationData.body).toContain('30 minutes');
    });

    it('should notify manager for significant delays', async () => {
      const mockDocRef = {
        id: 'notification123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => mockDocRef
      });

      const scheduledStartTime = new Date('2023-12-01T09:00:00Z');
      const currentTime = new Date('2023-12-01T09:45:00Z'); // 45 minutes late

      await presenceNotificationService.sendMissedClockInNotification(
        mockEmployee,
        scheduledStartTime,
        currentTime
      );

      // Should send 2 notifications: one to employee, one to manager
      expect(mockDocRef.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendMissedClockOutNotification', () => {
    it('should send missed clock-out notification to employee', async () => {
      const mockDocRef = {
        id: 'notification123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => mockDocRef
      });

      const clockInTime = new Date('2023-12-01T09:00:00Z');
      const currentTime = new Date('2023-12-01T19:00:00Z'); // 10 hours later

      await presenceNotificationService.sendMissedClockOutNotification(
        mockEmployee,
        clockInTime,
        currentTime
      );

      expect(mockDocRef.set).toHaveBeenCalled();
      const notificationData = mockDocRef.set.mock.calls[0][0];
      expect(notificationData.type).toBe('presence.missed_clock_out');
      expect(notificationData.body).toContain('10 heures');
    });

    it('should notify manager for excessive work hours', async () => {
      const mockDocRef = {
        id: 'notification123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => mockDocRef
      });

      const clockInTime = new Date('2023-12-01T09:00:00Z');
      const currentTime = new Date('2023-12-01T22:00:00Z'); // 13 hours later

      await presenceNotificationService.sendMissedClockOutNotification(
        mockEmployee,
        clockInTime,
        currentTime
      );

      // Should send 2 notifications: one to employee, one to manager
      expect(mockDocRef.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendOvertimeAlert', () => {
    it('should send overtime alert to employee and manager', async () => {
      const mockDocRef = {
        id: 'notification123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => mockDocRef
      });

      await presenceNotificationService.sendOvertimeAlert(mockEmployee, mockPresenceEntry);

      // Should send 2 notifications: one to employee, one to manager
      expect(mockDocRef.set).toHaveBeenCalledTimes(2);
      
      const employeeNotification = mockDocRef.set.mock.calls[0][0];
      expect(employeeNotification.type).toBe('presence.overtime_alert');
      expect(employeeNotification.body).toContain('2.5 heures supplémentaires');
    });
  });

  describe('sendLeaveRequestNotification', () => {
    it('should send leave request submitted notification', async () => {
      const mockDocRef = {
        id: 'notification123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => mockDocRef
      });

      await presenceNotificationService.sendLeaveRequestNotification(
        mockEmployee,
        mockLeaveRequest,
        'submitted'
      );

      // Should send 2 notifications: one to employee, one to manager
      expect(mockDocRef.set).toHaveBeenCalledTimes(2);
      
      const employeeNotification = mockDocRef.set.mock.calls[0][0];
      expect(employeeNotification.type).toBe('leave.request_submitted');
      expect(employeeNotification.title).toBe('Demande de congé soumise');
    });

    it('should send leave request approved notification', async () => {
      const mockDocRef = {
        id: 'notification123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => mockDocRef
      });

      const approvedRequest = { ...mockLeaveRequest, status: LeaveStatus.APPROVED };

      await presenceNotificationService.sendLeaveRequestNotification(
        mockEmployee,
        approvedRequest,
        'approved'
      );

      expect(mockDocRef.set).toHaveBeenCalledTimes(1); // Only to employee
      
      const notification = mockDocRef.set.mock.calls[0][0];
      expect(notification.type).toBe('leave.request_approved');
      expect(notification.title).toBe('Demande de congé approuvée');
    });

    it('should send leave request rejected notification with reason', async () => {
      const mockDocRef = {
        id: 'notification123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => mockDocRef
      });

      const rejectedRequest = { 
        ...mockLeaveRequest, 
        status: LeaveStatus.REJECTED,
        rejectionReason: 'Insufficient coverage'
      };

      await presenceNotificationService.sendLeaveRequestNotification(
        mockEmployee,
        rejectedRequest,
        'rejected'
      );

      expect(mockDocRef.set).toHaveBeenCalledTimes(1);
      
      const notification = mockDocRef.set.mock.calls[0][0];
      expect(notification.type).toBe('leave.request_rejected');
      expect(notification.body).toContain('Insufficient coverage');
    });
  });

  describe('sendLeaveReminders', () => {
    it('should send leave reminders to employees with high balances', async () => {
      const mockEmployeesSnapshot = {
        forEach: jest.fn((callback) => {
          // Employee with high vacation balance
          callback({
            data: () => ({
              ...mockEmployee,
              leaveBalances: {
                ...mockEmployee.leaveBalances,
                [LeaveType.VACATION]: 25 // High balance
              }
            })
          });
        })
      };

      const mockDocRef = {
        id: 'notification123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'employees') {
          return {
            where: () => ({
              where: () => ({
                get: jest.fn().mockResolvedValue(mockEmployeesSnapshot)
              })
            })
          };
        }
        return {
          doc: () => mockDocRef
        };
      });

      await presenceNotificationService.sendLeaveReminders('org123');

      expect(mockDocRef.set).toHaveBeenCalled();
      const notification = mockDocRef.set.mock.calls[0][0];
      expect(notification.type).toBe('leave.reminder');
      expect(notification.body).toContain('25 jours');
    });
  });

  describe('sendScheduleChangeNotification', () => {
    it('should send schedule change notification', async () => {
      const mockDocRef = {
        id: 'notification123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: () => mockDocRef
      });

      const oldSchedule = { startTime: '09:00', endTime: '17:00' };
      const newSchedule = { startTime: '08:00', endTime: '16:00' };
      const effectiveDate = new Date('2024-01-01');

      await presenceNotificationService.sendScheduleChangeNotification(
        mockEmployee,
        oldSchedule,
        newSchedule,
        effectiveDate
      );

      expect(mockDocRef.set).toHaveBeenCalled();
      const notification = mockDocRef.set.mock.calls[0][0];
      expect(notification.type).toBe('schedule.changed');
      expect(notification.priority).toBe('high');
    });
  });

  describe('processDailyNotifications', () => {
    it('should process daily notifications for organization', async () => {
      const mockPresenceSnapshot = {
        docs: [
          {
            data: () => ({
              ...mockPresenceEntry,
              clockInTime: undefined, // Missed clock-in
              scheduledStartTime: new Date('2023-12-01T09:00:00Z')
            })
          },
          {
            data: () => ({
              ...mockPresenceEntry,
              id: 'entry456',
              clockInTime: new Date('2023-12-01T09:00:00Z'),
              clockOutTime: undefined, // Missed clock-out
              overtimeHours: 3 // Overtime
            })
          }
        ]
      };

      const mockEmployeeDoc = {
        exists: true,
        data: () => mockEmployee
      };

      const mockDocRef = {
        id: 'notification123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      (db.collection as jest.Mock).mockImplementation((collectionName) => {
        if (collectionName === 'presence_entries') {
          return {
            where: () => ({
              where: () => ({
                get: jest.fn().mockResolvedValue(mockPresenceSnapshot)
              })
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
          doc: () => mockDocRef
        };
      });

      const result = await presenceNotificationService.processDailyNotifications('org123');

      expect(result.missedClockIns).toBeGreaterThan(0);
      expect(result.overtimeAlerts).toBeGreaterThan(0);
      expect(mockDocRef.set).toHaveBeenCalled();
    });
  });
});