/**
 * Service pour la gestion des projets
 */

import { ProjectModel } from '../../models/project.model';
import { ValidationError } from '../../models/base.model';
import { ProjectStatus, ProjectInput } from '../../common/types';
import { collections } from '../../config/database';

export interface CreateProjectData extends ProjectInput {
  tenantId: string;
  createdBy: string;
}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: ProjectStatus;
  clientId?: string;
  assignedEmployeeId?: string;
  billable?: boolean;
  searchTerm?: string;
  includeInactive?: boolean;
}

export interface ProjectSearchFilters {
  query?: string;
  status?: ProjectStatus;
  clientId?: string;
  billable?: boolean;
  hasActiveEmployees?: boolean;
  limit?: number;
}

export class ProjectService {
  private collection = collections.projects;

  /**
   * Créer un nouveau projet
   */
  async createProject(data: CreateProjectData): Promise<ProjectModel> {
    try {
      const project = new ProjectModel(data as any);
      await project.validate();

      const docRef = await this.collection.add(project.toFirestore());
      const savedDoc = await docRef.get();
      const savedProject = ProjectModel.fromFirestore(savedDoc);
      
      if (!savedProject) {
        throw new Error('Failed to create project');
      }

      return savedProject;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir un projet par ID
   */
  async getProjectById(id: string, tenantId: string): Promise<ProjectModel> {
    try {
      const doc = await this.collection.doc(id).get();
      const project = ProjectModel.fromFirestore(doc);

      if (!project || project.getData().tenantId !== tenantId) {
        throw new ValidationError('Project not found');
      }

      return project;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to get project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir la liste des projets
   */
  async getProjects(tenantId: string, filters: ProjectFilters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'asc',
        status,
        clientId,
        assignedEmployeeId,
        billable,
        searchTerm,
        includeInactive = false
      } = filters;

      let query = this.collection
        .where('tenantId', '==', tenantId);

      if (status) {
        query = query.where('status', '==', status);
      }

      if (clientId) {
        query = query.where('clientId', '==', clientId);
      }

      if (billable !== undefined) {
        query = query.where('billable', '==', billable);
      }

      if (!includeInactive) {
        query = query.where('isActive', '==', true);
      }

      query = query.orderBy(sortBy, sortOrder);

      const snapshot = await query.get();
      let projects = snapshot.docs
        .map(doc => ProjectModel.fromFirestore(doc))
        .filter(Boolean) as ProjectModel[];

      // Filtres additionnels en mémoire
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        projects = projects.filter(project => {
          const data = project.getData();
          return data.name.toLowerCase().includes(searchLower) ||
                 data.description?.toLowerCase().includes(searchLower) ||
                 data.code?.toLowerCase().includes(searchLower);
        });
      }

      if (assignedEmployeeId) {
        projects = projects.filter(project => {
          const data = project.getData();
          return data.assignedEmployees?.includes(assignedEmployeeId);
        });
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProjects = projects.slice(startIndex, endIndex);

      return {
        data: paginatedProjects,
        pagination: {
          page,
          limit,
          total: projects.length,
          totalPages: Math.ceil(projects.length / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mettre à jour un projet
   */
  async updateProject(id: string, tenantId: string, updates: Partial<any>, updatedBy: string): Promise<ProjectModel> {
    try {
      const project = await this.getProjectById(id, tenantId);
      
      project.update({ ...updates, updatedBy });
      await project.validate();

      await this.collection.doc(id).update(project.toFirestore());
      
      return await this.getProjectById(id, tenantId);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Supprimer un projet
   */
  async deleteProject(id: string, tenantId: string, deletedBy: string): Promise<void> {
    try {
      await this.getProjectById(id, tenantId);
      
      // Vérifier s'il y a des entrées de temps associées
      const timeEntriesQuery = await collections.time_entries
        .where('tenantId', '==', tenantId)
        .where('projectId', '==', id)
        .limit(1)
        .get();

      if (!timeEntriesQuery.empty) {
        throw new ValidationError('Cannot delete project with associated time entries');
      }

      await this.collection.doc(id).delete();
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Changer le statut d'un projet
   */
  async changeProjectStatus(id: string, tenantId: string, status: ProjectStatus, changedBy: string, reason?: string): Promise<ProjectModel> {
    try {
      const updates: any = {
        status,
        updatedBy: changedBy
      };

      if (reason) {
        updates.statusChangeReason = reason;
      }

      if (status === ProjectStatus.COMPLETED) {
        updates.completedAt = new Date();
      } else if (status === ProjectStatus.ON_HOLD) {
        updates.onHoldAt = new Date();
      }

      return await this.updateProject(id, tenantId, updates, changedBy);
    } catch (error) {
      throw new Error(`Failed to change project status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assigner des employés à un projet
   */
  async assignEmployees(id: string, tenantId: string, employeeIds: string[], assignedBy: string): Promise<ProjectModel> {
    try {
      const project = await this.getProjectById(id, tenantId);
      const currentEmployees = project.getData().assignedEmployees || [];
      
      const updatedEmployees = [...new Set([...currentEmployees, ...employeeIds])];
      
      return await this.updateProject(id, tenantId, {
        assignedEmployees: updatedEmployees
      }, assignedBy);
    } catch (error) {
      throw new Error(`Failed to assign employees: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retirer des employés d'un projet
   */
  async unassignEmployees(id: string, tenantId: string, employeeIds: string[], unassignedBy: string): Promise<ProjectModel> {
    try {
      const project = await this.getProjectById(id, tenantId);
      const currentEmployees = project.getData().assignedEmployees || [];
      
      const updatedEmployees = currentEmployees.filter(empId => !employeeIds.includes(empId));
      
      return await this.updateProject(id, tenantId, {
        assignedEmployees: updatedEmployees
      }, unassignedBy);
    } catch (error) {
      throw new Error(`Failed to unassign employees: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les employés assignés à un projet
   */
  async getProjectEmployees(id: string, tenantId: string): Promise<string[]> {
    try {
      const project = await this.getProjectById(id, tenantId);
      return project.getData().assignedEmployees || [];
    } catch (error) {
      throw new Error(`Failed to get project employees: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rechercher des projets
   */
  async searchProjects(tenantId: string, filters: ProjectSearchFilters = {}): Promise<ProjectModel[]> {
    try {
      const {
        query: searchQuery,
        status,
        clientId,
        billable,
        hasActiveEmployees,
        limit = 10
      } = filters;

      let query = this.collection
        .where('tenantId', '==', tenantId)
        .where('isActive', '==', true);

      if (status) {
        query = query.where('status', '==', status);
      }

      if (clientId) {
        query = query.where('clientId', '==', clientId);
      }

      if (billable !== undefined) {
        query = query.where('billable', '==', billable);
      }

      query = query.limit(limit);

      const snapshot = await query.get();
      let projects = snapshot.docs
        .map(doc => ProjectModel.fromFirestore(doc))
        .filter(Boolean) as ProjectModel[];

      // Filtres additionnels
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        projects = projects.filter(project => {
          const data = project.getData();
          return data.name.toLowerCase().includes(searchLower) ||
                 data.description?.toLowerCase().includes(searchLower) ||
                 data.code?.toLowerCase().includes(searchLower);
        });
      }

      if (hasActiveEmployees) {
        projects = projects.filter(project => {
          const data = project.getData();
          return data.assignedEmployees && data.assignedEmployees.length > 0;
        });
      }

      return projects;
    } catch (error) {
      throw new Error(`Failed to search projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les statistiques d'un projet
   */
  async getProjectStats(id: string, tenantId: string, filters: { startDate?: string; endDate?: string } = {}) {
    try {
      await this.getProjectById(id, tenantId);
      const { startDate, endDate } = filters;

      // Obtenir les entrées de temps du projet
      let timeEntriesQuery = collections.time_entries
        .where('tenantId', '==', tenantId)
        .where('projectId', '==', id);

      if (startDate) {
        timeEntriesQuery = timeEntriesQuery.where('date', '>=', startDate);
      }

      if (endDate) {
        timeEntriesQuery = timeEntriesQuery.where('date', '<=', endDate);
      }

      const timeEntriesSnapshot = await timeEntriesQuery.get();
      const timeEntries = timeEntriesSnapshot.docs.map(doc => doc.data());

      const stats = {
        totalTimeEntries: timeEntries.length,
        totalHours: timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60,
        totalBillableHours: timeEntries.filter(entry => entry.billable).reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60,
        totalCost: timeEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0),
        uniqueEmployees: [...new Set(timeEntries.map(entry => entry.employeeId))].length,
        averageHoursPerEntry: 0,
        billablePercentage: 0,
        employeeBreakdown: {} as Record<string, { hours: number; cost: number }>,
        activityBreakdown: {} as Record<string, number>
      };

      if (stats.totalTimeEntries > 0) {
        stats.averageHoursPerEntry = stats.totalHours / stats.totalTimeEntries;
      }

      if (stats.totalHours > 0) {
        stats.billablePercentage = (stats.totalBillableHours / stats.totalHours) * 100;
      }

      // Répartition par employé et activité
      timeEntries.forEach(entry => {
        const employeeId = entry.employeeId;
        const hours = (entry.duration || 0) / 60;
        const cost = entry.totalCost || 0;

        if (!stats.employeeBreakdown[employeeId]) {
          stats.employeeBreakdown[employeeId] = { hours: 0, cost: 0 };
        }
        stats.employeeBreakdown[employeeId].hours += hours;
        stats.employeeBreakdown[employeeId].cost += cost;

        if (entry.activityCodeId) {
          stats.activityBreakdown[entry.activityCodeId] = (stats.activityBreakdown[entry.activityCodeId] || 0) + hours;
        }
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get project stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir le rapport de rentabilité d'un projet
   */
  async getProfitabilityReport(id: string, tenantId: string, filters: { startDate?: string; endDate?: string } = {}) {
    try {
      const project = await this.getProjectById(id, tenantId);
      const projectData = project.getData();
      const stats = await this.getProjectStats(id, tenantId, filters);

      const report = {
        projectId: id,
        projectName: projectData.name,
        budget: projectData.budget || 0,
        totalRevenue: stats.totalCost,
        totalCosts: stats.totalCost, // Simplifié pour l'exemple
        profit: (projectData.budget || 0) - stats.totalCost,
        profitMargin: 0,
        budgetUtilization: 0,
        totalHours: stats.totalHours,
        billableHours: stats.totalBillableHours,
        averageHourlyRate: 0,
        efficiency: stats.billablePercentage,
        generatedAt: new Date()
      };

      if (projectData.budget && projectData.budget > 0) {
        report.profitMargin = (report.profit / projectData.budget) * 100;
        report.budgetUtilization = (stats.totalCost / projectData.budget) * 100;
      }

      if (stats.totalBillableHours > 0) {
        report.averageHourlyRate = stats.totalCost / stats.totalBillableHours;
      }

      return report;
    } catch (error) {
      throw new Error(`Failed to get profitability report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les codes d'activité d'un projet
   */
  async getProjectActivityCodes(id: string, tenantId: string): Promise<string[]> {
    try {
      const project = await this.getProjectById(id, tenantId);
      return project.getData().activityCodes || [];
    } catch (error) {
      throw new Error(`Failed to get project activity codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assigner des codes d'activité à un projet
   */
  async assignActivityCodes(id: string, tenantId: string, activityCodeIds: string[], assignedBy: string): Promise<ProjectModel> {
    try {
      const project = await this.getProjectById(id, tenantId);
      const currentCodes = project.getData().activityCodes || [];
      
      const updatedCodes = [...new Set([...currentCodes, ...activityCodeIds])];
      
      return await this.updateProject(id, tenantId, {
        activityCodes: updatedCodes
      }, assignedBy);
    } catch (error) {
      throw new Error(`Failed to assign activity codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les projets d'un employé
   */
  async getEmployeeProjects(employeeId: string, tenantId: string, activeOnly: boolean = true): Promise<ProjectModel[]> {
    try {
      let query = this.collection
        .where('tenantId', '==', tenantId)
        .where('assignedEmployees', 'array-contains', employeeId);

      if (activeOnly) {
        query = query.where('status', '==', ProjectStatus.ACTIVE);
      }

      const snapshot = await query.get();
      const projects = snapshot.docs
        .map(doc => ProjectModel.fromFirestore(doc))
        .filter(Boolean) as ProjectModel[];

      return projects;
    } catch (error) {
      throw new Error(`Failed to get employee projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const projectService = new ProjectService();