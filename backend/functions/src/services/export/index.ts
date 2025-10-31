/**
 * Index des services d'export pour les feuilles de temps
 */

export { ExportService, type ExportRequest, type ExportTemplate, type ExportColumn } from './export.service';
export { 
  AccountingExportService, 
  type PayrollExport, 
  type PayrollEmployeeData, 
  type BillingExport, 
  type BillingProjectData 
} from './accounting-export.service';
export { 
  ApiIntegrationService, 
  type ApiIntegration, 
  type SyncJob, 
  type FieldMapping 
} from './api-integration.service';
export { 
  ExportAuditService, 
  type ExportAuditLog, 
  type PerformanceMetric, 
  type AlertRule, 
  type ExportAlert 
} from './export-audit.service';

// Service principal qui combine tous les services d'export
import { firestore } from 'firebase-admin';
import { ExportService } from './export.service';
import { AccountingExportService } from './accounting-export.service';
import { ApiIntegrationService } from './api-integration.service';
import { ExportAuditService } from './export-audit.service';

export class ExportManager {
  public readonly export: ExportService;
  public readonly accounting: AccountingExportService;
  public readonly integration: ApiIntegrationService;
  public readonly audit: ExportAuditService;

  constructor(db: firestore.Firestore) {
    this.export = new ExportService(db);
    this.accounting = new AccountingExportService(db);
    this.integration = new ApiIntegrationService(db);
    this.audit = new ExportAuditService();
  }

  /**
   * Workflow complet d'export avec audit
   */
  async exportWithAudit(
    tenantId: string,
    exportType: 'timesheet' | 'time_entries' | 'summary' | 'payroll' | 'billing',
    format: 'csv' | 'excel' | 'json' | 'pdf' | 'xml',
    filters: any,
    options: any,
    requestedBy: string,
    context: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    } = {}
  ): Promise<{
    exportRequest: any;
    auditLog: any;
  }> {
    try {
      // Logger le début de l'export
      await this.audit.logExportStarted(
        tenantId,
        'pending', // Sera mis à jour avec l'ID réel
        requestedBy,
        exportType,
        format,
        context
      );

      // Créer la demande d'export
      const exportRequest = await this.export.createExportRequest(
        tenantId,
        exportType,
        format,
        filters,
        options,
        requestedBy
      );

      // Mettre à jour le log d'audit avec l'ID réel
      const auditLog = await this.audit.logExportStarted(
        tenantId,
        exportRequest.id!,
        requestedBy,
        exportType,
        format,
        context
      );

      return {
        exportRequest,
        auditLog
      };
    } catch (error) {
      // Logger l'erreur
      await this.audit.logAuditEvent(
        tenantId,
        'export_failed',
        {
          action: 'create_export',
          resource: 'export_request'
        },
        requestedBy,
        {
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          ...context
        }
      );

      throw error;
    }
  }

  /**
   * Export comptable avec intégration automatique
   */
  async exportPayrollWithIntegration(
    tenantId: string,
    payrollPeriod: any,
    integrationId: string,
    generatedBy: string,
    options: any = {}
  ): Promise<{
    payrollExport: any;
    syncJob?: any;
    auditLogs: any[];
  }> {
    try {
      const auditLogs: any[] = [];

      // Générer l'export de paie
      const payrollExport = await this.accounting.generatePayrollExport(
        tenantId,
        payrollPeriod,
        options,
        generatedBy
      );

      // Logger la génération
      auditLogs.push(await this.audit.logAuditEvent(
        tenantId,
        'export_completed',
        {
          action: 'generate_payroll',
          resource: 'payroll_export',
          recordCount: payrollExport.employeeData.length
        },
        generatedBy,
        { success: true }
      ));

      // Si une intégration est spécifiée, démarrer la synchronisation
      let syncJob;
      if (integrationId) {
        syncJob = await this.integration.startManualSync(
          tenantId,
          integrationId,
          'export',
          'payroll',
          generatedBy,
          {
            filters: { payrollPeriod }
          }
        );

        auditLogs.push(await this.audit.logAuditEvent(
          tenantId,
          'sync_started',
          {
            action: 'start_payroll_sync',
            resource: 'sync_job',
            resourceId: syncJob.id
          },
          generatedBy,
          { 
            success: true,
            syncJobId: syncJob.id,
            integrationId
          }
        ));
      }

      return {
        payrollExport,
        syncJob,
        auditLogs
      };
    } catch (error) {
      throw new Error(`Failed to export payroll with integration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir le tableau de bord des exports
   */
  async getExportDashboard(tenantId: string): Promise<{
    recentExports: any[];
    activeIntegrations: any[];
    performanceMetrics: any;
    activeAlerts: any[];
    auditSummary: any;
  }> {
    try {
      // Obtenir les exports récents
      const recentExports = await this.export.listExportRequests(tenantId, { limit: 10 });

      // Obtenir les intégrations actives
      const allIntegrations = await this.integration.listIntegrations(tenantId);
      const activeIntegrations = allIntegrations.filter(i => i.status === 'active');

      // Obtenir les métriques de performance récentes
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 jours
      const performanceMetrics = await this.audit.getPerformanceMetrics(tenantId, {
        startDate,
        endDate,
        limit: 50
      });

      // Obtenir les alertes actives
      const activeAlerts = await this.audit.getActiveAlerts(tenantId);

      // Obtenir le résumé d'audit
      const auditSummary = await this.audit.getAuditStatistics(tenantId, {
        start: startDate,
        end: endDate
      });

      return {
        recentExports,
        activeIntegrations,
        performanceMetrics: this.aggregatePerformanceMetrics(performanceMetrics),
        activeAlerts,
        auditSummary
      };
    } catch (error) {
      throw new Error(`Failed to get export dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Traitement automatique des tâches de maintenance
   */
  async processMaintenanceTasks(tenantId: string): Promise<{
    cleanedAuditLogs: number;
    processedAlerts: number;
    syncStatistics: any;
  }> {
    try {
      // Nettoyer les anciens logs d'audit (90 jours par défaut)
      const cleanedAuditLogs = await this.audit.cleanupOldAuditLogs(tenantId, 90);

      // Traiter les alertes (résoudre automatiquement les anciennes)
      const activeAlerts = await this.audit.getActiveAlerts(tenantId);
      let processedAlerts = 0;

      for (const alert of activeAlerts) {
        // Résoudre automatiquement les alertes de plus de 24h
        const alertAge = Date.now() - alert.triggeredAt.getTime();
        if (alertAge > 24 * 60 * 60 * 1000) {
          await this.audit.resolveAlert(tenantId, alert.id!);
          processedAlerts++;
        }
      }

      // Obtenir les statistiques de synchronisation
      const syncStatistics = await this.integration.getSyncStatistics(tenantId);

      return {
        cleanedAuditLogs,
        processedAlerts,
        syncStatistics
      };
    } catch (error) {
      throw new Error(`Failed to process maintenance tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Méthodes utilitaires privées
  private aggregatePerformanceMetrics(metrics: any[]): any {
    if (metrics.length === 0) {
      return {
        averageDuration: 0,
        averageThroughput: 0,
        successRate: 100,
        totalDataProcessed: 0
      };
    }

    const totalDuration = metrics.reduce((sum, m) => sum + m.metrics.duration, 0);
    const totalThroughput = metrics.reduce((sum, m) => sum + (m.metrics.throughput || 0), 0);
    const totalDataSize = metrics.reduce((sum, m) => sum + (m.metrics.dataSize || 0), 0);
    const successfulMetrics = metrics.filter(m => (m.metrics.successRate || 100) > 90);

    return {
      averageDuration: Math.round(totalDuration / metrics.length),
      averageThroughput: Math.round(totalThroughput / metrics.length),
      successRate: Math.round((successfulMetrics.length / metrics.length) * 100),
      totalDataProcessed: totalDataSize
    };
  }
}