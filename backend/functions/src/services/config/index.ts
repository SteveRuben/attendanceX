/**
 * Index des services de configuration pour les feuilles de temps
 */

export { TimesheetConfigService } from './timesheet-config.service';
export { RateManagementService, type HourlyRate } from './rate-management.service';
export { 
  TimesheetPermissionsService, 
  type TimesheetPermission,
  DEFAULT_ROLE_PERMISSIONS 
} from './timesheet-permissions.service';
export { ApprovalConfigService, type ApprovalConfiguration } from './approval-config.service';
export { ApprovalSetupService, type ApprovalSetupOptions } from './approval-setup.service';

// Service principal qui combine tous les services de configuration
import { firestore } from 'firebase-admin';
import { TimesheetConfigService } from './timesheet-config.service';
import { RateManagementService } from './rate-management.service';
import { TimesheetPermissionsService } from './timesheet-permissions.service';
import { ApprovalConfigService } from './approval-config.service';

export class TimesheetConfigurationManager {
  public readonly config: TimesheetConfigService;
  public readonly rates: RateManagementService;
  public readonly permissions: TimesheetPermissionsService;
  public readonly approvals: ApprovalConfigService;

  constructor(db: firestore.Firestore) {
    this.config = new TimesheetConfigService(db);
    this.rates = new RateManagementService(db);
    this.permissions = new TimesheetPermissionsService(db);
    this.approvals = new ApprovalConfigService();
  }

  /**
   * Initialiser la configuration complète pour un nouveau tenant
   */
  async initializeTenantConfiguration(
    tenantId: string,
    adminUserId: string,
    options: {
      defaultRate?: number;
      currency?: string;
      periodType?: 'weekly' | 'bi-weekly' | 'monthly';
      enableOvertime?: boolean;
      requireApproval?: boolean;
    } = {}
  ): Promise<{
    settings: any;
    defaultRate: any;
    adminPermissions: any;
  }> {
    try {
      // 1. Créer les paramètres par défaut
      const settings = await this.config.createDefaultSettings(tenantId, adminUserId);

      // 2. Configurer les paramètres selon les options
      if (options.periodType) {
        await this.config.configurePeriods(tenantId, {
          defaultPeriodType: options.periodType,
          allowCustomPeriods: true,
          weekStartDay: 1 // Lundi
        }, adminUserId);
      }

      if (options.enableOvertime !== undefined) {
        await this.config.configureOvertimeRules(tenantId, {
          enabled: options.enableOvertime,
          dailyThreshold: 8,
          weeklyThreshold: 40,
          multiplier: 1.5
        }, adminUserId);
      }

      if (options.requireApproval !== undefined) {
        await this.config.configureApprovalWorkflow(tenantId, {
          enabled: options.requireApproval,
          requireApprovalForAll: options.requireApproval,
          approvalLevels: 1,
          escalationDays: 3
        }, adminUserId);
      }

      // 3. Créer le taux par défaut
      const defaultRate = await this.rates.setDefaultRate(
        tenantId,
        options.defaultRate || 50, // 50€/h par défaut
        options.currency || 'EUR',
        adminUserId,
        'Default organizational rate'
      );

      // 4. Créer les permissions admin
      const adminPermissions = await this.permissions.setUserPermissions(
        tenantId,
        adminUserId,
        {}, // Utiliser les permissions admin par défaut
        {},
        adminUserId,
        'admin'
      );

      return {
        settings,
        defaultRate,
        adminPermissions
      };
    } catch (error) {
      throw new Error(`Failed to initialize tenant configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir un résumé complet de la configuration d'un tenant
   */
  async getTenantConfigurationSummary(tenantId: string): Promise<{
    settings: any;
    rates: any;
    permissions: any;
    statistics: {
      totalUsers: number;
      totalActiveRates: number;
      configurationHealth: 'good' | 'warning' | 'error';
      recommendations: string[];
    };
  }> {
    try {
      // Obtenir les informations de configuration
      const [
        settingsSummary,
        rateStatistics,
        permissionsSummary
      ] = await Promise.all([
        this.config.getConfigurationSummary(tenantId),
        this.rates.getRateStatistics(tenantId),
        this.permissions.getPermissionsSummaryByRole(tenantId)
      ]);

      // Analyser la santé de la configuration
      const recommendations: string[] = [];
      let configurationHealth: 'good' | 'warning' | 'error' = 'good';

      // Vérifications de santé
      if (rateStatistics.totalActiveRates === 0) {
        recommendations.push('No active rates configured - set up default rates');
        configurationHealth = 'error';
      }

      if (!settingsSummary.approvalRequired && settingsSummary.maxDailyHours > 12) {
        recommendations.push('High daily hours limit without approval - consider enabling approval workflow');
        configurationHealth = 'warning';
      }

      if (Object.keys(permissionsSummary).length === 0) {
        recommendations.push('No user permissions configured - set up user access');
        configurationHealth = 'error';
      }

      const totalUsers = Object.values(permissionsSummary).reduce((sum: number, role: any) => sum + role.userCount, 0);

      return {
        settings: settingsSummary,
        rates: rateStatistics,
        permissions: permissionsSummary,
        statistics: {
          totalUsers,
          totalActiveRates: rateStatistics.totalActiveRates,
          configurationHealth,
          recommendations
        }
      };
    } catch (error) {
      throw new Error(`Failed to get tenant configuration summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Valider la configuration complète d'un tenant
   */
  async validateTenantConfiguration(tenantId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Vérifier les paramètres de base
      const settings = await this.config.getTimesheetSettings(tenantId);
      await settings.validate();

      // Vérifier les taux
      const rateStats = await this.rates.getRateStatistics(tenantId);
      if (rateStats.totalActiveRates === 0) {
        errors.push('No default rate configured');
      }

      // Vérifier les permissions
      const permissions = await this.permissions.listTenantPermissions(tenantId);
      if (permissions.length === 0) {
        warnings.push('No user permissions configured');
      }

      // Suggestions d'amélioration
      if (settings.overtimeRules.enabled && rateStats.averageStandardRate > 0) {
        const overtimeRate = rateStats.averageStandardRate * settings.overtimeRules.multiplier;
        if (overtimeRate < rateStats.averageStandardRate * 1.25) {
          suggestions.push('Consider increasing overtime multiplier for better compliance');
        }
      }

      if (!settings.notifications.enabled) {
        suggestions.push('Enable notifications to improve timesheet completion rates');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      };
    } catch (error) {
      errors.push(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        isValid: false,
        errors,
        warnings,
        suggestions
      };
    }
  }
}