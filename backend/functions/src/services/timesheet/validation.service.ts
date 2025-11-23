/**
 * Service de validation pour les feuilles de temps
 */

import { TimeEntryModel } from '../../models/time-entry.model';
import { TimesheetModel } from '../../models/timesheet.model';
import { 
  ValidationResult,
  ConflictInfo,
  TimeEntry,
  TimePeriod,
  PresenceEntry
} from '../../common/types';
import { ValidationError } from '../../models/base.model';
import { firestore } from 'firebase-admin';

export class ValidationService {
  private db: firestore.Firestore;

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  // ==================== Validation des entrées de temps ====================

  /**
   * Valider une entrée de temps complètement
   */
  async validateTimeEntry(timeEntry: TimeEntryModel): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validation de base du modèle
      await timeEntry.validate();
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error.message);
      }
    }

    // Validation de la durée
    const durationValidation = this.validateDuration(timeEntry);
    errors.push(...durationValidation.errors);
    warnings.push(...durationValidation.warnings);

    // Validation des heures
    if (timeEntry.startTime && timeEntry.endTime) {
      const timeValidation = this.validateTimeRange(timeEntry.startTime, timeEntry.endTime, timeEntry.date);
      errors.push(...timeValidation.errors);
      warnings.push(...timeValidation.warnings);
    }

    // Validation du projet et de l'activité
    const projectValidation = await this.validateProjectAndActivity(timeEntry);
    errors.push(...projectValidation.errors);
    warnings.push(...projectValidation.warnings);

    // Validation des règles métier
    const businessValidation = await this.validateBusinessRules(timeEntry);
    errors.push(...businessValidation.errors);
    warnings.push(...businessValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valider la durée d'une entrée de temps
   */
  private validateDuration(timeEntry: TimeEntryModel): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Durée minimale
    if (timeEntry.duration < 15) { // Moins de 15 minutes
      warnings.push('Duration is very short (less than 15 minutes)');
    }

    // Durée maximale
    if (timeEntry.duration > 16 * 60) { // Plus de 16 heures
      errors.push('Duration exceeds maximum allowed (16 hours)');
    } else if (timeEntry.duration > 12 * 60) { // Plus de 12 heures
      warnings.push('Duration is very long (more than 12 hours)');
    }

    // Cohérence durée/heures
    if (timeEntry.startTime && timeEntry.endTime) {
      const calculatedDuration = timeEntry.calculateDurationFromTimes();
      const tolerance = 5; // 5 minutes de tolérance

      if (Math.abs(timeEntry.duration - calculatedDuration) > tolerance) {
        errors.push('Duration does not match start and end times');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Valider une plage horaire
   */
  private validateTimeRange(startTime: Date, endTime: Date, date: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Vérifier que l'heure de fin est après l'heure de début
    if (endTime <= startTime) {
      errors.push('End time must be after start time');
      return { isValid: false, errors, warnings };
    }

    // Vérifier que les heures sont dans la même journée
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    if (startDate.getTime() !== endDate.getTime()) {
      errors.push('Start and end times must be on the same day');
    }

    // Vérifier que la date correspond
    const entryDate = new Date(date);
    entryDate.setHours(0, 0, 0, 0);
    
    if (startDate.getTime() !== entryDate.getTime()) {
      errors.push('Times must match the entry date');
    }

    // Vérifier les heures inhabituelles
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();

    if (startHour < 5 || startHour > 23) {
      warnings.push('Start time is outside normal working hours');
    }

    if (endHour < 6 || endHour > 24) {
      warnings.push('End time is outside normal working hours');
    }

    // Vérifier les pauses déjeuner manquantes pour les longues journées
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (durationHours > 6) {
      warnings.push('Long work period without recorded breaks');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Valider le projet et l'activité
   */
  private async validateProjectAndActivity(timeEntry: TimeEntryModel): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Vérifier que le projet existe et est actif
      if (timeEntry.projectId) {
        const project = await this.db.collection('projects').doc(timeEntry.projectId).get();
        
        if (!project.exists) {
          errors.push('Project not found');
        } else {
          const projectData = project.data();
          
          if (projectData?.status !== 'active') {
            errors.push('Project is not active');
          }

          // Vérifier que l'employé est assigné au projet
          if (!projectData?.assignedEmployees?.includes(timeEntry.employeeId)) {
            errors.push('Employee is not assigned to this project');
          }

          // Vérifier si le code d'activité est requis
          if (projectData?.settings?.requireActivityCode && !timeEntry.activityCodeId) {
            errors.push('Activity code is required for this project');
          }
        }
      }

      // Vérifier que le code d'activité existe et est actif
      if (timeEntry.activityCodeId) {
        const activityCode = await this.db.collection('activity_codes').doc(timeEntry.activityCodeId).get();
        
        if (!activityCode.exists) {
          errors.push('Activity code not found');
        } else {
          const activityData = activityCode.data();
          
          if (!activityData?.isActive) {
            errors.push('Activity code is not active');
          }

          // Vérifier la cohérence facturable
          if (timeEntry.billable && !activityData?.billable) {
            warnings.push('Time entry marked as billable but activity code is not billable');
          }
        }
      }

      // Vérifier la cohérence projet/activité
      if (timeEntry.projectId && timeEntry.activityCodeId) {
        const project = await this.db.collection('projects').doc(timeEntry.projectId).get();
        const projectData = project.data();
        
        if (projectData?.activityCodes && !projectData.activityCodes.includes(timeEntry.activityCodeId)) {
          warnings.push('Activity code is not associated with this project');
        }
      }

    } catch (error) {
      errors.push(`Failed to validate project and activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Valider les règles métier
   */
  private async validateBusinessRules(timeEntry: TimeEntryModel): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Vérifier les heures supplémentaires
    const overtimeValidation = await this.validateOvertimeRules(timeEntry);
    errors.push(...overtimeValidation.errors);
    warnings.push(...overtimeValidation.warnings);

    // Vérifier les heures facturables
    const billableValidation = this.validateBillableHours(timeEntry);
    errors.push(...billableValidation.errors);
    warnings.push(...billableValidation.warnings);

    // Vérifier les weekends
    const weekendValidation = this.validateWeekendWork(timeEntry);
    warnings.push(...weekendValidation.warnings);

    return { isValid: errors.length === 0, errors, warnings };
  }

  // ==================== Validation des feuilles de temps ====================

  /**
   * Valider la complétude d'une feuille de temps
   */
  async validateTimesheetCompleteness(timesheet: TimesheetModel): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Obtenir toutes les entrées de temps
      const timeEntries = await this.getTimesheetTimeEntries(timesheet.id!);

      // Vérifier qu'il y a des entrées
      if (timeEntries.length === 0) {
        errors.push('Timesheet has no time entries');
        return { isValid: false, errors, warnings };
      }

      // Vérifier la couverture des jours ouvrables
      const workingDays = timesheet.getWorkingDaysInPeriod();
      const daysWithEntries = new Set(timeEntries.map(entry => entry.date));

      const missingDays = workingDays.filter(day => !daysWithEntries.has(day));
      if (missingDays.length > 0) {
        warnings.push(`Missing entries for working days: ${missingDays.join(', ')}`);
      }

      // Vérifier les heures minimales par jour
      const dailyHours = this.calculateDailyHours(timeEntries);
      for (const [date, hours] of dailyHours.entries()) {
        if (hours < 1) {
          warnings.push(`Very few hours recorded for ${date}: ${hours.toFixed(1)}h`);
        } else if (hours > 12) {
          warnings.push(`Excessive hours recorded for ${date}: ${hours.toFixed(1)}h`);
        }
      }

      // Vérifier la cohérence des totaux
      const calculatedTotals = this.calculateTotalsFromEntries(timeEntries);
      const tolerance = 0.1; // 0.1 heure de tolérance

      if (Math.abs(timesheet.totalHours - calculatedTotals.totalHours) > tolerance) {
        errors.push('Timesheet totals do not match calculated values');
      }

    } catch (error) {
      errors.push(`Failed to validate timesheet completeness: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Vérifier les chevauchements d'horaires
   */
  async checkOverlappingEntries(
    employeeId: string,
    date: string,
    startTime: Date,
    endTime: Date,
    excludeEntryId?: string
  ): Promise<ConflictInfo[]> {
    try {
      const query = await this.db.collection('time_entries')
        .where('employeeId', '==', employeeId)
        .where('date', '==', date)
        .get();

      const conflicts: ConflictInfo[] = [];

      for (const doc of query.docs) {
        if (excludeEntryId && doc.id === excludeEntryId) {
          continue;
        }

        const entryData = doc.data();
        if (!entryData.startTime || !entryData.endTime) {
          continue;
        }

        const existingStart = entryData.startTime.toDate();
        const existingEnd = entryData.endTime.toDate();

        // Vérifier le chevauchement
        if (startTime < existingEnd && endTime > existingStart) {
          conflicts.push({
            conflictType: 'overlap',
            existingEntryId: doc.id,
            conflictDetails: `Overlaps with existing entry from ${existingStart.toLocaleTimeString()} to ${existingEnd.toLocaleTimeString()}`,
            suggestedResolution: 'Adjust time range to avoid overlap'
          });
        }
      }

      return conflicts;
    } catch (error) {
      throw new Error(`Failed to check overlapping entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Validation des règles métier ====================

  /**
   * Valider les règles d'heures supplémentaires
   */
  async validateOvertimeRules(timeEntry: TimeEntryModel): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Obtenir les heures de la semaine
      const weekStart = this.getWeekStart(new Date(timeEntry.date));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weeklyEntries = await this.getEmployeeEntriesForPeriod(
        timeEntry.employeeId,
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0]
      );

      // Calculer les heures hebdomadaires (incluant l'entrée actuelle si elle n'existe pas encore)
      let weeklyHours = weeklyEntries
        .filter(entry => entry.id !== timeEntry.id)
        .reduce((total, entry) => total + (entry.duration / 60), 0);
      
      weeklyHours += timeEntry.duration / 60;

      // Vérifier les seuils d'heures supplémentaires
      const standardWeeklyHours = 40; // Configurable
      const maxWeeklyHours = 60; // Configurable

      if (weeklyHours > maxWeeklyHours) {
        errors.push(`Weekly hours (${weeklyHours.toFixed(1)}h) exceed maximum allowed (${maxWeeklyHours}h)`);
      } else if (weeklyHours > standardWeeklyHours) {
        warnings.push(`Weekly hours (${weeklyHours.toFixed(1)}h) exceed standard hours (${standardWeeklyHours}h) - overtime may apply`);
      }

      // Vérifier les heures quotidiennes
      const dailyHours = timeEntry.duration / 60;
      const maxDailyHours = 12; // Configurable

      if (dailyHours > maxDailyHours) {
        errors.push(`Daily hours (${dailyHours.toFixed(1)}h) exceed maximum allowed (${maxDailyHours}h)`);
      }

    } catch (error) {
      warnings.push(`Could not validate overtime rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Valider l'accès au projet
   */
  async validateProjectAccess(employeeId: string, projectId: string): Promise<boolean> {
    try {
      const project = await this.db.collection('projects').doc(projectId).get();
      
      if (!project.exists) {
        return false;
      }

      const projectData = project.data();
      return projectData?.assignedEmployees?.includes(employeeId) || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Valider les heures facturables
   */
  private validateBillableHours(timeEntry: TimeEntryModel): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Vérifier la cohérence facturable/taux
    if (timeEntry.billable && !timeEntry.hourlyRate) {
      warnings.push('Billable entry without hourly rate - cost cannot be calculated');
    }

    if (!timeEntry.billable && timeEntry.hourlyRate) {
      warnings.push('Non-billable entry has hourly rate defined');
    }

    // Vérifier le taux horaire
    if (timeEntry.hourlyRate) {
      if (timeEntry.hourlyRate < 5) {
        warnings.push('Hourly rate is very low');
      } else if (timeEntry.hourlyRate > 500) {
        warnings.push('Hourly rate is very high');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Valider le travail en weekend
   */
  private validateWeekendWork(timeEntry: TimeEntryModel): ValidationResult {
    const warnings: string[] = [];

    const date = new Date(timeEntry.date);
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) { // Dimanche ou Samedi
      warnings.push('Time entry is for weekend work');
    }

    return { isValid: true, errors: [], warnings };
  }

  // ==================== Validation de cohérence avec la présence ====================

  /**
   * Valider la cohérence entre présence et temps saisi
   */
  async validatePresenceConsistency(
    employeeId: string,
    date: string,
    timeEntries: TimeEntry[]
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Obtenir l'entrée de présence pour cette date
      const presenceQuery = await this.db.collection('presence_entries')
        .where('employeeId', '==', employeeId)
        .where('date', '==', date)
        .limit(1)
        .get();

      if (presenceQuery.empty) {
        warnings.push('No presence entry found for this date');
        return { isValid: true, errors, warnings };
      }

      const presenceData = presenceQuery.docs[0].data() as PresenceEntry;

      // Vérifier la cohérence des heures
      if (presenceData.clockInTime && presenceData.clockOutTime) {
        const presenceHours = (presenceData.clockOutTime.getTime() - presenceData.clockInTime.getTime()) / (1000 * 60 * 60);
        const timeEntryHours = timeEntries.reduce((total, entry) => total + (entry.duration / 60), 0);

        const tolerance = 1; // 1 heure de tolérance
        if (Math.abs(presenceHours - timeEntryHours) > tolerance) {
          warnings.push(`Time entries total (${timeEntryHours.toFixed(1)}h) differs significantly from presence hours (${presenceHours.toFixed(1)}h)`);
        }
      }

      // Vérifier les pauses
      if (presenceData.breakEntries && presenceData.breakEntries.length > 0) {
        const totalBreakTime = presenceData.totalBreakTime || 0; // en minutes
        const workingTime = timeEntries.reduce((total, entry) => total + entry.duration, 0); // en minutes

        if (presenceData.clockInTime && presenceData.clockOutTime) {
          const totalPresenceTime = (presenceData.clockOutTime.getTime() - presenceData.clockInTime.getTime()) / (1000 * 60);
          const expectedWorkingTime = totalPresenceTime - totalBreakTime;

          const tolerance = 30; // 30 minutes de tolérance
          if (Math.abs(workingTime - expectedWorkingTime) > tolerance) {
            warnings.push('Time entries do not account for recorded breaks properly');
          }
        }
      }

    } catch (error) {
      warnings.push(`Could not validate presence consistency: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // ==================== Validation de clôture de période ====================

  /**
   * Valider la clôture d'une période
   */
  async validatePeriodClosure(tenantId: string, period: TimePeriod): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Vérifier que toutes les feuilles de temps de la période sont approuvées
      const timesheetsQuery = await this.db.collection('timesheets')
        .where('tenantId', '==', tenantId)
        .where('periodStart', '>=', period.start)
        .where('periodEnd', '<=', period.end)
        .get();

      let pendingTimesheets = 0;
      let draftTimesheets = 0;

      timesheetsQuery.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'draft') {
          draftTimesheets++;
        } else if (data.status === 'submitted' || data.status === 'under_review') {
          pendingTimesheets++;
        }
      });

      if (draftTimesheets > 0) {
        errors.push(`${draftTimesheets} timesheets are still in draft status`);
      }

      if (pendingTimesheets > 0) {
        warnings.push(`${pendingTimesheets} timesheets are pending approval`);
      }

      // Vérifier que la période n'est pas dans le futur
      const periodEnd = new Date(period.end);
      const now = new Date();
      
      if (periodEnd > now) {
        errors.push('Cannot close a period that has not ended yet');
      }

    } catch (error) {
      errors.push(`Failed to validate period closure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // ==================== Méthodes utilitaires ====================

  private async getTimesheetTimeEntries(timesheetId: string): Promise<TimeEntry[]> {
    const query = await this.db.collection('time_entries')
      .where('timesheetId', '==', timesheetId)
      .get();

    return query.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry));
  }

  private async getEmployeeEntriesForPeriod(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<TimeEntry[]> {
    const query = await this.db.collection('time_entries')
      .where('employeeId', '==', employeeId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    return query.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry));
  }

  private calculateDailyHours(timeEntries: TimeEntry[]): Map<string, number> {
    const dailyHours = new Map<string, number>();

    timeEntries.forEach(entry => {
      const hours = entry.duration / 60;
      const currentHours = dailyHours.get(entry.date) || 0;
      dailyHours.set(entry.date, currentHours + hours);
    });

    return dailyHours;
  }

  private calculateTotalsFromEntries(timeEntries: TimeEntry[]): {
    totalHours: number;
    totalBillableHours: number;
    totalCost: number;
  } {
    let totalHours = 0;
    let totalBillableHours = 0;
    let totalCost = 0;

    timeEntries.forEach(entry => {
      const hours = entry.duration / 60;
      totalHours += hours;

      if (entry.billable) {
        totalBillableHours += hours;
        if (entry.totalCost) {
          totalCost += entry.totalCost;
        }
      }
    });

    return { totalHours, totalBillableHours, totalCost };
  }

  private getWeekStart(date: Date): Date {
    const weekStart = new Date(date);
    const dayOfWeek = weekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(weekStart.getDate() + daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }
}