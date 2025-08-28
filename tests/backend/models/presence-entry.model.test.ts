/**
 * Tests pour le modèle PresenceEntry
 */

import { PresenceEntryModel } from '../../../backend/functions/src/models/presence-entry.model';
import { PresenceEntry, PresenceStatus, GeoLocation } from '@attendance-x/shared';

describe('PresenceEntryModel', () => {
  const validPresenceData: Partial<PresenceEntry> = {
    employeeId: 'emp123',
    organizationId: 'org123',
    date: '2023-12-01'
  };

  const mockLocation: GeoLocation = {
    latitude: 48.8566,
    longitude: 2.3522,
    accuracy: 10
  };

  describe('Constructor', () => {
    it('should create presence entry with default values', () => {
      const entry = new PresenceEntryModel(validPresenceData);
      
      expect(entry.employeeId).toBe('emp123');
      expect(entry.organizationId).toBe('org123');
      expect(entry.date).toBe('2023-12-01');
      expect(entry.status).toBe(PresenceStatus.ABSENT);
      expect(entry.isValidated).toBe(false);
      expect(entry.breakEntries).toEqual([]);
      expect(entry.totalBreakTime).toBe(0);
      expect(entry.actualWorkHours).toBe(0);
      expect(entry.overtimeHours).toBe(0);
    });

    it('should create presence entry with custom values', () => {
      const customData = {
        ...validPresenceData,
        status: PresenceStatus.PRESENT,
        actualWorkHours: 8,
        overtimeHours: 2
      };

      const entry = new PresenceEntryModel(customData);
      
      expect(entry.status).toBe(PresenceStatus.PRESENT);
      expect(entry.actualWorkHours).toBe(8);
      expect(entry.overtimeHours).toBe(2);
    });
  });

  describe('Validation', () => {
    it('should validate successfully with valid data', async () => {
      const entry = new PresenceEntryModel(validPresenceData);
      await expect(entry.validate()).resolves.toBe(true);
    });

    it('should throw error for missing required fields', async () => {
      const entry = new PresenceEntryModel({
        employeeId: 'emp123'
        // Missing required fields
      });

      await expect(entry.validate()).rejects.toThrow('Missing required fields');
    });

    it('should throw error for invalid date format', async () => {
      const entry = new PresenceEntryModel({
        ...validPresenceData,
        date: '01/12/2023' // Wrong format
      });

      await expect(entry.validate()).rejects.toThrow('Date must be in YYYY-MM-DD format');
    });

    it('should throw error for invalid status', async () => {
      const entry = new PresenceEntryModel({
        ...validPresenceData,
        status: 'invalid_status' as PresenceStatus
      });

      await expect(entry.validate()).rejects.toThrow('Invalid presence status');
    });

    it('should throw error when clock out is before clock in', async () => {
      const clockInTime = new Date('2023-12-01T09:00:00Z');
      const clockOutTime = new Date('2023-12-01T08:00:00Z'); // Before clock in

      const entry = new PresenceEntryModel({
        ...validPresenceData,
        clockInTime,
        clockOutTime
      });

      await expect(entry.validate()).rejects.toThrow('Clock out time must be after clock in time');
    });

    it('should throw error for negative work hours', async () => {
      const entry = new PresenceEntryModel({
        ...validPresenceData,
        actualWorkHours: -2
      });

      await expect(entry.validate()).rejects.toThrow('Actual work hours cannot be negative');
    });

    it('should throw error for invalid coordinates', async () => {
      const entry = new PresenceEntryModel({
        ...validPresenceData,
        clockInLocation: {
          latitude: 200, // Invalid
          longitude: 0
        }
      });

      await expect(entry.validate()).rejects.toThrow('Invalid latitude');
    });
  });

  describe('Clock In/Out Operations', () => {
    let entry: PresenceEntryModel;

    beforeEach(() => {
      entry = new PresenceEntryModel(validPresenceData);
    });

    it('should clock in successfully', () => {
      entry.clockIn(mockLocation, 'Starting work');
      
      expect(entry.clockInTime).toBeDefined();
      expect(entry.status).toBe(PresenceStatus.PRESENT);
    });

    it('should throw error when already clocked in', () => {
      entry.clockIn();
      
      expect(() => {
        entry.clockIn();
      }).toThrow('Employee is already clocked in');
    });

    it('should clock out successfully', () => {
      entry.clockIn(mockLocation);
      entry.clockOut(mockLocation, 'End of work');
      
      expect(entry.clockOutTime).toBeDefined();
    });

    it('should throw error when clocking out without clocking in', () => {
      expect(() => {
        entry.clockOut();
      }).toThrow('Employee must clock in first');
    });

    it('should throw error when already clocked out', () => {
      entry.clockIn();
      entry.clockOut();
      
      expect(() => {
        entry.clockOut();
      }).toThrow('Employee is already clocked out');
    });

    it('should calculate work hours correctly', () => {
      const clockInTime = new Date('2023-12-01T09:00:00Z');
      const clockOutTime = new Date('2023-12-01T17:00:00Z'); // 8 hours later

      const entryData = entry.getData();
      entryData.clockInTime = clockInTime;
      entryData.clockOutTime = clockOutTime;
      
      expect(entry.getDuration()).toBe(8);
    });
  });

  describe('Break Management', () => {
    let entry: PresenceEntryModel;

    beforeEach(() => {
      entry = new PresenceEntryModel(validPresenceData);
      entry.clockIn(); // Must be clocked in to take breaks
    });

    it('should start break successfully', () => {
      const breakId = entry.startBreak('lunch', mockLocation);
      
      expect(breakId).toBeDefined();
      expect(entry.breakEntries).toHaveLength(1);
      expect(entry.breakEntries[0].type).toBe('lunch');
      expect(entry.status).toBe(PresenceStatus.ON_BREAK);
    });

    it('should throw error when starting break without being clocked in', () => {
      const entry2 = new PresenceEntryModel(validPresenceData);
      
      expect(() => {
        entry2.startBreak('lunch');
      }).toThrow('Employee must be clocked in to start a break');
    });

    it('should throw error when starting break while already on break', () => {
      entry.startBreak('lunch');
      
      expect(() => {
        entry.startBreak('coffee');
      }).toThrow('There is already an active break');
    });

    it('should end break successfully', () => {
      const breakId = entry.startBreak('lunch');
      
      // Simulate some time passing
      entry.endBreak(breakId, mockLocation);
      
      expect(entry.breakEntries[0].endTime).toBeDefined();
      expect(entry.status).toBe(PresenceStatus.PRESENT);
    });

    it('should throw error when ending non-existent break', () => {
      expect(() => {
        entry.endBreak('nonexistent');
      }).toThrow('Break not found');
    });

    it('should throw error when ending already ended break', () => {
      const breakId = entry.startBreak('lunch');
      entry.endBreak(breakId);
      
      expect(() => {
        entry.endBreak(breakId);
      }).toThrow('Break is already ended');
    });
  });

  describe('Status Calculation', () => {
    let entry: PresenceEntryModel;

    beforeEach(() => {
      entry = new PresenceEntryModel(validPresenceData);
    });

    it('should set status to ABSENT when not clocked in', () => {
      expect(entry.status).toBe(PresenceStatus.ABSENT);
    });

    it('should set status to ON_BREAK when on active break', () => {
      entry.clockIn();
      entry.startBreak('lunch');
      
      expect(entry.status).toBe(PresenceStatus.ON_BREAK);
    });
  });

  describe('Location Validation', () => {
    let entry: PresenceEntryModel;

    beforeEach(() => {
      entry = new PresenceEntryModel(validPresenceData);
    });

    it('should validate location within allowed radius', () => {
      const currentLocation = { latitude: 48.8566, longitude: 2.3522 };
      const allowedLocation = { latitude: 48.8567, longitude: 2.3523 }; // Very close
      const allowedLocations = [allowedLocation];
      
      const isValid = entry.validateLocation(currentLocation, allowedLocations, 100);
      expect(isValid).toBe(true);
    });

    it('should reject location outside allowed radius', () => {
      const currentLocation = { latitude: 48.8566, longitude: 2.3522 };
      const allowedLocation = { latitude: 48.9566, longitude: 2.4522 }; // Far away
      const allowedLocations = [allowedLocation];
      
      const isValid = entry.validateLocation(currentLocation, allowedLocations, 100);
      expect(isValid).toBe(false);
    });

    it('should allow any location when no restrictions', () => {
      const currentLocation = { latitude: 48.8566, longitude: 2.3522 };
      const allowedLocations: GeoLocation[] = [];
      
      const isValid = entry.validateLocation(currentLocation, allowedLocations, 100);
      expect(isValid).toBe(true);
    });
  });

  describe('Validation and Notes', () => {
    let entry: PresenceEntryModel;

    beforeEach(() => {
      entry = new PresenceEntryModel(validPresenceData);
    });

    it('should add manager notes and validate entry', () => {
      const notes = 'Approved by manager';
      const validatedBy = 'manager123';
      
      entry.addManagerNotes(notes, validatedBy);
      
      expect(entry.isValidated).toBe(true);
    });

    it('should remove validation', () => {
      entry.addManagerNotes('Test', 'manager123');
      entry.removeValidation();
      
      expect(entry.isValidated).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    let entry: PresenceEntryModel;

    beforeEach(() => {
      entry = new PresenceEntryModel(validPresenceData);
    });

    it('should calculate duration correctly', () => {
      const clockInTime = new Date('2023-12-01T09:00:00Z');
      const clockOutTime = new Date('2023-12-01T17:00:00Z'); // 8 hours later
      
      const entryData = entry.getData();
      entryData.clockInTime = clockInTime;
      entryData.clockOutTime = clockOutTime;
      
      expect(entry.getDuration()).toBe(8);
    });

    it('should return 0 duration when not fully clocked', () => {
      entry.clockIn();
      // No clock out
      
      expect(entry.getDuration()).toBe(0);
    });

    it('should detect late status correctly', () => {
      expect(entry.isLate()).toBe(false);
    });

    it('should detect early leave correctly', () => {
      expect(entry.isEarlyLeave()).toBe(false);
    });

    it('should detect overtime correctly', () => {
      expect(entry.hasOvertime()).toBe(false);
    });

    it('should get status label correctly', () => {
      expect(entry.getStatusLabel()).toBe('Absent');
    });

    it('should detect clocked status correctly', () => {
      expect(entry.isClocked).toBe(false);
      
      entry.clockIn();
      expect(entry.isClocked).toBe(true);
      
      entry.clockOut();
      expect(entry.isClocked).toBe(false);
    });
  });

  describe('Firestore Conversion', () => {
    it('should convert to Firestore format correctly', () => {
      const entry = new PresenceEntryModel(validPresenceData);
      entry.clockIn(mockLocation, 'Test notes');
      
      const firestoreData = entry.toFirestore();
      
      expect(firestoreData.employeeId).toBe('emp123');
      expect(firestoreData.organizationId).toBe('org123');
      expect(firestoreData.date).toBe('2023-12-01');
      expect(firestoreData.clockInTime).toBeDefined();
    });

    it('should convert to API format correctly', () => {
      const entry = new PresenceEntryModel(validPresenceData);
      entry.clockIn();
      entry.clockOut();
      
      const apiData = entry.toAPI();
      
      expect(apiData).toBeDefined();
      expect(typeof apiData).toBe('object');
    });
  });
});  des
cribe('Anomaly Detection', () => {
    let entry: PresenceEntryModel;

    beforeEach(() => {
      entry = new PresenceEntryModel(validPresenceData);
    });

    it('should detect missed clock in', () => {
      // Entry without clock in but with present status
      entry.update({ status: PresenceStatus.PRESENT });
      
      const anomalies = entry.detectAnomalies();
      expect(anomalies).toContain('missed_clock_in');
    });

    it('should detect missed clock out', () => {
      // Clock in 13 hours ago
      const clockInTime = new Date();
      clockInTime.setHours(clockInTime.getHours() - 13);
      
      entry.update({ 
        clockInTime,
        status: PresenceStatus.PRESENT 
      });
      
      const anomalies = entry.detectAnomalies();
      expect(anomalies).toContain('missed_clock_out');
    });

    it('should detect excessive overtime', () => {
      entry.update({ overtimeHours: 5 });
      
      const anomalies = entry.detectAnomalies();
      expect(anomalies).toContain('excessive_overtime');
    });

    it('should detect excessive break time', () => {
      entry.update({
        breakEntries: [{
          id: 'break1',
          startTime: new Date(),
          endTime: new Date(),
          duration: 150, // 2.5 hours
          type: 'lunch'
        }]
      });
      
      const anomalies = entry.detectAnomalies();
      expect(anomalies).toContain('excessive_break_time');
    });

    it('should detect unusual hours', () => {
      const unusualTime = new Date();
      unusualTime.setHours(3); // 3 AM
      
      entry.update({ clockInTime: unusualTime });
      
      const anomalies = entry.detectAnomalies();
      expect(anomalies).toContain('unusual_hours');
    });

    it('should detect insufficient work hours', () => {
      entry.update({ 
        actualWorkHours: 1.5,
        status: PresenceStatus.PRESENT 
      });
      
      const anomalies = entry.detectAnomalies();
      expect(anomalies).toContain('insufficient_work_hours');
    });
  });

  describe('Advanced Calculations', () => {
    let entry: PresenceEntryModel;

    beforeEach(() => {
      entry = new PresenceEntryModel({
        ...validPresenceData,
        scheduledWorkHours: 8,
        actualWorkHours: 7.5
      });
    });

    it('should calculate efficiency correctly', () => {
      const efficiency = entry.calculateEfficiency();
      expect(efficiency).toBe(7.5 / 8); // 93.75%
    });

    it('should return 100% efficiency when no scheduled hours', () => {
      entry.update({ scheduledWorkHours: 0 });
      const efficiency = entry.calculateEfficiency();
      expect(efficiency).toBe(1);
    });

    it('should cap efficiency at 200%', () => {
      entry.update({ actualWorkHours: 20 });
      const efficiency = entry.calculateEfficiency();
      expect(efficiency).toBe(2);
    });

    it('should get working time breakdown', () => {
      const clockInTime = new Date('2023-12-01T09:00:00Z');
      const clockOutTime = new Date('2023-12-01T17:30:00Z');
      
      entry.update({
        clockInTime,
        clockOutTime,
        actualWorkHours: 7.5,
        totalBreakTime: 60 // 1 hour
      });
      
      const breakdown = entry.getWorkingTimeBreakdown();
      
      expect(breakdown.totalTime).toBe(8.5); // 8.5 hours total
      expect(breakdown.workTime).toBe(7.5);
      expect(breakdown.breakTime).toBe(1); // 60 minutes = 1 hour
      expect(breakdown.efficiency).toBeDefined();
    });
  });

  describe('Schedule Variance', () => {
    let entry: PresenceEntryModel;

    beforeEach(() => {
      entry = new PresenceEntryModel(validPresenceData);
    });

    it('should calculate schedule variance correctly', () => {
      const scheduledStart = new Date('2023-12-01T09:00:00Z');
      const actualStart = new Date('2023-12-01T09:15:00Z'); // 15 minutes late
      const scheduledEnd = new Date('2023-12-01T17:00:00Z');
      const actualEnd = new Date('2023-12-01T17:30:00Z'); // 30 minutes late
      
      entry.update({
        clockInTime: actualStart,
        clockOutTime: actualEnd,
        scheduledStartTime: scheduledStart,
        scheduledEndTime: scheduledEnd,
        actualWorkHours: 7.5,
        scheduledWorkHours: 8
      });
      
      const variance = entry.getScheduleVariance();
      
      expect(variance.startVariance).toBe(15); // 15 minutes late
      expect(variance.endVariance).toBe(30); // 30 minutes late
      expect(variance.durationVariance).toBe(-0.5); // 0.5 hours less
    });
  });

  describe('Schedule Validation', () => {
    let entry: PresenceEntryModel;

    beforeEach(() => {
      entry = new PresenceEntryModel(validPresenceData);
    });

    it('should validate against work schedule', () => {
      const scheduledStart = new Date('2023-12-01T09:00:00Z');
      const actualStart = new Date('2023-12-01T09:20:00Z'); // 20 minutes late
      
      entry.update({
        clockInTime: actualStart,
        scheduledStartTime: scheduledStart
      });
      
      const workSchedule = {
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 60,
        gracePeriodsMinutes: {
          lateArrival: 15,
          earlyDeparture: 15
        }
      };
      
      const validation = entry.validateAgainstSchedule(workSchedule);
      
      expect(validation.isValid).toBe(false);
      expect(validation.violations).toContain('late_arrival');
    });

    it('should pass validation within grace period', () => {
      const scheduledStart = new Date('2023-12-01T09:00:00Z');
      const actualStart = new Date('2023-12-01T09:10:00Z'); // 10 minutes late
      
      entry.update({
        clockInTime: actualStart,
        scheduledStartTime: scheduledStart
      });
      
      const workSchedule = {
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 60,
        gracePeriodsMinutes: {
          lateArrival: 15,
          earlyDeparture: 15
        }
      };
      
      const validation = entry.validateAgainstSchedule(workSchedule);
      
      expect(validation.isValid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });
  });

  describe('Utility Methods', () => {
    let entry: PresenceEntryModel;

    beforeEach(() => {
      entry = new PresenceEntryModel({
        ...validPresenceData,
        date: '2023-12-02' // Saturday
      });
    });

    it('should detect weekend correctly', () => {
      expect(entry.isWeekend()).toBe(true);
    });

    it('should detect weekday correctly', () => {
      entry.update({ date: '2023-12-01' }); // Friday
      expect(entry.isWeekend()).toBe(false);
    });

    it('should get week number correctly', () => {
      const weekNumber = entry.getWeekNumber();
      expect(typeof weekNumber).toBe('number');
      expect(weekNumber).toBeGreaterThan(0);
      expect(weekNumber).toBeLessThanOrEqual(53);
    });

    it('should get month-year string correctly', () => {
      const monthYear = entry.getMonthYear();
      expect(monthYear).toBe('2023-12');
    });
  });