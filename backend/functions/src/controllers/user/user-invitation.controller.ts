/**
 * Contrôleur pour la gestion des invitations utilisateurs
 */

import { Request, Response } from 'express';
import { Readable } from 'stream';
import csv from 'csv-parser';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types/middleware.types';
import { TenantRole } from '../../common/types';
import userInvitationService from '../../services/user/user-invitation.service';
import { collections } from '../../config/database';

export class UserInvitationController {
  /**
   * Inviter un utilisateur unique
   */
  static inviteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    console.log('🚀 [UserInvitationController] Received invitation request');
    console.log('📋 Request details:', {
      method: req.method,
      url: req.url,
      headers: {
        'content-type': req.headers['content-type'],
        'authorization': req.headers.authorization ? 'Bearer [token]' : 'None',
        'x-tenant-id': req.headers['x-tenant-id']
      },
      body: req.body,
      user: req.user ? { uid: req.user.uid, email: req.user.email } : 'None'
    });

    const startTime = Date.now();

    try {
      // Extract tenantId the same way as requireTenantPermission middleware
      const tenantId = req.params.tenantId 
        || req.query.tenantId as string
        || req.body.tenantId
        || req.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'Tenant ID required'
        });
      }

      const inviterId = req.user!.uid;
      const invitation = req.body;

      // Map validator role to TenantRole enum values
      const roleMapping: Record<string, TenantRole> = {
        'admin': TenantRole.ADMIN,
        'manager': TenantRole.MANAGER, 
        'user': TenantRole.MEMBER,     // Map 'user' to 'member'
        'viewer': TenantRole.VIEWER
      };

      // Convert role to tenantRole for the service
      const invitationForService = {
        ...invitation,
        tenantRole: roleMapping[invitation.role] || TenantRole.MEMBER
      };
      delete invitationForService.role; // Remove the old field

      console.log('✅ [Controller] Extracted data:', { 
        tenantId, 
        inviterId, 
        email: invitation.email,
        role: invitation.role,
        tenantRole: invitationForService.tenantRole
      });
      console.log('🔄 [Controller] Calling userInvitationService.inviteUser...');
      console.log('📋 [Controller] Service payload:', JSON.stringify(invitationForService, null, 2));

      const result = await userInvitationService.inviteUser(tenantId, inviterId, invitationForService);
      
      const duration = Date.now() - startTime;
      console.log('🎉 [Controller] Invitation completed successfully!');
      console.log('⏱️  [Controller] Total controller time:', duration, 'ms');

      return res.status(201).json({
        success: true,
        data: result,
        message: 'Invitation sent successfully'
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ [Controller] Error after', duration, 'ms:', error);
      
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
    // Extract tenantId the same way as requireTenantPermission middleware
    const tenantId = req.params.tenantId 
      || req.query.tenantId as string
      || req.body.tenantId
      || req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }
    const inviterId = req.user!.uid;
    const bulkRequest = req.body;

    try {
      // Validation des limites pour éviter les timeouts
      if (bulkRequest.invitations && bulkRequest.invitations.length > 50) {
        return res.status(400).json({
          success: false,
          error: 'Too many invitations in one request (max 50)',
          code: 'BULK_LIMIT_EXCEEDED'
        });
      }

      // Map validator role to TenantRole enum values for each invitation
      const roleMapping: Record<string, TenantRole> = {
        'admin': TenantRole.ADMIN,
        'manager': TenantRole.MANAGER, 
        'user': TenantRole.MEMBER,     // Map 'user' to 'member'
        'viewer': TenantRole.VIEWER
      };

      // Transform invitations to use tenantRole instead of role
      const transformedBulkRequest = {
        ...bulkRequest,
        invitations: bulkRequest.invitations.map((invitation: any) => {
          const transformed = {
            ...invitation,
            tenantRole: roleMapping[invitation.role] || TenantRole.MEMBER
          };
          delete transformed.role; // Remove the old field
          return transformed;
        })
      };

      // Timeout plus court pour l'onboarding
      const isOnboardingBatch = bulkRequest.invitations?.some((inv: any) => inv.isOnboardingInvitation);
      const timeoutMs = isOnboardingBatch ? 15000 : 30000; // 15s pour onboarding, 30s pour normal

      // Utiliser Promise.race pour implémenter un timeout
      const invitationPromise = userInvitationService.inviteUsers(tenantId, inviterId, transformedBulkRequest);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      );

      const result = await Promise.race([invitationPromise, timeoutPromise]) as any;
      
      return res.json({
        success: true,
        data: result,
        message: `${result.summary.successful} invitations sent successfully${result.summary.failed > 0 ? `, ${result.summary.failed} failed` : ''}`
      });

    } catch (error) {
      console.error('Error sending bulk invitations:', error);
      
      if (error instanceof Error && error.message === 'Request timeout') {
        return res.status(408).json({
          success: false,
          error: 'Request timeout - invitations are being processed in background',
          code: 'REQUEST_TIMEOUT'
        });
      }
      
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

    // Extract tenantId the same way as requireTenantPermission middleware
    const tenantId = req.params.tenantId 
      || req.query.tenantId as string
      || req.body.tenantId
      || req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }
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
    // Extract tenantId the same way as requireTenantPermission middleware
    const tenantId = req.params.tenantId 
      || req.query.tenantId as string
      || req.body.tenantId
      || req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }
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
    // Extract tenantId the same way as requireTenantPermission middleware
    const tenantId = req.params.tenantId 
      || req.query.tenantId as string
      || req.body.tenantId
      || req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

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
    // Extract tenantId the same way as requireTenantPermission middleware
    const tenantId = req.params.tenantId 
      || req.query.tenantId as string
      || req.body.tenantId
      || req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }
    const invitationId = req.params.invitationId as string;

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
    // Extract tenantId the same way as requireTenantPermission middleware
    const tenantId = req.params.tenantId 
      || req.query.tenantId as string
      || req.body.tenantId
      || req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }
    const invitationId = req.params.invitationId as string;
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
    const token = req.params.token as string;

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
      
      // Récupérer les informations du tenant pour le nom de l'organisation
      let organizationName = 'Organization'; // Valeur par défaut
      try {
        const tenantDoc = await collections.tenants.doc(invitationData.tenantId).get();
        if (tenantDoc.exists) {
          const tenantData = tenantDoc.data();
          organizationName = tenantData.name || tenantData.displayName || 'Organization';
        }
      } catch (error) {
        console.warn('Could not fetch tenant name:', error);
      }
      
      return res.json({
        success: true,
        data: {
          email: invitationData.email,
          firstName: invitationData.firstName,
          lastName: invitationData.lastName,
          role: invitationData.tenantRole, // Utiliser tenantRole au lieu de role
          organizationName: organizationName,
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