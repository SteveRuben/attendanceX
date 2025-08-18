/**
 * Service pour la gestion des paramètres de présence de l'organisation
 */

import { db, collections } from '../config/database';
import { OrganizationPresenceSettingsModel, OrganizationPresenceSettings } from '../models/organization-presence-settings.model';
import { GeoLocation } from '@attendance-x/shared';
import { logger } from 'firebase-functions';

export interface PresenceSettingsUpdateRequest {
  general?: {
    workingDaysPerWeek?: number;
    standardWorkHours?: number;
  };
  geolocation?: {
    requireGeolocation?: boolean;
    allowedLocationRadius?: number;
    organizationLocations?: GeoLocation[];
  };
  gracePeriods?: {
    lateArrival?: number;
    earlyDeparture?: number;
  };
  notifications?: Partial<OrganizationPresenceSettings['notificationSettings']>;
  leaveApproval?: Partial<OrganizationPresenceSettings['leaveApprovalWorkflow']>;
  overtime?: Partial<OrganizationPresenceSettings['overtimeSettings']>;
  breaks?: Partial<OrganizationPresenceSettings['breakSettings']>;
  validation?: Partial<OrganizationPresenceSettings['validationSettings']>;
  integrations?: Partial<OrganizationPresenceSettings['integrationSettings']>;
  security?: Partial<OrganizationPresenceSettings['securitySettings']>;
  updatedBy: string;
}

class OrganizationPresenceSettingsService {
  private readonly collectionName = 'organization_presence_settings';

  /**
   * Obtenir les paramètres de présence d'une organisation
   */
  async getSettings(organizationId: string): Promise<OrganizationPresenceSettings | null> {
    try {
      const query = collections[this.collectionName]
        .where('organizationId', '==', organizationId)
        .limit(1);

      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return null;
      }

      const settings = OrganizationPresenceSettingsModel.fromFirestore(snapshot.docs[0]);
      return settings ? settings.getData() : null;

    } catch (error) {
      logger.error('Failed to get presence settings', { error, organizationId });
      throw error;
    }
  }

  /**
   * Créer les paramètres de présence par défaut pour une organisation
   */
  async createDefaultSettings(
    organizationId: string,
    createdBy: string
  ): Promise<OrganizationPresenceSettings> {
    try {
      logger.info('Creating default presence settings', { organizationId, createdBy });

      // Vérifier si les paramètres existent déjà
      const existingSettings = await this.getSettings(organizationId);
      if (existingSettings) {
        throw new Error('Presence settings already exist for this organization');
      }

      const defaultSettings = new OrganizationPresenceSettingsModel({
        organizationId,
        updatedBy: createdBy
      });

      await defaultSettings.validate();

      // Sauvegarder
      const docRef = collections[this.collectionName].doc();
      await docRef.set({
        ...defaultSettings.toFirestore(),
        id: docRef.id
      });

      logger.info('Default presence settings created', { organizationId, settingsId: docRef.id });

      return {
        ...defaultSettings.getData(),
        id: docRef.id
      };

    } catch (error) {
      logger.error('Failed to create default presence settings', { error, organizationId });
      throw error;
    }
  }

  /**
   * Mettre à jour les paramètres de présence
   */
  async updateSettings(
    organizationId: string,
    updates: PresenceSettingsUpdateRequest
  ): Promise<OrganizationPresenceSettings> {
    try {
      logger.info('Updating presence settings', { organizationId, updates });

      // Récupérer les paramètres existants
      const query = collections[this.collectionName]
        .where('organizationId', '==', organizationId)
        .limit(1);

      const snapshot = await query.get();
      
      if (snapshot.empty) {
        throw new Error('Presence settings not found for this organization');
      }

      const settings = OrganizationPresenceSettingsModel.fromFirestore(snapshot.docs[0]);
      if (!settings) {
        throw new Error('Failed to load presence settings');
      }

      // Appliquer les mises à jour
      if (updates.general) {
        settings.updateGeneralSettings(updates.general);
      }

      if (updates.geolocation) {
        settings.updateGeolocationSettings(updates.geolocation);
      }

      if (updates.gracePeriods) {
        settings.updateGracePeriods(
          updates.gracePeriods.lateArrival,
          updates.gracePeriods.earlyDeparture
        );
      }

      if (updates.notifications) {
        settings.updateNotificationSettings(updates.notifications);
      }

      if (updates.leaveApproval) {
        settings.updateLeaveApprovalWorkflow(updates.leaveApproval);
      }

      if (updates.overtime) {
        settings.updateOvertimeSettings(updates.overtime);
      }

      if (updates.breaks) {
        settings.updateBreakSettings(updates.breaks);
      }

      if (updates.validation) {
        settings.updateValidationSettings(updates.validation);
      }

      if (updates.integrations) {
        settings.updateIntegrationSettings(updates.integrations);
      }

      if (updates.security) {
        settings.updateSecuritySettings(updates.security);
      }

      // Mettre à jour les métadonnées
      settings.update({ updatedBy: updates.updatedBy });

      // Valider
      await settings.validate();

      // Sauvegarder
      await collections[this.collectionName].doc(snapshot.docs[0].id).update(settings.toFirestore());

      logger.info('Presence settings updated successfully', { organizationId });
      return settings.getData();

    } catch (error) {
      logger.error('Failed to update presence settings', { error, organizationId, updates });
      throw error;
    }
  }

  /**
   * Réinitialiser les paramètres aux valeurs par défaut
   */
  async resetToDefaults(
    organizationId: string,
    resetBy: string
  ): Promise<OrganizationPresenceSettings> {
    try {
      logger.info('Resetting presence settings to defaults', { organizationId, resetBy });

      // Supprimer les paramètres existants
      const query = collections[this.collectionName]
        .where('organizationId', '==', organizationId);

      const snapshot = await query.get();
      const batch = db.batch();

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Créer de nouveaux paramètres par défaut
      return await this.createDefaultSettings(organizationId, resetBy);

    } catch (error) {
      logger.error('Failed to reset presence settings', { error, organizationId });
      throw error;
    }
  }

  /**
   * Valider les paramètres de géolocalisation
   */
  async validateGeolocationSettings(
    organizationId: string,
    locations: GeoLocation[]
  ): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const errors: string[] = [];

      // Valider chaque localisation
      locations.forEach((location, index) => {
        if (typeof location.latitude !== 'number' || 
            location.latitude < -90 || location.latitude > 90) {
          errors.push(`Invalid latitude for location ${index + 1}`);
        }
        if (typeof location.longitude !== 'number' || 
            location.longitude < -180 || location.longitude > 180) {
          errors.push(`Invalid longitude for location ${index + 1}`);
        }
      });

      // Vérifier qu'il n'y a pas trop de localisations
      if (locations.length > 10) {
        errors.push('Maximum 10 locations allowed');
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      logger.error('Failed to validate geolocation settings', { error, organizationId });
      throw error;
    }
  }

  /**
   * Obtenir les paramètres effectifs pour un employé
   */
  async getEffectiveSettingsForEmployee(
    organizationId: string,
    employeeId: string
  ): Promise<OrganizationPresenceSettings | null> {
    try {
      // Pour l'instant, retourner les paramètres de l'organisation
      // Dans une implémentation future, on pourrait avoir des paramètres spécifiques par employé
      const settings = await this.getSettings(organizationId);
      
      // TODO: Appliquer les surcharges spécifiques à l'employé si elles existent
      
      return settings;

    } catch (error) {
      logger.error('Failed to get effective settings for employee', { error, organizationId, employeeId });
      throw error;
    }
  }

  /**
   * Vérifier si une fonctionnalité est activée
   */
  async isFeatureEnabled(
    organizationId: string,
    feature: 'geolocation' | 'overtime' | 'breaks' | 'biometric' | 'nfc' | 'qrcode'
  ): Promise<boolean> {
    try {
      const settings = await this.getSettings(organizationId);
      if (!settings) {
        return false;
      }

      switch (feature) {
        case 'geolocation':
          return settings.requireGeolocation;
        case 'overtime':
          return settings.overtimeSettings.enabled;
        case 'breaks':
          return settings.breakSettings.enforceBreaks;
        case 'biometric':
          return settings.integrationSettings.biometricEnabled;
        case 'nfc':
          return settings.integrationSettings.nfcEnabled;
        case 'qrcode':
          return settings.integrationSettings.qrCodeEnabled;
        default:
          return false;
      }

    } catch (error) {
      logger.error('Failed to check feature status', { error, organizationId, feature });
      return false;
    }
  }

  /**
   * Obtenir les statistiques d'utilisation des paramètres
   */
  async getSettingsUsageStats(organizationId: string): Promise<{
    geolocationUsage: number;
    overtimeEnabled: boolean;
    averageGracePeriod: number;
    notificationsEnabled: number;
    integrationsCount: number;
  }> {
    try {
      const settings = await this.getSettings(organizationId);
      if (!settings) {
        throw new Error('Settings not found');
      }

      // Calculer les statistiques
      const geolocationUsage = settings.requireGeolocation ? 100 : 0;
      const averageGracePeriod = (settings.gracePeriodsMinutes.lateArrival + settings.gracePeriodsMinutes.earlyDeparture) / 2;
      
      const notificationsEnabled = [
        settings.notificationSettings.missedClockIn,
        settings.notificationSettings.missedClockOut,
        settings.notificationSettings.overtime,
        settings.notificationSettings.leaveRequests
      ].filter(Boolean).length;

      const integrationsCount = [
        settings.integrationSettings.biometricEnabled,
        settings.integrationSettings.nfcEnabled,
        settings.integrationSettings.qrCodeEnabled,
        settings.integrationSettings.mobileAppRequired
      ].filter(Boolean).length;

      return {
        geolocationUsage,
        overtimeEnabled: settings.overtimeSettings.enabled,
        averageGracePeriod,
        notificationsEnabled,
        integrationsCount
      };

    } catch (error) {
      logger.error('Failed to get settings usage stats', { error, organizationId });
      throw error;
    }
  }

  /**
   * Exporter les paramètres de présence
   */
  async exportSettings(organizationId: string): Promise<OrganizationPresenceSettings> {
    try {
      const settings = await this.getSettings(organizationId);
      if (!settings) {
        throw new Error('Settings not found');
      }

      // Retourner une copie sans les données sensibles
      const exportData = { ...settings };
      
      // Supprimer les données sensibles
      if (exportData.securitySettings) {
        exportData.securitySettings.ipWhitelist = [];
        exportData.securitySettings.allowedDevices = [];
      }

      return exportData;

    } catch (error) {
      logger.error('Failed to export settings', { error, organizationId });
      throw error;
    }
  }

  /**
   * Importer des paramètres de présence
   */
  async importSettings(
    organizationId: string,
    settingsData: Partial<OrganizationPresenceSettings>,
    importedBy: string
  ): Promise<OrganizationPresenceSettings> {
    try {
      logger.info('Importing presence settings', { organizationId, importedBy });

      // Créer un modèle avec les données importées
      const settings = new OrganizationPresenceSettingsModel({
        ...settingsData,
        organizationId,
        updatedBy: importedBy
      });

      // Valider
      await settings.validate();

      // Supprimer les paramètres existants
      await this.resetToDefaults(organizationId, importedBy);

      // Sauvegarder les nouveaux paramètres
      const docRef = collections[this.collectionName].doc();
      await docRef.set({
        ...settings.toFirestore(),
        id: docRef.id
      });

      logger.info('Settings imported successfully', { organizationId, settingsId: docRef.id });

      return {
        ...settings.getData(),
        id: docRef.id
      };

    } catch (error) {
      logger.error('Failed to import settings', { error, organizationId });
      throw error;
    }
  }
}

export const organizationPresenceSettingsService = new OrganizationPresenceSettingsService();