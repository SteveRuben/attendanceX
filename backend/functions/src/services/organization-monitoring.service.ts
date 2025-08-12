import { collections } from '../config';
import { logger } from 'firebase-functions';

export interface OrganizationMetrics {
  organizationId: string;
  timestamp: Date;
  metrics: {
    // Métriques de création d'organisation
    organizationCreation: {
      totalCreated: number;
      successRate: number;
      averageCompletionTime: number;
      failureReasons: Record<string, number>;
    };
    
    // Métriques d'invitations
    invitations: {
      totalSent: number;
      totalAccepted: number;
      totalDeclined: number;
      acceptanceRate: number;
      averageResponseTime: number;
      topInvitationSources: Record<string, number>;
    };
    
    // Métriques d'activité
    activity: {
      activeUsers: number;
      totalLogins: number;
      averageSessionDuration: number;
      featureUsage: Record<string, number>;
    };
    
    // Métriques d'erreurs
    errors: {
      totalErrors: number;
      errorsByType: Record<string, number>;
      criticalErrors: number;
    };
  };
}

export interface AlertRule {
  id: string;
  name: string;
  organizationId?: string; // null pour les alertes globales
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  timeWindow: number; // en minutes
  enabled: boolean;
  notificationChannels: string[];
  createdBy: string;
  createdAt: Date;
}

export class OrganizationMonitoringService {
  private static instance: OrganizationMonitoringService;

  public static getInstance(): OrganizationMonitoringService {
    if (!OrganizationMonitoringService.instance) {
      OrganizationMonitoringService.instance = new OrganizationMonitoringService();
    }
    return OrganizationMonitoringService.instance;
  }

  async collectOrganizationMetrics(organizationId: string): Promise<OrganizationMetrics> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      // Métriques de création d'organisation
      const organizationCreationMetrics = await this.getOrganizationCreationMetrics(organizationId, last7Days);
      
      // Métriques d'invitations
      const invitationMetrics = await this.getInvitationMetrics(organizationId, last7Days);
      
      // Métriques d'activité
      const activityMetrics = await this.getActivityMetrics(organizationId, last24Hours);
      
      // Métriques d'erreurs
      const errorMetrics = await this.getErrorMetrics(organizationId, last24Hours);

      const metrics: OrganizationMetrics = {
        organizationId,
        timestamp: now,
        metrics: {
          organizationCreation: organizationCreationMetrics,
          invitations: invitationMetrics,
          activity: activityMetrics,
          errors: errorMetrics
        }
      };

      // Sauvegarder les métriques
      await collections.organization_metrics.add(metrics);

      return metrics;

    } catch (error) {
      logger.error('Error collecting organization metrics', { error, organizationId });
      throw error;
    }
  }

  private async getOrganizationCreationMetrics(organizationId: string, since: Date) {
    try {
      const creationLogsQuery = await collections.audit_logs
        .where('organizationId', '==', organizationId)
        .where('action', '==', 'organization_created')
        .where('timestamp', '>=', since)
        .get();

      const successfulCreations = creationLogsQuery.docs.filter(
        doc => !doc.data().details?.error
      );

      const failedCreations = creationLogsQuery.docs.filter(
        doc => doc.data().details?.error
      );

      const failureReasons: Record<string, number> = {};
      failedCreations.forEach(doc => {
        const reason = doc.data().details?.error || 'unknown';
        failureReasons[reason] = (failureReasons[reason] || 0) + 1;
      });

      // Calculer le temps moyen de completion
      const completionTimes = successfulCreations
        .map(doc => doc.data().details?.completionTime)
        .filter(time => time !== undefined);

      const averageCompletionTime = completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
        : 0;

      return {
        totalCreated: creationLogsQuery.size,
        successRate: creationLogsQuery.size > 0 
          ? (successfulCreations.length / creationLogsQuery.size) * 100 
          : 0,
        averageCompletionTime,
        failureReasons
      };

    } catch (error) {
      logger.error('Error getting organization creation metrics', { error, organizationId });
      return {
        totalCreated: 0,
        successRate: 0,
        averageCompletionTime: 0,
        failureReasons: {}
      };
    }
  }

  private async getInvitationMetrics(organizationId: string, since: Date) {
    try {
      const [sentQuery, acceptedQuery, declinedQuery] = await Promise.all([
        collections.audit_logs
          .where('organizationId', '==', organizationId)
          .where('action', '==', 'invitation_sent')
          .where('timestamp', '>=', since)
          .get(),
        collections.audit_logs
          .where('organizationId', '==', organizationId)
          .where('action', '==', 'invitation_accepted')
          .where('timestamp', '>=', since)
          .get(),
        collections.audit_logs
          .where('organizationId', '==', organizationId)
          .where('action', '==', 'invitation_declined')
          .where('timestamp', '>=', since)
          .get()
      ]);

      const totalSent = sentQuery.size;
      const totalAccepted = acceptedQuery.size;
      const totalDeclined = declinedQuery.size;
      const totalResponded = totalAccepted + totalDeclined;

      const acceptanceRate = totalResponded > 0 
        ? (totalAccepted / totalResponded) * 100 
        : 0;

      // Calculer le temps moyen de réponse
      const responseTimes = acceptedQuery.docs
        .map(doc => {
          const acceptedAt = doc.data().timestamp.toDate();
          const sentAt = doc.data().details?.sentAt?.toDate();
          return sentAt ? acceptedAt.getTime() - sentAt.getTime() : null;
        })
        .filter(time => time !== null);

      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time!, 0) / responseTimes.length
        : 0;

      // Top sources d'invitations
      const topInvitationSources: Record<string, number> = {};
      sentQuery.docs.forEach(doc => {
        const source = doc.data().details?.source || 'direct';
        topInvitationSources[source] = (topInvitationSources[source] || 0) + 1;
      });

      return {
        totalSent,
        totalAccepted,
        totalDeclined,
        acceptanceRate,
        averageResponseTime,
        topInvitationSources
      };

    } catch (error) {
      logger.error('Error getting invitation metrics', { error, organizationId });
      return {
        totalSent: 0,
        totalAccepted: 0,
        totalDeclined: 0,
        acceptanceRate: 0,
        averageResponseTime: 0,
        topInvitationSources: {}
      };
    }
  }

  private async getActivityMetrics(organizationId: string, since: Date) {
    try {
      const [usersQuery, loginLogsQuery, sessionLogsQuery, featureLogsQuery] = await Promise.all([
        collections.users
          .where('organizationId', '==', organizationId)
          .where('lastLoginAt', '>=', since)
          .get(),
        collections.audit_logs
          .where('organizationId', '==', organizationId)
          .where('action', '==', 'user_login')
          .where('timestamp', '>=', since)
          .get(),
        collections.audit_logs
          .where('organizationId', '==', organizationId)
          .where('action', '==', 'session_ended')
          .where('timestamp', '>=', since)
          .get(),
        collections.audit_logs
          .where('organizationId', '==', organizationId)
          .where('action', 'in', ['feature_used', 'page_viewed'])
          .where('timestamp', '>=', since)
          .get()
      ]);

      const activeUsers = usersQuery.size;
      const totalLogins = loginLogsQuery.size;

      // Calculer la durée moyenne des sessions
      const sessionDurations = sessionLogsQuery.docs
        .map(doc => doc.data().details?.duration)
        .filter(duration => duration !== undefined);

      const averageSessionDuration = sessionDurations.length > 0
        ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
        : 0;

      // Usage des fonctionnalités
      const featureUsage: Record<string, number> = {};
      featureLogsQuery.docs.forEach(doc => {
        const feature = doc.data().details?.feature || 'unknown';
        featureUsage[feature] = (featureUsage[feature] || 0) + 1;
      });

      return {
        activeUsers,
        totalLogins,
        averageSessionDuration,
        featureUsage
      };

    } catch (error) {
      logger.error('Error getting activity metrics', { error, organizationId });
      return {
        activeUsers: 0,
        totalLogins: 0,
        averageSessionDuration: 0,
        featureUsage: {}
      };
    }
  }

  private async getErrorMetrics(organizationId: string, since: Date) {
    try {
      const errorLogsQuery = await collections.error_logs
        .where('organizationId', '==', organizationId)
        .where('timestamp', '>=', since)
        .get();

      const totalErrors = errorLogsQuery.size;
      const errorsByType: Record<string, number> = {};
      let criticalErrors = 0;

      errorLogsQuery.docs.forEach(doc => {
        const errorData = doc.data();
        const errorType = errorData.type || 'unknown';
        const severity = errorData.severity || 'low';

        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;

        if (severity === 'critical' || severity === 'high') {
          criticalErrors++;
        }
      });

      return {
        totalErrors,
        errorsByType,
        criticalErrors
      };

    } catch (error) {
      logger.error('Error getting error metrics', { error, organizationId });
      return {
        totalErrors: 0,
        errorsByType: {},
        criticalErrors: 0
      };
    }
  }

  async createAlertRule(alertRule: Omit<AlertRule, 'id' | 'createdAt'>): Promise<AlertRule> {
    try {
      const newAlertRule: AlertRule = {
        ...alertRule,
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date()
      };

      await collections.alert_rules.doc(newAlertRule.id).set(newAlertRule);

      logger.info('Alert rule created', { alertRuleId: newAlertRule.id, organizationId: alertRule.organizationId });

      return newAlertRule;

    } catch (error) {
      logger.error('Error creating alert rule', { error, alertRule });
      throw error;
    }
  }

  async checkAlertRules(): Promise<void> {
    try {
      const alertRulesQuery = await collections.alert_rules
        .where('enabled', '==', true)
        .get();

      for (const alertRuleDoc of alertRulesQuery.docs) {
        const alertRule = alertRuleDoc.data() as AlertRule;
        
        try {
          await this.evaluateAlertRule(alertRule);
        } catch (error) {
          logger.error('Error evaluating alert rule', { error, alertRuleId: alertRule.id });
        }
      }

    } catch (error) {
      logger.error('Error checking alert rules', { error });
    }
  }

  private async evaluateAlertRule(alertRule: AlertRule): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - alertRule.timeWindow * 60 * 1000);

    try {
      // Récupérer les métriques pour la période
      let currentValue: number;

      switch (alertRule.metric) {
        case 'organization_creation_failure_rate':
          currentValue = await this.getOrganizationCreationFailureRate(alertRule.organizationId, windowStart);
          break;
        case 'invitation_acceptance_rate':
          currentValue = await this.getInvitationAcceptanceRate(alertRule.organizationId, windowStart);
          break;
        case 'error_rate':
          currentValue = await this.getErrorRate(alertRule.organizationId, windowStart);
          break;
        case 'active_users':
          currentValue = await this.getActiveUsersCount(alertRule.organizationId, windowStart);
          break;
        default:
          logger.warn('Unknown metric in alert rule', { metric: alertRule.metric, alertRuleId: alertRule.id });
          return;
      }

      // Évaluer la condition
      let shouldAlert = false;
      switch (alertRule.condition) {
        case 'greater_than':
          shouldAlert = currentValue > alertRule.threshold;
          break;
        case 'less_than':
          shouldAlert = currentValue < alertRule.threshold;
          break;
        case 'equals':
          shouldAlert = currentValue === alertRule.threshold;
          break;
        case 'not_equals':
          shouldAlert = currentValue !== alertRule.threshold;
          break;
      }

      if (shouldAlert) {
        await this.triggerAlert(alertRule, currentValue);
      }

    } catch (error) {
      logger.error('Error evaluating alert rule', { error, alertRuleId: alertRule.id });
    }
  }

  private async getOrganizationCreationFailureRate(organizationId: string | undefined, since: Date): Promise<number> {
    const query = organizationId
      ? collections.audit_logs.where('organizationId', '==', organizationId)
      : collections.audit_logs;

    const creationLogsQuery = await query
      .where('action', '==', 'organization_created')
      .where('timestamp', '>=', since)
      .get();

    if (creationLogsQuery.size === 0) return 0;

    const failedCreations = creationLogsQuery.docs.filter(
      doc => doc.data().details?.error
    ).length;

    return (failedCreations / creationLogsQuery.size) * 100;
  }

  private async getInvitationAcceptanceRate(organizationId: string | undefined, since: Date): Promise<number> {
    const query = organizationId
      ? collections.audit_logs.where('organizationId', '==', organizationId)
      : collections.audit_logs;

    const [acceptedQuery, totalQuery] = await Promise.all([
      query.where('action', '==', 'invitation_accepted').where('timestamp', '>=', since).get(),
      query.where('action', 'in', ['invitation_accepted', 'invitation_declined']).where('timestamp', '>=', since).get()
    ]);

    if (totalQuery.size === 0) return 0;

    return (acceptedQuery.size / totalQuery.size) * 100;
  }

  private async getErrorRate(organizationId: string | undefined, since: Date): Promise<number> {
    const query = organizationId
      ? collections.error_logs.where('organizationId', '==', organizationId)
      : collections.error_logs;

    const errorLogsQuery = await query
      .where('timestamp', '>=', since)
      .get();

    return errorLogsQuery.size;
  }

  private async getActiveUsersCount(organizationId: string | undefined, since: Date): Promise<number> {
    const query = organizationId
      ? collections.users.where('organizationId', '==', organizationId)
      : collections.users;

    const activeUsersQuery = await query
      .where('lastLoginAt', '>=', since)
      .get();

    return activeUsersQuery.size;
  }

  private async triggerAlert(alertRule: AlertRule, currentValue: number): Promise<void> {
    try {
      // Créer l'alerte
      const alert = {
        alertRuleId: alertRule.id,
        organizationId: alertRule.organizationId,
        metric: alertRule.metric,
        currentValue,
        threshold: alertRule.threshold,
        condition: alertRule.condition,
        triggeredAt: new Date(),
        status: 'active'
      };

      await collections.alerts.add(alert);

      // Envoyer les notifications
      for (const channel of alertRule.notificationChannels) {
        await this.sendAlertNotification(alert, channel);
      }

      logger.warn('Alert triggered', {
        alertRuleId: alertRule.id,
        organizationId: alertRule.organizationId,
        metric: alertRule.metric,
        currentValue,
        threshold: alertRule.threshold
      });

    } catch (error) {
      logger.error('Error triggering alert', { error, alertRuleId: alertRule.id });
    }
  }

  private async sendAlertNotification(alert: any, channel: string): Promise<void> {
    // Implémentation des notifications par canal (email, Slack, webhook, etc.)
    logger.info('Sending alert notification', { alert, channel });
    // TODO: Implémenter l'envoi de notifications
  }

  async getOrganizationAnalytics(organizationId: string, days: number = 30): Promise<any> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      const metricsQuery = await collections.organization_metrics
        .where('organizationId', '==', organizationId)
        .where('timestamp', '>=', since)
        .orderBy('timestamp', 'desc')
        .get();

      const metrics = metricsQuery.docs.map(doc => doc.data());

      return {
        organizationId,
        period: { days, since },
        metrics,
        summary: this.calculateMetricsSummary(metrics)
      };

    } catch (error) {
      logger.error('Error getting organization analytics', { error, organizationId });
      throw error;
    }
  }

  private calculateMetricsSummary(metrics: any[]): any {
    if (metrics.length === 0) return {};

    // Calculer les moyennes et tendances
    const latest = metrics[0];
    const oldest = metrics[metrics.length - 1];

    return {
      totalOrganizationsCreated: metrics.reduce((sum, m) => sum + m.metrics.organizationCreation.totalCreated, 0),
      averageSuccessRate: metrics.reduce((sum, m) => sum + m.metrics.organizationCreation.successRate, 0) / metrics.length,
      totalInvitationsSent: metrics.reduce((sum, m) => sum + m.metrics.invitations.totalSent, 0),
      averageAcceptanceRate: metrics.reduce((sum, m) => sum + m.metrics.invitations.acceptanceRate, 0) / metrics.length,
      trends: {
        organizationCreation: this.calculateTrend(metrics.map(m => m.metrics.organizationCreation.totalCreated)),
        invitationAcceptance: this.calculateTrend(metrics.map(m => m.metrics.invitations.acceptanceRate)),
        activeUsers: this.calculateTrend(metrics.map(m => m.metrics.activity.activeUsers))
      }
    };
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const first = values[values.length - 1];
    const last = values[0];
    const change = ((last - first) / first) * 100;

    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }
}

export const organizationMonitoringService = OrganizationMonitoringService.getInstance();