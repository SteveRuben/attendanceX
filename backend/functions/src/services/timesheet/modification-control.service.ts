/**
 * Service de contrôle des modifications des feuilles de temps
 */

import { firestore } from 'firebase-admin';
import { TimesheetModel } from '../../models/timesheet.model';
import { ValidationError } from '../../models/base.model';

// Types pour les logs de modification
export interface ModificationLog {
  id?: string;
  tenantId: string;

  // Identification
  timesheetId: string;
  timeEntryId?: string;
  employeeId: string;

  // Modification
  modificationType: 'create' | 'update' | 'delete' | 'bulk_update';
  fieldChanged?: string;
  oldValue?: any;
  newValue?: any;

  // Contexte
  reason?: string;
  comments?: string;
  isCorrection: boolean;
  correctionApprovedBy?: string;

  // Métadonnées
  performedBy: string;
  performedAt: Date;
  ipAddress?: string;
  userAgent?: string;

  // Validation
  bypassedValidations?: string[];

  // Audit
  createdAt: Date;
}

export interface ModificationPermission {
  canModify: boolean;
  requiresApproval: boolean;
  requiresReason: boolean;
  allowedFields?: string[];
  restrictedFields?: string[];
  maxDaysAfterSubmission?: number;
  reason?: string;
}

export interface CorrectionRequest {
  id?: string;
  tenantId: string;

  // Identification
  timesheetId: string;
  employeeId: string;

  // Demande
  requestedBy: string;
  requestedAt: Date;
  reason: string;
  description: string;

  // Modifications proposées
  proposedChanges: {
    type: 'add_entry' | 'modify_entry' | 'delete_entry';
    entryId?: string;
    entryData?: any;
    fieldChanges?: Record<string, any>;
  }[];

  // Statut
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewComments?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export class ModificationControlService {
  private db: firestore.Firestore;
  private logsCollection: string = 'modification_logs';
  private correctionsCollection: string = 'correction_requests';

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  // ==================== Contrôle des modifications ====================

  /**
   * Vérifier si une modification est autorisée
   */
  async checkModificationPermission(
    tenantId: string,
    timesheet: TimesheetModel,
    userId: string,
    modificationType: 'create' | 'update' | 'delete',
    fieldName?: string
  ): Promise<ModificationPermission> {
    try {
      const permission: ModificationPermission = {
        canModify: false,
        requiresApproval: false,
        requiresReason: false
      };

      // 1. Vérifier le statut de la feuille de temps
      switch (timesheet.status) {
        case 'draft':
          // En brouillon, modifications autorisées pour le propriétaire
          if (timesheet.employeeId === userId) {
            permission.canModify = true;
          } else {
            // Vérifier si l'utilisateur peut gérer cet employé
            const canManage = await this.canUserManageEmployee(tenantId, userId, timesheet.employeeId);
            if (canManage) {
              permission.canModify = true;
              permission.requiresReason = true;
            }
          }
          break;

        case 'submitted':
          // Soumise, modifications interdites sauf exceptions
          const config = await this.getModificationConfig(tenantId);

          if (config.allowEditAfterSubmission) {
            // Vérifier les permissions spéciales
            const hasSpecialPermission = await this.hasSpecialModificationPermission(tenantId, userId);
            if (hasSpecialPermission) {
              permission.canModify = true;
              permission.requiresApproval = true;
              permission.requiresReason = true;
              permission.maxDaysAfterSubmission = config.maxDaysAfterSubmission;
            }
          }
          break;

        case 'approved':
          // Approuvée, modifications très restreintes
          const approvedConfig = await this.getModificationConfig(tenantId);

          if (approvedConfig.allowEditAfterApproval) {
            const hasAdminPermission = await this.hasAdminPermission(tenantId, userId);
            if (hasAdminPermission) {
              permission.canModify = true;
              permission.requiresApproval = true;
              permission.requiresReason = true;
              permission.restrictedFields = ['status', 'approvedAt', 'approvedBy'];
            }
          }
          break;

        case 'locked':
          // Verrouillée, aucune modification autorisée
          permission.canModify = false;
          permission.reason = 'Timesheet is locked and cannot be modified';
          break;
      }

      // 2. Vérifier les restrictions temporelles
      if (permission.canModify && permission.maxDaysAfterSubmission) {
        const daysSinceSubmission = this.getDaysSinceSubmission(timesheet);
        if (daysSinceSubmission > permission.maxDaysAfterSubmission) {
          permission.canModify = false;
          permission.reason = `Modification period expired (${daysSinceSubmission} days since submission)`;
        }
      }

      // 3. Vérifier les champs restreints
      if (permission.canModify && fieldName && permission.restrictedFields?.includes(fieldName)) {
        permission.canModify = false;
        permission.reason = `Field '${fieldName}' cannot be modified`;
      }

      return permission;
    } catch (error) {
      return {
        canModify: false,
        requiresApproval: false,
        requiresReason: false,
        reason: `Permission check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Enregistrer une modification
   */
  async logModification(
    tenantId: string,
    timesheetId: string,
    employeeId: string,
    modificationType: ModificationLog['modificationType'],
    performedBy: string,
    options: {
      timeEntryId?: string;
      fieldChanged?: string;
      oldValue?: any;
      newValue?: any;
      reason?: string;
      comments?: string;
      isCorrection?: boolean;
      correctionApprovedBy?: string;
      ipAddress?: string;
      userAgent?: string;
      bypassedValidations?: string[];
    } = {}
  ): Promise<ModificationLog> {
    try {
      const log: ModificationLog = {
        tenantId,
        timesheetId,
        timeEntryId: options.timeEntryId,
        employeeId,
        modificationType,
        fieldChanged: options.fieldChanged,
        oldValue: options.oldValue,
        newValue: options.newValue,
        reason: options.reason,
        comments: options.comments,
        isCorrection: options.isCorrection || false,
        correctionApprovedBy: options.correctionApprovedBy,
        performedBy,
        performedAt: new Date(),
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        bypassedValidations: options.bypassedValidations,
        createdAt: new Date()
      };

      const docRef = await this.db.collection(this.logsCollection).add(log);

      return {
        ...log,
        id: docRef.id
      };
    } catch (error) {
      throw new Error(`Failed to log modification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Valider une modification avant application
   */
  async validateModification(
    tenantId: string,
    timesheet: TimesheetModel,
    modificationType: 'create' | 'update' | 'delete',
    entryData?: any,
    userId?: string
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    requiresApproval: boolean;
  }> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      let requiresApproval = false;

      // 1. Vérifier les permissions
      if (userId) {
        const permission = await this.checkModificationPermission(tenantId, timesheet, userId, modificationType);
        if (!permission.canModify) {
          errors.push(permission.reason || 'Modification not allowed');
        }
        requiresApproval = permission.requiresApproval;
      }

      // 2. Valider les données d'entrée
      if (entryData && (modificationType === 'create' || modificationType === 'update')) {
        const entryValidation = await this.validateTimeEntryData(tenantId, entryData);
        errors.push(...entryValidation.errors);
        warnings.push(...entryValidation.warnings);
      }

      // 3. Vérifier la cohérence avec les autres entrées
      if (entryData && timesheet) {
        const coherenceCheck = await this.checkDataCoherence(timesheet, entryData, modificationType);
        errors.push(...coherenceCheck.errors);
        warnings.push(...coherenceCheck.warnings);
      }

      // 4. Vérifier les limites de modification
      const modificationLimits = await this.checkModificationLimits(tenantId, timesheet);
      if (!modificationLimits.allowed) {
        errors.push(modificationLimits.reason || 'Modification limits exceeded');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        requiresApproval
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        requiresApproval: false
      };
    }
  }
  // ==================== Gestion des corrections ====================

  /**
   * Créer une demande de correction
   */
  async createCorrectionRequest(
    tenantId: string,
    timesheetId: string,
    employeeId: string,
    requestedBy: string,
    reason: string,
    description: string,
    proposedChanges: CorrectionRequest['proposedChanges']
  ): Promise<CorrectionRequest> {
    try {
      const request: CorrectionRequest = {
        tenantId,
        timesheetId,
        employeeId,
        requestedBy,
        requestedAt: new Date(),
        reason,
        description,
        proposedChanges,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await this.db.collection(this.correctionsCollection).add(request);

      return {
        ...request,
        id: docRef.id
      };
    } catch (error) {
      throw new Error(`Failed to create correction request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Approuver une demande de correction
   */
  async approveCorrectionRequest(
    tenantId: string,
    requestId: string,
    reviewedBy: string,
    comments?: string
  ): Promise<CorrectionRequest> {
    try {
      const request = await this.getCorrectionRequest(tenantId, requestId);

      if (!request) {
        throw new ValidationError('Correction request not found');
      }

      if (request.status !== 'pending') {
        throw new ValidationError(`Cannot approve request with status: ${request.status}`);
      }

      // Mettre à jour la demande
      const updatedRequest = {
        ...request,
        status: 'approved' as const,
        reviewedBy,
        reviewedAt: new Date(),
        reviewComments: comments,
        updatedAt: new Date()
      };

      await this.db.collection(this.correctionsCollection).doc(requestId).update(updatedRequest);

      return updatedRequest;
    } catch (error) {
      throw new Error(`Failed to approve correction request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rejeter une demande de correction
   */
  async rejectCorrectionRequest(
    tenantId: string,
    requestId: string,
    reviewedBy: string,
    comments: string
  ): Promise<CorrectionRequest> {
    try {
      const request = await this.getCorrectionRequest(tenantId, requestId);

      if (!request) {
        throw new ValidationError('Correction request not found');
      }

      if (request.status !== 'pending') {
        throw new ValidationError(`Cannot reject request with status: ${request.status}`);
      }

      // Mettre à jour la demande
      const updatedRequest = {
        ...request,
        status: 'rejected' as const,
        reviewedBy,
        reviewedAt: new Date(),
        reviewComments: comments,
        updatedAt: new Date()
      };

      await this.db.collection(this.correctionsCollection).doc(requestId).update(updatedRequest);

      return updatedRequest;
    } catch (error) {
      throw new Error(`Failed to reject correction request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Appliquer une correction approuvée
   */
  async applyCorrectionRequest(
    tenantId: string,
    requestId: string,
    appliedBy: string
  ): Promise<{
    request: CorrectionRequest;
    modifications: ModificationLog[];
  }> {
    try {
      const request = await this.getCorrectionRequest(tenantId, requestId);

      if (!request) {
        throw new ValidationError('Correction request not found');
      }

      if (request.status !== 'approved') {
        throw new ValidationError('Correction request must be approved before application');
      }

      const modifications: ModificationLog[] = [];

      // Appliquer chaque modification proposée
      for (const change of request.proposedChanges) {
        let modification: ModificationLog;

        switch (change.type) {
          case 'add_entry':
            modification = await this.logModification(
              tenantId,
              request.timesheetId,
              request.employeeId,
              'create',
              appliedBy,
              {
                reason: request.reason,
                comments: `Correction applied: ${request.description}`,
                isCorrection: true,
                correctionApprovedBy: request.reviewedBy,
                newValue: change.entryData
              }
            );
            break;

          case 'modify_entry':
            modification = await this.logModification(
              tenantId,
              request.timesheetId,
              request.employeeId,
              'update',
              appliedBy,
              {
                timeEntryId: change.entryId,
                reason: request.reason,
                comments: `Correction applied: ${request.description}`,
                isCorrection: true,
                correctionApprovedBy: request.reviewedBy,
                oldValue: change.fieldChanges,
                newValue: change.fieldChanges
              }
            );
            break;

          case 'delete_entry':
            modification = await this.logModification(
              tenantId,
              request.timesheetId,
              request.employeeId,
              'delete',
              appliedBy,
              {
                timeEntryId: change.entryId,
                reason: request.reason,
                comments: `Correction applied: ${request.description}`,
                isCorrection: true,
                correctionApprovedBy: request.reviewedBy
              }
            );
            break;
        }

        modifications.push(modification);
      }

      return {
        request,
        modifications
      };
    } catch (error) {
      throw new Error(`Failed to apply correction request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Méthodes utilitaires ====================

  private async getModificationConfig(tenantId: string): Promise<{
    allowEditAfterSubmission: boolean;
    allowEditAfterApproval: boolean;
    maxDaysAfterSubmission: number;
    requireReasonForEdit: boolean;
    auditAllChanges: boolean;
  }> {
    try {
      // TODO: Intégrer avec le service de configuration
      return {
        allowEditAfterSubmission: false,
        allowEditAfterApproval: false,
        maxDaysAfterSubmission: 7,
        requireReasonForEdit: true,
        auditAllChanges: true
      };
    } catch (error) {
      return {
        allowEditAfterSubmission: false,
        allowEditAfterApproval: false,
        maxDaysAfterSubmission: 0,
        requireReasonForEdit: true,
        auditAllChanges: true
      };
    }
  }

  private async canUserManageEmployee(tenantId: string, userId: string, employeeId: string): Promise<boolean> {
    try {
      // TODO: Intégrer avec le système de hiérarchie
      return false;
    } catch (error) {
      return false;
    }
  }

  private async hasSpecialModificationPermission(tenantId: string, userId: string): Promise<boolean> {
    try {
      // TODO: Vérifier les permissions spéciales
      return false;
    } catch (error) {
      return false;
    }
  }

  private async hasAdminPermission(tenantId: string, userId: string): Promise<boolean> {
    try {
      // TODO: Vérifier les permissions admin
      return false;
    } catch (error) {
      return false;
    }
  }

  private getDaysSinceSubmission(timesheet: TimesheetModel): number {
    const submittedAt = timesheet.getData().submittedAt;
    if (!submittedAt) {
      return 0;
    }

    return Math.floor((Date.now() - submittedAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  private async validateTimeEntryData(tenantId: string, entryData: any): Promise<{
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation de base des données d'entrée
    if (!entryData.date) {
      errors.push('Date is required');
    }

    if (!entryData.duration || entryData.duration <= 0) {
      errors.push('Duration must be greater than 0');
    }

    if (entryData.duration > 24 * 60) {
      errors.push('Duration cannot exceed 24 hours');
    }

    if (entryData.billable && !entryData.projectId) {
      warnings.push('Project should be specified for billable entries');
    }

    return { errors, warnings };
  }

  private async checkDataCoherence(
    timesheet: TimesheetModel,
    entryData: any,
    modificationType: string
  ): Promise<{
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Vérifier la cohérence avec la période de la feuille de temps
    const entryDate = new Date(entryData.date);
    const periodStart = new Date(timesheet.getData().periodStart);
    const periodEnd = new Date(timesheet.getData().periodEnd);

    if (entryDate < periodStart || entryDate > periodEnd) {
      errors.push('Entry date is outside timesheet period');
    }

    // TODO: Ajouter d'autres vérifications de cohérence

    return { errors, warnings };
  }

  private async checkModificationLimits(tenantId: string, timesheet: TimesheetModel): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    try {
      // TODO: Vérifier les limites de modification (nombre max par jour, etc.)
      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        reason: 'Failed to check modification limits'
      };
    }
  }

  private async getCorrectionRequest(tenantId: string, requestId: string): Promise<CorrectionRequest | null> {
    try {
      const doc = await this.db.collection(this.correctionsCollection).doc(requestId).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (!data || data.tenantId !== tenantId) {
        return null;
      }

      return {
        id: doc.id,
        ...data
      } as CorrectionRequest;
    } catch (error) {
      return null;
    }
  }

  // ==================== Méthodes de requête ====================

  /**
   * Obtenir l'historique des modifications pour une feuille de temps
   */
  async getModificationHistory(
    tenantId: string,
    timesheetId: string,
    limit: number = 100
  ): Promise<ModificationLog[]> {
    try {
      const query = await this.db.collection(this.logsCollection)
        .where('tenantId', '==', tenantId)
        .where('timesheetId', '==', timesheetId)
        .orderBy('performedAt', 'desc')
        .limit(limit)
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ModificationLog));
    } catch (error) {
      throw new Error(`Failed to get modification history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les demandes de correction en attente
   */
  async getPendingCorrectionRequests(tenantId: string): Promise<CorrectionRequest[]> {
    try {
      const query = await this.db.collection(this.correctionsCollection)
        .where('tenantId', '==', tenantId)
        .where('status', '==', 'pending')
        .orderBy('requestedAt', 'desc')
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CorrectionRequest));
    } catch (error) {
      throw new Error(`Failed to get pending correction requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les statistiques de modification
   */
  async getModificationStatistics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalModifications: number;
    byType: Record<string, number>;
    correctionsCount: number;
    averageCorrectionsPerTimesheet: number;
    topModifiedFields: Array<{ field: string; count: number }>;
  }> {
    try {
      let query = this.db.collection(this.logsCollection)
        .where('tenantId', '==', tenantId);

      if (startDate) {
        query = query.where('performedAt', '>=', startDate);
      }

      if (endDate) {
        query = query.where('performedAt', '<=', endDate);
      }

      const result = await query.get();
      const logs = result.docs.map(doc => doc.data() as ModificationLog);

      const stats = {
        totalModifications: logs.length,
        byType: {} as Record<string, number>,
        correctionsCount: 0,
        averageCorrectionsPerTimesheet: 0,
        topModifiedFields: [] as Array<{ field: string; count: number }>
      };

      const fieldCounts: Record<string, number> = {};
      const timesheetCorrections = new Set<string>();

      logs.forEach(log => {
        // Compter par type
        stats.byType[log.modificationType] = (stats.byType[log.modificationType] || 0) + 1;

        // Compter les corrections
        if (log.isCorrection) {
          stats.correctionsCount++;
          timesheetCorrections.add(log.timesheetId);
        }

        // Compter les champs modifiés
        if (log.fieldChanged) {
          fieldCounts[log.fieldChanged] = (fieldCounts[log.fieldChanged] || 0) + 1;
        }
      });

      // Calculer la moyenne de corrections par feuille de temps
      if (timesheetCorrections.size > 0) {
        stats.averageCorrectionsPerTimesheet = stats.correctionsCount / timesheetCorrections.size;
      }

      // Trier les champs les plus modifiés
      stats.topModifiedFields = Object.entries(fieldCounts)
        .map(([field, count]) => ({ field, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return stats;
    } catch (error) {
      throw new Error(`Failed to get modification statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}