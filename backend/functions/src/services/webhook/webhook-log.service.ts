import { collections } from "../../config/database";
import { logger } from "firebase-functions";
import { WebhookLogModel, CreateWebhookLogRequest } from "../../models/webhook-log.model";
import { WebhookEventType } from "../../common/types/form-builder.types";
import { ValidationError, NotFoundError } from "../../utils/common/errors";

export interface WebhookLogFilters {
  event?: WebhookEventType;
  processed?: boolean;
  sourceIp?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class WebhookLogService {
  
  /**
   * Create webhook log entry
   */
  async createWebhookLog(request: CreateWebhookLogRequest): Promise<string> {
    try {
      const webhookLogModel = WebhookLogModel.fromCreateRequest(request);
      await webhookLogModel.validate();

      const logRef = collections.webhook_logs.doc();
      await logRef.set(webhookLogModel.toFirestore());

      logger.info(`📋 Webhook log created`, {
        logId: logRef.id,
        event: request.event,
        tenantId: request.tenantId
      });

      return logRef.id;

    } catch (error: any) {
      logger.error(`❌ Error creating webhook log`, {
        event: request.event,
        tenantId: request.tenantId,
        error: error.message
      });
      throw new ValidationError(`Failed to create webhook log: ${error.message}`);
    }
  }

  /**
   * Get webhook logs for tenant with filters and pagination
   */
  async getWebhookLogs(
    tenantId: string,
    filters: WebhookLogFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<{
    logs: any[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    try {
      let query = collections.webhook_logs
        .where('tenantId', '==', tenantId);

      // Apply filters
      if (filters.event) {
        query = query.where('event', '==', filters.event);
      }

      if (filters.processed !== undefined) {
        query = query.where('processed', '==', filters.processed);
      }

      if (filters.sourceIp) {
        query = query.where('sourceIp', '==', filters.sourceIp);
      }

      // Apply date range filters
      if (filters.startDate) {
        query = query.where('timestamp', '>=', filters.startDate);
      }

      if (filters.endDate) {
        query = query.where('timestamp', '<=', filters.endDate);
      }

      // Apply sorting
      const sortBy = pagination.sortBy || 'timestamp';
      const sortOrder = pagination.sortOrder || 'desc';
      query = query.orderBy(sortBy, sortOrder);

      // Get total count
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Apply pagination
      const offset = (pagination.page - 1) * pagination.limit;
      const paginatedQuery = query.offset(offset).limit(pagination.limit);
      const snapshot = await paginatedQuery.get();

      const logs = snapshot.docs
        .map(doc => WebhookLogModel.fromFirestore(doc))
        .filter(model => model !== null)
        .map(model => model!.toAPI());

      const totalPages = Math.ceil(total / pagination.limit);

      return {
        logs,
        pagination: {
          total,
          page: pagination.page,
          limit: pagination.limit,
          totalPages
        }
      };

    } catch (error: any) {
      logger.error(`❌ Error getting webhook logs`, {
        tenantId,
        error: error.message
      });
      throw new Error(`Failed to get webhook logs: ${error.message}`);
    }
  }

  /**
   * Mark webhook log as processed
   */
  async markLogAsProcessed(
    logId: string, 
    tenantId: string, 
    result: { success: boolean; message: string; errors?: string[] }
  ): Promise<void> {
    try {
      const logDoc = await collections.webhook_logs.doc(logId).get();
      
      if (!logDoc.exists) {
        throw new NotFoundError("Webhook log not found");
      }

      const logModel = WebhookLogModel.fromFirestore(logDoc);
      if (!logModel || logModel.getData().tenantId !== tenantId) {
        throw new NotFoundError("Webhook log not found");
      }

      logModel.markAsProcessed(result);
      await collections.webhook_logs.doc(logId).update(logModel.toFirestore());

      logger.info(`✅ Webhook log marked as processed`, {
        logId,
        tenantId,
        success: result.success
      });

    } catch (error: any) {
      logger.error(`❌ Error marking webhook log as processed`, {
        logId,
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get webhook statistics for tenant
   */
  async getWebhookStats(tenantId: string, days: number = 30): Promise<{
    totalWebhooks: number;
    processedWebhooks: number;
    failedWebhooks: number;
    byEvent: Record<string, number>;
    byDay: Array<{ date: string; count: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const snapshot = await collections.webhook_logs
        .where('tenantId', '==', tenantId)
        .where('timestamp', '>=', startDate)
        .get();

      let totalWebhooks = 0;
      let processedWebhooks = 0;
      let failedWebhooks = 0;
      const byEvent: Record<string, number> = {};
      const byDay: Record<string, number> = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        totalWebhooks++;

        if (data.processed) {
          processedWebhooks++;
          if (data.processingResult && !data.processingResult.success) {
            failedWebhooks++;
          }
        }

        // Count by event type
        const event = data.event || 'unknown';
        byEvent[event] = (byEvent[event] || 0) + 1;

        // Count by day
        const date = data.timestamp?.toDate?.()?.toISOString().split('T')[0] || 'unknown';
        byDay[date] = (byDay[date] || 0) + 1;
      });

      // Convert byDay to array format
      const byDayArray = Object.entries(byDay).map(([date, count]) => ({
        date,
        count
      })).sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalWebhooks,
        processedWebhooks,
        failedWebhooks,
        byEvent,
        byDay: byDayArray
      };

    } catch (error: any) {
      logger.error(`❌ Error getting webhook stats`, {
        tenantId,
        error: error.message
      });
      throw new Error(`Failed to get webhook stats: ${error.message}`);
    }
  }

  /**
   * Clean up old webhook logs (retention policy)
   */
  async cleanupOldLogs(tenantId: string, retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const snapshot = await collections.webhook_logs
        .where('tenantId', '==', tenantId)
        .where('timestamp', '<', cutoffDate)
        .limit(500) // Process in batches
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const batch = collections.webhook_logs.firestore.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      const deletedCount = snapshot.size;
      logger.info(`🧹 Cleaned up old webhook logs`, {
        tenantId,
        deletedCount,
        retentionDays
      });

      return deletedCount;

    } catch (error: any) {
      logger.error(`❌ Error cleaning up webhook logs`, {
        tenantId,
        error: error.message
      });
      throw new Error(`Failed to cleanup webhook logs: ${error.message}`);
    }
  }
}

export const webhookLogService = new WebhookLogService();