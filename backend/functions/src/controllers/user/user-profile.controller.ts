import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { userProfileService } from "../../services/user/user-profile.service";
import { AuthenticatedRequest } from "../../types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";
import { 
  UpdateUserRequest,
  ChangePasswordRequest 
} from "../../common/types/user.types";

export class UserProfileController {

  /**
   * GET /users/me/profile
   * Get current user's profile
   */
  static getMyProfile = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      logger.info(`🔍 Getting profile for user: ${userId}`);

      const profile = await userProfileService.getMyProfile(userId);

      if (!profile) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Profile not found");
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ Profile retrieved successfully in ${duration}ms`, {
        userId,
        duration
      });

      res.json({
        success: true,
        data: profile
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error getting profile after ${duration}ms`, {
        userId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get profile");
    }
  });

  /**
   * PUT /users/me/profile
   * Update current user's profile
   */
  static updateMyProfile = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const updateData: UpdateUserRequest = req.body;

      // Basic input validation
      if (Object.keys(updateData).length === 0) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "No update data provided");
      }

      // Validate specific fields if provided
      if (updateData.email && typeof updateData.email !== 'string') {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Email must be a string");
      }

      if (updateData.name && (typeof updateData.name !== 'string' || updateData.name.trim().length < 2)) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Name must be at least 2 characters");
      }

      logger.info(`🔄 Updating profile for user: ${userId}`, {
        userId,
        fields: Object.keys(updateData)
      });

      const updatedProfile = await userProfileService.updateMyProfile(userId, updateData);

      const duration = Date.now() - startTime;
      logger.info(`✅ Profile updated successfully in ${duration}ms`, {
        userId,
        duration
      });

      res.json({
        success: true,
        data: updatedProfile,
        message: "Profile updated successfully"
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error updating profile after ${duration}ms`, {
        userId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to update profile");
    }
  });

  /**
   * GET /users/me/account-info
   * Get current user's account information
   */
  static getMyAccountInfo = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      logger.info(`🔍 Getting account info for user: ${userId}`);

      const accountInfo = await userProfileService.getMyAccountInfo(userId, tenantId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Account info retrieved successfully in ${duration}ms`, {
        userId,
        tenantId,
        duration
      });

      res.json({
        success: true,
        data: accountInfo
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error getting account info after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get account info");
    }
  });

  /**
   * POST /users/me/avatar
   * Upload user avatar
   */
  static uploadAvatar = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      // Check if file was uploaded
      if (!req.file) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "No file uploaded");
      }

      logger.info(`📤 Uploading avatar for user: ${userId}`, {
        userId,
        fileName: req.file.originalname,
        fileSize: req.file.size
      });

      const avatarUrl = await userProfileService.uploadAvatar(userId, req.file);

      const duration = Date.now() - startTime;
      logger.info(`✅ Avatar uploaded successfully in ${duration}ms`, {
        userId,
        avatarUrl,
        duration
      });

      res.json({
        success: true,
        data: { avatarUrl },
        message: "Avatar uploaded successfully"
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error uploading avatar after ${duration}ms`, {
        userId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to upload avatar");
    }
  });

  /**
   * DELETE /users/me/avatar
   * Delete user avatar
   */
  static deleteAvatar = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      logger.info(`🗑️ Deleting avatar for user: ${userId}`);

      await userProfileService.deleteAvatar(userId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Avatar deleted successfully in ${duration}ms`, {
        userId,
        duration
      });

      res.json({
        success: true,
        message: "Avatar deleted successfully"
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error deleting avatar after ${duration}ms`, {
        userId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to delete avatar");
    }
  });

  /**
   * POST /users/me/change-password
   * Change user password
   */
  static changePassword = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

      if (!currentPassword || !newPassword) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Current password and new password are required");
      }

      logger.info(`🔐 Changing password for user: ${userId}`);

      await userProfileService.changePassword(userId, currentPassword, newPassword);

      const duration = Date.now() - startTime;
      logger.info(`✅ Password changed successfully in ${duration}ms`, {
        userId,
        duration
      });

      res.json({
        success: true,
        message: "Password changed successfully"
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error changing password after ${duration}ms`, {
        userId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      if (error.code === 'UNAUTHORIZED') {
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Current password is incorrect");
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to change password");
    }
  });

  /**
   * POST /users/me/request-deletion
   * Request account deletion
   */
  static requestAccountDeletion = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;

    try {
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const { reason } = req.body;

      logger.info(`🗑️ Account deletion requested for user: ${userId}`, {
        userId,
        reason: reason || 'No reason provided'
      });

      await userProfileService.requestAccountDeletion(userId, reason);

      const duration = Date.now() - startTime;
      logger.info(`✅ Account deletion requested successfully in ${duration}ms`, {
        userId,
        duration
      });

      res.json({
        success: true,
        message: "Account deletion request submitted successfully"
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error requesting account deletion after ${duration}ms`, {
        userId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to request account deletion");
    }
  });
}