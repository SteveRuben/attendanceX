/**
 * Modèle pour les paramètres de présence de l'organisation
 */

import { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import { BaseModel, ValidationError } from './base.model';
import { GeoLocation, VALIDATION_LIMITS } from '../shared';

export interface OrganizationPresenceSettings {
  id?: string;
  organizationId: string;
  
  // Paramètres généraux
  workingDaysPerWeek: number;
  standardWorkHours: number;
  
  // Géolocalisation
  requireGeolocation: boolean;
  allowedLocationRadius: number; // en mètres
  organizationLocations: GeoLocation[];
  
  // Périodes de grâce
  gracePeriodsMinutes: {
    lateArrival: number;
    earlyDeparture: number;
  };
  
  // Paramètres de notifications
  notificationSettings: {
    missedClockIn: boolean;
    missedClockOut: boolean;
    overtime: boolean;
    leaveRequests: boolean;
    reminderTimes: {
      clockInReminder: string; // Format HH:MM
      clockOutReminder: string; // Format HH:MM
    };
  };
  
  // Workflow d'approbation des congés
  leaveApprovalWorkflow: {
    requiresApproval: boolean;
    approverRoles: string[];
    autoApproveThreshold: number; // en jours
    escalationRules: {
      enabled: boolean;
      escalateAfterHours: number;
      escalateToRoles: string[];
    };
  };
  
  // Paramètres d'heures supplémentaires
  overtimeSettings: {
    enabled: boolean;
    requiresApproval: boolean;
    maxDailyOvertime: number; // en heures
    maxWeeklyOvertime: number; // en heures
    overtimeRates: {
      weekday: number; // multiplicateur (ex: 1.5)
      weekend: number;
      holiday: number;
    };
  };
  
  // Paramètres de pause
  breakSettings: {
    enforceBreaks: boolean;
    minimumBreakDuration: number; // en minutes
    maximumBreakDuration: number; // en minutes
    requiredBreaksPerDay: number;
    breakTypes: {
      id: string;
      name: string;
      duration: number;
      required: boolean;
    }[];
  };
  
  // Paramètres de validation
  validationSettings: {
    requireManagerValidation: boolean;
    autoValidateAfterDays: number;
    allowSelfCorrection: boolean;
    correctionTimeLimit: number; // en heures
  };
  
  // Intégrations
  integrationSettings: {
    biometricEnabled: boolean;
    nfcEnabled: boolean;
    qrCodeEnabled: boolean;
    mobileAppRequired: boolean;
    allowWebClockIn: boolean;
  };
  
  // Paramètres de sécurité
  securitySettings: {
    ipWhitelist: string[];
    deviceRestriction: boolean;
    allowedDevices: string[];
    sessionTimeout: number; // en minutes
    maxConcurrentSessions: number;
  };
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

export class OrganizationPresenceSettingsModel extends BaseModel<OrganizationPresenceSettings> {
  constructor(data: Partial<OrganizationPresenceSettings>) {
    const settingsData = {
      ...data,
      workingDaysPerWeek: data.workingDaysPerWeek || 5,
      standardWorkHours: data.standardWorkHours || 8,
      requireGeolocation: data.requireGeolocation !== undefined ? data.requireGeolocation : false,
      allowedLocationRadius: data.allowedLocationRadius || 100,
      organizationLocations: data.organizationLocations || [],
      gracePeriodsMinutes: {
        lateArrival: 15,
        earlyDeparture: 15,
        ...data.gracePeriodsMinutes
      },
      notificationSettings: {
        missedClockIn: true,
        missedClockOut: true,
        overtime: true,
        leaveRequests: true,
        reminderTimes: {
          clockInReminder: '09:15',
          clockOutReminder: '17:15'
        },
        ...data.notificationSettings
      },
      leaveApprovalWorkflow: {
        requiresApproval: true,
        approverRoles: ['manager', 'hr'],
        autoApproveThreshold: 0,
        escalationRules: {
          enabled: false,
          escalateAfterHours: 24,
          escalateToRoles: ['hr', 'admin']
        },
        ...data.leaveApprovalWorkflow
      },
      overtimeSettings: {
        enabled: true,
        requiresApproval: true,
        maxDailyOvertime: 4,
        maxWeeklyOvertime: 12,
        overtimeRates: {
          weekday: 1.5,
          weekend: 2.0,
          holiday: 2.5
        },
        ...data.overtimeSettings
      },
      breakSettings: {
        enforceBreaks: false,
        minimumBreakDuration: 15,
        maximumBreakDuration: 120,
        requiredBreaksPerDay: 1,
        breakTypes: [
          { id: 'lunch', name: 'Pause déjeuner', duration: 60, required: true },
          { id: 'coffee', name: 'Pause café', duration: 15, required: false }
        ],
        ...data.breakSettings
      },
      validationSettings: {
        requireManagerValidation: false,
        autoValidateAfterDays: 7,
        allowSelfCorrection: true,
        correctionTimeLimit: 24,
        ...data.validationSettings
      },
      integrationSettings: {
        biometricEnabled: false,
        nfcEnabled: false,
        qrCodeEnabled: false,
        mobileAppRequired: false,
        allowWebClockIn: true,
        ...data.integrationSettings
      },
      securitySettings: {
        ipWhitelist: [],
        deviceRestriction: false,
        allowedDevices: [],
        sessionTimeout: 480, // 8 heures
        maxConcurrentSessions: 3,
        ...data.securitySettings
      }
    };

    super(settingsData);
  }

  // Getters spécifiques
  get organizationId(): string {
    return this.data.organizationId;
  }

  get workingDaysPerWeek(): number {
    return this.data.workingDaysPerWeek;
  }

  get standardWorkHours(): number {
    return this.data.standardWorkHours;
  }

  get requireGeolocation(): boolean {
    return this.data.requireGeolocation;
  }

  get allowedLocationRadius(): number {
    return this.data.allowedLocationRadius;
  }

  get gracePeriodsMinutes(): { lateArrival: number; earlyDeparture: number } {
    return this.data.gracePeriodsMinutes;
  }

  // Méthodes de gestion des paramètres
  public updateGeneralSettings(settings: {
    workingDaysPerWeek?: number;
    standardWorkHours?: number;
  }): void {
    if (settings.workingDaysPerWeek !== undefined) {
      this.data.workingDaysPerWeek = settings.workingDaysPerWeek;
    }
    if (settings.standardWorkHours !== undefined) {
      this.data.standardWorkHours = settings.standardWorkHours;
    }
    this.updateTimestamp();
  }

  public updateGeolocationSettings(settings: {
    requireGeolocation?: boolean;
    allowedLocationRadius?: number;
    organizationLocations?: GeoLocation[];
  }): void {
    if (settings.requireGeolocation !== undefined) {
      this.data.requireGeolocation = settings.requireGeolocation;
    }
    if (settings.allowedLocationRadius !== undefined) {
      this.data.allowedLocationRadius = settings.allowedLocationRadius;
    }
    if (settings.organizationLocations !== undefined) {
      this.data.organizationLocations = settings.organizationLocations;
    }
    this.updateTimestamp();
  }

  public updateGracePeriods(lateArrival?: number, earlyDeparture?: number): void {
    if (lateArrival !== undefined) {
      this.data.gracePeriodsMinutes.lateArrival = lateArrival;
    }
    if (earlyDeparture !== undefined) {
      this.data.gracePeriodsMinutes.earlyDeparture = earlyDeparture;
    }
    this.updateTimestamp();
  }

  public updateNotificationSettings(settings: Partial<OrganizationPresenceSettings['notificationSettings']>): void {
    this.data.notificationSettings = {
      ...this.data.notificationSettings,
      ...settings
    };
    this.updateTimestamp();
  }

  public updateLeaveApprovalWorkflow(settings: Partial<OrganizationPresenceSettings['leaveApprovalWorkflow']>): void {
    this.data.leaveApprovalWorkflow = {
      ...this.data.leaveApprovalWorkflow,
      ...settings
    };
    this.updateTimestamp();
  }

  public updateOvertimeSettings(settings: Partial<OrganizationPresenceSettings['overtimeSettings']>): void {
    this.data.overtimeSettings = {
      ...this.data.overtimeSettings,
      ...settings
    };
    this.updateTimestamp();
  }

  public updateBreakSettings(settings: Partial<OrganizationPresenceSettings['breakSettings']>): void {
    this.data.breakSettings = {
      ...this.data.breakSettings,
      ...settings
    };
    this.updateTimestamp();
  }

  public updateValidationSettings(settings: Partial<OrganizationPresenceSettings['validationSettings']>): void {
    this.data.validationSettings = {
      ...this.data.validationSettings,
      ...settings
    };
    this.updateTimestamp();
  }

  public updateIntegrationSettings(settings: Partial<OrganizationPresenceSettings['integrationSettings']>): void {
    this.data.integrationSettings = {
      ...this.data.integrationSettings,
      ...settings
    };
    this.updateTimestamp();
  }

  public updateSecuritySettings(settings: Partial<OrganizationPresenceSettings['securitySettings']>): void {
    this.data.securitySettings = {
      ...this.data.securitySettings,
      ...settings
    };
    this.updateTimestamp();
  }

  // Méthodes de validation
  public async validate(): Promise<boolean> {
    try {
      // Validation des champs requis
      BaseModel.validateRequired(this.data, [
        'organizationId',
        'workingDaysPerWeek',
        'standardWorkHours'
      ]);

      // Validation des jours de travail par semaine
      if (this.data.workingDaysPerWeek < 1 || this.data.workingDaysPerWeek > 7) {
        throw new ValidationError('Working days per week must be between 1 and 7');
      }

      // Validation des heures de travail standard
      if (this.data.standardWorkHours < VALIDATION_LIMITS.minWorkHours || 
          this.data.standardWorkHours > VALIDATION_LIMITS.maxWorkHours) {
        throw new ValidationError(`Standard work hours must be between ${VALIDATION_LIMITS.minWorkHours} and ${VALIDATION_LIMITS.maxWorkHours}`);
      }

      // Validation du rayon de localisation
      if (this.data.allowedLocationRadius < 1 || 
          this.data.allowedLocationRadius > VALIDATION_LIMITS.maxLocationRadius) {
        throw new ValidationError(`Location radius must be between 1 and ${VALIDATION_LIMITS.maxLocationRadius} meters`);
      }

      // Validation des périodes de grâce
      if (this.data.gracePeriodsMinutes.lateArrival < 0 || 
          this.data.gracePeriodsMinutes.lateArrival > VALIDATION_LIMITS.maxGracePeriod) {
        throw new ValidationError(`Late arrival grace period must be between 0 and ${VALIDATION_LIMITS.maxGracePeriod} minutes`);
      }

      if (this.data.gracePeriodsMinutes.earlyDeparture < 0 || 
          this.data.gracePeriodsMinutes.earlyDeparture > VALIDATION_LIMITS.maxGracePeriod) {
        throw new ValidationError(`Early departure grace period must be between 0 and ${VALIDATION_LIMITS.maxGracePeriod} minutes`);
      }

      // Validation des localisations de l'organisation
      if (this.data.organizationLocations) {
        this.data.organizationLocations.forEach((location, index) => {
          if (typeof location.latitude !== 'number' || 
              location.latitude < -90 || location.latitude > 90) {
            throw new ValidationError(`Invalid latitude for organization location ${index + 1}`);
          }
          if (typeof location.longitude !== 'number' || 
              location.longitude < -180 || location.longitude > 180) {
            throw new ValidationError(`Invalid longitude for organization location ${index + 1}`);
          }
        });
      }

      // Validation des paramètres d'heures supplémentaires
      if (this.data.overtimeSettings.maxDailyOvertime < 0 || 
          this.data.overtimeSettings.maxDailyOvertime > VALIDATION_LIMITS.maxOvertimeHours) {
        throw new ValidationError(`Max daily overtime must be between 0 and ${VALIDATION_LIMITS.maxOvertimeHours} hours`);
      }

      // Validation des paramètres de pause
      if (this.data.breakSettings.minimumBreakDuration < 1 || 
          this.data.breakSettings.minimumBreakDuration > VALIDATION_LIMITS.maxBreakDuration) {
        throw new ValidationError(`Minimum break duration must be between 1 and ${VALIDATION_LIMITS.maxBreakDuration} minutes`);
      }

      if (this.data.breakSettings.maximumBreakDuration < this.data.breakSettings.minimumBreakDuration || 
          this.data.breakSettings.maximumBreakDuration > VALIDATION_LIMITS.maxBreakDuration) {
        throw new ValidationError(`Maximum break duration must be between minimum break duration and ${VALIDATION_LIMITS.maxBreakDuration} minutes`);
      }

      // Validation des heures de rappel
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(this.data.notificationSettings.reminderTimes.clockInReminder)) {
        throw new ValidationError('Invalid clock-in reminder time format');
      }
      if (!timeRegex.test(this.data.notificationSettings.reminderTimes.clockOutReminder)) {
        throw new ValidationError('Invalid clock-out reminder time format');
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Settings validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Méthodes utilitaires
  public isGeolocationRequired(): boolean {
    return this.data.requireGeolocation;
  }

  public isOvertimeEnabled(): boolean {
    return this.data.overtimeSettings.enabled;
  }

  public requiresLeaveApproval(days: number): boolean {
    if (!this.data.leaveApprovalWorkflow.requiresApproval) {
      return false;
    }
    return days > this.data.leaveApprovalWorkflow.autoApproveThreshold;
  }

  public getOvertimeRate(dayType: 'weekday' | 'weekend' | 'holiday'): number {
    return this.data.overtimeSettings.overtimeRates[dayType];
  }

  public getRequiredBreaks(): OrganizationPresenceSettings['breakSettings']['breakTypes'] {
    return this.data.breakSettings.breakTypes.filter(breakType => breakType.required);
  }

  // Conversion vers Firestore
  public toFirestore(): DocumentData {
    const data = {
      organizationId: this.data.organizationId,
      workingDaysPerWeek: this.data.workingDaysPerWeek,
      standardWorkHours: this.data.standardWorkHours,
      requireGeolocation: this.data.requireGeolocation,
      allowedLocationRadius: this.data.allowedLocationRadius,
      organizationLocations: this.data.organizationLocations,
      gracePeriodsMinutes: this.data.gracePeriodsMinutes,
      notificationSettings: this.data.notificationSettings,
      leaveApprovalWorkflow: this.data.leaveApprovalWorkflow,
      overtimeSettings: this.data.overtimeSettings,
      breakSettings: this.data.breakSettings,
      validationSettings: this.data.validationSettings,
      integrationSettings: this.data.integrationSettings,
      securitySettings: this.data.securitySettings,
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt,
      updatedBy: this.data.updatedBy
    };

    return this.convertDatesToFirestore(data);
  }

  // Création depuis Firestore
  public static fromFirestore(doc: DocumentSnapshot): OrganizationPresenceSettingsModel | null {
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
    const settingsData = new OrganizationPresenceSettingsModel({}).convertDatesFromFirestore(convertedData) as OrganizationPresenceSettings;

    return new OrganizationPresenceSettingsModel(settingsData);
  }
}