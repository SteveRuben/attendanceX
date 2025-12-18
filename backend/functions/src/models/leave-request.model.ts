/**
 * Modèle LeaveRequest pour la gestion des demandes de congé
 */

import { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import { BaseModel, ValidationError } from './base.model';
import { LeaveRequest, LeaveStatus, LeaveType } from '../common/types';
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS, VALIDATION_LIMITS } from '../common/constants';

export class LeaveRequestModel extends BaseModel<LeaveRequest> {
  constructor(data: Partial<LeaveRequest>) {
    const leaveData = {
      ...data,
      status: data.status || LeaveStatus.PENDING,
      isHalfDay: data.isHalfDay || false,
      deductedFromBalance: data.deductedFromBalance !== undefined ? data.deductedFromBalance : true,
      balanceImpact: data.balanceImpact || {
        [LeaveType.VACATION]: 0,
        [LeaveType.SICK_LEAVE]: 0,
        [LeaveType.PERSONAL]: 0,
        [LeaveType.MATERNITY]: 0,
        [LeaveType.PATERNITY]: 0,
        [LeaveType.BEREAVEMENT]: 0,
        [LeaveType.STUDY]: 0,
        [LeaveType.UNPAID]: 0,
        [LeaveType.COMPENSATORY]: 0
      }
    };

    super(leaveData);
  }

  // Getters spécifiques
  get employeeId(): string {
    return this.data.employeeId;
  }

  get tenantId(): string {
    return this.data.tenantId;
  }

  get type(): LeaveType {
    return this.data.type;
  }

  get startDate(): string {
    return this.data.startDate;
  }

  get endDate(): string {
    return this.data.endDate;
  }

  get totalDays(): number {
    return this.data.totalDays;
  }

  get isHalfDay(): boolean {
    return this.data.isHalfDay;
  }

  get halfDayPeriod(): 'morning' | 'afternoon' | undefined {
    return this.data.halfDayPeriod;
  }

  get reason(): string {
    return this.data.reason;
  }

  get attachments(): string[] | undefined {
    return this.data.attachments;
  }

  get status(): LeaveStatus {
    return this.data.status;
  }

  get approvedBy(): string | undefined {
    return this.data.approvedBy;
  }

  get approvedAt(): Date | undefined {
    return this.data.approvedAt;
  }

  get rejectionReason(): string | undefined {
    return this.data.rejectionReason;
  }

  get deductedFromBalance(): boolean {
    return this.data.deductedFromBalance;
  }

  get balanceImpact(): Record<LeaveType, number> {
    return this.data.balanceImpact;
  }

  get submittedAt(): Date | undefined {
    return this.data.submittedAt;
  }

  // Méthodes de calcul des jours
  public calculateTotalDays(): number {
    const start = new Date(this.data.startDate);
    const end = new Date(this.data.endDate);
    
    if (end < start) {
      throw new ValidationError('End date must be after or equal to start date');
    }

    // Calculer le nombre de jours entre les dates (inclus)
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    // Si c'est une demi-journée, diviser par 2
    if (this.data.isHalfDay) {
      return 0.5;
    }

    return daysDiff;
  }

  public updateTotalDays(): void {
    this.data.totalDays = this.calculateTotalDays();
    this.updateTimestamp();
  }

  // Méthodes de gestion du statut
  public submit(): void {
    if (this.data.status !== LeaveStatus.PENDING) {
      throw new ValidationError('Only pending requests can be submitted');
    }

    this.data.submittedAt = new Date();
    this.updateTimestamp();
  }

  public approve(approvedBy: string, notes?: string): void {
    if (this.data.status !== LeaveStatus.PENDING) {
      throw new ValidationError('Only pending requests can be approved');
    }

    this.data.status = LeaveStatus.APPROVED;
    this.data.approvedBy = approvedBy;
    this.data.approvedAt = new Date();
    
    if (notes) {
      this.data.rejectionReason = undefined; // Clear any previous rejection reason
    }

    this.updateTimestamp();
  }

  public reject(rejectedBy: string, reason: string): void {
    if (this.data.status !== LeaveStatus.PENDING) {
      throw new ValidationError('Only pending requests can be rejected');
    }

    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Rejection reason is required');
    }

    this.data.status = LeaveStatus.REJECTED;
    this.data.approvedBy = rejectedBy;
    this.data.approvedAt = new Date();
    this.data.rejectionReason = reason.trim();

    this.updateTimestamp();
  }

  public cancel(): void {
    if (this.data.status === LeaveStatus.CANCELLED) {
      throw new ValidationError('Request is already cancelled');
    }

    if (this.data.status === LeaveStatus.APPROVED) {
      // Vérifier si la date de début n'est pas déjà passée
      const startDate = new Date(this.data.startDate);
      const now = new Date();
      
      if (startDate <= now) {
        throw new ValidationError('Cannot cancel approved leave that has already started');
      }
    }

    this.data.status = LeaveStatus.CANCELLED;
    this.updateTimestamp();
  }

  // Méthodes de gestion des pièces jointes
  public addAttachment(url: string): void {
    if (!BaseModel.validateUrl(url)) {
      throw new ValidationError('Invalid attachment URL');
    }

    if (!this.data.attachments) {
      this.data.attachments = [];
    }

    if (this.data.attachments.includes(url)) {
      throw new ValidationError('Attachment already exists');
    }

    this.data.attachments.push(url);
    this.updateTimestamp();
  }

  public removeAttachment(url: string): void {
    if (!this.data.attachments) {
      return;
    }

    const index = this.data.attachments.indexOf(url);
    if (index > -1) {
      this.data.attachments.splice(index, 1);
      this.updateTimestamp();
    }
  }

  // Méthodes de gestion de l'impact sur les soldes
  public setBalanceImpact(leaveType: LeaveType, days: number): void {
    if (days < 0) {
      throw new ValidationError('Balance impact cannot be negative');
    }

    if (!this.data.balanceImpact) {
      this.data.balanceImpact = {
        [LeaveType.VACATION]: 0,
        [LeaveType.SICK_LEAVE]: 0,
        [LeaveType.PERSONAL]: 0,
        [LeaveType.MATERNITY]: 0,
        [LeaveType.PATERNITY]: 0,
        [LeaveType.BEREAVEMENT]: 0,
        [LeaveType.STUDY]: 0,
        [LeaveType.UNPAID]: 0,
        [LeaveType.COMPENSATORY]: 0
      };
    }

    this.data.balanceImpact[leaveType] = days;
    this.updateTimestamp();
  }

  public calculateBalanceImpact(): Record<LeaveType, number> {
    const impact: Record<LeaveType, number> = {
      [LeaveType.VACATION]: 0,
      [LeaveType.SICK_LEAVE]: 0,
      [LeaveType.PERSONAL]: 0,
      [LeaveType.MATERNITY]: 0,
      [LeaveType.PATERNITY]: 0,
      [LeaveType.BEREAVEMENT]: 0,
      [LeaveType.UNPAID]: 0,
      [LeaveType.COMPENSATORY]: 0,
      [LeaveType.STUDY]: 0
    };

    if (this.data.deductedFromBalance) {
      impact[this.data.type] = this.data.totalDays;
    }

    return impact;
  }

  public updateBalanceImpact(): void {
    this.data.balanceImpact = this.calculateBalanceImpact();
    this.updateTimestamp();
  }

  // Méthodes de validation des dates
  public validateDates(): void {
    const startDate = new Date(this.data.startDate);
    const endDate = new Date(this.data.endDate);
    const now = new Date();

    // Vérifier que les dates sont valides
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    // Vérifier que la date de fin est après ou égale à la date de début
    if (endDate < startDate) {
      throw new ValidationError('End date must be after or equal to start date');
    }

    // Vérifier que les dates ne sont pas dans le passé (sauf pour certains types de congés)
    if (this.data.type !== LeaveType.SICK_LEAVE && startDate < now) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (startDate < yesterday) {
        throw new ValidationError('Leave start date cannot be in the past');
      }
    }

    // Vérifier la durée maximale
    if (this.data.totalDays > VALIDATION_LIMITS.maxLeaveRequestDays) {
      throw new ValidationError(`Leave duration cannot exceed ${VALIDATION_LIMITS.maxLeaveRequestDays} days`);
    }
  }

  // Méthodes de vérification des conflits
  public overlapsWith(otherLeave: LeaveRequestModel): boolean {
    const thisStart = new Date(this.data.startDate);
    const thisEnd = new Date(this.data.endDate);
    const otherStart = new Date(otherLeave.startDate);
    const otherEnd = new Date(otherLeave.endDate);

    // Pas de chevauchement si une période se termine avant que l'autre commence
    return !(thisEnd < otherStart || otherEnd < thisStart);
  }

  // Méthodes utilitaires
  public getDuration(): number {
    return this.data.totalDays;
  }

  public getTypeLabel(): string {
    return LEAVE_TYPE_LABELS[this.data.type] || this.data.type;
  }

  public getStatusLabel(): string {
    return LEAVE_STATUS_LABELS[this.data.status] || this.data.status;
  }

  public isPending(): boolean {
    return this.data.status === LeaveStatus.PENDING;
  }

  public isApproved(): boolean {
    return this.data.status === LeaveStatus.APPROVED;
  }

  public isRejected(): boolean {
    return this.data.status === LeaveStatus.REJECTED;
  }

  public isCancelled(): boolean {
    return this.data.status === LeaveStatus.CANCELLED;
  }

  public isActive(): boolean {
    if (!this.isApproved()) {
      return false;
    }

    const now = new Date();
    const startDate = new Date(this.data.startDate);
    const endDate = new Date(this.data.endDate);

    return now >= startDate && now <= endDate;
  }

  public isUpcoming(): boolean {
    if (!this.isApproved()) {
      return false;
    }

    const now = new Date();
    const startDate = new Date(this.data.startDate);

    return startDate > now;
  }

  public isPast(): boolean {
    const now = new Date();
    const endDate = new Date(this.data.endDate);

    return endDate < now;
  }

  public canBeModified(): boolean {
    // Seules les demandes en attente peuvent être modifiées
    if (this.data.status !== LeaveStatus.PENDING) {
      return false;
    }

    // Vérifier si la date de début n'est pas trop proche
    const startDate = new Date(this.data.startDate);
    const now = new Date();
    const daysDiff = (startDate.getTime() - now.getTime()) / (1000 * 3600 * 24);

    return daysDiff > 1; // Au moins 1 jour d'avance
  }

  public canBeCancelled(): boolean {
    // Les demandes approuvées peuvent être annulées si elles n'ont pas encore commencé
    if (this.data.status === LeaveStatus.APPROVED) {
      const startDate = new Date(this.data.startDate);
      const now = new Date();
      return startDate > now;
    }

    // Les demandes en attente peuvent toujours être annulées
    return this.data.status === LeaveStatus.PENDING;
  }

  // Validation
  public async validate(): Promise<boolean> {
    try {
      // Validation des champs requis
      BaseModel.validateRequired(this.data, [
        'employeeId',
        'organizationId',
        'type',
        'startDate',
        'endDate',
        'totalDays',
        'reason',
        'status',
        'deductedFromBalance'
      ]);

      // Validation du type de congé
      if (!Object.values(LeaveType).includes(this.data.type)) {
        throw new ValidationError('Invalid leave type');
      }

      // Validation du statut
      if (!Object.values(LeaveStatus).includes(this.data.status)) {
        throw new ValidationError('Invalid leave status');
      }

      // Validation des dates
      this.validateDates();

      // Validation de la raison
      if (!this.data.reason || this.data.reason.trim().length === 0) {
        throw new ValidationError('Leave reason is required');
      }

      if (this.data.reason.length > 500) {
        throw new ValidationError('Leave reason must be 500 characters or less');
      }

      // Validation des jours totaux
      if (this.data.totalDays <= 0) {
        throw new ValidationError('Total days must be greater than 0');
      }

      // Validation de la demi-journée
      if (this.data.isHalfDay) {
        if (this.data.totalDays !== 0.5) {
          throw new ValidationError('Half day leave must be exactly 0.5 days');
        }

        if (!this.data.halfDayPeriod) {
          throw new ValidationError('Half day period must be specified');
        }

        if (!['morning', 'afternoon'].includes(this.data.halfDayPeriod)) {
          throw new ValidationError('Half day period must be morning or afternoon');
        }

        // Vérifier que les dates de début et fin sont identiques pour une demi-journée
        if (this.data.startDate !== this.data.endDate) {
          throw new ValidationError('Half day leave must have same start and end date');
        }
      }

      // Validation des pièces jointes
      if (this.data.attachments) {
        this.data.attachments.forEach((url, index) => {
          if (!BaseModel.validateUrl(url)) {
            throw new ValidationError(`Invalid attachment URL at index ${index}`);
          }
        });
      }

      // Validation de l'approbation
      if (this.data.status === LeaveStatus.APPROVED || this.data.status === LeaveStatus.REJECTED) {
        if (!this.data.approvedBy) {
          throw new ValidationError('Approved/rejected requests must have approver information');
        }

        if (!this.data.approvedAt) {
          throw new ValidationError('Approved/rejected requests must have approval date');
        }
      }

      // Validation de la raison de rejet
      if (this.data.status === LeaveStatus.REJECTED) {
        if (!this.data.rejectionReason || this.data.rejectionReason.trim().length === 0) {
          throw new ValidationError('Rejected requests must have rejection reason');
        }

        if (this.data.rejectionReason.length > 500) {
          throw new ValidationError('Rejection reason must be 500 characters or less');
        }
      }

      // Validation de l'impact sur les soldes
      if (this.data.balanceImpact) {
        Object.entries(this.data.balanceImpact).forEach(([leaveType, impact]) => {
          if (typeof impact !== 'number' || impact < 0) {
            throw new ValidationError(`Invalid balance impact for ${leaveType}: must be a non-negative number`);
          }
        });
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Leave request validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Conversion vers Firestore
  public toFirestore(): DocumentData {
    const data = {
      employeeId: this.data.employeeId,
      tenantId: this.data.tenantId,
      type: this.data.type,
      startDate: this.data.startDate,
      endDate: this.data.endDate,
      totalDays: this.data.totalDays,
      isHalfDay: this.data.isHalfDay,
      halfDayPeriod: this.data.halfDayPeriod || null,
      reason: this.data.reason,
      attachments: this.data.attachments || null,
      status: this.data.status,
      approvedBy: this.data.approvedBy || null,
      approvedAt: this.data.approvedAt || null,
      rejectionReason: this.data.rejectionReason || null,
      deductedFromBalance: this.data.deductedFromBalance,
      balanceImpact: this.data.balanceImpact || {},
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt,
      submittedAt: this.data.submittedAt || null
    };

    return this.convertDatesToFirestore(data);
  }

  // Création depuis Firestore
  public static fromFirestore(doc: DocumentSnapshot): LeaveRequestModel | null {
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
    const leaveData = new LeaveRequestModel({}).convertDatesFromFirestore(convertedData) as LeaveRequest;

    return new LeaveRequestModel(leaveData);
  }

  // Méthode pour l'API
  public toAPI(): Partial<LeaveRequest> {
    const apiData = super.toAPI();
    return {
      ...apiData,
      duration: this.getDuration(),
      /*statusLabel: this.getStatusLabel(),
      isPending: this.isPending(),
      isApproved: this.isApproved(),
      isRejected: this.isRejected(),
      isCancelled: this.isCancelled(),
      isActive: this.isActive(),
      isUpcoming: this.isUpcoming(),
      isPast: this.isPast(),
      canBeModified: this.canBeModified(),
      canBeCancelled: this.canBeCancelled()*/
    };
  }
}