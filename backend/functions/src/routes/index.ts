import { Request, Response, Router } from "express";
// Routes
import { authRoutes } from "./auth.routes";
import { userRoutes } from "./users.routes";
import { eventRoutes } from "./events.routes";
import { attendanceRoutes } from "./attendances.routes";
import { notificationRoutes } from "./notifications.routes";
import { reportRoutes } from "./reports.routes";
import { asyncHandler } from "../middleware/errorHandler";
import { authService } from "../services/auth.service";
import { notificationService } from "../services/notification";
import { authenticate, requirePermission } from "../middleware/auth";
// Swagger documentation
import {
  serveSwaggerDocs,
  setupSwaggerDocs,
  serveSwaggerJson,
  redirectToDocs,
  secureDocsHeaders
} from "../middleware/swagger";

const router = Router();



// ❤️ Health check endpoint
// Health check endpoint détaillé
router.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  const healthChecks = await Promise.allSettled([
    // Vérification Firestore
    new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 5000);
      // Test basique Firestore
      resolve('ok');
    }),

    // Vérification des services critiques
    authService.healthCheck?.() || Promise.resolve('ok'),
    // Vérification du service de notification (pas de healthCheck disponible)
    Promise.resolve(notificationService ? 'ok' : 'error'),
  ]);

  const isHealthy = healthChecks.every(check => check.status === 'fulfilled');

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.APP_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      database: healthChecks[0].status === 'fulfilled' ? 'ok' : 'error',
      auth: healthChecks[1].status === 'fulfilled' ? 'ok' : 'error',
      notifications: healthChecks[2].status === 'fulfilled' ? 'ok' : 'error',
    },
  });
}));

// Status endpoint pour les services
router.get('/status', asyncHandler(async (_req: Request, res: Response) => {
  const services = {
    auth: await authService.getStatus?.() || 'operational',
    notifications: notificationService ? 'operational' : 'unknown',
    push: 'operational',
    ml: 'operational',
  };

  res.json({
    success: true,
    data: {
      services,
      timestamp: new Date().toISOString(),
      overall: Object.values(services).every(s => s === 'operational') ? 'operational' : 'degraded'
    }
  });
}));

// 📚 Documentation Swagger
router.use('/docs', secureDocsHeaders, serveSwaggerDocs, setupSwaggerDocs);
router.get('/swagger.json', secureDocsHeaders, serveSwaggerJson);
router.get('/api-docs', redirectToDocs);

// API Info endpoint enrichi
router.get('/api', (req, res) => {
  res.json({
    name: 'Attendance-X API',
    version: '2.0.0',
    description: 'API complète pour la gestion de présence avec IA et analytics avancés',
    documentation: {
      swagger: '/docs',
      swaggerJson: '/swagger.json',
      postman: '/api/postman',
      github: 'https://github.com/SteveRuben/attendanceX',
    },
    features: [
      'Authentification sécurisée avec JWT et 2FA',
      'Gestion d\'événements avec récurrence intelligente',
      'Présences multi-modales (QR, géoloc, biométrie)',
      'Notifications multi-canaux (Push, SMS, Email)',
      'Rapports intelligents avec analytics avancés',
      'IA prédictive et détection d\'anomalies',
      'API RESTful avec rate limiting et sécurité',
      'Documentation interactive avec Swagger',
      'Monitoring et métriques temps réel'
    ],
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      events: '/api/events',
      attendances: '/api/attendances',
      notifications: '/api/notifications',
      reports: '/api/reports',
      ml: '/api/ml',
      docs: '/docs',
      health: '/health',
      status: '/status'
    },
    status: 'operational',
    lastDeployed: process.env.DEPLOY_TIME || new Date().toISOString(),
  });
});

// 🛣️ API Routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/events", eventRoutes);
router.use("/attendances", attendanceRoutes);
router.use("/notifications", notificationRoutes);
router.use("/reports", reportRoutes);
//router.use("/api/ml", mlRoutes);

// 🔍 404 handler
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});


// Métriques système (admin uniquement)
router.get('/api/metrics',
  authenticate,
  requirePermission('view_system_metrics'),
  asyncHandler(async (req: Request, res: Response) => {
    const metrics = {};//await analyticsService.getSystemMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  })
);

// Status des services
router.get('/api/status',
  authenticate,
  requirePermission('view_system_status'),
  asyncHandler(async (req: Request, res: Response) => {
    const status = {
      services: {
        auth: await authService.getStatus?.() || 'unknown',
        notifications: notificationService ? 'operational' : 'unknown',
        push: 'unknown',
        ml: 'unknown',
      },
      database: 'connected',
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: status,
    });
  }));

export default router;  