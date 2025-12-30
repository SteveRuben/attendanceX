import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../../middleware/validation";
import { rateLimit } from "../../middleware/rateLimit";
import { z } from "zod";
import { ResolutionController } from "../../controllers/resolution/resolution.controller";
import { ResolutionStatus, ResolutionPriority } from "../../models/resolution.model";

const router = Router();

// 🔒 Authentification requise pour toutes les routes
router.use(authenticate);

/**
 * Créer une résolution pour un événement
 * POST /events/:eventId/resolutions
 */
router.post('/events/:eventId/resolutions',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20,
  }),
  requirePermission("create_resolutions"),
  validateParams(z.object({
    eventId: z.string().min(1, "Event ID is required"),
  })),
  validateBody(z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(2000),
    assignedTo: z.array(z.string().min(1)).min(1),
    dueDate: z.string().datetime().optional(),
    priority: z.nativeEnum(ResolutionPriority).default(ResolutionPriority.MEDIUM),
    tags: z.array(z.string().max(50)).optional(),
    estimatedHours: z.number().min(0).optional(),
  })),
  ResolutionController.createResolution
);

/**
 * Obtenir les résolutions d'un événement
 * GET /events/:eventId/resolutions
 */
router.get('/events/:eventId/resolutions',
  requirePermission("view_resolutions"),
  validateParams(z.object({
    eventId: z.string().min(1, "Event ID is required"),
  })),
  validateQuery(z.object({
    status: z.nativeEnum(ResolutionStatus).optional(),
    assignedTo: z.string().optional(),
    priority: z.nativeEnum(ResolutionPriority).optional(),
    overdue: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'title']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })),
  ResolutionController.getEventResolutions
);

/**
 * Obtenir une résolution par ID
 * GET /:resolutionId
 */
router.get('/:resolutionId',
  requirePermission("view_resolutions"),
  validateParams(z.object({
    resolutionId: z.string().min(1, "Resolution ID is required"),
  })),
  ResolutionController.getResolution
);

/**
 * Mettre à jour une résolution
 * PUT /:resolutionId
 */
router.put('/:resolutionId',
  requirePermission("edit_resolutions"),
  validateParams(z.object({
    resolutionId: z.string().min(1, "Resolution ID is required"),
  })),
  validateBody(z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().min(10).max(2000).optional(),
    assignedTo: z.array(z.string().min(1)).min(1).optional(),
    dueDate: z.string().datetime().optional(),
    status: z.nativeEnum(ResolutionStatus).optional(),
    priority: z.nativeEnum(ResolutionPriority).optional(),
    tags: z.array(z.string().max(50)).optional(),
    progress: z.number().min(0).max(100).optional(),
    actualHours: z.number().min(0).optional(),
  })),
  ResolutionController.updateResolution
);

/**
 * Supprimer une résolution
 * DELETE /:resolutionId
 */
router.delete('/:resolutionId',
  requirePermission("delete_resolutions"),
  validateParams(z.object({
    resolutionId: z.string().min(1, "Resolution ID is required"),
  })),
  ResolutionController.deleteResolution
);

/**
 * Mettre à jour le statut d'une résolution
 * PUT /:resolutionId/status
 */
router.put('/:resolutionId/status',
  requirePermission("edit_resolutions"),
  validateParams(z.object({
    resolutionId: z.string().min(1, "Resolution ID is required"),
  })),
  validateBody(z.object({
    status: z.nativeEnum(ResolutionStatus),
  })),
  ResolutionController.updateResolutionStatus
);

/**
 * Mettre à jour le progrès d'une résolution
 * PUT /:resolutionId/progress
 */
router.put('/:resolutionId/progress',
  requirePermission("edit_resolutions"),
  validateParams(z.object({
    resolutionId: z.string().min(1, "Resolution ID is required"),
  })),
  validateBody(z.object({
    progress: z.number().min(0).max(100),
  })),
  ResolutionController.updateResolutionProgress
);

/**
 * Ajouter un commentaire à une résolution
 * POST /:resolutionId/comments
 */
router.post('/:resolutionId/comments',
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10,
  }),
  requirePermission("comment_resolutions"),
  validateParams(z.object({
    resolutionId: z.string().min(1, "Resolution ID is required"),
  })),
  validateBody(z.object({
    content: z.string().min(1).max(1000),
  })),
  ResolutionController.addComment
);

/**
 * Obtenir les tâches assignées à l'utilisateur
 * GET /my-tasks
 */
router.get('/my-tasks',
  requirePermission("view_resolutions"),
  validateQuery(z.object({
    status: z.nativeEnum(ResolutionStatus).optional(),
    priority: z.nativeEnum(ResolutionPriority).optional(),
    overdue: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'title']).default('dueDate'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })),
  ResolutionController.getMyTasks
);

/**
 * Obtenir les statistiques des résolutions
 * GET /stats
 */
router.get('/stats',
  requirePermission("view_resolutions"),
  validateQuery(z.object({
    eventId: z.string().optional(),
    period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
  })),
  ResolutionController.getResolutionStats
);

export { router as resolutionRoutes };