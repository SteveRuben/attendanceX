import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { userPreferencesService } from "../../services/user/user-preferences.service";
import { AuthenticatedRequest } from "../../types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";

export interface UserPreferencesUpdate {
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  weekStartsOn?: 'monday' | 'sunday';
  theme?: 'light' | 'dark' | 'system';
  gracePeriod?: number;
  autoCheckOut?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  soundNotifications?: boolean;
}

export class UserPreferencesController {

  /**
   * GET /users/me/preferences
   * Get current user's preferences
   */
  static getMyPreferences = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      logger.info(`🔍 Getting preferences for user: ${userId}`);

      const preferences = await userPreferencesService.getMyPreferences(userId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Preferences retrieved successfully in ${duration}ms`, {
        userId,
        duration
      });

      res.json({
        success: true,
        data: preferences
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error getting preferences after ${duration}ms`, {
        userId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get preferences");
    }
  });

  /**
   * PUT /users/me/preferences
   * Update current user's preferences
   */
  static updateMyPreferences = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const updates: UserPreferencesUpdate = req.body;

      logger.info(`🔄 Updating preferences for user: ${userId}`, {
        userId,
        fields: Object.keys(updates)
      });

      const updatedPreferences = await userPreferencesService.updateMyPreferences(userId, updates);

      const duration = Date.now() - startTime;
      logger.info(`✅ Preferences updated successfully in ${duration}ms`, {
        userId,
        duration
      });

      res.json({
        success: true,
        data: updatedPreferences,
        message: "Preferences updated successfully"
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error updating preferences after ${duration}ms`, {
        userId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to update preferences");
    }
  });

  /**
   * POST /users/me/preferences/reset
   * Reset preferences to default values
   */
  static resetPreferences = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      logger.info(`🔄 Resetting preferences for user: ${userId}`);

      const defaultPreferences = await userPreferencesService.resetPreferences(userId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Preferences reset successfully in ${duration}ms`, {
        userId,
        duration
      });

      res.json({
        success: true,
        data: defaultPreferences,
        message: "Preferences reset to default values"
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error resetting preferences after ${duration}ms`, {
        userId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to reset preferences");
    }
  });

  /**
   * GET /users/preferences/options
   * Get available options for preferences
   */
  static getPreferencesOptions = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Getting preferences options`);

      const options = await userPreferencesService.getPreferencesOptions();

      const duration = Date.now() - startTime;
      logger.info(`✅ Preferences options retrieved successfully in ${duration}ms`, {
        duration
      });

      res.json({
        success: true,
        data: options
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error getting preferences options after ${duration}ms`, {
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get preferences options");
    }
  });
}