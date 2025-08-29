import { Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { organizationMonitoringService } from '../services/organization-monitoring.service';
import { requireOrganizationPermission } from '../middleware/organization-permissions.middleware';
import { AuthenticatedRequest } from '../types';

export class OrganizationAnalyticsController {
  /**
   * Obtenir les métriques d'une organisation
   */
  static getOrganizationMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const analytics = await organizationMonitoringService.getOrganizationAnalytics(organizationId, days);

    res.json({
      success: true,
      data: analytics
    });
  });

  /**
   * Collecter les métriques actuelles d'une organisation
   */
  static collectMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId } = req.params;

    const metrics = await organizationMonitoringService.collectOrganizationMetrics(organizationId);

    res.json({
      success: true,
      data: metrics,
      message: 'Métriques collectées avec succès'
    });
  });

  /**
   * Créer une règle d'alerte
   */
  static createAlertRule = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId } = req.params;
    const userId = req.user.uid;
    const alertRuleData = req.body;

    const alertRule = await organizationMonitoringService.createAlertRule({
      ...alertRuleData,
      organizationId,
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      data: alertRule,
      message: 'Règle d\'alerte créée avec succès'
    });
  });

  /**
   * Obtenir les règles d'alerte d'une organisation
   */
  static getAlertRules = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId } = req.params;

    const alertRules = await organizationMonitoringService.getAlertRules(organizationId);

    res.json({
      success: true,
      data: alertRules
    });
  });

  /**
   * Obtenir les alertes actives d'une organisation
   */
  static getActiveAlerts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId } = req.params;

    const activeAlerts = await organizationMonitoringService.getActiveAlerts(organizationId);

    res.json({
      success: true,
      data: activeAlerts
    });
  });

  /**
   * Obtenir le tableau de bord des métriques globales (admin seulement)
   */
  static getGlobalMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;

    const globalMetrics = await organizationMonitoringService.getGlobalMetrics(days);

    res.json({
      success: true,
      data: {
        period: { days },
        ...globalMetrics
      }
    });
  });

  /**
   * Obtenir les statistiques d'utilisation des fonctionnalités
   */
  static getFeatureUsageStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const featureStats = await organizationMonitoringService.getFeatureUsageStats(organizationId, days);

    res.json({
      success: true,
      data: {
        organizationId,
        period: { days },
        ...featureStats
      }
    });
  });

  /**
   * Obtenir les métriques de performance
   */
  static getPerformanceMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId } = req.params;
    const days = parseInt(req.query.days as string) || 7;

    const performanceMetrics = await organizationMonitoringService.getPerformanceMetrics(organizationId, days);

    res.json({
      success: true,
      data: {
        organizationId,
        period: { days },
        performance: performanceMetrics
      }
    });
  });

  /**
   * Exporter les métriques au format CSV
   */
  static exportMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId } = req.params;
    const { format = 'csv', days = 30 } = req.query;

    const analytics = await organizationMonitoringService.getOrganizationAnalytics(
      organizationId, 
      parseInt(days as string)
    );

    if (format === 'csv') {
      // Générer CSV
      const csvData = this.generateCSV(analytics);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="metrics-${organizationId}-${Date.now()}.csv"`);
      res.send(csvData);
    } else {
      res.json({
        success: true,
        data: analytics
      });
    }
  });

  private static generateCSV(analytics: any): string {
    const headers = [
      'Date',
      'Organizations Created',
      'Success Rate',
      'Invitations Sent',
      'Acceptance Rate',
      'Active Users',
      'Total Errors'
    ];

    const rows = analytics.metrics.map((metric: any) => [
      metric.timestamp,
      metric.metrics.organizationCreation.totalCreated,
      metric.metrics.organizationCreation.successRate,
      metric.metrics.invitations.totalSent,
      metric.metrics.invitations.acceptanceRate,
      metric.metrics.activity.activeUsers,
      metric.metrics.errors.totalErrors
    ]);

    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  }
}

// Middleware pour les permissions
export const requireAnalyticsAccess = requireOrganizationPermission('canViewReports');