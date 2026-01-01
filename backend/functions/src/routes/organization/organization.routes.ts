import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { injectTenantContext } from "../../middleware/tenant-context.middleware";
import { smartRateLimit } from "../../middleware/smartRateLimit";
import { OrganizationController } from "../../controllers/organization/organization.controller";

const router = Router();

// Middleware chain obligatoire
router.use(smartRateLimit);
router.use(requireAuth);
router.use(injectTenantContext);

// Routes CRUD pour les organisations
router.post("/", OrganizationController.createOrganization);
router.get("/tenant", OrganizationController.getTenantOrganization);
router.get("/:organizationId", OrganizationController.getOrganization);
router.put("/:organizationId", OrganizationController.updateOrganization);
router.delete("/:organizationId", OrganizationController.deleteOrganization);

// Routes pour les paramètres et branding
router.put("/:organizationId/settings", OrganizationController.updateOrganizationSettings);
router.put("/:organizationId/branding", OrganizationController.updateOrganizationBranding);

// Routes pour la vérification de domaines
router.get("/check-domain/:domain", OrganizationController.checkDomainAvailability);

export { router as organizationRoutes };