/**
 * Routes pour la gestion des codes d'activité
 */

import { Router } from 'express';
import { authenticate, requireTenantPermission } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { rateLimit } from '../../middleware/rateLimit';
import { body, param, query } from 'express-validator';
import { ActivityCodeController } from '../../controllers/timesheet';

const router = Router();

// Middleware d'authentification pour toutes les routes
router.use(authenticate);

/**
 * @swagger
 * /api/activity-codes:
 *   post:
 *     summary: Créer un nouveau code d'activité
 *     tags: [Activity Codes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/',
  requireTenantPermission('create_activity_code'),
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 100 }),
  validate([
    body('code').notEmpty().withMessage('Activity code is required'),
    body('name').notEmpty().withMessage('Activity name is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('parentId').optional().isString().withMessage('Parent ID must be a string'),
    body('billable').optional().isBoolean().withMessage('Billable must be a boolean'),
    body('defaultRate').optional().isFloat({ min: 0 }).withMessage('Default rate must be a positive number'),
    body('isActive').optional().isBoolean().withMessage('Is active must be a boolean'),
    body('projectSpecific').optional().isBoolean().withMessage('Project specific must be a boolean')
  ]),
  ActivityCodeController.createActivityCode
);

/**
 * @swagger
 * /api/activity-codes/search:
 *   get:
 *     summary: Recherche avancée de codes d'activité
 *     tags: [Activity Codes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/search',
  requireTenantPermission('view_activity_code'),
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    query('billableOnly').optional().isBoolean().withMessage('Billable only must be a boolean'),
    query('activeOnly').optional().isBoolean().withMessage('Active only must be a boolean'),
    query('projectSpecific').optional().isBoolean().withMessage('Project specific must be a boolean')
  ]),
  ActivityCodeController.searchActivityCodes
);

/**
 * @swagger
 * /api/activity-codes/hierarchy:
 *   get:
 *     summary: Obtenir la hiérarchie des codes d'activité
 *     tags: [Activity Codes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/hierarchy',
  requireTenantPermission('view_activity_code'),
  validate([
    query('isActive').optional().isBoolean().withMessage('Is active must be a boolean')
  ]),
  ActivityCodeController.getActivityCodeTree
);

/**
 * @swagger
 * /api/activity-codes:
 *   get:
 *     summary: Obtenir les codes d'activité du tenant
 *     tags: [Activity Codes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/',
  requireTenantPermission('view_activity_code'),
  validate([
    query('category').optional().isString().withMessage('Category must be a string'),
    query('billable').optional().isBoolean().withMessage('Billable must be a boolean'),
    query('isActive').optional().isBoolean().withMessage('Is active must be a boolean'),
    query('projectSpecific').optional().isBoolean().withMessage('Project specific must be a boolean'),
    query('parentId').optional().isString().withMessage('Parent ID must be a string'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
  ]),
  ActivityCodeController.getTenantActivityCodes
);

/**
 * @swagger
 * /api/activity-codes/{id}:
 *   get:
 *     summary: Obtenir un code d'activité par ID
 *     tags: [Activity Codes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id',
  requireTenantPermission('view_activity_code'),
  validate([
    param('id').notEmpty().withMessage('Activity code ID is required')
  ]),
  ActivityCodeController.getActivityCodeById
);

/**
 * @swagger
 * /api/activity-codes/{id}:
 *   put:
 *     summary: Mettre à jour un code d'activité
 *     tags: [Activity Codes]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id',
  requireTenantPermission('edit_activity_code'),
  validate([
    param('id').notEmpty().withMessage('Activity code ID is required'),
    body('code').optional().notEmpty().withMessage('Activity code cannot be empty'),
    body('name').optional().notEmpty().withMessage('Activity name cannot be empty'),
    body('category').optional().notEmpty().withMessage('Category cannot be empty'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('parentId').optional().isString().withMessage('Parent ID must be a string'),
    body('billable').optional().isBoolean().withMessage('Billable must be a boolean'),
    body('defaultRate').optional().isFloat({ min: 0 }).withMessage('Default rate must be a positive number'),
    body('isActive').optional().isBoolean().withMessage('Is active must be a boolean'),
    body('projectSpecific').optional().isBoolean().withMessage('Project specific must be a boolean')
  ]),
  ActivityCodeController.updateActivityCode
);

/**
 * @swagger
 * /api/activity-codes/{id}:
 *   delete:
 *     summary: Supprimer un code d'activité
 *     tags: [Activity Codes]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id',
  requireTenantPermission('delete_activity_code'),
  validate([
    param('id').notEmpty().withMessage('Activity code ID is required')
  ]),
  ActivityCodeController.deleteActivityCode
);

/**
 * @swagger
 * /api/activity-codes/{id}/assign-to-project:
 *   post:
 *     summary: Assigner un code d'activité à un projet
 *     tags: [Activity Codes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/assign-to-project',
  requireTenantPermission('edit_activity_code'),
  validate([
    param('id').notEmpty().withMessage('Activity code ID is required'),
    body('projectId').notEmpty().withMessage('Project ID is required')
  ]),
  ActivityCodeController.assignToProject
);

/**
 * @swagger
 * /api/activity-codes/{id}/remove-from-project/{projectId}:
 *   delete:
 *     summary: Retirer un code d'activité d'un projet
 *     tags: [Activity Codes]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id/remove-from-project/:projectId',
  requireTenantPermission('edit_activity_code'),
  validate([
    param('id').notEmpty().withMessage('Activity code ID is required'),
    param('projectId').notEmpty().withMessage('Project ID is required')
  ]),
  ActivityCodeController.removeFromProject
);

/**
 * @swagger
 * /api/activity-codes/{id}/statistics:
 *   get:
 *     summary: Obtenir les statistiques d'un code d'activité
 *     tags: [Activity Codes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/statistics',
  requireTenantPermission('view_activity_code'),
  validate([
    param('id').notEmpty().withMessage('Activity code ID is required'),
    query('dateStart').optional().isISO8601().withMessage('Start date must be a valid date'),
    query('dateEnd').optional().isISO8601().withMessage('End date must be a valid date')
  ]),
  ActivityCodeController.getActivityCodeStats
);

/**
 * @swagger
 * /api/activity-codes/project/{projectId}:
 *   get:
 *     summary: Obtenir les codes d'activité d'un projet
 *     tags: [Activity Codes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/project/:projectId',
  requireTenantPermission('view_activity_code'),
  validate([
    param('projectId').notEmpty().withMessage('Project ID is required')
  ]),
  ActivityCodeController.getProjectActivityCodes
);

export { router as activityCodeRoutes };