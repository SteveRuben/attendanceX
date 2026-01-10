/**
 * Routes publiques pour l'acceptation d'invitations
 * Ces routes ne nécessitent pas d'authentification
 */

import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams } from '../../middleware/validation';
import { UserInvitationController } from '../../controllers/user/user-invitation.controller';
import {
  acceptInvitationSchema,
  declineInvitationSchema
} from '../../common/validators/invitation.validators';

const router = Router();

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
router.get('/validate/:token',
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
router.post('/accept',
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
router.post('/decline',
  validateBody(declineInvitationSchema),
  UserInvitationController.declineInvitation
);

export { router as publicInvitationRoutes };