/**
 * Modèle ApprovalWorkflow pour la gestion des workflows d'approbation
 */

import { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import { BaseModel, ValidationError } from './base.model';

// Types pour les workflows d'approbation
export interface ApprovalWorkflow {
  id?: string;
  tenantId: string;

  // Identification
  timesheetId: string;
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;

  // Statut du workflow
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'escalated' | 'cancelled';
  currentLevel: number;
  totalLevels: number;

  // Approbateurs
  approvers: ApprovalLevel[];

  // Historique des actions
  history: ApprovalAction[];

  // Métadonnées
  submittedAt: Date;
  submittedBy: string;
  completedAt?: Date;
  escalatedAt?: Date;

  // Données de la feuille de temps
  timesheetData: {
    totalHours: number;
    totalCost: number;
    billableHours: number;
    billableCost: number;
    entriesCount: number;
    hasOvertime: boolean;
    overtimeHours: number;
  };

  // Configuration
  autoEscalationDays: number;
  allowDelegation: boolean;
  requireComments: boolean;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalLevel {
  level: number;
  approverId: string;
  approverName: string;
  approverEmail: string;
  status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'escalated';
  assignedAt: Date;
  respondedAt?: Date;
  delegatedTo?: string;
  delegatedAt?: Date;
  escalatedTo?: string;
  escalatedAt?: Date;
}

export interface ApprovalAction {
  id: string;
  actionType: 'submit' | 'approve' | 'reject' | 'delegate' | 'escalate' | 'comment' | 'cancel';
  performedBy: string;
  performedAt: Date;
  level: number;
  comments?: string;
  reason?: string;
  delegatedTo?: string;
  escalatedTo?: string;
  metadata?: Record<string, any>;
}

export class ApprovalWorkflowModel extends BaseModel<ApprovalWorkflow> {
  constructor(data: Partial<ApprovalWorkflow>) {
    const workflowData = {
      ...data,
      status: data.status || 'pending',
      currentLevel: data.currentLevel || 1,
      totalLevels: data.totalLevels || 1,
      approvers: data.approvers || [],
      history: data.history || [],
      autoEscalationDays: data.autoEscalationDays || 3,
      allowDelegation: data.allowDelegation !== undefined ? data.allowDelegation : true,
      requireComments: data.requireComments !== undefined ? data.requireComments : false
    };

    super(workflowData);
  }

  // Getters spécifiques
  get timesheetId(): string {
    return this.getData().timesheetId;
  }

  get employeeId(): string {
    return this.getData().employeeId;
  }

  get status(): string {
    return this.getData().status;
  }

  get currentLevel(): number {
    return this.getData().currentLevel;
  }

  get totalLevels(): number {
    return this.getData().totalLevels;
  }

  get isCompleted(): boolean {
    return ['approved', 'rejected', 'cancelled'].includes(this.getData().status);
  }

  get isPending(): boolean {
    return this.getData().status === 'pending' || this.getData().status === 'in_progress';
  }

  get needsEscalation(): boolean {
    const data = this.getData();
    if (this.isCompleted || data.autoEscalationDays <= 0) {
      return false;
    }

    const daysSinceSubmission = Math.floor(
      (Date.now() - data.submittedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceSubmission >= data.autoEscalationDays;
  }

  // Méthodes de gestion du workflow
  public getCurrentApprover(): ApprovalLevel | null {
    const data = this.getData();
    return data.approvers.find(a => a.level === data.currentLevel) || null;
  }

  public getNextApprover(): ApprovalLevel | null {
    const data = this.getData();
    return data.approvers.find(a => a.level === data.currentLevel + 1) || null;
  }

  public approve(approverId: string, comments?: string): void {
    const data = this.getData();
    const currentApprover = this.getCurrentApprover();

    if (!currentApprover || currentApprover.approverId !== approverId) {
      throw new ValidationError('Invalid approver for current level');
    }

    if (currentApprover.status !== 'pending') {
      throw new ValidationError('Approval level already processed');
    }

    currentApprover.status = 'approved';
    currentApprover.respondedAt = new Date();

    this.addHistoryAction({
      actionType: 'approve',
      performedBy: approverId,
      level: data.currentLevel,
      comments
    });

    if (data.currentLevel >= data.totalLevels) {
      this.update({
        status: 'approved',
        completedAt: new Date()
      });
    } else {
      this.update({
        currentLevel: data.currentLevel + 1,
        status: 'in_progress'
      });

      const nextApprover = this.getCurrentApprover();
      if (nextApprover) {
        nextApprover.assignedAt = new Date();
      }
    }
  }

  public reject(approverId: string, reason: string, comments?: string): void {
    const data = this.getData();
    const currentApprover = this.getCurrentApprover();

    if (!currentApprover || currentApprover.approverId !== approverId) {
      throw new ValidationError('Invalid approver for current level');
    }

    if (currentApprover.status !== 'pending') {
      throw new ValidationError('Approval level already processed');
    }

    currentApprover.status = 'rejected';
    currentApprover.respondedAt = new Date();

    this.addHistoryAction({
      actionType: 'reject',
      performedBy: approverId,
      level: data.currentLevel,
      reason,
      comments
    });

    this.update({
      status: 'rejected',
      completedAt: new Date()
    });
  }

  public delegate(approverId: string, delegateToId: string, comments?: string): void {
    const data = this.getData();
    const currentApprover = this.getCurrentApprover();

    if (!currentApprover || currentApprover.approverId !== approverId) {
      throw new ValidationError('Invalid approver for current level');
    }

    if (currentApprover.status !== 'pending') {
      throw new ValidationError('Approval level already processed');
    }

    if (!data.allowDelegation) {
      throw new ValidationError('Delegation is not allowed for this workflow');
    }

    currentApprover.status = 'delegated';
    currentApprover.delegatedTo = delegateToId;
    currentApprover.delegatedAt = new Date();
    currentApprover.approverId = delegateToId;

    this.addHistoryAction({
      actionType: 'delegate',
      performedBy: approverId,
      level: data.currentLevel,
      delegatedTo: delegateToId,
      comments
    });
  }

  public escalate(escalatedBy: string, escalateToId: string, reason?: string): void {
    const data = this.getData();
    const currentApprover = this.getCurrentApprover();

    if (!currentApprover) {
      throw new ValidationError('No current approver found');
    }

    currentApprover.status = 'escalated';
    currentApprover.escalatedTo = escalateToId;
    currentApprover.escalatedAt = new Date();
    currentApprover.approverId = escalateToId;

    this.addHistoryAction({
      actionType: 'escalate',
      performedBy: escalatedBy,
      level: data.currentLevel,
      escalatedTo: escalateToId,
      reason
    });

    this.update({
      status: 'escalated',
      escalatedAt: new Date()
    });
  }

  public cancel(cancelledBy: string, reason?: string): void {
    const data = this.getData();

    if (this.isCompleted) {
      throw new ValidationError('Cannot cancel completed workflow');
    }

    this.addHistoryAction({
      actionType: 'cancel',
      performedBy: cancelledBy,
      level: data.currentLevel,
      reason
    });

    this.update({
      status: 'cancelled',
      completedAt: new Date()
    });
  }

  public addComment(userId: string, comment: string, level?: number): void {
    const data = this.getData();
    this.addHistoryAction({
      actionType: 'comment',
      performedBy: userId,
      level: level || data.currentLevel,
      comments: comment
    });
  }

  private addHistoryAction(action: Omit<ApprovalAction, 'id' | 'performedAt'>): void {
    const historyAction: ApprovalAction = {
      ...action,
      id: this.generateActionId(),
      performedAt: new Date()
    };

    const data = this.getData();
    data.history.push(historyAction);
    this.update({ history: data.history });
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }  // 
  Validation
  public async validate(): Promise<boolean> {
    try {
      const data = this.getData();

      BaseModel.validateRequired(data, [
        'tenantId',
        'timesheetId',
        'employeeId',
        'periodStart',
        'periodEnd',
        'status',
        'currentLevel',
        'totalLevels',
        'approvers',
        'submittedAt',
        'submittedBy',
        'timesheetData'
      ]);

      const validStatuses = ['pending', 'in_progress', 'approved', 'rejected', 'escalated', 'cancelled'];
      if (!validStatuses.includes(data.status)) {
        throw new ValidationError('Invalid workflow status');
      }

      if (data.currentLevel < 1 || data.currentLevel > data.totalLevels) {
        throw new ValidationError('Current level must be between 1 and total levels');
      }

      if (data.totalLevels < 1 || data.totalLevels > 5) {
        throw new ValidationError('Total levels must be between 1 and 5');
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Approval workflow validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Conversion vers Firestore
  public toFirestore(): DocumentData {
    const data = this.getData();

    const firestoreData = {
      tenantId: data.tenantId,
      timesheetId: data.timesheetId,
      employeeId: data.employeeId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      status: data.status,
      currentLevel: data.currentLevel,
      totalLevels: data.totalLevels,
      approvers: data.approvers,
      history: data.history,
      submittedAt: data.submittedAt,
      submittedBy: data.submittedBy,
      completedAt: data.completedAt || null,
      escalatedAt: data.escalatedAt || null,
      timesheetData: data.timesheetData,
      autoEscalationDays: data.autoEscalationDays,
      allowDelegation: data.allowDelegation,
      requireComments: data.requireComments,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };

    return this.convertDatesToFirestore(firestoreData);
  }

  // Création depuis Firestore
  public static fromFirestore(doc: DocumentSnapshot): ApprovalWorkflowModel | null {
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

    const workflowData = new ApprovalWorkflowModel({}).convertDatesFromFirestore(convertedData) as ApprovalWorkflow;

    return new ApprovalWorkflowModel(workflowData);
  }

  // Méthode pour l'API
  public toAPI(): any {
    const apiData = super.toAPI();

    return {
      ...apiData,
      isCompleted: this.isCompleted,
      isPending: this.isPending,
      needsEscalation: this.needsEscalation,
      currentApprover: this.getCurrentApprover(),
      nextApprover: this.getNextApprover()
    };
  }
}