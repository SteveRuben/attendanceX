/**
 * Service de validation des données de présence
 */

import { logger } from 'firebase-functions';
import { workScheduleService } from '../utility';
import { Employee, GeoLocation, PresenceEntry } from '../../common/types';


export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

export interface ClockInValidationContext {
  employee: Employee;
  location?: GeoLocation;
  timestamp: Date;
  deviceInfo?: any;
  existingEntry?: PresenceEntry;
}

export interface ClockOutValidationContext {
  employee: Employee;
  location?: GeoLocation;
  timestamp: Date;
  deviceInfo?: any;
  presenceEntry: PresenceEntry;
}

class PresenceValidationService {
  /**
   * Valider une tentative de pointage d'arrivée
   */
  async validateClockIn(context: ClockInValidationContext): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Validation de base
      this.validateBasicClockIn(context, errors);

      // Validation de l'employé
      await this.validateEmployee(context.employee, errors);

      // Validation de la géolocalisation
      this.validateGeolocation(context, errors, warnings);

      // Validation des horaires de travail
      await this.validateWorkingHours(context, errors, warnings);

      // Validation des doublons
      this.validateDuplicateClockIn(context, errors);

      // Validation de la fréquence de pointage
      await this.validateClockingFrequency(context, errors, warnings);

      // Validation du dispositif
      this.validateDevice(context, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      logger.error('Clock-in validation failed', { error, employeeId: context.employee.id });
      errors.push({
        field: 'system',
        code: 'VALIDATION_ERROR',
        message: 'System error during validation',
        severity: 'error'
      });

      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Valider une tentative de pointage de sortie
   */
  async validateClockOut(context: ClockOutValidationContext): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Validation de base
      this.validateBasicClockOut(context, errors);

      // Validation de l'employé
      await this.validateEmployee(context.employee, errors);

      // Validation de la géolocalisation
      this.validateGeolocation(context, errors, warnings);

      // Validation de l'entrée de présence existante
      this.validateExistingPresenceEntry(context, errors);

      // Validation de la durée minimale de travail
      this.validateMinimumWorkDuration(context, warnings);

      // Validation des pauses non terminées
      this.validateUnfinishedBreaks(context, warnings);

      // Validation du dispositif
      this.validateDevice(context, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      logger.error('Clock-out validation failed', { error, employeeId: context.employee.id });
      errors.push({
        field: 'system',
        code: 'VALIDATION_ERROR',
        message: 'System error during validation',
        severity: 'error'
      });

      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Validation de base pour le pointage d'arrivée
   */
  private validateBasicClockIn(context: ClockInValidationContext, errors: ValidationError[]): void {
    if (!context.employee) {
      errors.push({
        field: 'employee',
        code: 'MISSING_EMPLOYEE',
        message: 'Employee information is required',
        severity: 'error'
      });
    }

    if (!context.timestamp) {
      errors.push({
        field: 'timestamp',
        code: 'MISSING_TIMESTAMP',
        message: 'Timestamp is required',
        severity: 'error'
      });
    } else {
      // Vérifier que le timestamp n'est pas dans le futur
      const now = new Date();
      const maxFutureMinutes = 5; // Tolérance de 5 minutes pour les décalages d'horloge
      
      if (context.timestamp.getTime() > now.getTime() + (maxFutureMinutes * 60 * 1000)) {
        errors.push({
          field: 'timestamp',
          code: 'FUTURE_TIMESTAMP',
          message: 'Clock-in time cannot be in the future',
          severity: 'error'
        });
      }

      // Vérifier que le timestamp n'est pas trop ancien
      const maxPastHours = 24;
      if (context.timestamp.getTime() < now.getTime() - (maxPastHours * 60 * 60 * 1000)) {
        errors.push({
          field: 'timestamp',
          code: 'OLD_TIMESTAMP',
          message: 'Clock-in time is too old',
          severity: 'error'
        });
      }
    }
  }

  /**
   * Validation de base pour le pointage de sortie
   */
  private validateBasicClockOut(context: ClockOutValidationContext, errors: ValidationError[]): void {
    if (!context.employee) {
      errors.push({
        field: 'employee',
        code: 'MISSING_EMPLOYEE',
        message: 'Employee information is required',
        severity: 'error'
      });
    }

    if (!context.presenceEntry) {
      errors.push({
        field: 'presenceEntry',
        code: 'MISSING_PRESENCE_ENTRY',
        message: 'Presence entry is required for clock-out',
        severity: 'error'
      });
    }

    if (!context.timestamp) {
      errors.push({
        field: 'timestamp',
        code: 'MISSING_TIMESTAMP',
        message: 'Timestamp is required',
        severity: 'error'
      });
    } else {
      // Vérifier que le timestamp n'est pas dans le futur
      const now = new Date();
      const maxFutureMinutes = 5;
      
      if (context.timestamp.getTime() > now.getTime() + (maxFutureMinutes * 60 * 1000)) {
        errors.push({
          field: 'timestamp',
          code: 'FUTURE_TIMESTAMP',
          message: 'Clock-out time cannot be in the future',
          severity: 'error'
        });
      }
    }
  }

  /**
   * Validation de l'employé
   */
  private async validateEmployee(employee: Employee, errors: ValidationError[]): Promise<void> {
    if (!employee.isActive) {
      errors.push({
        field: 'employee',
        code: 'EMPLOYEE_INACTIVE',
        message: 'Employee is not active',
        severity: 'error'
      });
    }

    // Vérifier si l'employé est en congé aujourd'hui
    // TODO: Implémenter la vérification des congés
  }

  /**
   * Validation de la géolocalisation
   */
  private validateGeolocation(
    context: ClockInValidationContext | ClockOutValidationContext,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { employee, location } = context;

    if (employee.requiresGeolocation) {
      if (!location) {
        errors.push({
          field: 'location',
          code: 'LOCATION_REQUIRED',
          message: 'Location is required for this employee',
          severity: 'error'
        });
        return;
      }

      // Validation des coordonnées
      if (typeof location.latitude !== 'number' || 
          location.latitude < -90 || location.latitude > 90) {
        errors.push({
          field: 'location.latitude',
          code: 'INVALID_LATITUDE',
          message: 'Invalid latitude value',
          severity: 'error'
        });
      }

      if (typeof location.longitude !== 'number' || 
          location.longitude < -180 || location.longitude > 180) {
        errors.push({
          field: 'location.longitude',
          code: 'INVALID_LONGITUDE',
          message: 'Invalid longitude value',
          severity: 'error'
        });
      }

      // Validation de la précision
      if (location.accuracy && location.accuracy > 100) {
        warnings.push({
          field: 'location.accuracy',
          code: 'LOW_ACCURACY',
          message: 'Location accuracy is low',
          suggestion: 'Try moving to an area with better GPS signal'
        });
      }

      // Validation des zones autorisées
      if (employee.allowedLocations && employee.allowedLocations.length > 0) {
        const isInAllowedArea = this.isLocationInAllowedArea(
          location,
          employee.allowedLocations,
          employee.locationRadius || 100
        );

        if (!isInAllowedArea) {
          errors.push({
            field: 'location',
            code: 'LOCATION_NOT_ALLOWED',
            message: 'Location is outside allowed work areas',
            severity: 'error'
          });
        }
      }
    }
  }

  /**
   * Validation des horaires de travail
   */
  private async validateWorkingHours(
    context: ClockInValidationContext,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    const { employee, timestamp } = context;

    if (!employee.workScheduleId) {
      return; // Pas d'horaire défini, pas de validation
    }

    try {
      const schedule = await workScheduleService.getWorkScheduleById(employee.workScheduleId);
      if (!schedule) {
        warnings.push({
          field: 'schedule',
          code: 'SCHEDULE_NOT_FOUND',
          message: 'Work schedule not found',
          suggestion: 'Contact administrator to configure work schedule'
        });
        return;
      }

      const dayOfWeek = timestamp.getDay();
      const timeInMinutes = timestamp.getHours() * 60 + timestamp.getMinutes();

      // Vérifier si c'est un jour de travail
      const workDay = schedule.weeklyPattern[dayOfWeek];
      if (!workDay || !workDay.isWorkDay) {
        warnings.push({
          field: 'schedule',
          code: 'NON_WORK_DAY',
          message: 'Clock-in on non-work day',
          suggestion: 'Verify if this is intended or contact your manager'
        });
        return;
      }

      // Vérifier les heures de travail
      const startTime = this.timeStringToMinutes(workDay.startTime);
      // const endTime = this.timeStringToMinutes(workDay.endTime);
      const earlyThreshold = 60; // 1 heure avant
      const lateThreshold = 30; // 30 minutes après

      if (timeInMinutes < startTime - earlyThreshold) {
        warnings.push({
          field: 'time',
          code: 'VERY_EARLY_ARRIVAL',
          message: 'Clock-in is very early compared to scheduled time',
          suggestion: 'Verify your work schedule'
        });
      } else if (timeInMinutes > startTime + lateThreshold) {
        warnings.push({
          field: 'time',
          code: 'LATE_ARRIVAL',
          message: 'Clock-in is late compared to scheduled time',
          suggestion: 'Contact your manager if this is due to exceptional circumstances'
        });
      }

    } catch (error) {
      logger.error('Work schedule validation failed', { error, employeeId: employee.id });
      warnings.push({
        field: 'schedule',
        code: 'SCHEDULE_VALIDATION_ERROR',
        message: 'Could not validate work schedule',
        suggestion: 'Contact administrator'
      });
    }
  }

  /**
   * Validation des doublons de pointage
   */
  private validateDuplicateClockIn(context: ClockInValidationContext, errors: ValidationError[]): void {
    if (context.existingEntry && context.existingEntry.clockInTime) {
      errors.push({
        field: 'clockIn',
        code: 'ALREADY_CLOCKED_IN',
        message: 'Employee is already clocked in today',
        severity: 'error'
      });
    }
  }

  /**
   * Validation de l'entrée de présence existante pour le pointage de sortie
   */
  private validateExistingPresenceEntry(context: ClockOutValidationContext, errors: ValidationError[]): void {
    const { presenceEntry } = context;

    if (!presenceEntry.clockInTime) {
      errors.push({
        field: 'clockIn',
        code: 'NOT_CLOCKED_IN',
        message: 'Employee must clock in before clocking out',
        severity: 'error'
      });
    }

    if (presenceEntry.clockOutTime) {
      errors.push({
        field: 'clockOut',
        code: 'ALREADY_CLOCKED_OUT',
        message: 'Employee is already clocked out',
        severity: 'error'
      });
    }
  }

  /**
   * Validation de la durée minimale de travail
   */
  private validateMinimumWorkDuration(context: ClockOutValidationContext, warnings: ValidationWarning[]): void {
    const { presenceEntry, timestamp } = context;

    if (presenceEntry.clockInTime) {
      const workDuration = timestamp.getTime() - presenceEntry.clockInTime.getTime();
      const minDurationMinutes = 30; // 30 minutes minimum
      
      if (workDuration < minDurationMinutes * 60 * 1000) {
        warnings.push({
          field: 'duration',
          code: 'SHORT_WORK_DURATION',
          message: 'Work duration is very short',
          suggestion: 'Verify if this is intended or if there was an error'
        });
      }
    }
  }

  /**
   * Validation des pauses non terminées
   */
  private validateUnfinishedBreaks(context: ClockOutValidationContext, warnings: ValidationWarning[]): void {
    const { presenceEntry } = context;

    if (presenceEntry.breakEntries) {
      const unfinishedBreaks = presenceEntry.breakEntries.filter(
        breakEntry => !breakEntry.endTime
      );

      if (unfinishedBreaks.length > 0) {
        warnings.push({
          field: 'breaks',
          code: 'UNFINISHED_BREAKS',
          message: `${unfinishedBreaks.length} break(s) not ended`,
          suggestion: 'End all breaks before clocking out'
        });
      }
    }
  }

  /**
   * Validation de la fréquence de pointage
   */
  private async validateClockingFrequency(
    context: ClockInValidationContext,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // TODO: Implémenter la validation de la fréquence de pointage
    // Vérifier s'il y a eu trop de tentatives de pointage récentes
  }

  /**
   * Validation du dispositif
   */
  private validateDevice(
    context: ClockInValidationContext | ClockOutValidationContext,
    warnings: ValidationWarning[]
  ): void {
    const { deviceInfo } = context;

    if (!deviceInfo) {
      warnings.push({
        field: 'device',
        code: 'NO_DEVICE_INFO',
        message: 'No device information provided',
        suggestion: 'Update your app to the latest version'
      });
      return;
    }

    // Validation de la cohérence du dispositif
    // TODO: Implémenter la validation du dispositif
  }

  /**
   * Vérifier si une localisation est dans une zone autorisée
   */
  private isLocationInAllowedArea(
    location: GeoLocation,
    allowedLocations: GeoLocation[],
    radius: number
  ): boolean {
    return allowedLocations.some(allowedLocation => {
      const distance = this.calculateDistance(location, allowedLocation);
      return distance <= radius;
    });
  }

  /**
   * Calculer la distance entre deux points géographiques
   */
  private calculateDistance(loc1: GeoLocation, loc2: GeoLocation): number {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = loc1.latitude * Math.PI / 180;
    const φ2 = loc2.latitude * Math.PI / 180;
    const Δφ = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const Δλ = (loc2.longitude - loc1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en mètres
  }

  /**
   * Convertir une chaîne de temps en minutes depuis minuit
   */
  private timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Valider les données d'une entrée de présence
   */
  validatePresenceEntryData(entry: Partial<PresenceEntry>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validation des champs requis
    if (!entry.employeeId) {
      errors.push({
        field: 'employeeId',
        code: 'MISSING_EMPLOYEE_ID',
        message: 'Employee ID is required',
        severity: 'error'
      });
    }

    if (!entry.date) {
      errors.push({
        field: 'date',
        code: 'MISSING_DATE',
        message: 'Date is required',
        severity: 'error'
      });
    }

    // Validation de la cohérence des heures
    if (entry.clockInTime && entry.clockOutTime) {
      if (entry.clockInTime >= entry.clockOutTime) {
        errors.push({
          field: 'clockOutTime',
          code: 'INVALID_TIME_ORDER',
          message: 'Clock-out time must be after clock-in time',
          severity: 'error'
        });
      }
    }

    // Validation des pauses
    if (entry.breakEntries) {
      entry.breakEntries.forEach((breakEntry, index) => {
        if (breakEntry.startTime && breakEntry.endTime) {
          if (breakEntry.startTime >= breakEntry.endTime) {
            errors.push({
              field: `breakEntries[${index}].endTime`,
              code: 'INVALID_BREAK_TIME_ORDER',
              message: 'Break end time must be after start time',
              severity: 'error'
            });
          }
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export { PresenceValidationService };
export const presenceValidationService = new PresenceValidationService();