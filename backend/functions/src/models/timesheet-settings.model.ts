/**
 * Modèle TimesheetSettings pour la configuration des feuilles de temps
 */

import { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import { BaseModel, ValidationError } from './base.model';

// Types pour les paramètres de feuilles de temps
export interface TimesheetSettings {
  id?: string;
  tenantId: string;
  
  // Paramètres des périodes
  defaultPeriodType: 'weekly' | 'bi-weekly' | 'monthly' | 'custom';
  allowCustomPeriods: boolean;
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Dimanche, 1 = Lundi, etc.
  
  // Paramètres des heures supplémentaires
  overtimeRules: {
    enabled: boolean;
    dailyThreshold: number; // heures par jour
    weeklyThreshold: number; // heures par semaine
    multiplier: number; // multiplicateur pour le calcul (ex: 1.5)
    autoCalculate: boolean;
  };
  
  // Paramètres de validation
  validationRules: {
    maxDailyHours: number;
    maxWeeklyHours: number;
    requireDescription: boolean;
    minDescriptionLength: number;
    requireProjectForBillable: boolean;
    requireActivityCode: boolean;
    allowFutureEntries: boolean;
    maxFutureDays: number;
    allowWeekendWork: boolean;
  };
  
  // Paramètres d'approbation
  approvalWorkflow: {
    enabled: boolean;
    requireApprovalForAll: boolean;
    autoApproveThreshold: number; // heures en dessous desquelles l'approbation est automatique
    approvalLevels: number; // nombre de niveaux d'approbation
    escalationDays: number; // jours avant escalade
    allowSelfApproval: boolean;
  };
  
  // Paramètres de notification
  notifications: {
    enabled: boolean;
    reminderDays: number[]; // jours de la semaine pour les rappels (0-6)
    reminderTime: string; // heure du rappel (HH:MM)
    notifyOnSubmission: boolean;
    notifyOnApproval: boolean;
    notifyOnRejection: boolean;
    notifyOnOvertime: boolean;
    notifyOnMissing: boolean;
  };
  
  // Paramètres d'export
  exportSettings: {
    defaultFormat: 'csv' | 'excel' | 'json' | 'pdf';
    includeNonBillable: boolean;
    includeBreakdown: boolean;
    groupBy: 'employee' | 'project' | 'activity' | 'date';
    dateFormat: string;
    timezone: string;
  };
  
  // Paramètres de sécurité
  security: {
    lockPeriodAfterDays: number; // verrouiller après X jours
    allowEditAfterSubmission: boolean;
    allowEditAfterApproval: boolean;
    requireReasonForEdit: boolean;
    auditAllChanges: boolean;
  };
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export class TimesheetSettingsModel extends BaseModel<TimesheetSettings> {
  constructor(data: Partial<TimesheetSettings>) {
    const settingsData = {
      ...data,
      // Valeurs par défaut
      defaultPeriodType: data.defaultPeriodType || 'weekly',
      allowCustomPeriods: data.allowCustomPeriods !== undefined ? data.allowCustomPeriods : true,
      weekStartDay: data.weekStartDay !== undefined ? data.weekStartDay : 1, // Lundi par défaut
      
      overtimeRules: {
        enabled: false,
        dailyThreshold: 8,
        weeklyThreshold: 40,
        multiplier: 1.5,
        autoCalculate: true,
        ...data.overtimeRules
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
        allowWeekendWork: true,
        ...data.validationRules
      },
      
      approvalWorkflow: {
        enabled: true,
        requireApprovalForAll: true,
        autoApproveThreshold: 0,
        approvalLevels: 1,
        escalationDays: 3,
        allowSelfApproval: false,
        ...data.approvalWorkflow
      },
      
      notifications: {
        enabled: true,
        reminderDays: [1, 3, 5], // Lundi, Mercredi, Vendredi
        reminderTime: '09:00',
        notifyOnSubmission: true,
        notifyOnApproval: true,
        notifyOnRejection: true,
        notifyOnOvertime: true,
        notifyOnMissing: true,
        ...data.notifications
      },
      
      exportSettings: {
        defaultFormat: 'excel' as const,
        includeNonBillable: true,
        includeBreakdown: true,
        groupBy: 'employee' as const,
        dateFormat: 'YYYY-MM-DD',
        timezone: 'UTC',
        ...data.exportSettings
      },
      
      security: {
        lockPeriodAfterDays: 30,
        allowEditAfterSubmission: false,
        allowEditAfterApproval: false,
        requireReasonForEdit: true,
        auditAllChanges: true,
        ...data.security
      }
    };

    super(settingsData);
  }

  // Getters spécifiques
  get tenantId(): string {
    return this.data.tenantId;
  }

  get defaultPeriodType(): string {
    return this.data.defaultPeriodType;
  }

  get overtimeRules(): TimesheetSettings['overtimeRules'] {
    return this.data.overtimeRules;
  }

  get validationRules(): TimesheetSettings['validationRules'] {
    return this.data.validationRules;
  }

  get approvalWorkflow(): TimesheetSettings['approvalWorkflow'] {
    return this.data.approvalWorkflow;
  }

  get notifications(): TimesheetSettings['notifications'] {
    return this.data.notifications;
  }

  get exportSettings(): TimesheetSettings['exportSettings'] {
    return this.data.exportSettings;
  }

  get security(): TimesheetSettings['security'] {
    return this.data.security;
  }

  // Méthodes de gestion des heures supplémentaires
  public enableOvertime(
    dailyThreshold: number = 8,
    weeklyThreshold: number = 40,
    multiplier: number = 1.5
  ): void {
    this.data.overtimeRules = {
      ...this.data.overtimeRules,
      enabled: true,
      dailyThreshold,
      weeklyThreshold,
      multiplier
    };
    this.updateTimestamp();
  }

  public disableOvertime(): void {
    this.data.overtimeRules.enabled = false;
    this.updateTimestamp();
  }

  public calculateOvertimeHours(dailyHours: number, weeklyHours: number): {
    dailyOvertime: number;
    weeklyOvertime: number;
    totalOvertime: number;
  } {
    if (!this.data.overtimeRules.enabled) {
      return { dailyOvertime: 0, weeklyOvertime: 0, totalOvertime: 0 };
    }

    const dailyOvertime = Math.max(0, dailyHours - this.data.overtimeRules.dailyThreshold);
    const weeklyOvertime = Math.max(0, weeklyHours - this.data.overtimeRules.weeklyThreshold);
    
    // Prendre le maximum entre les heures sup quotidiennes et hebdomadaires
    const totalOvertime = Math.max(dailyOvertime, weeklyOvertime);

    return {
      dailyOvertime,
      weeklyOvertime,
      totalOvertime
    };
  }

  // Méthodes de validation
  public validateTimeEntry(entryData: {
    date: string;
    duration: number;
    description?: string;
    projectId?: string;
    activityCodeId?: string;
    billable: boolean;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validation des heures quotidiennes
    const dailyHours = entryData.duration / 60;
    if (dailyHours > this.data.validationRules.maxDailyHours) {
      errors.push(`Daily hours (${dailyHours.toFixed(1)}) exceed maximum allowed (${this.data.validationRules.maxDailyHours})`);
    }

    // Validation de la description
    if (this.data.validationRules.requireDescription) {
      if (!entryData.description || entryData.description.trim().length === 0) {
        errors.push('Description is required');
      } else if (entryData.description.trim().length < this.data.validationRules.minDescriptionLength) {
        errors.push(`Description must be at least ${this.data.validationRules.minDescriptionLength} characters`);
      }
    }

    // Validation du projet pour les entrées facturables
    if (this.data.validationRules.requireProjectForBillable && entryData.billable && !entryData.projectId) {
      errors.push('Project is required for billable entries');
    }

    // Validation du code d'activité
    if (this.data.validationRules.requireActivityCode && !entryData.activityCodeId) {
      errors.push('Activity code is required');
    }

    // Validation des entrées futures
    if (!this.data.validationRules.allowFutureEntries) {
      const entryDate = new Date(entryData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (entryDate > today) {
        errors.push('Future entries are not allowed');
      }
    } else if (this.data.validationRules.maxFutureDays > 0) {
      const entryDate = new Date(entryData.date);
      const maxFutureDate = new Date();
      maxFutureDate.setDate(maxFutureDate.getDate() + this.data.validationRules.maxFutureDays);
      
      if (entryDate > maxFutureDate) {
        errors.push(`Entries cannot be more than ${this.data.validationRules.maxFutureDays} days in the future`);
      }
    }

    // Validation du travail en weekend
    if (!this.data.validationRules.allowWeekendWork) {
      const entryDate = new Date(entryData.date);
      const dayOfWeek = entryDate.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        errors.push('Weekend work is not allowed');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Méthodes de gestion des notifications
  public shouldSendReminder(dayOfWeek: number, currentTime: string): boolean {
    if (!this.data.notifications.enabled) {
      return false;
    }

    return this.data.notifications.reminderDays.includes(dayOfWeek) &&
           currentTime >= this.data.notifications.reminderTime;
  }

  public updateNotificationSettings(settings: Partial<TimesheetSettings['notifications']>): void {
    this.data.notifications = {
      ...this.data.notifications,
      ...settings
    };
    this.updateTimestamp();
  }

  // Méthodes de gestion de la sécurité
  public isPeriodLocked(periodEndDate: string): boolean {
    if (this.data.security.lockPeriodAfterDays <= 0) {
      return false;
    }

    const endDate = new Date(periodEndDate);
    const lockDate = new Date(endDate);
    lockDate.setDate(lockDate.getDate() + this.data.security.lockPeriodAfterDays);

    return new Date() > lockDate;
  }

  public canEditTimesheet(status: string, submittedAt?: Date, approvedAt?: Date): boolean {
    if (status === 'draft') {
      return true;
    }

    if (status === 'submitted' && !this.data.security.allowEditAfterSubmission) {
      return false;
    }

    if (status === 'approved' && !this.data.security.allowEditAfterApproval) {
      return false;
    }

    return true;
  }

  // Méthodes de mise à jour des paramètres
  public updateOvertimeRules(rules: Partial<TimesheetSettings['overtimeRules']>): void {
    this.data.overtimeRules = {
      ...this.data.overtimeRules,
      ...rules
    };
    this.updateTimestamp();
  }

  public updateValidationRules(rules: Partial<TimesheetSettings['validationRules']>): void {
    this.data.validationRules = {
      ...this.data.validationRules,
      ...rules
    };
    this.updateTimestamp();
  }

  public updateApprovalWorkflow(workflow: Partial<TimesheetSettings['approvalWorkflow']>): void {
    this.data.approvalWorkflow = {
      ...this.data.approvalWorkflow,
      ...workflow
    };
    this.updateTimestamp();
  }

  public updateExportSettings(settings: Partial<TimesheetSettings['exportSettings']>): void {
    this.data.exportSettings = {
      ...this.data.exportSettings,
      ...settings
    };
    this.updateTimestamp();
  }

  public updateSecuritySettings(settings: Partial<TimesheetSettings['security']>): void {
    this.data.security = {
      ...this.data.security,
      ...settings
    };
    this.updateTimestamp();
  }

  // Validation complète
  public async validate(): Promise<boolean> {
    try {
      // Validation des champs requis
      BaseModel.validateRequired(this.data, [
        'tenantId',
        'defaultPeriodType',
        'overtimeRules',
        'validationRules',
        'approvalWorkflow',
        'notifications',
        'exportSettings',
        'security'
      ]);

      // Validation du type de période par défaut
      const validPeriodTypes = ['weekly', 'bi-weekly', 'monthly', 'custom'];
      if (!validPeriodTypes.includes(this.data.defaultPeriodType)) {
        throw new ValidationError('Invalid default period type');
      }

      // Validation du jour de début de semaine
      if (this.data.weekStartDay < 0 || this.data.weekStartDay > 6) {
        throw new ValidationError('Week start day must be between 0 and 6');
      }

      // Validation des règles d'heures supplémentaires
      if (this.data.overtimeRules.dailyThreshold <= 0 || this.data.overtimeRules.dailyThreshold > 24) {
        throw new ValidationError('Daily overtime threshold must be between 0 and 24 hours');
      }

      if (this.data.overtimeRules.weeklyThreshold <= 0 || this.data.overtimeRules.weeklyThreshold > 168) {
        throw new ValidationError('Weekly overtime threshold must be between 0 and 168 hours');
      }

      if (this.data.overtimeRules.multiplier <= 0 || this.data.overtimeRules.multiplier > 5) {
        throw new ValidationError('Overtime multiplier must be between 0 and 5');
      }

      // Validation des règles de validation
      if (this.data.validationRules.maxDailyHours <= 0 || this.data.validationRules.maxDailyHours > 24) {
        throw new ValidationError('Max daily hours must be between 0 and 24');
      }

      if (this.data.validationRules.maxWeeklyHours <= 0 || this.data.validationRules.maxWeeklyHours > 168) {
        throw new ValidationError('Max weekly hours must be between 0 and 168');
      }

      if (this.data.validationRules.minDescriptionLength < 0 || this.data.validationRules.minDescriptionLength > 1000) {
        throw new ValidationError('Min description length must be between 0 and 1000');
      }

      // Validation du workflow d'approbation
      if (this.data.approvalWorkflow.approvalLevels < 1 || this.data.approvalWorkflow.approvalLevels > 5) {
        throw new ValidationError('Approval levels must be between 1 and 5');
      }

      if (this.data.approvalWorkflow.escalationDays < 0 || this.data.approvalWorkflow.escalationDays > 30) {
        throw new ValidationError('Escalation days must be between 0 and 30');
      }

      // Validation des notifications
      if (this.data.notifications.reminderDays.some(day => day < 0 || day > 6)) {
        throw new ValidationError('Reminder days must be between 0 and 6');
      }

      // Validation du format d'heure
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(this.data.notifications.reminderTime)) {
        throw new ValidationError('Reminder time must be in HH:MM format');
      }

      // Validation des paramètres d'export
      const validFormats = ['csv', 'excel', 'json', 'pdf'];
      if (!validFormats.includes(this.data.exportSettings.defaultFormat)) {
        throw new ValidationError('Invalid export format');
      }

      const validGroupBy = ['employee', 'project', 'activity', 'date'];
      if (!validGroupBy.includes(this.data.exportSettings.groupBy)) {
        throw new ValidationError('Invalid groupBy option');
      }

      // Validation des paramètres de sécurité
      if (this.data.security.lockPeriodAfterDays < 0 || this.data.security.lockPeriodAfterDays > 365) {
        throw new ValidationError('Lock period must be between 0 and 365 days');
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Timesheet settings validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Conversion vers Firestore
  public toFirestore(): DocumentData {
    const data = {
      tenantId: this.data.tenantId,
      defaultPeriodType: this.data.defaultPeriodType,
      allowCustomPeriods: this.data.allowCustomPeriods,
      weekStartDay: this.data.weekStartDay,
      overtimeRules: this.data.overtimeRules,
      validationRules: this.data.validationRules,
      approvalWorkflow: this.data.approvalWorkflow,
      notifications: this.data.notifications,
      exportSettings: this.data.exportSettings,
      security: this.data.security,
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt,
      createdBy: this.data.createdBy,
      updatedBy: this.data.updatedBy || null
    };

    return this.convertDatesToFirestore(data);
  }

  // Création depuis Firestore
  public static fromFirestore(doc: DocumentSnapshot): TimesheetSettingsModel | null {
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) {
      return null;
    }

    const convertedData = {
      id: doc.id,
      ...data
    };

    // Conversion des timestamps Firestore en dates
    const settingsData = new TimesheetSettingsModel({}).convertDatesFromFirestore(convertedData) as TimesheetSettings;

    return new TimesheetSettingsModel(settingsData);
  }

  // Méthode pour l'API
  public toAPI(): any {
    const apiData = super.toAPI();

    return {
      ...apiData,
      isOvertimeEnabled: this.data.overtimeRules.enabled,
      isApprovalRequired: this.data.approvalWorkflow.enabled,
      areNotificationsEnabled: this.data.notifications.enabled,
      defaultExportFormat: this.data.exportSettings.defaultFormat,
      lockPeriodDays: this.data.security.lockPeriodAfterDays
    };
  }
}