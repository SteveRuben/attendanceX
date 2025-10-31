/**
 * Tests unitaires pour ProjectModel
 */

import { ProjectModel } from '../../../backend/functions/src/models/project.model';
import { Project, ProjectStatus, ProjectInput } from '../../../backend/functions/src/common/types';
import { ValidationError } from '../../../backend/functions/src/models/base.model';

describe('ProjectModel', () => {
  const mockProjectData: Partial<Project> = {
    tenantId: 'tenant_123',
    name: 'Test Project',
    code: 'TEST-001',
    description: 'A test project for unit testing',
    createdBy: 'user_123'
  };

  describe('Constructor', () => {
    it('should create a project with default values', () => {
      const project = new ProjectModel(mockProjectData);
      
      expect(project.status).toBe(ProjectStatus.ACTIVE);
      expect(project.billable).toBe(true);
      expect(project.assignedEmployees).toEqual([]);
      expect(project.activityCodes).toEqual([]);
      expect(project.settings?.requireActivityCode).toBe(false);
      expect(project.settings?.allowOvertime).toBe(true);
      expect(project.settings?.autoApprove).toBe(false);
    });

    it('should preserve provided values', () => {
      const customData = {
        ...mockProjectData,
        status: ProjectStatus.ON_HOLD,
        billable: false,
        assignedEmployees: ['emp_1', 'emp_2'],
        activityCodes: ['act_1', 'act_2']
      };

      const project = new ProjectModel(customData);
      
      expect(project.status).toBe(ProjectStatus.ON_HOLD);
      expect(project.billable).toBe(false);
      expect(project.assignedEmployees).toEqual(['emp_1', 'emp_2']);
      expect(project.activityCodes).toEqual(['act_1', 'act_2']);
    });
  });

  describe('Employee Management', () => {
    it('should assign employees to project', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.assignEmployee('emp_1');
      project.assignEmployee('emp_2');
      
      expect(project.assignedEmployees).toEqual(['emp_1', 'emp_2']);
      expect(project.isEmployeeAssigned('emp_1')).toBe(true);
      expect(project.getAssignedEmployeesCount()).toBe(2);
    });

    it('should not assign duplicate employees', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.assignEmployee('emp_1');
      project.assignEmployee('emp_1');
      
      expect(project.assignedEmployees).toEqual(['emp_1']);
    });

    it('should remove employees from project', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        assignedEmployees: ['emp_1', 'emp_2', 'emp_3']
      });
      
      project.removeEmployee('emp_2');
      
      expect(project.assignedEmployees).toEqual(['emp_1', 'emp_3']);
      expect(project.isEmployeeAssigned('emp_2')).toBe(false);
    });

    it('should assign multiple employees at once', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.assignMultipleEmployees(['emp_1', 'emp_2', 'emp_3']);
      
      expect(project.assignedEmployees).toEqual(['emp_1', 'emp_2', 'emp_3']);
    });

    it('should remove multiple employees at once', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        assignedEmployees: ['emp_1', 'emp_2', 'emp_3', 'emp_4']
      });
      
      project.removeMultipleEmployees(['emp_2', 'emp_4']);
      
      expect(project.assignedEmployees).toEqual(['emp_1', 'emp_3']);
    });

    it('should throw error when assigning empty employee ID', () => {
      const project = new ProjectModel(mockProjectData);
      
      expect(() => project.assignEmployee('')).toThrow(ValidationError);
      expect(() => project.assignEmployee('   ')).toThrow(ValidationError);
    });
  });

  describe('Activity Code Management', () => {
    it('should add activity codes to project', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.addActivityCode('act_1');
      project.addActivityCode('act_2');
      
      expect(project.activityCodes).toEqual(['act_1', 'act_2']);
      expect(project.hasActivityCode('act_1')).toBe(true);
      expect(project.getActivityCodesCount()).toBe(2);
    });

    it('should not add duplicate activity codes', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.addActivityCode('act_1');
      project.addActivityCode('act_1');
      
      expect(project.activityCodes).toEqual(['act_1']);
    });

    it('should remove activity codes from project', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        activityCodes: ['act_1', 'act_2', 'act_3']
      });
      
      project.removeActivityCode('act_2');
      
      expect(project.activityCodes).toEqual(['act_1', 'act_3']);
      expect(project.hasActivityCode('act_2')).toBe(false);
    });

    it('should set activity codes array', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.setActivityCodes(['act_1', 'act_2', 'act_3']);
      
      expect(project.activityCodes).toEqual(['act_1', 'act_2', 'act_3']);
    });

    it('should filter empty activity code IDs when setting', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.setActivityCodes(['act_1', '', '   ', 'act_2']);
      
      expect(project.activityCodes).toEqual(['act_1', 'act_2']);
    });

    it('should throw error when adding empty activity code ID', () => {
      const project = new ProjectModel(mockProjectData);
      
      expect(() => project.addActivityCode('')).toThrow(ValidationError);
      expect(() => project.addActivityCode('   ')).toThrow(ValidationError);
    });
  });

  describe('Status Management', () => {
    it('should activate project', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        status: ProjectStatus.INACTIVE
      });
      
      project.activate();
      
      expect(project.status).toBe(ProjectStatus.ACTIVE);
      expect(project.isActive).toBe(true);
    });

    it('should not activate completed project', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        status: ProjectStatus.COMPLETED
      });
      
      expect(() => project.activate()).toThrow(ValidationError);
    });

    it('should deactivate project', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.deactivate();
      
      expect(project.status).toBe(ProjectStatus.INACTIVE);
      expect(project.isInactive).toBe(true);
    });

    it('should put active project on hold', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.putOnHold();
      
      expect(project.status).toBe(ProjectStatus.ON_HOLD);
      expect(project.isOnHold).toBe(true);
    });

    it('should not put non-active project on hold', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        status: ProjectStatus.INACTIVE
      });
      
      expect(() => project.putOnHold()).toThrow(ValidationError);
    });

    it('should resume project from hold', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        status: ProjectStatus.ON_HOLD
      });
      
      project.resumeFromHold();
      
      expect(project.status).toBe(ProjectStatus.ACTIVE);
    });

    it('should not resume project not on hold', () => {
      const project = new ProjectModel(mockProjectData);
      
      expect(() => project.resumeFromHold()).toThrow(ValidationError);
    });

    it('should complete project', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.complete();
      
      expect(project.status).toBe(ProjectStatus.COMPLETED);
      expect(project.isCompleted).toBe(true);
      expect(project.endDate).toBeDefined();
    });

    it('should not complete inactive project', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        status: ProjectStatus.INACTIVE
      });
      
      expect(() => project.complete()).toThrow(ValidationError);
    });

    it('should reopen completed project', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        status: ProjectStatus.COMPLETED
      });
      
      project.reopen();
      
      expect(project.status).toBe(ProjectStatus.ACTIVE);
    });

    it('should not reopen non-completed project', () => {
      const project = new ProjectModel(mockProjectData);
      
      expect(() => project.reopen()).toThrow(ValidationError);
    });
  });

  describe('Date Management', () => {
    it('should set start date', () => {
      const project = new ProjectModel(mockProjectData);
      const startDate = new Date('2024-01-01');
      
      project.setStartDate(startDate);
      
      expect(project.startDate).toEqual(startDate);
    });

    it('should set end date', () => {
      const project = new ProjectModel(mockProjectData);
      const endDate = new Date('2024-12-31');
      
      project.setEndDate(endDate);
      
      expect(project.endDate).toEqual(endDate);
    });

    it('should set date range', () => {
      const project = new ProjectModel(mockProjectData);
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      
      project.setDateRange(startDate, endDate);
      
      expect(project.startDate).toEqual(startDate);
      expect(project.endDate).toEqual(endDate);
    });

    it('should not set start date after end date', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        endDate: new Date('2024-06-30')
      });
      
      expect(() => project.setStartDate(new Date('2024-07-01'))).toThrow(ValidationError);
    });

    it('should not set end date before start date', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        startDate: new Date('2024-01-01')
      });
      
      expect(() => project.setEndDate(new Date('2023-12-31'))).toThrow(ValidationError);
    });

    it('should not set invalid date range', () => {
      const project = new ProjectModel(mockProjectData);
      
      expect(() => project.setDateRange(
        new Date('2024-12-31'),
        new Date('2024-01-01')
      )).toThrow(ValidationError);
    });

    it('should clear dates', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      });
      
      project.clearDates();
      
      expect(project.startDate).toBeUndefined();
      expect(project.endDate).toBeUndefined();
    });
  });

  describe('Duration Calculations', () => {
    it('should calculate duration in days', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });
      
      expect(project.getDurationInDays()).toBe(31);
    });

    it('should calculate duration in weeks', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-14')
      });
      
      expect(project.getDurationInWeeks()).toBe(2);
    });

    it('should calculate duration in months', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31')
      });
      
      expect(project.getDurationInMonths()).toBe(3);
    });

    it('should return null for duration when dates are missing', () => {
      const project = new ProjectModel(mockProjectData);
      
      expect(project.getDurationInDays()).toBeNull();
      expect(project.getDurationInWeeks()).toBeNull();
      expect(project.getDurationInMonths()).toBeNull();
    });
  });

  describe('Date Validation', () => {
    it('should check if date is in range', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      });
      
      expect(project.isDateInRange(new Date('2024-06-15'))).toBe(true);
      expect(project.isDateInRange(new Date('2023-12-31'))).toBe(false);
      expect(project.isDateInRange(new Date('2025-01-01'))).toBe(false);
    });

    it('should return true when no date range is set', () => {
      const project = new ProjectModel(mockProjectData);
      
      expect(project.isDateInRange(new Date())).toBe(true);
    });

    it('should check if project is currently active', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 jours avant
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 jours après

      const activeProject = new ProjectModel({
        ...mockProjectData,
        startDate: pastDate,
        endDate: futureDate
      });
      
      expect(activeProject.isCurrentlyActive()).toBe(true);

      const notStartedProject = new ProjectModel({
        ...mockProjectData,
        startDate: futureDate,
        endDate: new Date(futureDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      });
      
      expect(notStartedProject.isCurrentlyActive()).toBe(false);
    });

    it('should determine project phase correctly', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Projet actif
      const activeProject = new ProjectModel({
        ...mockProjectData,
        startDate: pastDate,
        endDate: futureDate
      });
      expect(activeProject.getProjectPhase()).toBe('active');

      // Projet pas encore commencé
      const notStartedProject = new ProjectModel({
        ...mockProjectData,
        startDate: futureDate,
        endDate: new Date(futureDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      });
      expect(notStartedProject.getProjectPhase()).toBe('not_started');

      // Projet terminé
      const completedProject = new ProjectModel({
        ...mockProjectData,
        status: ProjectStatus.COMPLETED
      });
      expect(completedProject.getProjectPhase()).toBe('completed');

      // Projet en retard
      const overdueProject = new ProjectModel({
        ...mockProjectData,
        startDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        endDate: pastDate
      });
      expect(overdueProject.getProjectPhase()).toBe('overdue');
    });
  });

  describe('Budget Management', () => {
    it('should set budget', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.setBudget(10000);
      
      expect(project.budget).toBe(10000);
    });

    it('should not set negative budget', () => {
      const project = new ProjectModel(mockProjectData);
      
      expect(() => project.setBudget(-1000)).toThrow(ValidationError);
    });

    it('should set default hourly rate', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.setDefaultHourlyRate(75);
      
      expect(project.defaultHourlyRate).toBe(75);
    });

    it('should not set negative hourly rate', () => {
      const project = new ProjectModel(mockProjectData);
      
      expect(() => project.setDefaultHourlyRate(-50)).toThrow(ValidationError);
    });

    it('should calculate budget utilization', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        budget: 10000
      });
      
      expect(project.calculateBudgetUtilization(7500)).toBe(75);
      expect(project.calculateBudgetUtilization(12000)).toBe(120);
    });

    it('should return 0 utilization when no budget is set', () => {
      const project = new ProjectModel(mockProjectData);
      
      expect(project.calculateBudgetUtilization(5000)).toBe(0);
    });

    it('should calculate remaining budget', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        budget: 10000
      });
      
      expect(project.getRemainingBudget(7500)).toBe(2500);
      expect(project.getRemainingBudget(12000)).toBe(0);
    });

    it('should check if budget is exceeded', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        budget: 10000
      });
      
      expect(project.isBudgetExceeded(7500)).toBe(false);
      expect(project.isBudgetExceeded(12000)).toBe(true);
    });

    it('should return false for budget exceeded when no budget is set', () => {
      const project = new ProjectModel(mockProjectData);
      
      expect(project.isBudgetExceeded(999999)).toBe(false);
    });
  });

  describe('Settings Management', () => {
    it('should update settings', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.updateSettings({
        requireActivityCode: true,
        autoApprove: true
      });
      
      expect(project.settings?.requireActivityCode).toBe(true);
      expect(project.settings?.autoApprove).toBe(true);
      expect(project.settings?.allowOvertime).toBe(true); // Valeur par défaut préservée
    });

    it('should require activity code', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.requireActivityCode(true);
      
      expect(project.settings?.requireActivityCode).toBe(true);
    });

    it('should allow overtime', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.allowOvertime(false);
      
      expect(project.settings?.allowOvertime).toBe(false);
    });

    it('should enable auto approval', () => {
      const project = new ProjectModel(mockProjectData);
      
      project.enableAutoApproval(true);
      
      expect(project.settings?.autoApprove).toBe(true);
    });
  });

  describe('Access Validation', () => {
    it('should validate employee access', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        assignedEmployees: ['emp_1', 'emp_2']
      });
      
      expect(() => project.validateEmployeeAccess('emp_1')).not.toThrow();
      expect(() => project.validateEmployeeAccess('emp_3')).toThrow(ValidationError);
    });

    it('should not allow access to inactive project', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        status: ProjectStatus.INACTIVE,
        assignedEmployees: ['emp_1']
      });
      
      expect(() => project.validateEmployeeAccess('emp_1')).toThrow(ValidationError);
    });

    it('should validate activity code access', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        activityCodes: ['act_1', 'act_2'],
        settings: {
          requireActivityCode: true,
          allowOvertime: true,
          autoApprove: false
        }
      });
      
      expect(() => project.validateActivityCodeAccess('act_1')).not.toThrow();
      expect(() => project.validateActivityCodeAccess('act_3')).toThrow(ValidationError);
    });

    it('should allow any activity code when not required', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        settings: {
          requireActivityCode: false,
          allowOvertime: true,
          autoApprove: false
        }
      });
      
      expect(() => project.validateActivityCodeAccess('any_code')).not.toThrow();
    });
  });

  describe('Utility Methods', () => {
    it('should get status label', () => {
      const project = new ProjectModel(mockProjectData);
      expect(project.getStatusLabel()).toBe('Actif');

      project.data.status = ProjectStatus.COMPLETED;
      expect(project.getStatusLabel()).toBe('Terminé');
    });

    it('should get project info', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        assignedEmployees: ['emp_1', 'emp_2'],
        activityCodes: ['act_1', 'act_2', 'act_3']
      });
      
      const info = project.getProjectInfo();
      
      expect(info.project).toBeDefined();
      expect(info.phase).toBe('active');
      expect(info.durationDays).toBe(366); // 2024 est bissextile
      expect(info.employeesCount).toBe(2);
      expect(info.activityCodesCount).toBe(3);
    });

    it('should match search terms', () => {
      const project = new ProjectModel(mockProjectData);
      
      expect(project.matchesSearchTerm('test')).toBe(true);
      expect(project.matchesSearchTerm('TEST-001')).toBe(true);
      expect(project.matchesSearchTerm('unit testing')).toBe(true);
      expect(project.matchesSearchTerm('nonexistent')).toBe(false);
      expect(project.matchesSearchTerm('')).toBe(true);
    });

    it('should check client and tenant association', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        clientId: 'client_123'
      });
      
      expect(project.isForClient('client_123')).toBe(true);
      expect(project.isForClient('client_456')).toBe(false);
      expect(project.isForTenant('tenant_123')).toBe(true);
      expect(project.isForTenant('tenant_456')).toBe(false);
    });
  });

  describe('Update from Input', () => {
    it('should update project from input', () => {
      const project = new ProjectModel(mockProjectData);
      
      const input: Partial<ProjectInput> = {
        name: 'Updated Project Name',
        code: 'updated-001',
        description: 'Updated description',
        budget: 15000,
        billable: false
      };
      
      project.updateFromInput(input);
      
      expect(project.name).toBe('Updated Project Name');
      expect(project.code).toBe('UPDATED-001'); // Converti en majuscules
      expect(project.description).toBe('Updated description');
      expect(project.budget).toBe(15000);
      expect(project.billable).toBe(false);
    });

    it('should validate dates when updating', () => {
      const project = new ProjectModel(mockProjectData);
      
      const input: Partial<ProjectInput> = {
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01')
      };
      
      expect(() => project.updateFromInput(input)).toThrow(ValidationError);
    });
  });

  describe('Validation', () => {
    it('should validate a correct project', async () => {
      const project = new ProjectModel(mockProjectData);
      
      await expect(project.validate()).resolves.toBe(true);
    });

    it('should reject empty name', async () => {
      const project = new ProjectModel({
        ...mockProjectData,
        name: ''
      });
      
      await expect(project.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject empty code', async () => {
      const project = new ProjectModel({
        ...mockProjectData,
        code: ''
      });
      
      await expect(project.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject invalid code format', async () => {
      const project = new ProjectModel({
        ...mockProjectData,
        code: 'invalid-code-with-lowercase'
      });
      
      await expect(project.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject too long name', async () => {
      const project = new ProjectModel({
        ...mockProjectData,
        name: 'a'.repeat(201)
      });
      
      await expect(project.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject too long code', async () => {
      const project = new ProjectModel({
        ...mockProjectData,
        code: 'A'.repeat(51)
      });
      
      await expect(project.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject negative budget', async () => {
      const project = new ProjectModel({
        ...mockProjectData,
        budget: -1000
      });
      
      await expect(project.validate()).rejects.toThrow(ValidationError);
    });

    it('should reject invalid date range', async () => {
      const project = new ProjectModel({
        ...mockProjectData,
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01')
      });
      
      await expect(project.validate()).rejects.toThrow(ValidationError);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect no assigned employees', () => {
      const project = new ProjectModel(mockProjectData);
      
      const anomalies = project.detectAnomalies();
      expect(anomalies).toContain('no_assigned_employees');
    });

    it('should detect missing project dates', () => {
      const project = new ProjectModel(mockProjectData);
      
      const anomalies = project.detectAnomalies();
      expect(anomalies).toContain('missing_project_dates');
    });

    it('should detect overdue project', () => {
      const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const project = new ProjectModel({
        ...mockProjectData,
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        endDate: pastDate
      });
      
      const anomalies = project.detectAnomalies();
      expect(anomalies).toContain('project_overdue');
    });

    it('should detect high budget', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        budget: 2000000
      });
      
      const anomalies = project.detectAnomalies();
      expect(anomalies).toContain('high_budget');
    });

    it('should detect unusual hourly rates', () => {
      const highRateProject = new ProjectModel({
        ...mockProjectData,
        defaultHourlyRate: 600
      });
      
      const lowRateProject = new ProjectModel({
        ...mockProjectData,
        defaultHourlyRate: 3
      });
      
      expect(highRateProject.detectAnomalies()).toContain('high_hourly_rate');
      expect(lowRateProject.detectAnomalies()).toContain('low_hourly_rate');
    });

    it('should detect very long project', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-01-01') // 2 ans
      });
      
      const anomalies = project.detectAnomalies();
      expect(anomalies).toContain('very_long_project');
    });

    it('should detect too many employees', () => {
      const employees = Array.from({ length: 60 }, (_, i) => `emp_${i}`);
      const project = new ProjectModel({
        ...mockProjectData,
        assignedEmployees: employees
      });
      
      const anomalies = project.detectAnomalies();
      expect(anomalies).toContain('too_many_employees');
    });
  });

  describe('Firestore Conversion', () => {
    it('should convert to Firestore format correctly', () => {
      const project = new ProjectModel(mockProjectData);
      const firestoreData = project.toFirestore();
      
      expect(firestoreData.tenantId).toBe('tenant_123');
      expect(firestoreData.name).toBe('Test Project');
      expect(firestoreData.code).toBe('TEST-001');
      expect(firestoreData.status).toBe(ProjectStatus.ACTIVE);
      expect(firestoreData.billable).toBe(true);
      expect(firestoreData.assignedEmployees).toEqual([]);
      expect(firestoreData.activityCodes).toEqual([]);
    });

    it('should handle null values correctly', () => {
      const project = new ProjectModel({
        ...mockProjectData,
        clientId: undefined,
        description: undefined,
        budget: undefined
      });
      
      const firestoreData = project.toFirestore();
      expect(firestoreData.clientId).toBeNull();
      expect(firestoreData.description).toBeNull();
      expect(firestoreData.budget).toBeNull();
    });
  });
});