/**
 * Service principal de gestion des statuts et corrections des feuilles de temps
 */

import { firestore } from 'firebase-admin';
import { TimesheetStatusService } from './timesheet-status.service';
import { ModificationControlService } from './modification-control.service';
import { CorrectionService } from './correction.service';
import { TimesheetModel } from '../../models/timesheet.model';

export class StatusManagementService {
  public readonly status: TimesheetStatusService;
  public readonly modifications: ModificationControlService;
  public readonly corrections: CorrectionService;

  constructor(db: firestore.Firestore) {
    this.status = new TimesheetStatusService(db);
    this.modifications = new ModificationControlService(db);
    this.corrections = new CorrectionService(db);
  }

  /**
   * Workflow complet de soumission avec validation et logging
   */
  async submitTimesheetWithValidation(
    tenantId: string,
    timesheetId: string,
    submittedBy: string,
    comments?: string
  ): Promise<{
    success: boolean;
    timesheet?: TimesheetModel;
    validation?: any;
    errors?: string[];
  }> {
    try {
      // 1. Soumettre la feuille de temps
      const result = await this.status.submitTimesheet(tenantId, timesheetId, submittedBy, comments);

      // 2. Logger la modification
      await this.modifications.logModification(
        tenantId,
        timesheetId,
        result.timesheet.employeeId,
        'update',
        submittedBy,
        {
          fieldChanged: 'status',
          oldValue: 'draft',
          newValue: 'submitted',
          reason: 'Timesheet submission',
          comments
        }
      );

      return {
        success: true,
        timesheet: result.timesheet,
        validation: result.validation
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Workflow complet de rejet avec correction guidée
   */
  async rejectTimesheetWithGuidance(
    tenantId: string,
    timesheetId: string,
    rejectedBy: string,
    reason: string,
    comments?: string,
    correctionInstructions?: string[]
  ): Promise<{
    success: boolean;
    timesheet?: TimesheetModel;
    correctionGuide?: any;
    errors?: string[];
  }> {
    try {
      // 1. Rejeter la feuille de temps
      const rejectResult = await this.status.rejectTimesheet(tenantId, timesheetId, rejectedBy, reason, comments);

      // 2. Créer un guide de correction
      const correctionResult = await this.corrections.returnToDraft(
        tenantId,
        timesheetId,
        rejectedBy,
        reason,
        comments || '',
        correctionInstructions
      );

      // 3. Logger la modification
      await this.modifications.logModification(
        tenantId,
        timesheetId,
        rejectResult.timesheet.employeeId,
        'update',
        rejectedBy,
        {
          fieldChanged: 'status',
          oldValue: 'submitted',
          newValue: 'draft',
          reason: `Rejected: ${reason}`,
          comments
        }
      );

      return {
        success: true,
        timesheet: rejectResult.timesheet,
        correctionGuide: correctionResult.correctionGuide
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Vérifier les permissions et valider une modification
   */
  async validateAndCheckModification(
    tenantId: string,
    timesheet: TimesheetModel,
    userId: string,
    modificationType: 'create' | 'update' | 'delete',
    entryData?: any,
    fieldName?: string
  ): Promise<{
    canModify: boolean;
    requiresApproval: boolean;
    validation?: any;
    errors?: string[];
  }> {
    try {
      // 1. Vérifier les permissions
      const permission = await this.modifications.checkModificationPermission(
        tenantId,
        timesheet,
        userId,
        modificationType,
        fieldName
      );

      if (!permission.canModify) {
        return {
          canModify: false,
          requiresApproval: false,
          errors: [permission.reason || 'Modification not allowed']
        };
      }

      // 2. Valider la modification
      const validation = await this.modifications.validateModification(
        tenantId,
        timesheet,
        modificationType,
        entryData,
        userId
      );

      return {
        canModify: validation.isValid,
        requiresApproval: permission.requiresApproval || validation.requiresApproval,
        validation,
        errors: validation.errors
      };
    } catch (error) {
      return {
        canModify: false,
        requiresApproval: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Obtenir le tableau de bord des statuts pour un tenant
   */
  async getStatusDashboard(tenantId: string): Promise<{
    statusCounts: Record<string, number>;
    pendingCorrections: number;
    recentTransitions: any[];
    correctionStatistics: any;
  }> {
    try {
      // Obtenir les statistiques de transition
      const transitionStats = await this.status.getTransitionStatistics(tenantId);

      // Obtenir les guides de correction actifs
      const activeGuides = await this.corrections.getActiveCorrectionGuides(tenantId);

      // Obtenir les transitions récentes
      const recentTransitions = []; // TODO: Implémenter

      // Obtenir les statistiques de correction
      const correctionStats = await this.corrections.getCorrectionStatistics(tenantId);

      return {
        statusCounts: transitionStats.byStatus,
        pendingCorrections: activeGuides.length,
        recentTransitions,
        correctionStatistics: correctionStats
      };
    } catch (error) {
      throw new Error(`Failed to get status dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Traitement automatique des tâches de maintenance
   */
  async processMaintenanceTasks(tenantId: string): Promise<{
    autoLocked: number;
    remindersSent: number;
    expiredCorrections: number;
  }> {
    try {
      // 1. Traiter le verrouillage automatique
      const lockedTimesheets = await this.status.processAutoLocking(tenantId);

      // 2. Envoyer les rappels de correction
      const remindersSent = await this.corrections.sendCorrectionReminders(tenantId);

      // 3. Traiter les corrections expirées
      // TODO: Implémenter la gestion des corrections expirées

      return {
        autoLocked: lockedTimesheets.length,
        remindersSent,
        expiredCorrections: 0
      };
    } catch (error) {
      throw new Error(`Failed to process maintenance tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Exporter tous les services
export { TimesheetStatusService } from './timesheet-status.service';
export { ModificationControlService } from './modification-control.service';
export { CorrectionService } from './correction.service';

// Exporter les types
export type { StatusTransition, SubmissionValidation } from './timesheet-status.service';
export type { ModificationLog, ModificationPermission, CorrectionRequest } from './modification-control.service';
export type { CorrectionGuide, CorrectionIssue, CorrectionAction, CorrectionNotification } from './correction.service';