/**
 * Service pour la gestion des équipes
 */

/**
 * Service pour la gestion des équipes
 */
import type {
  Team,
  CreateTeamRequest,
  UpdateTeamRequest,
  TeamStats,
  TeamMember} from '@attendance-x/shared';
import { apiService } from './apiService';

export interface TeamFilters {
  department?: string;
  managerId?: string;
  isActive?: boolean;
  search?: string;
}

export interface TeamMemberFilters {
  teamId?: string;
  userId?: string;
  role?: string;
  isActive?: boolean;
}

class TeamService {
  private readonly basePath = '/api/organizations';

  /**
   * Créer une nouvelle équipe
   */
  async createTeam(organizationId: string, data: CreateTeamRequest) {
    return apiService.post<Team>(`${this.basePath}/${organizationId}/teams`, data);
  }

  /**
   * Obtenir toutes les équipes d'une organisation
   */
  async getTeams(organizationId: string, filters?: TeamFilters) {
    return apiService.get<{
      data: Team[];
      total: number;
      page: number;
      limit: number;
    }>(`${this.basePath}/${organizationId}/teams`, { params: filters });
  }

  /**
   * Obtenir une équipe par ID
   */
  async getTeamById(organizationId: string, teamId: string) {
    return apiService.get<Team>(`${this.basePath}/${organizationId}/teams/${teamId}`);
  }

  /**
   * Mettre à jour une équipe
   */
  async updateTeam(organizationId: string, teamId: string, data: UpdateTeamRequest) {
    return apiService.put<Team>(`${this.basePath}/${organizationId}/teams/${teamId}`, data);
  }

  /**
   * Supprimer une équipe
   */
  async deleteTeam(organizationId: string, teamId: string) {
    return apiService.delete(`${this.basePath}/${organizationId}/teams/${teamId}`);
  }

  /**
   * Obtenir les statistiques d'une équipe
   */
  async getTeamStats(organizationId: string, teamId: string) {
    return apiService.get<TeamStats>(`${this.basePath}/${organizationId}/teams/${teamId}/stats`);
  }

  /**
   * Ajouter un membre à une équipe
   */
  async addTeamMember(organizationId: string, teamId: string, userId: string, role: string = 'member') {
    return apiService.post<TeamMember>(`${this.basePath}/${organizationId}/teams/${teamId}/members`, {
      userId,
      role
    });
  }

  /**
   * Supprimer un membre d'une équipe
   */
  async removeTeamMember(organizationId: string, teamId: string, userId: string) {
    return apiService.delete(`${this.basePath}/${organizationId}/teams/${teamId}/members/${userId}`);
  }

  /**
   * Obtenir les membres d'une équipe
   */
  async getTeamMembers(organizationId: string, teamId: string, filters?: TeamMemberFilters) {
    return apiService.get<{
      data: TeamMember[];
      total: number;
    }>(`${this.basePath}/${organizationId}/teams/${teamId}/members`, { params: filters });
  }

  /**
   * Mettre à jour le rôle d'un membre dans une équipe
   */
  async updateTeamMemberRole(organizationId: string, teamId: string, userId: string, role: string) {
    return apiService.put<TeamMember>(`${this.basePath}/${organizationId}/teams/${teamId}/members/${userId}`, {
      role
    });
  }

  /**
   * Obtenir les équipes d'un utilisateur
   */
  async getUserTeams(organizationId: string, userId: string) {
    return apiService.get<Team[]>(`${this.basePath}/${organizationId}/users/${userId}/teams`);
  }

  /**
   * Affecter un utilisateur à plusieurs équipes
   */
  async assignUserToTeams(organizationId: string, userId: string, teamIds: string[], role: string = 'member') {
    return apiService.post(`${this.basePath}/${organizationId}/users/${userId}/teams/bulk-assign`, {
      teamIds,
      role
    });
  }

  /**
   * Retirer un utilisateur de plusieurs équipes
   */
  async removeUserFromTeams(organizationId: string, userId: string, teamIds: string[]) {
    return apiService.post(`${this.basePath}/${organizationId}/users/${userId}/teams/bulk-remove`, {
      teamIds
    });
  }

  /**
   * Calculer les permissions effectives d'un utilisateur
   */
  async calculateUserPermissions(organizationId: string, userId: string) {
    return apiService.get<{
      systemPermissions: string[];
      organizationPermissions: string[];
      teamPermissions: Record<string, string[]>;
      effectivePermissions: string[];
    }>(`${this.basePath}/${organizationId}/users/${userId}/permissions`);
  }

  /**
   * Vérifier si un utilisateur peut valider les présences
   */
  async canValidateAttendance(organizationId: string, userId: string, eventId?: string) {
    return apiService.get<{
      canValidate: boolean;
      reason?: string;
      allowedEvents?: string[];
      maxValidationsPerSession?: number;
    }>(`${this.basePath}/${organizationId}/users/${userId}/can-validate-attendance`, {
      params: { eventId }
    });
  }

  /**
   * Import en masse des affectations d'équipes
   */
  async bulkAssignTeams(organizationId: string, assignments: Array<{
    userId: string;
    teamIds: string[];
    role?: string;
  }>) {
    return apiService.post<{
      successful: number;
      failed: number;
      errors: Array<{
        userId: string;
        error: string;
      }>;
    }>(`${this.basePath}/${organizationId}/teams/bulk-assign`, {
      assignments
    });
  }

  /**
   * Créer des équipes par défaut selon le secteur
   */
  async createDefaultTeams(organizationId: string, sector: string) {
    return apiService.post<Team[]>(`${this.basePath}/${organizationId}/teams/create-defaults`, {
      sector
    });
  }

  /**
   * Obtenir les templates d'équipes par secteur
   */
  async getTeamTemplates(sector: string) {
    return apiService.get<Array<{
      name: string;
      description: string;
      department: string;
      defaultSettings: any;
    }>>(`/api/team-templates/${sector}`);
  }
}

export const teamService = new TeamService();