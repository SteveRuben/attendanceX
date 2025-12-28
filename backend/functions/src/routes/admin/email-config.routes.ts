import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantContextMiddleware } from '../../middleware/tenant-context.middleware';
import { requireRole } from '../../middleware/auth';
import { TenantRole } from '../../common/types';
import {
  getEmailProvidersController,
  createEmailProviderController,
  updateEmailProviderController,
  deleteEmailProviderController,
  testEmailProviderController,
  getAvailableProviderTypesController
} from '../../controllers/admin/email-config.controller';

const router = Router();

// Middleware pour toutes les routes (admin uniquement)
router.use(authenticate);
router.use(tenantContextMiddleware.injectTenantContext());
router.use(requireRole([TenantRole.ADMIN, TenantRole.OWNER]));

/**
 * @route GET /api/admin/email-providers
 * @desc Récupérer tous les providers email du tenant
 * @access Admin, Owner
 */
router.get('/email-providers', getEmailProvidersController);

/**
 * @route GET /api/admin/email-providers/types
 * @desc Récupérer les types de providers disponibles
 * @access Admin, Owner
 */
router.get('/email-providers/types', getAvailableProviderTypesController);

/**
 * @route POST /api/admin/email-providers
 * @desc Créer une nouvelle configuration email
 * @access Admin, Owner
 */
router.post('/email-providers', createEmailProviderController);

/**
 * @route PUT /api/admin/email-providers/:providerId
 * @desc Mettre à jour une configuration email
 * @access Admin, Owner
 */
router.put('/email-providers/:providerId', updateEmailProviderController);

/**
 * @route DELETE /api/admin/email-providers/:providerId
 * @desc Supprimer une configuration email (retour au global)
 * @access Admin, Owner
 */
router.delete('/email-providers/:providerId', deleteEmailProviderController);

/**
 * @route POST /api/admin/email-providers/test
 * @desc Tester une configuration email
 * @access Admin, Owner
 */
router.post('/email-providers/test', testEmailProviderController);

export default router;