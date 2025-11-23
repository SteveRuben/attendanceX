/**
 * Modèle Project pour la gestion des projets
 */

import { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import { BaseModel, ValidationError } from './base.model';
import { Project, ProjectStatus, ProjectInput } from '../common/types';

export class ProjectModel extends BaseModel<Project> {
  constructor(data: Partial<Project>) {
    const projectData = {
      ...data,
      status: data.status || ProjectStatus.ACTIVE,
      billable: data.billable !== undefined ? data.billable : true,
      assignedEmployees: data.assignedEmployees || [],
      activityCodes: data.activityCodes || [],
      settings: data.settings || {
        requireActivityCode: false,
        allowOvertime: true,
        autoApprove: false
      }
    };

    super(projectData);
  }

  // Getters spécifiques
  get tenantId(): string {
    return this.data.tenantId;
  }

  get clientId(): string | undefined {
    return this.data.clientId;
  }

  get name(): string {
    return this.data.name;
  }

  get code(): string {
    return this.data.code;
  }

  get description(): string | undefined {
    return this.data.description;
  }

  get status(): ProjectStatus {
    return this.data.status;
  }

  get startDate(): Date | undefined {
    return this.data.startDate;
  }

  get endDate(): Date | undefined {
    return this.data.endDate;
  }

  get budget(): number | undefined {
    return this.data.budget;
  }

  get defaultHourlyRate(): number | undefined {
    return this.data.defaultHourlyRate;
  }

  get billable(): boolean {
    return this.data.billable;
  }

  get assignedEmployees(): string[] {
    return this.data.assignedEmployees;
  }

  get activityCodes(): string[] {
    return this.data.activityCodes;
  }

  get settings(): Project['settings'] {
    return this.data.settings;
  }

  get isActive(): boolean {
    return this.data.status === ProjectStatus.ACTIVE;
  }

  get isCompleted(): boolean {
    return this.data.status === ProjectStatus.COMPLETED;
  }

  get isOnHold(): boolean {
    return this.data.status === ProjectStatus.ON_HOLD;
  }

  get isInactive(): boolean {
    return this.data.status === ProjectStatus.INACTIVE;
  }

  get canAcceptTimeEntries(): boolean {
    return this.data.status === ProjectStatus.ACTIVE || this.data.status === ProjectStatus.ON_HOLD;
  }

  // Méthodes de gestion des employés
  public assignEmployee(employeeId: string): void {
    if (!employeeId || employeeId.trim().length === 0) {
      throw new ValidationError('Employee ID is required');
    }

    if (!this.data.assignedEmployees.includes(employeeId)) {
      this.data.assignedEmployees.push(employeeId);
      this.updateTimestamp();
    }
  }

  public removeEmployee(employeeId: string): void {
    const index = this.data.assignedEmployees.indexOf(employeeId);
    if (index > -1) {
      this.data.assignedEmployees.splice(index, 1);
      this.updateTimestamp();
    }
  }

  public isEmployeeAssigned(employeeId: string): boolean {
    return this.data.assignedEmployees.includes(employeeId);
  }

  public getAssignedEmployeesCount(): number {
    return this.data.assignedEmployees.length;
  }

  public assignMultipleEmployees(employeeIds: string[]): void {
    employeeIds.forEach(employeeId => {
      if (employeeId && !this.data.assignedEmployees.includes(employeeId)) {
        this.data.assignedEmployees.push(employeeId);
      }
    });
    this.updateTimestamp();
  }

  public removeMultipleEmployees(employeeIds: string[]): void {
    this.data.assignedEmployees = this.data.assignedEmployees.filter(
      employeeId => !employeeIds.includes(employeeId)
    );
    this.updateTimestamp();
  }

  // Méthodes de gestion des codes d'activité
  public addActivityCode(activityCodeId: string): void {
    if (!activityCodeId || activityCodeId.trim().length === 0) {
      throw new ValidationError('Activity code ID is required');
    }

    if (!this.data.activityCodes.includes(activityCodeId)) {
      this.data.activityCodes.push(activityCodeId);
      this.updateTimestamp();
    }
  }

  public removeActivityCode(activityCodeId: string): void {
    const index = this.data.activityCodes.indexOf(activityCodeId);
    if (index > -1) {
      this.data.activityCodes.splice(index, 1);
      this.updateTimestamp();
    }
  }

  public hasActivityCode(activityCodeId: string): boolean {
    return this.data.activityCodes.includes(activityCodeId);
  }

  public getActivityCodesCount(): number {
    return this.data.activityCodes.length;
  }

  public setActivityCodes(activityCodeIds: string[]): void {
    this.data.activityCodes = activityCodeIds.filter(id => id && id.trim().length > 0);
    this.updateTimestamp();
  }

  // Méthodes de gestion du statut
  public activate(): void {
    if (this.data.status === ProjectStatus.COMPLETED) {
      throw new ValidationError('Cannot activate a completed project');
    }

    this.data.status = ProjectStatus.ACTIVE;
    this.updateTimestamp();
  }

  public deactivate(): void {
    this.data.status = ProjectStatus.INACTIVE;
    this.updateTimestamp();
  }

  public putOnHold(): void {
    if (this.data.status !== ProjectStatus.ACTIVE) {
      throw new ValidationError('Only active projects can be put on hold');
    }

    this.data.status = ProjectStatus.ON_HOLD;
    this.updateTimestamp();
  }

  public resumeFromHold(): void {
    if (this.data.status !== ProjectStatus.ON_HOLD) {
      throw new ValidationError('Only projects on hold can be resumed');
    }

    this.data.status = ProjectStatus.ACTIVE;
    this.updateTimestamp();
  }

  public complete(): void {
    if (this.data.status === ProjectStatus.INACTIVE) {
      throw new ValidationError('Cannot complete an inactive project');
    }

    this.data.status = ProjectStatus.COMPLETED;
    
    // Définir la date de fin si elle n'est pas déjà définie
    if (!this.data.endDate) {
      this.data.endDate = new Date();
    }
    
    this.updateTimestamp();
  }

  public reopen(): void {
    if (this.data.status !== ProjectStatus.COMPLETED) {
      throw new ValidationError('Only completed projects can be reopened');
    }

    this.data.status = ProjectStatus.ACTIVE;
    this.updateTimestamp();
  }

  // Méthodes de gestion des dates
  public setStartDate(startDate: Date): void {
    if (this.data.endDate && startDate >= this.data.endDate) {
      throw new ValidationError('Start date must be before end date');
    }

    this.data.startDate = startDate;
    this.updateTimestamp();
  }

  public setEndDate(endDate: Date): void {
    if (this.data.startDate && endDate <= this.data.startDate) {
      throw new ValidationError('End date must be after start date');
    }

    this.data.endDate = endDate;
    this.updateTimestamp();
  }

  public setDateRange(startDate: Date, endDate: Date): void {
    if (endDate <= startDate) {
      throw new ValidationError('End date must be after start date');
    }

    this.data.startDate = startDate;
    this.data.endDate = endDate;
    this.updateTimestamp();
  }

  public clearDates(): void {
    this.data.startDate = undefined;
    this.data.endDate = undefined;
    this.updateTimestamp();
  }

  // Méthodes de calcul de durée
  public getDurationInDays(): number | null {
    if (!this.data.startDate || !this.data.endDate) {
      return null;
    }

    const diffTime = Math.abs(this.data.endDate.getTime() - this.data.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public getDurationInWeeks(): number | null {
    const days = this.getDurationInDays();
    return days ? Math.ceil(days / 7) : null;
  }

  public getDurationInMonths(): number | null {
    if (!this.data.startDate || !this.data.endDate) {
      return null;
    }

    const startYear = this.data.startDate.getFullYear();
    const startMonth = this.data.startDate.getMonth();
    const endYear = this.data.endDate.getFullYear();
    const endMonth = this.data.endDate.getMonth();

    return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  }

  // Méthodes de validation des dates
  public isDateInRange(date: Date): boolean {
    if (!this.data.startDate || !this.data.endDate) {
      return true; // Pas de restriction si les dates ne sont pas définies
    }

    return date >= this.data.startDate && date <= this.data.endDate;
  }

  public isCurrentlyActive(): boolean {
    if (!this.isActive) {
      return false;
    }

    const now = new Date();
    
    // Vérifier si le projet a commencé
    if (this.data.startDate && now < this.data.startDate) {
      return false;
    }

    // Vérifier si le projet est terminé
    if (this.data.endDate && now > this.data.endDate) {
      return false;
    }

    return true;
  }

  public getProjectPhase(): 'not_started' | 'active' | 'completed' | 'overdue' {
    const now = new Date();

    if (this.data.status === ProjectStatus.COMPLETED) {
      return 'completed';
    }

    if (this.data.startDate && now < this.data.startDate) {
      return 'not_started';
    }

    if (this.data.endDate && now > this.data.endDate) {
      return 'overdue';
    }

    return 'active';
  }

  // Méthodes de gestion du budget et des taux
  public setBudget(budget: number): void {
    if (budget < 0) {
      throw new ValidationError('Budget cannot be negative');
    }

    this.data.budget = budget;
    this.updateTimestamp();
  }

  public setDefaultHourlyRate(rate: number): void {
    if (rate < 0) {
      throw new ValidationError('Hourly rate cannot be negative');
    }

    this.data.defaultHourlyRate = rate;
    this.updateTimestamp();
  }

  public calculateBudgetUtilization(totalCost: number): number {
    if (!this.data.budget || this.data.budget === 0) {
      return 0;
    }

    return (totalCost / this.data.budget) * 100;
  }

  public getRemainingBudget(totalCost: number): number {
    if (!this.data.budget) {
      return 0;
    }

    return Math.max(0, this.data.budget - totalCost);
  }

  public isBudgetExceeded(totalCost: number): boolean {
    if (!this.data.budget) {
      return false;
    }

    return totalCost > this.data.budget;
  }

  // Méthodes de gestion des paramètres
  public updateSettings(newSettings: Partial<Project['settings']>): void {
    this.data.settings = {
      ...this.data.settings,
      ...newSettings
    };
    this.updateTimestamp();
  }

  public requireActivityCode(required: boolean = true): void {
    if (!this.data.settings) {
      this.data.settings = {
        requireActivityCode: required,
        allowOvertime: true,
        autoApprove: false
      };
    } else {
      this.data.settings.requireActivityCode = required;
    }
    this.updateTimestamp();
  }

  public allowOvertime(allowed: boolean = true): void {
    if (!this.data.settings) {
      this.data.settings = {
        requireActivityCode: false,
        allowOvertime: allowed,
        autoApprove: false
      };
    } else {
      this.data.settings.allowOvertime = allowed;
    }
    this.updateTimestamp();
  }

  public enableAutoApproval(enabled: boolean = true): void {
    if (!this.data.settings) {
      this.data.settings = {
        requireActivityCode: false,
        allowOvertime: true,
        autoApprove: enabled
      };
    } else {
      this.data.settings.autoApprove = enabled;
    }
    this.updateTimestamp();
  }

  // Méthodes de validation d'accès
  public validateEmployeeAccess(employeeId: string): void {
    if (!this.isEmployeeAssigned(employeeId)) {
      throw new ValidationError('Employee does not have access to this project');
    }

    if (!this.canAcceptTimeEntries) {
      throw new ValidationError('Project is not accepting time entries');
    }
  }

  public validateActivityCodeAccess(activityCodeId: string): void {
    if (this.data.settings?.requireActivityCode && !this.hasActivityCode(activityCodeId)) {
      throw new ValidationError('Activity code is not allowed for this project');
    }
  }

  // Méthodes utilitaires
  public getStatusLabel(): string {
    const labels = {
      [ProjectStatus.ACTIVE]: 'Actif',
      [ProjectStatus.INACTIVE]: 'Inactif',
      [ProjectStatus.COMPLETED]: 'Terminé',
      [ProjectStatus.ON_HOLD]: 'En pause'
    };
    return labels[this.data.status] || this.data.status;
  }

  public getProjectInfo(): {
    project: Project;
    phase: string;
    durationDays: number | null;
    isCurrentlyActive: boolean;
    employeesCount: number;
    activityCodesCount: number;
  } {
    return {
      project: this.getData(),
      phase: this.getProjectPhase(),
      durationDays: this.getDurationInDays(),
      isCurrentlyActive: this.isCurrentlyActive(),
      employeesCount: this.getAssignedEmployeesCount(),
      activityCodesCount: this.getActivityCodesCount()
    };
  }

  // Méthodes de recherche et filtrage
  public matchesSearchTerm(searchTerm: string): boolean {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return true;
    }

    const term = searchTerm.toLowerCase();
    const name = this.data.name.toLowerCase();
    const code = this.data.code.toLowerCase();
    const description = (this.data.description || '').toLowerCase();

    return name.includes(term) || code.includes(term) || description.includes(term);
  }

  public isForClient(clientId: string): boolean {
    return this.data.clientId === clientId;
  }

  public isForTenant(tenantId: string): boolean {
    return this.data.tenantId === tenantId;
  }

  // Méthodes de mise à jour
  public updateFromInput(input: Partial<ProjectInput>): void {
    const updates: Partial<Project> = {};

    if (input.clientId !== undefined) {
      updates.clientId = input.clientId;
    }

    if (input.name !== undefined) {
      updates.name = input.name.trim();
    }

    if (input.code !== undefined) {
      updates.code = input.code.trim().toUpperCase();
    }

    if (input.description !== undefined) {
      updates.description = input.description?.trim();
    }

    if (input.status !== undefined) {
      updates.status = input.status;
    }

    if (input.startDate !== undefined) {
      updates.startDate = input.startDate;
    }

    if (input.endDate !== undefined) {
      updates.endDate = input.endDate;
    }

    if (input.budget !== undefined) {
      updates.budget = input.budget;
    }

    if (input.defaultHourlyRate !== undefined) {
      updates.defaultHourlyRate = input.defaultHourlyRate;
    }

    if (input.billable !== undefined) {
      updates.billable = input.billable;
    }

    if (input.assignedEmployees !== undefined) {
      updates.assignedEmployees = input.assignedEmployees;
    }

    if (input.activityCodes !== undefined) {
      updates.activityCodes = input.activityCodes;
    }

    if (input.settings !== undefined) {
      updates.settings = {
        ...this.data.settings,
        ...input.settings
      };
    }

    // Appliquer les mises à jour
    this.update(updates);

    // Validations spéciales après mise à jour
    if (input.startDate !== undefined || input.endDate !== undefined) {
      if (this.data.startDate && this.data.endDate && this.data.endDate <= this.data.startDate) {
        throw new ValidationError('End date must be after start date');
      }
    }
  }

  // Validation complète
  public async validate(): Promise<boolean> {
    try {
      // Validation des champs requis
      BaseModel.validateRequired(this.data, [
        'tenantId',
        'name',
        'code',
        'status',
        'billable'
      ]);

      // Validation du nom
      if (!this.data.name || this.data.name.trim().length === 0) {
        throw new ValidationError('Project name is required');
      }

      if (this.data.name.length > 200) {
        throw new ValidationError('Project name cannot exceed 200 characters');
      }

      // Validation du code
      if (!this.data.code || this.data.code.trim().length === 0) {
        throw new ValidationError('Project code is required');
      }

      if (this.data.code.length > 50) {
        throw new ValidationError('Project code cannot exceed 50 characters');
      }

      // Validation du code (format alphanumérique avec tirets et underscores)
      if (!/^[A-Z0-9_-]+$/.test(this.data.code)) {
        throw new ValidationError('Project code must contain only uppercase letters, numbers, hyphens, and underscores');
      }

      // Validation de la description
      if (this.data.description && this.data.description.length > 1000) {
        throw new ValidationError('Project description cannot exceed 1000 characters');
      }

      // Validation du statut
      BaseModel.validateEnum(this.data.status, ProjectStatus, 'status');

      // Validation des dates
      if (this.data.startDate && this.data.endDate) {
        if (this.data.endDate <= this.data.startDate) {
          throw new ValidationError('End date must be after start date');
        }
      }

      // Validation du budget
      if (this.data.budget !== undefined && this.data.budget < 0) {
        throw new ValidationError('Budget cannot be negative');
      }

      // Validation du taux horaire
      if (this.data.defaultHourlyRate !== undefined && this.data.defaultHourlyRate < 0) {
        throw new ValidationError('Default hourly rate cannot be negative');
      }

      // Validation des employés assignés
      if (!Array.isArray(this.data.assignedEmployees)) {
        throw new ValidationError('Assigned employees must be an array');
      }

      // Validation des codes d'activité
      if (!Array.isArray(this.data.activityCodes)) {
        throw new ValidationError('Activity codes must be an array');
      }

      // Validation des paramètres
      if (this.data.settings) {
        if (typeof this.data.settings.requireActivityCode !== 'boolean') {
          throw new ValidationError('requireActivityCode setting must be a boolean');
        }
        if (typeof this.data.settings.allowOvertime !== 'boolean') {
          throw new ValidationError('allowOvertime setting must be a boolean');
        }
        if (typeof this.data.settings.autoApprove !== 'boolean') {
          throw new ValidationError('autoApprove setting must be a boolean');
        }
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Project validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Conversion vers Firestore
  public toFirestore(): DocumentData {
    const data = {
      tenantId: this.data.tenantId,
      clientId: this.data.clientId || null,
      name: this.data.name,
      code: this.data.code,
      description: this.data.description || null,
      status: this.data.status,
      startDate: this.data.startDate || null,
      endDate: this.data.endDate || null,
      budget: this.data.budget || null,
      defaultHourlyRate: this.data.defaultHourlyRate || null,
      billable: this.data.billable,
      assignedEmployees: this.data.assignedEmployees,
      activityCodes: this.data.activityCodes,
      settings: this.data.settings || {
        requireActivityCode: false,
        allowOvertime: true,
        autoApprove: false
      },
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt,
      createdBy: this.data.createdBy,
      updatedBy: this.data.updatedBy || null
    };

    return this.convertDatesToFirestore(data);
  }

  // Création depuis Firestore
  public static fromFirestore(doc: DocumentSnapshot): ProjectModel | null {
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
    const projectData = new ProjectModel({}).convertDatesFromFirestore(convertedData) as Project;

    return new ProjectModel(projectData);
  }

  // Méthodes de détection d'anomalies
  public detectAnomalies(): string[] {
    const anomalies: string[] = [];

    // Projet sans employés assignés
    if (this.data.assignedEmployees.length === 0 && this.isActive) {
      anomalies.push('no_assigned_employees');
    }

    // Projet actif sans dates
    if (this.isActive && (!this.data.startDate || !this.data.endDate)) {
      anomalies.push('missing_project_dates');
    }

    // Projet en retard
    if (this.getProjectPhase() === 'overdue') {
      anomalies.push('project_overdue');
    }

    // Budget très élevé
    if (this.data.budget && this.data.budget > 1000000) {
      anomalies.push('high_budget');
    }

    // Taux horaire inhabituel
    if (this.data.defaultHourlyRate) {
      if (this.data.defaultHourlyRate > 500) {
        anomalies.push('high_hourly_rate');
      }
      if (this.data.defaultHourlyRate < 5) {
        anomalies.push('low_hourly_rate');
      }
    }

    // Projet très long
    const durationDays = this.getDurationInDays();
    if (durationDays && durationDays > 365) {
      anomalies.push('very_long_project');
    }

    // Trop d'employés assignés
    if (this.data.assignedEmployees.length > 50) {
      anomalies.push('too_many_employees');
    }

    return anomalies;
  }

  // Méthode pour l'API
  public toAPI(): any {
    const apiData = super.toAPI();
    const anomalies = this.detectAnomalies();
    const projectInfo = this.getProjectInfo();

    return {
      ...apiData,
      statusLabel: this.getStatusLabel(),
      phase: projectInfo.phase,
      durationDays: projectInfo.durationDays,
      durationWeeks: this.getDurationInWeeks(),
      durationMonths: this.getDurationInMonths(),
      isCurrentlyActive: projectInfo.isCurrentlyActive,
      employeesCount: projectInfo.employeesCount,
      activityCodesCount: projectInfo.activityCodesCount,
      isActive: this.isActive,
      isCompleted: this.isCompleted,
      isOnHold: this.isOnHold,
      isInactive: this.isInactive,
      canAcceptTimeEntries: this.canAcceptTimeEntries,
      anomalies,
      hasAnomalies: anomalies.length > 0
    };
  }
}