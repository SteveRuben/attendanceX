/**
 * Contrôleur pour la gestion des invitations utilisateurs
 */

import { Request, Response } from 'express';
import { Readable } from 'stream';
import csv from 'csv-parser';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types/middleware.types';
import userInvitationService from '../../services/user/user-invitation.service';
import { collections } from '../../config/database';

export class UserInvitationController {
  /**
   * Inviter un utilisateur unique
   */
  static inviteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantContext!.tenant.id;
    const inviterId = req.user!.uid;
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
  });

  /**
   * Inviter plusieurs utilisateurs en lot
   */
  static bulkInviteUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantContext!.tenant.id;
    const inviterId = req.user!.uid;
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
  });

  /**
   * Importer des invitations depuis un fichier CSV
   */
  static importFromCSV = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is required'
      });
    }

    const tenantId = req.tenantContext!.tenant.id;
    const inviterId = req.user!.uid;
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
  });

  /**
   * Obtenir les invitations du tenant
   */
  static getInvitations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantContext!.tenant.id;
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
  });

  /**
   * Obtenir les statistiques des invitations
   */
  static getInvitationStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantContext!.tenant.id;

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
  });

  /**
   * Renvoyer une invitation
   */
  static resendInvitation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantContext!.tenant.id;
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
  });

  /**
   * Annuler une invitation
   */
  static cancelInvitation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantContext!.tenant.id;
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
  });

  /**
   * Valider un token d'invitation (route publique)
   */
  static validateInvitationToken = asyncHandler(async (req: Request, res: Response) => {
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
  });

  /**
   * Accepter une invitation (route publique)
   */
  static acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
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
  });

  /**
   * Décliner une invitation (route publique)
   */
  static declineInvitation = asyncHandler(async (req: Request, res: Response) => {
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
  });
}