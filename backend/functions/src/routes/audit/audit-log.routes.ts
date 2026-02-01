/**
 * Audit Log Routes
 * Routes for audit log management
 */

import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { injectTenantContext } from "../../middleware/tenant-context.middleware";
import { rateLimitPresets } from "../../middleware/smartRateLimit";
import { AuditLogController } from "../../controllers/audit/audit-log.controller";

const router = Router();

// Middleware chain: rate limit → auth → tenant context
router.use(rateLimitPresets.normal());
router.use(authenticate);
router.use(injectTenantContext);

// Routes
router.get("/", AuditLogController.getLogs);
router.get("/:logId", AuditLogController.getLogById);

export { router as auditLogRoutes };
