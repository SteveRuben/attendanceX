/**
 * Service de synchronisation avec le système de présence
 */

import { collections } from '../../config/database';
import { ValidationError } from '../../models/base.model';

// Types pour la synchronisation
export interface PresenceEntry {
  id?: string;
  tenantId: string;
  employeeId: string;
  date: string;

  // Horaires
  clockIn?: Date;
  clockOut?: Date;
  breaks: PresenceBreak[];

  // Calculs
  totalPresenceTime: number; // en minutes
  totalBreakTime: number; // en minutes
  effectiveWorkTime: number; // en minutes

  // Statut
  status: 'present' | 'absent' | 'partial' | 'incomplete';

  // Métadonnées
  source: 'manual' | 'badge' | 'mobile' | 'imported';
  location?: string;
  deviceId?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface PresenceBreak {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // en minutes
  type: 'lunch' | 'coffee' | 'personal' | 'meeting' | 'other';
  description?: string;
}

export interface SyncResult {
  id?: string;
  tenantId: string;

  // Synchronisation
  syncType: 'presence_to_timesheet' | 'timesheet_to_presence' | 'bidirectional';
  syncDate: Date;

  // Données traitées
  processedEntries: number;
  createdEntries: number;
  updatedEntries: number;
  skippedEntries: number;
  errorEntries: number;

  // Conflits
  conflicts: SyncConflict[];

  // Résultats
  status: 'success' | 'partial' | 'failed';
  errors: string[];
  warnings: string[];

  // Métadonnées
  performedBy: string;
  duration: number; // en millisecondes
  createdAt: Date;
}

export interface SyncConflict {
  id: string;
  type: 'time_mismatch' | 'missing_presence' | 'missing_timesheet' | 'duration_difference' | 'date_mismatch';
  severity: 'error' | 'warning' | 'info';

  // Données en conflit
  presenceData?: any;
  timesheetData?: any;

  // Description
  description: string;
  suggestedResolution: string;

  // Résolution
  status: 'pending' | 'resolved' | 'ignored';
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
}

export interface SyncConfiguration {
  tenantId: string;

  // Configuration générale
  enabled: boolean;
  syncDirection: 'presence_to_timesheet' | 'timesheet_to_presence' | 'bidirectional';
  autoSync: boolean;
  syncFrequency: number; // en minutes

  // Règles de synchronisation
  rules: {
    // Seuils de tolérance
    timeDifferenceThreshold: number; // en minutes
    minimumWorkDuration: number; // en minutes
    maximumWorkDuration: number; // en minutes

    // Gestion des pauses
    convertBreaksToEntries: boolean;
    minimumBreakDuration: number; // en minutes
    excludeBreakTypes: string[];

    // Résolution des conflits
    conflictResolution: 'manual' | 'presence_priority' | 'timesheet_priority' | 'latest_wins';
    autoResolveThreshold: number; // en minutes

    // Validation
    requirePresenceForTimesheet: boolean;
    allowTimesheetWithoutPresence: boolean;
    validateWorkingHours: boolean;
  };

  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

export class PresenceSyncService {
  private syncResultsCollection = collections.sync_results;
  private syncConflictsCollection = collections.sync_conflicts;
  private syncConfigCollection = collections.sync_configurations;

  // ==================== Synchronisation bidirectionnelle ====================

  /**
   * Synchroniser les données de présence avec les feuilles de temps
   */
  async synchronizeData(
    tenantId: string,
    syncType: SyncResult['syncType'],
    dateRange: { start: Date; end: Date },
    performedBy: string,
    employeeIds?: string[]
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const config = await this.getSyncConfiguration(tenantId);

      if (!config.enabled) {
        throw new ValidationError('Synchronization is disabled for this tenant');
      }

      const result: SyncResult = {
        tenantId,
        syncType,
        syncDate: new Date(),
        processedEntries: 0,
        createdEntries: 0,
        updatedEntries: 0,
        skippedEntries: 0,
        errorEntries: 0,
        conflicts: [],
        status: 'success',
        errors: [],
        warnings: [],
        performedBy,
        duration: 0,
        createdAt: new Date()
      };

      // Obtenir les données à synchroniser
      const presenceEntries = await this.getPresenceEntries(tenantId, dateRange, employeeIds);
      const timesheetEntries = await this.getTimesheetEntries(tenantId, dateRange, employeeIds);

      result.processedEntries = presenceEntries.length;

      // Effectuer la synchronisation selon le type
      switch (syncType) {
        case 'presence_to_timesheet':
          await this.syncPresenceToTimesheet(tenantId, presenceEntries, timesheetEntries, config, result);
          break;

        case 'timesheet_to_presence':
          await this.syncTimesheetToPresence(tenantId, timesheetEntries, presenceEntries, config, result);
          break;

        case 'bidirectional':
          await this.syncBidirectional(tenantId, presenceEntries, timesheetEntries, config, result);
          break;
      }

      // Déterminer le statut final
      if (result.errorEntries > 0) {
        result.status = result.errorEntries === result.processedEntries ? 'failed' : 'partial';
      }

      result.duration = Date.now() - startTime;

      // Sauvegarder le résultat
      const docRef = await this.syncResultsCollection.add(result);
      result.id = docRef.id;

      return result;
    } catch (error) {
      const result: SyncResult = {
        tenantId,
        syncType,
        syncDate: new Date(),
        processedEntries: 0,
        createdEntries: 0,
        updatedEntries: 0,
        skippedEntries: 0,
        errorEntries: 1,
        conflicts: [],
        status: 'failed',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        performedBy,
        duration: Date.now() - startTime,
        createdAt: new Date()
      };

      await this.syncResultsCollection.add(result);
      return result;
    }
  }

  /**
   * Détecter les changements depuis la dernière synchronisation
   */
  async detectChanges(
    tenantId: string,
    lastSyncDate: Date,
    employeeIds?: string[]
  ): Promise<{
    presenceChanges: PresenceEntry[];
    timesheetChanges: any[];
    totalChanges: number;
  }> {
    try {
      // Détecter les changements dans les données de présence
      const presenceChanges = await this.getPresenceChanges(tenantId, lastSyncDate, employeeIds);

      // Détecter les changements dans les feuilles de temps
      const timesheetChanges = await this.getTimesheetChanges(tenantId, lastSyncDate, employeeIds);

      return {
        presenceChanges,
        timesheetChanges,
        totalChanges: presenceChanges.length + timesheetChanges.length
      };
    } catch (error) {
      throw new Error(`Failed to detect changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  // ==================== Mécanismes de réconciliation ====================

  /**
   * Réconcilier les données en cas de conflit
   */
  async reconcileConflicts(
    tenantId: string,
    conflicts: SyncConflict[],
    resolvedBy: string
  ): Promise<{
    resolved: number;
    failed: number;
    results: Array<{ conflictId: string; success: boolean; error?: string }>;
  }> {
    try {
      const results: Array<{ conflictId: string; success: boolean; error?: string }> = [];
      let resolved = 0;
      let failed = 0;

      const config = await this.getSyncConfiguration(tenantId);

      for (const conflict of conflicts) {
        try {
          const success = await this.resolveConflict(tenantId, conflict, config, resolvedBy);

          if (success) {
            resolved++;
            results.push({ conflictId: conflict.id, success: true });
          } else {
            failed++;
            results.push({ conflictId: conflict.id, success: false, error: 'Resolution failed' });
          }
        } catch (error) {
          failed++;
          results.push({
            conflictId: conflict.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return { resolved, failed, results };
    } catch (error) {
      throw new Error(`Failed to reconcile conflicts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Résoudre un conflit spécifique
   */
  private async resolveConflict(
    tenantId: string,
    conflict: SyncConflict,
    config: SyncConfiguration,
    resolvedBy: string
  ): Promise<boolean> {
    try {
      let resolution: string;

      switch (config.rules.conflictResolution) {
        case 'presence_priority':
          resolution = await this.applyPresencePriority(conflict);
          break;

        case 'timesheet_priority':
          resolution = await this.applyTimesheetPriority(conflict);
          break;

        case 'latest_wins':
          resolution = await this.applyLatestWins(conflict);
          break;

        case 'manual':
        default:
          // Pour la résolution manuelle, marquer comme en attente
          return false;
      }

      // Marquer le conflit comme résolu
      await this.markConflictResolved(conflict.id, resolvedBy, resolution);

      return true;
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      return false;
    }
  }

  // ==================== Synchronisation spécialisée ====================

  /**
   * Synchroniser de la présence vers les feuilles de temps
   */
  private async syncPresenceToTimesheet(
    tenantId: string,
    presenceEntries: PresenceEntry[],
    timesheetEntries: any[],
    config: SyncConfiguration,
    result: SyncResult
  ): Promise<void> {
    for (const presence of presenceEntries) {
      try {
        // Trouver la feuille de temps correspondante
        const existingTimesheet = timesheetEntries.find(
          ts => ts.employeeId === presence.employeeId && ts.date === presence.date
        );

        if (existingTimesheet) {
          // Vérifier s'il y a des conflits
          const conflicts = await this.detectConflicts(presence, existingTimesheet, config);

          if (conflicts.length > 0) {
            result.conflicts.push(...conflicts);

            // Résolution automatique si configurée
            if (config.rules.conflictResolution !== 'manual') {
              const resolved = await this.reconcileConflicts(tenantId, conflicts, 'system');
              if (resolved.resolved > 0) {
                result.updatedEntries++;
              } else {
                result.errorEntries++;
              }
            } else {
              result.skippedEntries++;
            }
          } else {
            // Mettre à jour la feuille de temps
            await this.updateTimesheetFromPresence(presence, existingTimesheet, config);
            result.updatedEntries++;
          }
        } else {
          // Créer une nouvelle feuille de temps
          await this.createTimesheetFromPresence(tenantId, presence, config);
          result.createdEntries++;
        }
      } catch (error) {
        result.errorEntries++;
        result.errors.push(`Error processing presence ${presence.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Synchroniser des feuilles de temps vers la présence
   */
  private async syncTimesheetToPresence(
    tenantId: string,
    timesheetEntries: any[],
    presenceEntries: PresenceEntry[],
    config: SyncConfiguration,
    result: SyncResult
  ): Promise<void> {
    for (const timesheet of timesheetEntries) {
      try {
        // Trouver l'entrée de présence correspondante
        const existingPresence = presenceEntries.find(
          p => p.employeeId === timesheet.employeeId && p.date === timesheet.date
        );

        if (existingPresence) {
          // Vérifier s'il y a des conflits
          const conflicts = await this.detectConflicts(existingPresence, timesheet, config);

          if (conflicts.length > 0) {
            result.conflicts.push(...conflicts);
            result.skippedEntries++;
          } else {
            // Mettre à jour la présence
            await this.updatePresenceFromTimesheet(existingPresence, timesheet, config);
            result.updatedEntries++;
          }
        } else {
          // Créer une nouvelle entrée de présence
          await this.createPresenceFromTimesheet(tenantId, timesheet, config);
          result.createdEntries++;
        }
      } catch (error) {
        result.errorEntries++;
        result.errors.push(`Error processing timesheet ${timesheet.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Synchronisation bidirectionnelle
   */
  private async syncBidirectional(
    tenantId: string,
    presenceEntries: PresenceEntry[],
    timesheetEntries: any[],
    config: SyncConfiguration,
    result: SyncResult
  ): Promise<void> {
    // D'abord synchroniser présence -> feuilles de temps
    await this.syncPresenceToTimesheet(tenantId, presenceEntries, timesheetEntries, config, result);

    // Puis synchroniser feuilles de temps -> présence pour les données manquantes
    const updatedTimesheetEntries = await this.getTimesheetEntries(
      tenantId,
      {
        start: new Date(Math.min(...presenceEntries.map(p => new Date(p.date).getTime()))),
        end: new Date(Math.max(...presenceEntries.map(p => new Date(p.date).getTime())))
      }
    );

    await this.syncTimesheetToPresence(tenantId, updatedTimesheetEntries, presenceEntries, config, result);
  }

  // ==================== Détection des conflits ====================

  /**
   * Détecter les conflits entre présence et feuille de temps
   */
  private async detectConflicts(
    presence: PresenceEntry,
    timesheet: any,
    config: SyncConfiguration
  ): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    try {
      // Conflit de durée
      const timeDifference = Math.abs(presence.effectiveWorkTime - (timesheet.totalMinutes || 0));
      if (timeDifference > config.rules.timeDifferenceThreshold) {
        conflicts.push({
          id: `time_mismatch_${presence.id}_${timesheet.id}`,
          type: 'time_mismatch',
          severity: timeDifference > config.rules.autoResolveThreshold ? 'error' : 'warning',
          presenceData: { effectiveWorkTime: presence.effectiveWorkTime },
          timesheetData: { totalMinutes: timesheet.totalMinutes },
          description: `Time difference of ${timeDifference} minutes between presence (${presence.effectiveWorkTime}min) and timesheet (${timesheet.totalMinutes}min)`,
          suggestedResolution: 'Adjust timesheet to match presence data',
          status: 'pending'
        });
      }

      // Conflit de date
      if (presence.date !== timesheet.date) {
        conflicts.push({
          id: `date_mismatch_${presence.id}_${timesheet.id}`,
          type: 'date_mismatch',
          severity: 'error',
          presenceData: { date: presence.date },
          timesheetData: { date: timesheet.date },
          description: `Date mismatch between presence (${presence.date}) and timesheet (${timesheet.date})`,
          suggestedResolution: 'Verify and correct the dates',
          status: 'pending'
        });
      }

      // Autres vérifications...

    } catch (error) {
      console.error('Error detecting conflicts:', error);
    }

    return conflicts;
  }

  // ==================== Méthodes utilitaires ====================

  private async getSyncConfiguration(tenantId: string): Promise<SyncConfiguration> {
    try {
      const query = await this.syncConfigCollection
        .where('tenantId', '==', tenantId)
        .limit(1)
        .get();

      if (query.empty) {
        return this.createDefaultSyncConfiguration(tenantId);
      }

      const docData = query.docs[0].data();
      return {
        ...docData,
        // Convert Firestore timestamps to Date objects if needed
        createdAt: docData.createdAt?.toDate?.() || docData.createdAt || new Date(),
        updatedAt: docData.updatedAt?.toDate?.() || docData.updatedAt || new Date()
      } as SyncConfiguration;
    } catch (error) {
      return this.createDefaultSyncConfiguration(tenantId);
    }
  }

  private createDefaultSyncConfiguration(tenantId: string): SyncConfiguration {
    return {
      tenantId,
      enabled: true,
      syncDirection: 'bidirectional',
      autoSync: false,
      syncFrequency: 60, // 1 heure
      rules: {
        timeDifferenceThreshold: 15, // 15 minutes
        minimumWorkDuration: 30, // 30 minutes
        maximumWorkDuration: 720, // 12 heures
        convertBreaksToEntries: false,
        minimumBreakDuration: 15,
        excludeBreakTypes: ['coffee'],
        conflictResolution: 'manual',
        autoResolveThreshold: 5, // 5 minutes
        requirePresenceForTimesheet: false,
        allowTimesheetWithoutPresence: true,
        validateWorkingHours: true
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: 'system'
    };
  }

  private async getPresenceEntries(
    tenantId: string,
    dateRange: { start: Date; end: Date },
    employeeIds?: string[]
  ): Promise<PresenceEntry[]> {
    try {
      // TODO: Intégrer avec le service de présence existant
      return [];
    } catch (error) {
      return [];
    }
  }

  private async getTimesheetEntries(
    tenantId: string,
    dateRange: { start: Date; end: Date },
    employeeIds?: string[]
  ): Promise<any[]> {
    try {
      // TODO: Intégrer avec le service de feuilles de temps existant
      return [];
    } catch (error) {
      return [];
    }
  }

  private async getPresenceChanges(
    tenantId: string,
    lastSyncDate: Date,
    employeeIds?: string[]
  ): Promise<PresenceEntry[]> {
    try {
      // TODO: Implémenter la détection des changements de présence
      return [];
    } catch (error) {
      return [];
    }
  }

  private async getTimesheetChanges(
    tenantId: string,
    lastSyncDate: Date,
    employeeIds?: string[]
  ): Promise<any[]> {
    try {
      // TODO: Implémenter la détection des changements de feuilles de temps
      return [];
    } catch (error) {
      return [];
    }
  }

  private async updateTimesheetFromPresence(
    presence: PresenceEntry,
    timesheet: any,
    config: SyncConfiguration
  ): Promise<void> {
    try {
      // TODO: Implémenter la mise à jour de feuille de temps depuis présence
      console.log('Updating timesheet from presence:', presence.id);
    } catch (error) {
      throw new Error(`Failed to update timesheet from presence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createTimesheetFromPresence(
    tenantId: string,
    presence: PresenceEntry,
    config: SyncConfiguration
  ): Promise<void> {
    try {
      // TODO: Implémenter la création de feuille de temps depuis présence
      console.log('Creating timesheet from presence:', presence.id);
    } catch (error) {
      throw new Error(`Failed to create timesheet from presence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updatePresenceFromTimesheet(
    presence: PresenceEntry,
    timesheet: any,
    config: SyncConfiguration
  ): Promise<void> {
    try {
      // TODO: Implémenter la mise à jour de présence depuis feuille de temps
      console.log('Updating presence from timesheet:', timesheet.id);
    } catch (error) {
      throw new Error(`Failed to update presence from timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createPresenceFromTimesheet(
    tenantId: string,
    timesheet: any,
    config: SyncConfiguration
  ): Promise<void> {
    try {
      // TODO: Implémenter la création de présence depuis feuille de temps
      console.log('Creating presence from timesheet:', timesheet.id);
    } catch (error) {
      throw new Error(`Failed to create presence from timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async applyPresencePriority(conflict: SyncConflict): Promise<string> {
    // Appliquer la priorité aux données de présence
    return 'Applied presence data priority';
  }

  private async applyTimesheetPriority(conflict: SyncConflict): Promise<string> {
    // Appliquer la priorité aux données de feuille de temps
    return 'Applied timesheet data priority';
  }

  private async applyLatestWins(conflict: SyncConflict): Promise<string> {
    // Appliquer la règle "le plus récent gagne"
    return 'Applied latest data wins rule';
  }

  private async markConflictResolved(
    conflictId: string,
    resolvedBy: string,
    resolution: string
  ): Promise<void> {
    try {
      await this.syncConflictsCollection.doc(conflictId).update({
        status: 'resolved',
        resolvedBy,
        resolvedAt: new Date(),
        resolution
      });
    } catch (error) {
      console.error('Failed to mark conflict as resolved:', error);
    }
  }

  // ==================== Méthodes de requête ====================

  /**
   * Obtenir l'historique des synchronisations
   */
  async getSyncHistory(
    tenantId: string,
    limit: number = 50
  ): Promise<SyncResult[]> {
    try {
      const query = await this.syncResultsCollection
        .where('tenantId', '==', tenantId)
        .orderBy('syncDate', 'desc')
        .limit(limit)
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SyncResult));
    } catch (error) {
      throw new Error(`Failed to get sync history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les conflits en attente
   */
  async getPendingConflicts(tenantId: string): Promise<SyncConflict[]> {
    try {
      const query = await this.syncConflictsCollection
        .where('tenantId', '==', tenantId)
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SyncConflict));
    } catch (error) {
      throw new Error(`Failed to get pending conflicts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les statistiques de synchronisation
   */
  async getSyncStatistics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    totalConflicts: number;
    resolvedConflicts: number;
    averageSyncDuration: number;
    syncFrequency: Record<string, number>;
  }> {
    try {
      let query = this.syncResultsCollection
        .where('tenantId', '==', tenantId);

      if (startDate) {
        query = query.where('syncDate', '>=', startDate);
      }

      if (endDate) {
        query = query.where('syncDate', '<=', endDate);
      }

      const result = await query.get();
      const syncs = result.docs.map(doc => doc.data() as SyncResult);

      const stats = {
        totalSyncs: syncs.length,
        successfulSyncs: syncs.filter(s => s.status === 'success').length,
        failedSyncs: syncs.filter(s => s.status === 'failed').length,
        totalConflicts: syncs.reduce((sum, s) => sum + s.conflicts.length, 0),
        resolvedConflicts: 0, // À calculer depuis les conflits
        averageSyncDuration: syncs.length > 0 ? syncs.reduce((sum, s) => sum + s.duration, 0) / syncs.length : 0,
        syncFrequency: {} as Record<string, number>
      };

      // Calculer la fréquence de synchronisation par type
      syncs.forEach(sync => {
        stats.syncFrequency[sync.syncType] = (stats.syncFrequency[sync.syncType] || 0) + 1;
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get sync statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const presenceSyncService = new PresenceSyncService();