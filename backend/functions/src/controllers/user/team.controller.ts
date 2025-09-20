/**
 * Contrôleur pour la gestion des équipes
 */
import { Response } from 'express';
import { logger } from 'firebase-functions';
import { teamService } from '../../services';
import { TeamFilters, TeamMemberFilters } from '../../services/utility/team.service';
import { CreateTeamRequest, OrganizationSector, TeamRole, UpdateTeamRequest } from '../../common/types';
import { AuthenticatedRequest } from '../../types/middleware.types';


export class TeamController {
  /**
   * Créer une nouvelle équipe
   */
  async createTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const teamData: CreateTeamRequest = req.body;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'organisation requis'
        });
        return;
      }

      const team = await teamService.createTeam(organizationId, teamData);

      res.status(201).json({
        success: true,
        data: team
      });
    } catch (error) {
      logger.error('Erreur lors de la création de l\'équipe:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Obtenir toutes les équipes d'une organisation
   */
  async getTeams(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const filters: TeamFilters = {
        department: req.query.department as string,
        managerId: req.query.managerId as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
      };

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'organisation requis'
        });
        return;
      }

      const result = await teamService.getTeams(organizationId, filters);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des équipes:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Obtenir une équipe par ID
   */
  async getTeamById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId, teamId } = req.params;

      if (!organizationId || !teamId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'organisation et d\'équipe requis'
        });
        return;
      }

      const team = await teamService.getTeamById(organizationId, teamId);

      res.json({
        success: true,
        data: team
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'équipe:', error);
      const statusCode = error instanceof Error && error.message.includes('non trouvée') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Mettre à jour une équipe
   */
  async updateTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId, teamId } = req.params;
      const updateData: UpdateTeamRequest = req.body;

      if (!organizationId || !teamId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'organisation et d\'équipe requis'
        });
        return;
      }

      const team = await teamService.updateTeam(organizationId, teamId, updateData);

      res.json({
        success: true,
        data: team
      });
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de l\'équipe:', error);
      const statusCode = error instanceof Error && error.message.includes('non trouvée') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Supprimer une équipe
   */
  async deleteTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId, teamId } = req.params;

      if (!organizationId || !teamId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'organisation et d\'équipe requis'
        });
        return;
      }

      await teamService.deleteTeam(organizationId, teamId);

      res.json({
        success: true,
        message: 'Équipe supprimée avec succès'
      });
    } catch (error) {
      logger.error('Erreur lors de la suppression de l\'équipe:', error);
      const statusCode = error instanceof Error && error.message.includes('non trouvée') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Obtenir les statistiques d'une équipe
   */
  async getTeamStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId, teamId } = req.params;

      if (!organizationId || !teamId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'organisation et d\'équipe requis'
        });
        return;
      }

      const stats = await teamService.getTeamStats(organizationId, teamId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques de l\'équipe:', error);
      const statusCode = error instanceof Error && error.message.includes('non trouvée') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Ajouter un membre à une équipe
   */
  async addTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId, teamId } = req.params;
      const { userId, role = 'member' } = req.body;

      if (!organizationId || !teamId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'organisation et d\'équipe requis'
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'utilisateur requis'
        });
        return;
      }

      const member = await teamService.addTeamMember(organizationId, teamId, userId, role as TeamRole);

      res.status(201).json({
        success: true,
        data: member
      });
    } catch (error) {
      logger.error('Erreur lors de l\'ajout du membre à l\'équipe:', error);
      const statusCode = error instanceof Error && 
        (error.message.includes('non trouvée') || error.message.includes('non trouvé')) ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Supprimer un membre d'une équipe
   */
  async removeTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId, teamId, userId } = req.params;

      if (!organizationId || !teamId || !userId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'organisation, d\'équipe et d\'utilisateur requis'
        });
        return;
      }

      await teamService.removeTeamMember(organizationId, teamId, userId);

      res.json({
        success: true,
        message: 'Membre supprimé de l\'équipe avec succès'
      });
    } catch (error) {
      logger.error('Erreur lors de la suppression du membre de l\'équipe:', error);
      const statusCode = error instanceof Error && 
        (error.message.includes('non trouvée') || error.message.includes('non trouvé')) ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Obtenir les membres d'une équipe
   */
  async getTeamMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId, teamId } = req.params;
      const filters: TeamMemberFilters = {
        userId: req.query.userId as string,
        role: req.query.role as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined
      };

      if (!organizationId || !teamId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'organisation et d\'équipe requis'
        });
        return;
      }

      const result = await teamService.getTeamMembers(organizationId, teamId, filters);

      res.json({
        success: true,
        data: result.data,
        total: result.total
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des membres de l\'équipe:', error);
      const statusCode = error instanceof Error && error.message.includes('non trouvée') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Mettre à jour le rôle d'un membre dans une équipe
   */
  async updateTeamMemberRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId, teamId, userId } = req.params;
      const { role } = req.body;

      if (!organizationId || !teamId || !userId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'organisation, d\'équipe et d\'utilisateur requis'
        });
        return;
      }

      if (!role) {
        res.status(400).json({
          success: false,
          error: 'Rôle requis'
        });
        return;
      }

      const member = await teamService.updateTeamMemberRole(organizationId, teamId, userId, role as TeamRole);

      res.json({
        success: true,
        data: member
      });
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du rôle du membre:', error);
      const statusCode = error instanceof Error && 
        (error.message.includes('non trouvée') || error.message.includes('non trouvé')) ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Obtenir les équipes d'un utilisateur
   */
  async getUserTeams(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId, userId } = req.params;

      if (!organizationId || !userId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'organisation et d\'utilisateur requis'
        });
        return;
      }

      const teams = await teamService.getUserTeams(organizationId, userId);

      res.json({
        success: true,
        data: teams
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des équipes de l\'utilisateur:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Affecter un utilisateur à plusieurs équipes
   */
  async assignUserToTeams(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId, userId } = req.params;
      const { teamIds, role = 'member' } = req.body;

      if (!organizationId || !userId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'organisation et d\'utilisateur requis'
        });
        return;
      }

      if (!teamIds || !Array.isArray(teamIds)) {
        res.status(400).json({
          success: false,
          error: 'Liste des IDs d\'équipes requise'
        });
        return;
      }

      await teamService.assignUserToTeams(organizationId, userId, teamIds, role as TeamRole);

      res.json({
        success: true,
        message: 'Utilisateur affecté aux équipes avec succès'
      });
    } catch (error) {
      logger.error('Erreur lors de l\'affectation de l\'utilisateur aux équipes:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Retirer un utilisateur de plusieurs équipes
   */
  async removeUserFromTeams(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId, userId } = req.params;
      const { teamIds } = req.body;

      if (!organizationId || !userId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'organisation et d\'utilisateur requis'
        });
        return;
      }

      if (!teamIds || !Array.isArray(teamIds)) {
        res.status(400).json({
          success: false,
          error: 'Liste des IDs d\'équipes requise'
        });
        return;
      }

      await teamService.removeUserFromTeams(organizationId, userId, teamIds);

      res.json({
        success: true,
        message: 'Utilisateur retiré des équipes avec succès'
      });
    } catch (error) {
      logger.error('Erreur lors du retrait de l\'utilisateur des équipes:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Affectation en masse d'équipes
   */
  async bulkAssignTeams(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { assignments } = req.body;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'organisation requis'
        });
        return;
      }

      if (!assignments || !Array.isArray(assignments)) {
        res.status(400).json({
          success: false,
          error: 'Liste des affectations requise'
        });
        return;
      }

      const result = await teamService.bulkAssignTeams(organizationId, assignments);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Erreur lors de l\'affectation en masse:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Créer des équipes par défaut selon le secteur
   */
  async createDefaultTeams(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { sector } = req.body;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'ID d\'organisation requis'
        });
        return;
      }

      if (!sector || !Object.values(OrganizationSector).includes(sector)) {
        res.status(400).json({
          success: false,
          error: 'Secteur d\'organisation valide requis'
        });
        return;
      }

      const teams = await teamService.createDefaultTeams(organizationId, req.user.uid, sector);

      res.status(201).json({
        success: true,
        data: teams
      });
    } catch (error) {
      logger.error('Erreur lors de la création des équipes par défaut:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }

  /**
   * Obtenir les templates d'équipes par secteur
   */
  async getTeamTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sector } = req.params;

      if (!sector || !Object.values(OrganizationSector).includes(sector as OrganizationSector)) {
        res.status(400).json({
          success: false,
          error: 'Secteur d\'organisation valide requis'
        });
        return;
      }

      const templates = teamService.getTeamTemplatesBySector(sector as OrganizationSector);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des templates d\'équipes:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      });
    }
  }
}

export const teamController = new TeamController();