/**
 * Modèle Timesheet pour la gestion des feuilles de temps
 */

import { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import { BaseModel, ValidationError } from './base.model';
import { Timesheet, TimesheetStatus, TimePeriod, TimesheetTotals } from '../common/types';

export class TimesheetModel extends BaseModel<Timesheet> {
  constructor(data: Partial<Timesheet>) {
    const timesheetData = {
      ...data,
      status: data.status || TimesheetStatus.DRAFT,
      totalHours: data.totalHours || 0,
      totalBillableHours: data.totalBillableHours || 0,
      totalCost: data.totalCost || 0,
      timeEntries: data.timeEntries || [],
      metadata: data.metadata || {
        version: 1,
        lastCalculated: new Date(),
        calculationHash: ''
      }
    };

    super(timesheetData);
  }

  // Getters spécifiques
  get employeeId(): string {
    return this.data.employeeId;
  }

  get tenantId(): string {
    return this.data.tenantId;
  }

  get periodStart(): string {
    return this.data.periodStart;
  }

  get periodEnd(): string {
    return this.data.periodEnd;
  }

  get status(): TimesheetStatus {
    return this.data.status;
  }

  get totalHours(): number {
    return this.data.totalHours;
  }

  get totalBillableHours(): number {
    return this.data.totalBillableHours;
  }

  get totalCost(): number {
    return this.data.totalCost;
  }

  get timeEntries(): string[] {
    return this.data.timeEntries;
  }

  get submittedAt(): Date | undefined {
    return this.data.submittedAt;
  }

  get approvedAt(): Date | undefined {
    return this.data.approvedAt;
  }

  get approvedBy(): string | undefined {
    return this.data.approvedBy;
  }

  get rejectionReason(): string | undefined {
    return this.data.rejectionReason;
  }

  get isDraft(): boolean {
    return this.data.status === TimesheetStatus.DRAFT;
  }

  get isSubmitted(): boolean {
    return this.data.status === TimesheetStatus.SUBMITTED;
  }

  get isUnderReview(): boolean {
    return this.data.status === TimesheetStatus.UNDER_REVIEW;
  }

  get isApproved(): boolean {
    return this.data.status === TimesheetStatus.APPROVED;
  }

  get isRejected(): boolean {
    return this.data.status === TimesheetStatus.REJECTED;
  }

  get isLocked(): boolean {
    return this.data.status === TimesheetStatus.LOCKED;
  }

  get isEditable(): boolean {
    return this.data.status === TimesheetStatus.DRAFT || this.data.status === TimesheetStatus.REJECTED;
  }

  get canBeSubmitted(): boolean {
    return this.data.status === TimesheetStatus.DRAFT && this.data.timeEntries.length > 0;
  }

  // Méthodes de gestion des périodes
  public static createWeeklyPeriod(startDate: Date): TimePeriod {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    // Aller au lundi de la semaine
    const dayOfWeek = start.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + daysToMonday);

    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Dimanche

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  public static createBiWeeklyPeriod(startDate: Date): TimePeriod {
    const weeklyPeriod = TimesheetModel.createWeeklyPeriod(startDate);
    const start = new Date(weeklyPeriod.start);
    const end = new Date(start);
    end.setDate(end.getDate() + 13); // 2 semaines

    return {
      start: weeklyPeriod.start,
      end: end.toISOString().split('T')[0]
    };
  }

  public static createMonthlyPeriod(year: number, month: number): TimePeriod {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // Dernier jour du mois

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  public getPeriodDuration(): number {
    const start = new Date(this.data.periodStart);
    const end = new Date(this.data.periodEnd);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 pour inclure le dernier jour
  }

  public isDateInPeriod(date: string): boolean {
    return date >= this.data.periodStart && date <= this.data.periodEnd;
  }

  public getPeriodType(): 'weekly' | 'bi-weekly' | 'monthly' | 'custom' {
    const duration = this.getPeriodDuration();

    if (duration === 7) {return 'weekly';}
    if (duration === 14) {return 'bi-weekly';}
    if (duration >= 28 && duration <= 31) {return 'monthly';}
    return 'custom';
  }

  // Méthodes de gestion des entrées de temps
  public addTimeEntry(timeEntryId: string): void {
    if (!this.isEditable) {
      throw new ValidationError('Cannot add time entries to non-editable timesheet');
    }

    if (!this.data.timeEntries.includes(timeEntryId)) {
      this.data.timeEntries.push(timeEntryId);
      this.updateTimestamp();
    }
  }

  public removeTimeEntry(timeEntryId: string): void {
    if (!this.isEditable) {
      throw new ValidationError('Cannot remove time entries from non-editable timesheet');
    }

    const index = this.data.timeEntries.indexOf(timeEntryId);
    if (index > -1) {
      this.data.timeEntries.splice(index, 1);
      this.updateTimestamp();
    }
  }

  public hasTimeEntry(timeEntryId: string): boolean {
    return this.data.timeEntries.includes(timeEntryId);
  }

  public getTimeEntriesCount(): number {
    return this.data.timeEntries.length;
  }

  public getTimeEntries(): string[] {
    return this.data.timeEntries;
  }

  public calculateTotals(timeEntries?: any[]): TimesheetTotals {
    // Si aucune entrée n'est fournie, retourner les totaux stockés
    if (!timeEntries || timeEntries.length === 0) {
      return {
        totalHours: this.data.totalHours,
        totalBillableHours: this.data.totalBillableHours,
        totalCost: this.data.totalCost,
        entriesCount: this.data.timeEntries.length
      };
    }

    // Calculer les totaux à partir des entrées réelles
    let totalMinutes = 0;
    let totalBillableMinutes = 0;
    let totalCost = 0;

    timeEntries.forEach(entry => {
      if (entry && typeof entry.duration === 'number') {
        totalMinutes += entry.duration;

        if (entry.billable) {
          totalBillableMinutes += entry.duration;

          // Calculer le coût si un taux horaire est disponible
          if (entry.hourlyRate && typeof entry.hourlyRate === 'number') {
            const hours = entry.duration / 60;
            totalCost += hours * entry.hourlyRate;
          } else if (entry.totalCost && typeof entry.totalCost === 'number') {
            totalCost += entry.totalCost;
          }
        }
      }
    });

    // Convertir les minutes en heures
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100; // Arrondir à 2 décimales
    const totalBillableHours = Math.round((totalBillableMinutes / 60) * 100) / 100;

    return {
      totalHours,
      totalBillableHours,
      totalCost: Math.round(totalCost * 100) / 100, // Arrondir à 2 décimales
      entriesCount: timeEntries.length
    };
  }

  // Méthodes de calcul des totaux
  public recalculateAndUpdateTotals(timeEntries: any[]): TimesheetTotals {
    const newTotals = this.calculateTotals(timeEntries);
    this.updateTotals(newTotals);
    return newTotals;
  }

  public updateTotals(totals: TimesheetTotals): void {
    this.data.totalHours = totals.totalHours;
    this.data.totalBillableHours = totals.totalBillableHours;
    this.data.totalCost = totals.totalCost;

    // Mettre à jour les métadonnées
    if (this.data.metadata) {
      this.data.metadata.lastCalculated = new Date();
      this.data.metadata.calculationHash = this.generateCalculationHash(totals);
    }

    this.updateTimestamp();
  }

  private generateCalculationHash(totals: TimesheetTotals): string {
    const data = `${totals.totalHours}-${totals.totalBillableHours}-${totals.totalCost}-${this.data.timeEntries.length}`;
    return Buffer.from(data).toString('base64');
  }

  public needsRecalculation(currentTotals: TimesheetTotals): boolean {
    if (!this.data.metadata?.calculationHash) {
      return true;
    }

    const currentHash = this.generateCalculationHash(currentTotals);
    return this.data.metadata.calculationHash !== currentHash;
  }

  public validateTotalsConsistency(timeEntries: any[]): {
    isConsistent: boolean;
    calculatedTotals: TimesheetTotals;
    storedTotals: TimesheetTotals;
    differences: { field: string; calculated: number; stored: number }[];
  } {
    const calculatedTotals = this.calculateTotals(timeEntries);
    const storedTotals = {
      totalHours: this.data.totalHours,
      totalBillableHours: this.data.totalBillableHours,
      totalCost: this.data.totalCost,
      entriesCount: this.data.timeEntries.length
    };

    const differences: { field: string; calculated: number; stored: number }[] = [];
    let isConsistent = true;

    // Tolérance pour les erreurs d'arrondi (0.01 pour les heures et coûts)
    const tolerance = 0.01;

    if (Math.abs(calculatedTotals.totalHours - storedTotals.totalHours) > tolerance) {
      differences.push({
        field: 'totalHours',
        calculated: calculatedTotals.totalHours,
        stored: storedTotals.totalHours
      });
      isConsistent = false;
    }

    if (Math.abs(calculatedTotals.totalBillableHours - storedTotals.totalBillableHours) > tolerance) {
      differences.push({
        field: 'totalBillableHours',
        calculated: calculatedTotals.totalBillableHours,
        stored: storedTotals.totalBillableHours
      });
      isConsistent = false;
    }

    if (Math.abs(calculatedTotals.totalCost - storedTotals.totalCost) > tolerance) {
      differences.push({
        field: 'totalCost',
        calculated: calculatedTotals.totalCost,
        stored: storedTotals.totalCost
      });
      isConsistent = false;
    }

    if (calculatedTotals.entriesCount !== storedTotals.entriesCount) {
      differences.push({
        field: 'entriesCount',
        calculated: calculatedTotals.entriesCount,
        stored: storedTotals.entriesCount
      });
      isConsistent = false;
    }

    return {
      isConsistent,
      calculatedTotals,
      storedTotals,
      differences
    };
  }

  // Méthodes de gestion des statuts
  public submit(submittedBy?: string): void {
    if (this.data.status !== TimesheetStatus.DRAFT) {
      throw new ValidationError('Only draft timesheets can be submitted');
    }

    if (this.data.timeEntries.length === 0) {
      throw new ValidationError('Cannot submit timesheet without time entries');
    }

    this.data.status = TimesheetStatus.SUBMITTED;
    this.data.submittedAt = new Date();

    if (submittedBy) {
      this.data.updatedBy = submittedBy;
    }

    this.updateTimestamp();
  }

  public startReview(reviewerId: string): void {
    if (this.data.status !== TimesheetStatus.SUBMITTED) {
      throw new ValidationError('Only submitted timesheets can be put under review');
    }

    this.data.status = TimesheetStatus.UNDER_REVIEW;
    this.data.updatedBy = reviewerId;
    this.updateTimestamp();
  }

  public approve(approverId: string): void {
    if (this.data.status !== TimesheetStatus.SUBMITTED && this.data.status !== TimesheetStatus.UNDER_REVIEW) {
      throw new ValidationError('Only submitted or under review timesheets can be approved');
    }

    this.data.status = TimesheetStatus.APPROVED;
    this.data.approvedAt = new Date();
    this.data.approvedBy = approverId;
    this.data.updatedBy = approverId;
    this.data.rejectionReason = undefined; // Effacer toute raison de rejet précédente
    this.updateTimestamp();
  }

  public reject(rejectedBy: string, reason: string): void {
    if (this.data.status !== TimesheetStatus.SUBMITTED && this.data.status !== TimesheetStatus.UNDER_REVIEW) {
      throw new ValidationError('Only submitted or under review timesheets can be rejected');
    }

    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Rejection reason is required');
    }

    this.data.status = TimesheetStatus.REJECTED;
    this.data.rejectionReason = reason.trim();
    this.data.updatedBy = rejectedBy;
    this.data.approvedAt = undefined;
    this.data.approvedBy = undefined;
    this.updateTimestamp();
  }

  public returnToDraft(): void {
    if (this.data.status !== TimesheetStatus.REJECTED) {
      throw new ValidationError('Only rejected timesheets can be returned to draft');
    }

    this.data.status = TimesheetStatus.DRAFT;
    this.data.submittedAt = undefined;
    this.data.rejectionReason = undefined;
    this.updateTimestamp();
  }

  public lock(lockedBy: string): void {
    if (this.data.status !== TimesheetStatus.APPROVED) {
      throw new ValidationError('Only approved timesheets can be locked');
    }

    this.data.status = TimesheetStatus.LOCKED;
    this.data.updatedBy = lockedBy;
    this.updateTimestamp();
  }

  public unlock(unlockedBy: string): void {
    if (this.data.status !== TimesheetStatus.LOCKED) {
      throw new ValidationError('Only locked timesheets can be unlocked');
    }

    this.data.status = TimesheetStatus.APPROVED;
    this.data.updatedBy = unlockedBy;
    this.updateTimestamp();
  }

  // Méthodes de validation
  public validatePeriod(): void {
    const start = new Date(this.data.periodStart);
    const end = new Date(this.data.periodEnd);

    if (end <= start) {
      throw new ValidationError('Period end date must be after start date');
    }

    // Vérifier que les dates ne sont pas dans le futur
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (start > today) {
      throw new ValidationError('Period start date cannot be in the future');
    }

    // Permettre la période courante mais pas au-delà
    const maxEndDate = new Date(today);
    maxEndDate.setDate(maxEndDate.getDate() + 7); // Tolérance d'une semaine

    if (end > maxEndDate) {
      throw new ValidationError('Period end date cannot be too far in the future');
    }
  }

  public validateCompleteness(): { isComplete: boolean; missingDays: string[]; warnings: string[] } {
    const missingDays: string[] = [];
    const warnings: string[] = [];

    // Cette méthode nécessiterait les entrées de temps réelles pour une validation complète
    // Pour l'instant, on vérifie juste la structure de base

    if (this.data.timeEntries.length === 0) {
      warnings.push('No time entries found');
    }

    if (this.data.totalHours === 0) {
      warnings.push('Total hours is zero');
    }

    // Vérifier la cohérence des totaux
    if (this.data.totalBillableHours > this.data.totalHours) {
      warnings.push('Billable hours exceed total hours');
    }

    return {
      isComplete: missingDays.length === 0,
      missingDays,
      warnings
    };
  }

  // Méthodes utilitaires
  public getStatusLabel(): string {
    const labels = {
      [TimesheetStatus.DRAFT]: 'Brouillon',
      [TimesheetStatus.SUBMITTED]: 'Soumise',
      [TimesheetStatus.UNDER_REVIEW]: 'En révision',
      [TimesheetStatus.APPROVED]: 'Approuvée',
      [TimesheetStatus.REJECTED]: 'Rejetée',
      [TimesheetStatus.LOCKED]: 'Verrouillée'
    };
    return labels[this.data.status] || this.data.status;
  }

  public getDaysInPeriod(): string[] {
    const days: string[] = [];
    const start = new Date(this.data.periodStart);
    const end = new Date(this.data.periodEnd);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      days.push(date.toISOString().split('T')[0]);
    }

    return days;
  }

  public getWorkingDaysInPeriod(): string[] {
    return this.getDaysInPeriod().filter(date => {
      const dayOfWeek = new Date(date).getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclure dimanche (0) et samedi (6)
    });
  }

  public getAverageHoursPerDay(): number {
    const workingDays = this.getWorkingDaysInPeriod().length;
    return workingDays > 0 ? this.data.totalHours / workingDays : 0;
  }

  public getBillablePercentage(): number {
    return this.data.totalHours > 0 ? (this.data.totalBillableHours / this.data.totalHours) * 100 : 0;
  }

  public getAverageHourlyRate(): number {
    return this.data.totalBillableHours > 0 ? this.data.totalCost / this.data.totalBillableHours : 0;
  }

  // Méthodes de comparaison et recherche
  public isInSamePeriod(other: Timesheet): boolean {
    return this.data.periodStart === other.periodStart && this.data.periodEnd === other.periodEnd;
  }

  public overlapsWithPeriod(startDate: string, endDate: string): boolean {
    return this.data.periodStart <= endDate && this.data.periodEnd >= startDate;
  }

  public isForEmployee(employeeId: string): boolean {
    return this.data.employeeId === employeeId;
  }

  public isForTenant(tenantId: string): boolean {
    return this.data.tenantId === tenantId;
  }

  // Méthodes de copie et clonage
  public copyToNextPeriod(): TimesheetModel {
    const currentEnd = new Date(this.data.periodEnd);
    const nextStart = new Date(currentEnd);
    nextStart.setDate(nextStart.getDate() + 1);

    const periodType = this.getPeriodType();
    let nextPeriod: TimePeriod;

    switch (periodType) {
      case 'weekly':
        nextPeriod = TimesheetModel.createWeeklyPeriod(nextStart);
        break;
      case 'bi-weekly':
        nextPeriod = TimesheetModel.createBiWeeklyPeriod(nextStart);
        break;
      case 'monthly':
        const nextMonth = nextStart.getMonth() + 1;
        const nextYear = nextMonth > 11 ? nextStart.getFullYear() + 1 : nextStart.getFullYear();
        nextPeriod = TimesheetModel.createMonthlyPeriod(nextYear, (nextMonth % 12) + 1);
        break;
      default:
        // Pour les périodes personnalisées, créer une période de même durée
        const duration = this.getPeriodDuration();
        const nextEnd = new Date(nextStart);
        nextEnd.setDate(nextEnd.getDate() + duration - 1);
        nextPeriod = {
          start: nextStart.toISOString().split('T')[0],
          end: nextEnd.toISOString().split('T')[0]
        };
    }

    return new TimesheetModel({
      employeeId: this.data.employeeId,
      tenantId: this.data.tenantId,
      periodStart: nextPeriod.start,
      periodEnd: nextPeriod.end,
      createdBy: this.data.createdBy
    });
  }

  // Validation complète
  public async validate(): Promise<boolean> {
    try {
      // Validation des champs requis
      BaseModel.validateRequired(this.data, [
        'employeeId',
        'tenantId',
        'periodStart',
        'periodEnd',
        'status'
      ]);

      // Validation du format des dates
      if (!/^\d{4}-\d{2}-\d{2}$/.test(this.data.periodStart)) {
        throw new ValidationError('Period start date must be in YYYY-MM-DD format');
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(this.data.periodEnd)) {
        throw new ValidationError('Period end date must be in YYYY-MM-DD format');
      }

      // Validation de la période
      this.validatePeriod();

      // Validation du statut
      BaseModel.validateEnum(this.data.status, TimesheetStatus, 'status');

      // Validation des totaux
      if (this.data.totalHours < 0) {
        throw new ValidationError('Total hours cannot be negative');
      }

      if (this.data.totalBillableHours < 0) {
        throw new ValidationError('Total billable hours cannot be negative');
      }

      if (this.data.totalBillableHours > this.data.totalHours) {
        throw new ValidationError('Billable hours cannot exceed total hours');
      }

      if (this.data.totalCost < 0) {
        throw new ValidationError('Total cost cannot be negative');
      }

      // Validation des entrées de temps
      if (!Array.isArray(this.data.timeEntries)) {
        throw new ValidationError('Time entries must be an array');
      }

      // Validation des métadonnées
      if (this.data.metadata) {
        if (typeof this.data.metadata.version !== 'number' || this.data.metadata.version < 1) {
          throw new ValidationError('Metadata version must be a positive number');
        }
      }

      // Validation des dates de workflow
      if (this.data.submittedAt && this.data.submittedAt < this.data.createdAt) {
        throw new ValidationError('Submitted date cannot be before creation date');
      }

      if (this.data.approvedAt && this.data.submittedAt && this.data.approvedAt < this.data.submittedAt) {
        throw new ValidationError('Approved date cannot be before submitted date');
      }

      // Validation de la raison de rejet
      if (this.data.status === TimesheetStatus.REJECTED && !this.data.rejectionReason) {
        throw new ValidationError('Rejection reason is required for rejected timesheets');
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Timesheet validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Conversion vers Firestore
  public toFirestore(): DocumentData {
    const data = {
      employeeId: this.data.employeeId,
      tenantId: this.data.tenantId,
      periodStart: this.data.periodStart,
      periodEnd: this.data.periodEnd,
      status: this.data.status,
      totalHours: this.data.totalHours,
      totalBillableHours: this.data.totalBillableHours,
      totalCost: this.data.totalCost,
      submittedAt: this.data.submittedAt || null,
      approvedAt: this.data.approvedAt || null,
      approvedBy: this.data.approvedBy || null,
      rejectionReason: this.data.rejectionReason || null,
      timeEntries: this.data.timeEntries,
      metadata: this.data.metadata || {
        version: 1,
        lastCalculated: new Date(),
        calculationHash: ''
      },
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt,
      createdBy: this.data.createdBy || null,
      updatedBy: this.data.updatedBy || null
    };

    return this.convertDatesToFirestore(data);
  }

  // Création depuis Firestore
  public static fromFirestore(doc: DocumentSnapshot): TimesheetModel | null {
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
    const timesheetData = new TimesheetModel({}).convertDatesFromFirestore(convertedData) as Timesheet;

    return new TimesheetModel(timesheetData);
  }

  // Méthodes de détection d'anomalies
  public detectAnomalies(): string[] {
    const anomalies: string[] = [];

    // Heures excessives
    const averageHoursPerDay = this.getAverageHoursPerDay();
    if (averageHoursPerDay > 12) {
      anomalies.push('excessive_daily_hours');
    }

    // Heures insuffisantes
    if (averageHoursPerDay < 2 && this.data.totalHours > 0) {
      anomalies.push('insufficient_daily_hours');
    }

    // Pas d'heures facturables
    if (this.data.totalHours > 0 && this.data.totalBillableHours === 0) {
      anomalies.push('no_billable_hours');
    }

    // Taux horaire moyen inhabituel
    const avgRate = this.getAverageHourlyRate();
    if (avgRate > 500) {
      anomalies.push('high_hourly_rate');
    }
    if (avgRate > 0 && avgRate < 5) {
      anomalies.push('low_hourly_rate');
    }

    // Période trop longue
    const duration = this.getPeriodDuration();
    if (duration > 31) {
      anomalies.push('long_period');
    }

    // Soumission tardive
    if (this.data.submittedAt) {
      const periodEnd = new Date(this.data.periodEnd);
      const daysSinceEnd = Math.floor((this.data.submittedAt.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceEnd > 7) {
        anomalies.push('late_submission');
      }
    }

    return anomalies;
  }

  // Méthode pour l'API
  public toAPI(): any {
    const apiData = super.toAPI();
    const anomalies = this.detectAnomalies();
    const completeness = this.validateCompleteness();

    return {
      ...apiData,
      statusLabel: this.getStatusLabel(),
      periodDuration: this.getPeriodDuration(),
      periodType: this.getPeriodType(),
      daysInPeriod: this.getDaysInPeriod(),
      workingDaysInPeriod: this.getWorkingDaysInPeriod(),
      averageHoursPerDay: this.getAverageHoursPerDay(),
      billablePercentage: this.getBillablePercentage(),
      averageHourlyRate: this.getAverageHourlyRate(),
      timeEntriesCount: this.getTimeEntriesCount(),
      isDraft: this.isDraft,
      isSubmitted: this.isSubmitted,
      isUnderReview: this.isUnderReview,
      isApproved: this.isApproved,
      isRejected: this.isRejected,
      isLocked: this.isLocked,
      isEditable: this.isEditable,
      canBeSubmitted: this.canBeSubmitted,
      completeness,
      anomalies,
      hasAnomalies: anomalies.length > 0
    };
  }
}