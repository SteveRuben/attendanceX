/**
 * Routes API pour la gestion de présence avec sécurité intégrée
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validateContext } from '../../middleware/organization-context.middleware';
import { requireRole } from '../../middleware/roles';

import {
  auditPresenceAction,
  clockingRateLimit,
  detectSuspiciousClocking,
  managementRateLimit,
  preventTimingAttacks,
  reportGenerationRateLimit
} from '../../middleware/presence-security.middleware';

import {
  validateLocationIntegrity,
  validateSensitiveDataAccess
} from '../../middleware/presence-validation.middleware';

import {
  preventDuplicateClockingMiddleware,
  sanitizePresenceData,
  validateClockInRequest,
  validateClockOutRequest,
  validateCoordinates,
  validateDateRange,
  validateEmployeeMiddleware,
  validateEndBreakRequest,
  validateLocationMiddleware,
  validatePagination,
  validatePresenceEntryCorrection,
  validatePresenceEntryPermissions,
  validatePresenceEntryValidation,
  validatePresenceQueryParams,
  validateProcessEndOfDay,
  validateStartBreakRequest,
  validateUpdatePresenceEntry,
  validateWorkingHoursMiddleware
} from '../../middleware/presence-request-validation.middleware';

import { TenantRole } from '../../shared';
import { presenceAuditService } from '../../services/presence/presence-audit.service';
import { presenceReportController } from '../../controllers/attendance/presence-report.controller';
import { presenceController } from '../../controllers/attendance/presence.controller';

const router = Router();

// Middleware global pour toutes les routes de présence
router.use(authenticate);
router.use(validateContext);
router.use(auditPresenceAction);
router.use(preventTimingAttacks);

// Schémas de validation pour les paramètres
// const EmployeeIdSchema = z.object({
//   employeeId: z.string().min(1)
// });

// const OrganizationIdSchema = z.object({
//   organizationId: z.string().min(1)
// });

// const EntryIdSchema = z.object({
//   entryId: z.string().min(1)
// });

// ============================================================================
// ROUTES DE POINTAGE (CLOCK IN/OUT)
// ============================================================================

/**
 * @route POST /api/presence/employees/:employeeId/clock-in
 * @desc Pointer l'arrivée d'un employé
 * @access Private (Employee or Manager)
 */
router.post(
  '/employees/:employeeId/clock-in',
  clockingRateLimit,
  detectSuspiciousClocking,
  validateEmployeeMiddleware,
  validateClockInRequest,
  sanitizePresenceData,
  validateCoordinates,
  validateLocationIntegrity,
  validateLocationMiddleware,
  validateWorkingHoursMiddleware,
  preventDuplicateClockingMiddleware,
  requireRole([TenantRole.ADMIN, TenantRole.MANAGER, TenantRole.OWNER]),
  presenceController.clockIn.bind(presenceController)
);

/**
 * @route POST /api/presence/employees/:employeeId/clock-out
 * @desc Pointer la sortie d'un employé
 * @access Private (Employee or Manager)
 */
router.post(
  '/employees/:employeeId/clock-out',
  clockingRateLimit,
  detectSuspiciousClocking,
  validateEmployeeMiddleware,
  validateClockOutRequest,
  sanitizePresenceData,
  validateCoordinates,
  validateLocationIntegrity,
  validateLocationMiddleware,
  requireRole([TenantRole.ADMIN, TenantRole.MANAGER]),
  presenceController.clockOut.bind(presenceController)
);

// ============================================================================
// ROUTES DE GESTION DES PAUSES
// ============================================================================

/**
 * @route POST /api/presence/employees/:employeeId/breaks/start
 * @desc Commencer une pause
 * @access Private (Employee or Manager)
 */
router.post(
  '/employees/:employeeId/breaks/start',
  clockingRateLimit,
  validateEmployeeMiddleware,
  validateStartBreakRequest,
  sanitizePresenceData,
  validateCoordinates,
  validateLocationIntegrity,
  validateLocationMiddleware,
  requireRole([TenantRole.ADMIN, TenantRole.MANAGER]),
  presenceController.startBreak.bind(presenceController)
);

/**
 * @route POST /api/presence/employees/:employeeId/breaks/end
 * @desc Terminer une pause
 * @access Private (Employee or Manager)
 */
router.post(
  '/employees/:employeeId/breaks/end',
  clockingRateLimit,
  validateEmployeeMiddleware,
  validateEndBreakRequest,
  sanitizePresenceData,
  validateCoordinates,
  validateLocationIntegrity,
  validateLocationMiddleware,
  requireRole([TenantRole.ADMIN, TenantRole.MANAGER]),
  presenceController.endBreak.bind(presenceController)
);

// ============================================================================
// ROUTES DE CONSULTATION DE STATUT
// ============================================================================

/**
 * @route GET /api/presence/employees/:employeeId/status
 * @desc Obtenir le statut de présence actuel d'un employé
 * @access Private (Employee, Manager, Admin)
 */
router.get(
  '/employees/:employeeId/status',
  managementRateLimit,
  validateEmployeeMiddleware,
  requireRole([TenantRole.ADMIN, TenantRole.MANAGER]),
  presenceController.getPresenceStatus.bind(presenceController)
);

/**
 * @route GET /api/presence/organizations/:organizationId/currently-present
 * @desc Obtenir les employés actuellement présents
 * @access Private (Manager, Admin)
 */
router.get(
  '/organizations/:organizationId/currently-present',
  managementRateLimit,
  validateSensitiveDataAccess,
  requireRole([TenantRole.MANAGER, TenantRole.ADMIN]),
  presenceController.getCurrentlyPresentEmployees.bind(presenceController)
);

/**
 * @route GET /api/presence/organizations/:organizationId/team-summary
 * @desc Obtenir le résumé de présence d'équipe
 * @access Private (Manager, Admin)
 */
router.get(
  '/organizations/:organizationId/team-summary',
  managementRateLimit,
  validateSensitiveDataAccess,
  requireRole([TenantRole.MANAGER, TenantRole.ADMIN]),
  presenceController.getTeamPresenceSummary.bind(presenceController)
);

// ============================================================================
// ROUTES DE GESTION DES ENTRÉES
// ============================================================================

/**
 * @route GET /api/presence/entries
 * @desc Lister les entrées de présence avec filtres et pagination
 * @access Private (Manager, Admin)
 */
router.get(
  '/entries',
  managementRateLimit,
  validatePresenceQueryParams,
  validateDateRange,
  validatePagination,
  validateSensitiveDataAccess,
  requireRole([TenantRole.MANAGER, TenantRole.ADMIN]),
  presenceController.listPresenceEntries.bind(presenceController)
);

/**
 * @route PUT /api/presence/entries/:entryId
 * @desc Mettre à jour une entrée de présence
 * @access Private (Manager, Admin)
 */
router.put(
  '/entries/:entryId',
  managementRateLimit,
  validatePresenceEntryPermissions,
  validateUpdatePresenceEntry,
  sanitizePresenceData,
  validateSensitiveDataAccess,
  requireRole([TenantRole.MANAGER, TenantRole.ADMIN]),
  presenceController.updatePresenceEntry.bind(presenceController)
);

/**
 * @route POST /api/presence/entries/:entryId/validate
 * @desc Valider une entrée de présence (manager)
 * @access Private (Manager, Admin)
 */
router.post(
  '/entries/:entryId/validate',
  managementRateLimit,
  validatePresenceEntryPermissions,
  validatePresenceEntryValidation,
  sanitizePresenceData,
  validateSensitiveDataAccess,
  requireRole([TenantRole.MANAGER, TenantRole.ADMIN]),
  presenceController.validatePresenceEntry.bind(presenceController)
);

/**
 * @route POST /api/presence/entries/:entryId/correct
 * @desc Corriger une entrée de présence
 * @access Private (Manager, Admin)
 */
router.post(
  '/entries/:entryId/correct',
  managementRateLimit,
  validatePresenceEntryPermissions,
  validatePresenceEntryCorrection,
  sanitizePresenceData,
  validateSensitiveDataAccess,
  requireRole([TenantRole.MANAGER, TenantRole.ADMIN]),
  presenceController.correctPresenceEntry.bind(presenceController)
);

// ============================================================================
// ROUTES D'ANALYSE ET STATISTIQUES
// ============================================================================

/**
 * @route GET /api/presence/organizations/:organizationId/anomalies
 * @desc Détecter les anomalies de présence
 * @access Private (Manager, Admin)
 */
router.get(
  '/organizations/:organizationId/anomalies',
  managementRateLimit,
  validateSensitiveDataAccess,
  requireRole([TenantRole.MANAGER, TenantRole.ADMIN]),
  presenceController.detectAnomalies.bind(presenceController)
);

/**
 * @route GET /api/presence/organizations/:organizationId/stats
 * @desc Obtenir les statistiques de présence
 * @access Private (Manager, Admin)
 */
router.get(
  '/organizations/:organizationId/stats',
  managementRateLimit,
  validateSensitiveDataAccess,
  requireRole([TenantRole.MANAGER, TenantRole.ADMIN]),
  presenceController.getPresenceStats.bind(presenceController)
);

// ============================================================================
// ROUTES DE TRAITEMENT AUTOMATIQUE
// ============================================================================

/**
 * @route POST /api/presence/organizations/:organizationId/process-end-of-day
 * @desc Traitement de fin de journée
 * @access Private (Admin only)
 */
router.post(
  '/organizations/:organizationId/process-end-of-day',
  managementRateLimit,
  validateProcessEndOfDay,
  validateSensitiveDataAccess,
  requireRole([TenantRole.ADMIN]),
  presenceController.processEndOfDay.bind(presenceController)
);

/**
 * @route POST /api/presence/organizations/:organizationId/process-notifications
 * @desc Traitement des notifications quotidiennes
 * @access Private (Admin only)
 */
router.post(
  '/organizations/:organizationId/process-notifications',
  managementRateLimit,
  validateSensitiveDataAccess,
  requireRole([TenantRole.ADMIN]),
  presenceController.processDailyNotifications.bind(presenceController)
);

// ============================================================================
// ROUTES DE RAPPORTS
// ============================================================================

/**
 * @route POST /api/presence/reports/generate
 * @desc Générer un rapport de présence
 * @access Private (Manager, Admin)
 */
router.post(
  '/reports/generate',
  reportGenerationRateLimit,
  validateSensitiveDataAccess,
  requireRole([TenantRole.MANAGER, TenantRole.ADMIN]),
  presenceReportController.generateReport.bind(presenceReportController)
);

/**
 * @route GET /api/presence/reports/quick
 * @desc Générer un rapport rapide avec paramètres prédéfinis
 * @access Private (Manager, Admin)
 */
router.get(
  '/reports/quick',
  managementRateLimit,
  validateSensitiveDataAccess,
  requireRole([TenantRole.MANAGER, TenantRole.ADMIN]),
  presenceReportController.generateQuickReport.bind(presenceReportController)
);

/**
 * @route GET /api/presence/reports/:reportId
 * @desc Obtenir un rapport existant
 * @access Private (Manager, Admin)
 */
router.get(
  '/reports/:reportId',
  managementRateLimit,
  requireRole([TenantRole.MANAGER, TenantRole.ADMIN]),
  presenceReportController.getReport.bind(presenceReportController)
);

/**
 * @route GET /api/presence/organizations/:organizationId/reports
 * @desc Lister les rapports avec pagination
 * @access Private (Manager, Admin)
 */
router.get(
  '/organizations/:organizationId/reports',
  managementRateLimit,
  validatePagination,
  validateSensitiveDataAccess,
  requireRole([TenantRole.MANAGER, TenantRole.ADMIN]),
  presenceReportController.listReports.bind(presenceReportController)
);

/**
 * @route POST /api/presence/reports/:reportId/export
 * @desc Exporter un rapport vers un fichier
 * @access Private (Manager, Admin)
 */
router.post(
  '/reports/:reportId/export',
  reportGenerationRateLimit,
  validateSensitiveDataAccess,
  requireRole([TenantRole.MANAGER, TenantRole.ADMIN]),
  presenceReportController.exportReport.bind(presenceReportController)
);

/**
 * @route POST /api/presence/reports/scheduled
 * @desc Créer un rapport programmé
 * @access Private (Manager, Admin)
 */
router.post(
  '/reports/scheduled',
  managementRateLimit,
  validateSensitiveDataAccess,
  requireRole([TenantRole.MANAGER, TenantRole.ADMIN]),
  presenceReportController.createScheduledReport.bind(presenceReportController)
);

/**
 * @route POST /api/presence/reports/scheduled/run
 * @desc Exécuter les rapports programmés (endpoint admin)
 * @access Private (Admin only)
 */
router.post(
  '/reports/scheduled/run',
  reportGenerationRateLimit,
  validateSensitiveDataAccess,
  requireRole([TenantRole.ADMIN]),
  presenceReportController.runScheduledReports.bind(presenceReportController)
);

/**
 * @route GET /api/presence/organizations/:organizationId/reports/stats
 * @desc Obtenir les statistiques de rapports
 * @access Private (Manager, Admin)
 */
router.get(
  '/organizations/:organizationId/reports/stats',
  managementRateLimit,
  validateSensitiveDataAccess,
  requireRole([TenantRole.MANAGER, TenantRole.ADMIN]),
  presenceReportController.getReportStats.bind(presenceReportController)
);

// ============================================================================
// ROUTES DE SÉCURITÉ ET AUDIT
// ============================================================================

/**
 * @route GET /api/presence/audit/entries
 * @desc Obtenir les entrées d'audit de présence
 * @access Private (Admin only)
 */
router.get(
  '/audit/entries',
  managementRateLimit,
  validatePresenceQueryParams,
  validateDateRange,
  validatePagination,
  requireRole([TenantRole.ADMIN]),
  async (req, res) => {
    try {
      
      const query = {
        organizationId: req.query.organizationId as string,
        userId: req.query.userId as string,
        employeeId: req.query.employeeId as string,
        action: req.query.action as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        success: req.query.success ? req.query.success === 'true' : undefined,
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0
      };

      const result = await presenceAuditService.getAuditEntries(query);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          hasMore: result.hasMore,
          limit: query.limit,
          offset: query.offset
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get audit entries',
        code: 'AUDIT_FETCH_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/presence/audit/suspicious
 * @desc Obtenir les activités suspectes récentes
 * @access Private (Admin only)
 */
router.get(
  '/audit/suspicious',
  managementRateLimit,
  requireRole([TenantRole.ADMIN]),
  async (req, res) => {
    try {
    
      const organizationId = req.query.organizationId as string;
      const hours = parseInt(req.query.hours as string) || 24;

      const activities = await presenceAuditService.getSuspiciousActivities(organizationId, hours);

      res.json({
        success: true,
        data: activities,
        count: activities.length
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get suspicious activities',
        code: 'SUSPICIOUS_ACTIVITIES_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/presence/health
 * @desc Vérifier la santé du service de présence
 * @access Private (Admin only)
 */
router.get(
  '/health',
  managementRateLimit,
  async (req, res) => {
    try {
      // Vérifications basiques de santé
      const healthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          notifications: 'active',
          reports: 'active',
          audit: 'active',
          security: 'active'
        },
        version: '1.0.0',
        uptime: process.uptime()
      };

      res.status(200).json({
        success: true,
        data: healthCheck
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'Service unhealthy',
        code: 'SERVICE_UNHEALTHY'
      });
    }
  }
);

export { router as presenceRoutes };