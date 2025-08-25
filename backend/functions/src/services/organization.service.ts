// backend/functions/src/services/organization.service.ts - Service de gestion des organisations

import {
  CreateOrganizationRequest,
  DEFAULT_ROLE_PERMISSIONS,
  InvitationStatus,
  Organization,
  OrganizationInvitation,
  OrganizationMember,
  OrganizationRole,
  OrganizationStatus,
  SECTOR_TEMPLATES,
  UpdateOrganizationRequest,
  UserRole
} from "@attendance-x/shared";
import { OrganizationModel } from "../models/organization.model";
import { OrganizationInvitationModel } from "../models/organization-invitation.model";
import { ERROR_CODES } from "@attendance-x/shared";
import { ValidationError } from "../utils/errors";
import { collections, db } from "../config";

export class OrganizationService {


  /**
   * Créer une organisation minimale lors de l'enregistrement d'un utilisateur
   */
  async createMinimalOrganization(
    organizationName: string,
    createdBy: string
  ): Promise<Organization> {
    try {
      // Vérifier si l'utilisateur a déjà une organisation
      const existingOrg = await this.getUserOrganization(createdBy);
      if (existingOrg) {
        throw new ValidationError('L\'utilisateur appartient déjà à une organisation');
      }

      // Créer l'organisation minimale
      const organization = OrganizationModel.createMinimal(organizationName, createdBy);
      await organization.validate(true); // Validation minimale

      // Sauvegarder l'organisation
      await collections.organizations.doc(organization.id).set(organization.toFirestore());

      // Ajouter le créateur comme propriétaire
      await this.addMember(organization.id, createdBy, OrganizationRole.OWNER, createdBy);

      return organization.toFirestore();
    } catch (error) {
      console.error('Erreur lors de la création de l\'organisation minimale:', error);
      throw error;
    }
  }

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
        console.log('🔍 Organisation existante trouvée:', {
          organizationId: existingOrg.id,
          organizationName: existingOrg.name,
          status: existingOrg.status,
          userId: createdBy
        });

        // Si l'organisation existe mais n'est pas configurée, suggérer la finalisation
        const orgModel = new OrganizationModel(existingOrg);
        const needsSetup = orgModel.needsSetup();
        
        console.log('🔍 Vérification needsSetup:', {
          needsSetup,
          status: existingOrg.status,
          expectedStatus: OrganizationStatus.PENDING_VERIFICATION
        });

        if (needsSetup) {
          const error = new ValidationError('L\'utilisateur a déjà une organisation qui doit être configurée');
          (error as any).organizationId = existingOrg.id;
          (error as any).needsSetup = true;
          console.log('🎯 Lancement erreur spéciale pour redirection:', {
            organizationId: existingOrg.id,
            needsSetup: true
          });
          throw error;
        }
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
      await collections.organizations.doc(organization.id).set(organization.toFirestore());

      // Ajouter le créateur comme propriétaire
      await this.addMember(organization.id, createdBy, OrganizationRole.OWNER, createdBy);

      // Incrémenter le compteur de membres
      organization.incrementMemberCount();
      await collections.organizations.doc(organization.id).update({
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
      const doc = await collections.organizations.doc(organizationId).get();

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
      const doc = await collections.organizations.doc(organizationId).get();

      if (!doc.exists) {
        throw new ValidationError('Organisation non trouvée');
      }

      const organization = OrganizationModel.fromFirestore(doc);

      // Vérifier les permissions
      await this.checkMemberPermission(organizationId, updatedBy, 'manage_organization');

      // Appliquer les mises à jour
      organization.update(updates as Partial<Organization>);

      // Sauvegarder
      await collections.organizations.doc(organizationId).update(organization.toFirestore());

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
      await collections.organization_members.doc(member.id).set(member);

      // Mettre à jour le compteur de membres
      await collections.organizations.doc(organizationId).update({
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
      const memberQuery = await collections.organization_members
        .where('organizationId', '==', organizationId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!memberQuery.empty) {
        await memberQuery.docs[0].ref.delete();

        // Mettre à jour le compteur de membres
        const organization = await this.getOrganization(organizationId);
        if (organization) {
          await collections.organizations.doc(organizationId).update({
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
      const memberQuery = await collections.organization_members
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
      const membersQuery = await collections.organization_members
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
      const membersQuery = await collections.organization_members
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
      await collections.organization_invitations.doc(invitation.id).set(invitation.toFirestore());

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
      const invitationQuery = await collections.organization_invitations
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
      const membersQuery = await collections.organization_members
        .where('organizationId', '==', organizationId)
        .get();

      const batch = db.batch();
      membersQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Supprimer toutes les invitations
      const invitationsQuery = await collections.organization_invitations
        .where('organizationId', '==', organizationId)
        .get();

      invitationsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Supprimer l'organisation
      batch.delete(collections.organizations.doc(organizationId));

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
      const membersQuery = await collections.organization_members
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true)
        .get();

      const totalMembers = membersQuery.size;
      const members = membersQuery.docs.map(doc => doc.data());

      // Obtenir le nombre d'événements
      const eventsQuery = await collections.events
        .where('organizationId', '==', organizationId)
        .get();

      const totalEvents = eventsQuery.size;

      // Obtenir les invitations en attente
      const pendingInvitationsQuery = await collections.organization_invitations
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
      const memberQuery = await collections.organization_members
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
      const invitationQuery = await collections.organization_invitations
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

      const membersQuery = await collections.organization_members
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
    role: UserRole;
    isFirstUser: boolean;
    organizationId?: string;
  }> {
    try {
      // Chercher si l'organisation existe déjà
      const orgQuery = await collections.organizations
        .where('name', '==', organization)
        .limit(1)
        .get();

      if (orgQuery.empty) {
        // Première organisation avec ce nom - l'utilisateur sera admin
        return {
          role: UserRole.ADMIN,
          isFirstUser: true
        };
      } else {
        // Organisation existe - l'utilisateur sera participant par défaut
        const orgDoc = orgQuery.docs[0];
        return {
          role: UserRole.PARTICIPANT,
          isFirstUser: false,
          organizationId: orgDoc.id
        };
      }
    } catch (error) {
      console.error('Error determining user role:', error);
      // Par défaut, considérer comme premier utilisateur
      return {
        role: UserRole.ADMIN,
        isFirstUser: true
      };
    }
  }

  /**
   * Incrémenter le compteur d'utilisateurs
   */
  async incrementUserCount(organizationId: string): Promise<void> {
    try {
      const orgRef = collections.organizations.doc(organizationId);
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

  /**
   * Obtenir les templates de secteur
   */
  async getSectorTemplates(): Promise<any> {
    try {
      // Retourner les templates de secteur depuis les types partagés
      return SECTOR_TEMPLATES;
    } catch (error) {
      console.error('Erreur lors de la récupération des templates de secteur:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir un template spécifique par secteur
   */
  async getSectorTemplate(sector: string): Promise<any> {
    try {
      console.log('🔍 Recherche template pour secteur:', sector);
      console.log('🔍 Secteurs disponibles:', Object.keys(SECTOR_TEMPLATES));
      
      const template = SECTOR_TEMPLATES[sector as keyof typeof SECTOR_TEMPLATES];
      if (!template) {
        console.warn(`⚠️ Template non trouvé pour le secteur: ${sector}`);
        // Retourner le template "OTHER" par défaut
        return SECTOR_TEMPLATES.other;
      }
      return template;
    } catch (error) {
      console.error(`Erreur lors de la récupération du template pour ${sector}:`, error);
      // En cas d'erreur, retourner le template par défaut
      return SECTOR_TEMPLATES.other;
    }
  }

  /**
   * Compléter la configuration d'une organisation lors de la première connexion
   */
  async completeOrganizationSetup(
    organizationId: string,
    request: CreateOrganizationRequest,
    userId: string
  ): Promise<Organization> {
    try {
      // Récupérer l'organisation
      const orgDoc = await collections.organizations.doc(organizationId).get();
      if (!orgDoc.exists) {
        throw new ValidationError('Organisation non trouvée');
      }

      const organization = OrganizationModel.fromFirestore(orgDoc);

      // Vérifier que l'utilisateur est propriétaire
      const member = await this.getMember(organizationId, userId);
      if (!member || member.role !== OrganizationRole.OWNER) {
        throw new ValidationError('Seul le propriétaire peut compléter la configuration');
      }

      // Vérifier que l'organisation a besoin d'être configurée
      if (!organization.needsSetup()) {
        throw new ValidationError('L\'organisation est déjà configurée');
      }

      // Compléter la configuration
      await organization.completeSetup(request);

      // Sauvegarder les modifications
      await collections.organizations.doc(organizationId).update(organization.toFirestore());

      return organization.toFirestore();
    } catch (error) {
      console.error('Erreur lors de la finalisation de l\'organisation:', error);
      throw error;
    }
  }

  private generateId(): string {
    return db.collection('temp').doc().id;
  }
}

export const organizationService = new OrganizationService();