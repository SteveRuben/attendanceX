/**
 * Service pour la gestion des projets
 */

import { ProjectModel } from '../../models/project.model';
import {
  ProjectInput,
  ProjectStatus,
  ProjectFilters,
  PaginatedResponse,
  ProjectStats,
  ProfitabilityReport
} from '../../common/types';
import { ValidationError } from '../../models/base.model';
import { collections } from '../../config/database';

export class ProjectService {
  private projectsCollection = collections.projects;
  private timeEntriesCollection = collections.time_entries;

  // ==================== CRUD Operations ====================

  /**
   * Créer un nouveau projet
   */
  async createProject(
    tenantId: string,
    projectData: ProjectInput,
    createdBy: string
  ): Promise<ProjectModel> {
    try {
      // Vérifier l'unicité du code projet dans l'organisation
      await this.validateUniqueProjectCode(tenantId, projectData.code);

      const projectModelData = {
        ...projectData,
        tenantId,
        createdBy,
        settings: projectData.settings ? {
          requireActivityCode: projectData.settings.requireActivityCode || false,
          allowOvertime: projectData.settings.allowOvertime !== undefined ? projectData.settings.allowOvertime : true,
          autoApprove: projectData.settings.autoApprove || false
        } : undefined
      };

      const project = new ProjectModel(projectModelData);

      await project.validate();

      const docRef = await this.projectsCollection.add(project.toFirestore());
      project.update({ id: docRef.id });

      return project;
    } catch (error) {
      throw new Error(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir un projet par ID
   */
  async getProjectById(projectId: string): Promise<ProjectModel | null> {
    try {
      const doc = await this.projectsCollection.doc(projectId).get();
      return ProjectModel.fromFirestore(doc);
    } catch (error) {
      throw new Error(`Failed to get project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir un projet par code
   */
  async getProjectByCode(tenantId: string, code: string): Promise<ProjectModel | null> {
    try {
      const query = await this.projectsCollection
        .where('tenantId', '==', tenantId)
        .where('code', '==', code.toUpperCase())
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      return ProjectModel.fromFirestore(query.docs[0]);
    } catch (error) {
      throw new Error(`Failed to get project by code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lister les projets avec filtres et pagination
   */
  async listProjects(
    tenantId: string,
    filters?: ProjectFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<ProjectModel>> {
    try {
      let query = this.projectsCollection
        .where('tenantId', '==', tenantId);

      // Appliquer les filtres
      if (filters?.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters?.clientId) {
        query = query.where('clientId', '==', filters.clientId);
      }

      if (filters?.billable !== undefined) {
        query = query.where('billable', '==', filters.billable);
      }

      // Pagination
      const offset = (page - 1) * limit;
      query = query.orderBy('name', 'asc').offset(offset).limit(limit);

      const snapshot = await query.get();
      const projects = snapshot.docs
        .map(doc => ProjectModel.fromFirestore(doc))
        .filter(project => project !== null) as ProjectModel[];

      // Filtrer par employé assigné si spécifié (ne peut pas être fait dans la requête Firestore)
      let filteredProjects = projects;
      if (filters?.assignedEmployeeId) {
        filteredProjects = projects.filter(project =>
          project.isEmployeeAssigned(filters.assignedEmployeeId!)
        );
      }

      // Compter le total pour la pagination
      let countQuery = this.projectsCollection
        .where('tenantId', '==', tenantId);

      if (filters?.status) {
        countQuery = countQuery.where('status', '==', filters.status);
      }

      const countSnapshot = await countQuery.get();
      const total = countSnapshot.size;

      return {
        data: filteredProjects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mettre à jour un projet
   */
  async updateProject(
    projectId: string,
    updates: Partial<ProjectInput>,
    updatedBy: string
  ): Promise<ProjectModel> {
    try {
      const project = await this.getProjectById(projectId);
      if (!project) {
        throw new ValidationError('Project not found');
      }

      // Vérifier l'unicité du code si il est modifié
      if (updates.code && updates.code !== project.code) {
        await this.validateUniqueProjectCode(project.tenantId, updates.code);
      }

      project.updateFromInput(updates);
      project.update({ updatedBy });
      await project.validate();

      await this.projectsCollection
        .doc(projectId)
        .update(project.toFirestore());

      return project;
    } catch (error) {
      throw new Error(`Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Archiver un projet
   */
  async archiveProject(projectId: string, archivedBy: string): Promise<ProjectModel> {
    try {
      const project = await this.getProjectById(projectId);
      if (!project) {
        throw new ValidationError('Project not found');
      }

      project.deactivate();
      project.update({ updatedBy: archivedBy });

      await this.projectsCollection
        .doc(projectId)
        .update(project.toFirestore());

      return project;
    } catch (error) {
      throw new Error(`Failed to archive project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Supprimer un projet (soft delete)
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      const project = await this.getProjectById(projectId);
      if (!project) {
        throw new ValidationError('Project not found');
      }

      // Vérifier qu'il n'y a pas d'entrées de temps associées
      const timeEntriesQuery = await this.timeEntriesCollection
        .where('projectId', '==', projectId)
        .limit(1)
        .get();

      if (!timeEntriesQuery.empty) {
        throw new ValidationError('Cannot delete project with existing time entries');
      }

      await this.projectsCollection.doc(projectId).delete();
    } catch (error) {
      throw new Error(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Gestion des assignations ====================

  /**
   * Assigner un employé à un projet
   */
  async assignEmployeeToProject(
    projectId: string,
    employeeId: string,
    assignedBy: string
  ): Promise<ProjectModel> {
    try {
      const project = await this.getProjectById(projectId);
      if (!project) {
        throw new ValidationError('Project not found');
      }

      project.assignEmployee(employeeId);
      project.update({ updatedBy: assignedBy });

      await this.projectsCollection
        .doc(projectId)
        .update(project.toFirestore());

      return project;
    } catch (error) {
      throw new Error(`Failed to assign employee to project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retirer un employé d'un projet
   */
  async removeEmployeeFromProject(
    projectId: string,
    employeeId: string,
    removedBy: string
  ): Promise<ProjectModel> {
    try {
      const project = await this.getProjectById(projectId);
      if (!project) {
        throw new ValidationError('Project not found');
      }

      project.removeEmployee(employeeId);
      project.update({ updatedBy: removedBy });

      await this.projectsCollection
        .doc(projectId)
        .update(project.toFirestore());

      return project;
    } catch (error) {
      throw new Error(`Failed to remove employee from project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les projets d'un employé
   */
  async getEmployeeProjects(
    employeeId: string,
    tenantId: string,
    activeOnly: boolean = true
  ): Promise<ProjectModel[]> {
    try {
      let query = this.projectsCollection
        .where('tenantId', '==', tenantId)
        .where('assignedEmployees', 'array-contains', employeeId);

      if (activeOnly) {
        query = query.where('status', '==', ProjectStatus.ACTIVE);
      }

      const snapshot = await query.get();
      return snapshot.docs
        .map(doc => ProjectModel.fromFirestore(doc))
        .filter(project => project !== null) as ProjectModel[];
    } catch (error) {
      throw new Error(`Failed to get employee projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assigner plusieurs employés à un projet
   */
  async assignMultipleEmployeesToProject(
    projectId: string,
    employeeIds: string[],
    assignedBy: string
  ): Promise<ProjectModel> {
    try {
      const project = await this.getProjectById(projectId);
      if (!project) {
        throw new ValidationError('Project not found');
      }

      project.assignMultipleEmployees(employeeIds);
      project.update({ updatedBy: assignedBy });

      await this.projectsCollection
        .doc(projectId)
        .update(project.toFirestore());

      return project;
    } catch (error) {
      throw new Error(`Failed to assign multiple employees to project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Validation d'accès ====================

  /**
   * Valider l'accès d'un employé à un projet
   */
  async validateEmployeeAccess(employeeId: string, projectId: string): Promise<boolean> {
    try {
      const project = await this.getProjectById(projectId);
      if (!project) {
        return false;
      }

      return project.isEmployeeAssigned(employeeId) && project.canAcceptTimeEntries;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtenir les projets accessibles pour un employé
   */
  async getAccessibleProjects(
    employeeId: string,
    tenantId: string
  ): Promise<ProjectModel[]> {
    try {
      const projects = await this.getEmployeeProjects(employeeId, tenantId, true);
      return projects.filter(project => project.canAcceptTimeEntries);
    } catch (error) {
      throw new Error(`Failed to get accessible projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Statistiques et analytics ====================

  /**
   * Obtenir les statistiques d'un projet
   */
  async getProjectTimeStatistics(
    projectId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ProjectStats> {
    try {
      let query = this.timeEntriesCollection
        .where('projectId', '==', projectId);

      if (startDate) {
        query = query.where('date', '>=', startDate);
      }

      if (endDate) {
        query = query.where('date', '<=', endDate);
      }

      const snapshot = await query.get();
      const timeEntries = snapshot.docs.map(doc => doc.data());

      let totalHours = 0;
      let totalCost = 0;
      let billableHours = 0;
      let nonBillableHours = 0;
      const employeeIds = new Set<string>();
      let totalRate = 0;
      let rateCount = 0;

      timeEntries.forEach(entry => {
        const hours = entry.duration / 60;
        totalHours += hours;
        employeeIds.add(entry.employeeId);

        if (entry.billable) {
          billableHours += hours;
          if (entry.totalCost) {
            totalCost += entry.totalCost;
          }
          if (entry.hourlyRate) {
            totalRate += entry.hourlyRate;
            rateCount++;
          }
        } else {
          nonBillableHours += hours;
        }
      });

      return {
        totalHours: Math.round(totalHours * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        billableHours: Math.round(billableHours * 100) / 100,
        nonBillableHours: Math.round(nonBillableHours * 100) / 100,
        employeeCount: employeeIds.size,
        averageHourlyRate: rateCount > 0 ? Math.round((totalRate / rateCount) * 100) / 100 : 0
      };
    } catch (error) {
      throw new Error(`Failed to get project statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculer la rentabilité d'un projet
   */
  async getProjectProfitability(
    projectId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ProfitabilityReport> {
    try {
      const project = await this.getProjectById(projectId);
      if (!project) {
        throw new ValidationError('Project not found');
      }

      const stats = await this.getProjectTimeStatistics(projectId, startDate, endDate);

      // Calculer le revenu (heures facturables * taux)
      const totalRevenue = stats.totalCost;

      // Calculer le coût (toutes les heures * taux moyen)
      const totalCost = stats.totalHours * stats.averageHourlyRate;

      // Calculer le profit et la marge
      const profit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      return {
        projectId,
        projectName: project.name,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
        hoursWorked: stats.totalHours,
        averageRate: stats.averageHourlyRate
      };
    } catch (error) {
      throw new Error(`Failed to get project profitability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir le top des projets par heures
   */
  async getTopProjectsByHours(
    tenantId: string,
    limit: number = 10,
    startDate?: string,
    endDate?: string
  ): Promise<Array<{
    project: ProjectModel;
    stats: ProjectStats;
  }>> {
    try {
      // Obtenir tous les projets actifs
      const projects = await this.listProjects(tenantId, { status: ProjectStatus.ACTIVE }, 1, 100);

      const projectStats: Array<{
        project: ProjectModel;
        stats: ProjectStats;
      }> = [];

      // Calculer les stats pour chaque projet
      for (const project of projects.data) {
        if (project.id) {
          const stats = await this.getProjectTimeStatistics(project.id, startDate, endDate);
          projectStats.push({ project, stats });
        }
      }

      // Trier par heures totales et limiter
      return projectStats
        .sort((a, b) => b.stats.totalHours - a.stats.totalHours)
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get top projects by hours: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Recherche et filtrage ====================

  /**
   * Rechercher des projets par terme
   */
  async searchProjects(
    tenantId: string,
    searchTerm: string,
    filters?: ProjectFilters,
    limit: number = 20
  ): Promise<ProjectModel[]> {
    try {
      // Obtenir tous les projets (Firestore ne supporte pas la recherche textuelle native)
      const allProjects = await this.listProjects(tenantId, filters, 1, 1000);

      // Filtrer par terme de recherche
      const filteredProjects = allProjects.data.filter(project =>
        project.matchesSearchTerm(searchTerm)
      );

      return filteredProjects.slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to search projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les projets par client
   */
  async getProjectsByClient(
    tenantId: string,
    clientId: string,
    activeOnly: boolean = true
  ): Promise<ProjectModel[]> {
    try {
      let query = this.projectsCollection
        .where('tenantId', '==', tenantId)
        .where('clientId', '==', clientId);

      if (activeOnly) {
        query = query.where('status', '==', ProjectStatus.ACTIVE);
      }

      const snapshot = await query.get();
      return snapshot.docs
        .map(doc => ProjectModel.fromFirestore(doc))
        .filter(project => project !== null) as ProjectModel[];
    } catch (error) {
      throw new Error(`Failed to get projects by client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Gestion du budget ====================

  /**
   * Mettre à jour le budget d'un projet
   */
  async updateProjectBudget(
    projectId: string,
    budget: number,
    updatedBy: string
  ): Promise<ProjectModel> {
    try {
      const project = await this.getProjectById(projectId);
      if (!project) {
        throw new ValidationError('Project not found');
      }

      project.setBudget(budget);
      project.update({ updatedBy });

      await this.projectsCollection
        .doc(projectId)
        .update(project.toFirestore());

      return project;
    } catch (error) {
      throw new Error(`Failed to update project budget: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir l'utilisation du budget d'un projet
   */
  async getProjectBudgetUtilization(projectId: string): Promise<{
    budget: number;
    spent: number;
    remaining: number;
    utilizationPercentage: number;
    isOverBudget: boolean;
  }> {
    try {
      const project = await this.getProjectById(projectId);
      if (!project) {
        throw new ValidationError('Project not found');
      }

      const stats = await this.getProjectTimeStatistics(projectId);
      const budget = project.budget || 0;
      const spent = stats.totalCost;
      const remaining = project.getRemainingBudget(spent);
      const utilizationPercentage = project.calculateBudgetUtilization(spent);
      const isOverBudget = project.isBudgetExceeded(spent);

      return {
        budget,
        spent: Math.round(spent * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
        isOverBudget
      };
    } catch (error) {
      throw new Error(`Failed to get project budget utilization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Méthodes utilitaires ====================

  /**
   * Valider l'unicité du code projet
   */
  private async validateUniqueProjectCode(tenantId: string, code: string): Promise<void> {
    const existingProject = await this.getProjectByCode(tenantId, code);
    if (existingProject) {
      throw new ValidationError(`Project code '${code}' already exists`);
    }
  }

  /**
   * Obtenir les projets avec des alertes budgétaires
   */
  async getProjectsWithBudgetAlerts(
    tenantId: string,
    threshold: number = 80
  ): Promise<Array<{
    project: ProjectModel;
    budgetUtilization: number;
    isOverBudget: boolean;
  }>> {
    try {
      const projects = await this.listProjects(tenantId, { status: ProjectStatus.ACTIVE }, 1, 100);
      const alerts: Array<{
        project: ProjectModel;
        budgetUtilization: number;
        isOverBudget: boolean;
      }> = [];

      for (const project of projects.data) {
        if (project.id && project.budget) {
          const budgetInfo = await this.getProjectBudgetUtilization(project.id);

          if (budgetInfo.utilizationPercentage >= threshold || budgetInfo.isOverBudget) {
            alerts.push({
              project,
              budgetUtilization: budgetInfo.utilizationPercentage,
              isOverBudget: budgetInfo.isOverBudget
            });
          }
        }
      }

      return alerts.sort((a, b) => b.budgetUtilization - a.budgetUtilization);
    } catch (error) {
      throw new Error(`Failed to get projects with budget alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir un résumé des projets pour un tenant
   */
  async getProjectsSummary(tenantId: string): Promise<{
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalBudget: number;
    totalSpent: number;
    averageBudgetUtilization: number;
  }> {
    try {
      const allProjects = await this.listProjects(tenantId, {}, 1, 1000);

      let totalBudget = 0;
      let totalSpent = 0;
      let budgetUtilizations: number[] = [];

      const activeProjects = allProjects.data.filter(p => p.status === ProjectStatus.ACTIVE).length;
      const completedProjects = allProjects.data.filter(p => p.status === ProjectStatus.COMPLETED).length;

      for (const project of allProjects.data) {
        if (project.id && project.budget) {
          totalBudget += project.budget;

          const budgetInfo = await this.getProjectBudgetUtilization(project.id);
          totalSpent += budgetInfo.spent;
          budgetUtilizations.push(budgetInfo.utilizationPercentage);
        }
      }

      const averageBudgetUtilization = budgetUtilizations.length > 0
        ? budgetUtilizations.reduce((sum, util) => sum + util, 0) / budgetUtilizations.length
        : 0;

      return {
        totalProjects: allProjects.data.length,
        activeProjects,
        completedProjects,
        totalBudget: Math.round(totalBudget * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        averageBudgetUtilization: Math.round(averageBudgetUtilization * 100) / 100
      };
    } catch (error) {
      throw new Error(`Failed to get projects summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}