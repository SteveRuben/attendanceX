/**
 * Routes pour le wizard de configuration
 * API pour gérer le processus d'onboarding multi-étapes
 */

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { setupWizardService } from '../services/onboarding/setup-wizard.service';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { tenantContextMiddleware } from '../middleware/tenant-context.middleware';
import '../types/express';

const router = Router();

// Toutes les routes nécessitent une authentification et un contexte tenant
router.use(requireAuth);
router.use(tenantContextMiddleware.injectTenantContext);
router.use(tenantContextMiddleware.validateTenantAccess);

/**
 * Obtenir le statut du wizard de configuration
 * GET /setup-wizard/status
 */
router.get('/status', asyncHandler(async (req, res) => {
  const tenantId = req.tenantContext!.tenant.id;
  
  const status = await setupWizardService.getSetupWizardStatus(tenantId);
  
  res.json({
    success: true,
    data: status
  });
}));

/**
 * Initialiser le wizard de configuration
 * POST /setup-wizard/initialize
 */
router.post('/initialize', asyncHandler(async (req, res) => {
  const tenantId = req.tenantContext!.tenant.id;
  
  const status = await setupWizardService.initializeSetupWizard(tenantId);
  
  res.json({
    success: true,
    data: status,
    message: 'Setup wizard initialized successfully'
  });
}));

/**
 * Marquer une étape comme complétée
 * POST /setup-wizard/complete-step
 */
router.post('/complete-step',
  [
    body('stepId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Step ID is required'),
    
    body('stepData')
      .optional()
      .isObject()
      .withMessage('Step data must be an object')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const tenantId = req.tenantContext!.tenant.id;
    const { stepId, stepData } = req.body;
    
    const status = await setupWizardService.completeStep(tenantId, stepId, stepData);
    
    return res.json({
      success: true,
      data: status,
      message: `Step ${stepId} completed successfully`
    });
  })
);

/**
 * Configurer le profil de l'organisation
 * POST /setup-wizard/organization-profile
 */
router.post('/organization-profile',
  [
    body('name')
      .isString()
      .isLength({ min: 2, max: 100 })
      .withMessage('Organization name must be between 2 and 100 characters'),
    
    body('description')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    
    body('website')
      .optional()
      .isURL()
      .withMessage('Website must be a valid URL'),
    
    body('industry')
      .isString()
      .isIn(['education', 'healthcare', 'corporate', 'government', 'non_profit', 'technology', 'other'])
      .withMessage('Invalid industry'),
    
    body('size')
      .isString()
      .isIn(['small', 'medium', 'large', 'enterprise'])
      .withMessage('Invalid organization size'),
    
    body('settings.timezone')
      .isString()
      .withMessage('Timezone is required'),
    
    body('settings.language')
      .isString()
      .isIn(['fr', 'en', 'es', 'de'])
      .withMessage('Invalid language'),
    
    body('settings.currency')
      .isString()
      .isIn(['EUR', 'USD', 'GBP', 'CAD'])
      .withMessage('Invalid currency')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const tenantId = req.tenantContext!.tenant.id;
    const profileData = req.body;
    
    await setupWizardService.setupOrganizationProfile(tenantId, profileData);
    
    return res.json({
      success: true,
      message: 'Organization profile updated successfully'
    });
  })
);

/**
 * Inviter des utilisateurs
 * POST /setup-wizard/invite-users
 */
router.post('/invite-users',
  [
    body('invitations')
      .isArray({ min: 1, max: 50 })
      .withMessage('Invitations must be an array with 1-50 items'),
    
    body('invitations.*.email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required for each invitation'),
    
    body('invitations.*.firstName')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name is required and must not exceed 50 characters'),
    
    body('invitations.*.lastName')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name is required and must not exceed 50 characters'),
    
    body('invitations.*.role')
      .isString()
      .isIn(['admin', 'manager', 'user', 'viewer'])
      .withMessage('Invalid role'),
    
    body('invitations.*.department')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Department must not exceed 100 characters')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const tenantId = req.tenantContext!.tenant.id;
    const userId = req.user!.uid;
    const { invitations } = req.body;
    
    const result = await setupWizardService.inviteUsers(tenantId, invitations, userId);
    
    return res.json({
      success: true,
      data: result,
      message: `${result.successful} invitations sent successfully`
    });
  })
);

/**
 * Générer des données de démonstration
 * POST /setup-wizard/generate-demo-data
 */
router.post('/generate-demo-data',
  [
    body('generateUsers')
      .isBoolean()
      .withMessage('generateUsers must be a boolean'),
    
    body('generateEvents')
      .isBoolean()
      .withMessage('generateEvents must be a boolean'),
    
    body('generateAttendance')
      .isBoolean()
      .withMessage('generateAttendance must be a boolean'),
    
    body('industry')
      .optional()
      .isString()
      .withMessage('Industry must be a string'),
    
    body('userCount')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('User count must be between 1 and 100'),
    
    body('eventCount')
      .optional()
      .isInt({ min: 1, max: 200 })
      .withMessage('Event count must be between 1 and 200')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const tenantId = req.tenantContext!.tenantId;
    const options = req.body;
    
    await setupWizardService.generateDemoData(tenantId, options);
    
    return res.json({
      success: true,
      message: 'Demo data generated successfully'
    });
  })
);

/**
 * Finaliser la configuration
 * POST /setup-wizard/complete
 */
router.post('/complete', asyncHandler(async (req, res) => {
  const tenantId = req.tenantContext!.tenantId;
  const userId = req.user!.uid;
  
  await setupWizardService.completeSetup(tenantId, userId);
  
  res.json({
    success: true,
    message: 'Setup completed successfully'
  });
}));

/**
 * Obtenir les suggestions basées sur l'industrie
 * GET /setup-wizard/industry-suggestions/:industry
 */
router.get('/industry-suggestions/:industry', asyncHandler(async (req, res) => {
  const { industry } = req.params;
  
  if (!['education', 'healthcare', 'corporate', 'government', 'non_profit', 'technology', 'other'].includes(industry)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid industry'
    });
  }
  
  const suggestions = await setupWizardService.getIndustrySuggestions(industry);
  
  return res.json({
    success: true,
    data: suggestions
  });
}));

/**
 * Obtenir les métriques d'onboarding (pour les admins)
 * GET /setup-wizard/metrics
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  //const tenantId = req.tenantContext!.tenantId;
  
  // TODO: Implémenter les métriques d'onboarding
  // Pour l'instant, retourner des données de base
  
  return res.json({
    success: true,
    data: {
      setupStarted: new Date(),
      currentStep: 1,
      estimatedTimeRemaining: '10 minutes',
      completionRate: 0
    }
  });
}));

export default router;