/**
 * Modèle TimeEntry pour la gestion des entrées de temps
 */

import { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import { BaseModel, ValidationError } from './base.model';
import { TimeEntry, TimeEntryStatus, TimeEntryInput } from '../common/types';

export class TimeEntryModel extends BaseModel<TimeEntry> {
  constructor(data: Partial<TimeEntry>) {
    const timeEntryData = {
      ...data,
      status: data.status || TimeEntryStatus.DRAFT,
      billable: data.billable !== undefined ? data.billable : true,
      duration: data.duration || 0,
      description: data.description || '',
      tags: data.tags || [],
      metadata: data.metadata || {
        source: 'manual'
      }
    };

    super(timeEntryData);
  }

  // Getters spécifiques
  get employeeId(): string {
    return this.data.employeeId;
  }

  get tenantId(): string {
    return this.data.tenantId;
  }

  get timesheetId(): string {
    return this.data.timesheetId;
  }

  get projectId(): string | undefined {
    return this.data.projectId;
  }

  get activityCodeId(): string | undefined {
    return this.data.activityCodeId;
  }

  get date(): string {
    return this.data.date;
  }

  get startTime(): Date | undefined {
    return this.data.startTime;
  }

  get endTime(): Date | undefined {
    return this.data.endTime;
  }

  get duration(): number {
    return this.data.duration;
  }

  get description(): string {
    return this.data.description;
  }

  get billable(): boolean {
    return this.data.billable;
  }

  get hourlyRate(): number | undefined {
    return this.data.hourlyRate;
  }

  get totalCost(): number | undefined {
    return this.data.totalCost;
  }

  get status(): TimeEntryStatus {
    return this.data.status;
  }

  get tags(): string[] {
    return this.data.tags || [];
  }

  get isEditable(): boolean {
    return this.data.status === TimeEntryStatus.DRAFT || this.data.status === TimeEntryStatus.REJECTED;
  }

  get isDraft(): boolean {
    return this.data.status === TimeEntryStatus.DRAFT;
  }

  get isApproved(): boolean {
    return this.data.status === TimeEntryStatus.APPROVED;
  }

  // Méthodes de calcul de durée
  public calculateDurationFromTimes(): number {
    if (!this.data.startTime || !this.data.endTime) {
      return 0;
    }

    if (this.data.endTime <= this.data.startTime) {
      throw new ValidationError('End time must be after start time');
    }

    const durationMs = this.data.endTime.getTime() - this.data.startTime.getTime();
    return Math.round(durationMs / (1000 * 60)); // Convertir en minutes
  }

  public setDurationFromTimes(): void {
    const calculatedDuration = this.calculateDurationFromTimes();
    this.data.duration = calculatedDuration;
    this.updateTimestamp();
  }

  public setTimesFromDuration(startTime: Date): void {
    if (!startTime) {
      throw new ValidationError('Start time is required to calculate end time');
    }

    if (this.data.duration <= 0) {
      throw new ValidationError('Duration must be greater than 0');
    }

    this.data.startTime = startTime;
    this.data.endTime = new Date(startTime.getTime() + (this.data.duration * 60 * 1000));
    this.updateTimestamp();
  }

  // Méthodes de calcul de coût
  public calculateTotalCost(): number {
    if (!this.data.hourlyRate || !this.data.billable) {
      return 0;
    }

    const hours = this.data.duration / 60; // Convertir minutes en heures
    return Math.round((hours * this.data.hourlyRate) * 100) / 100; // Arrondir à 2 décimales
  }

  public updateTotalCost(): void {
    this.data.totalCost = this.calculateTotalCost();
    this.updateTimestamp();
  }

  public setHourlyRate(rate: number): void {
    if (rate < 0) {
      throw new ValidationError('Hourly rate cannot be negative');
    }

    this.data.hourlyRate = rate;
    this.updateTotalCost();
  }

  // Méthodes de gestion du statut
  public submit(): void {
    if (this.data.status !== TimeEntryStatus.DRAFT) {
      throw new ValidationError('Only draft entries can be submitted');
    }

    this.data.status = TimeEntryStatus.SUBMITTED;
    this.updateTimestamp();
  }

  public approve(approvedBy: string): void {
    if (this.data.status !== TimeEntryStatus.SUBMITTED) {
      throw new ValidationError('Only submitted entries can be approved');
    }

    this.data.status = TimeEntryStatus.APPROVED;
    this.data.updatedBy = approvedBy;
    this.updateTimestamp();
  }

  public reject(rejectedBy: string, reason?: string): void {
    if (this.data.status !== TimeEntryStatus.SUBMITTED) {
      throw new ValidationError('Only submitted entries can be rejected');
    }

    this.data.status = TimeEntryStatus.REJECTED;
    this.data.updatedBy = rejectedBy;
    
    if (reason) {
      this.data.description = `${this.data.description}\n\nRejection reason: ${reason}`;
    }
    
    this.updateTimestamp();
  }

  public returnToDraft(): void {
    if (this.data.status !== TimeEntryStatus.REJECTED) {
      throw new ValidationError('Only rejected entries can be returned to draft');
    }

    this.data.status = TimeEntryStatus.DRAFT;
    this.updateTimestamp();
  }

  // Méthodes de gestion des tags
  public addTag(tag: string): void {
    if (!tag || tag.trim().length === 0) {
      throw new ValidationError('Tag cannot be empty');
    }

    const normalizedTag = tag.trim().toLowerCase();
    
    if (!this.data.tags) {
      this.data.tags = [];
    }

    if (!this.data.tags.includes(normalizedTag)) {
      this.data.tags.push(normalizedTag);
      this.updateTimestamp();
    }
  }

  public removeTag(tag: string): void {
    if (!this.data.tags) {
      return;
    }

    const normalizedTag = tag.trim().toLowerCase();
    const index = this.data.tags.indexOf(normalizedTag);
    
    if (index > -1) {
      this.data.tags.splice(index, 1);
      this.updateTimestamp();
    }
  }

  public setTags(tags: string[]): void {
    this.data.tags = tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
    this.updateTimestamp();
  }

  // Méthodes de validation des chevauchements
  public checkOverlapWith(otherEntry: TimeEntry): boolean {
    // Vérifier si c'est le même jour et le même employé
    if (this.data.date !== otherEntry.date || this.data.employeeId !== otherEntry.employeeId) {
      return false;
    }

    // Si l'une des entrées n'a pas d'heures de début/fin, pas de chevauchement possible
    if (!this.data.startTime || !this.data.endTime || !otherEntry.startTime || !otherEntry.endTime) {
      return false;
    }

    // Vérifier le chevauchement temporel
    const thisStart = this.data.startTime.getTime();
    const thisEnd = this.data.endTime.getTime();
    const otherStart = otherEntry.startTime.getTime();
    const otherEnd = otherEntry.endTime.getTime();

    return (thisStart < otherEnd && thisEnd > otherStart);
  }

  // Méthodes de validation métier
  public validateDuration(): void {
    if (this.data.duration <= 0) {
      throw new ValidationError('Duration must be greater than 0');
    }

    if (this.data.duration > 24 * 60) { // Plus de 24 heures
      throw new ValidationError('Duration cannot exceed 24 hours per day');
    }
  }

  public validateTimes(): void {
    if (this.data.startTime && this.data.endTime) {
      if (this.data.endTime <= this.data.startTime) {
        throw new ValidationError('End time must be after start time');
      }

      // Vérifier que les heures sont dans la même journée
      const startDate = new Date(this.data.startTime);
      const endDate = new Date(this.data.endTime);
      
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      if (startDate.getTime() !== endDate.getTime()) {
        throw new ValidationError('Start and end times must be on the same day');
      }

      // Vérifier que la date correspond aux heures
      const entryDate = new Date(this.data.date);
      if (startDate.getTime() !== entryDate.getTime()) {
        throw new ValidationError('Times must match the entry date');
      }
    }
  }

  public validateProject(allowedProjects: string[]): void {
    if (this.data.projectId && !allowedProjects.includes(this.data.projectId)) {
      throw new ValidationError('Employee does not have access to this project');
    }
  }

  // Méthodes utilitaires
  public getDurationInHours(): number {
    return this.data.duration / 60;
  }

  public getDurationFormatted(): string {
    const hours = Math.floor(this.data.duration / 60);
    const minutes = this.data.duration % 60;
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  public isOnDate(date: string): boolean {
    return this.data.date === date;
  }

  public isBillable(): boolean {
    return this.data.billable;
  }

  public hasProject(): boolean {
    return !!this.data.projectId;
  }

  public hasActivity(): boolean {
    return !!this.data.activityCodeId;
  }

  // Méthodes de mise à jour
  public updateFromInput(input: Partial<TimeEntryInput>): void {
    if (!this.isEditable) {
      throw new ValidationError('Cannot modify non-editable time entry');
    }

    const updates: Partial<TimeEntry> = {};

    if (input.projectId !== undefined) {
      updates.projectId = input.projectId;
    }

    if (input.activityCodeId !== undefined) {
      updates.activityCodeId = input.activityCodeId;
    }

    if (input.date !== undefined) {
      updates.date = input.date;
    }

    if (input.startTime !== undefined) {
      updates.startTime = input.startTime;
    }

    if (input.endTime !== undefined) {
      updates.endTime = input.endTime;
    }

    if (input.duration !== undefined) {
      updates.duration = input.duration;
    }

    if (input.description !== undefined) {
      updates.description = input.description;
    }

    if (input.billable !== undefined) {
      updates.billable = input.billable;
    }

    if (input.hourlyRate !== undefined) {
      updates.hourlyRate = input.hourlyRate;
    }

    if (input.tags !== undefined) {
      updates.tags = input.tags;
    }

    // Appliquer les mises à jour
    this.update(updates);

    // Recalculer la durée si les heures ont changé
    if (input.startTime !== undefined || input.endTime !== undefined) {
      if (this.data.startTime && this.data.endTime) {
        this.setDurationFromTimes();
      }
    }

    // Recalculer le coût si nécessaire
    if (input.duration !== undefined || input.hourlyRate !== undefined || input.billable !== undefined) {
      this.updateTotalCost();
    }
  }

  // Méthodes de copie et clonage
  public copyToDate(newDate: string): TimeEntryModel {
    const copiedData = {
      ...this.data,
      id: undefined, // Nouveau ID sera généré
      date: newDate,
      status: TimeEntryStatus.DRAFT,
      createdAt: undefined,
      updatedAt: undefined
    };

    // Ajuster les heures si elles existent
    if (copiedData.startTime && copiedData.endTime) {
      const targetDate = new Date(newDate);
      const originalStart = new Date(copiedData.startTime);
      const originalEnd = new Date(copiedData.endTime);

      copiedData.startTime = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        originalStart.getHours(),
        originalStart.getMinutes(),
        originalStart.getSeconds()
      );

      copiedData.endTime = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        originalEnd.getHours(),
        originalEnd.getMinutes(),
        originalEnd.getSeconds()
      );
    }

    return new TimeEntryModel(copiedData);
  }

  // Validation complète
  public async validate(): Promise<boolean> {
    try {
      // Validation des champs requis
      BaseModel.validateRequired(this.data, [
        'employeeId',
        'tenantId',
        'timesheetId',
        'date',
        'duration',
        'description',
        'status'
      ]);

      // Validation du format de date
      if (!/^\d{4}-\d{2}-\d{2}$/.test(this.data.date)) {
        throw new ValidationError('Date must be in YYYY-MM-DD format');
      }

      // Validation de la date (ne peut pas être dans le futur)
      const entryDate = new Date(this.data.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Fin de journée
      
      if (entryDate > today) {
        throw new ValidationError('Time entry date cannot be in the future');
      }

      // Validation du statut
      BaseModel.validateEnum(this.data.status, TimeEntryStatus, 'status');

      // Validation de la durée
      this.validateDuration();

      // Validation des heures si présentes
      if (this.data.startTime || this.data.endTime) {
        this.validateTimes();
      }

      // Validation de la description
      if (!this.data.description || this.data.description.trim().length === 0) {
        throw new ValidationError('Description is required');
      }

      if (this.data.description.length > 1000) {
        throw new ValidationError('Description cannot exceed 1000 characters');
      }

      // Validation du taux horaire
      if (this.data.hourlyRate !== undefined && this.data.hourlyRate < 0) {
        throw new ValidationError('Hourly rate cannot be negative');
      }

      // Validation du coût total
      if (this.data.totalCost !== undefined && this.data.totalCost < 0) {
        throw new ValidationError('Total cost cannot be negative');
      }

      // Validation des tags
      if (this.data.tags) {
        this.data.tags.forEach((tag, index) => {
          if (!tag || tag.trim().length === 0) {
            throw new ValidationError(`Tag at index ${index} cannot be empty`);
          }
          if (tag.length > 50) {
            throw new ValidationError(`Tag at index ${index} cannot exceed 50 characters`);
          }
        });
      }

      // Validation de cohérence entre durée et heures
      if (this.data.startTime && this.data.endTime) {
        const calculatedDuration = this.calculateDurationFromTimes();
        const tolerance = 1; // 1 minute de tolérance
        
        if (Math.abs(this.data.duration - calculatedDuration) > tolerance) {
          throw new ValidationError('Duration does not match start and end times');
        }
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Time entry validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Conversion vers Firestore
  public toFirestore(): DocumentData {
    const data = {
      employeeId: this.data.employeeId,
      tenantId: this.data.tenantId,
      timesheetId: this.data.timesheetId,
      projectId: this.data.projectId || null,
      activityCodeId: this.data.activityCodeId || null,
      date: this.data.date,
      startTime: this.data.startTime || null,
      endTime: this.data.endTime || null,
      duration: this.data.duration,
      description: this.data.description,
      billable: this.data.billable,
      hourlyRate: this.data.hourlyRate || null,
      totalCost: this.data.totalCost || null,
      status: this.data.status,
      tags: this.data.tags || [],
      metadata: this.data.metadata || { source: 'manual' },
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt,
      createdBy: this.data.createdBy,
      updatedBy: this.data.updatedBy || null
    };

    return this.convertDatesToFirestore(data);
  }

  // Création depuis Firestore
  public static fromFirestore(doc: DocumentSnapshot): TimeEntryModel | null {
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
    const timeEntryData = new TimeEntryModel({}).convertDatesFromFirestore(convertedData) as TimeEntry;

    return new TimeEntryModel(timeEntryData);
  }

  // Méthodes de détection d'anomalies
  public detectAnomalies(): string[] {
    const anomalies: string[] = [];

    // Durée excessive
    if (this.data.duration > 12 * 60) { // Plus de 12 heures
      anomalies.push('excessive_duration');
    }

    // Durée très courte
    if (this.data.duration < 15) { // Moins de 15 minutes
      anomalies.push('very_short_duration');
    }

    // Heures inhabituelles
    if (this.data.startTime) {
      const hour = this.data.startTime.getHours();
      if (hour < 6 || hour > 22) {
        anomalies.push('unusual_hours');
      }
    }

    // Taux horaire inhabituel
    if (this.data.hourlyRate) {
      if (this.data.hourlyRate > 500) {
        anomalies.push('high_hourly_rate');
      }
      if (this.data.hourlyRate < 5) {
        anomalies.push('low_hourly_rate');
      }
    }

    // Description trop courte
    if (this.data.description.trim().length < 10) {
      anomalies.push('short_description');
    }

    // Weekend work
    const entryDate = new Date(this.data.date);
    const dayOfWeek = entryDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      anomalies.push('weekend_work');
    }

    return anomalies;
  }

  // Méthodes de comparaison
  public isSimilarTo(other: TimeEntry, threshold: number = 0.8): boolean {
    let similarity = 0;
    let factors = 0;

    // Comparer le projet
    if (this.data.projectId === other.projectId) {
      similarity += 0.3;
    }
    factors += 0.3;

    // Comparer l'activité
    if (this.data.activityCodeId === other.activityCodeId) {
      similarity += 0.2;
    }
    factors += 0.2;

    // Comparer la durée (tolérance de 30 minutes)
    const durationDiff = Math.abs(this.data.duration - other.duration);
    if (durationDiff <= 30) {
      similarity += 0.2;
    }
    factors += 0.2;

    // Comparer la description (similarité basique)
    const thisDesc = this.data.description.toLowerCase();
    const otherDesc = other.description.toLowerCase();
    const commonWords = thisDesc.split(' ').filter(word => otherDesc.includes(word));
    const descSimilarity = commonWords.length / Math.max(thisDesc.split(' ').length, otherDesc.split(' ').length);
    similarity += descSimilarity * 0.3;
    factors += 0.3;

    return (similarity / factors) >= threshold;
  }

  // Méthode pour l'API
  public toAPI(): any {
    const apiData = super.toAPI();
    const anomalies = this.detectAnomalies();

    return {
      ...apiData,
      durationFormatted: this.getDurationFormatted(),
      durationInHours: this.getDurationInHours(),
      isEditable: this.isEditable,
      isDraft: this.isDraft,
      isApproved: this.isApproved,
      isBillable: this.isBillable(),
      hasProject: this.hasProject(),
      hasActivity: this.hasActivity(),
      anomalies,
      hasAnomalies: anomalies.length > 0
    };
  }
}