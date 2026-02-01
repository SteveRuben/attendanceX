/**
 * Audit Log Controller
 * Handles HTTP requests for audit logs
 */

import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { auditLogService } from "../../services/audit/audit-log.service";
import { AuthenticatedRequest } from "../../types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";
import { AuditLogFilters, AuditAction, AuditSeverity } from "../../types/audit-log.types";

export class AuditLogController {
  /**
   * Get audit logs with filters
   * GET /api/v1/audit-logs
   */
  static getLogs = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      // Only admins and owners can view audit logs
      const userRole = req.user?.applicationRole;
      if (userRole !== 'admin' && userRole !== 'owner') {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Insufficient permissions");
      }

      const filters: AuditLogFilters = {
        tenantId,
        actorId: req.query.actorId as string,
        action: req.query.action as AuditAction,
        severity: req.query.severity as AuditSeverity,
        targetType: req.query.targetType as string,
        targetId: req.query.targetId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        success: req.query.success ? req.query.success === 'true' : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      };

      logger.info('📋 Fetching audit logs', {
        userId,
        tenantId,
        filters,
      });

      const result = await auditLogService.getLogs(filters);

      const duration = Date.now() - startTime;
      logger.info(`✅ Audit logs fetched successfully in ${duration}ms`, {
        userId,
        tenantId,
        count: result.logs.length,
        total: result.total,
        duration,
      });

      res.json({
        success: true,
        data: result.logs,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error fetching audit logs after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration,
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to fetch audit logs");
    }
  });

  /**
   * Get a single audit log by ID
   * GET /api/v1/audit-logs/:logId
   */
  static getLogById = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { logId } = req.params;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      // Only admins and owners can view audit logs
      const userRole = req.user?.applicationRole;
      if (userRole !== 'admin' && userRole !== 'owner') {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Insufficient permissions");
      }

      const log = await auditLogService.getLogById(logId as string, tenantId);

      if (!log) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Audit log not found");
      }

      res.json({
        success: true,
        data: log,
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting audit log:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get audit log");
    }
  });
}
