/**
 * Tests pour le modèle WorkSchedule
 */

import { WorkScheduleModel } from '../../../backend/functions/src/models/work-schedule.model';
import { WorkSchedule, ScheduleType, WorkDayType, DaySchedule } from '@attendance-x/shared';

describe('WorkScheduleModel', () => {
  const validScheduleData: Partial<WorkSchedule> = {
    name: 'Standard Schedule',
    organizationId: 'org123',
    type: ScheduleType.FIXED,
    effectiveFrom: new Date('2023-01-01'),
    createdBy: 'admin123'
  };

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

  describe('Constructor', () => {
    it('should create work schedule with default values', () => {
      const schedule = new WorkScheduleModel(validScheduleData);
      
      expect(schedule.name).toBe('Standard Schedule');
      expect(schedule.organizationId).toBe('org123');
      expect(schedule.type).toBe(ScheduleType.FIXED);
      expect(schedule.isActive).toBe(true);
      expect(schedule.defaultBreakDuration).toBe(60);
      expect(schedule.maxOvertimeHours).toBe(4);
    });

    it('should create work schedule with custom values', () => {
      const customData = {
        ...validScheduleData,
        defaultBreakDuration: 45,
        maxOvertimeHours: 6,
        gracePeriodsMinutes: {
          lateArrival: 10,
          earlyDeparture: 10
        }
      };

      const schedule = new WorkScheduleModel(customData);
      
      expect(schedule.defaultBreakDuration).toBe(45);
      expect(schedule.maxOvertimeHours).toBe(6);
      expect(schedule.gracePeriodsMinutes.lateArrival).toBe(10);
    });
  });

  describe('Validation', () => {
    it('should validate successfully with valid data', async () => {
      const schedule = new WorkScheduleModel({
        ...validScheduleData,
        weeklySchedule: {
          1: mondaySchedule, // Monday
          6: weekendSchedule // Saturday
        }
      });
      
      await expect(schedule.validate()).resolves.toBe(true);
    });

    it('should throw error for missing required fields', async () => {
      const schedule = new WorkScheduleModel({
        name: 'Test Schedule'
        // Missing required fields
      });

      await expect(schedule.validate()).rejects.toThrow('Missing required fields');
    });

    it('should throw error for empty name', async () => {
      const schedule = new WorkScheduleModel({
        ...validScheduleData,
        name: ''
      });

      await expect(schedule.validate()).rejects.toThrow('Schedule name is required');
    });

    it('should throw error for name too long', async () => {
      const schedule = new WorkScheduleModel({
        ...validScheduleData,
        name: 'A'.repeat(101) // Too long
      });

      await expect(schedule.validate()).rejects.toThrow('Schedule name must be 100 characters or less');
    });

    it('should throw error for invalid schedule type', async () => {
      const schedule = new WorkScheduleModel({
        ...validScheduleData,
        type: 'invalid_type' as ScheduleType
      });

      await expect(schedule.validate()).rejects.toThrow('Invalid schedule type');
    });

    it('should throw error for no working days', async () => {
      const schedule = new WorkScheduleModel({
        ...validScheduleData,
        weeklySchedule: {
          0: weekendSchedule,
          6: weekendSchedule
        }
      });

      await expect(schedule.validate()).rejects.toThrow('Schedule must have at least one working day');
    });
  });

  describe('Day Schedule Management', () => {
    let schedule: WorkScheduleModel;

    beforeEach(() => {
      schedule = new WorkScheduleModel(validScheduleData);
    });

    it('should set day schedule correctly', () => {
      schedule.setDaySchedule(1, mondaySchedule);
      
      const daySchedule = schedule.getDaySchedule(1);
      expect(daySchedule).toEqual(mondaySchedule);
    });

    it('should throw error for invalid day of week', () => {
      expect(() => {
        schedule.setDaySchedule(7, mondaySchedule); // Invalid day
      }).toThrow('Day of week must be between 0 (Sunday) and 6 (Saturday)');
    });

    it('should update day schedule correctly', () => {
      schedule.setDaySchedule(1, mondaySchedule);
      schedule.updateDaySchedule(1, { startTime: '08:00' });
      
      const daySchedule = schedule.getDaySchedule(1);
      expect(daySchedule?.startTime).toBe('08:00');
      expect(daySchedule?.endTime).toBe('17:00'); // Should remain unchanged
    });

    it('should throw error when updating non-existent day schedule', () => {
      expect(() => {
        schedule.updateDaySchedule(1, { startTime: '08:00' });
      }).toThrow('No schedule found for day 1');
    });

    it('should remove day schedule correctly', () => {
      schedule.setDaySchedule(1, mondaySchedule);
      schedule.removeDaySchedule(1);
      
      const daySchedule = schedule.getDaySchedule(1);
      expect(daySchedule).toBeUndefined();
    });
  });

  describe('Calculations', () => {
    let schedule: WorkScheduleModel;

    beforeEach(() => {
      schedule = new WorkScheduleModel({
        ...validScheduleData,
        weeklySchedule: {
          1: mondaySchedule, // Monday: 7 hours (9-17 with 1h break)
          2: mondaySchedule, // Tuesday: 7 hours
          3: mondaySchedule, // Wednesday: 7 hours
          4: mondaySchedule, // Thursday: 7 hours
          5: mondaySchedule, // Friday: 7 hours
          0: weekendSchedule, // Sunday: non-working
          6: weekendSchedule  // Saturday: non-working
        }
      });
    });

    it('should get working days correctly', () => {
      const workingDays = schedule.getWorkingDays();
      expect(workingDays).toEqual([1, 2, 3, 4, 5]); // Monday to Friday
    });

    it('should calculate total weekly hours correctly', () => {
      const totalHours = schedule.getTotalWeeklyHours();
      expect(totalHours).toBe(35); // 5 days × 7 hours (8h - 1h break)
    });

    it('should calculate daily work hours correctly', () => {
      const mondayHours = schedule.getDailyWorkHours(1);
      expect(mondayHours).toBe(7); // 8 hours minus 1 hour break
    });

    it('should return 0 hours for non-working days', () => {
      const sundayHours = schedule.getDailyWorkHours(0);
      expect(sundayHours).toBe(0);
    });
  });

  describe('Effective Period Management', () => {
    let schedule: WorkScheduleModel;

    beforeEach(() => {
      schedule = new WorkScheduleModel(validScheduleData);
    });

    it('should activate schedule correctly', () => {
      schedule.deactivate();
      schedule.activate();
      
      expect(schedule.isActive).toBe(true);
    });

    it('should deactivate schedule correctly', () => {
      schedule.deactivate();
      
      expect(schedule.isActive).toBe(false);
    });

    it('should set effective period correctly', () => {
      const from = new Date('2023-01-01');
      const to = new Date('2023-12-31');
      
      schedule.setEffectivePeriod(from, to);
      
      expect(schedule.effectiveFrom).toEqual(from);
      expect(schedule.effectiveTo).toEqual(to);
    });

    it('should throw error for invalid effective period', () => {
      const from = new Date('2023-12-31');
      const to = new Date('2023-01-01'); // Before start
      
      expect(() => {
        schedule.setEffectivePeriod(from, to);
      }).toThrow('Effective end date must be after start date');
    });

    it('should check if effective on date correctly', () => {
      schedule.setEffectivePeriod(
        new Date('2023-01-01'),
        new Date('2023-12-31')
      );
      
      expect(schedule.isEffectiveOn(new Date('2023-06-15'))).toBe(true);
      expect(schedule.isEffectiveOn(new Date('2022-12-31'))).toBe(false);
      expect(schedule.isEffectiveOn(new Date('2024-01-01'))).toBe(false);
    });

    it('should not be effective when inactive', () => {
      schedule.setEffectivePeriod(
        new Date('2023-01-01'),
        new Date('2023-12-31')
      );
      schedule.deactivate();
      
      expect(schedule.isEffectiveOn(new Date('2023-06-15'))).toBe(false);
    });
  });

  describe('Configuration Updates', () => {
    let schedule: WorkScheduleModel;

    beforeEach(() => {
      schedule = new WorkScheduleModel(validScheduleData);
    });

    it('should update break settings correctly', () => {
      schedule.updateBreakSettings(45, 6);
      
      expect(schedule.defaultBreakDuration).toBe(45);
      expect(schedule.maxOvertimeHours).toBe(6);
    });

    it('should update grace periods correctly', () => {
      schedule.updateGracePeriods(10, 20);
      
      expect(schedule.gracePeriodsMinutes.lateArrival).toBe(10);
      expect(schedule.gracePeriodsMinutes.earlyDeparture).toBe(20);
    });
  });

  describe('Conflict Detection', () => {
    let schedule1: WorkScheduleModel;
    let schedule2: WorkScheduleModel;

    beforeEach(() => {
      schedule1 = new WorkScheduleModel({
        ...validScheduleData,
        effectiveFrom: new Date('2023-01-01'),
        effectiveTo: new Date('2023-06-30')
      });

      schedule2 = new WorkScheduleModel({
        ...validScheduleData,
        effectiveFrom: new Date('2023-04-01'),
        effectiveTo: new Date('2023-09-30')
      });
    });

    it('should detect overlapping schedules', () => {
      const hasConflict = schedule1.hasConflictWith(schedule2);
      expect(hasConflict).toBe(true);
    });

    it('should not detect conflict for non-overlapping schedules', () => {
      schedule2.setEffectivePeriod(
        new Date('2023-07-01'),
        new Date('2023-12-31')
      );
      
      const hasConflict = schedule1.hasConflictWith(schedule2);
      expect(hasConflict).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    let schedule: WorkScheduleModel;

    beforeEach(() => {
      schedule = new WorkScheduleModel({
        ...validScheduleData,
        weeklySchedule: {
          1: mondaySchedule
        },
        effectiveFrom: new Date('2023-01-01'),
        effectiveTo: new Date('2023-12-31')
      });
    });

    it('should get schedule for date correctly', () => {
      const monday = new Date('2023-06-05'); // A Monday
      const daySchedule = schedule.getScheduleForDate(monday);
      
      expect(daySchedule).toEqual(mondaySchedule);
    });

    it('should return null for date outside effective period', () => {
      const futureDate = new Date('2024-01-01');
      const daySchedule = schedule.getScheduleForDate(futureDate);
      
      expect(daySchedule).toBeNull();
    });

    it('should check if working day correctly', () => {
      const monday = new Date('2023-06-05'); // A Monday
      const sunday = new Date('2023-06-04'); // A Sunday
      
      expect(schedule.isWorkingDay(monday)).toBe(true);
      expect(schedule.isWorkingDay(sunday)).toBe(false);
    });

    it('should get expected work hours correctly', () => {
      const monday = new Date('2023-06-05'); // A Monday
      const expectedHours = schedule.getExpectedWorkHours(monday);
      
      expect(expectedHours).toBe(7); // 8 hours minus 1 hour break
    });
  });

  describe('Cloning and Templates', () => {
    let schedule: WorkScheduleModel;

    beforeEach(() => {
      schedule = new WorkScheduleModel({
        ...validScheduleData,
        weeklySchedule: {
          1: mondaySchedule
        }
      });
    });

    it('should clone schedule correctly', () => {
      const cloned = schedule.clone('Cloned Schedule', 'org456');
      
      expect(cloned.name).toBe('Cloned Schedule');
      expect(cloned.organizationId).toBe('org456');
      expect(cloned.type).toBe(schedule.type);
      expect(cloned.weeklySchedule).toEqual(schedule.weeklySchedule);
    });

    it('should create template correctly', () => {
      const template = schedule.createTemplate();
      
      expect(template.name).toBe('Standard Schedule (Template)');
      expect(template.type).toBe(schedule.type);
      expect(template.weeklySchedule).toEqual(schedule.weeklySchedule);
    });
  });

  describe('Firestore Conversion', () => {
    it('should convert to Firestore format correctly', () => {
      const schedule = new WorkScheduleModel({
        ...validScheduleData,
        weeklySchedule: {
          1: mondaySchedule
        }
      });
      
      const firestoreData = schedule.toFirestore();
      
      expect(firestoreData.name).toBe('Standard Schedule');
      expect(firestoreData.organizationId).toBe('org123');
      expect(firestoreData.type).toBe(ScheduleType.FIXED);
      expect(firestoreData.weeklySchedule).toBeDefined();
      expect(firestoreData.isActive).toBe(true);
    });

    it('should convert to API format correctly', () => {
      const schedule = new WorkScheduleModel({
        ...validScheduleData,
        weeklySchedule: {
          1: mondaySchedule,
          2: mondaySchedule
        }
      });
      
      const apiData = schedule.toAPI();
      
      expect(apiData.workingDays).toEqual([1, 2]);
      expect(apiData.totalWeeklyHours).toBeGreaterThan(0);
      expect(apiData.isCurrentlyEffective).toBeDefined();
    });
  });
});