/**
 * Tests unitaires pour TimesheetModel
 */

import { TimesheetModel } from '../../../backend/functions/src/models/timesheet.model';
import { Timesheet, TimesheetStatus, TimePeriod } from '../../../backend/functions/src/common/types';
import { ValidationError } from '../../../backend/functions/src/models/base.model';

describe('TimesheetModel', () => {
  const mockTimesheetData: Partial<Timesheet> = {
    employeeId: 'emp_123',
    tenantId: 'tenant_123',
    periodStart: '2024-01-15',
    periodEnd: '2024-01-21',
    createdBy: 'user_123'
  };

  describe('Constructor', () => {
    it('should create a timesheet with default values', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      
      expect(timesheet.status).toBe(TimesheetStatus.DRAFT);
      expect(timesheet.totalHours).toBe(0);
      expect(timesheet.totalBillableHours).toBe(0);
      expect(timesheet.totalCost).toBe(0);
      expect(timesheet.timeEntries).toEqual([]);
      expect(timesheet.data.metadata?.version).toBe(1);
    });

    it('should preserve provided values', () => {
      const customData = {
        ...mockTimesheetData,
        status: TimesheetStatus.SUBMITTED,
        totalHours: 40,
        totalBillableHours: 35,
        totalCost: 1750
      };

      const timesheet = new TimesheetModel(customData);
      
      expect(timesheet.status).toBe(TimesheetStatus.SUBMITTED);
      expect(timesheet.totalHours).toBe(40);
      expect(timesheet.totalBillableHours).toBe(35);
      expect(timesheet.totalCost).toBe(1750);
    });
  });

  describe('Period Management', () => {
    describe('createWeeklyPeriod', () => {
      it('should create a weekly period starting on Monday', () => {
        const wednesday = new Date('2024-01-17'); // Mercredi
        const period = TimesheetModel.createWeeklyPeriod(wednesday);
        
        expect(period.start).toBe('2024-01-15'); // Lundi
        expect(period.end).toBe('2024-01-21'); // Dimanche
      });

      it('should handle Sunday correctly', () => {
        const sunday = new Date('2024-01-14'); // Dimanche
        const period = TimesheetModel.createWeeklyPeriod(sunday);
        
        expect(period.start).toBe('2024-01-08'); // Lundi précédent
        expect(period.end).toBe('2024-01-14'); // Dimanche
      });
    });

    describe('createBiWeeklyPeriod', () => {
      it('should create a bi-weekly period', () => {
        const date = new Date('2024-01-17');
        const period = TimesheetModel.createBiWeeklyPeriod(date);
        
        expect(period.start).toBe('2024-01-15'); // Lundi
        expect(period.end).toBe('2024-01-28'); // 2 semaines plus tard
      });
    });

    describe('createMonthlyPeriod', () => {
      it('should create a monthly period', () => {
        const period = TimesheetModel.createMonthlyPeriod(2024, 1);
        
        expect(period.start).toBe('2024-01-01');
        expect(period.end).toBe('2024-01-31');
      });

      it('should handle February correctly', () => {
        const period = TimesheetModel.createMonthlyPeriod(2024, 2); // Année bissextile
        
        expect(period.start).toBe('2024-02-01');
        expect(period.end).toBe('2024-02-29');
      });
    });

    it('should calculate period duration correctly', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      
      expect(timesheet.getPeriodDuration()).toBe(7); // 7 jours
    });

    it('should identify period type correctly', () => {
      const weeklyTimesheet = new TimesheetModel(mockTimesheetData);
      expect(weeklyTimesheet.getPeriodType()).toBe('weekly');

      const monthlyTimesheet = new TimesheetModel({
        ...mockTimesheetData,
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31'
      });
      expect(monthlyTimesheet.getPeriodType()).toBe('monthly');
    });

    it('should check if date is in period', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      
      expect(timesheet.isDateInPeriod('2024-01-17')).toBe(true);
      expect(timesheet.isDateInPeriod('2024-01-14')).toBe(false);
      expect(timesheet.isDateInPeriod('2024-01-22')).toBe(false);
    });
  });

  describe('Time Entry Management', () => {
    it('should add time entries to draft timesheet', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      
      timesheet.addTimeEntry('entry_1');
      timesheet.addTimeEntry('entry_2');
      
      expect(timesheet.timeEntries).toEqual(['entry_1', 'entry_2']);
    });

    it('should not add duplicate time entries', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      
      timesheet.addTimeEntry('entry_1');
      timesheet.addTimeEntry('entry_1');
      
      expect(timesheet.timeEntries).toEqual(['entry_1']);
    });

    it('should not add time entries to non-editable timesheet', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        status: TimesheetStatus.APPROVED
      });
      
      expect(() => timesheet.addTimeEntry('entry_1')).toThrow(ValidationError);
    });

    it('should remove time entries from draft timesheet', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        timeEntries: ['entry_1', 'entry_2']
      });
      
      timesheet.removeTimeEntry('entry_1');
      
      expect(timesheet.timeEntries).toEqual(['entry_2']);
    });

    it('should check if timesheet has specific time entry', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        timeEntries: ['entry_1', 'entry_2']
      });
      
      expect(timesheet.hasTimeEntry('entry_1')).toBe(true);
      expect(timesheet.hasTimeEntry('entry_3')).toBe(false);
    });
  });

  describe('Totals Management', () => {
    it('should update totals correctly', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      
      const totals = {
        totalHours: 40,
        totalBillableHours: 35,
        totalCost: 1750,
        entriesCount: 5
      };
      
      timesheet.updateTotals(totals);
      
      expect(timesheet.totalHours).toBe(40);
      expect(timesheet.totalBillableHours).toBe(35);
      expect(timesheet.totalCost).toBe(1750);
      expect(timesheet.data.metadata?.lastCalculated).toBeDefined();
      expect(timesheet.data.metadata?.calculationHash).toBeDefined();
    });

    it('should detect when recalculation is needed', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      
      const totals = {
        totalHours: 40,
        totalBillableHours: 35,
        totalCost: 1750,
        entriesCount: 5
      };
      
      timesheet.updateTotals(totals);
      
      // Même totaux - pas besoin de recalcul
      expect(timesheet.needsRecalculation(totals)).toBe(false);
      
      // Totaux différents - recalcul nécessaire
      const newTotals = { ...totals, totalHours: 45 };
      expect(timesheet.needsRecalculation(newTotals)).toBe(true);
    });
  });

  describe('Status Management', () => {
    it('should submit draft timesheet with entries', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        timeEntries: ['entry_1']
      });
      
      timesheet.submit('user_123');
      
      expect(timesheet.status).toBe(TimesheetStatus.SUBMITTED);
      expect(timesheet.submittedAt).toBeDefined();
      expect(timesheet.data.updatedBy).toBe('user_123');
    });

    it('should not submit timesheet without entries', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      
      expect(() => timesheet.submit()).toThrow(ValidationError);
    });

    it('should not submit non-draft timesheet', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        status: TimesheetStatus.APPROVED,
        timeEntries: ['entry_1']
      });
      
      expect(() => timesheet.submit()).toThrow(ValidationError);
    });

    it('should start review of submitted timesheet', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        status: TimesheetStatus.SUBMITTED
      });
      
      timesheet.startReview('reviewer_123');
      
      expect(timesheet.status).toBe(TimesheetStatus.UNDER_REVIEW);
      expect(timesheet.data.updatedBy).toBe('reviewer_123');
    });

    it('should approve submitted timesheet', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        status: TimesheetStatus.SUBMITTED
      });
      
      timesheet.approve('approver_123');
      
      expect(timesheet.status).toBe(TimesheetStatus.APPROVED);
      expect(timesheet.approvedAt).toBeDefined();
      expect(timesheet.approvedBy).toBe('approver_123');
    });

    it('should approve timesheet under review', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        status: TimesheetStatus.UNDER_REVIEW
      });
      
      timesheet.approve('approver_123');
      
      expect(timesheet.status).toBe(TimesheetStatus.APPROVED);
    });

    it('should reject submitted timesheet with reason', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        status: TimesheetStatus.SUBMITTED
      });
      
      timesheet.reject('rejector_123', 'Missing project details');
      
      expect(timesheet.status).toBe(TimesheetStatus.REJECTED);
      expect(timesheet.rejectionReason).toBe('Missing project details');
      expect(timesheet.data.updatedBy).toBe('rejector_123');
    });

    it('should not reject without reason', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        status: TimesheetStatus.SUBMITTED
      });
      
      expect(() => timesheet.reject('rejector_123', '')).toThrow(ValidationError);
    });

    it('should return rejected timesheet to draft', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        status: TimesheetStatus.REJECTED,
        rejectionReason: 'Some reason'
      });
      
      timesheet.returnToDraft();
      
      expect(timesheet.status).toBe(TimesheetStatus.DRAFT);
      expect(timesheet.rejectionReason).toBeUndefined();
      expect(timesheet.submittedAt).toBeUndefined();
    });

    it('should lock approved timesheet', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        status: TimesheetStatus.APPROVED
      });
      
      timesheet.lock('locker_123');
      
      expect(timesheet.status).toBe(TimesheetStatus.LOCKED);
      expect(timesheet.data.updatedBy).toBe('locker_123');
    });

    it('should unlock locked timesheet', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        status: TimesheetStatus.LOCKED
      });
      
      timesheet.unlock('unlocker_123');
      
      expect(timesheet.status).toBe(TimesheetStatus.APPROVED);
      expect(timesheet.data.updatedBy).toBe('unlocker_123');
    });
  });

  describe('Status Properties', () => {
    it('should correctly identify status states', () => {
      const draftTimesheet = new TimesheetModel(mockTimesheetData);
      expect(draftTimesheet.isDraft).toBe(true);
      expect(draftTimesheet.isEditable).toBe(true);

      const submittedTimesheet = new TimesheetModel({
        ...mockTimesheetData,
        status: TimesheetStatus.SUBMITTED
      });
      expect(submittedTimesheet.isSubmitted).toBe(true);
      expect(submittedTimesheet.isEditable).toBe(false);

      const approvedTimesheet = new TimesheetModel({
        ...mockTimesheetData,
        status: TimesheetStatus.APPROVED
      });
      expect(approvedTimesheet.isApproved).toBe(true);
      expect(approvedTimesheet.isEditable).toBe(false);

      const rejectedTimesheet = new TimesheetModel({
        ...mockTimesheetData,
        status: TimesheetStatus.REJECTED
      });
      expect(rejectedTimesheet.isRejected).toBe(true);
      expect(rejectedTimesheet.isEditable).toBe(true);
    });

    it('should check if timesheet can be submitted', () => {
      const emptyTimesheet = new TimesheetModel(mockTimesheetData);
      expect(emptyTimesheet.canBeSubmitted).toBe(false);

      const timesheetWithEntries = new TimesheetModel({
        ...mockTimesheetData,
        timeEntries: ['entry_1']
      });
      expect(timesheetWithEntries.canBeSubmitted).toBe(true);

      const submittedTimesheet = new TimesheetModel({
        ...mockTimesheetData,
        status: TimesheetStatus.SUBMITTED,
        timeEntries: ['entry_1']
      });
      expect(submittedTimesheet.canBeSubmitted).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should get days in period', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      const days = timesheet.getDaysInPeriod();
      
      expect(days).toEqual([
        '2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18',
        '2024-01-19', '2024-01-20', '2024-01-21'
      ]);
    });

    it('should get working days in period', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      const workingDays = timesheet.getWorkingDaysInPeriod();
      
      // Exclut samedi (20) et dimanche (21)
      expect(workingDays).toEqual([
        '2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18', '2024-01-19'
      ]);
    });

    it('should calculate average hours per day', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        totalHours: 40
      });
      
      // 40 heures / 5 jours ouvrables = 8 heures/jour
      expect(timesheet.getAverageHoursPerDay()).toBe(8);
    });

    it('should calculate billable percentage', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        totalHours: 40,
        totalBillableHours: 30
      });
      
      expect(timesheet.getBillablePercentage()).toBe(75);
    });

    it('should calculate average hourly rate', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        totalBillableHours: 30,
        totalCost: 1500
      });
      
      expect(timesheet.getAverageHourlyRate()).toBe(50);
    });

    it('should get status label', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      expect(timesheet.getStatusLabel()).toBe('Brouillon');

      timesheet.data.status = TimesheetStatus.APPROVED;
      expect(timesheet.getStatusLabel()).toBe('Approuvée');
    });
  });

  describe('Comparison Methods', () => {
    it('should check if timesheets are in same period', () => {
      const timesheet1 = new TimesheetModel(mockTimesheetData);
      const timesheet2: Timesheet = {
        ...mockTimesheetData,
        id: 'other_timesheet'
      } as Timesheet;
      
      expect(timesheet1.isInSamePeriod(timesheet2)).toBe(true);

      const timesheet3: Timesheet = {
        ...mockTimesheetData,
        id: 'other_timesheet',
        periodStart: '2024-01-22',
        periodEnd: '2024-01-28'
      } as Timesheet;
      
      expect(timesheet1.isInSamePeriod(timesheet3)).toBe(false);
    });

    it('should check period overlap', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      
      // Chevauchement partiel
      expect(timesheet.overlapsWithPeriod('2024-01-18', '2024-01-25')).toBe(true);
      
      // Pas de chevauchement
      expect(timesheet.overlapsWithPeriod('2024-01-22', '2024-01-28')).toBe(false);
      
      // Période incluse
      expect(timesheet.overlapsWithPeriod('2024-01-16', '2024-01-18')).toBe(true);
    });

    it('should check employee and tenant', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      
      expect(timesheet.isForEmployee('emp_123')).toBe(true);
      expect(timesheet.isForEmployee('emp_456')).toBe(false);
      
      expect(timesheet.isForTenant('tenant_123')).toBe(true);
      expect(timesheet.isForTenant('tenant_456')).toBe(false);
    });
  });

  describe('Copy Methods', () => {
    it('should copy to next weekly period', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      const nextTimesheet = timesheet.copyToNextPeriod();
      
      expect(nextTimesheet.periodStart).toBe('2024-01-22');
      expect(nextTimesheet.periodEnd).toBe('2024-01-28');
      expect(nextTimesheet.employeeId).toBe('emp_123');
      expect(nextTimesheet.status).toBe(TimesheetStatus.DRAFT);
    });

    it('should copy to next monthly period', () => {
      const monthlyTimesheet = new TimesheetModel({
        ...mockTimesheetData,
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31'
      });
      
      const nextTimesheet = monthlyTimesheet.copyToNextPeriod();
      
      expect(nextTimesheet.periodStart).toBe('2024-02-01');
      expect(nextTimesheet.periodEnd).toBe('2024-02-29'); // 2024 est bissextile
    });
  });

  describe('Validation', () => {
    it('should validate a correct timesheet', async () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      
      await expect(timesheet.validate()).resolves.toBe(true);
    });

    it('should reject invalid date format', async () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        periodStart: '15-01-2024'
      });
      
      await expect(timesheet.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject invalid period (end before start)', async () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        periodStart: '2024-01-21',
        periodEnd: '2024-01-15'
      });
      
      await expect(timesheet.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject negative totals', async () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        totalHours: -5
      });
      
      await expect(timesheet.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject billable hours exceeding total hours', async () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        totalHours: 30,
        totalBillableHours: 40
      });
      
      await expect(timesheet.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject rejected timesheet without reason', async () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        status: TimesheetStatus.REJECTED
      });
      
      await expect(timesheet.validate()).rejects.toThrow(ValidationError);
    });
  });

  describe('Completeness Validation', () => {
    it('should validate completeness', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        totalHours: 40,
        timeEntries: ['entry_1', 'entry_2']
      });
      
      const completeness = timesheet.validateCompleteness();
      
      expect(completeness.isComplete).toBe(true);
      expect(completeness.warnings).toEqual([]);
    });

    it('should detect missing entries', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      
      const completeness = timesheet.validateCompleteness();
      
      expect(completeness.warnings).toContain('No time entries found');
      expect(completeness.warnings).toContain('Total hours is zero');
    });

    it('should detect inconsistent totals', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        totalHours: 30,
        totalBillableHours: 40
      });
      
      const completeness = timesheet.validateCompleteness();
      
      expect(completeness.warnings).toContain('Billable hours exceed total hours');
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect excessive daily hours', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        totalHours: 70 // 14 heures/jour en moyenne
      });
      
      const anomalies = timesheet.detectAnomalies();
      expect(anomalies).toContain('excessive_daily_hours');
    });

    it('should detect insufficient daily hours', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        totalHours: 5 // 1 heure/jour en moyenne
      });
      
      const anomalies = timesheet.detectAnomalies();
      expect(anomalies).toContain('insufficient_daily_hours');
    });

    it('should detect no billable hours', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        totalHours: 40,
        totalBillableHours: 0
      });
      
      const anomalies = timesheet.detectAnomalies();
      expect(anomalies).toContain('no_billable_hours');
    });

    it('should detect late submission', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        submittedAt: new Date('2024-02-01') // 11 jours après la fin de période
      });
      
      const anomalies = timesheet.detectAnomalies();
      expect(anomalies).toContain('late_submission');
    });
  });

  describe('Firestore Conversion', () => {
    it('should convert to Firestore format correctly', () => {
      const timesheet = new TimesheetModel(mockTimesheetData);
      const firestoreData = timesheet.toFirestore();
      
      expect(firestoreData.employeeId).toBe('emp_123');
      expect(firestoreData.tenantId).toBe('tenant_123');
      expect(firestoreData.periodStart).toBe('2024-01-15');
      expect(firestoreData.periodEnd).toBe('2024-01-21');
      expect(firestoreData.status).toBe(TimesheetStatus.DRAFT);
      expect(firestoreData.timeEntries).toEqual([]);
    });

    it('should handle null values correctly', () => {
      const timesheet = new TimesheetModel({
        ...mockTimesheetData,
        approvedBy: undefined,
        rejectionReason: undefined
      });
      
      const firestoreData = timesheet.toFirestore();
      expect(firestoreData.approvedBy).toBeNull();
      expect(firestoreData.rejectionReason).toBeNull();
    });
  });
});