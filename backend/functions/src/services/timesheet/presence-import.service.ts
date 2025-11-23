/**
 * Service d'import des données de présence vers les feuilles de temps
 */

import { TimeEntryModel } from '../../models/time-entry.model';
import { TimesheetService } from './timesheet.service';
import {
  TimeEntry,
  PresenceEntry,
  TimePeriod,
  SyncResult
} from '../../common/types';
import { ValidationError } from '../../models/base.model';
import { collections, db } from 'config';


export class PresenceImportService {

  private timesheetService: TimesheetService;

  constructor(

    timesheetService: TimesheetService
  ) {
    this.timesheetService = timesheetService;
  }

  // ==================== Import depuis les données de présence ====================

  /**
   * Importer les données de présence pour une période donnée
   */
  async importFromPresenceData(
    employeeId: string,
    tenantId: string,
    period: TimePeriod,
    createdBy: string
  ): Promise<TimeEntry[]> {
    try {
      // Obtenir les entrées de présence pour la période
      const presenceEntries = await this.getPresenceEntriesForPeriod(employeeId, period);

      if (presenceEntries.length === 0) {
        return [];
      }

      // Obtenir ou créer la feuille de temps
      const timesheet = await this.getOrCreateTimesheet(
        employeeId,
        tenantId,
        period,
        createdBy
      );

      const importedEntries: TimeEntry[] = [];

      for (const presenceEntry of presenceEntries) {
        try {
          const timeEntries = await this.convertPresenceToTimeEntries(
            presenceEntry,
            timesheet.id!,
            createdBy
          );
          importedEntries.push(...timeEntries);
        } catch (error) {
          console.warn(`Failed to convert presence entry for ${presenceEntry.date}:`, error);
        }
      }

      return importedEntries;
    } catch (error) {
      throw new Error(`Failed to import from presence data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convertir une entrée de présence en entrées de temps
   */
  private async convertPresenceToTimeEntries(
    presenceEntry: PresenceEntry,
    timesheetId: string,
    createdBy: string
  ): Promise<TimeEntry[]> {
    const timeEntries: TimeEntry[] = [];

    // Vérifier que l'entrée de présence a des heures valides
    if (!presenceEntry.clockInTime || !presenceEntry.clockOutTime) {
      throw new ValidationError('Presence entry must have both clock in and clock out times');
    }

    // Calculer les périodes de travail en tenant compte des pauses
    const workPeriods = this.calculateWorkPeriods(presenceEntry);

    for (const period of workPeriods) {
      const timeEntryData: Partial<TimeEntry> = {
        employeeId: presenceEntry.employeeId,
        tenantId: presenceEntry.tenantId,
        timesheetId,
        date: presenceEntry.date,
        startTime: period.startTime,
        endTime: period.endTime,
        duration: period.duration,
        description: this.generateDescriptionFromPresence(presenceEntry, period),
        billable: true, // Par défaut, peut être modifié après
        metadata: {
          source: 'presence',
          presenceEntryId: presenceEntry.id
        },
        createdBy
      };

      const timeEntry = new TimeEntryModel(timeEntryData);

      // Calculer la durée à partir des heures
      timeEntry.setDurationFromTimes();

      // Valider l'entrée
      await timeEntry.validate();

      // Sauvegarder
      const docRef = await collections.time_entries.add(timeEntry.toFirestore());
      timeEntry.update({ id: docRef.id });

      timeEntries.push(timeEntry.getData());
    }

    return timeEntries;
  }

  /**
   * Calculer les périodes de travail en tenant compte des pauses
   */
  private calculateWorkPeriods(presenceEntry: PresenceEntry): Array<{
    startTime: Date;
    endTime: Date;
    duration: number;
    type: 'work' | 'break';
  }> {
    const periods: Array<{
      startTime: Date;
      endTime: Date;
      duration: number;
      type: 'work' | 'break';
    }> = [];

    if (!presenceEntry.clockInTime || !presenceEntry.clockOutTime) {
      return periods;
    }

    let currentTime = new Date(presenceEntry.clockInTime);
    const endTime = new Date(presenceEntry.clockOutTime);

    // Trier les pauses par heure de début
    const sortedBreaks = (presenceEntry.breakEntries || [])
      .filter(breakEntry => breakEntry.startTime && breakEntry.endTime)
      .sort((a, b) => a.startTime!.getTime() - b.startTime!.getTime());

    for (const breakEntry of sortedBreaks) {
      // Ajouter la période de travail avant la pause
      if (currentTime < breakEntry.startTime!) {
        const workDuration = Math.round((breakEntry.startTime!.getTime() - currentTime.getTime()) / (1000 * 60));

        if (workDuration > 0) {
          periods.push({
            startTime: new Date(currentTime),
            endTime: new Date(breakEntry.startTime!),
            duration: workDuration,
            type: 'work'
          });
        }
      }

      // Passer à la fin de la pause
      currentTime = new Date(breakEntry.endTime!);
    }

    // Ajouter la période de travail finale
    if (currentTime < endTime) {
      const finalDuration = Math.round((endTime.getTime() - currentTime.getTime()) / (1000 * 60));

      if (finalDuration > 0) {
        periods.push({
          startTime: new Date(currentTime),
          endTime: new Date(endTime),
          duration: finalDuration,
          type: 'work'
        });
      }
    }

    return periods.filter(period => period.type === 'work');
  }

  /**
   * Générer une description à partir des données de présence
   */
  private generateDescriptionFromPresence(
    presenceEntry: PresenceEntry,
    workPeriod: { startTime: Date; endTime: Date }
  ): string {
    const startTime = workPeriod.startTime.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const endTime = workPeriod.endTime.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    let description = `Travail de ${startTime} à ${endTime}`;

    // Ajouter des informations sur le statut de présence
    if (presenceEntry.status === 'late') {
      description += ' (Arrivée tardive)';
    } else if (presenceEntry.status === 'early_leave') {
      description += ' (Départ anticipé)';
    } else if (presenceEntry.status === 'overtime') {
      description += ' (Heures supplémentaires)';
    }

    // Ajouter les notes si disponibles
    if (presenceEntry.notes) {
      description += ` - ${presenceEntry.notes}`;
    }

    return description;
  }

  // ==================== Synchronisation automatique ====================

  /**
   * Synchroniser avec le système de présence
   */
  async syncWithPresenceSystem(
    tenantId: string,
    startDate: string,
    endDate: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: []
    };

    try {
      // Obtenir toutes les entrées de présence pour la période
      const presenceEntries = await this.getPresenceEntriesForTenant(tenantId, startDate, endDate);
      result.recordsProcessed = presenceEntries.length;

      for (const presenceEntry of presenceEntries) {
        try {
          const syncEntryResult = await this.syncPresenceEntry(presenceEntry);

          if (syncEntryResult.created) {
            result.recordsCreated++;
          } else if (syncEntryResult.updated) {
            result.recordsUpdated++;
          } else {
            result.recordsSkipped++;
          }
        } catch (error) {
          result.errors.push(`Failed to sync presence entry ${presenceEntry.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Synchroniser une entrée de présence individuelle
   */
  private async syncPresenceEntry(presenceEntry: PresenceEntry): Promise<{
    created: boolean;
    updated: boolean;
    skipped: boolean;
  }> {
    // Vérifier s'il existe déjà des entrées de temps pour cette présence
    const existingEntries = await this.getTimeEntriesFromPresence(presenceEntry.id!);

    if (existingEntries.length > 0) {
      // Vérifier si une mise à jour est nécessaire
      const needsUpdate = await this.presenceEntryNeedsUpdate(presenceEntry, existingEntries);

      if (needsUpdate) {
        await this.updateTimeEntriesFromPresence(presenceEntry, existingEntries);
        return { created: false, updated: true, skipped: false };
      } else {
        return { created: false, updated: false, skipped: true };
      }
    } else {
      // Créer de nouvelles entrées de temps
      const period: TimePeriod = {
        start: presenceEntry.date,
        end: presenceEntry.date
      };

      await this.importFromPresenceData(
        presenceEntry.employeeId,
        presenceEntry.tenantId,
        period,
        'system_sync'
      );

      return { created: true, updated: false, skipped: false };
    }
  }

  /**
   * Vérifier si une entrée de présence nécessite une mise à jour
   */
  private async presenceEntryNeedsUpdate(
    presenceEntry: PresenceEntry,
    existingTimeEntries: TimeEntry[]
  ): Promise<boolean> {
    // Calculer les heures totales de la présence
    if (!presenceEntry.clockInTime || !presenceEntry.clockOutTime) {
      return false;
    }

    const presenceHours = (presenceEntry.clockOutTime.getTime() - presenceEntry.clockInTime.getTime()) / (1000 * 60 * 60);
    const breakHours = (presenceEntry.totalBreakTime || 0) / 60;
    const expectedWorkHours = presenceHours - breakHours;

    // Calculer les heures totales des entrées de temps
    const timeEntryHours = existingTimeEntries.reduce((total, entry) => total + (entry.duration / 60), 0);

    // Vérifier s'il y a une différence significative
    const tolerance = 0.25; // 15 minutes de tolérance
    return Math.abs(expectedWorkHours - timeEntryHours) > tolerance;
  }

  /**
   * Mettre à jour les entrées de temps à partir de la présence
   */
  private async updateTimeEntriesFromPresence(
    presenceEntry: PresenceEntry,
    existingTimeEntries: TimeEntry[]
  ): Promise<void> {
    // Supprimer les anciennes entrées
    const batch = db.batch();

    for (const entry of existingTimeEntries) {
      if (entry.id) {
        batch.delete(collections.time_entries.doc(entry.id));
      }
    }

    await batch.commit();

    // Créer de nouvelles entrées
    const period: TimePeriod = {
      start: presenceEntry.date,
      end: presenceEntry.date
    };

    await this.importFromPresenceData(
      presenceEntry.employeeId,
      presenceEntry.tenantId,
      period,
      'system_update'
    );
  }

  // ==================== Réconciliation des données ====================

  /**
   * Réconcilier les données de présence et de temps
   */
  async reconcilePresenceAndTimeData(
    employeeId: string,
    tenantId: string,
    date: string
  ): Promise<{
    presenceEntry: PresenceEntry | null;
    timeEntries: TimeEntry[];
    discrepancies: string[];
    suggestions: string[];
  }> {
    const discrepancies: string[] = [];
    const suggestions: string[] = [];

    // Obtenir l'entrée de présence
    const presenceEntry = await this.getPresenceEntryForDate(employeeId, date);

    // Obtenir les entrées de temps
    const timeEntries = await this.getTimeEntriesForDate(employeeId, tenantId, date);

    if (!presenceEntry && timeEntries.length > 0) {
      discrepancies.push('Time entries exist but no presence entry found');
      suggestions.push('Verify if employee was actually present or if presence entry is missing');
    }

    if (presenceEntry && timeEntries.length === 0) {
      discrepancies.push('Presence entry exists but no time entries found');
      suggestions.push('Import time entries from presence data');
    }

    if (presenceEntry && timeEntries.length > 0) {
      // Comparer les heures
      const presenceHours = presenceEntry.actualWorkHours || 0;
      const timeEntryHours = timeEntries.reduce((total, entry) => total + (entry.duration / 60), 0);

      const tolerance = 0.5; // 30 minutes de tolérance
      if (Math.abs(presenceHours - timeEntryHours) > tolerance) {
        discrepancies.push(`Hours mismatch: Presence ${presenceHours.toFixed(1)}h vs Time entries ${timeEntryHours.toFixed(1)}h`);
        suggestions.push('Reconcile hours by updating time entries or presence data');
      }

      // Comparer les heures de début/fin
      if (presenceEntry.clockInTime && presenceEntry.clockOutTime) {
        const firstEntry = timeEntries.sort((a, b) =>
          (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0)
        )[0];

        const lastEntry = timeEntries.sort((a, b) =>
          (b.endTime?.getTime() || 0) - (a.endTime?.getTime() || 0)
        )[0];

        if (firstEntry.startTime && Math.abs(presenceEntry.clockInTime.getTime() - firstEntry.startTime.getTime()) > 30 * 60 * 1000) {
          discrepancies.push('Start time mismatch between presence and time entries');
        }

        if (lastEntry.endTime && Math.abs(presenceEntry.clockOutTime.getTime() - lastEntry.endTime.getTime()) > 30 * 60 * 1000) {
          discrepancies.push('End time mismatch between presence and time entries');
        }
      }
    }

    return {
      presenceEntry,
      timeEntries,
      discrepancies,
      suggestions
    };
  }

  // ==================== Méthodes utilitaires ====================

  /**
   * Obtenir ou créer une feuille de temps pour la période donnée
   */
  private async getOrCreateTimesheet(
    employeeId: string,
    tenantId: string,
    period: TimePeriod,
    createdBy: string
  ): Promise<any> {
    try {
      // Chercher une feuille de temps existante pour cette période
      const existingTimesheets = await this.timesheetService.getEmployeeTimesheets(
        employeeId,
        tenantId,
        {
          periodStart: period.start,
          periodEnd: period.end,
          limit: 1
        }
      );

      if (existingTimesheets.data && existingTimesheets.data.length > 0) {
        return existingTimesheets.data[0];
      }

      // Créer une nouvelle feuille de temps
      return await this.timesheetService.createTimesheet({
        employeeId,
        tenantId,
        periodStart: period.start,
        periodEnd: period.end,
        createdBy
      });
    } catch (error) {
      throw new Error(`Failed to get or create timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getPresenceEntriesForPeriod(
    employeeId: string,
    period: TimePeriod
  ): Promise<PresenceEntry[]> {
    const query = await collections.presence_entries
      .where('employeeId', '==', employeeId)
      .where('date', '>=', period.start)
      .where('date', '<=', period.end)
      .orderBy('date', 'asc')
      .get();

    return query.docs.map(doc => ({ id: doc.id, ...doc.data() } as PresenceEntry));
  }

  private async getPresenceEntriesForTenant(
    tenantId: string,
    startDate: string,
    endDate: string
  ): Promise<PresenceEntry[]> {
    const query = await collections.presence_entries
      .where('tenantId', '==', tenantId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    return query.docs.map(doc => ({ id: doc.id, ...doc.data() } as PresenceEntry));
  }

  private async getPresenceEntryForDate(
    employeeId: string,
    date: string
  ): Promise<PresenceEntry | null> {
    const query = await collections.presence_entries
      .where('employeeId', '==', employeeId)
      .where('date', '==', date)
      .limit(1)
      .get();

    if (query.empty) {
      return null;
    }

    return { id: query.docs[0].id, ...query.docs[0].data() } as PresenceEntry;
  }

  private async getTimeEntriesFromPresence(presenceEntryId: string): Promise<TimeEntry[]> {
    const query = await collections.time_entries
      .where('metadata.presenceEntryId', '==', presenceEntryId)
      .get();

    return query.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry));
  }

  private async getTimeEntriesForDate(
    employeeId: string,
    tenantId: string,
    date: string
  ): Promise<TimeEntry[]> {
    const query = await collections.time_entries
      .where('employeeId', '==', employeeId)
      .where('tenantId', '==', tenantId)
      .where('date', '==', date)
      .get();

    return query.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry));
  }

  /**
   * Pré-remplir une feuille de temps avec les données de présence
   */
  async prefillTimesheetFromPresence(
    timesheetId: string,
    tenantId: string,
    createdBy: string
  ): Promise<TimeEntry[]> {
    try {
      const timesheet = await this.timesheetService.getTimesheetById(timesheetId, tenantId);
      if (!timesheet) {
        throw new ValidationError('Timesheet not found');
      }

      const period: TimePeriod = {
        start: timesheet.periodStart,
        end: timesheet.periodEnd
      };

      return this.importFromPresenceData(
        timesheet.employeeId,
        timesheet.tenantId,
        period,
        createdBy
      );
    } catch (error) {
      throw new Error(`Failed to prefill timesheet from presence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}