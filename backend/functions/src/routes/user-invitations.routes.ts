/**
 * Routes pour la gestion des invitations utilisateurs
 * API pour inviter, gérer et accepter les invitations
 */

import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { userInvitationService } from '../services/user/user-invitation.service';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

const router = Router();

// Configuration multer pour l'upload de fichiers CSV
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Rate limiting pour les invitations
const invitationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50, // Maximum 50 invitations par IP
  message: 'Too many invitation attempts, please try again later'
});

// Routes protégées nécessitant une authentification
router.use(requireAuth);
router.use(tenantContextMiddleware.injectTenantContext);
router.use(tenantContextMiddleware.validateTenantAccess);

/**
 * Inviter un utilisateur unique
 * POST /user-invitations/invite
 */
router.post('/invite',
  invitationRateLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    
    body('firstName')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name is required and must not exceed 50 characters'),
    
    body('lastName')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name is required and must not exceed 50 characters'),
    
    body('role')
      .isString()
      .isIn(['admin', 'manager', 'user', 'viewer'])
      .withMessage('Invalid role'),
    
    body('department')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Department must not exceed 100 characters'),
    
    body('message')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Message must not exceed 500 characters'),
    
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array')
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
    const inviterId = req.user!.id;
    const invitation = req.body;

    try {
      const result = await userInvitationService.inviteUser(tenantId, inviterId, invitation);
      
      return res.status(201).json({
        success: true,
        data: result,
        message: 'Invitation sent successfully'
      });

    } catch (error) {
      console.error('Error sending invitation:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: 'User already exists or has pending invitation',
          code: 'USER_EXISTS'
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to send invitation'
      });
    }
  })
);

/**
 * Inviter plusieurs utilisateurs en lot
 * POST /user-invitations/bulk-invite
 */
router.post('/bulk-invite',
  invitationRateLimit,
  [
    body('invitations')
      .isArray({ min: 1, max: 100 })
      .withMessage('Invitations must be an array with 1-100 items'),
    
    body('invitations.*.email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required for each invitation'),
    
    body('invitations.*.firstName')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name is required for each invitation'),
    
    body('invitations.*.lastName')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name is required for each invitation'),
    
    body('invitations.*.role')
      .isString()
      .isIn(['admin', 'manager', 'user', 'viewer'])
      .withMessage('Valid role is required for each invitation'),
    
    body('customMessage')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Custom message must not exceed 500 characters'),
    
    body('sendWelcomeEmail')
      .optional()
      .isBoolean()
      .withMessage('sendWelcomeEmail must be a boolean')
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
    const inviterId = req.user!.id;
    const bulkRequest = req.body;

    try {
      const result = await userInvitationService.inviteUsers(tenantId, inviterId, bulkRequest);
      
      return res.json({
        success: true,
        data: result,
        message: `${result.summary.successful} invitations sent successfully, ${result.summary.failed} failed`
      });

    } catch (error) {
      console.error('Error sending bulk invitations:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to send bulk invitations'
      });
    }
  })
);

/**
 * Importer des invitations depuis un fichier CSV
 * POST /user-invitations/csv-import
 */
router.post('/csv-import',
  invitationRateLimit,
  upload.single('csvFile'),
  [
    body('defaultRole')
      .optional()
      .isString()
      .isIn(['admin', 'manager', 'user', 'viewer'])
      .withMessage('Invalid default role'),
    
    body('customMessage')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Custom message must not exceed 500 characters')
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

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is required'
      });
    }

    const tenantId = req.tenantContext!.tenantId;
    const inviterId = req.user!.id;
    const { defaultRole = 'user', customMessage } = req.body;

    try {
      // Parser le CSV
      const csvData: any[] = [];
      const stream = Readable.from(req.file.buffer);
      
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (data) => csvData.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      if (csvData.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'CSV file is empty'
        });
      }

      if (csvData.length > 1000) {
        return res.status(400).json({
          success: false,
          error: 'CSV file contains too many rows (max 1000)'
        });
      }

      // Traiter les invitations
      const result = await userInvitationService.processCSVInvitations(
        tenantId,
        inviterId,
        csvData,
        defaultRole,
        customMessage
      );
      
      return res.json({
        success: true,
        data: result,
        message: `${result.summary.successful} invitations processed successfully from CSV`
      });

    } catch (error) {
      console.error('Error processing CSV invitations:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to process CSV invitations'
      });
    }
  })
);

/**
 * Obtenir les invitations du tenant
 * GET /user-invitations
 */
router.get('/',
  [
    query('status')
      .optional()
      .isIn(['pending', 'accepted', 'declined', 'expired', 'cancelled'])
      .withMessage('Invalid status filter'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'email', 'status', 'role'])
      .withMessage('Invalid sort field'),
    
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
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
    const options = {
      status: req.query.status as string,
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0,
      sortBy: req.query.sortBy as string || 'createdAt',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
    };

    try {
      const result = await userInvitationService.getTenantInvitations(tenantId, options);
      
      return res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error getting invitations:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to get invitations'
      });
    }
  })
);

/**
 * Obtenir les statistiques des invitations
 * GET /user-invitations/stats
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const tenantId = req.tenantContext!.tenantId;

  try {
    const stats = await userInvitationService.getInvitationStats(tenantId);
    
    return res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting invitation stats:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get invitation statistics'
    });
  }
}));

/**
 * Renvoyer une invitation
 * POST /user-invitations/:invitationId/resend
 */
router.post('/:invitationId/resend', asyncHandler(async (req, res) => {
  const tenantId = req.tenantContext!.tenantId;
  const { invitationId } = req.params;

  try {
    await userInvitationService.resendInvitation(tenantId, invitationId);
    
    return res.json({
      success: true,
      message: 'Invitation resent successfully'
    });

  } catch (error) {
    console.error('Error resending invitation:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to resend invitation'
    });
  }
}));

/**
 * Annuler une invitation
 * DELETE /user-invitations/:invitationId
 */
router.delete('/:invitationId', asyncHandler(async (req, res) => {
  const tenantId = req.tenantContext!.tenantId;
  const { invitationId } = req.params;
  const cancelledBy = req.user!.uid;

  try {
    await userInvitationService.cancelInvitation(tenantId, invitationId, cancelledBy);
    
    return res.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling invitation:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to cancel invitation'
    });
  }
}));

// Routes publiques pour l'acceptation d'invitations
const publicRouter = Router();

/**
 * Valider un token d'invitation
 * GET /public/invitations/validate/:token
 */
publicRouter.get('/validate/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;

  try {
    // Valider le token sans l'utiliser
    const tokenData = await collections.invitation_tokens.doc(token).get();
    
    if (!tokenData.exists) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invitation token'
      });
    }

    const data = tokenData.data();
    
    if (data.used) {
      return res.status(400).json({
        success: false,
        error: 'Invitation token already used'
      });
    }

    if (data.expiresAt.toDate() < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Invitation token expired'
      });
    }

    // Obtenir les détails de l'invitation
    const invitation = await collections.user_invitations.doc(data.invitationId).get();
    
    if (!invitation.exists) {
      return res.status(400).json({
        success: false,
        error: 'Invitation not found'
      });
    }

    const invitationData = invitation.data();
    
    return res.json({
      success: true,
      data: {
        email: invitationData.email,
        firstName: invitationData.firstName,
        lastName: invitationData.lastName,
        role: invitationData.role,
        organizationName: invitationData.organizationName,
        inviterName: invitationData.inviterName,
        expiresAt: data.expiresAt.toDate()
      }
    });

  } catch (error) {
    console.error('Error validating invitation token:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to validate invitation'
    });
  }
}));

/**
 * Accepter une invitation
 * POST /public/invitations/accept
 */
publicRouter.post('/accept',
  [
    body('token')
      .isString()
      .isLength({ min: 32, max: 128 })
      .withMessage('Invalid invitation token'),
    
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase and number'),
    
    body('acceptTerms')
      .equals('true')
      .withMessage('Terms of service must be accepted'),
    
    body('marketingConsent')
      .optional()
      .isBoolean()
      .withMessage('Marketing consent must be a boolean')
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

    try {
      const result = await userInvitationService.acceptInvitation({
        token: req.body.token,
        password: req.body.password,
        acceptTerms: req.body.acceptTerms === 'true',
        marketingConsent: req.body.marketingConsent || false
      });
      
      return res.json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            profile: result.user.profile
          },
          tenant: {
            id: result.tenant.id,
            name: result.tenant.name,
            slug: result.tenant.slug
          },
          loginUrl: result.loginUrl
        },
        message: 'Invitation accepted successfully'
      });

    } catch (error) {
      console.error('Error accepting invitation:', error);
      
      if (error instanceof Error && error.message.includes('expired')) {
        return res.status(400).json({
          success: false,
          error: 'Invitation has expired'
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to accept invitation'
      });
    }
  })
);

/**
 * Décliner une invitation
 * POST /public/invitations/decline
 */
publicRouter.post('/decline',
  [
    body('token')
      .isString()
      .isLength({ min: 32, max: 128 })
      .withMessage('Invalid invitation token'),
    
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Reason must not exceed 500 characters')
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

    try {
      await userInvitationService.declineInvitation(req.body.token, req.body.reason);
      
      return res.json({
        success: true,
        message: 'Invitation declined successfully'
      });

    } catch (error) {
      console.error('Error declining invitation:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to decline invitation'
      });
    }
  })
);

// Import des collections
import { collections } from '../config/database';
import tenantContextMiddleware from '../middleware/tenant-context.middleware';

// Exporter les deux routers
export { publicRouter as publicInvitationRoutes };
export default router;