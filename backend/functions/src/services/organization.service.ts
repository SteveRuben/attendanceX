// backend/functions/src/services/organization.service.ts - Service de gestion des organisations

import { getFirestore } from "firebase-admin/firestore";
import {
  CreateOrganizationRequest,
  DEFAULT_ROLE_PERMISSIONS,
  InvitationStatus,
  Organization,
  OrganizationInvitation,

  OrganizationMember,
  OrganizationRole,
  SECTOR_TEMPLATES,
  UpdateOrganizationRequest
} from "@attendance-x/shared";
import { OrganizationModel } from "../models/organization.model";
import { OrganizationInvitationModel } from "../models/organization-invitation.model";
import { ERROR_CODES } from "@attendance-x/shared";
import { ValidationError } from "../utils/errors";

export class OrganizationService {
  private readonly db = getFirestore();

  /**
   * Créer une nouvelle organisation
   */
  async createOrganization(
    request: CreateOrganizationRequest,
    createdBy: string
  ): Promise<Organization> {
    try {
      // Vérifier si l'utilisateur a déjà une organisation
      const existingOrg = await this.getUserOrganization(createdBy);
      if (existingOrg) {
        throw new ValidationError('L\'utilisateur appartient déjà à une organisation');
      }

      // Créer l'organisation
      const organization = OrganizationModel.fromCreateRequest(request, createdBy);
      organization.validate();

      // Appliquer le template du secteur si spécifié
      if (request.templateId || request.sector) {
        await this.applySectorTemplate(organization, request.sector);
      }

      // Sauvegarder l'organisation
      await this.db.collection('organizations').doc(organization.id).set(organization.toFirestore());

      // Ajouter le créateur comme propriétaire
      await this.addMember(organization.id, createdBy, OrganizationRole.OWNER, createdBy);

      // Incrémenter le compteur de membres
      organization.incrementMemberCount();
      await this.db.collection('organizations').doc(organization.id).update({
        memberCount: organization.memberCount
      });

      return organization.toFirestore();
    } catch (error) {
      console.error('Error creating organization:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir une organisation par ID
   */
  async getOrganization(organizationId: string): Promise<Organization | null> {
    try {
      const doc = await this.db.collection('organizations').doc(organizationId).get();

      if (!doc.exists) {
        return null;
      }

      return OrganizationModel.fromFirestore(doc).toFirestore();
    } catch (error) {
      console.error('Error getting organization:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Mettre à jour une organisation
   */
  async updateOrganization(
    organizationId: string,
    updates: UpdateOrganizationRequest,
    updatedBy: string
  ): Promise<Organization> {
    try {
      const doc = await this.db.collection('organizations').doc(organizationId).get();

      if (!doc.exists) {
        throw new ValidationError('Organisation non trouvée');
      }

      const organization = OrganizationModel.fromFirestore(doc);

      // Vérifier les permissions
      await this.checkMemberPermission(organizationId, updatedBy, 'manage_organization');

      // Appliquer les mises à jour
      organization.update(updates as Partial<Organization>);

      // Sauvegarder
      await this.db.collection('organizations').doc(organizationId).update(organization.toFirestore());

      return organization.toFirestore();
    } catch (error) {
      console.error('Error updating organization:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Ajouter un membre à l'organisation
   */
  async addMember(
    organizationId: string,
    userId: string,
    role: OrganizationRole,
    addedBy: string,
    permissions?: string[]
  ): Promise<OrganizationMember> {
    try {
      // Vérifier que l'organisation existe et peut ajouter des membres
      const organization = await this.getOrganization(organizationId);
      if (!organization) {
        throw new ValidationError('Organisation non trouvée');
      }

      const orgModel = new OrganizationModel(organization);
      if (!orgModel.canAddMember()) {
        throw new ValidationError('Impossible d\'ajouter un membre à cette organisation');
      }

      // Vérifier les permissions de l'ajouteur
      if (addedBy !== userId) {
        await this.checkMemberPermission(organizationId, addedBy, 'manage_members');
      }

      // Vérifier que l'utilisateur n'est pas déjà membre
      const existingMember = await this.getMember(organizationId, userId);
      if (existingMember) {
        throw new ValidationError('L\'utilisateur est déjà membre de cette organisation');
      }

      // Créer le membre
      const member: OrganizationMember = {
        id: this.generateId(),
        userId,
        organizationId,
        role,
        permissions: permissions || DEFAULT_ROLE_PERMISSIONS[role] || [],
        joinedAt: new Date(),
        ...(addedBy !== userId && { invitedBy: addedBy }),
        isActive: true,
        metadata: {}
      };

      // Sauvegarder le membre
      await this.db.collection('organization_members').doc(member.id).set(member);

      // Mettre à jour le compteur de membres
      await this.db.collection('organizations').doc(organizationId).update({
        memberCount: orgModel.memberCount + 1
      });

      return member;
    } catch (error) {
      console.error('Error adding member:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Supprimer un membre de l'organisation
   */
  async removeMember(
    organizationId: string,
    userId: string,
    removedBy: string
  ): Promise<void> {
    try {
      // Vérifier les permissions
      if (removedBy !== userId) {
        await this.checkMemberPermission(organizationId, removedBy, 'remove_members');
      }

      // Vérifier que le membre existe
      const member = await this.getMember(organizationId, userId);
      if (!member) {
        throw new ValidationError('Membre non trouvé');
      }

      // Empêcher la suppression du dernier propriétaire
      if (member.role === OrganizationRole.OWNER) {
        const owners = await this.getMembersByRole(organizationId, OrganizationRole.OWNER);
        if (owners.length <= 1) {
          throw new ValidationError('Impossible de supprimer le dernier propriétaire');
        }
      }

      // Supprimer le membre
      const memberQuery = await this.db
        .collection('organization_members')
        .where('organizationId', '==', organizationId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!memberQuery.empty) {
        await memberQuery.docs[0].ref.delete();

        // Mettre à jour le compteur de membres
        const organization = await this.getOrganization(organizationId);
        if (organization) {
          await this.db.collection('organizations').doc(organizationId).update({
            memberCount: Math.max(0, organization.memberCount - 1)
          });
        }
      }
    } catch (error) {
      console.error('Error removing member:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir un membre de l'organisation
   */
  async getMember(organizationId: string, userId: string): Promise<OrganizationMember | null> {
    try {
      const memberQuery = await this.db
        .collection('organization_members')
        .where('organizationId', '==', organizationId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (memberQuery.empty) {
        return null;
      }

      return memberQuery.docs[0].data() as OrganizationMember;
    } catch (error) {
      console.error('Error getting member:', error);
      return null;
    }
  }

  /**
   * Obtenir tous les membres d'une organisation
   */
  async getMembers(organizationId: string): Promise<OrganizationMember[]> {
    try {
      const membersQuery = await this.db
        .collection('organization_members')
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true)
        .orderBy('joinedAt', 'asc')
        .get();

      return membersQuery.docs.map(doc => doc.data() as OrganizationMember);
    } catch (error) {
      console.error('Error getting members:', error);
      return [];
    }
  }

  /**
   * Obtenir les membres par rôle
   */
  async getMembersByRole(organizationId: string, role: OrganizationRole): Promise<OrganizationMember[]> {
    try {
      const membersQuery = await this.db
        .collection('organization_members')
        .where('organizationId', '==', organizationId)
        .where('role', '==', role)
        .where('isActive', '==', true)
        .get();

      return membersQuery.docs.map(doc => doc.data() as OrganizationMember);
    } catch (error) {
      console.error('Error getting members by role:', error);
      return [];
    }
  }

  /**
   * Créer une invitation
   */
  async createInvitation(
    organizationId: string,
    email: string,
    role: OrganizationRole,
    invitedBy: string,
    permissions?: string[],
    message?: string
  ): Promise<OrganizationInvitation> {
    try {
      // Vérifier les permissions
      await this.checkMemberPermission(organizationId, invitedBy, 'invite_members');

      // Vérifier que l'organisation peut ajouter des membres
      const organization = await this.getOrganization(organizationId);
      if (!organization) {
        throw new ValidationError('Organisation non trouvée');
      }

      const orgModel = new OrganizationModel(organization);
      if (!orgModel.canAddMember()) {
        throw new ValidationError('Impossible d\'inviter de nouveaux membres');
      }

      // Vérifier qu'il n'y a pas déjà une invitation en attente
      const existingInvitation = await this.getPendingInvitation(organizationId, email);
      if (existingInvitation) {
        throw new ValidationError('Une invitation est déjà en attente pour cette adresse email');
      }

      // Créer l'invitation
      const invitation = OrganizationInvitationModel.createInvitation(
        organizationId,
        email,
        role,
        invitedBy,
        permissions,
        message
      );

      // Sauvegarder l'invitation
      await this.db.collection('organization_invitations').doc(invitation.id).set(invitation.toFirestore());

      // Envoyer l'email d'invitation
      await this.sendInvitationEmail(invitation, organization.name);

      return invitation.toFirestore();
    } catch (error) {
      console.error('Error creating invitation:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Accepter une invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<OrganizationMember> {
    try {
      // Trouver l'invitation par token
      const invitationQuery = await this.db
        .collection('organization_invitations')
        .where('token', '==', token)
        .where('status', '==', InvitationStatus.PENDING)
        .limit(1)
        .get();

      if (invitationQuery.empty) {
        throw new ValidationError('Invitation non trouvée ou invalide');
      }

      const invitationDoc = invitationQuery.docs[0];
      const invitation = OrganizationInvitationModel.fromFirestore(invitationDoc);

      // Vérifier que l'invitation est valide
      if (!invitation.isValid()) {
        throw new ValidationError('Cette invitation a expiré ou n\'est plus valide');
      }

      // Accepter l'invitation
      invitation.accept(userId);

      // Ajouter l'utilisateur comme membre
      const member = await this.addMember(
        invitation.organizationId,
        userId,
        invitation.role,
        userId,
        invitation.permissions
      );

      // Mettre à jour l'invitation
      await invitationDoc.ref.update(invitation.toFirestore());

      return member;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Supprimer une organisation
   */
  async deleteOrganization(organizationId: string, userId: string): Promise<void> {
    try {
      // Vérifier les permissions (seul le propriétaire peut supprimer)
      await this.checkMemberRole(organizationId, userId, OrganizationRole.OWNER);

      // Supprimer tous les membres
      const membersQuery = await this.db
        .collection('organization_members')
        .where('organizationId', '==', organizationId)
        .get();

      const batch = this.db.batch();
      membersQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Supprimer toutes les invitations
      const invitationsQuery = await this.db
        .collection('organization_invitations')
        .where('organizationId', '==', organizationId)
        .get();

      invitationsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Supprimer l'organisation
      batch.delete(this.db.collection('organizations').doc(organizationId));

      await batch.commit();
    } catch (error) {
      console.error('Error deleting organization:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir les statistiques d'une organisation
   */
  async getOrganizationStats(organizationId: string): Promise<any> {
    try {
      // Obtenir le nombre de membres
      const membersQuery = await this.db
        .collection('organization_members')
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true)
        .get();

      const totalMembers = membersQuery.size;
      const members = membersQuery.docs.map(doc => doc.data());

      // Obtenir le nombre d'événements
      const eventsQuery = await this.db
        .collection('events')
        .where('organizationId', '==', organizationId)
        .get();

      const totalEvents = eventsQuery.size;

      // Obtenir les invitations en attente
      const pendingInvitationsQuery = await this.db
        .collection('organization_invitations')
        .where('organizationId', '==', organizationId)
        .where('status', '==', InvitationStatus.PENDING)
        .get();

      const pendingInvitations = pendingInvitationsQuery.size;

      // Calculer les statistiques par rôle
      const roleStats = members.reduce((acc: any, member: any) => {
        acc[member.role] = (acc[member.role] || 0) + 1;
        return acc;
      }, {});

      return {
        totalMembers,
        totalEvents,
        pendingInvitations,
        roleDistribution: roleStats,
        lastActivity: new Date(),
        memberGrowth: await this.calculateMemberGrowth(organizationId)
      };
    } catch (error) {
      console.error('Error getting organization stats:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir l'organisation d'un utilisateur
   */
  async getUserOrganization(userId: string): Promise<Organization | null> {
    try {
      const memberQuery = await this.db
        .collection('organization_members')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (memberQuery.empty) {
        return null;
      }

      const member = memberQuery.docs[0].data() as OrganizationMember;
      return await this.getOrganization(member.organizationId);
    } catch (error) {
      console.error('Error getting user organization:', error);
      return null;
    }
  }

  /**
   * Vérifier les permissions d'un membre
   */
  async checkMemberPermission(
    organizationId: string,
    userId: string,
    permission: string
  ): Promise<void> {
    const member = await this.getMember(organizationId, userId);

    if (!member) {
      throw new ValidationError('Utilisateur non membre de cette organisation');
    }

    if (!member.permissions.includes(permission)) {
      throw new ValidationError('Permissions insuffisantes');
    }
  }

  /**
   * Vérifier le rôle d'un membre
   */
  async checkMemberRole(
    organizationId: string,
    userId: string,
    requiredRole: OrganizationRole
  ): Promise<void> {
    const member = await this.getMember(organizationId, userId);

    if (!member) {
      throw new ValidationError('Utilisateur non membre de cette organisation');
    }

    if (member.role !== requiredRole) {
      throw new ValidationError(`Rôle ${requiredRole} requis`);
    }
  }

  /**
   * Obtenir une invitation en attente
   */
  private async getPendingInvitation(
    organizationId: string,
    email: string
  ): Promise<OrganizationInvitation | null> {
    try {
      const invitationQuery = await this.db
        .collection('organization_invitations')
        .where('organizationId', '==', organizationId)
        .where('email', '==', email.toLowerCase())
        .where('status', '==', InvitationStatus.PENDING)
        .limit(1)
        .get();

      if (invitationQuery.empty) {
        return null;
      }

      return invitationQuery.docs[0].data() as OrganizationInvitation;
    } catch (error) {
      console.error('Error getting pending invitation:', error);
      return null;
    }
  }

  /**
   * Calculer la croissance des membres sur les 6 derniers mois
   */
  private async calculateMemberGrowth(organizationId: string): Promise<Record<string, number>> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const membersQuery = await this.db
        .collection('organization_members')
        .where('organizationId', '==', organizationId)
        .where('joinedAt', '>=', sixMonthsAgo)
        .get();

      const growth: Record<string, number> = {};
      
      membersQuery.docs.forEach(doc => {
        const member = doc.data();
        if (member.joinedAt) {
          const date = member.joinedAt.toDate ? member.joinedAt.toDate() : new Date(member.joinedAt);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          growth[monthKey] = (growth[monthKey] || 0) + 1;
        }
      });

      return growth;
    } catch (error) {
      console.error('Error calculating member growth:', error);
      return {};
    }
  }

  /**
   * Appliquer un template de secteur
   */
  private async applySectorTemplate(
    organization: OrganizationModel,
    sector: any
  ): Promise<void> {
    const template = SECTOR_TEMPLATES[sector];
    if (template) {
      if (template.settings) {
        organization.settings = { ...organization.settings, ...template.settings };
      }
      if (template.branding) {
        organization.branding = { ...organization.branding, ...template.branding };
      }
    }
  }

  /**
   * Envoyer un email d'invitation
   */
  private async sendInvitationEmail(
    invitation: OrganizationInvitationModel,
    organizationName: string
  ): Promise<void> {
    try {
      // Ici vous intégreriez votre service d'email
      // Pour l'instant, on simule l'envoi
      console.log(`Sending invitation email to ${invitation.email} for organization ${organizationName}`);

      // Simulation d'envoi d'email
      // const emailData = invitation.getEmailData(organizationName, 'Inviter');
      // await emailService.sendInvitationEmail(emailData);
    } catch (error) {
      console.error('Error sending invitation email:', error);
      // Ne pas faire échouer l'invitation si l'email échoue
    }
  }

  /**
   * Déterminer le rôle d'un utilisateur selon l'organisation
   */
  async determineUserRole(organization: string): Promise<{
    role: any;
    isFirstUser: boolean;
    organizationId?: string;
  }> {
    try {
      // Chercher si l'organisation existe déjà
      const orgQuery = await this.db
        .collection('organizations')
        .where('name', '==', organization)
        .limit(1)
        .get();

      if (orgQuery.empty) {
        // Première organisation avec ce nom - l'utilisateur sera propriétaire
        return {
          role: OrganizationRole.OWNER,
          isFirstUser: true
        };
      } else {
        // Organisation existe - l'utilisateur sera membre
        const orgDoc = orgQuery.docs[0];
        return {
          role: OrganizationRole.MEMBER,
          isFirstUser: false,
          organizationId: orgDoc.id
        };
      }
    } catch (error) {
      console.error('Error determining user role:', error);
      // Par défaut, considérer comme premier utilisateur
      return {
        role: OrganizationRole.OWNER,
        isFirstUser: true
      };
    }
  }

  /**
   * Incrémenter le compteur d'utilisateurs
   */
  async incrementUserCount(organizationId: string): Promise<void> {
    try {
      const orgRef = this.db.collection('organizations').doc(organizationId);
      const orgDoc = await orgRef.get();
      
      if (orgDoc.exists) {
        const currentCount = orgDoc.data()?.memberCount || 0;
        await orgRef.update({
          memberCount: currentCount + 1,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error incrementing user count:', error);
      // Ne pas faire échouer l'opération principale
    }
  }

  private generateId(): string {
    return this.db.collection('temp').doc().id;
  }
}

export const organizationService = new OrganizationService();