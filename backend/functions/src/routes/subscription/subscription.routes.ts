/**
 * Subscription Routes
 * 
 * Handles all subscription-related endpoints including:
 * - Subscription creation and management
 * - Plan changes and cancellations
 * - Subscription status queries
 * 
 * All routes require authentication and tenant context.
 */

import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { injectTenantContext } from "../../middleware/tenant-context.middleware";
import { validateBody } from "../../middleware/validation";
import { smartRateLimit } from "../../middleware/smartRateLimit";
import { SubscriptionController } from "../../controllers/subscription/subscription.controller";
import { z } from "zod";

const router = Router();

// Middleware chain obligatoire
router.use(smartRateLimit);
router.use(authenticate);
router.use(injectTenantContext);

// ===== VALIDATION SCHEMAS =====

/**
 * Schema for creating a new subscription
 */
const createSubscriptionSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  metadata: z.record(z.any()).optional()
});

/**
 * Schema for updating a subscription
 */
const updateSubscriptionSchema = z.object({
  planId: z.string().min(1).optional(),
  status: z.enum(['active', 'inactive', 'cancelled', 'trialing', 'grace_period', 'past_due']).optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Schema for cancelling a subscription
 */
const cancelSubscriptionSchema = z.object({
  reason: z.string().optional()
});

// ===== SUBSCRIPTION ROUTES =====

/**
 * POST /subscriptions
 * Create a new subscription for the current tenant
 */
router.post("/", validateBody(createSubscriptionSchema), SubscriptionController.createSubscription);

/**
 * GET /subscriptions
 * Get all subscriptions for the current tenant (with pagination and filtering)
 */
router.get("/", SubscriptionController.getSubscriptionsByTenant);

/**
 * GET /subscriptions/active
 * Get the active subscription for the current tenant
 */
router.get("/active", SubscriptionController.getActiveSubscription);

/**
 * GET /subscriptions/:subscriptionId
 * Get a specific subscription by ID
 */
router.get("/:subscriptionId", SubscriptionController.getSubscription);

/**
 * PUT /subscriptions/:subscriptionId
 * Update a specific subscription
 */
router.put("/:subscriptionId", validateBody(updateSubscriptionSchema), SubscriptionController.updateSubscription);

/**
 * DELETE /subscriptions/:subscriptionId
 * Cancel a specific subscription
 */
router.delete("/:subscriptionId", validateBody(cancelSubscriptionSchema), SubscriptionController.cancelSubscription);

export { router as subscriptionRoutes };