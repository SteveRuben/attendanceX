/**
 * Routes pour la gestion des projets
 */

import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { rateLimit } from '../../middleware/rateLimit';
import { body, param, query } from 'express-validator';
import { ProjectController } from '../../controllers/timesheet';

const router = Router();

// Middleware d'authentification pour toutes les routes
router.use(authenticate);

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Créer un nouveau projet
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 */
router.post('/',
  requirePermission('create_project'),
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 50 }),
  validate([
    body('name').notEmpty().withMessage('Project name is required'),
    body('code').notEmpty().withMessage('Project code is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('clientId').optional().isString().withMessage('Client ID must be a string'),
    body('status').optional().isIn(['active', 'inactive', 'completed', 'on_hold']).withMessage('Invalid status'),
    body('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
    body('defaultHourlyRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
    body('billable').optional().isBoolean().withMessage('Billable must be a boolean'),
    body('assignedEmployees').optional().isArray().withMessage('Assigned employees must be an array'),
    body('activityCodes').optional().isArray().withMessage('Activity codes must be an array')
  ]),
  ProjectController.createProject
);

/**
 * @swagger
 * /api/projects/search:
 *   get:
 *     summary: Recherche avancée de projets
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 */
router.get('/search',
  requirePermission('view_project'),
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    query('billableOnly').optional().isBoolean().withMessage('Billable only must be a boolean')
  ]),
  ProjectController.searchProjects
);

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Obtenir les projets du tenant
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 */
router.get('/',
  requirePermission('view_project'),
  validate([
    query('status').optional().isIn(['active', 'inactive', 'completed', 'on_hold']).withMessage('Invalid status'),
    query('clientId').optional().isString().withMessage('Client ID must be a string'),
    query('assignedEmployeeId').optional().isString().withMessage('Employee ID must be a string'),
    query('billable').optional().isBoolean().withMessage('Billable must be a boolean'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
  ]),
  ProjectController.getTenantProjects
);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Obtenir un projet par ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id',
  requirePermission('view_project'),
  validate([
    param('id').notEmpty().withMessage('Project ID is required')
  ]),
  ProjectController.getProjectById
);

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Mettre à jour un projet
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id',
  requirePermission('edit_project'),
  validate([
    param('id').notEmpty().withMessage('Project ID is required'),
    body('name').optional().notEmpty().withMessage('Project name cannot be empty'),
    body('code').optional().notEmpty().withMessage('Project code cannot be empty'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('clientId').optional().isString().withMessage('Client ID must be a string'),
    body('status').optional().isIn(['active', 'inactive', 'completed', 'on_hold']).withMessage('Invalid status'),
    body('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
    body('defaultHourlyRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
    body('billable').optional().isBoolean().withMessage('Billable must be a boolean')
  ]),
  ProjectController.updateProject
);

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Supprimer un projet
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id',
  requirePermission('delete_project'),
  validate([
    param('id').notEmpty().withMessage('Project ID is required')
  ]),
  ProjectController.deleteProject
);

/**
 * @swagger
 * /api/projects/{id}/assign-employee:
 *   post:
 *     summary: Assigner un employé à un projet
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/assign-employee',
  requirePermission('edit_project'),
  validate([
    param('id').notEmpty().withMessage('Project ID is required'),
    body('employeeId').notEmpty().withMessage('Employee ID is required')
  ]),
  ProjectController.assignEmployee
);

/**
 * @swagger
 * /api/projects/{id}/remove-employee/{employeeId}:
 *   delete:
 *     summary: Retirer un employé d'un projet
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id/remove-employee/:employeeId',
  requirePermission('edit_project'),
  validate([
    param('id').notEmpty().withMessage('Project ID is required'),
    param('employeeId').notEmpty().withMessage('Employee ID is required')
  ]),
  ProjectController.removeEmployee
);

/**
 * @swagger
 * /api/projects/{id}/statistics:
 *   get:
 *     summary: Obtenir les statistiques d'un projet
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/statistics',
  requirePermission('view_project'),
  validate([
    param('id').notEmpty().withMessage('Project ID is required'),
    query('dateStart').optional().isISO8601().withMessage('Start date must be a valid date'),
    query('dateEnd').optional().isISO8601().withMessage('End date must be a valid date')
  ]),
  ProjectController.getProjectStats
);

/**
 * @swagger
 * /api/projects/employee/{employeeId}:
 *   get:
 *     summary: Obtenir les projets d'un employé
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 */
router.get('/employee/:employeeId',
  requirePermission('view_project'),
  validate([
    param('employeeId').notEmpty().withMessage('Employee ID is required'),
    query('status').optional().isIn(['active', 'inactive', 'completed', 'on_hold']).withMessage('Invalid status')
  ]),
  ProjectController.getEmployeeProjects
);

export { router as projectRoutes };