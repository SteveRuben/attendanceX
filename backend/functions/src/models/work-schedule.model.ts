/**
 * Modèle WorkSchedule pour la gestion des horaires de travail
 */

import { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import { BaseModel, ValidationError } from './base.model';
import { DaySchedule, ScheduleType, WorkSchedule } from '../common/types';
import { DEFAULT_WORK_SCHEDULE, VALIDATION_LIMITS } from '../common/constants';


export class WorkScheduleModel extends BaseModel<WorkSchedule> {
  constructor(data: Partial<WorkSchedule>) {
    const scheduleData = {
      ...data,
      type: data.type || ScheduleType.FIXED,
      weeklySchedule: data.weeklySchedule || DEFAULT_WORK_SCHEDULE.weeklySchedule,
      defaultBreakDuration: data.defaultBreakDuration || DEFAULT_WORK_SCHEDULE.defaultBreakDuration,
      maxOvertimeHours: data.maxOvertimeHours || DEFAULT_WORK_SCHEDULE.maxOvertimeHours,
      gracePeriodsMinutes: data.gracePeriodsMinutes || DEFAULT_WORK_SCHEDULE.gracePeriodsMinutes,
      isActive: data.isActive !== undefined ? data.isActive : true
    };

    super(scheduleData);
  }

  // Getters spécifiques
  get name(): string {
    return this.data.name;
  }

  get tenantId():string{
    return this.data.tenantId;
  }

  get type(): ScheduleType {
    return this.data.type;
  }

  get weeklySchedule(): Record<number, DaySchedule> {
    return this.data.weeklySchedule;
  }

  get defaultBreakDuration(): number {
    return this.data.defaultBreakDuration;
  }

  get maxOvertimeHours(): number {
    return this.data.maxOvertimeHours;
  }

  get gracePeriodsMinutes(): { lateArrival: number; earlyDeparture: number } {
    return this.data.gracePeriodsMinutes;
  }

  get effectiveFrom(): Date {
    return this.data.effectiveFrom;
  }

  get effectiveTo(): Date | undefined {
    return this.data.effectiveTo;
  }

  get isActive(): boolean {
    return this.data.isActive;
  }

  get createdBy(): string {
    return this.data.createdBy;
  }

  // Méthodes de gestion des horaires
  public getDaySchedule(dayOfWeek: number): DaySchedule | undefined {
    return this.data.weeklySchedule[dayOfWeek];
  }

  public setDaySchedule(dayOfWeek: number, schedule: DaySchedule): void {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new ValidationError('Day of week must be between 0 (Sunday) and 6 (Saturday)');
    }

    this.validateDaySchedule(schedule);
    
    if (!this.data.weeklySchedule) {
      this.data.weeklySchedule = {};
    }
    
    this.data.weeklySchedule[dayOfWeek] = schedule;
    this.updateTimestamp();
  }

  public updateDaySchedule(dayOfWeek: number, updates: Partial<DaySchedule>): void {
    const currentSchedule = this.getDaySchedule(dayOfWeek);
    if (!currentSchedule) {
      throw new ValidationError(`No schedule found for day ${dayOfWeek}`);
    }

    const updatedSchedule = { ...currentSchedule, ...updates };
    this.setDaySchedule(dayOfWeek, updatedSchedule);
  }

  public removeDaySchedule(dayOfWeek: number): void {
    if (this.data.weeklySchedule && this.data.weeklySchedule[dayOfWeek]) {
      delete this.data.weeklySchedule[dayOfWeek];
      this.updateTimestamp();
    }
  }

  // Méthodes de validation des horaires
  private validateDaySchedule(schedule: DaySchedule): void {
    if (schedule.isWorkDay) {
      if (!schedule.startTime || !schedule.endTime) {
        throw new ValidationError('Work days must have start and end times');
      }

      if (!this.isValidTimeFormat(schedule.startTime) || !this.isValidTimeFormat(schedule.endTime)) {
        throw new ValidationError('Time must be in HH:MM format');
      }

      if (!this.isEndTimeAfterStartTime(schedule.startTime, schedule.endTime)) {
        throw new ValidationError('End time must be after start time');
      }

      if (schedule.breakDuration !== undefined) {
        if (schedule.breakDuration < 0 || schedule.breakDuration > VALIDATION_LIMITS.maxBreakDuration) {
          throw new ValidationError(`Break duration must be between 0 and ${VALIDATION_LIMITS.maxBreakDuration} minutes`);
        }
      }

      // Validation des fenêtres flexibles
      if (schedule.flexibleStartWindow) {
        if (!this.isValidTimeFormat(schedule.flexibleStartWindow.earliest) || 
            !this.isValidTimeFormat(schedule.flexibleStartWindow.latest)) {
          throw new ValidationError('Flexible start window times must be in HH:MM format');
        }
        if (!this.isEndTimeAfterStartTime(schedule.flexibleStartWindow.earliest, schedule.flexibleStartWindow.latest)) {
          throw new ValidationError('Flexible start window latest time must be after earliest time');
        }
      }

      if (schedule.flexibleEndWindow) {
        if (!this.isValidTimeFormat(schedule.flexibleEndWindow.earliest) || 
            !this.isValidTimeFormat(schedule.flexibleEndWindow.latest)) {
          throw new ValidationError('Flexible end window times must be in HH:MM format');
        }
        if (!this.isEndTimeAfterStartTime(schedule.flexibleEndWindow.earliest, schedule.flexibleEndWindow.latest)) {
          throw new ValidationError('Flexible end window latest time must be after earliest time');
        }
      }
    }
  }

  private isValidTimeFormat(time: string): boolean {
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  }

  private isEndTimeAfterStartTime(startTime: string, endTime: string): boolean {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    return end > start;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Méthodes de calcul
  public getWorkingDays(): number[] {
    return Object.entries(this.data.weeklySchedule)
      .filter(([, schedule]) => schedule.isWorkDay)
      .map(([day]) => parseInt(day));
  }

  public getTotalWeeklyHours(): number {
    return Object.values(this.data.weeklySchedule)
      .filter(schedule => schedule.isWorkDay)
      .reduce((total, schedule) => {
        if (schedule.startTime && schedule.endTime) {
          const startMinutes = this.timeToMinutes(schedule.startTime);
          const endMinutes = this.timeToMinutes(schedule.endTime);
          const workMinutes = endMinutes - startMinutes - (schedule.breakDuration || 0);
          return total + (workMinutes / 60);
        }
        return total;
      }, 0);
  }

  public getDailyWorkHours(dayOfWeek: number): number {
    const schedule = this.getDaySchedule(dayOfWeek);
    if (!schedule || !schedule.isWorkDay || !schedule.startTime || !schedule.endTime) {
      return 0;
    }

    const startMinutes = this.timeToMinutes(schedule.startTime);
    const endMinutes = this.timeToMinutes(schedule.endTime);
    const workMinutes = endMinutes - startMinutes - (schedule.breakDuration || 0);
    return workMinutes / 60;
  }

  // Méthodes de gestion de la validité
  public activate(): void {
    this.data.isActive = true;
    this.updateTimestamp();
  }

  public deactivate(): void {
    this.data.isActive = false;
    this.updateTimestamp();
  }

  public setEffectivePeriod(from: Date, to?: Date): void {
    if (to && to <= from) {
      throw new ValidationError('Effective end date must be after start date');
    }

    this.data.effectiveFrom = from;
    this.data.effectiveTo = to;
    this.updateTimestamp();
  }

  public isEffectiveOn(date: Date): boolean {
    if (date < this.data.effectiveFrom) {
      return false;
    }

    if (this.data.effectiveTo && date > this.data.effectiveTo) {
      return false;
    }

    return this.data.isActive;
  }

  // Méthodes de configuration
  public updateBreakSettings(defaultBreakDuration: number, maxOvertimeHours: number): void {
    if (defaultBreakDuration < 0 || defaultBreakDuration > VALIDATION_LIMITS.maxBreakDuration) {
      throw new ValidationError(`Default break duration must be between 0 and ${VALIDATION_LIMITS.maxBreakDuration} minutes`);
    }

    if (maxOvertimeHours < 0 || maxOvertimeHours > VALIDATION_LIMITS.maxOvertimeHours) {
      throw new ValidationError(`Max overtime hours must be between 0 and ${VALIDATION_LIMITS.maxOvertimeHours} hours`);
    }

    this.data.defaultBreakDuration = defaultBreakDuration;
    this.data.maxOvertimeHours = maxOvertimeHours;
    this.updateTimestamp();
  }

  public updateGracePeriods(lateArrival: number, earlyDeparture: number): void {
    if (lateArrival < 0 || lateArrival > VALIDATION_LIMITS.maxGracePeriod) {
      throw new ValidationError(`Late arrival grace period must be between 0 and ${VALIDATION_LIMITS.maxGracePeriod} minutes`);
    }

    if (earlyDeparture < 0 || earlyDeparture > VALIDATION_LIMITS.maxGracePeriod) {
      throw new ValidationError(`Early departure grace period must be between 0 and ${VALIDATION_LIMITS.maxGracePeriod} minutes`);
    }

    this.data.gracePeriodsMinutes = {
      lateArrival,
      earlyDeparture
    };
    this.updateTimestamp();
  }

  // Méthodes de vérification des conflits
  public hasConflictWith(otherSchedule: WorkScheduleModel): boolean {
    // Vérifier les périodes d'efficacité
    const thisStart = this.data.effectiveFrom;
    const thisEnd = this.data.effectiveTo || new Date(2099, 11, 31);
    const otherStart = otherSchedule.effectiveFrom;
    const otherEnd = otherSchedule.effectiveTo || new Date(2099, 11, 31);

    // Pas de conflit si les périodes ne se chevauchent pas
    if (thisEnd <= otherStart || otherEnd <= thisStart) {
      return false;
    }

    // Si les périodes se chevauchent, il y a conflit
    return true;
  }

  // Méthodes utilitaires pour les employés
  public getScheduleForDate(date: Date): DaySchedule | null {
    if (!this.isEffectiveOn(date)) {
      return null;
    }

    const dayOfWeek = date.getDay();
    return this.getDaySchedule(dayOfWeek) || null;
  }

  public isWorkingDay(date: Date): boolean {
    const schedule = this.getScheduleForDate(date);
    return schedule ? schedule.isWorkDay : false;
  }

  public getExpectedWorkHours(date: Date): number {
    const schedule = this.getScheduleForDate(date);
    if (!schedule || !schedule.isWorkDay) {
      return 0;
    }

    return this.getDailyWorkHours(date.getDay());
  }

  // Validation
  public async validate(): Promise<boolean> {
    try {
      // Validation des champs requis
      BaseModel.validateRequired(this.data, [
        'name',
        'tenantId',
        'type',
        'weeklySchedule',
        'defaultBreakDuration',
        'maxOvertimeHours',
        'gracePeriodsMinutes',
        'effectiveFrom',
        'isActive',
        'createdBy'
      ]);

      // Validation du nom
      if (!this.data.name || this.data.name.trim().length === 0) {
        throw new ValidationError('Schedule name is required');
      }

      if (this.data.name.length > 100) {
        throw new ValidationError('Schedule name must be 100 characters or less');
      }

      // Validation du type
      if (!Object.values(ScheduleType).includes(this.data.type)) {
        throw new ValidationError('Invalid schedule type');
      }

      // Validation des paramètres numériques
      if (this.data.defaultBreakDuration < 0 || this.data.defaultBreakDuration > VALIDATION_LIMITS.maxBreakDuration) {
        throw new ValidationError(`Default break duration must be between 0 and ${VALIDATION_LIMITS.maxBreakDuration} minutes`);
      }

      if (this.data.maxOvertimeHours < 0 || this.data.maxOvertimeHours > VALIDATION_LIMITS.maxOvertimeHours) {
        throw new ValidationError(`Max overtime hours must be between 0 and ${VALIDATION_LIMITS.maxOvertimeHours} hours`);
      }

      // Validation des périodes de grâce
      if (this.data.gracePeriodsMinutes.lateArrival < 0 || this.data.gracePeriodsMinutes.lateArrival > VALIDATION_LIMITS.maxGracePeriod) {
        throw new ValidationError(`Late arrival grace period must be between 0 and ${VALIDATION_LIMITS.maxGracePeriod} minutes`);
      }

      if (this.data.gracePeriodsMinutes.earlyDeparture < 0 || this.data.gracePeriodsMinutes.earlyDeparture > VALIDATION_LIMITS.maxGracePeriod) {
        throw new ValidationError(`Early departure grace period must be between 0 and ${VALIDATION_LIMITS.maxGracePeriod} minutes`);
      }

      // Validation des dates d'efficacité
      if (!BaseModel.validateDate(this.data.effectiveFrom)) {
        throw new ValidationError('Invalid effective from date');
      }

      if (this.data.effectiveTo) {
        if (!BaseModel.validateDate(this.data.effectiveTo)) {
          throw new ValidationError('Invalid effective to date');
        }

        if (this.data.effectiveTo <= this.data.effectiveFrom) {
          throw new ValidationError('Effective end date must be after start date');
        }
      }

      // Validation de l'horaire hebdomadaire
      if (!this.data.weeklySchedule || Object.keys(this.data.weeklySchedule).length === 0) {
        throw new ValidationError('Weekly schedule is required');
      }

      // Validation de chaque jour de la semaine
      Object.entries(this.data.weeklySchedule).forEach(([dayStr, schedule]) => {
        const day = parseInt(dayStr);
        if (day < 0 || day > 6) {
          throw new ValidationError(`Invalid day of week: ${day}`);
        }

        this.validateDaySchedule(schedule);
      });

      // Vérifier qu'il y a au moins un jour de travail
      const workingDays = this.getWorkingDays();
      if (workingDays.length === 0) {
        throw new ValidationError('Schedule must have at least one working day');
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Work schedule validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Conversion vers Firestore
  public toFirestore(): DocumentData {
    const data = {
      name: this.data.name,
      tenantId: this.data.tenantId,
      type: this.data.type,
      weeklySchedule: this.data.weeklySchedule,
      defaultBreakDuration: this.data.defaultBreakDuration,
      maxOvertimeHours: this.data.maxOvertimeHours,
      gracePeriodsMinutes: this.data.gracePeriodsMinutes,
      effectiveFrom: this.data.effectiveFrom,
      effectiveTo: this.data.effectiveTo || null,
      isActive: this.data.isActive,
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt,
      createdBy: this.data.createdBy
    };

    return this.convertDatesToFirestore(data);
  }

  // Création depuis Firestore
  public static fromFirestore(doc: DocumentSnapshot): WorkScheduleModel | null {
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
    const scheduleData = new WorkScheduleModel({}).convertDatesFromFirestore(convertedData) as WorkSchedule;

    return new WorkScheduleModel(scheduleData);
  }

  // Méthode pour l'API
  public toAPI(): Partial<WorkSchedule> {
    const apiData = super.toAPI();
    return {
      ...apiData,
      workingDays: this.getWorkingDays(),
      // totalWeeklyHours: this.getTotalWeeklyHours(),
      // isCurrentlyEffective: this.isEffectiveOn(new Date())
    };
  }

  // Méthodes de clonage et templates
  public cloneWithName(newName: string, tenantId?: string): WorkScheduleModel {

    const clonedData: Partial<WorkSchedule> = {
      name: newName,
      tenantId: tenantId || this.data.tenantId,
      type: this.data.type,
      weeklySchedule: JSON.parse(JSON.stringify(this.data.weeklySchedule)), // Deep copy
      defaultBreakDuration: this.data.defaultBreakDuration,
      maxOvertimeHours: this.data.maxOvertimeHours,
      gracePeriodsMinutes: { ...this.data.gracePeriodsMinutes },
      effectiveFrom: new Date(),
      isActive: true,
      createdBy: this.data.createdBy
    };

    return new WorkScheduleModel(clonedData);
  }

  public createTemplate(): Partial<WorkSchedule> {
    return {
      name: `${this.data.name} (Template)`,
      type: this.data.type,
      weeklySchedule: JSON.parse(JSON.stringify(this.data.weeklySchedule)),
      defaultBreakDuration: this.data.defaultBreakDuration,
      maxOvertimeHours: this.data.maxOvertimeHours,
      gracePeriodsMinutes: { ...this.data.gracePeriodsMinutes }
    };
  }
}