/**
 * AttendanceX API - Main Entry Point
 * Region: africa-south1
 */

// Load environment variables
import * as dotenv from "dotenv";
dotenv.config();

// Initialize Firebase
import { initializeFirebase } from "./config/firebase";
initializeFirebase();

// Firebase Functions
import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

// Express and middleware
import express, { Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cors from 'cors';

// Application imports
import { corsOptions } from "./config";
import { corsUltraAggressiveMiddleware, corsProtectionMiddleware, corsDebugMiddleware } from "./config/cors";
import { SERVER_CONFIG, PAYLOAD_LIMITS, LOGGING_CONFIG } from "./config/server.config";
import { rateLimitMemory } from "./middleware/rateLimit.memory";
import { rateLimitConfigs } from "./middleware/rateLimit";
import { sanitizeInput } from "./middleware/validation";
import { ipExtractionMiddleware } from "./middleware/ip-middleware";
import { globalErrorHandler, notFoundHandler } from "./middleware/errorHandler";
import {
  redirectToDocs,
  secureDocsHeaders,
  serveSwaggerDocs,
  serveSwaggerJson,
  setupSwaggerDocs
} from "./middleware/swagger";
import routes from "./routes";

// Global Firebase Functions configuration
setGlobalOptions({
  maxInstances: SERVER_CONFIG.maxInstances,
  memory: SERVER_CONFIG.memory,
  timeoutSeconds: SERVER_CONFIG.timeoutSeconds,
  region: SERVER_CONFIG.region,
});

// Initialize Express app
const app: Express = express();

logger.info("🚀 Server starting...", {
  environment: process.env.APP_ENV || 'development',
  region: SERVER_CONFIG.region,
  version: '2.0.0'
});

// CORS - Must be first
app.use(corsUltraAggressiveMiddleware);
app.use(cors(corsOptions));
app.use(corsProtectionMiddleware);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));

// CORS debug (development only)
if (process.env.APP_ENV !== 'production') {
  app.use(corsDebugMiddleware);
}

// Compression
app.use(compression({
  level: SERVER_CONFIG.compressionLevel,
  threshold: SERVER_CONFIG.compressionThreshold,
}));

// Body parsing with payload size validation
app.use(express.json({
  limit: PAYLOAD_LIMITS.JSON,
  verify: (_req, _res, buf) => {
    // Validate payload size to prevent memory issues
    if (buf.length > PAYLOAD_LIMITS.MAX_SIZE_BYTES) {
      throw new Error('Payload too large');
    }
  },
}));

app.use(express.urlencoded({
  extended: true,
  limit: PAYLOAD_LIMITS.URL_ENCODED,
  parameterLimit: SERVER_CONFIG.parameterLimit,
}));

// HTTP logging
if (LOGGING_CONFIG.enableMorgan) {
  app.use(morgan('dev'));
}

// Request tracking
app.use((req, res, next) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
});

// IP extraction (must be before rate limiting for proper IP detection)
app.use(ipExtractionMiddleware);

// Rate limiting
app.use(rateLimitMemory(rateLimitConfigs.general));

// Input sanitization
app.use(sanitizeInput);

// API Documentation
app.use('/docs', secureDocsHeaders, serveSwaggerDocs, setupSwaggerDocs);
app.get('/swagger.json', secureDocsHeaders, serveSwaggerJson);
app.get('/api-docs', redirectToDocs);

// API Routes
app.use('/v1', routes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

// Export main API function
export const api = onRequest({
  timeoutSeconds: SERVER_CONFIG.timeoutSeconds,
  memory: SERVER_CONFIG.memory,
  maxInstances: SERVER_CONFIG.maxInstances,
  invoker: 'public',
  region: SERVER_CONFIG.region,
}, app);

logger.info('✅ Server is running', {
  region: SERVER_CONFIG.region,
  environment: process.env.APP_ENV || 'development',
  version: '2.0.0',
  timestamp: new Date().toISOString()
});

// ============================================================================
// SCHEDULED FUNCTIONS & BACKGROUND JOBS
// ============================================================================
// NOTE: Commented out due to region limitations in africa-south1
// Cloud Functions v1 scheduled functions and Cloud Functions v2 scheduled functions
// are not supported in africa-south1 region
// 
// To enable these functions:
// 1. Either deploy to a supported region (e.g., europe-west1, us-central1)
// 2. Or set up App Engine in africa-south1 region
// 3. Or use Cloud Scheduler with HTTP triggers instead
//
// Supported regions for Cloud Functions: https://cloud.google.com/functions/docs/locations

// // Analytics Functions
// export {
//   collectIntegrationMetrics,
//   cleanupOldMetrics,
//   generateWeeklyReport
// } from './functions/analytics.functions';

// // Dunning Processor Functions
// export {
//   processDunningDaily,
//   cleanupDunningWeekly,
//   generateDunningReportsMonthly,
//   sendDunningNotifications,
//   processDunningManual
// } from './functions/dunning-processor.function';

// // Maintenance Functions
// export {
//   scheduledMaintenance,
//   triggerMaintenance,
//   getMaintenanceStatus
// } from './functions/maintenance.function';

// // Metrics Functions
// export {
//   scheduledMetricsCollection,
//   triggerMetricsCollection,
//   getMetricsDashboard
// } from './functions/metrics.function';

// // Scheduled Cleanup Functions
// export {
//   cleanupHealthChecks
// } from './functions/scheduled/cleanup-health-checks';

logger.info('✅ API function ready', {
  functions: ['api'],
  totalFunctions: 1,
  note: 'Scheduled functions are disabled due to africa-south1 region limitations'
});