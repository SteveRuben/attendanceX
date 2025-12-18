/**
 * Routes pour la gestion des entrées de temps
 */

import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { rateLimit } from '../../middleware/rateLimit';
import { body, param, query } from 'express-validator';
import { TimeEntryController } from '../../controllers/timesheet';

const router = Router();

// Middleware d'authentification pour toutes les routes
router.use(authenticate);

/**
 * @swagger
 * /api/time-entries:
 *   post:
 *     summary: Créer une nouvelle entrée de temps
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
router.post('/',
  requirePermission('create_time_entry'),
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 200 }),
  validate([
    body('timesheetId').notEmpty().withMessage('Timesheet ID is required'),
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('date').isISO8601().withMessage('Date must be a valid date (YYYY-MM-DD)'),
    body('duration').isFloat({ min: 1 }).withMessage('Duration must be a positive number'),
    body('description').notEmpty().isLength({ min: 1, max: 1000 }).withMessage('Description is required and must be between 1 and 1000 characters'),
    body('projectId').optional().isString().withMessage('Project ID must be a string'),
    body('activityCodeId').optional().isString().withMessage('Activity code ID must be a string'),
    body('startTime').optional().isISO8601().withMessage('Start time must be a valid date-time'),
    body('endTime').optional().isISO8601().withMessage('End time must be a valid date-time'),
    body('billable').optional().isBoolean().withMessage('Billable must be a boolean'),
    body('hourlyRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
    body('tags').optional().isArray().withMessage('Tags must be an array')
  ]),
  TimeEntryController.createTimeEntry
);

/**
 * @swagger
 * /api/time-entries/search:
 *   get:
 *     summary: Recherche avancée d'entrées de temps
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
router.get('/search',
  requirePermission('view_time_entry'),
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    query('minDuration').optional().isInt({ min: 0 }).withMessage('Min duration must be a positive integer'),
    query('maxDuration').optional().isInt({ min: 0 }).withMessage('Max duration must be a positive integer'),
    query('billableOnly').optional().isBoolean().withMessage('Billable only must be a boolean')
  ]),
  TimeEntryController.searchTimeEntries
);

/**
 * @swagger
 * /api/time-entries/bulk:
 *   post:
 *     summary: Import en lot d'entrées de temps
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
router.post('/bulk',
  requirePermission('create_time_entry'),
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 }),
  validate([
    body('entries').isArray({ min: 1, max: 1000 }).withMessage('Entries must be an array with 1-1000 items'),
    body('timesheetId').optional().isString().withMessage('Timesheet ID must be a string'),
    body('validateOnly').optional().isBoolean().withMessage('Validate only must be a boolean')
  ]),
  TimeEntryController.bulkImportTimeEntries
);

/**
 * @swagger
 * /api/time-entries/export:
 *   get:
 *     summary: Exporter les entrées de temps
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
router.get('/export',
  requirePermission('export_time_entry'),
  rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 20 }),
  validate([
    query('format').optional().isIn(['csv', 'excel', 'json']).withMessage('Format must be csv, excel, or json'),
    query('billableOnly').optional().isBoolean().withMessage('Billable only must be a boolean')
  ]),
  TimeEntryController.exportTimeEntries
);

/**
 * @swagger
 * /api/time-entries/statistics:
 *   get:
 *     summary: Obtenir les statistiques des entrées de temps
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics',
  requirePermission('view_time_entry'),
  validate([
    query('groupBy').optional().isIn(['day', 'week', 'month', 'project', 'activity']).withMessage('Group by must be day, week, month, project, or activity')
  ]),
  TimeEntryController.getTimeEntryStatistics
);

/**
 * @swagger
 * /api/time-entries/calculate-duration:
 *   post:
 *     summary: Calculer la durée à partir des heures de début et fin
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
router.post('/calculate-duration',
  requirePermission('view_time_entry'),
  validate([
    body('startTime').isISO8601().withMessage('Start time must be a valid date-time'),
    body('endTime').isISO8601().withMessage('End time must be a valid date-time')
  ]),
  TimeEntryController.calculateDuration
);

/**
 * @swagger
 * /api/time-entries/detect-conflicts:
 *   get:
 *     summary: Détecter les conflits d'horaires
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
router.get('/detect-conflicts',
  requirePermission('view_time_entry'),
  validate([
    query('employeeId').notEmpty().withMessage('Employee ID is required'),
    query('date').isISO8601().withMessage('Date must be a valid date'),
    query('startTime').isISO8601().withMessage('Start time must be a valid date-time'),
    query('endTime').isISO8601().withMessage('End time must be a valid date-time'),
    query('excludeEntryId').optional().isString().withMessage('Exclude entry ID must be a string')
  ]),
  TimeEntryController.detectTimeConflicts
);

/**
 * @swagger
 * /api/time-entries:
 *   get:
 *     summary: Obtenir les entrées de temps du tenant
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
router.get('/',
  requirePermission('view_time_entry'),
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    query('billable').optional().isBoolean().withMessage('Billable must be a boolean')
  ]),
  TimeEntryController.getTenantTimeEntries
);

/**
 * @swagger
 * /api/time-entries/{id}:
 *   get:
 *     summary: Obtenir une entrée de temps par ID
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id',
  requirePermission('view_time_entry'),
  validate([
    param('id').notEmpty().withMessage('Time entry ID is required')
  ]),
  TimeEntryController.getTimeEntryById
);

/**
 * @swagger
 * /api/time-entries/{id}:
 *   put:
 *     summary: Mettre à jour une entrée de temps
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id',
  requirePermission('edit_time_entry'),
  validate([
    param('id').notEmpty().withMessage('Time entry ID is required'),
    body('projectId').optional().isString().withMessage('Project ID must be a string'),
    body('activityCodeId').optional().isString().withMessage('Activity code ID must be a string'),
    body('date').optional().isISO8601().withMessage('Date must be a valid date'),
    body('startTime').optional().isISO8601().withMessage('Start time must be a valid date-time'),
    body('endTime').optional().isISO8601().withMessage('End time must be a valid date-time'),
    body('duration').optional().isFloat({ min: 1 }).withMessage('Duration must be a positive number'),
    body('description').optional().isLength({ min: 1, max: 1000 }).withMessage('Description must be between 1 and 1000 characters'),
    body('billable').optional().isBoolean().withMessage('Billable must be a boolean'),
    body('hourlyRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
    body('tags').optional().isArray().withMessage('Tags must be an array')
  ]),
  TimeEntryController.updateTimeEntry
);

/**
 * @swagger
 * /api/time-entries/{id}:
 *   delete:
 *     summary: Supprimer une entrée de temps
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id',
  requirePermission('delete_time_entry'),
  validate([
    param('id').notEmpty().withMessage('Time entry ID is required')
  ]),
  TimeEntryController.deleteTimeEntry
);

/**
 * @swagger
 * /api/time-entries/{id}/duplicate:
 *   post:
 *     summary: Dupliquer une entrée de temps
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/duplicate',
  requirePermission('create_time_entry'),
  validate([
    param('id').notEmpty().withMessage('Time entry ID is required'),
    body('newDate').isISO8601().withMessage('New date must be a valid date'),
    body('newTimesheetId').optional().isString().withMessage('New timesheet ID must be a string')
  ]),
  TimeEntryController.duplicateTimeEntry
);

/**
 * @swagger
 * /api/time-entries/{id}/validate:
 *   get:
 *     summary: Valider une entrée de temps
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/validate',
  requirePermission('view_time_entry'),
  validate([
    param('id').notEmpty().withMessage('Time entry ID is required')
  ]),
  TimeEntryController.validateTimeEntry
);

// Routes pour les employés

/**
 * @swagger
 * /api/time-entries/employee/{employeeId}:
 *   get:
 *     summary: Obtenir les entrées de temps d'un employé
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 */
router.get('/employee/:employeeId',
  requirePermission('view_time_entry'),
  validate([
    param('employeeId').notEmpty().withMessage('Employee ID is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('billable').optional().isBoolean().withMessage('Billable must be a boolean')
  ]),
  TimeEntryController.getEmployeeTimeEntries
);

export { router as timeEntryRoutes };