/**
 * Tests pour TimesheetConfigService
 */

import { TimesheetConfigService } from '../../../../backend/functions/src/services/config/timesheet-config.service';
import { TimesheetSettingsModel } from '../../../../backend/functions/src/models/timesheet-settings.model';

// Mock Firestore
const mockFirestore = {
  collection: jest.fn(() => ({
    where: jest.fn(() => ({
      limit: jest.fn(() => ({
        get: jest.fn()
      })),
      orderBy: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn()
        }))
      }))
    })),
    add: jest.fn(),
    doc: jest.fn(() => ({
      update: jest.fn()
    }))
  }))
} as any;

describe('TimesheetConfigService', () => {
  let service: TimesheetConfigService;
  let mockCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TimesheetConfigService(mockFirestore);
    mockCollection = mockFirestore.collection();
  });

  describe('getTimesheetSettings', () => {
    it('should return existing settings', async () => {
      const mockDoc = {
        id: 'settings-1',
        data: () => ({
          tenantId: 'tenant-1',
          defaultPeriodType: 'weekly',
          createdAt: new Date(),
          updatedAt: new Date()
        }),
        exists: true
      };

      mockCollection.where().limit().get.mockResolvedValue({
        empty: false,
        docs: [mockDoc]
      });

      // Mock TimesheetSettingsModel.fromFirestore
      jest.spyOn(TimesheetSettingsModel, 'fromFirestore').mockReturnValue(
        new TimesheetSettingsModel({
          id: 'settings-1',
          tenantId: 'tenant-1',
          createdBy: 'user-1'
        })
      );

      const result = await service.getTimesheetSettings('tenant-1');

      expect(result).toBeInstanceOf(TimesheetSettingsModel);
      expect(result.tenantId).toBe('tenant-1');
    });

    it('should create default settings when none exist', async () => {
      mockCollection.where().limit().get.mockResolvedValue({
        empty: true,
        docs: []
      });

      mockFirestore.collection().add.mockResolvedValue({
        id: 'new-settings-1'
      });

      const result = await service.getTimesheetSettings('tenant-1');

      expect(result).toBeInstanceOf(TimesheetSettingsModel);
      expect(result.tenantId).toBe('tenant-1');
      expect(mockFirestore.collection().add).toHaveBeenCalled();
    });
  });

  describe('configurePeriods', () => {
    it('should update period configuration', async () => {
      const mockSettings = new TimesheetSettingsModel({
        id: 'settings-1',
        tenantId: 'tenant-1',
        createdBy: 'user-1'
      });

      // Mock getTimesheetSettings
      jest.spyOn(service, 'getTimesheetSettings').mockResolvedValue(mockSettings);

      const config = {
        defaultPeriodType: 'bi-weekly' as const,
        allowCustomPeriods: false,
        weekStartDay: 0 as const
      };

      const result = await service.configurePeriods('tenant-1', config, 'user-1');

      expect(result.defaultPeriodType).toBe('bi-weekly');
      expect(mockFirestore.collection().doc().update).toHaveBeenCalled();
    });
  });

  describe('configureOvertimeRules', () => {
    it('should update overtime rules', async () => {
      const mockSettings = new TimesheetSettingsModel({
        id: 'settings-1',
        tenantId: 'tenant-1',
        createdBy: 'user-1'
      });

      jest.spyOn(service, 'getTimesheetSettings').mockResolvedValue(mockSettings);

      const rules = {
        enabled: true,
        dailyThreshold: 8,
        weeklyThreshold: 40,
        multiplier: 1.5
      };

      const result = await service.configureOvertimeRules('tenant-1', rules, 'user-1');

      expect(result.overtimeRules.enabled).toBe(true);
      expect(result.overtimeRules.dailyThreshold).toBe(8);
      expect(mockFirestore.collection().doc().update).toHaveBeenCalled();
    });
  });

  describe('calculateOvertime', () => {
    it('should calculate overtime correctly', async () => {
      const mockSettings = new TimesheetSettingsModel({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        overtimeRules: {
          enabled: true,
          dailyThreshold: 8,
          weeklyThreshold: 40,
          multiplier: 1.5,
          autoCalculate: true
        }
      });

      jest.spyOn(service, 'getTimesheetSettings').mockResolvedValue(mockSettings);

      const result = await service.calculateOvertime('tenant-1', 10, 45);

      expect(result.dailyOvertime).toBe(2); // 10 - 8
      expect(result.weeklyOvertime).toBe(5); // 45 - 40
      expect(result.totalOvertime).toBe(5); // Max entre daily et weekly
      expect(result.overtimeRate).toBe(1.5);
    });

    it('should return zero overtime when disabled', async () => {
      const mockSettings = new TimesheetSettingsModel({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        overtimeRules: {
          enabled: false,
          dailyThreshold: 8,
          weeklyThreshold: 40,
          multiplier: 1.5,
          autoCalculate: true
        }
      });

      jest.spyOn(service, 'getTimesheetSettings').mockResolvedValue(mockSettings);

      const result = await service.calculateOvertime('tenant-1', 10, 45);

      expect(result.dailyOvertime).toBe(0);
      expect(result.weeklyOvertime).toBe(0);
      expect(result.totalOvertime).toBe(0);
    });
  });

  describe('validateTimeEntryAgainstConfig', () => {
    it('should validate time entry successfully', async () => {
      const mockSettings = new TimesheetSettingsModel({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        validationRules: {
          maxDailyHours: 16,
          maxWeeklyHours: 60,
          requireDescription: true,
          minDescriptionLength: 5,
          requireProjectForBillable: true,
          requireActivityCode: false,
          allowFutureEntries: false,
          maxFutureDays: 0,
          allowWeekendWork: true
        }
      });

      jest.spyOn(service, 'getTimesheetSettings').mockResolvedValue(mockSettings);

      const entryData = {
        date: '2024-01-15',
        duration: 480, // 8 heures
        description: 'Working on project',
        projectId: 'project-1',
        billable: true
      };

      const result = await service.validateTimeEntryAgainstConfig('tenant-1', entryData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors', async () => {
      const mockSettings = new TimesheetSettingsModel({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        validationRules: {
          maxDailyHours: 8,
          maxWeeklyHours: 40,
          requireDescription: true,
          minDescriptionLength: 10,
          requireProjectForBillable: true,
          requireActivityCode: true,
          allowFutureEntries: false,
          maxFutureDays: 0,
          allowWeekendWork: false
        }
      });

      jest.spyOn(service, 'getTimesheetSettings').mockResolvedValue(mockSettings);

      const entryData = {
        date: '2024-01-15',
        duration: 600, // 10 heures (dépasse la limite)
        description: 'Short', // Trop courte
        billable: true // Pas de projet spécifié
      };

      const result = await service.validateTimeEntryAgainstConfig('tenant-1', entryData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Daily hours (10.0) exceed maximum allowed (8)');
      expect(result.errors).toContain('Description must be at least 10 characters');
      expect(result.errors).toContain('Project is required for billable entries');
      expect(result.errors).toContain('Activity code is required');
    });
  });

  describe('isApprovalRequired', () => {
    it('should return true when approval is required', async () => {
      const mockSettings = new TimesheetSettingsModel({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        approvalWorkflow: {
          enabled: true,
          requireApprovalForAll: true,
          autoApproveThreshold: 0,
          approvalLevels: 1,
          escalationDays: 3,
          allowSelfApproval: false
        }
      });

      jest.spyOn(service, 'getTimesheetSettings').mockResolvedValue(mockSettings);

      const result = await service.isApprovalRequired('tenant-1', 40);

      expect(result).toBe(true);
    });

    it('should return false when approval is disabled', async () => {
      const mockSettings = new TimesheetSettingsModel({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        approvalWorkflow: {
          enabled: false,
          requireApprovalForAll: false,
          autoApproveThreshold: 0,
          approvalLevels: 1,
          escalationDays: 3,
          allowSelfApproval: false
        }
      });

      jest.spyOn(service, 'getTimesheetSettings').mockResolvedValue(mockSettings);

      const result = await service.isApprovalRequired('tenant-1', 40);

      expect(result).toBe(false);
    });

    it('should check threshold when not requiring approval for all', async () => {
      const mockSettings = new TimesheetSettingsModel({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        approvalWorkflow: {
          enabled: true,
          requireApprovalForAll: false,
          autoApproveThreshold: 35,
          approvalLevels: 1,
          escalationDays: 3,
          allowSelfApproval: false
        }
      });

      jest.spyOn(service, 'getTimesheetSettings').mockResolvedValue(mockSettings);

      const resultAbove = await service.isApprovalRequired('tenant-1', 40);
      const resultBelow = await service.isApprovalRequired('tenant-1', 30);

      expect(resultAbove).toBe(true);
      expect(resultBelow).toBe(false);
    });
  });

  describe('shouldSendReminder', () => {
    it('should return true when reminder should be sent', async () => {
      const mockSettings = new TimesheetSettingsModel({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        notifications: {
          enabled: true,
          reminderDays: [1, 3, 5], // Lundi, Mercredi, Vendredi
          reminderTime: '09:00',
          notifyOnSubmission: true,
          notifyOnApproval: true,
          notifyOnRejection: true,
          notifyOnOvertime: true,
          notifyOnMissing: true
        }
      });

      jest.spyOn(service, 'getTimesheetSettings').mockResolvedValue(mockSettings);

      // Mock Date pour simuler un lundi à 10h00
      const mockDate = new Date('2024-01-15T10:00:00'); // Lundi
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = await service.shouldSendReminder('tenant-1');

      expect(result).toBe(true);

      jest.restoreAllMocks();
    });

    it('should return false when notifications are disabled', async () => {
      const mockSettings = new TimesheetSettingsModel({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        notifications: {
          enabled: false,
          reminderDays: [1, 3, 5],
          reminderTime: '09:00',
          notifyOnSubmission: true,
          notifyOnApproval: true,
          notifyOnRejection: true,
          notifyOnOvertime: true,
          notifyOnMissing: true
        }
      });

      jest.spyOn(service, 'getTimesheetSettings').mockResolvedValue(mockSettings);

      const result = await service.shouldSendReminder('tenant-1');

      expect(result).toBe(false);
    });
  });

  describe('isPeriodLocked', () => {
    it('should return true when period is locked', async () => {
      const mockSettings = new TimesheetSettingsModel({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        security: {
          lockPeriodAfterDays: 7,
          allowEditAfterSubmission: false,
          allowEditAfterApproval: false,
          requireReasonForEdit: true,
          auditAllChanges: true
        }
      });

      jest.spyOn(service, 'getTimesheetSettings').mockResolvedValue(mockSettings);

      // Période terminée il y a 10 jours
      const periodEndDate = new Date();
      periodEndDate.setDate(periodEndDate.getDate() - 10);

      const result = await service.isPeriodLocked('tenant-1', periodEndDate.toISOString());

      expect(result).toBe(true);
    });

    it('should return false when period is not locked', async () => {
      const mockSettings = new TimesheetSettingsModel({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        security: {
          lockPeriodAfterDays: 7,
          allowEditAfterSubmission: false,
          allowEditAfterApproval: false,
          requireReasonForEdit: true,
          auditAllChanges: true
        }
      });

      jest.spyOn(service, 'getTimesheetSettings').mockResolvedValue(mockSettings);

      // Période terminée il y a 3 jours
      const periodEndDate = new Date();
      periodEndDate.setDate(periodEndDate.getDate() - 3);

      const result = await service.isPeriodLocked('tenant-1', periodEndDate.toISOString());

      expect(result).toBe(false);
    });
  });

  describe('getConfigurationSummary', () => {
    it('should return configuration summary', async () => {
      const mockSettings = new TimesheetSettingsModel({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        defaultPeriodType: 'weekly',
        overtimeRules: {
          enabled: true,
          dailyThreshold: 8,
          weeklyThreshold: 40,
          multiplier: 1.5,
          autoCalculate: true
        },
        approvalWorkflow: {
          enabled: true,
          requireApprovalForAll: true,
          autoApproveThreshold: 0,
          approvalLevels: 1,
          escalationDays: 3,
          allowSelfApproval: false
        },
        notifications: {
          enabled: true,
          reminderDays: [1, 3, 5],
          reminderTime: '09:00',
          notifyOnSubmission: true,
          notifyOnApproval: true,
          notifyOnRejection: true,
          notifyOnOvertime: true,
          notifyOnMissing: true
        },
        validationRules: {
          maxDailyHours: 16,
          maxWeeklyHours: 60,
          requireDescription: true,
          minDescriptionLength: 5,
          requireProjectForBillable: true,
          requireActivityCode: false,
          allowFutureEntries: false,
          maxFutureDays: 0,
          allowWeekendWork: true
        },
        security: {
          lockPeriodAfterDays: 30,
          allowEditAfterSubmission: false,
          allowEditAfterApproval: false,
          requireReasonForEdit: true,
          auditAllChanges: true
        }
      });

      jest.spyOn(service, 'getTimesheetSettings').mockResolvedValue(mockSettings);

      const result = await service.getConfigurationSummary('tenant-1');

      expect(result).toEqual({
        periodType: 'weekly',
        overtimeEnabled: true,
        approvalRequired: true,
        notificationsEnabled: true,
        maxDailyHours: 16,
        maxWeeklyHours: 60,
        lockPeriodDays: 30
      });
    });
  });

  describe('resetToDefaults', () => {
    it('should reset settings to defaults', async () => {
      const mockExistingSettings = new TimesheetSettingsModel({
        id: 'existing-1',
        tenantId: 'tenant-1',
        createdBy: 'user-1'
      });

      jest.spyOn(service, 'getTimesheetSettings').mockResolvedValue(mockExistingSettings);
      mockFirestore.collection().doc().delete = jest.fn().mockResolvedValue(undefined);
      mockFirestore.collection().add.mockResolvedValue({ id: 'new-settings-1' });

      const result = await service.resetToDefaults('tenant-1', 'admin-1');

      expect(mockFirestore.collection().doc().delete).toHaveBeenCalled();
      expect(mockFirestore.collection().add).toHaveBeenCalled();
      expect(result).toBeInstanceOf(TimesheetSettingsModel);
      expect(result.tenantId).toBe('tenant-1');
    });
  });
});