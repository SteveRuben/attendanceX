/**
 * Service de gestion des invitations utilisateurs
 * Gère l'invitation, l'acceptation et la gestion des invitations
 */

import { TenantError, TenantErrorCode, UserRole } from '../../common/types';
import { collections } from '../../config/database';
import { tenantService } from '../tenant/tenant.service';
import { tenantUserService } from './tenant-user.service';
import { EmailService } from '../notification';
import { generateSecureToken } from '../../utils/token-generator';

export interface UserInvitationRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions?: string[];
  department?: string;
  message?: string;
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
  role?: UserRole;
  department?: string;
}

export interface InvitationStatus {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
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

export class UserInvitationService {
   
  emailService = new EmailService();

  /**
   * Inviter un utilisateur unique
   */
  async inviteUser(
    tenantId: string,
    inviterId: string,
    invitation: UserInvitationRequest
  ): Promise<InvitationStatus> {
    try {
      // Valider les données d'invitation
      await this.validateInvitation(tenantId, invitation);

      // Vérifier que l'utilisateur n'existe pas déjà
      await this.checkUserExists(tenantId, invitation.email);

      // Vérifier qu'il n'y a pas d'invitation en cours
      await this.checkPendingInvitation(tenantId, invitation.email);

      // Créer l'invitation
      const invitationId = this.generateInvitationId();
      const token = generateSecureToken(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

      const inviter = await tenantUserService.getUserById(tenantId, inviterId);
      const tenant = await tenantService.getTenant(tenantId);

      if (!inviter || !tenant) {
        throw new TenantError('Inviter or tenant not found', TenantErrorCode.TENANT_NOT_FOUND);
      }

      const invitationData: InvitationStatus = {
        id: invitationId,
        tenantId,
        email: invitation.email.toLowerCase(),
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        role: invitation.role,
        permissions: invitation.permissions || this.getDefaultPermissions(invitation.role),
        department: invitation.department,
        invitedBy: inviterId,
        inviterName: `${inviter.firstName} ${inviter.lastName}`,
        status: 'pending',
        message: invitation.message,
        createdAt: new Date(),
        expiresAt,
        remindersSent: 0
      };

      // Sauvegarder l'invitation
      await collections.user_invitations.doc(invitationId).set(invitationData);

      // Sauvegarder le token d'invitation
      await collections.invitation_tokens.doc(token).set({
        invitationId,
        tenantId,
        email: invitation.email.toLowerCase(),
        createdAt: new Date(),
        expiresAt,
        used: false
      });

      // Envoyer l'email d'invitation
      await this.sendInvitationEmail(tenant, invitationData, token);

      // Enregistrer l'activité
      await this.logInvitationActivity(tenantId, invitationId, 'invitation_sent', {
        invitedBy: inviterId,
        email: invitation.email
      });

      return invitationData;

    } catch (error) {
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
   * Traiter les invitations depuis un fichier CSV
   */
  async processCSVInvitations(
    tenantId: string,
    inviterId: string,
    csvData: CSVInvitationData[],
    defaultRole: UserRole = UserRole.PARTICIPANT,
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
          role: data.role || defaultRole,
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
   * Accepter une invitation
   */
  async acceptInvitation(acceptance: InvitationAcceptance): Promise<{
    user: any;
    tenant: any;
    loginUrl: string;
  }> {
    try {
      // Valider le token
      const tokenData = await this.validateInvitationToken(acceptance.token);

      // Obtenir l'invitation
      const invitation = await this.getInvitation(tokenData.invitationId);
      if (!invitation || invitation.status !== 'pending') {
        throw new TenantError('Invalid or expired invitation', TenantErrorCode.TENANT_ACCESS_DENIED);
      }

      // Vérifier que l'invitation n'a pas expiré
      if (invitation.expiresAt < new Date()) {
        await this.updateInvitationStatus(invitation.id, 'expired');
        throw new TenantError('Invitation has expired', TenantErrorCode.TENANT_ACCESS_DENIED);
      }

      // Créer l'utilisateur
      const user = await tenantUserService.createUser(invitation.tenantId, {
        email: invitation.email,
        name: `${invitation.firstName} ${invitation.lastName}`,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        password: acceptance.password,
        role: invitation.role as UserRole,
        profile: {
          department: invitation.department
        }
      });

      // Marquer l'invitation comme acceptée
      await this.updateInvitationStatus(invitation.id, 'accepted', {
        acceptedAt: new Date(),
        acceptedBy: user.id
      });

      // Marquer le token comme utilisé
      await this.markTokenAsUsed(acceptance.token);

      // Enregistrer l'activité
      await this.logInvitationActivity(invitation.tenantId, invitation.id, 'invitation_accepted', {
        userId: user.id,
        acceptedAt: new Date()
      });

      // Obtenir les informations du tenant
      const tenant = await tenantService.getTenant(invitation.tenantId);

      // Envoyer l'email de bienvenue
      if (tenant) {
        await this.emailService.sendWelcomeEmail(user.email, {
          organizationName: tenant.name,
          adminName: `${user.firstName} ${user.lastName}`,
          setupUrl: `${process.env.FRONTEND_URL}/dashboard`
        });
      }

      return {
        user,
        tenant,
        loginUrl: `${process.env.FRONTEND_URL}/login`
      };

    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error accepting invitation:', error);
      throw new TenantError(
        'Failed to accept invitation',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }
  }

  /**
   * Décliner une invitation
   */
  async declineInvitation(token: string, reason?: string): Promise<void> {
    try {
      const tokenData = await this.validateInvitationToken(token);
      const invitation = await this.getInvitation(tokenData.invitationId);

      if (!invitation || invitation.status !== 'pending') {
        throw new TenantError('Invalid or expired invitation', TenantErrorCode.TENANT_ACCESS_DENIED);
      }

      await this.updateInvitationStatus(invitation.id, 'declined', {
        declinedAt: new Date(),
        declineReason: reason
      });

      await this.markTokenAsUsed(token);

      await this.logInvitationActivity(invitation.tenantId, invitation.id, 'invitation_declined', {
        reason,
        declinedAt: new Date()
      });

    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error declining invitation:', error);
      throw new TenantError(
        'Failed to decline invitation',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }
  }

  /**
   * Annuler une invitation
   */
  async cancelInvitation(tenantId: string, invitationId: string, cancelledBy: string): Promise<void> {
    try {
      const invitation = await this.getInvitation(invitationId);

      if (!invitation || invitation.tenantId !== tenantId) {
        throw new TenantError('Invitation not found', TenantErrorCode.TENANT_NOT_FOUND);
      }

      if (invitation.status !== 'pending') {
        throw new TenantError('Cannot cancel non-pending invitation', TenantErrorCode.TENANT_ACCESS_DENIED);
      }

      await this.updateInvitationStatus(invitationId, 'cancelled', {
        cancelledAt: new Date(),
        cancelledBy
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
      const invitation = await this.getInvitation(invitationId);

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
        lastReminderAt: new Date()
      });

      // Renvoyer l'email
      const tenant = await tenantService.getTenant(tenantId);
      if (tenant) {
        await this.sendInvitationEmail(tenant, invitation, newToken);
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
   * Obtenir les invitations d'un tenant
   */
  async getTenantInvitations(
    tenantId: string,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    invitations: InvitationStatus[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      let query = collections.user_invitations
        .where('tenantId', '==', tenantId);

      if (options.status) {
        query = query.where('status', '==', options.status);
      }

      // Appliquer le tri
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder || 'desc';
      query = query.orderBy(sortBy, sortOrder);

      // Appliquer la pagination
      if (options.offset) {
        query = query.offset(options.offset);
      }

      const limit = options.limit || 50;
      query = query.limit(limit + 1); // +1 pour vérifier s'il y a plus de résultats

      const snapshot = await query.get();
      const invitations = snapshot.docs.slice(0, limit).map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InvitationStatus[];

      const hasMore = snapshot.docs.length > limit;

      // Obtenir le total (approximatif pour de meilleures performances)
      const totalSnapshot = await collections.user_invitations
        .where('tenantId', '==', tenantId)
        .select() // Sélectionner seulement l'ID pour compter
        .get();

      return {
        invitations,
        total: totalSnapshot.size,
        hasMore
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
   * Nettoyer les invitations expirées
   */
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const now = new Date();
      const expiredSnapshot = await collections.user_invitations
        .where('status', '==', 'pending')
        .where('expiresAt', '<', now)
        .get();

      const batch = collections.user_invitations.firestore.batch();
      let count = 0;

      expiredSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'expired',
          expiredAt: now
        });
        count++;
      });

      if (count > 0) {
        await batch.commit();
      }

      return count;

    } catch (error) {
      console.error('Error cleaning up expired invitations:', error);
      return 0;
    }
  }

  // Méthodes privées

  private async validateInvitation(tenantId: string, invitation: UserInvitationRequest): Promise<void> {
    const errors: string[] = [];

    if (!invitation.email || !this.isValidEmail(invitation.email)) {
      errors.push('Valid email is required');
    }

    if (!invitation.firstName?.trim()) {
      errors.push('First name is required');
    }

    if (!invitation.lastName?.trim()) {
      errors.push('Last name is required');
    }

    if (!invitation.role) {
      errors.push('Role is required');
    }

    if (errors.length > 0) {
      throw new TenantError(
        `Validation failed: ${errors.join(', ')}`,
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }
  }

  private async checkUserExists(tenantId: string, email: string): Promise<void> {
    const existingUser = await collections.users
      .where('tenantId', '==', tenantId)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!existingUser.empty) {
      throw new TenantError(
        'User already exists in this organization',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }
  }

  private async checkPendingInvitation(tenantId: string, email: string): Promise<void> {
    const pendingInvitation = await collections.user_invitations
      .where('tenantId', '==', tenantId)
      .where('email', '==', email.toLowerCase())
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!pendingInvitation.empty) {
      throw new TenantError(
        'Pending invitation already exists for this email',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }
  }

  private generateInvitationId(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private getDefaultPermissions(role: UserRole): string[] {
    const permissions: Record<UserRole, string[]> = {
      [UserRole.ADMIN]: ['*'],
      [UserRole.MANAGER]: ['events:create', 'events:edit', 'users:invite', 'reports:view'],
      [UserRole.ORGANIZER]: ['events:create', 'events:edit', 'users:invite', 'reports:view'],
      [UserRole.MODERATOR]: ['events:view', 'events:edit', 'attendance:mark', 'reports:view'],
      [UserRole.PARTICIPANT]: ['events:view', 'attendance:mark'],
      [UserRole.ANALYST]: ['events:view', 'reports:view', 'analytics:view'],
      [UserRole.CONTRIBUTOR]: ['events:view', 'attendance:mark', 'content:create'],
      [UserRole.VIEWER]: ['events:view', 'reports:view'],
      [UserRole.GUEST]: ['events:view'],
      [UserRole.SUPER_ADMIN]: ['*']
    };
    return permissions[role] || permissions[UserRole.PARTICIPANT];
  }

  private async sendInvitationEmail(tenant: any, invitation: InvitationStatus, token: string): Promise<void> {
    const invitationUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${token}`;

    await this.emailService.sendInvitationEmail(invitation.email, {
      organizationName: tenant.name,
      inviterName: invitation.inviterName,
      role: invitation.role,
      invitationUrl,
      expiresIn: '7 jours'
    });
  }

  private async validateInvitationToken(token: string): Promise<any> {
    const tokenDoc = await collections.invitation_tokens.doc(token).get();

    if (!tokenDoc.exists) {
      throw new TenantError('Invalid invitation token', TenantErrorCode.TENANT_ACCESS_DENIED);
    }

    const tokenData = tokenDoc.data();

    if (tokenData.used) {
      throw new TenantError('Invitation token already used', TenantErrorCode.TENANT_ACCESS_DENIED);
    }

    if (tokenData.expiresAt.toDate() < new Date()) {
      throw new TenantError('Invitation token expired', TenantErrorCode.TENANT_ACCESS_DENIED);
    }

    return tokenData;
  }

  private async getInvitation(invitationId: string): Promise<InvitationStatus | null> {
    const doc = await collections.user_invitations.doc(invitationId).get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as InvitationStatus;
  }

  private async updateInvitationStatus(invitationId: string, status: string, additionalData?: any): Promise<void> {
    const updateData = {
      status,
      updatedAt: new Date(),
      ...additionalData
    };

    await collections.user_invitations.doc(invitationId).update(updateData);
  }

  private async markTokenAsUsed(token: string): Promise<void> {
    await collections.invitation_tokens.doc(token).update({
      used: true,
      usedAt: new Date()
    });
  }

  private async logInvitationActivity(
    tenantId: string,
    invitationId: string,
    action: string,
    metadata?: any
  ): Promise<void> {
    try {
      await collections.invitation_activities.add({
        tenantId,
        invitationId,
        action,
        metadata,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging invitation activity:', error);
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
  }
}

// Instance singleton
export const userInvitationService = new UserInvitationService();
export default userInvitationService;