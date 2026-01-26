// index.ts - Version mise à jour avec configuration CORS centralisée

// Load environment variables first
import * as dotenv from "dotenv";
dotenv.config();

// Initialize Firebase with proper configuration
import { initializeFirebase } from "./config/firebase-init";
initializeFirebase();
import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import express, { Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { contentSecurityPolicy, hsts } from "./config/app";
import { rateLimit, rateLimitConfigs } from "./middleware/rateLimit";
import routes from "./routes";
import { globalErrorHandler, notFoundHandler } from "./middleware/errorHandler";
import { sanitizeInput } from "./middleware/validation";
import compression from "compression";
import { corsOptions } from "./config";
import cors from 'cors';
import {
  redirectToDocs,
  secureDocsHeaders,
  serveSwaggerDocs,
  serveSwaggerJson,
  setupSwaggerDocs
} from "./middleware/swagger";
import {
  corsDebugMiddleware,
  corsProtectionMiddleware,
  corsUltraAggressiveMiddleware} from "./config/cors";
import { SERVER_CONFIG, PAYLOAD_LIMITS, LOGGING_CONFIG } from "./config/server.config";

// Configuration globale Firebase Functions
setGlobalOptions({
  maxInstances: SERVER_CONFIG.maxInstances,
  memory: SERVER_CONFIG.memory,
  timeoutSeconds: SERVER_CONFIG.timeoutSeconds,
  region: SERVER_CONFIG.region,
});

// Validation de la configuration CORS au démarrage
/* if (!validateCorsConfig()) {
  logger.error("❌ Configuration CORS invalide - Arrêt du serveur");
  throw new Error("Configuration CORS invalide");
} */

const app: Express = express();

logger.info("🚀 Initialisation du serveur Express", {
  environment: process.env.APP_ENV || 'development',
  region: 'europe-west1',
  corsStrategy: 'ultra-aggressive-centralized'
});


// 🚨 CORS ULTRA-AGRESSIF EN PREMIER (avant tous les autres middlewares)
app.use(corsUltraAggressiveMiddleware);
app.use(cors(corsOptions));
// 🛡️ Protection contre l'écrasement des headers CORS
app.use(corsProtectionMiddleware);

// 🛡️ Sécurité Helmet (après CORS pour éviter les conflits)
app.use(helmet({
  contentSecurityPolicy,
  hsts,
  crossOriginEmbedderPolicy: false,
  // Désactiver les headers qui pourraient interférer avec CORS
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));

// 🔧 Middleware de debug CORS (seulement en développement)
if (process.env.APP_ENV !== 'production') {
  app.use(corsDebugMiddleware);
}

// 🔧 Middleware CORS de secours
/* app.use(corsBackupMiddleware); */

// 📦 Compression des réponses
app.use('/', compression({
  level: SERVER_CONFIG.compressionLevel,
  threshold: SERVER_CONFIG.compressionThreshold,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// 📝 Body parsing avec limites de sécurité
app.use(express.json({
  limit: PAYLOAD_LIMITS.JSON,
  verify: (req, res, buf) => {
    if (buf.length > PAYLOAD_LIMITS.MAX_SIZE_BYTES) {
      logger.warn('⚠️ Payload trop volumineux détecté', {
        size: buf.length,
        maxSize: PAYLOAD_LIMITS.MAX_SIZE_BYTES,
        url: req.url
      });
      throw new Error('Payload trop volumineux');
    }
  },
}));

app.use(express.urlencoded({
  extended: true,
  limit: PAYLOAD_LIMITS.URL_ENCODED,
  parameterLimit: SERVER_CONFIG.parameterLimit,
}));

// 📊 Logging HTTP en développement
if (LOGGING_CONFIG.enableMorgan) {
  app.use(morgan('dev'));
}

// 📊 Logging personnalisé pour la production
app.use((req, res, next) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const user = (req as any).user;

    logger.info('HTTP Request Completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: user?.uid,
      contentLength: res.get('content-length'),
      origin: req.get('Origin'),
      corsHeaders: {
        'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials')
      }
    });
  });

  next();
});

// 🚦 Rate limiting global
app.use(rateLimit(rateLimitConfigs.general));

// 🧹 Sanitisation des entrées
app.use(sanitizeInput);

// 📚 Documentation Swagger (accessible directement)
app.use('/docs', secureDocsHeaders, serveSwaggerDocs, setupSwaggerDocs);
app.get('/swagger.json', secureDocsHeaders, serveSwaggerJson);
app.get('/api-docs', redirectToDocs);

// 🌐 Routes API principales
app.use('/v1', routes);

// 🔍 Middleware final pour vérifier les headers avant envoi
/* app.use(corsFinalCheckMiddleware); */

// 🔍 404 handler pour routes non trouvées
app.use(notFoundHandler);

// ❌ Gestionnaire d'erreurs global (doit être en dernier)
app.use(globalErrorHandler);

// 🌍 Fonction API principale
export const api = onRequest({
  timeoutSeconds: SERVER_CONFIG.timeoutSeconds,
  memory: SERVER_CONFIG.memory,
  maxInstances: SERVER_CONFIG.maxInstances,
  invoker: 'public',
  region: SERVER_CONFIG.region,
}, app);

logger.info('🚀 Attendance-X Functions Initialized', {
  version: '2.0.0',
  environment: process.env.APP_ENV || 'development',
  timestamp: new Date().toISOString(),
  corsStrategy: 'ultra-aggressive-centralized',
  features: [
    'Express API with advanced security',
    'Ultra-aggressive CORS configuration',
    'Comprehensive logging with Firebase Logger',
    'Multi-service architecture',
    'AI/ML integration',
    'Real-time analytics',
    'Scheduled functions',
    'Firestore triggers',
    'Multi-channel notifications',
    'Enterprise-grade monitoring'
  ],
});

// Export scheduled jobs
// Warmup job temporairement désactivé pour déploiement
// export { warmupJob } from "./jobs/warmup.job";
// export { dailyCleanup, weeklyCleanup, monthlyCleanup } from "./jobs/cleanup.jobs";
// export {
//   collectEmailVerificationMetrics,
//   dailyEmailVerificationCleanup,
//   weeklyEmailVerificationReport
// } from "./jobs/email-verification-metrics.jobs";
// export { metrics, collectMetrics } from "./monitoring/metrics";
// export {
//   collectIntegrationMetrics,
//   cleanupOldMetrics,
//   generateWeeklyReport
// } from "./functions/analytics.functions";


logger.info('✅ All Attendance-X Functions deployed successfully');