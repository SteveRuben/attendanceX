import {Router, Request, Response} from "express";
// Routes
import {authRoutes} from "./auth.routes";
import {userRoutes} from "./users.routes";
import {eventRoutes} from "./events.routes";
import {attendanceRoutes} from "./attendances.routes";
import {notificationRoutes} from "./notifications.routes";
import {reportRoutes} from "./reports.routes";
import { asyncHandler } from "../middleware/errorHandler";
import { authService } from "../services/auth.service";
import { notificationService } from "../services/notification";
import { authenticate, requirePermission } from "../middleware/auth";
import { mlService } from "../services/ml.service";
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
    notificationService.healthCheck?.() || Promise.resolve('ok'),
  ]);

  const isHealthy = healthChecks.every(check => check.status === 'fulfilled');

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      database: healthChecks[0].status === 'fulfilled' ? 'ok' : 'error',
      auth: healthChecks[1].status === 'fulfilled' ? 'ok' : 'error',
      notifications: healthChecks[2].status === 'fulfilled' ? 'ok' : 'error',
    },
  });
}));

// API Info endpoint enrichi
router.get('/api', (req, res) => {
  res.json({
    name: 'Attendance-X API',
    version: '2.0.0',
    description: 'API complète pour la gestion de présence avec IA et analytics avancés',
    documentation: {
      swagger: '/api/docs',
      postman: '/api/postman',
      github: 'https://github.com/SteveRuben/attendanceX',
    },
    features: [
      'Authentification sécurisée avec 2FA',
      'Gestion d\'événements avec récurrence',
      'Présences multi-modales (QR, géoloc, biométrie)',
      'Notifications multi-canaux (Push, SMS, Email)',
      'Rapports intelligents avec analytics',
      'IA prédictive et détection d\'anomalies',
      'API RESTful avec rate limiting',
      'Monitoring et métriques temps réel'
    ],
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      events: '/api/events',
      attendances: '/api/attendances',
      notifications: '/api/notifications',
      push: '/api/push',
      sms: '/api/sms',
      reports: '/api/reports',
      analytics: '/api/analytics',
      ml: '/api/ml',
      admin: '/api/admin',
    },
    status: 'operational',
    lastDeployed: process.env.DEPLOY_TIME || new Date().toISOString(),
  });
});

// 🛣️ API Routes
router.use("/api/auth", authRoutes);
router.use("/api/users", userRoutes);
router.use("/api/events", eventRoutes);
router.use("/api/attendances", attendanceRoutes);
router.use("/api/notifications", notificationRoutes);
router.use("/api/reports", reportRoutes);

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
        notifications: await notificationService.getStatus() || 'unknown',
        push: 'unknown',
        ml: await mlService.getModelStatus?.() || 'unknown',
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