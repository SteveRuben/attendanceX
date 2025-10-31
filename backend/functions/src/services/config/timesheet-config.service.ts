/**
 * Service de configuration pour les feuilles de temps
 */

import { TimesheetSettingsModel, TimesheetSettings } from '../../models/timesheet-settings.model';
import { ValidationError } from '../../models/base.model';
import { firestore } from 'firebase-admin';

export class TimesheetConfigService {
  private db: firestore.Firestore;
  private settingsCollection: string = 'timesheet_settings';

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  // ==================== Gestion des paramètres ====================

  /**
   * Obtenir les paramètres de feuilles de temps pour un tenant
   */
  async getTimesheetSettings(tenantId: string): Promise<TimesheetSettingsModel> {
    try {
      const query = await this.db.collection(this.settingsCollection)
        .where('tenantId', '==', tenantId)
        .limit(1)
        .get();

      if (query.empty) {
        // Créer des paramètres par défaut
        return this.createDefaultSettings(tenantId, 'system');
      }

      const settings = TimesheetSettingsModel.fromFirestore(query.docs[0]);
      if (!settings) {
        throw new ValidationError('Failed to load timesheet settings');
      }

      return settings;
    } catch (error) {
      throw new Error(`Failed to get timesheet settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Créer des paramètres par défaut
   */
  async createDefaultSettings(tenantId: string, createdBy: string): Promise<TimesheetSettingsModel> {
    try {
      const settings = new TimesheetSettingsModel({
        tenantId,
        createdBy
      });

      await settings.validate();

      const docRef = await this.db.collection(this.settingsCollection).add(settings.toFirestore());
      settings.update({ id: docRef.id });

      return settings;
    } catch (error) {
      throw new Error(`Failed to create default settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mettre à jour les paramètres
   */
  async updateTimesheetSettings(
    tenantId: string,
    updates: Partial<TimesheetSettings>,
    updatedBy: string
  ): Promise<TimesheetSettingsModel> {
    try {
      const settings = await this.getTimesheetSettings(tenantId);
      
      settings.update({ ...updates, updatedBy });
      await settings.validate();

      await this.db.collection(this.settingsCollection)
        .doc(settings.id!)
        .update(settings.toFirestore());

      return settings;
    } catch (error) {
      throw new Error(`Failed to update timesheet settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Configuration des périodes ====================

  /**
   * Configurer les périodes de saisie
   */
  async configurePeriods(
    tenantId: string,
    config: {
      defaultPeriodType: 'weekly' | 'bi-weekly' | 'monthly' | 'custom';
      allowCustomPeriods: boolean;
      weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    },
    updatedBy: string
  ): Promise<TimesheetSettingsModel> {
    try {
      return this.updateTimesheetSettings(tenantId, config, updatedBy);
    } catch (error) {
      throw new Error(`Failed to configure periods: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir la configuration des périodes
   */
  async getPeriodConfiguration(tenantId: string): Promise<{
    defaultPeriodType: string;
    allowCustomPeriods: boolean;
    weekStartDay: number;
    supportedPeriodTypes: string[];
  }> {
    try {
      const settings = await this.getTimesheetSettings(tenantId);
      
      return {
        defaultPeriodType: settings.defaultPeriodType,
        allowCustomPeriods: settings.getData().allowCustomPeriods,
        weekStartDay: settings.getData().weekStartDay,
        supportedPeriodTypes: ['weekly', 'bi-weekly', 'monthly', 'custom']
      };
    } catch (error) {
      throw new Error(`Failed to get period configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Configuration des heures supplémentaires ====================

  /**
   * Configurer les règles d'heures supplémentaires
   */
  async configureOvertimeRules(
    tenantId: string,
    rules: {
      enabled: boolean;
      dailyThreshold?: number;
      weeklyThreshold?: number;
      multiplier?: number;
      autoCalculate?: boolean;
    },
    updatedBy: string
  ): Promise<TimesheetSettingsModel> {
    try {
      const settings = await this.getTimesheetSettings(tenantId);
      settings.updateOvertimeRules(rules);
      settings.update({ updatedBy });

      await this.db.collection(this.settingsCollection)
        .doc(settings.id!)
        .update(settings.toFirestore());

      return settings;
    } catch (error) {
      throw new Error(`Failed to configure overtime rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculer les heures supplémentaires selon la configuration
   */
  async calculateOvertime(
    tenantId: string,
    dailyHours: number,
    weeklyHours: number
  ): Promise<{
    dailyOvertime: number;
    weeklyOvertime: number;
    totalOvertime: number;
    overtimeRate: number;
  }> {
    try {
      const settings = await this.getTimesheetSettings(tenantId);
      const overtime = settings.calculateOvertimeHours(dailyHours, weeklyHours);

      return {
        ...overtime,
        overtimeRate: settings.overtimeRules.multiplier
      };
    } catch (error) {
      throw new Error(`Failed to calculate overtime: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Configuration des validations ====================

  /**
   * Configurer les règles de validation
   */
  async configureValidationRules(
    tenantId: string,
    rules: Partial<TimesheetSettings['validationRules']>,
    updatedBy: string
  ): Promise<TimesheetSettingsModel> {
    try {
      const settings = await this.getTimesheetSettings(tenantId);
      settings.updateValidationRules(rules);
      settings.update({ updatedBy });

      await this.db.collection(this.settingsCollection)
        .doc(settings.id!)
        .update(settings.toFirestore());

      return settings;
    } catch (error) {
      throw new Error(`Failed to configure validation rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Valider une entrée de temps selon la configuration
   */
  async validateTimeEntryAgainstConfig(
    tenantId: string,
    entryData: {
      date: string;
      duration: number;
      description?: string;
      projectId?: string;
      activityCodeId?: string;
      billable: boolean;
    }
  ): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const settings = await this.getTimesheetSettings(tenantId);
      return settings.validateTimeEntry(entryData);
    } catch (error) {
      throw new Error(`Failed to validate time entry against config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Configuration des approbations ====================

  /**
   * Configurer le workflow d'approbation
   */
  async configureApprovalWorkflow(
    tenantId: string,
    workflow: Partial<TimesheetSettings['approvalWorkflow']>,
    updatedBy: string
  ): Promise<TimesheetSettingsModel> {
    try {
      const settings = await this.getTimesheetSettings(tenantId);
      settings.updateApprovalWorkflow(workflow);
      settings.update({ updatedBy });

      await this.db.collection(this.settingsCollection)
        .doc(settings.id!)
        .update(settings.toFirestore());

      return settings;
    } catch (error) {
      throw new Error(`Failed to configure approval workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Vérifier si une approbation est requise
   */
  async isApprovalRequired(
    tenantId: string,
    totalHours: number
  ): Promise<boolean> {
    try {
      const settings = await this.getTimesheetSettings(tenantId);
      
      if (!settings.approvalWorkflow.enabled) {
        return false;
      }

      if (!settings.approvalWorkflow.requireApprovalForAll) {
        return totalHours > settings.approvalWorkflow.autoApproveThreshold;
      }

      return true;
    } catch (error) {
      return true; // Par sécurité, requérir l'approbation en cas d'erreur
    }
  }

  // ==================== Configuration des notifications ====================

  /**
   * Configurer les notifications
   */
  async configureNotifications(
    tenantId: string,
    notifications: Partial<TimesheetSettings['notifications']>,
    updatedBy: string
  ): Promise<TimesheetSettingsModel> {
    try {
      const settings = await this.getTimesheetSettings(tenantId);
      settings.updateNotificationSettings(notifications);
      settings.update({ updatedBy });

      await this.db.collection(this.settingsCollection)
        .doc(settings.id!)
        .update(settings.toFirestore());

      return settings;
    } catch (error) {
      throw new Error(`Failed to configure notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Vérifier si un rappel doit être envoyé
   */
  async shouldSendReminder(tenantId: string): Promise<boolean> {
    try {
      const settings = await this.getTimesheetSettings(tenantId);
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentTime = now.toTimeString().substring(0, 5); // HH:MM

      return settings.shouldSendReminder(dayOfWeek, currentTime);
    } catch (error) {
      return false;
    }
  }

  // ==================== Configuration de sécurité ====================

  /**
   * Configurer les paramètres de sécurité
   */
  async configureSecuritySettings(
    tenantId: string,
    security: Partial<TimesheetSettings['security']>,
    updatedBy: string
  ): Promise<TimesheetSettingsModel> {
    try {
      const settings = await this.getTimesheetSettings(tenantId);
      settings.updateSecuritySettings(security);
      settings.update({ updatedBy });

      await this.db.collection(this.settingsCollection)
        .doc(settings.id!)
        .update(settings.toFirestore());

      return settings;
    } catch (error) {
      throw new Error(`Failed to configure security settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Vérifier si une période est verrouillée
   */
  async isPeriodLocked(tenantId: string, periodEndDate: string): Promise<boolean> {
    try {
      const settings = await this.getTimesheetSettings(tenantId);
      return settings.isPeriodLocked(periodEndDate);
    } catch (error) {
      return false; // Par sécurité, ne pas verrouiller en cas d'erreur
    }
  }

  /**
   * Vérifier si une feuille de temps peut être modifiée
   */
  async canEditTimesheet(
    tenantId: string,
    timesheetStatus: string,
    submittedAt?: Date,
    approvedAt?: Date
  ): Promise<boolean> {
    try {
      const settings = await this.getTimesheetSettings(tenantId);
      return settings.canEditTimesheet(timesheetStatus, submittedAt, approvedAt);
    } catch (error) {
      return false; // Par sécurité, ne pas permettre l'édition en cas d'erreur
    }
  }

  // ==================== Méthodes utilitaires ====================

  /**
   * Obtenir un résumé de la configuration
   */
  async getConfigurationSummary(tenantId: string): Promise<{
    periodType: string;
    overtimeEnabled: boolean;
    approvalRequired: boolean;
    notificationsEnabled: boolean;
    maxDailyHours: number;
    maxWeeklyHours: number;
    lockPeriodDays: number;
  }> {
    try {
      const settings = await this.getTimesheetSettings(tenantId);

      return {
        periodType: settings.defaultPeriodType,
        overtimeEnabled: settings.overtimeRules.enabled,
        approvalRequired: settings.approvalWorkflow.enabled,
        notificationsEnabled: settings.notifications.enabled,
        maxDailyHours: settings.validationRules.maxDailyHours,
        maxWeeklyHours: settings.validationRules.maxWeeklyHours,
        lockPeriodDays: settings.security.lockPeriodAfterDays
      };
    } catch (error) {
      throw new Error(`Failed to get configuration summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Réinitialiser les paramètres aux valeurs par défaut
   */
  async resetToDefaults(tenantId: string, updatedBy: string): Promise<TimesheetSettingsModel> {
    try {
      // Supprimer les anciens paramètres
      const existingSettings = await this.getTimesheetSettings(tenantId);
      if (existingSettings.id) {
        await this.db.collection(this.settingsCollection).doc(existingSettings.id).delete();
      }

      // Créer de nouveaux paramètres par défaut
      return this.createDefaultSettings(tenantId, updatedBy);
    } catch (error) {
      throw new Error(`Failed to reset to defaults: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Exporter la configuration
   */
  async exportConfiguration(tenantId: string): Promise<TimesheetSettings> {
    try {
      const settings = await this.getTimesheetSettings(tenantId);
      return settings.getData();
    } catch (error) {
      throw new Error(`Failed to export configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Importer une configuration
   */
  async importConfiguration(
    tenantId: string,
    configData: Partial<TimesheetSettings>,
    importedBy: string
  ): Promise<TimesheetSettingsModel> {
    try {
      const settings = new TimesheetSettingsModel({
        ...configData,
        tenantId,
        createdBy: importedBy
      });

      await settings.validate();

      // Supprimer l'ancienne configuration si elle existe
      const existingSettings = await this.getTimesheetSettings(tenantId);
      if (existingSettings.id) {
        await this.db.collection(this.settingsCollection).doc(existingSettings.id).delete();
      }

      // Créer la nouvelle configuration
      const docRef = await this.db.collection(this.settingsCollection).add(settings.toFirestore());
      settings.update({ id: docRef.id });

      return settings;
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}