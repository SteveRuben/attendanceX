/**
 * Service de gestion des statuts et transitions des feuilles de temps
 */

import { firestore } from 'firebase-admin';
import { TimesheetModel } from '../../models/timesheet.model';
import { ValidationError } from '../../models/base.model';
import { TimesheetStatus, Timesheet } from '../../common/types';

// Types pour les transitions de statut
export interface StatusTransition {
  id?: string;
  tenantId: string;

  // Identification
  timesheetId: string;
  employeeId: string;

  // Transition
  fromStatus: string;
  toStatus: string;
  transitionType: 'submit' | 'approve' | 'reject' | 'reopen' | 'lock' | 'unlock' | 'correct';

  // Métadonnées
  performedBy: string;
  performedAt: Date;
  reason?: string;
  comments?: string;

  // Validation
  validationResults?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };

  // Audit
  createdAt: Date;
}

export interface SubmissionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiredFields: string[];
  missingEntries: string[];
  totalHours: number;
  billableHours: number;
  hasOvertime: boolean;
}

export class TimesheetStatusService {
  private db: firestore.Firestore;
  private transitionsCollection: string = 'timesheet_transitions';

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  // ==================== Transitions de statut ====================

  /**
   * Soumettre une feuille de temps pour approbation
   */
  async submitTimesheet(
    tenantId: string,
    timesheetId: string,
    submittedBy: string,
    comments?: string
  ): Promise<{
    timesheet: TimesheetModel;
    validation: SubmissionValidation;
    transition: StatusTransition;
  }> {
    try {
      // 1. Obtenir la feuille de temps
      const timesheet = await this.getTimesheet(tenantId, timesheetId);

      if (!timesheet) {
        throw new ValidationError('Timesheet not found');
      }

      // 2. Vérifier que la feuille peut être soumise
      if (timesheet.status !== TimesheetStatus.DRAFT) {
        throw new ValidationError(`Cannot submit timesheet with status: ${timesheet.status}`);
      }

      // 3. Valider la feuille de temps avant soumission
      const validation = await this.validateForSubmission(tenantId, timesheet);

      if (!validation.isValid) {
        throw new ValidationError(`Timesheet validation failed: ${validation.errors.join(', ')}`);
      }

      // 4. Effectuer la transition
      const transition = await this.createTransition(
        tenantId,
        timesheetId,
        timesheet.employeeId,
        'draft',
        'submitted',
        'submit',
        submittedBy,
        comments,
        validation
      );

      // 5. Mettre à jour le statut de la feuille de temps
      timesheet.update({
        status: TimesheetStatus.SUBMITTED,
        submittedAt: new Date(),
        submittedBy
      } as Partial<Timesheet>);

      await this.updateTimesheetInDb(timesheet);

      return {
        timesheet,
        validation,
        transition
      };
    } catch (error) {
      throw new Error(`Failed to submit timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Approuver une feuille de temps
   */
  async approveTimesheet(
    tenantId: string,
    timesheetId: string,
    approvedBy: string,
    comments?: string
  ): Promise<{
    timesheet: TimesheetModel;
    transition: StatusTransition;
  }> {
    try {
      const timesheet = await this.getTimesheet(tenantId, timesheetId);

      if (!timesheet) {
        throw new ValidationError('Timesheet not found');
      }

      if (timesheet.status !== TimesheetStatus.SUBMITTED) {
        throw new ValidationError(`Cannot approve timesheet with status: ${timesheet.status}`);
      }

      // Créer la transition
      const transition = await this.createTransition(
        tenantId,
        timesheetId,
        timesheet.employeeId,
        'submitted',
        'approved',
        'approve',
        approvedBy,
        comments
      );

      // Mettre à jour le statut
      timesheet.update({
        status: TimesheetStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy
      });

      await this.updateTimesheetInDb(timesheet);

      return {
        timesheet,
        transition
      };
    } catch (error) {
      throw new Error(`Failed to approve timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rejeter une feuille de temps
   */
  async rejectTimesheet(
    tenantId: string,
    timesheetId: string,
    rejectedBy: string,
    reason: string,
    comments?: string
  ): Promise<{
    timesheet: TimesheetModel;
    transition: StatusTransition;
  }> {
    try {
      const timesheet = await this.getTimesheet(tenantId, timesheetId);

      if (!timesheet) {
        throw new ValidationError('Timesheet not found');
      }

      if (timesheet.status !== TimesheetStatus.SUBMITTED) {
        throw new ValidationError(`Cannot reject timesheet with status: ${timesheet.status}`);
      }

      // Créer la transition
      const transition = await this.createTransition(
        tenantId,
        timesheetId,
        timesheet.employeeId,
        'submitted',
        'rejected',
        'reject',
        rejectedBy,
        comments,
        undefined,
        reason
      );

      // Mettre à jour le statut (retour en brouillon pour correction)
      timesheet.update({
        status: TimesheetStatus.DRAFT,
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason: reason,
        rejectionComments: comments
      } as Partial<Timesheet>);

      await this.updateTimesheetInDb(timesheet);

      return {
        timesheet,
        transition
      };
    } catch (error) {
      throw new Error(`Failed to reject timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  /**
 
  * Rouvrir une feuille de temps approuvée
   */
  async reopenTimesheet(
    tenantId: string,
    timesheetId: string,
    reopenedBy: string,
    reason: string,
    comments?: string
  ): Promise<{
    timesheet: TimesheetModel;
    transition: StatusTransition;
  }> {
    try {
      const timesheet = await this.getTimesheet(tenantId, timesheetId);

      if (!timesheet) {
        throw new ValidationError('Timesheet not found');
      }

      if (timesheet.status !== TimesheetStatus.APPROVED) {
        throw new ValidationError(`Cannot reopen timesheet with status: ${timesheet.status}`);
      }

      // Vérifier les permissions de réouverture
      const canReopen = await this.canReopenTimesheet(tenantId, timesheet, reopenedBy);
      if (!canReopen) {
        throw new ValidationError('Insufficient permissions to reopen timesheet');
      }

      // Créer la transition
      const transition = await this.createTransition(
        tenantId,
        timesheetId,
        timesheet.employeeId,
        'approved',
        'draft',
        'reopen',
        reopenedBy,
        comments,
        undefined,
        reason
      );

      // Mettre à jour le statut
      timesheet.update({
        status: TimesheetStatus.DRAFT,
        reopenedAt: new Date(),
        reopenedBy,
        reopenReason: reason,
        reopenComments: comments,
        // Réinitialiser les champs d'approbation
        approvedAt: undefined,
        approvedBy: undefined
      } as Partial<Timesheet>);

      await this.updateTimesheetInDb(timesheet);

      return {
        timesheet,
        transition
      };
    } catch (error) {
      throw new Error(`Failed to reopen timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verrouiller une feuille de temps
   */
  async lockTimesheet(
    tenantId: string,
    timesheetId: string,
    lockedBy: string,
    reason?: string
  ): Promise<{
    timesheet: TimesheetModel;
    transition: StatusTransition;
  }> {
    try {
      const timesheet = await this.getTimesheet(tenantId, timesheetId);

      if (!timesheet) {
        throw new ValidationError('Timesheet not found');
      }

      if (timesheet.status !== TimesheetStatus.APPROVED) {
        throw new ValidationError(`Cannot lock timesheet with status: ${timesheet.status}`);
      }

      // Créer la transition
      const transition = await this.createTransition(
        tenantId,
        timesheetId,
        timesheet.employeeId,
        'approved',
        'locked',
        'lock',
        lockedBy,
        undefined,
        undefined,
        reason
      );

      // Mettre à jour le statut
      timesheet.update({
        status: TimesheetStatus.LOCKED,
        lockedAt: new Date(),
        lockedBy
      } as Partial<Timesheet>);

      await this.updateTimesheetInDb(timesheet);

      return {
        timesheet,
        transition
      };
    } catch (error) {
      throw new Error(`Failed to lock timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Validation pour soumission ====================

  /**
   * Valider une feuille de temps avant soumission
   */
  async validateForSubmission(
    tenantId: string,
    timesheet: TimesheetModel
  ): Promise<SubmissionValidation> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      const requiredFields: string[] = [];
      const missingEntries: string[] = [];

      // 1. Vérifier les champs requis
      if (!timesheet.employeeId) {
        requiredFields.push('employeeId');
      }

      if (!timesheet.periodStart || !timesheet.periodEnd) {
        requiredFields.push('period');
      }

      // 2. Vérifier les entrées de temps
      const entries = timesheet.timeEntries;

      if (entries.length === 0) {
        errors.push('No time entries found');
      }

      // 3. Utiliser les totaux existants de la feuille de temps
      const totals = {
        totalHours: timesheet.totalHours,
        billableHours: timesheet.totalBillableHours,
        overtimeHours: 0 // TODO: Calculer les heures supplémentaires si nécessaire
      };

      if (totals.totalHours === 0) {
        errors.push('Total hours cannot be zero');
      }

      // 4. Vérifier les heures minimales requises (configurable)
      const minHoursRequired = await this.getMinimumHoursRequired(tenantId);
      if (totals.totalHours < minHoursRequired) {
        warnings.push(`Total hours (${totals.totalHours}) below minimum required (${minHoursRequired})`);
      }

      // 5. Vérifier les entrées de temps (IDs seulement disponibles)
      // TODO: Intégrer avec le service TimeEntry pour obtenir les détails complets
      // Pour l'instant, on fait une validation basique sur les IDs

      if (entries.some(entryId => !entryId || entryId.trim().length === 0)) {
        errors.push('Invalid time entry IDs found');
      }

      // 6. Validation des chevauchements et autres vérifications détaillées
      // TODO: Implémenter quand les détails des entrées seront disponibles
      // const timeEntryDetails = await this.getTimeEntryDetails(entries);
      // const overlaps = this.detectTimeOverlaps(timeEntryDetails);
      // if (overlaps.length > 0) {
      //   errors.push(`Tim
      // 7. Vérifier les chevauchements
      const overlaps = this.detectTimeOverlaps(entries);
      if (overlaps.length > 0) {
        errors.push(`Time overlaps detected: ${overlaps.join(', ')}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        requiredFields,
        missingEntries,
        totalHours: totals.totalHours,
        billableHours: totals.billableHours,
        hasOvertime: totals.overtimeHours > 0
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        requiredFields: [],
        missingEntries: [],
        totalHours: 0,
        billableHours: 0,
        hasOvertime: false
      };
    }
  }

  // ==================== Vérifications de permissions ====================

  /**
   * Vérifier si une feuille de temps peut être modifiée
   */
  async canModifyTimesheet(
    tenantId: string,
    timesheet: TimesheetModel,
    userId: string
  ): Promise<{
    canModify: boolean;
    reason?: string;
    allowedActions: string[];
  }> {
    try {
      const allowedActions: string[] = [];

      // Vérifier le statut
      switch (timesheet.status) {
        case TimesheetStatus.DRAFT:
          // En brouillon, l'employé peut modifier
          if (timesheet.employeeId === userId) {
            return {
              canModify: true,
              allowedActions: ['edit', 'submit', 'delete']
            };
          }
          // Les managers peuvent aussi modifier
          const canManagerEdit = await this.canUserManageEmployee(tenantId, userId, timesheet.employeeId);
          if (canManagerEdit) {
            return {
              canModify: true,
              allowedActions: ['edit', 'submit']
            };
          }
          break;

        case TimesheetStatus.SUBMITTED:
          // Soumise, seuls les approbateurs peuvent agir
          const canApprove = await this.canUserApprove(tenantId, userId, timesheet.employeeId);
          if (canApprove) {
            allowedActions.push('approve', 'reject');
          }
          break;

        case TimesheetStatus.APPROVED:
          // Approuvée, seuls les managers peuvent rouvrir
          const canReopen = await this.canReopenTimesheet(tenantId, timesheet, userId);
          if (canReopen) {
            allowedActions.push('reopen', 'lock');
          }
          break;

        case TimesheetStatus.LOCKED:
          // Verrouillée, seuls les admins peuvent déverrouiller
          const canUnlock = await this.canUnlockTimesheet(tenantId, userId);
          if (canUnlock) {
            allowedActions.push('unlock');
          }
          break;
      }

      return {
        canModify: allowedActions.includes('edit'),
        reason: allowedActions.length === 0 ? `No permissions for timesheet with status: ${timesheet.status}` : undefined,
        allowedActions
      };
    } catch (error) {
      return {
        canModify: false,
        reason: `Permission check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        allowedActions: []
      };
    }
  }
  // ==================== Méthodes utilitaires ====================

  private async createTransition(
    tenantId: string,
    timesheetId: string,
    employeeId: string,
    fromStatus: string,
    toStatus: string,
    transitionType: StatusTransition['transitionType'],
    performedBy: string,
    comments?: string,
    validationResults?: SubmissionValidation,
    reason?: string
  ): Promise<StatusTransition> {
    try {
      const transition: StatusTransition = {
        tenantId,
        timesheetId,
        employeeId,
        fromStatus,
        toStatus,
        transitionType,
        performedBy,
        performedAt: new Date(),
        reason,
        comments,
        validationResults,
        createdAt: new Date()
      };

      const docRef = await this.db.collection(this.transitionsCollection).add(transition);

      return {
        ...transition,
        id: docRef.id
      };
    } catch (error) {
      throw new Error(`Failed to create transition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getTimesheet(tenantId: string, timesheetId: string): Promise<TimesheetModel | null> {
    try {
      // TODO: Intégrer avec le TimesheetService existant
      // Pour l'instant, retourner null
      return null;
    } catch (error) {
      return null;
    }
  }

  private async updateTimesheetInDb(timesheet: TimesheetModel): Promise<void> {
    try {
      // TODO: Intégrer avec le TimesheetService existant pour la mise à jour
      console.log('Updating timesheet in database:', timesheet.id);
    } catch (error) {
      throw new Error(`Failed to update timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getMinimumHoursRequired(tenantId: string): Promise<number> {
    try {
      // TODO: Obtenir depuis la configuration
      return 35; // 35 heures par semaine par défaut
    } catch (error) {
      return 0;
    }
  }

  private detectTimeOverlaps(entries: any[]): string[] {
    const overlaps: string[] = [];

    // Cette méthode nécessite les détails complets des entrées de temps
    // Pour l'instant, retourner un tableau vide jusqu'à ce que l'intégration soit faite
    // TODO: Intégrer avec le service TimeEntry pour obtenir les détails et détecter les chevauchements

    if (!entries || entries.length === 0) {
      return overlaps;
    }

    // Vérification basique si les entrées ont les propriétés nécessaires
    const validEntries = entries.filter(entry =>
      entry &&
      entry.date &&
      entry.startTime &&
      entry.endTime
    );

    if (validEntries.length === 0) {
      return overlaps;
    }

    // Trier les entrées par date et heure de début
    const sortedEntries = validEntries.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateA.getTime() - dateB.getTime();
    });

    // Vérifier les chevauchements
    for (let i = 0; i < sortedEntries.length - 1; i++) {
      const current = sortedEntries[i];
      const next = sortedEntries[i + 1];

      const currentEnd = new Date(`${current.date}T${current.endTime}`);
      const nextStart = new Date(`${next.date}T${next.startTime}`);

      if (currentEnd > nextStart) {
        overlaps.push(`${current.date} ${current.startTime}-${current.endTime} overlaps with ${next.startTime}-${next.endTime}`);
      }
    }

    return overlaps;
  }

  private async canReopenTimesheet(tenantId: string, timesheet: TimesheetModel, userId: string): Promise<boolean> {
    try {
      // TODO: Vérifier les permissions avec le service de permissions
      // Pour l'instant, permettre seulement aux managers
      return this.canUserManageEmployee(tenantId, userId, timesheet.employeeId);
    } catch (error) {
      return false;
    }
  }

  private async canUserManageEmployee(tenantId: string, userId: string, employeeId: string): Promise<boolean> {
    try {
      // TODO: Intégrer avec le système de hiérarchie organisationnelle
      return false;
    } catch (error) {
      return false;
    }
  }

  private async canUserApprove(tenantId: string, userId: string, employeeId: string): Promise<boolean> {
    try {
      // TODO: Intégrer avec le service d'approbation
      return false;
    } catch (error) {
      return false;
    }
  }

  private async canUnlockTimesheet(tenantId: string, userId: string): Promise<boolean> {
    try {
      // TODO: Vérifier les permissions admin
      return false;
    } catch (error) {
      return false;
    }
  }

  // ==================== Méthodes de requête ====================

  /**
   * Obtenir l'historique des transitions pour une feuille de temps
   */
  async getTimesheetTransitions(tenantId: string, timesheetId: string): Promise<StatusTransition[]> {
    try {
      const query = await this.db.collection(this.transitionsCollection)
        .where('tenantId', '==', tenantId)
        .where('timesheetId', '==', timesheetId)
        .orderBy('performedAt', 'desc')
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StatusTransition));
    } catch (error) {
      throw new Error(`Failed to get timesheet transitions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les statistiques de transitions
   */
  async getTransitionStatistics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalTransitions: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    averageApprovalTime: number;
    rejectionRate: number;
  }> {
    try {
      let query = this.db.collection(this.transitionsCollection)
        .where('tenantId', '==', tenantId);

      if (startDate) {
        query = query.where('performedAt', '>=', startDate);
      }

      if (endDate) {
        query = query.where('performedAt', '<=', endDate);
      }

      const result = await query.get();
      const transitions = result.docs.map(doc => doc.data() as StatusTransition);

      const stats = {
        totalTransitions: transitions.length,
        byType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        averageApprovalTime: 0,
        rejectionRate: 0
      };

      const totalApprovalTime = 0;
      let approvalCount = 0;
      let rejectionCount = 0;
      let submissionCount = 0;

      transitions.forEach(transition => {
        // Compter par type
        stats.byType[transition.transitionType] = (stats.byType[transition.transitionType] || 0) + 1;

        // Compter par statut de destination
        stats.byStatus[transition.toStatus] = (stats.byStatus[transition.toStatus] || 0) + 1;

        // Calculer les métriques
        if (transition.transitionType === 'submit') {
          submissionCount++;
        } else if (transition.transitionType === 'approve') {
          approvalCount++;
          // TODO: Calculer le temps d'approbation
        } else if (transition.transitionType === 'reject') {
          rejectionCount++;
        }
      });

      if (approvalCount > 0) {
        stats.averageApprovalTime = totalApprovalTime / approvalCount;
      }

      if (submissionCount > 0) {
        stats.rejectionRate = (rejectionCount / submissionCount) * 100;
      }

      return stats;
    } catch (error) {
      throw new Error(`Failed to get transition statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les feuilles de temps par statut
   */
  async getTimesheetsByStatus(
    tenantId: string,
    status: string,
    limit: number = 50
  ): Promise<TimesheetModel[]> {
    try {
      // TODO: Intégrer avec le TimesheetService pour obtenir les feuilles par statut
      return [];
    } catch (error) {
      throw new Error(`Failed to get timesheets by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Vérifier les feuilles de temps qui doivent être verrouillées automatiquement
   */
  async processAutoLocking(tenantId: string): Promise<TimesheetModel[]> {
    try {
      const lockedTimesheets: TimesheetModel[] = [];

      // TODO: Obtenir les feuilles approuvées qui doivent être verrouillées
      // selon la configuration (ex: après 30 jours)

      return lockedTimesheets;
    } catch (error) {
      throw new Error(`Failed to process auto locking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}