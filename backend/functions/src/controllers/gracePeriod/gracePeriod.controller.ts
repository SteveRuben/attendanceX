import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncHandler } from "../../middleware/errorHandler";
import { AuthenticatedRequest } from "../../types/middleware.types";
import { 
  ExtendGracePeriodRequest,
  ConvertGracePeriodRequest,
  GracePeriodSource,
  GracePeriodStatus
} from "../../models/gracePeriod.model";
import { 
  gracePeriodService,
  GracePeriodFilters,
  GracePeriodQueryOptions,
  GracePeriodConfig
} from "../../services/gracePeriod/gracePeriod.service";

/**
 * Contrôleur pour la gestion des périodes de grâce
 */
export class GracePeriodController {

  /**
   * Créer une nouvelle période de grâce
   * POST /api/v1/grace-periods
   */
  static createGracePeriod = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId, tenantId, durationDays, source, sourceDetails, metadata } = req.body;
    const adminUserId = req.user!.uid;

    // Validation de base
    if (!userId || !tenantId || !durationDays || !source) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userId, tenantId, durationDays, source"
      });
    }

    if (durationDays < 1 || durationDays > 365) {
      return res.status(400).json({
        success: false,
        error: "Duration must be between 1 and 365 days"
      });
    }

    try {
      const config: GracePeriodConfig = {
        durationDays,
        source: source as GracePeriodSource,
        sourceDetails: {
          ...sourceDetails,
          adminUserId: source === GracePeriodSource.ADMIN_GRANTED ? adminUserId : undefined
        },
        metadata
      };

      const gracePeriod = await gracePeriodService.createGracePeriod(userId, tenantId, config);

      logger.info(`Grace period created: ${gracePeriod.id} for user ${userId}`);

      return res.status(201).json({
        success: true,
        data: gracePeriod,
        message: "Grace period created successfully"
      });

    } catch (error: any) {
      logger.error("Error creating grace period:", error);

      if (error.message.includes("already has an active")) {
        return res.status(409).json({
          success: false,
          error: "User already has an active grace period"
        });
      }

      if (error.message.includes("validation")) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to create grace period"
      });
    }
  });

  /**
   * Obtenir une période de grâce par ID
   * GET /api/v1/grace-periods/:gracePeriodId
   */
  static getGracePeriod = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const gracePeriodId = req.params.gracePeriodId as string;

    try {
      const gracePeriod = await gracePeriodService.getGracePeriod(gracePeriodId);

      if (!gracePeriod) {
        return res.status(404).json({
          success: false,
          error: "Grace period not found"
        });
      }

      return res.json({
        success: true,
        data: gracePeriod
      });

    } catch (error: any) {
      logger.error("Error getting grace period:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get grace period"
      });
    }
  });

  /**
   * Obtenir la période de grâce active d'un utilisateur
   * GET /api/v1/grace-periods/user/:userId/active
   */
  static getActiveGracePeriod = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params.userId as string;

    try {
      const gracePeriod = await gracePeriodService.getActiveGracePeriod(userId);

      if (!gracePeriod) {
        return res.status(404).json({
          success: false,
          error: "No active grace period found for this user"
        });
      }

      return res.json({
        success: true,
        data: gracePeriod
      });

    } catch (error: any) {
      logger.error("Error getting active grace period:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get active grace period"
      });
    }
  });

  /**
   * Lister les périodes de grâce avec filtres et pagination
   * GET /api/v1/grace-periods
   */
  static listGracePeriods = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      status,
      source,
      userId,
      tenantId,
      expiringInDays,
      isOverdue,
      limit = "50",
      offset = "0",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    try {
      const filters: GracePeriodFilters = {
        status: status as GracePeriodStatus,
        source: source as GracePeriodSource,
        userId: userId as string,
        tenantId: tenantId as string,
        expiringInDays: expiringInDays ? parseInt(expiringInDays as string) : undefined,
        isOverdue: isOverdue === "true" ? true : isOverdue === "false" ? false : undefined
      };

      const options: GracePeriodQueryOptions = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as any,
        sortOrder: sortOrder as any
      };

      const result = await gracePeriodService.listGracePeriods(filters, options);

      return res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error("Error listing grace periods:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to list grace periods"
      });
    }
  });

  /**
   * Étendre une période de grâce
   * PUT /api/v1/grace-periods/:gracePeriodId/extend
   */
  static extendGracePeriod = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const gracePeriodId = req.params.gracePeriodId as string;
    const { additionalDays, reason } = req.body;
    const extendedBy = req.user!.uid;

    if (!additionalDays || additionalDays < 1 || additionalDays > 90) {
      return res.status(400).json({
        success: false,
        error: "Additional days must be between 1 and 90"
      });
    }

    try {
      const request: ExtendGracePeriodRequest = {
        additionalDays,
        extendedBy,
        reason
      };

      const gracePeriod = await gracePeriodService.extendGracePeriod(gracePeriodId, request);

      logger.info(`Grace period extended: ${gracePeriodId} by ${additionalDays} days`);

      return res.json({
        success: true,
        data: gracePeriod,
        message: "Grace period extended successfully"
      });

    } catch (error: any) {
      logger.error("Error extending grace period:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: "Grace period not found"
        });
      }

      if (error.message.includes("only extend active")) {
        return res.status(400).json({
          success: false,
          error: "Can only extend active grace periods"
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to extend grace period"
      });
    }
  });

  /**
   * Annuler une période de grâce
   * PUT /api/v1/grace-periods/:gracePeriodId/cancel
   */
  static cancelGracePeriod = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const gracePeriodId = req.params.gracePeriodId as string;
    const { reason } = req.body;

    try {
      await gracePeriodService.cancelGracePeriod(gracePeriodId, reason);

      logger.info(`Grace period cancelled: ${gracePeriodId}`);

      return res.json({
        success: true,
        message: "Grace period cancelled successfully"
      });

    } catch (error: any) {
      logger.error("Error cancelling grace period:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: "Grace period not found"
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to cancel grace period"
      });
    }
  });

  /**
   * Convertir une période de grâce en abonnement
   * POST /api/v1/grace-periods/:gracePeriodId/convert
   */
  static convertGracePeriod = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const gracePeriodId = req.params.gracePeriodId as string;
    const { planId, promoCodeId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: "Plan ID is required"
      });
    }

    try {
      const request: ConvertGracePeriodRequest = {
        planId,
        promoCodeId
      };

      const subscription = await gracePeriodService.convertToSubscription(gracePeriodId, request);

      logger.info(`Grace period converted: ${gracePeriodId} to plan ${planId}`);

      return res.json({
        success: true,
        data: subscription,
        message: "Grace period converted to subscription successfully"
      });

    } catch (error: any) {
      logger.error("Error converting grace period:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: "Grace period not found"
        });
      }

      if (error.message.includes("only convert active")) {
        return res.status(400).json({
          success: false,
          error: "Can only convert active grace periods"
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to convert grace period"
      });
    }
  });

  /**
   * Envoyer les rappels de période de grâce (job admin)
   * POST /api/v1/grace-periods/send-reminders
   */
  static sendGraceReminders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await gracePeriodService.sendGraceReminders();

      logger.info(`Grace reminders sent: ${result.sent} successful, ${result.failed} failed`);

      return res.json({
        success: true,
        data: result,
        message: "Grace reminders processing completed"
      });

    } catch (error: any) {
      logger.error("Error sending grace reminders:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to send grace reminders"
      });
    }
  });

  /**
   * Gérer les périodes de grâce expirées (job admin)
   * POST /api/v1/grace-periods/handle-expired
   */
  static handleExpiredGracePeriods = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await gracePeriodService.handleExpiredGracePeriods();

      logger.info(`Expired grace periods handled: ${result.expired} expired`);

      return res.json({
        success: true,
        data: result,
        message: "Expired grace periods processing completed"
      });

    } catch (error: any) {
      logger.error("Error handling expired grace periods:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to handle expired grace periods"
      });
    }
  });

  /**
   * Obtenir les statistiques des périodes de grâce
   * GET /api/v1/grace-periods/stats
   */
  static getGracePeriodStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.query;

    try {
      const filters = tenantId ? { tenantId: tenantId as string } : {};
      const stats = await gracePeriodService.getGracePeriodStats(filters);

      return res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      logger.error("Error getting grace period stats:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get grace period statistics"
      });
    }
  });

  /**
   * Obtenir le statut de la période de grâce pour l'utilisateur connecté
   * GET /api/v1/grace-periods/my-status
   */
  static getMyGracePeriodStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.uid;

    try {
      const gracePeriod = await gracePeriodService.getActiveGracePeriod(userId);

      if (!gracePeriod) {
        return res.json({
          success: true,
          data: {
            hasActiveGracePeriod: false,
            gracePeriod: null
          }
        });
      }

      // Calculer les informations utiles pour le frontend
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

      return res.json({
        success: true,
        data: status
      });

    } catch (error: any) {
      logger.error("Error getting my grace period status:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get grace period status"
      });
    }
  });

  /**
   * Obtenir l'historique des extensions d'une période de grâce
   * GET /api/v1/grace-periods/:gracePeriodId/extensions
   */
  static getGracePeriodExtensions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const gracePeriodId = req.params.gracePeriodId as string;

    try {
      const gracePeriod = await gracePeriodService.getGracePeriod(gracePeriodId);

      if (!gracePeriod) {
        return res.status(404).json({
          success: false,
          error: "Grace period not found"
        });
      }

      const extensions = gracePeriod.extensionHistory || [];
      const totalExtensionDays = extensions.reduce((sum, ext) => sum + ext.additionalDays, 0);

      return res.json({
        success: true,
        data: {
          extensions: extensions.sort((a, b) => b.extendedAt.getTime() - a.extendedAt.getTime()),
          totalExtensions: extensions.length,
          totalExtensionDays,
          originalEndDate: gracePeriod.originalEndDate,
          currentEndDate: gracePeriod.endDate
        }
      });

    } catch (error: any) {
      logger.error("Error getting grace period extensions:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get grace period extensions"
      });
    }
  });

  /**
   * Obtenir l'historique des notifications d'une période de grâce
   * GET /api/v1/grace-periods/:gracePeriodId/notifications
   */
  static getGracePeriodNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const gracePeriodId = req.params.gracePeriodId as string;

    try {
      const gracePeriod = await gracePeriodService.getGracePeriod(gracePeriodId);

      if (!gracePeriod) {
        return res.status(404).json({
          success: false,
          error: "Grace period not found"
        });
      }

      const notifications = gracePeriod.notificationsSent || [];

      return res.json({
        success: true,
        data: {
          notifications: notifications.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime()),
          totalNotifications: notifications.length,
          notificationTypes: [...new Set(notifications.map(n => n.type))]
        }
      });

    } catch (error: any) {
      logger.error("Error getting grace period notifications:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get grace period notifications"
      });
    }
  });

  /**
   * Obtenir les périodes de grâce expirant bientôt (dashboard admin)
   * GET /api/v1/grace-periods/expiring-soon
   */
  static getExpiringSoonGracePeriods = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { days = "7" } = req.query;

    try {
      const filters: GracePeriodFilters = {
        status: GracePeriodStatus.ACTIVE,
        expiringInDays: parseInt(days as string)
      };

      const result = await gracePeriodService.listGracePeriods(filters, { limit: 100 });

      return res.json({
        success: true,
        data: {
          gracePeriods: result.items,
          count: result.items.length,
          expiringInDays: parseInt(days as string)
        }
      });

    } catch (error: any) {
      logger.error("Error getting expiring soon grace periods:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get expiring grace periods"
      });
    }
  });
}