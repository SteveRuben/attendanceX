import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncHandler } from "../../middleware/errorHandler";
import { AuthenticatedRequest } from "../../types/middleware.types";
import { 
  CreateResolutionRequest, 
  UpdateResolutionRequest,
  ResolutionStatus,
  ResolutionPriority 
} from "../../models/resolution.model";
import { ResolutionService } from "../../services/resolution/resolution.service";

/**
 * Contrôleur pour la gestion des résolutions de réunion
 */
export class ResolutionController {

  /**
   * Créer une nouvelle résolution
   * POST /events/:eventId/resolutions
   */
  static createResolution = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    const userId = req.user!.uid;
    const tenantId = req.tenantContext!.tenant.id;
    const createRequest: CreateResolutionRequest = req.body;

    logger.info(`Creating resolution for event ${eventId} by user ${userId}`);

    // Validation de base
    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: "Event ID is required"
      });
    }

    try {
      const resolution = await ResolutionService.createResolution(
        { ...createRequest, eventId },
        userId,
        tenantId
      );

      logger.info(`Resolution created successfully: ${resolution.id}`);

      return res.status(201).json({
        success: true,
        data: resolution,
        message: "Resolution created successfully"
      });

    } catch (error: any) {
      logger.error("Error creating resolution:", error);

      if (error.message.includes("Event not found")) {
        return res.status(404).json({
          success: false,
          error: "Event not found"
        });
      }

      if (error.message.includes("not a meeting")) {
        return res.status(400).json({
          success: false,
          error: "Resolutions can only be created for meeting events"
        });
      }

      if (error.message.includes("Permission denied")) {
        return res.status(403).json({
          success: false,
          error: "You don't have permission to create resolutions for this event"
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to create resolution"
      });
    }
  });

  /**
   * Obtenir les résolutions d'un événement
   * GET /events/:eventId/resolutions
   */
  static getEventResolutions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    const tenantId = req.tenantContext!.tenant.id;
    const userId = req.user!.uid;

    // Paramètres de requête
    const {
      status,
      assignedTo,
      priority,
      overdue,
      limit = "50",
      offset = "0",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    try {
      const filters = {
        status: status as ResolutionStatus,
        assignedTo: assignedTo as string,
        priority: priority as ResolutionPriority,
        overdue: overdue === "true",
      };

      const options = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      const result = await ResolutionService.getEventResolutions(
        eventId,
        tenantId,
        userId,
        filters,
        options
      );

      return res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error("Error getting event resolutions:", error);

      if (error.message.includes("Event not found")) {
        return res.status(404).json({
          success: false,
          error: "Event not found"
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to get resolutions"
      });
    }
  });

  /**
   * Obtenir une résolution par ID
   * GET /resolutions/:resolutionId
   */
  static getResolution = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { resolutionId } = req.params;
    const tenantId = req.tenantContext!.tenant.id;
    const userId = req.user!.uid;

    try {
      const resolution = await ResolutionService.getResolution(resolutionId, tenantId, userId);

      if (!resolution) {
        return res.status(404).json({
          success: false,
          error: "Resolution not found"
        });
      }

      return res.json({
        success: true,
        data: resolution
      });

    } catch (error: any) {
      logger.error("Error getting resolution:", error);

      if (error.message.includes("Permission denied")) {
        return res.status(403).json({
          success: false,
          error: "You don't have permission to view this resolution"
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to get resolution"
      });
    }
  });

  /**
   * Mettre à jour une résolution
   * PUT /resolutions/:resolutionId
   */
  static updateResolution = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { resolutionId } = req.params;
    const tenantId = req.tenantContext!.tenant.id;
    const userId = req.user!.uid;
    const updateRequest: UpdateResolutionRequest = req.body;

    try {
      const resolution = await ResolutionService.updateResolution(
        resolutionId,
        updateRequest,
        userId,
        tenantId
      );

      logger.info(`Resolution ${resolutionId} updated by user ${userId}`);

      return res.json({
        success: true,
        data: resolution,
        message: "Resolution updated successfully"
      });

    } catch (error: any) {
      logger.error("Error updating resolution:", error);

      if (error.message.includes("Resolution not found")) {
        return res.status(404).json({
          success: false,
          error: "Resolution not found"
        });
      }

      if (error.message.includes("Permission denied")) {
        return res.status(403).json({
          success: false,
          error: "You don't have permission to update this resolution"
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to update resolution"
      });
    }
  });

  /**
   * Supprimer une résolution
   * DELETE /resolutions/:resolutionId
   */
  static deleteResolution = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { resolutionId } = req.params;
    const tenantId = req.tenantContext!.tenant.id;
    const userId = req.user!.uid;

    try {
      await ResolutionService.deleteResolution(resolutionId, userId, tenantId);

      logger.info(`Resolution ${resolutionId} deleted by user ${userId}`);

      return res.json({
        success: true,
        message: "Resolution deleted successfully"
      });

    } catch (error: any) {
      logger.error("Error deleting resolution:", error);

      if (error.message.includes("Resolution not found")) {
        return res.status(404).json({
          success: false,
          error: "Resolution not found"
        });
      }

      if (error.message.includes("Permission denied")) {
        return res.status(403).json({
          success: false,
          error: "You don't have permission to delete this resolution"
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to delete resolution"
      });
    }
  });

  /**
   * Mettre à jour le statut d'une résolution
   * PUT /resolutions/:resolutionId/status
   */
  static updateResolutionStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { resolutionId } = req.params;
    const { status } = req.body;
    const tenantId = req.tenantContext!.tenant.id;
    const userId = req.user!.uid;

    if (!Object.values(ResolutionStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status value"
      });
    }

    try {
      const resolution = await ResolutionService.updateResolutionStatus(
        resolutionId,
        status,
        userId,
        tenantId
      );

      logger.info(`Resolution ${resolutionId} status updated to ${status} by user ${userId}`);

      return res.json({
        success: true,
        data: resolution,
        message: "Resolution status updated successfully"
      });

    } catch (error: any) {
      logger.error("Error updating resolution status:", error);

      if (error.message.includes("Resolution not found")) {
        return res.status(404).json({
          success: false,
          error: "Resolution not found"
        });
      }

      if (error.message.includes("Permission denied")) {
        return res.status(403).json({
          success: false,
          error: "You don't have permission to update this resolution"
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to update resolution status"
      });
    }
  });

  /**
   * Mettre à jour le progrès d'une résolution
   * PUT /resolutions/:resolutionId/progress
   */
  static updateResolutionProgress = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { resolutionId } = req.params;
    const { progress } = req.body;
    const tenantId = req.tenantContext!.tenant.id;
    const userId = req.user!.uid;

    if (typeof progress !== "number" || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        error: "Progress must be a number between 0 and 100"
      });
    }

    try {
      const resolution = await ResolutionService.updateResolutionProgress(
        resolutionId,
        progress,
        userId,
        tenantId
      );

      logger.info(`Resolution ${resolutionId} progress updated to ${progress}% by user ${userId}`);

      return res.json({
        success: true,
        data: resolution,
        message: "Resolution progress updated successfully"
      });

    } catch (error: any) {
      logger.error("Error updating resolution progress:", error);

      if (error.message.includes("Resolution not found")) {
        return res.status(404).json({
          success: false,
          error: "Resolution not found"
        });
      }

      if (error.message.includes("Permission denied")) {
        return res.status(403).json({
          success: false,
          error: "You don't have permission to update this resolution"
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to update resolution progress"
      });
    }
  });

  /**
   * Ajouter un commentaire à une résolution
   * POST /resolutions/:resolutionId/comments
   */
  static addComment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { resolutionId } = req.params;
    const { content } = req.body;
    const tenantId = req.tenantContext!.tenant.id;
    const userId = req.user!.uid;
    const userName =  req.user!.email || "Unknown User";

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Comment content is required"
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        error: "Comment content must not exceed 1000 characters"
      });
    }

    try {
      const resolution = await ResolutionService.addComment(
        resolutionId,
        userId,
        userName,
        content.trim(),
        tenantId
      );

      logger.info(`Comment added to resolution ${resolutionId} by user ${userId}`);

      return res.status(201).json({
        success: true,
        data: resolution,
        message: "Comment added successfully"
      });

    } catch (error: any) {
      logger.error("Error adding comment:", error);

      if (error.message.includes("Resolution not found")) {
        return res.status(404).json({
          success: false,
          error: "Resolution not found"
        });
      }

      if (error.message.includes("Permission denied")) {
        return res.status(403).json({
          success: false,
          error: "You don't have permission to comment on this resolution"
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to add comment"
      });
    }
  });

  /**
   * Obtenir les tâches assignées à l'utilisateur
   * GET /resolutions/my-tasks
   */
  static getMyTasks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.uid;
    const tenantId = req.tenantContext!.tenant.id;

    // Paramètres de requête
    const {
      status,
      priority,
      overdue,
      limit = "50",
      offset = "0",
      sortBy = "dueDate",
      sortOrder = "asc"
    } = req.query;

    try {
      const filters = {
        status: status as ResolutionStatus,
        priority: priority as ResolutionPriority,
        overdue: overdue === "true",
      };

      const options = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      const result = await ResolutionService.getUserTasks(
        userId,
        tenantId,
        filters,
        options
      );

      return res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error("Error getting user tasks:", error);

      return res.status(500).json({
        success: false,
        error: "Failed to get tasks"
      });
    }
  });

  /**
   * Obtenir les statistiques des résolutions
   * GET /resolutions/stats
   */
  static getResolutionStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantContext!.tenant.id;
    const userId = req.user!.uid;
    const { eventId, period = "month" } = req.query;

    try {
      const stats = await ResolutionService.getResolutionStats(
        tenantId,
        userId,
        eventId as string,
        period as string
      );

      return res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      logger.error("Error getting resolution stats:", error);

      return res.status(500).json({
        success: false,
        error: "Failed to get resolution statistics"
      });
    }
  });
}