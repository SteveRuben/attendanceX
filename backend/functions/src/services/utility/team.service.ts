/**
 * Service pour la gestion des équipes
 */


import { collections, db } from '../../config';
import { TeamMemberModel, TeamModel } from '../../models/team.model';
import { CreateTeamRequest, OrganizationSector, Team, TeamMember, TeamRole, TeamStats, UpdateTeamRequest } from '../../shared';
import { organizationService } from '../organization';
import { userService } from './user.service';
import { logger } from 'firebase-functions';

export interface TeamFilters {
  department?: string;
  managerId?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TeamMemberFilters {
  teamId?: string;
  userId?: string;
  role?: string;
  isActive?: boolean;
}

class TeamService {

  /**
   * Créer une nouvelle équipe
   */
  async createTeam(organizationId: string, data: CreateTeamRequest): Promise<Team> {
    try {
      // Vérifier que l'organisation existe
      await organizationService.getOrganization(organizationId);

      // Vérifier que le manager existe (si spécifié)
      if (data.managerId) {
        await userService.getUserById(data.managerId);
      }

      // Créer le modèle d'équipe
      const teamModel = TeamModel.fromCreateRequest(organizationId, data);
      await teamModel.validate();

      // Sauvegarder en base
      const teamRef = await collections.teams.add(teamModel.toFirestore());
      const teamDoc = await teamRef.get();
      const team = TeamModel.fromFirestore(teamDoc).getData();

      // Ajouter automatiquement le manager comme membre de l'équipe
      if (data.managerId) {
        try {
          await this.addTeamMember(organizationId, team.id, data.managerId, TeamRole.MANAGER);
        } catch (error) {
          logger.warn(`Impossible d'ajouter le manager à l'équipe ${team.id}:`, error);
        }
      }

      logger.info(`Équipe créée: ${team.id} pour l'organisation ${organizationId}`);
      return team;
    } catch (error) {
      logger.error('Erreur lors de la création de l\'équipe:', error);
      throw error;
    }
  }

  /**
   * Obtenir toutes les équipes d'une organisation
   */
  async getTeams(organizationId: string, filters?: TeamFilters): Promise<{
    data: Team[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;

      let query = collections.teams.where('organizationId', '==', organizationId);

      if (filters?.department) {
        query = query.where('department', '==', filters.department);
      }

      if (filters?.managerId) {
        query = query.where('managerId', '==', filters.managerId);
      }

      if (filters?.isActive !== undefined) {
        query = query.where('isActive', '==', filters.isActive);
      }

      const snapshot = await query.get();
      let teams = snapshot.docs.map(doc => TeamModel.fromFirestore(doc).getData());

      // Filtrage par recherche textuelle (côté client car Firestore ne supporte pas la recherche full-text)
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        teams = teams.filter(team => 
          team.name.toLowerCase().includes(searchTerm) ||
          (team.description && team.description.toLowerCase().includes(searchTerm)) ||
          (team.department && team.department.toLowerCase().includes(searchTerm))
        );
      }

      // Pagination côté application
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = teams.slice(startIndex, endIndex);

      return {
        data: paginatedData,
        total: teams.length,
        page,
        limit
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération des équipes:', error);
      throw error;
    }
  }

  /**
   * Obtenir une équipe par ID
   */
  async getTeamById(organizationId: string, teamId: string): Promise<Team> {
    try {
      const teamDoc = await collections.teams.doc(teamId).get();
      
      if (!teamDoc.exists) {
        throw new Error('Équipe non trouvée');
      }

      const team = TeamModel.fromFirestore(teamDoc).getData();

      if (team.organizationId !== organizationId) {
        throw new Error('Équipe non trouvée dans cette organisation');
      }

      return team;
    } catch (error) {
      logger.error(`Erreur lors de la récupération de l'équipe ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Mettre à jour une équipe
   */
  async updateTeam(organizationId: string, teamId: string, data: UpdateTeamRequest): Promise<Team> {
    try {
      // Vérifier que l'équipe appartient à l'organisation
      const existingTeam = await this.getTeamById(organizationId, teamId);

      // Vérifier que le nouveau manager existe (si spécifié)
      if (data.managerId) {
        await userService.getUserById(data.managerId);
      }

      // Créer le modèle et appliquer les mises à jour
      const teamModel = new TeamModel(existingTeam);
      await teamModel.updateTeam(data);

      // Sauvegarder en base
      await collections.teams.doc(teamId).update(teamModel.toFirestore());

      // Récupérer l'équipe mise à jour
      const updatedTeamDoc = await collections.teams.doc(teamId).get();
      const updatedTeam = TeamModel.fromFirestore(updatedTeamDoc).getData();
      
      logger.info(`Équipe mise à jour: ${teamId}`);
      return updatedTeam;
    } catch (error) {
      logger.error(`Erreur lors de la mise à jour de l'équipe ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer une équipe
   */
  async deleteTeam(organizationId: string, teamId: string): Promise<void> {
    try {
      // Vérifier que l'équipe appartient à l'organisation
      const existingTeam = await this.getTeamById(organizationId, teamId);

      // Créer le modèle et supprimer
      const teamModel = new TeamModel(existingTeam);
      await teamModel.deleteTeam();

      // Sauvegarder en base
      await collections.teams.doc(teamId).update(teamModel.toFirestore());

      // Désactiver tous les membres de l'équipe
      const membersSnapshot = await collections.teams
        .where('teamId', '==', teamId)
        .get();

      const batch = db.batch();
      membersSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isActive: false, updatedAt: new Date() });
      });
      await batch.commit();

      logger.info(`Équipe supprimée: ${teamId}`);
    } catch (error) {
      logger.error(`Erreur lors de la suppression de l'équipe ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques d'une équipe
   */
  async getTeamStats(organizationId: string, teamId: string): Promise<TeamStats> {
    try {
      // Vérifier que l'équipe appartient à l'organisation
      await this.getTeamById(organizationId, teamId);

      // Compter les membres de l'équipe
      const membersSnapshot = await collections.team_members
        .where('teamId', '==', teamId)
        .get();

      const activeMembersSnapshot = await collections.team_members
        .where('teamId', '==', teamId)
        .where('isActive', '==', true)
        .get();

      // Calculer les statistiques de présence (exemple basique)
      const memberCount = membersSnapshot.size;
      const activeMembers = activeMembersSnapshot.size;

      return {
        memberCount,
        activeMembers,
        eventsCreated: 0, // À implémenter selon la logique métier
        attendanceValidations: 0, // À implémenter
        lastActivity: new Date()
      };
    } catch (error) {
      logger.error(`Erreur lors de la récupération des statistiques de l'équipe ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Ajouter un membre à une équipe
   */
  async addTeamMember(organizationId: string, teamId: string, userId: string, role: TeamRole = TeamRole.MEMBER): Promise<TeamMember> {
    try {
      // Vérifier que l'équipe appartient à l'organisation
      await this.getTeamById(organizationId, teamId);

      // Vérifier que l'utilisateur existe
      await userService.getUserById(userId);

      // Vérifier si le membre existe déjà
      const existingMember = await collections.team_members
        .where('teamId', '==', teamId)
        .where('userId', '==', userId)
        .get();

      if (!existingMember.empty) {
        throw new Error('L\'utilisateur est déjà membre de cette équipe');
      }

      // Créer le membre
      const memberModel = TeamMemberModel.fromData(teamId, userId, role);
      await memberModel.validate();

      // Sauvegarder en base
      const memberRef = await collections.team_members.add(memberModel.toFirestore());
      const memberDoc = await memberRef.get();
      const member = TeamMemberModel.fromFirestore(memberDoc).getData();
      
      logger.info(`Membre ajouté à l'équipe: ${userId} -> ${teamId}`);
      return member;
    } catch (error) {
      logger.error(`Erreur lors de l'ajout du membre ${userId} à l'équipe ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer un membre d'une équipe
   */
  async removeTeamMember(organizationId: string, teamId: string, userId: string): Promise<void> {
    try {
      // Vérifier que l'équipe appartient à l'organisation
      await this.getTeamById(organizationId, teamId);

      const memberSnapshot = await collections.team_members
        .where('teamId', '==', teamId)
        .where('userId', '==', userId)
        .get();

      if (memberSnapshot.empty) {
        throw new Error('Membre non trouvé dans cette équipe');
      }

      // Supprimer le membre
      await memberSnapshot.docs[0].ref.delete();
      
      logger.info(`Membre supprimé de l'équipe: ${userId} <- ${teamId}`);
    } catch (error) {
      logger.error(`Erreur lors de la suppression du membre ${userId} de l'équipe ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Obtenir les membres d'une équipe
   */
  async getTeamMembers(organizationId: string, teamId: string, filters?: TeamMemberFilters): Promise<{
    data: TeamMember[];
    total: number;
  }> {
    try {
      // Vérifier que l'équipe appartient à l'organisation
      await this.getTeamById(organizationId, teamId);

      let query = collections.team_members.where('teamId', '==', teamId);

      if (filters?.userId) {
        query = query.where('userId', '==', filters.userId);
      }

      if (filters?.role) {
        query = query.where('role', '==', filters.role);
      }

      if (filters?.isActive !== undefined) {
        query = query.where('isActive', '==', filters.isActive);
      }

      const snapshot = await query.get();
      const members = snapshot.docs.map(doc => TeamMemberModel.fromFirestore(doc).getData());

      return {
        data: members,
        total: members.length
      };
    } catch (error) {
      logger.error(`Erreur lors de la récupération des membres de l'équipe ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Mettre à jour le rôle d'un membre dans une équipe
   */
  async updateTeamMemberRole(organizationId: string, teamId: string, userId: string, role: TeamRole): Promise<TeamMember> {
    try {
      // Vérifier que l'équipe appartient à l'organisation
      await this.getTeamById(organizationId, teamId);

      const memberSnapshot = await collections.team_members
        .where('teamId', '==', teamId)
        .where('userId', '==', userId)
        .get();

      if (memberSnapshot.empty) {
        throw new Error('Membre non trouvé dans cette équipe');
      }

      const memberDoc = memberSnapshot.docs[0];
      const existingMember = TeamMemberModel.fromFirestore(memberDoc);
      
      // Mettre à jour le rôle
      existingMember.updateRole(role);

      // Sauvegarder en base
      await memberDoc.ref.update(existingMember.toFirestore());

      // Récupérer le membre mis à jour
      const updatedMemberDoc = await memberDoc.ref.get();
      const updatedMember = TeamMemberModel.fromFirestore(updatedMemberDoc).getData();
      
      logger.info(`Rôle du membre mis à jour: ${userId} dans l'équipe ${teamId} -> ${role}`);
      return updatedMember;
    } catch (error) {
      logger.error(`Erreur lors de la mise à jour du rôle du membre ${userId} dans l'équipe ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Obtenir les équipes d'un utilisateur
   */
  async getUserTeams(organizationId: string, userId: string): Promise<Team[]> {
    try {
      // Récupérer les memberships de l'utilisateur
      const membershipSnapshot = await collections.team_members
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      const teamIds = membershipSnapshot.docs.map(doc => doc.data().teamId);

      if (teamIds.length === 0) {
        return [];
      }

      // Récupérer les détails des équipes
      const teams: Team[] = [];

      // Firestore limite les requêtes 'in' à 10 éléments
      const chunks = [];
      for (let i = 0; i < teamIds.length; i += 10) {
        chunks.push(teamIds.slice(i, i + 10));
      }

      for (const chunk of chunks) {
        const teamQuery = collections.teams
          .where('id', 'in', chunk)
          .where('organizationId', '==', organizationId);

        const teamSnapshot = await teamQuery.get();
        const chunkTeams = teamSnapshot.docs.map(doc => TeamModel.fromFirestore(doc).getData());
        teams.push(...chunkTeams);
      }

      return teams;
    } catch (error) {
      logger.error(`Erreur lors de la récupération des équipes de l'utilisateur ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Affecter un utilisateur à plusieurs équipes
   */
  async assignUserToTeams(organizationId: string, userId: string, teamIds: string[], role: TeamRole = TeamRole.MEMBER): Promise<void> {
    try {
      // Vérifier que l'utilisateur existe
      await userService.getUserById(userId);

      // Vérifier que toutes les équipes appartiennent à l'organisation
      for (const teamId of teamIds) {
        await this.getTeamById(organizationId, teamId);
      }

      // Affecter l'utilisateur aux équipes
      const batch = db.batch();

      for (const teamId of teamIds) {
        // Vérifier si le membre existe déjà
        const existingMember = await collections.team_members
          .where('teamId', '==', teamId)
          .where('userId', '==', userId)
          .get();

        if (existingMember.empty) {
          const memberModel = TeamMemberModel.fromData(teamId, userId, role);
          const memberRef = collections.team_members.doc();
          batch.set(memberRef, memberModel.toFirestore());
        }
      }

      await batch.commit();

      logger.info(`Utilisateur ${userId} affecté à ${teamIds.length} équipes`);
    } catch (error) {
      logger.error(`Erreur lors de l'affectation de l'utilisateur ${userId} aux équipes:`, error);
      throw error;
    }
  }

  /**
   * Retirer un utilisateur de plusieurs équipes
   */
  async removeUserFromTeams(organizationId: string, userId: string, teamIds: string[]): Promise<void> {
    try {
      for (const teamId of teamIds) {
        try {
          await this.removeTeamMember(organizationId, teamId, userId);
        } catch (error) {
          logger.warn(`Impossible de retirer l'utilisateur ${userId} de l'équipe ${teamId}:`, error);
        }
      }

      logger.info(`Utilisateur ${userId} retiré de ${teamIds.length} équipes`);
    } catch (error) {
      logger.error(`Erreur lors du retrait de l'utilisateur ${userId} des équipes:`, error);
      throw error;
    }
  }

  /**
   * Affectation en masse d'équipes
   */
  async bulkAssignTeams(organizationId: string, assignments: Array<{
    userId: string;
    teamIds: string[];
    role?: TeamRole;
  }>): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ userId: string; error: string }>;
  }> {
    try {
      // Vérifier que toutes les équipes appartiennent à l'organisation
      const allTeamIds = [...new Set(assignments.flatMap(a => a.teamIds))];
      for (const teamId of allTeamIds) {
        await this.getTeamById(organizationId, teamId);
      }

      const results = {
        successful: 0,
        failed: 0,
        errors: [] as Array<{ userId: string; error: string }>
      };

      const batch = db.batch();
      let operationCount = 0;

      for (const assignment of assignments) {
        try {
          for (const teamId of assignment.teamIds) {
            // Vérifier si le membre existe déjà
            const existingMember = await collections.team_members
              .where('teamId', '==', teamId)
              .where('userId', '==', assignment.userId)
              .get();

            if (existingMember.empty) {
              const memberModel = TeamMemberModel.fromData(
                teamId, 
                assignment.userId, 
                assignment.role || TeamRole.MEMBER
              );
              const memberRef = collections.team_members.doc();
              batch.set(memberRef, memberModel.toFirestore());
              operationCount++;

              // Firestore limite les opérations batch à 500
              if (operationCount >= 500) {
                await batch.commit();
                operationCount = 0;
              }
            }
          }
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            userId: assignment.userId,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      }

      if (operationCount > 0) {
        await batch.commit();
      }
      
      logger.info(`Affectation en masse terminée: ${results.successful} succès, ${results.failed} échecs`);
      return results;
    } catch (error) {
      logger.error('Erreur lors de l\'affectation en masse:', error);
      throw error;
    }
  }

  /**
   * Créer des équipes par défaut selon le secteur
   */
  async createDefaultTeams(organizationId: string, userId:string, sector: OrganizationSector): Promise<Team[]> {
    try {
      const templates = this.getTeamTemplatesBySector(sector);
      const createdTeams: Team[] = [];

      for (const template of templates) {
        try {
          const team = await this.createTeam(organizationId, {
            name: template.name,
            description: template.description,
            department: template.department,
            settings: template.defaultSettings,
            managerId:userId
          });
          createdTeams.push(team);
        } catch (error) {
          logger.warn(`Impossible de créer l'équipe par défaut ${template.name}:`, error);
        }
      }

      logger.info(`${createdTeams.length} équipes par défaut créées pour l'organisation ${organizationId}`);
      return createdTeams;
    } catch (error) {
      logger.error('Erreur lors de la création des équipes par défaut:', error);
      throw error;
    }
  }

  /**
   * Obtenir les templates d'équipes par secteur
   */
  getTeamTemplatesBySector(sector: OrganizationSector): Array<{
    name: string;
    description: string;
    department: string;
    defaultSettings: any;
  }> {
    const templates: Record<OrganizationSector, Array<{
      name: string;
      description: string;
      department: string;
      defaultSettings: any;
    }>> = {
      [OrganizationSector.EDUCATION]: [
        {
          name: 'Administration',
          description: 'Équipe administrative',
          department: 'Administration',
          defaultSettings: {
            canValidateAttendance: true,
            canCreateEvents: true,
            canInviteParticipants: true,
            canViewAllEvents: true,
            canExportData: true
          }
        },
        {
          name: 'Enseignants',
          description: 'Corps enseignant',
          department: 'Pédagogie',
          defaultSettings: {
            canValidateAttendance: false,
            canCreateEvents: true,
            canInviteParticipants: true,
            canViewAllEvents: false,
            canExportData: false
          }
        },
        {
          name: 'Support Technique',
          description: 'Support informatique',
          department: 'IT',
          defaultSettings: {
            canValidateAttendance: false,
            canCreateEvents: false,
            canInviteParticipants: false,
            canViewAllEvents: false,
            canExportData: false
          }
        }
      ],
      [OrganizationSector.HEALTHCARE]: [
        {
          name: 'Médecins',
          description: 'Personnel médical',
          department: 'Médical',
          defaultSettings: {
            canValidateAttendance: true,
            canCreateEvents: true,
            canInviteParticipants: true,
            canViewAllEvents: true,
            canExportData: true
          }
        },
        {
          name: 'Infirmiers',
          description: 'Personnel infirmier',
          department: 'Soins',
          defaultSettings: {
            canValidateAttendance: false,
            canCreateEvents: false,
            canInviteParticipants: true,
            canViewAllEvents: false,
            canExportData: false
          }
        },
        {
          name: 'Administration',
          description: 'Administration hospitalière',
          department: 'Administration',
          defaultSettings: {
            canValidateAttendance: true,
            canCreateEvents: true,
            canInviteParticipants: true,
            canViewAllEvents: true,
            canExportData: true
          }
        }
      ],
      [OrganizationSector.CORPORATE]: [
        {
          name: 'Direction',
          description: 'Équipe de direction',
          department: 'Management',
          defaultSettings: {
            canValidateAttendance: true,
            canCreateEvents: true,
            canInviteParticipants: true,
            canViewAllEvents: true,
            canExportData: true
          }
        },
        {
          name: 'Ressources Humaines',
          description: 'Gestion RH',
          department: 'RH',
          defaultSettings: {
            canValidateAttendance: true,
            canCreateEvents: true,
            canInviteParticipants: true,
            canViewAllEvents: true,
            canExportData: true
          }
        },
        {
          name: 'IT',
          description: 'Équipe informatique',
          department: 'Technique',
          defaultSettings: {
            canValidateAttendance: false,
            canCreateEvents: false,
            canInviteParticipants: false,
            canViewAllEvents: false,
            canExportData: false
          }
        },
        {
          name: 'Commercial',
          description: 'Équipe commerciale',
          department: 'Ventes',
          defaultSettings: {
            canValidateAttendance: false,
            canCreateEvents: true,
            canInviteParticipants: true,
            canViewAllEvents: false,
            canExportData: false
          }
        }
      ],
      // Ajouter les autres secteurs avec des templates par défaut
      [OrganizationSector.GOVERNMENT]: [
        {
          name: 'Administration',
          description: 'Administration publique',
          department: 'Administration',
          defaultSettings: {
            canValidateAttendance: true,
            canCreateEvents: true,
            canInviteParticipants: true,
            canViewAllEvents: true,
            canExportData: true
          }
        }
      ],
      [OrganizationSector.NON_PROFIT]: [
        {
          name: 'Direction',
          description: 'Équipe dirigeante',
          department: 'Management',
          defaultSettings: {
            canValidateAttendance: true,
            canCreateEvents: true,
            canInviteParticipants: true,
            canViewAllEvents: true,
            canExportData: true
          }
        }
      ],
      // Valeurs par défaut pour les autres secteurs
      [OrganizationSector.OTHER]: [
        {
          name: 'Équipe Principale',
          description: 'Équipe principale',
          department: 'Général',
          defaultSettings: {
            canValidateAttendance: true,
            canCreateEvents: true,
            canInviteParticipants: true,
            canViewAllEvents: true,
            canExportData: true
          }
        }
      ],
      [OrganizationSector.TECHNOLOGY]: [],
      [OrganizationSector.FINANCE]: [],
      [OrganizationSector.RETAIL]: [],
      [OrganizationSector.MANUFACTURING]: [],
      [OrganizationSector.HOSPITALITY]: [],
      [OrganizationSector.CONSULTING]: [],
      [OrganizationSector.SERVICES]: [],
      [OrganizationSector.ASSOCIATION]: []
    };

    return templates[sector] || templates[OrganizationSector.OTHER];
  }
}

export const teamService = new TeamService();