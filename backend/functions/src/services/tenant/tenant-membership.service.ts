/**
 * Service de gestion des memberships tenant
 * Gère les invitations, les rôles et les permissions des utilisateurs dans les tenants
 */

import {
  TenantMembership,
  CreateTenantMembershipRequest,
  TenantRole,
  TenantError,
  TenantErrorCode,
  FeaturePermission
} from '../../common/types';
import { PermissionService } from '../permissions/permission.service';
import { collections } from '../../config/database';
import { tenantService } from './tenant.service';
import { tenantContextService } from './tenant-context.service';
import * as crypto from 'crypto';

export interface TenantInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: TenantRole;
  invitedBy: string;
  invitationToken: string;
  customMessage?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InviteUserRequest {
  tenantId: string;
  email: string;
  role: TenantRole;
  invitedBy: string;
  customMessage?: string;
  permissions?: string[];
}

export interface MembershipListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  role?: TenantRole;
  isActive?: boolean;
  searchTerm?: string;
}

export interface MembershipListResponse {
  memberships: Array<TenantMembership & {
    user?: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    }
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class TenantMembershipService {

  /**
   * Créer un membership tenant
   */
  async createMembership(request: CreateTenantMembershipRequest): Promise<TenantMembership> {
    try {
      // Vérifier que le tenant existe
      const tenant = await tenantService.getTenant(request.tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Vérifier que l'utilisateur n'est pas déjà membre
      const existingMembership = await this.getMembershipByUser(request.tenantId, request.userId);
      if (existingMembership) {
        throw new TenantError(
          'User is already a member of this tenant',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      // Préparer les données du membership
      const now = new Date();
      const membershipData: Omit<TenantMembership, 'id'> = {
        tenantId: request.tenantId,
        userId: request.userId,
        role: request.role,
        featurePermissions: request.featurePermissions || PermissionService.getDefaultRolePermissions(request.role),
        isActive: true,
        joinedAt: now,
        invitedBy: request.invitedBy,
        createdAt: now,
        updatedAt: now
      };

      // Créer le membership
      const membershipRef = await collections.tenant_memberships.add(membershipData);
      const membership = {
        id: membershipRef.id,
        ...membershipData
      };

      // Mettre à jour le compteur d'utilisateurs du tenant
      await tenantService.updateTenantUsage(request.tenantId, 'users', 1);

      // Invalider le cache des contextes
      tenantContextService.invalidateUserContexts(request.userId);

      return membership;
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error creating membership:', error);
      throw new TenantError(
        'Failed to create membership',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir un membership par utilisateur et tenant
   */
  async getMembershipByUser(tenantId: string, userId: string): Promise<TenantMembership | null> {
    try {
      const query = await collections.tenant_memberships
        .where('tenantId', '==', tenantId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      const doc = query.docs[0];
      return { id: doc.id, ...doc.data() } as TenantMembership;
    } catch (error) {
      console.error('Error getting membership by user:', error);
      return null;
    }
  }

  /**
   * Lister les memberships d'un tenant
   */
  async getMembershipsByTenant(
    tenantId: string,
    options: MembershipListOptions = {}
  ): Promise<MembershipListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'joinedAt',
        sortOrder = 'desc',
        role,
        isActive,
        searchTerm
      } = options;

      let query = collections.tenant_memberships
        .where('tenantId', '==', tenantId)
        .orderBy(sortBy, sortOrder);

      // Appliquer les filtres
      if (role) {
        query = query.where('role', '==', role) as any;
      }

      if (isActive !== undefined) {
        query = query.where('isActive', '==', isActive) as any;
      }

      // Compter le total
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Appliquer la pagination
      const offset = (page - 1) * limit;
      const paginatedQuery = query.offset(offset).limit(limit);
      const snapshot = await paginatedQuery.get();

      // Charger les données utilisateur pour chaque membership
      const membershipsWithUsers = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const membership = { id: doc.id, ...doc.data() } as TenantMembership;

          // Charger les données utilisateur
          try {
            const userDoc = await collections.users.doc(membership.userId).get();
            const userData = userDoc.exists ? userDoc.data() : null;

            return {
              ...membership,
              user: userData ? {
                id: userDoc.id,
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName
              } : undefined
            } as TenantMembership & {
              user?: {
                id: string;
                email: string;
                firstName?: string;
                lastName?: string;
              }
            };
          } catch (error) {
            console.error('Error loading user data for membership:', error);
            return {
              ...membership,
              user: undefined
            } as TenantMembership & {
              user?: {
                id: string;
                email: string;
                firstName?: string;
                lastName?: string;
              }
            };
          }
        })
      );

      // Filtrer par terme de recherche si fourni
      let filteredMemberships = membershipsWithUsers;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredMemberships = membershipsWithUsers.filter(membership =>
          membership.user?.email.toLowerCase().includes(term) ||
          membership.user?.firstName?.toLowerCase().includes(term) ||
          membership.user?.lastName?.toLowerCase().includes(term)
        );
      }

      return {
        memberships: filteredMemberships,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + filteredMemberships.length < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting memberships by tenant:', error);
      throw new TenantError(
        'Failed to get memberships',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Mettre à jour un membership
   */
  async updateMembership(
    membershipId: string,
    updates: {
      role?: TenantRole;
      featurePermissions?: FeaturePermission[];
      isActive?: boolean;
    }
  ): Promise<TenantMembership> {
    try {
      // Vérifier que le membership existe
      const membershipDoc = await collections.tenant_memberships.doc(membershipId).get();
      if (!membershipDoc.exists) {
        throw new TenantError(
          'Membership not found',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      const existingMembership = { id: membershipDoc.id, ...membershipDoc.data() } as TenantMembership;

      // Préparer les données de mise à jour
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      // Si le rôle change, mettre à jour les permissions par défaut
      if (updates.role && updates.role !== existingMembership.role) {
        updateData.featurePermissions = PermissionService.getDefaultRolePermissions(updates.role);
      }

      // Mettre à jour dans Firestore
      await collections.tenant_memberships.doc(membershipId).update(updateData);

      // Invalider le cache des contextes
      tenantContextService.invalidateUserContexts(existingMembership.userId);

      return {
        ...existingMembership,
        ...updateData
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error updating membership:', error);
      throw new TenantError(
        'Failed to update membership',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Supprimer un membership (retirer un utilisateur du tenant)
   */
  async removeMembership(membershipId: string): Promise<boolean> {
    try {
      // Vérifier que le membership existe
      const membershipDoc = await collections.tenant_memberships.doc(membershipId).get();
      if (!membershipDoc.exists) {
        return false;
      }

      const membership = { id: membershipDoc.id, ...membershipDoc.data() } as TenantMembership;

      // Supprimer le membership
      await collections.tenant_memberships.doc(membershipId).delete();

      // Mettre à jour le compteur d'utilisateurs du tenant
      await tenantService.updateTenantUsage(membership.tenantId, 'users', -1);

      // Invalider le cache des contextes
      tenantContextService.invalidateUserContexts(membership.userId);

      return true;
    } catch (error) {
      console.error('Error removing membership:', error);
      return false;
    }
  }

  /**
   * Inviter un utilisateur dans un tenant
   */
  async inviteUser(request: InviteUserRequest): Promise<TenantInvitation> {
    try {
      // Vérifier que le tenant existe
      const tenant = await tenantService.getTenant(request.tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Vérifier qu'il n'y a pas déjà une invitation en attente
      const existingInvitation = await this.getPendingInvitation(request.tenantId, request.email);
      if (existingInvitation) {
        throw new TenantError(
          'User already has a pending invitation',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      // Vérifier que l'utilisateur n'est pas déjà membre
      const userQuery = await collections.users.where('email', '==', request.email.toLowerCase()).limit(1).get();
      if (!userQuery.empty) {
        const userId = userQuery.docs[0].id;
        const existingMembership = await this.getMembershipByUser(request.tenantId, userId);
        if (existingMembership) {
          throw new TenantError(
            'User is already a member of this tenant',
            TenantErrorCode.TENANT_ACCESS_DENIED
          );
        }
      }

      // Générer un token d'invitation
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

      // Créer l'invitation
      const now = new Date();
      const invitationData: Omit<TenantInvitation, 'id'> = {
        tenantId: request.tenantId,
        email: request.email.toLowerCase(),
        role: request.role,
        invitedBy: request.invitedBy,
        invitationToken,
        customMessage: request.customMessage,
        status: 'pending',
        expiresAt,
        createdAt: now,
        updatedAt: now
      };

      // Sauvegarder l'invitation
      const invitationRef = await collections.user_invitations.add(invitationData);
      const invitation = {
        id: invitationRef.id,
        ...invitationData
      };

      // TODO: Envoyer l'email d'invitation
      // await emailService.sendTenantInvitation(invitation, tenant);

      return invitation;
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
   * Accepter une invitation
   */
  async acceptInvitation(invitationToken: string, userId: string): Promise<TenantMembership> {
    try {
      // Trouver l'invitation
      const invitationQuery = await collections.user_invitations
        .where('invitationToken', '==', invitationToken)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (invitationQuery.empty) {
        throw new TenantError(
          'Invalid or expired invitation',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      const invitationDoc = invitationQuery.docs[0];
      const invitation = { id: invitationDoc.id, ...invitationDoc.data() } as TenantInvitation;

      // Vérifier que l'invitation n'a pas expiré
      if (invitation.expiresAt < new Date()) {
        await collections.user_invitations.doc(invitation.id).update({
          status: 'expired',
          updatedAt: new Date()
        });
        throw new TenantError(
          'Invitation has expired',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      // Vérifier que l'email correspond à l'utilisateur
      const userDoc = await collections.users.doc(userId).get();
      if (!userDoc.exists) {
        throw new TenantError(
          'User not found',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      const userData = userDoc.data()!;
      if (userData.email.toLowerCase() !== invitation.email) {
        throw new TenantError(
          'Email mismatch',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      // Créer le membership
      const membership = await this.createMembership({
        tenantId: invitation.tenantId,
        userId,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        featurePermissions: PermissionService.getDefaultRolePermissions(invitation.role)
      });

      // Marquer l'invitation comme acceptée
      await collections.user_invitations.doc(invitation.id).update({
        status: 'accepted',
        acceptedAt: new Date(),
        updatedAt: new Date()
      });

      return membership;
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error accepting invitation:', error);
      throw new TenantError(
        'Failed to accept invitation',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir une invitation en attente
   */
  private async getPendingInvitation(tenantId: string, email: string): Promise<TenantInvitation | null> {
    try {
      const query = await collections.user_invitations
        .where('tenantId', '==', tenantId)
        .where('email', '==', email.toLowerCase())
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      const doc = query.docs[0];
      return { id: doc.id, ...doc.data() } as TenantInvitation;
    } catch (error) {
      console.error('Error getting pending invitation:', error);
      return null;
    }
  }



  /**
   * Obtenir les memberships d'un utilisateur
   */
  async getMembershipsByUser(userId: string): Promise<Array<TenantMembership & {
    tenant?: {
      id: string;
      name: string;
      slug: string;
      status: string;
    }
  }>> {
    try {
      // Récupérer tous les memberships actifs de l'utilisateur
      const membershipSnapshot = await collections.tenant_memberships
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      // Charger les données des tenants pour chaque membership
      const membershipsWithTenants = await Promise.all(
        membershipSnapshot.docs.map(async (doc) => {
          const membership = { id: doc.id, ...doc.data() } as TenantMembership;

          // Charger les données du tenant
          try {
            const tenant = await tenantService.getTenant(membership.tenantId);
            
            return {
              ...membership,
              tenant: tenant ? {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                status: tenant.status
              } : undefined
            };
          } catch (error) {
            console.error(`Error loading tenant data for membership ${membership.id}:`, error);
            return {
              ...membership,
              tenant: undefined
            };
          }
        })
      );

      return membershipsWithTenants;
    } catch (error) {
      console.error('Error getting memberships by user:', error);
      throw new TenantError(
        'Failed to get user memberships',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir les statistiques des memberships pour un tenant
   */
  async getMembershipStats(tenantId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<TenantRole, number>;
    pendingInvitations: number;
    joinedToday: number;
    joinedThisWeek: number;
    joinedThisMonth: number;
  }> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalSnapshot,
        activeSnapshot,
        inactiveSnapshot,
        pendingInvitationsSnapshot,
        joinedTodaySnapshot,
        joinedThisWeekSnapshot,
        joinedThisMonthSnapshot
      ] = await Promise.all([
        collections.tenant_memberships.where('tenantId', '==', tenantId).get(),
        collections.tenant_memberships.where('tenantId', '==', tenantId).where('isActive', '==', true).get(),
        collections.tenant_memberships.where('tenantId', '==', tenantId).where('isActive', '==', false).get(),
        collections.user_invitations.where('tenantId', '==', tenantId).where('status', '==', 'pending').get(),
        collections.tenant_memberships.where('tenantId', '==', tenantId).where('joinedAt', '>=', today).get(),
        collections.tenant_memberships.where('tenantId', '==', tenantId).where('joinedAt', '>=', thisWeek).get(),
        collections.tenant_memberships.where('tenantId', '==', tenantId).where('joinedAt', '>=', thisMonth).get()
      ]);

      // Compter par rôle
      const byRole: Record<TenantRole, number> = {
        [TenantRole.OWNER]: 0,
        [TenantRole.ADMIN]: 0,
        [TenantRole.MANAGER]: 0,
        [TenantRole.MEMBER]: 0,
        [TenantRole.VIEWER]: 0
      };

      totalSnapshot.docs.forEach(doc => {
        const membership = doc.data() as TenantMembership;
        if (membership.isActive) {
          byRole[membership.role] = (byRole[membership.role] || 0) + 1;
        }
      });

      return {
        total: totalSnapshot.size,
        active: activeSnapshot.size,
        inactive: inactiveSnapshot.size,
        byRole,
        pendingInvitations: pendingInvitationsSnapshot.size,
        joinedToday: joinedTodaySnapshot.size,
        joinedThisWeek: joinedThisWeekSnapshot.size,
        joinedThisMonth: joinedThisMonthSnapshot.size
      };
    } catch (error) {
      console.error('Error getting membership stats:', error);
      throw new TenantError(
        'Failed to get membership stats',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }
}

// Instance singleton
export const tenantMembershipService = new TenantMembershipService();
export default tenantMembershipService;