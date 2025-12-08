// Routes pour la gestion multi-tenant
import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validation";
import { z } from "zod";
import { TenantController } from "../../controllers/tenant/tenant.controller";

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
router.patch("/:tenantId/settings",
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
 *   patch:
 *     tags: [Multi-Tenant]
 *     summary: Update tenant attendance policy
 *     description: Met à jour la politique de présence du tenant
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
 *         description: Politique de présence mise à jour
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Tenant non trouvé
 */
router.patch("/:tenantId/settings/attendance",
  validateBody(z.object({
    policy: z.object({
      workDays: z.number().min(1).max(7).optional(),
      startHour: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
      endHour: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
      graceMinutes: z.number().min(0).max(120).optional(),
    })
  })),
  TenantController.updateAttendancePolicy
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


export { router as tenantRoutes };