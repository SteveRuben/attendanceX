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

    if (creationLogsQuery.size === 0) {return 0;}

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

    if (totalQuery.size === 0) {return 0;}

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
    if (metrics.length === 0) {return {};}

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
    if (values.length < 2) {return 'stable';}

    const first = values[values.length - 1];
    const last = values[0];
    const change = ((last - first) / first) * 100;

    if (change > 5) {return 'increasing';}
    if (change < -5) {return 'decreasing';}
    return 'stable';
  }

  /**
   * Obtenir les règles d'alerte d'une organisation
   */
  async getAlertRules(organizationId: string): Promise<AlertRule[]> {
    try {
      const alertRulesQuery = await collections.alert_rules
        .where('organizationId', '==', organizationId)
        .where('enabled', '==', true)
        .orderBy('createdAt', 'desc')
        .get();

      return alertRulesQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AlertRule));

    } catch (error) {
      logger.error('Error getting alert rules', { error, organizationId });
      throw error;
    }
  }

  /**
   * Obtenir les alertes actives d'une organisation
   */
  async getActiveAlerts(organizationId: string): Promise<any[]> {
    try {
      const activeAlertsQuery = await collections.active_alerts
        .where('organizationId', '==', organizationId)
        .where('resolved', '==', false)
        .orderBy('triggeredAt', 'desc')
        .get();

      return activeAlertsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      logger.error('Error getting active alerts', { error, organizationId });
      throw error;
    }
  }

  /**
   * Obtenir les métriques globales (toutes organisations)
   */
  async getGlobalMetrics(days: number = 30): Promise<any> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      const [
        totalOrganizations,
        activeOrganizations,
        totalUsers,
        activeUsers,
        totalInvitations,
        acceptedInvitations,
        totalErrors
      ] = await Promise.all([
        this.getTotalOrganizations(),
        this.getActiveOrganizations(since),
        this.getTotalUsers(),
        this.getActiveUsers(since),
        this.getTotalInvitations(since),
        this.getAcceptedInvitations(since),
        this.getTotalErrors(since)
      ]);

      return {
        organizations: {
          total: totalOrganizations,
          active: activeOrganizations,
          growthRate: await this.calculateOrganizationGrowthRate(days)
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          growthRate: await this.calculateUserGrowthRate(days)
        },
        invitations: {
          total: totalInvitations,
          accepted: acceptedInvitations,
          acceptanceRate: totalInvitations > 0 ? (acceptedInvitations / totalInvitations) * 100 : 0
        },
        errors: {
          total: totalErrors,
          errorRate: await this.calculateGlobalErrorRate(since)
        },
        performance: await this.getGlobalPerformanceMetrics(since)
      };

    } catch (error) {
      logger.error('Error getting global metrics', { error });
      throw error;
    }
  }

  /**
   * Obtenir les statistiques d'utilisation des fonctionnalités
   */
  async getFeatureUsageStats(organizationId: string, days: number = 30): Promise<any> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      const featureLogsQuery = await collections.feature_usage_logs
        .where('organizationId', '==', organizationId)
        .where('timestamp', '>=', since)
        .get();

      const featureUsage: Record<string, number> = {};
      const userFeatureUsage: Record<string, Set<string>> = {};

      featureLogsQuery.docs.forEach(doc => {
        const data = doc.data();
        const feature = data.feature;
        const userId = data.userId;

        featureUsage[feature] = (featureUsage[feature] || 0) + 1;
        
        if (!userFeatureUsage[feature]) {
          userFeatureUsage[feature] = new Set();
        }
        userFeatureUsage[feature].add(userId);
      });

      const topFeatures = Object.entries(featureUsage)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([feature, usage]) => ({
          feature,
          usage,
          uniqueUsers: userFeatureUsage[feature]?.size || 0
        }));

      return {
        totalFeatureUsage: Object.values(featureUsage).reduce((sum, count) => sum + count, 0),
        uniqueFeatures: Object.keys(featureUsage).length,
        topFeatures,
        featureAdoption: await this.calculateFeatureAdoption(organizationId, since)
      };

    } catch (error) {
      logger.error('Error getting feature usage stats', { error, organizationId });
      throw error;
    }
  }

  /**
   * Obtenir les métriques de performance
   */
  async getPerformanceMetrics(organizationId: string, days: number = 7): Promise<any> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      const performanceLogsQuery = await collections.performance_logs
        .where('organizationId', '==', organizationId)
        .where('timestamp', '>=', since)
        .get();

      const responseTimesByEndpoint: Record<string, number[]> = {};
      const errorsByEndpoint: Record<string, number> = {};
      let totalRequests = 0;
      let totalErrors = 0;

      performanceLogsQuery.docs.forEach(doc => {
        const data = doc.data();
        const endpoint = data.endpoint;
        const responseTime = data.responseTime;
        const isError = data.statusCode >= 400;

        totalRequests++;
        if (isError) {
          totalErrors++;
          errorsByEndpoint[endpoint] = (errorsByEndpoint[endpoint] || 0) + 1;
        }

        if (!responseTimesByEndpoint[endpoint]) {
          responseTimesByEndpoint[endpoint] = [];
        }
        responseTimesByEndpoint[endpoint].push(responseTime);
      });

      const endpointMetrics = Object.entries(responseTimesByEndpoint).map(([endpoint, times]) => {
        const avgResponseTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const p95ResponseTime = this.calculatePercentile(times, 95);
        const errorCount = errorsByEndpoint[endpoint] || 0;
        const errorRate = (errorCount / times.length) * 100;

        return {
          endpoint,
          avgResponseTime: Math.round(avgResponseTime),
          p95ResponseTime: Math.round(p95ResponseTime),
          requestCount: times.length,
          errorCount,
          errorRate: Math.round(errorRate * 100) / 100
        };
      });

      return {
        overview: {
          totalRequests,
          totalErrors,
          globalErrorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
          avgResponseTime: this.calculateAverageResponseTime(responseTimesByEndpoint)
        },
        endpoints: endpointMetrics.sort((a, b) => b.requestCount - a.requestCount),
        trends: await this.getPerformanceTrends(organizationId, since)
      };

    } catch (error) {
      logger.error('Error getting performance metrics', { error, organizationId });
      throw error;
    }
  }

  // Méthodes utilitaires privées pour les métriques globales
  private async getTotalOrganizations(): Promise<number> {
    const query = await collections.organizations.get();
    return query.size;
  }

  private async getActiveOrganizations(since: Date): Promise<number> {
    const query = await collections.organizations
      .where('lastActivityAt', '>=', since)
      .get();
    return query.size;
  }

  private async getTotalUsers(): Promise<number> {
    const query = await collections.users.get();
    return query.size;
  }

  private async getActiveUsers(since: Date): Promise<number> {
    const query = await collections.users
      .where('lastLoginAt', '>=', since)
      .get();
    return query.size;
  }

  private async getTotalInvitations(since: Date): Promise<number> {
    const query = await collections.organization_invitations
      .where('createdAt', '>=', since)
      .get();
    return query.size;
  }

  private async getAcceptedInvitations(since: Date): Promise<number> {
    const query = await collections.organization_invitations
      .where('createdAt', '>=', since)
      .where('status', '==', 'accepted')
      .get();
    return query.size;
  }

  private async getTotalErrors(since: Date): Promise<number> {
    const query = await collections.error_logs
      .where('timestamp', '>=', since)
      .get();
    return query.size;
  }

  private async calculateOrganizationGrowthRate(days: number): Promise<number> {
    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

    const [currentPeriod, previousPeriod] = await Promise.all([
      collections.organizations.where('createdAt', '>=', periodStart).get(),
      collections.organizations
        .where('createdAt', '>=', previousPeriodStart)
        .where('createdAt', '<', periodStart)
        .get()
    ]);

    const currentCount = currentPeriod.size;
    const previousCount = previousPeriod.size;

    return previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0;
  }

  private async calculateUserGrowthRate(days: number): Promise<number> {
    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

    const [currentPeriod, previousPeriod] = await Promise.all([
      collections.users.where('createdAt', '>=', periodStart).get(),
      collections.users
        .where('createdAt', '>=', previousPeriodStart)
        .where('createdAt', '<', periodStart)
        .get()
    ]);

    const currentCount = currentPeriod.size;
    const previousCount = previousPeriod.size;

    return previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0;
  }

  private async calculateGlobalErrorRate(since: Date): Promise<number> {
    const [totalRequests, totalErrors] = await Promise.all([
      collections.request_logs.where('timestamp', '>=', since).get(),
      collections.error_logs.where('timestamp', '>=', since).get()
    ]);

    return totalRequests.size > 0 ? (totalErrors.size / totalRequests.size) * 100 : 0;
  }

  private async getGlobalPerformanceMetrics(since: Date): Promise<any> {
    const performanceQuery = await collections.performance_logs
      .where('timestamp', '>=', since)
      .get();

    const responseTimes: number[] = [];
    performanceQuery.docs.forEach(doc => {
      const data = doc.data();
      responseTimes.push(data.responseTime);
    });

    if (responseTimes.length === 0) {
      return { avgResponseTime: 0, p95ResponseTime: 0, p99ResponseTime: 0 };
    }

    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p95ResponseTime = this.calculatePercentile(responseTimes, 95);
    const p99ResponseTime = this.calculatePercentile(responseTimes, 99);

    return {
      avgResponseTime: Math.round(avgResponseTime),
      p95ResponseTime: Math.round(p95ResponseTime),
      p99ResponseTime: Math.round(p99ResponseTime)
    };
  }

  private async calculateFeatureAdoption(organizationId: string, since: Date): Promise<any> {
    const [totalUsers, featureUsers] = await Promise.all([
      collections.users.where('organizationId', '==', organizationId).get(),
      collections.feature_usage_logs
        .where('organizationId', '==', organizationId)
        .where('timestamp', '>=', since)
        .get()
    ]);

    const uniqueFeatureUsers = new Set();
    featureUsers.docs.forEach(doc => {
      uniqueFeatureUsers.add(doc.data().userId);
    });

    const adoptionRate = totalUsers.size > 0 ? (uniqueFeatureUsers.size / totalUsers.size) * 100 : 0;

    return {
      totalUsers: totalUsers.size,
      activeUsers: uniqueFeatureUsers.size,
      adoptionRate: Math.round(adoptionRate * 100) / 100
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  private calculateAverageResponseTime(responseTimesByEndpoint: Record<string, number[]>): number {
    const allTimes = Object.values(responseTimesByEndpoint).flat();
    return allTimes.length > 0 ? allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length : 0;
  }

  private async getPerformanceTrends(organizationId: string, since: Date): Promise<any> {
    // Diviser la période en segments pour calculer les tendances
    const now = new Date();
    const segmentDuration = (now.getTime() - since.getTime()) / 7; // 7 segments
    const trends = [];

    for (let i = 0; i < 7; i++) {
      const segmentStart = new Date(since.getTime() + i * segmentDuration);
      const segmentEnd = new Date(since.getTime() + (i + 1) * segmentDuration);

      const segmentQuery = await collections.performance_logs
        .where('organizationId', '==', organizationId)
        .where('timestamp', '>=', segmentStart)
        .where('timestamp', '<', segmentEnd)
        .get();

      const responseTimes = segmentQuery.docs.map(doc => doc.data().responseTime);
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;

      trends.push({
        period: segmentStart.toISOString(),
        avgResponseTime: Math.round(avgResponseTime),
        requestCount: segmentQuery.size
      });
    }

    return trends;
  }
}

export const organizationMonitoringService = OrganizationMonitoringService.getInstance();