/**
 * Service de cohérence des données entre présence et feuilles de temps
 */

import { collections } from '../../config/database';

// Types pour la cohérence des données
export interface CoherenceCheck {
  id?: string;
  tenantId: string;

  // Paramètres de vérification
  checkType: 'daily' | 'weekly' | 'monthly' | 'on_demand';
  dateRange: {
    start: Date;
    end: Date;
  };
  employeeIds?: string[];

  // Résultats
  status: 'running' | 'completed' | 'failed';
  totalChecked: number;
  issuesFound: number;
  autoFixed: number;
  manualReviewRequired: number;

  // Détails des problèmes
  coherenceIssues: CoherenceIssue[];

  // Métadonnées
  performedBy: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // en millisecondes

  // Audit
  createdAt: Date;
}

export interface CoherenceIssue {
  id: string;
  type: 'time_mismatch' | 'missing_presence' | 'missing_timesheet' | 'status_conflict' | 'data_inconsistency' | 'validation_error';
  severity: 'critical' | 'major' | 'minor' | 'info';

  // Données affectées
  employeeId: string;
  date: string;

  // Détails du problème
  description: string;
  presenceData?: any;
  timesheetData?: any;
  expectedValue?: any;
  actualValue?: any;

  // Actions
  autoFixable: boolean;
  suggestedAction: string;
  fixApplied?: boolean;
  fixedAt?: Date;
  fixedBy?: string;

  // Statut
  status: 'open' | 'fixed' | 'ignored' | 'manual_review';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;

  // Métadonnées
  detectedAt: Date;
  checkId: string;
}

export interface PresenceEntry {
  id?: string;
  tenantId: string;
  employeeId: string;
  date: string;
  checkIn?: Date;
  checkOut?: Date;
  totalHours: number;
  status: 'present' | 'absent' | 'partial' | 'late' | 'early_leave';
  location?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimesheetEntry {
  id?: string;
  tenantId: string;
  employeeId: string;
  timesheetId: string;
  date: string;
  projectId: string;
  activityCodeId?: string;
  duration: number; // en minutes
  description?: string;
  billable: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export class DataCoherenceService {
  private coherenceChecksCollection = collections.coherence_checks;
  private coherenceIssuesCollection = collections.coherence_issues;

  // ==================== Vérifications de cohérence ====================

  /**
   * Lancer une vérification de cohérence
   */
  async performCoherenceCheck(
    tenantId: string,
    options: {
      checkType: CoherenceCheck['checkType'];
      dateRange: { start: Date; end: Date };
      employeeIds?: string[];
      autoFix?: boolean;
    },
    performedBy: string
  ): Promise<CoherenceCheck> {
    try {
      const check: CoherenceCheck = {
        tenantId,
        checkType: options.checkType,
        dateRange: options.dateRange,
        employeeIds: options.employeeIds,
        status: 'running',
        totalChecked: 0,
        issuesFound: 0,
        autoFixed: 0,
        manualReviewRequired: 0,
        coherenceIssues: [],
        performedBy,
        startedAt: new Date(),
        createdAt: new Date()
      };

      const docRef = await this.coherenceChecksCollection.add(check);
      const checkId = docRef.id;

      // Exécuter les vérifications en arrière-plan
      this.executeCoherenceChecks(checkId, tenantId, options, performedBy);

      return {
        ...check,
        id: checkId
      };
    } catch (error) {
      throw new Error(`Failed to start coherence check: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Exécuter les vérifications de cohérence
   */
  private async executeCoherenceChecks(
    checkId: string,
    tenantId: string,
    options: {
      dateRange: { start: Date; end: Date };
      employeeIds?: string[];
      autoFix?: boolean;
    },
    performedBy: string
  ): Promise<void> {
    try {
      const issues: CoherenceIssue[] = [];
      let totalChecked = 0;
      let autoFixed = 0;

      // 1. Vérifier la cohérence temps présence vs feuilles de temps
      const timeIssues = await this.checkTimeCoherence(tenantId, options.dateRange, options.employeeIds);
      issues.push(...timeIssues);
      totalChecked += timeIssues.length;

      // 2. Vérifier les présences manquantes
      const presenceIssues = await this.checkMissingPresence(tenantId, options.dateRange, options.employeeIds);
      issues.push(...presenceIssues);
      totalChecked += presenceIssues.length;

      // 3. Vérifier les feuilles de temps manquantes
      const timesheetIssues = await this.checkMissingTimesheets(tenantId, options.dateRange, options.employeeIds);
      issues.push(...timesheetIssues);
      totalChecked += timesheetIssues.length;

      // 4. Vérifier les conflits de statut
      const statusIssues = await this.checkStatusConflicts(tenantId, options.dateRange, options.employeeIds);
      issues.push(...statusIssues);
      totalChecked += statusIssues.length;

      // Appliquer les corrections automatiques si demandé
      if (options.autoFix) {
        for (const issue of issues) {
          if (issue.autoFixable) {
            const fixed = await this.applyAutoFix(issue);
            if (fixed) {
              autoFixed++;
              issue.fixApplied = true;
              issue.fixedAt = new Date();
              issue.fixedBy = performedBy;
              issue.status = 'fixed';
            }
          }
        }
      }

      // Sauvegarder les problèmes trouvés
      for (const issue of issues) {
        issue.checkId = checkId;
        await this.coherenceIssuesCollection.add(issue);
      }

      // Mettre à jour le statut de la vérification
      const completedAt = new Date();
      const duration = completedAt.getTime() - new Date().getTime();

      await this.coherenceChecksCollection.doc(checkId).update({
        status: 'completed',
        totalChecked,
        issuesFound: issues.length,
        autoFixed,
        manualReviewRequired: issues.filter(i => !i.autoFixable).length,
        completedAt,
        duration
      });

    } catch (error) {
      console.error('Coherence check failed:', error);
      
      await this.coherenceChecksCollection.doc(checkId).update({
        status: 'failed',
        completedAt: new Date(),
        duration: new Date().getTime() - new Date().getTime()
      });
    }
  }

  /**
   * Vérifier la cohérence des temps entre présence et feuilles de temps
   */
  private async checkTimeCoherence(
    tenantId: string,
    dateRange: { start: Date; end: Date },
    employeeIds?: string[]
  ): Promise<CoherenceIssue[]> {
    const issues: CoherenceIssue[] = [];

    try {
      // Obtenir les entrées de présence
      let presenceQuery = collections.presence_entries
        .where('tenantId', '==', tenantId)
        .where('date', '>=', dateRange.start.toISOString().split('T')[0])
        .where('date', '<=', dateRange.end.toISOString().split('T')[0]);

      if (employeeIds && employeeIds.length > 0) {
        presenceQuery = presenceQuery.where('employeeId', 'in', employeeIds);
      }

      const presenceSnapshot = await presenceQuery.get();
      const presenceEntries = presenceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PresenceEntry));

      // Pour chaque entrée de présence, vérifier les feuilles de temps correspondantes
      for (const presence of presenceEntries) {
        const timesheetEntriesQuery = await collections.time_entries
          .where('tenantId', '==', tenantId)
          .where('employeeId', '==', presence.employeeId)
          .where('date', '==', presence.date)
          .get();

        const timesheetEntries = timesheetEntriesQuery.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as TimesheetEntry));

        // Calculer le total des heures dans les feuilles de temps
        const totalTimesheetHours = timesheetEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60;

        // Comparer avec les heures de présence
        const presenceHours = presence.totalHours;
        const difference = Math.abs(totalTimesheetHours - presenceHours);

        // Si la différence est significative (> 30 minutes)
        if (difference > 0.5) {
          issues.push({
            id: `time_mismatch_${presence.employeeId}_${presence.date}`,
            type: 'time_mismatch',
            severity: difference > 2 ? 'major' : 'minor',
            employeeId: presence.employeeId,
            date: presence.date,
            description: `Time mismatch: Presence shows ${presenceHours}h, timesheets total ${totalTimesheetHours}h (difference: ${difference.toFixed(2)}h)`,
            presenceData: presence,
            timesheetData: timesheetEntries,
            expectedValue: presenceHours,
            actualValue: totalTimesheetHours,
            autoFixable: false,
            suggestedAction: 'Review and adjust timesheet entries or presence data',
            status: 'open',
            detectedAt: new Date(),
            checkId: ''
          });
        }
      }

    } catch (error) {
      console.error('Failed to check time coherence:', error);
    }

    return issues;
  }

  /**
   * Vérifier les présences manquantes
   */
  private async checkMissingPresence(
    tenantId: string,
    dateRange: { start: Date; end: Date },
    employeeIds?: string[]
  ): Promise<CoherenceIssue[]> {
    const issues: CoherenceIssue[] = [];

    try {
      // Obtenir toutes les entrées de feuilles de temps dans la période
      let timesheetQuery = collections.time_entries
        .where('tenantId', '==', tenantId)
        .where('date', '>=', dateRange.start.toISOString().split('T')[0])
        .where('date', '<=', dateRange.end.toISOString().split('T')[0]);

      if (employeeIds && employeeIds.length > 0) {
        timesheetQuery = timesheetQuery.where('employeeId', 'in', employeeIds);
      }

      const timesheetSnapshot = await timesheetQuery.get();
      const timesheetEntries = timesheetSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TimesheetEntry));

      // Grouper par employé et date
      const timesheetsByEmployeeDate = new Map<string, TimesheetEntry[]>();
      
      timesheetEntries.forEach(entry => {
        const key = `${entry.employeeId}_${entry.date}`;
        if (!timesheetsByEmployeeDate.has(key)) {
          timesheetsByEmployeeDate.set(key, []);
        }
        timesheetsByEmployeeDate.get(key)!.push(entry);
      });

      // Vérifier s'il existe une entrée de présence correspondante
      for (const [key, entries] of timesheetsByEmployeeDate) {
        const [employeeId, date] = key.split('_');
        
        const presenceQuery = await collections.presence_entries
          .where('tenantId', '==', tenantId)
          .where('employeeId', '==', employeeId)
          .where('date', '==', date)
          .limit(1)
          .get();

        if (presenceQuery.empty) {
          const totalHours = entries.reduce((sum, entry) => sum + entry.duration, 0) / 60;
          
          issues.push({
            id: `missing_presence_${employeeId}_${date}`,
            type: 'missing_presence',
            severity: 'major',
            employeeId,
            date,
            description: `Missing presence entry for ${totalHours}h of timesheet entries`,
            timesheetData: entries,
            autoFixable: true,
            suggestedAction: 'Create presence entry based on timesheet data',
            status: 'open',
            detectedAt: new Date(),
            checkId: ''
          });
        }
      }

    } catch (error) {
      console.error('Failed to check missing presence:', error);
    }

    return issues;
  }

  /**
   * Vérifier les feuilles de temps manquantes
   */
  private async checkMissingTimesheets(
    tenantId: string,
    dateRange: { start: Date; end: Date },
    employeeIds?: string[]
  ): Promise<CoherenceIssue[]> {
    const issues: CoherenceIssue[] = [];

    try {
      // Obtenir toutes les entrées de présence dans la période
      let presenceQuery = collections.presence_entries
        .where('tenantId', '==', tenantId)
        .where('date', '>=', dateRange.start.toISOString().split('T')[0])
        .where('date', '<=', dateRange.end.toISOString().split('T')[0])
        .where('status', '==', 'present');

      if (employeeIds && employeeIds.length > 0) {
        presenceQuery = presenceQuery.where('employeeId', 'in', employeeIds);
      }

      const presenceSnapshot = await presenceQuery.get();
      const presenceEntries = presenceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PresenceEntry));

      // Pour chaque présence, vérifier s'il y a des feuilles de temps
      for (const presence of presenceEntries) {
        const timesheetQuery = await collections.time_entries
          .where('tenantId', '==', tenantId)
          .where('employeeId', '==', presence.employeeId)
          .where('date', '==', presence.date)
          .limit(1)
          .get();

        if (timesheetQuery.empty && presence.totalHours > 0) {
          issues.push({
            id: `missing_timesheet_${presence.employeeId}_${presence.date}`,
            type: 'missing_timesheet',
            severity: 'major',
            employeeId: presence.employeeId,
            date: presence.date,
            description: `Missing timesheet entries for ${presence.totalHours}h of presence`,
            presenceData: presence,
            autoFixable: false,
            suggestedAction: 'Employee should create timesheet entries for this day',
            status: 'open',
            detectedAt: new Date(),
            checkId: ''
          });
        }
      }

    } catch (error) {
      console.error('Failed to check missing timesheets:', error);
    }

    return issues;
  }

  /**
   * Vérifier les conflits de statut
   */
  private async checkStatusConflicts(
    tenantId: string,
    dateRange: { start: Date; end: Date },
    employeeIds?: string[]
  ): Promise<CoherenceIssue[]> {
    const issues: CoherenceIssue[] = [];

    try {
      // Obtenir les feuilles de temps approuvées
      let timesheetQuery = collections.timesheets
        .where('tenantId', '==', tenantId)
        .where('status', '==', 'approved')
        .where('periodStart', '>=', dateRange.start.toISOString().split('T')[0])
        .where('periodEnd', '<=', dateRange.end.toISOString().split('T')[0]);

      if (employeeIds && employeeIds.length > 0) {
        timesheetQuery = timesheetQuery.where('employeeId', 'in', employeeIds);
      }

      const timesheetSnapshot = await timesheetQuery.get();
      const timesheets = timesheetSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));

      // Pour chaque feuille de temps approuvée, vérifier les entrées individuelles
      for (const timesheet of timesheets) {
        const entriesQuery = await collections.time_entries
          .where('tenantId', '==', tenantId)
          .where('timesheetId', '==', timesheet.id)
          .where('status', '!=', 'approved')
          .get();

        if (!entriesQuery.empty) {
          const conflictingEntries = entriesQuery.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          issues.push({
            id: `status_conflict_${timesheet.id}`,
            type: 'status_conflict',
            severity: 'major',
            employeeId: timesheet.employeeId,
            date: timesheet.periodStart,
            description: `Timesheet is approved but contains ${conflictingEntries.length} non-approved entries`,
            timesheetData: { timesheet, conflictingEntries },
            autoFixable: true,
            suggestedAction: 'Update entry statuses to match timesheet status',
            status: 'open',
            detectedAt: new Date(),
            checkId: ''
          });
        }
      }

    } catch (error) {
      console.error('Failed to check status conflicts:', error);
    }

    return issues;
  }

  /**
   * Appliquer une correction automatique
   */
  private async applyAutoFix(issue: CoherenceIssue): Promise<boolean> {
    try {
      switch (issue.type) {
        case 'missing_presence':
          return await this.fixMissingPresence(issue);
        case 'status_conflict':
          return await this.fixStatusConflict(issue);
        default:
          return false;
      }
    } catch (error) {
      console.error('Failed to apply auto fix:', error);
      return false;
    }
  }

  /**
   * Corriger une présence manquante
   */
  private async fixMissingPresence(issue: CoherenceIssue): Promise<boolean> {
    try {
      if (!issue.timesheetData || !Array.isArray(issue.timesheetData)) {
        return false;
      }

      const entries = issue.timesheetData as TimesheetEntry[];
      const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration, 0);
      const totalHours = totalMinutes / 60;

      // Créer une entrée de présence basée sur les feuilles de temps
      const presenceEntry: Omit<PresenceEntry, 'id'> = {
        tenantId: entries[0].tenantId,
        employeeId: issue.employeeId,
        date: issue.date,
        totalHours,
        status: 'present',
        notes: 'Auto-generated from timesheet data',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await collections.presence_entries.add(presenceEntry);
      return true;
    } catch (error) {
      console.error('Failed to fix missing presence:', error);
      return false;
    }
  }

  /**
   * Corriger un conflit de statut
   */
  private async fixStatusConflict(issue: CoherenceIssue): Promise<boolean> {
    try {
      const timesheetData = issue.timesheetData as any;
      if (!timesheetData?.conflictingEntries) {
        return false;
      }

      const batch = collections.time_entries.firestore.batch();
      
      for (const entry of timesheetData.conflictingEntries) {
        const entryRef = collections.time_entries.doc(entry.id);
        batch.update(entryRef, {
          status: 'approved',
          updatedAt: new Date()
        });
      }

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Failed to fix status conflict:', error);
      return false;
    }
  }

  // ==================== Méthodes publiques ====================

  /**
   * Obtenir les vérifications de cohérence
   */
  async getCoherenceChecks(
    tenantId: string,
    options: {
      status?: CoherenceCheck['status'];
      checkType?: CoherenceCheck['checkType'];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<CoherenceCheck[]> {
    try {
      let query = this.coherenceChecksCollection
        .where('tenantId', '==', tenantId);

      if (options.status) {
        query = query.where('status', '==', options.status);
      }

      if (options.checkType) {
        query = query.where('checkType', '==', options.checkType);
      }

      if (options.startDate) {
        query = query.where('startedAt', '>=', options.startDate);
      }

      if (options.endDate) {
        query = query.where('startedAt', '<=', options.endDate);
      }

      const snapshot = await query
        .orderBy('startedAt', 'desc')
        .limit(options.limit || 50)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CoherenceCheck));
    } catch (error) {
      throw new Error(`Failed to get coherence checks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les problèmes de cohérence
   */
  async getCoherenceIssues(
    tenantId: string,
    options: {
      checkId?: string;
      type?: CoherenceIssue['type'];
      severity?: CoherenceIssue['severity'];
      status?: CoherenceIssue['status'];
      employeeId?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {}
  ): Promise<CoherenceIssue[]> {
    try {
      let query = this.coherenceIssuesCollection
        .where('tenantId', '==', tenantId);

      if (options.checkId) {
        query = query.where('checkId', '==', options.checkId);
      }

      if (options.type) {
        query = query.where('type', '==', options.type);
      }

      if (options.severity) {
        query = query.where('severity', '==', options.severity);
      }

      if (options.status) {
        query = query.where('status', '==', options.status);
      }

      if (options.employeeId) {
        query = query.where('employeeId', '==', options.employeeId);
      }

      if (options.startDate) {
        query = query.where('date', '>=', options.startDate);
      }

      if (options.endDate) {
        query = query.where('date', '<=', options.endDate);
      }

      const snapshot = await query
        .orderBy('detectedAt', 'desc')
        .limit(options.limit || 100)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CoherenceIssue));
    } catch (error) {
      throw new Error(`Failed to get coherence issues: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Résoudre un problème de cohérence
   */
  async resolveIssue(
    issueId: string,
    resolution: {
      status: 'fixed' | 'ignored';
      reviewedBy: string;
      reviewNotes?: string;
    }
  ): Promise<void> {
    try {
      await this.coherenceIssuesCollection.doc(issueId).update({
        status: resolution.status,
        reviewedBy: resolution.reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: resolution.reviewNotes
      });
    } catch (error) {
      throw new Error(`Failed to resolve issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les statistiques de cohérence
   */
  async getCoherenceStatistics(
    tenantId: string,
    period?: { start: Date; end: Date }
  ): Promise<{
    totalChecks: number;
    totalIssues: number;
    issuesByType: Record<string, number>;
    issuesBySeverity: Record<string, number>;
    autoFixRate: number;
    resolutionRate: number;
  }> {
    try {
      let checksQuery = this.coherenceChecksCollection
        .where('tenantId', '==', tenantId);

      let issuesQuery = this.coherenceIssuesCollection
        .where('tenantId', '==', tenantId);

      if (period) {
        checksQuery = checksQuery
          .where('startedAt', '>=', period.start)
          .where('startedAt', '<=', period.end);
        
        issuesQuery = issuesQuery
          .where('detectedAt', '>=', period.start)
          .where('detectedAt', '<=', period.end);
      }

      const [checksSnapshot, issuesSnapshot] = await Promise.all([
        checksQuery.get(),
        issuesQuery.get()
      ]);

      const checks = checksSnapshot.docs.map(doc => doc.data() as CoherenceCheck);
      const issues = issuesSnapshot.docs.map(doc => doc.data() as CoherenceIssue);

      const stats = {
        totalChecks: checks.length,
        totalIssues: issues.length,
        issuesByType: {} as Record<string, number>,
        issuesBySeverity: {} as Record<string, number>,
        autoFixRate: 0,
        resolutionRate: 0
      };

      if (issues.length > 0) {
        // Compter par type et sévérité
        issues.forEach(issue => {
          stats.issuesByType[issue.type] = (stats.issuesByType[issue.type] || 0) + 1;
          stats.issuesBySeverity[issue.severity] = (stats.issuesBySeverity[issue.severity] || 0) + 1;
        });

        // Calculer les taux
        const autoFixed = issues.filter(i => i.fixApplied).length;
        const resolved = issues.filter(i => i.status === 'fixed' || i.status === 'ignored').length;

        stats.autoFixRate = Math.round((autoFixed / issues.length) * 100);
        stats.resolutionRate = Math.round((resolved / issues.length) * 100);
      }

      return stats;
    } catch (error) {
      throw new Error(`Failed to get coherence statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
export const dataCoherenceService = new DataCoherenceService();