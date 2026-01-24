/**
 * Contrôleur pour la gestion des méthodes de paiement
 */

import { Response } from 'express';
import { logger } from 'firebase-functions';
import { asyncAuthHandler } from '../../middleware/errorHandler';
import { paymentMethodService, UpdatePaymentMethodRequest } from '../../services/billing/payment-method.service';
import { CreatePaymentMethodRequest } from '../../models/payment-method.model';
import { AuthenticatedRequest } from '../../types/middleware.types';
import { AuthErrorHandler } from '../../utils/auth';
import { ERROR_CODES } from '../../common/constants';
import { collections } from '../../config/database';

export class PaymentMethodController {

  /**
   * Créer une nouvelle méthode de paiement
   * POST /billing/payment-methods
   */
  static createPaymentMethod = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const createRequest: CreatePaymentMethodRequest = {
        ...req.body,
        tenantId // Force le tenantId depuis le contexte authentifié
      };

      // Validation des champs requis
      if (!createRequest.paymentProvider || !createRequest.type) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Payment provider and type are required");
      }

      logger.info(`🚀 Creating payment method: ${createRequest.type}`, {
        userId,
        tenantId,
        type: createRequest.type,
        provider: createRequest.paymentProvider
      });

      const paymentMethod = await paymentMethodService.createPaymentMethod(createRequest, userId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Payment method created successfully: ${paymentMethod.id} in ${duration}ms`, {
        paymentMethodId: paymentMethod.id,
        userId,
        tenantId,
        duration
      });

      res.status(201).json({
        success: true,
        message: "Payment method created successfully",
        data: paymentMethod
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error creating payment method after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to create payment method");
    }
  });

  /**
   * Obtenir une méthode de paiement spécifique
   * GET /billing/payment-methods/:paymentMethodId
   */
  static getPaymentMethod = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const paymentMethodId = req.params.paymentMethodId as string;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const paymentMethod = await paymentMethodService.getPaymentMethod(paymentMethodId, tenantId);

      if (!paymentMethod) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Payment method not found");
      }

      res.json({
        success: true,
        data: paymentMethod
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting payment method:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get payment method");
    }
  });

  /**
   * Obtenir toutes les méthodes de paiement du tenant
   * GET /billing/payment-methods
   */
  static getPaymentMethods = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      // Pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const offset = (page - 1) * limit;

      const paymentMethods = await paymentMethodService.getPaymentMethodsByTenant(tenantId, {
        limit,
        offset,
        sortBy: sortBy as 'createdAt' | 'updatedAt' | 'type',
        sortOrder
      });

      // Get total count for pagination metadata
      const totalSnapshot = await collections.payment_methods
        .where('tenantId', '==', tenantId)
        .get();
      const total = totalSnapshot.size;

      res.json({
        success: true,
        data: paymentMethods,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting payment methods:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get payment methods");
    }
  });

  /**
   * Mettre à jour une méthode de paiement
   * PUT /billing/payment-methods/:paymentMethodId
   */
  static updatePaymentMethod = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const paymentMethodId = req.params.paymentMethodId as string;
      const tenantId = req.user?.tenantId;
      const updateRequest: UpdatePaymentMethodRequest = req.body;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const paymentMethod = await paymentMethodService.updatePaymentMethod(paymentMethodId, updateRequest, tenantId);

      logger.info(`✅ Payment method updated: ${paymentMethodId}`, {
        paymentMethodId,
        tenantId,
        userId: req.user?.uid
      });

      res.json({
        success: true,
        message: "Payment method updated successfully",
        data: paymentMethod
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error updating payment method:", error);

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to update payment method");
    }
  });

  /**
   * Supprimer une méthode de paiement
   * DELETE /billing/payment-methods/:paymentMethodId
   */
  static deletePaymentMethod = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const paymentMethodId = req.params.paymentMethodId as string;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      await paymentMethodService.deletePaymentMethod(paymentMethodId, tenantId);

      logger.info(`🗑️ Payment method deleted: ${paymentMethodId}`, {
        paymentMethodId,
        tenantId,
        userId: req.user?.uid
      });

      res.json({
        success: true,
        message: "Payment method deleted successfully"
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error deleting payment method:", error);

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to delete payment method");
    }
  });
}