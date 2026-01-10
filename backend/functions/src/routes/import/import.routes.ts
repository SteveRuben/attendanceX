import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { injectTenantContext } from "../../middleware/tenant-context.middleware";
import { smartRateLimit } from "../../middleware/smartRateLimit";
import { ImportController } from "../../controllers/import/import.controller";

const router = Router();

// Middleware chain obligatoire
router.use(smartRateLimit);
router.use(authenticate);
router.use(injectTenantContext);

// Routes d'import
router.post("/preview", ImportController.previewImport);
router.post("/bulk", ImportController.bulkImport);
router.get("/templates/:type", ImportController.getImportTemplates);
router.get("/templates/:type/download", ImportController.downloadTemplate);

// Routes de gestion des jobs d'import
router.get("/jobs", ImportController.getImportHistory);
router.get("/jobs/:jobId", ImportController.getImportJob);
router.post("/jobs/:jobId/cancel", ImportController.cancelImportJob);

export { router as importRoutes };