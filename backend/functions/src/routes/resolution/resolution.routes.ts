import { Router } from "express";
import { body, query, param } from "express-validator";
import { authenticate, requirePermission } from "../../middleware/auth";
import { tenantContextMiddleware } from "../../middleware/tenant-context.middleware";
import { rateLimit } from "../../middleware/rateLimit";
import { ResolutionController } from "../../controllers/resolution/resolution.controller";
import { ResolutionStatus, ResolutionPriority } from "../../models/resolution.model";

const router = Router();

// 🔒 Authentification et contexte tenant requis
router.use(authenticate);
router.use(tenantContextMiddleware.injectTenantContext());
router.use(tenantContextMiddleware.validateTenantAccess());

// Rate limiting pour les opérations de création
const createRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // Maximum 20 créations par utilisateur
  message: "Too many resolution creation attempts, please try again later"
});

// Rate limiting pour les commentaires
const commentRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10, // Maximum 10 commentaires par utilisateur
  message: "Too many comments, please try again later"
});

/**
 * Créer une résolution pour un événement
 * POST /events/:eventId/resolutions
 */
router.post('/events/:eventId/resolutions',
  createRateLimit,
  requirePermission("create_resolutions"),
  [
    param('eventId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Event ID is required'),
    
    body('title')
      .isString()
      .isLength({ min: 3, max: 200 })
      .withMessage('Title must be between 3 and 200 characters'),
    
    body('description')
      .isString()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description must be between 10 and 2000 characters'),
    
    body('assignedTo')
      .isArray({ min: 1 })
      .withMessage('At least one assignee is required'),
    
    body('assignedTo.*')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Each assignee must be a valid user ID'),
    
    body('dueDate')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Due date must be a valid ISO 8601 date'),
    
    body('priority')
      .optional()
      .isIn(Object.values(ResolutionPriority))
      .withMessage('Invalid priority value'),
    
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    
    body('tags.*')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Each tag must not exceed 50 characters'),
    
    body('estimatedHours')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Estimated hours must be a positive number')
  ],
  ResolutionController.createResolution
);

/**
 * Obtenir les résolutions d'un événement
 * GET /events/:eventId/resolutions
 */
router.get('/events/:eventId/resolutions',
  requirePermission("view_resolutions"),
  [
    param('eventId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Event ID is required'),
    
    query('status')
      .optional()
      .isIn(Object.values(ResolutionStatus))
      .withMessage('Invalid status filter'),
    
    query('assignedTo')
      .optional()
      .isString()
      .withMessage('Assigned to must be a string'),
    
    query('priority')
      .optional()
      .isIn(Object.values(ResolutionPriority))
      .withMessage('Invalid priority filter'),
    
    query('overdue')
      .optional()
      .isBoolean()
      .withMessage('Overdue must be a boolean'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'title'])
      .withMessage('Invalid sort field'),
    
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],
  ResolutionController.getEventResolutions
);

/**
 * Obtenir une résolution par ID
 * GET /:resolutionId
 */
router.get('/:resolutionId',
  requirePermission("view_resolutions"),
  [
    param('resolutionId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Resolution ID is required')
  ],
  ResolutionController.getResolution
);

/**
 * Mettre à jour une résolution
 * PUT /:resolutionId
 */
router.put('/:resolutionId',
  requirePermission("edit_resolutions"),
  [
    param('resolutionId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Resolution ID is required'),
    
    body('title')
      .optional()
      .isString()
      .isLength({ min: 3, max: 200 })
      .withMessage('Title must be between 3 and 200 characters'),
    
    body('description')
      .optional()
      .isString()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description must be between 10 and 2000 characters'),
    
    body('assignedTo')
      .optional()
      .isArray({ min: 1 })
      .withMessage('At least one assignee is required'),
    
    body('assignedTo.*')
      .optional()
      .isString()
      .isLength({ min: 1 })
      .withMessage('Each assignee must be a valid user ID'),
    
    body('dueDate')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Due date must be a valid ISO 8601 date'),
    
    body('status')
      .optional()
      .isIn(Object.values(ResolutionStatus))
      .withMessage('Invalid status value'),
    
    body('priority')
      .optional()
      .isIn(Object.values(ResolutionPriority))
      .withMessage('Invalid priority value'),
    
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    
    body('progress')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Progress must be between 0 and 100'),
    
    body('actualHours')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Actual hours must be a positive number')
  ],
  ResolutionController.updateResolution
);

/**
 * Supprimer une résolution
 * DELETE /:resolutionId
 */
router.delete('/:resolutionId',
  requirePermission("delete_resolutions"),
  [
    param('resolutionId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Resolution ID is required')
  ],
  ResolutionController.deleteResolution
);

/**
 * Mettre à jour le statut d'une résolution
 * PUT /:resolutionId/status
 */
router.put('/:resolutionId/status',
  requirePermission("edit_resolutions"),
  [
    param('resolutionId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Resolution ID is required'),
    
    body('status')
      .isIn(Object.values(ResolutionStatus))
      .withMessage('Invalid status value')
  ],
  ResolutionController.updateResolutionStatus
);

/**
 * Mettre à jour le progrès d'une résolution
 * PUT /:resolutionId/progress
 */
router.put('/:resolutionId/progress',
  requirePermission("edit_resolutions"),
  [
    param('resolutionId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Resolution ID is required'),
    
    body('progress')
      .isFloat({ min: 0, max: 100 })
      .withMessage('Progress must be between 0 and 100')
  ],
  ResolutionController.updateResolutionProgress
);

/**
 * Ajouter un commentaire à une résolution
 * POST /:resolutionId/comments
 */
router.post('/:resolutionId/comments',
  commentRateLimit,
  requirePermission("comment_resolutions"),
  [
    param('resolutionId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Resolution ID is required'),
    
    body('content')
      .isString()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment content must be between 1 and 1000 characters')
  ],
  ResolutionController.addComment
);

/**
 * Obtenir les tâches assignées à l'utilisateur
 * GET /my-tasks
 */
router.get('/my-tasks',
  requirePermission("view_resolutions"),
  [
    query('status')
      .optional()
      .isIn(Object.values(ResolutionStatus))
      .withMessage('Invalid status filter'),
    
    query('priority')
      .optional()
      .isIn(Object.values(ResolutionPriority))
      .withMessage('Invalid priority filter'),
    
    query('overdue')
      .optional()
      .isBoolean()
      .withMessage('Overdue must be a boolean'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'title'])
      .withMessage('Invalid sort field'),
    
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],
  ResolutionController.getMyTasks
);

/**
 * Obtenir les statistiques des résolutions
 * GET /stats
 */
router.get('/stats',
  requirePermission("view_resolutions"),
  [
    query('eventId')
      .optional()
      .isString()
      .withMessage('Event ID must be a string'),
    
    query('period')
      .optional()
      .isIn(['week', 'month', 'quarter', 'year'])
      .withMessage('Period must be week, month, quarter, or year')
  ],
  ResolutionController.getResolutionStats
);

export { router as resolutionRoutes };