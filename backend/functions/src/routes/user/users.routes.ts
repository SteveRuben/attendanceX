import { Router } from "express";

import { z } from "zod";
import {
  TenantRole,
  UserRole
} from '../../common/types';
import { authenticate, requirePermission, requireRole } from "../../middleware/auth";
import { UserController } from "../../controllers/user";
import { validateBody, validateParams, validateQuery } from "../../middleware/validation";
import { rateLimit } from "../../middleware/rateLimit";
import { createUserSchema, searchUsersSchema, updateUserSchema } from "../../common/validators";

const router = Router();

// 🔒 Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * @swagger
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Récupérer le profil de l'utilisateur connecté
 *     description: |
 *       Retourne les informations du profil de l'utilisateur actuellement connecté.
 *       
 *       **Fonctionnalités:**
 *       - Informations complètes du profil
 *       - Permissions et rôles
 *       - Statistiques personnelles
 *       - Préférences utilisateur
 *     responses:
 *       200:
 *         description: Profil utilisateur récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               data:
 *                 id: "user123"
 *                 email: "user@example.com"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 role: "user"
 *                 status: "active"
 *                 organizationId: "org123"
 *                 createdAt: "2024-01-15T10:30:00Z"
 *                 updatedAt: "2024-01-15T10:30:00Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *     security:
 *       - BearerAuth: []
 *   put:
 *     tags: [Users]
 *     summary: Mettre à jour le profil personnel
 *     description: |
 *       Permet à l'utilisateur de mettre à jour ses propres informations de profil.
 *       
 *       **Champs modifiables:**
 *       - Prénom et nom
 *       - Téléphone
 *       - Préférences
 *       - Photo de profil
 *       
 *       **Restrictions:**
 *       - Email non modifiable (sécurité)
 *       - Rôle non modifiable (permissions)
 *       - Statut non modifiable (admin seulement)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 description: Prénom de l'utilisateur
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 description: Nom de famille
 *               phone:
 *                 type: string
 *                 pattern: '^\\+?[1-9]\\d{1,14}$'
 *                 description: Numéro de téléphone (format international)
 *               preferences:
 *                 type: object
 *                 properties:
 *                   language:
 *                     type: string
 *                     enum: [fr, en, es]
 *                   timezone:
 *                     type: string
 *                     example: "Europe/Paris"
 *                   notifications:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: boolean
 *                       sms:
 *                         type: boolean
 *                       push:
 *                         type: boolean
 *           example:
 *             firstName: "John"
 *             lastName: "Doe"
 *             phone: "+33123456789"
 *             preferences:
 *               language: "fr"
 *               timezone: "Europe/Paris"
 *               notifications:
 *                 email: true
 *                 sms: false
 *                 push: true
 *     responses:
 *       200:
 *         description: Profil mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profil mis à jour avec succès"
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *     security:
 *       - BearerAuth: []
 */
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

/* router.get("/stats",
  requirePermission("view_reports"),
  UserController.getUserStats
); */

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
  requireRole([TenantRole.ADMIN, TenantRole.OWNER]),
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



router.post("/:id/complete-setup",
  validateParams(z.object({
    id: z.string().min(1, "ID utilisateur requis"),
  })),
  validateBody(z.object({
    organizationName: z.string().optional(),
    userData: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
    }).optional(),
  })),
  UserController.completeUserSetup
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

export { router as userRoutes };
