/**
 * Modèle PresenceEntry pour le suivi de présence
 */

import { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import { BaseModel, ValidationError } from './base.model';
import { 
  BreakEntry, 
  GeoLocation, 
  PRESENCE_STATUS_LABELS, 
  PresenceEntry,
  PresenceStatus 
} from '../shared';

export class PresenceEntryModel extends BaseModel<PresenceEntry> {
  constructor(data: Partial<PresenceEntry>) {
    const presenceData = {
      ...data,
      status: data.status || PresenceStatus.ABSENT,
      isValidated: data.isValidated !== undefined ? data.isValidated : false,
      breakEntries: data.breakEntries || [],
      totalBreakTime: data.totalBreakTime || 0,
      actualWorkHours: data.actualWorkHours || 0,
      overtimeHours: data.overtimeHours || 0
    };

    super(presenceData);
  }

  // Getters spécifiques
  get employeeId(): string {
    return this.data.employeeId;
  }

  get organizationId(): string {
    return this.data.organizationId;
  }

  get date(): string {
    return this.data.date;
  }

  get clockInTime(): Date | undefined {
    return this.data.clockInTime;
  }

  get clockOutTime(): Date | undefined {
    return this.data.clockOutTime;
  }

  get status(): PresenceStatus {
    return this.data.status;
  }

  get isClocked(): boolean {
    return !!this.data.clockInTime && !this.data.clockOutTime;
  }

  get actualWorkHours(): number {
    return this.data.actualWorkHours || 0;
  }

  get overtimeHours(): number {
    return this.data.overtimeHours || 0;
  }

  get breakEntries(): BreakEntry[] {
    return this.data.breakEntries || [];
  }

  get totalBreakTime(): number {
    return this.data.totalBreakTime || 0;
  }

  get isValidated(): boolean {
    return this.data.isValidated;
  }

  // Méthodes de pointage
  public clockIn(location?: GeoLocation, notes?: string): void {
    if (this.data.clockInTime) {
      throw new ValidationError('Employee is already clocked in');
    }

    this.data.clockInTime = new Date();
    this.data.clockInLocation = location;
    if (notes) {
      this.data.notes = notes;
    }

    // Calculer le statut initial
    this.calculateStatus();
    this.updateTimestamp();
  }

  public clockOut(location?: GeoLocation, notes?: string): void {
    if (!this.data.clockInTime) {
      throw new ValidationError('Employee must clock in first');
    }

    if (this.data.clockOutTime) {
      throw new ValidationError('Employee is already clocked out');
    }

    this.data.clockOutTime = new Date();
    this.data.clockOutLocation = location;
    if (notes) {
      this.data.notes = (this.data.notes || '') + (notes ? ` | ${notes}` : '');
    }

    // Calculer les heures travaillées et le statut final
    this.calculateWorkHours();
    this.calculateStatus();
    this.updateTimestamp();
  }

  // Gestion des pauses
  public startBreak(type: 'lunch' | 'coffee' | 'personal' | 'other', location?: GeoLocation): string {
    if (!this.data.clockInTime || this.data.clockOutTime) {
      throw new ValidationError('Employee must be clocked in to start a break');
    }

    // Vérifier qu'il n'y a pas de pause en cours
    const activeBreak = this.breakEntries.find(b => !b.endTime);
    if (activeBreak) {
      throw new ValidationError('There is already an active break');
    }

    const breakId = `break_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const breakEntry: BreakEntry = {
      id: breakId,
      startTime: new Date(),
      type,
      location
    };

    if (!this.data.breakEntries) {
      this.data.breakEntries = [];
    }
    this.data.breakEntries.push(breakEntry);

    this.data.status = PresenceStatus.ON_BREAK;
    this.updateTimestamp();

    return breakId;
  }

  public endBreak(breakId: string, location?: GeoLocation): void {
    if (!this.data.breakEntries) {
      throw new ValidationError('No breaks found');
    }

    const breakIndex = this.data.breakEntries.findIndex(b => b.id === breakId);
    if (breakIndex === -1) {
      throw new ValidationError('Break not found');
    }

    const breakEntry = this.data.breakEntries[breakIndex];
    if (breakEntry.endTime) {
      throw new ValidationError('Break is already ended');
    }

    breakEntry.endTime = new Date();
    breakEntry.duration = Math.round((breakEntry.endTime.getTime() - breakEntry.startTime.getTime()) / (1000 * 60)); // en minutes

    if (location) {
      breakEntry.location = location;
    }

    // Recalculer le temps total de pause
    this.calculateTotalBreakTime();

    // Remettre le statut à présent si pas d'autre pause active
    const hasActiveBreak = this.data.breakEntries.some(b => !b.endTime);
    if (!hasActiveBreak) {
      this.data.status = PresenceStatus.PRESENT;
    }

    this.updateTimestamp();
  }

  // Calculs automatiques
  private calculateWorkHours(): void {
    if (!this.data.clockInTime || !this.data.clockOutTime) {
      return;
    }

    const workTimeMs = this.data.clockOutTime.getTime() - this.data.clockInTime.getTime();
    const totalBreakTimeMs = (this.data.totalBreakTime || 0) * 60 * 1000; // convertir minutes en ms
    const actualWorkTimeMs = workTimeMs - totalBreakTimeMs;

    this.data.actualWorkHours = Math.max(0, actualWorkTimeMs / (1000 * 60 * 60)); // en heures

    // Calculer les heures supplémentaires si on a les heures prévues
    if (this.data.scheduledWorkHours) {
      this.data.overtimeHours = Math.max(0, this.data.actualWorkHours - this.data.scheduledWorkHours);
    }
  }

  private calculateTotalBreakTime(): void {
    if (!this.data.breakEntries) {
      this.data.totalBreakTime = 0;
      return;
    }

    this.data.totalBreakTime = this.data.breakEntries
      .filter(b => b.duration !== undefined)
      .reduce((total, b) => total + (b.duration || 0), 0);
  }

  private calculateStatus(): void {
    // const now = new Date();

    // Si pas encore pointé
    if (!this.data.clockInTime) {
      this.data.status = PresenceStatus.ABSENT;
      return;
    }

    // Si en pause
    const hasActiveBreak = this.data.breakEntries?.some(b => !b.endTime);
    if (hasActiveBreak) {
      this.data.status = PresenceStatus.ON_BREAK;
      return;
    }

    // Si pas encore sorti
    if (!this.data.clockOutTime) {
      // Vérifier si en retard (si on a l'heure prévue)
      if (this.data.scheduledStartTime && this.data.clockInTime > this.data.scheduledStartTime) {
        this.data.status = PresenceStatus.LATE;
      } else {
        this.data.status = PresenceStatus.PRESENT;
      }
      return;
    }

    // Si déjà sorti, déterminer le statut final
    let finalStatus = PresenceStatus.PRESENT;

    // Vérifier si en retard
    if (this.data.scheduledStartTime && this.data.clockInTime > this.data.scheduledStartTime) {
      finalStatus = PresenceStatus.LATE;
    }

    // Vérifier si parti tôt
    if (this.data.scheduledEndTime && this.data.clockOutTime < this.data.scheduledEndTime) {
      finalStatus = PresenceStatus.EARLY_LEAVE;
    }

    // Vérifier les heures supplémentaires
    if (this.data.overtimeHours && this.data.overtimeHours > 0) {
      finalStatus = PresenceStatus.OVERTIME;
    }

    this.data.status = finalStatus;
  }

  // Méthodes de validation géographique
  public validateLocation(location: GeoLocation, allowedLocations: GeoLocation[], radius: number): boolean {
    if (!allowedLocations || allowedLocations.length === 0) {
      return true; // Pas de restriction de localisation
    }

    return allowedLocations.some(allowedLocation => {
      const distance = this.calculateDistance(location, allowedLocation);
      return distance <= radius;
    });
  }

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

  // Méthodes de validation et notes
  public validate(): Promise<boolean> {
    try {
      // Validation des champs requis
      BaseModel.validateRequired(this.data, [
        'employeeId',
        'organizationId',
        'date',
        'status'
      ]);

      // Validation du format de date
      if (!/^\d{4}-\d{2}-\d{2}$/.test(this.data.date)) {
        throw new ValidationError('Date must be in YYYY-MM-DD format');
      }

      // Validation du statut
      if (!Object.values(PresenceStatus).includes(this.data.status)) {
        throw new ValidationError('Invalid presence status');
      }

      // Validation des heures de pointage
      if (this.data.clockInTime && this.data.clockOutTime) {
        if (this.data.clockOutTime <= this.data.clockInTime) {
          throw new ValidationError('Clock out time must be after clock in time');
        }
      }

      // Validation des heures de travail
      if (this.data.actualWorkHours !== undefined && this.data.actualWorkHours < 0) {
        throw new ValidationError('Actual work hours cannot be negative');
      }

      if (this.data.scheduledWorkHours !== undefined && this.data.scheduledWorkHours < 0) {
        throw new ValidationError('Scheduled work hours cannot be negative');
      }

      if (this.data.overtimeHours !== undefined && this.data.overtimeHours < 0) {
        throw new ValidationError('Overtime hours cannot be negative');
      }

      // Validation des pauses
      if (this.data.breakEntries) {
        this.data.breakEntries.forEach((breakEntry, index) => {
          if (!breakEntry.id || !breakEntry.startTime) {
            throw new ValidationError(`Invalid break entry at index ${index}`);
          }

          if (breakEntry.endTime && breakEntry.endTime <= breakEntry.startTime) {
            throw new ValidationError(`Break end time must be after start time at index ${index}`);
          }

          if (breakEntry.duration !== undefined && breakEntry.duration < 0) {
            throw new ValidationError(`Break duration cannot be negative at index ${index}`);
          }
        });
      }

      // Validation des coordonnées géographiques
      if (this.data.clockInLocation) {
        this.validateGeoLocation(this.data.clockInLocation);
      }

      if (this.data.clockOutLocation) {
        this.validateGeoLocation(this.data.clockOutLocation);
      }

      return Promise.resolve(true);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Presence entry validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateGeoLocation(location: GeoLocation): void {
    if (typeof location.latitude !== 'number' || location.latitude < -90 || location.latitude > 90) {
      throw new ValidationError('Invalid latitude');
    }
    if (typeof location.longitude !== 'number' || location.longitude < -180 || location.longitude > 180) {
      throw new ValidationError('Invalid longitude');
    }
  }

  public addManagerNotes(notes: string, validatedBy: string): void {
    this.data.managerNotes = notes;
    this.data.validatedBy = validatedBy;
    this.data.validatedAt = new Date();
    this.data.isValidated = true;
    this.updateTimestamp();
  }

  public removeValidation(): void {
    this.data.isValidated = false;
    this.data.validatedBy = undefined;
    this.data.validatedAt = undefined;
    this.updateTimestamp();
  }

  // Méthodes utilitaires
  public getDuration(): number {
    if (!this.data.clockInTime || !this.data.clockOutTime) {
      return 0;
    }
    return (this.data.clockOutTime.getTime() - this.data.clockInTime.getTime()) / (1000 * 60 * 60); // en heures
  }

  public isLate(): boolean {
    return this.data.status === PresenceStatus.LATE;
  }

  public isEarlyLeave(): boolean {
    return this.data.status === PresenceStatus.EARLY_LEAVE;
  }

  public hasOvertime(): boolean {
    return (this.data.overtimeHours || 0) > 0;
  }

  public getStatusLabel(): string {
    return PRESENCE_STATUS_LABELS[this.data.status] || this.data.status;
  }

  // Conversion vers Firestore
  public toFirestore(): DocumentData {
    const data = {
      employeeId: this.data.employeeId,
      organizationId: this.data.organizationId,
      date: this.data.date,
      clockInTime: this.data.clockInTime || null,
      clockOutTime: this.data.clockOutTime || null,
      clockInLocation: this.data.clockInLocation || null,
      clockOutLocation: this.data.clockOutLocation || null,
      status: this.data.status,
      scheduledStartTime: this.data.scheduledStartTime || null,
      scheduledEndTime: this.data.scheduledEndTime || null,
      actualWorkHours: this.data.actualWorkHours || 0,
      scheduledWorkHours: this.data.scheduledWorkHours || null,
      overtimeHours: this.data.overtimeHours || 0,
      breakEntries: this.data.breakEntries || [],
      totalBreakTime: this.data.totalBreakTime || 0,
      notes: this.data.notes || null,
      managerNotes: this.data.managerNotes || null,
      isValidated: this.data.isValidated,
      validatedBy: this.data.validatedBy || null,
      validatedAt: this.data.validatedAt || null,
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt
    };

    return this.convertDatesToFirestore(data);
  }

  // Création depuis Firestore
  public static fromFirestore(doc: DocumentSnapshot): PresenceEntryModel | null {
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
    const presenceData = new PresenceEntryModel({}).convertDatesFromFirestore(convertedData) as PresenceEntry;

    return new PresenceEntryModel(presenceData);
  }

  // Méthodes de détection d'anomalies
  public detectAnomalies(): string[] {
    const anomalies: string[] = [];

    // Vérifier les pointages manqués
    if (!this.data.clockInTime && this.data.status !== PresenceStatus.ABSENT) {
      anomalies.push('missed_clock_in');
    }

    if (this.data.clockInTime && !this.data.clockOutTime && this.data.status !== PresenceStatus.ON_BREAK) {
      const now = new Date();
      const clockInDate = new Date(this.data.clockInTime);
      const hoursSinceClockIn = (now.getTime() - clockInDate.getTime()) / (1000 * 60 * 60);
      
      // Si plus de 12 heures depuis le pointage d'entrée
      if (hoursSinceClockIn > 12) {
        anomalies.push('missed_clock_out');
      }
    }

    // Vérifier les heures supplémentaires excessives
    if (this.data.overtimeHours && this.data.overtimeHours > 4) {
      anomalies.push('excessive_overtime');
    }

    // Vérifier les pauses trop longues
    if (this.data.breakEntries) {
      const longBreaks = this.data.breakEntries.filter(b => b.duration && b.duration > 120); // Plus de 2 heures
      if (longBreaks.length > 0) {
        anomalies.push('excessive_break_time');
      }
    }

    // Vérifier les horaires inhabituels
    if (this.data.clockInTime) {
      const clockInHour = this.data.clockInTime.getHours();
      if (clockInHour < 5 || clockInHour > 22) {
        anomalies.push('unusual_hours');
      }
    }

    // Vérifier les journées de travail trop courtes
    if (this.data.actualWorkHours && this.data.actualWorkHours < 2 && this.data.status === PresenceStatus.PRESENT) {
      anomalies.push('insufficient_work_hours');
    }

    return anomalies;
  }

  // Méthodes de calcul avancées
  public calculateEfficiency(): number {
    if (!this.data.scheduledWorkHours || this.data.scheduledWorkHours === 0) {
      return 1; // 100% si pas d'horaire prévu
    }

    const actualHours = this.data.actualWorkHours || 0;
    return Math.min(actualHours / this.data.scheduledWorkHours, 2); // Max 200%
  }

  public getWorkingTimeBreakdown(): {
    totalTime: number;
    workTime: number;
    breakTime: number;
    efficiency: number;
  } {
    const totalTime = this.getDuration();
    const breakTime = (this.data.totalBreakTime || 0) / 60; // Convertir en heures
    const workTime = this.data.actualWorkHours || 0;
    const efficiency = this.calculateEfficiency();

    return {
      totalTime,
      workTime,
      breakTime,
      efficiency
    };
  }

  // Méthodes de comparaison avec l'horaire prévu
  public getScheduleVariance(): {
    startVariance: number; // en minutes
    endVariance: number; // en minutes
    durationVariance: number; // en heures
  } {
    let startVariance = 0;
    let endVariance = 0;
    let durationVariance = 0;

    if (this.data.clockInTime && this.data.scheduledStartTime) {
      startVariance = (this.data.clockInTime.getTime() - this.data.scheduledStartTime.getTime()) / (1000 * 60);
    }

    if (this.data.clockOutTime && this.data.scheduledEndTime) {
      endVariance = (this.data.clockOutTime.getTime() - this.data.scheduledEndTime.getTime()) / (1000 * 60);
    }

    if (this.data.actualWorkHours && this.data.scheduledWorkHours) {
      durationVariance = this.data.actualWorkHours - this.data.scheduledWorkHours;
    }

    return {
      startVariance,
      endVariance,
      durationVariance
    };
  }

  // Méthodes de validation avancées
  public validateAgainstSchedule(workSchedule?: {
    startTime: string;
    endTime: string;
    breakDuration: number;
    gracePeriodsMinutes: { lateArrival: number; earlyDeparture: number };
  }): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];

    if (!workSchedule) {
      return { isValid: true, violations: [] };
    }

    // Vérifier l'heure d'arrivée
    if (this.data.clockInTime && this.data.scheduledStartTime) {
      const lateMinutes = (this.data.clockInTime.getTime() - this.data.scheduledStartTime.getTime()) / (1000 * 60);
      if (lateMinutes > workSchedule.gracePeriodsMinutes.lateArrival) {
        violations.push('late_arrival');
      }
    }

    // Vérifier l'heure de départ
    if (this.data.clockOutTime && this.data.scheduledEndTime) {
      const earlyMinutes = (this.data.scheduledEndTime.getTime() - this.data.clockOutTime.getTime()) / (1000 * 60);
      if (earlyMinutes > workSchedule.gracePeriodsMinutes.earlyDeparture) {
        violations.push('early_departure');
      }
    }

    // Vérifier la durée des pauses
    if (this.data.totalBreakTime && this.data.totalBreakTime > workSchedule.breakDuration + 15) {
      violations.push('excessive_break');
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  // Méthodes utilitaires supplémentaires
  public isWeekend(): boolean {
    const date = new Date(this.data.date);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Dimanche ou Samedi
  }

  public getWeekNumber(): number {
    const date = new Date(this.data.date);
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  public getMonthYear(): string {
    const date = new Date(this.data.date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  // Méthode pour l'API
  public toAPI(): Partial<PresenceEntry> {
    const apiData = super.toAPI();
    /*const breakdown = this.getWorkingTimeBreakdown();
    const variance = this.getScheduleVariance();
    const anomalies = this.detectAnomalies();
*/
    return {
      ...apiData,
      // duration: this.getDuration(),
      statusLabel: this.getStatusLabel(),
      /*isLate: this.isLate(),
      isEarlyLeave: this.isEarlyLeave(),
      hasOvertime: this.hasOvertime(),
      isClocked: this.isClocked,
      workingTimeBreakdown: breakdown,
      scheduleVariance: variance,
      anomalies,
      efficiency: breakdown.efficiency,
      isWeekend: this.isWeekend(),
      weekNumber: this.getWeekNumber(),
      monthYear: this.getMonthYear()*/
    };
  }
}