// Load environment variables first
import * as dotenv from "dotenv";
dotenv.config();

// Initialize Firebase with proper configuration
import { initializeFirebase } from "./config/firebase-init";
initializeFirebase();
import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { contentSecurityPolicy, hsts, getDynamicCorsOptions } from "./config/app";
import { rateLimit, rateLimitConfigs } from "./middleware/rateLimit";
import routes from "./routes";
import { globalErrorHandler, notFoundHandler } from "./middleware/errorHandler";
import { sanitizeInput } from "./middleware/validation";
import compression from "compression";

// 🔥 Configuration globale Firebase Functions
setGlobalOptions({
  maxInstances: 100,
  memory: "2GiB",
  timeoutSeconds: 300,
  region: "europe-west1", // Optimisé pour l'Europe
});

// Firebase Admin déjà initialisé via initializeFirebase() ci-dessus

// Start writing functions
// https://firebase.google.com/docs/functions/typescript
const app = express();
app.use(helmet({
  contentSecurityPolicy,
  hsts, 
  crossOriginEmbedderPolicy: false,
}));


app.use(cors(getDynamicCorsOptions()));

app.use((req, res, next) => {
  logger.warn(`🔍 ${req.method} ${req.path} from ${req.headers.origin}`);
  next();
});

 // Compression des réponses
app.use('/', compression({
  level: 6,
  threshold: 1024, // Compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
})); 

// Body parsing avec limites de sécurité
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    if (buf.length > 10 * 1024 * 1024) {
      throw new Error('Payload trop volumineux');
    }
  },
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 100,
}));

// Logging HTTP en développement
if (process.env.APP_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Logging personnalisé pour la production
app.use((req, res, next) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const user = (req as any).user;

    logger.info('HTTP Request', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: user?.uid,
      contentLength: res.get('content-length'),
    });
  });

  next();
});

// Rate limiting global
app.use(rateLimit(rateLimitConfigs.general));

// Sanitisation des entrées
app.use(sanitizeInput);

// Headers de sécurité additionnels
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.get('/test', (req, res) => {
  res.json({
    message: '🚀 Attendance-X API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/test/health',
      tests: '/test',
      api: '/api/v1'
    }
  });
});

// Routes API principales
app.use('/v1', routes);

// 404 handler pour routes non trouvées
app.use(notFoundHandler);

// Gestionnaire d'erreurs global (doit être en dernier)
app.use(globalErrorHandler);

// 🌐 Fonction API principale
export const api = onRequest({
  timeoutSeconds: 300,
  memory: '2GiB',
  maxInstances: 100,
  cors: true,
  invoker: 'public',
  region: 'europe-west1',
}, app);

logger.info('🚀 Attendance-X Functions initialized', {
  version: '2.0.0',
  environment: process.env.APP_ENV || 'development',
  timestamp: new Date().toISOString(),
  features: [
    'Express API with advanced security',
    'Multi-service architecture',
    'AI/ML integration',
    'Real-time analytics',
    'Scheduled functions',
    'Firestore triggers',
    'Multi-channel notifications',
    'Enterprise-grade monitoring'
  ],
});

logger.info('✅ All Attendance-X Functions deployed successfully');
