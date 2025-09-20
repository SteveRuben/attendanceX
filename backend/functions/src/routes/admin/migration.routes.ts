// Routes d'administration pour les migrations
import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import { authMigrationService } from "../../services/migration/auth-migration.service";
import { Request, Response } from "express";

const router = Router();

// 🔒 Authentification et permissions admin requises
router.use(authenticate);
router.use(requirePermission('admin_access'));

/**
 * @swagger
 * /admin/migration/organizations-to-tenants:
 *   post:
 *     tags: [Admin - Migration]
 *     summary: Migrer les organisations vers le système multi-tenant
 *     description: Migre toutes les organisations existantes vers le nouveau système de tenants
 *     responses:
 *       200:
 *         description: Migration réussie
 *       403:
 *         description: Permissions insuffisantes
 */
router.post("/organizations-to-tenants",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authMigrationService.migrateOrganizationsToTenants();
    
    res.json({
      success: true,
      message: "Migration des organisations terminée",
      data: result
    });
  })
);

/**
 * @swagger
 * /admin/migration/cleanup-duplicates:
 *   post:
 *     tags: [Admin - Migration]
 *     summary: Nettoyer les doublons d'authentification
 *     description: Supprime les sessions et données dupliquées
 *     responses:
 *       200:
 *         description: Nettoyage réussi
 */
router.post("/cleanup-duplicates",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authMigrationService.cleanupAuthDuplicates();
    
    res.json({
      success: true,
      message: "Nettoyage des doublons terminé",
      data: result
    });
  })
);

/**
 * @swagger
 * /admin/migration/validate-integrity:
 *   get:
 *     tags: [Admin - Migration]
 *     summary: Valider l'intégrité du système multi-tenant
 *     description: Vérifie la cohérence des données multi-tenant
 *     responses:
 *       200:
 *         description: Validation terminée
 */
router.get("/validate-integrity",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authMigrationService.validateMultiTenantIntegrity();
    
    res.json({
      success: true,
      message: "Validation de l'intégrité terminée",
      data: result
    });
  })
);

/**
 * @swagger
 * /admin/migration/run-full:
 *   post:
 *     tags: [Admin - Migration]
 *     summary: Exécuter la migration complète
 *     description: Lance toutes les étapes de migration en séquence
 *     responses:
 *       200:
 *         description: Migration complète réussie
 */
router.post("/run-full",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authMigrationService.runFullMigration();
    
    res.json({
      success: true,
      message: "Migration complète terminée",
      data: result
    });
  })
);

export { router as migrationRoutes };