/**
 * Health Check Routes
 * Public endpoints for server health monitoring
 */

import { Router } from 'express';
import { getHealthStatus, ping } from '../../controllers/health/health.controller';

const router = Router();

// NOTE: No rate limiting on health endpoints
// Health checks must be fast and reliable for monitoring systems
// They don't access user data or perform expensive operations
// If abuse becomes an issue, implement IP-based rate limiting at the infrastructure level

/**
 * GET /health
 * Get detailed server health status
 * Public endpoint - no authentication required
 */
router.get('/', getHealthStatus);

/**
 * GET /health/ping
 * Simple ping endpoint for uptime monitoring
 * Public endpoint - no authentication required
 */
router.get('/ping', ping);

export { router as healthRoutes };
