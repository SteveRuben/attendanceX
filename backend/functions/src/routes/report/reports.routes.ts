import {Router} from "express";
import {authenticate, requirePermission} from "../../middleware/auth";
import {validateBody, validateParams, validateQuery} from "../../middleware/validation";
import {rateLimit} from "../../middleware/rateLimit";
import {z} from "zod";
import { ReportController } from "../../controllers/report/report.controller";

const router = Router();

// 🔒 Authentification requise
router.use(authenticate);

// Schema pour la génération de rapports
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

// 📊 Report generation
router.post("/generate",
  requirePermission("view_reports"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
  }),
  validateBody(generateReportSchema),
  ReportController.generateReport
);

router.post("/preview",
  requirePermission("view_reports"),
  validateBody(generateReportSchema),
  ReportController.previewReport
);

// 📋 Report listing & management
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

// 🎯 Individual report routes
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

// ⏰ Scheduled reports
router.post("/schedule",
  requirePermission("manage_reports"),
  validateBody(z.object({
    name: z.string().min(1, "Nom requis").max(100),
    type: z.enum(["attendance_summary", "event_detail", "user_attendance", "department_analytics", "monthly_summary"]),
    schedule: z.object({
      frequency: z.enum(["daily", "weekly", "monthly"]),
      dayOfWeek: z.number().int().min(0).max(6).optional(), // Pour weekly
      dayOfMonth: z.number().int().min(1).max(31).optional(), // Pour monthly
      time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
    }),
    recipients: z.array(z.string().email()).min(1, "Au moins un destinataire requis"),
    filters: generateReportSchema.shape.filters.optional(),
    options: generateReportSchema.shape.options.optional(),
    isActive: z.boolean().default(true),
  })),
  ReportController.scheduleReport
);

// 🎨 Report templates
router.get("/templates",
  requirePermission("view_reports"),
  ReportController.getReportTemplates
);

router.get("/templates/:id",
  requirePermission("view_reports"),
  validateParams(z.object({
    id: z.string().min(1, "ID template requis"),
  })),
  ReportController.getReportTemplate
);

// 📊 Quick report generation
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
  ReportController.generateUserReport
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

export {router as reportRoutes};
