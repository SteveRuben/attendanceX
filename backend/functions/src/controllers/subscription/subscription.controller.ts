import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { subscriptionService } from "../../services/subscription/subscription.service";
import { AuthenticatedRequest } from "../../types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";
import { 
  CreateSubscriptionRequest, 
  UpdateSubscriptionRequest,
  SubscriptionStatus 
} from "../../common/types/subscription.types";

export class SubscriptionController {

  /**
   * POST /subscriptions
   * Create a new subscription
   */
  static createSubscription = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication and tenant context required");
      }

      const createRequest: CreateSubscriptionRequest = req.body;

      // Validation des champs requis
      if (!createRequest.planId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Plan ID is required");
      }

      logger.info(`🚀 Creating subscription for tenant: ${tenantId}`, {
        userId,
        tenantId,
        planId: createRequest.planId
      });

      const subscription = await subscriptionService.createSubscription(
        { ...createRequest, tenantId, createdBy: userId }, 
        tenantId, 
        userId
      );

      const duration = Date.now() - startTime;
      logger.info(`✅ Subscription created successfully: ${subscription.id} in ${duration}ms`, {
        subscriptionId: subscription.id,
        userId,
        tenantId,
        planId: subscription.planId,
        duration
      });

      res.status(201).json({
        success: true,
        message: "Subscription created successfully",
        data: subscription
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error creating subscription after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'CONFLICT') {
        return errorHandler.sendError(res, ERROR_CODES.CONFLICT, error.message);
      }

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to create subscription");
    }
  });

  /**
   * GET /subscriptions/:subscriptionId
   * Get subscription by ID
   */
  static getSubscription = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;
    const { subscriptionId } = req.params;

    try {
      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      logger.info(`🔍 Getting subscription: ${subscriptionId}`, {
        subscriptionId,
        userId,
        tenantId
      });

      const subscription = await subscriptionService.getSubscription(subscriptionId, tenantId);

      if (!subscription) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Subscription not found");
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ Subscription retrieved successfully in ${duration}ms`, {
        subscriptionId,
        userId,
        tenantId,
        duration
      });

      res.json({
        success: true,
        data: subscription
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error getting subscription after ${duration}ms`, {
        subscriptionId,
        userId,
        tenantId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get subscription");
    }
  });

  /**
   * GET /subscriptions/active
   * Get active subscription for current tenant
   */
  static getActiveSubscription = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      logger.info(`🔍 Getting active subscription for tenant: ${tenantId}`, {
        userId,
        tenantId
      });

      const subscription = await subscriptionService.getActiveSubscriptionByTenant(tenantId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Active subscription query completed in ${duration}ms`, {
        userId,
        tenantId,
        hasSubscription: !!subscription,
        duration
      });

      res.json({
        success: true,
        data: subscription
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error getting active subscription after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get active subscription");
    }
  });

  /**
   * PUT /subscriptions/:subscriptionId
   * Update subscription
   */
  static updateSubscription = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;
    const { subscriptionId } = req.params;
    const updateRequest: UpdateSubscriptionRequest = req.body;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication and tenant context required");
      }

      logger.info(`🔄 Updating subscription: ${subscriptionId}`, {
        subscriptionId,
        userId,
        tenantId,
        updates: Object.keys(updateRequest)
      });

      const subscription = await subscriptionService.updateSubscription(
        subscriptionId, 
        updateRequest, 
        tenantId, 
        userId
      );

      const duration = Date.now() - startTime;
      logger.info(`✅ Subscription updated successfully in ${duration}ms`, {
        subscriptionId,
        userId,
        tenantId,
        duration
      });

      res.json({
        success: true,
        message: "Subscription updated successfully",
        data: subscription
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error updating subscription after ${duration}ms`, {
        subscriptionId,
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to update subscription");
    }
  });

  /**
   * DELETE /subscriptions/:subscriptionId
   * Cancel subscription
   */
  static cancelSubscription = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;
    const { subscriptionId } = req.params;
    const { reason } = req.body;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication and tenant context required");
      }

      logger.info(`🚫 Cancelling subscription: ${subscriptionId}`, {
        subscriptionId,
        userId,
        tenantId,
        reason
      });

      await subscriptionService.cancelSubscription(subscriptionId, tenantId, userId, reason);

      const duration = Date.now() - startTime;
      logger.info(`✅ Subscription cancelled successfully in ${duration}ms`, {
        subscriptionId,
        userId,
        tenantId,
        duration
      });

      res.json({
        success: true,
        message: "Subscription cancelled successfully"
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error cancelling subscription after ${duration}ms`, {
        subscriptionId,
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to cancel subscription");
    }
  });

  /**
   * GET /subscriptions
   * Get all subscriptions for current tenant
   */
  static getSubscriptionsByTenant = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      // Parse query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100
      const status = req.query.status as SubscriptionStatus;

      logger.info(`🔍 Getting subscriptions for tenant: ${tenantId}`, {
        userId,
        tenantId,
        page,
        limit,
        status
      });

      const result = await subscriptionService.getSubscriptionsByTenant(tenantId, {
        page,
        limit,
        status
      });

      const duration = Date.now() - startTime;
      logger.info(`✅ Subscriptions retrieved successfully in ${duration}ms`, {
        userId,
        tenantId,
        count: result.subscriptions.length,
        total: result.pagination.total,
        duration
      });

      res.json({
        success: true,
        data: result.subscriptions,
        pagination: result.pagination
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error getting subscriptions after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get subscriptions");
    }
  });
}