/**
 * Contrôleur de facturation
 * Gère les plans d'abonnement et la facturation
 */

import { Response } from 'express';
import { logger } from 'firebase-functions';
import { asyncAuthHandler, asyncHandler } from '../../middleware/errorHandler';
import { billingService } from '../../services/billing/billing.service';
import { gracePeriodService } from '../../services/gracePeriod/gracePeriod.service';
import { collections } from '../../config/database';
import { AuthenticatedRequest } from '../../types/middleware.types';
import { extractClientIp } from '../../utils/validation';
import { AuthErrorHandler } from '../../utils/auth';
import { ERROR_CODES } from '../../common/constants';
import { TenantError } from '../../common/types';
import { GracePeriodSource } from '../../models/gracePeriod.model';

export class BillingController {


    /**
     * 
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
            const tenantId = req.tenantContext.tenant.id;
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
            const tenantId = req.tenantContext.tenant.id;
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

            // Appliquer le code promo si fourni
            if (promoCode) {
                try {
                    // Récupérer l'ID de l'abonnement actuel après le changement de plan
                    const subscriptionQuery = await collections.subscriptions
                        .where('tenantId', '==', tenantId)
                        .where('status', '==', 'active')
                        .limit(1)
                        .get();

                    if (!subscriptionQuery.empty) {
                        const subscriptionDoc = subscriptionQuery.docs[0];
                        await billingService.applyPromoCode(
                            subscriptionDoc.id,
                            promoCode,
                            req.user!.uid,
                            tenantId,
                            ipAddress,
                            req.get('User-Agent')
                        );
                    }
                } catch (promoError: any) {
                    logger.warn(`Failed to apply promo code ${promoCode}:`, promoError);
                    // Ne pas faire échouer le changement de plan pour un code promo invalide
                }
            }

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
            const tenantId = req.tenantContext.tenant.id;
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
            const tenantId = req.tenantContext.tenant.id;
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
            const tenantId = req.tenantContext.tenant.id;

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

    /**
     * Appliquer un code promo à un abonnement
     * POST /billing/apply-promo-code
     */
    static applyPromoCode = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
        try {
            const tenantId = req.tenantContext.tenantId;
            const { subscriptionId, promoCode } = req.body;
            const userId = req.user!.uid;
            const ipAddress = extractClientIp(req);
            const userAgent = req.get('User-Agent');

            if (!tenantId) {
                const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, 'Tenant ID requis');
            }

            if (!subscriptionId || !promoCode) {
                const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, 'Subscription ID et code promo requis');
            }

            const result = await billingService.applyPromoCode(
                subscriptionId,
                promoCode,
                userId,
                tenantId,
                ipAddress,
                userAgent
            );

            res.json({
                success: true,
                data: result,
                message: 'Code promo appliqué avec succès'
            });

        } catch (error: any) {
            const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
            logger.error('Erreur lors de l\'application du code promo:', error);

            if (error instanceof TenantError) {
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, error.message);
            }

            return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Erreur lors de l\'application du code promo');
        }
    });

    /**
     * Supprimer un code promo d'un abonnement
     * DELETE /billing/remove-promo-code/:subscriptionId
     */
    static removePromoCode = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { subscriptionId } = req.params;

            if (!subscriptionId) {
                const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, 'Subscription ID requis');
            }

            const result = await billingService.removePromoCode(subscriptionId);

            res.json({
                success: true,
                data: result,
                message: 'Code promo supprimé avec succès'
            });

        } catch (error: any) {
            const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
            logger.error('Erreur lors de la suppression du code promo:', error);

            if (error instanceof TenantError) {
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, error.message);
            }

            return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Erreur lors de la suppression du code promo');
        }
    });

    /**
     * Créer une période de grâce pour un utilisateur
     * POST /billing/create-grace-period
     */
    static createGracePeriod = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { userId, tenantId, durationDays, source } = req.body;

            if (!userId || !tenantId) {
                const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, 'User ID et Tenant ID requis');
            }

            const gracePeriod = await billingService.createGracePeriod(
                userId,
                tenantId,
                durationDays,
                source || GracePeriodSource.ADMIN_GRANTED
            );

            res.json({
                success: true,
                data: gracePeriod,
                message: 'Période de grâce créée avec succès'
            });

        } catch (error: any) {
            const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
            logger.error('Erreur lors de la création de la période de grâce:', error);

            if (error instanceof TenantError) {
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, error.message);
            }

            return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Erreur lors de la création de la période de grâce');
        }
    });

    /**
     * Étendre une période de grâce
     * PUT /billing/extend-grace-period/:gracePeriodId
     */
    static extendGracePeriod = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { gracePeriodId } = req.params;
            const { additionalDays, reason } = req.body;
            const extendedBy = req.user!.uid;

            if (!gracePeriodId || !additionalDays) {
                const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, 'Grace Period ID et jours additionnels requis');
            }

            const gracePeriod = await billingService.extendGracePeriod(
                gracePeriodId,
                additionalDays,
                extendedBy,
                reason
            );

            res.json({
                success: true,
                data: gracePeriod,
                message: 'Période de grâce étendue avec succès'
            });

        } catch (error: any) {
            const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
            logger.error('Erreur lors de l\'extension de la période de grâce:', error);

            if (error instanceof TenantError) {
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, error.message);
            }

            return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Erreur lors de l\'extension de la période de grâce');
        }
    });

    /**
     * Convertir une période de grâce en abonnement payant
     * POST /billing/convert-grace-period/:gracePeriodId
     */
    static convertGracePeriod = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { gracePeriodId } = req.params;
            const { planId, promoCodeId } = req.body;

            if (!gracePeriodId || !planId) {
                const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, 'Grace Period ID et Plan ID requis');
            }

            const subscription = await billingService.convertGracePeriod(
                gracePeriodId,
                planId,
                promoCodeId
            );

            res.json({
                success: true,
                data: subscription,
                message: 'Période de grâce convertie en abonnement avec succès'
            });

        } catch (error: any) {
            const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
            logger.error('Erreur lors de la conversion de la période de grâce:', error);

            if (error instanceof TenantError) {
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, error.message);
            }

            return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Erreur lors de la conversion de la période de grâce');
        }
    });

    /**
     * Migrer les utilisateurs existants du plan gratuit
     * POST /billing/migrate-existing-users
     */
    static migrateExistingUsers = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await billingService.migrateExistingUsers();

            res.json({
                success: true,
                data: result,
                message: `Migration terminée: ${result.migrated} utilisateurs migrés, ${result.failed} échecs`
            });

        } catch (error: any) {
            const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
            logger.error('Erreur lors de la migration des utilisateurs:', error);
            return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Erreur lors de la migration des utilisateurs');
        }
    });

    /**
     * Migrer un utilisateur spécifique
     * POST /billing/migrate-user
     */
    static migrateUser = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { userId, tenantId } = req.body;

            if (!userId || !tenantId) {
                const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, 'User ID et Tenant ID requis');
            }

            const result = await billingService.migrateUser(userId, tenantId);

            if (result.success) {
                res.json({
                    success: true,
                    data: result,
                    message: 'Utilisateur migré avec succès'
                });
            } else {
                const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
                return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, result.error || 'Échec de la migration');
            }

        } catch (error: any) {
            const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
            logger.error('Erreur lors de la migration de l\'utilisateur:', error);
            return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Erreur lors de la migration de l\'utilisateur');
        }
    });

    /**
     * Obtenir le statut de la période de grâce pour l'utilisateur connecté
     * GET /billing/my-grace-period-status
     */
    static getMyGracePeriodStatus = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user!.uid;
            const gracePeriod = await gracePeriodService.getActiveGracePeriod(userId);

            if (!gracePeriod) {
                res.json({
                    success: true,
                    data: {
                        hasActiveGracePeriod: false,
                        gracePeriod: null
                    }
                });
                return;
            }

            // Calculer les informations utiles
            const now = new Date();
            const daysRemaining = Math.max(0, Math.ceil((gracePeriod.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            const hoursRemaining = Math.max(0, Math.ceil((gracePeriod.endDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
            const progressPercentage = Math.min(100, Math.max(0,
                ((now.getTime() - gracePeriod.startDate.getTime()) /
                    (gracePeriod.endDate.getTime() - gracePeriod.startDate.getTime())) * 100
            ));

            const status = {
                hasActiveGracePeriod: true,
                gracePeriod,
                daysRemaining,
                hoursRemaining,
                progressPercentage: Math.round(progressPercentage),
                isExpiringSoon: daysRemaining <= 3,
                isOverdue: gracePeriod.endDate < now
            };

            res.json({
                success: true,
                data: status
            });

        } catch (error: any) {
            const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
            logger.error('Erreur lors de la récupération du statut de période de grâce:', error);
            return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Erreur lors de la récupération du statut');
        }
    });
}