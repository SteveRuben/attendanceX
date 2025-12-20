/**
 * Routes pour la gestion des invitations utilisateurs
 * API pour inviter, gérer et accepter les invitations
 */

import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { rateLimit } from '../../middleware/rateLimit';
import tenantContextMiddleware from '../../middleware/tenant-context.middleware';
import { authenticate, requirePermission } from '../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { UserInvitationController } from '../../controllers/user/user-invitation.controller';
import {
  inviteUserSchema,
  bulkInviteSchema,
  csvImportSchema,
  invitationFiltersSchema,
  acceptInvitationSchema,
  declineInvitationSchema
} from '../../common/validators/invitation.validators';

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

// 🔒 Toutes les routes nécessitent une authentification
router.use(authenticate);
router.use(tenantContextMiddleware.injectTenantContext);
router.use(tenantContextMiddleware.validateTenantAccess);

/**
 * @swagger
 * /user-invitations/invite:
 *   post:
 *     tags: [User Invitations]
 *     summary: Inviter un utilisateur unique
 *     description: |
 *       Envoie une invitation par email à un utilisateur pour rejoindre l'organisation.
 *       
 *       **Fonctionnalités:**
 *       - Validation de l'email
 *       - Génération de token sécurisé
 *       - Envoi d'email personnalisé
 *       - Gestion des permissions
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InviteUserRequest'
 *     responses:
 *       201:
 *         description: Invitation envoyée avec succès
 *       409:
 *         description: Utilisateur existe déjà ou invitation en attente
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/invite',
  requirePermission('manage_users'), // Keep basic for invitations
  invitationRateLimit,
  validateBody(inviteUserSchema),
  UserInvitationController.inviteUser
);

/**
 * @swagger
 * /user-invitations/bulk-invite:
 *   post:
 *     tags: [User Invitations]
 *     summary: Inviter plusieurs utilisateurs en lot
 *     description: |
 *       Envoie des invitations en lot à plusieurs utilisateurs.
 *       Maximum 100 invitations par requête.
 *     security:
 *       - BearerAuth: []
 */
router.post('/bulk-invite',
  requirePermission('manage_users'), // Keep basic for bulk invitations
  invitationRateLimit,
  validateBody(bulkInviteSchema),
  UserInvitationController.bulkInviteUsers
);

/**
 * @swagger
 * /user-invitations/csv-import:
 *   post:
 *     tags: [User Invitations]
 *     summary: Importer des invitations depuis un fichier CSV
 *     description: |
 *       Importe et traite des invitations depuis un fichier CSV.
 *       Maximum 1000 lignes par fichier.
 *     security:
 *       - BearerAuth: []
 */
router.post('/csv-import',
  requirePermission('manage_users'), // Keep basic for CSV import
  invitationRateLimit,
  upload.single('csvFile'),
  validateBody(csvImportSchema),
  UserInvitationController.importFromCSV
);

/**
 * @swagger
 * /user-invitations:
 *   get:
 *     tags: [User Invitations]
 *     summary: Obtenir les invitations du tenant
 *     description: |
 *       Récupère la liste des invitations avec filtres et pagination.
 *     security:
 *       - BearerAuth: []
 */
router.get('/',
  requirePermission('view_all_users'), // Keep basic for viewing invitations
  validateQuery(invitationFiltersSchema),
  UserInvitationController.getInvitations
);

/**
 * @swagger
 * /user-invitations/stats:
 *   get:
 *     tags: [User Invitations]
 *     summary: Obtenir les statistiques des invitations
 *     description: |
 *       Retourne les statistiques des invitations (total, par statut, etc.).
 *     security:
 *       - BearerAuth: []
 */
router.get('/stats',
  requirePermission('view_reports'), // Keep basic for stats
  UserInvitationController.getInvitationStats
);

/**
 * @swagger
 * /user-invitations/{invitationId}/resend:
 *   post:
 *     tags: [User Invitations]
 *     summary: Renvoyer une invitation
 *     description: |
 *       Renvoie une invitation existante avec un nouveau token.
 *     security:
 *       - BearerAuth: []
 */
router.post('/:invitationId/resend',
  requirePermission('manage_users'), // Keep basic for resending
  validateParams(z.object({
    invitationId: z.string().min(1, 'Invitation ID is required')
  })),
  UserInvitationController.resendInvitation
);

/**
 * @swagger
 * /user-invitations/{invitationId}:
 *   delete:
 *     tags: [User Invitations]
 *     summary: Annuler une invitation
 *     description: |
 *       Annule une invitation en attente.
 *     security:
 *       - BearerAuth: []
 */
router.delete('/:invitationId',
  requirePermission('manage_users'), // Keep basic for canceling
  validateParams(z.object({
    invitationId: z.string().min(1, 'Invitation ID is required')
  })),
  UserInvitationController.cancelInvitation
);

// Routes publiques pour l'acceptation d'invitations
const publicRouter = Router();

/**
 * @swagger
 * /public/invitations/validate/{token}:
 *   get:
 *     tags: [Public Invitations]
 *     summary: Valider un token d'invitation
 *     description: |
 *       Valide un token d'invitation sans l'utiliser.
 *       Route publique accessible sans authentification.
 */
publicRouter.get('/validate/:token',
  validateParams(z.object({
    token: z.string().min(32, 'Invalid invitation token').max(128, 'Invalid invitation token')
  })),
  UserInvitationController.validateInvitationToken
);

/**
 * @swagger
 * /public/invitations/accept:
 *   post:
 *     tags: [Public Invitations]
 *     summary: Accepter une invitation
 *     description: |
 *       Accepte une invitation et crée le compte utilisateur.
 *       Route publique accessible sans authentification.
 */
publicRouter.post('/accept',
  validateBody(acceptInvitationSchema),
  UserInvitationController.acceptInvitation
);

/**
 * @swagger
 * /public/invitations/decline:
 *   post:
 *     tags: [Public Invitations]
 *     summary: Décliner une invitation
 *     description: |
 *       Décline une invitation avec une raison optionnelle.
 *       Route publique accessible sans authentification.
 */
publicRouter.post('/decline',
  validateBody(declineInvitationSchema),
  UserInvitationController.declineInvitation
);

// Exporter les deux routers
export { publicRouter as publicInvitationRoutes };
export { router as userInvitationRoutes };