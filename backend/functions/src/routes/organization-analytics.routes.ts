import { Router } from 'express';
import { OrganizationAnalyticsController, requireAnalyticsAccess } from '../controllers/organization-analytics.controller';
import { requireAuth } from '../middleware/auth';
import { requireOrganizationMembership } from '../middleware/organization-permissions.middleware';
import { validate } from '../middleware/validation.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

// Validation schemas
const organizationIdValidation = param('organizationId')
  .isString()
  .notEmpty()
  .withMessage('Organization ID is required');

const daysValidation = query('days')
  .optional()
  .isInt({ min: 1, max: 365 })
  .withMessage('Days must be between 1 and 365');

const alertRuleValidation = [
  body('name')
    .isString()
    .isLength({ min: 3, max: 100 })
    .withMessage('Name must be between 3 and 100 characters'),
  body('metric')
    .isIn(['organization_creation_failure_rate', 'invitation_acceptance_rate', 'error_rate', 'active_users'])
    .withMessage('Invalid metric'),
  body('condition')
    .isIn(['greater_than', 'less_than', 'equals', 'not_equals'])
    .withMessage('Invalid condition'),
  body('threshold')
    .isNumeric()
    .withMessage('Threshold must be a number'),
  body('timeWindow')
    .isInt({ min: 5, max: 1440 })
    .withMessage('Time window must be between 5 and 1440 minutes'),
  body('enabled')
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
  body('notificationChannels')
    .isArray()
    .withMessage('Notification channels must be an array')
];

// Routes pour les métriques d'organisation
router.get(
  '/organizations/:organizationId/metrics',
  requireAuth,
  requireOrganizationMembership,
  requireAnalyticsAccess,
  organizationIdValidation,
  daysValidation,
  validate,
  OrganizationAnalyticsController.getOrganizationMetrics
);

router.post(
  '/organizations/:organizationId/metrics/collect',
  requireAuth,
  requireOrganizationMembership,
  requireAnalyticsAccess,
  organizationIdValidation,
  validate,
  OrganizationAnalyticsController.collectMetrics
);

router.get(
  '/organizations/:organizationId/metrics/export',
  requireAuth,
  requireOrganizationMembership,
  requireAnalyticsAccess,
  organizationIdValidation,
  daysValidation,
  query('format').optional().isIn(['csv', 'json']).withMessage('Format must be csv or json'),
  validate,
  OrganizationAnalyticsController.exportMetrics
);

// Routes pour les alertes
router.post(
  '/organizations/:organizationId/alerts/rules',
  requireAuth,
  requireOrganizationMembership,
  requireAnalyticsAccess,
  organizationIdValidation,
  alertRuleValidation,
  validate,
  OrganizationAnalyticsController.createAlertRule
);

router.get(
  '/organizations/:organizationId/alerts/rules',
  requireAuth,
  requireOrganizationMembership,
  requireAnalyticsAccess,
  organizationIdValidation,
  validate,
  OrganizationAnalyticsController.getAlertRules
);

router.get(
  '/organizations/:organizationId/alerts/active',
  requireAuth,
  requireOrganizationMembership,
  requireAnalyticsAccess,
  organizationIdValidation,
  validate,
  OrganizationAnalyticsController.getActiveAlerts
);

// Routes pour les statistiques d'utilisation
router.get(
  '/organizations/:organizationId/usage/features',
  requireAuth,
  requireOrganizationMembership,
  requireAnalyticsAccess,
  organizationIdValidation,
  daysValidation,
  validate,
  OrganizationAnalyticsController.getFeatureUsageStats
);

router.get(
  '/organizations/:organizationId/performance',
  requireAuth,
  requireOrganizationMembership,
  requireAnalyticsAccess,
  organizationIdValidation,
  validate,
  OrganizationAnalyticsController.getPerformanceMetrics
);

// Routes globales (admin seulement)
router.get(
  '/analytics/global',
  requireAuth,
  // TODO: Ajouter middleware pour vérifier les permissions admin système
  daysValidation,
  validate,
  OrganizationAnalyticsController.getGlobalMetrics
);

export default router;