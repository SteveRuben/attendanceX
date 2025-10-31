/**
 * Contrôleur pour la gestion des projets
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types/middleware.types';
import { ProjectStatus } from '../../common/types';
import { projectService } from '../../services';

export class ProjectController {
  /**
   * Créer un nouveau projet
   */
  static createProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const projectData = req.body;
    const tenantId = req.tenantId!;
    const createdBy = req.user.uid;

    const project = await projectService.createProject({
      ...projectData,
      tenantId,
      createdBy
    });

    res.status(201).json({
      success: true,
      message: 'Projet créé avec succès',
      data: project.toAPI()
    });
  });

  /**
   * Obtenir un projet par ID
   */
  static getProjectById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const project = await projectService.getProjectById(id, tenantId);

    res.json({
      success: true,
      data: project.toAPI()
    });
  });

  /**
   * Obtenir la liste des projets du tenant
   */
  static getTenantProjects = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'name',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'asc',
      status: req.query.status as ProjectStatus,
      clientId: req.query.clientId as string,
      assignedEmployeeId: req.query.assignedEmployeeId as string,
      billable: req.query.billable === 'true' ? true : req.query.billable === 'false' ? false : undefined,
      searchTerm: req.query.search as string,
      includeInactive: req.query.includeInactive === 'true'
    };

    const result = await projectService.getProjects(tenantId, options);

    res.json({
      success: true,
      data: result.data.map(project => project.toAPI()),
      pagination: result.pagination
    });
  });

  /**
   * Mettre à jour un projet
   */
  static updateProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const updates = req.body;
    const updatedBy = req.user.uid;

    const project = await projectService.updateProject(id, tenantId, updates, updatedBy);

    res.json({
      success: true,
      message: 'Projet mis à jour avec succès',
      data: project.toAPI()
    });
  });

  /**
   * Supprimer un projet
   */
  static deleteProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const deletedBy = req.user.uid;

    await projectService.deleteProject(id, tenantId, deletedBy);

    res.json({
      success: true,
      message: 'Projet supprimé avec succès'
    });
  });

  /**
   * Changer le statut d'un projet
   */
  static changeProjectStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { status, reason } = req.body;
    const changedBy = req.user.uid;

    const project = await projectService.changeProjectStatus(id, tenantId, status, changedBy, reason);

    res.json({
      success: true,
      message: 'Statut du projet modifié avec succès',
      data: project.toAPI()
    });
  });

  /**
   * Assigner des employés à un projet
   */
  static assignEmployees = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { employeeIds } = req.body;
    const assignedBy = req.user.uid;

    const project = await projectService.assignEmployees(id, tenantId, employeeIds, assignedBy);

    res.json({
      success: true,
      message: 'Employés assignés au projet avec succès',
      data: project.toAPI()
    });
  });

  /**
   * Retirer des employés d'un projet
   */
  static unassignEmployees = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { employeeIds } = req.body;
    const unassignedBy = req.user.uid;

    const project = await projectService.unassignEmployees(id, tenantId, employeeIds, unassignedBy);

    res.json({
      success: true,
      message: 'Employés retirés du projet avec succès',
      data: project.toAPI()
    });
  });

  /**
   * Obtenir les employés assignés à un projet
   */
  static getProjectEmployees = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const employees = await projectService.getProjectEmployees(id, tenantId);

    res.json({
      success: true,
      data: employees
    });
  });

  /**
   * Rechercher des projets
   */
  static searchProjects = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const filters = {
      query: req.query.query as string,
      status: req.query.status as ProjectStatus,
      clientId: req.query.clientId as string,
      billable: req.query.billable === 'true' ? true : req.query.billable === 'false' ? false : undefined,
      hasActiveEmployees: req.query.hasActiveEmployees === 'true',
      limit: parseInt(req.query.limit as string) || 10
    };

    const projects = await projectService.searchProjects(tenantId, filters);

    res.json({
      success: true,
      data: projects.map(project => project.toAPI())
    });
  });

  /**
   * Obtenir les statistiques d'un projet
   */
  static getProjectStats = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { startDate, endDate } = req.query;

    const stats = await projectService.getProjectStats(id, tenantId, {
      startDate: startDate as string,
      endDate: endDate as string
    });

    res.json({
      success: true,
      data: stats
    });
  });

  /**
   * Obtenir le rapport de rentabilité d'un projet
   */
  static getProfitabilityReport = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { startDate, endDate } = req.query;

    const report = await projectService.getProfitabilityReport(id, tenantId, {
      startDate: startDate as string,
      endDate: endDate as string
    });

    res.json({
      success: true,
      data: report
    });
  });

  /**
   * Obtenir les codes d'activité d'un projet
   */
  static getProjectActivityCodes = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const activityCodes = await projectService.getProjectActivityCodes(id, tenantId);

    res.json({
      success: true,
      data: activityCodes
    });
  });

  /**
   * Assigner des codes d'activité à un projet
   */
  static assignActivityCodes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { activityCodeIds } = req.body;
    const assignedBy = req.user.uid;

    const project = await projectService.assignActivityCodes(id, tenantId, activityCodeIds, assignedBy);

    res.json({
      success: true,
      message: 'Codes d\'activité assignés au projet avec succès',
      data: project.toAPI()
    });
  });

  /**
   * Assigner un employé à un projet
   */
  static assignEmployee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { employeeId } = req.body;
    const tenantId = req.tenantId!;
    const assignedBy = req.user.uid;

    const project = await projectService.assignEmployees(id, tenantId, [employeeId], assignedBy);

    res.json({
      success: true,
      message: 'Employé assigné au projet avec succès',
      data: project.toAPI()
    });
  });

  /**
   * Retirer un employé d'un projet
   */
  static removeEmployee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, employeeId } = req.params;
    const tenantId = req.tenantId!;
    const unassignedBy = req.user.uid;

    const project = await projectService.unassignEmployees(id, tenantId, [employeeId], unassignedBy);

    res.json({
      success: true,
      message: 'Employé retiré du projet avec succès',
      data: project.toAPI()
    });
  });

  /**
   * Obtenir les projets d'un employé
   */
  static getEmployeeProjects = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    const tenantId = req.tenantId!;
    const status = req.query.status as ProjectStatus;

    // Le service getEmployeeProjects prend un paramètre activeOnly (boolean)
    // Si un statut spécifique est demandé, on filtre après
    const activeOnly = !status || status === 'active';
    const allProjects = await projectService.getEmployeeProjects(employeeId, tenantId, activeOnly);
    
    // Filtrer par statut si spécifié
    const projects = status ? allProjects.filter(project => project.getData().status === status) : allProjects;

    res.json({
      success: true,
      data: projects.map(project => project.toAPI())
    });
  });
}