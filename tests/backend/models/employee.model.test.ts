/**
 * Tests pour le modèle Employee
 */

import { EmployeeModel } from '../../../backend/functions/src/models/employee.model';
import { Employee, LeaveType, DEFAULT_LEAVE_BALANCES } from '@attendance-x/shared';

describe('EmployeeModel', () => {
  const validEmployeeData: Partial<Employee> = {
    userId: 'user123',
    employeeId: 'EMP001',
    organizationId: 'org123',
    position: 'Software Developer',
    hireDate: new Date('2023-01-15'),
    createdBy: 'admin123'
  };

  describe('Constructor', () => {
    it('should create employee with default values', () => {
      const employee = new EmployeeModel(validEmployeeData);
      
      expect(employee.userId).toBe('user123');
      expect(employee.employeeId).toBe('EMP001');
      expect(employee.isActive).toBe(true);
      expect(employee.requiresGeolocation).toBe(false);
      expect(employee.locationRadius).toBe(100);
      expect(employee.leaveBalances).toEqual(DEFAULT_LEAVE_BALANCES);
    });

    it('should create employee with custom leave balances', () => {
      const customBalances = {
        [LeaveType.VACATION]: 30,
        [LeaveType.SICK_LEAVE]: 15
      };

      const employee = new EmployeeModel({
        ...validEmployeeData,
        leaveBalances: customBalances
      });

      expect(employee.leaveBalances[LeaveType.VACATION]).toBe(30);
      expect(employee.leaveBalances[LeaveType.SICK_LEAVE]).toBe(15);
    });
  });

  describe('Validation', () => {
    it('should validate successfully with valid data', async () => {
      const employee = new EmployeeModel(validEmployeeData);
      await expect(employee.validate()).resolves.toBe(true);
    });

    it('should throw error for missing required fields', async () => {
      const employee = new EmployeeModel({
        userId: 'user123'
        // Missing required fields
      });

      await expect(employee.validate()).rejects.toThrow('Missing required fields');
    });

    it('should throw error for invalid email', async () => {
      const employee = new EmployeeModel({
        ...validEmployeeData,
        workEmail: 'invalid-email'
      });

      await expect(employee.validate()).rejects.toThrow('Invalid work email format');
    });

    it('should throw error for invalid phone', async () => {
      const employee = new EmployeeModel({
        ...validEmployeeData,
        workPhone: '123'
      });

      await expect(employee.validate()).rejects.toThrow('Invalid work phone format');
    });

    it('should throw error for future hire date', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const employee = new EmployeeModel({
        ...validEmployeeData,
        hireDate: futureDate
      });

      await expect(employee.validate()).rejects.toThrow('Hire date cannot be in the future');
    });

    it('should throw error for invalid location radius', async () => {
      const employee = new EmployeeModel({
        ...validEmployeeData,
        locationRadius: 2000 // Too large
      });

      await expect(employee.validate()).rejects.toThrow('Location radius must be between 1 and 1000 meters');
    });

    it('should throw error for negative leave balance', async () => {
      const employee = new EmployeeModel({
        ...validEmployeeData,
        leaveBalances: {
          ...DEFAULT_LEAVE_BALANCES,
          [LeaveType.VACATION]: -5
        }
      });

      await expect(employee.validate()).rejects.toThrow('Invalid leave balance');
    });

    it('should throw error for invalid coordinates', async () => {
      const employee = new EmployeeModel({
        ...validEmployeeData,
        allowedLocations: [
          { latitude: 200, longitude: 0 } // Invalid latitude
        ]
      });

      await expect(employee.validate()).rejects.toThrow('Invalid latitude');
    });
  });

  describe('Leave Balance Management', () => {
    let employee: EmployeeModel;

    beforeEach(() => {
      employee = new EmployeeModel(validEmployeeData);
    });

    it('should get leave balance correctly', () => {
      expect(employee.getLeaveBalance(LeaveType.VACATION)).toBe(DEFAULT_LEAVE_BALANCES[LeaveType.VACATION]);
    });

    it('should update leave balance correctly', () => {
      const initialBalance = employee.getLeaveBalance(LeaveType.VACATION);
      employee.updateLeaveBalance(LeaveType.VACATION, 5);
      
      expect(employee.getLeaveBalance(LeaveType.VACATION)).toBe(initialBalance + 5);
    });

    it('should deduct leave balance correctly', () => {
      const initialBalance = employee.getLeaveBalance(LeaveType.VACATION);
      employee.deductLeaveBalance(LeaveType.VACATION, 3);
      
      expect(employee.getLeaveBalance(LeaveType.VACATION)).toBe(initialBalance - 3);
    });

    it('should add leave balance correctly', () => {
      const initialBalance = employee.getLeaveBalance(LeaveType.VACATION);
      employee.addLeaveBalance(LeaveType.VACATION, 2);
      
      expect(employee.getLeaveBalance(LeaveType.VACATION)).toBe(initialBalance + 2);
    });

    it('should throw error when deducting more than available balance', () => {
      const currentBalance = employee.getLeaveBalance(LeaveType.VACATION);
      
      expect(() => {
        employee.deductLeaveBalance(LeaveType.VACATION, currentBalance + 1);
      }).toThrow('Insufficient leave balance');
    });

    it('should reset leave balances correctly', () => {
      const newBalances = {
        [LeaveType.VACATION]: 30,
        [LeaveType.SICK_LEAVE]: 15
      };

      employee.resetLeaveBalances(newBalances);
      
      expect(employee.getLeaveBalance(LeaveType.VACATION)).toBe(30);
      expect(employee.getLeaveBalance(LeaveType.SICK_LEAVE)).toBe(15);
      expect(employee.getLeaveBalance(LeaveType.PERSONAL)).toBe(DEFAULT_LEAVE_BALANCES[LeaveType.PERSONAL]);
    });
  });

  describe('Work Schedule Management', () => {
    let employee: EmployeeModel;

    beforeEach(() => {
      employee = new EmployeeModel(validEmployeeData);
    });

    it('should assign work schedule correctly', () => {
      const scheduleId = 'schedule123';
      employee.assignWorkSchedule(scheduleId);
      
      expect(employee.workScheduleId).toBe(scheduleId);
    });

    it('should remove work schedule correctly', () => {
      employee.assignWorkSchedule('schedule123');
      employee.removeWorkSchedule();
      
      expect(employee.workScheduleId).toBeUndefined();
    });
  });

  describe('Geolocation Management', () => {
    let employee: EmployeeModel;

    beforeEach(() => {
      employee = new EmployeeModel(validEmployeeData);
    });

    it('should enable geolocation correctly', () => {
      employee.enableGeolocation(200);
      
      expect(employee.requiresGeolocation).toBe(true);
      expect(employee.locationRadius).toBe(200);
    });

    it('should disable geolocation correctly', () => {
      employee.enableGeolocation();
      employee.disableGeolocation();
      
      expect(employee.requiresGeolocation).toBe(false);
    });

    it('should update location settings correctly', () => {
      const settings = {
        requiresGeolocation: true,
        locationRadius: 150,
        allowedLocations: [
          { latitude: 48.8566, longitude: 2.3522 }
        ]
      };

      employee.updateLocationSettings(settings);
      
      expect(employee.requiresGeolocation).toBe(true);
      expect(employee.locationRadius).toBe(150);
      expect(employee.allowedLocations).toHaveLength(1);
    });
  });

  describe('Status Management', () => {
    let employee: EmployeeModel;

    beforeEach(() => {
      employee = new EmployeeModel(validEmployeeData);
    });

    it('should activate employee correctly', () => {
      employee.deactivate();
      employee.activate();
      
      expect(employee.isActive).toBe(true);
    });

    it('should deactivate employee correctly', () => {
      employee.deactivate();
      
      expect(employee.isActive).toBe(false);
    });
  });

  describe('Contact Information', () => {
    let employee: EmployeeModel;

    beforeEach(() => {
      employee = new EmployeeModel(validEmployeeData);
    });

    it('should update contact info correctly', () => {
      const workEmail = 'john.doe@company.com';
      const workPhone = '+33123456789';

      employee.updateContactInfo(workEmail, workPhone);
      
      expect(employee.workEmail).toBe(workEmail);
      expect(employee.workPhone).toBe(workPhone);
    });

    it('should throw error for invalid email', () => {
      expect(() => {
        employee.updateContactInfo('invalid-email');
      }).toThrow('Invalid work email format');
    });

    it('should throw error for invalid phone', () => {
      expect(() => {
        employee.updateContactInfo(undefined, '123');
      }).toThrow('Invalid work phone format');
    });
  });

  describe('Utility Methods', () => {
    let employee: EmployeeModel;

    beforeEach(() => {
      employee = new EmployeeModel({
        ...validEmployeeData,
        hireDate: new Date('2020-01-01')
      });
    });

    it('should calculate working years correctly', () => {
      const workingYears = employee.getWorkingYears();
      expect(workingYears).toBeGreaterThanOrEqual(3);
    });

    it('should check if can take leave correctly', () => {
      const canTake = employee.canTakeLeave(LeaveType.VACATION, 10);
      expect(canTake).toBe(true);

      const cannotTake = employee.canTakeLeave(LeaveType.VACATION, 100);
      expect(cannotTake).toBe(false);
    });

    it('should get full info correctly', () => {
      const info = employee.getFullInfo();
      
      expect(info.employee).toBeDefined();
      expect(info.totalLeaveBalance).toBeGreaterThan(0);
      expect(info.activeLeaveTypes).toContain(LeaveType.VACATION);
    });
  });

  describe('Firestore Conversion', () => {
    it('should convert to Firestore format correctly', () => {
      const employee = new EmployeeModel(validEmployeeData);
      const firestoreData = employee.toFirestore();
      
      expect(firestoreData.userId).toBe('user123');
      expect(firestoreData.employeeId).toBe('EMP001');
      expect(firestoreData.isActive).toBe(true);
      expect(firestoreData.leaveBalances).toBeDefined();
    });

    it('should convert to API format correctly', () => {
      const employee = new EmployeeModel({
        ...validEmployeeData,
        hireDate: new Date('2020-01-01')
      });
      const apiData = employee.toAPI();
      
      expect(apiData.workingYears).toBeDefined();
      expect(apiData.totalLeaveBalance).toBeDefined();
      expect(apiData.auditLog).toBeUndefined(); // Should be excluded from API
    });
  });
});