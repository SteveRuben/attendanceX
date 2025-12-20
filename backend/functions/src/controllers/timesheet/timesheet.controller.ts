/**
 * Contrôleur pour la gestion des feuilles de temps
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types/middleware.types';
import { TimesheetStatus } from '../../common/types';
import { timesheetService, timeEntryService, employeeService } from '../../services';

export class TimesheetController {
  /**
   * Créer une nouvelle feuille de temps
   */
  static createTimesheet = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { employeeId, periodStart, periodEnd } = req.body;
    const tenantId = req.tenantId!;
    const createdBy = req.user.uid;

    const timesheet = await timesheetService.createTimesheet({
      employeeId,
      tenantId,
      periodStart,
      periodEnd,
      createdBy
    });

    res.status(201).json({
      success: true,
      message: 'Feuille de temps créée avec succès',
      data: timesheet.toAPI()
    });
  });

  /**
   * Obtenir une feuille de temps par ID
   */
  static getTimesheetById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const timesheet = await timesheetService.getTimesheetById(id, tenantId);

    res.json({
      success: true,
      data: timesheet.toAPI()
    });
  });

  /**
   * Obtenir les feuilles de temps d'un employé
   */
  static getEmployeeTimesheets = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    const tenantId = req.tenantId!;
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'periodStart',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc',
      status: req.query.status as TimesheetStatus,
      periodStart: req.query.periodStart as string,
      periodEnd: req.query.periodEnd as string
    };

    const result = await timesheetService.getEmployeeTimesheets(employeeId, tenantId, options);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * Obtenir les feuilles de temps du tenant
   */
  static getTenantTimesheets = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'periodStart',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc',
      employeeIds: req.query.employeeId ? [req.query.employeeId as string] : undefined,
      statuses: req.query.status ? [req.query.status as TimesheetStatus] : undefined,
      periodStart: req.query.periodStart as string,
      periodEnd: req.query.periodEnd as string
    };

    const result = await timesheetService.searchTimesheets(tenantId, options);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * Mettre à jour une feuille de temps
   */
  static updateTimesheet = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const updates = req.body;
    const updatedBy = req.user.uid;

    const timesheet = await timesheetService.updateTimesheet(id, tenantId, updates, updatedBy);

    res.json({
      success: true,
      message: 'Feuille de temps mise à jour avec succès',
      data: timesheet.toAPI()
    });
  });

  /**
   * Supprimer une feuille de temps
   */
  static deleteTimesheet = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const deletedBy = req.user.uid;

    await timesheetService.deleteTimesheet(id, tenantId, deletedBy);

    res.json({
      success: true,
      message: 'Feuille de temps supprimée avec succès'
    });
  });

  /**
   * Soumettre une feuille de temps pour approbation
   */
  static submitTimesheet = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const submittedBy = req.user.uid;

    const timesheet = await timesheetService.submitTimesheet(id, tenantId, submittedBy);

    res.json({
      success: true,
      message: 'Feuille de temps soumise avec succès',
      data: timesheet.toAPI()
    });
  });

  /**
   * Approuver une feuille de temps
   */
  static approveTimesheet = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const approvedBy = req.user.uid;

    const timesheet = await timesheetService.approveTimesheet(id, tenantId, approvedBy);

    res.json({
      success: true,
      message: 'Feuille de temps approuvée avec succès',
      data: timesheet.toAPI()
    });
  });

  /**
   * Rejeter une feuille de temps
   */
  static rejectTimesheet = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { reason } = req.body;
    const rejectedBy = req.user.uid;

    const timesheet = await timesheetService.rejectTimesheet(id, tenantId, reason, rejectedBy);

    res.json({
      success: true,
      message: 'Feuille de temps rejetée avec succès',
      data: timesheet.toAPI()
    });
  });

  /**
   * Verrouiller une feuille de temps
   */
  static lockTimesheet = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const lockedBy = req.user.uid;

    const timesheet = await timesheetService.lockTimesheet(id, tenantId, lockedBy);

    res.json({
      success: true,
      message: 'Feuille de temps verrouillée avec succès',
      data: timesheet.toAPI()
    });
  });

  /**
   * Déverrouiller une feuille de temps
   */
  static unlockTimesheet = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const unlockedBy = req.user.uid;

    const timesheet = await timesheetService.unlockTimesheet(id, tenantId, unlockedBy);

    res.json({
      success: true,
      message: 'Feuille de temps déverrouillée avec succès',
      data: timesheet.toAPI()
    });
  });

  /**
   * Calculer les totaux d'une feuille de temps
   */
  static calculateTotals = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const totals = await timesheetService.calculateTotals(id, tenantId);

    res.json({
      success: true,
      data: totals
    });
  });

  /**
   * Valider une feuille de temps
   */
  static validateTimesheet = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const validation = await timesheetService.validateTimesheet(id, tenantId);

    res.json({
      success: true,
      data: validation
    });
  });

  /**
   * Obtenir les entrées de temps d'une feuille de temps
   */
  static getTimesheetEntries = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      sortBy: req.query.sortBy as string || 'date',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'asc',
      projectId: req.query.projectId as string,
      activityCodeId: req.query.activityCodeId as string,
      billable: req.query.billable === 'true' ? true : req.query.billable === 'false' ? false : undefined
    };

    const result = await timeEntryService.getTimesheetTimeEntries(id, tenantId, options);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * Ajouter une entrée de temps à une feuille de temps
   */
  static addTimeEntry = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const entryData = req.body;
    const createdBy = req.user.uid;

    // Obtenir la feuille de temps pour récupérer l'employeeId
    const timesheet = await timesheetService.getTimesheetById(id, tenantId);

    const timeEntry = await timeEntryService.createTimeEntry({
      ...entryData,
      timesheetId: id,
      employeeId: timesheet.employeeId,
      tenantId,
      createdBy
    });

    res.status(201).json({
      success: true,
      message: 'Entrée de temps ajoutée avec succès',
      data: timeEntry.toAPI()
    });
  });

  /**
   * Import en lot d'entrées de temps
   */
  static bulkImportTimeEntries = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { entries } = req.body;
    const createdBy = req.user.uid;

    // Obtenir la feuille de temps pour récupérer l'employeeId
    const timesheet = await timesheetService.getTimesheetById(id, tenantId);

    const entriesWithMetadata = entries.map((entry: any) => ({
      ...entry,
      timesheetId: id,
      employeeId: timesheet.employeeId,
      tenantId,
      createdBy
    }));

    const result = await timeEntryService.bulkImportTimeEntries(entriesWithMetadata, tenantId, createdBy);

    res.status(201).json({
      success: true,
      message: `${result.imported.length} entrées importées avec succès, ${result.failed.length} échecs`,
      data: result
    });
  });

  /**
   * Recherche avancée de feuilles de temps
   */
  static searchTimesheets = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const filters = {
      query: req.query.query as string,
      employeeIds: req.query.employeeIds ? (req.query.employeeIds as string).split(',') : undefined,
      statuses: req.query.statuses ? (req.query.statuses as string).split(',') as TimesheetStatus[] : undefined,
      periodStart: req.query.periodStart as string,
      periodEnd: req.query.periodEnd as string,
      minHours: req.query.minHours ? parseFloat(req.query.minHours as string) : undefined,
      maxHours: req.query.maxHours ? parseFloat(req.query.maxHours as string) : undefined,
      billableOnly: req.query.billableOnly === 'true',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'periodStart',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
    };

    const result = await timesheetService.searchTimesheets(tenantId, filters);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * Créer automatiquement des feuilles de temps pour une période
   */
  static createAutomaticTimesheets = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { periodStart, periodEnd, employeeIds } = req.body;
    const tenantId = req.tenantId!;
    const createdBy = req.user.uid;

    // Si aucun employé spécifié, créer pour tous les employés actifs du tenant
    let targetEmployeeIds = employeeIds;
    if (!targetEmployeeIds || targetEmployeeIds.length === 0) {
      try {
        // Récupérer la liste des employés actifs du tenant
        const activeEmployees = await employeeService.listEmployees({
          organizationId: tenantId,
          isActive: true,
          page: 1,
          limit: 1000 // Limite élevée pour récupérer tous les employés actifs
        });

        if (activeEmployees.data.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No active employees found in the organization'
          });
        }

        // Extraire les IDs des employés actifs
        targetEmployeeIds = activeEmployees.data.map(employee => employee.id!);
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve active employees',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const results = {
      created: [] as any[],
      failed: [] as { employeeId: string; error: string }[]
    };

    // Créer une feuille de temps pour chaque employé
    for (const employeeId of targetEmployeeIds) {
      try {
        const timesheet = await timesheetService.createTimesheet({
          employeeId,
          tenantId,
          periodStart,
          periodEnd,
          createdBy
        });
        results.created.push(timesheet.toAPI());
      } catch (error) {
        results.failed.push({
          employeeId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: `${results.created.length} feuilles de temps créées, ${results.failed.length} échecs`,
      data: results
    });
  });

  /**
   * Retourner une feuille de temps en brouillon
   */
  static returnToDraft = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const updatedBy = req.user.uid;

    // Utiliser updateTimesheet pour changer le statut en draft
    const timesheet = await timesheetService.updateTimesheet(id, tenantId, {
      status: 'draft' as TimesheetStatus
    }, updatedBy);

    res.json({
      success: true,
      message: 'Feuille de temps retournée en brouillon avec succès',
      data: timesheet.toAPI()
    });
  });

  /**
   * Obtenir les feuilles de temps de l'utilisateur connecté
   */
  static getMyTimesheets = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user.uid;
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'periodStart',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc',
      employeeIds: [userId], // Filtrer par l'utilisateur connecté
      statuses: req.query.status ? [req.query.status as TimesheetStatus] : undefined,
      periodStart: req.query.startDate as string,
      periodEnd: req.query.endDate as string
    };

    const result = await timesheetService.searchTimesheets(tenantId, options);

    res.json({
      success: true,
      data: result.data.map((timesheet: any) => timesheet.toAPI()),
      pagination: result.pagination
    });
  });

  /**
   * Obtenir les statistiques des feuilles de temps
   */
  static getTimesheetStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { startDate, endDate } = req.query;

    const stats = await timesheetService.getTimesheetStats(tenantId, {
      startDate: startDate as string,
      endDate: endDate as string
    });

    res.json({
      success: true,
      data: stats
    });
  });
}