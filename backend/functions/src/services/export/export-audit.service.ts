/**
 * Service d'audit et de logs pour les exports
 */

import { collections } from '../../config/database';
import { ValidationError } from '../../models/base.model';

// Types pour l'audit des exports
export interface ExportAuditLog {
  id?: string;
  tenantId: string;
  
  // Identification
  exportRequestId?: string;
  syncJobId?: string;
  integrationId?: string;
  
  // Type d'événement
  eventType: 'export_started' | 'export_completed' | 'export_failed' | 'sync_started' | 'sync_completed' | 'sync_failed' | 'integration_test' | 'data_access' | 'file_download' | 'api_call';
  
  // Détails de l'événement
  details: {
    action: string;
    resource: string;
    resourceId?: string;
    method?: string;
    endpoint?: string;
    statusCode?: number;
    responseTime?: number;
    dataSize?: number;
    recordCount?: number;
  };
  
  // Utilisateur et contexte
  userId: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  
  // Résultat
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  
  // Métadonnées
  timestamp: Date;
  duration?: number; // en millisecondes
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  id?: string;
  tenantId: string;
  
  // Identification
  metricType: 'export_performance' | 'sync_performance' | 'api_performance' | 'system_performance';
  resourceType: 'export' | 'sync_job' | 'integration' | 'system';
  resourceId?: string;
  
  // Métriques
  metrics: {
    duration: number; // en millisecondes
    throughput?: number; // records/second
    dataSize?: number; // en bytes
    memoryUsage?: number; // en MB
    cpuUsage?: number; // en pourcentage
    errorRate?: number; // en pourcentage
    successRate?: number; // en pourcentage
  };
  
  // Contexte
  timestamp: Date;
  period?: {
    start: Date;
    end: Date;
  };
  
  // Métadonnées
  tags?: Record<string, string>;
  environment?: string;
}

export interface AlertRule {
  id?: string;
  tenantId: string;
  
  // Configuration
  name: string;
  description: string;
  enabled: boolean;
  
  // Conditions
  conditions: {
    metricType: string;
    threshold: number;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    timeWindow: number; // en minutes
    aggregation: 'avg' | 'max' | 'min' | 'sum' | 'count';
  }[];
  
  // Actions
  actions: {
    type: 'email' | 'webhook' | 'slack' | 'sms';
    target: string;
    template?: string;
  }[];
  
  // Statut
  lastTriggered?: Date;
  triggerCount: number;
  
  // Métadonnées
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportAlert {
  id?: string;
  tenantId: string;
  
  // Alerte
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Détails
  message: string;
  details: Record<string, any>;
  
  // Contexte
  resourceType: string;
  resourceId?: string;
  metricValue: number;
  threshold: number;
  
  // Statut
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  
  // Métadonnées
  triggeredAt: Date;
  createdAt: Date;
}

export class ExportAuditService {
  private auditLogsCollection = collections.export_audit_logs;
  private metricsCollection = collections.export_metrics;
  private alertRulesCollection = collections.export_alert_rules;
  private alertsCollection = collections.export_alerts;

  // ==================== Logging d'audit ====================

  /**
   * Enregistrer un événement d'audit
   */
  async logAuditEvent(
    tenantId: string,
    eventType: ExportAuditLog['eventType'],
    details: ExportAuditLog['details'],
    userId: string,
    context: {
      exportRequestId?: string;
      syncJobId?: string;
      integrationId?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      userRole?: string;
      success?: boolean;
      errorCode?: string;
      errorMessage?: string;
      duration?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<ExportAuditLog> {
    try {
      const auditLog: ExportAuditLog = {
        tenantId,
        exportRequestId: context.exportRequestId,
        syncJobId: context.syncJobId,
        integrationId: context.integrationId,
        eventType,
        details,
        userId,
        userRole: context.userRole,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        success: context.success !== undefined ? context.success : true,
        errorCode: context.errorCode,
        errorMessage: context.errorMessage,
        timestamp: new Date(),
        duration: context.duration,
        metadata: context.metadata
      };

      const docRef = await this.auditLogsCollection.add(auditLog);
      
      return {
        ...auditLog,
        id: docRef.id
      };
    } catch (error) {
      console.error('Failed to log audit event:', error);
      throw new Error(`Failed to log audit event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Logger le début d'un export
   */
  async logExportStarted(
    tenantId: string,
    exportRequestId: string,
    userId: string,
    exportType: string,
    format: string,
    context: any = {}
  ): Promise<void> {
    await this.logAuditEvent(
      tenantId,
      'export_started',
      {
        action: 'start_export',
        resource: 'export_request',
        resourceId: exportRequestId,
        recordCount: context.recordCount
      },
      userId,
      {
        exportRequestId,
        ...context,
        metadata: {
          exportType,
          format,
          ...context.metadata
        }
      }
    );
  }

  /**
   * Logger la fin d'un export
   */
  async logExportCompleted(
    tenantId: string,
    exportRequestId: string,
    userId: string,
    success: boolean,
    context: {
      duration?: number;
      fileSize?: number;
      recordCount?: number;
      errorMessage?: string;
    } = {}
  ): Promise<void> {
    await this.logAuditEvent(
      tenantId,
      success ? 'export_completed' : 'export_failed',
      {
        action: success ? 'complete_export' : 'fail_export',
        resource: 'export_request',
        resourceId: exportRequestId,
        dataSize: context.fileSize,
        recordCount: context.recordCount
      },
      userId,
      {
        exportRequestId,
        success,
        duration: context.duration,
        errorMessage: context.errorMessage
      }
    );
  }

  /**
   * Logger un téléchargement de fichier
   */
  async logFileDownload(
    tenantId: string,
    exportRequestId: string,
    userId: string,
    fileName: string,
    fileSize: number,
    context: any = {}
  ): Promise<void> {
    await this.logAuditEvent(
      tenantId,
      'file_download',
      {
        action: 'download_file',
        resource: 'export_file',
        resourceId: exportRequestId,
        dataSize: fileSize
      },
      userId,
      {
        exportRequestId,
        ...context,
        metadata: {
          fileName,
          fileSize,
          ...context.metadata
        }
      }
    );
  }

  // ==================== Métriques de performance ====================

  /**
   * Enregistrer une métrique de performance
   */
  async recordPerformanceMetric(
    tenantId: string,
    metricType: PerformanceMetric['metricType'],
    resourceType: PerformanceMetric['resourceType'],
    metrics: PerformanceMetric['metrics'],
    options: {
      resourceId?: string;
      period?: { start: Date; end: Date };
      tags?: Record<string, string>;
      environment?: string;
    } = {}
  ): Promise<PerformanceMetric> {
    try {
      const metric: PerformanceMetric = {
        tenantId,
        metricType,
        resourceType,
        resourceId: options.resourceId,
        metrics,
        timestamp: new Date(),
        period: options.period,
        tags: options.tags,
        environment: options.environment
      };

      const docRef = await this.metricsCollection.add(metric);
      
      const createdMetric = {
        ...metric,
        id: docRef.id
      };

      // Vérifier les règles d'alerte
      await this.checkAlertRules(tenantId, createdMetric);

      return createdMetric;
    } catch (error) {
      throw new Error(`Failed to record performance metric: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les métriques de performance
   */
  async getPerformanceMetrics(
    tenantId: string,
    options: {
      metricType?: string;
      resourceType?: string;
      resourceId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<PerformanceMetric[]> {
    try {
      let query = this.metricsCollection
        .where('tenantId', '==', tenantId);

      if (options.metricType) {
        query = query.where('metricType', '==', options.metricType);
      }

      if (options.resourceType) {
        query = query.where('resourceType', '==', options.resourceType);
      }

      if (options.resourceId) {
        query = query.where('resourceId', '==', options.resourceId);
      }

      if (options.startDate) {
        query = query.where('timestamp', '>=', options.startDate);
      }

      if (options.endDate) {
        query = query.where('timestamp', '<=', options.endDate);
      }

      const result = await query
        .orderBy('timestamp', 'desc')
        .limit(options.limit || 100)
        .get();

      return result.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PerformanceMetric));
    } catch (error) {
      throw new Error(`Failed to get performance metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Gestion des alertes ====================

  /**
   * Créer une règle d'alerte
   */
  async createAlertRule(
    tenantId: string,
    rule: Omit<AlertRule, 'id' | 'tenantId' | 'triggerCount' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<AlertRule> {
    try {
      const alertRule: AlertRule = {
        ...rule,
        tenantId,
        triggerCount: 0,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await this.alertRulesCollection.add(alertRule);
      
      return {
        ...alertRule,
        id: docRef.id
      };
    } catch (error) {
      throw new Error(`Failed to create alert rule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Vérifier les règles d'alerte pour une métrique
   */
  private async checkAlertRules(tenantId: string, metric: PerformanceMetric): Promise<void> {
    try {
      // Obtenir toutes les règles actives
      const rulesQuery = await this.alertRulesCollection
        .where('tenantId', '==', tenantId)
        .where('enabled', '==', true)
        .get();

      const rules = rulesQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AlertRule));

      // Vérifier chaque règle
      for (const rule of rules) {
        const shouldTrigger = await this.evaluateAlertRule(rule, metric);
        
        if (shouldTrigger) {
          await this.triggerAlert(rule, metric);
        }
      }
    } catch (error) {
      console.error('Failed to check alert rules:', error);
    }
  }

  /**
   * Évaluer si une règle d'alerte doit être déclenchée
   */
  private async evaluateAlertRule(rule: AlertRule, metric: PerformanceMetric): Promise<boolean> {
    try {
      // Vérifier chaque condition de la règle
      for (const condition of rule.conditions) {
        if (condition.metricType !== metric.metricType) {
          continue;
        }

        // Obtenir la valeur de la métrique selon l'agrégation
        const metricValue = await this.getAggregatedMetricValue(
          rule.tenantId,
          condition.metricType,
          condition.aggregation,
          condition.timeWindow,
          metric.resourceId
        );

        // Évaluer la condition
        const conditionMet = this.evaluateCondition(
          metricValue,
          condition.operator,
          condition.threshold
        );

        if (conditionMet) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Failed to evaluate alert rule:', error);
      return false;
    }
  }

  /**
   * Déclencher une alerte
   */
  private async triggerAlert(rule: AlertRule, metric: PerformanceMetric): Promise<void> {
    try {
      // Créer l'alerte
      const alert: ExportAlert = {
        tenantId: rule.tenantId,
        ruleId: rule.id!,
        ruleName: rule.name,
        severity: this.determineSeverity(rule, metric),
        message: this.generateAlertMessage(rule, metric),
        details: {
          metricType: metric.metricType,
          resourceType: metric.resourceType,
          resourceId: metric.resourceId,
          metrics: metric.metrics
        },
        resourceType: metric.resourceType,
        resourceId: metric.resourceId,
        metricValue: this.getMetricValue(metric),
        threshold: rule.conditions[0].threshold, // Simplification
        status: 'active',
        triggeredAt: new Date(),
        createdAt: new Date()
      };

      const docRef = await this.alertsCollection.add(alert);
      
      // Mettre à jour le compteur de déclenchements de la règle
      await this.alertRulesCollection.doc(rule.id!).update({
        lastTriggered: new Date(),
        triggerCount: (rule.triggerCount || 0) + 1,
        updatedAt: new Date()
      });

      // Exécuter les actions de la règle
      await this.executeAlertActions(rule, { ...alert, id: docRef.id });

    } catch (error) {
      console.error('Failed to trigger alert:', error);
    }
  }

  // ==================== Méthodes utilitaires ====================

  private async getAggregatedMetricValue(
    tenantId: string,
    metricType: string,
    aggregation: string,
    timeWindowMinutes: number,
    resourceId?: string
  ): Promise<number> {
    try {
      const startTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
      
      let query = this.metricsCollection
        .where('tenantId', '==', tenantId)
        .where('metricType', '==', metricType)
        .where('timestamp', '>=', startTime);

      if (resourceId) {
        query = query.where('resourceId', '==', resourceId);
      }

      const result = await query.get();
      const metrics = result.docs.map(doc => doc.data() as PerformanceMetric);

      if (metrics.length === 0) {
        return 0;
      }

      // Extraire les valeurs de durée (exemple principal)
      const values = metrics.map(m => m.metrics.duration);

      switch (aggregation) {
        case 'avg':
          return values.reduce((sum, val) => sum + val, 0) / values.length;
        case 'max':
          return Math.max(...values);
        case 'min':
          return Math.min(...values);
        case 'sum':
          return values.reduce((sum, val) => sum + val, 0);
        case 'count':
          return values.length;
        default:
          return 0;
      }
    } catch (error) {
      console.error('Failed to get aggregated metric value:', error);
      return 0;
    }
  }

  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      default:
        return false;
    }
  }

  private determineSeverity(rule: AlertRule, metric: PerformanceMetric): ExportAlert['severity'] {
    // Logique simple pour déterminer la sévérité
    const metricValue = this.getMetricValue(metric);
    const threshold = rule.conditions[0].threshold;
    
    const ratio = metricValue / threshold;
    
    if (ratio > 3) return 'critical';
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  private generateAlertMessage(rule: AlertRule, metric: PerformanceMetric): string {
    const metricValue = this.getMetricValue(metric);
    const condition = rule.conditions[0];
    
    return `${rule.name}: ${metric.metricType} value ${metricValue} ${condition.operator} ${condition.threshold}`;
  }

  private getMetricValue(metric: PerformanceMetric): number {
    // Retourner la durée par défaut, peut être étendu pour d'autres métriques
    return metric.metrics.duration;
  }

  private async executeAlertActions(rule: AlertRule, alert: ExportAlert): Promise<void> {
    try {
      for (const action of rule.actions) {
        switch (action.type) {
          case 'email':
            await this.sendEmailAlert(action.target, alert);
            break;
          case 'webhook':
            await this.sendWebhookAlert(action.target, alert);
            break;
          case 'slack':
            await this.sendSlackAlert(action.target, alert);
            break;
          case 'sms':
            await this.sendSmsAlert(action.target, alert);
            break;
        }
      }
    } catch (error) {
      console.error('Failed to execute alert actions:', error);
    }
  }

  private async sendEmailAlert(email: string, alert: ExportAlert): Promise<void> {
    // TODO: Intégrer avec le service d'email
    console.log(`Sending email alert to ${email}:`, alert.message);
  }

  private async sendWebhookAlert(webhookUrl: string, alert: ExportAlert): Promise<void> {
    // TODO: Envoyer webhook
    console.log(`Sending webhook alert to ${webhookUrl}:`, alert.message);
  }

  private async sendSlackAlert(slackChannel: string, alert: ExportAlert): Promise<void> {
    // TODO: Intégrer avec Slack
    console.log(`Sending Slack alert to ${slackChannel}:`, alert.message);
  }

  private async sendSmsAlert(phoneNumber: string, alert: ExportAlert): Promise<void> {
    // TODO: Intégrer avec service SMS
    console.log(`Sending SMS alert to ${phoneNumber}:`, alert.message);
  }

  // ==================== Méthodes publiques ====================

  /**
   * Obtenir les logs d'audit
   */
  async getAuditLogs(
    tenantId: string,
    options: {
      eventType?: string;
      userId?: string;
      resourceId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<ExportAuditLog[]> {
    try {
      let query = this.auditLogsCollection
        .where('tenantId', '==', tenantId);

      if (options.eventType) {
        query = query.where('eventType', '==', options.eventType);
      }

      if (options.userId) {
        query = query.where('userId', '==', options.userId);
      }

      if (options.startDate) {
        query = query.where('timestamp', '>=', options.startDate);
      }

      if (options.endDate) {
        query = query.where('timestamp', '<=', options.endDate);
      }

      const result = await query
        .orderBy('timestamp', 'desc')
        .limit(options.limit || 100)
        .get();

      return result.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ExportAuditLog));
    } catch (error) {
      throw new Error(`Failed to get audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les alertes actives
   */
  async getActiveAlerts(tenantId: string): Promise<ExportAlert[]> {
    try {
      const query = await this.alertsCollection
        .where('tenantId', '==', tenantId)
        .where('status', '==', 'active')
        .orderBy('triggeredAt', 'desc')
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ExportAlert));
    } catch (error) {
      throw new Error(`Failed to get active alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Acquitter une alerte
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<void> {
    try {
      await this.alertsCollection.doc(alertId).update({
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgedAt: new Date()
      });
    } catch (error) {
      throw new Error(`Failed to acknowledge alert: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Résoudre une alerte
   */
  async resolveAlert(tenantId: string, alertId: string): Promise<void> {
    try {
      // Vérifier que l'alerte appartient au tenant pour la sécurité
      const alertDoc = await this.alertsCollection.doc(alertId).get();
      
      if (!alertDoc.exists) {
        throw new ValidationError('Alert not found');
      }

      const alertData = alertDoc.data();
      if (alertData?.tenantId !== tenantId) {
        throw new ValidationError('Alert not found or access denied');
      }

      await this.alertsCollection.doc(alertId).update({
        status: 'resolved',
        resolvedAt: new Date()
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to resolve alert: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les statistiques d'audit
   */
  async getAuditStatistics(
    tenantId: string,
    period?: { start: Date; end: Date }
  ): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    successRate: number;
    averageResponseTime: number;
    topUsers: Array<{ userId: string; eventCount: number }>;
    errorRate: number;
  }> {
    try {
      let query = this.auditLogsCollection
        .where('tenantId', '==', tenantId);

      if (period) {
        query = query.where('timestamp', '>=', period.start)
                    .where('timestamp', '<=', period.end);
      }

      const result = await query.get();
      const logs = result.docs.map(doc => doc.data() as ExportAuditLog);

      const stats = {
        totalEvents: logs.length,
        eventsByType: {} as Record<string, number>,
        successRate: 0,
        averageResponseTime: 0,
        topUsers: [] as Array<{ userId: string; eventCount: number }>,
        errorRate: 0
      };

      if (logs.length === 0) {
        return stats;
      }

      // Compter par type d'événement
      const userCounts: Record<string, number> = {};
      let successCount = 0;
      let totalResponseTime = 0;
      let responseTimeCount = 0;

      logs.forEach(log => {
        // Compter par type
        stats.eventsByType[log.eventType] = (stats.eventsByType[log.eventType] || 0) + 1;

        // Compter par utilisateur
        userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;

        // Compter les succès
        if (log.success) {
          successCount++;
        }

        // Temps de réponse
        if (log.details.responseTime) {
          totalResponseTime += log.details.responseTime;
          responseTimeCount++;
        }
      });

      // Calculer les statistiques
      stats.successRate = Math.round((successCount / logs.length) * 100);
      stats.errorRate = 100 - stats.successRate;

      if (responseTimeCount > 0) {
        stats.averageResponseTime = Math.round(totalResponseTime / responseTimeCount);
      }

      // Top utilisateurs
      stats.topUsers = Object.entries(userCounts)
        .map(([userId, count]) => ({ userId, eventCount: count }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      return stats;
    } catch (error) {
      throw new Error(`Failed to get audit statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Nettoyer les anciens logs d'audit
   */
  async cleanupOldAuditLogs(tenantId: string, retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      const query = await this.auditLogsCollection
        .where('tenantId', '==', tenantId)
        .where('timestamp', '<', cutoffDate)
        .get();

      if (query.empty) {
        return 0;
      }

      // Supprimer par batch pour éviter les timeouts
      const batchSize = 500;
      let deletedCount = 0;

      for (let i = 0; i < query.docs.length; i += batchSize) {
        const batch = collections.projects.firestore.batch();
        const batchDocs = query.docs.slice(i, i + batchSize);

        batchDocs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        deletedCount += batchDocs.length;
      }

      return deletedCount;
    } catch (error) {
      throw new Error(`Failed to cleanup old audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}