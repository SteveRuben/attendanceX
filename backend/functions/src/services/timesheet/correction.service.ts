/**
 * Service de gestion des corrections de feuilles de temps
 */

import { firestore } from 'firebase-admin';
import { TimesheetModel } from '../../models/timesheet.model';
import { ValidationError } from '../../models/base.model';

import { TimesheetStatus } from 'common/types';

// Types pour les corrections guidées
export interface CorrectionGuide {
  id?: string;
  tenantId: string;

  // Identification
  timesheetId: string;
  employeeId: string;

  // Guide de correction
  issuesDetected: CorrectionIssue[];
  suggestedActions: CorrectionAction[];

  // Statut
  status: 'active' | 'completed' | 'cancelled';
  completedActions: string[];

  // Métadonnées
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CorrectionIssue {
  id: string;
  type: 'missing_entry' | 'invalid_duration' | 'missing_project' | 'overlap' | 'validation_error' | 'policy_violation';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  affectedEntryId?: string;
  affectedField?: string;
  suggestedFix?: string;
  autoFixable: boolean;
}

export interface CorrectionAction {
  id: string;
  type: 'add_entry' | 'modify_entry' | 'delete_entry' | 'split_entry' | 'merge_entries';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number; // en minutes
  relatedIssueIds: string[];
  actionData: any;
  isCompleted: boolean;
}

export interface CorrectionNotification {
  id?: string;
  tenantId: string;

  // Identification
  timesheetId: string;
  employeeId: string;

  // Notification
  type: 'correction_required' | 'correction_approved' | 'correction_rejected' | 'correction_reminder';
  title: string;
  message: string;

  // Destinataires
  recipients: {
    userId: string;
    role: 'employee' | 'manager' | 'approver' | 'admin';
    notificationMethod: 'email' | 'in_app' | 'both';
  }[];

  // Statut
  sentAt?: Date;
  readBy: string[];

  // Métadonnées
  createdAt: Date;
}

export class CorrectionService {
  private db: firestore.Firestore;
  private guidesCollection: string = 'correction_guides';
  private notificationsCollection: string = 'correction_notifications';

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  // ==================== Retour en brouillon ====================

  /**
   * Retourner une feuille de temps en brouillon avec commentaires
   */
  async returnToDraft(
    tenantId: string,
    timesheetId: string,
    returnedBy: string,
    reason: string,
    comments: string,
    correctionInstructions?: string[]
  ): Promise<{
    timesheet: TimesheetModel;
    correctionGuide: CorrectionGuide;
    notification: CorrectionNotification;
  }> {
    try {
      // 1. Obtenir la feuille de temps
      const timesheet = await this.getTimesheet(tenantId, timesheetId);

      if (!timesheet) {
        throw new ValidationError('Timesheet not found');
      }

      // 2. Vérifier que la feuille peut être retournée en brouillon
      if (!['submitted', 'approved'].includes(timesheet.status)) {
        throw new ValidationError(`Cannot return timesheet with status: ${timesheet.status}`);
      }

      // 3. Analyser les problèmes et créer un guide de correction
      const issues = await this.analyzeTimesheetIssues(tenantId, timesheet);
      const actions = await this.generateCorrectionActions(issues, correctionInstructions);

      const correctionGuide = await this.createCorrectionGuide(
        tenantId,
        timesheetId,
        timesheet.employeeId,
        issues,
        actions,
        returnedBy
      );

      // 4. Mettre à jour le statut de la feuille de temps
      timesheet.update({
        status: TimesheetStatus.DRAFT,
        returnedToDraftAt: new Date(),
        returnedBy,
        returnReason: reason,
        returnComments: comments,
        correctionGuideId: correctionGuide.id,
        // Réinitialiser les champs d'approbation si nécessaire
        ...(timesheet.status === 'approved' && {
          approvedAt: undefined,
          approvedBy: undefined
        })
      });

      await this.updateTimesheetInDb(timesheet);

      // 5. Créer et envoyer la notification
      const notification = await this.createCorrectionNotification(
        tenantId,
        timesheetId,
        timesheet.employeeId,
        'correction_required',
        'Correction Required',
        `Your timesheet has been returned for correction. Reason: ${reason}`,
        [
          {
            userId: timesheet.employeeId,
            role: 'employee',
            notificationMethod: 'both'
          }
        ]
      );

      await this.sendCorrectionNotification(notification);

      return {
        timesheet,
        correctionGuide,
        notification
      };
    } catch (error) {
      throw new Error(`Failed to return timesheet to draft: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Corrections guidées ====================

  /**
   * Créer un guide de correction
   */
  async createCorrectionGuide(
    tenantId: string,
    timesheetId: string,
    employeeId: string,
    issues: CorrectionIssue[],
    actions: CorrectionAction[],
    createdBy: string
  ): Promise<CorrectionGuide> {
    try {
      const guide: CorrectionGuide = {
        tenantId,
        timesheetId,
        employeeId,
        issuesDetected: issues,
        suggestedActions: actions,
        status: 'active',
        completedActions: [],
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await this.db.collection(this.guidesCollection).add(guide);

      return {
        ...guide,
        id: docRef.id
      };
    } catch (error) {
      throw new Error(`Failed to create correction guide: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyser les problèmes d'une feuille de temps
   */
  async analyzeTimesheetIssues(tenantId: string, timesheet: TimesheetModel): Promise<CorrectionIssue[]> {
    try {
      const issues: CorrectionIssue[] = [];

      // Obtenir les entrées de temps réelles (pour l'instant, simuler avec des données vides)
      // TODO: Intégrer avec le service de TimeEntry pour obtenir les vraies entrées
      const entries: any[] = []; // timesheet.getData().timeEntries contient les IDs

      // 1. Vérifier les entrées manquantes (jours ouvrables sans entrées)
      const missingDays = this.findMissingWorkDays(timesheet);
      missingDays.forEach((day, index) => {
        issues.push({
          id: `missing_entry_${index}`,
          type: 'missing_entry',
          severity: 'warning',
          title: `Missing entry for ${day}`,
          description: `No time entry found for work day ${day}`,
          suggestedFix: `Add a time entry for ${day}`,
          autoFixable: false
        });
      });

      // 2. Vérifier les durées invalides
      entries.forEach((entry, index) => {
        if (entry.duration <= 0) {
          issues.push({
            id: `invalid_duration_${index}`,
            type: 'invalid_duration',
            severity: 'error',
            title: 'Invalid duration',
            description: `Entry has invalid duration: ${entry.duration} minutes`,
            affectedEntryId: entry.id,
            affectedField: 'duration',
            suggestedFix: 'Set a valid duration (greater than 0)',
            autoFixable: false
          });
        }

        if (entry.duration > 12 * 60) { // Plus de 12 heures
          issues.push({
            id: `excessive_duration_${index}`,
            type: 'validation_error',
            severity: 'warning',
            title: 'Excessive duration',
            description: `Entry duration (${entry.duration / 60}h) seems excessive`,
            affectedEntryId: entry.id,
            affectedField: 'duration',
            suggestedFix: 'Verify the duration is correct',
            autoFixable: false
          });
        }
      });

      // 3. Vérifier les projets manquants pour les entrées facturables
      entries.forEach((entry, index) => {
        if (entry.billable && !entry.projectId) {
          issues.push({
            id: `missing_project_${index}`,
            type: 'missing_project',
            severity: 'error',
            title: 'Missing project for billable entry',
            description: 'Billable entries must have a project assigned',
            affectedEntryId: entry.id,
            affectedField: 'projectId',
            suggestedFix: 'Assign a project to this billable entry',
            autoFixable: false
          });
        }
      });

      // 4. Vérifier les chevauchements d'horaires
      const overlaps = this.detectTimeOverlaps(entries);
      overlaps.forEach((overlap, index) => {
        issues.push({
          id: `overlap_${index}`,
          type: 'overlap',
          severity: 'error',
          title: 'Time overlap detected',
          description: overlap.description,
          suggestedFix: 'Adjust the time ranges to avoid overlap',
          autoFixable: false
        });
      });

      // 5. Vérifier les violations de politique
      const policyViolations = await this.checkPolicyViolations(tenantId, timesheet);
      issues.push(...policyViolations);

      return issues;
    } catch (error) {
      throw new Error(`Failed to analyze timesheet issues: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Générer des actions de correction
   */
  async generateCorrectionActions(
    issues: CorrectionIssue[],
    customInstructions?: string[]
  ): Promise<CorrectionAction[]> {
    try {
      const actions: CorrectionAction[] = [];

      // Grouper les problèmes par type pour créer des actions cohérentes
      const issuesByType = issues.reduce((acc, issue) => {
        if (!acc[issue.type]) {
          acc[issue.type] = [];
        }
        acc[issue.type].push(issue);
        return acc;
      }, {} as Record<string, CorrectionIssue[]>);

      // Créer des actions pour chaque type de problème
      Object.entries(issuesByType).forEach(([type, typeIssues]) => {
        switch (type) {
          case 'missing_entry':
            actions.push({
              id: `add_missing_entries`,
              type: 'add_entry',
              title: 'Add missing time entries',
              description: `Add time entries for ${typeIssues.length} missing work day(s)`,
              priority: 'high',
              estimatedTime: typeIssues.length * 5,
              relatedIssueIds: typeIssues.map(i => i.id),
              actionData: { missingDays: typeIssues.map(i => i.description) },
              isCompleted: false
            });
            break;

          case 'invalid_duration':
            actions.push({
              id: `fix_invalid_durations`,
              type: 'modify_entry',
              title: 'Fix invalid durations',
              description: `Correct ${typeIssues.length} entries with invalid durations`,
              priority: 'high',
              estimatedTime: typeIssues.length * 2,
              relatedIssueIds: typeIssues.map(i => i.id),
              actionData: { invalidEntries: typeIssues.map(i => i.affectedEntryId) },
              isCompleted: false
            });
            break;

          case 'missing_project':
            actions.push({
              id: `assign_projects`,
              type: 'modify_entry',
              title: 'Assign projects to billable entries',
              description: `Assign projects to ${typeIssues.length} billable entries`,
              priority: 'high',
              estimatedTime: typeIssues.length * 3,
              relatedIssueIds: typeIssues.map(i => i.id),
              actionData: { entriesNeedingProjects: typeIssues.map(i => i.affectedEntryId) },
              isCompleted: false
            });
            break;

          case 'overlap':
            actions.push({
              id: `resolve_overlaps`,
              type: 'modify_entry',
              title: 'Resolve time overlaps',
              description: `Fix ${typeIssues.length} time overlap(s)`,
              priority: 'high',
              estimatedTime: typeIssues.length * 10,
              relatedIssueIds: typeIssues.map(i => i.id),
              actionData: { overlappingEntries: typeIssues },
              isCompleted: false
            });
            break;
        }
      });

      // Ajouter des actions personnalisées si fournies
      if (customInstructions) {
        customInstructions.forEach((instruction, index) => {
          actions.push({
            id: `custom_action_${index}`,
            type: 'modify_entry',
            title: 'Custom correction',
            description: instruction,
            priority: 'medium',
            estimatedTime: 10,
            relatedIssueIds: [],
            actionData: { instruction },
            isCompleted: false
          });
        });
      }

      // Trier les actions par priorité
      return actions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (error) {
      throw new Error(`Failed to generate correction actions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  /**

   * Marquer une action de correction comme terminée
   */
  async completeAction(
    tenantId: string,
    guideId: string,
    actionId: string,
    completedBy: string
  ): Promise<CorrectionGuide> {
    try {
      const guide = await this.getCorrectionGuide(tenantId, guideId);

      if (!guide) {
        throw new ValidationError('Correction guide not found');
      }

      // Marquer l'action comme terminée
      const action = guide.suggestedActions.find(a => a.id === actionId);
      if (!action) {
        throw new ValidationError('Action not found in guide');
      }

      action.isCompleted = true;
      guide.completedActions.push(actionId);
      guide.updatedAt = new Date();

      // Vérifier si toutes les actions sont terminées
      const allCompleted = guide.suggestedActions.every(a => a.isCompleted);
      if (allCompleted) {
        guide.status = 'completed';
        guide.completedAt = new Date();
      }

      // Mettre à jour en base
      const { id, ...updateData } = guide;
      await this.db.collection(this.guidesCollection).doc(guideId).update(updateData);

      return guide;
    } catch (error) {
      throw new Error(`Failed to complete action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Historique des corrections ====================

  /**
   * Créer un historique de correction
   */
  async createCorrectionHistory(
    tenantId: string,
    timesheetId: string,
    employeeId: string,
    correctionType: 'return_to_draft' | 'guided_correction' | 'manual_correction',
    performedBy: string,
    details: {
      reason?: string;
      comments?: string;
      issuesFound?: number;
      actionsCompleted?: number;
      timeSpent?: number; // en minutes
    }
  ): Promise<void> {
    try {
      const historyEntry = {
        tenantId,
        timesheetId,
        employeeId,
        correctionType,
        performedBy,
        performedAt: new Date(),
        details,
        createdAt: new Date()
      };

      await this.db.collection('correction_history').add(historyEntry);
    } catch (error) {
      throw new Error(`Failed to create correction history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Notifications de correction ====================

  /**
   * Créer une notification de correction
   */
  async createCorrectionNotification(
    tenantId: string,
    timesheetId: string,
    employeeId: string,
    type: CorrectionNotification['type'],
    title: string,
    message: string,
    recipients: CorrectionNotification['recipients']
  ): Promise<CorrectionNotification> {
    try {
      const notification: CorrectionNotification = {
        tenantId,
        timesheetId,
        employeeId,
        type,
        title,
        message,
        recipients,
        readBy: [],
        createdAt: new Date()
      };

      const docRef = await this.db.collection(this.notificationsCollection).add(notification);

      return {
        ...notification,
        id: docRef.id
      };
    } catch (error) {
      throw new Error(`Failed to create correction notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Envoyer une notification de correction
   */
  async sendCorrectionNotification(notification: CorrectionNotification): Promise<void> {
    try {
      // TODO: Intégrer avec le service de notifications existant
      console.log('Sending correction notification:', notification.title);

      // Marquer comme envoyée
      if (notification.id) {
        await this.db.collection(this.notificationsCollection).doc(notification.id).update({
          sentAt: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to send correction notification:', error);
    }
  }

  /**
   * Envoyer des rappels de correction
   */
  async sendCorrectionReminders(tenantId: string): Promise<number> {
    try {
      let remindersSent = 0;

      // Obtenir les guides de correction actifs depuis plus de X jours
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 3); // 3 jours

      const query = await this.db.collection(this.guidesCollection)
        .where('tenantId', '==', tenantId)
        .where('status', '==', 'active')
        .where('createdAt', '<', cutoffDate)
        .get();

      for (const doc of query.docs) {
        const guide = { id: doc.id, ...doc.data() } as CorrectionGuide;

        // Créer et envoyer un rappel
        const notification = await this.createCorrectionNotification(
          tenantId,
          guide.timesheetId,
          guide.employeeId,
          'correction_reminder',
          'Correction Reminder',
          `Your timesheet correction is still pending. Please complete the required actions.`,
          [
            {
              userId: guide.employeeId,
              role: 'employee',
              notificationMethod: 'both'
            }
          ]
        );

        await this.sendCorrectionNotification(notification);
        remindersSent++;
      }

      return remindersSent;
    } catch (error) {
      throw new Error(`Failed to send correction reminders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Méthodes utilitaires ====================

  private async getTimesheet(tenantId: string, timesheetId: string): Promise<TimesheetModel | null> {
    try {
      // TODO: Intégrer avec le TimesheetService existant
      return null;
    } catch (error) {
      return null;
    }
  }

  private async updateTimesheetInDb(timesheet: TimesheetModel): Promise<void> {
    try {
      // TODO: Intégrer avec le TimesheetService existant
      console.log('Updating timesheet in database:', timesheet.id);
    } catch (error) {
      throw new Error(`Failed to update timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getCorrectionGuide(tenantId: string, guideId: string): Promise<CorrectionGuide | null> {
    try {
      const doc = await this.db.collection(this.guidesCollection).doc(guideId).get();

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
      } as CorrectionGuide;
    } catch (error) {
      return null;
    }
  }

  private findMissingWorkDays(timesheet: TimesheetModel): string[] {
    const missingDays: string[] = [];

    try {
      const timesheetData = timesheet.getData();
      const periodStart = new Date(timesheetData.periodStart);
      const periodEnd = new Date(timesheetData.periodEnd);

      // Pour l'instant, on simule qu'il n'y a pas d'entrées
      // TODO: Intégrer avec le service TimeEntry pour obtenir les vraies dates
      const datesWithEntries = new Set<string>();

      // Parcourir tous les jours ouvrables de la période
      const currentDate = new Date(periodStart);
      while (currentDate <= periodEnd) {
        const dayOfWeek = currentDate.getDay();

        // Vérifier si c'est un jour ouvrable (lundi à vendredi)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dateString = currentDate.toISOString().split('T')[0];

          if (!datesWithEntries.has(dateString)) {
            missingDays.push(dateString);
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    } catch (error) {
      console.error('Error finding missing work days:', error);
    }

    return missingDays;
  }

  private detectTimeOverlaps(entries: any[]): Array<{ description: string; entryIds: string[] }> {
    const overlaps: Array<{ description: string; entryIds: string[] }> = [];

    try {
      // Grouper les entrées par date
      const entriesByDate = entries.reduce((acc, entry) => {
        if (!acc[entry.date]) {
          acc[entry.date] = [];
        }
        acc[entry.date].push(entry);
        return acc;
      }, {} as Record<string, any[]>);

      // Vérifier les chevauchements pour chaque date
      Object.entries(entriesByDate).forEach(([date, dateEntries]) => {
        const sortedEntries = (dateEntries as any[])
          .filter(entry => entry.startTime && entry.endTime)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        for (let i = 0; i < sortedEntries.length - 1; i++) {
          const current = sortedEntries[i];
          const next = sortedEntries[i + 1];

          if (current.endTime > next.startTime) {
            overlaps.push({
              description: `${date}: ${current.startTime}-${current.endTime} overlaps with ${next.startTime}-${next.endTime}`,
              entryIds: [current.id, next.id]
            });
          }
        }
      });
    } catch (error) {
      console.error('Error detecting time overlaps:', error);
    }

    return overlaps;
  }

  private async checkPolicyViolations(tenantId: string, timesheet: TimesheetModel): Promise<CorrectionIssue[]> {
    const violations: CorrectionIssue[] = [];

    try {
      // TODO: Intégrer avec le service de configuration pour obtenir les politiques
      // Exemple de vérifications de politique :

      // TODO: Implémenter calculateTotals() dans TimesheetModel ou utiliser les données existantes
      const timesheetData = timesheet.getData();
      const totals = {
        totalHours: timesheetData.totalHours || 0,
        totalBillableHours: timesheetData.totalBillableHours || 0,
        totalCost: timesheetData.totalCost || 0
      };

      // Vérifier les heures minimales
      if (totals.totalHours < 35) {
        violations.push({
          id: 'policy_min_hours',
          type: 'policy_violation',
          severity: 'warning',
          title: 'Below minimum hours',
          description: `Total hours (${totals.totalHours}) below company minimum (35h)`,
          suggestedFix: 'Add more time entries to meet minimum hours requirement',
          autoFixable: false
        });
      }

      // Vérifier les heures maximales
      if (totals.totalHours > 60) {
        violations.push({
          id: 'policy_max_hours',
          type: 'policy_violation',
          severity: 'error',
          title: 'Exceeds maximum hours',
          description: `Total hours (${totals.totalHours}) exceeds company maximum (60h)`,
          suggestedFix: 'Reduce total hours or get approval for overtime',
          autoFixable: false
        });
      }
    } catch (error) {
      console.error('Error checking policy violations:', error);
    }

    return violations;
  }

  // ==================== Méthodes de requête ====================

  /**
   * Obtenir les guides de correction actifs
   */
  async getActiveCorrectionGuides(tenantId: string, employeeId?: string): Promise<CorrectionGuide[]> {
    try {
      let query = this.db.collection(this.guidesCollection)
        .where('tenantId', '==', tenantId)
        .where('status', '==', 'active');

      if (employeeId) {
        query = query.where('employeeId', '==', employeeId);
      }

      const result = await query.orderBy('createdAt', 'desc').get();

      return result.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CorrectionGuide));
    } catch (error) {
      throw new Error(`Failed to get active correction guides: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les statistiques de correction
   */
  async getCorrectionStatistics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalCorrections: number;
    averageIssuesPerTimesheet: number;
    averageCorrectionTime: number;
    mostCommonIssues: Array<{ type: string; count: number }>;
    correctionSuccessRate: number;
  }> {
    try {
      let query = this.db.collection(this.guidesCollection)
        .where('tenantId', '==', tenantId);

      if (startDate) {
        query = query.where('createdAt', '>=', startDate);
      }

      if (endDate) {
        query = query.where('createdAt', '<=', endDate);
      }

      const result = await query.get();
      const guides = result.docs.map(doc => doc.data() as CorrectionGuide);

      const stats = {
        totalCorrections: guides.length,
        averageIssuesPerTimesheet: 0,
        averageCorrectionTime: 0,
        mostCommonIssues: [] as Array<{ type: string; count: number }>,
        correctionSuccessRate: 0
      };

      if (guides.length === 0) {
        return stats;
      }

      // Calculer les statistiques
      let totalIssues = 0;
      let totalCorrectionTime = 0;
      let completedCorrections = 0;
      const issueTypeCounts: Record<string, number> = {};

      guides.forEach(guide => {
        totalIssues += guide.issuesDetected.length;

        // Compter les types de problèmes
        guide.issuesDetected.forEach(issue => {
          issueTypeCounts[issue.type] = (issueTypeCounts[issue.type] || 0) + 1;
        });

        // Calculer le temps de correction
        if (guide.status === 'completed' && guide.completedAt) {
          completedCorrections++;
          const correctionTime = guide.completedAt.getTime() - guide.createdAt.getTime();
          totalCorrectionTime += correctionTime;
        }
      });

      stats.averageIssuesPerTimesheet = totalIssues / guides.length;

      if (completedCorrections > 0) {
        stats.averageCorrectionTime = Math.floor(totalCorrectionTime / completedCorrections / (1000 * 60 * 60)); // en heures
      }

      stats.correctionSuccessRate = (completedCorrections / guides.length) * 100;

      // Trier les types de problèmes les plus courants
      stats.mostCommonIssues = Object.entries(issueTypeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return stats;
    } catch (error) {
      throw new Error(`Failed to get correction statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}