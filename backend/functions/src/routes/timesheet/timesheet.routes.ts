/**
 * Routes pour la gestion des feuilles de temps
 */

import { Router } from 'express';
import { TimesheetController } from '../../controllers/timesheet/timesheet.controller';
import { authenticate, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { rateLimit } from '../../middleware/rateLimit';
import { body, param, query } from 'express-validator';

const router = Router();

// Middleware d'authentification pour toutes les routes
router.use(authenticate);

/**
 * @swagger
 * /api/timesheets:
 *   post:
 *     summary: Créer une nouvelle feuille de temps
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - periodStart
 *               - periodEnd
 *             properties:
 *               employeeId:
 *                 type: string
 *               periodStart:
 *                 type: string
 *                 format: date
 *               periodEnd:
 *                 type: string
 *                 format: date
 *               periodType:
 *                 type: string
 *                 enum: [weekly, bi-weekly, monthly, custom]
 *     responses:
 *       201:
 *         description: Feuille de temps créée avec succès
 *       400:
 *         description: Données invalides
 */
router.post('/',
  requirePermission('create_timesheet'),
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 100 }),
  validate([
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('periodStart').isISO8601().withMessage('Period start must be a valid date (YYYY-MM-DD)'),
    body('periodEnd').isISO8601().withMessage('Period end must be a valid date (YYYY-MM-DD)'),
    body('periodType').optional().isIn(['weekly', 'bi-weekly', 'monthly', 'custom']).withMessage('Invalid period type')
  ]),
  TimesheetController.createTimesheet
);

/**
 * @swagger
 * /api/timesheets/search:
 *   get:
 *     summary: Recherche avancée de feuilles de temps
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.get('/search',
  requirePermission('view_timesheet'),
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    query('minHours').optional().isFloat({ min: 0 }).withMessage('Min hours must be a positive number'),
    query('maxHours').optional().isFloat({ min: 0 }).withMessage('Max hours must be a positive number'),
    query('billableOnly').optional().isBoolean().withMessage('Billable only must be a boolean')
  ]),
  TimesheetController.searchTimesheets
);

/**
 * @swagger
 * /api/timesheets/automatic:
 *   post:
 *     summary: Créer automatiquement des feuilles de temps pour une période
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.post('/automatic',
  requirePermission('create_timesheet'),
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 }),
  validate([
    body('periodStart').isISO8601().withMessage('Period start must be a valid date'),
    body('periodEnd').isISO8601().withMessage('Period end must be a valid date'),
    body('employeeIds').optional().isArray().withMessage('Employee IDs must be an array'),
    body('periodType').optional().isIn(['weekly', 'bi-weekly', 'monthly', 'custom']).withMessage('Invalid period type')
  ]),
  TimesheetController.createAutomaticTimesheets
);

/**
 * @swagger
 * /api/timesheets:
 *   get:
 *     summary: Obtenir les feuilles de temps du tenant
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.get('/',
  requirePermission('view_timesheet'),
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
  ]),
  TimesheetController.getTenantTimesheets
);

/**
 * @swagger
 * /api/timesheets/{id}:
 *   get:
 *     summary: Obtenir une feuille de temps par ID
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id',
  requirePermission('view_timesheet'),
  validate([
    param('id').notEmpty().withMessage('Timesheet ID is required')
  ]),
  TimesheetController.getTimesheetById
);

/**
 * @swagger
 * /api/timesheets/{id}:
 *   put:
 *     summary: Mettre à jour une feuille de temps
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id',
  requirePermission('edit_timesheet'),
  validate([
    param('id').notEmpty().withMessage('Timesheet ID is required'),
    body('periodStart').optional().isISO8601().withMessage('Period start must be a valid date'),
    body('periodEnd').optional().isISO8601().withMessage('Period end must be a valid date')
  ]),
  TimesheetController.updateTimesheet
);

/**
 * @swagger
 * /api/timesheets/{id}:
 *   delete:
 *     summary: Supprimer une feuille de temps
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id',
  requirePermission('delete_timesheet'),
  validate([
    param('id').notEmpty().withMessage('Timesheet ID is required')
  ]),
  TimesheetController.deleteTimesheet
);

// Routes de gestion des statuts

/**
 * @swagger
 * /api/timesheets/{id}/submit:
 *   post:
 *     summary: Soumettre une feuille de temps pour approbation
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/submit',
  requirePermission('submit_timesheet'),
  validate([
    param('id').notEmpty().withMessage('Timesheet ID is required')
  ]),
  TimesheetController.submitTimesheet
);

/**
 * @swagger
 * /api/timesheets/{id}/approve:
 *   post:
 *     summary: Approuver une feuille de temps
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/approve',
  requirePermission('approve_timesheet'),
  validate([
    param('id').notEmpty().withMessage('Timesheet ID is required'),
    body('comments').optional().isString().withMessage('Comments must be a string')
  ]),
  TimesheetController.approveTimesheet
);

/**
 * @swagger
 * /api/timesheets/{id}/reject:
 *   post:
 *     summary: Rejeter une feuille de temps
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/reject',
  requirePermission('approve_timesheet'),
  validate([
    param('id').notEmpty().withMessage('Timesheet ID is required'),
    body('reason').notEmpty().withMessage('Rejection reason is required')
  ]),
  TimesheetController.rejectTimesheet
);

/**
 * @swagger
 * /api/timesheets/{id}/return-to-draft:
 *   post:
 *     summary: Retourner une feuille de temps en brouillon
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/return-to-draft',
  requirePermission('edit_timesheet'),
  validate([
    param('id').notEmpty().withMessage('Timesheet ID is required')
  ]),
  TimesheetController.returnToDraft
);

/**
 * @swagger
 * /api/timesheets/{id}/lock:
 *   post:
 *     summary: Verrouiller une feuille de temps
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/lock',
  requirePermission('lock_timesheet'),
  validate([
    param('id').notEmpty().withMessage('Timesheet ID is required')
  ]),
  TimesheetController.lockTimesheet
);

/**
 * @swagger
 * /api/timesheets/{id}/unlock:
 *   post:
 *     summary: Déverrouiller une feuille de temps
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/unlock',
  requirePermission('lock_timesheet'),
  validate([
    param('id').notEmpty().withMessage('Timesheet ID is required')
  ]),
  TimesheetController.unlockTimesheet
);

// Routes utilitaires

/**
 * @swagger
 * /api/timesheets/{id}/calculate-totals:
 *   get:
 *     summary: Calculer les totaux d'une feuille de temps
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/calculate-totals',
  requirePermission('view_timesheet'),
  validate([
    param('id').notEmpty().withMessage('Timesheet ID is required')
  ]),
  TimesheetController.calculateTotals
);

/**
 * @swagger
 * /api/timesheets/{id}/validate:
 *   get:
 *     summary: Valider une feuille de temps
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/validate',
  requirePermission('view_timesheet'),
  validate([
    param('id').notEmpty().withMessage('Timesheet ID is required')
  ]),
  TimesheetController.validateTimesheet
);

// Routes pour les entrées de temps

/**
 * @swagger
 * /api/timesheets/{id}/entries:
 *   get:
 *     summary: Obtenir les entrées de temps d'une feuille de temps
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/entries',
  requirePermission('view_timesheet'),
  validate([
    param('id').notEmpty().withMessage('Timesheet ID is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('billable').optional().isBoolean().withMessage('Billable must be a boolean')
  ]),
  TimesheetController.getTimesheetEntries
);

/**
 * @swagger
 * /api/timesheets/{id}/entries:
 *   post:
 *     summary: Ajouter une entrée de temps à une feuille de temps
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/entries',
  requirePermission('create_time_entry'),
  validate([
    param('id').notEmpty().withMessage('Timesheet ID is required'),
    body('date').isISO8601().withMessage('Date must be a valid date'),
    body('duration').isFloat({ min: 1 }).withMessage('Duration must be a positive number'),
    body('description').notEmpty().withMessage('Description is required'),
    body('projectId').optional().isString().withMessage('Project ID must be a string'),
    body('activityCodeId').optional().isString().withMessage('Activity code ID must be a string'),
    body('startTime').optional().isISO8601().withMessage('Start time must be a valid date-time'),
    body('endTime').optional().isISO8601().withMessage('End time must be a valid date-time'),
    body('billable').optional().isBoolean().withMessage('Billable must be a boolean'),
    body('hourlyRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
    body('tags').optional().isArray().withMessage('Tags must be an array')
  ]),
  TimesheetController.addTimeEntry
);

/**
 * @swagger
 * /api/timesheets/{id}/entries/bulk:
 *   post:
 *     summary: Import en lot d'entrées de temps
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/entries/bulk',
  requirePermission('create_time_entry'),
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 }),
  validate([
    param('id').notEmpty().withMessage('Timesheet ID is required'),
    body('entries').isArray({ min: 1, max: 100 }).withMessage('Entries must be an array with 1-100 items')
  ]),
  TimesheetController.bulkImportTimeEntries
);

// Routes pour les employés

/**
 * @swagger
 * /api/timesheets/employee/{employeeId}:
 *   get:
 *     summary: Obtenir les feuilles de temps d'un employé
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 */
router.get('/employee/:employeeId',
  requirePermission('view_timesheet'),
  validate([
    param('employeeId').notEmpty().withMessage('Employee ID is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]),
  TimesheetController.getEmployeeTimesheets
);

export { router as timesheetRoutes };