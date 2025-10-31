/**
 * Tests unitaires pour TimeEntryModel
 */

import { TimeEntryModel } from '../../../backend/functions/src/models/time-entry.model';
import { TimeEntry, TimeEntryStatus } from '../../../backend/functions/src/common/types';
import { ValidationError } from '../../../backend/functions/src/models/base.model';

describe('TimeEntryModel', () => {
  const mockTimeEntryData: Partial<TimeEntry> = {
    employeeId: 'emp_123',
    tenantId: 'tenant_123',
    timesheetId: 'timesheet_123',
    date: '2024-01-15',
    duration: 480, // 8 heures
    description: 'Development work on project',
    billable: true,
    hourlyRate: 50,
    createdBy: 'user_123'
  };

  describe('Constructor', () => {
    it('should create a time entry with default values', () => {
      const timeEntry = new TimeEntryModel(mockTimeEntryData);
      
      expect(timeEntry.status).toBe(TimeEntryStatus.DRAFT);
      expect(timeEntry.billable).toBe(true);
      expect(timeEntry.tags).toEqual([]);
      expect(timeEntry.data.metadata?.source).toBe('manual');
    });

    it('should preserve provided values', () => {
      const customData = {
        ...mockTimeEntryData,
        status: TimeEntryStatus.SUBMITTED,
        billable: false,
        tags: ['urgent', 'client-work']
      };

      const timeEntry = new TimeEntryModel(customData);
      
      expect(timeEntry.status).toBe(TimeEntryStatus.SUBMITTED);
      expect(timeEntry.billable).toBe(false);
      expect(timeEntry.tags).toEqual(['urgent', 'client-work']);
    });
  });

  describe('Duration Calculations', () => {
    it('should calculate duration from start and end times', () => {
      const timeEntry = new TimeEntryModel(mockTimeEntryData);
      const startTime = new Date('2024-01-15T09:00:00');
      const endTime = new Date('2024-01-15T17:00:00');
      
      timeEntry.data.startTime = startTime;
      timeEntry.data.endTime = endTime;
      
      const duration = timeEntry.calculateDurationFromTimes();
      expect(duration).toBe(480); // 8 heures = 480 minutes
    });

    it('should throw error if end time is before start time', () => {
      const timeEntry = new TimeEntryModel(mockTimeEntryData);
      const startTime = new Date('2024-01-15T17:00:00');
      const endTime = new Date('2024-01-15T09:00:00');
      
      timeEntry.data.startTime = startTime;
      timeEntry.data.endTime = endTime;
      
      expect(() => timeEntry.calculateDurationFromTimes()).toThrow(ValidationError);
    });

    it('should set duration from times automatically', () => {
      const timeEntry = new TimeEntryModel(mockTimeEntryData);
      const startTime = new Date('2024-01-15T09:00:00');
      const endTime = new Date('2024-01-15T13:30:00');
      
      timeEntry.data.startTime = startTime;
      timeEntry.data.endTime = endTime;
      timeEntry.setDurationFromTimes();
      
      expect(timeEntry.duration).toBe(270); // 4.5 heures = 270 minutes
    });

    it('should set end time from duration and start time', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        duration: 240 // 4 heures
      });
      
      const startTime = new Date('2024-01-15T09:00:00');
      timeEntry.setTimesFromDuration(startTime);
      
      expect(timeEntry.startTime).toEqual(startTime);
      expect(timeEntry.endTime).toEqual(new Date('2024-01-15T13:00:00'));
    });
  });

  describe('Cost Calculations', () => {
    it('should calculate total cost correctly', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        duration: 480, // 8 heures
        hourlyRate: 50,
        billable: true
      });
      
      const cost = timeEntry.calculateTotalCost();
      expect(cost).toBe(400); // 8 * 50 = 400
    });

    it('should return 0 cost for non-billable entries', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        duration: 480,
        hourlyRate: 50,
        billable: false
      });
      
      const cost = timeEntry.calculateTotalCost();
      expect(cost).toBe(0);
    });

    it('should return 0 cost when no hourly rate is set', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        duration: 480,
        billable: true
      });
      
      const cost = timeEntry.calculateTotalCost();
      expect(cost).toBe(0);
    });

    it('should update total cost when hourly rate changes', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        duration: 480,
        billable: true
      });
      
      timeEntry.setHourlyRate(60);
      expect(timeEntry.totalCost).toBe(480); // 8 * 60 = 480
    });
  });

  describe('Status Management', () => {
    it('should submit draft entry', () => {
      const timeEntry = new TimeEntryModel(mockTimeEntryData);
      
      timeEntry.submit();
      expect(timeEntry.status).toBe(TimeEntryStatus.SUBMITTED);
    });

    it('should not submit non-draft entry', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        status: TimeEntryStatus.APPROVED
      });
      
      expect(() => timeEntry.submit()).toThrow(ValidationError);
    });

    it('should approve submitted entry', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        status: TimeEntryStatus.SUBMITTED
      });
      
      timeEntry.approve('manager_123');
      expect(timeEntry.status).toBe(TimeEntryStatus.APPROVED);
      expect(timeEntry.data.updatedBy).toBe('manager_123');
    });

    it('should reject submitted entry', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        status: TimeEntryStatus.SUBMITTED
      });
      
      timeEntry.reject('manager_123', 'Insufficient details');
      expect(timeEntry.status).toBe(TimeEntryStatus.REJECTED);
      expect(timeEntry.description).toContain('Rejection reason: Insufficient details');
    });

    it('should return rejected entry to draft', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        status: TimeEntryStatus.REJECTED
      });
      
      timeEntry.returnToDraft();
      expect(timeEntry.status).toBe(TimeEntryStatus.DRAFT);
    });
  });

  describe('Tag Management', () => {
    it('should add tags correctly', () => {
      const timeEntry = new TimeEntryModel(mockTimeEntryData);
      
      timeEntry.addTag('urgent');
      timeEntry.addTag('CLIENT-WORK');
      
      expect(timeEntry.tags).toEqual(['urgent', 'client-work']);
    });

    it('should not add duplicate tags', () => {
      const timeEntry = new TimeEntryModel(mockTimeEntryData);
      
      timeEntry.addTag('urgent');
      timeEntry.addTag('URGENT');
      
      expect(timeEntry.tags).toEqual(['urgent']);
    });

    it('should remove tags correctly', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        tags: ['urgent', 'client-work']
      });
      
      timeEntry.removeTag('urgent');
      expect(timeEntry.tags).toEqual(['client-work']);
    });

    it('should set multiple tags at once', () => {
      const timeEntry = new TimeEntryModel(mockTimeEntryData);
      
      timeEntry.setTags(['urgent', 'CLIENT-WORK', '  important  ']);
      expect(timeEntry.tags).toEqual(['urgent', 'client-work', 'important']);
    });
  });

  describe('Overlap Detection', () => {
    it('should detect overlapping time entries', () => {
      const timeEntry1 = new TimeEntryModel({
        ...mockTimeEntryData,
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T12:00:00')
      });

      const otherEntry: TimeEntry = {
        ...mockTimeEntryData,
        id: 'other_entry',
        startTime: new Date('2024-01-15T11:00:00'),
        endTime: new Date('2024-01-15T15:00:00')
      } as TimeEntry;

      expect(timeEntry1.checkOverlapWith(otherEntry)).toBe(true);
    });

    it('should not detect overlap for different dates', () => {
      const timeEntry1 = new TimeEntryModel({
        ...mockTimeEntryData,
        date: '2024-01-15',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T12:00:00')
      });

      const otherEntry: TimeEntry = {
        ...mockTimeEntryData,
        id: 'other_entry',
        date: '2024-01-16',
        startTime: new Date('2024-01-16T11:00:00'),
        endTime: new Date('2024-01-16T15:00:00')
      } as TimeEntry;

      expect(timeEntry1.checkOverlapWith(otherEntry)).toBe(false);
    });

    it('should not detect overlap for different employees', () => {
      const timeEntry1 = new TimeEntryModel({
        ...mockTimeEntryData,
        employeeId: 'emp_123',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T12:00:00')
      });

      const otherEntry: TimeEntry = {
        ...mockTimeEntryData,
        id: 'other_entry',
        employeeId: 'emp_456',
        startTime: new Date('2024-01-15T11:00:00'),
        endTime: new Date('2024-01-15T15:00:00')
      } as TimeEntry;

      expect(timeEntry1.checkOverlapWith(otherEntry)).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate a correct time entry', async () => {
      const timeEntry = new TimeEntryModel(mockTimeEntryData);
      
      await expect(timeEntry.validate()).resolves.toBe(true);
    });

    it('should reject invalid date format', async () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        date: '15-01-2024'
      });
      
      await expect(timeEntry.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        date: futureDateStr
      });
      
      await expect(timeEntry.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject zero or negative duration', async () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        duration: 0
      });
      
      await expect(timeEntry.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject excessive duration', async () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        duration: 25 * 60 // 25 heures
      });
      
      await expect(timeEntry.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject empty description', async () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        description: ''
      });
      
      await expect(timeEntry.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject negative hourly rate', async () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        hourlyRate: -10
      });
      
      await expect(timeEntry.validate()).rejects.toThrow(ValidationError);
    });
  });

  describe('Utility Methods', () => {
    it('should format duration correctly', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        duration: 485 // 8h 5m
      });
      
      expect(timeEntry.getDurationFormatted()).toBe('8h 05m');
    });

    it('should convert duration to hours', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        duration: 450 // 7.5 heures
      });
      
      expect(timeEntry.getDurationInHours()).toBe(7.5);
    });

    it('should check if entry is on specific date', () => {
      const timeEntry = new TimeEntryModel(mockTimeEntryData);
      
      expect(timeEntry.isOnDate('2024-01-15')).toBe(true);
      expect(timeEntry.isOnDate('2024-01-16')).toBe(false);
    });

    it('should check editability based on status', () => {
      const draftEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        status: TimeEntryStatus.DRAFT
      });
      
      const approvedEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        status: TimeEntryStatus.APPROVED
      });
      
      expect(draftEntry.isEditable).toBe(true);
      expect(approvedEntry.isEditable).toBe(false);
    });
  });

  describe('Copy and Clone', () => {
    it('should copy entry to different date', () => {
      const originalEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T17:00:00')
      });
      
      const copiedEntry = originalEntry.copyToDate('2024-01-16');
      
      expect(copiedEntry.date).toBe('2024-01-16');
      expect(copiedEntry.status).toBe(TimeEntryStatus.DRAFT);
      expect(copiedEntry.startTime?.getDate()).toBe(16);
      expect(copiedEntry.endTime?.getDate()).toBe(16);
      expect(copiedEntry.startTime?.getHours()).toBe(9);
      expect(copiedEntry.endTime?.getHours()).toBe(17);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect excessive duration', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        duration: 13 * 60 // 13 heures
      });
      
      const anomalies = timeEntry.detectAnomalies();
      expect(anomalies).toContain('excessive_duration');
    });

    it('should detect very short duration', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        duration: 10 // 10 minutes
      });
      
      const anomalies = timeEntry.detectAnomalies();
      expect(anomalies).toContain('very_short_duration');
    });

    it('should detect unusual hours', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        startTime: new Date('2024-01-15T02:00:00')
      });
      
      const anomalies = timeEntry.detectAnomalies();
      expect(anomalies).toContain('unusual_hours');
    });

    it('should detect weekend work', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        date: '2024-01-13' // Samedi
      });
      
      const anomalies = timeEntry.detectAnomalies();
      expect(anomalies).toContain('weekend_work');
    });

    it('should detect short description', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        description: 'Work'
      });
      
      const anomalies = timeEntry.detectAnomalies();
      expect(anomalies).toContain('short_description');
    });
  });

  describe('Firestore Conversion', () => {
    it('should convert to Firestore format correctly', () => {
      const timeEntry = new TimeEntryModel(mockTimeEntryData);
      const firestoreData = timeEntry.toFirestore();
      
      expect(firestoreData.employeeId).toBe('emp_123');
      expect(firestoreData.tenantId).toBe('tenant_123');
      expect(firestoreData.duration).toBe(480);
      expect(firestoreData.billable).toBe(true);
      expect(firestoreData.tags).toEqual([]);
    });

    it('should handle null values correctly', () => {
      const timeEntry = new TimeEntryModel({
        ...mockTimeEntryData,
        projectId: undefined,
        hourlyRate: undefined
      });
      
      const firestoreData = timeEntry.toFirestore();
      expect(firestoreData.projectId).toBeNull();
      expect(firestoreData.hourlyRate).toBeNull();
    });
  });
});