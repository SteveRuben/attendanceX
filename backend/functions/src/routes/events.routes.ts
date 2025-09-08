import {Router} from "express";
import {EventController} from "../controllers/event.controller";
import {authenticate, requirePermission} from "../middleware/auth";
import {validateBody, validateParams, validateQuery} from "../middleware/validation";
import {rateLimit} from "../middleware/rateLimit";
import {z} from "zod";
import {
  createEventSchema,
  EventStatus,
  EventType,
  searchEventsSchema, 
  updateEventSchema
} from "../shared";

const router = Router();

// 🔒 Authentification requise pour toutes les routes
router.use(authenticate);

// 📅 Event listing & search
router.get("/",
  validateQuery(z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(["startDate", "title", "createdAt"]).default("startDate"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
    type: z.nativeEnum(EventType).optional(),
    status: z.nativeEnum(EventStatus).optional(),
    organizerId: z.string().optional(),
    participantId: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    search: z.string().optional(),
    tags: z.string().optional(), // CSV string
    isPrivate: z.coerce.boolean().optional(),
    location: z.enum(["physical", "virtual", "hybrid"]).optional(),
  })),
  EventController.getEvents
);

router.get("/my-events",
  validateQuery(z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(["startDate", "title", "createdAt"]).default("startDate"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
    type: z.nativeEnum(EventType).optional(),
    status: z.nativeEnum(EventStatus).optional(),
  })),
  EventController.getMyEvents
);

router.get("/upcoming",
  validateQuery(z.object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })),
  EventController.getUpcomingEvents
);

router.post("/search",
  validateBody(searchEventsSchema),
  EventController.searchEvents
);

router.get("/recommendations",
  validateQuery(z.object({
    limit: z.coerce.number().int().min(1).max(20).default(5),
  })),
  EventController.getRecommendedEvents
);

// 📊 Event analytics & stats
router.get("/stats",
  requirePermission("view_reports"),
  validateQuery(z.object({
    organizerId: z.string().optional(),
  })),
  EventController.getEventStats
);

// 🎯 Event creation & management
router.post("/",
  requirePermission("create_events"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
  }),
  validateBody(createEventSchema),
  EventController.createEvent
);

// 🔍 Conflict checking
router.post("/check-conflicts",
  requirePermission("create_events"),
  validateBody(z.object({
    startDateTime: z.string().datetime(),
    endDateTime: z.string().datetime(),
    participantIds: z.array(z.string()).default([]),
    location: z.object({
      name: z.string(),
      coordinates: z.object({
        latitude: z.number(),
        longitude: z.number(),
      }).optional(),
    }).optional(),
    excludeEventId: z.string().optional(),
  })),
  EventController.checkScheduleConflicts
);

// 📋 Export functionality
router.post("/export",
  requirePermission("export_data"),
  validateBody(z.object({
    filters: z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      organizerId: z.string().optional(),
      type: z.nativeEnum(EventType).optional(),
      status: z.nativeEnum(EventStatus).optional(),
    }),
    format: z.enum(["csv", "json", "excel"]).default("csv"),
  })),
  EventController.exportEvents
);

// 🔄 Bulk operations
router.post("/bulk-operations",
  requirePermission("manage_events"),
  validateBody(z.object({
    operation: z.enum(["update_status", "delete", "duplicate"]),
    eventIds: z.array(z.string()).min(1, "Au moins un événement requis"),
    data: z.record(z.any()).optional(),
  })),
  EventController.bulkOperations
);

// 🎯 Individual event routes
router.get("/:id",
  validateParams(z.object({
    id: z.string().min(1, "ID événement requis"),
  })),
  EventController.getEventById
);

router.put("/:id",
  requirePermission("manage_events"),
  validateParams(z.object({
    id: z.string().min(1, "ID événement requis"),
  })),
  validateBody(updateEventSchema),
  EventController.updateEvent
);

router.post("/:id/duplicate",
  requirePermission("create_events"),
  validateParams(z.object({
    id: z.string().min(1, "ID événement requis"),
  })),
  validateBody(z.object({
    title: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    participants: z.array(z.string()).optional(),
  })),
  EventController.duplicateEvent
);

// 📊 Event analytics
router.get("/:id/analytics",
  requirePermission("view_reports"),
  validateParams(z.object({
    id: z.string().min(1, "ID événement requis"),
  })),
  EventController.getEventAnalytics
);

// 🎭 Event status management
router.post("/:id/status",
  requirePermission("manage_events"),
  validateParams(z.object({
    id: z.string().min(1, "ID événement requis"),
  })),
  validateBody(z.object({
    status: z.nativeEnum(EventStatus),
    reason: z.string().max(500).optional(),
  })),
  EventController.changeEventStatus
);

// 👥 Participant management
router.post("/:id/participants",
  requirePermission("manage_events"),
  validateParams(z.object({
    id: z.string().min(1, "ID événement requis"),
  })),
  validateBody(z.object({
    userId: z.string().min(1, "ID utilisateur requis"),
  })),
  EventController.addParticipant
);

router.delete("/:id/participants/:userId",
  requirePermission("manage_events"),
  validateParams(z.object({
    id: z.string().min(1, "ID événement requis"),
    userId: z.string().min(1, "ID utilisateur requis"),
  })),
  validateBody(z.object({
    reason: z.string().max(500).optional(),
  })),
  EventController.removeParticipant
);

router.post("/:id/participants/:userId/confirm",
  requirePermission("manage_events"),
  validateParams(z.object({
    id: z.string().min(1, "ID événement requis"),
    userId: z.string().min(1, "ID utilisateur requis"),
  })),
  EventController.confirmParticipant
);

router.post("/:id/participants/bulk-invite",
  requirePermission("manage_events"),
  validateParams(z.object({
    id: z.string().min(1, "ID événement requis"),
  })),
  validateBody(z.object({
    userIds: z.array(z.string()).min(1, "Au moins un utilisateur requis").max(100, "Trop d'utilisateurs"),
  })),
  EventController.bulkInviteParticipants
);

export {router as eventRoutes};
