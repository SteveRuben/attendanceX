// functions/metrics.function.ts
// Consolidated metrics function with parameter-based routing

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { integrationAnalyticsService } from '../services/integrations/integration-analytics.service';
import { collections, db } from '../config';
import { EmailVerificationCleanupUtils } from '../utils/auth/email-verification-cleanup.utils';

/**
 * Interface for metrics configuration
 */
interface MetricsConfig {
  type: 'hourly' | 'daily' | 'weekly';
  metrics?: string[];
  retentionDays?: number;
  batchSize?: number;
  alertThresholds?: {
    emailVerificationSuccessRate?: number;
    avgResponseTime?: number;
    errorRate?: number;
  };
}

/**
 * Interface for metrics result
 */
interface MetricsResult {
  success: boolean;
  type: string;
  executionTimeMs: number;
  metricsCollected: string[];
  metricsFailed: string[];
  results: Record<string, any>;
  errors: string[];
  summary: {
    totalMetrics: number;
    totalAlerts: number;
    totalCleanedRecords: number;
  };
}

/**
 * Consolidated scheduled metrics function
 * Handles hourly, daily, and weekly metrics collection based on schedule
 */
export const scheduledMetricsCollection = onSchedule(
  {
    schedule: '0 * * * *', // Runs every hour
    timeZone: 'UTC',
    memory: '1GiB',
    timeoutSeconds: 540, // 9 minutes
    region: 'africa-south1'
  },
  async (event) => {
    try {
      const currentHour = new Date().getUTCHours();
      const currentDay = new Date().getUTCDay(); // 0 = Sunday
      
      let metricsType: 'hourly' | 'daily' | 'weekly';
      let config: MetricsConfig;

      // Determine metrics type based on schedule
      if (currentDay === 1 && currentHour === 8) {
        // Weekly metrics on Monday at 8AM
        metricsType = 'weekly';
        config = getWeeklyMetricsConfig();
      } else if (currentHour === 2) {
        // Daily metrics at 2AM
        metricsType = 'daily';
        config = getDailyMetricsConfig();
      } else {
        // Hourly metrics
        metricsType = 'hourly';
        config = getHourlyMetricsConfig();
      }

      logger.info(`Starting scheduled ${metricsType} metrics collection`, { config });

      const result = await executeMetricsCollection(config);

      if (result.success) {
        logger.info(`${metricsType} metrics collection completed successfully`, {
          executionTime: result.executionTimeMs,
          metricsCollected: result.metricsCollected,
          summary: result.summary
        });
      } else {
        logger.error(`${metricsType} metrics collection completed with errors`, {
          executionTime: result.executionTimeMs,
          metricsCollected: result.metricsCollected,
          metricsFailed: result.metricsFailed,
          errors: result.errors
        });
      }

    } catch (error) {
      logger.error('Scheduled metrics collection failed', { error });
      throw error;
    }
  }
);

/**
 * Manual metrics collection trigger function
 */
export const triggerMetricsCollection = onCall(
  {
    memory: '1GiB',
    timeoutSeconds: 540,
    region: 'africa-south1'
  },
  async (request) => {
    try {
      // Verify permissions (admin only)
      if (!request.auth || request.auth.token.role !== 'admin') {
        throw new Error('Unauthorized: Admin role required');
      }

      logger.info('Manual metrics collection triggered', {
        userId: request.auth.uid,
        config: request.data
      });

      const config: MetricsConfig = request.data || getHourlyMetricsConfig();
      const result = await executeMetricsCollection(config);

      logger.info('Manual metrics collection completed', {
        userId: request.auth.uid,
        result: {
          success: result.success,
          executionTime: result.executionTimeMs,
          metricsCollected: result.metricsCollected,
          summary: result.summary
        }
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      logger.error('Manual metrics collection failed', { 
        error,
        userId: request.auth?.uid 
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
);

/**
 * Execute metrics collection tasks based on configuration
 */
async function executeMetricsCollection(config: MetricsConfig): Promise<MetricsResult> {
  const startTime = Date.now();
  const result: MetricsResult = {
    success: true,
    type: config.type,
    executionTimeMs: 0,
    metricsCollected: [],
    metricsFailed: [],
    results: {},
    errors: [],
    summary: {
      totalMetrics: 0,
      totalAlerts: 0,
      totalCleanedRecords: 0
    }
  };

  const metrics = config.metrics || getDefaultMetrics(config.type);

  for (const metric of metrics) {
    try {
      logger.info(`Collecting metric: ${metric}`);
      
      let metricResult: any;
      
      switch (metric) {
        case 'integration_metrics':
          metricResult = await collectIntegrationMetrics();
          break;
        case 'email_verification_metrics':
          metricResult = await collectEmailVerificationMetrics();
          break;
        case 'performance_metrics':
          metricResult = await collectPerformanceMetrics();
          break;
        case 'user_adoption_metrics':
          metricResult = await collectUserAdoptionMetrics();
          break;
        case 'system_health_metrics':
          metricResult = await collectSystemHealthMetrics();
          break;
        case 'cleanup_old_metrics':
          metricResult = await cleanupOldMetrics(config.retentionDays || 90);
          break;
        case 'generate_reports':
          metricResult = await generateReports(config.type);
          break;
        case 'check_alerts':
          metricResult = await checkAlerts(config.alertThresholds || {});
          break;
        default:
          throw new Error(`Unknown metric type: ${metric}`);
      }

      result.metricsCollected.push(metric);
      result.results[metric] = metricResult;
      
      // Update summary
      if (metricResult.count) {
        result.summary.totalMetrics += metricResult.count;
      }
      if (metricResult.alerts) {
        result.summary.totalAlerts += metricResult.alerts;
      }
      if (metricResult.cleaned) {
        result.summary.totalCleanedRecords += metricResult.cleaned;
      }

      logger.info(`Metric collection completed: ${metric}`, { result: metricResult });

    } catch (error) {
      logger.error(`Metric collection failed: ${metric}`, { error });
      result.metricsFailed.push(metric);
      result.errors.push(`${metric}: ${error.message}`);
      result.success = false;
    }
  }

  result.executionTimeMs = Date.now() - startTime;
  return result;
}

/**
 * Get default metrics for collection type
 */
function getDefaultMetrics(type: 'hourly' | 'daily' | 'weekly'): string[] {
  switch (type) {
    case 'hourly':
      return [
        'integration_metrics',
        'organization_metrics',
        'email_verification_metrics',
        'performance_metrics',
        'system_health_metrics'
      ];
    case 'daily':
      return [
        'integration_metrics',
        'organization_metrics',
        'email_verification_metrics',
        'user_adoption_metrics',
        'cleanup_old_metrics',
        'check_alerts'
      ];
    case 'weekly':
      return [
        'integration_metrics',
        'organization_metrics',
        'user_adoption_metrics',
        'generate_reports',
        'check_alerts'
      ];
    default:
      return [];
  }
}

/**
 * Configuration generators
 */
function getHourlyMetricsConfig(): MetricsConfig {
  return {
    type: 'hourly',
    batchSize: 100,
    alertThresholds: {
      emailVerificationSuccessRate: 80,
      avgResponseTime: 2000,
      errorRate: 5
    }
  };
}

function getDailyMetricsConfig(): MetricsConfig {
  return {
    type: 'daily',
    retentionDays: 90,
    batchSize: 500,
    alertThresholds: {
      emailVerificationSuccessRate: 70,
      avgResponseTime: 3000,
      errorRate: 10
    }
  };
}

function getWeeklyMetricsConfig(): MetricsConfig {
  return {
    type: 'weekly',
    retentionDays: 90,
    batchSize: 1000,
    alertThresholds: {
      emailVerificationSuccessRate: 75,
      avgResponseTime: 2500,
      errorRate: 8
    }
  };
}

/**
 * Individual metrics collection implementations
 */
async function collectIntegrationMetrics(): Promise<{ count: number; metrics: any[] }> {
  const [integrationMetrics, userAdoptionMetrics, performanceMetrics] = await Promise.all([
    integrationAnalyticsService.collectIntegrationMetrics(),
    integrationAnalyticsService.collectUserAdoptionMetrics(),
    integrationAnalyticsService.collectPerformanceMetrics()
  ]);

  return {
    count: integrationMetrics.length + 1 + 1, // integration + adoption + performance
    metrics: [
      ...integrationMetrics,
      { type: 'user_adoption', data: userAdoptionMetrics },
      { type: 'performance', data: performanceMetrics }
    ]
  };
}



async function collectEmailVerificationMetrics(): Promise<{ count: number; metrics: any }> {
  const metrics = await EmailVerificationCleanupUtils.collectVerificationMetrics();

  // Store metrics in database
  await collections.email_verification_metrics.add({
    ...metrics,
    timestamp: new Date(),
    collectedAt: new Date()
  });

  return {
    count: 1,
    metrics
  };
}

async function collectPerformanceMetrics(): Promise<{ count: number; metrics: any }> {
  // Collect system performance metrics
  const performanceMetrics = {
    timestamp: new Date(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    // Add more performance metrics as needed
  };

  await collections.performance_metrics.add(performanceMetrics);

  return {
    count: 1,
    metrics: performanceMetrics
  };
}

async function collectUserAdoptionMetrics(): Promise<{ count: number; metrics: any }> {
  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsersWeek,
    activeUsersMonth,
    newUsersWeek
  ] = await Promise.all([
    collections.users.get().then(snap => snap.size),
    collections.users.where('lastLoginAt', '>=', lastWeek).get().then(snap => snap.size),
    collections.users.where('lastLoginAt', '>=', lastMonth).get().then(snap => snap.size),
    collections.users.where('createdAt', '>=', lastWeek).get().then(snap => snap.size)
  ]);

  const adoptionMetrics = {
    timestamp: now,
    totalUsers,
    activeUsersWeek,
    activeUsersMonth,
    newUsersWeek,
    weeklyRetentionRate: totalUsers > 0 ? (activeUsersWeek / totalUsers) * 100 : 0,
    monthlyRetentionRate: totalUsers > 0 ? (activeUsersMonth / totalUsers) * 100 : 0
  };

  await collections.user_adoption_metrics.add(adoptionMetrics);

  return {
    count: 1,
    metrics: adoptionMetrics
  };
}

async function collectSystemHealthMetrics(): Promise<{ count: number; metrics: any }> {
  const healthMetrics = {
    timestamp: new Date(),
    system: {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      version: process.version
    },
    database: {
      // Add database health checks
      connected: true // Placeholder
    },
    services: {
      // Add service health checks
      emailService: true, // Placeholder
      smsService: true // Placeholder
    }
  };

  await collections.system_health_metrics.add(healthMetrics);

  return {
    count: 1,
    metrics: healthMetrics
  };
}

async function cleanupOldMetrics(retentionDays: number): Promise<{ cleaned: number }> {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  let totalCleaned = 0;

  const metricsCollections = [
    'integration_metrics',
    'user_adoption_metrics',
    'performance_metrics',
    'performance_logs',
    'health_checks',
    'organization_metrics',
    'email_verification_metrics',
    'system_health_metrics'
  ];

  for (const collectionName of metricsCollections) {
    try {
      const oldDocs = await db
        .collection(collectionName)
        .where('timestamp', '<', cutoffDate)
        .limit(500)
        .get();

      if (!oldDocs.empty) {
        const batch = db.batch();
        oldDocs.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        totalCleaned += oldDocs.size;

        logger.info(`Cleaned ${oldDocs.size} old documents from ${collectionName}`);
      }
    } catch (error) {
      logger.error(`Failed to cleanup ${collectionName}`, { error });
    }
  }

  return { cleaned: totalCleaned };
}

async function generateReports(type: string): Promise<{ count: number; reports: any[] }> {
  const reports = [];

  if (type === 'weekly') {
    // Generate weekly report
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weeklyReport = {
      type: 'weekly',
      period: { start: startDate, end: endDate },
      generatedAt: new Date(),
      summary: await generateWeeklySummary(startDate, endDate)
    };

    await collections.weekly_reports.add(weeklyReport);
    reports.push(weeklyReport);
  }

  return {
    count: reports.length,
    reports
  };
}

async function generateWeeklySummary(startDate: Date, endDate: Date): Promise<any> {
  const [
    organizationsCreated,
    newUsers,
    totalErrors
  ] = await Promise.all([
    collections.audit_logs
      .where('action', '==', 'organization_created')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<', endDate)
      .get()
      .then(snap => snap.size),
    collections.audit_logs
      .where('action', '==', 'user_registered')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<', endDate)
      .get()
      .then(snap => snap.size),
    collections.error_logs
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<', endDate)
      .get()
      .then(snap => snap.size)
  ]);

  return {
    organizationsCreated,
    newUsers,
    totalErrors,
    period: '7 days'
  };
}

async function checkAlerts(thresholds: any): Promise<{ alerts: number; triggered: string[] }> {
  const triggeredAlerts: string[] = [];

  // Check email verification success rate
  if (thresholds.emailVerificationSuccessRate) {
    const weeklyStats = await EmailVerificationCleanupUtils.calculateVerificationSuccessRate(7);
    if (weeklyStats.successRate < thresholds.emailVerificationSuccessRate) {
      triggeredAlerts.push(`Low email verification success rate: ${weeklyStats.successRate}%`);
      
      await collections.alerts.add({
        type: 'email_verification_success_rate',
        severity: 'warning',
        message: `Email verification success rate (${weeklyStats.successRate}%) is below threshold (${thresholds.emailVerificationSuccessRate}%)`,
        triggeredAt: new Date(),
        status: 'active',
        data: weeklyStats
      });
    }
  }

  // Add more alert checks as needed

  return {
    alerts: triggeredAlerts.length,
    triggered: triggeredAlerts
  };
}

/**
 * Get metrics dashboard data
 */
export const getMetricsDashboard = onCall(
  {
    memory: '512MiB',
    timeoutSeconds: 60,
    region: 'africa-south1'
  },
  async (request) => {
    try {
      if (!request.auth || !['admin', 'manager'].includes(request.auth.token.role)) {
        throw new Error('Unauthorized: Admin or Manager role required');
      }

      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        recentMetrics,
        weeklyMetrics,
        activeAlerts,
        systemHealth
      ] = await Promise.all([
        collections.organization_metrics
          .where('timestamp', '>=', last24Hours)
          .orderBy('timestamp', 'desc')
          .limit(10)
          .get(),
        collections.user_adoption_metrics
          .where('timestamp', '>=', last7Days)
          .orderBy('timestamp', 'desc')
          .limit(7)
          .get(),
        collections.alerts
          .where('status', '==', 'active')
          .orderBy('triggeredAt', 'desc')
          .limit(5)
          .get(),
        collections.system_health_metrics
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get()
      ]);

      return {
        success: true,
        data: {
          recentMetrics: recentMetrics.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          weeklyMetrics: weeklyMetrics.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          activeAlerts: activeAlerts.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          systemHealth: systemHealth.docs.length > 0 ? systemHealth.docs[0].data() : null,
          summary: {
            totalActiveAlerts: activeAlerts.size,
            metricsCollectedLast24h: recentMetrics.size,
            weeklyDataPoints: weeklyMetrics.size
          }
        }
      };

    } catch (error) {
      logger.error('Failed to get metrics dashboard', { 
        error,
        userId: request.auth?.uid 
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
);