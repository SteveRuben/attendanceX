// Routes pour la gestion multi-tenant
import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validation";
import { z } from "zod";
import { TenantController } from "../../controllers/tenant/tenant.controller";
import { teamController } from "../../controllers/user/team.controller";
import { CheckInController } from "../../controllers/checkin/checkin.controller";
import { apiKeyController } from "../../controllers/auth/api-key.controller";
import { AttendanceController } from "../../controllers/attendance/attendance.controller";

const router = Router();

// 🔒 Authentification requise pour toutes les routes
router.use(authenticate);

/**
 * @swagger
 * /tenants/register:
 *   post:
 *     tags: [Multi-Tenant]
 *     summary: Créer un nouveau tenant/organisation
 *     description: |
 *       Crée un nouveau tenant pour l'utilisateur authentifié.
 *       L'utilisateur devient automatiquement propriétaire du tenant.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Nom du tenant/organisation
 *               slug:
 *                 type: string
 *                 pattern: '^[a-z0-9-]+$'
 *                 description: Slug unique pour l'URL
 *               industry:
 *                 type: string
 *                 enum: [education, healthcare, corporate, government, non_profit, technology, finance, retail, manufacturing, hospitality, consulting, other]
 *               size:
 *                 type: string
 *                 description: Taille de l'organisation
 *               planId:
 *                 type: string
 *                 default: basic
 *                 description: Plan de subscription
 *               settings:
 *                 type: object
 *                 properties:
 *                   timezone:
 *                     type: string
 *                   locale:
 *                     type: string
 *                   currency:
 *                     type: string
 *             required: [name, slug, industry, size]
 *     responses:
 *       201:
 *         description: Tenant créé avec succès
 *       400:
 *         description: Données invalides
 *       409:
 *         description: Slug déjà utilisé
 */
router.post("/register",
  validateBody(z.object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
    slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets"),
    industry: z.enum([
      'education', 'healthcare', 'corporate', 'government', 'non_profit',
      'technology', 'finance', 'retail', 'manufacturing', 'hospitality',
      'consulting', 'other'
    ]),
    size: z.string().min(1, "Taille de l'organisation requise"),
    planId: z.string().default('basic'),
    settings: z.object({
      timezone: z.string().optional(),
      locale: z.string().optional(),
      currency: z.string().optional()
    }).optional()
  })),
  TenantController.createTenant
);

/**
 * @swagger
 * /tenants/switch-context:
 *   post:
 *     tags: [Multi-Tenant]
 *     summary: Changer de contexte tenant
 *     description: Change le contexte tenant actif pour l'utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenantId:
 *                 type: string
 *                 description: ID du tenant à activer
 *             required: [tenantId]
 *     responses:
 *       200:
 *         description: Contexte changé avec succès
 *       403:
 *         description: Accès refusé au tenant
 *       404:
 *         description: Tenant non trouvé
 */
router.post("/switch-context",
  validateBody(z.object({
    tenantId: z.string().min(1, "ID tenant requis")
  })),
  TenantController.switchTenantContext
);

/**
 * @swagger
 * /tenants/{tenantId}/validate:
 *   get:
 *     tags: [Multi-Tenant]
 *     summary: Valider l'accès à un tenant
 *     description: Valide que l'utilisateur a accès au tenant spécifié (utilisé pour la redirection post-onboarding)
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du tenant à valider
 *     responses:
 *       200:
 *         description: Accès validé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Tenant non trouvé
 */
router.get("/:tenantId/validate",
  TenantController.validateTenantAccess
);

/**
 * @swagger
 * /tenants/{tenantId}/membership:
 *   get:
 *     tags: [Multi-Tenant]
 *     summary: Get user membership for a tenant
 *     description: Récupère les informations de membership de l'utilisateur authentifié pour un tenant spécifique
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du tenant
 *     responses:
 *       200:
 *         description: Membership récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     tenantId:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     role:
 *                       type: string
 *                     featurePermissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                     isActive:
 *                       type: boolean
 *                     joinedAt:
 *                       type: string
 *                       format: date-time
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Membership non trouvé
 */
router.get("/:tenantId/membership",
  TenantController.getUserMembership
);

/**
 * @swagger
 * /tenants:
 *   get:
 *     tags: [Multi-Tenant]
 *     summary: Obtenir les tenants de l'utilisateur
 *     description: Retourne la liste des tenants auxquels l'utilisateur a accès
 *     responses:
 *       200:
 *         description: Liste des tenants
 */
router.get("/",
  TenantController.getUserTenants
);

/**
 * @swagger
 * /tenants/{tenantId}/onboarding-status:
 *   get:
 *     tags: [Multi-Tenant]
 *     summary: Get onboarding status for a tenant
 *     description: Récupère le statut d'onboarding d'un tenant et la prochaine étape à compléter
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du tenant
 *     responses:
 *       200:
 *         description: Statut d'onboarding récupéré
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Tenant non trouvé
 */
router.get("/:tenantId/onboarding-status",
  TenantController.getOnboardingStatus
);

/**
 * @swagger
 * /tenants/{tenantId}/onboarding-steps:
 *   get:
 *     tags: [Multi-Tenant]
 *     summary: Get onboarding steps for a tenant
 *     description: Récupère uniquement la liste des étapes d'onboarding avec leur statut
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du tenant
 *     responses:
 *       200:
 *         description: Étapes d'onboarding récupérées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     steps:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           completed:
 *                             type: boolean
 *                           required:
 *                             type: boolean
 *                           order:
 *                             type: number
 *                           url:
 *                             type: string
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Tenant non trouvé
 */
router.get("/:tenantId/onboarding-steps",
  TenantController.getOnboardingSteps
);

/**
 * @swagger
 * /tenants/{tenantId}/onboarding/complete:
 *   post:
 *     tags: [Multi-Tenant]
 *     summary: Mark onboarding as complete for a tenant
 *     description: Marque l'onboarding comme complété pour un tenant
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du tenant
 *     responses:
 *       200:
 *         description: Onboarding complété
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Tenant non trouvé
 */
router.post("/:tenantId/onboarding/complete",
  TenantController.completeOnboarding
);

/**
 * @swagger
 * /tenants/{tenantId}/settings:
 *   patch:
 *     tags: [Multi-Tenant]
 *     summary: Update tenant core settings
 *     description: Met à jour les paramètres principaux du tenant (timezone, locale, currency, formats)
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: object
 *                 properties:
 *                   timezone:
 *                     type: string
 *                     description: Fuseau horaire (ex: Europe/Paris)
 *                   locale:
 *                     type: string
 *                     description: Locale (ex: fr-FR)
 *                   currency:
 *                     type: string
 *                     description: Devise (ex: EUR)
 *                   dateFormat:
 *                     type: string
 *                     description: Format de date (ex: DD/MM/YYYY)
 *                   timeFormat:
 *                     type: string
 *                     description: Format d'heure (ex: HH:mm)
 *     responses:
 *       200:
 *         description: Paramètres mis à jour
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Tenant non trouvé
 */
router.put("/:tenantId/settings",
  validateBody(z.object({
    settings: z.object({
      timezone: z.string().min(1).optional(),
      locale: z.string().min(2).optional(),
      currency: z.string().min(1).optional(),
      dateFormat: z.string().optional(),
      timeFormat: z.string().optional(),
    })
  })),
  TenantController.updateTenantSettings
);

/**
 * @swagger
 * /tenants/{tenantId}/settings/attendance:
 *   get:
 *     tags: [Multi-Tenant]
 *     summary: Get tenant attendance settings
 *     description: Récupère les paramètres de présence du tenant
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du tenant
 *     responses:
 *       200:
 *         description: Paramètres de présence récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     timezone:
 *                       type: string
 *                     workDays:
 *                       type: string
 *                     startHour:
 *                       type: string
 *                     endHour:
 *                       type: string
 *                     graceMinutes:
 *                       type: number
 *       404:
 *         description: Tenant non trouvé
 *   put:
 *     tags: [Multi-Tenant]
 *     summary: Update tenant attendance settings
 *     description: Met à jour les paramètres de présence du tenant
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               policy:
 *                 type: object
 *                 properties:
 *                   workDays:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 7
 *                     description: Nombre de jours de travail par semaine
 *                   startHour:
 *                     type: string
 *                     pattern: '^(?:[01]\d|2[0-3]):[0-5]\d$'
 *                     description: Heure de début (format HH:mm)
 *                   endHour:
 *                     type: string
 *                     pattern: '^(?:[01]\d|2[0-3]):[0-5]\d$'
 *                     description: Heure de fin (format HH:mm)
 *                   graceMinutes:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 120
 *                     description: Minutes de grâce pour les retards
 *     responses:
 *       200:
 *         description: Paramètres de présence mis à jour avec succès
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Tenant non trouvé
 */
router.get("/:tenantId/settings/attendance",
  AttendanceController.getAttendanceSettings
);

router.put("/:tenantId/settings/attendance",
  validateBody(z.object({
    timezone: z.string().min(1, "Timezone requis"),
    workDays: z.string().min(1, "Jours de travail requis"),
    startHour: z.string().regex(/^\d{2}:\d{2}$/, "Format d'heure invalide (HH:MM)"),
    endHour: z.string().regex(/^\d{2}:\d{2}$/, "Format d'heure invalide (HH:MM)"),
    graceMinutes: z.number().int().min(0).max(60, "Minutes de grâce entre 0 et 60"),
  })),
  AttendanceController.updateAttendanceSettings
);

/**
 * @swagger
 * /tenants/{tenantId}/invitations/bulk:
 *   post:
 *     tags: [Multi-Tenant]
 *     summary: Bulk invite users during setup
 *     description: Invite plusieurs utilisateurs en masse pendant l'onboarding (max 100 emails)
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emails:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 minItems: 1
 *                 maxItems: 100
 *                 description: Liste des emails à inviter
 *             required: [emails]
 *     responses:
 *       200:
 *         description: Invitations traitées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     successful:
 *                       type: array
 *                       items:
 *                         type: string
 *                     failed:
 *                       type: array
 *                       items:
 *                         type: object
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Tenant non trouvé
 */
router.post("/:tenantId/invitations/bulk",
  validateBody(z.object({
    emails: z.array(z.string().email()).min(1, "Au moins un email requis").max(100, "Maximum 100 emails par requête")
  })),
  TenantController.bulkInviteUsers
);

/**
 * @swagger
 * /tenants/{tenantId}/user-invitations:
 *   get:
 *     tags: [Multi-Tenant]
 *     summary: Get user invitations for a tenant
 *     description: Récupère la liste des invitations utilisateur pour un tenant avec pagination et filtres
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du tenant
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 100
 *         description: Nombre d'invitations par page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Décalage pour la pagination
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *           enum: [createdAt, email, status]
 *         description: Champ de tri
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           default: desc
 *           enum: [asc, desc]
 *         description: Ordre de tri
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected, expired]
 *         description: Filtrer par statut
 *     responses:
 *       200:
 *         description: Liste des invitations récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     invitations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           role:
 *                             type: string
 *                           status:
 *                             type: string
 *                           invitedBy:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           expiresAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *                         hasMore:
 *                           type: boolean
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Tenant non trouvé
 */
router.get("/:tenantId/user-invitations",
  validateQuery(z.object({
    limit: z.number().min(1, "Limit doit être au moins 1").max(100, "Limit ne peut pas dépasser 100").optional().default(50),
    offset: z.number().min(0, "Offset doit être positif ou zéro").optional().default(0),
    sortBy: z.enum(['createdAt', 'email', 'status']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    status: z.enum(['pending', 'accepted', 'rejected', 'expired']).optional()
  })),
  TenantController.getUserInvitations
);


/**
 * @swagger
 * /tenants/{tenantId}/user-invitations/{invitationId}:
 *   delete:
 *     tags: [Multi-Tenant]
 *     summary: Delete a user invitation
 *     description: Supprime une invitation utilisateur (owner/admin uniquement)
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du tenant
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'invitation à supprimer
 *     responses:
 *       200:
 *         description: Invitation supprimée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Invitation non trouvée
 */
router.delete("/:tenantId/user-invitations/:invitationId",
  TenantController.deleteInvitation
);

/**
 * @swagger
 * /tenants/{tenantId}/user-invitations/{invitationId}/resend:
 *   post:
 *     tags: [Multi-Tenant]
 *     summary: Resend a user invitation
 *     description: Renvoie une invitation utilisateur (pending ou expired uniquement)
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du tenant
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'invitation à renvoyer
 *     responses:
 *       200:
 *         description: Invitation renvoyée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     invitation:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         status:
 *                           type: string
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Impossible de renvoyer l'invitation (statut invalide)
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Invitation non trouvée
 */
router.post("/:tenantId/user-invitations/:invitationId/resend",
  TenantController.resendInvitation
);

/**
 * @swagger
 * /tenants/{tenantId}/teams:
 *   get:
 *     tags: [Teams]
 *     summary: Get all teams for a tenant
 *     description: Récupère toutes les équipes d'un tenant avec filtres et pagination
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: managerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Liste des équipes récupérée
 *   post:
 *     tags: [Teams]
 *     summary: Create a new team
 *     description: Crée une nouvelle équipe pour le tenant
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               department:
 *                 type: string
 *               managerId:
 *                 type: string
 *               settings:
 *                 type: object
 *             required: [name]
 *     responses:
 *       201:
 *         description: Équipe créée avec succès
 */
router.get("/:tenantId/teams",
  validateQuery(z.object({
    department: z.string().optional(),
    managerId: z.string().optional(),
    isActive: z.string().optional(),
    search: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional()
  })),
  (req, res) => {
    // Créer un nouvel objet params avec organizationId
    const modifiedReq = {
      ...req,
      params: { ...req.params, organizationId: req.params.tenantId }
    };
    return teamController.getTeams(modifiedReq as any, res);
  }
);

router.post("/:tenantId/teams",
  validateBody(z.object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
    description: z.string().optional(),
    department: z.string().optional(),
    managerId: z.string().optional(),
    settings: z.object({
      canValidateAttendance: z.boolean().optional(),
      canCreateEvents: z.boolean().optional(),
      canInviteParticipants: z.boolean().optional(),
      canViewAllEvents: z.boolean().optional(),
      canExportData: z.boolean().optional()
    }).optional()
  })),
  (req, res) => {
    // Créer un nouvel objet params avec organizationId
    const modifiedReq = {
      ...req,
      params: { ...req.params, organizationId: req.params.tenantId }
    };
    return teamController.createTeam(modifiedReq as any, res);
  }
);

/**
 * @swagger
 * /tenants/{tenantId}/teams/{teamId}:
 *   get:
 *     tags: [Teams]
 *     summary: Get a team by ID
 *     description: Récupère les détails d'une équipe spécifique
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails de l'équipe
 *       404:
 *         description: Équipe non trouvée
 *   put:
 *     tags: [Teams]
 *     summary: Update a team
 *     description: Met à jour les informations d'une équipe
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               department:
 *                 type: string
 *               managerId:
 *                 type: string
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Équipe mise à jour
 *   delete:
 *     tags: [Teams]
 *     summary: Delete a team
 *     description: Supprime une équipe (soft delete)
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Équipe supprimée
 */
router.get("/:tenantId/teams/:teamId",
  (req, res) => {
    const modifiedReq = {
      ...req,
      params: { ...req.params, organizationId: req.params.tenantId }
    };
    return teamController.getTeamById(modifiedReq as any, res);
  }
);

router.put("/:tenantId/teams/:teamId",
  validateBody(z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
    department: z.string().optional(),
    managerId: z.string().optional(),
    settings: z.object({
      canValidateAttendance: z.boolean().optional(),
      canCreateEvents: z.boolean().optional(),
      canInviteParticipants: z.boolean().optional(),
      canViewAllEvents: z.boolean().optional(),
      canExportData: z.boolean().optional()
    }).optional()
  })),
  (req, res) => {
    const modifiedReq = {
      ...req,
      params: { ...req.params, organizationId: req.params.tenantId }
    };
    return teamController.updateTeam(modifiedReq as any, res);
  }
);

router.delete("/:tenantId/teams/:teamId",
  (req, res) => {
    const modifiedReq = {
      ...req,
      params: { ...req.params, organizationId: req.params.tenantId }
    };
    return teamController.deleteTeam(modifiedReq as any, res);
  }
);

/**
 * @swagger
 * /tenants/{tenantId}/teams/{teamId}/members:
 *   get:
 *     tags: [Teams]
 *     summary: Get team members
 *     description: Récupère la liste des membres d'une équipe
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des membres
 *   post:
 *     tags: [Teams]
 *     summary: Add a member to a team
 *     description: Ajoute un membre à une équipe
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [member, lead, manager]
 *             required: [userId]
 *     responses:
 *       201:
 *         description: Membre ajouté
 */
router.get("/:tenantId/teams/:teamId/members",
  (req, res) => {
    const modifiedReq = {
      ...req,
      params: { ...req.params, organizationId: req.params.tenantId }
    };
    return teamController.getTeamMembers(modifiedReq as any, res);
  }
);

router.post("/:tenantId/teams/:teamId/members",
  validateBody(z.object({
    userId: z.string().min(1, "ID utilisateur requis"),
    role: z.enum(['member', 'lead', 'manager']).default('member')
  })),
  (req, res) => {
    const modifiedReq = {
      ...req,
      params: { ...req.params, organizationId: req.params.tenantId }
    };
    return teamController.addTeamMember(modifiedReq as any, res);
  }
);

/**
 * @swagger
 * /tenants/{tenantId}/teams/{teamId}/members/{userId}:
 *   delete:
 *     tags: [Teams]
 *     summary: Remove a member from a team
 *     description: Retire un membre d'une équipe
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Membre retiré
 */
router.delete("/:tenantId/teams/:teamId/members/:userId",
  (req, res) => {
    const modifiedReq = {
      ...req,
      params: { ...req.params, organizationId: req.params.tenantId }
    };
    return teamController.removeTeamMember(modifiedReq as any, res);
  }
);

/**
 * @swagger
 * /tenants/{tenantId}/teams/{teamId}/stats:
 *   get:
 *     tags: [Teams]
 *     summary: Get team statistics
 *     description: Récupère les statistiques d'une équipe
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Statistiques de l'équipe
 */
router.get("/:tenantId/teams/:teamId/stats",
  (req, res) => {
    const modifiedReq = {
      ...req,
      params: { ...req.params, organizationId: req.params.tenantId }
    };
    return teamController.getTeamStats(modifiedReq as any, res);
  }
);

/**
 * @swagger
 * /tenants/{tenantId}/check-in/config/{eventId}:
 *   get:
 *     tags: [Check-in]
 *     summary: Get check-in configuration for an event
 *     description: Récupère la configuration de check-in pour un événement
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Configuration récupérée
 *   put:
 *     tags: [Check-in]
 *     summary: Update check-in configuration
 *     description: Met à jour la configuration de check-in pour un événement
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               methods:
 *                 type: object
 *               notifications:
 *                 type: object
 *     responses:
 *       200:
 *         description: Configuration mise à jour
 */
router.get("/:tenantId/check-in/config/:eventId", CheckInController.getCheckInConfig);

router.put("/:tenantId/check-in/config/:eventId", 
  validateBody(z.object({
    methods: z.object({
      qrCode: z.object({
        enabled: z.boolean(),
        expirationHours: z.number().optional(),
        allowMultipleScans: z.boolean().optional()
      }).optional(),
      pinCode: z.object({
        enabled: z.boolean(),
        codeLength: z.number().optional(),
        expirationMinutes: z.number().optional()
      }).optional(),
      manual: z.object({
        enabled: z.boolean(),
        requiresApproval: z.boolean().optional()
      }).optional(),
      geofencing: z.object({
        enabled: z.boolean(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        radiusMeters: z.number().optional()
      }).optional()
    }).optional(),
    notifications: z.object({
      sendQrByEmail: z.boolean().optional(),
      sendQrBySms: z.boolean().optional(),
      sendReminder: z.boolean().optional(),
      reminderHoursBefore: z.number().optional()
    }).optional()
  })),
  CheckInController.updateCheckInConfig
);

/**
 * @swagger
 * /tenants/{tenantId}/check-in/generate-pin:
 *   post:
 *     tags: [Check-in]
 *     summary: Generate PIN code for check-in
 *     description: Génère un code PIN pour le check-in d'un participant
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *               userId:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *             required: [eventId, userId]
 *     responses:
 *       200:
 *         description: Code PIN généré
 */
router.post("/:tenantId/check-in/generate-pin",
  validateBody(z.object({
    eventId: z.string().min(1, "Event ID required"),
    userId: z.string().min(1, "User ID required"),
    expiresAt: z.string().optional()
  })),
  CheckInController.generatePinCode
);

/**
 * @swagger
 * /tenants/{tenantId}/check-in/validate-pin:
 *   post:
 *     tags: [Check-in]
 *     summary: Validate PIN code for check-in
 *     description: Valide un code PIN pour le check-in
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *               pinCode:
 *                 type: string
 *               userId:
 *                 type: string
 *             required: [eventId, pinCode]
 *     responses:
 *       200:
 *         description: Validation du code PIN
 */
router.post("/:tenantId/check-in/validate-pin",
  validateBody(z.object({
    eventId: z.string().min(1, "Event ID required"),
    pinCode: z.string().min(4, "PIN code required"),
    userId: z.string().optional()
  })),
  CheckInController.validatePinCode
);

/**
 * @swagger
 * /tenants/{tenantId}/check-in/manual:
 *   post:
 *     tags: [Check-in]
 *     summary: Manual check-in by organizer
 *     description: Check-in manuel par l'organisateur
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *               userId:
 *                 type: string
 *               notes:
 *                 type: string
 *             required: [eventId, userId]
 *     responses:
 *       200:
 *         description: Check-in manuel effectué
 */
router.post("/:tenantId/check-in/manual",
  validateBody(z.object({
    eventId: z.string().min(1, "Event ID required"),
    userId: z.string().min(1, "User ID required"),
    notes: z.string().optional()
  })),
  CheckInController.manualCheckIn
);

/**
 * @swagger
 * /tenants/{tenantId}/check-in/records/{eventId}:
 *   get:
 *     tags: [Check-in]
 *     summary: Get check-in records for an event
 *     description: Récupère les enregistrements de check-in pour un événement
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Enregistrements de check-in
 */
router.get("/:tenantId/check-in/records/:eventId",
  validateQuery(z.object({
    status: z.string().optional(),
    method: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  })),
  CheckInController.getCheckInRecords
);

/**
 * @swagger
 * /tenants/{tenantId}/check-in/stats/{eventId}:
 *   get:
 *     tags: [Check-in]
 *     summary: Get check-in statistics for an event
 *     description: Récupère les statistiques de check-in pour un événement
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Statistiques de check-in
 */
router.get("/:tenantId/check-in/stats/:eventId", CheckInController.getCheckInStats);

/**
 * @swagger
 * /tenants/{tenantId}/check-in/send-qr-codes/{eventId}:
 *   post:
 *     tags: [Check-in]
 *     summary: Send QR codes to participants
 *     description: Envoie les codes QR aux participants d'un événement
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sendEmail:
 *                 type: boolean
 *               sendSms:
 *                 type: boolean
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Codes QR envoyés
 */
router.post("/:tenantId/check-in/send-qr-codes/:eventId",
  validateBody(z.object({
    sendEmail: z.boolean().optional().default(true),
    sendSms: z.boolean().optional().default(false),
    userIds: z.array(z.string()).optional()
  })),
  CheckInController.sendQrCodesToParticipants
);

// ==========================================
// 🔑 API KEYS MANAGEMENT ROUTES
// ==========================================

/**
 * @swagger
 * /tenants/{tenantId}/api-keys:
 *   post:
 *     tags: [API Keys]
 *     summary: Créer une nouvelle clé API
 *     description: Crée une nouvelle clé API pour le tenant avec des scopes et limites spécifiés
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - scopes
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom de la clé API
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [read, write, admin, events, attendances, reports, users, integrations]
 *                 description: Permissions accordées à la clé
 *               expiresInDays:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 description: Nombre de jours avant expiration
 *               rateLimit:
 *                 type: object
 *                 properties:
 *                   requestsPerMinute:
 *                     type: integer
 *                   requestsPerHour:
 *                     type: integer
 *                   requestsPerDay:
 *                     type: integer
 *               metadata:
 *                 type: object
 *                 description: Métadonnées personnalisées
 *     responses:
 *       201:
 *         description: Clé API créée avec succès
 */
router.post("/:tenantId/api-keys",
  validateBody(z.object({
    name: z.string().min(1).max(100),
    scopes: z.array(z.enum(['read', 'write', 'admin', 'events', 'attendances', 'reports', 'users', 'integrations'])).min(1),
    expiresInDays: z.number().int().min(1).max(365).optional(),
    rateLimit: z.object({
      requestsPerMinute: z.number().int().min(1).optional(),
      requestsPerHour: z.number().int().min(1).optional(),
      requestsPerDay: z.number().int().min(1).optional()
    }).optional(),
    metadata: z.record(z.any()).optional()
  })),
  apiKeyController.createApiKey
);

/**
 * @swagger
 * /tenants/{tenantId}/api-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: Lister les clés API du tenant
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: myKeys
 *         schema:
 *           type: boolean
 *         description: Filtrer uniquement les clés de l'utilisateur actuel
 *     responses:
 *       200:
 *         description: Liste des clés API
 */
router.get("/:tenantId/api-keys", apiKeyController.listApiKeys);

/**
 * @swagger
 * /tenants/{tenantId}/api-keys/{keyId}:
 *   get:
 *     tags: [API Keys]
 *     summary: Obtenir une clé API spécifique
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails de la clé API
 */
router.get("/:tenantId/api-keys/:keyId", apiKeyController.getApiKey);

/**
 * @swagger
 * /tenants/{tenantId}/api-keys/{keyId}:
 *   put:
 *     tags: [API Keys]
 *     summary: Mettre à jour une clé API
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *               rateLimit:
 *                 type: object
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Clé API mise à jour
 */
router.put("/:tenantId/api-keys/:keyId",
  validateBody(z.object({
    name: z.string().min(1).max(100).optional(),
    scopes: z.array(z.enum(['read', 'write', 'admin', 'events', 'attendances', 'reports', 'users', 'integrations'])).optional(),
    isActive: z.boolean().optional(),
    rateLimit: z.object({
      requestsPerMinute: z.number().int().min(1).optional(),
      requestsPerHour: z.number().int().min(1).optional(),
      requestsPerDay: z.number().int().min(1).optional()
    }).optional(),
    metadata: z.record(z.any()).optional()
  })),
  apiKeyController.updateApiKey
);

/**
 * @swagger
 * /tenants/{tenantId}/api-keys/{keyId}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Supprimer une clé API
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Clé API supprimée
 */
router.delete("/:tenantId/api-keys/:keyId", apiKeyController.deleteApiKey);

/**
 * @swagger
 * /tenants/{tenantId}/api-keys/{keyId}/regenerate:
 *   post:
 *     tags: [API Keys]
 *     summary: Régénérer une clé API
 *     description: Génère une nouvelle clé tout en conservant les paramètres existants
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Nouvelle clé générée
 */
router.post("/:tenantId/api-keys/:keyId/regenerate", apiKeyController.regenerateApiKey);

/**
 * @swagger
 * /tenants/{tenantId}/api-keys/{keyId}/usage:
 *   get:
 *     tags: [API Keys]
 *     summary: Obtenir les statistiques d'usage d'une clé API
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Nombre de jours d'historique
 *     responses:
 *       200:
 *         description: Statistiques d'usage
 */
router.get("/:tenantId/api-keys/:keyId/usage", apiKeyController.getApiKeyUsage);

export { router as tenantRoutes };
/**
 * @swagger
 * /tenants/{tenantId}/onboarding/steps/{stepId}/complete:
 *   post:
 *     tags: [Multi-Tenant]
 *     summary: Mark a specific onboarding step as complete
 *     description: Marque une étape spécifique d'onboarding comme complétée
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du tenant
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [welcome, organization_profile, settings, attendance_policy, user_invitations, completion]
 *         description: ID de l'étape à marquer comme complétée
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stepData:
 *                 type: object
 *                 description: Données optionnelles associées à l'étape
 *     responses:
 *       200:
 *         description: Étape marquée comme complétée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     stepId:
 *                       type: string
 *                     completed:
 *                       type: boolean
 *                     onboardingComplete:
 *                       type: boolean
 *                     nextStep:
 *                       type: object
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Tenant ou étape non trouvé
 */
router.post("/:tenantId/onboarding/steps/:stepId/complete",
  TenantController.completeOnboardingStep
);