/**
 * Routes pour la gestion des permissions
 * Définit les endpoints pour les vérifications de permissions et contexte utilisateur
 */

import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { injectTenantContext } from "../../middleware/tenant-context.middleware";
import { smartRateLimit } from "../../middleware/smartRateLimit";
import { PermissionController } from "../../controllers/permissions/permission.controller";

const router = Router();

// Middleware chain obligatoire
router.use(smartRateLimit);
router.use(authenticate);
router.use(injectTenantContext);

// Routes pour les permissions
router.get("/context/:userId", PermissionController.getUserContext);
router.post("/check", PermissionController.checkPermission);
router.get("/roles/:role", PermissionController.getPermissionsForRole);
router.get("/plans/:planType/features", PermissionController.getFeaturesForPlan);

export { router as permissionRoutes };