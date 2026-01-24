import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { userNotificationsService } from "../../services/user";
import { AuthenticatedRequest } from "../../types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";

export class UserNotificationsController {

  /**
   * GET /users/me/notification-settings
   * Get current user's notification settings
   */
  static getMyNotificationSettings = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      logger.info(`🔍 Getting notification settings for user: ${userId}`, {
        userId,
        tenantId
      });

      const settings = await userNotificationsService.getMyNotificationSettings(userId, tenantId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Notification settings retrieved successfully in ${duration}ms`, {
        userId,
        tenantId,
        duration
      });

      res.json({
        success: true,
        data: settings
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error getting notification settings after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get notification settings");
    }
  });

  /**
   * PUT /users/me/notification-settings
   * Update current user's notification settings
   */
  static updateMyNotificationSettings = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const updates = req.body;

      logger.info(`🔄 Updating notification settings for user: ${userId}`, {
        userId,
        tenantId,
        fields: Object.keys(updates)
      });

      const updatedSettings = await userNotificationsService.updateMyNotificationSettings(userId, tenantId, updates);

      const duration = Date.now() - startTime;
      logger.info(`✅ Notification settings updated successfully in ${duration}ms`, {
        userId,
        tenantId,
        duration
      });

      res.json({
        success: true,
        data: updatedSettings,
        message: "Notification settings updated successfully"
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error updating notification settings after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to update notification settings");
    }
  });

  /**
   * POST /users/me/notification-settings/reset
   * Reset notification settings to default values
   */
  static resetNotificationSettings = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      logger.info(`🔄 Resetting notification settings for user: ${userId}`, {
        userId,
        tenantId
      });

      const defaultSettings = await userNotificationsService.resetNotificationSettings(userId, tenantId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Notification settings reset successfully in ${duration}ms`, {
        userId,
        tenantId,
        duration
      });

      res.json({
        success: true,
        data: defaultSettings,
        message: "Notification settings reset to default values"
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error resetting notification settings after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to reset notification settings");
    }
  });

  /**
   * GET /users/me/notifications
   * Get current user's notifications
   */
  static getMyNotifications = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const { page = 1, limit = 20, unreadOnly = false, type } = req.query;

      logger.info(`🔍 Getting notifications for user: ${userId}`, {
        userId,
        tenantId,
        page: Number(page),
        limit: Number(limit),
        unreadOnly: unreadOnly === 'true',
        type
      });

      const result = await userNotificationsService.getMyNotifications(userId, tenantId, {
        page: Number(page),
        limit: Number(limit),
        unreadOnly: unreadOnly === 'true',
        type: type as string
      });

      const duration = Date.now() - startTime;
      logger.info(`✅ Notifications retrieved successfully in ${duration}ms`, {
        userId,
        tenantId,
        count: result.items.length,
        total: result.pagination.total,
        duration
      });

      res.json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error getting notifications after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get notifications");
    }
  });

  /**
   * GET /users/me/notifications/stats
   * Get notification statistics
   */
  static getNotificationStats = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      logger.info(`🔍 Getting notification stats for user: ${userId}`, {
        userId,
        tenantId
      });

      const stats = await userNotificationsService.getNotificationStats(userId, tenantId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Notification stats retrieved successfully in ${duration}ms`, {
        userId,
        tenantId,
        stats,
        duration
      });

      res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error getting notification stats after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get notification stats");
    }
  });

  /**
   * POST /users/me/notifications/mark-read
   * Mark notifications as read
   */
  static markNotificationsRead = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Notification IDs array is required");
      }

      logger.info(`📖 Marking notifications as read for user: ${userId}`, {
        userId,
        tenantId,
        count: ids.length
      });

      await userNotificationsService.markNotificationsRead(userId, tenantId, ids);

      const duration = Date.now() - startTime;
      logger.info(`✅ Notifications marked as read successfully in ${duration}ms`, {
        userId,
        tenantId,
        count: ids.length,
        duration
      });

      res.json({
        success: true,
        message: `${ids.length} notification(s) marked as read`
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error marking notifications as read after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to mark notifications as read");
    }
  });

  /**
   * POST /users/me/notifications/mark-all-read
   * Mark all notifications as read
   */
  static markAllNotificationsRead = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      logger.info(`📖 Marking all notifications as read for user: ${userId}`, {
        userId,
        tenantId
      });

      const count = await userNotificationsService.markAllNotificationsRead(userId, tenantId);

      const duration = Date.now() - startTime;
      logger.info(`✅ All notifications marked as read successfully in ${duration}ms`, {
        userId,
        tenantId,
        count,
        duration
      });

      res.json({
        success: true,
        message: `${count} notification(s) marked as read`
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error marking all notifications as read after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to mark all notifications as read");
    }
  });

  /**
   * POST /users/me/notifications/delete
   * Delete notifications
   */
  static deleteNotifications = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Notification IDs array is required");
      }

      logger.info(`🗑️ Deleting notifications for user: ${userId}`, {
        userId,
        tenantId,
        count: ids.length
      });

      await userNotificationsService.deleteNotifications(userId, tenantId, ids);

      const duration = Date.now() - startTime;
      logger.info(`✅ Notifications deleted successfully in ${duration}ms`, {
        userId,
        tenantId,
        count: ids.length,
        duration
      });

      res.json({
        success: true,
        message: `${ids.length} notification(s) deleted`
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error deleting notifications after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to delete notifications");
    }
  });

  /**
   * DELETE /users/me/notifications/clear-all
   * Clear all notifications
   */
  static clearAllNotifications = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      logger.info(`🗑️ Clearing all notifications for user: ${userId}`, {
        userId,
        tenantId
      });

      const count = await userNotificationsService.clearAllNotifications(userId, tenantId);

      const duration = Date.now() - startTime;
      logger.info(`✅ All notifications cleared successfully in ${duration}ms`, {
        userId,
        tenantId,
        count,
        duration
      });

      res.json({
        success: true,
        message: `${count} notification(s) cleared`
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error clearing all notifications after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to clear all notifications");
    }
  });

  /**
   * POST /users/me/notifications/test/:type
   * Test notification settings
   */
  static testNotificationSettings = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;
    const type = req.params.type as string;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      if (!['email', 'push', 'sms'].includes(type)) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Invalid notification type. Must be 'email', 'push', or 'sms'");
      }

      logger.info(`🧪 Testing ${type} notification for user: ${userId}`, {
        userId,
        tenantId,
        type
      });

      await userNotificationsService.testNotificationSettings(userId, tenantId, type as 'email' | 'push' | 'sms');

      const duration = Date.now() - startTime;
      logger.info(`✅ Test ${type} notification sent successfully in ${duration}ms`, {
        userId,
        tenantId,
        type,
        duration
      });

      res.json({
        success: true,
        message: `Test ${type} notification sent successfully`
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error sending test ${type} notification after ${duration}ms`, {
        userId,
        tenantId,
        type,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, `Failed to send test ${type} notification`);
    }
  });
}