/**
 * Contrôleur pour la gestion des entrées de temps
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types/middleware.types';
import { TimeEntryStatus } from '../../common/types';
import { timeEntryService } from '../../services';

export class TimeEntryController {
  /**
   * Créer une nouvelle entrée de temps
   */
  static createTimeEntry = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const entryData = req.body;
    const tenantId = req.tenantId!;
    const createdBy = req.user.uid;

    const timeEntry = await timeEntryService.createTimeEntry({
      ...entryData,
      tenantId,
      createdBy
    });

    res.status(201).json({
      success: true,
      message: 'Entrée de temps créée avec succès',
      data: timeEntry.toAPI()
    });
  });

  /**
   * Obtenir une entrée de temps par ID
   */
  static getTimeEntryById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const timeEntry = await timeEntryService.getTimeEntryById(id, tenantId);

    res.json({
      success: true,
      data: timeEntry.toAPI()
    });
  });

  /**
   * Obtenir les entrées de temps d'un employé
   */
  static getEmployeeTimeEntries = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    const tenantId = req.tenantId!;
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'date',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc',
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      projectId: req.query.projectId as string,
      status: req.query.status as TimeEntryStatus,
      billable: req.query.billable === 'true' ? true : req.query.billable === 'false' ? false : undefined
    };

    const result = await timeEntryService.getEmployeeTimeEntries(employeeId, tenantId, options);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * Obtenir les entrées de temps d'une feuille de temps
   */
  static getTimesheetTimeEntries = asyncHandler(async (req: Request, res: Response) => {
    const { timesheetId } = req.params;
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

    const result = await timeEntryService.getTimesheetTimeEntries(timesheetId, tenantId, options);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * Mettre à jour une entrée de temps
   */
  static updateTimeEntry = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const updates = req.body;
    const updatedBy = req.user.uid;

    const timeEntry = await timeEntryService.updateTimeEntry(id, tenantId, updates, updatedBy);

    res.json({
      success: true,
      message: 'Entrée de temps mise à jour avec succès',
      data: timeEntry.toAPI()
    });
  });

  /**
   * Supprimer une entrée de temps
   */
  static deleteTimeEntry = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const deletedBy = req.user.uid;

    await timeEntryService.deleteTimeEntry(id, tenantId, deletedBy);

    res.json({
      success: true,
      message: 'Entrée de temps supprimée avec succès'
    });
  });

  /**
   * Dupliquer une entrée de temps
   */
  static duplicateTimeEntry = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { newDate, newTimesheetId } = req.body;
    const createdBy = req.user.uid;

    const timeEntry = await timeEntryService.duplicateTimeEntry(id, tenantId, {
      newDate,
      newTimesheetId,
      createdBy
    });

    res.status(201).json({
      success: true,
      message: 'Entrée de temps dupliquée avec succès',
      data: timeEntry.toAPI()
    });
  });

  /**
   * Import en lot d'entrées de temps
   */
  static bulkImportTimeEntries = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { entries } = req.body;
    const tenantId = req.tenantId!;
    const createdBy = req.user.uid;

    const entriesWithMetadata = entries.map((entry: any) => ({
      ...entry,
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
   * Rechercher des entrées de temps
   */
  static searchTimeEntries = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const filters = {
      query: req.query.query as string,
      employeeIds: req.query.employeeIds ? (req.query.employeeIds as string).split(',') : undefined,
      projectIds: req.query.projectIds ? (req.query.projectIds as string).split(',') : undefined,
      activityCodeIds: req.query.activityCodeIds ? (req.query.activityCodeIds as string).split(',') : undefined,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      billableOnly: req.query.billableOnly === 'true',
      minDuration: req.query.minDuration ? parseInt(req.query.minDuration as string) : undefined,
      maxDuration: req.query.maxDuration ? parseInt(req.query.maxDuration as string) : undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'date',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
    };

    const result = await timeEntryService.searchTimeEntries(tenantId, filters);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * Valider une entrée de temps
   */
  static validateTimeEntry = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const validation = await timeEntryService.validateTimeEntry(id, tenantId);

    res.json({
      success: true,
      data: validation
    });
  });

  /**
   * Calculer le coût d'une entrée de temps
   */
  static calculateCost = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const cost = await timeEntryService.calculateCost(id, tenantId);

    res.json({
      success: true,
      data: cost
    });
  });

  /**
   * Obtenir les entrées de temps du tenant
   */
  static getTenantTimeEntries = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'date',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc',
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      projectId: req.query.projectId as string,
      employeeId: req.query.employeeId as string,
      billable: req.query.billable === 'true' ? true : req.query.billable === 'false' ? false : undefined
    };

    const result = await timeEntryService.searchTimeEntries(tenantId, options);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * Exporter les entrées de temps
   */
  static exportTimeEntries = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const format = req.query.format as string || 'csv';
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      employeeIds: req.query.employeeIds ? (req.query.employeeIds as string).split(',') : undefined,
      projectIds: req.query.projectIds ? (req.query.projectIds as string).split(',') : undefined,
      billableOnly: req.query.billableOnly === 'true',
      limit: 10000 // Grande limite pour l'export
    };

    const result = await timeEntryService.searchTimeEntries(tenantId, filters);
    const timeEntries = result.data;

    let exportData: { contentType: string; filename: string; data: string } = {
      contentType: 'text/csv',
      filename: `time-entries-${new Date().toISOString().split('T')[0]}.csv`,
      data: ''
    };

    switch (format) {
      case 'csv':
        const csvHeaders = 'Date,Employee ID,Project ID,Activity Code,Duration (min),Description,Billable,Hourly Rate,Total Cost\n';
        const csvRows = timeEntries.map(entry => {
          const data = entry.getData();
          return [
            data.date,
            data.employeeId,
            data.projectId || '',
            data.activityCodeId || '',
            data.duration,
            `"${data.description?.replace(/"/g, '""') || ''}"`,
            data.billable ? 'Yes' : 'No',
            data.hourlyRate || 0,
            data.totalCost || 0
          ].join(',');
        }).join('\n');

        exportData = {
          contentType: 'text/csv',
          filename: `time-entries-${new Date().toISOString().split('T')[0]}.csv`,
          data: csvHeaders + csvRows
        };
        break;

      case 'json':
        exportData = {
          contentType: 'application/json',
          filename: `time-entries-${new Date().toISOString().split('T')[0]}.json`,
          data: JSON.stringify({
            exportedAt: new Date().toISOString(),
            totalEntries: timeEntries.length,
            filters,
            data: timeEntries.map(entry => entry.toAPI())
          }, null, 2)
        };
        break;

      case 'excel':
        // Pour Excel, on génère du CSV avec un nom .xlsx (simplifié)
        const excelHeaders = 'Date,Employee ID,Project ID,Activity Code,Duration (min),Description,Billable,Hourly Rate,Total Cost\n';
        const excelRows = timeEntries.map(entry => {
          const data = entry.getData();
          return [
            data.date,
            data.employeeId,
            data.projectId || '',
            data.activityCodeId || '',
            data.duration,
            `"${data.description?.replace(/"/g, '""') || ''}"`,
            data.billable ? 'Yes' : 'No',
            data.hourlyRate || 0,
            data.totalCost || 0
          ].join(',');
        }).join('\n');

        exportData = {
          contentType: 'application/vnd.ms-excel',
          filename: `time-entries-${new Date().toISOString().split('T')[0]}.xlsx`,
          data: excelHeaders + excelRows
        };
        break;

      default:
        exportData = {
          contentType: 'text/csv',
          filename: `time-entries-${new Date().toISOString().split('T')[0]}.csv`,
          data: 'Date,Employee ID,Project ID,Activity Code,Duration (min),Description,Billable,Hourly Rate,Total Cost\n'
        };
        break;
    }

    res.setHeader('Content-Type', exportData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.send(exportData.data);
  });

  /**
   * Obtenir les statistiques des entrées de temps
   */
  static getTimeEntryStatistics = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const options = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      employeeId: req.query.employeeId as string,
      projectId: req.query.projectId as string,
      groupBy: req.query.groupBy as string || 'day'
    };

    // Obtenir les statistiques de base
    const baseStats = await timeEntryService.getTimeEntryStats(tenantId, {
      employeeId: options.employeeId,
      startDate: options.startDate,
      endDate: options.endDate,
      projectId: options.projectId
    });

    // Obtenir les données détaillées pour le groupement
    const searchResult = await timeEntryService.searchTimeEntries(tenantId, {
      employeeIds: options.employeeId ? [options.employeeId] : undefined,
      projectIds: options.projectId ? [options.projectId] : undefined,
      startDate: options.startDate,
      endDate: options.endDate,
      limit: 10000
    });

    const timeEntries = searchResult.data;

    // Groupement des données selon le paramètre groupBy
    let groupedData: Record<string, any> = {};

    switch (options.groupBy) {
      case 'day':
        groupedData = timeEntries.reduce((acc, entry) => {
          const data = entry.getData();
          const day = data.date;
          if (!acc[day]) {
            acc[day] = { totalDuration: 0, billableDuration: 0, entries: 0 };
          }
          acc[day].totalDuration += data.duration;
          acc[day].billableDuration += data.billable ? data.duration : 0;
          acc[day].entries += 1;
          return acc;
        }, {} as Record<string, any>);
        break;

      case 'week':
        groupedData = timeEntries.reduce((acc, entry) => {
          const data = entry.getData();
          const date = new Date(data.date);
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          const weekKey = weekStart.toISOString().split('T')[0];
          
          if (!acc[weekKey]) {
            acc[weekKey] = { totalDuration: 0, billableDuration: 0, entries: 0 };
          }
          acc[weekKey].totalDuration += data.duration;
          acc[weekKey].billableDuration += data.billable ? data.duration : 0;
          acc[weekKey].entries += 1;
          return acc;
        }, {} as Record<string, any>);
        break;

      case 'month':
        groupedData = timeEntries.reduce((acc, entry) => {
          const data = entry.getData();
          const monthKey = data.date.substring(0, 7); // YYYY-MM
          
          if (!acc[monthKey]) {
            acc[monthKey] = { totalDuration: 0, billableDuration: 0, entries: 0 };
          }
          acc[monthKey].totalDuration += data.duration;
          acc[monthKey].billableDuration += data.billable ? data.duration : 0;
          acc[monthKey].entries += 1;
          return acc;
        }, {} as Record<string, any>);
        break;

      case 'project':
        groupedData = timeEntries.reduce((acc, entry) => {
          const data = entry.getData();
          const projectKey = data.projectId || 'no-project';
          
          if (!acc[projectKey]) {
            acc[projectKey] = { totalDuration: 0, billableDuration: 0, entries: 0 };
          }
          acc[projectKey].totalDuration += data.duration;
          acc[projectKey].billableDuration += data.billable ? data.duration : 0;
          acc[projectKey].entries += 1;
          return acc;
        }, {} as Record<string, any>);
        break;

      case 'activity':
        groupedData = timeEntries.reduce((acc, entry) => {
          const data = entry.getData();
          const activityKey = data.activityCodeId || 'no-activity';
          
          if (!acc[activityKey]) {
            acc[activityKey] = { totalDuration: 0, billableDuration: 0, entries: 0 };
          }
          acc[activityKey].totalDuration += data.duration;
          acc[activityKey].billableDuration += data.billable ? data.duration : 0;
          acc[activityKey].entries += 1;
          return acc;
        }, {} as Record<string, any>);
        break;
    }

    const stats = {
      ...baseStats,
      totalHours: Math.round(baseStats.totalDuration / 60 * 100) / 100,
      billableHours: Math.round(baseStats.totalBillableDuration / 60 * 100) / 100,
      nonBillableHours: Math.round((baseStats.totalDuration - baseStats.totalBillableDuration) / 60 * 100) / 100,
      groupBy: options.groupBy,
      groupedData,
      period: {
        startDate: options.startDate,
        endDate: options.endDate
      }
    };

    res.json({
      success: true,
      data: stats
    });
  });

  /**
   * Calculer la durée à partir des heures de début et fin
   */
  static calculateDuration = asyncHandler(async (req: Request, res: Response) => {
    const { startTime, endTime } = req.body;

    // Calcul simple de durée en minutes
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    res.json({
      success: true,
      data: { duration }
    });
  });

  /**
   * Détecter les conflits d'horaires
   */
  static detectTimeConflicts = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const {
      employeeId,
      date,
      startTime,
      endTime,
      excludeEntryId
    } = req.query;

    if (!employeeId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, date, start time, and end time are required'
      });
    }

    // Rechercher les entrées de temps pour cet employé à cette date
    const result = await timeEntryService.searchTimeEntries(tenantId, {
      employeeIds: [employeeId as string],
      startDate: date as string,
      endDate: date as string,
      limit: 1000
    });

    const existingEntries = result.data;
    const newStart = new Date(`${date}T${startTime}`);
    const newEnd = new Date(`${date}T${endTime}`);

    const conflicts = existingEntries
      .filter(entry => {
        // Exclure l'entrée en cours de modification
        if (excludeEntryId && entry.getData().id === excludeEntryId) {
          return false;
        }

        const entryData = entry.getData();
        if (!entryData.startTime || !entryData.endTime) {
          return false;
        }

        const entryStart = new Date(entryData.startTime);
        const entryEnd = new Date(entryData.endTime);

        // Vérifier le chevauchement
        return (
          (newStart >= entryStart && newStart < entryEnd) ||
          (newEnd > entryStart && newEnd <= entryEnd) ||
          (newStart <= entryStart && newEnd >= entryEnd)
        );
      })
      .map(entry => {
        const entryData = entry.getData();
        return {
          id: entryData.id,
          date: entryData.date,
          startTime: entryData.startTime,
          endTime: entryData.endTime,
          duration: entryData.duration,
          description: entryData.description,
          projectId: entryData.projectId,
          conflictType: 'time_overlap'
        };
      });

    // Vérifier aussi les limites de durée quotidienne (ex: max 24h par jour)
    const totalDailyDuration = existingEntries
      .filter(entry => excludeEntryId ? entry.getData().id !== excludeEntryId : true)
      .reduce((sum, entry) => sum + entry.getData().duration, 0);

    const newDuration = Math.round((newEnd.getTime() - newStart.getTime()) / (1000 * 60));
    const totalWithNew = totalDailyDuration + newDuration;

    const warnings = [];
    if (totalWithNew > 24 * 60) { // Plus de 24 heures
      warnings.push({
        type: 'daily_limit_exceeded',
        message: `Total daily duration would be ${Math.round(totalWithNew / 60 * 100) / 100} hours`,
        currentTotal: totalDailyDuration,
        newDuration,
        projectedTotal: totalWithNew
      });
    }

    if (newDuration > 12 * 60) { // Plus de 12 heures d'affilée
      warnings.push({
        type: 'long_duration',
        message: `Entry duration is ${Math.round(newDuration / 60 * 100) / 100} hours`,
        duration: newDuration
      });
    }

    return res.json({
      success: true,
      data: {
        hasConflicts: conflicts.length > 0,
        conflicts,
        warnings,
        summary: {
          conflictCount: conflicts.length,
          warningCount: warnings.length,
          currentDailyTotal: totalDailyDuration,
          newEntryDuration: newDuration,
          projectedDailyTotal: totalWithNew
        }
      }
    });
  });
}