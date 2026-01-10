import {Router} from "express";
import {authenticate, requirePermission} from "../../middleware/auth";
import { rateLimit } from "../../middleware/rateLimit";
import { attendanceValidations, validate, validateBody, validateParams, validateQuery } from "../../middleware/validation";
import {z} from 'zod';
import { AttendanceController } from "../../controllers/attendance/attendance.controller";
import { AttendanceStatus, AttendanceMethod } from "../../common/types";


const router = Router();

// 🔒 Authentification requise
router.use(authenticate);

// ✅ Check-in routes (utilisateur standard)
router.post("/check-in",
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 50, // Augmenté de 10 à 50
  }),
  validate(attendanceValidations.markAttendance),// markAttendanceSchema
  AttendanceController.checkIn
);

// 📋 Attendance listing
router.get("/",
  requirePermission("view_all_attendance"),
  validateBody(z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(["checkInTime", "createdAt", "status"]).default("checkInTime"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    eventId: z.string().optional(),
    userId: z.string().optional(),
    status: z.nativeEnum(AttendanceStatus).optional(),
    method: z.nativeEnum(AttendanceMethod).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    validationStatus: z.enum(["pending", "validated", "rejected"]).optional(),
  })),
  AttendanceController.getAttendances
);

router.get("/my-attendances",
  validateQuery(z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    status: z.nativeEnum(AttendanceStatus).optional(),
  })),
  AttendanceController.getMyAttendances
);

// 📊 Statistics & reports
router.get("/stats",
  requirePermission("view_reports"),
  validateQuery(z.object({
    userId: z.string().optional(),
    eventId: z.string().optional(),
    organizerId: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    department: z.string().optional(),
  })),
  AttendanceController.getAttendanceStats
);

router.get("/patterns/:userId?",
  validateParams(z.object({
    userId: z.string().optional(),
  })),
  AttendanceController.getAttendancePatterns
);

// 📤 Export functionality
router.post("/export",
  requirePermission("export_data"),
  validateBody(z.object({
    filters: z.object({
      eventId: z.string().optional(),
      userId: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      status: z.nativeEnum(AttendanceStatus).optional(),
    }),
    format: z.enum(["csv", "json", "excel"]).default("csv"),
  })),
  AttendanceController.exportAttendances
);

// 🎯 Individual attendance routes
router.get("/:id",
  requirePermission("view_all_attendance"),
  validateParams(z.object({
    id: z.string().min(1, "ID présence requis"),
  })),
  AttendanceController.getAttendanceById
);

// ✅ Validation routes (managers/admins)
router.post("/:id/validate",
  requirePermission("validate_attendance"),
  validateParams(z.object({
    id: z.string().min(1, "ID présence requis"),
  })),
  validateBody(z.object({
    approved: z.boolean(),
    notes: z.string().max(500).optional(),
  })),
  AttendanceController.validateAttendance
);

router.post("/bulk-validate",
  requirePermission("validate_attendance"),
  validateBody(z.object({
    attendanceIds: z.array(z.string()).min(1, "Au moins une présence requise"),
    approved: z.boolean(),
    notes: z.string().max(500).optional(),
  })),
  AttendanceController.bulkValidateAttendances
);

// 📋 Bulk operations
router.post("/bulk-mark",
  requirePermission("validate_attendance"),
  validateBody(z.object({
    operation: z.enum(["mark_present", "mark_absent", "mark_late"]),
    eventId: z.string().min(1, "ID événement requis"),
    userIds: z.array(z.string()).min(1, "Au moins un utilisateur requis"),
    notes: z.string().max(500).optional(),
  })),
  AttendanceController.bulkMarkAttendance
);

// 🎯 Event-specific routes
router.get("/events/:eventId",
  requirePermission("view_all_attendance"),
  validateParams(z.object({
    eventId: z.string().min(1, "ID événement requis"),
  })),
  AttendanceController.getEventAttendances
);

router.post("/events/:eventId/mark-absentees",
  requirePermission("validate_attendance"),
  validateParams(z.object({
    eventId: z.string().min(1, "ID événement requis"),
  })),
  AttendanceController.markAbsentees
);

router.get("/events/:eventId/report",
  requirePermission("view_reports"),
  validateParams(z.object({
    eventId: z.string().min(1, "ID événement requis"),
  })),
  AttendanceController.getEventAttendanceReport
);

router.get("/events/:eventId/realtime-metrics",
  requirePermission("view_reports"),
  validateParams(z.object({
    eventId: z.string().min(1, "ID événement requis"),
  })),
  AttendanceController.getRealtimeMetrics
);

router.post("/events/:eventId/synchronize",
  requirePermission("validate_attendance"),
  validateParams(z.object({
    eventId: z.string().min(1, "ID événement requis"),
  })),
  AttendanceController.synchronizeEventAttendances
);

router.get("/events/:eventId/diagnose",
  requirePermission("validate_attendance"),
  validateParams(z.object({
    eventId: z.string().min(1, "ID événement requis"),
  })),
  AttendanceController.diagnoseAttendanceIssues
);

// 👤 User-specific reports
router.get("/users/:userId/report",
  requirePermission("view_reports"),
  validateParams(z.object({
    userId: z.string().min(1, "ID utilisateur requis"),
  })),
  validateQuery(z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })),
  AttendanceController.getUserAttendanceReport
);

// ⚙️ Settings routes (admin only)
router.get("/settings",
  requirePermission("manage_tenant_settings"),
  AttendanceController.getAttendanceSettings
);

router.put("/settings",
  requirePermission("manage_tenant_settings"),
  validateBody(z.object({
    timezone: z.string().min(1, "Timezone requis"),
    workDays: z.string().min(1, "Jours de travail requis"),
    startHour: z.string().regex(/^\d{2}:\d{2}$/, "Format d'heure invalide (HH:MM)"),
    endHour: z.string().regex(/^\d{2}:\d{2}$/, "Format d'heure invalide (HH:MM)"),
    graceMinutes: z.number().int().min(0).max(60, "Minutes de grâce entre 0 et 60"),
  })),
  AttendanceController.updateAttendanceSettings
);

export {router as attendanceRoutes};
