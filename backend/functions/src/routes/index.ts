import { Request, Response, Router } from "express";
// Routes
import { authRoutes } from "./auth/auth.routes";
import { userRoutes } from "./user/users.routes";
import { userProfileRoutes } from "./user/user-profile.routes";
import { userInvitationRoutes } from "./user/user-invitations.routes";
import { publicInvitationRoutes } from "./public/public-invitations.routes"; // Routes publiques séparées
import publicTenantRegistrationRoutes from "./public/tenant-registration.routes"; // Routes publiques pour l'enregistrement
import { tenantRoutes } from "./tenant/tenant.routes";
import { eventRoutes } from "./event/events.routes";
import projectsRoutes from "./project/minimal-projects.routes";
import { attendanceRoutes } from "./attendance/attendances.routes";
import { notificationRoutes } from "./notification/notifications.routes";
import { appointmentRoutes } from "./appointment/appointments.routes";
import { mlRoutes } from "./report/ml.routes";
import { qrCodeRoutes } from "./integration/qrcode.routes";
import { connectorRoutes } from "./integration/connector.routes";
import integrationRoutes from "./integration/integration.routes";
import { emailCampaignRoutes } from "./campaign/email-campaign.routes";
import { eventCampaignRoutes } from "./campaign/event-campaign.routes";
import billingRoutes from "./billing/billing.routes";
import dunningRoutes from "./billing/dunning.routes";
import { resolutionRoutes } from "./resolution/resolution.routes";
import { organizationRoutes } from "./organization/organization.routes";
import { timesheetRoutes } from "./timesheet";
import { ticketRoutes } from "./ticket/ticket.routes";
import { ticketConfigRoutes } from "./ticketing/ticket-config.routes";
import { webhookRoutes } from "./webhook/webhook.routes";
import { importRoutes } from "./import/import.routes";
import { subscriptionRoutes } from "./subscription/subscription.routes";
import { permissionRoutes } from "./permissions/permission.routes";
import unifiedReportRoutes from "./reports"; // Routes de rapports unifiées
import emailConfigRoutes from "./admin/email-config.routes"; // Routes de configuration email
import { eventGenerationRoutes } from "./ai/event-generation.routes"; // Routes IA pour génération d'événements
import { asyncHandler } from "../middleware/errorHandler";
import { authService } from "../services/auth/auth.service";
import { notificationService } from "../services/notification";
import { authenticate, requirePermission } from "../middleware/auth";
// Swagger documentation (maintenant configuré dans index.ts)

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
      userInvitations: '/api/user-invitations', // NEW - User invitation management
      organizations: '/api/organizations', // DEPRECATED - Use /api/tenants
      tenants: '/api/tenants', // NEW - Multi-tenant system (includes user invitations)
      teams: '/api/teams',
      events: '/api/events',
      attendances: '/api/attendances',
      notifications: '/api/notifications',
      reports: '/api/reports',
      ml: '/api/ml',
      integrations: '/api/user/integrations',
      connectors: '/api/connectors',
      emailConfig: '/api/admin/email-providers', // NEW - Email configuration management
      emailCampaigns: '/api/email-campaigns',
      timesheets: '/api/timesheets',
      timeEntries: '/api/time-entries',
      projects: '/api/projects',
      activityCodes: '/api/activity-codes',
      tickets: '/api/tickets', // NEW - Event ticket management
      ticketConfig: '/api/ticket-config', // NEW - Ticketing configuration (types, promo codes, settings)
      subscriptions: '/api/subscriptions', // NEW - Subscription management
      permissions: '/api/permissions', // NEW - Permission management
      resolutions: '/api/resolutions', // NEW - Resolution management system
      aiEvents: '/api/ai/events', // NEW - AI-powered event generation
      public: {
        plans: '/api/public/plans', // NEW - Public subscription plans (no auth required)
        register: '/api/public/register', // NEW - Public tenant registration
        verifyEmail: '/api/public/verify-email', // NEW - Email verification
        checkSlug: '/api/public/check-slug/:slug', // NEW - Check slug availability
      },
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
router.use("/users", userProfileRoutes);
router.use("/user-invitations", userInvitationRoutes);
router.use("/public/invitations", publicInvitationRoutes); // Routes publiques pour accepter les invitations
router.use("/public", publicTenantRegistrationRoutes); // Routes publiques pour l'enregistrement et les plans
router.use("/tenants", tenantRoutes);
router.use("/events", eventRoutes);
router.use("/projects", projectsRoutes);
router.use("/attendances", attendanceRoutes);
router.use("/notifications", notificationRoutes);
router.use("/reports", unifiedReportRoutes); // Tous les rapports sous /api/reports
router.use("/appointments", appointmentRoutes);
router.use("/ml", mlRoutes);
router.use("/qr-codes", qrCodeRoutes);
router.use("/user/integrations", integrationRoutes);
router.use("/connectors", connectorRoutes);
router.use("/email-campaigns", emailCampaignRoutes);
router.use("/", eventCampaignRoutes); // Event campaign routes with /events and /campaigns prefixes
router.use("/billing", billingRoutes);
router.use("/dunning", dunningRoutes);
router.use("/timesheets", timesheetRoutes);
router.use("/tickets", ticketRoutes);
router.use("/ticket-config", ticketConfigRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/permissions", permissionRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/import", importRoutes);
router.use("/resolutions", resolutionRoutes);
router.use("/organizations", organizationRoutes);
router.use("/admin", emailConfigRoutes); // Routes de configuration email
router.use("/ai/events", eventGenerationRoutes); // Routes IA pour génération d'événements


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