/**
 * Tests pour le modèle LeaveRequest
 */

import { LeaveRequestModel } from '../../../backend/functions/src/models/leave-request.model';
import { LeaveRequest, LeaveType, LeaveStatus } from '@attendance-x/shared';

describe('LeaveRequestModel', () => {
  const validLeaveData: Partial<LeaveRequest> = {
    employeeId: 'emp123',
    organizationId: 'org123',
    type: LeaveType.VACATION,
    startDate: '2023-12-01',
    endDate: '2023-12-05',
    totalDays: 5,
    reason: 'Family vacation'
  };

  describe('Constructor', () => {
    it('should create leave request with default values', () => {
      const leave = new LeaveRequestModel(validLeaveData);
      
      expect(leave.employeeId).toBe('emp123');
      expect(leave.organizationId).toBe('org123');
      expect(leave.type).toBe(LeaveType.VACATION);
      expect(leave.status).toBe(LeaveStatus.PENDING);
      expect(leave.isHalfDay).toBe(false);
      expect(leave.deductedFromBalance).toBe(true);
    });

    it('should create leave request with custom values', () => {
      const customData = {
        ...validLeaveData,
        isHalfDay: true,
        halfDayPeriod: 'morning' as const,
        deductedFromBalance: false
      };

      const leave = new LeaveRequestModel(customData);
      
      expect(leave.isHalfDay).toBe(true);
      expect(leave.halfDayPeriod).toBe('morning');
      expect(leave.deductedFromBalance).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate successfully with valid data', async () => {
      const leave = new LeaveRequestModel(validLeaveData);
      await expect(leave.validate()).resolves.toBe(true);
    });

    it('should throw error for missing required fields', async () => {
      const leave = new LeaveRequestModel({
        employeeId: 'emp123'
        // Missing required fields
      });

      await expect(leave.validate()).rejects.toThrow('Missing required fields');
    });

    it('should throw error for invalid leave type', async () => {
      const leave = new LeaveRequestModel({
        ...validLeaveData,
        type: 'invalid_type' as LeaveType
      });

      await expect(leave.validate()).rejects.toThrow('Invalid leave type');
    });

    it('should throw error for invalid leave status', async () => {
      const leave = new LeaveRequestModel({
        ...validLeaveData,
        status: 'invalid_status' as LeaveStatus
      });

      await expect(leave.validate()).rejects.toThrow('Invalid leave status');
    });

    it('should throw error for empty reason', async () => {
      const leave = new LeaveRequestModel({
        ...validLeaveData,
        reason: ''
      });

      await expect(leave.validate()).rejects.toThrow('Leave reason is required');
    });

    it('should throw error for reason too long', async () => {
      const leave = new LeaveRequestModel({
        ...validLeaveData,
        reason: 'A'.repeat(501) // Too long
      });

      await expect(leave.validate()).rejects.toThrow('Leave reason must be 500 characters or less');
    });

    it('should throw error for negative total days', async () => {
      const leave = new LeaveRequestModel({
        ...validLeaveData,
        totalDays: -1
      });

      await expect(leave.validate()).rejects.toThrow('Total days must be greater than 0');
    });

    it('should throw error for half day without period', async () => {
      const leave = new LeaveRequestModel({
        ...validLeaveData,
        isHalfDay: true,
        totalDays: 0.5
        // Missing halfDayPeriod
      });

      await expect(leave.validate()).rejects.toThrow('Half day period must be specified');
    });

    it('should throw error for half day with wrong total days', async () => {
      const leave = new LeaveRequestModel({
        ...validLeaveData,
        isHalfDay: true,
        halfDayPeriod: 'morning',
        totalDays: 1 // Should be 0.5 for half day
      });

      await expect(leave.validate()).rejects.toThrow('Half day requests must have 0.5 total days');
    });

    it('should throw error for invalid half day period', async () => {
      const leave = new LeaveRequestModel({
        ...validLeaveData,
        isHalfDay: true,
        halfDayPeriod: 'invalid' as any,
        totalDays: 0.5
      });

      await expect(leave.validate()).rejects.toThrow('Invalid half day period');
    });

    it('should throw error for invalid date format', async () => {
      const leave = new LeaveRequestModel({
        ...validLeaveData,
        startDate: '01/12/2023' // Wrong format
      });

      await expect(leave.validate()).rejects.toThrow('Date must be in YYYY-MM-DD format');
    });

    it('should throw error when end date is before start date', async () => {
      const leave = new LeaveRequestModel({
        ...validLeaveData,
        startDate: '2023-12-05',
        endDate: '2023-12-01' // Before start date
      });

      await expect(leave.validate()).rejects.toThrow('End date must be after or equal to start date');
    });
  });

  describe('Status Management', () => {
    let leave: LeaveRequestModel;

    beforeEach(() => {
      leave = new LeaveRequestModel(validLeaveData);
    });

    it('should approve leave request correctly', () => {
      const approver = 'manager123';
      const notes = 'Approved for vacation';
      
      leave.approve(approver, notes);
      
      expect(leave.status).toBe(LeaveStatus.APPROVED);
      expect(leave.approvedBy).toBe(approver);
      expect(leave.approvedAt).toBeDefined();
      expect(leave.notes).toBe(notes);
    });

    it('should reject leave request correctly', () => {
      const rejector = 'manager123';
      const reason = 'Insufficient coverage';
      
      leave.reject(rejector, reason);
      
      expect(leave.status).toBe(LeaveStatus.REJECTED);
      expect(leave.approvedBy).toBe(rejector);
      expect(leave.approvedAt).toBeDefined();
      expect(leave.rejectionReason).toBe(reason);
    });

    it('should cancel leave request correctly', () => {
      leave.cancel();
      
      expect(leave.status).toBe(LeaveStatus.CANCELLED);
    });

    it('should throw error when approving non-pending request', () => {
      leave.approve('manager123');
      
      expect(() => {
        leave.approve('manager456');
      }).toThrow('Only pending requests can be approved');
    });

    it('should throw error when rejecting non-pending request', () => {
      leave.reject('manager123', 'reason');
      
      expect(() => {
        leave.reject('manager456', 'another reason');
      }).toThrow('Only pending requests can be rejected');
    });
  });

  describe('Balance Impact Calculation', () => {
    let leave: LeaveRequestModel;

    beforeEach(() => {
      leave = new LeaveRequestModel(validLeaveData);
    });

    it('should calculate balance impact correctly for regular leave', () => {
      const impact = leave.calculateBalanceImpact();
      
      expect(impact[LeaveType.VACATION]).toBe(5);
      expect(impact[LeaveType.SICK_LEAVE]).toBe(0);
    });

    it('should calculate balance impact correctly for half day leave', () => {
      const halfDayLeave = new LeaveRequestModel({
        ...validLeaveData,
        isHalfDay: true,
        totalDays: 0.5
      });
      
      const impact = halfDayLeave.calculateBalanceImpact();
      
      expect(impact[LeaveType.VACATION]).toBe(0.5);
    });

    it('should not impact balance for unpaid leave', () => {
      const unpaidLeave = new LeaveRequestModel({
        ...validLeaveData,
        type: LeaveType.UNPAID,
        deductedFromBalance: false
      });
      
      const impact = unpaidLeave.calculateBalanceImpact();
      
      expect(impact[LeaveType.UNPAID]).toBe(0);
    });
  });

  describe('Date Calculations', () => {
    let leave: LeaveRequestModel;

    beforeEach(() => {
      leave = new LeaveRequestModel(validLeaveData);
    });

    it('should calculate working days correctly', () => {
      const workingDays = leave.calculateWorkingDays();
      expect(workingDays).toBe(5); // Monday to Friday
    });

    it('should calculate working days excluding weekends', () => {
      const weekendLeave = new LeaveRequestModel({
        ...validLeaveData,
        startDate: '2023-12-02', // Saturday
        endDate: '2023-12-03', // Sunday
        totalDays: 0 // Should be 0 working days
      });
      
      const workingDays = weekendLeave.calculateWorkingDays();
      expect(workingDays).toBe(0);
    });

    it('should check if leave is upcoming', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const upcomingLeave = new LeaveRequestModel({
        ...validLeaveData,
        startDate: tomorrow.toISOString().split('T')[0]
      });
      
      expect(upcomingLeave.isUpcoming()).toBe(true);
    });

    it('should check if leave is current', () => {
      const today = new Date().toISOString().split('T')[0];
      
      const currentLeave = new LeaveRequestModel({
        ...validLeaveData,
        startDate: today,
        endDate: today
      });
      
      expect(currentLeave.isCurrent()).toBe(true);
    });

    it('should check if leave is past', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const pastLeave = new LeaveRequestModel({
        ...validLeaveData,
        startDate: yesterday.toISOString().split('T')[0],
        endDate: yesterday.toISOString().split('T')[0]
      });
      
      expect(pastLeave.isPast()).toBe(true);
    });
  });

  describe('Conflict Detection', () => {
    let leave1: LeaveRequestModel;
    let leave2: LeaveRequestModel;

    beforeEach(() => {
      leave1 = new LeaveRequestModel({
        ...validLeaveData,
        startDate: '2023-12-01',
        endDate: '2023-12-05'
      });
    });

    it('should detect overlapping leave requests', () => {
      leave2 = new LeaveRequestModel({
        ...validLeaveData,
        startDate: '2023-12-03',
        endDate: '2023-12-07'
      });
      
      expect(leave1.conflictsWith(leave2)).toBe(true);
    });

    it('should detect adjacent leave requests as non-conflicting', () => {
      leave2 = new LeaveRequestModel({
        ...validLeaveData,
        startDate: '2023-12-06',
        endDate: '2023-12-10'
      });
      
      expect(leave1.conflictsWith(leave2)).toBe(false);
    });

    it('should detect completely separate leave requests as non-conflicting', () => {
      leave2 = new LeaveRequestModel({
        ...validLeaveData,
        startDate: '2023-12-15',
        endDate: '2023-12-20'
      });
      
      expect(leave1.conflictsWith(leave2)).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    let leave: LeaveRequestModel;

    beforeEach(() => {
      leave = new LeaveRequestModel(validLeaveData);
    });

    it('should get duration correctly', () => {
      expect(leave.getDuration()).toBe(5);
    });

    it('should get type label correctly', () => {
      expect(leave.getTypeLabel()).toBe('Congés payés');
    });

    it('should get status label correctly', () => {
      expect(leave.getStatusLabel()).toBe('En attente');
    });

    it('should check status correctly', () => {
      expect(leave.isPending()).toBe(true);
      expect(leave.isApproved()).toBe(false);
      expect(leave.isRejected()).toBe(false);
      expect(leave.isCancelled()).toBe(false);
    });

    it('should check if can be cancelled', () => {
      expect(leave.canBeCancelled()).toBe(true);
      
      leave.approve('manager123');
      expect(leave.canBeCancelled()).toBe(true);
      
      leave.reject('manager123', 'reason');
      expect(leave.canBeCancelled()).toBe(false);
    });

    it('should check if requires approval', () => {
      expect(leave.requiresApproval()).toBe(true);
      
      const sickLeave = new LeaveRequestModel({
        ...validLeaveData,
        type: LeaveType.SICK_LEAVE,
        totalDays: 1
      });
      
      expect(sickLeave.requiresApproval()).toBe(false); // Short sick leave might not require approval
    });
  });

  describe('Firestore Conversion', () => {
    it('should convert to Firestore format correctly', () => {
      const leave = new LeaveRequestModel(validLeaveData);
      const firestoreData = leave.toFirestore();
      
      expect(firestoreData.employeeId).toBe('emp123');
      expect(firestoreData.organizationId).toBe('org123');
      expect(firestoreData.type).toBe(LeaveType.VACATION);
      expect(firestoreData.status).toBe(LeaveStatus.PENDING);
      expect(firestoreData.balanceImpact).toBeDefined();
    });

    it('should convert to API format correctly', () => {
      const leave = new LeaveRequestModel({
        ...validLeaveData,
        startDate: '2023-12-01',
        endDate: '2023-12-05'
      });
      
      const apiData = leave.toAPI();
      
      expect(apiData.duration).toBe(5);
      expect(apiData.typeLabel).toBeDefined();
      expect(apiData.statusLabel).toBeDefined();
      expect(apiData.isUpcoming).toBeDefined();
      expect(apiData.isCurrent).toBeDefined();
      expect(apiData.isPast).toBeDefined();
      expect(apiData.canBeCancelled).toBeDefined();
      expect(apiData.workingDays).toBeDefined();
    });
  });
});Period: 'morning',
        totalDays: 1 // Should be 0.5
      });

      await expect(leave.validate()).rejects.toThrow('Half day leave must be exactly 0.5 days');
    });
  });

  describe('Date Calculations', () => {
    let leave: LeaveRequestModel;

    beforeEach(() => {
      leave = new LeaveRequestModel(validLeaveData);
    });

    it('should calculate total days correctly for multi-day leave', () => {
      const leave2 = new LeaveRequestModel({
        ...validLeaveData,
        startDate: '2023-12-01',
        endDate: '2023-12-05'
      });
      
      const totalDays = leave2.calculateTotalDays();
      expect(totalDays).toBe(5); // 1st to 5th inclusive
    });

    it('should calculate total days correctly for single day leave', () => {
      const leave2 = new LeaveRequestModel({
        ...validLeaveData,
        startDate: '2023-12-01',
        endDate: '2023-12-01'
      });
      
      const totalDays = leave2.calculateTotalDays();
      expect(totalDays).toBe(1);
    });

    it('should calculate total days correctly for half day leave', () => {
      const leave2 = new LeaveRequestModel({
        ...validLeaveData,
        isHalfDay: true
      });
      
      const totalDays = leave2.calculateTotalDays();
      expect(totalDays).toBe(0.5);
    });

    it('should update total days correctly', () => {
      const leave2 = new LeaveRequestModel({
        ...validLeaveData,
        startDate: '2023-12-01',
        endDate: '2023-12-03'
      });
      
      leave2.updateTotalDays();
      expect(leave2.totalDays).toBe(3);
    });
  });

  describe('Status Management', () => {
    let leave: LeaveRequestModel;

    beforeEach(() => {
      leave = new LeaveRequestModel(validLeaveData);
    });

    it('should submit leave request correctly', () => {
      leave.submit();
      
      expect(leave.submittedAt).toBeDefined();
    });

    it('should approve leave request correctly', () => {
      const approver = 'manager123';
      const notes = 'Approved for vacation';
      
      leave.approve(approver, notes);
      
      expect(leave.status).toBe(LeaveStatus.APPROVED);
      expect(leave.approvedBy).toBe(approver);
      expect(leave.approvedAt).toBeDefined();
    });

    it('should reject leave request correctly', () => {
      const rejector = 'manager123';
      const reason = 'Insufficient coverage';
      
      leave.reject(rejector, reason);
      
      expect(leave.status).toBe(LeaveStatus.REJECTED);
      expect(leave.approvedBy).toBe(rejector);
      expect(leave.approvedAt).toBeDefined();
      expect(leave.rejectionReason).toBe(reason);
    });

    it('should cancel leave request correctly', () => {
      leave.cancel();
      
      expect(leave.status).toBe(LeaveStatus.CANCELLED);
    });
  });

  describe('Utility Methods', () => {
    let leave: LeaveRequestModel;

    beforeEach(() => {
      leave = new LeaveRequestModel(validLeaveData);
    });

    it('should get duration correctly', () => {
      expect(leave.getDuration()).toBe(5);
    });

    it('should get type label correctly', () => {
      expect(leave.getTypeLabel()).toBe('Congés payés');
    });

    it('should get status label correctly', () => {
      expect(leave.getStatusLabel()).toBe('En attente');
    });

    it('should check status correctly', () => {
      expect(leave.isPending()).toBe(true);
      expect(leave.isApproved()).toBe(false);
      expect(leave.isRejected()).toBe(false);
      expect(leave.isCancelled()).toBe(false);
    });
  });

  describe('Firestore Conversion', () => {
    it('should convert to Firestore format correctly', () => {
      const leave = new LeaveRequestModel(validLeaveData);
      const firestoreData = leave.toFirestore();
      
      expect(firestoreData.employeeId).toBe('emp123');
      expect(firestoreData.organizationId).toBe('org123');
      expect(firestoreData.type).toBe(LeaveType.VACATION);
      expect(firestoreData.startDate).toBe('2023-12-01');
      expect(firestoreData.endDate).toBe('2023-12-05');
      expect(firestoreData.totalDays).toBe(5);
      expect(firestoreData.reason).toBe('Family vacation');
      expect(firestoreData.status).toBe(LeaveStatus.PENDING);
    });

    it('should convert to API format correctly', () => {
      const leave = new LeaveRequestModel(validLeaveData);
      const apiData = leave.toAPI();
      
      expect(apiData.duration).toBe(5);
      expect(apiData.typeLabel).toBe('Congés payés');
      expect(apiData.statusLabel).toBe('En attente');
      expect(apiData.isPending).toBe(true);
      expect(apiData.isApproved).toBe(false);
    });
  });
});