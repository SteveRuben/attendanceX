import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate, requirePermission, requireRole } from "../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../middleware/validation";
import { rateLimit } from "../middleware/rateLimit";
import { z } from "zod";
import {
  createUserSchema,
  searchUsersSchema,
  TenantRole,
  updateUserSchema,
  UserRole
} from "../shared";

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

/**
 * @swagger
 * /users/{id}/complete-setup:
 *   post:
 *     tags: [Users]
 *     summary: Finaliser la configuration d'un utilisateur existant
 *     description: |
 *       Complète automatiquement les données manquantes d'un utilisateur qui appartient déjà à une organisation.
 *       
 *       **Fonctionnalités:**
 *       - Mise à jour des informations utilisateur manquantes
 *       - Association à l'organisation existante si nécessaire
 *       - Finalisation du processus d'onboarding
 *       - Nettoyage des données temporaires
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *         example: "user123"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               organizationName:
 *                 type: string
 *                 description: Nom d'organisation fourni lors de l'inscription
 *                 example: "Mon Entreprise"
 *               userData:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                     example: "John"
 *                   lastName:
 *                     type: string
 *                     example: "Doe"
 *                   phone:
 *                     type: string
 *                     example: "+33123456789"
 *           example:
 *             organizationName: "Mon Entreprise"
 *             userData:
 *               firstName: "John"
 *               lastName: "Doe"
 *               phone: "+33123456789"
 *     responses:
 *       200:
 *         description: Configuration finalisée avec succès
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
 *                   example: "Configuration finalisée avec succès"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     organization:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         role:
 *                           type: string
 *             example:
 *               success: true
 *               message: "Configuration finalisée avec succès"
 *               data:
 *                 user:
 *                   id: "user123"
 *                   email: "user@example.com"
 *                   firstName: "John"
 *                   lastName: "Doe"
 *                 organization:
 *                   id: "org123"
 *                   name: "Mon Entreprise"
 *                   role: "admin"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Utilisateur non trouvé
 *     security:
 *       - BearerAuth: []
 *
 * @swagger
 * /users/{id}/organizations:
 *   get:
 *     tags: [Users]
 *     summary: Récupérer les organisations d'un utilisateur
 *     description: |
 *       Retourne la liste des organisations auxquelles l'utilisateur appartient.
 *       
 *       **Fonctionnalités:**
 *       - Liste des organisations avec rôles
 *       - Statut d'appartenance (actif/inactif)
 *       - Date d'adhésion
 *       - Permissions dans chaque organisation
 *       
 *       **Permissions:**
 *       - L'utilisateur peut voir ses propres organisations
 *       - Les admins peuvent voir les organisations de tous les utilisateurs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *         example: "user123"
 *     responses:
 *       200:
 *         description: Liste des organisations récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       organizationId:
 *                         type: string
 *                         example: "org123"
 *                       organizationName:
 *                         type: string
 *                         example: "Mon Entreprise"
 *                       role:
 *                         type: string
 *                         enum: [admin, manager, user]
 *                         example: "admin"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       joinedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00Z"
 *                       permissions:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["manage_users", "view_reports"]
 *             example:
 *               success: true
 *               data:
 *                 - organizationId: "org123"
 *                   organizationName: "Mon Entreprise"
 *                   role: "admin"
 *                   isActive: true
 *                   joinedAt: "2024-01-15T10:30:00Z"
 *                   permissions: ["manage_users", "view_reports", "manage_organization"]
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Utilisateur non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Utilisateur non trouvé"
 *     security:
 *       - BearerAuth: []
 */
// 🏢 Organization membership routes
router.get("/:id/organizations",
  validateParams(z.object({
    id: z.string().min(1, "ID utilisateur requis"),
  })),
  UserController.getUserOrganizations
);

router.get("/:id/organizations/:organizationId",
  validateParams(z.object({
    id: z.string().min(1, "ID utilisateur requis"),
    organizationId: z.string().min(1, "ID organisation requis"),
  })),
  UserController.getUserOrganizationMembership
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
