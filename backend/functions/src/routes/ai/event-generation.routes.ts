import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { injectTenantContext } from "../../middleware/tenant-context.middleware";
import { smartRateLimit } from "../../middleware/smartRateLimit";
import { EventGenerationController } from "../../controllers/ai/event-generation.controller";

const router = Router();

// Middleware chain pour toutes les routes AI
router.use(smartRateLimit);
router.use(authenticate);
router.use(injectTenantContext);

// Routes de génération d'événements IA
router.post("/generate", EventGenerationController.generateEvent);
router.post("/create-from-generated", EventGenerationController.createEventFromGenerated);
router.post("/refine/:eventId", EventGenerationController.refineEvent);

// Route de test de connexion IA
router.get("/test-connection", EventGenerationController.testAIConnection);

export { router as eventGenerationRoutes };