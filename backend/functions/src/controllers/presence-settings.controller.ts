/**
 * Contrôleur pour les paramètres de présence de l'organisation
 */

import { Request, Response } from 'express';
import { logger } from 'firebase-functions';
import { 
  organizationPresenceSettingsService, 
  PresenceSettingsUpdateRequest 
} from '../services/organization-presence-settings.service';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types/middleware.types';

// Schémas de validation
const GeoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  timestamp: z.date().optional()
});

const PresenceSettingsUpdateSchema = z.object({
  general: z.object({
    workingDaysPerWeek: z.number().min(1).max(7).optional(),
    standardWorkHours: z.number().min(1).max(16).optional()
  }).optional(),
  geolocation: z.object({
    requireGeolocation: z.boolean().optional(),
    allowedLocationRadius: z.number().min(1).max(1000).optional(),
    organizationLocations: z.array(GeoLocationSchema).optional()
  }).optional(),
  gracePeriods: z.object({
    lateArrival: z.number().min(0).max(60).optional(),
    earlyDeparture: z.number().min(0).max(60).optional()
  }).optional(),
  notifications: z.object({
    missedClockIn: z.boolean().optional(),
    missedClockOut: z.boolean().optional(),
    overtime: z.boolean().optional(),
    leaveRequests: z.boolean().optional(),
    reminderTimes: z.object({
      clockInReminder: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      clockOutReminder: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()
    }).optional()
  }).optional(),
  leaveApproval: z.object({
    requiresApproval: z.boolean().optional(),
    approverRoles: z.array(z.string()).optional(),
    autoApproveThreshold: z.number().min(0).optional(),
    escalationRules: z.object({
      enabled: z.boolean().optional(),
      escalateAfterHours: z.number().min(1).optional(),
      escalateToRoles: z.array(z.string()).optional()
    }).optional()
  }).optional(),
  overtime: z.object({
    enabled: z.boolean().optional(),
    requiresApproval: z.boolean().optional(),
    maxDailyOvertime: z.number().min(0).max(12).optional(),
    maxWeeklyOvertime: z.number().min(0).max(60).optional(),
    overtimeRates: z.object({
      weekday: z.number().min(1).optional(),
      weekend: z.number().min(1).optional(),
      holiday: z.number().min(1).optional()
    }).optional()
  }).optional(),
  breaks: z.object({
    enforceBreaks: z.boolean().optional(),
    minimumBreakDuration: z.number().min(1).max(240).optional(),
    maximumBreakDuration: z.number().min(1).max(240).optional(),
    requiredBreaksPerDay: z.number().min(0).max(5).optional(),
    breakTypes: z.array(z.object({
      id: z.string(),
      name: z.string(),
      duration: z.number().min(1),
      required: z.boolean()
    })).optional()
  }).optional(),
  validation: z.object({
    requireManagerValidation: z.boolean().optional(),
    autoValidateAfterDays: z.number().min(1).max(30).optional(),
    allowSelfCorrection: z.boolean().optional(),
    correctionTimeLimit: z.number().min(1).max(168).optional()
  }).optional(),
  integrations: z.object({
    biometricEnabled: z.boolean().optional(),
    nfcEnabled: z.boolean().optional(),
    qrCodeEnabled: z.boolean().optional(),
    mobileAppRequired: z.boolean().optional(),
    allowWebClockIn: z.boolean().optional()
  }).optional(),
  security: z.object({
    ipWhitelist: z.array(z.string()).optional(),
    deviceRestriction: z.boolean().optional(),
    allowedDevices: z.array(z.string()).optional(),
    sessionTimeout: z.number().min(30).max(1440).optional(),
    maxConcurrentSessions: z.number().min(1).max(10).optional()
  }).optional()
});

export class PresenceSettingsController {
  /**
   * Obtenir les paramètres de présence d'une organisation
   */
  async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;

      let settings = await organizationPresenceSettingsService.getSettings(organizationId);

      // Si les paramètres n'existent pas, créer les paramètres par défaut
      if (!settings) {
        const createdBy = req.user?.uid || 'system';
        settings = await organizationPresenceSettingsService.createDefaultSettings(
          organizationId,
          createdBy
        );
      }

      res.status(200).json({
        success: true,
        data: settings
      });

    } catch (error) {
      logger.error('Get presence settings failed', { error, organizationId: req.params.organizationId });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get presence settings',
        code: 'GET_SETTINGS_FAILED'
      });
    }
  }

  /**
   * Mettre à jour les paramètres de présence
   */
  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;
      const updatedBy = req.user?.uid || 'system';

      // Validation des données
      const validatedUpdates = PresenceSettingsUpdateSchema.parse(req.body);
      // @ts-ignore
      const updateRequest: PresenceSettingsUpdateRequest = {
        ...validatedUpdates,
        updatedBy
      };

      const settings = await organizationPresenceSettingsService.updateSettings(
        organizationId,
        updateRequest
      );

      res.status(200).json({
        success: true,
        data: settings,
        message: 'Settings updated successfully'
      });

    } catch (error) {
      logger.error('Update presence settings failed', { 
        error, 
        organizationId: req.params.organizationId,
        body: req.body 
      });
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
          code: 'VALIDATION_ERROR'
        });
        return;
      }
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update presence settings',
        code: 'UPDATE_SETTINGS_FAILED'
      });
    }
  }

  /**
   * Réinitialiser les paramètres aux valeurs par défaut
   */
  async resetSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;
      const resetBy = req.user?.uid || 'system';

      const settings = await organizationPresenceSettingsService.resetToDefaults(
        organizationId,
        resetBy
      );

      res.status(200).json({
        success: true,
        data: settings,
        message: 'Settings reset to defaults successfully'
      });

    } catch (error) {
      logger.error('Reset presence settings failed', { 
        error, 
        organizationId: req.params.organizationId 
      });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset presence settings',
        code: 'RESET_SETTINGS_FAILED'
      });
    }
  }

  /**
   * Valider les paramètres de géolocalisation
   */
  async validateGeolocationSettings(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;
      const { locations } = req.body;

      if (!Array.isArray(locations)) {
        res.status(400).json({
          success: false,
          error: 'Locations must be an array',
          code: 'INVALID_LOCATIONS_FORMAT'
        });
        return;
      }

      const validation = await organizationPresenceSettingsService.validateGeolocationSettings(
        organizationId,
        locations
      );

      res.status(200).json({
        success: true,
        data: validation
      });

    } catch (error) {
      logger.error('Validate geolocation settings failed', { 
        error, 
        organizationId: req.params.organizationId 
      });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate geolocation settings',
        code: 'VALIDATE_GEOLOCATION_FAILED'
      });
    }
  }

  /**
   * Vérifier si une fonctionnalité est activée
   */
  async checkFeatureStatus(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;
      const { feature } = req.params;

      const validFeatures = ['geolocation', 'overtime', 'breaks', 'biometric', 'nfc', 'qrcode'];
      if (!validFeatures.includes(feature)) {
        res.status(400).json({
          success: false,
          error: `Invalid feature. Valid features: ${validFeatures.join(', ')}`,
          code: 'INVALID_FEATURE'
        });
        return;
      }

      const isEnabled = await organizationPresenceSettingsService.isFeatureEnabled(
        organizationId,
        feature as any
      );

      res.status(200).json({
        success: true,
        data: {
          feature,
          enabled: isEnabled
        }
      });

    } catch (error) {
      logger.error('Check feature status failed', { 
        error, 
        organizationId: req.params.organizationId,
        feature: req.params.feature 
      });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check feature status',
        code: 'CHECK_FEATURE_FAILED'
      });
    }
  }

  /**
   * Obtenir les statistiques d'utilisation des paramètres
   */
  async getUsageStats(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;

      const stats = await organizationPresenceSettingsService.getSettingsUsageStats(organizationId);

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Get usage stats failed', { 
        error, 
        organizationId: req.params.organizationId 
      });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get usage stats',
        code: 'GET_USAGE_STATS_FAILED'
      });
    }
  }

  /**
   * Exporter les paramètres de présence
   */
  async exportSettings(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;

      const settings = await organizationPresenceSettingsService.exportSettings(organizationId);

      res.status(200).json({
        success: true,
        data: settings,
        message: 'Settings exported successfully'
      });

    } catch (error) {
      logger.error('Export settings failed', { 
        error, 
        organizationId: req.params.organizationId 
      });
      
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export settings',
        code: 'EXPORT_SETTINGS_FAILED'
      });
    }
  }

  /**
   * Importer des paramètres de présence
   */
  async importSettings(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;
      const importedBy = req.user?.uid || 'system';
      const settingsData = req.body;

      if (!settingsData || typeof settingsData !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Invalid settings data',
          code: 'INVALID_SETTINGS_DATA'
        });
        return;
      }

      const settings = await organizationPresenceSettingsService.importSettings(
        organizationId,
        settingsData,
        importedBy
      );

      res.status(200).json({
        success: true,
        data: settings,
        message: 'Settings imported successfully'
      });

    } catch (error) {
      logger.error('Import settings failed', { 
        error, 
        organizationId: req.params.organizationId,
        body: req.body 
      });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import settings',
        code: 'IMPORT_SETTINGS_FAILED'
      });
    }
  }

  /**
   * Obtenir les paramètres effectifs pour un employé
   */
  async getEffectiveSettingsForEmployee(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;
      const employeeId = req.params.employeeId;

      const settings = await organizationPresenceSettingsService.getEffectiveSettingsForEmployee(
        organizationId,
        employeeId
      );

      if (!settings) {
        res.status(404).json({
          success: false,
          error: 'Settings not found',
          code: 'SETTINGS_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: settings
      });

    } catch (error) {
      logger.error('Get effective settings for employee failed', { 
        error, 
        organizationId: req.params.organizationId,
        employeeId: req.params.employeeId 
      });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get effective settings',
        code: 'GET_EFFECTIVE_SETTINGS_FAILED'
      });
    }
  }
}

export const presenceSettingsController = new PresenceSettingsController();