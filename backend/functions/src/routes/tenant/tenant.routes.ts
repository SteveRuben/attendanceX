// Routes pour la gestion multi-tenant
import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validation";
import { z } from "zod";
import { TenantController } from "../../controllers/tenant/tenant.controller";

import { asyncHandler } from "../../middleware/errorHandler";
import { injectTenantContext, validateTenantAccess } from "../../middleware/tenant-context.middleware";
import setupWizardService from "../../services/onboarding/setup-wizard.service";

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
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Onboarding status
 */
router.get("/:tenantId/onboarding-status",
  injectTenantContext,
  validateTenantAccess,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params as any;
    const status = await setupWizardService.getSetupWizardStatus(tenantId);

    let nextStep: 'settings' | 'policy' | 'invite' | undefined;
    if (!status.isComplete) {
      const steps: any[] = Array.isArray(status.steps) ? status.steps : [];
      const next = steps.find(s => !s.completed) || steps.find(s => s.required && !s.completed);
      if (next) {
        nextStep = next.id === 'user_invitations' ? 'invite' : 'settings';
      }
    }

    res.json({
      success: true,
      data: {
        completed: !!status.isComplete,
        ...(nextStep ? { nextStep } : {})
      }
    });
  })
);

/**
 * @swagger
 * /tenants/{tenantId}/onboarding/complete:
 *   post:
 *     tags: [Multi-Tenant]
 *     summary: Mark onboarding as complete for a tenant
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Onboarding completed
 */
router.post("/:tenantId/onboarding/complete",
  injectTenantContext,
  validateTenantAccess,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params as any;
    const userId = (req as any).user?.uid;
    await setupWizardService.completeSetup(tenantId, userId);
    res.json({ success: true, message: "Onboarding completed" });
  })
);


export { router as tenantRoutes };