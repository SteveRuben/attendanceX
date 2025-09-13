import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { migrationController } from '../../controllers/system/migration.controller';

const router = Router();

// Middleware d'authentification pour toutes les routes de migration
router.use(requireAuth);

/**
 * @swagger
 * /api/migration/organization/run:
 *   post:
 *     summary: Exécuter la migration d'organisation
 *     description: Migre les utilisateurs existants vers le système d'organisation. Nécessite les droits super admin.
 *     tags: [Migration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dryRun:
 *                 type: boolean
 *                 description: Si true, simule la migration sans l'exécuter
 *                 default: false
 *               batchSize:
 *                 type: integer
 *                 description: Nombre d'utilisateurs à traiter par batch
 *                 default: 100
 *                 minimum: 1
 *                 maximum: 1000
 *               defaultOrganizationName:
 *                 type: string
 *                 description: Nom par défaut pour les organisations créées
 *                 default: "Mon Organisation"
 *               defaultSector:
 *                 type: string
 *                 enum: [services, retail, healthcare, beauty, education, consulting, association, other]
 *                 description: Secteur par défaut pour les organisations créées
 *                 default: "other"
 *     responses:
 *       200:
 *         description: Migration exécutée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                     usersWithOrganization:
 *                       type: integer
 *                     usersWithoutOrganization:
 *                       type: integer
 *                     organizationsCreated:
 *                       type: integer
 *                     usersMigrated:
 *                       type: integer
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           error:
 *                             type: string
 *       403:
 *         description: Permissions insuffisantes
 *       500:
 *         description: Erreur lors de la migration
 */
router.post('/organization/run', [
  body('dryRun').optional().isBoolean().withMessage('dryRun must be a boolean'),
  body('batchSize').optional().isInt({ min: 1, max: 1000 }).withMessage('batchSize must be between 1 and 1000'),
  body('defaultOrganizationName').optional().isString().isLength({ min: 1, max: 100 }).withMessage('defaultOrganizationName must be between 1 and 100 characters'),
  body('defaultSector').optional().isIn(['services', 'retail', 'healthcare', 'beauty', 'education', 'consulting', 'association', 'other']).withMessage('Invalid sector')
], validate([
  body('dryRun').optional().isBoolean().withMessage('dryRun must be a boolean'),
  body('batchSize').optional().isInt({ min: 1, max: 1000 }).withMessage('batchSize must be between 1 and 1000'),
  body('defaultOrganizationName').optional().isString().isLength({ min: 1, max: 100 }).withMessage('defaultOrganizationName must be between 1 and 100 characters'),
  body('defaultSector').optional().isIn(['services', 'retail', 'healthcare', 'beauty', 'education', 'consulting', 'association', 'other']).withMessage('Invalid sector')
]), migrationController.runMigration.bind(migrationController));

/**
 * @swagger
 * /api/migration/organization/rollback:
 *   post:
 *     summary: Rollback de la migration d'organisation
 *     description: Annule la migration d'organisation en supprimant les organisations créées et en réinitialisant les utilisateurs. Nécessite les droits super admin.
 *     tags: [Migration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rollback exécuté avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Permissions insuffisantes
 *       500:
 *         description: Erreur lors du rollback
 */
router.post('/organization/rollback', migrationController.rollbackMigration.bind(migrationController));

/**
 * @swagger
 * /api/migration/organization/status:
 *   get:
 *     summary: Obtenir le statut de la migration
 *     description: Retourne l'état actuel de la migration d'organisation
 *     tags: [Migration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statut de la migration
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
 *                     totalUsers:
 *                       type: integer
 *                     totalOrganizations:
 *                       type: integer
 *                     usersWithOrganization:
 *                       type: integer
 *                     usersWithoutOrganization:
 *                       type: integer
 *                     migrationOrganizations:
 *                       type: integer
 *                     migrationNeeded:
 *                       type: boolean
 *                     migrationCompleted:
 *                       type: boolean
 *                     migrationProgress:
 *                       type: number
 *                       description: Pourcentage de progression (0-100)
 *       500:
 *         description: Erreur lors de la récupération du statut
 */
router.get('/organization/status', migrationController.getMigrationStatus.bind(migrationController));

/**
 * @swagger
 * /api/migration/organization/validate:
 *   post:
 *     summary: Valider l'intégrité des données après migration
 *     description: Vérifie l'intégrité des données utilisateurs et organisations après la migration
 *     tags: [Migration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Validation terminée
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
 *                     isValid:
 *                       type: boolean
 *                     usersValidation:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         valid:
 *                           type: integer
 *                         invalid:
 *                           type: integer
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               userId:
 *                                 type: string
 *                               error:
 *                                 type: string
 *                     organizationsValidation:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         valid:
 *                           type: integer
 *                         invalid:
 *                           type: integer
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               organizationId:
 *                                 type: string
 *                               error:
 *                                 type: string
 *                     dataIntegrity:
 *                       type: object
 *                       properties:
 *                         orphanedUsers:
 *                           type: integer
 *                         orphanedOrganizations:
 *                           type: integer
 *                         inconsistentMemberCounts:
 *                           type: integer
 *       500:
 *         description: Erreur lors de la validation
 */
router.post('/organization/validate', migrationController.validateMigration.bind(migrationController));

export { router as migrationRoutes };