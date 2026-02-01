/**
 * Public Email Test Routes
 * Public endpoint for testing email configuration
 */

import { Router } from "express";
import { rateLimitPresets } from "../../middleware/smartRateLimit";
import { EmailTestController } from "../../controllers/email/email-test.controller";

const router = Router();

// Apply rate limiting to prevent abuse (normal preset for public endpoint)
router.use(rateLimitPresets.normal());

// Public test email endpoint
router.post("/test-email", EmailTestController.sendTestEmail);

export { router as emailTestRoutes };
