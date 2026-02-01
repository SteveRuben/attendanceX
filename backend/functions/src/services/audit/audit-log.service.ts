/**
 * Audit Log Service
 * Handles creation and retrieval of audit logs
 */

import { logger } from "firebase-functions";
import { collections } from "../../config/database";
import {
  AuditLogEntry,
  CreateAuditLogRequest,
  AuditLogFilters,
  AuditSeverity,
} from "../../types/audit-log.types";

export class AuditLogService {
  /**
   * Create an audit log entry
   */
  async createLog(
    tenantId: string,
    request: CreateAuditLogRequest
  ): Promise<AuditLogEntry> {
    try {
      const logEntry: Omit<AuditLogEntry, 'id'> = {
        tenantId,
        action: request.action,
        severity: request.severity || AuditSeverity.INFO,
        actorId: request.actorId,
        actorEmail: request.actorEmail,
        actorRole: request.actorRole,
        actorIp: request.actorIp,
        actorUserAgent: request.actorUserAgent,
        targetType: request.targetType,
        targetId: request.targetId,
        targetName: request.targetName,
        description: request.description,
        metadata: request.metadata,
        changes: request.changes,
        timestamp: new Date(),
        success: request.success !== undefined ? request.success : true,
        errorMessage: request.errorMessage,
        requestId: request.requestId,
        endpoint: request.endpoint,
        method: request.method,
      };

      const docRef = collections.audit_logs.doc();
      await docRef.set(logEntry);

      const createdLog: AuditLogEntry = {
        id: docRef.id,
        ...logEntry,
      };

      // Log critical events to console
      if (request.severity === AuditSeverity.CRITICAL || 
          request.severity === AuditSeverity.ERROR) {
        logger.error('🔴 Audit Log - Critical Event', {
          action: request.action,
          actorId: request.actorId,
          description: request.description,
          tenantId,
        });
      }

      return createdLog;
    } catch (error: any) {
      logger.error('Failed to create audit log', {
        error: error.message,
        tenantId,
        action: request.action,
      });
      throw error;
    }
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(filters: AuditLogFilters): Promise<{
    logs: AuditLogEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      let query = collections.audit_logs.where('tenantId', '==', filters.tenantId);

      // Apply filters
      if (filters.actorId) {
        query = query.where('actorId', '==', filters.actorId);
      }

      if (filters.action) {
        query = query.where('action', '==', filters.action);
      }

      if (filters.severity) {
        query = query.where('severity', '==', filters.severity);
      }

      if (filters.targetType) {
        query = query.where('targetType', '==', filters.targetType);
      }

      if (filters.targetId) {
        query = query.where('targetId', '==', filters.targetId);
      }

      if (filters.success !== undefined) {
        query = query.where('success', '==', filters.success);
      }

      if (filters.startDate) {
        query = query.where('timestamp', '>=', filters.startDate);
      }

      if (filters.endDate) {
        query = query.where('timestamp', '<=', filters.endDate);
      }

      // Order by timestamp descending
      query = query.orderBy('timestamp', 'desc');

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      // Get total count
      const countSnapshot = await query.get();
      const total = countSnapshot.size;

      // Get paginated results
      const snapshot = await query.limit(limit).offset(offset).get();

      const logs: AuditLogEntry[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as AuditLogEntry));

      return {
        logs,
        total,
        page,
        limit,
      };
    } catch (error: any) {
      logger.error('Failed to get audit logs', {
        error: error.message,
        filters,
      });
      throw error;
    }
  }

  /**
   * Get a single audit log by ID
   */
  async getLogById(logId: string, tenantId: string): Promise<AuditLogEntry | null> {
    try {
      const doc = await collections.audit_logs.doc(logId).get();

      if (!doc.exists) {
        return null;
      }

      const log = doc.data() as AuditLogEntry;

      // Verify tenant access
      if (log.tenantId !== tenantId) {
        return null;
      }

      return {
        id: doc.id,
        ...log,
      };
    } catch (error: any) {
      logger.error('Failed to get audit log by ID', {
        error: error.message,
        logId,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Delete old audit logs (for cleanup)
   */
  async deleteOldLogs(tenantId: string, olderThanDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const snapshot = await collections.audit_logs
        .where('tenantId', '==', tenantId)
        .where('timestamp', '<', cutoffDate)
        .get();

      const batch = collections.audit_logs.firestore.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      logger.info(`Deleted ${snapshot.size} old audit logs`, {
        tenantId,
        olderThanDays,
        cutoffDate,
      });

      return snapshot.size;
    } catch (error: any) {
      logger.error('Failed to delete old audit logs', {
        error: error.message,
        tenantId,
        olderThanDays,
      });
      throw error;
    }
  }
}

export const auditLogService = new AuditLogService();
