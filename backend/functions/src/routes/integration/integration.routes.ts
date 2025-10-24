import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { rateLimit } from '../../middleware/rateLimit';
import { IntegrationController } from '../../controllers/integration/integration.controller';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Rate limiting for OAuth operations
const oauthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // limit each IP to 10 OAuth requests per windowMs
  message: 'Too many OAuth requests, please try again later'
});

/**
 * @swagger
 * /api/user/integrations:
 *   get:
 *     summary: Get user's integrations
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *           enum: [google, microsoft, slack, zoom]
 *         description: Filter by provider
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [connected, disconnected, error, pending]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of user integrations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserIntegration'
 */
router.get('/',
  validate([
    query('provider').optional().isIn(['google', 'microsoft', 'slack', 'zoom']),
    query('status').optional().isIn(['connected', 'disconnected', 'error', 'pending'])
  ]),
  IntegrationController.getUserIntegrations
);

/**
 * @swagger
 * /api/user/integrations/{provider}/connect:
 *   post:
 *     summary: Initiate OAuth connection for a provider
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, microsoft, slack, zoom]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Requested OAuth scopes
 *               redirectUri:
 *                 type: string
 *                 description: OAuth redirect URI
 *     responses:
 *       200:
 *         description: OAuth authorization URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     authUrl:
 *                       type: string
 *                     state:
 *                       type: string
 */
router.post('/:provider/connect',
  oauthRateLimit,
  validate([
    param('provider').isIn(['google', 'microsoft', 'slack', 'zoom']),
    body('scopes').optional().isArray(),
    body('redirectUri').optional().isURL()
  ]),
  IntegrationController.connectProvider
);

/**
 * @swagger
 * /api/user/integrations/{provider}/callback:
 *   post:
 *     summary: Handle OAuth callback
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, microsoft, slack, zoom]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - state
 *             properties:
 *               code:
 *                 type: string
 *                 description: OAuth authorization code
 *               state:
 *                 type: string
 *                 description: OAuth state parameter
 *     responses:
 *       200:
 *         description: Integration connected successfully
 */
router.post('/:provider/callback',
  oauthRateLimit,
  validate([
    param('provider').isIn(['google', 'microsoft', 'slack', 'zoom']),
    body('code').notEmpty().withMessage('Authorization code is required'),
    body('state').notEmpty().withMessage('State parameter is required')
  ]),
  IntegrationController.completeOAuth
);

/**
 * @swagger
 * /api/user/integrations/{id}/settings:
 *   put:
 *     summary: Update integration sync settings
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               syncSettings:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   syncCalendar:
 *                     type: boolean
 *                   syncContacts:
 *                     type: boolean
 *                   syncFrequency:
 *                     type: string
 *                     enum: [realtime, hourly, daily, weekly]
 *                   bidirectional:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put('/:id/settings',
  validate([
    param('id').isMongoId().withMessage('Invalid integration ID'),
    body('syncSettings').isObject(),
    body('syncSettings.enabled').optional().isBoolean(),
    body('syncSettings.syncCalendar').optional().isBoolean(),
    body('syncSettings.syncContacts').optional().isBoolean(),
    body('syncSettings.syncFrequency').optional().isIn(['realtime', 'hourly', 'daily', 'weekly']),
    body('syncSettings.bidirectional').optional().isBoolean()
  ]),
  IntegrationController.updateIntegrationSettings
);

/**
 * @swagger
 * /api/user/integrations/{id}:
 *   delete:
 *     summary: Disconnect an integration
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Integration disconnected successfully
 */
router.delete('/:id',
  validate([
    param('id').isMongoId().withMessage('Invalid integration ID')
  ]),
  IntegrationController.disconnectIntegration
);

/**
 * @swagger
 * /api/user/integrations/{id}/history:
 *   get:
 *     summary: Get integration sync history
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, error, pending]
 *     responses:
 *       200:
 *         description: Sync history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     history:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SyncHistory'
 *                     total:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 */
router.get('/:id/history',
  validate([
    param('id').isMongoId().withMessage('Invalid integration ID'),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('status').optional().isIn(['success', 'error', 'pending'])
  ]),
  IntegrationController.getIntegrationHistory
);

/**
 * @swagger
 * /api/user/integrations/{id}/sync:
 *   post:
 *     summary: Trigger manual sync for an integration
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               syncType:
 *                 type: string
 *                 enum: [full, incremental]
 *                 default: incremental
 *     responses:
 *       200:
 *         description: Sync initiated successfully
 */
router.post('/:id/sync',
  validate([
    param('id').isMongoId().withMessage('Invalid integration ID'),
    body('syncType').optional().isIn(['full', 'incremental'])
  ]),
  IntegrationController.syncIntegration
);

/**
 * @swagger
 * /api/user/integrations/{id}/test:
 *   post:
 *     summary: Test integration connection
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connection test results
 */
router.post('/:id/test',
  validate([
    param('id').isMongoId().withMessage('Invalid integration ID')
  ]),
  IntegrationController.testIntegration
);

/**
 * @swagger
 * /api/user/integrations/analytics/metrics:
 *   get:
 *     summary: Get integration analytics metrics (Admin only)
 *     tags: [Integrations, Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     integrationMetrics:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/IntegrationMetrics'
 *                     userAdoptionMetrics:
 *                       $ref: '#/components/schemas/UserAdoptionMetrics'
 *                     performanceMetrics:
 *                       $ref: '#/components/schemas/PerformanceMetrics'
 *       403:
 *         description: Access denied - Admin role required
 */
router.get('/analytics/metrics',
  IntegrationController.getAnalyticsMetrics
);

export default router;