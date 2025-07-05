
import {Request, Response} from "express";
import {reportService} from "../services/report.service";
import {asyncHandler} from "../middleware/errorHandler";
import {AuthenticatedRequest} from "../middleware/auth";

/**
 * Contrôleur de gestion des rapports
 */
export class ReportController {
  /**
   * Générer un rapport
   */
  static generateReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const reportRequest = {
      ...req.body,
      generatedBy: req.user.uid,
    };

    const report = await reportService.generateReport(reportRequest);

    res.status(201).json({
      success: true,
      message: "Génération de rapport initiée",
      data: report,
    });
  });

  /**
   * Obtenir un rapport par ID
   */
  static getReportById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const userId = req.user.uid;

    const report = await reportService.getReportById(id, userId);

    res.json({
      success: true,
      data: report,
    });
  });

  /**
   * Obtenir la liste des rapports
   */
  static getReports = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as "asc" | "desc",
      type: req.query.type as string,
      status: req.query.status as string,
      generatedBy: req.query.generatedBy as string,
      dateRange: req.query.startDate && req.query.endDate ? {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string),
      } : undefined,
      format: req.query.format as string,
    };

    const result = await reportService.getReports(options);

    res.json({
      success: true,
      data: result.reports,
      pagination: result.pagination,
    });
  });

  /**
   * Télécharger un rapport
   */
  static downloadReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const userId = req.user.uid;

    const downloadInfo = await reportService.downloadReport(id, userId);

    res.setHeader("Content-Type", downloadInfo.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${downloadInfo.fileName}"`);
    res.sendFile(downloadInfo.filePath);
  });

  /**
   * Supprimer un rapport
   */
  static deleteReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const userId = req.user.uid;

    const success = await reportService.deleteReport(id, userId);

    if (success) {
      res.json({
        success: true,
        message: "Rapport supprimé avec succès",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Impossible de supprimer le rapport",
      });
    }
  });

  /**
   * Obtenir les statistiques des rapports
   */
  static getReportStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters = {
      generatedBy: req.query.generatedBy as string,
      dateRange: req.query.startDate && req.query.endDate ? {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string),
      } : undefined,
    };

    const stats = await reportService.getReportStats(filters);

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Programmer un rapport récurrent
   */
  static scheduleReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scheduleData = {
      ...req.body,
      generatedBy: req.user.uid,
    };

    const scheduleId = await reportService.scheduleReport(scheduleData);

    res.status(201).json({
      success: true,
      message: "Rapport programmé avec succès",
      data: {scheduleId},
    });
  });

  /**
   * Obtenir les templates de rapports
   */
  static getReportTemplates = asyncHandler(async (req: Request, res: Response) => {
    const templates = await reportService.getReportTemplates();

    res.json({
      success: true,
      data: templates,
    });
  });

  /**
   * Obtenir un template de rapport
   */
  static getReportTemplate = asyncHandler(async (req: Request, res: Response) => {
    const {id} = req.params;

    const template = await reportService.getReportTemplate(id);

    if (template) {
      res.json({
        success: true,
        data: template,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Template non trouvé",
      });
    }
  });

  /**
   * Générer un rapport de présence pour un événement
   */
  static generateAttendanceReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {eventId} = req.params;
    const {format} = req.query;

    const reportRequest = {
      type: "event_detail" as const,
      format: (format as string) || "pdf",
      filters: {eventId},
      generatedBy: req.user.uid,
    };

    const report = await reportService.generateReport(reportRequest);

    res.json({
      success: true,
      message: "Rapport de présence généré",
      data: report,
    });
  });

  /**
   * Générer un rapport utilisateur
   */
  static generateUserReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {userId} = req.params;
    const {format, startDate, endDate} = req.query;

    const reportRequest = {
      type: "user_attendance" as const,
      format: (format as string) || "pdf",
      filters: {
        userId,
        dateRange: startDate && endDate ? {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        } : undefined,
      },
      generatedBy: req.user.uid,
    };

    const report = await reportService.generateReport(reportRequest);

    res.json({
      success: true,
      message: "Rapport utilisateur généré",
      data: report,
    });
  });

  /**
   * Générer un rapport de synthèse mensuel
   */
  static generateMonthlySummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {month, year} = req.query;
    const {format} = req.query;

    const reportRequest = {
      type: "monthly_summary" as const,
      format: (format as string) || "pdf",
      filters: {
        month: parseInt(month as string),
        year: parseInt(year as string),
      },
      generatedBy: req.user.uid,
    };

    const report = await reportService.generateReport(reportRequest);

    res.json({
      success: true,
      message: "Synthèse mensuelle générée",
      data: report,
    });
  });

  /**
   * Aperçu d'un rapport (sans génération complète)
   */
  static previewReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const reportRequest = req.body;

    // Générer seulement les données sans créer le fichier
    const preview = await reportService.previewReport(reportRequest);

    res.json({
      success: true,
      data: preview,
    });
  });

  /**
   * Nettoyer les rapports expirés
   */
  static cleanupExpiredReports = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const deletedCount = await reportService.cleanupExpiredReports();

    res.json({
      success: true,
      message: `${deletedCount} rapports expirés supprimés`,
    });
  });
}
