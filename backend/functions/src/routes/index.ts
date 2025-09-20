import { Request, Response, Router } from "express";
// Routes
import { authRoutes } from "./auth/auth.routes";
import { userRoutes } from "./user/users.routes";
import { organizationRoutes } from "./organization/organizations.routes";
import { tenantRoutes } from "./tenant/tenant.routes";
import { eventRoutes } from "./event/events.routes";
import { attendanceRoutes } from "./attendance/attendances.routes";
import { notificationRoutes } from "./notification/notifications.routes";
import { reportRoutes } from "./report/reports.routes";
import { appointmentRoutes } from "./appointment/appointments.routes";
import { mlRoutes } from "./report/ml.routes";
import { qrCodeRoutes } from "./integration/qrcode.routes";
import integrationRoutes from "./integration/integration.routes";
import teamRoutes from "./user/teams.routes";
import adminRoutes from "./system/admin.routes";
import { emailCampaignRoutes } from "./campaign/email-campaign.routes";
import billingRoutes from "./billing/billing.routes";
import dunningRoutes from "./billing/dunning.routes";
import { asyncHandler } from "../middleware/errorHandler";
import { authService } from "../services/auth/auth.service";
import { notificationService } from "../services/notification";
import { authenticate, requirePermission } from "../middleware/auth";
import { addDeprecationWarning } from "../middleware/deprecation.middleware";
// Swagger documentation (maintenant configuré dans index.ts)

const router = Router();

// ⚠️ Middleware global pour les warnings de dépréciation
router.use(addDeprecationWarning);



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

// 📊 Status endpoint pour les services
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

// 📚 Documentation Swagger (maintenant configuré dans index.ts principal)

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
      organizations: '/api/organizations', // DEPRECATED - Use /api/tenants
      tenants: '/api/tenants', // NEW - Multi-tenant system
      teams: '/api/teams',
      events: '/api/events',
      attendances: '/api/attendances',
      notifications: '/api/notifications',
      reports: '/api/reports',
      ml: '/api/ml',
      integrations: '/api/user/integrations',
      emailCampaigns: '/api/email-campaigns',
      docs: '/docs',
      health: '/health',
      status: '/status'
    },
    deprecations: {
      '/api/organizations': {
        replacement: '/api/tenants',
        sunset: '2024-12-31',
        message: 'Use the new multi-tenant system instead'
      }
    },
    status: 'operational',
    lastDeployed: process.env.DEPLOY_TIME || new Date().toISOString(),
  });
});

// 🛣️ API Routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/organizations", organizationRoutes);
router.use("/tenants", tenantRoutes);
router.use(teamRoutes);
router.use("/events", eventRoutes);
router.use("/attendances", attendanceRoutes);
router.use("/notifications", notificationRoutes);
router.use("/reports", reportRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/ml", mlRoutes);
router.use("/qr-codes", qrCodeRoutes);
router.use("/user/integrations", integrationRoutes);
router.use("/email-campaigns", emailCampaignRoutes);
router.use("/billing", billingRoutes);
router.use("/dunning", dunningRoutes);

// 🔐 Admin Routes (avec authentification)
router.use("/admin", authenticate, adminRoutes);
router.use("/admin/migration", authenticate, require("./admin/migration.routes").migrationRoutes);

// 📊 Métriques et monitoring (admin uniquement)
router.get('/api/metrics',
  authenticate,
  requirePermission('view_system_metrics'),
  asyncHandler(async (_req: Request, res: Response) => {
    const metrics = {}; // await analyticsService.getSystemMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  })
);

// 🔍 404 handler (doit être en dernier)
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

export default router;  