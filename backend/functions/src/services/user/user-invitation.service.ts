/**
 * Service de gestion des invitations utilisateurs
 * Gère l'invitation, l'acceptation et la gestion des invitations
 */

import { TenantError, TenantErrorCode, TenantRole } from '../../common/types';
import { collections } from '../../config/database';
import { tenantService } from '../tenant/tenant.service';
import { EmailService } from '../notification';
import { generateSecureToken } from '../../utils/token-generator';

export interface UserInvitationRequest {
  email: string;
  firstName: string;
  lastName: string;
  tenantRole: TenantRole;
  permissions?: string[];
  department?: string;
  message?: string;
  isOnboardingInvitation?: boolean;
}

export interface BulkInvitationRequest {
  invitations: UserInvitationRequest[];
  sendWelcomeEmail?: boolean;
  customMessage?: string;
}

export interface CSVInvitationData {
  email: string;
  firstName: string;
  lastName: string;
  tenantRole?: TenantRole;
  department?: string;
}

export interface InvitationStatus {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantRole: TenantRole;
  permissions: string[];
  department?: string;
  invitedBy: string;
  inviterName: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  message?: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  remindersSent: number;
  lastReminderAt?: Date;
  emailSent?: boolean;
  emailSentAt?: Date;
  emailError?: string;
  updatedAt?: Date;
}

export interface InvitationAcceptance {
  token: string;
  password: string;
  acceptTerms: boolean;
  marketingConsent?: boolean;
}

export interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  expired: number;
  acceptanceRate: number;
  averageAcceptanceTime: number; // en heures
}

export interface InvitationListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  searchTerm?: string;
}

export interface InvitationListResponse {
  invitations: InvitationStatus[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class UserInvitationService {
  private emailService = new EmailService();

  /**
   * Inviter un utilisateur unique
   */
  async inviteUser(
    tenantId: string,
    inviterId: string,
    invitation: UserInvitationRequest
  ): Promise<InvitationStatus> {
    console.log('🚀 [UserInvitationService] Starting inviteUser process');
    console.log('📋 Request details:', {
      tenantId,
      inviterId,
      email: invitation.email,
      isOnboarding: invitation.isOnboardingInvitation
    });

    try {
      const startTime = Date.now();

      // Pour l'onboarding, utiliser des valeurs par défaut
      if (invitation.isOnboardingInvitation && !invitation.tenantRole) {
        invitation.tenantRole = TenantRole.ADMIN;
        console.log('✅ Set default role for onboarding:', invitation.tenantRole);
      }

      console.log('🔍 Step 1: Validating invitation data...');
      // Valider les données d'invitation
      await this.validateInvitation(tenantId, invitation);
      console.log('✅ Step 1 completed in', Date.now() - startTime, 'ms');

      console.log('🔍 Step 2: Checking if user exists...');
      // Vérifier que l'utilisateur n'existe pas déjà
      await this.checkUserExists(tenantId, invitation.email);
      console.log('✅ Step 2 completed in', Date.now() - startTime, 'ms');

      console.log('🔍 Step 3: Checking pending invitations...');
      // Vérifier qu'il n'y a pas d'invitation en cours
      await this.checkPendingInvitation(tenantId, invitation.email);
      console.log('✅ Step 3 completed in', Date.now() - startTime, 'ms');

      console.log('🔍 Step 4: Creating invitation data...');
      // Créer l'invitation
      const invitationId = this.generateInvitationId();
      const token = generateSecureToken(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

      console.log('🔍 Step 5: Getting inviter and tenant info...');
      // Get inviter from TenantMembership instead of tenant users collection
      const membershipQuery = await collections.tenant_memberships
        .where('userId', '==', inviterId)
        .where('tenantId', '==', tenantId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (membershipQuery.empty) {
        console.error('❌ Inviter membership not found:', { inviterId, tenantId });
        throw new TenantError('Inviter not found in tenant', TenantErrorCode.TENANT_NOT_FOUND);
      }

      // Get user details from main users collection
      const userDoc = await collections.users.doc(inviterId).get();
      if (!userDoc.exists) {
        console.error('❌ Inviter user not found:', { inviterId });
        throw new TenantError('Inviter user not found', TenantErrorCode.TENANT_NOT_FOUND);
      }

      const userData = userDoc.data();
      const inviter = {
        id: inviterId,
        firstName: userData?.firstName || 'User',
        lastName: userData?.lastName || 'User',
        email: userData?.email || 'unknown@example.com'
      };

      const tenant = await tenantService.getTenant(tenantId);
      console.log('✅ Step 5 completed in', Date.now() - startTime, 'ms');
      console.log('🔍 [Debug] Inviter data:', { inviter, hasInviter: !!inviter });
      console.log('🔍 [Debug] Tenant data:', { tenant: tenant ? { id: tenant.id, name: tenant.name } : null, hasTenant: !!tenant });

      if (!tenant) {
        console.error('❌ Tenant not found:', { tenantId });
        throw new TenantError('Tenant not found', TenantErrorCode.TENANT_NOT_FOUND);
      }

      const invitationData: InvitationStatus = {
        id: invitationId,
        tenantId,
        email: invitation.email.toLowerCase(),
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        tenantRole: invitation.tenantRole,
        permissions: invitation.permissions || this.getDefaultPermissions(invitation.tenantRole),
        department: invitation.department,
        invitedBy: inviterId,
        inviterName: `${inviter.firstName} ${inviter.lastName}`,
        status: 'pending',
        message: invitation.message,
        createdAt: new Date(),
        expiresAt,
        remindersSent: 0,
        emailSent: true,
        emailSentAt: new Date()
      };

      console.log('🔍 Step 6: Saving invitation to database...');
      // Sauvegarder l'invitation
      await collections.user_invitations.doc(invitationId).set(invitationData);
      console.log('✅ Step 6 completed in', Date.now() - startTime, 'ms');

      console.log('🔍 Step 7: Saving invitation token...');
      // Sauvegarder le token d'invitation
      await collections.invitation_tokens.doc(token).set({
        invitationId,
        tenantId,
        email: invitation.email.toLowerCase(),
        createdAt: new Date(),
        expiresAt,
        used: false
      });
      console.log('✅ Step 7 completed in', Date.now() - startTime, 'ms');

      console.log('🔍 Step 8: Starting async email sending (non-blocking)...');
      // Envoyer l'email d'invitation de manière asynchrone
      this.sendInvitationEmailAsync(tenant, invitationData, token).catch(error => {
        console.error('❌ Async email error (non-blocking):', error);
      });
      console.log('✅ Step 8 initiated (async) in', Date.now() - startTime, 'ms');

      console.log('🔍 Step 9: Logging invitation activity...');
      // Enregistrer l'activité
      await this.logInvitationActivity(tenantId, invitationId, 'invitation_sent', {
        invitedBy: inviterId,
        email: invitation.email
      });
      console.log('✅ Step 9 completed in', Date.now() - startTime, 'ms');

      const totalTime = Date.now() - startTime;
      console.log('🎉 [UserInvitationService] Invitation process completed successfully!');
      console.log('⏱️  Total time:', totalTime, 'ms');
      console.log('📧 Email will be sent asynchronously in background');

      return invitationData;

    } catch (error) {
      console.error('❌ [UserInvitationService] Error in inviteUser:', error);
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error inviting user:', error);
      throw new TenantError(
        'Failed to invite user',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Inviter plusieurs utilisateurs en lot
   */
  async inviteUsers(
    tenantId: string,
    inviterId: string,
    bulkRequest: BulkInvitationRequest
  ): Promise<{
    successful: InvitationStatus[];
    failed: { invitation: UserInvitationRequest; error: string }[];
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const successful: InvitationStatus[] = [];
    const failed: { invitation: UserInvitationRequest; error: string }[] = [];

    // Traitement séquentiel pour éviter les problèmes de concurrence
    for (const invitation of bulkRequest.invitations) {
      try {
        const result = await this.inviteUser(tenantId, inviterId, {
          ...invitation,
          message: invitation.message || bulkRequest.customMessage
        });
        successful.push(result);
      } catch (error) {
        failed.push({
          invitation,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      successful,
      failed,
      summary: {
        total: bulkRequest.invitations.length,
        successful: successful.length,
        failed: failed.length
      }
    };
  }

  /**
   * Obtenir les invitations d'un tenant avec pagination
   */
  async getTenantInvitations(
    tenantId: string,
    options: InvitationListOptions = {}
  ): Promise<InvitationListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status,
        searchTerm
      } = options;

      let query = collections.user_invitations
        .where('tenantId', '==', tenantId)
        .orderBy(sortBy, sortOrder);

      // Appliquer les filtres
      if (status) {
        query = query.where('status', '==', status) as any;
      }

      // Compter le total
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Appliquer la pagination
      const offset = (page - 1) * limit;
      const paginatedQuery = query.offset(offset).limit(limit);
      const snapshot = await paginatedQuery.get();

      let invitations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InvitationStatus[];

      // Filtrer par terme de recherche (côté client)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        invitations = invitations.filter(invitation =>
          invitation.email.toLowerCase().includes(term) ||
          invitation.firstName.toLowerCase().includes(term) ||
          invitation.lastName.toLowerCase().includes(term)
        );
      }

      return {
        invitations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + invitations.length < total,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      console.error('Error getting tenant invitations:', error);
      throw new TenantError(
        'Failed to get invitations',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir une invitation par ID
   */
  async getInvitationById(invitationId: string): Promise<InvitationStatus | null> {
    try {
      const doc = await collections.user_invitations.doc(invitationId).get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as InvitationStatus;
    } catch (error) {
      console.error('Error getting invitation:', error);
      return null;
    }
  }

  /**
   * Obtenir les statistiques des invitations
   */
  async getInvitationStats(tenantId: string): Promise<InvitationStats> {
    try {
      const snapshot = await collections.user_invitations
        .where('tenantId', '==', tenantId)
        .get();

      const invitations = snapshot.docs.map(doc => doc.data());

      const stats = {
        total: invitations.length,
        pending: invitations.filter(inv => inv.status === 'pending').length,
        accepted: invitations.filter(inv => inv.status === 'accepted').length,
        declined: invitations.filter(inv => inv.status === 'declined').length,
        expired: invitations.filter(inv => inv.status === 'expired').length,
        acceptanceRate: 0,
        averageAcceptanceTime: 0
      };

      // Calculer le taux d'acceptation
      const totalProcessed = stats.accepted + stats.declined;
      if (totalProcessed > 0) {
        stats.acceptanceRate = (stats.accepted / totalProcessed) * 100;
      }

      // Calculer le temps moyen d'acceptation
      const acceptedInvitations = invitations.filter(inv =>
        inv.status === 'accepted' && inv.acceptedAt && inv.createdAt
      );

      if (acceptedInvitations.length > 0) {
        const totalTime = acceptedInvitations.reduce((sum, inv) => {
          const acceptedAt = inv.acceptedAt.toDate ? inv.acceptedAt.toDate() : inv.acceptedAt;
          const createdAt = inv.createdAt.toDate ? inv.createdAt.toDate() : inv.createdAt;
          return sum + (acceptedAt.getTime() - createdAt.getTime());
        }, 0);

        stats.averageAcceptanceTime = totalTime / acceptedInvitations.length / (1000 * 60 * 60); // en heures
      }

      return stats;

    } catch (error) {
      console.error('Error getting invitation stats:', error);
      throw new TenantError(
        'Failed to get invitation stats',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Marquer les invitations expirées
   */
  async markExpiredInvitations(tenantId: string): Promise<void> {
    try {
      const now = new Date();
      const expiredInvitations = await collections.user_invitations
        .where('tenantId', '==', tenantId)
        .where('status', '==', 'pending')
        .where('expiresAt', '<', now)
        .get();

      const batch = collections.user_invitations.firestore.batch();
      
      expiredInvitations.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'expired',
          updatedAt: new Date()
        });
      });

      if (expiredInvitations.docs.length > 0) {
        await batch.commit();
        console.log(`✅ Marked ${expiredInvitations.docs.length} invitations as expired for tenant ${tenantId}`);
      }
    } catch (error) {
      console.error('Error marking expired invitations:', error);
      throw new TenantError('Failed to mark expired invitations', TenantErrorCode.TENANT_ACCESS_DENIED);
    }
  }

  /**
   * Annuler une invitation
   */
  async cancelInvitation(tenantId: string, invitationId: string, cancelledBy: string): Promise<void> {
    try {
      const invitation = await this.getInvitationById(invitationId);

      if (!invitation || invitation.tenantId !== tenantId) {
        throw new TenantError('Invitation not found', TenantErrorCode.TENANT_NOT_FOUND);
      }

      if (invitation.status !== 'pending') {
        throw new TenantError('Cannot cancel non-pending invitation', TenantErrorCode.TENANT_ACCESS_DENIED);
      }

      await collections.user_invitations.doc(invitationId).update({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy,
        updatedAt: new Date()
      });

      await this.logInvitationActivity(tenantId, invitationId, 'invitation_cancelled', {
        cancelledBy,
        cancelledAt: new Date()
      });

    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error cancelling invitation:', error);
      throw new TenantError(
        'Failed to cancel invitation',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Renvoyer une invitation
   */
  async resendInvitation(tenantId: string, invitationId: string): Promise<void> {
    try {
      const invitation = await this.getInvitationById(invitationId);

      if (!invitation || invitation.tenantId !== tenantId) {
        throw new TenantError('Invitation not found', TenantErrorCode.TENANT_NOT_FOUND);
      }

      if (invitation.status !== 'pending') {
        throw new TenantError('Cannot resend non-pending invitation', TenantErrorCode.TENANT_ACCESS_DENIED);
      }

      // Générer un nouveau token
      const newToken = generateSecureToken(32);
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Sauvegarder le nouveau token
      await collections.invitation_tokens.doc(newToken).set({
        invitationId,
        tenantId,
        email: invitation.email,
        createdAt: new Date(),
        expiresAt: newExpiresAt,
        used: false
      });

      // Mettre à jour l'invitation
      await collections.user_invitations.doc(invitationId).update({
        expiresAt: newExpiresAt,
        remindersSent: invitation.remindersSent + 1,
        lastReminderAt: new Date(),
        updatedAt: new Date()
      });

      // Renvoyer l'email de manière asynchrone
      const tenant = await tenantService.getTenant(tenantId);
      if (tenant) {
        this.sendInvitationEmailAsync(tenant, invitation, newToken).catch(error => {
          console.error('❌ Error resending invitation email (async):', error);
        });
      }

      await this.logInvitationActivity(tenantId, invitationId, 'invitation_resent', {
        resentAt: new Date()
      });

    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error resending invitation:', error);
      throw new TenantError(
        'Failed to resend invitation',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Traiter les invitations depuis un fichier CSV
   */
  async processCSVInvitations(
    tenantId: string,
    inviterId: string,
    csvData: CSVInvitationData[],
    defaultRole: TenantRole = TenantRole.MEMBER,
    customMessage?: string
  ): Promise<{
    successful: InvitationStatus[];
    failed: { data: CSVInvitationData; error: string }[];
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const successful: InvitationStatus[] = [];
    const failed: { data: CSVInvitationData; error: string }[] = [];

    for (const data of csvData) {
      try {
        // Valider les données CSV
        if (!data.email || !data.firstName || !data.lastName) {
          throw new Error('Email, firstName, and lastName are required');
        }

        const invitation: UserInvitationRequest = {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          tenantRole: data.tenantRole || defaultRole,
          department: data.department,
          message: customMessage
        };

        const result = await this.inviteUser(tenantId, inviterId, invitation);
        successful.push(result);
      } catch (error) {
        failed.push({
          data,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      successful,
      failed,
      summary: {
        total: csvData.length,
        successful: successful.length,
        failed: failed.length
      }
    };
  }

  /**
   * Accepter une invitation (méthode complète)
   */
  async acceptInvitation(acceptance: InvitationAcceptance): Promise<{
    user: any;
    tenant: any;
    loginUrl: string;
  }> {
    console.log('🚀 [UserInvitationService] Starting acceptInvitation process');
    console.log('📋 Acceptance details:', {
      token: acceptance.token.substring(0, 10) + '...',
      acceptTerms: acceptance.acceptTerms,
      marketingConsent: acceptance.marketingConsent
    });

    try {
      // 1. Valider le token d'invitation
      const tokenDoc = await collections.invitation_tokens.doc(acceptance.token).get();
      
      if (!tokenDoc.exists) {
        throw new TenantError('Invalid invitation token', TenantErrorCode.TENANT_NOT_FOUND);
      }

      const tokenData = tokenDoc.data();
      
      if (tokenData.used) {
        throw new TenantError('Invitation token already used', TenantErrorCode.TENANT_ACCESS_DENIED);
      }

      if (tokenData.expiresAt.toDate() < new Date()) {
        throw new TenantError('Invitation token expired', TenantErrorCode.TENANT_ACCESS_DENIED);
      }

      // 2. Récupérer l'invitation
      const invitationDoc = await collections.user_invitations.doc(tokenData.invitationId).get();
      
      if (!invitationDoc.exists) {
        throw new TenantError('Invitation not found', TenantErrorCode.TENANT_NOT_FOUND);
      }

      const invitation = invitationDoc.data() as InvitationStatus;
      
      if (invitation.status !== 'pending') {
        throw new TenantError('Invitation is no longer pending', TenantErrorCode.TENANT_ACCESS_DENIED);
      }

      // 3. Vérifier que l'utilisateur n'existe pas déjà
      const existingUserQuery = await collections.users
        .where('email', '==', invitation.email.toLowerCase())
        .limit(1)
        .get();

      if (!existingUserQuery.empty) {
        throw new TenantError('User already exists', TenantErrorCode.TENANT_ACCESS_DENIED);
      }

      // 4. Créer le compte utilisateur
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const hashedPassword = await this.hashPassword(acceptance.password);
      
      const userData = {
        id: userId,
        email: invitation.email.toLowerCase(),
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        password: hashedPassword,
        emailVerified: true, // L'email est vérifié via l'invitation
        status: 'active',
        applicationRole: 'user',
        permissions: {},
        featurePermissions: [],
        marketingConsent: acceptance.marketingConsent || false,
        acceptedTermsAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        loginCount: 0
      };

      await collections.users.doc(userId).set(userData);
      console.log('✅ User account created:', userId);

      // 5. Ajouter l'utilisateur au TenantMembership
      const membershipId = `membership_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const membershipData = {
        id: membershipId,
        userId: userId,
        tenantId: invitation.tenantId,
        role: invitation.tenantRole,
        permissions: invitation.permissions || [],
        department: invitation.department,
        isActive: true,
        joinedAt: new Date(),
        invitedBy: invitation.invitedBy,
        invitationId: invitation.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await collections.tenant_memberships.doc(membershipId).set(membershipData);
      console.log('✅ TenantMembership created:', membershipId);

      // 6. Marquer l'invitation comme acceptée
      await collections.user_invitations.doc(invitation.id).update({
        status: 'accepted',
        acceptedAt: new Date(),
        updatedAt: new Date()
      });

      // 7. Marquer le token comme utilisé
      await collections.invitation_tokens.doc(acceptance.token).update({
        used: true,
        usedAt: new Date()
      });

      // 8. Récupérer les informations du tenant
      const tenant = await tenantService.getTenant(invitation.tenantId);
      
      if (!tenant) {
        throw new TenantError('Tenant not found', TenantErrorCode.TENANT_NOT_FOUND);
      }

      // 9. Logger l'activité
      await this.logInvitationActivity(invitation.tenantId, invitation.id, 'invitation_accepted', {
        userId: userId,
        acceptedAt: new Date(),
        membershipId: membershipId
      });

      console.log('🎉 [UserInvitationService] Invitation accepted successfully!');

      // 10. Retourner les informations pour la redirection
      return {
        user: {
          id: userId,
          email: userData.email,
          profile: {
            firstName: userData.firstName,
            lastName: userData.lastName
          }
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug || tenant.id
        },
        loginUrl: `/auth/login?email=${encodeURIComponent(userData.email)}&invitation=accepted`
      };

    } catch (error) {
      console.error('❌ [UserInvitationService] Error accepting invitation:', error);
      if (error instanceof TenantError) {
        throw error;
      }
      throw new TenantError(
        'Failed to accept invitation',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Hacher le mot de passe (méthode simple pour l'exemple)
   */
  private async hashPassword(password: string): Promise<string> {
    // En production, utiliser bcrypt ou une autre méthode sécurisée
    // Pour l'instant, on utilise une méthode simple
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(password + 'salt').digest('hex');
  }

  /**
   * Décliner une invitation (méthode complète)
   */
  async declineInvitation(token: string, reason?: string): Promise<void> {
    console.log('🚀 [UserInvitationService] Starting declineInvitation process');

    try {
      // 1. Valider le token d'invitation
      const tokenDoc = await collections.invitation_tokens.doc(token).get();
      
      if (!tokenDoc.exists) {
        throw new TenantError('Invalid invitation token', TenantErrorCode.TENANT_NOT_FOUND);
      }

      const tokenData = tokenDoc.data();
      
      if (tokenData.used) {
        throw new TenantError('Invitation token already used', TenantErrorCode.TENANT_ACCESS_DENIED);
      }

      if (tokenData.expiresAt.toDate() < new Date()) {
        throw new TenantError('Invitation token expired', TenantErrorCode.TENANT_ACCESS_DENIED);
      }

      // 2. Récupérer l'invitation
      const invitationDoc = await collections.user_invitations.doc(tokenData.invitationId).get();
      
      if (!invitationDoc.exists) {
        throw new TenantError('Invitation not found', TenantErrorCode.TENANT_NOT_FOUND);
      }

      const invitation = invitationDoc.data() as InvitationStatus;
      
      if (invitation.status !== 'pending') {
        throw new TenantError('Invitation is no longer pending', TenantErrorCode.TENANT_ACCESS_DENIED);
      }

      // 3. Marquer l'invitation comme déclinée
      await collections.user_invitations.doc(invitation.id).update({
        status: 'declined',
        declinedAt: new Date(),
        declineReason: reason,
        updatedAt: new Date()
      });

      // 4. Marquer le token comme utilisé
      await collections.invitation_tokens.doc(token).update({
        used: true,
        usedAt: new Date()
      });

      // 5. Logger l'activité
      await this.logInvitationActivity(invitation.tenantId, invitation.id, 'invitation_declined', {
        declinedAt: new Date(),
        reason: reason
      });

      console.log('✅ [UserInvitationService] Invitation declined successfully');

    } catch (error) {
      console.error('❌ [UserInvitationService] Error declining invitation:', error);
      if (error instanceof TenantError) {
        throw error;
      }
      throw new TenantError(
        'Failed to decline invitation',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  // Méthodes privées

  private async validateInvitation(tenantId: string, invitation: UserInvitationRequest): Promise<void> {
    console.log('🔍 [Validation] Starting invitation validation...');
    const errors: string[] = [];

    if (!invitation.email || !this.isValidEmail(invitation.email)) {
      errors.push('Valid email is required');
    }

    if (!invitation.firstName?.trim()) {
      errors.push('First name is required');
    }

    // For onboarding invitations, lastName can be empty
    if (!invitation.isOnboardingInvitation && !invitation.lastName?.trim()) {
      errors.push('Last name is required');
    }

    if (!invitation.tenantRole) {
      errors.push('Tenant role is required');
    }

    if (errors.length > 0) {
      console.log('❌ [Validation] Validation failed:', errors);
      throw new TenantError(
        `Validation failed: ${errors.join(', ')}`,
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }

    console.log('✅ [Validation] Validation passed');
  }

  private async checkUserExists(tenantId: string, email: string): Promise<void> {
    console.log('🔍 [UserCheck] Checking if user exists...');
    const startTime = Date.now();

    const existingUser = await collections.users
      .where('tenantId', '==', tenantId)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    const duration = Date.now() - startTime;
    console.log('✅ [UserCheck] User existence check completed in', duration, 'ms');

    if (!existingUser.empty) {
      console.log('❌ [UserCheck] User already exists');
      throw new TenantError(
        'User already exists in this organization',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }

    console.log('✅ [UserCheck] User does not exist, can proceed');
  }

  private async checkPendingInvitation(tenantId: string, email: string): Promise<void> {
    console.log('🔍 [InvitationCheck] Checking for pending invitations...');
    const startTime = Date.now();

    const pendingInvitation = await collections.user_invitations
      .where('tenantId', '==', tenantId)
      .where('email', '==', email.toLowerCase())
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    const duration = Date.now() - startTime;
    console.log('✅ [InvitationCheck] Pending invitation check completed in', duration, 'ms');

    if (!pendingInvitation.empty) {
      console.log('❌ [InvitationCheck] Pending invitation already exists');
      throw new TenantError(
        'Pending invitation already exists for this email',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }

    console.log('✅ [InvitationCheck] No pending invitation found, can proceed');
  }

  private generateInvitationId(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private getDefaultPermissions(tenantRole: TenantRole): string[] {
    const permissions: Record<TenantRole, string[]> = {
      [TenantRole.OWNER]: ['*'],
      [TenantRole.ADMIN]: ['*'],
      [TenantRole.MANAGER]: ['events:create', 'events:edit', 'users:invite', 'reports:view'],
      [TenantRole.MEMBER]: ['events:view', 'attendance:mark'],
      [TenantRole.VIEWER]: ['events:view', 'reports:view']
    };
    return permissions[tenantRole] || permissions[TenantRole.MEMBER];
  }

  private async sendInvitationEmail(tenant: any, invitation: InvitationStatus, token: string): Promise<void> {
    const invitationUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${token}`;

    await this.emailService.sendInvitationEmail(invitation.email, {
      organizationName: tenant.name,
      inviterName: invitation.inviterName,
      role: invitation.tenantRole,
      invitationUrl,
      expiresIn: '7 jours'
    });
  }

  /**
   * Envoi d'email asynchrone pour ne pas bloquer la réponse API
   */
  private async sendInvitationEmailAsync(tenant: any, invitation: InvitationStatus, token: string): Promise<void> {
    console.log('📧 [EmailAsync] Starting async email sending...');
    const startTime = Date.now();

    try {
      console.log(`📧 [EmailAsync] Sending invitation email to ${invitation.email} (async)`);
      await this.sendInvitationEmail(tenant, invitation, token);
      
      const duration = Date.now() - startTime;
      console.log(`✅ [EmailAsync] Invitation email sent successfully to ${invitation.email} in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [EmailAsync] Failed to send invitation email to ${invitation.email} after ${duration}ms:`, error);
      
      // Marquer l'invitation avec un flag d'erreur email
      try {
        await collections.user_invitations.doc(invitation.id).update({
          emailSent: false,
          emailError: error instanceof Error ? error.message : 'Unknown email error',
          updatedAt: new Date()
        });
        console.log('✅ [EmailAsync] Updated invitation with email error flag');
      } catch (updateError) {
        console.error('❌ [EmailAsync] Failed to update invitation with email error:', updateError);
      }
    }
  }

  private async logInvitationActivity(
    tenantId: string,
    invitationId: string,
    action: string,
    metadata?: any
  ): Promise<void> {
    console.log('📝 [Activity] Logging invitation activity:', action);
    const startTime = Date.now();

    try {
      await collections.invitation_activities.add({
        tenantId,
        invitationId,
        action,
        metadata,
        timestamp: new Date()
      });
      
      const duration = Date.now() - startTime;
      console.log('✅ [Activity] Activity logged successfully in', duration, 'ms');
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ [Activity] Error logging invitation activity after', duration, 'ms:', error);
      // Ne pas faire échouer l'opération principale
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Ajouter les collections manquantes
declare module '../../config/database' {
  interface Collections {
    invitation_tokens: any;
    invitation_activities: any;
    tenant_memberships: any;
  }
}

// Instance singleton
export const userInvitationService = new UserInvitationService();
export default userInvitationService;