/**
 * Contrôleur de facturation
 * Gère les plans d'abonnement et la facturation
 */

import { Response } from 'express';
import { logger } from 'firebase-functions';
import { asyncAuthHandler, asyncHandler } from '../../middleware/errorHandler';
import { billingService } from '../../services/billing/billing.service';
import { AuthenticatedRequest } from '../../types/middleware.types';
import { extractClientIp } from '../../utils/validation';
import { AuthErrorHandler } from '../../utils/auth';
import { ERROR_CODES } from '../../common/constants';
import { TenantError } from '../../common/types';

export class BillingController {


    /**
     * Obtenir tous les plans disponibles
     * GET /billing/plans
     */
    static getPlans = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        try {
            const plans = await billingService.getPlans();

            res.json({
                success: true,
                data: plans,
                message: 'Plans récupérés avec succès'
            });

        } catch (error: any) {
            const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
            logger.error('Erreur lors de la récupération des plans:', error);
            return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Erreur lors de la récupération des plans');
        }
    });

    /**
     * Obtenir l'abonnement actuel du tenant
     * GET /billing/subscription
     */
    static getCurrentSubscription = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
        try {
            const tenantId = req.tenantContext.tenantId;
            if (!tenantId) {
                const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, 'Tenant ID requis');
            }

            const subscription = await billingService.getCurrentSubscription(tenantId);

            res.json({
                success: true,
                data: subscription,
                message: 'Abonnement récupéré avec succès'
            });

        } catch (error: any) {
            const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
            logger.error('Erreur lors de la récupération de l\'abonnement:', error);

            if (error instanceof TenantError) {
                return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
            }

            return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Erreur lors de la récupération de l\'abonnement');
        }
    });

    /**
     * Changer de plan d'abonnement
     * POST /billing/change-plan
     */
    static changePlan = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
        try {
            const tenantId = req.tenantContext.tenantId;
            const { planId, billingCycle } = req.body;
            const ipAddress = extractClientIp(req);

            if (!tenantId) {
                const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, 'Tenant ID requis');
            }

            if (!planId) {
                const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, 'Plan ID requis');
            }

            const result = await billingService.changePlan(tenantId, planId, billingCycle, ipAddress);

            res.json({
                success: true,
                data: result,
                message: 'Plan modifié avec succès'
            });

        } catch (error: any) {
            const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
            logger.error('Erreur lors du changement de plan:', error);

            if (error instanceof TenantError) {
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, error.message);
            }

            return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Erreur lors du changement de plan');
        }
    });

    /**
     * Obtenir l'historique de facturation
     * GET /billing/history
     */
    static getBillingHistory = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
        try {
            const tenantId = req.tenantContext.tenantId;
            const { page = 1, limit = 20 } = req.query;

            if (!tenantId) {
                const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, 'Tenant ID requis');
            }

            const history = await billingService.getBillingHistory(tenantId, {
                page: parseInt(page as string),
                limit: parseInt(limit as string)
            });

            res.json({
                success: true,
                data: history,
                message: 'Historique de facturation récupéré avec succès'
            });

        } catch (error: any) {
            const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
            logger.error('Erreur lors de la récupération de l\'historique:', error);
            return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Erreur lors de la récupération de l\'historique');
        }
    });

    /**
     * Annuler l'abonnement
     * POST /billing/cancel
     */
    static cancelSubscription = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
        try {
            const tenantId = req.tenantContext.tenantId;
            const { reason } = req.body;
            const ipAddress = extractClientIp(req);

            if (!tenantId) {
                const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, 'Tenant ID requis');
            }

            const result = await billingService.cancelSubscription(tenantId, reason, ipAddress);

            res.json({
                success: true,
                data: result,
                message: 'Abonnement annulé avec succès'
            });

        } catch (error: any) {
            const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
            logger.error('Erreur lors de l\'annulation:', error);

            if (error instanceof TenantError) {
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, error.message);
            }

            return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Erreur lors de l\'annulation');
        }
    });

    /**
     * Obtenir les statistiques d'utilisation
     * GET /billing/usage
     */
    static getUsageStats = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
        try {
            const tenantId = req.tenantContext.tenantId;

            if (!tenantId) {
                const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, 'Tenant ID requis');
            }

            const usage = await billingService.getUsageStats(tenantId);

            res.json({
                success: true,
                data: usage,
                message: 'Statistiques d\'utilisation récupérées avec succès'
            });

        } catch (error: any) {
            const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
            logger.error('Erreur lors de la récupération des statistiques:', error);
            return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Erreur lors de la récupération des statistiques');
        }
    });
}