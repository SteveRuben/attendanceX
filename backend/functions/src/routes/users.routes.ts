import {Router} from "express";
import {UserController} from "../controllers/user.controller";
import {authenticate, requirePermission, requireRole} from "../middleware/auth";
import {validateBody, validateParams, validateQuery} from "../middleware/validation";
import {rateLimit} from "../middleware/rateLimit";
import {z} from "zod";
import {
  createUserSchema,
  updateUserSchema,
  searchUsersSchema,
  UserRole
} from "@attendance-x/shared";

const router = Router();

// 🔒 Toutes les routes nécessitent une authentification
router.use(authenticate);

// 👤 Profile routes (utilisateur connecté)
router.get("/me", UserController.getMyProfile);
router.put("/me",
  validateBody(updateUserSchema),
  UserController.updateProfile
);

// 👥 User management routes
router.get("/",
  requirePermission("view_all_users"),
  validateQuery(z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    role: z.nativeEnum(UserRole).optional(),
    status: z.enum(["active", "inactive", "pending", "suspended"]).optional(),
    department: z.string().optional(),
    search: z.string().optional(),
    includeInactive: z.coerce.boolean().default(false),
  })),
  UserController.getUsers
);

router.post("/",
  requirePermission("manage_users"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
  }),
  validateBody(createUserSchema),
  UserController.createUser
);

router.post("/search",
  requirePermission("view_all_users"),
  validateBody(searchUsersSchema),
  UserController.searchUsers
);

router.get("/stats",
  requirePermission("view_reports"),
  UserController.getUserStats
);

// 🎯 Individual user routes
router.get("/:id",
  requirePermission("view_all_users"),
  validateParams(z.object({
    id: z.string().min(1, "ID utilisateur requis"),
  })),
  UserController.getUserById
);

router.put("/:id",
  requirePermission("manage_users"),
  validateParams(z.object({
    id: z.string().min(1, "ID utilisateur requis"),
  })),
  validateBody(updateUserSchema),
  UserController.updateUser
);

// 🔐 Role & Status management
router.post("/:id/role",
  requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validateParams(z.object({
    id: z.string().min(1, "ID utilisateur requis"),
  })),
  validateBody(z.object({
    role: z.nativeEnum(UserRole),
  })),
  UserController.changeUserRole
);

router.post("/:id/status",
  requirePermission("manage_users"),
  validateParams(z.object({
    id: z.string().min(1, "ID utilisateur requis"),
  })),
  validateBody(z.object({
    status: z.enum(["active", "inactive", "suspended"]),
    reason: z.string().max(500).optional(),
  })),
  UserController.changeUserStatus
);

// 📧 Invitation routes
router.post("/invitations/accept",
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 5,
  }),
  validateBody(z.object({
    token: z.string().min(1, "Token d'invitation requis"),
    password: z.string().min(12, "Mot de passe requis"),
  })),
  UserController.acceptInvitation
);

export {router as userRoutes};
