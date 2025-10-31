/**
 * Contrôleur unifié pour tous les types de rapports
 * Fusion des rapports de temps/projets et des rapports d'événements/présence
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types/middleware.types';
import { ExportFormat } from '../../common/types';
import { reportService } from '../../services/reports';
import { collections } from '../../config/database';

export class ReportController {
  
  // ==================== RAPPORTS DE TEMPS ET PROJETS ====================

  /**
   * Générer un rapport par employé
   */
  static generateEmployeeReport = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const filters = { ...req.body.filters, tenantId };
    const startTime = Date.now();

    const report = await reportService.generateEmployeeReport(filters);
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: report,
      metadata: {
        generatedAt: new Date(),
        recordCount: report.length,
        processingTime
      }
    });
  });

  /**
   * Générer un rapport par projet
   */
  static generateProjectReport = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const filters = { ...req.body.filters, tenantId };
    const startTime = Date.now();

    const report = await reportService.generateProjectReport(filters);
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: report,
      metadata: {
        generatedAt: new Date(),
        recordCount: report.length,
        processingTime
      }
    });
  });

  /**
   * Générer un rapport de temps détaillé
   */
  static generateTimeReport = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const filters = { ...req.body.filters, tenantId };
    const startTime = Date.now();

    const report = await reportService.generateTimeReport(filters);
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: report,
      metadata: {
        generatedAt: new Date(),
        recordCount: report.length,
        processingTime
      }
    });
  });

  /**
   * Générer un rapport de productivité
   */
  static generateProductivityReport = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const filters = { ...req.body.filters, tenantId };
    const startTime = Date.now();

    const report = await reportService.generateProductivityReport(filters);
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: report,
      metadata: {
        generatedAt: new Date(),
        recordCount: 1,
        processingTime
      }
    });
  });

  /**
   * Générer un rapport de rentabilité
   */
  static generateProfitabilityReport = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const filters = { ...req.body.filters, tenantId };
    const startTime = Date.now();

    const report = await reportService.generateProfitabilityReport(filters);
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: report,
      metadata: {
        generatedAt: new Date(),
        recordCount: 1,
        processingTime
      }
    });
  });

  /**
   * Exporter un rapport
   */
  static exportReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const { reportType, format, filters } = req.body;
    const exportedBy = req.user.uid;

    const exportResult = await reportService.exportReport({
      reportType,
      format,
      filters: { ...filters, tenantId },
      exportedBy
    });

    res.json({
      success: true,
      message: 'Rapport exporté avec succès',
      data: exportResult
    });
  });

  /**
   * Obtenir l'historique des rapports
   */
  static getReportHistory = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'createdAt',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc',
      reportType: req.query.reportType as string,
      format: req.query.format as ExportFormat,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };

    const result = await reportService.getReportHistory(tenantId, options);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * Télécharger un rapport exporté
   */
  static downloadReport = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const reportFile = await reportService.downloadReport(id, tenantId);

    // Définir les headers pour le téléchargement
    res.setHeader('Content-Disposition', `attachment; filename="${reportFile.fileName}"`);
    res.setHeader('Content-Type', `application/${reportFile.format.toLowerCase()}`);
    res.setHeader('Content-Length', reportFile.size.toString());

    res.send(reportFile.data);
  });

  /**
   * Obtenir les statistiques de rapports
   */
  static getReportStats = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { startDate, endDate, reportType } = req.query;

    // Obtenir les statistiques depuis l'historique
    const historyResult = await reportService.getReportHistory(tenantId, {
      startDate: startDate as string,
      endDate: endDate as string,
      reportType: reportType as string,
      limit: 1000
    });

    const exports = historyResult.data;
    const stats = {
      totalExports: exports.length,
      exportsByType: {} as Record<string, number>,
      exportsByFormat: {} as Record<string, number>,
      totalSize: exports.reduce((sum: number, exp: any) => sum + (exp.size || 0), 0),
      averageSize: 0,
      mostRecentExport: exports.length > 0 ? (exports[0] as any).createdAt : null
    };

    // Calculer les répartitions
    exports.forEach((exp: any) => {
      stats.exportsByType[exp.reportType] = (stats.exportsByType[exp.reportType] || 0) + 1;
      stats.exportsByFormat[exp.format] = (stats.exportsByFormat[exp.format] || 0) + 1;
    });

    if (stats.totalExports > 0) {
      stats.averageSize = stats.totalSize / stats.totalExports;
    }

    res.json({
      success: true,
      data: stats
    });
  });

  /**
   * Valider les filtres de rapport
   */
  static validateReportFilters = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const filters = { ...req.body.filters, tenantId };

    const validation = await reportService.validateReportFilters(filters);

    res.json({
      success: true,
      data: validation
    });
  });

  /**
   * Obtenir les modèles de rapport disponibles
   */
  static getReportTemplates = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    // Obtenir les modèles depuis la base de données
    const snapshot = await collections.report_templates
      .where('tenantId', '==', tenantId)
      .where('isActive', '==', true)
      .orderBy('name')
      .get();

    const templates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      data: templates
    });
  });

  /**
   * Créer un modèle de rapport personnalisé
   */
  static createReportTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const templateData = req.body;
    const createdBy = req.user.uid;

    const template = {
      ...templateData,
      tenantId,
      createdBy,
      createdAt: new Date(),
      isActive: true
    };

    const docRef = await collections.report_templates.add(template);
    const savedTemplate = {
      id: docRef.id,
      ...template
    };

    res.status(201).json({
      success: true,
      message: 'Modèle de rapport créé avec succès',
      data: savedTemplate
    });
  });

  /**
   * Planifier un rapport automatique
   */
  static scheduleReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const scheduleData = req.body;
    const scheduledBy = req.user.uid;

    // Calculer la prochaine exécution
    const now = new Date();
    let nextRun = new Date(now);
    
    switch (scheduleData.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
    }

    const schedule = {
      ...scheduleData,
      tenantId,
      createdBy: scheduledBy,
      createdAt: now,
      nextRun,
      isActive: true
    };

    const docRef = await collections.report_schedules.add(schedule);
    const savedSchedule = {
      id: docRef.id,
      ...schedule
    };

    res.status(201).json({
      success: true,
      message: 'Rapport planifié avec succès',
      data: savedSchedule
    });
  });

  /**
   * Obtenir les rapports planifiés
   */
  static getScheduledReports = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      isActive: req.query.isActive as string,
      reportType: req.query.reportType as string
    };

    let query = collections.report_schedules
      .where('tenantId', '==', tenantId);

    if (options.isActive !== undefined) {
      query = query.where('isActive', '==', options.isActive === 'true');
    }

    if (options.reportType) {
      query = query.where('reportType', '==', options.reportType);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const schedules = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Pagination
    const startIndex = (options.page - 1) * options.limit;
    const endIndex = startIndex + options.limit;
    const paginatedSchedules = schedules.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedSchedules,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: schedules.length,
        totalPages: Math.ceil(schedules.length / options.limit)
      }
    });
  });

  // ==================== RAPPORTS D'ÉVÉNEMENTS ET PRÉSENCE ====================

  /**
   * Générer un rapport de présence
   */
  static generateAttendanceReport = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const filters = { ...req.body.filters, tenantId };
    const startTime = Date.now();

    const report = await reportService.generateAttendanceReport(filters);
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: report,
      metadata: {
        generatedAt: new Date(),
        recordCount: report.summary.totalRecords,
        processingTime
      }
    });
  });

  /**
   * Générer un rapport détaillé d'événement
   */
  static generateEventDetailReport = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { eventId } = req.params;
    const filters = { ...req.body.filters, tenantId, eventId };
    const startTime = Date.now();

    const report = await reportService.generateEventDetailReport(filters);
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: report,
      metadata: {
        generatedAt: new Date(),
        recordCount: report.summary.totalRecords,
        processingTime
      }
    });
  });

  /**
   * Générer un rapport utilisateur (présence)
   */
  static generateUserAttendanceReport = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    const filters = {
      tenantId,
      userIds: [userId],
      startDate: startDate as string,
      endDate: endDate as string
    };
    const startTime = Date.now();

    const report = await reportService.generateAttendanceReport(filters);
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: report,
      metadata: {
        generatedAt: new Date(),
        recordCount: report.summary.totalRecords,
        processingTime
      }
    });
  });

  /**
   * Générer un rapport de synthèse mensuel
   */
  static generateMonthlySummary = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { month, year } = req.query;
    
    // Calculer les dates de début et fin du mois
    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
    
    const filters = {
      tenantId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    const startTime = Date.now();

    const report = await reportService.generateAttendanceReport(filters);
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: report,
      metadata: {
        generatedAt: new Date(),
        recordCount: report.summary.totalRecords,
        processingTime,
        period: `${month}/${year}`
      }
    });
  });

  // ==================== MÉTHODES GÉNÉRIQUES ====================

  /**
   * Obtenir un rapport par ID
   */
  static getReportById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const reportFile = await reportService.downloadReport(id, tenantId);

    res.json({
      success: true,
      data: {
        id,
        fileName: reportFile.fileName,
        format: reportFile.format,
        size: reportFile.size,
        available: true
      }
    });
  });

  /**
   * Obtenir la liste des rapports
   */
  static getReports = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'createdAt',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc',
      reportType: req.query.reportType as string,
      format: req.query.format as ExportFormat,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };

    const result = await reportService.getReportHistory(tenantId, options);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * Supprimer un rapport
   */
  static deleteReport = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    // Supprimer le rapport de la base de données
    const doc = await collections.report_exports.doc(id).get();
    
    if (!doc.exists) {
      res.status(404).json({
        success: false,
        message: 'Rapport non trouvé'
      });
      return;
    }

    const reportData = doc.data();
    if (reportData?.tenantId !== tenantId) {
      res.status(404).json({
        success: false,
        message: 'Rapport non trouvé'
      });
      return;
    }

    await collections.report_exports.doc(id).delete();

    res.json({
      success: true,
      message: 'Rapport supprimé avec succès'
    });
  });

  /**
   * Aperçu d'un rapport (données limitées)
   */
  static previewReport = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { reportType } = req.body;
    const filters = { ...req.body.filters, tenantId };

    let previewData: any;
    const startTime = Date.now();

    // Générer un aperçu avec des données limitées
    switch (reportType) {
      case 'employee':
        previewData = await reportService.generateEmployeeReport({
          ...filters,
          limit: 5 // Limiter à 5 employés pour l'aperçu
        });
        break;
      case 'project':
        previewData = await reportService.generateProjectReport({
          ...filters,
          limit: 5 // Limiter à 5 projets pour l'aperçu
        });
        break;
      case 'attendance':
        previewData = await reportService.generateAttendanceReport(filters);
        // Limiter les données pour l'aperçu
        if (previewData.topPerformers) {
          previewData.topPerformers = previewData.topPerformers.slice(0, 3);
        }
        if (previewData.bottomPerformers) {
          previewData.bottomPerformers = previewData.bottomPerformers.slice(0, 3);
        }
        break;
      default:
        res.status(400).json({
          success: false,
          message: 'Type de rapport non supporté pour l\'aperçu'
        });
        return;
    }

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: previewData,
      metadata: {
        isPreview: true,
        generatedAt: new Date(),
        processingTime,
        note: 'Aperçu avec données limitées'
      }
    });
  });

  /**
   * Nettoyer les rapports expirés
   */
  static cleanupExpiredReports = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const now = new Date();

    // Trouver les rapports expirés
    const expiredQuery = await collections.report_exports
      .where('tenantId', '==', tenantId)
      .where('expiresAt', '<', now)
      .get();

    const deletedCount = expiredQuery.docs.length;

    // Supprimer les rapports expirés
    const batch = collections.report_exports.firestore.batch();
    expiredQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    res.json({
      success: true,
      message: `${deletedCount} rapports expirés supprimés`,
      data: {
        deletedCount,
        cleanupDate: now
      }
    });
  });
}