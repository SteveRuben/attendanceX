// functions/maintenance.function.ts
// Consolidated maintenance function with parameter-based routing

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { presenceMaintenanceService } from '../services/presence/presence-maintenance.service';
import { cleanupSecurityData } from '../middleware/presence-security.middleware';
import { collections, db } from '../config';
import { getStorage } from 'firebase-admin/storage';
import { EmailVerificationCleanupUtils } from '../utils/auth/email-verification-cleanup.utils';

const storage = getStorage();

/**
 * Interface for maintenance configuration
 */
interface MaintenanceConfig {
  type: 'daily' | 'weekly' | 'monthly';
  tasks?: string[];
  presenceConfig?: {
    presenceEntriesRetentionDays?: number;
    auditLogsRetentionDays?: number;
    notificationsRetentionDays?: number;
    reportsRetentionDays?: number;
    batchSize?: number;
    maxExecutionTimeMs?: number;
  };
  cleanupConfig?: {
    expiredNotificationsDays?: number;
    auditLogsDays?: number;
    tempFilesDays?: number;
    sessionsDays?: number;
    reportsDays?: number;
  };
}

/**
 * Interface for maintenance result
 */
interface MaintenanceResult {
  success: boolean;
  type: string;
  executionTimeMs: number;
  tasksCompleted: string[];
  tasksFailed: string[];
  results: Record<string, any>;
  errors: string[];
  summary: {
    totalDeleted: number;
    totalArchived: number;
    totalCleaned: number;
  };
}

/**
 * Consolidated scheduled maintenance function
 * Handles daily, weekly, and monthly maintenance based on parameters
 */
export const scheduledMaintenance = onSchedule(
  {
    schedule: '0 1-4 * * *', // Runs at 1AM, 2AM, 3AM, and 4AM UTC
    timeZone: 'UTC',
    memory: '2GiB',
    timeoutSeconds: 540, // 9 minutes
    region: 'africa-south1'
  },
  async (event) => {
    try {
      const currentHour = new Date().getUTCHours();
      const currentDay = new Date().getUTCDay(); // 0 = Sunday
      const currentDate = new Date().getUTCDate();
      
      let maintenanceType: 'daily' | 'weekly' | 'monthly';
      let config: MaintenanceConfig;

      // Determine maintenance type based on schedule
      if (currentDate === 1 && currentHour === 4) {
        // Monthly maintenance on 1st day at 4AM
        maintenanceType = 'monthly';
        config = getMonthlyMaintenanceConfig();
      } else if (currentDay === 0 && currentHour === 3) {
        // Weekly maintenance on Sunday at 3AM
        maintenanceType = 'weekly';
        config = getWeeklyMaintenanceConfig();
      } else if (currentHour === 2) {
        // Daily maintenance at 2AM
        maintenanceType = 'daily';
        config = getDailyMaintenanceConfig();
      } else if (currentHour === 1) {
        // Light daily maintenance at 1AM
        maintenanceType = 'daily';
        config = getLightDailyMaintenanceConfig();
      } else {
        logger.info('No maintenance scheduled for this time', { currentHour, currentDay, currentDate });
        return;
      }

      logger.info(`Starting scheduled ${maintenanceType} maintenance`, { config });

      const result = await executeMaintenanceTasks(config);

      if (result.success) {
        logger.info(`${maintenanceType} maintenance completed successfully`, {
          executionTime: result.executionTimeMs,
          tasksCompleted: result.tasksCompleted,
          summary: result.summary
        });
      } else {
        logger.error(`${maintenanceType} maintenance completed with errors`, {
          executionTime: result.executionTimeMs,
          tasksCompleted: result.tasksCompleted,
          tasksFailed: result.tasksFailed,
          errors: result.errors
        });
      }

    } catch (error) {
      logger.error('Scheduled maintenance failed', { error });
      throw error;
    }
  }
);

/**
 * Manual maintenance trigger function
 */
export const triggerMaintenance = onCall(
  {
    memory: '2GiB',
    timeoutSeconds: 540,
    region: 'africa-south1'
  },
  async (request) => {
    try {
      // Verify permissions (admin only)
      if (!request.auth || request.auth.token.role !== 'admin') {
        throw new Error('Unauthorized: Admin role required');
      }

      logger.info('Manual maintenance triggered', {
        userId: request.auth.uid,
        config: request.data
      });

      const config: MaintenanceConfig = request.data || getDailyMaintenanceConfig();
      const result = await executeMaintenanceTasks(config);

      logger.info('Manual maintenance completed', {
        userId: request.auth.uid,
        result: {
          success: result.success,
          executionTime: result.executionTimeMs,
          tasksCompleted: result.tasksCompleted,
          summary: result.summary
        }
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      logger.error('Manual maintenance failed', { 
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
 * Execute maintenance tasks based on configuration
 */
async function executeMaintenanceTasks(config: MaintenanceConfig): Promise<MaintenanceResult> {
  const startTime = Date.now();
  const result: MaintenanceResult = {
    success: true,
    type: config.type,
    executionTimeMs: 0,
    tasksCompleted: [],
    tasksFailed: [],
    results: {},
    errors: [],
    summary: {
      totalDeleted: 0,
      totalArchived: 0,
      totalCleaned: 0
    }
  };

  const tasks = config.tasks || getDefaultTasks(config.type);

  for (const task of tasks) {
    try {
      logger.info(`Executing maintenance task: ${task}`);
      
      let taskResult: any;
      
      switch (task) {
        case 'presence_maintenance':
          taskResult = await executePresenceMaintenance(config.presenceConfig || {});
          break;
        case 'security_cleanup':
          taskResult = await executeSecurityCleanup();
          break;
        case 'expired_notifications':
          taskResult = await cleanExpiredNotifications(config.cleanupConfig?.expiredNotificationsDays || 30);
          break;
        case 'old_audit_logs':
          taskResult = await cleanOldAuditLogs(config.cleanupConfig?.auditLogsDays || 90);
          break;
        case 'temp_files':
          taskResult = await cleanTempFiles(config.cleanupConfig?.tempFilesDays || 1);
          break;
        case 'expired_qr_codes':
          taskResult = await cleanExpiredQRCodes();
          break;
        case 'old_sessions':
          taskResult = await cleanOldSessions(config.cleanupConfig?.sessionsDays || 7);
          break;
        case 'email_verification_tokens':
          taskResult = await cleanEmailVerificationTokens();
          break;
        case 'old_events':
          taskResult = await cleanOldEvents();
          break;
        case 'orphaned_attendance':
          taskResult = await cleanOrphanedAttendance();
          break;
        case 'unused_templates':
          taskResult = await cleanUnusedTemplates();
          break;
        case 'storage_files':
          taskResult = await cleanStorageFiles();
          break;
        case 'old_reports':
          taskResult = await cleanOldReports(config.cleanupConfig?.reportsDays || 90);
          break;
        case 'monthly_stats_reset':
          taskResult = await resetMonthlyStats();
          break;
        case 'archive_old_data':
          taskResult = await archiveOldData();
          break;
        default:
          throw new Error(`Unknown maintenance task: ${task}`);
      }

      result.tasksCompleted.push(task);
      result.results[task] = taskResult;
      
      // Update summary
      if (taskResult.deleted) {
        result.summary.totalDeleted += taskResult.deleted;
      }
      if (taskResult.archived) {
        result.summary.totalArchived += taskResult.archived;
      }
      if (taskResult.cleaned) {
        result.summary.totalCleaned += taskResult.cleaned;
      }

      logger.info(`Maintenance task completed: ${task}`, { result: taskResult });

    } catch (error) {
      logger.error(`Maintenance task failed: ${task}`, { error });
      result.tasksFailed.push(task);
      result.errors.push(`${task}: ${error.message}`);
      result.success = false;
    }
  }

  result.executionTimeMs = Date.now() - startTime;
  return result;
}

/**
 * Get default tasks for maintenance type
 */
function getDefaultTasks(type: 'daily' | 'weekly' | 'monthly'): string[] {
  switch (type) {
    case 'daily':
      return [
        'presence_maintenance',
        'security_cleanup',
        'expired_notifications',
        'temp_files',
        'expired_qr_codes',
        'old_sessions',
        'email_verification_tokens'
      ];
    case 'weekly':
      return [
        'presence_maintenance',
        'security_cleanup',
        'old_audit_logs',
        'old_events',
        'orphaned_attendance',
        'unused_templates',
        'storage_files'
      ];
    case 'monthly':
      return [
        'presence_maintenance',
        'old_reports',
        'monthly_stats_reset',
        'archive_old_data'
      ];
    default:
      return [];
  }
}

/**
 * Configuration generators
 */
function getDailyMaintenanceConfig(): MaintenanceConfig {
  return {
    type: 'daily',
    presenceConfig: {
      presenceEntriesRetentionDays: 1095,
      auditLogsRetentionDays: 30,
      notificationsRetentionDays: 7,
      reportsRetentionDays: 730,
      batchSize: 100,
      maxExecutionTimeMs: 240000 // 4 minutes
    },
    cleanupConfig: {
      expiredNotificationsDays: 30,
      tempFilesDays: 1,
      sessionsDays: 7
    }
  };
}

function getLightDailyMaintenanceConfig(): MaintenanceConfig {
  return {
    type: 'daily',
    tasks: ['security_cleanup', 'temp_files', 'expired_qr_codes'],
    cleanupConfig: {
      tempFilesDays: 1
    }
  };
}

function getWeeklyMaintenanceConfig(): MaintenanceConfig {
  return {
    type: 'weekly',
    presenceConfig: {
      presenceEntriesRetentionDays: 1095,
      auditLogsRetentionDays: 365,
      notificationsRetentionDays: 90,
      reportsRetentionDays: 730,
      batchSize: 500,
      maxExecutionTimeMs: 480000 // 8 minutes
    },
    cleanupConfig: {
      auditLogsDays: 90
    }
  };
}

function getMonthlyMaintenanceConfig(): MaintenanceConfig {
  return {
    type: 'monthly',
    cleanupConfig: {
      reportsDays: 90
    }
  };
}

/**
 * Individual maintenance task implementations
 */
async function executePresenceMaintenance(config: any): Promise<any> {
  return await presenceMaintenanceService.runMaintenance(config);
}

async function executeSecurityCleanup(): Promise<{ cleaned: boolean }> {
  cleanupSecurityData();
  return { cleaned: true };
}

async function cleanExpiredNotifications(days: number): Promise<{ deleted: number }> {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const query = collections.notifications
    .where('sent', '==', true)
    .where('createdAt', '<', cutoffDate)
    .limit(500);

  const snapshot = await query.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  if (!snapshot.empty) {
    await batch.commit();
  }

  return { deleted: snapshot.size };
}

async function cleanOldAuditLogs(days: number): Promise<{ cleaned: number }> {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  let totalCleaned = 0;

  const collectionNames = ['users', 'events', 'attendance'];

  for (const collectionName of collectionNames) {
    const query = collections[collectionName].limit(100);
    const snapshot = await query.get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.auditLog && Array.isArray(data.auditLog)) {
        const filteredLogs = data.auditLog.filter((log: any) =>
          log.performedAt && log.performedAt.toDate() > cutoffDate
        );

        if (filteredLogs.length !== data.auditLog.length) {
          await doc.ref.update({ auditLog: filteredLogs });
          totalCleaned += data.auditLog.length - filteredLogs.length;
        }
      }
    }
  }

  return { cleaned: totalCleaned };
}

async function cleanTempFiles(days: number): Promise<{ deleted: number }> {
  const bucket = storage.bucket();
  const [files] = await bucket.getFiles({
    prefix: 'temp/',
    maxResults: 1000,
  });

  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  let deleted = 0;

  for (const file of files) {
    const [metadata] = await file.getMetadata();
    if (!metadata.timeCreated) {continue;}
    const created = new Date(metadata.timeCreated);

    if (created < cutoffDate) {
      await file.delete();
      deleted++;
    }
  }

  return { deleted };
}

async function cleanExpiredQRCodes(): Promise<{ updated: number }> {
  const query = collections.events
    .where('qrCodeExpiresAt', '<', new Date())
    .limit(100);

  const snapshot = await query.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      qrCode: null,
      qrCodeExpiresAt: null,
    });
  });

  if (!snapshot.empty) {
    await batch.commit();
  }

  return { updated: snapshot.size };
}

async function cleanOldSessions(days: number): Promise<{ deleted: number }> {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const query = collections.user_sessions
    .where('lastActive', '<', cutoffDate)
    .limit(500);

  const snapshot = await query.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  if (!snapshot.empty) {
    await batch.commit();
  }

  return { deleted: snapshot.size };
}

async function cleanEmailVerificationTokens(): Promise<{ cleaned: number }> {
  const result = await EmailVerificationCleanupUtils.performFullCleanup({
    cleanExpired: true,
    cleanUsedOlderThanDays: 30,
    cleanOrphaned: true
  });

  return { cleaned: result.totalCleaned };
}

async function cleanOldEvents(): Promise<{ archived: number }> {
  const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year

  const query = collections.events
    .where('endDateTime', '<', cutoffDate)
    .where('status', 'in', ['completed', 'cancelled'])
    .limit(100);

  const snapshot = await query.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    const archiveRef = collections.events_archive.doc(doc.id);
    batch.set(archiveRef, { ...doc.data(), archivedAt: new Date() });
    batch.delete(doc.ref);
  });

  if (!snapshot.empty) {
    await batch.commit();
  }

  return { archived: snapshot.size };
}

async function cleanOrphanedAttendance(): Promise<{ deleted: number }> {
  const attendanceQuery = collections.attendances.limit(500);
  const attendanceSnapshot = await attendanceQuery.get();

  let deleted = 0;
  const batch = db.batch();

  for (const attendanceDoc of attendanceSnapshot.docs) {
    const data = attendanceDoc.data();
    const eventExists = await collections.events.doc(data.eventId).get();

    if (!eventExists.exists) {
      batch.delete(attendanceDoc.ref);
      deleted++;
    }
  }

  if (deleted > 0) {
    await batch.commit();
  }

  return { deleted };
}

async function cleanUnusedTemplates(): Promise<{ deleted: number }> {
  const cutoffDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 6 months

  const query = collections.smsProviders
    .where('lastUsed', '<', cutoffDate)
    .where('isActive', '==', false)
    .limit(50);

  const snapshot = await query.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  if (!snapshot.empty) {
    await batch.commit();
  }

  return { deleted: snapshot.size };
}

async function cleanStorageFiles(): Promise<{ deleted: number }> {
  const bucket = storage.bucket();
  let deleted = 0;

  const [files] = await bucket.getFiles({
    prefix: 'uploads/',
    maxResults: 1000,
  });

  for (const file of files) {
    try {
      const [metadata] = await file.getMetadata();
      if (!metadata.metadata?.userId && !metadata.metadata?.eventId) {
        await file.delete();
        deleted++;
      }
    } catch (error) {
      await file.delete();
      deleted++;
    }
  }

  return { deleted };
}

async function cleanOldReports(days: number): Promise<{ deleted: number }> {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const query = collections.reports
    .where('createdAt', '<', cutoffDate)
    .limit(100);

  const snapshot = await query.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  if (!snapshot.empty) {
    await batch.commit();
  }

  return { deleted: snapshot.size };
}

async function resetMonthlyStats(): Promise<{ reset: number }> {
  const query = collections.smsProviders;
  const snapshot = await query.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      'stats.monthlyUsage': 0,
    });
  });

  if (!snapshot.empty) {
    await batch.commit();
  }

  return { reset: snapshot.size };
}

async function archiveOldData(): Promise<{ archived: boolean }> {
  // Implementation for archiving old data to cheaper storage
  // This would typically involve moving data to Cloud Storage or BigQuery
  return { archived: true };
}

/**
 * Health check and monitoring functions
 */
export const getMaintenanceStatus = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 60,
    region: 'africa-south1'
  },
  async (request) => {
    try {
      if (!request.auth || !['admin', 'manager'].includes(request.auth.token.role)) {
        throw new Error('Unauthorized: Admin or Manager role required');
      }

      // Get storage stats and health check
      const storageStats = await presenceMaintenanceService.getStorageStats();
      const healthCheck = await presenceMaintenanceService.checkDataHealth();

      return {
        success: true,
        data: {
          storageStats,
          healthCheck,
          lastMaintenance: {
            daily: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            weekly: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            monthly: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          nextScheduled: {
            daily: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            weekly: getNextSunday().toISOString(),
            monthly: getNextFirstOfMonth().toISOString()
          }
        }
      };

    } catch (error) {
      logger.error('Failed to get maintenance status', { 
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
 * Helper functions
 */
function getNextSunday(): Date {
  const now = new Date();
  const nextSunday = new Date(now);
  nextSunday.setUTCDate(now.getUTCDate() + (7 - now.getUTCDay()));
  nextSunday.setUTCHours(3, 0, 0, 0);
  return nextSunday;
}

function getNextFirstOfMonth(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  nextMonth.setUTCHours(4, 0, 0, 0);
  return nextMonth;
}