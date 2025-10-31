/**
 * Service d'import automatique des données de présence
 */

import { collections } from '../../config/database';
import { ValidationError } from '../../models/base.model';
import { PresenceEntry, PresenceBreak } from './presence-sync.service';

// Types pour l'import automatique
export interface ImportJob {
  id?: string;
  tenantId: string;

  // Configuration
  jobType: 'scheduled' | 'manual' | 'triggered';
  importType: 'presence_to_timesheet' | 'pre_fill' | 'break_conversion';

  // Paramètres
  dateRange: {
    start: Date;
    end: Date;
  };
  employeeIds?: string[];

  // Statut
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100

  // Résultats
  processedRecords: number;
  importedRecords: number;
  skippedRecords: number;
  errorRecords: number;

  // Détails
  errors: ImportError[];
  warnings: ImportWarning[];

  // Métadonnées
  scheduledBy?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // en millisecondes

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportError {
  recordId: string;
  employeeId: string;
  date: string;
  errorType: 'validation' | 'conversion' | 'conflict' | 'system';
  message: string;
  details?: any;
}

export interface ImportWarning {
  recordId: string;
  employeeId: string;
  date: string;
  warningType: 'data_quality' | 'missing_info' | 'assumption' | 'partial_data';
  message: string;
  details?: any;
}

export interface PreFillConfiguration {
  tenantId: string;

  // Règles de pré-remplissage
  enabled: boolean;
  autoCreateEntries: boolean;

  // Conversion des horaires
  convertPresenceToEntries: boolean;
  splitByBreaks: boolean;
  minimumEntryDuration: number; // en minutes

  // Gestion des pauses
  convertBreaks: boolean;
  breakConversionRules: {
    [breakType: string]: {
      convertToActivity: boolean;
      activityCodeId?: string;
      billable: boolean;
      description?: string;
    };
  };

  // Projets par défaut
  defaultProjectAssignment: {
    enabled: boolean;
    projectId?: string;
    assignmentRules: Array<{
      condition: string; // ex: "department === 'IT'"
      projectId: string;
    }>;
  };

  // Validation
  validateAgainstSchedule: boolean;
  requireMinimumHours: boolean;
  minimumDailyHours: number;

  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

export interface ConvertedTimeEntry {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // en minutes

  // Classification
  entryType: 'work' | 'break' | 'meeting' | 'other';
  activityCodeId?: string;
  projectId?: string;

  // Métadonnées
  description: string;
  billable: boolean;
  source: 'presence_import';
  originalPresenceId: string;
  originalBreakId?: string;

  // Validation
  isValid: boolean;
  validationErrors: string[];
  validationWarnings: string[];
}

export class AutoImportService {
  private importJobsCollection = collections.import_jobs;
  private preFillConfigCollection = collections.prefill_configurations;

  // ==================== Import automatique ====================

  /**
   * Démarrer un job d'import automatique
   */
  async startImportJob(
    tenantId: string,
    jobType: ImportJob['jobType'],
    importType: ImportJob['importType'],
    dateRange: { start: Date; end: Date },
    scheduledBy: string,
    employeeIds?: string[]
  ): Promise<ImportJob> {
    try {
      const job: ImportJob = {
        tenantId,
        jobType,
        importType,
        dateRange,
        employeeIds,
        status: 'pending',
        progress: 0,
        processedRecords: 0,
        importedRecords: 0,
        skippedRecords: 0,
        errorRecords: 0,
        errors: [],
        warnings: [],
        scheduledBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await this.importJobsCollection.add(job);
      job.id = docRef.id;

      // Démarrer le traitement en arrière-plan
      this.processImportJob(job);

      return job;
    } catch (error) {
      throw new Error(`Failed to start import job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Traiter un job d'import
   */
  private async processImportJob(job: ImportJob): Promise<void> {
    const startTime = Date.now();

    try {
      // Marquer comme en cours
      await this.updateJobStatus(job.id!, 'running', 0);
      job.startedAt = new Date();

      const config = await this.getPreFillConfiguration(job.tenantId);

      if (!config.enabled) {
        throw new ValidationError('Auto-import is disabled for this tenant');
      }

      // Obtenir les données de présence à importer
      const presenceEntries = await this.getPresenceEntriesForImport(
        job.tenantId,
        job.dateRange,
        job.employeeIds
      );

      job.processedRecords = presenceEntries.length;

      // Traiter chaque entrée de présence
      for (let i = 0; i < presenceEntries.length; i++) {
        const presence = presenceEntries[i];

        try {
          await this.processPresenceEntry(job, presence, config);
          job.importedRecords++;
        } catch (error) {
          job.errorRecords++;
          job.errors.push({
            recordId: presence.id || 'unknown',
            employeeId: presence.employeeId,
            date: presence.date,
            errorType: 'system',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Mettre à jour le progrès
        const progress = Math.round(((i + 1) / presenceEntries.length) * 100);
        await this.updateJobStatus(job.id!, 'running', progress);
      }

      // Marquer comme terminé
      job.status = 'completed';
      job.completedAt = new Date();
      job.duration = Date.now() - startTime;
      job.progress = 100;

      await this.updateJob(job);
    } catch (error) {
      // Marquer comme échoué
      job.status = 'failed';
      job.completedAt = new Date();
      job.duration = Date.now() - startTime;
      job.errors.push({
        recordId: 'job',
        employeeId: 'system',
        date: new Date().toISOString().split('T')[0],
        errorType: 'system',
        message: error instanceof Error ? error.message : 'Unknown error'
      });

      await this.updateJob(job);
    }
  }

  /**
   * Traiter une entrée de présence individuelle
   */
  private async processPresenceEntry(
    job: ImportJob,
    presence: PresenceEntry,
    config: PreFillConfiguration
  ): Promise<void> {
    try {
      switch (job.importType) {
        case 'presence_to_timesheet':
          await this.convertPresenceToTimesheet(job, presence, config);
          break;

        case 'pre_fill':
          await this.preFillTimesheet(job, presence, config);
          break;

        case 'break_conversion':
          await this.convertBreaksToEntries(job, presence, config);
          break;
      }
    } catch (error) {
      throw new Error(`Failed to process presence entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Conversion et pré-remplissage ====================

  /**
   * Convertir les données de présence en feuille de temps
   */
  private async convertPresenceToTimesheet(
    job: ImportJob,
    presence: PresenceEntry,
    config: PreFillConfiguration
  ): Promise<void> {
    // Cette méthode est un alias pour preFillTimesheet
    // car elle fait essentiellement la même chose
    await this.preFillTimesheet(job, presence, config);
  }

  /**
   * Pré-remplir une feuille de temps depuis les données de présence
   */
  async preFillTimesheet(
    job: ImportJob,
    presence: PresenceEntry,
    config: PreFillConfiguration
  ): Promise<void> {
    try {
      // Vérifier si une feuille de temps existe déjà
      const existingTimesheet = await this.getExistingTimesheet(
        job.tenantId,
        presence.employeeId,
        presence.date
      );

      if (existingTimesheet && existingTimesheet.entries.length > 0) {
        job.skippedRecords++;
        job.warnings.push({
          recordId: presence.id || 'unknown',
          employeeId: presence.employeeId,
          date: presence.date,
          warningType: 'partial_data',
          message: 'Timesheet already has entries, skipping pre-fill'
        });
        return;
      }

      // Convertir les données de présence en entrées de temps
      const convertedEntries = await this.convertPresenceToEntries(presence, config);

      // Valider les entrées converties
      const validEntries = convertedEntries.filter(entry => {
        if (!entry.isValid) {
          job.warnings.push({
            recordId: presence.id || 'unknown',
            employeeId: presence.employeeId,
            date: presence.date,
            warningType: 'assumption',
            message: `Invalid entry: ${entry.validationErrors.join(', ')}`
          });
          return false;
        }
        return true;
      });

      if (validEntries.length === 0) {
        job.skippedRecords++;
        return;
      }

      // Créer ou mettre à jour la feuille de temps
      if (existingTimesheet) {
        await this.addEntriesToTimesheet(existingTimesheet.id, validEntries);
      } else {
        await this.createTimesheetWithEntries(job.tenantId, presence.employeeId, presence.date, validEntries);
      }

    } catch (error) {
      throw new Error(`Failed to pre-fill timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convertir les données de présence en entrées de temps
   */
  private async convertPresenceToEntries(
    presence: PresenceEntry,
    config: PreFillConfiguration
  ): Promise<ConvertedTimeEntry[]> {
    const entries: ConvertedTimeEntry[] = [];

    try {
      if (!presence.clockIn || !presence.clockOut) {
        return entries;
      }

      if (config.splitByBreaks && presence.breaks.length > 0) {
        // Diviser par les pauses
        let currentStart = presence.clockIn;

        for (const breakItem of presence.breaks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())) {
          // Entrée avant la pause
          if (breakItem.startTime > currentStart) {
            const duration = Math.floor((breakItem.startTime.getTime() - currentStart.getTime()) / (1000 * 60));

            if (duration >= config.minimumEntryDuration) {
              entries.push(await this.createConvertedEntry(
                presence,
                currentStart,
                breakItem.startTime,
                duration,
                'work',
                config
              ));
            }
          }

          // Entrée pour la pause (si configurée)
          if (config.convertBreaks && breakItem.endTime) {
            const breakRule = config.breakConversionRules[breakItem.type];
            if (breakRule?.convertToActivity) {
              const breakDuration = Math.floor((breakItem.endTime.getTime() - breakItem.startTime.getTime()) / (1000 * 60));

              entries.push(await this.createConvertedEntry(
                presence,
                breakItem.startTime,
                breakItem.endTime,
                breakDuration,
                'break',
                config,
                breakItem
              ));
            }
          }

          currentStart = breakItem.endTime || breakItem.startTime;
        }

        // Entrée après la dernière pause
        if (currentStart < presence.clockOut) {
          const duration = Math.floor((presence.clockOut.getTime() - currentStart.getTime()) / (1000 * 60));

          if (duration >= config.minimumEntryDuration) {
            entries.push(await this.createConvertedEntry(
              presence,
              currentStart,
              presence.clockOut,
              duration,
              'work',
              config
            ));
          }
        }
      } else {
        // Une seule entrée pour toute la période
        const duration = Math.floor((presence.clockOut.getTime() - presence.clockIn.getTime()) / (1000 * 60));

        entries.push(await this.createConvertedEntry(
          presence,
          presence.clockIn,
          presence.clockOut,
          duration,
          'work',
          config
        ));
      }

      return entries;
    } catch (error) {
      throw new Error(`Failed to convert presence to entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  /**
   
* Créer une entrée convertie
   */
  private async createConvertedEntry(
    presence: PresenceEntry,
    startTime: Date,
    endTime: Date,
    duration: number,
    entryType: ConvertedTimeEntry['entryType'],
    config: PreFillConfiguration,
    breakItem?: PresenceBreak
  ): Promise<ConvertedTimeEntry> {
    const entry: ConvertedTimeEntry = {
      employeeId: presence.employeeId,
      date: presence.date,
      startTime: startTime.toTimeString().substring(0, 5), // HH:MM
      endTime: endTime.toTimeString().substring(0, 5), // HH:MM
      duration,
      entryType,
      source: 'presence_import',
      originalPresenceId: presence.id || 'unknown',
      originalBreakId: breakItem?.id,
      isValid: true,
      validationErrors: [],
      validationWarnings: [],
      billable: false,
      description: ''
    };

    // Configuration selon le type d'entrée
    if (entryType === 'break' && breakItem) {
      const breakRule = config.breakConversionRules[breakItem.type];
      if (breakRule) {
        entry.activityCodeId = breakRule.activityCodeId;
        entry.billable = breakRule.billable;
        entry.description = breakRule.description || breakItem.description || `${breakItem.type} break`;
      }
    } else if (entryType === 'work') {
      // Assigner un projet par défaut si configuré
      if (config.defaultProjectAssignment.enabled) {
        entry.projectId = await this.getDefaultProject(presence.employeeId, config);
        entry.billable = true;
        entry.description = 'Work time from presence data';
      }
    }

    // Valider l'entrée
    await this.validateConvertedEntry(entry, config);

    return entry;
  }

  /**
   * Valider une entrée convertie
   */
  private async validateConvertedEntry(
    entry: ConvertedTimeEntry,
    config: PreFillConfiguration
  ): Promise<void> {
    // Validation de la durée
    if (entry.duration < config.minimumEntryDuration) {
      entry.validationErrors.push(`Duration (${entry.duration}min) below minimum (${config.minimumEntryDuration}min)`);
      entry.isValid = false;
    }

    // Validation des heures
    if (entry.startTime >= entry.endTime) {
      entry.validationErrors.push('Start time must be before end time');
      entry.isValid = false;
    }

    // Validation du projet pour les entrées facturables
    if (entry.billable && !entry.projectId) {
      entry.validationWarnings.push('Billable entry without project assignment');
    }

    // Validation des heures minimales quotidiennes
    if (config.requireMinimumHours && entry.duration < config.minimumDailyHours * 60) {
      entry.validationWarnings.push(`Duration below daily minimum (${config.minimumDailyHours}h)`);
    }
  }

  // ==================== Conversion des pauses ====================

  /**
   * Convertir les pauses en activités
   */
  async convertBreaksToEntries(
    job: ImportJob,
    presence: PresenceEntry,
    config: PreFillConfiguration
  ): Promise<void> {
    try {
      if (!config.convertBreaks || presence.breaks.length === 0) {
        job.skippedRecords++;
        return;
      }

      const convertedBreaks: ConvertedTimeEntry[] = [];

      for (const breakItem of presence.breaks) {
        const breakRule = config.breakConversionRules[breakItem.type];

        if (!breakRule?.convertToActivity) {
          continue;
        }

        if (!breakItem.endTime) {
          job.warnings.push({
            recordId: presence.id || 'unknown',
            employeeId: presence.employeeId,
            date: presence.date,
            warningType: 'missing_info',
            message: `Break ${breakItem.id} has no end time`
          });
          continue;
        }

        const duration = Math.floor((breakItem.endTime.getTime() - breakItem.startTime.getTime()) / (1000 * 60));

        if (duration < config.minimumEntryDuration) {
          continue;
        }

        const convertedBreak = await this.createConvertedEntry(
          presence,
          breakItem.startTime,
          breakItem.endTime,
          duration,
          'break',
          config,
          breakItem
        );

        if (convertedBreak.isValid) {
          convertedBreaks.push(convertedBreak);
        }
      }

      if (convertedBreaks.length > 0) {
        // Ajouter les pauses converties à la feuille de temps
        const timesheet = await this.getExistingTimesheet(job.tenantId, presence.employeeId, presence.date);

        if (timesheet) {
          await this.addEntriesToTimesheet(timesheet.id, convertedBreaks);
        } else {
          job.warnings.push({
            recordId: presence.id || 'unknown',
            employeeId: presence.employeeId,
            date: presence.date,
            warningType: 'missing_info',
            message: 'No timesheet found to add converted breaks'
          });
        }
      }

    } catch (error) {
      throw new Error(`Failed to convert breaks to entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Validation croisée ====================

  /**
   * Effectuer une validation croisée entre présence et feuilles de temps
   */
  async performCrossValidation(
    tenantId: string,
    dateRange: { start: Date; end: Date },
    employeeIds?: string[]
  ): Promise<{
    validationResults: Array<{
      employeeId: string;
      date: string;
      presenceHours: number;
      timesheetHours: number;
      difference: number;
      status: 'match' | 'minor_difference' | 'major_difference' | 'missing_data';
      issues: string[];
    }>;
    summary: {
      totalValidated: number;
      matches: number;
      minorDifferences: number;
      majorDifferences: number;
      missingData: number;
    };
  }> {
    try {
      const validationResults: any[] = [];
      const summary = {
        totalValidated: 0,
        matches: 0,
        minorDifferences: 0,
        majorDifferences: 0,
        missingData: 0
      };

      // Obtenir les données de présence et de feuilles de temps
      const presenceEntries = await this.getPresenceEntriesForImport(tenantId, dateRange, employeeIds);
      const timesheetEntries = await this.getTimesheetEntriesForValidation(tenantId, dateRange, employeeIds);

      // Créer un index des feuilles de temps par employé et date
      const timesheetIndex = new Map<string, any>();
      timesheetEntries.forEach(ts => {
        const key = `${ts.employeeId}_${ts.date}`;
        timesheetIndex.set(key, ts);
      });

      // Valider chaque entrée de présence
      for (const presence of presenceEntries) {
        const key = `${presence.employeeId}_${presence.date}`;
        const timesheet = timesheetIndex.get(key);

        const result = {
          employeeId: presence.employeeId,
          date: presence.date,
          presenceHours: presence.effectiveWorkTime / 60,
          timesheetHours: timesheet ? (timesheet.totalMinutes / 60) : 0,
          difference: 0,
          status: 'match',//as const
          issues: [] as string[]
        };

        if (!timesheet) {
          result.status = 'missing_data';
          result.issues.push('No timesheet found for this date');
          summary.missingData++;
        } else {
          result.difference = Math.abs(result.presenceHours - result.timesheetHours);

          if (result.difference === 0) {
            result.status = 'match';
            summary.matches++;
          } else if (result.difference <= 0.25) { // 15 minutes
            result.status = 'minor_difference';
            summary.minorDifferences++;
          } else {
            result.status = 'major_difference';
            summary.majorDifferences++;
            result.issues.push(`Significant time difference: ${result.difference.toFixed(2)} hours`);
          }

          // Vérifications supplémentaires
          if (presence.status === 'incomplete') {
            result.issues.push('Incomplete presence data');
          }

          if (timesheet.status === 'draft') {
            result.issues.push('Timesheet is still in draft');
          }
        }

        validationResults.push(result);
        summary.totalValidated++;
      }

      return { validationResults, summary };
    } catch (error) {
      throw new Error(`Failed to perform cross validation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Méthodes utilitaires ====================

  private async getPreFillConfiguration(tenantId: string): Promise<PreFillConfiguration> {
    try {
      const query = await this.preFillConfigCollection
        .where('tenantId', '==', tenantId)
        .limit(1)
        .get();

      if (query.empty) {
        return this.createDefaultPreFillConfiguration(tenantId);
      }

      const docData = query.docs[0].data();
      return {
        ...docData,
        // Convert Firestore timestamps to Date objects if needed
        createdAt: docData.createdAt?.toDate?.() || docData.createdAt || new Date(),
        updatedAt: docData.updatedAt?.toDate?.() || docData.updatedAt || new Date()
      } as PreFillConfiguration;
    } catch (error) {
      return this.createDefaultPreFillConfiguration(tenantId);
    }
  }

  private createDefaultPreFillConfiguration(tenantId: string): PreFillConfiguration {
    return {
      tenantId,
      enabled: true,
      autoCreateEntries: true,
      convertPresenceToEntries: true,
      splitByBreaks: true,
      minimumEntryDuration: 15, // 15 minutes
      convertBreaks: false,
      breakConversionRules: {
        lunch: {
          convertToActivity: false,
          billable: false
        },
        coffee: {
          convertToActivity: false,
          billable: false
        },
        meeting: {
          convertToActivity: true,
          billable: true,
          description: 'Meeting time'
        }
      },
      defaultProjectAssignment: {
        enabled: false,
        assignmentRules: []
      },
      validateAgainstSchedule: false,
      requireMinimumHours: false,
      minimumDailyHours: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: 'system'
    };
  }

  private async getPresenceEntriesForImport(
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

  private async getExistingTimesheet(
    tenantId: string,
    employeeId: string,
    date: string
  ): Promise<{ id: string; entries: any[] } | null> {
    try {
      // TODO: Intégrer avec le service de feuilles de temps existant
      return null;
    } catch (error) {
      return null;
    }
  }

  private async getTimesheetEntriesForValidation(
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

  private async addEntriesToTimesheet(timesheetId: string, entries: ConvertedTimeEntry[]): Promise<void> {
    try {
      // TODO: Intégrer avec le service de feuilles de temps existant
      console.log(`Adding ${entries.length} entries to timesheet ${timesheetId}`);
    } catch (error) {
      throw new Error(`Failed to add entries to timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createTimesheetWithEntries(
    tenantId: string,
    employeeId: string,
    date: string,
    entries: ConvertedTimeEntry[]
  ): Promise<void> {
    try {
      // TODO: Intégrer avec le service de feuilles de temps existant
      console.log(`Creating timesheet for ${employeeId} on ${date} with ${entries.length} entries`);
    } catch (error) {
      throw new Error(`Failed to create timesheet with entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getDefaultProject(employeeId: string, config: PreFillConfiguration): Promise<string | undefined> {
    try {
      if (config.defaultProjectAssignment.projectId) {
        return config.defaultProjectAssignment.projectId;
      }

      // TODO: Appliquer les règles d'assignation
      for (const rule of config.defaultProjectAssignment.assignmentRules) {
        // Évaluer la condition et retourner le projet si elle est vraie
        // Pour l'instant, retourner le premier projet trouvé
        return rule.projectId;
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private async updateJobStatus(jobId: string, status: ImportJob['status'], progress: number): Promise<void> {
    try {
      await this.importJobsCollection.doc(jobId).update({
        status,
        progress,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  }

  private async updateJob(job: ImportJob): Promise<void> {
    try {
      if (job.id) {
        await this.importJobsCollection.doc(job.id).update({
          ...job,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to update job:', error);
    }
  }

  // ==================== Méthodes de requête ====================

  /**
   * Obtenir l'historique des jobs d'import
   */
  async getImportHistory(tenantId: string, limit: number = 50): Promise<ImportJob[]> {
    try {
      const query = await this.importJobsCollection
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ImportJob));
    } catch (error) {
      throw new Error(`Failed to get import history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les jobs d'import actifs
   */
  async getActiveImportJobs(tenantId: string): Promise<ImportJob[]> {
    try {
      const query = await this.importJobsCollection
        .where('tenantId', '==', tenantId)
        .where('status', 'in', ['pending', 'running'])
        .orderBy('createdAt', 'desc')
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ImportJob));
    } catch (error) {
      throw new Error(`Failed to get active import jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les statistiques d'import
   */
  async getImportStatistics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    totalRecordsProcessed: number;
    totalRecordsImported: number;
    averageJobDuration: number;
    jobsByType: Record<string, number>;
  }> {
    try {
      let query = this.importJobsCollection
        .where('tenantId', '==', tenantId);

      if (startDate) {
        query = query.where('createdAt', '>=', startDate);
      }

      if (endDate) {
        query = query.where('createdAt', '<=', endDate);
      }

      const result = await query.get();
      const jobs = result.docs.map(doc => doc.data() as ImportJob);

      const stats = {
        totalJobs: jobs.length,
        successfulJobs: jobs.filter(j => j.status === 'completed').length,
        failedJobs: jobs.filter(j => j.status === 'failed').length,
        totalRecordsProcessed: jobs.reduce((sum, j) => sum + j.processedRecords, 0),
        totalRecordsImported: jobs.reduce((sum, j) => sum + j.importedRecords, 0),
        averageJobDuration: 0,
        jobsByType: {} as Record<string, number>
      };

      // Calculer la durée moyenne
      const completedJobs = jobs.filter(j => j.duration);
      if (completedJobs.length > 0) {
        stats.averageJobDuration = completedJobs.reduce((sum, j) => sum + (j.duration || 0), 0) / completedJobs.length;
      }

      // Compter par type
      jobs.forEach(job => {
        stats.jobsByType[job.importType] = (stats.jobsByType[job.importType] || 0) + 1;
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get import statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Annuler un job d'import
   */
  async cancelImportJob(tenantId: string, jobId: string, cancelledBy: string): Promise<boolean> {
    try {
      const doc = await this.importJobsCollection.doc(jobId).get();

      if (!doc.exists) {
        return false;
      }

      const job = doc.data() as ImportJob;

      if (job.tenantId !== tenantId) {
        return false;
      }

      if (!['pending', 'running'].includes(job.status)) {
        return false;
      }

      await this.importJobsCollection.doc(jobId).update({
        status: 'cancelled',
        completedAt: new Date(),
        updatedAt: new Date()
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}

export const autoImportService = new AutoImportService();