/**
 * Routes unifiées pour tous les types de rapports
 * Fusion complète des anciens report/reports.routes.ts et reports/report.routes.ts
 */
import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { rateLimit } from '../../middleware/rateLimit';
import { z } from 'zod';
import { ReportController } from '../../controllers/reports/report.controller';

const router = Router();

// 🔒 Authentification requise pour toutes les routes
router.use(authenticate);

// ==================== RAPPORTS GÉNÉRAUX (Événements, Présence, etc.) ====================

// Schema pour la génération de rapports généraux
const generateReportSchema = z.object({
  type: z.enum([
    "attendance_summary",
    "event_detail",
    "user_attendance",
    "department_analytics",
    "monthly_summary",
    "custom",
  ]),
  format: z.enum(["pdf", "excel", "csv", "json"]).default("pdf"),
  filters: z.object({
    eventId: z.string().optional(),
    userId: z.string().optional(),
    organizerId: z.string().optional(),
    department: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    month: z.number().int().min(1).max(12).optional(),
    year: z.number().int().min(2020).max(2030).optional(),
  }).optional(),
  options: z.object({
    includeCharts: z.boolean().default(true),
    includeInsights: z.boolean().default(true),
    language: z.enum(["fr", "en"]).default("fr"),
    template: z.string().optional(),
  }).optional(),
});

// 📊 Génération de rapports généraux
router.post("/generate",
  requirePermission("view_reports"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
  }),
  validateBody(generateReportSchema),
  ReportController.previewReport // Utilise previewReport comme generateReport
);

router.post("/preview",
  requirePermission("view_reports"),
  validateBody(generateReportSchema),
  ReportController.previewReport
);

// 📋 Gestion des rapports généraux
router.get("/",
  requirePermission("view_reports"),
  validateQuery(z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    sortBy: z.enum(["createdAt", "type", "status"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    type: z.enum(["attendance_summary", "event_detail", "user_attendance", "department_analytics", "monthly_summary"]).optional(),
    status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
    generatedBy: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    format: z.enum(["pdf", "excel", "csv", "json"]).optional(),
  })),
  ReportController.getReports
);

router.get("/stats",
  requirePermission("view_reports"),
  validateQuery(z.object({
    generatedBy: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })),
  ReportController.getReportStats
);

// 🎯 Rapports individuels
router.get("/:id",
  requirePermission("view_reports"),
  validateParams(z.object({
    id: z.string().min(1, "ID rapport requis"),
  })),
  ReportController.getReportById
);

router.get("/:id/download",
  requirePermission("view_reports"),
  validateParams(z.object({
    id: z.string().min(1, "ID rapport requis"),
  })),
  ReportController.downloadReport
);

router.delete("/:id",
  requirePermission("manage_reports"),
  validateParams(z.object({
    id: z.string().min(1, "ID rapport requis"),
  })),
  ReportController.deleteReport
);

// ⏰ Rapports programmés
router.post("/schedule",
  requirePermission("manage_reports"),
  validateBody(z.object({
    name: z.string().min(1, "Nom requis").max(100),
    type: z.enum(["attendance_summary", "event_detail", "user_attendance", "department_analytics", "monthly_summary"]),
    schedule: z.object({
      frequency: z.enum(["daily", "weekly", "monthly"]),
      dayOfWeek: z.number().int().min(0).max(6).optional(),
      dayOfMonth: z.number().int().min(1).max(31).optional(),
      time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    }),
    recipients: z.array(z.string().email()).min(1, "Au moins un destinataire requis"),
    filters: generateReportSchema.shape.filters.optional(),
    options: generateReportSchema.shape.options.optional(),
    isActive: z.boolean().default(true),
  })),
  ReportController.scheduleReport
);

// 🎨 Templates de rapports
router.get("/templates",
  requirePermission("view_reports"),
  ReportController.getReportTemplates
);

router.get("/templates/:id",
  requirePermission("view_reports"),
  validateParams(z.object({
    id: z.string().min(1, "ID template requis"),
  })),
  ReportController.getReportTemplates // Pas de getReportTemplate individuel, utilise la liste
);

// 📊 Génération rapide de rapports spécifiques
router.post("/attendance/:eventId",
  requirePermission("view_reports"),
  validateParams(z.object({
    eventId: z.string().min(1, "ID événement requis"),
  })),
  validateQuery(z.object({
    format: z.enum(["pdf", "excel", "csv"]).default("pdf"),
  })),
  ReportController.generateAttendanceReport
);

router.post("/user/:userId",
  requirePermission("view_reports"),
  validateParams(z.object({
    userId: z.string().min(1, "ID utilisateur requis"),
  })),
  validateQuery(z.object({
    format: z.enum(["pdf", "excel", "csv"]).default("pdf"),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })),
  ReportController.generateUserAttendanceReport // Nom correct
);

router.post("/monthly-summary",
  requirePermission("view_reports"),
  validateQuery(z.object({
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2020).max(2030),
    format: z.enum(["pdf", "excel", "csv"]).default("pdf"),
  })),
  ReportController.generateMonthlySummary
);

// 🧹 Maintenance
router.post("/cleanup-expired",
  requirePermission("manage_settings"),
  ReportController.cleanupExpiredReports
);

// ==================== RAPPORTS DE FEUILLES DE TEMPS ====================

/**
 * @swagger
 * /api/reports/timesheet/employee:
 *   post:
 *     summary: Génère un rapport par employé
 *     tags: [Reports, Timesheet]
 *     security:
 *       - bearerAuth: []
 */
router.post('/timesheet/employee',
  ReportController.generateEmployeeReport
);

/**
 * @swagger
 * /api/reports/timesheet/project:
 *   post:
 *     summary: Génère un rapport par projet
 *     tags: [Reports, Timesheet]
 *     security:
 *       - bearerAuth: []
 */
router.post('/timesheet/project',
  ReportController.generateProjectReport
);

/**
 * @swagger
 * /api/reports/timesheet/billable:
 *   post:
 *     summary: Génère un rapport de temps facturable vs non-facturable
 *     tags: [Reports, Timesheet]
 *     security:
 *       - bearerAuth: []
 */
router.post('/timesheet/billable',
  ReportController.generateTimeReport // Utilise generateTimeReport pour billable
);

/**
 * @swagger
 * /api/reports/timesheet/presence-comparison:
 *   post:
 *     summary: Génère un rapport de comparaison présence vs feuilles de temps
 *     tags: [Reports, Timesheet]
 *     security:
 *       - bearerAuth: []
 */
router.post('/timesheet/presence-comparison',
  ReportController.generateAttendanceReport // Utilise attendance pour comparaison
);

// ==================== RAPPORTS DE PRODUCTIVITÉ ====================

/**
 * @swagger
 * /api/reports/productivity/employee/{employeeId}:
 *   post:
 *     summary: Génère un rapport de productivité pour un employé
 *     tags: [Reports, Productivity]
 *     security:
 *       - bearerAuth: []
 */
router.post('/productivity/employee/:employeeId',
  ReportController.generateProductivityReport
);

/**
 * @swagger
 * /api/reports/productivity/team:
 *   post:
 *     summary: Génère un rapport de productivité d'équipe
 *     tags: [Reports, Productivity]
 *     security:
 *       - bearerAuth: []
 */
router.post('/productivity/team',
  ReportController.generateProductivityReport
);

/**
 * @swagger
 * /api/reports/productivity/activity-efficiency:
 *   post:
 *     summary: Génère un rapport d'efficacité par activité
 *     tags: [Reports, Productivity]
 *     security:
 *       - bearerAuth: []
 */
router.post('/productivity/activity-efficiency',
  ReportController.generateProductivityReport
);

/**
 * @swagger
 * /api/reports/productivity/time-distribution/{employeeId}:
 *   post:
 *     summary: Génère une analyse de distribution du temps pour un employé
 *     tags: [Reports, Productivity]
 *     security:
 *       - bearerAuth: []
 */
router.post('/productivity/time-distribution/:employeeId',
  ReportController.generateTimeReport
);

// ==================== RAPPORTS DE RENTABILITÉ ====================

/**
 * @swagger
 * /api/reports/profitability:
 *   post:
 *     summary: Génère un rapport de rentabilité
 *     tags: [Reports, Profitability]
 *     security:
 *       - bearerAuth: []
 */
router.post('/profitability',
  ReportController.generateProfitabilityReport
);

/**
 * @swagger
 * /api/reports/profitability/cost-benefit/{projectId}:
 *   post:
 *     summary: Génère une analyse coût/bénéfice pour un projet
 *     tags: [Reports, Profitability]
 *     security:
 *       - bearerAuth: []
 */
router.post('/profitability/cost-benefit/:projectId',
  ReportController.generateProfitabilityReport
);

/**
 * @swagger
 * /api/reports/profitability/forecast:
 *   post:
 *     summary: Génère des projections de rentabilité
 *     tags: [Reports, Profitability]
 *     security:
 *       - bearerAuth: []
 */
router.post('/profitability/forecast',
  ReportController.generateProfitabilityReport
);

/**
 * @swagger
 * /api/reports/profitability/margin-analysis:
 *   post:
 *     summary: Génère une analyse des marges
 *     tags: [Reports, Profitability]
 *     security:
 *       - bearerAuth: []
 */
router.post('/profitability/margin-analysis',
  ReportController.generateProfitabilityReport
);

// ==================== TABLEAU DE BORD ====================
// Note: Ces endpoints utilisent des méthodes existantes comme placeholder
// Il faudra implémenter les méthodes spécifiques dans le contrôleur

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Récupère les données du tableau de bord
 *     tags: [Reports, Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard',
  ReportController.getReportStats // Utilise stats comme dashboard temporaire
);

/**
 * @swagger
 * /api/reports/dashboard/real-time:
 *   get:
 *     summary: Récupère les métriques temps réel
 *     tags: [Reports, Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard/real-time',
  ReportController.getReportStats
);

/**
 * @swagger
 * /api/reports/dashboard/team-performance:
 *   get:
 *     summary: Récupère le snapshot de performance d'équipe
 *     tags: [Reports, Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard/team-performance',
  ReportController.getReportStats
);

/**
 * @swagger
 * /api/reports/dashboard/project-health:
 *   get:
 *     summary: Récupère le tableau de bord de santé des projets
 *     tags: [Reports, Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard/project-health',
  ReportController.getReportStats
);

export default router;