import { Router } from 'express';
import { IntegrationController } from '../controllers/integration.controller';
import { requireAuth } from '../middleware/auth';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation';
import { IntegrationProvider, SyncType } from '../../../../shared/src/types/integration.types';

const router = Router();

// Middleware d'authentification pour toutes les routes
router.use(requireAuth);

/**
 * @route GET /user/integrations
 * @desc Obtenir toutes les intégrations d'un utilisateur
 * @access Private
 */
router.get('/', IntegrationController.getUserIntegrations);

/**
 * @route GET /user/integrations/stats
 * @desc Obtenir les statistiques d'utilisation des intégrations
 * @access Private
 */
router.get('/stats', IntegrationController.getIntegrationStats);

/**
 * @route GET /user/integrations/:id
 * @desc Obtenir une intégration spécifique
 * @access Private
 */
router.get(
  '/:id',
  validate([
    param('id').isString().notEmpty().withMessage('Integration ID is required')
  ]),
  IntegrationController.getIntegration
);

/**
 * @route POST /user/integrations/:provider/connect
 * @desc Initier la connexion OAuth avec un provider
 * @access Private
 */
router.post(
  '/:provider/connect',
  validate([
    param('provider')
      .isIn(Object.values(IntegrationProvider))
      .withMessage('Invalid provider'),
    body('scopes')
      .optional()
      .isArray()
      .withMessage('Scopes must be an array'),
    body('syncSettings')
      .optional()
      .isObject()
      .withMessage('Sync settings must be an object'),
    body('redirectUri')
      .optional()
      .isURL()
      .withMessage('Redirect URI must be a valid URL')
  ]),
  IntegrationController.connectProvider
);

/**
 * @route POST /user/integrations/:provider/callback
 * @desc Compléter la connexion OAuth
 * @access Private
 */
router.post(
  '/:provider/callback',
  validate([
    param('provider')
      .isIn(Object.values(IntegrationProvider))
      .withMessage('Invalid provider'),
    body('code')
      .isString()
      .notEmpty()
      .withMessage('Authorization code is required'),
    body('state')
      .isString()
      .notEmpty()
      .withMessage('State parameter is required'),
    body('codeVerifier')
      .optional()
      .isString()
      .withMessage('Code verifier must be a string')
  ]),
  IntegrationController.completeOAuth
);

/**
 * @route PUT /user/integrations/:id/settings
 * @desc Mettre à jour les paramètres d'une intégration
 * @access Private
 */
router.put(
  '/:id/settings',
  validate([
    param('id').isString().notEmpty().withMessage('Integration ID is required'),
    body('syncSettings')
      .optional()
      .isObject()
      .withMessage('Sync settings must be an object'),
    body('syncSettings.calendar')
      .optional()
      .isBoolean()
      .withMessage('Calendar sync setting must be boolean'),
    body('syncSettings.contacts')
      .optional()
      .isBoolean()
      .withMessage('Contacts sync setting must be boolean'),
    body('syncSettings.email')
      .optional()
      .isBoolean()
      .withMessage('Email sync setting must be boolean'),
    body('syncSettings.files')
      .optional()
      .isBoolean()
      .withMessage('Files sync setting must be boolean'),
    body('syncSettings.tasks')
      .optional()
      .isBoolean()
      .withMessage('Tasks sync setting must be boolean'),
    body('syncSettings.presence')
      .optional()
      .isBoolean()
      .withMessage('Presence sync setting must be boolean'),
    body('syncSettings.autoSync')
      .optional()
      .isBoolean()
      .withMessage('Auto sync setting must be boolean'),
    body('syncSettings.syncFrequency')
      .optional()
      .isInt({ min: 5, max: 1440 })
      .withMessage('Sync frequency must be between 5 and 1440 minutes'),
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array')
  ]),
  IntegrationController.updateIntegrationSettings
);

/**
 * @route DELETE /user/integrations/:id
 * @desc Déconnecter une intégration
 * @access Private
 */
router.delete(
  '/:id',
  validate([
    param('id').isString().notEmpty().withMessage('Integration ID is required')
  ]),
  IntegrationController.disconnectIntegration
);

/**
 * @route GET /user/integrations/:id/history
 * @desc Obtenir l'historique de synchronisation d'une intégration
 * @access Private
 */
router.get(
  '/:id/history',
  validate([
    param('id').isString().notEmpty().withMessage('Integration ID is required'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ]),
  IntegrationController.getIntegrationHistory
);

/**
 * @route POST /user/integrations/:id/sync
 * @desc Déclencher une synchronisation manuelle
 * @access Private
 */
router.post(
  '/:id/sync',
  validate([
    param('id').isString().notEmpty().withMessage('Integration ID is required'),
    body('syncTypes')
      .optional()
      .isArray()
      .withMessage('Sync types must be an array'),
    body('syncTypes.*')
      .optional()
      .isIn(Object.values(SyncType))
      .withMessage('Invalid sync type'),
    body('force')
      .optional()
      .isBoolean()
      .withMessage('Force parameter must be boolean')
  ]),
  IntegrationController.syncIntegration
);

/**
 * @route POST /user/integrations/:id/test
 * @desc Tester la connexion d'une intégration
 * @access Private
 */
router.post(
  '/:id/test',
  validate([
    param('id').isString().notEmpty().withMessage('Integration ID is required')
  ]),
  IntegrationController.testIntegration
);

/**
 * @route POST /user/integrations/:id/refresh
 * @desc Rafraîchir les tokens d'une intégration
 * @access Private
 */
router.post(
  '/:id/refresh',
  validate([
    param('id').isString().notEmpty().withMessage('Integration ID is required')
  ]),
  IntegrationController.refreshIntegrationTokens
);

export default router;